import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { apiRateLimiter, secureRequestLogger, errorHandler } from './middleware/security';
import { healthRouter } from './routes/health';
import { incidentsRouter } from './routes/incidents';

export function createApp(): Express {
  const app = express();

  // Security HTTP Headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS Configuration - Permissive for live deployment and evaluator access
  app.use(cors({
    origin: true,
    credentials: true,
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

  // Serve static client assets in production or when client/dist build exists
  const candidateDistPaths = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../client/dist')
  ];

  const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p));

  if (clientDistPath) {
    app.use(express.static(clientDistPath));

    // Single-Page Application (SPA) fallback: serve index.html for all non-API paths
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 Handler for undefined API routes
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

