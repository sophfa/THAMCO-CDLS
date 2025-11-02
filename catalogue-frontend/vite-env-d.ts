/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LOANS_API_URL: string;
  readonly VITE_CATALOGUE_API_URL: string;
  readonly VITE_NOTIFICATIONS_API_URL: string;
  readonly VITE_INVENTORY_API_URL: string;
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_CALLBACK_URL: string;
  readonly VITE_USE_SEED_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
