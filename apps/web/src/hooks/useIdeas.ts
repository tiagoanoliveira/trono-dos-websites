import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse, Idea, IdeaFeature, IdeaComment } from '@/types';

export function useIdeas() {
  const query = useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Idea> | Idea[]>('/ideas');
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Erro ao carregar ideias');
      const raw = res.data;
      if (Array.isArray(raw)) {
        return {
          data: raw,
          meta: {
            total: raw.length,
            page: 1,
            perPage: raw.length || 20,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        } as PaginatedResponse<Idea>;
      }
      return raw;
    },
  });

  return {
    ideas: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useIdeaDetail(id: string) {
  const query = useQuery({
    queryKey: ['ideas', id],
    queryFn: async () => {
      const res = await api.get<Idea & { features: IdeaFeature[]; comments: IdeaComment[] }>(`/ideas/${id}`);
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Erro ao carregar ideia');
      return res.data;
    },
    enabled: !!id,
  });

  return {
    idea: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useIdeaMutations() {
  const qc = useQueryClient();

  const createIdea = useMutation({
    mutationFn: async (payload: { title: string; description?: string }) => {
      const res = await api.post<{ id: string }>('/ideas', payload);
      if (!res.success) throw new Error(res.error?.message || 'Erro ao criar ideia');
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  const vote = useMutation({
    mutationFn: async (payload: { ideaId: string; value: 1 | -1 }) => {
      const res = await api.post('/ideas/' + payload.ideaId + '/votes', { value: payload.value });
      if (!res.success) throw new Error(res.error?.message || 'Erro ao votar');
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['ideas', vars.ideaId] });
    },
  });

  const addFeature = useMutation({
    mutationFn: async (payload: { ideaId: string; description: string }) => {
      const res = await api.post('/ideas/' + payload.ideaId + '/features', { description: payload.description });
      if (!res.success) throw new Error(res.error?.message || 'Erro ao adicionar funcionalidade');
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ideas', vars.ideaId] });
    },
  });

  const addComment = useMutation({
    mutationFn: async (payload: { ideaId: string; content: string }) => {
      const res = await api.post('/ideas/' + payload.ideaId + '/comments', { content: payload.content });
      if (!res.success) throw new Error(res.error?.message || 'Erro ao comentar');
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ideas', vars.ideaId] });
    },
  });

  const claim = useMutation({
    mutationFn: async (ideaId: string) => {
      const res = await api.post('/ideas/' + ideaId + '/claim', {});
      if (!res.success) throw new Error(res.error?.message || 'Erro ao reclamar ideia');
      return res.data;
    },
    onSuccess: (_, ideaId) => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      qc.invalidateQueries({ queryKey: ['ideas', ideaId] });
    },
  });

  return { createIdea, vote, addFeature, addComment, claim };
}
