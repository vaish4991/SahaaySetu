import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRateLimiter, secureRequestLogger, errorHandler } from './middleware/security';
import { healthRouter } from './routes/health';
import { incidentsRouter } from './routes/incidents';

export function createApp(): Express {
  const app = express();

  // Security HTTP Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS Configuration
  app.use(cors({
    origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body Parsing with safe size bounds
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging & Rate Limiting
  app.use(secureRequestLogger);
  app.use('/api', apiRateLimiter);

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/incidents', incidentsRouter);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
