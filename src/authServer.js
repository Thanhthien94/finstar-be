import express from "express";
import morgan from "morgan";
import http from "http";
import { AUTH_PORT } from "./util/config/index.js";
// import user from "./controllers/index.js";
import cors from "cors";
import helmet, { hidePoweredBy, frameguard } from "helmet";
import stream from "./util/logger/Logger.js";
// import { Exception } from "./util/exceptions/index.js";
import auth from "./util/authentication/auth.js";
import mongodb from "./controllers/mongodb/index.js";
import user from "./modules/user/index.js";
import { UserModel } from "./controllers/mongodb/models/User.js";
import argon2 from "argon2";
import { CORS } from "./util/config/index.js";

const app = express();
const server = http.createServer(app);
const port = AUTH_PORT;

const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
};

app.use(morgan("combined", { stream: stream }));
// app.use(cors({
//   origin: "*",
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
// }));
app.use(cors({
  origin: CORS
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(helmet(helmetConfig));
app.use(hidePoweredBy()); // Hidden detail version Sever
app.use(frameguard()); // On Secure Mode Clickjacking

server.listen(port, () => console.log(`Auth server listening on port ${port}`));
await mongodb.connect();

const updateRefreshToken = async (username, refreshToken) => {
  console.log({ username, refreshToken });
  const update = await UserModel.findOneAndUpdate({ username }, { refreshToken });
  return update
};

const { generateToken, verifyToken } = auth;
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('body: ', req.body)
    if (!username || !password) {
      throw new Error("username or password is missing");
    } else {
      const user = await UserModel.findOne({ username }).populate('role')
      const roles = user.role.map(item => item.name)
      if (user?.status === 'Locked') throw new Error('User has been locked')
      if (!user) {
        throw new Error("User or Password is not valid");
      } else {
        const passwordValid = await argon2.verify(user.password, password);
        console.log({ passwordValid });
        if (!passwordValid) {
          throw new Error("User or Password is not valid");
        } else {
          console.log('user: ', user)
          const tokens = generateToken({_id: user._id, username: user.username, role: roles});
          await updateRefreshToken(username, tokens.refreshToken);
          const data = {
            _id: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            refreshToken: tokens.refreshToken,
            token: tokens.accessToken,
            role: user.role,
            firstname: user.firstname,
            lastname: user.lastname,
            sip: user.sipAccount
          };
          res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data,
          });
        }
      }
    }
  } catch (error) {
    res.status(404).json({ success: false, message: error.message, data: "" });
    console.error(error)
  }
});
app.post("/auth/token", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) throw new Error("refreshToken is require");

    // const user = users.find((user) => user.refreshToken === refreshToken);
    const user = await UserModel.findOne({ refreshToken });
    // console.log({user})
    if (!user) throw new Error("refreshToken is not valid");

    const tokens = generateToken(user);
    updateRefreshToken(user.username, tokens.refreshToken);
    res.status(200).json({
      success: true,
      message: "refresh new token is ok",
      data: tokens,
    });
  } catch (error) {
    console.log(error.message);
    res.status(404).json({ success: false, message: error.message, data: "" });
    // res.send({ status: 404, error })
  }
});

app.delete("/auth/logout", verifyToken, async (req, res) => {
  try {
    const { id, userName } = req.decode;
    await UserModel.findByIdAndUpdate(id, { refreshToken: null });
    console.log(`user: ${userName} is logged out`);
    res.status(200).json({
      success: true,
      message: "user is logged out",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.use("/auth/user", user);
