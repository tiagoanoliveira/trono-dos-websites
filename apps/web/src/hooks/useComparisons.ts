import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DailyComparison, ComparisonStatsRow, PaginatedResponse } from '@/types';

export function useTodayComparison() {
  const query = useQuery({
    queryKey: ['comparisons', 'today'],
    queryFn: async () => {
      const res = await api.get<DailyComparison>('/comparisons/today');
      if (!res.success) {
        throw new Error(res.error?.message ?? 'Erro ao carregar comparativo do dia');
      }
      return res.data!;
    },
  });

  return {
    comparison: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useComparisonHistory(page = 1, perPage = 10) {
  const query = useQuery({
    queryKey: ['comparisons', 'history', page, perPage],
    queryFn: async () => {
      const res = await api.get<DailyComparison[] | PaginatedResponse<DailyComparison>>('/comparisons/history', {
        page: String(page),
        perPage: String(perPage),
      });
      if (!res.success) {
        throw new Error(res.error?.message ?? 'Erro ao carregar histórico');
      }
      const raw = res.data;
      if (raw && !Array.isArray(raw) && 'data' in raw && 'meta' in raw) {
        return raw as PaginatedResponse<DailyComparison>;
      }
      const dataArray = Array.isArray(raw) ? raw : [];
      const total = res.meta?.total ?? dataArray.length;
      const totalPages = res.meta?.totalPages ?? Math.max(1, Math.ceil(total / perPage));
      return {
        data: dataArray,
        meta: {
          total,
          page: res.meta?.page ?? page,
          perPage: res.meta?.perPage ?? perPage,
          totalPages,
          hasNextPage: res.meta?.hasNextPage ?? page < totalPages,
          hasPrevPage: res.meta?.hasPrevPage ?? page > 1,
        },
      };
    },
  });

  return {
    history: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useComparisonStats() {
  const query = useQuery({
    queryKey: ['comparisons', 'stats'],
    queryFn: async () => {
      const res = await api.get<ComparisonStatsRow[]>('/comparisons/stats');
      if (!res.success) {
        throw new Error(res.error?.message ?? 'Erro ao carregar estatísticas');
      }
      return res.data ?? [];
    },
  });

  return {
    stats: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useVoteComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ comparisonId, votedFor }: { comparisonId: string; votedFor: string }) => {
      const res = await api.post<{ votes_a: number; votes_b: number; total_votes: number; user_vote: string | null }>(
        `/comparisons/${comparisonId}/votes`,
        { voted_for: votedFor },
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao votar');
      }
      return { ...res.data, comparisonId, votedFor };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<DailyComparison | undefined>(['comparisons', 'today'], (prev) => {
        if (!prev || prev.id !== data.comparisonId) return prev;
        return {
          ...prev,
          votes_a: data.votes_a,
          votes_b: data.votes_b,
          total_votes: data.total_votes,
          user_vote: data.user_vote,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['comparisons', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['comparisons', 'stats'] });
    },
  });
}
