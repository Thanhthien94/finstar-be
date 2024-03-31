import express from "express";
import auth from "../../util/authentication/auth.js";
import customer from './customer.js'
import multer from 'multer';
import moment from "../../util/monent/moment.js";
import path from "path";
import { FILE_PATH } from "../../util/config/index.js";
import cloudinary from "../../controllers/cloudinary/index.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";


const { verifyToken } = auth;
const Route = express.Router()

// @Handle cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ["jpg", "png"],
  params: {
    folder: "B-Group",
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// @Handle upload
const __dirname = FILE_PATH || `${path.resolve()}/uploads`;
const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, cb) => {
      cb(null, `${moment.pathTime(Date.now())}-${file.originalname}`);
    }
  })
});
const uploadPdf = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}`,
    filename: (req, file, cb) => {
      cb(null, `${moment.pathTime(Date.now())}-${req.body.id}-${file.originalname}`);
    }
  })
});
const uploadImgLinkcard = multer({storage});

Route.get('/customer', verifyToken, customer.getCustomerList)
Route.get('/customer/dashboard', verifyToken, customer.getDashboard)
Route.get('/customer/performance/supervisor', verifyToken, customer.getPerformanceSup)
Route.get('/customer/performance/teamlead', verifyToken, customer.getPerformanceTeam)
Route.get('/customer/performance/sales', verifyToken, customer.getPerformanceSales)
Route.get('/customer/performance/ampm', verifyToken, customer.getPerformanceAMPM)
Route.post('/customer/dashboard', verifyToken, customer.createDashBoard)
Route.get('/customer/count', verifyToken, customer.countList)
Route.post('/customer', verifyToken, customer.creatCustomer)
Route.post('/customer/task/', verifyToken, customer.createTask)
Route.put('/customer/task/', verifyToken, customer.updateTask)
Route.get('/customer/task/', verifyToken, customer.getTaskList)
Route.post('/customer/info', verifyToken, customer.customerInfo)
Route.post('/customer/update', verifyToken, customer.updateCustomer)
Route.put('/customer/update', verifyToken, customer.updateAllCustomer)
Route.post('/customer/assign', verifyToken, customer.assignCustomer)
Route.post('/customer/revoke', verifyToken, customer.revokeCustomer)
Route.delete('/customer/delete/file', verifyToken, customer.deleteImportFile)
Route.delete('/customer/delete', verifyToken, customer.deleteCustomer)
Route.post('/customer/reference/create', verifyToken, customer.createCustomerReference)
Route.post('/customer/reference/update', verifyToken, customer.updateCustomerReference)
Route.get('/customer/linkcard', verifyToken, customer.getLinkCardList)
Route.post('/customer/linkcard', verifyToken, customer.createLinkCard)
Route.delete('/customer/linkcard', verifyToken, customer.deleteLinkCard)
Route.put('/customer/linkcard', verifyToken, customer.updateLinkCard)
Route.post('/customer/linkcard/create', customer.createCustomerLinkCard)
Route.post('/customer/linkcard/find', customer.findLinkCard)
Route.post('/customer/bank', verifyToken, customer.createBank)
Route.post('/customer/upload', verifyToken, uploadExcel.single('file'), customer.uploadCustomer)
Route.post('/customer/upload/pdf', verifyToken, uploadPdf.single('file'), customer.uploadPdf)
Route.post('/customer/upload/linkcard/img', verifyToken, uploadImgLinkcard.single('file'), customer.uploadLinkcardImg)
Route.get('/customer/download/pdf', customer.downLoadPdf)
Route.get('/customer/download/excel', verifyToken, customer.downLoadExel)
Route.get('/customer/download/excel/template', verifyToken, customer.downLoadExelTemplate)

export default Route