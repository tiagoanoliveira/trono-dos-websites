import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { cn, getInitials } from '@/lib/utils';
import { uploadImage } from '@/hooks/useImageUpload';

export function ProfilePage() {
  const { user, updateProfile, logout, isAuthenticated } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar_url ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const navigate = useNavigate();

  const isValidAvatarUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    setName(user?.name ?? '');
    setAvatar(user?.avatar_url ?? '');
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-32 text-center space-y-4">
        <span className="text-6xl">🔒</span>
        <h1 className="text-2xl font-bold text-throne-900">Inicia sessão para veres o perfil</h1>
        <p className="text-throne-500 max-w-md">
          Precisamos de te reconhecer para mostrares e editares os teus dados.
        </p>
        <div className="flex gap-3">
          <Link to="/entrar" className="btn-primary">
            Entrar
          </Link>
          <Link to="/registar" className="btn-secondary">
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!name.trim()) {
      setError('O nome é obrigatório');
      return;
    }
    if (avatar && !isValidAvatarUrl(avatar)) {
      setError('URL de avatar inválida');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), avatar_url: avatar || undefined });
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container-app py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-crown-500 text-white text-xl font-semibold uppercase">
            {getInitials(user.name)}
          </span>
          <div>
            <h1 className="text-3xl font-bold text-throne-900 flex items-center gap-2">
              Perfil
              <Badge variant="info">{user.role}</Badge>
            </h1>
            <p className="text-throne-500">Gere o teu nome e imagem. Email é utilizado para login.</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="card p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-throne-800 mb-4">Informações básicas</h2>
            {message && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSave}>
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="O teu nome"
                  required
                />
              </div>
              <div>
                <label className="label">Avatar (URL opcional)</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setError('');
                      setMessage('');
                      setIsUploadingAvatar(true);
                      try {
                        const uploadedUrl = await uploadImage(file, 'avatar');
                        setAvatar(uploadedUrl);
                        setMessage('Avatar enviado com sucesso!');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Falha no upload do avatar.');
                      } finally {
                        setIsUploadingAvatar(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <label htmlFor="avatar-upload" className="btn-secondary cursor-pointer">
                    {isUploadingAvatar ? 'A enviar…' : 'Carregar avatar'}
                  </label>
                </div>
                <p className="text-xs text-throne-400 mt-1">Se vazio, usamos uma letra do teu nome.</p>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={user.email} className="input bg-throne-50" disabled />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn('btn-primary', isSaving && 'opacity-60 cursor-not-allowed')}
                >
                  {isSaving ? 'A guardar…' : 'Guardar alterações'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setName(user.name);
                    setAvatar(user.avatar_url ?? '');
                    setMessage('');
                    setError('');
                  }}
                >
                  Repor
                </button>
              </div>
            </form>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-throne-800">Sessão</h2>
            <div className="space-y-2 text-sm text-throne-600">
              <p>
                <span className="font-semibold">Nome:</span> {user.name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {user.email}
              </p>
            </div>
            <button
              className="btn-secondary w-full justify-center"
              onClick={async () => {
                await logout();
                navigate('/entrar');
              }}
            >
              Terminar sessão
            </button>
            <div className="border-t border-throne-100 pt-4 space-y-2 text-sm text-throne-600">
              <p className="font-semibold text-throne-800">Segurança</p>
              <Link to="/esqueci-senha" className="link">
                Recuperar/alterar password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
