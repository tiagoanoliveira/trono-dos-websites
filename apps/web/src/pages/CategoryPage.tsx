import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn, truncate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCategories, useCategoryBySlug } from '@/hooks/useCategories';
import { useWebsites, type WebsiteFilters } from '@/hooks/useWebsites';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { Category, PaginatedResponse, Website } from '@/types';

type SortOption = 'rating' | 'date' | 'popularity' | 'featured';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'date', label: 'Mais recentes' },
  { value: 'popularity', label: 'Mais populares' },
  { value: 'featured', label: 'Em destaque' },
];

export function CategoryPage() {
  const params = useParams<{ '*': string }>();
  const slugPath = params['*'] ?? '';
  const slugSegments = slugPath.split('/').filter(Boolean);
  const slug = slugSegments[slugSegments.length - 1] ?? '';
  const [sort, setSort] = useState<SortOption>('rating');
  const [page, setPage] = useState(1);
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();

  const { categories, isLoading: categoriesLoading } = useCategories();
  const { category, isLoading: categoryLoading, error: categoryError } = useCategoryBySlug(slug);

  const filters: WebsiteFilters = useMemo(
    () => ({
      category_id: category?.id,
      sort,
      page,
      perPage: 24,
      includeDescendants: true,
    }),
    [category?.id, page, sort],
  );

  const { websites, meta, isLoading: websitesLoading } = useWebsites(filters);

  const voteMutation = useMutation({
    mutationFn: async ({ websiteId, value }: { websiteId: string; value: -1 | 0 | 1 }) => {
      const res = await api.post<{
        upvotes: number;
        downvotes: number;
        score: number;
        user_vote?: number | null;
      }>(`/websites/${websiteId}/votes`, { value });

      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao votar');
      }

      return { ...res.data, websiteId };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PaginatedResponse<Website> | undefined>(['websites', filters], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((site) =>
            site.id === data.websiteId
              ? {
                  ...site,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                  score: data.score,
                  user_vote: data.user_vote ?? 0,
                }
              : site,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['websites', data.websiteId] });
    },
  });

  const { breadcrumbChain, currentPathSlugs } = useMemo(() => {
    const idMap = new Map<string, Category>();
    const walk = (cat: Category) => {
      idMap.set(cat.id, cat);
      cat.children?.forEach(walk);
    };
    categories.forEach(walk);

    if (!category) {
      return { breadcrumbChain: [] as Category[], currentPathSlugs: [] as string[] };
    }

    const chain: Category[] = [];
    let cursor: Category | undefined = category;
    while (cursor) {
      chain.push(cursor);
      if (cursor.parent_id && idMap.has(cursor.parent_id)) {
        cursor = idMap.get(cursor.parent_id);
      } else {
        break;
      }
    }

    const fullChain = chain.reverse();
    return {
      breadcrumbChain: fullChain,
      currentPathSlugs: fullChain.map((c) => c.slug),
    };
  }, [categories, category]);

  if (categoryLoading || categoriesLoading) {
    return (
      <div className="container-app flex items-center justify-center py-32">
        <Spinner size="lg" className="text-crown-500" />
      </div>
    );
  }

  if (categoryError || !category) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon="😕"
          title="Categoria não encontrada"
          description="Esta categoria não existe ou foi removida."
          action={
            <Link to="/" className="btn-primary">
              Voltar ao início
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="container-app space-y-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-throne-500">
          <Link to="/" className="hover:text-crown-600 transition-colors">
            Início
          </Link>
          <ChevronIcon className="h-4 w-4" />
          {breadcrumbChain.map((crumb, idx) => {
            const isLast = idx === breadcrumbChain.length - 1;
            const path = `/categoria/${breadcrumbChain
              .slice(0, idx + 1)
              .map((c) => c.slug)
              .join('/')}`;
            return (
              <div key={crumb.id} className="flex items-center gap-2">
                {isLast ? (
                  <span className="text-throne-900 font-medium">{crumb.name}</span>
                ) : (
                  <Link to={path} className="hover:text-crown-600 transition-colors">
                    {crumb.name}
                  </Link>
                )}
                {!isLast && <ChevronIcon className="h-4 w-4" />}
              </div>
            );
          })}
        </nav>

        {/* Category header */}
        <header className="flex items-start gap-4">
          {category.icon && (
            <span className="text-5xl leading-none" aria-hidden="true">
              {category.icon}
            </span>
          )}
          <div>
            <h1 className="text-3xl font-bold text-throne-900">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-throne-500 max-w-2xl leading-relaxed">
                {category.description}
              </p>
            )}
            {category.websiteCount !== undefined && (
              <p className="mt-2 text-sm text-throne-400">
                {category.websiteCount} {category.websiteCount === 1 ? 'website' : 'websites'}
                {category.children && category.children.length > 0 ? ' (inclui subcategorias)' : ''}
              </p>
            )}
          </div>
        </header>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-throne-800 mb-3">Subcategorias</h2>
            <div className="flex flex-wrap gap-2">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/categoria/${[...currentPathSlugs, child.slug].join('/')}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                    'bg-throne-100 text-throne-700 hover:bg-crown-100 hover:text-crown-700',
                    'transition-colors border border-throne-200 hover:border-crown-200'
                  )}
                >
                  {child.icon && <span>{child.icon}</span>}
                  {child.name}
                  {child.websiteCount !== undefined && (
                    <span className="text-xs text-throne-400">({child.websiteCount})</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filter / sort bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-throne-500 text-sm">
            {meta ? `${meta.total} resultado${meta.total !== 1 ? 's' : ''}` : ''}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-throne-500">Ordenar:</span>
            <div className="flex rounded-lg border border-throne-200 overflow-hidden">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSort(opt.value);
                    setPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm transition-colors',
                    sort === opt.value
                      ? 'bg-crown-500 text-white'
                      : 'bg-white text-throne-600 hover:bg-throne-50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Website list */}
        {websitesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-32 animate-pulse bg-throne-100" />
            ))}
          </div>
        ) : websites.length === 0 ? (
          <EmptyState
            icon="🌐"
            title="Sem websites nesta categoria"
            description="Sê o primeiro a propor um website aqui!"
            action={
              <Link to="/propor" className="btn-primary">
                Propor Website
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {websites.map((site) => (
              <WebsiteListRow
                key={site.id}
                website={site}
                onVote={(direction) => {
                  const current = site.user_vote ?? 0;
                  const next = getNextVoteValue(current, direction);
                  voteMutation.mutate({ websiteId: site.id, value: next });
                }}
                voting={voteMutation.isPending && voteMutation.variables?.websiteId === site.id}
                disabled={!isAuthenticated}
                canSeeBreakdown={user?.role === 'admin' || (!!site.submitted_by && site.submitted_by === user?.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!meta.hasPrevPage}
              className="btn-secondary px-3 py-2 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm text-throne-600 px-2">
              Página {meta.page} de {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
              className="btn-secondary px-3 py-2 disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getNextVoteValue(current: number, direction: 'up' | 'down'): -1 | 0 | 1 {
  if (direction === 'up') return current === 1 ? 0 : 1;
  return current === -1 ? 0 : -1;
}

function WebsiteListRow({
  website,
  onVote,
  voting,
  disabled,
  canSeeBreakdown,
}: {
  website: Website;
  onVote: (direction: 'up' | 'down') => void;
  voting: boolean;
  disabled: boolean;
  canSeeBreakdown: boolean;
}) {
  const metadata = website.metadata;
  const launchLabel = formatLaunchDate(metadata?.launch_date, metadata?.launch_precision);
  const languagesLabel = metadata?.languages?.join(', ');
  const isOpenSource = metadata?.is_open_source;
  const sourceUrl = metadata?.source_url;
  const score = website.score ?? 0;
  const upvotes = website.upvotes ?? 0;
  const downvotes = website.downvotes ?? 0;
  const userVote = website.user_vote ?? 0;

  return (
    <div className="flex gap-4 rounded-xl border border-throne-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col items-center rounded-lg bg-throne-50 px-3 py-2 text-sm font-medium text-throne-600">
        <button
          type="button"
          onClick={() => onVote('up')}
          disabled={disabled || voting}
          className={cn(
            'transition-colors',
            disabled ? 'text-throne-300 cursor-not-allowed' : userVote === 1 ? 'text-crown-600' : 'hover:text-crown-600',
          )}
          title={disabled ? 'Entra para votar' : 'Upvote'}
        >
          ▲
        </button>
        <span className="text-base font-semibold text-throne-900">{score}</span>
        <button
          type="button"
          onClick={() => onVote('down')}
          disabled={disabled || voting}
            className={cn(
              'transition-colors',
              disabled
                ? 'text-throne-300 cursor-not-allowed'
                : userVote === -1
                  ? 'text-red-600'
                  : 'hover:text-crown-600',
            )}
            title={disabled ? 'Entra para votar' : 'Downvote'}
          >
            ▼
        </button>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              to={`/website/${website.id}`}
              className="text-lg font-semibold text-throne-900 hover:text-crown-600 transition-colors line-clamp-1"
            >
              {website.name}
            </Link>
            <p className="text-xs text-throne-500">
              {website.category_slug ? (
                <Link
                  to={`/categoria/${website.category_slug}`}
                  className="font-medium text-throne-600 hover:text-crown-700"
                >
                  c/{website.category_slug}
                </Link>
              ) : (
                <span className="font-medium text-throne-600">c/geral</span>
              )}{' '}
              · {website.owner_name ? `por ${website.owner_name}` : 'autor desconhecido'}
            </p>
          </div>
          <a
            href={website.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm whitespace-nowrap"
          >
            Visitar
          </a>
        </div>

        {website.description && (
          <p className="text-sm text-throne-600 leading-relaxed">{truncate(website.description, 200)}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-throne-500">
          {launchLabel && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              Lançamento: {launchLabel}
            </span>
          )}
          {languagesLabel && (
            <span className="flex items-center gap-1">
              <CodeIcon className="h-3.5 w-3.5" />
              {languagesLabel}
            </span>
          )}
          {isOpenSource && (
            <span className="flex items-center gap-1">
              <GithubIcon className="h-3.5 w-3.5" />
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-crown-600 hover:text-crown-700"
                >
                  Código aberto
                </a>
              ) : (
                'Código aberto'
              )}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-throne-500">
          {canSeeBreakdown && (
            <>
              <span className="flex items-center gap-1">
                <ArrowUpIcon className="h-3 w-3" />
                {upvotes} upvotes
              </span>
              <span className="flex items-center gap-1">
                <ArrowDownIcon className="h-3 w-3" />
                {downvotes} downvotes
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLaunchDate(
  value?: string | null,
  precision?: 'exact' | 'month' | 'year' | 'unknown' | null,
) {
  if (!value) return null;
  try {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;

    if (precision === 'year') return String(dt.getUTCFullYear());
    if (precision === 'month') {
      return dt.toLocaleDateString('pt-PT', { year: 'numeric', month: 'short' });
    }
    return dt.toLocaleDateString('pt-PT');
  } catch {
    return value;
  }
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.11 3.29 9.44 7.86 10.98.58.11.79-.25.79-.56v-2.02c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.74 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.71 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.18a10.9 10.9 0 0 1 2.86-.39c.97 0 1.95.13 2.86.39 2.17-1.49 3.13-1.18 3.13-1.18.63 1.57.24 2.73.12 3.02.73.8 1.18 1.83 1.18 3.1 0 4.44-2.68 5.41-5.24 5.7.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
