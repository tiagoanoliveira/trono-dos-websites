import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';

export function LoginPage() {
  return (
    <div className="container-app flex flex-col items-center justify-center py-32 text-center">
      <span className="text-6xl mb-6">🔐</span>
      <div className="flex items-center gap-2 justify-center mb-3">
        <h1 className="text-3xl font-bold text-throne-900">Entrar na conta</h1>
        <Badge variant="info">Em breve</Badge>
      </div>
      <p className="text-throne-500 max-w-sm leading-relaxed">
        A autenticação estará disponível em breve. Terás acesso a funcionalidades como avaliações,
        comentários e gestão de favoritos.
      </p>
      <Link to="/" className="btn-secondary mt-8">
        Voltar ao início
      </Link>
    </div>
  );
}
