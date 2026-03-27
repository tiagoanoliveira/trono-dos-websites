import type { MiddlewareHandler } from 'hono';
import { createError } from '../utils/helpers';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

// Allows credentialed requests (cookies). Echoes the request's Origin (or "*"
// if none is sent).
export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const requestOrigin = c.req.header('Origin');

  const allowedOrigin = requestOrigin ?? '*';
  const allowCredentials = allowedOrigin !== '*';

  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Vary', 'Origin');
  if (allowCredentials) {
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  c.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  c.header('Access-Control-Allow-Headers', `${ALLOWED_HEADERS}, Cookie`);

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  await next();
};
