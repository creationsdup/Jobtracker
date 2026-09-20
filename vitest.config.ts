import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  define: {
    // WHY: les modules qui lisent l'édition doivent rester évaluables en test.
    __APP_EDITION__: JSON.stringify('full'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // WHY: .worktrees contient des copies de travail d'AUTRES branches ; sans cette exclusion,
    // vitest y ramasse leurs tests et `npm test` ne dit plus rien de la branche courante.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
})
