import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // Don't crash on boot for optional-in-dev keys; warn loudly instead.
    console.warn(`[config] Missing env var: ${name}`);
    return '';
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 3001),

  tmdb: {
    apiKey: required('TMDB_API_KEY'),
    baseUrl: 'https://api.themoviedb.org/3',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://redis:6379',
  },

  postgres: {
    host: process.env.POSTGRES_HOST ?? 'postgres',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'binger',
    user: process.env.POSTGRES_USER ?? 'binger_user',
    password: process.env.POSTGRES_PASSWORD ?? '',
  },

  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    openaiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'claude-sonnet-4-6',
    /** Daily cron for batch AI recs (server timezone below). Default 03:00. */
    batchCron: process.env.AI_RECS_BATCH_CRON ?? '0 3 * * *',
    batchTimezone: process.env.AI_RECS_BATCH_TZ ?? 'Asia/Tehran',
    batchEnabled: process.env.AI_RECS_BATCH_ENABLED !== 'false',
  },

  auth: {
    jwtSecret: required('JWT_SECRET', 'dev-insecure-change-me'),
    accessTtlSec: Number(process.env.JWT_ACCESS_TTL_SEC ?? 3600),
    refreshTtlSec: Number(process.env.JWT_REFRESH_TTL_SEC ?? 2592000),
    magicLinkTtlSec: Number(process.env.MAGIC_LINK_TTL_SEC ?? 900),
    defaultAppRedirect: process.env.APP_REDIRECT_URL ?? 'binger://auth/callback',
    publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:8080',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Binger <noreply@binger.app>',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'gcs',
    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    publicUploadBaseUrl:
      process.env.PUBLIC_UPLOAD_BASE_URL ?? `${process.env.PUBLIC_API_URL ?? 'http://localhost:8080'}/uploads`,
    gcsBucket: process.env.GCS_BUCKET ?? '',
  },

  // TTLs in seconds.
  cacheTtl: {
    showDetails: 6 * 60 * 60, // 6h
    season: 6 * 60 * 60,
    episode: 6 * 60 * 60,
    search: 60 * 60, // 1h
    trending: 30 * 60, // 30m
    list: 60 * 60, // generic discover lists
    aiRecs: 24 * 60 * 60, // 24h
  },
} as const;
