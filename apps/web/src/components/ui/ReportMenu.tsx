import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type ReportTargetType = 'website' | 'comment' | 'idea';

export function ReportMenu({
  targetType,
  targetId,
  className = '',
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
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

  const handleReport = async () => {
    setOpen(false);
    setFeedback('');

    if (!isAuthenticated) {
      setFeedback('Entra para denunciar conteúdo.');
      navigate('/entrar');
      return;
    }

    const reason = window.prompt('Motivo da denúncia (mínimo 3 caracteres):', '');
    if (reason === null) return;
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setFeedback('Motivo inválido.');
      return;
    }

    const description = window.prompt('Detalhes (opcional):', '');

    setIsSubmitting(true);
    try {
      const res = await api.post<{ id: string }>('/reports', {
        target_type: targetType,
        target_id: targetId,
        reason: normalizedReason,
        description: description?.trim() || undefined,
      });
      if (!res.success) {
        setFeedback(res.error?.message ?? 'Não foi possível enviar denúncia.');
      } else {
        setFeedback('Denúncia enviada.');
      }
    } catch {
      setFeedback('Não foi possível enviar denúncia.');
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
        <div className="absolute right-0 z-20 mt-1 min-w-32 rounded-md border border-throne-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
            onClick={handleReport}
            disabled={isSubmitting}
          >
            Denunciar
          </button>
        </div>
      )}
      {feedback && <p className="absolute right-0 mt-1 w-44 text-right text-[11px] text-throne-500">{feedback}</p>}
    </div>
  );
}
