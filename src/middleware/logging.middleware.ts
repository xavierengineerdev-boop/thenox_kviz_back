import { NextFunction, Request, Response } from 'express';
import { analyticsLogger, logger } from '../utils/logger';

export interface RequestWithAnalytics extends Request {
  analytics?: {
    userAgent: string;
    ip: string;
    timestamp: string;
  };
}

export const requestLogger = (req: RequestWithAnalytics, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  const userAgent = req.get('user-agent') || 'unknown';

  const ip =
    req.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.get('x-real-ip') ||
    req.get('cf-connecting-ip') ||
    req.get('x-client-ip') ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown';

  const timestamp = new Date().toISOString();

  req.analytics = {
    userAgent,
    ip,
    timestamp,
  };

  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
    ip,
    userAgent,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
    });
  });

  next();
};

export const analyticsEventLogger = (eventData: any) => {
  analyticsLogger.info('Analytics event', {
    ...eventData,
    loggedAt: new Date().toISOString(),
  });
};

export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
