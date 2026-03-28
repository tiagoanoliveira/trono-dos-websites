import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type MySuggestion = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

const STATUS_VARIANTS: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'danger' },
  default: { label: 'Estado desconhecido', variant: 'default' },
};

export function ProporCategoriaPage() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });

  const submitCategory = useMutation({
    mutationFn: async () => {
      const res = await api.post<MySuggestion>('/categories/suggestions', form);
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao sugerir');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-category-suggestions'] });
      setForm({ name: '', description: '' });
    },
  });

  const mySuggestions = useQuery({
    queryKey: ['my-category-suggestions'],
    queryFn: async () => {
      const res = await api.get<MySuggestion[]>('/categories/suggestions/mine');
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao carregar');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-24 text-center space-y-5">
        <span className="text-5xl">🔒</span>
        <h1 className="text-3xl font-bold text-throne-900">Entra para sugerir categorias</h1>
        <div className="flex gap-3">
          <Link to="/entrar" className="btn-primary">Entrar</Link>
          <Link to="/registar" className="btn-secondary">Criar conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-12 space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-4xl">🗂️</span>
        <div>
          <h1 className="text-3xl font-bold text-throne-900">Sugerir categoria</h1>
          <p className="text-throne-600">Ajuda-nos a organizar melhor os websites da comunidade.</p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-throne-900">Nova sugestão</h2>
          <Badge variant="info">Ajuda a organizar</Badge>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitCategory.mutate();
          }}
        >
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea
              className="input min-h-[96px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {submitCategory.error && (
            <p className="text-sm text-red-600">{(submitCategory.error as Error).message || 'Erro ao sugerir'}</p>
          )}
          {submitCategory.isSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              Sugestão enviada! Vamos analisar e avisar-te.
            </p>
          )}
          <button type="submit" className="btn-secondary w-full justify-center" disabled={submitCategory.isPending}>
            {submitCategory.isPending ? 'A enviar…' : 'Sugerir categoria'}
          </button>
        </form>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-throne-900">Minhas sugestões</h3>
        <div className="space-y-2">
          {mySuggestions.isLoading && <p className="text-sm text-throne-500">A carregar…</p>}
          {mySuggestions.data?.length === 0 && (
            <p className="text-sm text-throne-500">Ainda não sugeriste categorias.</p>
          )}
          {mySuggestions.data?.map((sug) => (
            <div
              key={sug.id}
              className="flex items-center justify-between rounded-lg border border-throne-100 bg-throne-50 px-3 py-2"
            >
              <div>
                <p className="font-medium text-throne-900 leading-tight">{sug.name}</p>
                {sug.description ? <p className="text-xs text-throne-500 line-clamp-2">{sug.description}</p> : null}
              </div>
              <Badge variant={(STATUS_VARIANTS[sug.status] ?? STATUS_VARIANTS.default).variant}>
                {(STATUS_VARIANTS[sug.status] ?? STATUS_VARIANTS.default).label}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
