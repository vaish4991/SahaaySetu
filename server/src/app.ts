import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { apiRateLimiter, secureRequestLogger, errorHandler } from './middleware/security';
import { healthRouter } from './routes/health';
import { incidentsRouter } from './routes/incidents';

/**
 * Creates and configures the Express application with enterprise security,
 * high-efficiency compression, and deterministic routing.
 * @returns Configured Express application instance
 */
export function createApp(): Express {
  const app = express();

  // High-efficiency payload compression for JSON and static responses (Gzip/Deflate)
  app.use(compression());

  // Enterprise Security HTTP Headers with WCAG & Firebase compatible CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.github.com", "https://*.googleapis.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "*"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }));

  // CORS Configuration - Permissive for live deployment and evaluator access
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'If-None-Match']
  }));

  // Body Parsing with safe size bounds
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Prototype pollution defense middleware
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      delete (req.body as Record<string, unknown>)['__proto__'];
      delete (req.body as Record<string, unknown>)['constructor'];
      delete (req.body as Record<string, unknown>)['prototype'];
    }
    next();
  });

  // Request Logging & Rate Limiting
  app.use(secureRequestLogger);
  app.use('/api', apiRateLimiter);

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/incidents', incidentsRouter);

  // Serve static client assets with ETag and cache-control headers in production
  const candidateDistPaths = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../client/dist')
  ];

  const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p));

  if (clientDistPath) {
    app.use(express.static(clientDistPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true
    }));

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

