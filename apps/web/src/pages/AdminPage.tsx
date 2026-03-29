import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, Website } from '@/types';

type AdminTab = 'websites' | 'categories' | 'reports' | 'users';

type CategorySuggestion = {
  id: string;
  name: string;
  description: string | null;
  suggested_by: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
};

function unwrapPaginated<T>(raw: unknown, meta?: unknown): PaginatedResponse<T> {
  if (raw && typeof raw === 'object' && 'data' in (raw as object) && 'meta' in (raw as object)) {
    return raw as PaginatedResponse<T>;
  }
  const data = (Array.isArray(raw) ? raw : []) as T[];
  const fallbackMeta = (meta ?? {}) as Record<string, unknown>;
  const perPage = typeof fallbackMeta.perPage === 'number' ? fallbackMeta.perPage : Math.max(1, data.length);
  const total = typeof fallbackMeta.total === 'number' ? fallbackMeta.total : data.length;
  const page = typeof fallbackMeta.page === 'number' ? fallbackMeta.page : 1;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    meta: {
      total,
      page,
      perPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function AdminPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<AdminTab>('websites');
  const queryClient = useQueryClient();

  const websites = useQuery({
    queryKey: ['admin', 'websites', 'pending'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Website>>('/websites/pending');
      if (!res.success) throw new Error(res.error?.message ?? 'Erro ao carregar websites pendentes');
      return unwrapPaginated<Website>(res.data, res.meta);
    },
    enabled: isModerator,
  });

  const categories = useQuery({
    queryKey: ['admin', 'categories', 'pending'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<CategorySuggestion>>('/categories/suggestions/pending');
      if (!res.success) throw new Error(res.error?.message ?? 'Erro ao carregar sugestões pendentes');
      return unwrapPaginated<CategorySuggestion>(res.data, res.meta);
    },
    enabled: isModerator,
  });

  const reports = useQuery({
    queryKey: ['admin', 'reports', 'pending'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ReportRow>>('/reports', { status: 'pending' });
      if (!res.success) throw new Error(res.error?.message ?? 'Erro ao carregar denúncias');
      return unwrapPaginated<ReportRow>(res.data, res.meta);
    },
    enabled: isModerator,
  });

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AdminUser>>('/users');
      if (!res.success) throw new Error(res.error?.message ?? 'Erro ao carregar utilizadores');
      return unwrapPaginated<AdminUser>(res.data, res.meta);
    },
    enabled: isAdmin,
  });

  const moderateWebsite = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const res = await api.patch(`/websites/${id}/status`, { status });
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a moderar website');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'websites', 'pending'] }),
  });

  const moderateCategory = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const res = await api.patch(`/categories/suggestions/${id}/status`, { status });
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a moderar categoria');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories', 'pending'] }),
  });

  const moderateReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'reviewed' | 'resolved' | 'dismissed' }) => {
      const res = await api.patch(`/reports/${id}/status`, { status });
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a atualizar denúncia');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'pending'] }),
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'user' | 'moderator' | 'admin' }) => {
      const res = await api.patch(`/users/${id}/role`, { role });
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a atualizar role');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const tabs = useMemo(
    () => [
      { id: 'websites' as const, label: 'Websites pendentes' },
      { id: 'categories' as const, label: 'Categorias pendentes' },
      { id: 'reports' as const, label: 'Denúncias' },
      ...(isAdmin ? [{ id: 'users' as const, label: 'Utilizadores' }] : []),
    ],
    [isAdmin],
  );

  if (!isAuthenticated) {
    return (
      <div className="container-app py-20 text-center space-y-3">
        <h1 className="text-2xl font-bold text-throne-900">Painel de moderação</h1>
        <p className="text-throne-500">Inicia sessão para aceder ao painel.</p>
        <Link to="/entrar" className="btn-primary">Entrar</Link>
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="container-app py-20 text-center space-y-3">
        <h1 className="text-2xl font-bold text-throne-900">Acesso restrito</h1>
        <p className="text-throne-500">Só moderadores e admins podem aceder.</p>
      </div>
    );
  }

  return (
    <div className="container-app py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-throne-900">Painel de Moderação</h1>
        <p className="text-sm text-throne-500">Aprovação de conteúdo, denúncias e gestão de utilizadores.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`btn-secondary ${tab === item.id ? 'border-crown-400 text-crown-700' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'websites' && (
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-throne-900">Websites pendentes</h2>
          {websites.isLoading && <Spinner className="text-crown-500" />}
          {websites.data?.data.length === 0 && <p className="text-sm text-throne-500">Sem websites pendentes.</p>}
          <div className="space-y-2">
            {websites.data?.data.map((item) => (
              <div key={item.id} className="rounded-lg border border-throne-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-throne-900">{item.name}</p>
                    <p className="text-xs text-throne-500">{item.url}</p>
                    <p className="text-xs text-throne-400">Submetido em {formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => moderateWebsite.mutate({ id: item.id, status: 'approved' })}>Aprovar</button>
                    <button className="btn-secondary" onClick={() => moderateWebsite.mutate({ id: item.id, status: 'rejected' })}>Rejeitar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'categories' && (
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-throne-900">Sugestões de categoria pendentes</h2>
          {categories.isLoading && <Spinner className="text-crown-500" />}
          {categories.data?.data.length === 0 && <p className="text-sm text-throne-500">Sem sugestões pendentes.</p>}
          <div className="space-y-2">
            {categories.data?.data.map((item) => (
              <div key={item.id} className="rounded-lg border border-throne-200 p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-throne-900">{item.name}</p>
                  {item.description && <p className="text-sm text-throne-600">{item.description}</p>}
                  <p className="text-xs text-throne-400">Criada em {formatDate(item.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={() => moderateCategory.mutate({ id: item.id, status: 'approved' })}>Aprovar</button>
                  <button className="btn-secondary" onClick={() => moderateCategory.mutate({ id: item.id, status: 'rejected' })}>Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'reports' && (
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-throne-900">Denúncias pendentes</h2>
          {reports.isLoading && <Spinner className="text-crown-500" />}
          {reports.data?.data.length === 0 && <p className="text-sm text-throne-500">Sem denúncias pendentes.</p>}
          <div className="space-y-2">
            {reports.data?.data.map((item) => (
              <div key={item.id} className="rounded-lg border border-throne-200 p-3 space-y-1">
                <p className="text-sm text-throne-900">
                  <span className="font-semibold">{item.target_type}</span> · {item.target_id}
                </p>
                <p className="text-sm text-throne-700">{item.reason}</p>
                {item.description && <p className="text-xs text-throne-500">{item.description}</p>}
                <div className="flex gap-2 pt-1">
                  <button className="btn-secondary" onClick={() => moderateReport.mutate({ id: item.id, status: 'reviewed' })}>Marcar revisto</button>
                  <button className="btn-primary" onClick={() => moderateReport.mutate({ id: item.id, status: 'resolved' })}>Resolver</button>
                  <button className="btn-ghost" onClick={() => moderateReport.mutate({ id: item.id, status: 'dismissed' })}>Dispensar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'users' && isAdmin && (
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-throne-900">Utilizadores</h2>
          {users.isLoading && <Spinner className="text-crown-500" />}
          {users.data?.data.length === 0 && <p className="text-sm text-throne-500">Sem utilizadores.</p>}
          <div className="space-y-2">
            {users.data?.data.map((item) => (
              <div key={item.id} className="rounded-lg border border-throne-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-throne-900">{item.name}</p>
                  <p className="text-xs text-throne-500">{item.email}</p>
                </div>
                <select
                  className="input h-9 w-40"
                  value={item.role}
                  onChange={(e) => updateUserRole.mutate({ id: item.id, role: e.target.value as 'user' | 'moderator' | 'admin' })}
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
