import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError } from '../utils/helpers';

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

export const categoriesRouter = new Hono<{ Bindings: Env }>();

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
