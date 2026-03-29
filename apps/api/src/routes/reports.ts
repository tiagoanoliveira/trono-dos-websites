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

reportsRouter.get('/:id/target', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const role = c.get('userRole');
    if (role !== 'admin' && role !== 'moderator') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { id } = c.req.param();
    const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
      .bind(id)
      .first<ReportRow>();
    if (!report) {
      return c.json(createError('NOT_FOUND', 'Denúncia não encontrada'), 404);
    }

    if (report.target_type === 'website') {
      const target = await c.env.DB.prepare(
        'SELECT id, name, description, url, status FROM websites WHERE id = ?',
      )
        .bind(report.target_id)
        .first();
      return c.json(createSuccess({ report, target, frontend_url: `/website/${report.target_id}` }));
    }

    if (report.target_type === 'idea') {
      const target = await c.env.DB.prepare(
        'SELECT id, title, description, status FROM ideas WHERE id = ?',
      )
        .bind(report.target_id)
        .first();
      return c.json(createSuccess({ report, target, frontend_url: `/ideias/${report.target_id}` }));
    }

    if (report.target_type === 'idea_feature') {
      const target = await c.env.DB.prepare(
        `SELECT f.id, f.description, f.idea_id, i.title
         FROM idea_features f
         LEFT JOIN ideas i ON i.id = f.idea_id
         WHERE f.id = ?`,
      )
        .bind(report.target_id)
        .first<{ id: string; description: string; idea_id: string; title: string | null }>();
      return c.json(createSuccess({ report, target, frontend_url: target ? `/ideias/${target.idea_id}` : null }));
    }

    if (report.target_type === 'comment') {
      const websiteComment = await c.env.DB.prepare(
        'SELECT id, content, website_id, status FROM comments WHERE id = ?',
      )
        .bind(report.target_id)
        .first<{ id: string; content: string; website_id: string; status: string }>();
      if (websiteComment) {
        return c.json(createSuccess({ report, target: websiteComment, frontend_url: `/website/${websiteComment.website_id}` }));
      }

      const ideaComment = await c.env.DB.prepare(
        `SELECT id, content, idea_id, COALESCE(status, 'visible') AS status
         FROM idea_comments
         WHERE id = ?`,
      )
        .bind(report.target_id)
        .first<{ id: string; content: string; idea_id: string; status: string }>();
      return c.json(createSuccess({ report, target: ideaComment ?? null, frontend_url: ideaComment ? `/ideias/${ideaComment.idea_id}` : null }));
    }

    return c.json(createSuccess({ report, target: null, frontend_url: null }));
  } catch (err) {
    console.error('[reports GET /:id/target]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar origem da denúncia'), 500);
  }
});

reportsRouter.patch('/:id/target', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const role = c.get('userRole');
    if (role !== 'admin' && role !== 'moderator') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { id } = c.req.param();
    const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
      .bind(id)
      .first<ReportRow>();
    if (!report) return c.json(createError('NOT_FOUND', 'Denúncia não encontrada'), 404);

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    if (report.target_type === 'website') {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (typeof body.name === 'string' && body.name.trim().length >= 2) {
        fields.push('name = ?');
        values.push(body.name.trim());
      }
      if (typeof body.description === 'string') {
        fields.push('description = ?');
        values.push(body.description.trim());
      }
      if (typeof body.url === 'string' && body.url.trim()) {
        fields.push('url = ?');
        values.push(body.url.trim());
      }
      if (fields.length === 0) return c.json(createError('VALIDATION_ERROR', 'Sem alterações válidas'), 400);
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(report.target_id);
      await c.env.DB.prepare(`UPDATE websites SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      return c.json(createSuccess({ ok: true }));
    }

    if (report.target_type === 'idea') {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (typeof body.title === 'string' && body.title.trim().length >= 3) {
        fields.push('title = ?');
        values.push(body.title.trim());
      }
      if (typeof body.description === 'string') {
        fields.push('description = ?');
        values.push(body.description.trim());
      }
      if (fields.length === 0) return c.json(createError('VALIDATION_ERROR', 'Sem alterações válidas'), 400);
      values.push(report.target_id);
      await c.env.DB.prepare(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      return c.json(createSuccess({ ok: true }));
    }

    if (report.target_type === 'idea_feature') {
      if (typeof body.description !== 'string' || body.description.trim().length < 3) {
        return c.json(createError('VALIDATION_ERROR', 'Descrição inválida'), 400);
      }
      await c.env.DB.prepare('UPDATE idea_features SET description = ? WHERE id = ?')
        .bind(body.description.trim(), report.target_id)
        .run();
      return c.json(createSuccess({ ok: true }));
    }

    if (report.target_type === 'comment') {
      if (typeof body.content !== 'string' || body.content.trim().length < 3) {
        return c.json(createError('VALIDATION_ERROR', 'Conteúdo inválido'), 400);
      }
      const websiteResult = await c.env.DB.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(body.content.trim(), report.target_id)
        .run();
      if ((websiteResult.meta?.changes ?? 0) > 0) {
        return c.json(createSuccess({ ok: true }));
      }
      await c.env.DB.prepare('UPDATE idea_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(body.content.trim(), report.target_id)
        .run();
      return c.json(createSuccess({ ok: true }));
    }

    return c.json(createError('VALIDATION_ERROR', 'Tipo de alvo não suportado para edição'), 400);
  } catch (err) {
    console.error('[reports PATCH /:id/target]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível editar conteúdo'), 500);
  }
});

reportsRouter.delete('/:id/target', requireAuth, async (c) => {
  try {
    await ensureReportsTable(c.env.DB);
    const role = c.get('userRole');
    if (role !== 'admin' && role !== 'moderator') {
      return c.json(createError('FORBIDDEN', 'Acesso negado'), 403);
    }

    const { id } = c.req.param();
    const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ?')
      .bind(id)
      .first<ReportRow>();
    if (!report) return c.json(createError('NOT_FOUND', 'Denúncia não encontrada'), 404);

    if (report.target_type === 'website') {
      await c.env.DB.prepare("UPDATE websites SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(report.target_id)
        .run();
    } else if (report.target_type === 'idea') {
      await c.env.DB.prepare("UPDATE ideas SET status = 'closed' WHERE id = ?")
        .bind(report.target_id)
        .run();
    } else if (report.target_type === 'idea_feature') {
      await c.env.DB.prepare('DELETE FROM idea_features WHERE id = ?')
        .bind(report.target_id)
        .run();
    } else if (report.target_type === 'comment') {
      const result = await c.env.DB.prepare("UPDATE comments SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(report.target_id)
        .run();
      if ((result.meta?.changes ?? 0) === 0) {
        await c.env.DB.prepare("UPDATE idea_comments SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(report.target_id)
          .run();
      }
    } else {
      return c.json(createError('VALIDATION_ERROR', 'Tipo de alvo não suportado para eliminação'), 400);
    }

    await c.env.DB.prepare(
      `UPDATE reports
       SET status = 'resolved', reviewed_by = ?, resolved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
      .bind(c.get('userId'), id)
      .run();

    return c.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[reports DELETE /:id/target]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível eliminar conteúdo'), 500);
  }
});
