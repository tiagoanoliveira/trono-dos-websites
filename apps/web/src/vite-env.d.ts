/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Google OAuth client ID (Google Cloud Console > Credentials > OAuth 2.0 Client IDs). Required for Google login.
  readonly GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly CONTACT_IFRAME_URL?: string;
  readonly VITE_CONTACT_IFRAME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
