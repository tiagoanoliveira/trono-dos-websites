import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError, generateId, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { requireAuth, optionalAuth, type AuthContext } from '../middleware/auth';

type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  suggested_by: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  feature_count: number;
  comment_count: number;
  claimed_user_name?: string | null;
};

type IdeaDetail = IdeaRow & {
  features: IdeaFeature[];
  comments: IdeaComment[];
};

type IdeaFeature = {
  id: string;
  idea_id: string;
  description: string;
  created_by: string | null;
  created_at: string;
};

type IdeaComment = {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
};

const APPROVAL_THRESHOLD = 10;

function resolveStatus(row: IdeaRow) {
  if (row.status !== 'approved' && row.upvotes - row.downvotes >= APPROVAL_THRESHOLD) {
    return 'approved';
  }
  return row.status;
}

export const ideasRouter = new Hono<{ Bindings: Env } & AuthContext>();

ideasRouter.get('/', optionalAuth, async (c) => {
  try {
    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);

    const rows = await c.env.DB.prepare(
      `SELECT i.*,
              COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END),0) AS upvotes,
              COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END),0) AS downvotes,
              COALESCE(f.feature_count,0) AS feature_count,
              COALESCE(cm.comment_count,0) AS comment_count,
              cu.name AS claimed_user_name,
              cu.avatar_url AS claimed_user_avatar
       FROM ideas i
       LEFT JOIN idea_votes v ON v.idea_id = i.id
       LEFT JOIN (
         SELECT idea_id, COUNT(*) AS feature_count FROM idea_features GROUP BY idea_id
       ) f ON f.idea_id = i.id
       LEFT JOIN (
         SELECT idea_id, COUNT(*) AS comment_count FROM idea_comments GROUP BY idea_id
       ) cm ON cm.idea_id = i.id
       LEFT JOIN users cu ON cu.id = i.claimed_by
       GROUP BY i.id
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(perPage, offset)
      .all<IdeaRow>()
      .then((r) => r.results.map((row) => ({ ...row, status: resolveStatus(row) })));

    const totalRow = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM ideas')
      .first<{ total: number }>();

    return c.json(createSuccess(rows, buildPaginationMeta(totalRow?.total ?? 0, page, perPage)));
  } catch (err) {
    console.error('[ideas GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha ao carregar ideias'), 500);
  }
});

ideasRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const { id } = c.req.param();

    const idea = await c.env.DB.prepare(
      `SELECT i.*,
              COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END),0) AS upvotes,
              COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END),0) AS downvotes,
              COALESCE(f.feature_count,0) AS feature_count,
              COALESCE(cm.comment_count,0) AS comment_count,
              cu.name AS claimed_user_name,
              cu.avatar_url AS claimed_user_avatar
       FROM ideas i
       LEFT JOIN idea_votes v ON v.idea_id = i.id
       LEFT JOIN (
         SELECT idea_id, COUNT(*) AS feature_count FROM idea_features GROUP BY idea_id
       ) f ON f.idea_id = i.id
       LEFT JOIN (
         SELECT idea_id, COUNT(*) AS comment_count FROM idea_comments GROUP BY idea_id
       ) cm ON cm.idea_id = i.id
       LEFT JOIN users cu ON cu.id = i.claimed_by
       WHERE i.id = ?
       GROUP BY i.id`,
    )
      .bind(id)
      .first<IdeaRow>();

    if (!idea) {
      return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);
    }

    const features = await c.env.DB.prepare(
      'SELECT * FROM idea_features WHERE idea_id = ? ORDER BY created_at DESC',
    )
      .bind(id)
      .all<IdeaFeature>()
      .then((r) => r.results);

    const comments = await c.env.DB.prepare(
      `SELECT ic.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM idea_comments ic
       JOIN users u ON u.id = ic.user_id
       WHERE ic.idea_id = ?
       ORDER BY ic.created_at DESC`,
    )
      .bind(id)
      .all<IdeaComment>()
      .then((r) => r.results);

    const resolved: IdeaDetail = {
      ...idea,
      status: resolveStatus(idea),
      features,
      comments,
    };

    return c.json(createSuccess(resolved));
  } catch (err) {
    console.error('[ideas GET /:id]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha ao carregar ideia'), 500);
  }
});

ideasRouter.post('/', requireAuth, async (c) => {
  try {
    let body: { title?: unknown; description?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { title, description } = body;
    if (typeof title !== 'string' || title.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Título deve ter pelo menos 3 caracteres'), 400);
    }

    const id = generateId();
    const userId = c.get('userId');

    await c.env.DB.prepare(
      'INSERT INTO ideas (id, title, description, suggested_by) VALUES (?, ?, ?, ?)',
    )
      .bind(id, title.trim(), description && typeof description === 'string' ? description.trim() : null, userId)
      .run();

    return c.json(createSuccess({ id }), 201);
  } catch (err) {
    console.error('[ideas POST /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível criar a ideia'), 500);
  }
});

ideasRouter.post('/:id/votes', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    let body: { value?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }
    const { value } = body;
    if (value !== 1 && value !== -1 && value !== 0) {
      return c.json(createError('VALIDATION_ERROR', 'Voto inválido'), 400);
    }

    const idea = await c.env.DB.prepare('SELECT id FROM ideas WHERE id = ?').bind(id).first();
    if (!idea) return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);

    if (value === 0) {
      await c.env.DB.prepare('DELETE FROM idea_votes WHERE idea_id = ? AND user_id = ?').bind(id, userId).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO idea_votes (id, idea_id, user_id, value)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(idea_id, user_id) DO UPDATE SET value = excluded.value, created_at = CURRENT_TIMESTAMP`,
      )
        .bind(generateId(), id, userId, value)
        .run();
    }

    const totals = await c.env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END),0) AS upvotes,
        COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END),0) AS downvotes
       FROM idea_votes WHERE idea_id = ?`,
    )
      .bind(id)
      .first<{ upvotes: number; downvotes: number }>();

    if (totals) {
      const computedStatus = totals.upvotes - totals.downvotes >= APPROVAL_THRESHOLD ? 'approved' : undefined;
      if (computedStatus) {
        await c.env.DB.prepare('UPDATE ideas SET status = ? WHERE id = ?').bind(computedStatus, id).run();
      }
    }

    return c.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[ideas POST /:id/votes]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível votar'), 500);
  }
});

ideasRouter.post('/:id/features', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    let body: { description?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { description } = body;
    if (typeof description !== 'string' || description.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Descrição deve ter pelo menos 3 caracteres'), 400);
    }

    const idea = await c.env.DB.prepare('SELECT id FROM ideas WHERE id = ?').bind(id).first();
    if (!idea) return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);

    const featureId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO idea_features (id, idea_id, description, created_by) VALUES (?, ?, ?, ?)',
    )
      .bind(featureId, id, description.trim(), userId)
      .run();

    return c.json(createSuccess({ id: featureId }), 201);
  } catch (err) {
    console.error('[ideas POST /:id/features]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível adicionar funcionalidade'), 500);
  }
});

ideasRouter.post('/:id/comments', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    let body: { content?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { content } = body;
    if (typeof content !== 'string' || content.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Comentário deve ter pelo menos 3 caracteres'), 400);
    }

    const idea = await c.env.DB.prepare('SELECT id FROM ideas WHERE id = ?').bind(id).first();
    if (!idea) return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);

    const commentId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO idea_comments (id, idea_id, user_id, content) VALUES (?, ?, ?, ?)',
    )
      .bind(commentId, id, userId, content.trim())
      .run();

    return c.json(createSuccess({ id: commentId }), 201);
  } catch (err) {
    console.error('[ideas POST /:id/comments]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível comentar'), 500);
  }
});

ideasRouter.post('/:id/claim', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const idea = await c.env.DB.prepare('SELECT claimed_by FROM ideas WHERE id = ?').bind(id).first<{
      claimed_by: string | null;
    }>();
    if (!idea) return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);

    if (idea.claimed_by) {
      return c.json(createError('ALREADY_CLAIMED', 'Esta ideia já foi reclamada'), 409);
    }

    await c.env.DB.prepare(
      'UPDATE ideas SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP, status = COALESCE(status, "open") WHERE id = ?',
    )
      .bind(userId, id)
      .run();

    return c.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[ideas POST /:id/claim]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível reclamar a ideia'), 500);
  }
});
