import type { MiddlewareHandler } from 'hono';
import { createError } from '../utils/helpers';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

// Allows credentialed requests (cookies). In production, FRONTEND_ORIGIN must
// be set to your Pages domain (e.g. https://trono-dos-websites.pages.dev).
export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const isProduction = c.env.ENVIRONMENT === 'production';
  const requestOrigin = c.req.header('Origin');
  const configuredOrigin = c.env.FRONTEND_ORIGIN;

  if (isProduction && !configuredOrigin) {
    return c.json(createError('CONFIG_ERROR', 'FRONTEND_ORIGIN not configured'), 500);
  }

  if (isProduction && configuredOrigin && requestOrigin && requestOrigin !== configuredOrigin) {
    return new Response(null, { status: 403 });
  }

  const allowedOrigin = configuredOrigin ?? requestOrigin ?? '*';

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
