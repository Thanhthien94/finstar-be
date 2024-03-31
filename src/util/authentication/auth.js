import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../config/index.js";
import {
  UserRequestModel,
  UserModel,
} from "../../controllers/mongodb/index.js";

const generateToken = (payload) => {
  // console.log(payload);
  const { id, userName, role } = payload;
  const accessToken = jwt.sign({ id, userName, role }, ACCESS_TOKEN_SECRET, {
    expiresIn: "24h",
  });
  const refreshToken = jwt.sign({ id, userName, role }, REFRESH_TOKEN_SECRET, {
    expiresIn: "240h",
  });
  // console.log({accessToken})
  return { accessToken, refreshToken };
};

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader && authHeader.split(" ")[1];
    // console.log(token);

    let decode = {};
    if (!token) {
      res.status(401).json({ success: false, message: "unauthorized" });
      return
    }
    const requestConnection = req.connection._peername;
    const url = req.originalUrl;
    const headers = req.headers;
    const startTime = req._startTime;
    // console.log("req: ", req.headers);
    // console.log({platform, browser})
    decode = jwt.verify(token, ACCESS_TOKEN_SECRET);
    // console.log('decode: ',decode);
    const id = decode.id;
    const userName = decode.userName;
    await UserRequestModel.create({
      userId: id,
      userName,
      requestConnection: { ...requestConnection, ...headers, url },
      requestInfo: { url },
    });
    await UserModel.findByIdAndUpdate(id, {
      request: { startTime, ...requestConnection, ...headers, url },
    });
    req.decode = decode;
    req.token = token
    next();
    return decode;
  } catch (error) {
    console.log(error.message);
    res.status(403).json({ success: false, message: error.message });
    return
  }
};

export default { verifyToken, generateToken };
