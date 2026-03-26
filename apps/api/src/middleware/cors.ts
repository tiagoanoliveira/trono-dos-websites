import type { MiddlewareHandler } from 'hono';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

// NOTE: '*' is suitable for development. For production, restrict to your
// frontend origin (e.g. https://trono-dos-websites.pages.dev) and pass the
// allowed origin via an environment variable.
export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  c.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  await next();
};
