// src/modules/heplify/index.js
import express from 'express';
import auth from "../../util/authentication/auth.js";
import heplifyServer from './server.js';
import { setupHeplifyWorker } from '../../controllers/heplify/worker.js';

const Route = express.Router();
const { verifyToken } = auth;

// Thiết lập worker khi khởi động
setupHeplifyWorker();

// Đường dẫn cơ bản không yêu cầu xác thực
Route.post('/api/hep', heplifyServer.handleHepRequest);

// Các đường dẫn yêu cầu xác thực
Route.get('/logs', verifyToken, heplifyServer.getSipLogs);
Route.get('/logs/:id', verifyToken, heplifyServer.getSipLogById);
Route.get('/stats', verifyToken, heplifyServer.getSipStats);
Route.get('/search', verifyToken, heplifyServer.searchSipLogs);

export default Route;

// --------------------------------------------------------------
// Để cập nhật các file app.js, amiWorker.js hoặc c2cWorker.js,
// thêm dòng này vào phần imports:
// import heplify from "./modules/heplify/index.js";

// Và thêm dòng này vào phần routes:
// app.use("/api/hep", heplify);