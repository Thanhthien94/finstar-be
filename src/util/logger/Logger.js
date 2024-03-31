import winston from "winston";
import  'winston-daily-rotate-file';
import moment from "../monent/moment.js";
import { LOG_PATH } from "../config/index.js";

const { createLogger, format, transports } = winston;
const logFormat = format.combine(
  format.timestamp(),
  format.printf(info => `${moment.formatTime(new Date())} ${info.level}: ${info.message}`)
);

const transportApi = new (transports.DailyRotateFile)({
  filename: `${LOG_PATH}log/api.%DATE%.log`,
  datePattern: 'YYYY-MM-DD'
});
const logger = createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new transports.Console(),
    // new transports.File({ filename: '.log' })
    transportApi
  ]
});


const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

export default stream