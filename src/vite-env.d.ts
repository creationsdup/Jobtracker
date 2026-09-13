/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Édition injectée au build par vite.config.ts (define) — voir src/config/edition.ts.
declare const __APP_EDITION__: 'lite' | 'full'
