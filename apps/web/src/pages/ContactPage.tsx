import { useState } from 'react';
import { cn } from '@/lib/utils';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Preenche todos os campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Introduz um email válido.');
      return;
    }
    setSuccess('Mensagem enviada! Entraremos em contacto em breve.');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="container-app py-10">
      <div className="mx-auto w-full max-w-2xl card p-5 sm:p-8 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-throne-900">Contacto</h1>
          <p className="text-sm text-throne-500">Envia-nos uma mensagem através do formulário.</p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Assunto</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mensagem</label>
            <textarea
              className="input min-h-[140px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={cn('btn-primary w-full sm:w-auto')}>
            Enviar mensagem
          </button>
        </form>
      </div>
    </div>
  );
}
