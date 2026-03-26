import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container-app flex flex-col items-center justify-center py-32 text-center">
      <p className="text-8xl font-black text-crown-500 leading-none select-none">404</p>
      <h1 className="mt-4 text-3xl font-bold text-throne-900">Página não encontrada</h1>
      <p className="mt-3 text-throne-500 max-w-sm">
        A página que estás a tentar aceder não existe ou foi movida.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link to="/" className="btn-primary">
          Voltar ao início
        </Link>
        <Link to="/pesquisa" className="btn-secondary">
          Pesquisar
        </Link>
      </div>
    </div>
  );
}
