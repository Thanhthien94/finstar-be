/* eslint-disable no-undef */
import "dotenv/config";

export const NODE_ENV = process.env.NODE_ENV || "development";
export const DOMAIN = process.env.DOMAIN || "development";
export const AUDIOPATH = process.env.AUDIOPATH || "development";
export const EXCELPATH = process.env.EXCELPATH || "development";
export const FILE_PATH = process.env.FILE_PATH;

export const APP_HOST = process.env.APP_HOST || "localhost";
export const APP_PORT = process.env.APP_PORT || "3001";
export const AUTH_PORT = process.env.AUTH_PORT || "3004";

// Log level
export const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
export const LOG_PATH = process.env.LOG_PATH || "";

// SQL server
export const SQL_HOST = process.env.SQL_HOST || "localhost";
export const SQL_PORT = Number(process.env.SQL_PORT) || 3306;
export const SQL_USERNAME = process.env.SQL_USERNAME || "";
export const SQL_PASSWORD = process.env.SQL_PASSWORD || "";
export const SQL_DATABASE = process.env.SQL_DATABASE || "";

// Mongo
export const MONGO_URL = process.env.MONGO_URL || "";

// Asterisk
export const ASTERISK_HOST = process.env.ASTERISK_HOST || "localhost";
export const ASTERISK_PATH = process.env.ASTERISK_PATH || "/opt/izpbx/data/izpbx/var/spool/asterisk/";
export const AMI_PORT = process.env.AMI_PORT || "5038";
export const AMI_USERNAME = process.env.AMI_USERNAME || "";
export const AMI_PASSWORD = process.env.AMI_PASSWORD || "";

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "";

// CORS
export const CORS = process.env.CORS.split(",") || "";

// Cloudinary
export const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME || "";
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "";

// Worker
 export const WORKER_HOST = process.env.WORKER_HOST || "localhost"
 export const WORKER_PORT = process.env.WORKER_PORT || "3003";

 // AMI WORKER
export const AMI_WORKER_PORT = process.env.AMI_WORKER_PORT || "3006";
export const AMI_WORKER_HOST = process.env.AMI_WORKER_HOST || "";

 // AMI WORKER
export const C2C_WORKER_PORT = process.env.C2C_WORKER_PORT || "3007";
export const C2C_WORKER_HOST = process.env.C2C_WORKER_HOST || "";
