import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Comment } from '@/types';

export function useComments(websiteId: string) {
  const query = useQuery({
    queryKey: ['comments', websiteId],
    enabled: !!websiteId,
    queryFn: async () => {
      const res = await api.get<Comment[]>(`/websites/${websiteId}/comments`);
      if (!res.success) {
        throw new Error(res.error?.message ?? 'Erro ao carregar comentários');
      }
      return res.data ?? [];
    },
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAddComment(websiteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string; parentId?: string | null }) => {
      const res = await api.post<Comment>(`/websites/${websiteId}/comments`, payload);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao enviar comentário');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['websites', websiteId] });
    },
  });
}
