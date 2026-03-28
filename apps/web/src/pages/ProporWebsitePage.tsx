import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { useCategories } from '@/hooks/useCategories';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ALLOWED_LANGUAGES } from '@/constants/languages';
import { uploadImage } from '@/hooks/useImageUpload';

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
    logo_url: '',
    screenshot_url: '',
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [uploadingMetaIndex, setUploadingMetaIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [websiteNotificationsOnly, setWebsiteNotificationsOnly] = useState(false);

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
      setForm({ name: '', url: '', description: '', category_id: '', logo_url: '', screenshot_url: '' });
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

  const myWebsites = useQuery({
    queryKey: ['my-websites'],
    queryFn: async () => {
      const res = await api.get<MyWebsite[]>('/websites/mine');
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao carregar');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const notifications = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; title: string; message: string; entity_type?: string | null }>>(
        '/notifications/mine',
      );
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Erro ao carregar notificações');
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
              <label className="label">Logo</label>
              <div className="mt-2">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError('');
                    setUploadingLogo(true);
                    try {
                      const uploadedUrl = await uploadImage(file, 'logo');
                      setForm((f) => ({ ...f, logo_url: uploadedUrl }));
                    } catch (err) {
                      setUploadError(err instanceof Error ? err.message : 'Falha ao enviar logo.');
                    } finally {
                      setUploadingLogo(false);
                      e.target.value = '';
                    }
                  }}
                />
                <label htmlFor="logo-upload" className="btn-secondary cursor-pointer inline-flex">
                  {uploadingLogo ? 'A enviar logo…' : 'Carregar logo'}
                </label>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Pré-visualização do logo" className="mt-3 h-16 w-16 rounded-lg object-cover border border-throne-100" />
                )}
              </div>
            </div>
            <div>
              <label className="label">Screenshot</label>
              <div className="mt-2">
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadError('');
                    setUploadingScreenshot(true);
                    try {
                      const uploadedUrl = await uploadImage(file, 'screenshot');
                      setForm((f) => ({ ...f, screenshot_url: uploadedUrl }));
                    } catch (err) {
                      setUploadError(err instanceof Error ? err.message : 'Falha ao enviar screenshot.');
                    } finally {
                      setUploadingScreenshot(false);
                      e.target.value = '';
                    }
                  }}
                />
                <label htmlFor="screenshot-upload" className="btn-secondary cursor-pointer inline-flex">
                  {uploadingScreenshot ? 'A enviar screenshot…' : 'Carregar screenshot'}
                </label>
                {form.screenshot_url && (
                  <img
                    src={form.screenshot_url}
                    alt="Pré-visualização do screenshot"
                    className="mt-3 w-full max-w-sm rounded-lg object-cover border border-throne-100"
                  />
                )}
              </div>
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
              <label className="label">Fotos</label>
              {metadata.images.map((img, idx) => (
                <div key={idx} className="flex gap-2">
                  {idx === metadata.images.length - 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMetadata((m) => ({ ...m, images: [...m.images, ''] }))}
                    >
                      + Foto
                    </button>
                  )}
                  <input
                    id={`meta-image-upload-${idx}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadError('');
                      setUploadingMetaIndex(idx);
                      try {
                        const uploadedUrl = await uploadImage(file, 'website-image');
                        setMetadata((m) => ({
                          ...m,
                          images: m.images.map((current, currentIdx) =>
                            currentIdx === idx ? uploadedUrl : current,
                          ),
                        }));
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : 'Falha ao enviar imagem.');
                      } finally {
                        setUploadingMetaIndex(null);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label
                    htmlFor={`meta-image-upload-${idx}`}
                    className="btn-secondary cursor-pointer inline-flex whitespace-nowrap"
                  >
                    {uploadingMetaIndex === idx ? 'A enviar…' : 'Upload'}
                  </label>
                  {img && (
                    <img src={img} alt={`Pré-visualização ${idx + 1}`} className="h-16 w-16 rounded object-cover border border-throne-100" />
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
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
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
          <div className="flex items-center justify-center">
            <Link to="/propor-categoria" className="btn-secondary">
              Sugerir categoria (página separada)
            </Link>
          </div>
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-throne-900">Notificações</h3>
          <label className="text-sm text-throne-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={websiteNotificationsOnly}
              onChange={(e) => setWebsiteNotificationsOnly(e.target.checked)}
            />
            Só websites
          </label>
        </div>
        {notifications.isLoading && <p className="text-sm text-throne-500">A carregar…</p>}
        {notifications.data
          ?.filter((n) => (websiteNotificationsOnly ? n.entity_type === 'website' : true))
          .map((n) => (
            <div key={n.id} className="rounded-lg border border-throne-100 bg-throne-50 px-3 py-2">
              <p className="font-medium text-throne-900">{n.title}</p>
              <p className="text-sm text-throne-600">{n.message}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const data = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.default;
  return <Badge variant={data.variant}>{data.label}</Badge>;
}
