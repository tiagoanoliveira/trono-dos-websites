import { Hono } from 'hono';
import type { Env } from '../index';
import { createError, createSuccess } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  created_at: string;
};

export const notificationsRouter = new Hono<{ Bindings: Env } & AuthContext>();

notificationsRouter.get('/mine', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const rows = await c.env.DB.prepare(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
    )
      .bind(userId)
      .all<NotificationRow>()
      .then((r) => r.results);

    return c.json(
      createSuccess(
        rows.map((row) => ({
          ...row,
          is_read: Boolean(row.is_read),
        })),
      ),
    );
  } catch (err) {
    console.error('[notifications GET /mine]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar notificações'), 500);
  }
});

notificationsRouter.post('/mine/read', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
      .bind(userId)
      .run();
    return c.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[notifications POST /mine/read]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível atualizar notificações'), 500);
  }
});
