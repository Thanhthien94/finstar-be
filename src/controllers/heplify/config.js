// src/controllers/heplify/config.js
import { DOMAIN } from "../../util/config/index.js";

// Cấu hình cho tương tác với HEPlify
const HeplifyConfig = {
  // Port mặc định của Heplify-server
  port: 9060,
  
  // Endpoint API để nhận dữ liệu HEP
  apiEndpoint: "/api/hep",
  
  // Giao thức HTTP (có thể thay đổi thành HTTPS)
  protocol: "http",
  
  // Thời gian tự động xóa logs (trong ngày)
  logRetention: 30,
  
  // Cấu hình để SIPCapture gửi capture tới API của chúng ta
  captureServer: {
    host: DOMAIN,
    port: 9060,
    protocol: "http", // hoặc https nếu sử dụng SSL
    path: "/api/hep"
  },
  
  // Cấu hình đồng bộ hóa với CDR
  cdrSync: {
    // Thời gian để tìm kiếm CDR liên quan (milliseconds)
    lookupWindow: 10 * 60 * 1000, // 10 phút
    
    // Tần suất kiểm tra và liên kết CDR với SIP logs (milliseconds)
    syncInterval: 5 * 60 * 1000, // 5 phút
  },
};

export default HeplifyConfig;