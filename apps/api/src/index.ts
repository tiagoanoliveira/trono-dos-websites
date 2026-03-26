import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { categoriesRouter } from './routes/categories';
import { websitesRouter } from './routes/websites';

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);

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

app.route('/api/categories', categoriesRouter);
app.route('/api/websites', websitesRouter);

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
