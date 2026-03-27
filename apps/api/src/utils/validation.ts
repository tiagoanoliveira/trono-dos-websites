export const MIN_NAME_LENGTH = 3;

export function normalizeUrl(input: string | URL): string {
  try {
    const url = typeof input === 'string' ? new URL(input) : input;
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const search = url.search;
    return `${url.protocol}//${url.host.toLowerCase()}${pathname}${search}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const value = typeof input === 'string' ? input : input.href;
    throw new Error(`Invalid URL provided to normalizeUrl (${value}): ${message}`);
  }
}
