import type { Context, Next } from 'hono';
import type { Env } from '../index';
import { verifyJWT } from '../services/auth';

export type AuthContext = {
  Variables: {
    userId: string;
    userRole: 'user' | 'moderator' | 'admin';
    userEmail: string;
  };
};

export async function requireAuth(
  c: Context<{ Bindings: Env } & AuthContext>,
  next: Next,
): Promise<Response | void> {
  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } }, 401);
  }

  const token = authorization.slice(7);
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
  const authorization = c.req.header('Authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('userId', payload.sub as string);
      c.set('userRole', payload.role as 'user' | 'moderator' | 'admin');
      c.set('userEmail', payload.email as string);
    }
  }
  await next();
}
