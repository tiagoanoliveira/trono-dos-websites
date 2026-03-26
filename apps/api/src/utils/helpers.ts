export function generateId(): string {
  return crypto.randomUUID();
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: object;
}

export function createSuccess<T>(data: T, meta?: object): SuccessResponse<T> {
  const response: SuccessResponse<T> = { success: true, data };
  if (meta !== undefined) {
    response.meta = meta;
  }
  return response;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function createError(code: string, message: string): ErrorResponse {
  return { success: false, error: { code, message } };
}

export interface PaginationParams {
  page: number;
  perPage: number;
  offset: number;
}

export function getPaginationParams(url: URL): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('perPage') ?? '20', 10) || 20),
  );
  return { page, perPage, offset: (page - 1) * perPage };
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
