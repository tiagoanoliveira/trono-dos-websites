import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';

export function ProfilePage() {
  return (
    <div className="container-app flex flex-col items-center justify-center py-32 text-center">
      <span className="text-6xl mb-6">👤</span>
      <div className="flex items-center gap-2 justify-center mb-3">
        <h1 className="text-3xl font-bold text-throne-900">Perfil</h1>
        <Badge variant="info">Em breve</Badge>
      </div>
      <p className="text-throne-500 max-w-sm leading-relaxed">
        A página de perfil estará disponível em breve, juntamente com a autenticação.
      </p>
      <Link to="/" className="btn-secondary mt-8">
        Voltar ao início
      </Link>
    </div>
  );
}
