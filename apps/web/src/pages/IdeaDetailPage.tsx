import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useIdeaDetail, useIdeaMutations } from '@/hooks/useIdeas';

export function IdeaDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { idea, isLoading, error } = useIdeaDetail(id);
  const { vote, voteFeature, addFeature, addComment, claim } = useIdeaMutations();
  const [feature, setFeature] = useState('');
  const [comment, setComment] = useState('');

  if (isLoading) {
    return (
      <div className="container-app py-20 flex justify-center">
        <Spinner size="lg" className="text-crown-500" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="container-app py-12">
        <EmptyState
          icon="💡"
          title="Ideia não encontrada"
          description="A ideia que procuras não existe ou foi removida."
          action={
            <Link to="/ideias" className="btn-primary">
              Voltar às ideias
            </Link>
          }
        />
      </div>
    );
  }

  const score = idea.upvotes - idea.downvotes;
  const userVote = idea.user_vote ?? 0;

  return (
    <div className="container-app py-10 space-y-6">
      <nav className="text-sm text-throne-500">
        <Link to="/ideias" className="hover:text-crown-600">Ideias</Link> / <span className="text-throne-800">{idea.title}</span>
      </nav>

      <section className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-throne-900">{idea.title}</h1>
            {idea.description && <p className="text-throne-600 mt-2">{idea.description}</p>}
          </div>
          <Badge variant={idea.status === 'approved' ? 'success' : idea.status === 'closed' ? 'warning' : 'default'}>
            {idea.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-throne-600">
          <div className="inline-flex items-center gap-1 rounded-full border border-throne-200 bg-throne-50 px-2 py-1">
            <button
              className={cn('text-throne-500 transition-colors', userVote === 1 ? 'text-crown-600' : 'hover:text-crown-600')}
              disabled={!isAuthenticated}
              onClick={() => vote.mutate({ ideaId: idea.id, value: userVote === 1 ? 0 : 1 })}
              aria-label="Upvote"
            >
              ▲
            </button>
            <span className="min-w-6 text-center font-semibold text-throne-900">{score}</span>
            <button
              className={cn('text-throne-500 transition-colors', userVote === -1 ? 'text-red-600' : 'hover:text-red-600')}
              disabled={!isAuthenticated}
              onClick={() => vote.mutate({ ideaId: idea.id, value: userVote === -1 ? 0 : -1 })}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>
          <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">
            Criada em {formatDate(idea.created_at)}
          </span>
          <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">🧩 {idea.feature_count}</span>
          <span className="px-2 py-1 rounded-full bg-throne-100 text-throne-800">💬 {idea.comment_count}</span>
          {idea.claimed_by ? (
            <Badge variant="info">Reclamada</Badge>
          ) : (
            <button className="btn-secondary text-xs" disabled={!isAuthenticated} onClick={() => claim.mutate(idea.id)}>
              Reclamar ideia
            </button>
          )}
        </div>

      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-xl font-semibold text-throne-900">Features sugeridas</h2>

        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Adicionar nova feature..."
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            disabled={!isAuthenticated}
          />
          <button
            className="btn-primary"
            disabled={!isAuthenticated || feature.trim().length < 3}
            onClick={() => addFeature.mutate({ ideaId: idea.id, description: feature }, { onSuccess: () => setFeature('') })}
          >
            Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {idea.features.map((item) => (
            <div key={item.id} className="rounded-lg border border-throne-200 px-3 py-2 flex items-center justify-between gap-2">
              <div className="text-sm text-throne-800">{item.description}</div>
              <div className="flex items-center gap-2 text-throne-700">
                <button
                  className={cn('text-throne-500 transition-colors', item.user_vote === 1 ? 'text-crown-600' : 'hover:text-crown-600')}
                  disabled={!isAuthenticated}
                  onClick={() =>
                    voteFeature.mutate({
                      ideaId: idea.id,
                      featureId: item.id,
                      value: item.user_vote === 1 ? 0 : 1,
                    })
                  }
                  aria-label="Upvote feature"
                >
                  ▲
                </button>
                <span className="min-w-6 text-center text-sm font-semibold text-throne-900">{item.score ?? 0}</span>
                <button
                  className={cn('text-throne-500 transition-colors', item.user_vote === -1 ? 'text-red-600' : 'hover:text-red-600')}
                  disabled={!isAuthenticated}
                  onClick={() =>
                    voteFeature.mutate({
                      ideaId: idea.id,
                      featureId: item.id,
                      value: item.user_vote === -1 ? 0 : -1,
                    })
                  }
                  aria-label="Downvote feature"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
          {idea.features.length === 0 && <p className="text-sm text-throne-500">Sem features ainda.</p>}
        </div>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-xl font-semibold text-throne-900">Comentários</h2>

        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Adicionar comentário..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!isAuthenticated}
          />
          <button
            className="btn-secondary"
            disabled={!isAuthenticated || comment.trim().length < 3}
            onClick={() => addComment.mutate({ ideaId: idea.id, content: comment }, { onSuccess: () => setComment('') })}
          >
            Enviar
          </button>
        </div>

        <div className="space-y-2">
          {idea.comments.map((item) => (
            <div key={item.id} className="rounded-lg border border-throne-200 px-3 py-2">
              <div className="text-sm text-throne-800">{item.content}</div>
              <div className="text-xs text-throne-500 mt-1">
                {item.user_name} · {formatDate(item.created_at)}
              </div>
            </div>
          ))}
          {idea.comments.length === 0 && <p className="text-sm text-throne-500">Sem comentários ainda.</p>}
        </div>
      </section>
    </div>
  );
}
