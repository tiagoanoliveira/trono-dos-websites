import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Website, PaginatedResponse } from '@/types';

export interface WebsiteFilters {
  category_id?: string;
  search?: string;
  sort?: 'rating' | 'recent' | 'featured' | 'date' | 'popularity';
  page?: number;
  perPage?: number;
  includeDescendants?: boolean;
}

export function useWebsites(filters: WebsiteFilters = {}) {
  const params: Record<string, string> = {};

  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.search) params.search = filters.search;
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = String(filters.page);
  if (filters.perPage) params.perPage = String(filters.perPage);
  if (filters.includeDescendants) params.include_descendants = 'true';

  const query = useQuery({
    queryKey: ['websites', filters],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Website>>('/websites', params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao carregar websites');
      }
      // API pode responder em dois formatos:
      // 1) { success, data: { data: Website[], meta } }
      // 2) { success, data: Website[], meta }
      const raw = response.data;
      if (raw && !Array.isArray(raw) && 'data' in raw && 'meta' in raw) {
        return raw as PaginatedResponse<Website>;
      }

      const page = filters.page ?? 1;
      const perPage = filters.perPage ?? 20;
      const dataArray = Array.isArray(raw) ? raw : [];
      const meta =
        response.meta ?? {
          total: dataArray.length,
          page,
          perPage,
          totalPages: Math.max(1, Math.ceil((response.meta?.total ?? dataArray.length) / perPage)),
          hasNextPage: false,
          hasPrevPage: page > 1,
        };

      return {
        data: dataArray,
        meta,
      };
    },
  });

  return {
    data: query.data,
    websites: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useWebsiteById(id: string) {
  const query = useQuery({
    queryKey: ['websites', id],
    queryFn: async () => {
      const response = await api.get<Website>(`/websites/${id}`);
      if (!response.success) {
        throw new Error(response.error?.message || 'Website não encontrado');
      }
      return response.data!;
    },
    enabled: !!id,
  });

  return {
    website: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
