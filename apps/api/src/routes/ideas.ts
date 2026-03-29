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
  user_vote?: number | null;
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
  upvotes?: number;
  downvotes?: number;
  score?: number;
  user_vote?: number | null;
};

type IdeaComment = {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  status: string;
  updated_at: string;
  kind?: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: number | null;
  replies: IdeaComment[];
};

const APPROVAL_THRESHOLD = 10;
const MIN_COMMENT_LENGTH = 3;
const MAX_COMMENT_LENGTH = 1000;
const COMMENT_KINDS = new Set(['opinion', 'suggestion', 'issue', 'praise', 'other', 'general']);
let ideaFeatureVotesSchemaEnsured = false;
let ideaCommentsSchemaEnsured = false;

async function ensureIdeaFeatureVotesTable(db: D1Database) {
  if (ideaFeatureVotesSchemaEnsured) return;
  // TODO: Remover este fallback quando todos os ambientes tiverem a migração 006 aplicada.
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS idea_feature_votes (
      id TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL REFERENCES idea_features(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK (value IN (-1, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(feature_id, user_id)
    )`,
  ).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_idea_feature_votes_feature ON idea_feature_votes(feature_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_idea_feature_votes_user ON idea_feature_votes(user_id)').run();
  ideaFeatureVotesSchemaEnsured = true;
}

async function ensureIdeaCommentsSchema(db: D1Database) {
  if (ideaCommentsSchemaEnsured) return;
  // TODO: substituir por migração 007 dedicada e remover este fallback após rollout completo.
  const columns = await db.prepare('PRAGMA table_info(idea_comments)')
    .all<{ name: string }>()
    .then((r) => r.results.map((row) => row.name));

  if (!columns.includes('parent_id')) {
    await db.prepare('ALTER TABLE idea_comments ADD COLUMN parent_id TEXT REFERENCES idea_comments(id)').run();
  }
  if (!columns.includes('status')) {
    await db.prepare('ALTER TABLE idea_comments ADD COLUMN status TEXT DEFAULT "visible"').run();
  }
  if (!columns.includes('updated_at')) {
    await db.prepare('ALTER TABLE idea_comments ADD COLUMN updated_at TEXT').run();
  }
  if (!columns.includes('kind')) {
    await db.prepare('ALTER TABLE idea_comments ADD COLUMN kind TEXT DEFAULT "general"').run();
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS idea_comment_votes (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES idea_comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK (value IN (-1, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id)
    )`,
  ).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_idea_comment_votes_comment ON idea_comment_votes(comment_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_idea_comment_votes_user ON idea_comment_votes(user_id)').run();
  ideaCommentsSchemaEnsured = true;
}

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
              ${c.get('userId') ? 'MAX(CASE WHEN v.user_id = ? THEN v.value END)' : 'NULL'} AS user_vote,
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
      .bind(...(c.get('userId') ? [c.get('userId'), perPage, offset] : [perPage, offset]))
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
    const userId = c.get('userId');
    await ensureIdeaFeatureVotesTable(c.env.DB);
    await ensureIdeaCommentsSchema(c.env.DB);

    const idea = await c.env.DB.prepare(
      `SELECT i.*,
              COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END),0) AS upvotes,
              COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END),0) AS downvotes,
              ${userId ? 'MAX(CASE WHEN v.user_id = ? THEN v.value END)' : 'NULL'} AS user_vote,
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
      .bind(...(userId ? [userId, id] : [id]))
      .first<IdeaRow>();

    if (!idea) {
      return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);
    }

    const features = await c.env.DB.prepare(
      `SELECT
         f.id,
         f.idea_id,
         f.description,
         f.created_by,
         f.created_at,
         COALESCE(SUM(CASE WHEN fv.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
         COALESCE(SUM(CASE WHEN fv.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
         COALESCE(SUM(fv.value), 0) AS score,
         ${userId ? 'MAX(CASE WHEN fv.user_id = ? THEN fv.value END)' : 'NULL'} AS user_vote
       FROM idea_features f
       LEFT JOIN idea_feature_votes fv ON fv.feature_id = f.id
       WHERE f.idea_id = ?
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
    )
      .bind(...(userId ? [userId, id] : [id]))
      .all<IdeaFeature>()
      .then((r) => r.results);

    const commentRows = await c.env.DB.prepare(
      `SELECT
         ic.id,
         ic.idea_id,
         ic.user_id,
         ic.content,
         ic.parent_id,
         COALESCE(ic.status, 'visible') AS status,
         ic.created_at,
         COALESCE(ic.updated_at, ic.created_at) AS updated_at,
         COALESCE(ic.kind, 'general') AS kind,
         u.name AS user_name,
         u.avatar_url AS user_avatar,
         COALESCE(v.upvotes, 0) AS upvotes,
         COALESCE(v.downvotes, 0) AS downvotes,
         COALESCE(v.score, 0) AS score,
         ${userId ? 'uv.value AS user_vote' : 'NULL AS user_vote'}
       FROM idea_comments ic
       JOIN users u ON u.id = ic.user_id
       LEFT JOIN (
         SELECT
           comment_id,
           SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS upvotes,
           SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS downvotes,
           SUM(value) AS score
         FROM idea_comment_votes
         GROUP BY comment_id
       ) v ON v.comment_id = ic.id
       ${userId ? 'LEFT JOIN idea_comment_votes uv ON uv.comment_id = ic.id AND uv.user_id = ?' : ''}
       WHERE ic.idea_id = ? AND COALESCE(ic.status, 'visible') = 'visible'
       ORDER BY ic.created_at DESC`,
    )
      .bind(...(userId ? [userId, id] : [id]))
      .all<{
        id: string;
        idea_id: string;
        user_id: string;
        content: string;
        parent_id: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        kind: string;
        user_name: string;
        user_avatar: string | null;
        upvotes: number;
        downvotes: number;
        score: number;
        user_vote: number | null;
      }>()
      .then((r) => r.results);

    const comments: IdeaComment[] = commentRows.map((row) => ({
      id: row.id,
      idea_id: row.idea_id,
      user_id: row.user_id,
      content: row.content,
      parent_id: row.parent_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      kind: row.kind ?? 'general',
      user: {
        id: row.user_id,
        name: row.user_name,
        avatar_url: row.user_avatar,
      },
      upvotes: row.upvotes ?? 0,
      downvotes: row.downvotes ?? 0,
      score: row.score ?? 0,
      user_vote: row.user_vote ?? null,
      replies: [],
    }));

    const commentMap = new Map<string, IdeaComment>();
    comments.forEach((comment) => commentMap.set(comment.id, comment));
    const rootComments: IdeaComment[] = [];
    comments.forEach((comment) => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)?.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    const resolved: IdeaDetail = {
      ...idea,
      status: resolveStatus(idea),
      features,
      comments: rootComments,
    };

    return c.json(createSuccess(resolved));
  } catch (err) {
    console.error('[ideas GET /:id]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha ao carregar ideia'), 500);
  }
});

ideasRouter.post('/', requireAuth, async (c) => {
  try {
    let body: { title?: unknown; description?: unknown; features?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { title, description, features } = body;
    if (typeof title !== 'string' || title.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Título deve ter pelo menos 3 caracteres'), 400);
    }

    let normalizedFeatures: string[] = [];
    if (features !== undefined) {
      if (!Array.isArray(features)) {
        return c.json(createError('VALIDATION_ERROR', 'Features devem ser uma lista de itens'), 400);
      }
      normalizedFeatures = features
        .filter((feature): feature is string => typeof feature === 'string')
        .map((feature) => feature.trim())
        .filter((feature) => feature.length >= 3);
    }

    const id = generateId();
    const userId = c.get('userId');

    await c.env.DB.prepare(
      'INSERT INTO ideas (id, title, description, suggested_by) VALUES (?, ?, ?, ?)',
    )
      .bind(id, title.trim(), description && typeof description === 'string' ? description.trim() : null, userId)
      .run();

    for (const feature of normalizedFeatures) {
      await c.env.DB.prepare(
        'INSERT INTO idea_features (id, idea_id, description, created_by) VALUES (?, ?, ?, ?)',
      )
        .bind(generateId(), id, feature, userId)
        .run();
    }

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

ideasRouter.post('/:id/features/:featureId/votes', requireAuth, async (c) => {
  try {
    const { id, featureId } = c.req.param();
    const userId = c.get('userId');
    await ensureIdeaFeatureVotesTable(c.env.DB);

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

    const feature = await c.env.DB.prepare(
      'SELECT id FROM idea_features WHERE id = ? AND idea_id = ?',
    )
      .bind(featureId, id)
      .first<{ id: string }>();
    if (!feature) return c.json(createError('NOT_FOUND', 'Feature não encontrada'), 404);

    if (value === 0) {
      await c.env.DB.prepare(
        'DELETE FROM idea_feature_votes WHERE feature_id = ? AND user_id = ?',
      )
        .bind(featureId, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO idea_feature_votes (id, feature_id, user_id, value)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(feature_id, user_id) DO UPDATE SET value = excluded.value, created_at = CURRENT_TIMESTAMP`,
      )
        .bind(generateId(), featureId, userId, value)
        .run();
    }

    const totals = await c.env.DB.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
         COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
         COALESCE(SUM(value), 0) AS score,
         MAX(CASE WHEN user_id = ? THEN value END) AS user_vote
       FROM idea_feature_votes
       WHERE feature_id = ?`,
    )
      .bind(userId, featureId)
      .first<{ upvotes: number; downvotes: number; score: number; user_vote: number | null }>();

    return c.json(
      createSuccess({
        upvotes: totals?.upvotes ?? 0,
        downvotes: totals?.downvotes ?? 0,
        score: totals?.score ?? 0,
        user_vote: totals?.user_vote ?? null,
      }),
    );
  } catch (err) {
    console.error('[ideas POST /:id/features/:featureId/votes]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível votar na feature'), 500);
  }
});

ideasRouter.post('/:id/comments', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');
    await ensureIdeaCommentsSchema(c.env.DB);

    let body: { content?: unknown; parentId?: unknown; kind?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { content, parentId, kind } = body;
    if (
      typeof content !== 'string' ||
      content.trim().length < MIN_COMMENT_LENGTH ||
      content.trim().length > MAX_COMMENT_LENGTH
    ) {
      return c.json(
        createError(
          'VALIDATION_ERROR',
          `Comentário deve ter entre ${MIN_COMMENT_LENGTH} e ${MAX_COMMENT_LENGTH} caracteres`,
        ),
        400,
      );
    }

    if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
      return c.json(createError('VALIDATION_ERROR', 'parentId inválido'), 400);
    }

    if (parentId) {
      const parent = await c.env.DB.prepare(
        'SELECT id FROM idea_comments WHERE id = ? AND idea_id = ? AND COALESCE(status, "visible") = "visible"',
      )
        .bind(parentId, id)
        .first<{ id: string }>();

      if (!parent) {
        return c.json(createError('VALIDATION_ERROR', 'Comentário pai não encontrado'), 400);
      }
    }

    let normalizedKind = 'general';
    if (kind !== undefined && kind !== null) {
      if (typeof kind !== 'string' || !COMMENT_KINDS.has(kind)) {
        return c.json(createError('VALIDATION_ERROR', 'Tipo de comentário inválido'), 400);
      }
      normalizedKind = kind;
    }

    const idea = await c.env.DB.prepare('SELECT id FROM ideas WHERE id = ?').bind(id).first();
    if (!idea) return c.json(createError('NOT_FOUND', 'Ideia não encontrada'), 404);

    const commentId = generateId();
    await c.env.DB.prepare(
      `INSERT INTO idea_comments (id, idea_id, user_id, content, parent_id, status, kind, updated_at)
       VALUES (?, ?, ?, ?, ?, 'visible', ?, CURRENT_TIMESTAMP)`,
    )
      .bind(commentId, id, userId, content.trim(), parentId ?? null, normalizedKind)
      .run();

    const inserted = await c.env.DB.prepare(
      `SELECT ic.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM idea_comments ic
       JOIN users u ON u.id = ic.user_id
       WHERE ic.id = ?`,
    )
      .bind(commentId)
      .first<{
        id: string;
        idea_id: string;
        user_id: string;
        content: string;
        parent_id: string | null;
        status: string | null;
        created_at: string;
        updated_at: string | null;
        kind: string | null;
        user_name: string;
        user_avatar: string | null;
      }>();

    if (!inserted) {
      return c.json(createError('INTERNAL_ERROR', 'Erro ao criar comentário'), 500);
    }

    return c.json(
      createSuccess({
        id: inserted.id,
        idea_id: inserted.idea_id,
        user_id: inserted.user_id,
        content: inserted.content,
        parent_id: inserted.parent_id,
        status: inserted.status ?? 'visible',
        created_at: inserted.created_at,
        updated_at: inserted.updated_at ?? inserted.created_at,
        kind: inserted.kind ?? 'general',
        user: {
          id: inserted.user_id,
          name: inserted.user_name,
          avatar_url: inserted.user_avatar,
        },
        upvotes: 0,
        downvotes: 0,
        score: 0,
        user_vote: 0,
        replies: [],
      }),
      201,
    );
  } catch (err) {
    console.error('[ideas POST /:id/comments]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível comentar'), 500);
  }
});

ideasRouter.post('/comments/:commentId/votes', requireAuth, async (c) => {
  try {
    const { commentId } = c.req.param();
    const userId = c.get('userId');
    await ensureIdeaCommentsSchema(c.env.DB);

    const comment = await c.env.DB.prepare(
      'SELECT id FROM idea_comments WHERE id = ? AND COALESCE(status, "visible") = "visible"',
    )
      .bind(commentId)
      .first<{ id: string }>();

    if (!comment) {
      return c.json(createError('NOT_FOUND', 'Comentário não encontrado'), 404);
    }

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

    if (value === 0) {
      await c.env.DB.prepare('DELETE FROM idea_comment_votes WHERE comment_id = ? AND user_id = ?')
        .bind(commentId, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO idea_comment_votes (id, comment_id, user_id, value)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(comment_id, user_id) DO UPDATE SET value = excluded.value, created_at = CURRENT_TIMESTAMP`,
      )
        .bind(generateId(), commentId, userId, value)
        .run();
    }

    const summary = await c.env.DB.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
         COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
         COALESCE(SUM(value), 0) AS score,
         MAX(CASE WHEN user_id = ? THEN value END) AS user_vote
       FROM idea_comment_votes
       WHERE comment_id = ?`,
    )
      .bind(userId, commentId)
      .first<{ upvotes: number; downvotes: number; score: number; user_vote: number | null }>();

    return c.json(createSuccess(summary ?? { upvotes: 0, downvotes: 0, score: 0, user_vote: value }));
  } catch (err) {
    console.error('[ideas POST /comments/:commentId/votes]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível registar o voto'), 500);
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
