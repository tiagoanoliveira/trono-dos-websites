import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type ForgotPasswordResponse = { message?: string; token?: string };

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Introduz um email válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
      if (!response.success) {
        throw new Error(response.error?.message ?? 'Não foi possível enviar o pedido.');
      }
      const message =
        response.data?.message ??
        'Se o email existir, receberás um link de recuperação dentro de momentos.';
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-app flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🧠</span>
            <h1 className="text-2xl font-bold text-throne-900">Recuperar password</h1>
            <p className="text-sm text-throne-500">
              Introduz o teu email e enviaremos um link de recuperação.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="o-teu@email.pt"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn('btn-primary w-full justify-center', isSubmitting && 'opacity-60 cursor-not-allowed')}
            >
              {isSubmitting ? 'A enviar…' : 'Enviar link de recuperação'}
            </button>
          </form>

          <div className="text-center text-sm text-throne-500">
            <Link to="/entrar" className="link font-medium">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
