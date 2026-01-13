import { Request, Response, Router } from 'express';
import { analyticsEventLogger, RequestWithAnalytics } from '../middleware/logging.middleware';
import telegramService from '../services/telegram.service';
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

    analyticsEventLogger({
      event: 'lead_created',
      lead,
      utmParams,
      userData: enrichedUserData,
      timestamp: new Date().toISOString(),
    });

    const telegramSent = await telegramService.sendLead({
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

    res.json({
      success: true,
      message: 'Lead processed successfully',
      telegramSent,
    });
  } catch (error) {
    logger.error('Error processing lead', { error });
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
