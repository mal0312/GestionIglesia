/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTHORIZED_ADMIN_EMAILS?: string;
  readonly VITE_AUTHORIZED_EDITOR_EMAILS?: string;
  readonly VITE_DEV_GOOGLE_SIGN_IN_EMAIL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
