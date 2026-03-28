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
    mutationFn: async (payload: { content: string; parentId?: string | null; kind?: string }) => {
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

export function useVoteComment(websiteId: string) {
  const queryClient = useQueryClient();

  const updateCommentVotes = (comments: Comment[], targetId: string, data: { upvotes: number; downvotes: number; score: number; user_vote?: number | null }): Comment[] =>
    comments.map((c) => {
      if (c.id === targetId) {
        return {
          ...c,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          score: data.score,
          user_vote: data.user_vote ?? 0,
        };
      }
      return { ...c, replies: updateCommentVotes(c.replies ?? [], targetId, data) };
    });

  return useMutation({
    mutationFn: async ({ commentId, value }: { commentId: string; value: -1 | 0 | 1 }) => {
      const res = await api.post<{ upvotes: number; downvotes: number; score: number; user_vote?: number | null }>(
        `/websites/comments/${commentId}/votes`,
        { value },
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao votar no comentário');
      }
      return { ...res.data, commentId };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Comment[] | undefined>(['comments', websiteId], (prev) =>
        prev ? updateCommentVotes(prev, data.commentId, data) : prev,
      );
    },
  });
}
