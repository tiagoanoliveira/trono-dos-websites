import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!token) {
      setError('Token inválido.');
      return;
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A password deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula e um número.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post<{ message?: string }>('/auth/reset-password', { token, password });
      if (!response.success) {
        throw new Error(response.error?.message ?? 'Não foi possível redefinir password.');
      }
      setSuccess(response.data?.message ?? 'Password redefinida com sucesso.');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-app flex justify-center py-8">
      <div className="w-full max-w-md">
        <div className="card p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🔐</span>
            <h1 className="text-2xl font-bold text-throne-900">Definir nova password</h1>
            <p className="text-sm text-throne-500">Introduz a nova password para terminar a recuperação.</p>
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nova password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Confirmar password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={isSubmitting} className={cn('btn-primary w-full justify-center', isSubmitting && 'opacity-60 cursor-not-allowed')}>
              {isSubmitting ? 'A guardar…' : 'Guardar nova password'}
            </button>
          </form>

          <div className="text-center text-sm text-throne-500">
            <Link to="/entrar" className="link font-medium">Voltar ao login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
