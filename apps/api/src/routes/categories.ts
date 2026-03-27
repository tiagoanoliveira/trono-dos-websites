import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError, generateId, getPaginationParams, buildPaginationMeta } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';
import { MIN_NAME_LENGTH } from '../utils/validation';

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

type CategoryNode = CategoryRow & { children: CategoryNode[] };

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
    if (typeof name !== 'string' || name.trim().length < MIN_NAME_LENGTH) {
      return c.json(
        createError('VALIDATION_ERROR', `Nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`),
        400,
      );
    }

    let normalizedDescription: string | null = null;
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return c.json(createError('VALIDATION_ERROR', 'Descrição inválida'), 400);
      }
      normalizedDescription = description.trim() || null;
    }

    const id = generateId();
    const userId = c.get('userId');

    await c.env.DB.prepare(
      `INSERT INTO category_suggestions (id, name, description, suggested_by, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
    )
      .bind(id, name.trim(), normalizedDescription, userId)
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

type SerializedCategory = Omit<CategoryRow, 'parent_id'> & { children: SerializedCategory[] };

function serializeCategory(node: CategoryNode): SerializedCategory {
  const serializedChildren = node.children.map(serializeCategory);
  const childrenTotal = serializedChildren.reduce((sum, child) => sum + child.website_count, 0);
  const { parent_id: _omit, ...rest } = node;

  return {
    ...rest,
    website_count: node.website_count + childrenTotal,
    children: serializedChildren,
  };
}

function buildCategoryTree(rows: CategoryRow[]) {
  const nodes = new Map<string, CategoryNode>();
  const slugMap = new Map<string, CategoryNode>();

  rows.forEach((row) => {
    const node: CategoryNode = { ...row, children: [] };
    nodes.set(node.id, node);
    slugMap.set(node.slug, node);
  });

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)?.children.push(node);
    }
  });

  const roots = Array.from(nodes.values()).filter((node) => node.parent_id === null);

  return {
    roots: roots.map(serializeCategory),
    nodes,
    slugMap,
  };
}

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

    const { roots, nodes } = buildCategoryTree(rows);

    if (parentIdFilter !== null) {
      const children = Array.from(nodes.values()).filter((node) => node.parent_id === parentIdFilter);
      return c.json(createSuccess(children.map(serializeCategory)));
    }

    return c.json(createSuccess(roots));
  } catch (err) {
    console.error('[categories GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch categories'), 500);
  }
});

categoriesRouter.get('/:slug', async (c) => {
  try {
    const { slug } = c.req.param();

    const rows = await c.env.DB.prepare(
      `SELECT
         c.id, c.name, c.slug, c.description, c.icon, c.parent_id, c.status, c.created_at,
         COUNT(w.id) AS website_count
       FROM categories c
       LEFT JOIN websites w
         ON w.category_id = c.id AND w.status = 'approved'
       WHERE c.status = 'active'
       GROUP BY c.id`,
    )
      .all<CategoryRow>()
      .then((r) => r.results);

    const { slugMap } = buildCategoryTree(rows);
    const node = slugMap.get(slug);

    if (!node) {
      return c.json(createError('NOT_FOUND', `Category '${slug}' not found`), 404);
    }

    // If the node is not a root, ensure its subtree is still fully serialized
    const serialized = serializeCategory(node);
    return c.json(createSuccess(serialized));
  } catch (err) {
    console.error('[categories GET /:slug]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch category'), 500);
  }
});
