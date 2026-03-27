const COOKIE_NAME = 'trono_session';

function shouldUseSecure(environment?: string): boolean {
  return environment !== 'development' && environment !== 'test';
}

export function buildAuthCookie(token: string, environment: string, maxAgeSeconds: number): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (shouldUseSecure(environment)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearAuthCookie(environment: string): string {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];

  if (shouldUseSecure(environment)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function readAuthCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      return cookie.slice(COOKIE_NAME.length + 1);
    }
  }

  return null;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
