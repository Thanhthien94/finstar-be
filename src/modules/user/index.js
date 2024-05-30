import express from "express";
import user from "./controller.js";
import auth from "../../util/authentication/auth.js";
import multer from "multer";
import cloudinary from "../../controllers/cloudinary/index.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const { verifyToken } = auth;

const Router = express.Router();
// @Handle upload

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

const uploadLogo = multer({ storage });

Router.post("/", verifyToken,  user.createUser);
Router.post("/switch", verifyToken, user.impersonate);
Router.put("/", verifyToken, user.changePassword);
Router.put("/reset", verifyToken, user.resetPassword);
Router.delete("/", verifyToken, user.deleteUser);
Router.put("/update", verifyToken, user.updateUser);
Router.get("/", verifyToken, user.getUser);
Router.get("/list", verifyToken, user.getListUsers);
Router.get("/list/download", verifyToken, user.exportUser);
Router.post("/company", verifyToken, user.createCompany);
Router.get("/company", verifyToken, user.getCompanies);
Router.put("/company", verifyToken, user.updateCompanies);
Router.post(
  "/company/upload/logo",
  verifyToken,
  uploadLogo.single("file"),
  user.uploadLogo
);
Router.post("/accessibility", verifyToken, user.createAccessibility);
Router.get("/accessibility", verifyToken, user.getAccessibility);
Router.post("/role", verifyToken, user.createRole);
Router.get("/role", verifyToken, user.getRoles);
Router.post("/pbx", verifyToken, user.createNewPBX);
Router.get("/pbx", verifyToken, user.getPBXs);
Router.post("/sip", verifyToken, user.createNewSIP);
Router.get("/sip", verifyToken, user.getSIPs);
Router.post("/prefix", verifyToken, user.createNewTelcoPrefix);
Router.get("/prefix", verifyToken, user.getPBXs);
Router.put("/prefix", verifyToken, user.updateTelcoPrefix);
Router.post("/bill", verifyToken, user.createNewBillInfo);
Router.get("/bill", verifyToken, user.getBillInfo);
Router.put("/update/all", verifyToken, user.updateAllUsers);

export default Router;
