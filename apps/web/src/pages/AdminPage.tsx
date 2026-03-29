import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatRelativeDate } from '@/lib/utils';
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
  is_blocked?: number;
  created_at: string;
};

type ReportTargetPayload = {
  report: ReportRow;
  target: Record<string, unknown> | null;
  frontend_url: string | null;
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

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportEditValue, setReportEditValue] = useState('');

  const reportTarget = useQuery({
    queryKey: ['admin', 'report-target', editingReportId],
    queryFn: async () => {
      if (!editingReportId) return null;
      const res = await api.get<ReportTargetPayload>(`/reports/${editingReportId}/target`);
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao carregar origem');
      return res.data;
    },
    enabled: Boolean(editingReportId),
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

  const toggleUserBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const res = await api.patch(`/users/${id}/block`, { blocked });
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a atualizar bloqueio');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const editReportedTarget = useMutation({
    mutationFn: async ({ reportId, payload }: { reportId: string; payload: Record<string, string> }) => {
      const res = await api.patch(`/reports/${reportId}/target`, payload);
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a editar conteúdo');
    },
    onSuccess: () => {
      if (editingReportId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'report-target', editingReportId] });
      }
    },
  });

  const deleteReportedTarget = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await api.delete(`/reports/${reportId}/target`);
      if (!res.success) throw new Error(res.error?.message ?? 'Falha a eliminar conteúdo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'pending'] });
      setEditingReportId(null);
      setReportEditValue('');
    },
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
                <p className="text-[11px] text-throne-400">{formatRelativeDate(item.created_at)}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="btn-secondary" onClick={() => setEditingReportId(item.id)}>Visualizar</button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingReportId(item.id);
                      setReportEditValue('');
                    }}
                  >
                    Editar Conteúdo
                  </button>
                  <button className="btn-primary" onClick={() => deleteReportedTarget.mutate(item.id)}>Eliminar Conteúdo</button>
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
                <button
                  className="btn-secondary"
                  onClick={() => toggleUserBlock.mutate({ id: item.id, blocked: !(item.is_blocked ?? 0) })}
                >
                  {(item.is_blocked ?? 0) ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {editingReportId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-xl border border-throne-200 bg-white p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-throne-900">Origem da denúncia</h3>
              <button className="btn-ghost" onClick={() => setEditingReportId(null)}>Fechar</button>
            </div>
            {reportTarget.isLoading && <Spinner className="text-crown-500" />}
            {reportTarget.data && (
              <>
                <div className="rounded-lg border border-throne-200 bg-throne-50 p-3 text-sm">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(reportTarget.data.target, null, 2)}</pre>
                </div>
                {reportTarget.data.frontend_url && (
                  <Link
                    to={reportTarget.data.frontend_url}
                    target="_blank"
                    className="btn-secondary inline-flex"
                  >
                    Visualizar site/idea/comentário/feature
                  </Link>
                )}
                <div className="space-y-2">
                  <label className="label">Novo conteúdo (edição rápida)</label>
                  <textarea
                    className="input min-h-[100px]"
                    value={reportEditValue}
                    onChange={(e) => setReportEditValue(e.target.value)}
                    placeholder="Conteúdo editado..."
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const targetType = reportTarget.data?.report.target_type;
                        if (!targetType) return;
                        if (targetType === 'website') {
                          editReportedTarget.mutate({ reportId: editingReportId, payload: { description: reportEditValue } });
                        } else if (targetType === 'idea') {
                          editReportedTarget.mutate({ reportId: editingReportId, payload: { description: reportEditValue } });
                        } else if (targetType === 'idea_feature') {
                          editReportedTarget.mutate({ reportId: editingReportId, payload: { description: reportEditValue } });
                        } else {
                          editReportedTarget.mutate({ reportId: editingReportId, payload: { content: reportEditValue } });
                        }
                      }}
                    >
                      Guardar edição
                    </button>
                    <button className="btn-secondary" onClick={() => deleteReportedTarget.mutate(editingReportId)}>
                      Eliminar Conteúdo
                    </button>
                    <button className="btn-ghost" onClick={() => moderateReport.mutate({ id: editingReportId, status: 'dismissed' })}>
                      Dispensar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
