import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { EmptyState } from '@/components/ui/EmptyState';
import { WebsiteCard } from '@/components/features/WebsiteCard';
import { useWebsiteById, useWebsites } from '@/hooks/useWebsites';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { Comment, Website } from '@/types';
import { useComments, useAddComment } from '@/hooks/useComments';

export function WebsitePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { website, isLoading, error } = useWebsiteById(id);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userRating, setUserRating] = useState<number>(website?.user_rating ?? 0);

  const { comments, isLoading: commentsLoading } = useComments(id);
  const addCommentMutation = useAddComment(id);

  const { websites: relatedWebsites, isLoading: relatedLoading } = useWebsites({
    category_id: website?.category_id,
    perPage: 3,
  });

  useEffect(() => {
    setUserRating(website?.user_rating ?? 0);
  }, [website?.user_rating]);

  const ratingMutation = useMutation({
    mutationFn: async (score: number) => {
      const res = await api.post<{ avg_rating: number; rating_count: number; user_rating?: number | null }>(
        `/websites/${id}/ratings`,
        { score },
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao guardar avaliação');
      }
      return { ...res.data, score };
    },
    onSuccess: (data) => {
      setUserRating(data.user_rating ?? data.score);
      queryClient.setQueryData<Website | undefined>(['websites', id], (prev) =>
        prev
          ? {
              ...prev,
              avg_rating: data.avg_rating,
              rating_count: data.rating_count,
              user_rating: data.user_rating ?? data.score,
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

        <RatingSection
          avgRating={website.avg_rating ?? 0}
          ratingCount={website.rating_count ?? 0}
          userRating={userRating}
          isAuthenticated={isAuthenticated}
          isSubmitting={ratingMutation.isPending}
          onRate={(score) => ratingMutation.mutate(score)}
          onRequireLogin={() => navigate('/entrar')}
        />

        <CommentsSection
          comments={comments}
          isLoading={commentsLoading}
          totalComments={totalComments}
          isAuthenticated={isAuthenticated}
          onLogin={() => navigate('/entrar')}
          onSubmit={async (payload) => addCommentMutation.mutateAsync(payload)}
          isSubmitting={addCommentMutation.isPending}
          errorMessage={addCommentMutation.error instanceof Error ? addCommentMutation.error.message : ''}
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

function RatingSection({
  avgRating,
  ratingCount,
  userRating,
  isAuthenticated,
  isSubmitting,
  onRate,
  onRequireLogin,
}: {
  avgRating: number;
  ratingCount: number;
  userRating: number;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onRate: (score: number) => void;
  onRequireLogin: () => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displaySelected = hovered ?? userRating;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-throne-800 flex items-center gap-2">
            <span>⭐</span> Avaliações
          </h2>
          <p className="text-sm text-throne-500">
            {ratingCount > 0 ? `Média baseada em ${ratingCount} avaliação${ratingCount > 1 ? 's' : ''}.` : 'Sê o primeiro a avaliar este website.'}
          </p>
        </div>
        <StarRating score={avgRating ?? 0} count={ratingCount} size="md" />
      </div>

      {isAuthenticated ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="p-1"
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(null)}
                onClick={() => onRate(value)}
                disabled={isSubmitting}
                aria-label={`Avaliar com ${value} estrelas`}
              >
                <StarSelectableIcon filled={value <= displaySelected} />
              </button>
            ))}
          </div>
          <p className="text-sm text-throne-600">
            {userRating > 0 ? `A tua avaliação: ${userRating}/5` : 'Escolhe uma classificação para partilhares a tua opinião.'}
          </p>
          {isSubmitting && <p className="text-xs text-throne-400">A guardar avaliação…</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-throne-600">
          <span>Inicia sessão para avaliar este website.</span>
          <button className="btn-secondary px-3 py-1" onClick={onRequireLogin}>
            Entrar
          </button>
        </div>
      )}
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
}: {
  comments: Comment[];
  isLoading: boolean;
  totalComments: number;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSubmit: (payload: { content: string; parentId?: string | null }) => Promise<unknown>;
  isSubmitting: boolean;
  errorMessage?: string;
}) {
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async () => {
    setFormError('');
    setSuccessMsg('');
    if (!content.trim()) {
      setFormError('Escreve um comentário primeiro.');
      return;
    }
    try {
      await onSubmit({ content: content.trim() });
      setContent('');
      setSuccessMsg('Comentário publicado!');
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

      {isAuthenticated ? (
        <div className="space-y-2">
          <label className="label">Partilha a tua opinião</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Escreve algo útil para a comunidade..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
          />
          <div className="flex items-center gap-3">
            <button
              className={cn('btn-primary', isSubmitting && 'opacity-60 cursor-not-allowed')}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A enviar…' : 'Publicar comentário'}
            </button>
            <span className="text-xs text-throne-400">{content.length}/1000</span>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {errorMessage && !formError && <p className="text-sm text-red-600">{errorMessage}</p>}
          {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-throne-600">
          <span>Inicia sessão para participar na conversa.</span>
          <button className="btn-secondary px-3 py-1" onClick={onLogin}>
            Entrar
          </button>
        </div>
      )}

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
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isAuthenticated,
  onLogin,
  onSubmit,
  isSubmitting,
}: {
  comment: Comment;
  isAuthenticated: boolean;
  onLogin: () => void;
  onSubmit: (payload: { content: string; parentId?: string | null }) => Promise<unknown>;
  isSubmitting: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');

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
          </div>
          <p className="text-throne-700 leading-relaxed">{comment.content}</p>
          <div className="mt-2 flex items-center gap-3 text-sm text-throne-500">
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
                className="input min-h-[80px]"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AvatarBubble({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover border border-throne-200" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-crown-500 text-white flex items-center justify-center font-semibold">
      {initials}
    </div>
  );
}

function StarSelectableIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={filled ? 'h-6 w-6 text-crown-500' : 'h-6 w-6 text-throne-300'}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
