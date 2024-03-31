import express from "express";
import worker from "./worker.js";
import auth from "../../util/authentication/auth.js";
// import multer from 'multer';
// import moment from "../../util/monent/moment.js";
// import path from "path";
// import { FILE_PATH } from "../../util/config/index.js";
// import cloudinary from "../../controllers/cloudinary/index.js";
// import { CloudinaryStorage } from "multer-storage-cloudinary";


const { verifyToken } = auth;
const Route = express.Router()

// @Handle cloudinary storage
// const storage = new CloudinaryStorage({
//   cloudinary,
//   allowedFormats: ["jpg", "png"],
//   params: {
//     folder: "B-Group",
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });

// @Handle upload
// const __dirname = FILE_PATH || `${path.resolve()}/uploads`;
// const uploadExcel = multer({
//   storage: multer.diskStorage({
//     destination: `${__dirname}/uploads`,
//     filename: (req, file, cb) => {
//       cb(null, `${moment.pathTime(Date.now())}-${file.originalname}`);
//     }
//   })
// });
// const uploadPdf = multer({
//   storage: multer.diskStorage({
//     destination: `${__dirname}`,
//     filename: (req, file, cb) => {
//       cb(null, `${moment.pathTime(Date.now())}-${req.body.id}-${file.originalname}`);
//     }
//   })
// });
// const uploadImgLinkcard = multer({storage});

// Route.post('/crm/calcDashboard', worker.calcDashboardCRM)
// Route.post('/crm/calcPerformanceSup', worker.calcPerformanceSup)
// Route.post('/crm/calcPerformanceTeam', worker.calcPerformanceTeam)
// Route.post('/crm/calcPerformanceSales', worker.calcPerformanceSales)
Route.post('/cdr/downloadCDR', verifyToken, worker.fetchCDRToDownload)
Route.get('/migrateCDR', verifyToken, worker.migrateCDR)

export default Route