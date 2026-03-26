import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@/types';

export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<Category[]>('/categories');
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao carregar categorias');
      }
      return response.data!;
    },
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCategoryBySlug(slug: string) {
  const query = useQuery({
    queryKey: ['categories', slug],
    queryFn: async () => {
      const response = await api.get<Category>(`/categories/${slug}`);
      if (!response.success) {
        throw new Error(response.error?.message || 'Categoria não encontrada');
      }
      return response.data!;
    },
    enabled: !!slug,
  });

  return {
    category: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
