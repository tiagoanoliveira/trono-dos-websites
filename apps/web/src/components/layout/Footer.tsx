import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
              O melhor da internet, reunido num só lugar para portugueses.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  'border border-throne-200 text-throne-500',
                  'hover:border-throne-300 hover:text-throne-700 transition-colors'
                )}
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  'border border-throne-200 text-throne-500',
                  'hover:border-throne-300 hover:text-throne-700 transition-colors'
                )}
              >
                <GitHubIcon className="h-4 w-4" />
              </a>
            </div>
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
            © 2024 Trono dos Websites. Feito com ❤️ para portugueses.
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
