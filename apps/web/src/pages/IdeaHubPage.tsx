import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { useIdeas, useIdeaMutations } from '@/hooks/useIdeas';
import type { Idea } from '@/types';

function IdeaCard({ idea }: { idea: Idea }) {
  const { isAuthenticated } = useAuthStore();
  const { vote, addFeature, addComment, claim } = useIdeaMutations();
  const [feature, setFeature] = useState('');
  const [comment, setComment] = useState('');

  const score = idea.upvotes - idea.downvotes;

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

      <div className="flex items-center gap-3 text-sm text-throne-600">
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">+{idea.upvotes}</span>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">-{idea.downvotes}</span>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">Score: {score}</span>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">Features: {idea.feature_count}</span>
        <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">Comentários: {idea.comment_count}</span>
        {idea.claimed_by ? (
          <Badge variant="info">Reclamada</Badge>
        ) : (
          <button
            className="btn-secondary text-xs"
            disabled={!isAuthenticated}
            onClick={() => claim.mutate(idea.id)}
          >
            Reclamar ideia
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-primary btn-sm"
          disabled={!isAuthenticated}
          onClick={() => vote.mutate({ ideaId: idea.id, value: 1 })}
        >
          Upvote
        </button>
        <button
          className="btn-ghost btn-sm"
          disabled={!isAuthenticated}
          onClick={() => vote.mutate({ ideaId: idea.id, value: -1 })}
        >
          Downvote
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-throne-800">Adicionar funcionalidade</p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Ex: login.gov para autenticação"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              disabled={!isAuthenticated}
            />
            <button
              className="btn-primary"
              disabled={!isAuthenticated || feature.trim().length < 3}
              onClick={() => {
                addFeature.mutate({ ideaId: idea.id, description: feature }, { onSuccess: () => setFeature('') });
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-throne-800">Comentar</p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!isAuthenticated}
            />
            <button
              className="btn-secondary"
              disabled={!isAuthenticated || comment.trim().length < 3}
              onClick={() => {
                addComment.mutate({ ideaId: idea.id, content: comment }, { onSuccess: () => setComment('') });
              }}
            >
              Enviar
            </button>
          </div>
        </div>
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
        <button
          className="btn-primary"
          disabled={!isAuthenticated || title.trim().length < 3}
          onClick={() =>
            createIdea.mutate(
              { title, description },
              {
                onSuccess: () => {
                  setTitle('');
                  setDescription('');
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
