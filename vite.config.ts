import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { resolveEdition } from './src/config/editionCore'

export default defineConfig(({ mode }) => {
  // WHY: loadEnv lit .env.local ET l'environnement du shell / de l'hébergeur, ce dernier primant :
  // `VITE_EDITION=lite npm run build` donne bien une édition lite même si .env.local dit full.
  const edition = resolveEdition(loadEnv(mode, process.cwd(), '').VITE_EDITION)

  return {
    plugins: [react()],
    define: {
      __APP_EDITION__: JSON.stringify(edition),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      // WHY: .worktrees contient des copies de travail d'AUTRES branches ; sans cette exclusion,
      // vitest y ramasse leurs tests et `npm test` ne dit plus rien de la branche courante.
      exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-supabase': ['@supabase/supabase-js', '@supabase/ssr'],
            // WHY: pdfjs ne sert qu'à la Bibliothèque ; le déclarer en lite forcerait son chunk dans dist/.
            ...(edition === 'full' ? { 'vendor-pdf': ['pdfjs-dist'] } : {}),
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
