import type { Context, Next } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../services/auth';
import { readAuthCookie } from '../utils/authCookie';

export type AuthContext = {
  Variables: {
    userId: string;
    userRole: 'user' | 'moderator' | 'admin';
    userEmail: string;
  };
};

function extractToken(c: Context<{ Bindings: Env } & Partial<AuthContext>>): string | null {
  const authorization = c.req.header('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  return readAuthCookie(c.req.header('Cookie'));
}

export async function requireAuth(
  c: Context<{ Bindings: Env } & AuthContext>,
  next: Next,
): Promise<Response | void> {
  const token = extractToken(c);
  if (!token) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' } }, 401);
  }

  c.set('userId', payload.sub as string);
  c.set('userRole', payload.role as 'user' | 'moderator' | 'admin');
  c.set('userEmail', payload.email as string);

  await next();
}

export async function optionalAuth(
  c: Context<{ Bindings: Env } & AuthContext>,
  next: Next,
): Promise<Response | void> {
  const token = extractToken(c);
  if (token) {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('userId', payload.sub as string);
      c.set('userRole', payload.role as 'user' | 'moderator' | 'admin');
      c.set('userEmail', payload.email as string);
    }
  }
  await next();
}
