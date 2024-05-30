import express from "express";
import actuator from "express-actuator";
import morgan from "morgan";
import http from "http";
import path from "path";
import { WORKER_PORT } from "./util/config/index.js";
import cors from "cors";
import helmet, { hidePoweredBy, frameguard } from "helmet";
import compression from "compression";
import stream from "./util/logger/Logger.js";
import mongodb from "./controllers/mongodb/index.js";
import crm from "./modules/crm/index.js";
import worker from "./modules/worker/index.js";
import { CORS } from "./util/config/index.js";

const app = express();
app.use(actuator());
const server = http.createServer(app);
const __dirname = path.resolve();
const port = WORKER_PORT;

const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
};

// init middlewares
app.use(morgan("combined", { stream: stream }));
// app.use(
//   cors({
//     origin: "*",
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   })
// );
app.use(cors({
  origin: CORS,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(helmet(helmetConfig));
app.use(hidePoweredBy()); // Hidden detail version Sever
app.use(frameguard()); // On Secure Mode Clickjacking
app.use(compression())

server.listen(port, () => console.log(`App listening on port ${port}`));

mongodb.connect();

// app.use("/api/user", user);
app.use("/worker/crm", crm);
// app.use("/worker/cdr", cdr);
app.use("/worker", worker);
