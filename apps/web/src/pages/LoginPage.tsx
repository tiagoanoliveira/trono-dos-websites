import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preenche todos os campos.');
      return;
    }
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar. Verifica as tuas credenciais.');
    }
  };

  return (
    <div className="container-app flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-8 text-center">
            <span className="text-4xl">👑</span>
            <h1 className="mt-3 text-2xl font-bold text-throne-900">Entrar na conta</h1>
            <p className="mt-1 text-sm text-throne-500">
              Ainda não tens conta?{' '}
              <Link to="/registar" className="link font-medium">
                Regista-te grátis
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
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
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link to="/esqueci-senha" className="text-xs text-crown-600 hover:text-crown-700">
                  Esqueceste a password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={cn('btn-primary w-full justify-center', isLoading && 'opacity-60 cursor-not-allowed')}
            >
              {isLoading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-throne-200" />
            </div>
            <div className="relative flex justify-center text-xs text-throne-400">
              <span className="bg-white px-2">ou</span>
            </div>
          </div>

          <GoogleLoginButton onSuccess={() => navigate('/')} />
        </div>
      </div>
    </div>
  );
}
