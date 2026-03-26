import { Hono } from 'hono';
import type { Env } from '../index';
import {
  createSuccess,
  createError,
  getPaginationParams,
  buildPaginationMeta,
} from '../utils/helpers';

type WebsiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  logo_url: string | null;
  screenshot_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  status: string;
  featured: number;
  created_at: string;
  updated_at: string;
  avg_rating: number | null;
  rating_count: number;
};

type CountRow = { total: number };

type SortOption = 'rating' | 'recent' | 'featured';

const SORT_MAP: Record<SortOption, string> = {
  rating: 'avg_rating DESC NULLS LAST, w.created_at DESC',
  recent: 'w.created_at DESC',
  featured: 'w.featured DESC, avg_rating DESC NULLS LAST, w.created_at DESC',
};

function isValidSort(value: string | null): value is SortOption {
  return value === 'rating' || value === 'recent' || value === 'featured';
}

export const websitesRouter = new Hono<{ Bindings: Env }>();

websitesRouter.get('/', async (c) => {
  try {
    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);

    const categoryId = url.searchParams.get('category_id');
    const search = url.searchParams.get('search');
    const sortParam = url.searchParams.get('sort');
    const sort: SortOption = isValidSort(sortParam) ? sortParam : 'recent';
    const orderClause = SORT_MAP[sort];

    const conditions: string[] = ["w.status = 'approved'"];
    const bindings: (string | number)[] = [];

    if (categoryId) {
      conditions.push('w.category_id = ?');
      bindings.push(categoryId);
    }

    if (search) {
      conditions.push('(w.name LIKE ? OR w.description LIKE ?)');
      const pattern = `%${search}%`;
      bindings.push(pattern, pattern);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      FROM websites w
      LEFT JOIN categories cat ON cat.id = w.category_id
      LEFT JOIN (
        SELECT website_id, AVG(CAST(score AS REAL)) AS avg_rating, COUNT(*) AS rating_count
        FROM ratings
        GROUP BY website_id
      ) r ON r.website_id = w.id
      WHERE ${whereClause}
    `;

    const countRow = await c.env.DB.prepare(`SELECT COUNT(*) AS total ${baseQuery}`)
      .bind(...bindings)
      .first<CountRow>();

    const total = countRow?.total ?? 0;

    const rows = await c.env.DB.prepare(
      `SELECT
         w.id, w.name, w.url, w.description, w.logo_url, w.screenshot_url,
         w.category_id, cat.name AS category_name, cat.slug AS category_slug,
         w.status, w.featured, w.created_at, w.updated_at,
         r.avg_rating, COALESCE(r.rating_count, 0) AS rating_count
       ${baseQuery}
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`,
    )
      .bind(...bindings, perPage, offset)
      .all<WebsiteRow>()
      .then((r) => r.results);

    const meta = buildPaginationMeta(total, page, perPage);

    return c.json(createSuccess(rows, meta));
  } catch (err) {
    console.error('[websites GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch websites'), 500);
  }
});

websitesRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const website = await c.env.DB.prepare(
      `SELECT
         w.id, w.name, w.url, w.description, w.logo_url, w.screenshot_url,
         w.category_id, cat.name AS category_name, cat.slug AS category_slug,
         w.status, w.featured, w.created_at, w.updated_at,
         AVG(CAST(r.score AS REAL)) AS avg_rating,
         COALESCE(COUNT(r.id), 0) AS rating_count
       FROM websites w
       LEFT JOIN categories cat ON cat.id = w.category_id
       LEFT JOIN ratings r ON r.website_id = w.id
       WHERE w.id = ? AND w.status = 'approved'
       GROUP BY w.id`,
    )
      .bind(id)
      .first<WebsiteRow>();

    if (!website) {
      return c.json(createError('NOT_FOUND', `Website '${id}' not found`), 404);
    }

    return c.json(createSuccess(website));
  } catch (err) {
    console.error('[websites GET /:id]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch website'), 500);
  }
});
