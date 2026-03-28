import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { useWebsiteById, useWebsites } from '@/hooks/useWebsites';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { Comment, Website } from '@/types';
import { useComments, useAddComment, useVoteComment } from '@/hooks/useComments';

export function WebsitePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { website, isLoading, error } = useWebsiteById(id);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userVote, setUserVote] = useState<number>(0);

  const { comments, isLoading: commentsLoading } = useComments(id);
  const addCommentMutation = useAddComment(id);
  const voteCommentMutation = useVoteComment(id);

  const { websites: relatedWebsites, isLoading: relatedLoading } = useWebsites({
    category_id: website?.category_id,
    perPage: 3,
  });

  useEffect(() => {
    setUserVote(website?.user_vote ?? 0);
  }, [website?.user_vote]);

  const metadata = website?.metadata ?? null;
  const launchLabel = formatLaunchDate(metadata?.launch_date, metadata?.launch_precision);
  const languagesLabel = metadata?.languages?.join(', ');
  const isOpenSource = metadata?.is_open_source;
  const sourceUrl = metadata?.source_url;
  const images = metadata?.images;
  const canSeeBreakdown =
    user?.role === 'admin' || (!!website?.submitted_by && website.submitted_by === user?.id);

  const voteMutation = useMutation({
    mutationFn: async (value: -1 | 0 | 1) => {
      const res = await api.post<{ upvotes: number; downvotes: number; score: number; user_vote?: number | null }>(
        `/websites/${id}/votes`,
        { value },
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao guardar voto');
      }
      return res.data;
    },
    onSuccess: (data) => {
      setUserVote(data.user_vote ?? 0);
      queryClient.setQueryData<Website | undefined>(['websites', id], (prev) =>
        prev
          ? {
              ...prev,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              score: data.score,
              user_vote: data.user_vote ?? 0,
            }
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
  });

  const totalComments = useMemo(() => countComments(comments), [comments]);

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

              {/* Score & quick vote */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-throne-50 px-3 py-2 text-sm text-throne-700">
                  <span className="font-semibold text-throne-900">{website.score ?? 0}</span>
                  {canSeeBreakdown && (
                    <span className="text-throne-400">
                      {website.upvotes ?? 0} ↑ · {website.downvotes ?? 0} ↓
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={cn(
                      'btn-secondary h-9 px-3',
                      userVote === 1 && 'border-crown-500 text-crown-700',
                      voteMutation.isPending && 'opacity-60 cursor-not-allowed',
                    )}
                    onClick={() => (isAuthenticated ? voteMutation.mutate(userVote === 1 ? 0 : 1) : navigate('/entrar'))}
                    disabled={voteMutation.isPending}
                  >
                    ▲ Up
                  </button>
                  <button
                    className={cn(
                      'btn-secondary h-9 px-3',
                      userVote === -1 && 'border-red-200 text-red-700',
                      voteMutation.isPending && 'opacity-60 cursor-not-allowed',
                    )}
                    onClick={() =>
                      isAuthenticated ? voteMutation.mutate(userVote === -1 ? 0 : -1) : navigate('/entrar')
                    }
                    disabled={voteMutation.isPending}
                  >
                    ▼ Down
                  </button>
                  {!isAuthenticated && (
                    <button className="text-sm text-crown-600 hover:text-crown-700" onClick={() => navigate('/entrar')}>
                      Entrar para votar
                    </button>
                  )}
                </div>
                {isAuthenticated && userVote === 0 && (
                  <p className="text-xs text-throne-500">Ainda não votaste. Escolhe ↑ ou ↓ para ajudar a comunidade.</p>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-throne-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Adicionado a {formatDate(website.created_at)}
                </span>
                {metadata?.author && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-4 w-4" />
                    {metadata?.author}
                  </span>
                )}
                {launchLabel && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Lançado: {launchLabel}
                  </span>
                )}
                {languagesLabel && (
                  <span className="flex items-center gap-1">
                    <CodeIcon className="h-4 w-4" />
                    {languagesLabel}
                  </span>
                )}
                {isOpenSource !== undefined && (
                  <span className="flex items-center gap-1">
                    <GithubIcon className="h-4 w-4" />
                    {isOpenSource ? (
                      sourceUrl ? (
                        <a
                          href={sourceUrl}
                          className="text-crown-600 hover:text-crown-700"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Código aberto
                        </a>
                      ) : (
                        'Código aberto'
                      )
                    ) : (
                      'Código fechado'
                    )}
                  </span>
                )}
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

        {images && images.length > 0 && (
          <div className="card p-4 space-y-3">
            <h3 className="text-lg font-semibold text-throne-900">Fotos do projeto</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((img, idx) => (
                <img
                  key={`${img}-${idx}`}
                  src={img}
                  alt={`Imagem ${idx + 1} de ${website.name}`}
                  className="w-full rounded-lg border border-throne-100 object-cover"
                />
              ))}
            </div>
          </div>
        )}

        <CommentsSection
          comments={comments}
          isLoading={commentsLoading}
          totalComments={totalComments}
          isAuthenticated={isAuthenticated}
          onLogin={() => navigate('/entrar')}
          onSubmit={async (payload) => addCommentMutation.mutateAsync(payload)}
          isSubmitting={addCommentMutation.isPending}
          errorMessage={addCommentMutation.error instanceof Error ? addCommentMutation.error.message : ''}
          onVote={(commentId, value) => voteCommentMutation.mutate({ commentId, value })}
          voting={voteCommentMutation.isPending}
          canSeeBreakdown={canSeeBreakdown}
        />

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

function CommentsSection({
  comments,
  isLoading,
  totalComments,
  isAuthenticated,
  onLogin,
  onSubmit,
  isSubmitting,
  errorMessage,
  onVote,
  voting,
  canSeeBreakdown,
}: {
  comments: Comment[];
  isLoading: boolean;
  totalComments: number;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSubmit: (payload: { content: string; parentId?: string | null; kind?: string }) => Promise<unknown>;
  isSubmitting: boolean;
  errorMessage?: string;
  onVote: (commentId: string, value: -1 | 0 | 1) => void;
  voting: boolean;
  canSeeBreakdown: boolean;
}) {
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async () => {
    setFormError('');
    if (!content.trim()) {
      setFormError('Escreve um comentário primeiro.');
      return;
    }
    try {
      await onSubmit({ content: content.trim(), kind: 'general' });
      setContent('');
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível publicar o comentário.');
    }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-throne-800 flex items-center gap-2">
            <span>💬</span> Comentários
          </h2>
          <p className="text-sm text-throne-500">
            {totalComments > 0 ? `${totalComments} comentário${totalComments > 1 ? 's' : ''}` : 'Ainda sem comentários.'}
          </p>
        </div>
      </div>

      <div className="border-t border-throne-100 pt-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Sê o primeiro a comentar"
            description="Partilha feedback ou dicas sobre este website."
          />
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isAuthenticated={isAuthenticated}
              onLogin={onLogin}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              onVote={onVote}
              voting={voting}
              canSeeBreakdown={canSeeBreakdown}
            />
          ))
        )}
      </div>

      {isAuthenticated ? (
        <div className="space-y-1 border-t border-throne-100 pt-3">
          <div className="rounded-xl border border-throne-200 bg-white">
            <textarea
              ref={textareaRef}
              className="input min-h-[36px] border-none focus:ring-0 resize-none py-2 text-sm"
              placeholder="Escrever comentário..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                const el = textareaRef.current;
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }
              }}
              maxLength={1000}
            />
            <div className="flex items-center justify-between gap-3 border-t border-throne-100 px-3 py-1.5">
              <span className="text-[11px] text-throne-400">{content.length}/1000</span>
              <button
                className={cn('btn-primary h-8 px-3 text-sm', isSubmitting && 'opacity-60 cursor-not-allowed')}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'A enviar…' : 'Enviar'}
              </button>
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {errorMessage && !formError && <p className="text-sm text-red-600">{errorMessage}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-throne-600 border-t border-throne-100 pt-3">
          <span>Inicia sessão para participar na conversa.</span>
          <button className="btn-secondary px-3 py-1" onClick={onLogin}>
            Entrar
          </button>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isAuthenticated,
  onLogin,
  onSubmit,
  isSubmitting,
  onVote,
  voting,
  canSeeBreakdown,
}: {
  comment: Comment;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSubmit: (payload: { content: string; parentId?: string | null; kind?: string }) => Promise<unknown>;
  isSubmitting: boolean;
  onVote: (commentId: string, value: -1 | 0 | 1) => void;
  voting: boolean;
  canSeeBreakdown: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  const handleReply = async () => {
    setError('');
    if (!replyText.trim()) {
      setError('Escreve uma resposta.');
      return;
    }
    try {
      await onSubmit({ content: replyText.trim(), parentId: comment.id });
      setReplyText('');
      setReplying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a resposta.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <AvatarBubble name={comment.user.name} avatarUrl={comment.user.avatar_url} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-throne-800">{comment.user.name}</p>
            <span className="text-xs text-throne-400">{formatDate(comment.created_at)}</span>
            {comment.kind && (
              <span className="rounded-full bg-throne-100 px-2 py-0.5 text-[11px] font-medium text-throne-600">
                {getCommentKindLabel(comment.kind)}
              </span>
            )}
          </div>
          <p className="text-throne-700 leading-relaxed">{comment.content}</p>
          <div className="mt-2 flex items-center gap-3 text-sm text-throne-500 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-throne-50 px-2 py-1 text-xs text-throne-600">
                <span className="font-semibold text-throne-900">{comment.score}</span>
                {canSeeBreakdown && (
                  <span className="text-throne-400">
                    {comment.upvotes} ↑ · {comment.downvotes} ↓
                  </span>
                )}
              </span>
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-throne-200 px-2 py-1',
                  (comment.user_vote ?? 0) === 1 && 'border-crown-400 text-crown-700',
                  voting && 'opacity-60 cursor-not-allowed',
                )}
                onClick={() =>
                  isAuthenticated ? onVote(comment.id, (comment.user_vote ?? 0) === 1 ? 0 : 1) : onLogin()
                }
                disabled={voting}
              >
                ▲
              </button>
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-throne-200 px-2 py-1',
                  (comment.user_vote ?? 0) === -1 && 'border-red-200 text-red-700',
                  voting && 'opacity-60 cursor-not-allowed',
                )}
                onClick={() =>
                  isAuthenticated ? onVote(comment.id, (comment.user_vote ?? 0) === -1 ? 0 : -1) : onLogin()
                }
                disabled={voting}
              >
                ▼
              </button>
            </div>
            {isAuthenticated ? (
              <button className="link" onClick={() => setReplying((v) => !v)}>
                {replying ? 'Cancelar' : 'Responder'}
              </button>
            ) : (
              <button className="link" onClick={onLogin}>
                Entrar para responder
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-2 space-y-2">
              <textarea
                ref={replyRef}
                className="input min-h-[36px] resize-none py-2 text-sm"
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  const el = replyRef.current;
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                  }
                }}
                placeholder="Responder a este comentário..."
              />
              <div className="flex items-center gap-2">
                <button
                  className={cn('btn-primary', isSubmitting && 'opacity-60 cursor-not-allowed')}
                  onClick={handleReply}
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
              <CommentItem
                key={reply.id}
                comment={reply}
                isAuthenticated={isAuthenticated}
                onLogin={onLogin}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                onVote={onVote}
                voting={voting}
                canSeeBreakdown={canSeeBreakdown}
              />
            ))}
          </div>
        )}
    </div>
  );
}

function AvatarBubble({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = getInitials(name);
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover border border-throne-200" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-crown-500 text-white flex items-center justify-center font-semibold">
      {initials}
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" />
    </svg>
  );
}

function countComments(list: Comment[]): number {
  return list.reduce((acc, comment) => acc + 1 + countComments(comment.replies ?? []), 0);
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
