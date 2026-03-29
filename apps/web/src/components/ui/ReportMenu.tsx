import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { WebsiteMetadata } from '@/types';

type ReportTargetType = 'website' | 'comment' | 'idea' | 'idea_feature';
const REASONS = ['Spam', 'Ofensivo', 'Fraude', 'Conteúdo impróprio', 'Outro'];

export function ReportMenu({
  targetType,
  targetId,
  websiteName,
  websiteUrl,
  websiteDescription,
  websiteCategoryName,
  websiteLogoUrl,
  websiteScreenshotUrl,
  websiteMetadata,
  className = '',
}: {
  targetType: ReportTargetType;
  targetId: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteDescription?: string | null;
  websiteCategoryName?: string;
  websiteLogoUrl?: string | null;
  websiteScreenshotUrl?: string | null;
  websiteMetadata?: WebsiteMetadata | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [suggestName, setSuggestName] = useState(websiteName ?? '');
  const [suggestUrl, setSuggestUrl] = useState(websiteUrl ?? '');
  const [suggestDescription, setSuggestDescription] = useState(websiteDescription ?? '');
  const [suggestCategory, setSuggestCategory] = useState(websiteCategoryName ?? '');
  const [suggestAuthor, setSuggestAuthor] = useState(websiteMetadata?.author ?? '');
  const [suggestLaunchDate, setSuggestLaunchDate] = useState(websiteMetadata?.launch_date ?? '');
  const [suggestLaunchPrecision, setSuggestLaunchPrecision] = useState<NonNullable<WebsiteMetadata['launch_precision']>>(
    websiteMetadata?.launch_precision ?? 'unknown',
  );
  const [suggestLanguages, setSuggestLanguages] = useState((websiteMetadata?.languages ?? []).join(', '));
  const [suggestOpenSource, setSuggestOpenSource] = useState(Boolean(websiteMetadata?.is_open_source));
  const [suggestSourceUrl, setSuggestSourceUrl] = useState(websiteMetadata?.source_url ?? '');
  const [suggestLogoUrl, setSuggestLogoUrl] = useState(websiteLogoUrl ?? '');
  const [suggestScreenshotUrl, setSuggestScreenshotUrl] = useState(websiteScreenshotUrl ?? '');
  const [suggestImages, setSuggestImages] = useState((websiteMetadata?.images ?? []).join('\n'));
  const [suggestOtherDetails, setSuggestOtherDetails] = useState('');
  const [formError, setFormError] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (showModal || showSuggestModal) {
      setOpen(false);
    }
  }, [showModal, showSuggestModal]);

  const submitReport = async () => {
    setFormError('');
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setFormError('Indica um motivo válido.');
      return;
    }

    setOpen(false);
    setFeedback('');

    setIsSubmitting(true);
    try {
      const res = await api.post<{ id: string }>('/reports', {
        target_type: targetType,
        target_id: targetId,
        reason: normalizedReason,
        description: description.trim() || undefined,
      });
      if (!res.success) {
        setFeedback(res.error?.message ?? 'Não foi possível enviar denúncia.');
      } else {
        setShowModal(false);
        setReason('');
        setDescription('');
        setFeedback('Denúncia enviada.');
      }
    } catch {
      setFeedback('Não foi possível enviar denúncia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSuggestion = async () => {
    setFormError('');
    if (targetType !== 'website') return;

    const nextName = suggestName.trim();
    const nextUrl = suggestUrl.trim();
    const nextDescription = suggestDescription.trim();
    const nextLanguages = suggestLanguages
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const nextImages = suggestImages
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const payload = {
      name: nextName,
      url: nextUrl,
      description: nextDescription || null,
      category_name: suggestCategory.trim() || null,
      logo_url: suggestLogoUrl.trim() || null,
      screenshot_url: suggestScreenshotUrl.trim() || null,
      metadata: {
        author: suggestAuthor.trim() || null,
        launch_date: suggestLaunchDate.trim() || null,
        launch_precision: suggestLaunchPrecision,
        languages: nextLanguages,
        images: nextImages,
        is_open_source: suggestOpenSource,
        source_url: suggestSourceUrl.trim() || null,
        other_details: suggestOtherDetails.trim() || null,
      },
    };
    const originalPayload = {
      name: websiteName ?? '',
      url: websiteUrl ?? '',
      description: websiteDescription?.trim() || null,
      category_name: websiteCategoryName ?? null,
      logo_url: websiteLogoUrl?.trim() || null,
      screenshot_url: websiteScreenshotUrl?.trim() || null,
      metadata: {
        author: websiteMetadata?.author ?? null,
        launch_date: websiteMetadata?.launch_date ?? null,
        launch_precision: websiteMetadata?.launch_precision ?? 'unknown',
        languages: websiteMetadata?.languages ?? [],
        images: websiteMetadata?.images ?? [],
        is_open_source: Boolean(websiteMetadata?.is_open_source),
        source_url: websiteMetadata?.source_url ?? null,
        other_details: null,
      },
    };

    if (!nextName || !nextUrl) {
      setFormError('Nome e URL são obrigatórios.');
      return;
    }
    if (JSON.stringify(payload) === JSON.stringify(originalPayload)) {
      setFormError('Faz pelo menos uma alteração antes de enviar.');
      return;
    }

    setOpen(false);
    setFeedback('');
    setIsSubmitting(true);

    try {
      const res = await api.post<{ id: string }>('/reports', {
        target_type: 'website',
        target_id: targetId,
        reason: 'Proposta de alteração',
        description: JSON.stringify(payload),
      });

      if (!res.success) {
        setFeedback(res.error?.message ?? 'Não foi possível enviar proposta.');
      } else {
        setShowSuggestModal(false);
        setFeedback('Proposta enviada para moderação.');
      }
    } catch {
      setFeedback('Não foi possível enviar proposta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="btn-ghost h-8 w-8 p-0 text-throne-500"
        aria-label="Mais opções"
        onClick={() => setOpen((v) => !v)}
        disabled={isSubmitting}
      >
        ⋯
      </button>
      {open && (
        <div className="absolute left-0 right-auto sm:left-auto sm:right-0 z-30 mt-1 min-w-44 rounded-md border border-throne-200 bg-white p-1 shadow-lg">
          {targetType === 'website' && (
            <button
              type="button"
              className="w-full rounded px-2 py-1.5 text-left text-sm text-throne-700 hover:bg-throne-50"
              onClick={() => {
                setOpen(false);
                if (!isAuthenticated) {
                  setFeedback('Entra para propor alterações.');
                  navigate('/entrar');
                  return;
                }
                setShowSuggestModal(true);
              }}
              disabled={isSubmitting}
            >
              Propor alteração
            </button>
          )}
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              if (!isAuthenticated) {
                setFeedback('Entra para denunciar conteúdo.');
                navigate('/entrar');
                return;
              }
              setShowModal(true);
            }}
            disabled={isSubmitting}
          >
            Denunciar
          </button>
        </div>
      )}
      {feedback && <p className="absolute right-0 mt-1 w-44 text-right text-[11px] text-throne-500">{feedback}</p>}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="my-6 w-full max-w-md rounded-xl border border-throne-200 bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-throne-900">Denunciar conteúdo</h3>
            <p className="mt-1 text-sm text-throne-500">Ajuda-nos a moderar a comunidade.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Motivo</label>
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} disabled={isSubmitting}>
                  <option value="">Seleciona um motivo</option>
                  {REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Detalhes (opcional)</label>
                <textarea
                  className="input min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (isSubmitting) return;
                  setShowModal(false);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={submitReport} disabled={isSubmitting}>
                {isSubmitting ? 'A enviar…' : 'Enviar denúncia'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuggestModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="my-6 w-full max-w-md rounded-xl border border-throne-200 bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-throne-900">Propor alteração</h3>
            <p className="mt-1 text-sm text-throne-500">A tua proposta será revista pela moderação.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={suggestName} onChange={(e) => setSuggestName(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">URL</label>
                <input className="input" value={suggestUrl} onChange={(e) => setSuggestUrl(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input min-h-[100px]"
                  value={suggestDescription}
                  onChange={(e) => setSuggestDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={600}
                />
              </div>
              <div>
                <label className="label">Categoria</label>
                <input className="input" value={suggestCategory} onChange={(e) => setSuggestCategory(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">Autor</label>
                <input className="input" value={suggestAuthor} onChange={(e) => setSuggestAuthor(e.target.value)} disabled={isSubmitting} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Data de lançamento</label>
                  <input className="input" type="date" value={suggestLaunchDate} onChange={(e) => setSuggestLaunchDate(e.target.value)} disabled={isSubmitting} />
                </div>
                <div>
                  <label className="label">Precisão da data</label>
                  <select className="input" value={suggestLaunchPrecision} onChange={(e) => setSuggestLaunchPrecision(e.target.value as NonNullable<WebsiteMetadata['launch_precision']>)} disabled={isSubmitting}>
                    <option value="exact">Exata</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                    <option value="unknown">Desconhecida</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Linguagens (separadas por vírgula)</label>
                <input className="input" value={suggestLanguages} onChange={(e) => setSuggestLanguages(e.target.value)} disabled={isSubmitting} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`opensource-${targetId}`}
                  type="checkbox"
                  className="h-4 w-4"
                  checked={suggestOpenSource}
                  onChange={(e) => setSuggestOpenSource(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor={`opensource-${targetId}`} className="text-sm text-throne-700">Código aberto</label>
              </div>
              <div>
                <label className="label">URL do código-fonte</label>
                <input className="input" value={suggestSourceUrl} onChange={(e) => setSuggestSourceUrl(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">URL do logo</label>
                <input className="input" value={suggestLogoUrl} onChange={(e) => setSuggestLogoUrl(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">URL do screenshot principal</label>
                <input className="input" value={suggestScreenshotUrl} onChange={(e) => setSuggestScreenshotUrl(e.target.value)} disabled={isSubmitting} />
              </div>
              <div>
                <label className="label">Outras imagens (uma por linha)</label>
                <textarea
                  className="input min-h-[80px]"
                  value={suggestImages}
                  onChange={(e) => setSuggestImages(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="label">Outros detalhes</label>
                <textarea
                  className="input min-h-[80px]"
                  value={suggestOtherDetails}
                  onChange={(e) => setSuggestOtherDetails(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (isSubmitting) return;
                  setShowSuggestModal(false);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={submitSuggestion} disabled={isSubmitting}>
                {isSubmitting ? 'A enviar…' : 'Enviar proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
