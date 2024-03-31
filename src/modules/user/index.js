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

Router.post("/", verifyToken, user.createUser);
Router.post("/switch", verifyToken, user.impersonate);
Router.put("/", verifyToken, user.changePassword);
Router.put("/reset", verifyToken, user.resetPassword);
Router.delete("/", verifyToken, user.deleteUser);
Router.post("/update", verifyToken, user.updateUser);
Router.get("/", verifyToken, user.getUser);
Router.get("/list", verifyToken, user.getListUsers);
Router.get("/list/download", verifyToken, user.exportUser);
Router.post("/company", verifyToken, user.createCompany);
Router.put("/company", verifyToken, user.updateCompanies);
Router.get("/company", verifyToken, user.getCompanies);
Router.post(
  "/company/upload/logo",
  verifyToken,
  uploadLogo.single("file"),
  user.uploadLogo
);
Router.put("/update/all", verifyToken, user.updateAllUsers);

export default Router;
