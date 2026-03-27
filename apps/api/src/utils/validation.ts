export const MIN_NAME_LENGTH = 3;

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const search = url.search;
    return `${url.protocol}//${url.host.toLowerCase()}${pathname}${search}`;
  } catch (err) {
    throw new Error('Invalid URL provided to normalizeUrl');
  }
}
