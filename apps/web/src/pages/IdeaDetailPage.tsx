import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ReportMenu } from '@/components/ui/ReportMenu';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useIdeaDetail, useIdeaMutations } from '@/hooks/useIdeas';
import { useVoteIdeaComment } from '@/hooks/useIdeaComments';
import type { IdeaComment } from '@/types';

export function IdeaDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { idea, isLoading, error } = useIdeaDetail(id);
  const { vote, voteFeature, addFeature, addComment, claim } = useIdeaMutations();
  const voteIdeaComment = useVoteIdeaComment(id);
  const [feature, setFeature] = useState('');
  const [comment, setComment] = useState('');
  const [kind, setKind] = useState('opinion');
  const [commentError, setCommentError] = useState('');

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
          <div className="flex items-center gap-2">
            <ReportMenu targetType="idea" targetId={idea.id} />
            <Badge variant={idea.status === 'approved' ? 'success' : idea.status === 'closed' ? 'warning' : 'default'}>
              {idea.status}
            </Badge>
          </div>
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

        <div className="space-y-1">
          <div className="rounded-xl border border-throne-200 bg-white">
            <textarea
              className="input min-h-[36px] border-none focus:ring-0 resize-none py-2 text-sm"
              placeholder="Escrever comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!isAuthenticated}
              maxLength={1000}
            />
            <div className="flex items-center justify-between gap-3 border-t border-throne-100 px-3 py-1.5">
              <select
                className="input h-8 w-36 text-xs"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                disabled={!isAuthenticated}
              >
                <option value="opinion">Opinião</option>
                <option value="suggestion">Sugestão</option>
                <option value="issue">Erro/bug</option>
                <option value="praise">Elogio</option>
                <option value="other">Outro</option>
              </select>
              <span className="text-[11px] text-throne-400">{comment.length}/1000</span>
              <button
                className="btn-secondary h-8 px-3 text-sm"
                disabled={!isAuthenticated || addComment.isPending}
                onClick={() => {
                  setCommentError('');
                  const content = comment.trim();
                  if (content.length < 3) {
                    setCommentError('Escreve um comentário primeiro.');
                    return;
                  }
                  addComment.mutate(
                    { ideaId: idea.id, content, kind },
                    {
                      onSuccess: () => {
                        setComment('');
                        setKind('opinion');
                      },
                      onError: (err) => setCommentError((err as Error).message),
                    },
                  );
                }}
              >
                {addComment.isPending ? 'A enviar…' : 'Enviar'}
              </button>
            </div>
          </div>
          {commentError && <p className="text-sm text-red-600">{commentError}</p>}
          {!isAuthenticated && <p className="text-sm text-throne-500">Entra para comentar e responder.</p>}
        </div>

        <div className="space-y-2">
          {idea.comments.map((item) => (
            <IdeaCommentItem
              key={item.id}
              comment={item}
              isAuthenticated={isAuthenticated}
              onVote={(commentId, value) => voteIdeaComment.mutate({ commentId, value })}
              voting={voteIdeaComment.isPending}
              onReply={async (payload) => {
                await addComment.mutateAsync({
                  ideaId: idea.id,
                  content: payload.content,
                  parentId: payload.parentId,
                  kind: payload.kind,
                });
              }}
              isSubmitting={addComment.isPending}
            />
          ))}
          {idea.comments.length === 0 && <p className="text-sm text-throne-500">Sem comentários ainda.</p>}
        </div>
      </section>
    </div>
  );
}

function IdeaCommentItem({
  comment,
  isAuthenticated,
  onVote,
  voting,
  onReply,
  isSubmitting,
}: {
  comment: IdeaComment;
  isAuthenticated: boolean;
  onVote: (commentId: string, value: -1 | 0 | 1) => void;
  voting: boolean;
  onReply: (payload: { content: string; parentId?: string | null; kind?: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-throne-200 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-crown-500 text-white flex items-center justify-center text-xs font-semibold">
          {(comment.user?.name ?? '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-throne-800">{comment.user.name}</p>
            <span className="text-xs text-throne-400">{formatDate(comment.created_at)}</span>
            {comment.kind && !comment.parent_id && (
              <span className="rounded-full bg-throne-100 px-2 py-0.5 text-[11px] font-medium text-throne-600">
                {getCommentKindLabel(comment.kind)}
              </span>
            )}
            <ReportMenu targetType="comment" targetId={comment.id} className="ml-auto" />
          </div>
          <p className="text-throne-700 leading-relaxed">{comment.content}</p>
          <div className="mt-2 flex items-center gap-3 text-sm text-throne-500">
            <div className="inline-flex items-center gap-1 rounded-full border border-throne-200 bg-throne-50 px-2 py-1">
              <button
                className={cn('text-throne-500 transition-colors', (comment.user_vote ?? 0) === 1 ? 'text-crown-600' : 'hover:text-crown-600')}
                onClick={() => onVote(comment.id, (comment.user_vote ?? 0) === 1 ? 0 : 1)}
                disabled={!isAuthenticated || voting}
              >
                ▲
              </button>
              <span className="min-w-6 text-center font-semibold text-throne-900">{comment.score}</span>
              <button
                className={cn('text-throne-500 transition-colors', (comment.user_vote ?? 0) === -1 ? 'text-red-600' : 'hover:text-red-600')}
                onClick={() => onVote(comment.id, (comment.user_vote ?? 0) === -1 ? 0 : -1)}
                disabled={!isAuthenticated || voting}
              >
                ▼
              </button>
            </div>
            {isAuthenticated && (
              <button className="link" onClick={() => setReplying((v) => !v)}>
                {replying ? 'Cancelar' : 'Responder'}
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-2 space-y-2">
              <textarea
                className="input min-h-[36px] resize-none py-2 text-sm"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Responder a este comentário..."
              />
              <div className="flex items-center gap-2">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    setError('');
                    if (!replyText.trim()) {
                      setError('Escreve uma resposta.');
                      return;
                    }
                    try {
                      await onReply({ content: replyText.trim(), parentId: comment.id });
                      setReplyText('');
                      setReplying(false);
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'A enviar…' : 'Publicar resposta'}
                </button>
                <button className="btn-ghost" onClick={() => setReplying(false)} disabled={isSubmitting}>
                  Cancelar
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-10 border-l border-throne-100 pl-4 space-y-3">
          {comment.replies.map((reply) => (
            <IdeaCommentItem
              key={reply.id}
              comment={reply}
              isAuthenticated={isAuthenticated}
              onVote={onVote}
              voting={voting}
              onReply={onReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getCommentKindLabel(kind?: string | null) {
  switch (kind) {
    case 'opinion':
      return 'Opinião';
    case 'suggestion':
      return 'Sugestão';
    case 'issue':
      return 'Erro/bug';
    case 'praise':
      return 'Elogio';
    case 'other':
      return 'Outro';
    default:
      return 'Comentário';
  }
}
