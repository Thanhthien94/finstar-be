import express from "express";
import { SipLogModel, CDRModel, SipModel, UserModel } from "../../controllers/mongodb/index.js";
import auth from "../../util/authentication/auth.js";

const Route = express.Router();
const { verifyToken } = auth;

// Endpoint nhận dữ liệu HEP từ Heplify
Route.post("/api/hep", async (req, res) => {
  try {
    // Parse HEP payload
    const payload = req.body;
    
    if (!payload) {
      return res.status(400).json({ error: 'Invalid HEP payload' });
    }

    // Trích xuất thông tin từ SIP message
    const sipData = parseSipMessage(payload);
    
    if (!sipData) {
      return res.status(400).json({ error: 'Could not parse SIP message' });
    }

    // Tìm extension liên quan
    const extension = await findRelatedExtension(sipData);
    const user = extension?.user || null;
    const company = extension?.company || null;

    // Lưu vào MongoDB
    const sipLog = await SipLogModel.create({
      timestamp: sipData.timestamp,
      sourceIp: sipData.sourceIp,
      sourcePort: sipData.sourcePort,
      destinationIp: sipData.destinationIp,
      destinationPort: sipData.destinationPort,
      callId: sipData.callId,
      method: sipData.method,
      fromUser: sipData.fromUser,
      fromDomain: sipData.fromDomain,
      toUser: sipData.toUser,
      toDomain: sipData.toDomain,
      userAgent: sipData.userAgent,
      rawMessage: sipData.rawMessage,
      extension: extension?._id || null,
      user: user || null,
      company: company || null
    });

    // Kiểm tra và liên kết với CDR nếu có
    await linkWithCDR(sipLog);

    console.log(`SIP message saved: ${sipData.method} - CallID: ${sipData.callId}`);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing HEP message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint để truy vấn SIP logs
Route.get("/logs", verifyToken, async (req, res) => {
  try {
    const { role, _id } = req.decode;
    const user = await UserModel.findById(_id);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    // Xây dựng filters từ query params
    const filters = {};
    
    if (req.query.callId) {
      filters.callId = req.query.callId;
    }
    
    if (req.query.method) {
      filters.method = req.query.method;
    }
    
    if (req.query.fromUser) {
      filters.fromUser = req.query.fromUser;
    }
    
    if (req.query.toUser) {
      filters.toUser = req.query.toUser;
    }
    
    // Filter theo thời gian
    if (req.query.startTime || req.query.endTime) {
      filters.timestamp = {};
      
      if (req.query.startTime) {
        filters.timestamp.$gte = new Date(req.query.startTime);
      }
      
      if (req.query.endTime) {
        filters.timestamp.$lte = new Date(req.query.endTime);
      }
    }

    // Filter theo quyền hạn của user
    if (!role.includes("root")) {
      filters.company = user.company;
    }

    // Thực hiện truy vấn
    const logs = await SipLogModel.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstname lastname username')
      .populate('extension', 'extension')
      .populate('company', 'name');
    
    // Đếm tổng số logs theo filter
    const total = await SipLogModel.countDocuments(filters);
    
    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Error fetching SIP logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Hàm phân tích SIP message
function parseSipMessage(hepData) {
  try {
    // Kiểm tra nếu đây là HEP3 packet
    if (!hepData || !hepData.payload) {
      console.error('Invalid HEP data structure');
      return null;
    }

    // Trích xuất payload SIP từ HEP packet
    const rawSipMessage = hepData.payload;

    // Parse thông tin SIP cơ bản
    const callId = extractCallId(rawSipMessage);
    const method = extractMethod(rawSipMessage);
    const fromInfo = extractFromHeader(rawSipMessage);
    const toInfo = extractToHeader(rawSipMessage);
    const userAgent = extractUserAgent(rawSipMessage);

    // Tạo đối tượng SIP data
    return {
      timestamp: new Date(),
      sourceIp: hepData.srcIp || '',
      sourcePort: hepData.srcPort || 0,
      destinationIp: hepData.dstIp || '',
      destinationPort: hepData.dstPort || 0,
      callId: callId,
      method: method,
      fromUser: fromInfo.user,
      fromDomain: fromInfo.domain,
      toUser: toInfo.user,
      toDomain: toInfo.domain,
      userAgent: userAgent,
      rawMessage: rawSipMessage
    };
  } catch (error) {
    console.error('Error parsing SIP message:', error);
    return null;
  }
}

// Trích xuất Call-ID từ SIP message
function extractCallId(sipMessage) {
  const callIdMatch = sipMessage.match(/Call-ID:\s*([^\r\n]+)/i);
  return callIdMatch ? callIdMatch[1].trim() : '';
}

// Trích xuất Method từ SIP message
function extractMethod(sipMessage) {
  // Check nếu là request
  const requestLineMatch = sipMessage.match(/^([A-Z]+) [^\r\n]+/);
  if (requestLineMatch) {
    return requestLineMatch[1].trim();
  }
  
  // Check nếu là response
  const responseLineMatch = sipMessage.match(/^SIP\/2\.0 (\d+) [^\r\n]+/);
  if (responseLineMatch) {
    return responseLineMatch[1].trim(); // Trả về status code nếu là response
  }
  
  return '';
}

// Trích xuất From header
function extractFromHeader(sipMessage) {
  const fromMatch = sipMessage.match(/From:\s*[^<]*<sip:([^@]+)@([^>]+)>/i);
  if (fromMatch) {
    return {
      user: fromMatch[1].trim(),
      domain: fromMatch[2].trim()
    };
  }
  return { user: '', domain: '' };
}

// Trích xuất To header
function extractToHeader(sipMessage) {
  const toMatch = sipMessage.match(/To:\s*[^<]*<sip:([^@]+)@([^>]+)>/i);
  if (toMatch) {
    return {
      user: toMatch[1].trim(),
      domain: toMatch[2].trim()
    };
  }
  return { user: '', domain: '' };
}

// Trích xuất User-Agent header
function extractUserAgent(sipMessage) {
  const uaMatch = sipMessage.match(/User-Agent:\s*([^\r\n]+)/i);
  return uaMatch ? uaMatch[1].trim() : '';
}

// Tìm extension liên quan
async function findRelatedExtension(sipData) {
  // Tìm extension dựa trên fromUser hoặc toUser
  const extension = await SipModel.findOne({
    $or: [
      { extension: sipData.fromUser },
      { extension: sipData.toUser }
    ]
  }).populate('user').populate('company');

  return extension;
}

// Liên kết SipLog với CDR
async function linkWithCDR(sipLog) {
  try {
    // Tìm CDR có thể liên quan dựa vào callId hoặc số
    const relatedCDR = await CDRModel.findOne({
      $or: [
        { cnum: sipLog.fromUser },
        { dst: sipLog.toUser },
        { src: sipLog.fromUser }
      ],
      createdAt: {
        $gte: new Date(new Date().getTime() - 10 * 60 * 1000) // Tìm trong 10 phút gần đây
      }
    });

    if (relatedCDR) {
      // Cập nhật SipLog để chứa tham chiếu tới CDR
      await SipLogModel.findByIdAndUpdate(sipLog._id, {
        cdrId: relatedCDR._id
      });

      // Cập nhật CDR để lưu thông tin về SipLog
      await CDRModel.findByIdAndUpdate(relatedCDR._id, {
        $push: { sipLogs: sipLog._id }
      });

      console.log(`Linked SipLog ${sipLog._id} with CDR ${relatedCDR._id}`);
    }
  } catch (error) {
    console.error('Error linking SipLog with CDR:', error);
  }
}

export default Route;