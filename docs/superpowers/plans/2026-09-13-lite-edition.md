# Édition « lite » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** construire, depuis le même code, une édition publique `lite` de JobTracker (Accueil + Candidatures + Profil, sans IA, Objectifs ni Bibliothèque) choisie au build par `VITE_EDITION`, avec un contrôle automatique qui refuse tout build lite contenant du code IA ou pdfjs.

**Architecture :** un noyau pur (`src/config/editionCore.ts`) résout l'édition ; `vite.config.ts` l'injecte comme constante de compilation `__APP_EDITION__` ; l'UI lit `FEATURES` pour masquer boutons, routes et requêtes, et les imports dynamiques de code IA/Objectifs/Bibliothèque sont protégés par la condition littérale `__APP_EDITION__ === 'full'` pour que Rollup les élimine. Un script `scripts/check-lite-bundle.mjs` scanne `dist/` après le build lite.

**Tech Stack :** React 18, TypeScript strict, Vite 5 (Rollup), React Router 6, Vitest 4 (environnement `node`), Node 24.

**Spec :** `docs/superpowers/specs/2026-09-13-lite-edition-design.md`

## Global Constraints

- `VITE_EDITION` accepte `lite` ou `full` ; absente ou vide (après `trim`) → `lite` ; toute autre valeur → erreur `VITE_EDITION invalide : "<valeur>" (attendu : lite | full)` qui fait échouer le build.
- L'édition est injectée par `define: { __APP_EDITION__: JSON.stringify(edition) }` dans `vite.config.ts` ; déclarée `declare const __APP_EDITION__: 'lite' | 'full'` dans `src/vite-env.d.ts`.
- Tout `import()` / `React.lazy` de code IA, Objectifs ou Bibliothèque est protégé par la condition **littérale** `__APP_EDITION__ === 'full'` (ou `!== 'full'` + `return`) — jamais par `FEATURES.*`.
- `FEATURES` (`src/config/edition.ts`) sert à tout ce qui est rendu ou requêté. Les hooks sont **toujours** appelés : seul leur argument `userId` passe à `null`.
- Build lite refusé si un fichier de `dist/` contient `api.openai.com`, `sk-proj-`, `ai-assistant` ou `pdf.worker`, ou si un nom de fichier contient `pdf.worker` ou commence par `vendor-pdf`, ou si `dist/` est absent.
- Textes d'interface en français, comme l'existant. TypeScript strict, jamais de `any`. Décisions non évidentes commentées `// WHY: ...`.
- `npm run lint` tourne avec `--max-warnings 0` : tout export non-composant d'un fichier `.tsx` porte `// eslint-disable-next-line react-refresh/only-export-components -- <raison>`.
- Tout le travail se fait dans le worktree `Jobtracker/.worktrees/lite-edition` (branche `feature/lite-edition`). Ne jamais modifier le worktree principal `Jobtracker/` (modifs non commitées de l'utilisateur), sauf l'étape finale sur son `.env.local`, **avec son accord explicite**.
- Commits conventionnels ; chaque message se termine par les deux lignes :
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF`
  Aucun push.
- Projet synchronisé iCloud : un `vite build` prend ~8 min 30 → lancer les builds en arrière-plan.

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/config/editionCore.ts` | Créer | Types + logique pure : `resolveEdition`, `featuresFor`, `filterByFeature` |
| `src/config/editionCore.test.ts` | Créer | Tests Vitest du noyau |
| `src/config/edition.ts` | Créer | `EDITION`, `FEATURES` pour l'app (lit `__APP_EDITION__`) |
| `src/vite-env.d.ts` | Modifier | Déclaration de `__APP_EDITION__` |
| `vite.config.ts` | Modifier | Résolution + `define` ; chunk `vendor-pdf` seulement en `full` |
| `vitest.config.ts` | Modifier | `define` de `__APP_EDITION__` pour les tests |
| `scripts/check-lite-bundle.mjs` | Créer | Scanner de `dist/` (fonction `scanDist` + exécution CLI) |
| `scripts/check-lite-bundle.test.mjs` | Créer | Tests Vitest du scanner |
| `package.json` | Modifier | Scripts `build:lite`, `build:full` |
| `src/App.tsx` | Modifier | Pages Objectifs/Bibliothèque en lazy conditionnel, `useGoals` conditionné |
| `src/components/layout/Sidebar.tsx` | Modifier | `feature` sur `NAV_LINKS`, export `VISIBLE_NAV_LINKS` |
| `src/components/layout/MobileBottomNav.tsx` | Modifier | Consomme `VISIBLE_NAV_LINKS` |
| `src/components/applications/ApplicationDetail.tsx` | Modifier | Lettre IA conditionnelle + lazy, `useExperiences` conditionné |
| `src/components/applications/ApplicationForm.tsx` | Modifier | Import d'offre conditionnel + lazy, recherche IA du domaine en import dynamique |
| `src/pages/ApplicationsPage.tsx` | Modifier | Tri « Meilleur match » seulement si `FEATURES.goals` |
| `src/pages/DashboardPage.tsx` | Modifier | `useGoals` conditionné, carte « Activité du mois » en lite |
| `CLAUDE.md` | Modifier | Section « Éditions lite / full » |

---

### Task 1 : noyau d'édition et injection au build

**Files :**
- Create : `src/config/editionCore.ts`
- Create : `src/config/editionCore.test.ts`
- Create : `src/config/edition.ts`
- Modify : `src/vite-env.d.ts`
- Modify : `vite.config.ts`
- Modify : `vitest.config.ts`

**Interfaces :**
- Consumes : rien.
- Produces :
  - `src/config/editionCore.ts` : `type Edition = 'lite' | 'full'` ; `type FeatureKey = 'goals' | 'library' | 'ai'` ; `type FeatureFlags = Record<FeatureKey, boolean>` ; `resolveEdition(raw: string | undefined): Edition` ; `featuresFor(edition: Edition): FeatureFlags` ; `filterByFeature<T extends { feature?: FeatureKey }>(items: readonly T[], flags: FeatureFlags): T[]`.
  - `src/config/edition.ts` : `EDITION: Edition` ; `FEATURES: FeatureFlags`.
  - Constante globale `__APP_EDITION__: 'lite' | 'full'` disponible dans `src/` (app et tests).

- [ ] **Step 1 : préparer le worktree**

Depuis `Jobtracker/.worktrees/lite-edition` :

```bash
cp ../../.env.local .env.local
npm ci
git status --short
```

`npm ci` peut prendre plusieurs minutes (iCloud) : le lancer en arrière-plan et attendre sa fin avant le Step 3.
Expected : `git status --short` n'affiche rien (`.env.local` et `node_modules/` sont ignorés). `.env.local` contient `VITE_OPENAI_API_KEY` : c'est voulu, il servira à prouver que le build lite ne l'embarque pas.

- [ ] **Step 2 : écrire les tests qui échouent**

Créer `src/config/editionCore.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { featuresFor, filterByFeature, resolveEdition, type FeatureFlags, type FeatureKey } from './editionCore'

describe('resolveEdition', () => {
  it('retombe sur lite quand la variable est absente', () => {
    expect(resolveEdition(undefined)).toBe('lite')
  })

  it('retombe sur lite quand la variable est vide ou ne contient que des espaces', () => {
    expect(resolveEdition('')).toBe('lite')
    expect(resolveEdition('  ')).toBe('lite')
  })

  it('accepte lite et full', () => {
    expect(resolveEdition('lite')).toBe('lite')
    expect(resolveEdition('full')).toBe('full')
  })

  it('rejette toute autre valeur', () => {
    expect(() => resolveEdition('pro')).toThrow('VITE_EDITION invalide : "pro" (attendu : lite | full)')
  })
})

describe('featuresFor', () => {
  it('désactive toutes les fonctionnalités en lite', () => {
    expect(featuresFor('lite')).toEqual({ goals: false, library: false, ai: false })
  })

  it('active toutes les fonctionnalités en full', () => {
    expect(featuresFor('full')).toEqual({ goals: true, library: true, ai: true })
  })
})

describe('filterByFeature', () => {
  const ITEMS: { id: string; feature?: FeatureKey }[] = [
    { id: 'home' },
    { id: 'goals', feature: 'goals' },
    { id: 'apps' },
    { id: 'library', feature: 'library' },
  ]
  const NONE: FeatureFlags = { goals: false, library: false, ai: false }
  const ALL: FeatureFlags = { goals: true, library: true, ai: true }

  it('ne garde que les entrées sans feature quand tout est désactivé', () => {
    expect(filterByFeature(ITEMS, NONE).map((item) => item.id)).toEqual(['home', 'apps'])
  })

  it("garde toute la liste dans l'ordre quand tout est activé", () => {
    expect(filterByFeature(ITEMS, ALL).map((item) => item.id)).toEqual(['home', 'goals', 'apps', 'library'])
  })

  it('garde les entrées sans feature et celles de la seule feature active', () => {
    expect(filterByFeature(ITEMS, { ...NONE, library: true }).map((item) => item.id)).toEqual(['home', 'apps', 'library'])
  })
})
```

- [ ] **Step 3 : vérifier que les tests échouent**

Run : `npx vitest run src/config/editionCore.test.ts`
Expected : FAIL — `Failed to resolve import "./editionCore"` (ou équivalent : module introuvable).

- [ ] **Step 4 : implémenter le noyau**

Créer `src/config/editionCore.ts` :

```ts
// Noyau pur de l'édition (lite | full) : aucune dépendance à Vite ni au DOM,
// pour être importable par vite.config.ts et testable par Vitest.

export type Edition = 'lite' | 'full'
export type FeatureKey = 'goals' | 'library' | 'ai'
export type FeatureFlags = Record<FeatureKey, boolean>

export function resolveEdition(raw: string | undefined): Edition {
  const value = raw?.trim() ?? ''
  // WHY: défaut fail-closed — une variable oubliée au déploiement ne doit jamais livrer l'IA.
  if (value === '') return 'lite'
  if (value === 'lite' || value === 'full') return value
  throw new Error(`VITE_EDITION invalide : "${raw}" (attendu : lite | full)`)
}

export function featuresFor(edition: Edition): FeatureFlags {
  const full = edition === 'full'
  return { goals: full, library: full, ai: full }
}

export function filterByFeature<T extends { feature?: FeatureKey }>(items: readonly T[], flags: FeatureFlags): T[] {
  return items.filter((item) => item.feature === undefined || flags[item.feature])
}
```

- [ ] **Step 5 : vérifier que les tests passent**

Run : `npx vitest run src/config/editionCore.test.ts`
Expected : PASS, 9 tests.

- [ ] **Step 6 : déclarer la constante et exposer `FEATURES`**

Dans `src/vite-env.d.ts`, ajouter à la fin du fichier :

```ts

// Édition injectée au build par vite.config.ts (define) — voir src/config/edition.ts.
declare const __APP_EDITION__: 'lite' | 'full'
```

Créer `src/config/edition.ts` :

```ts
import { featuresFor, type Edition, type FeatureFlags } from './editionCore'

// Édition injectée au build par vite.config.ts (define).
// WHY: FEATURES est calculé par un appel de fonction, que Rollup ne sait pas replier.
// Pour protéger un import() ou un React.lazy de code IA / Objectifs / Bibliothèque, écrire la
// condition en littéral `__APP_EDITION__ === 'full'`, sinon les chunks restent dans dist/.
// Voir docs/superpowers/specs/2026-09-13-lite-edition-design.md §3.3.
export const EDITION: Edition = __APP_EDITION__
export const FEATURES: FeatureFlags = featuresFor(EDITION)
```

- [ ] **Step 7 : injecter l'édition dans Vite et Vitest**

Remplacer tout le contenu de `vite.config.ts` par :

```ts
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-supabase': ['@supabase/supabase-js', '@supabase/ssr'],
            'vendor-pdf': ['pdfjs-dist'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
```

Remplacer tout le contenu de `vitest.config.ts` par :

```ts
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
  },
})
```

- [ ] **Step 8 : vérifier le câblage**

Run : `npx tsc && npm run lint && npm test`
Expected : aucune erreur TypeScript, aucun avertissement ESLint, tous les tests passent (existants + 9 nouveaux).

Run : `VITE_EDITION=pro npx vite build`
Expected : échec immédiat (avant la compilation) avec `VITE_EDITION invalide : "pro" (attendu : lite | full)`.

- [ ] **Step 9 : commit**

```bash
git add src/config/editionCore.ts src/config/editionCore.test.ts src/config/edition.ts src/vite-env.d.ts vite.config.ts vitest.config.ts
git commit -F - <<'EOF'
feat: resolve lite/full edition at build time

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 2 : contrôle du bundle lite

**Files :**
- Create : `scripts/check-lite-bundle.mjs`
- Create : `scripts/check-lite-bundle.test.mjs`
- Modify : `package.json` (bloc `scripts`)
- Modify : `vite.config.ts` (entrée `vendor-pdf` de `manualChunks`)

**Interfaces :**
- Consumes : variable `edition` et `define` de `vite.config.ts` (Task 1).
- Produces :
  - `scripts/check-lite-bundle.mjs` : `export const FORBIDDEN_CONTENT: string[]` ; `export function scanDist(distDir: string): { file: string, reason: string }[]` (chemins `file` relatifs à `distDir`) ; exécuté directement, sort en code 1 s'il y a des violations.
  - Scripts npm `build:lite` et `build:full`.

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `scripts/check-lite-bundle.test.mjs` :

```js
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanDist } from './check-lite-bundle.mjs'

let dir

function makeDist(files) {
  dir = mkdtempSync(join(tmpdir(), 'lite-bundle-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  return dir
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('scanDist', () => {
  it('accepte un build sans motif interdit', () => {
    const dist = makeDist({ 'index.html': '<div id="root"></div>', 'assets/index-abc.js': 'console.log("ok")' })
    expect(scanDist(dist)).toEqual([])
  })

  it('signale chaque motif interdit trouvé dans un fichier', () => {
    const dist = makeDist({ 'assets/index-abc.js': 'fetch("https://api.openai.com/v1");invoke("ai-assistant")' })
    expect(scanDist(dist)).toEqual([
      { file: join('assets', 'index-abc.js'), reason: 'contient "api.openai.com"' },
      { file: join('assets', 'index-abc.js'), reason: 'contient "ai-assistant"' },
    ])
  })

  it('signale une clé OpenAI inlinée', () => {
    const dist = makeDist({ 'assets/a.js': 'const k="sk-proj-XXXX"' })
    expect(scanDist(dist).map((v) => v.reason)).toEqual(['contient "sk-proj-"'])
  })

  it('signale les fichiers pdfjs par leur nom', () => {
    const dist = makeDist({ 'assets/pdf.worker.min-123.mjs': '', 'assets/vendor-pdf-456.js': '' })
    expect(scanDist(dist).map((v) => v.reason).sort()).toEqual([
      'nom commence par "vendor-pdf"',
      'nom contient "pdf.worker"',
    ])
  })

  it("échoue si le dossier n'existe pas", () => {
    const violations = scanDist(join(tmpdir(), 'lite-bundle-dossier-inexistant'))
    expect(violations).toHaveLength(1)
    expect(violations[0].reason).toContain('introuvable')
  })
})
```

- [ ] **Step 2 : vérifier que les tests échouent**

Run : `npx vitest run scripts/check-lite-bundle.test.mjs`
Expected : FAIL — import de `./check-lite-bundle.mjs` introuvable.

- [ ] **Step 3 : implémenter le scanner**

Créer `scripts/check-lite-bundle.mjs` :

```js
#!/usr/bin/env node
/**
 * check-lite-bundle — refuse un build lite qui contient du code IA ou pdfjs.
 *
 * Usage :
 *   npm run build:lite                          (build lite puis ce contrôle)
 *   node scripts/check-lite-bundle.mjs [dossier] (défaut : dist)
 *
 * Voir docs/superpowers/specs/2026-09-13-lite-edition-design.md §5.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN_CONTENT = ['api.openai.com', 'sk-proj-', 'ai-assistant', 'pdf.worker']

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

export function scanDist(distDir) {
  if (!existsSync(distDir)) {
    return [{ file: distDir, reason: 'dossier introuvable (lancer le build avant le contrôle)' }]
  }

  const violations = []
  for (const path of listFiles(distDir)) {
    const file = relative(distDir, path)
    const name = basename(path)
    if (name.includes('pdf.worker')) violations.push({ file, reason: 'nom contient "pdf.worker"' })
    if (name.startsWith('vendor-pdf')) violations.push({ file, reason: 'nom commence par "vendor-pdf"' })
    // WHY: latin1 lit n'importe quel octet sans erreur (images, polices) ; les motifs sont en ASCII.
    const content = readFileSync(path, 'latin1')
    for (const pattern of FORBIDDEN_CONTENT) {
      if (content.includes(pattern)) violations.push({ file, reason: `contient "${pattern}"` })
    }
  }
  return violations
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const distDir = resolve(process.argv[2] ?? 'dist')
  const violations = scanDist(distDir)
  if (violations.length > 0) {
    console.error(`✗ Build lite refusé — ${violations.length} problème(s) dans ${distDir} :`)
    for (const { file, reason } of violations) console.error(`  - ${file} : ${reason}`)
    process.exit(1)
  }
  console.log(`✓ Build lite propre : aucune trace de l'IA ni de pdfjs dans ${distDir}`)
}
```

- [ ] **Step 4 : vérifier que les tests passent**

Run : `npx vitest run scripts/check-lite-bundle.test.mjs`
Expected : PASS, 5 tests.

- [ ] **Step 5 : ajouter les scripts npm et retirer le chunk pdfjs en lite**

Dans `package.json`, remplacer :

```json
    "build": "tsc && vite build",
```

par :

```json
    "build": "tsc && vite build",
    "build:lite": "VITE_EDITION=lite npm run build && node scripts/check-lite-bundle.mjs",
    "build:full": "VITE_EDITION=full npm run build",
```

Dans `vite.config.ts`, remplacer :

```ts
            'vendor-pdf': ['pdfjs-dist'],
```

par :

```ts
            // WHY: pdfjs ne sert qu'à la Bibliothèque ; le déclarer en lite forcerait son chunk dans dist/.
            ...(edition === 'full' ? { 'vendor-pdf': ['pdfjs-dist'] } : {}),
```

- [ ] **Step 6 : vérifier**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe (tests existants + 14 nouveaux).

- [ ] **Step 7 : prouver que le contrôle attrape l'état actuel (arrière-plan, ~8 min 30)**

Run (en arrière-plan) : `npm run build:lite`
Expected : **FAIL** (code 1). Les pages Objectifs/Bibliothèque et l'IA sont encore importées statiquement : la sortie liste au moins `contient "ai-assistant"`, `contient "api.openai.com"`, `contient "sk-proj-"` et un fichier `pdf.worker…`. Si la sortie est `✓ Build lite propre`, le contrôle est défectueux : s'arrêter et investiguer avant de continuer.

Ce build peut tourner pendant la Task 3 ; noter le résultat avant de clore la Task 3.

- [ ] **Step 8 : commit**

```bash
git add scripts/check-lite-bundle.mjs scripts/check-lite-bundle.test.mjs package.json vite.config.ts
git commit -F - <<'EOF'
feat: add build:lite with a bundle check against AI and pdfjs code

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 3 : routes et navigation

**Files :**
- Modify : `src/App.tsx`
- Modify : `src/components/layout/Sidebar.tsx`
- Modify : `src/components/layout/MobileBottomNav.tsx`

**Interfaces :**
- Consumes : `FEATURES` (`@/config/edition`), `filterByFeature`, `FeatureKey` (`@/config/editionCore`), `__APP_EDITION__` (Task 1).
- Produces : `VISIBLE_NAV_LINKS` exporté par `src/components/layout/Sidebar.tsx` (même type d'élément que `NAV_LINKS`).

- [ ] **Step 1 : lister les consommateurs de `NAV_LINKS`**

Run : `grep -rn "NAV_LINKS" src`
Expected : uniquement `src/components/layout/Sidebar.tsx` et `src/components/layout/MobileBottomNav.tsx`. S'il y en a d'autres, les faire consommer `VISIBLE_NAV_LINKS` au Step 5.

- [ ] **Step 2 : `App.tsx` — imports et pages conditionnelles**

Remplacer :

```tsx
import { useState } from 'react'
```

par :

```tsx
import { lazy, Suspense, useState } from 'react'
```

Supprimer ces deux lignes :

```tsx
import { LibraryPage } from '@/pages/LibraryPage'
```

```tsx
import { GoalsPage } from '@/pages/GoalsPage'
```

Remplacer :

```tsx
import { extractDomain } from '@/lib/url'
import type { Application } from '@/lib/types'
```

par :

```tsx
import { extractDomain } from '@/lib/url'
import { FEATURES } from '@/config/edition'
import type { Application } from '@/lib/types'

// WHY: condition littérale (pas FEATURES) pour que Rollup supprime ces pages — et l'IA / pdfjs
// qu'elles importent — du build lite. Voir spec §3.3.
const GoalsPage = __APP_EDITION__ === 'full'
  ? lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
  : null
const LibraryPage = __APP_EDITION__ === 'full'
  ? lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })))
  : null

const PAGE_FALLBACK = <div className="text-[var(--color-muted)] text-sm">Chargement...</div>
```

- [ ] **Step 3 : `App.tsx` — objectif et routes**

Remplacer :

```tsx
  const { activeGoal: goal } = useGoals(user?.id ?? null)
```

par :

```tsx
  const { activeGoal: goal } = useGoals(FEATURES.goals ? user?.id ?? null : null)
```

Remplacer :

```tsx
          <Route path="library" element={<LibraryPage userId={user.id} userEmail={user.email} />} />
          <Route path="goals" element={<GoalsPage userId={user.id} applications={applications} />} />
```

par :

```tsx
          {LibraryPage && (
            <Route path="library" element={<Suspense fallback={PAGE_FALLBACK}><LibraryPage userId={user.id} userEmail={user.email} /></Suspense>} />
          )}
          {GoalsPage && (
            <Route path="goals" element={<Suspense fallback={PAGE_FALLBACK}><GoalsPage userId={user.id} applications={applications} /></Suspense>} />
          )}
```

(La route `*` existante redirige `/goals` et `/library` vers `/` en lite. React Router 6 ignore les enfants `null`/`false` de `<Routes>`.)

- [ ] **Step 4 : `Sidebar.tsx` — liste filtrée**

Remplacer :

```tsx
import type { TranslationKey } from '@/lib/i18n/translations'
```

par :

```tsx
import type { TranslationKey } from '@/lib/i18n/translations'
import { FEATURES } from '@/config/edition'
import { filterByFeature, type FeatureKey } from '@/config/editionCore'
```

Remplacer :

```tsx
export const NAV_LINKS: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { to: '/',             labelKey: 'sidebar.dashboard',    icon: LayoutDashboard },
  { to: '/applications', labelKey: 'sidebar.applications', icon: Briefcase },
  { to: '/goals',        labelKey: 'sidebar.goals',        icon: Target },
  { to: '/library',      labelKey: 'sidebar.library',      icon: BookOpen },
]
```

par :

```tsx
export const NAV_LINKS: { to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; feature?: FeatureKey }[] = [
  { to: '/',             labelKey: 'sidebar.dashboard',    icon: LayoutDashboard },
  { to: '/applications', labelKey: 'sidebar.applications', icon: Briefcase },
  { to: '/goals',        labelKey: 'sidebar.goals',        icon: Target,   feature: 'goals' },
  { to: '/library',      labelKey: 'sidebar.library',      icon: BookOpen, feature: 'library' },
]

// eslint-disable-next-line react-refresh/only-export-components -- liste filtrée selon l'édition (lite/full), partagée avec MobileBottomNav
export const VISIBLE_NAV_LINKS = filterByFeature(NAV_LINKS, FEATURES)
```

Remplacer :

```tsx
        {NAV_LINKS.map(({ to, labelKey, icon }) => (
```

par :

```tsx
        {VISIBLE_NAV_LINKS.map(({ to, labelKey, icon }) => (
```

- [ ] **Step 5 : `MobileBottomNav.tsx`**

Remplacer :

```tsx
import { NAV_LINKS } from './Sidebar'
```

par :

```tsx
import { VISIBLE_NAV_LINKS } from './Sidebar'
```

Remplacer :

```tsx
        gridTemplateColumns: `repeat(${NAV_LINKS.length}, minmax(0, 1fr))`,
```

par :

```tsx
        gridTemplateColumns: `repeat(${VISIBLE_NAV_LINKS.length}, minmax(0, 1fr))`,
```

Remplacer :

```tsx
      {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => (
```

par :

```tsx
      {VISIBLE_NAV_LINKS.map(({ to, labelKey, icon: Icon }) => (
```

- [ ] **Step 6 : vérifier**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

Vérifier aussi le résultat du build lancé en Task 2 Step 7 (il doit avoir échoué comme attendu).

- [ ] **Step 7 : commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx src/components/layout/MobileBottomNav.tsx
git commit -F - <<'EOF'
feat: hide goals and library routes and nav in lite edition

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 4 : fiche détail et formulaire sans IA en lite

**Files :**
- Modify : `src/components/applications/ApplicationDetail.tsx`
- Modify : `src/components/applications/ApplicationForm.tsx`

**Interfaces :**
- Consumes : `FEATURES` (`@/config/edition`), `__APP_EDITION__` (Task 1).
- Produces : rien de nouveau (props des composants inchangées).

- [ ] **Step 1 : `ApplicationDetail.tsx` — imports et chargement conditionnel**

Remplacer :

```tsx
import { useEffect, useRef, useState } from 'react'
```

par :

```tsx
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
```

Supprimer la ligne :

```tsx
import { CoverLetterGenerator } from './CoverLetterGenerator'
```

Remplacer :

```tsx
import { deriveApplicationStatusFromSteps, TIMELINE_PRESETS } from '@/lib/timelineStatus'
```

par :

```tsx
import { deriveApplicationStatusFromSteps, TIMELINE_PRESETS } from '@/lib/timelineStatus'
import { FEATURES } from '@/config/edition'

// WHY: condition littérale (pas FEATURES.ai) pour que Rollup supprime la lettre IA — et lib/ai —
// du build lite. Voir spec §3.3.
const CoverLetterGenerator = __APP_EDITION__ === 'full'
  ? lazy(() => import('./CoverLetterGenerator').then((m) => ({ default: m.CoverLetterGenerator })))
  : null
```

- [ ] **Step 2 : `ApplicationDetail.tsx` — requête, bouton et rendu**

Remplacer :

```tsx
  const { experiences } = useExperiences(application.userId)
```

par :

```tsx
  // WHY: les expériences ne servent qu'à la lettre IA ; pas de requête sur "Experience" en lite.
  const { experiences } = useExperiences(FEATURES.ai ? application.userId : null)
```

Remplacer :

```tsx
            <button className="btn btn-secondary btn-sm" onClick={() => setCoverLetterOpen(true)}>
              <Mail size={13} />
              Lettre IA
            </button>
```

par :

```tsx
            {FEATURES.ai && (
              <button className="btn btn-secondary btn-sm" onClick={() => setCoverLetterOpen(true)}>
                <Mail size={13} />
                Lettre IA
              </button>
            )}
```

Remplacer :

```tsx
      {coverLetterOpen && (
        <CoverLetterGenerator
          application={application}
          profile={profile ? { ...profile, email: profile.email || userEmail } : null}
          experiences={experiences}
          onClose={() => setCoverLetterOpen(false)}
        />
      )}
```

par :

```tsx
      {coverLetterOpen && CoverLetterGenerator && (
        <Suspense fallback={null}>
          <CoverLetterGenerator
            application={application}
            profile={profile ? { ...profile, email: profile.email || userEmail } : null}
            experiences={experiences}
            onClose={() => setCoverLetterOpen(false)}
          />
        </Suspense>
      )}
```

- [ ] **Step 3 : `ApplicationForm.tsx` — imports et chargement conditionnel**

Remplacer :

```tsx
import { useEffect, useState } from 'react'
```

par :

```tsx
import { lazy, Suspense, useEffect, useState } from 'react'
```

Remplacer :

```tsx
import { guessCompanyWebsiteFromJobUrl } from '@/lib/jobBoards'
import { guessCompanyDomain } from '@/lib/ai'
import { JobOfferImporter } from './JobOfferImporter'
import { ApplicationFormStepOffer, type ApplicationFormData } from './steps/ApplicationFormStepOffer'
```

par :

```tsx
import { guessCompanyWebsiteFromJobUrl } from '@/lib/jobBoards'
import { FEATURES } from '@/config/edition'
import { ApplicationFormStepOffer, type ApplicationFormData } from './steps/ApplicationFormStepOffer'
```

Remplacer :

```tsx
const STEPS = [
```

par :

```tsx
// WHY: condition littérale (pas FEATURES.ai) pour que Rollup supprime l'import d'offre — et lib/ai —
// du build lite. Voir spec §3.3.
const JobOfferImporter = __APP_EDITION__ === 'full'
  ? lazy(() => import('./JobOfferImporter').then((m) => ({ default: m.JobOfferImporter })))
  : null

const STEPS = [
```

- [ ] **Step 4 : `ApplicationForm.tsx` — recherche IA du domaine, bouton et rendu**

Remplacer :

```tsx
  // instantanées.
  async function handleCompanyBlur() {
    const company = formData.company.trim()
    if (!company || formData.companyWebsite.trim() || lookupCompanyDomain(company)) return
    setAiLogoLookupLoading(true)
    const domain = await guessCompanyDomain(company)
```

par :

```tsx
  // instantanées. Désactivé en édition lite (pas d'IA).
  async function handleCompanyBlur() {
    const company = formData.company.trim()
    if (!company || formData.companyWebsite.trim() || lookupCompanyDomain(company)) return
    // WHY: condition littérale pour que Rollup supprime l'import de lib/ai du build lite (spec §3.3).
    if (__APP_EDITION__ !== 'full') return
    setAiLogoLookupLoading(true)
    const { guessCompanyDomain } = await import('@/lib/ai')
    const domain = await guessCompanyDomain(company)
```

Remplacer :

```tsx
              showImport={!initial}
```

par :

```tsx
              showImport={!initial && FEATURES.ai}
```

Remplacer :

```tsx
      {importerOpen && (
        <JobOfferImporter
          onImport={handleImport}
          onClose={() => setImporterOpen(false)}
        />
      )}
```

par :

```tsx
      {importerOpen && JobOfferImporter && (
        <Suspense fallback={null}>
          <JobOfferImporter
            onImport={handleImport}
            onClose={() => setImporterOpen(false)}
          />
        </Suspense>
      )}
```

- [ ] **Step 5 : vérifier**

Run : `grep -rn "@/lib/ai'" src/components/applications/ApplicationForm.tsx src/components/applications/ApplicationDetail.tsx`
Expected : une seule ligne, l'`await import('@/lib/ai')` de `ApplicationForm.tsx` (aucun import statique).

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

- [ ] **Step 6 : commit**

```bash
git add src/components/applications/ApplicationDetail.tsx src/components/applications/ApplicationForm.tsx
git commit -F - <<'EOF'
feat: remove AI cover letter and job offer import from lite edition

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 5 : tri des candidatures et carte de l'Accueil

**Files :**
- Modify : `src/pages/ApplicationsPage.tsx`
- Modify : `src/pages/DashboardPage.tsx`

**Interfaces :**
- Consumes : `FEATURES` (`@/config/edition`).
- Produces : composant local `CountRow({ label, current }: { label: string; current: number })` dans `DashboardPage.tsx` (non exporté).

- [ ] **Step 1 : `ApplicationsPage.tsx` — tri « Meilleur match »**

Remplacer :

```tsx
import { APPLICABLE_STATUSES, STATUS_LABELS } from '@/lib/types'
```

par :

```tsx
import { APPLICABLE_STATUSES, STATUS_LABELS } from '@/lib/types'
import { FEATURES } from '@/config/edition'
```

Remplacer :

```tsx
  { value: 'company_asc', label: 'Entreprise (A-Z)' },
  { value: 'match_desc', label: 'Meilleur match' },
]
```

par :

```tsx
  { value: 'company_asc', label: 'Entreprise (A-Z)' },
  // WHY: le score de match dépend de la page Objectifs, absente de l'édition lite.
  ...(FEATURES.goals ? [{ value: 'match_desc' as const, label: 'Meilleur match' }] : []),
]
```

- [ ] **Step 2 : `DashboardPage.tsx` — objectif conditionné**

Remplacer :

```tsx
import { useGoals } from '@/hooks/useGoals'
```

par :

```tsx
import { useGoals } from '@/hooks/useGoals'
import { FEATURES } from '@/config/edition'
```

Remplacer :

```tsx
  const { activeGoal: goal } = useGoals(userId)
```

par :

```tsx
  const { activeGoal: goal } = useGoals(FEATURES.goals ? userId : null)
```

- [ ] **Step 3 : `DashboardPage.tsx` — carte « Activité du mois » en lite**

Remplacer :

```tsx
          <DashboardCard
            title="Objectif du mois"
```

par :

```tsx
          {/* WHY: sans page Objectifs (lite), la cible de 10 n'est pas modifiable : on n'affiche qu'un compteur. */}
          <DashboardCard
            title={FEATURES.goals ? 'Objectif du mois' : 'Activité du mois'}
```

Remplacer :

```tsx
              <GoalRow label="candidatures envoyées" current={sentInMonth} target={monthlyTarget} pct={sentPct} />
```

par :

```tsx
              {FEATURES.goals ? (
                <GoalRow label="candidatures envoyées" current={sentInMonth} target={monthlyTarget} pct={sentPct} />
              ) : (
                <CountRow label="Candidatures envoyées" current={sentInMonth} />
              )}
```

Remplacer :

```tsx
function GoalRow({ label, current, target, pct }: { label: string; current: number; target: number; pct: number }) {
```

par :

```tsx
function CountRow({ label, current }: { label: string; current: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="text-[15px] font-bold flex-shrink-0" style={{ color: 'var(--color-text)' }}>{current}</span>
    </div>
  )
}

function GoalRow({ label, current, target, pct }: { label: string; current: number; target: number; pct: number }) {
```

- [ ] **Step 4 : vérifier**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

- [ ] **Step 5 : commit**

```bash
git add src/pages/ApplicationsPage.tsx src/pages/DashboardPage.tsx
git commit -F - <<'EOF'
feat: drop match sorting and show a monthly activity counter in lite edition

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 6 : documentation et vérification de bout en bout

**Files :**
- Modify : `CLAUDE.md` (nouvelle section avant `## 🎨 Direction design`)

**Interfaces :**
- Consumes : tout ce qui précède (`build:lite`, `build:full`, `scripts/check-lite-bundle.mjs`, `VITE_EDITION`).
- Produces : rien.

- [ ] **Step 1 : documenter les éditions**

Dans `CLAUDE.md`, remplacer :

```md
## 🎨 Direction design
```

par :

```md
## 🧩 Éditions lite / full

L'app se construit en deux éditions à partir du même code, choisies **au build** par `VITE_EDITION` :

| Édition | Contenu | Usage |
|---|---|---|
| `lite` (**défaut**) | Accueil, Candidatures (liste/grille/kanban, formulaire, fiche détail), Profil | Déploiement public |
| `full` | Tout, dont IA, Objectifs (score de match) et Bibliothèque | Usage personnel |

- En local, mettre `VITE_EDITION=full` dans `.env.local` pour retrouver toutes les fonctions. Sans variable, on obtient `lite` (fail-closed). Une valeur invalide fait échouer le build.
- `src/config/editionCore.ts` : logique pure (`resolveEdition`, `featuresFor`, `filterByFeature`). `src/config/edition.ts` : `EDITION` et `FEATURES` pour l'UI.
- `vite.config.ts` injecte la constante `__APP_EDITION__` (`define`).
- **Règle** : un `import()` / `React.lazy` de code IA, Objectifs ou Bibliothèque doit être protégé par la condition littérale `__APP_EDITION__ === 'full'`, jamais par `FEATURES.*` (non repliable par Rollup → chunks IA émis dans `dist/`).
- Déploiement public : `npm run build:lite` (build + `scripts/check-lite-bundle.mjs`, qui refuse tout `dist/` contenant `api.openai.com`, `sk-proj-`, `ai-assistant` ou pdfjs). Ne jamais définir `VITE_OPENAI_API_KEY` sur l'hébergeur public.
- Spec : `docs/superpowers/specs/2026-09-13-lite-edition-design.md`.

---

## 🎨 Direction design
```

- [ ] **Step 2 : vérifications statiques**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

- [ ] **Step 3 : build lite avec la clé présente (arrière-plan, ~8 min 30)**

Pré-condition : `grep -c "^VITE_OPENAI_API_KEY=." .env.local` affiche `1` (la clé est bien présente dans l'environnement du build).

Run (en arrière-plan) : `npm run build:lite`
Expected : build réussi puis `✓ Build lite propre : aucune trace de l'IA ni de pdfjs dans …/dist`, code de sortie 0.

Si le contrôle échoue : identifier le fichier source du chunk fautif (`grep -rln "<motif>" dist`), vérifier que chaque import dynamique concerné est bien protégé par la condition littérale `__APP_EDITION__ === 'full'` (Global Constraints), corriger, relancer.

- [ ] **Step 4 : build full (arrière-plan, ~8 min 30, après le Step 3)**

Run (en arrière-plan) : `npm run build:full && node scripts/check-lite-bundle.mjs; echo "exit=$?"`
Expected : le build réussit, puis le contrôle **échoue** (`exit=1`, motifs `ai-assistant` / `api.openai.com` / `pdf.worker` listés). Cela prouve que l'édition full contient toujours l'IA et que le contrôle n'est pas vide.

- [ ] **Step 5 : vérification dans le navigateur — édition lite**

Run (en arrière-plan) : `VITE_EDITION=lite npm run dev -- --port 5174`
Ouvrir `http://localhost:5174` et se connecter (si aucun identifiant n'est disponible, demander à l'utilisateur de se connecter dans l'onglet). Vérifier :
- menu latéral (desktop) et barre du bas (largeur mobile) : **Accueil, Candidatures** uniquement ;
- `http://localhost:5174/goals` et `/library` redirigent vers `/` ;
- Accueil : carte **« Activité du mois »** avec « Candidatures envoyées » + nombre, lignes entretiens/offres présentes ;
- Candidatures : le tri ne propose pas « Meilleur match » ; aucune pastille de score ;
- « Nouvelle candidature » : pas de bouton d'import d'offre ; saisir une entreprise inconnue puis quitter le champ ne déclenche aucun appel `ai-assistant` (onglet Réseau) ;
- fiche détail : pas de bouton « Lettre IA », pas de bloc « Correspondance avec votre objectif » ;
- Profil accessible via l'avatar ;
- onglet Réseau : aucune requête vers `user_goals`, `Experience` ni `functions/v1/ai-assistant`.

Arrêter le serveur.

- [ ] **Step 6 : vérification dans le navigateur — édition full**

Run (en arrière-plan) : `VITE_EDITION=full npm run dev -- --port 5175`
Vérifier sur `http://localhost:5175` : les 4 entrées de menu, `/goals` et `/library` s'affichent, bouton « Lettre IA » et import d'offre présents, carte « Objectif du mois » inchangée, tri « Meilleur match » présent.

Arrêter le serveur.

- [ ] **Step 7 : commit**

```bash
git add CLAUDE.md
git commit -F - <<'EOF'
docs: document lite/full editions in CLAUDE.md

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

- [ ] **Step 8 : `.env.local` de l'utilisateur (avec accord uniquement)**

Demander à l'utilisateur s'il veut que `VITE_EDITION=full` soit ajouté au `.env.local` du worktree principal (`Jobtracker/.env.local`) pour conserver la version complète en local. Seulement après un « oui » explicite :

```bash
printf '\nVITE_EDITION=full\n' >> ../../.env.local
grep -n "^VITE_EDITION" ../../.env.local
```

Expected : une seule ligne `VITE_EDITION=full`.
