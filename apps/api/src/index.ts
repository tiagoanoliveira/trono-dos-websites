import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { categoriesRouter } from './routes/categories';
import { websitesRouter } from './routes/websites';
import { ideasRouter } from './routes/ideas';
import { authRouter } from './routes/auth';
import { createError } from './utils/helpers';

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  DEBUG_LOGS?: string; // set to "true" to log requests
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
app.use('*', async (c, next) => {
  // Read per-request so toggling DEBUG_LOGS takes effect without waiting for isolates to recycle.
  if (c.env.DEBUG_LOGS === 'true') {
    console.log('[request]', c.req.method, c.req.path, { origin: c.req.header('Origin') ?? 'n/a' });
  }
  await next();
});

app.use('*', async (c, next) => {
  if (!c.env.DB) {
    console.error('[config] Missing D1 binding DB');
    return c.json(createError('CONFIG_ERROR', 'DB binding not configured'), 500);
  }
  await next();
});

app.get('/api/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    },
  });
});

app.route('/api/auth', authRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/websites', websitesRouter);
app.route('/api/ideas', ideasRouter);

app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

app.onError((err, c) => {
  console.error('[unhandled error]', err);
  return c.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500,
  );
});

export default app;
