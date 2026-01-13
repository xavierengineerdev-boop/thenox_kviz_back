import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = 'logs';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  }),
);

const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, '%DATE%-combined.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, '%DATE%-error.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

const analyticsFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, '%DATE%-analytics.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

export const analyticsLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    analyticsFileRotateTransport,
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

export default logger;
