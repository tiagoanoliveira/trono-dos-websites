import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Website, PaginatedResponse } from '@/types';

export interface WebsiteFilters {
  category_id?: string;
  search?: string;
  sort?: 'rating' | 'recent' | 'featured';
  page?: number;
  perPage?: number;
}

export function useWebsites(filters: WebsiteFilters = {}) {
  const params: Record<string, string> = {};

  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.search) params.search = filters.search;
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = String(filters.page);
  if (filters.perPage) params.perPage = String(filters.perPage);

  const query = useQuery({
    queryKey: ['websites', filters],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Website>>('/websites', params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao carregar websites');
      }
      return response.data!;
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
