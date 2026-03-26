import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
}

export function GoogleLoginButton({ onSuccess }: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithGoogle } = useAuthStore();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError('Configuração Google em falta');
      return;
    }

    const clientIdValue = clientId;
    const scriptId = 'google-identity';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    function initClient() {
      if (initialized.current || !window.google?.accounts?.id || !containerRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientIdValue,
        callback: async (response) => {
          if (!response.credential) return;
          setIsLoading(true);
          setError(null);
          try {
            await loginWithGoogle(response.credential);
            onSuccess?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao entrar com Google');
          } finally {
            setIsLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: '100%',
      });

      initialized.current = true;
    }

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        initClient();
      } else {
        existingScript.addEventListener('load', () => {
          existingScript.dataset.loaded = 'true';
          initClient();
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      initClient();
    };
    script.onerror = () => setError('Não foi possível carregar o Google');
    document.body.appendChild(script);
  }, [clientId, loginWithGoogle, onSuccess]);

  if (!clientId) {
    return (
      <button type="button" className="btn-secondary w-full justify-center gap-2 opacity-60" disabled>
        Google indisponível
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center" />
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
      {isLoading && <p className="text-xs text-throne-400 text-center">A validar conta Google…</p>}
    </div>
  );
}
