export function ContactPage() {
  const iframeUrl = import.meta.env.VITE_CONTACT_IFRAME_URL || import.meta.env.CONTACT_IFRAME_URL;

  return (
    <div className="container-app py-10">
      <div className="mx-auto w-full max-w-4xl card p-5 sm:p-8 space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-throne-900">Contacto</h1>
          <p className="text-sm text-throne-500">Fala com a equipa através do portal de suporte.</p>
        </div>
        {iframeUrl ? (
          <div className="overflow-hidden rounded-xl border border-throne-200">
            <iframe
              src={iframeUrl}
              title="Formulário de contacto"
              className="h-[720px] w-full bg-white"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Define a variável <code className="font-semibold">VITE_CONTACT_IFRAME_URL</code> para carregar o
            formulário de suporte externo nesta página.
          </div>
        )}
      </div>
    </div>
  );
}
