# Accès par code (version simplifiée sans inscription) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** en édition `lite`, remplacer l'inscription par un tableau créé sans compte et ouvert par un code d'accès de 12 caractères (compte facultatif via « Sécuriser avec mon email » et lien magique), sans modifier les données, les policies RLS ni l'édition `full`.

**Architecture :** chaque tableau est un utilisateur Supabase Auth discret (email technique `board-<uuid>@boards.jobtracker.invalid`) créé par une fonction serveur ; le code (stocké en HMAC) est échangé contre un `hashed_token` de lien magique que le navigateur transforme en session avec `verifyOtp`. La logique serveur vit dans des modules purs testés par Vitest (dépendances injectées) ; les `index.ts` Deno ne font que brancher Supabase. Côté front, `LiteAccessGate` remplace `LoginPage` et `MyBoardPage` remplace `ProfilePage` quand `FEATURES.accessCode` est vrai.

**Tech Stack :** React 18, TypeScript strict, Vite 5, React Router 6, Supabase JS 2.104.1 (auth-js), Supabase Edge Functions (Deno), Postgres, Vitest 4 (environnement `node`), Node 24.

**Spec :** `docs/superpowers/specs/2026-09-13-lite-access-code-design.md`

## Global Constraints

- Code d'accès : alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ` (30 symboles), longueur 12, affiché `XXXX-XXXX-XXXX` ; stockage `HMAC-SHA-256(CODE_PEPPER, code normalisé)` en hex minuscule de 64 caractères ; jamais stocké ni journalisé en clair.
- Domaine technique : `BOARD_EMAIL_DOMAIN = 'boards.jobtracker.invalid'`, constante unique du module `supabase/functions/_shared/accessCode.ts`.
- Limites : `board-create` 5 / heure / IP ; `board-open` 10 / 15 min / IP ; `board-rotate-code` 5 / heure / utilisateur.
- Réponses d'erreur JSON des fonctions : `rate_limited` (429), `invalid_format` (400), `invalid_code` (401), `unauthorized` (401), `not_a_board` (404), `create_failed` (500), `server_misconfigured` (500), `server_error` (500).
- Textes d'interface : en français, **copiés mot pour mot** de la spec §3 (titres, libellés, messages d'erreur).
- Session : `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`. Lien magique : `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })`.
- Aucune boîte de dialogue native (`window.confirm`, `alert`, `prompt`) dans les nouveaux écrans.
- Règles d'édition existantes : tout `import()` / `React.lazy` de code IA, Objectifs ou Bibliothèque est protégé par la condition littérale `__APP_EDITION__ === 'full'` ; `FEATURES` sert à ce qui est rendu ou requêté ; les hooks sont toujours appelés ; `npm run build:lite` doit rester propre.
- TypeScript strict, jamais de `any` ; décisions non évidentes commentées `// WHY: ...` ; composants ≤ ~200 lignes.
- `npm run lint` tourne avec `--max-warnings 0` : tout export non-composant d'un fichier `.tsx` porte `// eslint-disable-next-line react-refresh/only-export-components -- <raison>` si ESLint le signale.
- `deno` et la CLI `supabase` ne sont **pas installés** : aucune fonction serveur ne peut être exécutée localement. Toute logique serveur testable va dans des modules purs sous `supabase/functions/_shared/` (sans import d'URL, sans `Deno`) testés par Vitest.
- Aucune action sur le projet Supabase live (migration, déploiement, secrets, réglages, appel avec la clé `service_role`) par un exécutant : réservé au contrôleur, avec l'accord explicite de l'utilisateur.
- Ne jamais modifier `supabase/functions/delete-account/` (modification non commitée de l'utilisateur dans le worktree principal).
- Travail dans le worktree `Jobtracker/.worktrees/lite-edition`, branche `feature/lite-access-code`. Ne jamais modifier le worktree principal `Jobtracker/`.
- Commits conventionnels ; chaque message se termine par `Co-Authored-By: <nom du modèle qui écrit le commit> <noreply@anthropic.com>` puis `Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF`. Aucun push.

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `supabase/functions/_shared/accessCode.ts` | Créer | Module pur : alphabet, génération, normalisation, format, raccourci, HMAC, email technique |
| `src/lib/accessCode.ts` | Créer | Réexport du module pur pour le front |
| `src/lib/accessCode.test.ts` | Créer | Tests du module pur |
| `supabase/migrations/20260913120000_board_access.sql` | Créer | Tables `board_access`, `access_attempts`, RPC `hit_rate_limit` |
| `supabase/functions/_shared/boardHandlers.ts` | Créer | Logique pure des 4 fonctions (dépendances injectées) |
| `src/lib/boardHandlers.test.ts` | Créer | Tests des handlers avec dépendances factices |
| `supabase/functions/_shared/http.ts` | Créer | CORS, JSON, lecture du corps |
| `supabase/functions/_shared/supabaseDeps.ts` | Créer | Implémentation Supabase des dépendances + appelant + bucket IP |
| `supabase/functions/board-create/index.ts` etc. (×4) | Créer | Branchement Deno de chaque handler |
| `supabase/config.toml` | Modifier | `verify_jwt` des 4 fonctions |
| `src/lib/boardAccessErrors.ts` + `.test.ts` | Créer | Traduction statut/code → message français |
| `src/hooks/useBoardAccess.ts` | Créer | Tous les appels client (fonctions, verifyOtp, OTP, updateUser, signOut) |
| `src/components/access/*.tsx` (7) | Créer | Écrans d'accès, panneau de code, porte d'accès, dialogue de suppression |
| `src/pages/MyBoardPage.tsx` | Créer | Page « Mon tableau » |
| `src/config/editionCore.ts` + test | Modifier | Drapeau `accessCode` |
| `src/App.tsx`, `Sidebar.tsx`, `MobileBottomNav.tsx`, `translations.ts` | Modifier | Branchements `lite` |
| `CLAUDE.md` | Modifier | Section « Accès par code » |

---

### Task 1 : module pur du code d'accès

**Files :**
- Create : `supabase/functions/_shared/accessCode.ts`
- Create : `src/lib/accessCode.ts`
- Test : `src/lib/accessCode.test.ts`

**Interfaces :**
- Consumes : rien.
- Produces (depuis `supabase/functions/_shared/accessCode.ts`, réexportés par `@/lib/accessCode`) : `ACCESS_CODE_ALPHABET: string`, `ACCESS_CODE_LENGTH: number`, `BOARD_EMAIL_DOMAIN: string`, `generateAccessCode(): string`, `normalizeAccessCode(input: string): string`, `isValidAccessCode(normalized: string): boolean`, `formatAccessCode(normalized: string): string`, `parseShortcutHash(hash: string): string | null`, `hmacSha256Hex(message: string, secret: string): Promise<string>`, `hashAccessCode(normalized: string, pepper: string): Promise<string>`, `isBoardEmail(email: string | null | undefined): boolean`.

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `src/lib/accessCode.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  ACCESS_CODE_ALPHABET,
  ACCESS_CODE_LENGTH,
  formatAccessCode,
  generateAccessCode,
  hashAccessCode,
  hmacSha256Hex,
  isBoardEmail,
  isValidAccessCode,
  normalizeAccessCode,
  parseShortcutHash,
} from './accessCode'

describe('ACCESS_CODE_ALPHABET', () => {
  it('contient 30 symboles distincts sans caractères ambigus', () => {
    expect(ACCESS_CODE_ALPHABET).toHaveLength(30)
    expect(new Set(ACCESS_CODE_ALPHABET).size).toBe(30)
    for (const char of '0O1ILU') expect(ACCESS_CODE_ALPHABET).not.toContain(char)
  })
})

describe('generateAccessCode', () => {
  it('produit un code valide de 12 symboles', () => {
    const code = generateAccessCode()
    expect(code).toHaveLength(ACCESS_CODE_LENGTH)
    expect(isValidAccessCode(code)).toBe(true)
  })

  it('produit 1 000 codes tous différents', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateAccessCode()))
    expect(codes.size).toBe(1000)
  })
})

describe('normalizeAccessCode', () => {
  it('met en majuscules et retire espaces et tirets', () => {
    expect(normalizeAccessCode(' k7q2-m9xp 4rwd ')).toBe('K7Q2M9XP4RWD')
  })
})

describe('isValidAccessCode', () => {
  it('accepte 12 symboles de l’alphabet', () => {
    expect(isValidAccessCode('K7Q2M9XP4RWD')).toBe(true)
  })

  it('refuse une mauvaise longueur ou un symbole interdit', () => {
    expect(isValidAccessCode('K7Q2M9XP4RW')).toBe(false)
    expect(isValidAccessCode('K7Q2M9XP4RW0')).toBe(false)
  })
})

describe('formatAccessCode', () => {
  it('groupe par 4 avec des tirets', () => {
    expect(formatAccessCode('K7Q2M9XP4RWD')).toBe('K7Q2-M9XP-4RWD')
  })
})

describe('parseShortcutHash', () => {
  it('extrait un code valide du fragment', () => {
    expect(parseShortcutHash('#k7q2-m9xp-4rwd')).toBe('K7Q2M9XP4RWD')
  })

  it('ignore un retour de lien magique, un fragment vide ou un code invalide', () => {
    expect(parseShortcutHash('#access_token=abc&type=magiclink')).toBeNull()
    expect(parseShortcutHash('')).toBeNull()
    expect(parseShortcutHash('#')).toBeNull()
    expect(parseShortcutHash('#K7Q2-M9XP-4RW0')).toBeNull()
  })
})

describe('hmacSha256Hex / hashAccessCode', () => {
  it('calcule le HMAC-SHA-256 de référence', async () => {
    expect(await hmacSha256Hex('The quick brown fox jumps over the lazy dog', 'key'))
      .toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
  })

  it('est déterministe et dépend du pepper', async () => {
    const a = await hashAccessCode('K7Q2M9XP4RWD', 'pepper-a')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashAccessCode('K7Q2M9XP4RWD', 'pepper-a')).toBe(a)
    expect(await hashAccessCode('K7Q2M9XP4RWD', 'pepper-b')).not.toBe(a)
  })
})

describe('isBoardEmail', () => {
  it('reconnaît l’email technique d’un tableau, casse comprise', () => {
    expect(isBoardEmail('board-1@boards.jobtracker.invalid')).toBe(true)
    expect(isBoardEmail('BOARD-1@BOARDS.JOBTRACKER.INVALID')).toBe(true)
  })

  it('refuse un email réel ou absent', () => {
    expect(isBoardEmail('prenom@exemple.fr')).toBe(false)
    expect(isBoardEmail(null)).toBe(false)
    expect(isBoardEmail(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2 : vérifier que les tests échouent**

Run : `npx vitest run src/lib/accessCode.test.ts`
Expected : FAIL — `./accessCode` introuvable.

- [ ] **Step 3 : implémenter le module pur**

Créer `supabase/functions/_shared/accessCode.ts` :

```ts
// Module pur partagé entre le navigateur (via src/lib/accessCode.ts), les fonctions Deno et Vitest.
// Aucun import, aucune API Deno ni Node : Web Crypto uniquement.

export const ACCESS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const ACCESS_CODE_LENGTH = 12
export const BOARD_EMAIL_DOMAIN = 'boards.jobtracker.invalid'

// WHY: 256 - (256 % 30) = 240 ; rejeter les octets >= 240 évite le biais du modulo.
const UNBIASED_BYTE_LIMIT = 256 - (256 % ACCESS_CODE_ALPHABET.length)

export function generateAccessCode(): string {
  let code = ''
  while (code.length < ACCESS_CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(ACCESS_CODE_LENGTH * 2))
    for (const byte of bytes) {
      if (byte >= UNBIASED_BYTE_LIMIT) continue
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]
      if (code.length === ACCESS_CODE_LENGTH) break
    }
  }
  return code
}

export function normalizeAccessCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidAccessCode(normalized: string): boolean {
  if (normalized.length !== ACCESS_CODE_LENGTH) return false
  for (const char of normalized) {
    if (!ACCESS_CODE_ALPHABET.includes(char)) return false
  }
  return true
}

export function formatAccessCode(normalized: string): string {
  return normalized.match(/.{1,4}/g)?.join('-') ?? ''
}

export function parseShortcutHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  // WHY: un retour de lien magique Supabase ressemble à #access_token=… ; on le laisse au client Supabase.
  if (raw === '' || raw.includes('=')) return null
  if (!/^[A-Za-z0-9-]+$/.test(raw)) return null
  const normalized = normalizeAccessCode(raw)
  return isValidAccessCode(normalized) ? normalized : null
}

export async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hashAccessCode(normalized: string, pepper: string): Promise<string> {
  return hmacSha256Hex(normalized, pepper)
}

export function isBoardEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${BOARD_EMAIL_DOMAIN}`)
}
```

Créer `src/lib/accessCode.ts` :

```ts
// Réexport du module pur partagé avec les fonctions serveur (supabase/functions/_shared).
export * from '../../supabase/functions/_shared/accessCode.ts'
```

- [ ] **Step 4 : vérifier que les tests passent**

Run : `npx vitest run src/lib/accessCode.test.ts`
Expected : PASS, 13 tests.

- [ ] **Step 5 : vérifications et commit**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

```bash
git add supabase/functions/_shared/accessCode.ts src/lib/accessCode.ts src/lib/accessCode.test.ts
git commit -F - <<'EOF'
feat: add shared access-code module (generate, normalize, HMAC)

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 2 : migration et logique serveur pure

**Files :**
- Create : `supabase/migrations/20260913120000_board_access.sql`
- Create : `supabase/functions/_shared/boardHandlers.ts`
- Test : `src/lib/boardHandlers.test.ts`

**Interfaces :**
- Consumes : `generateAccessCode`, `normalizeAccessCode`, `isValidAccessCode`, `hashAccessCode`, `BOARD_EMAIL_DOMAIN` (Task 1).
- Produces (`supabase/functions/_shared/boardHandlers.ts`) :
  - `interface HandlerResult { status: number; body: Record<string, unknown> }`
  - `type InsertAccessResult = 'ok' | 'conflict' | 'error'` ; `type UpdateCodeResult = 'ok' | 'not_found' | 'error'`
  - `interface BoardDeps` (voir code) ; `CREATE_LIMIT`, `OPEN_LIMIT`, `ROTATE_LIMIT` ; `boardEmailFor(uuid: string): string`
  - `handleCreate(deps, ipKey: string, newUuid: () => string)`, `handleOpen(deps, ipKey: string, body: unknown)`, `handleRotate(deps, callerId: string | null)`, `handleDelete(deps, callerId: string | null)` → `Promise<HandlerResult>`
  - Table `public.board_access`, `public.access_attempts`, RPC `public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean`.

- [ ] **Step 1 : écrire la migration**

Créer `supabase/migrations/20260913120000_board_access.sql` :

```sql
-- Accès par code (édition lite) : un tableau = un utilisateur Auth discret.
-- Tables réservées à la service_role (RLS activée, aucune policy).
-- Voir docs/superpowers/specs/2026-09-13-lite-access-code-design.md §4.3.

create table public.board_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  code_rotated_at timestamptz,
  last_opened_at timestamptz
);
alter table public.board_access enable row level security;

create table public.access_attempts (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.access_attempts enable row level security;

create function public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.access_attempts (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = public.access_attempts.hits + 1
  returning hits into v_hits;

  delete from public.access_attempts
  where bucket = p_bucket and window_start < now() - interval '24 hours';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
```

- [ ] **Step 2 : écrire les tests des handlers (qui échouent)**

Créer `src/lib/boardHandlers.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { hashAccessCode, isValidAccessCode } from './accessCode'
import {
  handleCreate,
  handleDelete,
  handleOpen,
  handleRotate,
  type BoardDeps,
} from '../../supabase/functions/_shared/boardHandlers.ts'

function fakeDeps(overrides: Partial<BoardDeps> = {}) {
  const calls: string[] = []
  const deps: BoardDeps = {
    pepper: 'test-pepper',
    allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return true },
    createUser: async (email) => { calls.push(`createUser:${email}`); return 'user-1' },
    deleteUser: async (id) => { calls.push(`deleteUser:${id}`); return true },
    insertAccess: async (id, hash) => { calls.push(`insert:${id}:${hash}`); return 'ok' },
    findUserIdByCodeHash: async (hash) => { calls.push(`find:${hash}`); return 'user-1' },
    getUserEmail: async () => 'board-x@boards.jobtracker.invalid',
    generateMagicLinkTokenHash: async (email) => { calls.push(`link:${email}`); return 'token-hash' },
    touchLastOpened: async (id) => { calls.push(`touch:${id}`) },
    hasBoard: async () => true,
    updateCodeHash: async (id, hash) => { calls.push(`update:${id}:${hash}`); return 'ok' },
    deleteBoardData: async (id) => { calls.push(`deleteData:${id}`); return true },
    ...overrides,
  }
  return { deps, calls }
}

describe('handleCreate', () => {
  it('refuse au-delà de la limite sans créer de compte', async () => {
    const { deps, calls } = fakeDeps({ allow: async () => false })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls.some((c) => c.startsWith('createUser'))).toBe(false)
  })

  it('crée le compte, stocke le hash du code et renvoie code + tokenHash', async () => {
    const { deps, calls } = fakeDeps()
    const result = await handleCreate(deps, 'ip-key', () => 'uuid-1')
    expect(result.status).toBe(200)
    const code = result.body.code as string
    expect(isValidAccessCode(code)).toBe(true)
    expect(result.body.tokenHash).toBe('token-hash')
    expect(calls).toContain('allow:create:ip-key:5:3600')
    expect(calls).toContain('createUser:board-uuid-1@boards.jobtracker.invalid')
    expect(calls).toContain(`insert:user-1:${await hashAccessCode(code, 'test-pepper')}`)
    expect(calls).toContain('link:board-uuid-1@boards.jobtracker.invalid')
  })

  it('réessaie une fois avec un nouveau code en cas de collision', async () => {
    let attempt = 0
    const { deps, calls } = fakeDeps({ insertAccess: async (id, hash) => { calls.push(`insert:${id}:${hash}`); attempt += 1; return attempt === 1 ? 'conflict' : 'ok' } })
    const result = await handleCreate(deps, 'ip-key', () => 'uuid-1')
    expect(result.status).toBe(200)
    const inserts = calls.filter((c) => c.startsWith('insert:'))
    expect(inserts).toHaveLength(2)
    expect(inserts[1]).toBe(`insert:user-1:${await hashAccessCode(result.body.code as string, 'test-pepper')}`)
  })

  it('supprime le compte si le code ne peut pas être enregistré', async () => {
    const { deps, calls } = fakeDeps({ insertAccess: async () => 'conflict' })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 500, body: { error: 'create_failed' } })
    expect(calls).toContain('deleteUser:user-1')
  })

  it('supprime le compte si le jeton de session ne peut pas être généré', async () => {
    const { deps, calls } = fakeDeps({ generateMagicLinkTokenHash: async () => null })
    expect((await handleCreate(deps, 'ip-key', () => 'uuid-1')).status).toBe(500)
    expect(calls).toContain('deleteUser:user-1')
  })

  it('ne supprime rien si la création du compte échoue', async () => {
    const { deps, calls } = fakeDeps({ createUser: async () => null })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 500, body: { error: 'create_failed' } })
    expect(calls.some((c) => c.startsWith('deleteUser'))).toBe(false)
  })
})

describe('handleOpen', () => {
  it('refuse au-delà de la limite avant toute recherche', async () => {
    const { deps, calls } = fakeDeps({ allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return false } })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2-M9XP-4RWD' })).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls).toEqual(['allow:open:ip-key:10:900'])
  })

  it('refuse un format invalide', async () => {
    const { deps } = fakeDeps()
    expect(await handleOpen(deps, 'ip-key', { code: 'abc' })).toEqual({ status: 400, body: { error: 'invalid_format' } })
    expect(await handleOpen(deps, 'ip-key', null)).toEqual({ status: 400, body: { error: 'invalid_format' } })
  })

  it('refuse un code inconnu', async () => {
    const { deps, calls } = fakeDeps({ findUserIdByCodeHash: async (hash) => { calls.push(`find:${hash}`); return null } })
    expect(await handleOpen(deps, 'ip-key', { code: 'k7q2-m9xp-4rwd' })).toEqual({ status: 401, body: { error: 'invalid_code' } })
    expect(calls).toContain(`find:${await hashAccessCode('K7Q2M9XP4RWD', 'test-pepper')}`)
  })

  it('renvoie un tokenHash pour l’email actuel et note l’ouverture', async () => {
    const { deps, calls } = fakeDeps({ getUserEmail: async () => 'prenom@exemple.fr' })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2 M9XP 4RWD' })).toEqual({ status: 200, body: { tokenHash: 'token-hash' } })
    expect(calls).toContain('link:prenom@exemple.fr')
    expect(calls).toContain('touch:user-1')
  })

  it('répond 500 sans noter l’ouverture si l’email est introuvable', async () => {
    const { deps, calls } = fakeDeps({ getUserEmail: async () => null })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2M9XP4RWD' })).toEqual({ status: 500, body: { error: 'server_error' } })
    expect(calls.some((c) => c.startsWith('touch'))).toBe(false)
  })
})

describe('handleRotate', () => {
  it('exige un appelant authentifié', async () => {
    const { deps } = fakeDeps()
    expect(await handleRotate(deps, null)).toEqual({ status: 401, body: { error: 'unauthorized' } })
  })

  it('applique la limite par utilisateur', async () => {
    const { deps, calls } = fakeDeps({ allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return false } })
    expect(await handleRotate(deps, 'user-1')).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls).toEqual(['allow:rotate:user-1:5:3600'])
  })

  it('refuse un compte sans tableau et signale une erreur de base', async () => {
    expect(await handleRotate(fakeDeps({ updateCodeHash: async () => 'not_found' }).deps, 'user-1')).toEqual({ status: 404, body: { error: 'not_a_board' } })
    expect(await handleRotate(fakeDeps({ updateCodeHash: async () => 'error' }).deps, 'user-1')).toEqual({ status: 500, body: { error: 'server_error' } })
  })

  it('enregistre le hash du nouveau code et le renvoie', async () => {
    const { deps, calls } = fakeDeps()
    const result = await handleRotate(deps, 'user-1')
    expect(result.status).toBe(200)
    expect(isValidAccessCode(result.body.code as string)).toBe(true)
    expect(calls).toContain(`update:user-1:${await hashAccessCode(result.body.code as string, 'test-pepper')}`)
  })
})

describe('handleDelete', () => {
  it('exige un appelant authentifié', async () => {
    expect(await handleDelete(fakeDeps().deps, null)).toEqual({ status: 401, body: { error: 'unauthorized' } })
  })

  it('refuse de supprimer un compte classique', async () => {
    const { deps, calls } = fakeDeps({ hasBoard: async () => false })
    expect(await handleDelete(deps, 'user-1')).toEqual({ status: 404, body: { error: 'not_a_board' } })
    expect(calls.some((c) => c.startsWith('delete'))).toBe(false)
  })

  it('garde le compte si l’effacement des données échoue', async () => {
    const { deps, calls } = fakeDeps({ deleteBoardData: async () => false })
    expect(await handleDelete(deps, 'user-1')).toEqual({ status: 500, body: { error: 'server_error' } })
    expect(calls.some((c) => c.startsWith('deleteUser'))).toBe(false)
  })

  it('efface les données puis le compte', async () => {
    const { deps, calls } = fakeDeps()
    expect(await handleDelete(deps, 'user-1')).toEqual({ status: 200, body: { success: true } })
    expect(calls.filter((c) => c.startsWith('delete'))).toEqual(['deleteData:user-1', 'deleteUser:user-1'])
  })
})
```

- [ ] **Step 3 : vérifier que les tests échouent**

Run : `npx vitest run src/lib/boardHandlers.test.ts`
Expected : FAIL — `boardHandlers.ts` introuvable.

- [ ] **Step 4 : implémenter les handlers**

Créer `supabase/functions/_shared/boardHandlers.ts` :

```ts
// Logique pure des fonctions board-* : aucun import d'URL, aucune API Deno.
// Les accès Supabase sont injectés (supabaseDeps.ts) pour être testés par Vitest.
import {
  BOARD_EMAIL_DOMAIN,
  generateAccessCode,
  hashAccessCode,
  isValidAccessCode,
  normalizeAccessCode,
} from './accessCode.ts'

export interface HandlerResult {
  status: number
  body: Record<string, unknown>
}

export type InsertAccessResult = 'ok' | 'conflict' | 'error'
export type UpdateCodeResult = 'ok' | 'not_found' | 'error'

export interface BoardDeps {
  pepper: string
  allow(bucket: string, limit: number, windowSeconds: number): Promise<boolean>
  createUser(email: string): Promise<string | null>
  deleteUser(userId: string): Promise<boolean>
  insertAccess(userId: string, codeHash: string): Promise<InsertAccessResult>
  findUserIdByCodeHash(codeHash: string): Promise<string | null>
  getUserEmail(userId: string): Promise<string | null>
  generateMagicLinkTokenHash(email: string): Promise<string | null>
  touchLastOpened(userId: string): Promise<void>
  hasBoard(userId: string): Promise<boolean>
  updateCodeHash(userId: string, codeHash: string): Promise<UpdateCodeResult>
  deleteBoardData(userId: string): Promise<boolean>
}

export const CREATE_LIMIT = { limit: 5, windowSeconds: 3600 }
export const OPEN_LIMIT = { limit: 10, windowSeconds: 900 }
export const ROTATE_LIMIT = { limit: 5, windowSeconds: 3600 }

function reply(status: number, body: Record<string, unknown>): HandlerResult {
  return { status, body }
}

function readCode(body: unknown): string {
  if (typeof body !== 'object' || body === null) return ''
  const code = (body as { code?: unknown }).code
  return typeof code === 'string' ? code : ''
}

export function boardEmailFor(uuid: string): string {
  return `board-${uuid}@${BOARD_EMAIL_DOMAIN}`
}

export async function handleCreate(deps: BoardDeps, ipKey: string, newUuid: () => string): Promise<HandlerResult> {
  if (!(await deps.allow(`create:${ipKey}`, CREATE_LIMIT.limit, CREATE_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const email = boardEmailFor(newUuid())
  const userId = await deps.createUser(email)
  if (!userId) return reply(500, { error: 'create_failed' })

  let code = generateAccessCode()
  let inserted = await deps.insertAccess(userId, await hashAccessCode(code, deps.pepper))
  if (inserted === 'conflict') {
    code = generateAccessCode()
    inserted = await deps.insertAccess(userId, await hashAccessCode(code, deps.pepper))
  }
  const tokenHash = inserted === 'ok' ? await deps.generateMagicLinkTokenHash(email) : null
  if (!tokenHash) {
    // WHY: ne jamais laisser un compte de tableau sans code utilisable.
    await deps.deleteUser(userId)
    return reply(500, { error: 'create_failed' })
  }
  return reply(200, { code, tokenHash })
}

export async function handleOpen(deps: BoardDeps, ipKey: string, body: unknown): Promise<HandlerResult> {
  if (!(await deps.allow(`open:${ipKey}`, OPEN_LIMIT.limit, OPEN_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const code = normalizeAccessCode(readCode(body))
  if (!isValidAccessCode(code)) return reply(400, { error: 'invalid_format' })

  const userId = await deps.findUserIdByCodeHash(await hashAccessCode(code, deps.pepper))
  if (!userId) return reply(401, { error: 'invalid_code' })

  // WHY: email actuel (technique ou réel) — le code reste valable après « Sécuriser avec mon email ».
  const email = await deps.getUserEmail(userId)
  const tokenHash = email ? await deps.generateMagicLinkTokenHash(email) : null
  if (!tokenHash) return reply(500, { error: 'server_error' })

  await deps.touchLastOpened(userId)
  return reply(200, { tokenHash })
}

export async function handleRotate(deps: BoardDeps, callerId: string | null): Promise<HandlerResult> {
  if (!callerId) return reply(401, { error: 'unauthorized' })
  if (!(await deps.allow(`rotate:${callerId}`, ROTATE_LIMIT.limit, ROTATE_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const code = generateAccessCode()
  const updated = await deps.updateCodeHash(callerId, await hashAccessCode(code, deps.pepper))
  if (updated === 'not_found') return reply(404, { error: 'not_a_board' })
  if (updated === 'error') return reply(500, { error: 'server_error' })
  return reply(200, { code })
}

export async function handleDelete(deps: BoardDeps, callerId: string | null): Promise<HandlerResult> {
  if (!callerId) return reply(401, { error: 'unauthorized' })
  // WHY: cette voie ne doit jamais supprimer un compte classique de l'édition full.
  if (!(await deps.hasBoard(callerId))) return reply(404, { error: 'not_a_board' })
  if (!(await deps.deleteBoardData(callerId))) return reply(500, { error: 'server_error' })
  if (!(await deps.deleteUser(callerId))) return reply(500, { error: 'server_error' })
  return reply(200, { success: true })
}
```

- [ ] **Step 5 : vérifier que les tests passent**

Run : `npx vitest run src/lib/boardHandlers.test.ts`
Expected : PASS, 19 tests.

- [ ] **Step 6 : vérifications et commit**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

```bash
git add supabase/migrations/20260913120000_board_access.sql supabase/functions/_shared/boardHandlers.ts src/lib/boardHandlers.test.ts
git commit -F - <<'EOF'
feat: add board_access migration and pure board handlers

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 3 : fonctions serveur Deno

**Files :**
- Create : `supabase/functions/_shared/http.ts`
- Create : `supabase/functions/_shared/supabaseDeps.ts`
- Create : `supabase/functions/board-create/index.ts`
- Create : `supabase/functions/board-open/index.ts`
- Create : `supabase/functions/board-rotate-code/index.ts`
- Create : `supabase/functions/board-delete/index.ts`
- Modify : `supabase/config.toml` (ajout en fin de fichier)

**Interfaces :**
- Consumes : `BoardDeps`, `handleCreate`, `handleOpen`, `handleRotate`, `handleDelete` (Task 2) ; `hmacSha256Hex` (Task 1) ; tables et RPC de la migration (Task 2).
- Produces : fonctions HTTP `board-create`, `board-open`, `board-rotate-code`, `board-delete` (contrats de la spec §4.4) ; `loadContext()`, `getCallerId(ctx, req)`, `ipKey(ctx, req)`, `createDeps(ctx)` ; `json`, `preflight`, `readJson`.

Deno n'est pas installé : ces fichiers ne sont ni exécutés ni typés localement. Ils doivent rester minces (toute décision est dans `boardHandlers.ts`) et suivre exactement le code ci-dessous. Le contrôleur les déploiera et les testera sur le projet live avec l'accord de l'utilisateur.

- [ ] **Step 1 : utilitaires HTTP**

Créer `supabase/functions/_shared/http.ts` :

```ts
// En-têtes et réponses communs aux fonctions board-* (mêmes en-têtes CORS que delete-account).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders })
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
```

- [ ] **Step 2 : dépendances Supabase**

Créer `supabase/functions/_shared/supabaseDeps.ts` :

```ts
// Implémentation Supabase (service_role) des dépendances injectées dans boardHandlers.ts.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmacSha256Hex } from './accessCode.ts'
import type { BoardDeps } from './boardHandlers.ts'

export interface ServerContext {
  admin: SupabaseClient
  pepper: string
}

export function loadContext(): ServerContext | null {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const pepper = Deno.env.get('CODE_PEPPER')
  if (!url || !serviceRoleKey || !pepper) return null
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return { admin, pepper }
}

export async function getCallerId(ctx: ServerContext, req: Request): Promise<string | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null
  const { data, error } = await ctx.admin.auth.getUser(token)
  return error || !data?.user ? null : data.user.id
}

export function ipKey(ctx: ServerContext, req: Request): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  // WHY: l'IP n'est jamais stockée en clair (RGPD).
  return hmacSha256Hex(`ip:${ip}`, ctx.pepper)
}

export function createDeps(ctx: ServerContext): BoardDeps {
  const { admin } = ctx
  return {
    pepper: ctx.pepper,

    async allow(bucket, limit, windowSeconds) {
      const { data, error } = await admin.rpc('hit_rate_limit', { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds })
      // WHY: si la base ne répond pas, on refuse (fail-closed) plutôt que de désactiver la protection.
      return !error && data === true
    },

    async createUser(email) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { board: true } })
      return error || !data.user ? null : data.user.id
    },

    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      return !error
    },

    async insertAccess(userId, codeHash) {
      const { error } = await admin.from('board_access').insert({ user_id: userId, code_hash: codeHash })
      if (!error) return 'ok'
      return error.code === '23505' ? 'conflict' : 'error'
    },

    async findUserIdByCodeHash(codeHash) {
      const { data, error } = await admin.from('board_access').select('user_id').eq('code_hash', codeHash).maybeSingle()
      return error || !data ? null : (data.user_id as string)
    },

    async getUserEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      return error || !data.user?.email ? null : data.user.email
    },

    async generateMagicLinkTokenHash(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      return error || !data.properties?.hashed_token ? null : data.properties.hashed_token
    },

    async touchLastOpened(userId) {
      // WHY: information de purge future (RGPD) ; un échec ne doit pas bloquer l'ouverture.
      await admin.from('board_access').update({ last_opened_at: new Date().toISOString() }).eq('user_id', userId)
    },

    async hasBoard(userId) {
      const { data, error } = await admin.from('board_access').select('user_id').eq('user_id', userId).maybeSingle()
      return !error && !!data
    },

    async updateCodeHash(userId, codeHash) {
      const { data, error } = await admin
        .from('board_access')
        .update({ code_hash: codeHash, code_rotated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('user_id')
      if (error) return 'error'
      return data && data.length > 0 ? 'ok' : 'not_found'
    },

    async deleteBoardData(userId) {
      // WHY: ces tables sont keyées par userId texte, sans cascade depuis auth.users.
      const { data: apps, error: appsError } = await admin.from('Application').select('id').eq('userId', userId)
      if (appsError) return false
      const ids = (apps ?? []).map((app) => app.id as string)
      if (ids.length > 0) {
        const { error } = await admin.from('TimelineStep').delete().in('applicationId', ids)
        if (error) return false
      }
      const owned = [['Application', 'userId'], ['OrgLogo', 'userId'], ['Profile', 'id']] as const
      for (const [table, column] of owned) {
        const { error } = await admin.from(table).delete().eq(column, userId)
        if (error) return false
      }
      return true
    },
  }
}
```

- [ ] **Step 3 : les quatre points d'entrée**

Créer `supabase/functions/board-create/index.ts` :

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCreate } from '../_shared/boardHandlers.ts'
import { json, preflight } from '../_shared/http.ts'
import { createDeps, ipKey, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleCreate(createDeps(ctx), await ipKey(ctx, req), () => crypto.randomUUID())
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes, et le code ne doit pas fuiter).
    return json({ error: 'server_error' }, 500)
  }
})
```

Créer `supabase/functions/board-open/index.ts` :

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleOpen } from '../_shared/boardHandlers.ts'
import { json, preflight, readJson } from '../_shared/http.ts'
import { createDeps, ipKey, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleOpen(createDeps(ctx), await ipKey(ctx, req), await readJson(req))
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes, et le code ne doit pas fuiter).
    return json({ error: 'server_error' }, 500)
  }
})
```

Créer `supabase/functions/board-rotate-code/index.ts` :

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleRotate } from '../_shared/boardHandlers.ts'
import { json, preflight } from '../_shared/http.ts'
import { createDeps, getCallerId, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleRotate(createDeps(ctx), await getCallerId(ctx, req))
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes, et le code ne doit pas fuiter).
    return json({ error: 'server_error' }, 500)
  }
})
```

Créer `supabase/functions/board-delete/index.ts` :

```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleDelete } from '../_shared/boardHandlers.ts'
import { json, preflight } from '../_shared/http.ts'
import { createDeps, getCallerId, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleDelete(createDeps(ctx), await getCallerId(ctx, req))
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes).
    return json({ error: 'server_error' }, 500)
  }
})
```

- [ ] **Step 4 : configuration des fonctions**

À la fin de `supabase/config.toml`, ajouter :

```toml

# Accès par code (édition lite) — voir docs/superpowers/specs/2026-09-13-lite-access-code-design.md §4.4
[functions.board-create]
verify_jwt = false

[functions.board-open]
verify_jwt = false

[functions.board-rotate-code]
verify_jwt = true

[functions.board-delete]
verify_jwt = true
```

- [ ] **Step 5 : vérifier**

Run : `grep -n "Deno\|https://" supabase/functions/_shared/accessCode.ts supabase/functions/_shared/boardHandlers.ts`
Expected : aucune ligne (les modules testés restent purs).

Run : `git status --short supabase/functions/delete-account`
Expected : aucune ligne (fonction existante intacte).

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe (lint analyse aussi les fichiers Deno).

- [ ] **Step 6 : commit**

```bash
git add supabase/functions/_shared/http.ts supabase/functions/_shared/supabaseDeps.ts supabase/functions/board-create supabase/functions/board-open supabase/functions/board-rotate-code supabase/functions/board-delete supabase/config.toml
git commit -F - <<'EOF'
feat: add board-create, board-open, board-rotate-code and board-delete edge functions

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 4 : messages d'erreur et hook client

**Files :**
- Create : `src/lib/boardAccessErrors.ts`
- Test : `src/lib/boardAccessErrors.test.ts`
- Create : `src/hooks/useBoardAccess.ts`

**Interfaces :**
- Consumes : `normalizeAccessCode`, `isValidAccessCode` (`@/lib/accessCode`, Task 1) ; contrats HTTP des fonctions (Task 3) ; `supabase` (`@/lib/supabase`).
- Produces :
  - `@/lib/boardAccessErrors` : `MESSAGES` (clés `invalidFormat`, `invalidCode`, `tooManyAttempts`, `network`, `createFailed`, `createRateLimited`, `magicLinkRateLimited`, `emailTaken`, `emailInvalid`, `actionFailed`) ; `type BoardAction = 'open' | 'create' | 'rotate' | 'delete'` ; `messageForFunctionError(action: BoardAction, status: number | null): string` ; `messageForMagicLinkError(status: number | undefined, code: string | undefined): string | null` ; `messageForEmailChangeError(status: number | undefined, code: string | undefined): string` ; `isPlausibleEmail(value: string): boolean`.
  - `@/hooks/useBoardAccess` : `useBoardAccess()` renvoyant `{ createBoard, enterBoard, openBoard, requestMagicLink, secureWithEmail, rotateCode, leaveBoard, deleteBoard }` avec les signatures de la spec §4.6 :
    - `createBoard(): Promise<{ code: string; tokenHash: string } | { error: string }>`
    - `enterBoard(tokenHash: string): Promise<string | null>`
    - `openBoard(input: string): Promise<string | null>`
    - `requestMagicLink(email: string): Promise<string | null>`
    - `secureWithEmail(email: string): Promise<string | null>`
    - `rotateCode(): Promise<{ code: string } | { error: string }>`
    - `leaveBoard(): Promise<void>`
    - `deleteBoard(): Promise<string | null>`
    (chaîne = message d'erreur prêt à afficher, `null` = succès)

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `src/lib/boardAccessErrors.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import {
  MESSAGES,
  isPlausibleEmail,
  messageForEmailChangeError,
  messageForFunctionError,
  messageForMagicLinkError,
} from './boardAccessErrors'

describe('messageForFunctionError', () => {
  it('traduit les erreurs d’ouverture', () => {
    expect(messageForFunctionError('open', 400)).toBe(MESSAGES.invalidFormat)
    expect(messageForFunctionError('open', 401)).toBe(MESSAGES.invalidCode)
    expect(messageForFunctionError('open', 429)).toBe(MESSAGES.tooManyAttempts)
    expect(messageForFunctionError('open', 500)).toBe(MESSAGES.network)
    expect(messageForFunctionError('open', null)).toBe(MESSAGES.network)
  })

  it('traduit les erreurs de création', () => {
    expect(messageForFunctionError('create', 429)).toBe(MESSAGES.createRateLimited)
    expect(messageForFunctionError('create', 500)).toBe(MESSAGES.createFailed)
    expect(messageForFunctionError('create', null)).toBe(MESSAGES.createFailed)
  })

  it('traduit les erreurs de nouveau code et de suppression', () => {
    expect(messageForFunctionError('rotate', 429)).toBe(MESSAGES.tooManyAttempts)
    expect(messageForFunctionError('rotate', 404)).toBe(MESSAGES.actionFailed)
    expect(messageForFunctionError('delete', null)).toBe(MESSAGES.actionFailed)
  })

  it('reprend mot pour mot les textes de la spec', () => {
    expect(MESSAGES.invalidFormat).toBe('Le code fait 12 caractères (chiffres et lettres).')
    expect(MESSAGES.invalidCode).toBe('Ce code ne correspond à aucun tableau. Vérifie les caractères.')
    expect(MESSAGES.tooManyAttempts).toBe('Trop de tentatives. Réessaie dans quelques minutes.')
    expect(MESSAGES.network).toBe('Impossible de joindre JobTracker. Réessaie.')
    expect(MESSAGES.createFailed).toBe('Impossible de créer le tableau. Réessaie.')
    expect(MESSAGES.createRateLimited).toBe('Trop de tableaux créés depuis ce réseau. Réessaie plus tard.')
    expect(MESSAGES.magicLinkRateLimited).toBe('Trop de demandes. Réessaie dans une minute.')
    expect(MESSAGES.emailTaken).toBe('Cet email est déjà utilisé par un autre compte.')
    expect(MESSAGES.emailInvalid).toBe("Cet email n'est pas valide.")
  })
})

describe('messageForMagicLinkError', () => {
  it('ne révèle pas qu’un email est inconnu', () => {
    expect(messageForMagicLinkError(422, 'otp_disabled')).toBeNull()
    expect(messageForMagicLinkError(404, 'user_not_found')).toBeNull()
  })

  it('signale la limite d’envoi', () => {
    expect(messageForMagicLinkError(429, 'over_email_send_rate_limit')).toBe(MESSAGES.magicLinkRateLimited)
    expect(messageForMagicLinkError(429, undefined)).toBe(MESSAGES.magicLinkRateLimited)
  })

  it('traduit le reste en erreur réseau', () => {
    expect(messageForMagicLinkError(undefined, undefined)).toBe(MESSAGES.network)
    expect(messageForMagicLinkError(500, 'unexpected_failure')).toBe(MESSAGES.network)
  })
})

describe('messageForEmailChangeError', () => {
  it('signale un email déjà utilisé', () => {
    expect(messageForEmailChangeError(422, 'email_exists')).toBe(MESSAGES.emailTaken)
  })

  it('signale un email refusé', () => {
    expect(messageForEmailChangeError(400, 'email_address_invalid')).toBe(MESSAGES.emailInvalid)
    expect(messageForEmailChangeError(422, 'validation_failed')).toBe(MESSAGES.emailInvalid)
  })

  it('signale la limite d’envoi', () => {
    expect(messageForEmailChangeError(429, 'over_email_send_rate_limit')).toBe(MESSAGES.magicLinkRateLimited)
  })

  it('traduit le reste en erreur réseau', () => {
    expect(messageForEmailChangeError(undefined, undefined)).toBe(MESSAGES.network)
  })
})

describe('isPlausibleEmail', () => {
  it('accepte un email courant', () => {
    expect(isPlausibleEmail('prenom@exemple.fr')).toBe(true)
  })

  it('refuse une saisie sans @, sans domaine ou avec espace', () => {
    expect(isPlausibleEmail('prenom')).toBe(false)
    expect(isPlausibleEmail('prenom@exemple')).toBe(false)
    expect(isPlausibleEmail('pre nom@exemple.fr')).toBe(false)
  })
})
```

- [ ] **Step 2 : vérifier que les tests échouent**

Run : `npx vitest run src/lib/boardAccessErrors.test.ts`
Expected : FAIL — `./boardAccessErrors` introuvable.

- [ ] **Step 3 : implémenter la traduction des erreurs**

Créer `src/lib/boardAccessErrors.ts` :

```ts
// Messages d'erreur de l'accès par code — textes de la spec 2026-09-13-lite-access-code-design.md §3.
export const MESSAGES = {
  invalidFormat: 'Le code fait 12 caractères (chiffres et lettres).',
  invalidCode: 'Ce code ne correspond à aucun tableau. Vérifie les caractères.',
  tooManyAttempts: 'Trop de tentatives. Réessaie dans quelques minutes.',
  network: 'Impossible de joindre JobTracker. Réessaie.',
  createFailed: 'Impossible de créer le tableau. Réessaie.',
  createRateLimited: 'Trop de tableaux créés depuis ce réseau. Réessaie plus tard.',
  magicLinkRateLimited: 'Trop de demandes. Réessaie dans une minute.',
  emailTaken: 'Cet email est déjà utilisé par un autre compte.',
  emailInvalid: "Cet email n'est pas valide.",
  actionFailed: 'Une erreur est survenue. Réessaie.',
} as const

export type BoardAction = 'open' | 'create' | 'rotate' | 'delete'

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit'])

export function messageForFunctionError(action: BoardAction, status: number | null): string {
  if (action === 'open') {
    if (status === 400) return MESSAGES.invalidFormat
    if (status === 401) return MESSAGES.invalidCode
    if (status === 429) return MESSAGES.tooManyAttempts
    return MESSAGES.network
  }
  if (action === 'create') return status === 429 ? MESSAGES.createRateLimited : MESSAGES.createFailed
  return status === 429 ? MESSAGES.tooManyAttempts : MESSAGES.actionFailed
}

export function messageForMagicLinkError(status: number | undefined, code: string | undefined): string | null {
  // WHY: un email sans tableau doit afficher le même écran qu'un envoi réussi.
  if (code === 'otp_disabled' || code === 'user_not_found') return null
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) return MESSAGES.magicLinkRateLimited
  return MESSAGES.network
}

export function messageForEmailChangeError(status: number | undefined, code: string | undefined): string {
  if (code === 'email_exists') return MESSAGES.emailTaken
  if (code === 'email_address_invalid' || code === 'validation_failed') return MESSAGES.emailInvalid
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) return MESSAGES.magicLinkRateLimited
  return MESSAGES.network
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
```

- [ ] **Step 4 : vérifier que les tests passent**

Run : `npx vitest run src/lib/boardAccessErrors.test.ts`
Expected : PASS, 13 tests.

- [ ] **Step 5 : écrire le hook**

Créer `src/hooks/useBoardAccess.ts` :

```ts
import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/accessCode'
import {
  MESSAGES,
  isPlausibleEmail,
  messageForEmailChangeError,
  messageForFunctionError,
  messageForMagicLinkError,
  type BoardAction,
} from '@/lib/boardAccessErrors'

type BoardFunction = 'board-create' | 'board-open' | 'board-rotate-code' | 'board-delete'

async function callBoardFunction<T>(
  name: BoardFunction,
  action: BoardAction,
  body: Record<string, unknown> = {},
): Promise<{ data: T } | { error: string }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (!error && data) return { data }
  // WHY: une réponse HTTP non-2xx arrive avec la Response dans error.context ; sinon, pas de réponse (réseau).
  const context = (error as { context?: unknown } | null)?.context
  const status = context instanceof Response ? context.status : null
  return { error: messageForFunctionError(action, status) }
}

export function useBoardAccess() {
  const enterBoard = useCallback(async (tokenHash: string): Promise<string | null> => {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    return error ? MESSAGES.network : null
  }, [])

  const createBoard = useCallback(async (): Promise<{ code: string; tokenHash: string } | { error: string }> => {
    const result = await callBoardFunction<{ code: string; tokenHash: string }>('board-create', 'create')
    return 'error' in result ? result : { code: result.data.code, tokenHash: result.data.tokenHash }
  }, [])

  const openBoard = useCallback(async (input: string): Promise<string | null> => {
    const code = normalizeAccessCode(input)
    if (!isValidAccessCode(code)) return MESSAGES.invalidFormat
    const result = await callBoardFunction<{ tokenHash: string }>('board-open', 'open', { code })
    if ('error' in result) return result.error
    return enterBoard(result.data.tokenHash)
  }, [enterBoard])

  const requestMagicLink = useCallback(async (email: string): Promise<string | null> => {
    const trimmed = email.trim()
    if (!isPlausibleEmail(trimmed)) return MESSAGES.emailInvalid
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    return error ? messageForMagicLinkError(error.status, error.code) : null
  }, [])

  const secureWithEmail = useCallback(async (email: string): Promise<string | null> => {
    const trimmed = email.trim()
    if (!isPlausibleEmail(trimmed)) return MESSAGES.emailInvalid
    const { error } = await supabase.auth.updateUser({ email: trimmed }, { emailRedirectTo: window.location.origin })
    return error ? messageForEmailChangeError(error.status, error.code) : null
  }, [])

  const rotateCode = useCallback(async (): Promise<{ code: string } | { error: string }> => {
    const result = await callBoardFunction<{ code: string }>('board-rotate-code', 'rotate')
    return 'error' in result ? result : { code: result.data.code }
  }, [])

  const leaveBoard = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  const deleteBoard = useCallback(async (): Promise<string | null> => {
    const result = await callBoardFunction<{ success: boolean }>('board-delete', 'delete')
    if ('error' in result) return result.error
    await supabase.auth.signOut()
    return null
  }, [])

  return { createBoard, enterBoard, openBoard, requestMagicLink, secureWithEmail, rotateCode, leaveBoard, deleteBoard }
}
```

- [ ] **Step 6 : vérifications et commit**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

```bash
git add src/lib/boardAccessErrors.ts src/lib/boardAccessErrors.test.ts src/hooks/useBoardAccess.ts
git commit -F - <<'EOF'
feat: add access-code error messages and useBoardAccess hook

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 5 : écrans d'accès (présentation)

**Files :**
- Create : `src/components/access/accessUi.tsx`
- Create : `src/components/access/AccessLayout.tsx`
- Create : `src/components/access/CodeRevealPanel.tsx`
- Create : `src/components/access/AccessCodeScreen.tsx`
- Create : `src/components/access/BoardCreatedScreen.tsx`
- Create : `src/components/access/MagicLinkScreen.tsx`
- Create : `src/components/access/MagicLinkSentScreen.tsx`

**Interfaces :**
- Consumes : `formatAccessCode`, `normalizeAccessCode` (`@/lib/accessCode`, Task 1) ; `JobTrackerLogo` (`@/components/ui/JobTrackerLogo`) ; `cn` (`@/lib/utils`).
- Produces (composants purement présentationnels, sans appel réseau) :
  - `accessUi.tsx` : `Eyebrow`, `Title`, `Lead`, `Note`, `ErrorText` (`{ children: ReactNode }`) ; `Field` (`InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; invalid?: boolean }`) ; `PrimaryButton`, `SecondaryButton`, `OutlineButton`, `TextButton` (`ButtonHTMLAttributes<HTMLButtonElement>`, `type="button"` par défaut)
  - `AccessLayout({ headerAction?: ReactNode; children: ReactNode })`
  - `CodeRevealPanel({ code: string; doneLabel: string; onDone: () => void; busy?: boolean })` — `code` normalisé
  - `AccessCodeScreen({ initialCode?: string; busy: boolean; creating: boolean; error: string | null; onSubmit: (code: string) => void; onCreate: () => void; onMagicLink: () => void })`
  - `BoardCreatedScreen({ code: string; busy: boolean; error: string | null; onOpen: () => void })`
  - `MagicLinkScreen({ busy: boolean; error: string | null; onSubmit: (email: string) => void; onBack: () => void })`
  - `MagicLinkSentScreen({ onBack: () => void })`

Pas de React Testing Library dans le projet : vérification par `tsc`, lint et contrôle visuel du contrôleur. Les textes sont ceux de la spec §3.1, mot pour mot (le libellé vert est écrit en casse normale et passé en capitales par CSS).

- [ ] **Step 1 : briques visuelles**

Créer `src/components/access/accessUi.tsx` :

```tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Briques du style validé en brainstorming : colonne centrée, libellé vert, grand titre bleu nuit.

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--color-success)]">{children}</p>
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-[34px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[var(--color-primary)] sm:text-[40px]">{children}</h1>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[16px] leading-relaxed text-[var(--color-muted)]">{children}</p>
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mb-6 text-[14px] font-semibold leading-snug text-[var(--color-ink)]">{children}</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p role="alert" className="-mt-2 mb-4 text-[13px] text-[var(--color-danger)]">{children}</p>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  invalid?: boolean
}

export function Field({ id, label, invalid = false, className, ...inputProps }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[14px] text-[var(--color-ink)]">{label}</label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full rounded-lg border bg-white px-4 text-[16px] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-accent)]',
          invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className,
        )}
        {...inputProps}
      />
    </div>
  )
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] text-[16px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] bg-white text-[14px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-bg-light)] active:bg-[var(--color-bg-light)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function OutlineButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 whitespace-nowrap rounded-lg border border-[var(--color-primary)] bg-white px-3.5 py-2 text-[14px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-bg-light)] active:bg-[var(--color-bg-light)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function TextButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'mt-5 block w-full text-center text-[14px] font-medium text-[var(--color-accent)] underline-offset-2 hover:underline active:underline',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2 : mise en page**

Créer `src/components/access/AccessLayout.tsx` :

```tsx
import type { ReactNode } from 'react'
import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'

interface AccessLayoutProps {
  headerAction?: ReactNode
  children: ReactNode
}

export function AccessLayout({ headerAction, children }: AccessLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <JobTrackerLogo size={40} />
          <div className="h-9 w-px bg-[var(--color-border)]" />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-bold text-[var(--color-primary)]">JobTracker</p>
            <p className="truncate text-[12.5px] text-[var(--color-muted)]">Suivi de candidatures, sans inscription</p>
          </div>
        </div>
        {headerAction}
      </header>
      <main className="flex flex-1 justify-center px-5 pb-16 pt-10 sm:pt-20" style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}>
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3 : panneau du code**

Créer `src/components/access/CodeRevealPanel.tsx` :

```tsx
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatAccessCode } from '@/lib/accessCode'
import { PrimaryButton, SecondaryButton } from './accessUi'

interface CodeRevealPanelProps {
  code: string
  doneLabel: string
  onDone: () => void
  busy?: boolean
}

type CopyTarget = 'code' | 'shortcut'

export function CodeRevealPanel({ code, doneLabel, onDone, busy = false }: CodeRevealPanelProps) {
  const [noted, setNoted] = useState(false)
  const [copied, setCopied] = useState<CopyTarget | null>(null)
  const formatted = formatAccessCode(code)
  const shortcut = `${window.location.origin}/#${formatted}`

  async function copy(target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(target === 'code' ? formatted : shortcut)
      setCopied(target)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      // WHY: presse-papiers indisponible (contexte non sécurisé) : le code reste affiché et sélectionnable.
    }
  }

  return (
    <div>
      <p className="mb-4 select-all rounded-xl border border-dashed border-[var(--color-accent)] bg-[var(--color-bg-light)] px-4 py-5 text-center font-mono text-[26px] font-bold tracking-[0.08em] text-[var(--color-primary)] sm:text-[28px]">
        {formatted}
      </p>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SecondaryButton onClick={() => copy('code')}>
          {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'code' ? 'Copié' : 'Copier le code'}
        </SecondaryButton>
        <SecondaryButton onClick={() => copy('shortcut')}>
          {copied === 'shortcut' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'shortcut' ? 'Copié' : 'Copier le raccourci'}
        </SecondaryButton>
      </div>
      <label className="mb-5 flex cursor-pointer items-center gap-3 text-[15px] text-[var(--color-ink)]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-primary)]"
          checked={noted}
          onChange={(event) => setNoted(event.target.checked)}
        />
        J'ai noté mon code
      </label>
      <PrimaryButton disabled={!noted || busy} onClick={onDone}>{doneLabel}</PrimaryButton>
    </div>
  )
}
```

- [ ] **Step 4 : écran d'accueil (code)**

Créer `src/components/access/AccessCodeScreen.tsx` :

```tsx
import { useState, type FormEvent } from 'react'
import { formatAccessCode, normalizeAccessCode } from '@/lib/accessCode'
import { AccessLayout } from './AccessLayout'
import { ErrorText, Eyebrow, Field, Lead, Note, OutlineButton, PrimaryButton, TextButton, Title } from './accessUi'

interface AccessCodeScreenProps {
  initialCode?: string
  busy: boolean
  creating: boolean
  error: string | null
  onSubmit: (code: string) => void
  onCreate: () => void
  onMagicLink: () => void
}

function toDisplay(input: string): string {
  return formatAccessCode(normalizeAccessCode(input).slice(0, 12))
}

export function AccessCodeScreen({ initialCode = '', busy, creating, error, onSubmit, onCreate, onMagicLink }: AccessCodeScreenProps) {
  const [value, setValue] = useState(() => toDisplay(initialCode))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <AccessLayout headerAction={<OutlineButton onClick={onCreate} disabled={creating || busy}>Créer un tableau</OutlineButton>}>
      <Eyebrow>Accès à ton tableau</Eyebrow>
      <Title>Entre ton code d'accès</Title>
      <Lead>Le code t'a été donné à la création de ton tableau.</Lead>
      <Note>12 caractères : ce code ouvre toutes tes candidatures.</Note>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="access-code"
          label="Code d'accès"
          value={value}
          onChange={(event) => setValue(toDisplay(event.target.value))}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          invalid={error !== null}
          className="font-mono tracking-[0.08em]"
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton type="submit" disabled={busy || creating}>Ouvrir mon tableau</PrimaryButton>
      </form>
      <TextButton onClick={onMagicLink}>Tableau sécurisé par email ? Recevoir un lien de connexion</TextButton>
    </AccessLayout>
  )
}
```

- [ ] **Step 5 : écran « Tableau créé »**

Créer `src/components/access/BoardCreatedScreen.tsx` :

```tsx
import { AccessLayout } from './AccessLayout'
import { CodeRevealPanel } from './CodeRevealPanel'
import { ErrorText, Eyebrow, Note, Title } from './accessUi'

interface BoardCreatedScreenProps {
  code: string
  busy: boolean
  error: string | null
  onOpen: () => void
}

export function BoardCreatedScreen({ code, busy, error, onOpen }: BoardCreatedScreenProps) {
  return (
    <AccessLayout>
      <Eyebrow>Tableau créé</Eyebrow>
      <Title>Voici ton code d'accès</Title>
      <Note>Note-le : il ne sera plus jamais affiché. Sans lui (ou sans email rattaché), le tableau est perdu.</Note>
      {error && <ErrorText>{error}</ErrorText>}
      <CodeRevealPanel code={code} doneLabel="Ouvrir mon tableau" onDone={onOpen} busy={busy} />
    </AccessLayout>
  )
}
```

- [ ] **Step 6 : écrans du lien magique**

Créer `src/components/access/MagicLinkScreen.tsx` :

```tsx
import { useState, type FormEvent } from 'react'
import { AccessLayout } from './AccessLayout'
import { ErrorText, Eyebrow, Field, Lead, PrimaryButton, TextButton, Title } from './accessUi'

interface MagicLinkScreenProps {
  busy: boolean
  error: string | null
  onSubmit: (email: string) => void
  onBack: () => void
}

export function MagicLinkScreen({ busy, error, onSubmit, onBack }: MagicLinkScreenProps) {
  const [email, setEmail] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(email)
  }

  return (
    <AccessLayout>
      <Eyebrow>Tableau sécurisé</Eyebrow>
      <Title>Reçois ton lien de connexion</Title>
      <Lead>Tape l'email rattaché à ton tableau. On t'envoie un lien qui l'ouvre directement.</Lead>
      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <Field
          id="magic-link-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="prenom@exemple.fr"
          autoComplete="email"
          invalid={error !== null}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton type="submit" disabled={busy}>Recevoir mon lien</PrimaryButton>
      </form>
      <TextButton onClick={onBack}>← J'ai mon code</TextButton>
    </AccessLayout>
  )
}
```

Créer `src/components/access/MagicLinkSentScreen.tsx` :

```tsx
import { AccessLayout } from './AccessLayout'
import { Eyebrow, Lead, TextButton, Title } from './accessUi'

interface MagicLinkSentScreenProps {
  onBack: () => void
}

export function MagicLinkSentScreen({ onBack }: MagicLinkSentScreenProps) {
  return (
    <AccessLayout>
      <Eyebrow>Tableau sécurisé</Eyebrow>
      <Title>Regarde ta boîte mail</Title>
      <Lead>Si un tableau est rattaché à cet email, tu vas recevoir un lien qui l'ouvre directement.</Lead>
      <TextButton onClick={onBack}>← J'ai mon code</TextButton>
    </AccessLayout>
  )
}
```

- [ ] **Step 7 : vérifications et commit**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe (ces composants ne sont encore utilisés nulle part ; ils seront branchés en Task 6).

```bash
git add src/components/access
git commit -F - <<'EOF'
feat: add access-code screens (home, created, magic link)

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 6 : porte d'accès et drapeau d'édition

**Files :**
- Modify : `src/config/editionCore.ts`
- Modify : `src/config/editionCore.test.ts`
- Create : `src/components/access/LiteAccessGate.tsx`
- Modify : `src/App.tsx` (import + branche « non connecté »)

**Interfaces :**
- Consumes : `useBoardAccess` (Task 4) ; `AccessCodeScreen`, `BoardCreatedScreen`, `MagicLinkScreen`, `MagicLinkSentScreen` (Task 5) ; `parseShortcutHash` (Task 1) ; `FEATURES` (`@/config/edition`).
- Produces : `FeatureKey = 'goals' | 'library' | 'ai' | 'accessCode'` ; `featuresFor('lite') = { goals: false, library: false, ai: false, accessCode: true }`, `featuresFor('full') = { goals: true, library: true, ai: true, accessCode: false }` ; composant `LiteAccessGate()` (sans props).

- [ ] **Step 1 : mettre à jour les tests d'édition (qui échouent)**

Dans `src/config/editionCore.test.ts`, remplacer :

```ts
  it('désactive toutes les fonctionnalités en lite', () => {
    expect(featuresFor('lite')).toEqual({ goals: false, library: false, ai: false })
  })

  it('active toutes les fonctionnalités en full', () => {
    expect(featuresFor('full')).toEqual({ goals: true, library: true, ai: true })
  })
```

par :

```ts
  it('désactive les fonctionnalités complètes et active l’accès par code en lite', () => {
    expect(featuresFor('lite')).toEqual({ goals: false, library: false, ai: false, accessCode: true })
  })

  it('active les fonctionnalités complètes et garde les comptes classiques en full', () => {
    expect(featuresFor('full')).toEqual({ goals: true, library: true, ai: true, accessCode: false })
  })
```

Remplacer :

```ts
  const NONE: FeatureFlags = { goals: false, library: false, ai: false }
  const ALL: FeatureFlags = { goals: true, library: true, ai: true }
```

par :

```ts
  const NONE: FeatureFlags = { goals: false, library: false, ai: false, accessCode: false }
  const ALL: FeatureFlags = { goals: true, library: true, ai: true, accessCode: true }
```

- [ ] **Step 2 : vérifier l'échec**

Run : `npx vitest run src/config/editionCore.test.ts`
Expected : FAIL sur les deux tests `featuresFor` (clé `accessCode` absente).

- [ ] **Step 3 : ajouter le drapeau**

Dans `src/config/editionCore.ts`, remplacer :

```ts
export type FeatureKey = 'goals' | 'library' | 'ai'
```

par :

```ts
export type FeatureKey = 'goals' | 'library' | 'ai' | 'accessCode'
```

et remplacer :

```ts
export function featuresFor(edition: Edition): FeatureFlags {
  const full = edition === 'full'
  return { goals: full, library: full, ai: full }
}
```

par :

```ts
export function featuresFor(edition: Edition): FeatureFlags {
  const full = edition === 'full'
  // WHY: accessCode est le seul drapeau propre à lite (entrée par code au lieu des comptes classiques).
  return { goals: full, library: full, ai: full, accessCode: !full }
}
```

- [ ] **Step 4 : vérifier que les tests passent**

Run : `npx vitest run src/config/editionCore.test.ts`
Expected : PASS, 9 tests.

- [ ] **Step 5 : porte d'accès**

Créer `src/components/access/LiteAccessGate.tsx` :

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { parseShortcutHash } from '@/lib/accessCode'
import { useBoardAccess } from '@/hooks/useBoardAccess'
import { AccessCodeScreen } from './AccessCodeScreen'
import { BoardCreatedScreen } from './BoardCreatedScreen'
import { MagicLinkScreen } from './MagicLinkScreen'
import { MagicLinkSentScreen } from './MagicLinkSentScreen'

type GateState =
  | { step: 'code' }
  | { step: 'created'; code: string; tokenHash: string }
  | { step: 'magic' }
  | { step: 'magic-sent' }

export function LiteAccessGate() {
  const { createBoard, enterBoard, openBoard, requestMagicLink } = useBoardAccess()
  const [state, setState] = useState<GateState>({ step: 'code' })
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shortcutCode] = useState(() => parseShortcutHash(window.location.hash) ?? '')
  const shortcutHandled = useRef(false)

  // WHY: en cas de succès, onAuthStateChange (useAuth) bascule l'app et démonte ce composant :
  // on ne remet donc busy à false qu'en cas d'erreur.
  const handleOpen = useCallback(async (code: string) => {
    setBusy(true)
    setError(null)
    const err = await openBoard(code)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }, [openBoard])

  useEffect(() => {
    if (!shortcutCode || shortcutHandled.current) return
    shortcutHandled.current = true
    // WHY: le code ne doit pas rester dans l'adresse (historique, partage d'écran).
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    void handleOpen(shortcutCode)
  }, [shortcutCode, handleOpen])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const result = await createBoard()
    setCreating(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setState({ step: 'created', code: result.code, tokenHash: result.tokenHash })
  }

  async function handleEnterCreated(tokenHash: string) {
    setBusy(true)
    setError(null)
    const err = await enterBoard(tokenHash)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }

  async function handleMagicLink(email: string) {
    setBusy(true)
    setError(null)
    const err = await requestMagicLink(email)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setState({ step: 'magic-sent' })
  }

  function goTo(next: GateState) {
    setError(null)
    setBusy(false)
    setState(next)
  }

  if (state.step === 'created') {
    return <BoardCreatedScreen code={state.code} busy={busy} error={error} onOpen={() => handleEnterCreated(state.tokenHash)} />
  }
  if (state.step === 'magic') {
    return <MagicLinkScreen busy={busy} error={error} onSubmit={handleMagicLink} onBack={() => goTo({ step: 'code' })} />
  }
  if (state.step === 'magic-sent') {
    return <MagicLinkSentScreen onBack={() => goTo({ step: 'code' })} />
  }
  return (
    <AccessCodeScreen
      initialCode={shortcutCode}
      busy={busy}
      creating={creating}
      error={error}
      onSubmit={handleOpen}
      onCreate={handleCreate}
      onMagicLink={() => goTo({ step: 'magic' })}
    />
  )
}
```

- [ ] **Step 6 : brancher la porte dans `App.tsx`**

Remplacer :

```tsx
import { LoginPage } from '@/pages/LoginPage'
```

par :

```tsx
import { LoginPage } from '@/pages/LoginPage'
import { LiteAccessGate } from '@/components/access/LiteAccessGate'
```

Remplacer :

```tsx
  if (!isAuthenticated || !user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} onForgotPassword={sendPasswordReset} />
  }
```

par :

```tsx
  if (!isAuthenticated || !user) {
    // WHY: en lite, pas d'inscription : on entre par un code d'accès (spec lite-access-code §3.1).
    if (FEATURES.accessCode) return <LiteAccessGate />
    return <LoginPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} onForgotPassword={sendPasswordReset} />
  }
```

- [ ] **Step 7 : vérifications et commit**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe (lint : aucune alerte `react-hooks/exhaustive-deps`).

Run : `npm run build:lite`
Expected : `✓ Build lite propre …`, code de sortie 0.

```bash
git add src/config/editionCore.ts src/config/editionCore.test.ts src/components/access/LiteAccessGate.tsx src/App.tsx
git commit -F - <<'EOF'
feat: enter the lite edition with an access code instead of an account

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 7 : page « Mon tableau » et navigation lite

**Files :**
- Create : `src/hooks/useBoardUser.ts`
- Create : `src/components/access/DeleteBoardDialog.tsx`
- Create : `src/pages/MyBoardPage.tsx`
- Modify : `src/App.tsx` (routes `mon-tableau` / `profile`)
- Modify : `src/components/layout/Sidebar.tsx` (bloc du bas)
- Modify : `src/components/layout/MobileBottomNav.tsx` (3ᵉ onglet)
- Modify : `src/lib/i18n/translations.ts` (clé `sidebar.myBoard`)

**Interfaces :**
- Consumes : `useBoardAccess` (Task 4) ; `CodeRevealPanel`, briques `accessUi` (Task 5) ; `FEATURES.accessCode` (Task 6) ; `isBoardEmail` (Task 1).
- Produces : `useBoardUser(): { email: string | null; pendingEmail: string | null; refresh: () => Promise<void> }` ; `DeleteBoardDialog({ busy: boolean; error: string | null; onConfirm: () => void; onCancel: () => void })` ; `MyBoardPage()` (sans props) ; route `/mon-tableau` en lite ; clé de traduction `sidebar.myBoard`.

- [ ] **Step 1 : hook de l'utilisateur du tableau**

Créer `src/hooks/useBoardUser.ts` :

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BoardUserState {
  email: string | null
  pendingEmail: string | null
}

export function useBoardUser() {
  const [state, setState] = useState<BoardUserState>({ email: null, pendingEmail: null })

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    setState({ email: data.user?.email ?? null, pendingEmail: data.user?.new_email ?? null })
  }, [])

  useEffect(() => {
    void refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // WHY: ne pas appeler Supabase directement dans ce callback (risque de blocage documenté par supabase-js).
      if (event === 'USER_UPDATED') window.setTimeout(() => void refresh(), 0)
    })
    return () => subscription.unsubscribe()
  }, [refresh])

  return { ...state, refresh }
}
```

- [ ] **Step 2 : dialogue de suppression**

Créer `src/components/access/DeleteBoardDialog.tsx` :

```tsx
import { useState } from 'react'
import { ErrorText, Field, PrimaryButton, SecondaryButton } from './accessUi'

interface DeleteBoardDialogProps {
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

const CONFIRMATION_WORD = 'SUPPRIMER'

export function DeleteBoardDialog({ busy, error, onConfirm, onCancel }: DeleteBoardDialogProps) {
  const [typed, setTyped] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-board-title">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[var(--shadow-lg)]">
        <h2 id="delete-board-title" className="mb-2 text-[20px] font-bold text-[var(--color-danger)]">Supprimer mon tableau</h2>
        <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">
          Efface définitivement le tableau et toutes ses candidatures. Tape {CONFIRMATION_WORD} pour confirmer.
        </p>
        <Field
          id="delete-board-confirm"
          label="Confirmation"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Annuler</SecondaryButton>
          <PrimaryButton
            onClick={onConfirm}
            disabled={busy || typed !== CONFIRMATION_WORD}
            className="h-11 bg-[var(--color-danger)] text-[14px] hover:bg-[var(--color-danger-dark)] active:bg-[var(--color-danger-dark)]"
          >
            Supprimer définitivement
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : page « Mon tableau »**

Créer `src/pages/MyBoardPage.tsx` :

```tsx
import { useState, type FormEvent, type ReactNode } from 'react'
import { isBoardEmail } from '@/lib/accessCode'
import { cn } from '@/lib/utils'
import { useBoardAccess } from '@/hooks/useBoardAccess'
import { useBoardUser } from '@/hooks/useBoardUser'
import { CodeRevealPanel } from '@/components/access/CodeRevealPanel'
import { DeleteBoardDialog } from '@/components/access/DeleteBoardDialog'
import { ErrorText, Eyebrow, Field, PrimaryButton, SecondaryButton, Title } from '@/components/access/accessUi'

type PillTone = 'warning' | 'info' | 'success'

const PILL_STYLES: Record<PillTone, string> = {
  warning: 'bg-[var(--color-status-interview-bg)] text-[var(--color-status-interview-fg)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
}

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={cn('ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold', PILL_STYLES[tone])}>{children}</span>
}

function Section({ title, danger = false, children }: { title: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--color-border)] py-6">
      <h2 className={cn('mb-2 text-[17px] font-bold', danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-primary)]')}>{title}</h2>
      {children}
    </section>
  )
}

function Help({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">{children}</p>
}

export function MyBoardPage() {
  const { secureWithEmail, rotateCode, leaveBoard, deleteBoard } = useBoardAccess()
  const { email, pendingEmail, refresh } = useBoardUser()

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [rotateStep, setRotateStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const secured = email !== null && !isBoardEmail(email)

  async function sendConfirmation(target: string) {
    setEmailBusy(true)
    setEmailError(null)
    const err = await secureWithEmail(target)
    setEmailBusy(false)
    if (err) {
      setEmailError(err)
      return
    }
    setNewEmail('')
    await refresh()
  }

  function handleSecure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendConfirmation(newEmail)
  }

  async function handleRotate() {
    setRotateStep('busy')
    setRotateError(null)
    const result = await rotateCode()
    if ('error' in result) {
      setRotateError(result.error)
      setRotateStep('confirm')
      return
    }
    setRevealedCode(result.code)
    setRotateStep('idle')
  }

  async function handleDelete() {
    setDeleteBusy(true)
    setDeleteError(null)
    const err = await deleteBoard()
    // WHY: en cas de succès, la déconnexion renvoie vers l'accueil et démonte cette page.
    if (err) {
      setDeleteError(err)
      setDeleteBusy(false)
    }
  }

  const pill = secured
    ? <Pill tone="success">sécurisé</Pill>
    : pendingEmail
      ? <Pill tone="info">en attente de confirmation</Pill>
      : <Pill tone="warning">non sécurisé</Pill>

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Eyebrow>Réglages</Eyebrow>
      <Title>Mon tableau</Title>

      <Section title={<>Sécuriser avec mon email{pill}</>}>
        {secured ? (
          <Help>Sécurisé avec {email}</Help>
        ) : pendingEmail ? (
          <>
            <Help>Un email de confirmation a été envoyé à {pendingEmail}. Clique sur le lien reçu pour terminer.</Help>
            {emailError && <ErrorText>{emailError}</ErrorText>}
            <SecondaryButton onClick={() => void sendConfirmation(pendingEmail)} disabled={emailBusy}>Renvoyer</SecondaryButton>
          </>
        ) : (
          <form onSubmit={handleSecure} noValidate>
            <Help>Pour retrouver ton tableau par lien magique si tu perds ton code.</Help>
            <Field id="secure-email" label="Email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="prenom@exemple.fr" autoComplete="email" invalid={emailError !== null} />
            {emailError && <ErrorText>{emailError}</ErrorText>}
            <SecondaryButton type="submit" disabled={emailBusy}>Envoyer l'email de confirmation</SecondaryButton>
          </form>
        )}
      </Section>

      <Section title="Code d'accès">
        {revealedCode ? (
          <>
            <Help>Voici ton nouveau code. Note-le : il ne sera plus jamais affiché.</Help>
            <CodeRevealPanel code={revealedCode} doneLabel="Fermer" onDone={() => setRevealedCode(null)} />
          </>
        ) : rotateStep === 'idle' ? (
          <>
            <Help>Ton code a fuité ? Génère-en un nouveau : l'ancien ne marchera plus.</Help>
            <SecondaryButton onClick={() => setRotateStep('confirm')}>Générer un nouveau code</SecondaryButton>
          </>
        ) : (
          <>
            <Help>L'ancien code ne marchera plus. Continuer ?</Help>
            {rotateError && <ErrorText>{rotateError}</ErrorText>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={() => { setRotateStep('idle'); setRotateError(null) }} disabled={rotateStep === 'busy'}>Annuler</SecondaryButton>
              <PrimaryButton className="h-11 text-[14px]" onClick={() => void handleRotate()} disabled={rotateStep === 'busy'}>Générer</PrimaryButton>
            </div>
          </>
        )}
      </Section>

      <Section title="Quitter ce tableau">
        <Help>Ferme le tableau sur cet appareil. Il faudra retaper le code.</Help>
        <SecondaryButton onClick={() => void leaveBoard()}>Quitter ce tableau</SecondaryButton>
      </Section>

      <Section title="Supprimer mon tableau" danger>
        <Help>Efface définitivement le tableau et toutes ses candidatures.</Help>
        <SecondaryButton
          className="border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-red-light)] active:bg-[var(--color-red-light)]"
          onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
        >
          Supprimer…
        </SecondaryButton>
      </Section>

      {deleteOpen && (
        <DeleteBoardDialog busy={deleteBusy} error={deleteError} onConfirm={() => void handleDelete()} onCancel={() => setDeleteOpen(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4 : clé de traduction**

Dans `src/lib/i18n/translations.ts`, remplacer :

```ts
    'sidebar.expand': 'Agrandir la navigation',
```

par :

```ts
    'sidebar.expand': 'Agrandir la navigation',
    'sidebar.myBoard': 'Mon tableau',
```

et remplacer :

```ts
    'sidebar.expand': 'Expand navigation',
```

par :

```ts
    'sidebar.expand': 'Expand navigation',
    'sidebar.myBoard': 'My board',
```

- [ ] **Step 5 : routes dans `App.tsx`**

Remplacer :

```tsx
import { ProfilePage } from '@/pages/ProfilePage'
```

par :

```tsx
import { ProfilePage } from '@/pages/ProfilePage'
import { MyBoardPage } from '@/pages/MyBoardPage'
```

Remplacer :

```tsx
          <Route path="profile" element={<ProfilePage userId={user.id} userEmail={user.email} />} />
```

par :

```tsx
          {FEATURES.accessCode
            ? <Route path="mon-tableau" element={<MyBoardPage />} />
            : <Route path="profile" element={<ProfilePage userId={user.id} userEmail={user.email} />} />}
```

(En lite, `/profile` tombe sur la route `*` existante → `/` ; en full, `/mon-tableau` aussi.)

- [ ] **Step 6 : bas de la sidebar**

Dans `src/components/layout/Sidebar.tsx`, remplacer :

```tsx
import { LayoutDashboard, Briefcase, Target, BookOpen, LogOut, Menu } from 'lucide-react'
```

par :

```tsx
import { LayoutDashboard, Briefcase, Target, BookOpen, LogOut, Menu, Settings } from 'lucide-react'
```

Remplacer :

```tsx
        <div className="mx-1.5 mb-3 h-px" style={{ background: 'var(--color-nav-divider)' }} />
        <div className={`flex items-center gap-2.5 px-2 ${collapsed ? 'flex-col' : ''}`}>
```

par :

```tsx
        <div className="mx-1.5 mb-3 h-px" style={{ background: 'var(--color-nav-divider)' }} />
        {FEATURES.accessCode ? (
          // WHY: en lite, l'email du compte est technique (board-…@boards.jobtracker.invalid) : ni nom ni email affichés.
          <SidebarItem to="/mon-tableau" label={t('sidebar.myBoard')} icon={Settings} collapsed={collapsed} />
        ) : (
        <div className={`flex items-center gap-2.5 px-2 ${collapsed ? 'flex-col' : ''}`}>
```

Remplacer :

```tsx
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
```

par :

```tsx
            <LogOut size={15} />
          </button>
        </div>
        )}
      </div>
    </aside>
```

- [ ] **Step 7 : onglet mobile**

Dans `src/components/layout/MobileBottomNav.tsx`, remplacer :

```tsx
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { VISIBLE_NAV_LINKS } from './Sidebar'
import { useTranslation } from '@/lib/i18n/I18nContext'
```

par :

```tsx
import { NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/config/edition'
import { VISIBLE_NAV_LINKS } from './Sidebar'
import { useTranslation } from '@/lib/i18n/I18nContext'

// WHY: en lite, « Mon tableau » remplace le profil et devient le dernier onglet mobile.
const MOBILE_LINKS: typeof VISIBLE_NAV_LINKS = FEATURES.accessCode
  ? [...VISIBLE_NAV_LINKS, { to: '/mon-tableau', labelKey: 'sidebar.myBoard', icon: Settings }]
  : VISIBLE_NAV_LINKS
```

Remplacer :

```tsx
        gridTemplateColumns: `repeat(${VISIBLE_NAV_LINKS.length}, minmax(0, 1fr))`,
```

par :

```tsx
        gridTemplateColumns: `repeat(${MOBILE_LINKS.length}, minmax(0, 1fr))`,
```

Remplacer :

```tsx
      {VISIBLE_NAV_LINKS.map(({ to, labelKey, icon: Icon }) => (
```

par :

```tsx
      {MOBILE_LINKS.map(({ to, labelKey, icon: Icon }) => (
```

- [ ] **Step 8 : vérifications**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

Run : `npm run build:lite`
Expected : `✓ Build lite propre …`, code de sortie 0.

- [ ] **Step 9 : commit**

```bash
git add src/hooks/useBoardUser.ts src/components/access/DeleteBoardDialog.tsx src/pages/MyBoardPage.tsx src/App.tsx src/components/layout/Sidebar.tsx src/components/layout/MobileBottomNav.tsx src/lib/i18n/translations.ts
git commit -F - <<'EOF'
feat: add "Mon tableau" page and lite navigation entry

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

### Task 8 : documentation et vérification finale

**Files :**
- Modify : `CLAUDE.md` (nouvelle section après « 🧩 Éditions lite / full »)

**Interfaces :**
- Consumes : tout ce qui précède.
- Produces : rien.

- [ ] **Step 1 : documenter l'accès par code**

Dans `CLAUDE.md`, remplacer :

```md
- Spec : `docs/superpowers/specs/2026-09-13-lite-edition-design.md`.

---

## 🎨 Direction design
```

par :

```md
- Spec : `docs/superpowers/specs/2026-09-13-lite-edition-design.md`.

---

## 🔑 Accès par code (édition lite)

- En `lite`, pas d'inscription : `LiteAccessGate` (écran « Entre ton code d'accès », création, lien magique) remplace `LoginPage`, et `MyBoardPage` (`/mon-tableau`) remplace `ProfilePage`. Drapeau : `FEATURES.accessCode`.
- Un tableau = un utilisateur Supabase Auth `board-<uuid>@boards.jobtracker.invalid` créé par la fonction `board-create`. Le code (12 symboles de `23456789ABCDEFGHJKMNPQRSTVWXYZ`) est stocké en `HMAC-SHA-256(CODE_PEPPER)` dans `board_access` ; `board-open` renvoie un `hashed_token` que le client échange avec `verifyOtp({ type: 'magiclink' })`.
- Fonctions : `board-create` et `board-open` sans JWT, `board-rotate-code` et `board-delete` avec JWT. Toute la logique est dans `supabase/functions/_shared/boardHandlers.ts` (pur, testé par Vitest) ; les `index.ts` restent minces. `deno` et la CLI Supabase ne sont pas installés en local.
- Règles : ne jamais stocker ni journaliser un code en clair ; ne jamais afficher l'email technique ; pour supprimer un tableau, `board-delete` (pas `delete-account`, qui laisse les lignes keyées par `userId` texte).
- Configuration Supabase requise : secret `CODE_PEPPER`, migration `20260913120000_board_access.sql`, déploiement des 4 fonctions, « Secure email change » désactivé, SMTP personnalisé, URLs de redirection.
- Spec : `docs/superpowers/specs/2026-09-13-lite-access-code-design.md`.

---

## 🎨 Direction design
```

- [ ] **Step 2 : vérifications statiques**

Run : `npx tsc && npm run lint && npm test`
Expected : tout passe.

Run : `grep -rn "console\." supabase/functions/_shared supabase/functions/board-create supabase/functions/board-open supabase/functions/board-rotate-code supabase/functions/board-delete`
Expected : aucune ligne (rien n'est journalisé).

- [ ] **Step 3 : builds**

Run : `npm run build:full && node scripts/check-lite-bundle.mjs; echo "exit=$?"`
Expected : build réussi puis `exit=1` (l'édition full contient toujours l'IA).

Run (en dernier, pour que `dist/` soit l'édition lite) : `npm run build:lite`
Expected : `✓ Build lite propre …`, code de sortie 0.

Run : `grep -rl "SUPABASE_SERVICE_ROLE_KEY\|CODE_PEPPER\|service_role" dist | wc -l`
Expected : `0`.

- [ ] **Step 4 : commit**

```bash
git add CLAUDE.md
git commit -F - <<'EOF'
docs: document the lite access-code flow in CLAUDE.md

Co-Authored-By: <nom du modèle> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LMc9NRAq21B1a42JsZwekF
EOF
```

---

## Étapes contrôleur — projet Supabase live (jamais par un exécutant)

Chaque étape ci-dessous touche le projet Supabase de l'utilisateur : le contrôleur **demande son accord explicite avant chacune**, n'affiche jamais une clé ou un secret, et ne commite rien de ce qu'il crée pour l'occasion. **C1 se fait avant la Task 1** ; C2 à C6 après la Task 8.

- **C1 · Domaine technique accepté ?** Avec accord : script jetable dans le scratchpad (non commité), qui lit `VITE_SUPABASE_URL` et `SUPABASE_SERVICE_KEY` depuis `.env.local` sans les afficher, puis :
  1. `auth.admin.createUser({ email: 'board-verif-<uuid>@boards.jobtracker.invalid', email_confirm: true })` → doit réussir ;
  2. `auth.admin.generateLink({ type: 'magiclink', email })` → doit renvoyer `properties.hashed_token` ;
  3. `auth.admin.deleteUser(id)` → nettoyage, à faire même si l'étape 2 échoue.

  Si Supabase refuse l'email : arrêter, demander un domaine à l'utilisateur, remplacer `BOARD_EMAIL_DOMAIN` et les emails des tests (Tasks 1 et 2) avant de continuer.
- **C2 · Secret `CODE_PEPPER`.** L'utilisateur génère 32 octets aléatoires (`! openssl rand -hex 32`) et les enregistre dans Supabase → Edge Functions → Secrets. La valeur n'est ni collée dans la conversation ni commitée.
- **C3 · Migration.** L'utilisateur exécute `supabase/migrations/20260913120000_board_access.sql` dans l'éditeur SQL du tableau de bord (la CLI n'est pas installée), puis vérifie que `board_access`, `access_attempts` et `hit_rate_limit` existent.
- **C4 · Déploiement des fonctions.** L'utilisateur crée un jeton d'accès Supabase, puis lance lui-même, depuis le worktree : `! npx supabase functions deploy board-create board-open board-rotate-code board-delete --project-ref fcclyjaaaiwaoovxduzj` (le `verify_jwt` de chaque fonction vient de `supabase/config.toml`).
- **C5 · Réglages Auth.** Dans le tableau de bord : désactiver « Secure email change », configurer le SMTP personnalisé, ajouter `http://localhost:5174` (et le domaine de prod) aux URLs de redirection.
- **C6 · Test d'intégration et navigateur.** Scénario de la spec §6 sur `VITE_EDITION=lite npm run dev -- --port 5174` :
  1. créer un tableau, puis l'ouvrir avec le code dans un autre navigateur ;
  2. ajouter une candidature et une étape ;
  3. générer un nouveau code : l'ancien est refusé, le nouveau marche ;
  4. envoyer 11 codes faux : le 11ᵉ renvoie 429 ;
  5. sécuriser avec un email, puis suivre le lien magique ;
  6. supprimer le tableau : le code est refusé ensuite et plus aucune ligne ne subsiste.

  Ensuite, vérifier l'édition `full` : connexion classique et page Profil inchangées. Le contrôle visuel se fait avec l'extension Chrome si elle est connectée, sinon avec la liste à cocher donnée à l'utilisateur.
