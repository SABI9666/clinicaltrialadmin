import 'dotenv/config';

const bool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const list = (v) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),

  // Comma-separated list of allowed origins (the Vercel frontend + admin URLs).
  // Empty list means "reflect any origin", which is only sensible in development.
  corsOrigins: list(process.env.CORS_ORIGINS),

  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },

  database: {
    // Neon's pooled connection string. Use the host containing "-pooler":
    // Cloud Run scales to many instances and the direct endpoint will run out
    // of connections.
    url: process.env.DATABASE_URL ?? '',
    enabled: bool(process.env.USE_POSTGRES, false),
    ssl: bool(process.env.DATABASE_SSL, true),
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 5),
  },

  firestore: {
    projectId: process.env.GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? '',
    databaseId: process.env.FIRESTORE_DATABASE_ID ?? '(default)',
    // When unset/false the API falls back to an on-disk JSON store so the
    // project runs locally with no GCP credentials.
    enabled: bool(process.env.USE_FIRESTORE, false),
  },

  storage: {
    bucket: process.env.GCS_BUCKET ?? '',
    publicBaseUrl: process.env.GCS_PUBLIC_BASE_URL ?? '',
    enabled: bool(process.env.USE_GCS, false),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
    localDir: process.env.LOCAL_UPLOAD_DIR ?? 'uploads',
  },

  bootstrapAdmin: {
    email: process.env.ADMIN_EMAIL ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  },

  seedOnBoot: bool(process.env.SEED_ON_BOOT, true),
  dataFile: process.env.DATA_FILE ?? '.data/store.json',
};

/** Fail fast on anything that must not fall back to a default in production. */
export function assertProductionConfig() {
  if (config.env !== 'production') return;
  const missing = [];
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    missing.push('JWT_SECRET (min 32 chars)');
  }
  if (config.corsOrigins.length === 0) missing.push('CORS_ORIGINS');
  if (config.database.enabled && !config.database.url) missing.push('DATABASE_URL');
  if (config.firestore.enabled && !config.firestore.projectId) missing.push('GCP_PROJECT_ID');
  if (config.storage.enabled && !config.storage.bucket) missing.push('GCS_BUCKET');
  if (config.database.enabled && config.firestore.enabled) {
    missing.push('only one of USE_POSTGRES / USE_FIRESTORE may be set');
  }
  if (missing.length) {
    throw new Error(`Missing required production config: ${missing.join(', ')}`);
  }
}
