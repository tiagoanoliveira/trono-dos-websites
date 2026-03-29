import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, getInitials } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryCard } from '@/components/features/CategoryCard';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { useCategories } from '@/hooks/useCategories';
import { useWebsites } from '@/hooks/useWebsites';
import { useTodayComparison, useVoteComparison } from '@/hooks/useComparisons';
import { useAuthStore } from '@/stores/authStore';
import { useIdeas } from '@/hooks/useIdeas';
import type { Category } from '@/types';

export function HomePage() {
  const categoriesRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { websites: featuredWebsites, isLoading: featuredLoading } = useWebsites({
    sort: 'featured',
    perPage: 6,
  });
  const { websites: recentWebsites, isLoading: recentLoading } = useWebsites({
    sort: 'recent',
    perPage: 4,
  });
  const { ideas } = useIdeas();
  const { comparison, isLoading: comparisonLoading } = useTodayComparison();
  const voteComparison = useVoteComparison();

  const totalWebsites = categories.reduce((sum, c) => sum + (c.websiteCount ?? 0), 0);
  const totalCategories = countAllCategories(categories);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const scrollToCategories = () => {
    categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-crown-50 to-white border-b border-throne-100">
        <div className="container-app py-10 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-throne-900 mb-3 leading-tight">
            <span>
              <span>Trono dos</span>{' '}
              <span className="text-crown-500">Websites</span>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-throne-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Descobre as melhores ferramentas para portugueses. Avalia, comenta e partilha os teus
            favoritos.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-throne-400" />
              <input
                type="search"
                placeholder="Pesquisar websites, ferramentas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12 py-3 text-base shadow-sm"
              />
            </div>
          </form>

          {/* CTAs */}
          <div className="flex flex-row items-center justify-center gap-3">
            <button onClick={scrollToCategories} className="btn-primary px-3 py-2 text-sm">
              <GridIcon className="h-4 w-4" />
              Explorar Categorias
            </button>
            <Link to="/propor" className="btn-secondary px-3 py-2 text-sm">
              <PlusIcon className="h-4 w-4" />
              Propor Website
            </Link>
          </div>
        </div>
      </section>

      {/* Daily comparison battle */}
      <section className="border-b border-throne-100 bg-white">
        <div className="container-app py-8">
          <SectionHeader
            title="Batalha do Dia"
            subtitle="Escolhe o teu favorito"
            emoji="⚔️"
          />

          {comparisonLoading ? (
            <div className="card h-32 animate-pulse bg-throne-100" />
          ) : !comparison ? (
            <EmptyState
              icon="⚖️"
              title="Comparativo indisponível"
              description="O comparativo diário será publicado em breve."
            />
          ) : (
            <div className="card p-4">
              <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                <BattleSite
                  name={comparison.website_a.name}
                  logoUrl={comparison.website_a.logo_url}
                  score={comparison.votes_a}
                  selected={comparison.user_vote === comparison.website_a.id}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="text-center text-throne-500 font-bold">VS</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={cn('btn-primary btn-sm', voteComparison.isPending && 'opacity-60 cursor-not-allowed')}
                      onClick={() =>
                        isAuthenticated
                          ? voteComparison.mutate({ comparisonId: comparison.id, votedFor: comparison.website_a.id })
                          : navigate('/entrar')
                      }
                      disabled={voteComparison.isPending}
                    >
                      ← Votar
                    </button>
                    <button
                      className={cn('btn-primary btn-sm', voteComparison.isPending && 'opacity-60 cursor-not-allowed')}
                      onClick={() =>
                        isAuthenticated
                          ? voteComparison.mutate({ comparisonId: comparison.id, votedFor: comparison.website_b.id })
                          : navigate('/entrar')
                      }
                      disabled={voteComparison.isPending}
                    >
                      Votar →
                    </button>
                  </div>
                </div>
                <BattleSite
                  name={comparison.website_b.name}
                  logoUrl={comparison.website_b.logo_url}
                  score={comparison.votes_b}
                  selected={comparison.user_vote === comparison.website_b.id}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-throne-100 bg-white">
        <div className="container-app py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat icon="📂" value={String(totalCategories)} label="categorias" />
            <Stat icon="🌐" value={String(totalWebsites)} label="websites" />
            <Stat icon="💡" value={String(ideas.length)} label="ideias" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section ref={categoriesRef} id="categorias" className="py-8">
        <div className="container-app">
          <SectionHeader
            title="Categorias"
            subtitle="Explora por área de interesse"
            emoji="📂"
          />

          {categoriesLoading ? (
            <LoadingGrid />
          ) : categoriesError ? (
            <EmptyState
              icon="😕"
              title="Erro ao carregar categorias"
              description="Não foi possível carregar as categorias. Tenta novamente."
            />
          ) : categories.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Sem categorias ainda"
              description="As categorias aparecerão aqui em breve."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured websites */}
      <section className="py-8 bg-throne-50">
        <div className="container-app">
          <SectionHeader
            title="Em Destaque"
            subtitle="Os websites mais recomendados pela comunidade"
            emoji="⭐"
          />

          {featuredLoading ? (
            <LoadingGrid cols={3} />
          ) : featuredWebsites.length === 0 ? (
            <EmptyState icon="🌟" title="Sem destaques ainda" description="Em breve aqui." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredWebsites.map((site) => (
                <WebsiteCard key={site.id} website={site} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent additions */}
      <section className="py-8">
        <div className="container-app">
          <SectionHeader
            title="Adicionados Recentemente"
            subtitle="Os últimos websites descobertos pela comunidade"
            emoji="🆕"
          />

          {recentLoading ? (
            <LoadingGrid cols={2} />
          ) : recentWebsites.length === 0 ? (
            <EmptyState icon="📭" title="Sem adições recentes" description="Em breve aqui." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentWebsites.map((site) => (
                <WebsiteCard key={site.id} website={site} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BattleSite({
  name,
  logoUrl,
  score,
  selected,
}: {
  name: string;
  logoUrl: string | null;
  score: number;
  selected: boolean;
}) {
  return (
    <div className={cn('rounded-xl border p-3', selected ? 'border-crown-400 bg-crown-50' : 'border-throne-200')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo de ${name}`} className="h-10 w-10 rounded-lg object-cover border border-throne-200" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-crown-100 text-crown-700 font-semibold flex items-center justify-center">
              {getInitials(name)}
            </div>
          )}
          <div className="truncate font-medium text-throne-900">{name}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-throne-500">Votos: {score}</div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl sm:text-2xl font-bold text-throne-900">{value}</span>
      <span className="text-xs sm:text-sm text-throne-500">{label}</span>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  emoji,
}: {
  title: string;
  subtitle: string;
  emoji: string;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-throne-900 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      <p className="mt-1 text-throne-500">{subtitle}</p>
    </div>
  );
}

function LoadingGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 2 && 'sm:grid-cols-2',
        cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      )}
    >
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="card h-40 animate-pulse bg-throne-100" />
      ))}
    </div>
  );
}

function countAllCategories(items: Category[]): number {
  return items.reduce((sum, item) => sum + 1 + countAllCategories(item.children ?? []), 0);
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
