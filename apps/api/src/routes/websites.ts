import { Hono } from 'hono';
import type { Env } from '../index';
import { createSuccess, createError, getPaginationParams, buildPaginationMeta, generateId } from '../utils/helpers';
import { optionalAuth, requireAuth, type AuthContext } from '../middleware/auth';
import { MIN_NAME_LENGTH, normalizeUrl } from '../utils/validation';

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
  metadata?: string | null;
  owner_name?: string | null;
  avg_rating: number | null;
  rating_count: number;
  user_rating?: number | null;
  comment_count?: number;
};

type CountRow = { total: number };

type SortOption = 'rating' | 'recent' | 'featured' | 'date' | 'popularity';

const SORT_MAP: Record<SortOption, string> = {
  rating: 'avg_rating DESC NULLS LAST, w.created_at DESC',
  recent: 'w.created_at DESC',
  date: 'w.created_at DESC',
  popularity: 'COALESCE(r.rating_count, 0) DESC, avg_rating DESC NULLS LAST, w.created_at DESC',
  featured: 'w.featured DESC, avg_rating DESC NULLS LAST, w.created_at DESC',
};

const VISIBLE_STATUS_CONDITION = "(w.status IN ('approved', 'active') OR w.status IS NULL)";

const MIN_RATING = 1;
const MAX_RATING = 5;
const MIN_COMMENT_LENGTH = 3;
const MAX_COMMENT_LENGTH = 1000;
type WebsiteMetadata = {
  author?: string | null;
  launch_date?: string | null;
  launch_precision?: 'exact' | 'month' | 'year' | 'unknown';
  languages?: string[];
  images?: string[];
  is_open_source?: boolean;
  source_url?: string | null;
};

function isValidSort(value: string | null): value is SortOption {
  return typeof value === 'string' && value in SORT_MAP;
}

function parseMetadata(value?: string | null): WebsiteMetadata | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as WebsiteMetadata;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes optional metadata sent by the client so it can be safely stored
 * as a JSON string in the `websites.metadata` column. Only supported keys are
 * kept and empty values are discarded.
 */
function normalizeWebsiteMetadata(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;

  const data = input as Record<string, unknown>;
  const metadata: WebsiteMetadata = {};

  if (typeof data.author === 'string') {
    metadata.author = data.author.trim() || null;
  }

  if (typeof data.launchDate === 'string') {
    metadata.launch_date = data.launchDate.trim() || null;
  }

  const launchPrecision = data.launchPrecision;
  if (
    typeof launchPrecision === 'string' &&
    (metadata.launch_date || launchPrecision === 'exact' || launchPrecision === 'month' || launchPrecision === 'year')
  ) {
    metadata.launch_precision = launchPrecision as WebsiteMetadata['launch_precision'];
  }

  if (Array.isArray(data.languages)) {
    const langs = data.languages
      .filter((lang) => typeof lang === 'string')
      .map((lang) => lang.trim())
      .filter(Boolean);
    if (langs.length > 0) metadata.languages = langs;
  }

  if (Array.isArray(data.images)) {
    const imgs = data.images
      .filter((url) => typeof url === 'string')
      .map((url) => url.trim())
      .filter(Boolean);
    if (imgs.length > 0) metadata.images = imgs;
  }

  if (typeof data.isOpenSource === 'boolean') {
    metadata.is_open_source = data.isOpenSource;
  }

  if (typeof data.sourceUrl === 'string') {
    metadata.source_url = data.sourceUrl.trim() || null;
  }

  const hasContent = Object.values(metadata).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });

  return hasContent ? JSON.stringify(metadata) : null;
}

type CategoryLink = { id: string; parent_id: string | null };

async function collectCategoryIdsWithDescendants(db: Env['DB'], categoryId: string): Promise<string[]> {
  const rows = await db
    .prepare('SELECT id, parent_id FROM categories WHERE status = "active"')
    .all<CategoryLink>()
    .then((r) => r.results);

  const childrenMap = new Map<string, string[]>();
  rows.forEach((row) => {
    if (row.parent_id) {
      if (!childrenMap.has(row.parent_id)) childrenMap.set(row.parent_id, []);
      childrenMap.get(row.parent_id)?.push(row.id);
    }
  });

  const ids = new Set<string>();
  const stack = [categoryId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ids.has(current)) continue;
    ids.add(current);
    const children = childrenMap.get(current) ?? [];
    children.forEach((child) => stack.push(child));
  }

  return Array.from(ids);
}

type CommentRow = {
  id: string;
  website_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  kind?: string | null;
  user_name: string;
  user_avatar: string | null;
};

type CommentNode = {
  id: string;
  website_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  kind?: string | null;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  replies: CommentNode[];
};

type CommentSort = 'newest' | 'oldest';

const COMMENT_SORT_ORDER: Record<CommentSort, string> = {
  newest: 'c.created_at DESC',
  oldest: 'c.created_at ASC',
};

const COMMENT_KINDS = new Set(['opinion', 'suggestion', 'issue', 'praise', 'other', 'general']);

function isMissingMetadataColumn(err: unknown) {
  return err instanceof Error && err.message.includes('no such column: w.metadata');
}

export const websitesRouter = new Hono<{ Bindings: Env } & AuthContext>();

websitesRouter.post('/', requireAuth, async (c) => {
  try {
    let body: {
      name?: unknown;
      url?: unknown;
      description?: unknown;
      category_id?: unknown;
      metadata?: unknown;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { name, url, description, category_id, metadata } = body;

    if (typeof name !== 'string' || name.trim().length < MIN_NAME_LENGTH) {
      return c.json(
        createError('VALIDATION_ERROR', `Nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`),
        400,
      );
    }
    if (typeof url !== 'string') {
      return c.json(createError('VALIDATION_ERROR', 'URL é obrigatório'), 400);
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        return c.json(createError('VALIDATION_ERROR', 'URL deve começar por http ou https'), 400);
      }
    } catch {
      return c.json(createError('VALIDATION_ERROR', 'URL inválida'), 400);
    }
    if (typeof category_id !== 'string') {
      return c.json(createError('VALIDATION_ERROR', 'Categoria é obrigatória'), 400);
    }

    let normalizedDescription: string | null = null;
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return c.json(createError('VALIDATION_ERROR', 'Descrição inválida'), 400);
      }
      normalizedDescription = description.trim();
    }

    const normalizedMetadata = normalizeWebsiteMetadata(metadata);

    const category = await c.env.DB.prepare(
      'SELECT id FROM categories WHERE id = ? AND status = "active"',
    )
      .bind(category_id)
      .first<{ id: string }>();

    if (!category) {
      return c.json(createError('VALIDATION_ERROR', 'Categoria inválida'), 400);
    }

    const normalizedUrl = normalizeUrl(parsedUrl);

    const existing = await c.env.DB.prepare('SELECT id FROM websites WHERE url = ?')
      .bind(normalizedUrl)
      .first<{ id: string }>();
    if (existing) {
      return c.json(createError('DUPLICATE', 'Este website já existe na plataforma'), 409);
    }

    const id = generateId();
    const userId = c.get('userId');

    try {
      await c.env.DB.prepare(
        `INSERT INTO websites (id, name, url, description, category_id, status, submitted_by, featured, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
        .bind(id, name.trim(), normalizedUrl, normalizedDescription, category_id, userId, normalizedMetadata)
        .run();
    } catch (err) {
      if (!isMissingMetadataColumn(err)) throw err;
      await c.env.DB.prepare(
        `INSERT INTO websites (id, name, url, description, category_id, status, submitted_by, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
        .bind(id, name.trim(), normalizedUrl, normalizedDescription, category_id, userId)
        .run();
    }

    const fetchCreated = async (includeMetadata: boolean) => {
      const metadataSelect = includeMetadata ? 'w.metadata,' : '';
      return c.env.DB.prepare(
        `SELECT w.*, ${metadataSelect} cat.name AS category_name, cat.slug AS category_slug, u.name AS owner_name
         FROM websites w
         LEFT JOIN categories cat ON cat.id = w.category_id
         LEFT JOIN users u ON u.id = w.submitted_by
         WHERE w.id = ?`,
      )
        .bind(id)
        .first<WebsiteRow>();
    };

    let created: WebsiteRow | undefined;
    try {
      created = await fetchCreated(true);
    } catch (err) {
      if (!isMissingMetadataColumn(err)) throw err;
      created = await fetchCreated(false);
    }

    return c.json(
      createSuccess(
        created
          ? {
              ...created,
              metadata: parseMetadata(created.metadata),
            }
          : created,
      ),
      201,
    );
  } catch (err) {
    console.error('[websites POST /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível criar o website'), 500);
  }
});

websitesRouter.get('/mine', requireAuth, async (c) => {
  try {
    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);
    const userId = c.get('userId');

    const countRow = await c.env.DB.prepare(
      'SELECT COUNT(*) AS total FROM websites WHERE submitted_by = ?',
    )
      .bind(userId)
      .first<CountRow>();

    const rows = await c.env.DB.prepare(
      `SELECT w.*, cat.name AS category_name, cat.slug AS category_slug
       FROM websites w
       LEFT JOIN categories cat ON cat.id = w.category_id
       WHERE w.submitted_by = ?
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(userId, perPage, offset)
      .all<WebsiteRow>()
      .then((r) => r.results);

    const meta = buildPaginationMeta(countRow?.total ?? 0, page, perPage);
    return c.json(createSuccess(rows, meta));
  } catch (err) {
    console.error('[websites GET /mine]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível carregar contribuições'), 500);
  }
});

websitesRouter.get('/', async (c) => {
  try {
    const url = new URL(c.req.url);
    const { page, perPage, offset } = getPaginationParams(url);

    const categoryId = url.searchParams.get('category_id');
    const includeDescendants = url.searchParams.get('include_descendants') === 'true';
    const search = url.searchParams.get('search');
    const sortParam = url.searchParams.get('sort');
    const sort: SortOption = isValidSort(sortParam) ? sortParam : 'recent';
    const orderClause = SORT_MAP[sort];

    const conditions: string[] = [VISIBLE_STATUS_CONDITION];
    const bindings: (string | number)[] = [];

    if (categoryId) {
      const categoryIds = includeDescendants
        ? await collectCategoryIdsWithDescendants(c.env.DB, categoryId)
        : [categoryId];

      if (categoryIds.length > 1) {
        conditions.push(`w.category_id IN (${categoryIds.map(() => '?').join(',')})`);
        bindings.push(...categoryIds);
      } else {
        conditions.push('w.category_id = ?');
        bindings.push(categoryId);
      }
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
      LEFT JOIN users u ON u.id = w.submitted_by
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

    const executeWithColumns = async (includeMetadata: boolean) => {
      const metadataSelect = includeMetadata ? 'w.metadata,' : '';
      return c.env.DB.prepare(
        `SELECT
           w.id, w.name, w.url, w.description, w.logo_url, w.screenshot_url,
           w.category_id, cat.name AS category_name, cat.slug AS category_slug,
           w.status, w.featured, w.created_at, w.updated_at,
           ${metadataSelect}
           r.avg_rating, COALESCE(r.rating_count, 0) AS rating_count,
           u.name AS owner_name
         ${baseQuery}
         ORDER BY ${orderClause}
         LIMIT ? OFFSET ?`,
      )
        .bind(...bindings, perPage, offset)
        .all<WebsiteRow>()
        .then((r) => r.results);
    };

    let rows: WebsiteRow[];
    try {
      rows = await executeWithColumns(true);
    } catch (err) {
      if (!isMissingMetadataColumn(err)) throw err;
      rows = await executeWithColumns(false);
    }

    const meta = buildPaginationMeta(total, page, perPage);

    const data = rows.map((row) => ({
      ...row,
      featured: Boolean(row.featured),
      metadata: parseMetadata(row.metadata),
      owner_name: row.owner_name ?? null,
    }));

    return c.json(createSuccess(data, meta));
  } catch (err) {
    console.error('[websites GET /]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch websites'), 500);
  }
});

websitesRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');
    const selectBase = `
      SELECT
         w.id, w.name, w.url, w.description, w.logo_url, w.screenshot_url,
         w.category_id, cat.name AS category_name, cat.slug AS category_slug,
         w.status, w.featured, w.created_at, w.updated_at, w.metadata,
         AVG(CAST(r.score AS REAL)) AS avg_rating,
         COALESCE(COUNT(r.id), 0) AS rating_count,
         COALESCE(cmt.comment_count, 0) AS comment_count,
         u.name AS owner_name
    `;

    const joinsBase = `
       FROM websites w
       LEFT JOIN categories cat ON cat.id = w.category_id
       LEFT JOIN users u ON u.id = w.submitted_by
       LEFT JOIN ratings r ON r.website_id = w.id
       LEFT JOIN (
         SELECT website_id, COUNT(*) AS comment_count
         FROM comments
         WHERE status = 'visible'
         GROUP BY website_id
       ) cmt ON cmt.website_id = w.id
    `;

    const whereClause = `
       WHERE w.id = ? AND ${VISIBLE_STATUS_CONDITION}
       GROUP BY w.id
    `;

    let website: WebsiteRow | undefined;

    const runDetail = async (includeMetadata: boolean) => {
      const metadataSelect = includeMetadata ? 'w.metadata,' : '';
      const selectWithMeta = selectBase.replace('w.metadata,', metadataSelect);

      if (userId) {
        return c.env.DB.prepare(
          `${selectWithMeta},
           ur.score AS user_rating
           ${joinsBase}
           LEFT JOIN ratings ur ON ur.website_id = w.id AND ur.user_id = ?
           ${whereClause}`,
        )
          .bind(userId, id)
          .first<WebsiteRow>();
      }

      return c.env.DB.prepare(
        `${selectWithMeta},
         NULL AS user_rating
         ${joinsBase}
         ${whereClause}`,
      )
        .bind(id)
        .first<WebsiteRow>();
    };

    try {
      website = await runDetail(true);
    } catch (err) {
      if (!isMissingMetadataColumn(err)) throw err;
      website = await runDetail(false);
    }

    if (!website) {
      return c.json(createError('NOT_FOUND', `Website '${id}' not found`), 404);
    }

    return c.json(
      createSuccess({
        ...website,
        featured: Boolean(website.featured),
        metadata: parseMetadata(website.metadata),
      }),
    );
  } catch (err) {
    console.error('[websites GET /:id]', err);
    return c.json(createError('INTERNAL_ERROR', 'Failed to fetch website'), 500);
  }
});

websitesRouter.post('/:id/ratings', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const exists = await c.env.DB.prepare(`SELECT id FROM websites WHERE id = ? AND ${VISIBLE_STATUS_CONDITION}`)
      .bind(id)
      .first<{ id: string }>();

    if (!exists) {
      return c.json(createError('NOT_FOUND', 'Website não encontrado'), 404);
    }

    let body: { score?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
    }

    const { score } = body;
    if (
      typeof score !== 'number' ||
      !Number.isInteger(score) ||
      score < MIN_RATING ||
      score > MAX_RATING
    ) {
      return c.json(
        createError('VALIDATION_ERROR', `Avaliação deve ser um número entre ${MIN_RATING} e ${MAX_RATING}`),
        400,
      );
    }

    await c.env.DB.prepare(
      `INSERT INTO ratings (id, website_id, user_id, score)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(website_id, user_id) DO UPDATE SET score = excluded.score, created_at = CURRENT_TIMESTAMP`,
    )
      .bind(generateId(), id, userId, score)
      .run();

    const summary = await c.env.DB.prepare(
      `SELECT
         AVG(CAST(score AS REAL)) AS avg_rating,
         COUNT(*) AS rating_count,
         MAX(CASE WHEN user_id = ? THEN score END) AS user_rating
       FROM ratings
       WHERE website_id = ?`,
    )
      .bind(userId, id)
      .first<{ avg_rating: number | null; rating_count: number; user_rating: number | null }>();

    return c.json(
      createSuccess({
        avg_rating: summary?.avg_rating ?? 0,
        rating_count: summary?.rating_count ?? 0,
        user_rating: summary?.user_rating ?? score,
      }),
    );
  } catch (err) {
    console.error('[websites POST /:id/ratings]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível guardar a avaliação'), 500);
  }
});

websitesRouter.get('/:id/comments', optionalAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const url = new URL(c.req.url);
    const sortParam = url.searchParams.get('sort');
    const sort: CommentSort = sortParam === 'oldest' ? 'oldest' : 'newest';
    const orderClause = COMMENT_SORT_ORDER[sort];

    const rows = await c.env.DB.prepare(
      `SELECT
         c.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.website_id = ? AND c.status = 'visible'
       ORDER BY ${orderClause}`,
    )
      .bind(id)
      .all<CommentRow>()
      .then((r) => r.results);

    const nodes: CommentNode[] = rows.map((row) => ({
      id: row.id,
      website_id: row.website_id,
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
      replies: [],
    }));

    const map = new Map<string, CommentNode>();
    nodes.forEach((node) => map.set(node.id, node));

    const roots: CommentNode[] = [];
    nodes.forEach((node) => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)?.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return c.json(createSuccess(roots, { total: nodes.length }));
  } catch (err) {
    console.error('[websites GET /:id/comments]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha ao carregar comentários'), 500);
  }
});

websitesRouter.post('/:id/comments', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get('userId');

    const website = await c.env.DB.prepare(`SELECT id FROM websites WHERE id = ? AND ${VISIBLE_STATUS_CONDITION}`)
      .bind(id)
      .first<{ id: string }>();

    if (!website) {
      return c.json(createError('NOT_FOUND', 'Website não encontrado'), 404);
    }

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
        'SELECT id FROM comments WHERE id = ? AND website_id = ? AND status = "visible"',
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

    const commentId = generateId();

    await c.env.DB.prepare(
      'INSERT INTO comments (id, website_id, user_id, content, parent_id, status, kind) VALUES (?, ?, ?, ?, ?, "visible", ?)',
    )
      .bind(commentId, id, userId, content.trim(), parentId ?? null, normalizedKind)
      .run();

    const inserted = await c.env.DB.prepare(
      `SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
    )
      .bind(commentId)
      .first<CommentRow>();

    if (!inserted) {
      return c.json(createError('INTERNAL_ERROR', 'Erro ao criar comentário'), 500);
    }

    const node: CommentNode = {
      id: inserted.id,
      website_id: inserted.website_id,
      user_id: inserted.user_id,
      content: inserted.content,
      parent_id: inserted.parent_id,
      status: inserted.status,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
      kind: inserted.kind ?? 'general',
      user: {
        id: inserted.user_id,
        name: inserted.user_name,
        avatar_url: inserted.user_avatar,
      },
      replies: [],
    };

    return c.json(createSuccess(node));
  } catch (err) {
    console.error('[websites POST /:id/comments]', err);
    return c.json(createError('INTERNAL_ERROR', 'Não foi possível criar o comentário'), 500);
  }
});
