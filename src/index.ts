import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorLogger, requestLogger } from './middleware/logging.middleware';
import analyticsRoutes from './routes/analytics.routes';
import { logger } from './utils/logger';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

app.set('trust proxy', true);
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://quizthenox.live',
      'https://www.quizthenox.live',
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(requestLogger);

// Тестовый эндпоинт для проверки работы сервера
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    routes: {
      analytics: '/api/analytics/event (POST)',
      lead: '/api/lead (POST)',
      health: '/api/analytics/health (GET)',
    },
  });
});

// Диагностический эндпоинт для проверки всех зарегистрированных маршрутов
app.get('/api/routes', (req, res) => {
  const routes: string[] = [];
  app._router?.stack?.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack?.forEach((handler: any) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods).join(', ').toUpperCase();
          routes.push(`${method} ${middleware.regexp.source.replace(/\\\//g, '/').replace(/\^|\$/g, '')}${handler.route.path}`);
        }
      });
    }
  });
  
  res.json({
    success: true,
    message: 'Registered routes',
    routes,
    timestamp: new Date().toISOString(),
  });
});

// Маршруты для /api/analytics/*
app.use('/api/analytics', analyticsRoutes);
// Маршруты для /api/* (например, /api/lead, /api/health)
app.use('/api', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KVIZ Analytics API',
    version: '1.0.0',
    endpoints: {
      analytics: '/api/analytics/event (POST)',
      lead: '/api/lead (POST)',
      health: '/api/analytics/health (GET)',
      serverHealth: '/health (GET)',
    },
  });
});

app.use(errorLogger);

let server: any;

try {
  server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Please wait for nodemon to restart...`);
      setTimeout(() => process.exit(0), 1000);
    } else {
      logger.error('Server error:', error);
    }
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;
