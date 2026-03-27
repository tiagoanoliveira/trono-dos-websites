import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError, generateId, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  status: string;
  created_at: string;
  website_count: number;
};

type CategoryWithChildren = Omit<CategoryRow, 'parent_id'> & {
  children: CategoryRow[];
};

type CategorySuggestionRow = {
  id: string;
  name: string;
  description: string | null;
  suggested_by: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
};

export const categoriesRouter = new Hono<{ Bindings: Env } & AuthContext>();

categoriesRouter.post('/suggestions', requireAuth, async (c) => {
  try {
    let body: { name?: unknown; description?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { name, description } = body;
    if (typeof name !== 'string' || name.trim().length < 3) {
      return c.json(createError('VALIDATION_ERROR', 'Nome deve ter pelo menos 3 caracteres'), 400);
    }

    const id = generateId();
    const userId = c.get('userId');

    await c.env.DB.prepare(
      `INSERT INTO category_suggestions (id, name, description, suggested_by, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
    )
      .bind(id, name.trim(), description?.toString().trim() ?? null, userId)
      .run();

    const created = await c.env.DB.prepare('SELECT * FROM category_suggestions WHERE id = ?')
      .bind(id)
      .first<CategorySuggestionRow>();

    return c.json(createSuccess(created), 201);
  } catch (err) {
    console.error('[categories POST /suggestions]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível sugerir a categoria'), 500);
  }
});

categoriesRouter.get('/suggestions/mine', requireAuth, async (c) => {
  try {
    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);
    const userId = c.get('userId');

    const countRow = await c.env.DB.prepare(
      'SELECT COUNT(*) AS total FROM category_suggestions WHERE suggested_by = ?',
    )
      .bind(userId)
      .first<{ total: number }>();

    const rows = await c.env.DB.prepare(
      `SELECT * FROM category_suggestions
       WHERE suggested_by = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(userId, perPage, offset)
      .all<CategorySuggestionRow>()
      .then((r) => r.results);

    const meta = buildPaginationMeta(countRow?.total ?? 0, page, perPage);
    return c.json(createSuccess(rows, meta));
  } catch (err) {
    console.error('[categories GET /suggestions/mine]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar sugestões'), 500);
  }
});

categoriesRouter.get('/', async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const parentIdFilter = searchParams.get('parent_id');

    const rows = await c.env.DB.prepare(
      `SELECT
         c.id, c.name, c.slug, c.description, c.icon, c.parent_id, c.status, c.created_at,
         COUNT(w.id) AS website_count
       FROM categories c
       LEFT JOIN websites w
         ON w.category_id = c.id AND w.status = 'approved'
       WHERE c.status = 'active'
       GROUP BY c.id
       ORDER BY c.parent_id NULLS FIRST, c.name ASC`,
    )
      .all<CategoryRow>()
      .then((r) => r.results);

    if (parentIdFilter !== null) {
      const filtered = rows.filter((r) => r.parent_id === parentIdFilter);
      return c.json(createSuccess(filtered));
    }

    // Build hierarchical structure: parents with embedded children
    const parents = rows.filter((r) => r.parent_id === null);
    const children = rows.filter((r) => r.parent_id !== null);

    const data: CategoryWithChildren[] = parents.map((parent) => {
      const { parent_id: _omit, ...rest } = parent;
      return {
        ...rest,
        children: children.filter((ch) => ch.parent_id === parent.id),
      };
    });

    return c.json(createSuccess(data));
  } catch (err) {
    console.error('[categories GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch categories'), 500);
  }
});

categoriesRouter.get('/:slug', async (c) => {
  try {
    const { slug } = c.req.param();

    const category = await c.env.DB.prepare(
      `SELECT
         c.id, c.name, c.slug, c.description, c.icon, c.parent_id, c.status, c.created_at,
         COUNT(w.id) AS website_count
       FROM categories c
       LEFT JOIN websites w
         ON w.category_id = c.id AND w.status = 'approved'
       WHERE c.slug = ? AND c.status = 'active'
       GROUP BY c.id`,
    )
      .bind(slug)
      .first<CategoryRow>();

    if (!category) {
      return c.json(createError('NOT_FOUND', `Category '${slug}' not found`), 404);
    }

    return c.json(createSuccess(category));
  } catch (err) {
    console.error('[categories GET /:slug]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch category'), 500);
  }
});
