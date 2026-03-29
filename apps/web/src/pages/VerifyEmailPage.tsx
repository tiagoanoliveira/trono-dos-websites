import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError('');
    setSuccess('');
    if (!token) {
      setError('Token inválido.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message?: string }>('/auth/verify-email', { token });
      if (!res.success) throw new Error(res.error?.message ?? 'Não foi possível confirmar email');
      setSuccess(res.data?.message ?? 'Email confirmado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app flex justify-center py-10">
      <div className="w-full max-w-md card p-8 space-y-5">
        <h1 className="text-2xl font-bold text-throne-900">Confirmar email</h1>
        <p className="text-sm text-throne-500">Clica para validar o teu email e concluir a ativação.</p>
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
        <button className="btn-primary" onClick={handleVerify} disabled={loading}>
          {loading ? 'A confirmar…' : 'Confirmar email'}
        </button>
        <Link to="/entrar" className="link text-sm">Voltar ao login</Link>
      </div>
    </div>
  );
}
