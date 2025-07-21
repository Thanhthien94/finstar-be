/**
 * CDR Duplicate Detection Helper
 * Optimized functions for detecting and handling CDR duplicates
 */

import { CDRModel, CompanyModel } from "../../controllers/mongodb/index.js";
import { NODE_ENV } from "../../util/config/index.js";

/**
 * Parse and validate time range from request parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} - Parsed time range with validation
 */
export const parseTimeRange = (query) => {
  const now = new Date();
  let fromDate, toDate;

  // Parse fromDate
  if (query.fromDate) {
    fromDate = new Date(query.fromDate);
    if (isNaN(fromDate.getTime())) {
      throw new Error("Invalid fromDate format. Use YYYY-MM-DD or ISO format");
    }
  } else {
    // Default: 30 days ago
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Parse toDate
  if (query.toDate) {
    toDate = new Date(query.toDate);
    if (isNaN(toDate.getTime())) {
      throw new Error("Invalid toDate format. Use YYYY-MM-DD or ISO format");
    }
    // Set to end of day
    toDate.setHours(23, 59, 59, 999);
  } else {
    // Default: now
    toDate = now;
  }

  // Validation
  if (fromDate >= toDate) {
    throw new Error("fromDate must be earlier than toDate");
  }

  const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    throw new Error("Time range cannot exceed 90 days");
  }

  return {
    fromDate,
    toDate,
    daysDiff,
    isValid: true
  };
};

/**
 * Build optimized aggregation pipeline for duplicate detection
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @param {Object} options - Additional options
 * @returns {Array} - MongoDB aggregation pipeline
 */
export const buildDuplicatePipeline = (fromDate, toDate, options = {}) => {
  const {
    includeCompany = false,
    includeCnum = true,
    limit = null
  } = options;

  const groupFields = {
    billsec: "$billsec",
    dst: "$dst",
    createdAt: "$createdAt"
  };

  // Add optional fields
  if (includeCnum) {
    groupFields.cnum = "$cnum";
  }
  if (includeCompany) {
    groupFields.company = "$company";
  }

  const pipeline = [
    // Stage 1: Match time range
    {
      $match: {
        createdAt: {
          $gte: fromDate,
          $lte: toDate
        }
      }
    },
    
    // Stage 2: Group by duplicate criteria
    {
      $group: {
        _id: groupFields,
        ids: { $push: "$_id" },
        records: { 
          $push: {
            _id: "$_id",
            user: "$user",
            company: "$company",
            name: "$name",
            cnum: "$cnum",
            dst: "$dst",
            duration: "$duration",
            billsec: "$billsec",
            disposition: "$disposition",
            createdAt: "$createdAt"
          }
        },
        count: { $sum: 1 }
      }
    },
    
    // Stage 3: Filter only duplicates
    {
      $match: {
        count: { $gt: 1 }
      }
    },
    
    // Stage 4: Sort by count descending
    {
      $sort: { count: -1 }
    }
  ];

  // Add limit if specified
  if (limit && limit > 0) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
};

/**
 * Find duplicate CDR records with optimized aggregation
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of duplicate groups
 */
export const findDuplicates = async (fromDate, toDate, options = {}) => {
  try {
    console.log(`🔍 Searching for duplicates from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    
    const pipeline = buildDuplicatePipeline(fromDate, toDate, options);
    const startTime = Date.now();
    
    const duplicates = await CDRModel.aggregate(pipeline);
    
    const duration = Date.now() - startTime;
    const totalDuplicateRecords = duplicates.reduce((sum, group) => sum + group.count, 0);
    const totalDuplicateGroups = duplicates.length;
    
    console.log(`✅ Found ${totalDuplicateGroups} duplicate groups with ${totalDuplicateRecords} total records in ${duration}ms`);
    
    return {
      duplicates,
      stats: {
        totalGroups: totalDuplicateGroups,
        totalRecords: totalDuplicateRecords,
        searchDuration: duration,
        timeRange: { fromDate, toDate }
      }
    };
  } catch (error) {
    console.error('❌ Error finding duplicates:', error);
    throw error;
  }
};

/**
 * Remove duplicate CDR records in batches
 * @param {Array} duplicateGroups - Array of duplicate groups from findDuplicates
 * @param {Object} options - Options for removal
 * @returns {Promise<Object>} - Removal statistics
 */
export const removeDuplicates = async (duplicateGroups, options = {}) => {
  const {
    dryRun = false,
    batchSize = 100,
    keepFirst = true
  } = options;

  if (dryRun) {
    console.log('🧪 DRY RUN: No records will be actually deleted');
  }

  let totalRemoved = 0;
  let totalGroups = duplicateGroups.length;
  let errors = [];

  console.log(`🗑️  Starting ${dryRun ? 'dry run' : 'removal'} of duplicates from ${totalGroups} groups...`);

  for (let i = 0; i < duplicateGroups.length; i += batchSize) {
    const batch = duplicateGroups.slice(i, i + batchSize);
    
    try {
      for (const group of batch) {
        const idsToRemove = keepFirst ? group.ids.slice(1) : group.ids.slice(0, -1);
        
        if (!dryRun && idsToRemove.length > 0) {
          const result = await CDRModel.deleteMany({
            _id: { $in: idsToRemove }
          });
          totalRemoved += result.deletedCount;
        } else {
          totalRemoved += idsToRemove.length;
        }
      }
      
      console.log(`📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalGroups / batchSize)}`);
    } catch (error) {
      console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors.push({
        batchIndex: Math.floor(i / batchSize) + 1,
        error: error.message
      });
    }
  }

  const stats = {
    totalGroups,
    totalRemoved,
    dryRun,
    errors: errors.length,
    errorDetails: errors
  };

  console.log(`${dryRun ? '🧪' : '✅'} ${dryRun ? 'Dry run' : 'Removal'} completed:`, stats);
  
  return stats;
};

/**
 * Log duplicate check results to company notes
 * @param {string} companyId - Company ID
 * @param {Object} stats - Statistics from duplicate check
 * @param {Object} removalStats - Statistics from removal (if any)
 */
export const logDuplicateCheck = async (companyId, stats, removalStats = null) => {
  try {
    const logEntry = {
      type: 'duplicateCheck',
      timestamp: new Date(),
      searchStats: stats,
      removalStats,
      environment: NODE_ENV
    };

    if (companyId) {
      await CompanyModel.findByIdAndUpdate(companyId, {
        $push: {
          note: logEntry
        }
      });
      console.log('📝 Logged duplicate check results to company notes');
    }
  } catch (error) {
    console.error('❌ Error logging duplicate check:', error);
  }
};

/**
 * Comprehensive duplicate check and cleanup
 * @param {Object} options - Check options
 * @returns {Promise<Object>} - Complete results
 */
export const performDuplicateCheck = async (options = {}) => {
  const {
    fromDate,
    toDate,
    removeMode = 'none', // 'none', 'dryRun', 'remove'
    companyId = null,
    includeCnum = true,
    limit = null
  } = options;

  try {
    // Find duplicates
    const { duplicates, stats } = await findDuplicates(fromDate, toDate, {
      includeCnum,
      limit
    });

    let removalStats = null;

    // Handle removal if requested
    if (removeMode !== 'none' && duplicates.length > 0) {
      removalStats = await removeDuplicates(duplicates, {
        dryRun: removeMode === 'dryRun',
        batchSize: 100,
        keepFirst: true
      });
    }

    // Log results
    if (companyId) {
      await logDuplicateCheck(companyId, stats, removalStats);
    }

    return {
      success: true,
      duplicates,
      stats,
      removalStats,
      message: `Found ${stats.totalGroups} duplicate groups with ${stats.totalRecords} total records${removalStats ? `, removed ${removalStats.totalRemoved} duplicates` : ''}`
    };

  } catch (error) {
    console.error('❌ Duplicate check failed:', error);
    throw error;
  }
};
