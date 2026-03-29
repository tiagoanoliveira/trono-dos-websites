import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { useIdeas, useIdeaMutations } from '@/hooks/useIdeas';
import type { Idea } from '@/types';

function IdeaCard({ idea }: { idea: Idea }) {
  const { isAuthenticated } = useAuthStore();
  const { vote, claim } = useIdeaMutations();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const score = idea.upvotes - idea.downvotes;
  const userVote = idea.user_vote ?? 0;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-throne-900">{idea.title}</h3>
          <p className="text-sm text-throne-600">{idea.description}</p>
        </div>
        <Badge variant={idea.status === 'approved' ? 'success' : idea.status === 'closed' ? 'warning' : 'default'}>
          {idea.status}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-sm text-throne-600 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-full border border-throne-200 bg-throne-50 px-2 py-1">
          <button
            className={cn('text-throne-500 transition-colors', userVote === 1 ? 'text-crown-600' : 'hover:text-crown-600')}
            disabled={!isAuthenticated}
            onClick={() => vote.mutate({ ideaId: idea.id, value: userVote === 1 ? 0 : 1 })}
            aria-label="Upvote"
            title={!isAuthenticated ? 'Entra para votar' : 'Upvote'}
          >
            ▲
          </button>
          <span className="min-w-6 text-center font-semibold text-throne-900">{score}</span>
          <button
            className={cn('text-throne-500 transition-colors', userVote === -1 ? 'text-red-600' : 'hover:text-red-600')}
            disabled={!isAuthenticated}
            onClick={() => vote.mutate({ ideaId: idea.id, value: userVote === -1 ? 0 : -1 })}
            aria-label="Downvote"
            title={!isAuthenticated ? 'Entra para votar' : 'Downvote'}
          >
            ▼
          </button>
        </div>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">🧩 {idea.feature_count}</span>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">💬 {idea.comment_count}</span>
        <div className="flex items-center gap-2">
          <input
            className="input h-8 w-44 text-xs"
            placeholder="URL do site"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={!isAuthenticated}
          />
          <input
            className="input h-8 w-32 text-xs"
            placeholder="Categoria ID"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!isAuthenticated}
          />
          <button
            className="btn-secondary text-xs"
            disabled={!isAuthenticated || websiteUrl.trim().length < 8 || categoryId.trim().length < 2}
            onClick={() =>
              claim.mutate({
                ideaId: idea.id,
                website_url: websiteUrl.trim(),
                category_id: categoryId.trim(),
                website_name: idea.title,
                description: idea.description ?? undefined,
              })
            }
          >
            Reclamar ideia
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link to={`/ideias/${idea.id}`} className="btn-secondary btn-sm">
          Ver detalhes
        </Link>
      </div>
    </div>
  );
}

export function IdeaHubPage() {
  const { isAuthenticated } = useAuthStore();
  const { ideas, isLoading, error } = useIdeas();
  const { createIdea } = useIdeaMutations();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');

  return (
    <div className="container-app py-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-throne-900">Ideias da Comunidade</h1>
          <p className="text-throne-600 max-w-2xl">
            Propõe ideias de sites para a comunidade construir. Vota, sugere funcionalidades e reclama uma ideia quando a implementares.
          </p>
        </div>
        {!isAuthenticated && (
          <Link to="/entrar" className="btn-primary">
            Entrar para participar
          </Link>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-xl font-semibold text-throne-900">Submeter nova ideia</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="label">Descrição</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="label">Features iniciais (uma por linha)</label>
          <textarea
            className="input min-h-24"
            placeholder={'Ex: Comparador de alojamento por distrito;'}
            value={featuresInput}
            onChange={(e) => setFeaturesInput(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          disabled={!isAuthenticated || title.trim().length < 3}
          onClick={() =>
            createIdea.mutate(
              {
                title,
                description,
                features: featuresInput
                  .split('\n')
                  .map((f) => f.trim())
                  .filter((f) => f.length >= 3),
              },
              {
                onSuccess: () => {
                  setTitle('');
                  setDescription('');
                  setFeaturesInput('');
                },
              },
            )
          }
        >
          Submeter ideia
        </button>
        {!isAuthenticated && <p className="text-sm text-throne-500">Entra para submeter uma ideia.</p>}
      </div>

      {isLoading && <p className="text-throne-500">A carregar ideias…</p>}
      {error && <p className="text-red-600">Erro: {(error as Error).message}</p>}

      <div className="space-y-4">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
        {!isLoading && ideas.length === 0 && (
          <p className="text-throne-500">Ainda não há ideias. Sê o primeiro a propor!</p>
        )}
      </div>
    </div>
  );
}
