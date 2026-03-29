import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IdeaComment } from '@/types';
import { api } from '@/lib/api';

export function useVoteIdeaComment(ideaId: string) {
  const queryClient = useQueryClient();

  const updateCommentVotes = (
    comments: IdeaComment[],
    targetId: string,
    data: { upvotes: number; downvotes: number; score: number; user_vote?: number | null },
  ): IdeaComment[] =>
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
        `/ideas/comments/${commentId}/votes`,
        { value },
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao votar no comentário');
      }
      return { ...res.data, commentId };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<(Record<string, unknown> & { comments?: IdeaComment[] }) | undefined>(
        ['ideas', ideaId],
        (prev) => {
          if (!prev?.comments) return prev;
          return {
            ...prev,
            comments: updateCommentVotes(prev.comments, data.commentId, data),
          };
        },
      );
    },
  });
}
