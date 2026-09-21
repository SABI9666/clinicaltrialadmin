import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { authRoutes } from './routes/auth.routes.js';
import { publicRoutes } from './routes/public.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { storeBackend } from './db/store.js';

export function createApp() {
  const app = express();

  // Cloud Run terminates TLS at the load balancer, so trust its forwarded
  // headers for correct client IPs in rate limiting and logs.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The API serves JSON and uploaded images, never HTML pages, so the
      // default cross-origin resource policy would block the frontend.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  const allowed = config.corsOrigins;
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin/server-side calls arrive with no Origin header.
        if (!origin) return cb(null, true);
        if (allowed.length === 0) return cb(null, true);
        cb(null, allowed.includes(origin));
      },
      credentials: false,
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // Locally uploaded images; on GCP these are served straight from the bucket.
  if (!config.storage.enabled) {
    app.use('/uploads', express.static(config.storage.localDir, { maxAge: '1h' }));
  }

  app.get('/healthz', (req, res) =>
    res.json({ status: 'ok', env: config.env, store: storeBackend(), time: new Date().toISOString() }),
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
