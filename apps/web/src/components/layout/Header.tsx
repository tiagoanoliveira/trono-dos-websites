import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-throne-200 bg-white/80 backdrop-blur-md">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="text-2xl">👑</span>
            <span className="hidden sm:inline">
              <span className="text-throne-900">Trono dos</span>{' '}
              <span className="text-crown-500">Websites</span>
            </span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-md md:block">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-throne-400" />
              <input
                type="search"
                placeholder="Pesquisar websites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 py-1.5"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to="/propor" className="btn-primary hidden sm:inline-flex">
              <PlusIcon className="h-4 w-4" />
              Propor Website
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="btn-ghost p-2 md:hidden"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </button>

            {/* User */}
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full bg-throne-100 px-3 py-1.5 text-sm font-medium text-throne-700 border border-throne-200 hover:border-crown-300 transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crown-500 text-white font-semibold uppercase">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="text-left">
                    <span className="block leading-tight">{user.name}</span>
                    <span className="text-xs text-throne-400">Perfil</span>
                  </span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-throne-200 bg-white shadow-lg z-20">
                    <Link
                      to="/perfil"
                      className="block px-3 py-2 text-sm text-throne-700 hover:bg-throne-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Ver perfil
                    </Link>
                    <button
                      onClick={async () => {
                        await logout();
                        setShowUserMenu(false);
                        navigate('/entrar');
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Terminar sessão
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/entrar" className="btn-secondary hidden md:inline-flex">
                Entrar
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 md:hidden',
            isMenuOpen ? 'max-h-64 pb-4' : 'max-h-0'
          )}
        >
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-throne-400" />
              <input
                type="search"
                placeholder="Pesquisar websites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </form>
          <div className="flex flex-col gap-2">
            <Link to="/propor" className="btn-primary justify-center">
              <PlusIcon className="h-4 w-4" />
              Propor Website
            </Link>
            {isAuthenticated && user ? (
              <>
                <Link to="/perfil" className="btn-secondary justify-center">
                  Perfil
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    setIsMenuOpen(false);
                    navigate('/entrar');
                  }}
                  className="btn-ghost justify-center"
                >
                  Terminar sessão
                </button>
              </>
            ) : (
              <Link to="/entrar" className="btn-secondary justify-center">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Ícones inline para evitar dependências extra
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
