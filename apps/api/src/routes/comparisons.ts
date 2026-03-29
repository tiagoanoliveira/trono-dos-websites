import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError, generateId, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { optionalAuth, requireAuth, type AuthContext } from '../middleware/auth';

type ComparisonRow = {
  id: string;
  date: string;
  category_id: string;
  category_name: string | null;
  category_slug: string | null;
  website_a_id: string;
  website_a_name: string;
  website_a_url: string;
  website_a_logo_url: string | null;
  website_a_score: number | null;
  website_b_id: string;
  website_b_name: string;
  website_b_url: string;
  website_b_logo_url: string | null;
  website_b_score: number | null;
  votes_a: number | null;
  votes_b: number | null;
  total_votes: number | null;
  user_vote: string | null;
  created_at: string;
};

export const comparisonsRouter = new Hono<{ Bindings: Env } & AuthContext>();

const COMPARISON_SELECT = `
  SELECT
    dc.id,
    dc.date,
    dc.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    dc.website_a_id,
    wa.name AS website_a_name,
    wa.url AS website_a_url,
    wa.logo_url AS website_a_logo_url,
    COALESCE(wv_a.score, 0) AS website_a_score,
    dc.website_b_id,
    wb.name AS website_b_name,
    wb.url AS website_b_url,
    wb.logo_url AS website_b_logo_url,
    COALESCE(wv_b.score, 0) AS website_b_score,
    COALESCE(v.votes_a, 0) AS votes_a,
    COALESCE(v.votes_b, 0) AS votes_b,
    COALESCE(v.total_votes, 0) AS total_votes,
    dc.created_at
  FROM daily_comparisons dc
  JOIN categories c ON c.id = dc.category_id
  JOIN websites wa ON wa.id = dc.website_a_id
  JOIN websites wb ON wb.id = dc.website_b_id
  LEFT JOIN (
    SELECT
      cv.comparison_id,
      SUM(CASE WHEN cv.voted_for = dcv.website_a_id THEN 1 ELSE 0 END) AS votes_a,
      SUM(CASE WHEN cv.voted_for = dcv.website_b_id THEN 1 ELSE 0 END) AS votes_b,
      COUNT(*) AS total_votes
    FROM comparison_votes cv
    JOIN daily_comparisons dcv ON dcv.id = cv.comparison_id
    GROUP BY cv.comparison_id
  ) v ON v.comparison_id = dc.id
  LEFT JOIN (
    SELECT
      website_id,
      SUM(value) AS score
    FROM website_votes
    GROUP BY website_id
  ) wv_a ON wv_a.website_id = dc.website_a_id
  LEFT JOIN (
    SELECT
      website_id,
      SUM(value) AS score
    FROM website_votes
    GROUP BY website_id
  ) wv_b ON wv_b.website_id = dc.website_b_id
`;

function serializeComparison(row: ComparisonRow) {
  return {
    id: row.id,
    date: row.date,
    category_id: row.category_id,
    category_name: row.category_name,
    category_slug: row.category_slug,
    website_a: {
      id: row.website_a_id,
      name: row.website_a_name,
      url: row.website_a_url,
      logo_url: row.website_a_logo_url,
      score: row.website_a_score ?? 0,
    },
    website_b: {
      id: row.website_b_id,
      name: row.website_b_name,
      url: row.website_b_url,
      logo_url: row.website_b_logo_url,
      score: row.website_b_score ?? 0,
    },
    votes_a: row.votes_a ?? 0,
    votes_b: row.votes_b ?? 0,
    total_votes: row.total_votes ?? 0,
    user_vote: row.user_vote ?? null,
    created_at: row.created_at,
  };
}

comparisonsRouter.get('/today', optionalAuth, async (c) => {
  try {
    const userId = c.get('userId');

    const row = await c.env.DB.prepare(
      `${COMPARISON_SELECT},
       ${userId ? 'uv.voted_for AS user_vote' : 'NULL AS user_vote'}
       ${userId ? 'LEFT JOIN comparison_votes uv ON uv.comparison_id = dc.id AND uv.user_id = ?' : ''}
       WHERE dc.date = DATE('now')
       LIMIT 1`,
    )
      .bind(...(userId ? [userId] : []))
      .first<ComparisonRow>();

    if (!row) {
      return c.json(createError('NOT_FOUND', 'Comparativo de hoje ainda não foi gerado'), 404);
    }

    return c.json(createSuccess(serializeComparison(row)));
  } catch (err) {
    console.error('[comparisons GET /today]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar o comparativo de hoje'), 500);
  }
});

comparisonsRouter.get('/history', optionalAuth, async (c) => {
  try {
    const { page, perPage, offset } = getPaginationParams(new URL(c.req.url));
    const userId = c.get('userId');

    const countRow = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM daily_comparisons WHERE date < DATE(\'now\')')
      .first<{ total: number }>();

    const rows = await c.env.DB.prepare(
      `${COMPARISON_SELECT},
       ${userId ? 'uv.voted_for AS user_vote' : 'NULL AS user_vote'}
       ${userId ? 'LEFT JOIN comparison_votes uv ON uv.comparison_id = dc.id AND uv.user_id = ?' : ''}
       WHERE dc.date < DATE('now')
       ORDER BY dc.date DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(...(userId ? [userId, perPage, offset] : [perPage, offset]))
      .all<ComparisonRow>()
      .then((r) => r.results);

    const meta = buildPaginationMeta(countRow?.total ?? 0, page, perPage);
    return c.json(createSuccess(rows.map(serializeComparison), meta));
  } catch (err) {
    console.error('[comparisons GET /history]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar o histórico de comparativos'), 500);
  }
});

comparisonsRouter.post('/today/generate', async (c) => {
  try {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM daily_comparisons WHERE date = DATE('now')`,
    ).first<{ id: string }>();
    if (existing) {
      return c.json(createSuccess({ id: existing.id, generated: false, reason: 'already_exists' }));
    }

    const category = await c.env.DB.prepare(
      `SELECT c.id
       FROM categories c
       WHERE c.status = 'active'
         AND (
           SELECT COUNT(*)
           FROM websites w
           WHERE w.category_id = c.id AND (w.status = 'approved' OR w.status = 'active')
         ) >= 2
       ORDER BY RANDOM()
       LIMIT 1`,
    ).first<{ id: string }>();

    if (!category) {
      return c.json(createError('NOT_FOUND', 'Sem categorias com websites suficientes para gerar comparativo'), 404);
    }

    const websites = await c.env.DB.prepare(
      `SELECT id
       FROM websites
       WHERE category_id = ? AND (status = 'approved' OR status = 'active')
       ORDER BY RANDOM()
       LIMIT 2`,
    )
      .bind(category.id)
      .all<{ id: string }>()
      .then((r) => r.results);

    if (websites.length < 2) {
      return c.json(createError('INTERNAL_ERROR', 'Não foi possível selecionar dois websites para o comparativo'), 500);
    }

    const comparisonId = generateId();
    await c.env.DB.prepare(
      `INSERT INTO daily_comparisons (id, date, category_id, website_a_id, website_b_id, created_at)
       VALUES (?, DATE('now'), ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
      .bind(comparisonId, category.id, websites[0].id, websites[1].id)
      .run();

    return c.json(createSuccess({ id: comparisonId, generated: true }), 201);
  } catch (err) {
    console.error('[comparisons POST /today/generate]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível gerar o comparativo diário'), 500);
  }
});

comparisonsRouter.post('/:id/votes', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const comparison = await c.env.DB.prepare(
      `SELECT id, website_a_id, website_b_id FROM daily_comparisons WHERE id = ?`,
    )
      .bind(id)
      .first<{ id: string; website_a_id: string; website_b_id: string }>();

    if (!comparison) {
      return c.json(createError('NOT_FOUND', 'Comparativo não encontrado'), 404);
    }

    let body: { voted_for?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const votedFor = body.voted_for;
    if (typeof votedFor !== 'string' || (votedFor !== comparison.website_a_id && votedFor !== comparison.website_b_id)) {
      return c.json(createError('VALIDATION_ERROR', 'Voto inválido para este comparativo'), 400);
    }

    await c.env.DB.prepare(
      `INSERT INTO comparison_votes (id, comparison_id, user_id, voted_for)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(comparison_id, user_id) DO UPDATE SET voted_for = excluded.voted_for, created_at = CURRENT_TIMESTAMP`,
    )
      .bind(generateId(), id, userId, votedFor)
      .run();

    const summary = await c.env.DB.prepare(
      `SELECT
         SUM(CASE WHEN voted_for = ? THEN 1 ELSE 0 END) AS votes_a,
         SUM(CASE WHEN voted_for = ? THEN 1 ELSE 0 END) AS votes_b,
         COUNT(*) AS total_votes,
         MAX(CASE WHEN user_id = ? THEN voted_for END) AS user_vote
       FROM comparison_votes
       WHERE comparison_id = ?`,
    )
      .bind(comparison.website_a_id, comparison.website_b_id, userId, id)
      .first<{ votes_a: number | null; votes_b: number | null; total_votes: number | null; user_vote: string | null }>();

    return c.json(
      createSuccess({
        votes_a: summary?.votes_a ?? 0,
        votes_b: summary?.votes_b ?? 0,
        total_votes: summary?.total_votes ?? 0,
        user_vote: summary?.user_vote ?? votedFor,
      }),
    );
  } catch (err) {
    console.error('[comparisons POST /:id/votes]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível registar o voto'), 500);
  }
});

comparisonsRouter.get('/stats', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT
         w.id AS website_id,
         w.name AS website_name,
         w.url AS website_url,
         w.logo_url AS website_logo_url,
         COALESCE(SUM(CASE WHEN winners.winner_id = w.id THEN 1 ELSE 0 END), 0) AS wins,
         COALESCE(SUM(CASE WHEN winners.loser_id = w.id THEN 1 ELSE 0 END), 0) AS losses,
         COALESCE(SUM(CASE WHEN winners.winner_id = w.id THEN 1 ELSE 0 END), 0) +
         COALESCE(SUM(CASE WHEN winners.loser_id = w.id THEN 1 ELSE 0 END), 0) AS appearances
       FROM websites w
       LEFT JOIN (
         SELECT
           dc.id,
           CASE
             WHEN COALESCE(v.votes_a, 0) > COALESCE(v.votes_b, 0) THEN dc.website_a_id
             WHEN COALESCE(v.votes_b, 0) > COALESCE(v.votes_a, 0) THEN dc.website_b_id
             ELSE NULL
           END AS winner_id,
           CASE
             WHEN COALESCE(v.votes_a, 0) > COALESCE(v.votes_b, 0) THEN dc.website_b_id
             WHEN COALESCE(v.votes_b, 0) > COALESCE(v.votes_a, 0) THEN dc.website_a_id
             ELSE NULL
           END AS loser_id
         FROM daily_comparisons dc
         LEFT JOIN (
           SELECT
             cv.comparison_id,
             SUM(CASE WHEN cv.voted_for = dcv.website_a_id THEN 1 ELSE 0 END) AS votes_a,
             SUM(CASE WHEN cv.voted_for = dcv.website_b_id THEN 1 ELSE 0 END) AS votes_b
           FROM comparison_votes cv
           JOIN daily_comparisons dcv ON dcv.id = cv.comparison_id
           GROUP BY cv.comparison_id
         ) v ON v.comparison_id = dc.id
       ) winners ON winners.winner_id = w.id OR winners.loser_id = w.id
       WHERE w.status = 'approved' OR w.status = 'active'
       GROUP BY w.id
       HAVING appearances > 0
       ORDER BY wins DESC, appearances DESC, website_name ASC`,
    )
      .all<{
        website_id: string;
        website_name: string;
        website_url: string;
        website_logo_url: string | null;
        wins: number | null;
        losses: number | null;
        appearances: number | null;
      }>()
      .then((r) => r.results);

    return c.json(
      createSuccess(
        rows.map((row) => ({
          website_id: row.website_id,
          website_name: row.website_name,
          website_url: row.website_url,
          website_logo_url: row.website_logo_url,
          wins: row.wins ?? 0,
          losses: row.losses ?? 0,
          appearances: row.appearances ?? 0,
        })),
      ),
    );
  } catch (err) {
    console.error('[comparisons GET /stats]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar estatísticas'), 500);
  }
});
