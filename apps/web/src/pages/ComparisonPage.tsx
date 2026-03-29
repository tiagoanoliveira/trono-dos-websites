import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useComparisonHistory, useComparisonStats, useTodayComparison, useVoteComparison } from '@/hooks/useComparisons';

export function ComparisonPage() {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);

  const { comparison, isLoading, error } = useTodayComparison();
  const voteMutation = useVoteComparison();
  const { history, meta, isLoading: historyLoading } = useComparisonHistory(page, 10);
  const { stats, isLoading: statsLoading } = useComparisonStats();

  const totalVotes = comparison?.total_votes ?? 0;
  const websiteAPercentage = useMemo(() => {
    if (!comparison || totalVotes <= 0) return 0;
    return Math.round((comparison.votes_a / totalVotes) * 100);
  }, [comparison, totalVotes]);
  const websiteBPercentage = totalVotes > 0 ? 100 - websiteAPercentage : 0;

  if (isLoading) {
    return (
      <div className="container-app flex items-center justify-center py-24">
        <Spinner size="lg" className="text-crown-500" />
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="container-app py-12">
        <EmptyState
          icon="⚖️"
          title="Comparativo indisponível"
          description="O comparativo de hoje ainda não foi gerado. Volta mais tarde."
        />
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="container-app max-w-5xl space-y-10">
        <section className="card p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-throne-900">⚖️ Comparativo do dia</h1>
              <p className="text-throne-500 text-sm">
                {comparison.category_name ? `Categoria: ${comparison.category_name} · ` : ''}
                {formatDate(comparison.date)}
              </p>
            </div>
            <span className="rounded-full bg-throne-100 px-3 py-1 text-xs font-medium text-throne-600">
              {totalVotes} votos
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ComparisonOptionCard
              website={comparison.website_a}
              votes={comparison.votes_a}
              percentage={websiteAPercentage}
              selected={comparison.user_vote === comparison.website_a.id}
              onVote={() => voteMutation.mutate({ comparisonId: comparison.id, votedFor: comparison.website_a.id })}
              disabled={voteMutation.isPending || !isAuthenticated}
            />
            <ComparisonOptionCard
              website={comparison.website_b}
              votes={comparison.votes_b}
              percentage={websiteBPercentage}
              selected={comparison.user_vote === comparison.website_b.id}
              onVote={() => voteMutation.mutate({ comparisonId: comparison.id, votedFor: comparison.website_b.id })}
              disabled={voteMutation.isPending || !isAuthenticated}
            />
          </div>

          {!isAuthenticated && (
            <div className="mt-4 text-center text-sm text-throne-500">
              <Link to="/entrar" className="text-crown-600 hover:text-crown-700">
                Entra na tua conta
              </Link>{' '}
              para votar no comparativo do dia.
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-xl font-bold text-throne-900">Histórico</h2>
          {historyLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner className="text-crown-500" />
            </div>
          ) : history.length === 0 ? (
            <EmptyState icon="🗂️" title="Sem histórico ainda" description="Os comparativos passados aparecerão aqui." />
          ) : (
            <>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-lg border border-throne-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-throne-900">
                        {item.website_a.name} vs {item.website_b.name}
                      </span>
                      <span className="text-throne-500">
                        {formatDate(item.date)} · {item.votes_a} - {item.votes_b}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrevPage}>
                    Anterior
                  </button>
                  <span className="text-sm text-throne-500">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <button className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNextPage}>
                    Seguinte
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-xl font-bold text-throne-900">Estatísticas de vitórias</h2>
          {statsLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner className="text-crown-500" />
            </div>
          ) : stats.length === 0 ? (
            <EmptyState icon="📊" title="Sem estatísticas ainda" description="As estatísticas aparecem após os primeiros resultados." />
          ) : (
            <div className="space-y-2">
              {stats.slice(0, 10).map((item) => (
                <div key={item.website_id} className="rounded-lg border border-throne-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <a href={item.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-throne-900 hover:text-crown-600">
                      {item.website_name}
                    </a>
                    <span className="text-sm text-throne-500">
                      {item.wins} vitórias · {item.losses} derrotas · {item.appearances} comparativos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ComparisonOptionCard({
  website,
  votes,
  percentage,
  selected,
  onVote,
  disabled,
}: {
  website: { id: string; name: string; url: string; logo_url: string | null; score: number };
  votes: number;
  percentage: number;
  selected: boolean;
  onVote: () => void;
  disabled: boolean;
}) {
  return (
    <article className={cn('rounded-xl border p-4', selected ? 'border-crown-400 bg-crown-50' : 'border-throne-200 bg-white')}>
      <div className="mb-3 flex items-center gap-3">
        {website.logo_url ? (
          <img src={website.logo_url} alt={`Logo de ${website.name}`} className="h-12 w-12 rounded-lg border border-throne-200 object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-crown-100 text-crown-700 font-semibold flex items-center justify-center">
            {getInitials(website.name)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-throne-900">{website.name}</h3>
          <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-xs text-throne-500 hover:text-crown-600 break-all">
            {website.url}
          </a>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-throne-600">
          <span>{votes} votos</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-throne-100 overflow-hidden">
          <div className={cn('h-full transition-all', selected ? 'bg-crown-500' : 'bg-throne-400')} style={{ width: `${percentage}%` }} />
        </div>
        <button className={cn('btn-primary w-full justify-center', disabled && 'opacity-60 cursor-not-allowed')} onClick={onVote} disabled={disabled}>
          {selected ? 'Votado' : 'Votar'}
        </button>
      </div>
    </article>
  );
}
