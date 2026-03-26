/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Google OAuth client ID (Google Cloud Console > Credentials > OAuth 2.0 Client IDs). Required for Google login.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
