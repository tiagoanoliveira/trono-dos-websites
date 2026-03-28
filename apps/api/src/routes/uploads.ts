import { Hono } from 'hono';
import type { Env } from '../index';
import { requireAuth, type AuthContext } from '../middleware/auth';
import { createError, createSuccess, generateId } from '../utils/helpers';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_TYPES = new Set(['avatar', 'logo', 'screenshot', 'website-image']);

function fileExtensionFromType(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

export const uploadsRouter = new Hono<{ Bindings: Env } & AuthContext>();

uploadsRouter.post('/images', requireAuth, async (c) => {
  try {
    if (!c.env.R2_BUCKET) {
      return c.json(createError('CONFIG_ERROR', 'R2 bucket não configurado'), 500);
    }

    const contentType = c.req.header('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return c.json(createError('VALIDATION_ERROR', 'Pedido deve ser multipart/form-data'), 400);
    }

    const form = await c.req.formData();
    const file = form.get('file');
    const uploadType = form.get('type');

    if (!(file instanceof File)) {
      return c.json(createError('VALIDATION_ERROR', 'Ficheiro inválido'), 400);
    }
    if (typeof uploadType !== 'string' || !ALLOWED_TYPES.has(uploadType)) {
      return c.json(createError('VALIDATION_ERROR', 'Tipo de upload inválido'), 400);
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return c.json(createError('VALIDATION_ERROR', 'Formato não suportado'), 400);
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return c.json(createError('VALIDATION_ERROR', 'Ficheiro excede o tamanho máximo de 5MB'), 400);
    }

    const userId = c.get('userId');
    const ext = fileExtensionFromType(file.type);
    const key = `${uploadType}/${userId}/${generateId()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await c.env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        uploadedBy: userId,
        uploadType,
      },
    });

    const configuredBase = c.env.R2_PUBLIC_BASE_URL?.trim();
    const url = configuredBase
      ? `${configuredBase.replace(/\/+$/, '')}/${key}`
      : `/api/uploads/images/${encodeURIComponent(key)}`;

    return c.json(createSuccess({ key, url }));
  } catch (err) {
    console.error('[uploads POST /images]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha no upload da imagem'), 500);
  }
});

uploadsRouter.get('/images/*', async (c) => {
  try {
    if (!c.env.R2_BUCKET) {
      return c.json(createError('CONFIG_ERROR', 'R2 bucket não configurado'), 500);
    }
    const key = decodeURIComponent(c.req.path.replace('/api/uploads/images/', ''));
    if (!key) return c.json(createError('NOT_FOUND', 'Imagem não encontrada'), 404);

    const object = await c.env.R2_BUCKET.get(key);
    if (!object) return c.json(createError('NOT_FOUND', 'Imagem não encontrada'), 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('[uploads GET /images/*]', err);
    return c.json(createError('INTERNAL_ERROR', 'Falha ao carregar imagem'), 500);
  }
});
