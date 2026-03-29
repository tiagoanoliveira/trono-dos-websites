import { Hono } from 'hono';
import type { Env } from '../index';
import { createError, createSuccess, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';

type UserRow = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
};

const ALLOWED_ROLES = new Set(['user', 'moderator', 'admin']);

export const usersRouter = new Hono<{ Bindings: Env } & AuthContext>();

usersRouter.get('/', requireAuth, async (c) => {
  try {
    if (c.get('userRole') !== 'admin') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { page, perPage, offset } = getPaginationParams(new URL(c.req.url));

    const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>();

    const rows = await c.env.DB.prepare(
      `SELECT id, email, name, avatar_url, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(perPage, offset)
      .all<UserRow>()
      .then((r) => r.results);

    return c.json(createSuccess(rows, buildPaginationMeta(count?.total ?? 0, page, perPage)));
  } catch (err) {
    console.error('[users GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível listar utilizadores'), 500);
  }
});

usersRouter.patch('/:id/role', requireAuth, async (c) => {
  try {
    if (c.get('userRole') !== 'admin') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { id } = c.req.param();
    let body: { role?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const role = body.role;
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      return c.json(createError('VALIDATION_ERROR', 'Role inválido'), 400);
    }

    const result = await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    )
      .bind(role, id)
      .run();

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json(createError('NOT_FOUND', 'Utilizador não encontrado'), 404);
    }

    return c.json(createSuccess({ id, role }));
  } catch (err) {
    console.error('[users PATCH /:id/role]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível atualizar role'), 500);
  }
});
