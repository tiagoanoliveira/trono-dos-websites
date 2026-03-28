import type { Env } from '../index';

export function isAllowedUploadUrl(url: string, env: Env) {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/api/uploads/images/')) return true;

  const publicBase = env.R2_PUBLIC_BASE_URL?.trim();
  if (!publicBase) return false;

  try {
    const normalizedBase = new URL(publicBase).toString().replace(/\/+$/, '');
    return trimmed.startsWith(`${normalizedBase}/`);
  } catch {
    return false;
  }
}
