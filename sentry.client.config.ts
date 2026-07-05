import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Only enable Sentry if DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring sample rate (adjust for production)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay session sample rate
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Don't send PII
  sendDefaultPii: false,

  // Ignore common non-actionable errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    'Network Error',
    'Request aborted',
    'Load failed',
    'ChunkLoadError',
  ],
});
