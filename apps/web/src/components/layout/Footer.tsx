import { Link } from 'react-router-dom';

const navLinks = [
  { label: 'Início', to: '/' },
  { label: 'Categorias', to: '/#categorias' },
  { label: 'Propor Website', to: '/propor' },
  { label: 'Sobre', to: '/sobre' },
  { label: 'Contacto', to: '/contacto' },
];

const legalLinks = [
  { label: 'Política de Privacidade', to: '/privacidade' },
  { label: 'Termos de Uso', to: '/termos' },
];

export function Footer() {
  return (
    <footer className="border-t border-throne-200 bg-white">
      <div className="container-app py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">👑</span>
              <span>
                <span className="text-throne-900">Trono dos</span>{' '}
                <span className="text-crown-500">Websites</span>
              </span>
            </Link>
            <p className="text-sm text-throne-500 leading-relaxed">
              O melhor da internet, reunido num só lugar.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-throne-400">
              Navegação
            </h3>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-throne-600 hover:text-crown-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-throne-400">
              Sobre
            </h3>
            <p className="text-sm text-throne-500 leading-relaxed">
              Uma plataforma colaborativa onde a comunidade portuguesa descobre, avalia e partilha
              os melhores websites e ferramentas da internet.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-throne-100">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p className="text-sm text-throne-400">
            © 2026 Trono dos Websites. Feito com 🤍 por <a href="https://www.tiagoanoliveira.pt">Tiago Oliveira</a>.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-throne-400 hover:text-throne-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
