import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@/types';

type ApiCategory = Omit<Category, 'children' | 'websiteCount'> & {
  website_count?: number;
  children?: ApiCategory[];
};

function normalizeCategory(category: ApiCategory): Category {
  const { website_count, children, ...rest } = category;
  return {
    ...rest,
    websiteCount: website_count ?? undefined,
    children: children?.map(normalizeCategory),
  };
}

export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<ApiCategory[]>('/categories');
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao carregar categorias');
      }
      return response.data?.map(normalizeCategory) ?? [];
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
      const response = await api.get<ApiCategory>(`/categories/${slug}`);
      if (!response.success) {
        throw new Error(response.error?.message || 'Categoria não encontrada');
      }
      return response.data ? normalizeCategory(response.data) : undefined;
    },
    enabled: !!slug,
  });

  return {
    category: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
