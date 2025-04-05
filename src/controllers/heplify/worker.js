// src/controllers/heplify/worker.js
import { SipLogModel, CDRModel } from "../../controllers/mongodb/index.js";
import HeplifyConfig from "./config.js";

// Function để đồng bộ hóa SIP logs với CDR
async function syncSipLogsToCdr() {
  try {
    console.log('Starting SIP logs to CDR synchronization...');
    
    // Tìm các SIP logs chưa được liên kết với CDR
    const unlinkedSipLogs = await SipLogModel.find({
      cdrId: null,
      createdAt: {
        $gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) // Chỉ xem xét logs 24h qua
      }
    });
    
    if (unlinkedSipLogs.length === 0) {
      console.log('No unlinked SIP logs found.');
      return;
    }
    
    console.log(`Found ${unlinkedSipLogs.length} unlinked SIP logs.`);
    
    let linkedCount = 0;
    
    // Xử lý từng SIP log chưa được liên kết
    for (const sipLog of unlinkedSipLogs) {
      // Tìm CDR phù hợp
      const matchingCdr = await CDRModel.findOne({
        $or: [
          { cnum: sipLog.fromUser, dst: sipLog.toUser },
          { cnum: sipLog.toUser, dst: sipLog.fromUser },
          { src: sipLog.fromUser, dst: sipLog.toUser },
          { src: sipLog.toUser, dst: sipLog.fromUser },
          { techDetails: { $exists: true, uniqueid: { $regex: sipLog.callId } } }
        ],
        createdAt: {
          $gte: new Date(sipLog.timestamp.getTime() - HeplifyConfig.cdrSync.lookupWindow),
          $lte: new Date(sipLog.timestamp.getTime() + HeplifyConfig.cdrSync.lookupWindow)
        }
      });
      
      if (matchingCdr) {
        // Liên kết SIP log với CDR
        await SipLogModel.findByIdAndUpdate(sipLog._id, {
          cdrId: matchingCdr._id
        });
        
        // Cập nhật CDR để thêm tham chiếu đến SIP log
        await CDRModel.findByIdAndUpdate(matchingCdr._id, {
          $addToSet: { sipLogs: sipLog._id }
        });
        
        linkedCount++;
      }
    }
    
    console.log(`Successfully linked ${linkedCount} SIP logs with CDRs.`);
  } catch (error) {
    console.error('Error synchronizing SIP logs with CDRs:', error);
  }
}

// Cleanup để xóa các logs cũ theo cấu hình
async function cleanupOldLogs() {
  try {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - HeplifyConfig.logRetention);
    
    const result = await SipLogModel.deleteMany({
      timestamp: { $lt: retentionDate }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old SIP logs.`);
  } catch (error) {
    console.error('Error cleaning up old SIP logs:', error);
  }
}

// Thiết lập cron jobs
function setupHeplifyWorker() {
  // Đồng bộ hóa SIP logs với CDR theo định kỳ
  setInterval(syncSipLogsToCdr, HeplifyConfig.cdrSync.syncInterval);
  
  // Chạy cleanup mỗi ngày một lần
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
  
  // Chạy lần đầu khi khởi động
  syncSipLogsToCdr();
  
  console.log('Heplify worker started.');
}

export { setupHeplifyWorker, syncSipLogsToCdr, cleanupOldLogs };