import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type ReportTargetType = 'website' | 'comment' | 'idea' | 'idea_feature';
const REASONS = ['Spam', 'Ofensivo', 'Fraude', 'Conteúdo impróprio', 'Outro'];

export function ReportMenu({
  targetType,
  targetId,
  websiteName,
  websiteUrl,
  websiteDescription,
  className = '',
}: {
  targetType: ReportTargetType;
  targetId: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteDescription?: string | null;
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

    if (!nextName || !nextUrl) {
      setFormError('Nome e URL são obrigatórios.');
      return;
    }
    if (nextName === (websiteName ?? '') && nextUrl === (websiteUrl ?? '') && nextDescription === (websiteDescription ?? '')) {
      setFormError('Faz pelo menos uma alteração antes de enviar.');
      return;
    }

    setOpen(false);
    setFeedback('');
    setIsSubmitting(true);

    try {
      const payloadLines = [
        `Nome: ${nextName}`,
        `URL: ${nextUrl}`,
        `Descrição: ${nextDescription || '(sem descrição)'}`,
      ];
      const res = await api.post<{ id: string }>('/reports', {
        target_type: 'website',
        target_id: targetId,
        reason: 'Proposta de alteração',
        description: payloadLines.join('\n'),
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-throne-200 bg-white p-4 shadow-xl">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-throne-200 bg-white p-4 shadow-xl">
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
