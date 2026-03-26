import { useSearchParams, Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { Spinner } from '@/components/ui/Spinner';
import { useWebsites } from '@/hooks/useWebsites';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const { websites, meta, isLoading, error } = useWebsites({
    search: query,
    perPage: 20,
  });

  return (
    <div className="py-10">
      <div className="container-app space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-throne-900">
            {query ? (
              <>
                Resultados para{' '}
                <span className="text-crown-500">"{query}"</span>
              </>
            ) : (
              'Pesquisa'
            )}
          </h1>
          {meta && !isLoading && (
            <p className="mt-1 text-throne-500 text-sm">
              {meta.total} resultado{meta.total !== 1 ? 's' : ''} encontrado
              {meta.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        {!query ? (
          <EmptyState
            icon="🔍"
            title="Introduz um termo de pesquisa"
            description="Usa a barra de pesquisa no topo para encontrar websites."
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-crown-500" />
          </div>
        ) : error ? (
          <EmptyState
            icon="😕"
            title="Erro na pesquisa"
            description="Não foi possível realizar a pesquisa. Tenta novamente."
          />
        ) : websites.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={`Sem resultados para "${query}"`}
            description="Tenta outros termos ou propõe um website que ainda não está na plataforma."
            action={
              <Link to="/propor" className="btn-primary">
                Propor Website
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {websites.map((site) => (
              <WebsiteCard key={site.id} website={site} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
