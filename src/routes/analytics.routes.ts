import { Request, Response, Router } from 'express';
import { analyticsEventLogger, RequestWithAnalytics } from '../middleware/logging.middleware';
import telegramService from '../services/telegram.service';
import mongodbService from '../services/mongodb.service';
import { AnalyticsEvent } from '../types/analytics.types';
import { logger } from '../utils/logger';

const router = Router();

router.post('/event', (req: RequestWithAnalytics, res: Response) => {
  try {
    const eventData: AnalyticsEvent = req.body;

    if (req.analytics) {
      eventData.userData.ip = req.analytics.ip;
    }

    analyticsEventLogger(eventData);

    res.json({
      success: true,
      message: 'Event logged successfully',
    });
  } catch (error) {
    logger.error('Error logging analytics event', { error });
    res.status(400).json({
      success: false,
      message: 'Failed to log event',
    });
  }
});

router.post('/lead', async (req: RequestWithAnalytics, res: Response) => {
  try {
    logger.info('Received lead request', {
      body: req.body,
      hasLead: !!req.body.lead,
      leadName: req.body.lead?.name,
      leadPhone: req.body.lead?.phone,
    });

    const { lead, utmParams, userData } = req.body;

    if (!lead || !lead.name || !lead.phone) {
      logger.warn('Invalid lead data received', {
        lead: req.body.lead,
        hasName: !!lead?.name,
        hasPhone: !!lead?.phone,
      });
      return res.status(400).json({
        success: false,
        message: 'Lead data is required (name and phone)',
      });
    }

    const enrichedUserData = {
      ...userData,
      ip: req.analytics?.ip,
    };

    // Проверяем подключение к MongoDB
    if (!mongodbService.isMongoConnected()) {
      logger.warn('MongoDB not connected, attempting to reconnect');
      try {
        await mongodbService.connect();
      } catch (error: any) {
        logger.error('Failed to connect to MongoDB', { error: error.message });
      }
    }

    // Сохраняем лид в MongoDB с проверкой дубликатов
    let mongoResult;
    let isDuplicate = false;

    if (mongodbService.isMongoConnected()) {
      mongoResult = await mongodbService.saveLead(lead, utmParams, enrichedUserData);
      isDuplicate = mongoResult.isDuplicate;

      if (isDuplicate) {
        logger.info('Duplicate lead detected, skipping save', {
          phone: lead.phone,
          name: lead.name,
          existingLeadId: mongoResult.lead?._id,
        });

        return res.status(409).json({
          success: false,
          message: 'Lead with this phone number already exists',
          isDuplicate: true,
        });
      }

      if (!mongoResult.success) {
        logger.error('Failed to save lead to MongoDB', {
          error: mongoResult.error,
          phone: lead.phone,
        });
        // Продолжаем выполнение, даже если не удалось сохранить в MongoDB
      }
    } else {
      logger.warn('MongoDB not connected, lead will not be saved to database');
    }

    // Логируем событие
    analyticsEventLogger({
      event: 'lead_created',
      lead,
      utmParams,
      userData: enrichedUserData,
      timestamp: new Date().toISOString(),
    });

    // Отправляем в Telegram только если это не дубликат
    let telegramSent = false;
    if (!isDuplicate) {
      telegramSent = await telegramService.sendLead({
        lead,
        utmParams,
        userData: enrichedUserData,
      });

      if (!telegramSent) {
        logger.warn('Lead was logged but failed to send to Telegram', {
          leadName: lead.name,
          leadPhone: lead.phone,
        });
      }
    } else {
      logger.info('Skipping Telegram notification for duplicate lead', {
        phone: lead.phone,
      });
    }

    res.json({
      success: true,
      message: 'Lead processed successfully',
      telegramSent,
      savedToMongo: mongoResult?.success || false,
      isDuplicate: false,
    });
  } catch (error: any) {
    logger.error('Error processing lead', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process lead',
    });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    timestamp: new Date().toISOString(),
  });
});

// GET эндпоинты для проверки (только для диагностики)
router.get('/event', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'This endpoint requires POST method. Use POST /api/analytics/event',
    method: 'GET',
    requiredMethod: 'POST',
  });
});

router.get('/lead', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: 'This endpoint requires POST method. Use POST /api/lead',
    method: 'GET',
    requiredMethod: 'POST',
  });
});

router.post('/test', (req: Request, res: Response) => {
  logger.info('Test endpoint called', { body: req.body });
  res.json({
    success: true,
    message: 'Test endpoint works',
    receivedData: req.body,
    timestamp: new Date().toISOString(),
  });
});

export default router;
