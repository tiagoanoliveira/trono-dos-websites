import { useParams, Link } from 'react-router-dom';
import { formatDate, getInitials } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { EmptyState } from '@/components/ui/EmptyState';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { useWebsiteById, useWebsites } from '@/hooks/useWebsites';

export function WebsitePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { website, isLoading, error } = useWebsiteById(id);

  const { websites: relatedWebsites, isLoading: relatedLoading } = useWebsites({
    category_id: website?.category_id,
    perPage: 3,
  });

  if (isLoading) {
    return (
      <div className="container-app flex items-center justify-center py-32">
        <Spinner size="lg" className="text-crown-500" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon="😕"
          title="Website não encontrado"
          description="Este website não existe ou foi removido."
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
      <div className="container-app max-w-4xl space-y-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-throne-500 flex-wrap">
          <Link to="/" className="hover:text-crown-600 transition-colors">
            Início
          </Link>
          <ChevronIcon className="h-4 w-4 shrink-0" />
          {website.category_slug && (
            <>
              <Link
                to={`/categoria/${website.category_slug}`}
                className="hover:text-crown-600 transition-colors"
              >
                {website.category_name}
              </Link>
              <ChevronIcon className="h-4 w-4 shrink-0" />
            </>
          )}
          <span className="text-throne-900 font-medium truncate">{website.name}</span>
        </nav>

        {/* Header card */}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {website.logo_url ? (
                <img
                  src={website.logo_url}
                  alt={`${website.name} logo`}
                  className="h-20 w-20 rounded-xl object-cover border border-throne-100"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-crown-100 text-crown-700 font-bold text-2xl flex items-center justify-center">
                  {getInitials(website.name)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-throne-900">{website.name}</h1>
                  <a
                    href={website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-throne-400 hover:text-crown-600 transition-colors break-all"
                  >
                    {website.url}
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {website.featured && <Badge variant="warning">⭐ Destaque</Badge>}
                  {website.category_name && (
                    <Link to={`/categoria/${website.category_slug ?? ''}`}>
                      <Badge variant="default">{website.category_name}</Badge>
                    </Link>
                  )}
                </div>
              </div>

              {website.description && (
                <p className="text-throne-600 leading-relaxed">{website.description}</p>
              )}

              {/* Rating */}
              <StarRating
                score={website.avg_rating ?? 0}
                count={website.rating_count ?? 0}
                size="md"
                showCount
              />

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-throne-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Adicionado a {formatDate(website.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="mt-6 pt-6 border-t border-throne-100">
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-8 py-3 text-base"
            >
              <ExternalLinkIcon className="h-5 w-5" />
              Visitar Website
            </a>
          </div>
        </div>

        {/* Screenshot */}
        {website.screenshot_url && (
          <div className="card overflow-hidden">
            <img
              src={website.screenshot_url}
              alt={`Captura de ecrã de ${website.name}`}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Phase 3 placeholders */}
        <div className="grid gap-6 sm:grid-cols-2">
          <PlaceholderSection
            emoji="⭐"
            title="Avaliações"
            description="Avalia este website e vê o que a comunidade pensa."
          />
          <PlaceholderSection
            emoji="💬"
            title="Comentários"
            description="Comenta e partilha a tua opinião sobre este website."
          />
        </div>

        {/* Related websites */}
        <section>
          <h2 className="text-xl font-bold text-throne-900 mb-5">
            🔗 Websites Relacionados
          </h2>
          {relatedLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card h-40 animate-pulse bg-throne-100" />
              ))}
            </div>
          ) : relatedWebsites.filter((w) => w.id !== id).length === 0 ? (
            <EmptyState
              icon="🔗"
              title="Sem websites relacionados"
              description="Ainda não há outros websites nesta categoria."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedWebsites
                .filter((w) => w.id !== id)
                .slice(0, 3)
                .map((site) => (
                  <WebsiteCard key={site.id} website={site} />
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PlaceholderSection({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-throne-800 flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h2>
        <span className="inline-flex items-center rounded-full bg-crown-100 px-2.5 py-1 text-xs font-medium text-crown-700">
          Em breve
        </span>
      </div>
      <p className="text-sm text-throne-500">{description}</p>
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
