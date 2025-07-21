# CDR Duplicate Management API Documentation

## Overview

Enhanced CDR duplicate detection and management system with flexible time range parameters, batch processing, and comprehensive error handling.

## API Endpoints

### 1. Enhanced Check Duplicates (Legacy Compatible)

**Endpoint**: `GET /api/cdr/check`

**Description**: Enhanced version of the original check endpoint with flexible time range and removal options.

**Query Parameters**:
- `fromDate` (optional): Start date (YYYY-MM-DD or ISO format). Default: 30 days ago
- `toDate` (optional): End date (YYYY-MM-DD or ISO format). Default: now
- `remove` (optional): Removal mode - `none`, `dryRun`, `remove`. Default: `none`
- `includeCnum` (optional): Include cnum in duplicate criteria. Default: `true`
- `limit` (optional): Limit number of duplicate groups returned

**Example**:
```bash
GET /api/cdr/check?fromDate=2024-01-01&toDate=2024-01-31&remove=dryRun&limit=100
```

**Response**:
```json
{
  "success": true,
  "message": "Found 15 duplicate groups with 45 total records",
  "data": {
    "duplicates": [...],
    "stats": {
      "totalGroups": 15,
      "totalRecords": 45,
      "searchDuration": 1250
    },
    "removalStats": {
      "totalRemoved": 30,
      "dryRun": true,
      "errors": 0
    },
    "timeRange": {
      "fromDate": "2024-01-01T00:00:00.000Z",
      "toDate": "2024-01-31T23:59:59.999Z",
      "daysDiff": 31
    }
  }
}
```

### 2. Find Duplicates Only

**Endpoint**: `GET /api/cdr/duplicates/find`

**Description**: Find duplicate CDR records without any removal action.

**Query Parameters**:
- `fromDate` (optional): Start date
- `toDate` (optional): End date  
- `includeCnum` (optional): Include cnum in duplicate criteria. Default: `true`
- `limit` (optional): Limit number of results

**Example**:
```bash
GET /api/cdr/duplicates/find?fromDate=2024-01-01&toDate=2024-01-31&includeCnum=true&limit=50
```

### 3. Remove Duplicates with Confirmation

**Endpoint**: `POST /api/cdr/duplicates/remove`

**Description**: Remove duplicate CDR records with explicit confirmation and dry-run support.

**Request Body**:
```json
{
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31",
  "confirm": true,
  "dryRun": false
}
```

**Parameters**:
- `fromDate` (required): Start date
- `toDate` (required): End date
- `confirm` (required): Must be `true` to proceed
- `dryRun` (optional): If `true`, simulate removal without actually deleting. Default: `true`

**Response**:
```json
{
  "success": true,
  "message": "Migration completed successfully - 30 records removed from 15 groups",
  "data": {
    "stats": {
      "totalGroups": 15,
      "totalRecords": 45,
      "searchDuration": 1250
    },
    "removalStats": {
      "totalGroups": 15,
      "totalRemoved": 30,
      "dryRun": false,
      "errors": 0
    },
    "options": {
      "dryRun": false,
      "confirm": true,
      "performedBy": "admin_user"
    }
  }
}
```

### 4. Get Duplicate Statistics

**Endpoint**: `GET /api/cdr/duplicates/stats`

**Description**: Get comprehensive statistics about duplicates without returning the actual records.

**Query Parameters**:
- `fromDate` (optional): Start date
- `toDate` (optional): End date

**Example**:
```bash
GET /api/cdr/duplicates/stats?fromDate=2024-01-01&toDate=2024-01-31
```

**Response**:
```json
{
  "success": true,
  "message": "Duplicate statistics retrieved successfully",
  "data": {
    "stats": {
      "totalGroups": 15,
      "totalRecords": 45,
      "totalRecordsToRemove": 30,
      "searchDuration": 1250,
      "duplicatesByCount": {
        "2": 10,
        "3": 4,
        "5": 1
      },
      "averageDuplicatesPerGroup": "3.00"
    },
    "timeRange": {
      "fromDate": "2024-01-01T00:00:00.000Z",
      "toDate": "2024-01-31T23:59:59.999Z",
      "daysDiff": 31
    }
  }
}
```

### 5. Manual Trigger Background Check (Admin Only)

**Endpoint**: `POST /api/worker/duplicates/check`

**Description**: Manually trigger the background duplicate check process (Admin/Root only).

**Query Parameters**:
- `daysBack` (optional): Number of days to check back. Default: 30, Max: 90
- `remove` (optional): Removal mode - `none`, `dryRun`, `remove`. Default: `dryRun`

**Example**:
```bash
POST /api/worker/duplicates/check?daysBack=7&remove=dryRun
```

**Response**:
```json
{
  "success": true,
  "message": "Manual duplicate check completed",
  "data": {
    "result": {
      "success": true,
      "duplicates": [...],
      "stats": {...},
      "removalStats": {...}
    },
    "triggeredBy": "admin_user",
    "options": {
      "daysBack": 7,
      "remove": "dryRun"
    }
  }
}
```

## Duplicate Detection Logic

### Criteria for Duplicates

Records are considered duplicates if they have identical:
- `billsec` (call duration in seconds)
- `dst` (destination number)
- `createdAt` (call timestamp)
- `cnum` (caller number) - optional, controlled by `includeCnum` parameter

### Removal Strategy

- **Keep First**: Always keeps the first record in each duplicate group
- **Batch Processing**: Removes duplicates in batches of 100 for better performance
- **Error Handling**: Continues processing even if some deletions fail

## Time Range Validation

- **Maximum Range**: 90 days
- **Format Support**: YYYY-MM-DD, ISO 8601, or JavaScript Date strings
- **Default Range**: 30 days ago to now
- **Timezone**: All dates are processed in UTC

## Error Responses

```json
{
  "success": false,
  "message": "Duplicate check failed: Invalid fromDate format. Use YYYY-MM-DD or ISO format",
  "error": "Invalid fromDate format. Use YYYY-MM-DD or ISO format"
}
```

## Performance Optimizations

1. **Database Indexes**: Optimized indexes on duplicate detection fields
2. **Aggregation Pipeline**: Efficient MongoDB aggregation for duplicate detection
3. **Batch Processing**: Batch deletion operations for better performance
4. **Memory Management**: Streaming results for large datasets
5. **Caching**: Price info caching to reduce repeated queries

## Background Worker

- **Automatic Schedule**: Runs every hour in production
- **Environment Check**: Only runs in production environment
- **Logging**: Results logged to company notes for monitoring
- **Error Handling**: Comprehensive error logging and recovery

## Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Admin-only endpoints for sensitive operations
- **Confirmation**: Explicit confirmation required for destructive operations
- **Dry Run**: Default to dry-run mode for safety

## Usage Examples

### Basic Duplicate Check
```bash
curl -X GET "http://localhost:3001/api/cdr/check?fromDate=2024-01-01&toDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Safe Removal with Dry Run
```bash
curl -X POST "http://localhost:3001/api/cdr/duplicates/remove" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "2024-01-01",
    "toDate": "2024-01-31", 
    "confirm": true,
    "dryRun": true
  }'
```

### Get Statistics Only
```bash
curl -X GET "http://localhost:3001/api/cdr/duplicates/stats?fromDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
