import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirm) {
      setError('Preenche todos os campos.');
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
    if (!terms) {
      setError('Deves aceitar os termos de utilização.');
      return;
    }
    try {
      await register(email, name, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta. Tenta novamente.');
    }
  };

  return (
    <div className="container-app flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-8 text-center">
            <span className="text-4xl">👑</span>
            <h1 className="mt-3 text-2xl font-bold text-throne-900">Criar conta</h1>
            <p className="mt-1 text-sm text-throne-500">
              Já tens conta?{' '}
              <Link to="/entrar" className="link font-medium">
                Entra aqui
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
              <label htmlFor="name" className="label">Nome</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="O teu nome"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
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
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirmar password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
                placeholder="Repete a password"
                required
              />
            </div>
            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-throne-300 text-crown-500 focus:ring-crown-500"
              />
              <label htmlFor="terms" className="text-sm text-throne-600">
                Aceito os{' '}
                <Link to="/termos" className="link">Termos de Utilização</Link>{' '}
                e a{' '}
                <Link to="/privacidade" className="link">Política de Privacidade</Link>
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={cn('btn-primary w-full justify-center', isLoading && 'opacity-60 cursor-not-allowed')}
            >
              {isLoading ? 'A criar conta…' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
