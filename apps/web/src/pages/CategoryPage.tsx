import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { useCategoryBySlug } from '@/hooks/useCategories';
import { useWebsites, type WebsiteFilters } from '@/hooks/useWebsites';

type SortOption = 'rating' | 'date' | 'popularity' | 'featured';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'date', label: 'Mais recentes' },
  { value: 'popularity', label: 'Mais populares' },
  { value: 'featured', label: 'Em destaque' },
];

export function CategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>('rating');
  const [page, setPage] = useState(1);

  const { category, isLoading: categoryLoading, error: categoryError } = useCategoryBySlug(slug);

  const filters: WebsiteFilters = {
    category_id: category?.id,
    sort,
    page,
    perPage: 12,
  };

  const { websites, meta, isLoading: websitesLoading } = useWebsites(filters);

  if (categoryLoading) {
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
          <span className="text-throne-900 font-medium">{category.name}</span>
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
                  to={`/categoria/${child.slug}`}
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

        {/* Website grid */}
        {websitesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-48 animate-pulse bg-throne-100" />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {websites.map((site) => (
              <WebsiteCard key={site.id} website={site} />
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
