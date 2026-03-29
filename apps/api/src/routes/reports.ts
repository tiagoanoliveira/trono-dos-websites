import { Hono } from 'hono';
import type { Env } from '../index';
import { createError, createSuccess, generateId, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

const ALLOWED_TARGET_TYPES = new Set(['website', 'comment', 'user', 'idea', 'idea_feature']);
const ALLOWED_STATUSES = new Set(['pending', 'reviewed', 'resolved', 'dismissed']);
let reportsSchemaEnsured = false;

export const reportsRouter = new Hono<{ Bindings: Env } & AuthContext>();

async function ensureReportsTable(db: D1Database) {
  if (reportsSchemaEnsured) return;
  // target_type values:
  // - website: denúncia sobre um website listado
  // - comment: denúncia sobre comentário (site ou ideia)
  // - user: denúncia sobre comportamento de utilizador
  // - idea: denúncia sobre conteúdo de ideia
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT REFERENCES users(id),
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    )`,
  ).run();
  reportsSchemaEnsured = true;
}

reportsRouter.post('/', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const reporterId = c.get('userId');

    let body: { target_type?: unknown; target_id?: unknown; reason?: unknown; description?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { target_type, target_id, reason, description } = body;
    if (typeof target_type !== 'string' || !ALLOWED_TARGET_TYPES.has(target_type)) {
      return c.json(createError('VALIDATION_ERROR', 'target_type inválido'), 400);
    }
    if (typeof target_id !== 'string' || target_id.trim().length < 2) {
      return c.json(createError('VALIDATION_ERROR', 'target_id inválido'), 400);
    }
    if (typeof reason !== 'string' || reason.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Motivo inválido'), 400);
    }

    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
    )
      .bind(id, reporterId, target_type, target_id.trim(), reason.trim(), typeof description === 'string' ? description.trim() : null)
      .run();

    return c.json(createSuccess({ id }), 201);
  } catch (err) {
    console.error('[reports POST /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível criar denúncia'), 500);
  }
});

reportsRouter.get('/mine', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const reporterId = c.get('userId');
    const { page, perPage, offset } = getPaginationParams(new URL(c.req.url));
    const rows = await c.env.DB.prepare(
      `SELECT * FROM reports
       WHERE reporter_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(reporterId, perPage, offset)
      .all<ReportRow>()
      .then((r) => r.results);
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM reports WHERE reporter_id = ?')
      .bind(reporterId)
      .first<{ total: number }>();
    return c.json(createSuccess(rows, buildPaginationMeta(count?.total ?? 0, page, perPage)));
  } catch (err) {
    console.error('[reports GET /mine]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível listar denúncias'), 500);
  }
});

reportsRouter.get('/', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const role = c.get('userRole');
    if (role !== 'admin' && role !== 'moderator') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);
    const status = url.searchParams.get('status');
    const where = status && ALLOWED_STATUSES.has(status) ? 'WHERE status = ?' : '';
    const params: Array<string | number> = [];
    if (where) params.push(status!);

    const rows = await c.env.DB.prepare(
      `SELECT * FROM reports
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(...params, perPage, offset)
      .all<ReportRow>()
      .then((r) => r.results);

    const count = await c.env.DB.prepare(`SELECT COUNT(*) AS total FROM reports ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    return c.json(createSuccess(rows, buildPaginationMeta(count?.total ?? 0, page, perPage)));
  } catch (err) {
    console.error('[reports GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível listar denúncias'), 500);
  }
});

reportsRouter.patch('/:id/status', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const role = c.get('userRole');
    const reviewerId = c.get('userId');
    if (role !== 'admin' && role !== 'moderator') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { id } = c.req.param();
    let body: { status?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }
    const { status } = body;
    if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      return c.json(createError('VALIDATION_ERROR', 'Status inválido'), 400);
    }

    const result = await c.env.DB.prepare(
      `UPDATE reports
       SET status = ?, reviewed_by = ?, resolved_at = CASE WHEN ? IN ('resolved','dismissed') THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = ?`,
    )
      .bind(status, reviewerId, status, id)
      .run();

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json(createError('NOT_FOUND', 'Denúncia não encontrada'), 404);
    }

    return c.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[reports PATCH /:id/status]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível atualizar denúncia'), 500);
  }
});
