import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { useCategories } from '@/hooks/useCategories';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ALLOWED_LANGUAGES } from '@/constants/languages';

type MySuggestion = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

type MyWebsite = {
  id: string;
  name: string;
  url: string;
  status: string;
  category_name?: string | null;
  created_at: string;
};

const STATUS_VARIANTS: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
  default: { label: 'Estado desconhecido', variant: 'default' },
};

const formatDatePt = (value: string) => {
  try {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return 'Data inválida';
    return dt.toLocaleDateString('pt-PT');
  } catch {
    return 'Data inválida';
  }
};

export function ProporWebsitePage() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { categories, isLoading: loadingCategories } = useCategories();

  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    category_id: '',
  });
  const [metadata, setMetadata] = useState({
    author: '',
    launchDate: '',
    launchPrecision: 'unknown' as 'exact' | 'month' | 'year' | 'unknown',
    languages: [] as string[],
    isOpenSource: false,
    sourceUrl: '',
    images: [''],
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    categories.forEach((parent) => {
      options.push({ value: parent.id, label: parent.name });
      parent.children?.forEach((child) => {
        options.push({ value: child.id, label: `— ${child.name}` });
      });
    });
    return options;
  }, [categories]);

  const submitWebsite = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        metadata: {
          author: metadata.author || undefined,
          launchDate: metadata.launchDate || undefined,
          launchPrecision: metadata.launchPrecision,
          languages: metadata.languages,
          images: metadata.images.map((img) => img.trim()).filter(Boolean),
          isOpenSource: metadata.isOpenSource,
          sourceUrl: metadata.sourceUrl || undefined,
        },
      };

      const res = await api.post<MyWebsite>('/websites', payload);
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao submeter');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-websites'] });
      setForm({ name: '', url: '', description: '', category_id: '' });
      setMetadata({
        author: '',
        launchDate: '',
        launchPrecision: 'unknown',
        languages: [],
        isOpenSource: false,
        sourceUrl: '',
        images: [''],
      });
    },
  });

  const submitCategory = useMutation({
    mutationFn: async () => {
      const res = await api.post<MySuggestion>('/categories/suggestions', categoryForm);
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao sugerir');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-category-suggestions'] });
      setCategoryForm({ name: '', description: '' });
    },
  });

  const myWebsites = useQuery({
    queryKey: ['my-websites'],
    queryFn: async () => {
      const res = await api.get<MyWebsite[]>('/websites/mine');
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao carregar');
      return res.data;
    },
    enabled: isAuthenticated,
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
        <h1 className="text-3xl font-bold text-throne-900">Entra para propor websites</h1>
        <p className="max-w-lg text-throne-600">
          Precisamos de saber quem és para associar as contribuições e notificar-te quando forem
          aprovadas ou rejeitadas.
        </p>
        <div className="flex gap-3">
          <Link to="/entrar" className="btn-primary">
            Entrar
          </Link>
          <Link to="/registar" className="btn-secondary">
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-12 space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-4xl">✨</span>
        <div>
          <h1 className="text-3xl font-bold text-throne-900">Contribuir para a comunidade</h1>
          <p className="text-throne-600">
            Submete novos websites ou sugere categorias. Receberás o estado da revisão abaixo.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-throne-900">Propor website</h2>
            <Badge variant="warning">Estado: pendente até revisão</Badge>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitWebsite.mutate();
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
              <label className="label">URL</label>
              <input
                className="input"
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea
                className="input min-h-[96px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select
                className="input"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                required
                disabled={loadingCategories}
              >
                <option value="">Seleciona uma categoria</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Autor / Equipa</label>
              <input
                className="input"
                placeholder="Ex: Tiago Oliveira ou Equipa XPTO"
                value={metadata.author}
                onChange={(e) => setMetadata((m) => ({ ...m, author: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Data de lançamento</label>
                <input
                  className="input"
                  type={metadata.launchPrecision === 'exact' ? 'date' : metadata.launchPrecision === 'month' ? 'month' : 'text'}
                  placeholder="AAAA-MM ou AAAA"
                  value={metadata.launchDate}
                  onChange={(e) => setMetadata((m) => ({ ...m, launchDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Precisão</label>
                <select
                  className="input"
                  value={metadata.launchPrecision}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, launchPrecision: e.target.value as typeof m.launchPrecision }))
                  }
                >
                  <option value="exact">Data exata</option>
                  <option value="month">Mês + ano</option>
                  <option value="year">Só ano</option>
                  <option value="unknown">Não sei</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Linguagens utilizadas</label>
              <div className="space-y-2">
                <select
                  className="input"
                  value=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    setMetadata((m) =>
                      m.languages.includes(value) ? m : { ...m, languages: [...m.languages, value] },
                    );
                  }}
                >
                  <option value="">Seleciona</option>
                  {ALLOWED_LANGUAGES.filter((lang) => !metadata.languages.includes(lang)).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {metadata.languages.length === 0 ? (
                    <span className="text-xs text-throne-500">Nenhuma linguagem selecionada</span>
                  ) : (
                    metadata.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-2 rounded-full bg-throne-100 px-3 py-1 text-sm text-throne-700"
                      >
                        {lang}
                        <button
                          type="button"
                          className="text-throne-400 hover:text-throne-700"
                          onClick={() =>
                            setMetadata((m) => ({
                              ...m,
                              languages: m.languages.filter((l) => l !== lang),
                            }))
                          }
                          aria-label={`Remover ${lang}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-throne-500">Lista controlada para manter consistência.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="label">Fotos (URLs)</label>
              {metadata.images.map((img, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="https://..."
                    value={img}
                    onChange={(e) =>
                      setMetadata((m) => ({
                        ...m,
                        images: m.images.map((current, currentIdx) =>
                          currentIdx === idx ? e.target.value : current,
                        ),
                      }))
                    }
                  />
                  {idx === metadata.images.length - 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMetadata((m) => ({ ...m, images: [...m.images, ''] }))}
                    >
                      + Foto
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-throne-700">
                <input
                  type="checkbox"
                  checked={metadata.isOpenSource}
                  onChange={(e) => setMetadata((m) => ({ ...m, isOpenSource: e.target.checked }))}
                />
                É open-source?
              </label>
              {metadata.isOpenSource && (
                <input
                  className="input"
                  type="url"
                  placeholder="Link para o repositório"
                  value={metadata.sourceUrl}
                  onChange={(e) => setMetadata((m) => ({ ...m, sourceUrl: e.target.value }))}
                />
              )}
            </div>
            {submitWebsite.error && (
              <p className="text-sm text-red-600">
                {(submitWebsite.error as Error).message || 'Erro ao submeter'}
              </p>
            )}
            {submitWebsite.isSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                Submissão enviada! Avisar-te-emos quando for revista.
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={submitWebsite.isPending}
            >
              {submitWebsite.isPending ? 'A enviar…' : 'Submeter website'}
            </button>
          </form>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-throne-900">Sugerir categoria</h2>
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
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <textarea
                className="input min-h-[96px]"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {submitCategory.error && (
              <p className="text-sm text-red-600">
                {(submitCategory.error as Error).message || 'Erro ao sugerir'}
              </p>
            )}
            {submitCategory.isSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                Sugestão enviada! Vamos analisar e avisar-te.
              </p>
            )}
            <button
              type="submit"
              className="btn-secondary w-full justify-center"
              disabled={submitCategory.isPending}
            >
              {submitCategory.isPending ? 'A enviar…' : 'Sugerir categoria'}
            </button>
          </form>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-throne-900">Minhas contribuições</h3>
          <span className="text-sm text-throne-500">
            Vês aqui o estado (aprovado/rejeitado/pendente) assim que for revisto.
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-throne-700 mb-2">Websites submetidos</h4>
            <div className="space-y-2">
              {myWebsites.isLoading && <p className="text-sm text-throne-500">A carregar…</p>}
              {myWebsites.data?.length === 0 && (
                <p className="text-sm text-throne-500">Ainda não submeteste websites.</p>
              )}
              {myWebsites.data?.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-throne-100 bg-throne-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-throne-900 leading-tight">{w.name}</p>
                    <p className="text-xs text-throne-500">
                      {w.category_name ?? 'Sem categoria'} · {formatDatePt(w.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-throne-700 mb-2">Sugestões de categoria</h4>
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
                    {sug.description ? (
                      <p className="text-xs text-throne-500 line-clamp-2">{sug.description}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={sug.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const data = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.default;
  return <Badge variant={data.variant}>{data.label}</Badge>;
}
