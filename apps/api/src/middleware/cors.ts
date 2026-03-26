import type { MiddlewareHandler } from 'hono';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

// Allows credentialed requests (cookies). In production, set FRONTEND_ORIGIN
// to your Pages domain (e.g. https://trono-dos-websites.pages.dev).
export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  const allowedOrigin = c.env.FRONTEND_ORIGIN || requestOrigin || '*';

  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  c.header('Access-Control-Allow-Headers', `${ALLOWED_HEADERS}, Cookie`);

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  await next();
};
