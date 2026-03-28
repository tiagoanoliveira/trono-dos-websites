import { Hono } from 'hono';
import type { Env } from '../index';
import { hashPassword, verifyPassword, createJWT } from '../services/auth';
import { generateId, createSuccess, createError } from '../utils/helpers';
import { requireAuth, type AuthContext } from '../middleware/auth';
import { buildAuthCookie, clearAuthCookie } from '../utils/authCookie';
import { isAllowedUploadUrl } from '../utils/uploadUrl';
import { sendPasswordResetEmail, sendRegistrationEmail } from '../services/email';

type DbUser = {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  google_id: string | null;
  created_at: string;
  updated_at: string;
};

const JWT_EXPIRES = 604800; // 7 days

function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
    google_id: user.google_id !== null,
    created_at: user.created_at,
  };
}

export const authRouter = new Hono<{ Bindings: Env } & AuthContext>();

authRouter.post('/register', async (c) => {
  let body: { email?: unknown; name?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const { email, name, password } = body;

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(createError('VALIDATION_ERROR', 'Email inválido'), 400);
  }
  if (typeof name !== 'string' || name.trim().length < 2) {
    return c.json(createError('VALIDATION_ERROR', 'Nome deve ter pelo menos 2 caracteres'), 400);
  }
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return c.json(
      createError(
        'VALIDATION_ERROR',
        'Senha deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula e um número',
      ),
      400,
    );
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: string }>();

  if (existing) {
    return c.json(createError('EMAIL_TAKEN', 'Este email já está em uso'), 409);
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
  )
    .bind(id, email.toLowerCase(), name.trim(), passwordHash, 'user')
    .run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<DbUser>();

  if (!user) {
    return c.json(createError('INTERNAL_ERROR', 'Erro ao criar utilizador'), 500);
  }

  const token = await createJWT(
    { sub: user.id, role: user.role, email: user.email },
    c.env.JWT_SECRET,
    JWT_EXPIRES,
  );

  c.header('Set-Cookie', buildAuthCookie(token, c.env.ENVIRONMENT, JWT_EXPIRES));
  await sendRegistrationEmail(c.env, user.email, user.name);
  return c.json(createSuccess({ token, user: formatUser(user) }), 201);
});

authRouter.post('/login', async (c) => {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const { email, password } = body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return c.json(createError('VALIDATION_ERROR', 'Email e senha são obrigatórios'), 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<DbUser>();

  if (!user || !user.password_hash) {
    return c.json(createError('INVALID_CREDENTIALS', 'Credenciais inválidas'), 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json(createError('INVALID_CREDENTIALS', 'Credenciais inválidas'), 401);
  }

  const token = await createJWT(
    { sub: user.id, role: user.role, email: user.email },
    c.env.JWT_SECRET,
    JWT_EXPIRES,
  );

  c.header('Set-Cookie', buildAuthCookie(token, c.env.ENVIRONMENT, JWT_EXPIRES));
  return c.json(createSuccess({ token, user: formatUser(user) }));
});

authRouter.post('/logout', async (c) => {
  c.header('Set-Cookie', clearAuthCookie(c.env.ENVIRONMENT));
  return c.json(createSuccess({ message: 'Sessão terminada' }));
});

authRouter.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>();

  if (!user) {
    return c.json(createError('NOT_FOUND', 'Utilizador não encontrado'), 404);
  }

  return c.json(createSuccess(formatUser(user)));
});

authRouter.put('/me', requireAuth, async (c) => {
  const userId = c.get('userId');

  let body: { name?: unknown; avatar_url?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      return c.json(createError('VALIDATION_ERROR', 'Nome deve ter pelo menos 2 caracteres'), 400);
    }
    updates.push('name = ?');
    values.push(body.name.trim());
  }

  if (body.avatar_url !== undefined) {
    if (body.avatar_url !== null && typeof body.avatar_url !== 'string') {
      return c.json(createError('VALIDATION_ERROR', 'URL de avatar inválida'), 400);
    }
    if (typeof body.avatar_url === 'string' && body.avatar_url.trim() && !isAllowedUploadUrl(body.avatar_url, c.env)) {
      return c.json(createError('VALIDATION_ERROR', 'Avatar deve ser carregado via upload R2'), 400);
    }
    updates.push('avatar_url = ?');
    values.push(body.avatar_url);
  }

  if (updates.length === 0) {
    return c.json(createError('VALIDATION_ERROR', 'Nenhum campo para atualizar'), 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>();

  if (!user) {
    return c.json(createError('NOT_FOUND', 'Utilizador não encontrado'), 404);
  }

  return c.json(createSuccess(formatUser(user)));
});

authRouter.post('/forgot-password', async (c) => {
  let body: { email?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const { email } = body;
  if (typeof email !== 'string') {
    return c.json(createError('VALIDATION_ERROR', 'Email inválido'), 400);
  }

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: string }>();

  if (!user) {
    return c.json(createSuccess({ message: 'Se o email existir, receberás um link de recuperação' }));
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const id = generateId();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(id, user.id, token, expiresAt)
    .run();

  const fullUser = await c.env.DB.prepare('SELECT email, name FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ email: string; name: string }>();
  if (fullUser) {
    await sendPasswordResetEmail(c.env, fullUser.email, token);
  }

  if (c.env.ENVIRONMENT === 'development') {
    return c.json(createSuccess({ message: 'Token gerado', token }));
  }

  return c.json(createSuccess({ message: 'Se o email existir, receberás um link de recuperação' }));
});

authRouter.post('/reset-password', async (c) => {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const { token, password } = body;

  if (typeof token !== 'string' || typeof password !== 'string') {
    return c.json(createError('VALIDATION_ERROR', 'Token e senha são obrigatórios'), 400);
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return c.json(
      createError(
        'VALIDATION_ERROR',
        'Senha deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula e um número',
      ),
      400,
    );
  }

  const resetToken = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0',
  )
    .bind(token)
    .first<{ id: string; user_id: string; expires_at: string; used: number }>();

  if (!resetToken) {
    return c.json(createError('INVALID_TOKEN', 'Token inválido ou já utilizado'), 400);
  }

  if (new Date(resetToken.expires_at) < new Date()) {
    return c.json(createError('TOKEN_EXPIRED', 'Token expirado'), 400);
  }

  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(passwordHash, resetToken.user_id)
    .run();

  await c.env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
    .bind(resetToken.id)
    .run();

  return c.json(createSuccess({ message: 'Senha alterada com sucesso' }));
});

authRouter.post('/google', async (c) => {
  let body: { id_token?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(createError('INVALID_JSON', 'Corpo inválido'), 400);
  }

  const { id_token } = body;
  if (typeof id_token !== 'string') {
    return c.json(createError('VALIDATION_ERROR', 'id_token é obrigatório'), 400);
  }

  let googleData: { email?: string; name?: string; sub?: string; picture?: string };
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`);
    if (!response.ok) {
      return c.json(createError('GOOGLE_ERROR', 'Token Google inválido'), 401);
    }
    googleData = await response.json() as { email?: string; name?: string; sub?: string; picture?: string };
  } catch {
    return c.json(createError('GOOGLE_ERROR', 'Erro ao verificar token Google'), 500);
  }

  const { email, name, sub, picture } = googleData;
  if (!email || !sub) {
    return c.json(createError('GOOGLE_ERROR', 'Dados insuficientes do Google'), 400);
  }

  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<DbUser>();

  if (user) {
    if (!user.google_id) {
      await c.env.DB.prepare('UPDATE users SET google_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(sub, user.id)
        .run();
      user = { ...user, google_id: sub };
    }
  } else {
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, avatar_url, google_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    )
      .bind(id, email.toLowerCase(), name ?? email.split('@')[0], picture ?? null, sub, 'user')
      .run();

    user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<DbUser>();
  }

  if (!user) {
    return c.json(createError('INTERNAL_ERROR', 'Erro ao criar utilizador'), 500);
  }

  const token = await createJWT(
    { sub: user.id, role: user.role, email: user.email },
    c.env.JWT_SECRET,
    JWT_EXPIRES,
  );

  c.header('Set-Cookie', buildAuthCookie(token, c.env.ENVIRONMENT, JWT_EXPIRES));
  return c.json(createSuccess({ token, user: formatUser(user) }));
});
