# Liquid Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle JobTracker into the "Liquid Glass" aesthetic (dark gradient hero header on mobile, translucent/blurred surfaces, floating glass bottom nav) while reducing on-screen information density via collapsible secondary sections, without touching the backend or removing any existing functionality.

**Architecture:** New CSS tokens for the gradient/glass surfaces; three new presentational components (`HeroHeader`, `GlassStatRow`) plus one small persistence utility (`useCollapsible`) shared by the three pages that need progressive disclosure (Dashboard, Library, Goals). `DashboardCard` and `CardShell` (Goals) gain optional collapsible behavior via new props rather than being wrapped — this avoids double card chrome. `MobileBottomNav` and `Sidebar` get the glass treatment. Desktop layout is unchanged except for the sidebar's glass surface (per spec decision: no hero band in desktop content).

**Tech Stack:** React 18 + TypeScript, Tailwind CSS (utility classes + CSS custom properties in `src/index.css` / `src/styles/tokens.css`), Vitest for the one piece of testable logic (`useCollapsible`'s underlying storage helpers), Capacitor for iOS.

## Global Constraints

- No backend changes (no Supabase migration, no RLS, no schema change).
- No existing functionality removed — `MobileBottomNav` keeps all 4 existing nav links (`NAV_LINKS` from `Sidebar.tsx`), the FAB is a 5th, additional element.
- Desktop layout structure stays as-is; only the sidebar surface becomes translucent. No new hero band in desktop content (per approved spec decision).
- One single fixed visual design — no light/dark toggle (the earlier toggle plan was superseded by this spec).
- Deviation from the spec's literal wording, decided during planning for technical soundness: instead of one generic `CollapsibleSection` *visual* wrapper reused verbatim on 3 differently-styled pages, ship one shared **persistence hook** (`useCollapsible`) and add collapsible behavior as optional props on each page's *existing* card component (`DashboardCard`, `CardShell`) — this preserves each page's own visual chrome instead of forcing a single generic card style onto Dashboard/Goals/Library, which look different today.
- Deviation: the spec's "bouton recherche" in the HeroHeader is dropped — there is no search feature anywhere in the app, and adding a non-functional button violates YAGNI. The avatar bubble links to `/profile` (a real, existing route) instead.
- Run `npx tsc --noEmit` and `npm run build` after every task that touches `.tsx`/`.ts` files — both must be clean before moving to the next task.

---

### Task 1: Glass & gradient CSS tokens

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/index.css:165-170` (the `.card` rule block)

**Interfaces:**
- Produces: CSS custom properties `--gradient-hero`, `--glass-bg-dark`, `--glass-border-dark`, `--glass-bg-light`, `--glass-blur`, `--glass-blur-light`, and a `.card-glass` utility class — consumed by every later task.

- [ ] **Step 1: Add the new tokens**

In `src/styles/tokens.css`, add after the existing `--color-nav-bg-end: #002A40;` line:

```css
  --gradient-hero: linear-gradient(160deg, #0A2A4A 0%, #0F3D63 45%, #0A2A4A 100%);
  --glass-bg-dark: rgba(15, 32, 56, 0.55);
  --glass-border-dark: rgba(255, 255, 255, 0.18);
  --glass-bg-light: rgba(255, 255, 255, 0.6);
  --glass-blur: blur(20px) saturate(160%);
  --glass-blur-light: blur(12px) saturate(140%);
```

- [ ] **Step 2: Add the `.card-glass` utility**

In `src/index.css`, right after the closing `}` of the existing `.card` rule (around line 170), add:

```css
  .card-glass {
    @apply rounded-[var(--radius-lg)];
    background: var(--glass-bg-light);
    backdrop-filter: var(--glass-blur-light);
    -webkit-backdrop-filter: var(--glass-blur-light);
    border: 1px solid rgba(148, 163, 184, 0.25);
    box-shadow: var(--shadow-soft);
  }
```

- [ ] **Step 3: Verify the build picks up the new CSS**

Run: `npm run build`
Expected: build succeeds, `dist/assets/index-*.css` is produced with no errors (the new rules aren't used by any component yet, so there's nothing to visually check — this step only confirms the CSS is syntactically valid).

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/index.css
git commit -m "feat: add Liquid Glass color and blur tokens"
```

---

### Task 2: `useCollapsible` persistence hook

**Files:**
- Create: `src/lib/collapsibleStorage.ts`
- Create: `src/lib/collapsibleStorage.test.ts`
- Create: `src/hooks/useCollapsible.ts`

**Interfaces:**
- Produces: `getInitialOpenState(storage: KeyValueStorage, sectionId: string, defaultOpen: boolean): boolean`, `persistOpenState(storage: KeyValueStorage, sectionId: string, open: boolean): void`, and the hook `useCollapsible(sectionId: string, defaultOpen?: boolean): { open: boolean; toggle: () => void }`.
- Consumed by: Task 7 (`DashboardCard`), Task 8 (Library sections), Task 9 (`CardShell`).

- [ ] **Step 1: Write the failing test for the storage helpers**

Create `src/lib/collapsibleStorage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getInitialOpenState, persistOpenState, type KeyValueStorage } from './collapsibleStorage'

function fakeStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const store = { ...initial }
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value },
  }
}

describe('getInitialOpenState', () => {
  it('returns defaultOpen when nothing is stored yet', () => {
    expect(getInitialOpenState(fakeStorage(), 'objectif-du-mois', false)).toBe(false)
    expect(getInitialOpenState(fakeStorage(), 'objectif-du-mois', true)).toBe(true)
  })

  it('returns the stored value when present, regardless of defaultOpen', () => {
    const storage = fakeStorage({ 'jobtracker-section-objectif-du-mois': 'true' })
    expect(getInitialOpenState(storage, 'objectif-du-mois', false)).toBe(true)
  })

  it('treats a stored "false" as closed even if defaultOpen is true', () => {
    const storage = fakeStorage({ 'jobtracker-section-objectif-du-mois': 'false' })
    expect(getInitialOpenState(storage, 'objectif-du-mois', true)).toBe(false)
  })
})

describe('persistOpenState', () => {
  it('writes the open state under a namespaced key', () => {
    const storage = fakeStorage()
    persistOpenState(storage, 'pipeline', true)
    expect(storage.getItem('jobtracker-section-pipeline')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/collapsibleStorage.test.ts`
Expected: FAIL with "Cannot find module './collapsibleStorage'" (the module doesn't exist yet).

- [ ] **Step 3: Implement the storage helpers**

Create `src/lib/collapsibleStorage.ts`:

```ts
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function storageKey(sectionId: string): string {
  return `jobtracker-section-${sectionId}`
}

export function getInitialOpenState(storage: KeyValueStorage, sectionId: string, defaultOpen: boolean): boolean {
  const raw = storage.getItem(storageKey(sectionId))
  if (raw === null) return defaultOpen
  return raw === 'true'
}

export function persistOpenState(storage: KeyValueStorage, sectionId: string, open: boolean): void {
  storage.setItem(storageKey(sectionId), String(open))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/collapsibleStorage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the `useCollapsible` hook on top of the helpers**

Create `src/hooks/useCollapsible.ts`:

```ts
import { useState } from 'react'
import { getInitialOpenState, persistOpenState } from '@/lib/collapsibleStorage'

export function useCollapsible(sectionId: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => getInitialOpenState(window.localStorage, sectionId, defaultOpen))

  function toggle() {
    const next = !open
    setOpen(next)
    persistOpenState(window.localStorage, sectionId, next)
  }

  return { open, toggle }
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/collapsibleStorage.ts src/lib/collapsibleStorage.test.ts src/hooks/useCollapsible.ts
git commit -m "feat: add useCollapsible hook with localStorage-backed persistence"
```

---

### Task 3: `HeroHeader` component

**Files:**
- Create: `src/components/layout/HeroHeader.tsx`

**Interfaces:**
- Produces: `HeroHeader` React component with props `{ title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; stats?: ReactNode; className?: string }`.
- Consumed by: Task 8 (Dashboard), Task 9 (Library), Task 10 (Goals), Task 11 (Applications).

- [ ] **Step 1: Implement the component**

Create `src/components/layout/HeroHeader.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface HeroHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  stats?: ReactNode
  className?: string
}

export function HeroHeader({ title, subtitle, actions, stats, className }: HeroHeaderProps) {
  return (
    <div
      className={cn('md:hidden flex flex-col gap-4 px-4 pb-5 -mx-4 -mt-4', className)}
      style={{ background: 'var(--gradient-hero)', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[22px] font-bold leading-tight text-white">{title}</div>
          {subtitle && <p className="text-[13px] text-white/70 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {stats}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (component isn't used yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/HeroHeader.tsx
git commit -m "feat: add HeroHeader component for mobile gradient page headers"
```

---

### Task 4: `GlassStatRow` component

**Files:**
- Create: `src/components/ui/GlassStatRow.tsx`
- Modify: `src/pages/DashboardPage.tsx:340-373` (replace the mobile compact stat strip added in the previous session with this shared component)

**Interfaces:**
- Consumes: `heroCards: { label: string; value: ReactNode; icon: ReactNode }[]`, `loading: boolean` (already exist in `DashboardPage.tsx`).
- Produces: `GlassStatRow` component rendering icon-bubble stats with no card container, meant to sit directly on `HeroHeader`'s gradient.

- [ ] **Step 1: Implement the component**

Create `src/components/ui/GlassStatRow.tsx`:

```tsx
import type { ReactNode } from 'react'

interface HeroCard {
  label: string
  value: ReactNode
  icon: ReactNode
}

interface GlassStatRowProps {
  cards: HeroCard[]
  loading: boolean
}

export function GlassStatRow({ cards, loading }: GlassStatRowProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {cards.map(({ label, value, icon }) => (
        loading ? (
          <div key={label} className="h-[58px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.12)' }} />
        ) : (
          <div key={label} className="flex flex-col items-center gap-1.5 text-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              {icon}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-extrabold text-white leading-none">{value}</span>
              <span className="text-[9px] text-white/70 truncate max-w-[60px]">{label}</span>
            </div>
          </div>
        )
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Replace the mobile stat strip in `DashboardPage.tsx`**

Find this block (added in the previous session, lines ~351-373):

```tsx
        {/* Hero numbers — mobile: compact single-row scroll strip, much lighter than 3 stacked rows */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 flex-shrink-0 snap-x snap-mandatory no-scrollbar">
          {heroCards.map(({ label, value, icon }) => (
            loading ? (
              <div key={label} className="rounded-2xl h-[52px] w-[130px] shrink-0 animate-pulse" style={{ background: 'var(--color-bg)' }} />
            ) : (
              <div
                key={label}
                className="flex items-center gap-2 rounded-2xl px-3 py-2 shrink-0 snap-start min-w-[128px]"
                style={{ background: 'var(--color-primary)' }}
              >
                <div className="w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0 text-white" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  {icon}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[9px] font-semibold text-white/70 truncate">{label}</span>
                  <span className="text-[16px] font-extrabold text-white leading-none">{value}</span>
                </div>
              </div>
            )
          ))}
        </div>
```

Delete it entirely (the mobile stats now live inside `HeroHeader` via `GlassStatRow`, wired in Task 8). Leave the desktop block (`hidden lg:grid ...`) immediately above it untouched.

- [ ] **Step 3: Add the import**

In `src/pages/DashboardPage.tsx`, add to the imports (the `GlassStatRow` import will be used starting Task 8, but add it now so the file compiles cleanly once Task 8 references it):

```tsx
import { GlassStatRow } from '@/components/ui/GlassStatRow'
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Note `GlassStatRow` will show as unused until Task 8 — that's fine, it'll be consumed in the very next task; if your linter/tsc complains about the unused import before Task 8 runs, that's expected and resolved by Task 8 in the same work session.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GlassStatRow.tsx src/pages/DashboardPage.tsx
git commit -m "feat: add GlassStatRow component, remove now-superseded mobile stat strip"
```

---

### Task 5: `MobileBottomNav` glass pill + floating FAB

**Files:**
- Modify: `src/components/layout/MobileBottomNav.tsx` (full rewrite)
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `NAV_LINKS` exported from `src/components/layout/Sidebar.tsx` (shape: `{ to: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[]`, 4 entries: Dashboard, Applications, Goals, Library).
- Consumes: `onAddApplication: () => void`, threaded from `AppShell`'s existing prop of the same name (already defined in `AppShellProps`).
- Produces: `MobileBottomNav` now requires an `onAddApplication: () => void` prop (breaking change to its signature, fixed up in this same task inside `AppShell.tsx`).

- [ ] **Step 1: Rewrite `MobileBottomNav.tsx`**

Replace the full contents of `src/components/layout/MobileBottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from './Sidebar'
import { useTranslation } from '@/lib/i18n/I18nContext'

interface MobileBottomNavProps {
  onAddApplication: () => void
}

function NavItem({ to, labelKey, icon: Icon }: (typeof NAV_LINKS)[number]) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 py-2 no-underline transition-colors duration-150',
          isActive ? 'text-white' : 'text-white/60',
        )
      }
    >
      <Icon size={18} />
      <span className="text-[9px] font-medium leading-none">{t(labelKey)}</span>
    </NavLink>
  )
}

export function MobileBottomNav({ onAddApplication }: MobileBottomNavProps) {
  const { t } = useTranslation()
  const left = NAV_LINKS.slice(0, 2)
  const right = NAV_LINKS.slice(2)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 mx-4 mb-3 rounded-full grid grid-cols-5 items-center"
      style={{
        background: 'var(--glass-bg-dark)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border-dark)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {left.map((link) => <NavItem key={link.to} {...link} />)}

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onAddApplication}
          aria-label={t('applications.new')}
          title={t('applications.new')}
          className="w-12 h-12 rounded-full flex items-center justify-center -translate-y-3 transition-transform duration-150 active:scale-95"
          style={{ background: 'var(--color-accent)', color: '#ffffff', boxShadow: '0 6px 16px rgba(0, 126, 167, 0.5)' }}
        >
          <Plus size={22} />
        </button>
      </div>

      {right.map((link) => <NavItem key={link.to} {...link} />)}
    </nav>
  )
}
```

- [ ] **Step 2: Thread `onAddApplication` through `AppShell`**

In `src/components/layout/AppShell.tsx`, find:

```tsx
      <MobileBottomNav />
```

Replace with:

```tsx
      <MobileBottomNav onAddApplication={onAddApplication} />
```

(`onAddApplication` is already a prop of `AppShell` per its existing `AppShellProps` interface — no other change needed in this file for this step.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/MobileBottomNav.tsx src/components/layout/AppShell.tsx
git commit -m "feat: redesign mobile bottom nav as a floating glass pill with elevated FAB"
```

---

### Task 6: `Sidebar` desktop glass treatment

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:54-58`

**Interfaces:**
- No prop/signature changes — purely a style change.

- [ ] **Step 1: Replace the sidebar background**

Find in `src/components/layout/Sidebar.tsx`:

```tsx
      style={{
        width: collapsed ? '68px' : 'var(--sidebar-w)',
        background: 'linear-gradient(175deg, var(--color-nav-bg) 0%, var(--color-nav-bg-end) 100%)',
      }}
```

Replace with:

```tsx
      style={{
        width: collapsed ? '68px' : 'var(--sidebar-w)',
        background: 'var(--gradient-hero)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--glass-border-dark)',
      }}
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: apply Liquid Glass treatment to desktop sidebar"
```

---

### Task 7: `DashboardCard` collapsible support

**Files:**
- Modify: `src/components/ui/DashboardCard.tsx` (full rewrite)

**Interfaces:**
- Produces: `DashboardCard` gains two new optional props, `sectionId?: string` and `defaultOpen?: boolean`. When `sectionId` is omitted, behavior is byte-for-byte identical to today (always expanded, no chevron) — this is what "Prochaine meilleure action" will keep using. When `sectionId` is provided, a chevron toggle appears (mobile only — `lg:` and up always shows the body) and the body's visibility is persisted via `useCollapsible` from Task 2.
- Consumes: `useCollapsible` from `src/hooks/useCollapsible.ts` (Task 2).

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `src/components/ui/DashboardCard.tsx`:

```tsx
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCollapsible } from '@/hooks/useCollapsible'

interface DashboardCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  sectionId?: string
  defaultOpen?: boolean
}

export function DashboardCard({
  title, subtitle, action, children, className, sectionId, defaultOpen = false,
}: DashboardCardProps) {
  const collapsible = sectionId !== undefined
  const { open, toggle } = useCollapsible(sectionId ?? title, defaultOpen)
  const bodyVisible = !collapsible || open

  return (
    <div className={`card px-4 py-3.5 flex flex-col gap-3 min-h-0 ${className ?? ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 min-w-0 bg-transparent border-0 p-0 text-left lg:pointer-events-none"
          >
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold leading-tight truncate" style={{ color: 'var(--color-primary)' }}>{title}</h3>
              {subtitle && <p className="text-[12px] text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
            </div>
            <ChevronDown
              size={16}
              className={cn('lg:hidden shrink-0 transition-transform duration-200', open ? 'rotate-180' : '')}
              style={{ color: 'var(--color-muted)' }}
            />
          </button>
        ) : (
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold leading-tight truncate" style={{ color: 'var(--color-primary)' }}>{title}</h3>
            {subtitle && <p className="text-[12px] text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn('flex-1 min-h-0 flex-col gap-3 overflow-hidden lg:flex', bodyVisible ? 'flex' : 'hidden')}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Apply `sectionId`/`defaultOpen` to the 4 secondary Dashboard cards**

In `src/pages/DashboardPage.tsx`, the card titled "Prochaine meilleure action" (around line 377) keeps `<DashboardCard title="Prochaine meilleure action" action={...}>` unchanged — no `sectionId`, so it stays always-expanded.

For the other four, add `sectionId` (and keep everything else the same):

- `<DashboardCard title="Objectif du mois" action={...}>` → `<DashboardCard title="Objectif du mois" sectionId="objectif-du-mois" action={...}>`
- `<DashboardCard title="Pipeline des candidatures" action={...}>` → `<DashboardCard title="Pipeline des candidatures" sectionId="pipeline" action={...}>`
- `<DashboardCard title="Relances urgentes" className="lg:col-span-1" action={...}>` → `<DashboardCard title="Relances urgentes" sectionId="relances" className="lg:col-span-1" action={...}>`
- `<DashboardCard title="Candidatures par semaine" action={...}>` → `<DashboardCard title="Candidatures par semaine" sectionId="candidatures-semaine" action={...}>`
- The "Activité récente" card (further down the file, not shown in the excerpts read during planning — locate it by its `title="Activité récente"` prop) → add `sectionId="activite-recente"`

None of these need `defaultOpen` (all default to closed on first visit, per the spec).

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/DashboardCard.tsx src/pages/DashboardPage.tsx
git commit -m "feat: make secondary Dashboard sections collapsible on mobile"
```

---

### Task 8: Wire `HeroHeader` + `GlassStatRow` into `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `HeroHeader` (Task 3), `GlassStatRow` (Task 4), `getInitial` from `@/lib/utils`.

- [ ] **Step 1: Add imports**

In `src/pages/DashboardPage.tsx`, add:

```tsx
import { Link as RouterLink } from 'react-router-dom'
import { HeroHeader } from '@/components/layout/HeroHeader'
import { getInitial } from '@/lib/utils'
```

(`Link` is already imported from `react-router-dom` on line 2 — reuse that existing import instead of adding `RouterLink`; only add `HeroHeader` and `getInitial`.)

- [ ] **Step 2: Hide the existing greeting header on mobile, add `HeroHeader` above it**

Find the existing header block:

```tsx
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mt-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            {t('dashboard.greeting')}{firstName ? ` ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--color-muted)' }}>{today}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-white text-sm font-semibold flex-shrink-0 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-cerulean) 100%)',
            boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--color-cerulean) 55%, transparent)',
          }}
          onClick={onAddApplication}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <Plus size={12} />
          </span>
          Nouvelle candidature
        </button>
      </div>
```

Replace with:

```tsx
      {/* Header — desktop: unchanged plain header */}
      <div className="hidden md:flex items-end justify-between gap-4 mt-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            {t('dashboard.greeting')}{firstName ? ` ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--color-muted)' }}>{today}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-white text-sm font-semibold flex-shrink-0 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-cerulean) 100%)',
            boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--color-cerulean) 55%, transparent)',
          }}
          onClick={onAddApplication}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <Plus size={12} />
          </span>
          Nouvelle candidature
        </button>
      </div>

      {/* Header — mobile: gradient hero with greeting, avatar, and the compact stat row */}
      <HeroHeader
        title={<>{t('dashboard.greeting')}{firstName ? ` ${firstName}` : ''} 👋</>}
        subtitle={<span className="capitalize">{today}</span>}
        actions={
          <Link
            to="/profile"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold no-underline"
            style={{ background: 'var(--glass-bg-dark)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border-dark)' }}
          >
            {getInitial(firstName ?? userEmail)}
          </Link>
        }
        stats={!loading && stats.total > 0 ? <GlassStatRow cards={heroCards} loading={loading} /> : undefined}
      />
```

This uses `userEmail` as the avatar-initial fallback when there's no `firstName` yet — check the component's props/destructuring at the top of the file: if `userEmail` isn't already destructured from `DashboardPageProps`, add it there (it's already declared in `DashboardPageProps` per the interface read during planning — only the destructuring in the function signature needs `userEmail` added if missing).

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed. If `userEmail` wasn't destructured, this step will surface a "not defined" error — fix by adding it to the function's parameter destructuring.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: wire HeroHeader and GlassStatRow into the mobile Dashboard"
```

- [ ] **Step 5: Sync to iOS and visually verify**

```bash
npm run build && npx cap sync ios
```

Then rebuild for the simulator and screenshot (see Task 12 for the full rebuild/screenshot command sequence) — confirm the dark gradient hero renders behind the status bar, the greeting/avatar/stats are legible, and tapping "Objectif du mois" / "Pipeline" / "Relances urgentes" / "Candidatures par semaine" / "Activité récente" toggles each section open/closed.

---

### Task 9: Library page — collapsible "Mes CV" and "Analyses ATS récentes"

**Files:**
- Modify: `src/pages/LibraryPage.tsx`

**Interfaces:**
- Consumes: `useCollapsible` (Task 2).

- [ ] **Step 1: Add the import**

In `src/pages/LibraryPage.tsx`, add:

```tsx
import { ChevronDown } from 'lucide-react'
import { useCollapsible } from '@/hooks/useCollapsible'
import { cn } from '@/lib/utils'
```

(Check the existing `lucide-react` import line first — if it already imports other icons, add `ChevronDown` to that same import statement instead of creating a second one. Same for `cn` from `@/lib/utils` if already imported.)

- [ ] **Step 2: Add the two collapsible hooks inside the `LibraryPage` function**

Near the top of the `LibraryPage` function body (alongside the other `useState` calls), add:

```tsx
  const cvSection = useCollapsible('library-mes-cv', false)
  const atsSection = useCollapsible('library-analyses-ats', false)
```

- [ ] **Step 3: Make the "Mes CV" section header clickable with a chevron**

Find:

```tsx
        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Mes CV</h2>
            {cvDocuments.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllCv((v) => !v)}>
                {showAllCv ? 'Voir moins' : 'Voir tous'}
              </button>
            )}
          </div>
          {cvDocuments.length === 0 ? (
```

Replace with:

```tsx
        <section className="card px-5 py-5 flex flex-col gap-3">
          <button type="button" onClick={cvSection.toggle} className="flex items-center justify-between bg-transparent border-0 p-0 text-left lg:pointer-events-none">
            <span className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Mes CV</h2>
              <ChevronDown size={15} className={cn('lg:hidden transition-transform duration-200', cvSection.open ? 'rotate-180' : '')} style={{ color: 'var(--color-muted)' }} />
            </span>
            {cvDocuments.length > 5 && (
              <span
                className="text-xs text-[var(--color-primary)] hover:underline"
                onClick={(e) => { e.stopPropagation(); setShowAllCv((v) => !v) }}
              >
                {showAllCv ? 'Voir moins' : 'Voir tous'}
              </span>
            )}
          </button>
          <div className={cn('flex-col gap-3 lg:flex', cvSection.open ? 'flex' : 'hidden')}>
          {cvDocuments.length === 0 ? (
```

Then find the closing of that section (right after the CV list's closing `)}`, before the section's final `</section>`):

```tsx
            </div>
          )}
        </section>

        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Analyses ATS récentes</h2>
```

Replace with:

```tsx
            </div>
          )}
          </div>
        </section>

        <section className="card px-5 py-5 flex flex-col gap-3">
          <button type="button" onClick={atsSection.toggle} className="flex items-center justify-between bg-transparent border-0 p-0 text-left lg:pointer-events-none">
            <span className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Analyses ATS récentes</h2>
              <ChevronDown size={15} className={cn('lg:hidden transition-transform duration-200', atsSection.open ? 'rotate-180' : '')} style={{ color: 'var(--color-muted)' }} />
            </span>
```

- [ ] **Step 4: Close the "Analyses ATS récentes" collapsible body**

Find (immediately after the change in Step 3, the rest of that header div and the analyses list):

```tsx
            {atsAnalyses.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllAnalyses((v) => !v)}>
                {showAllAnalyses ? 'Voir moins' : 'Voir toutes'}
              </button>
            )}
          </div>
          {atsAnalyses.length === 0 ? (
```

Replace with:

```tsx
            {atsAnalyses.length > 5 && (
              <span
                className="text-xs text-[var(--color-primary)] hover:underline"
                onClick={(e) => { e.stopPropagation(); setShowAllAnalyses((v) => !v) }}
              >
                {showAllAnalyses ? 'Voir moins' : 'Voir toutes'}
              </span>
            )}
          </button>
          <div className={cn('flex-col gap-3 lg:flex', atsSection.open ? 'flex' : 'hidden')}>
          {atsAnalyses.length === 0 ? (
```

And find the end of that section:

```tsx
            </div>
          )}
        </section>
      </div>

      <div className={`grid grid-cols-1 gap-4 items-start ${suggestionsOpen ? 'xl:grid-cols-[2fr_1fr]' : ''}`}>
```

Replace with:

```tsx
            </div>
          )}
          </div>
        </section>
      </div>

      <div className={`grid grid-cols-1 gap-4 items-start ${suggestionsOpen ? 'xl:grid-cols-[2fr_1fr]' : ''}`}>
```

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/pages/LibraryPage.tsx
git commit -m "feat: make Mes CV and Analyses ATS sections collapsible on mobile"
```

---

### Task 10: Goals page — `CardShell` collapsible support

**Files:**
- Modify: `src/pages/GoalsPage.tsx`

**Interfaces:**
- Consumes: `useCollapsible` (Task 2).
- Produces: `CardShell` gains optional `sectionId?: string` and `defaultOpen?: boolean` props (same pattern as `DashboardCard` in Task 7).

- [ ] **Step 1: Add imports**

In `src/pages/GoalsPage.tsx`, the file already imports `cn` from `@/lib/utils` (line 12) — reuse it. Add `ChevronDown` to the existing `lucide-react` import (line 2-6) and import the hook:

```tsx
import { useCollapsible } from '@/hooks/useCollapsible'
```

- [ ] **Step 2: Extend `CardShell` with collapsible support**

Find:

```tsx
function CardShell({ icon: Icon, iconColor, iconBg, title, children }: {
  icon: React.ElementType; iconColor: string; iconBg: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}
```

Replace with:

```tsx
function CardShell({ icon: Icon, iconColor, iconBg, title, children, sectionId, defaultOpen = false }: {
  icon: React.ElementType; iconColor: string; iconBg: string; title: string; children: React.ReactNode
  sectionId?: string; defaultOpen?: boolean
}) {
  const collapsible = sectionId !== undefined
  const { open, toggle } = useCollapsible(sectionId ?? title, defaultOpen)
  const bodyVisible = !collapsible || open

  return (
    <div className="card p-5">
      {collapsible ? (
        <button type="button" onClick={toggle} className="flex items-center justify-between w-full gap-2 mb-4 bg-transparent border-0 p-0 text-left lg:pointer-events-none">
          <span className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
              <Icon size={14} style={{ color: iconColor }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
          </span>
          <ChevronDown size={15} className={cn('lg:hidden transition-transform duration-200', open ? 'rotate-180' : '')} style={{ color: 'var(--color-muted)' }} />
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
        </div>
      )}
      <div className={cn('flex-col lg:flex', bodyVisible ? 'flex' : 'hidden')}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Apply `sectionId` to the 4 target cards**

Make these four exact replacements (each is a one-line prop addition):

- `<CardShell icon={Building2} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Score global de cohérence">` → `<CardShell icon={Building2} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Score global de cohérence" sectionId="score-coherence">`
- `<CardShell icon={Target} iconColor="var(--color-primary)" iconBg="var(--color-bg-light)" title="Répartition des candidatures">` → `<CardShell icon={Target} iconColor="var(--color-primary)" iconBg="var(--color-bg-light)" title="Répartition des candidatures" sectionId="distribution">`
- `<CardShell icon={Lightbulb} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Recommandations">` → `<CardShell icon={Lightbulb} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Recommandations" sectionId="recommandations">`
- `<CardShell icon={Layers} iconColor="var(--color-accent)" iconBg="var(--color-status-applied-bg)" title="Comparatif par objectif">` → `<CardShell icon={Layers} iconColor="var(--color-accent)" iconBg="var(--color-status-applied-bg)" title="Comparatif par objectif" sectionId="comparatif">`

Leave the two other `CardShell` call sites (`title="Critères de recherche"` and the inner `title="Recommandation"` inside `GoalComparisonCard`) unchanged — they're out of scope per the spec.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Add `HeroHeader` for the page title on mobile**

Find, near the top of `GoalsPage`'s main return statement (after the `loading` early-return block):

```tsx
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Objectifs</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Définissez votre stratégie et suivez la cohérence de vos candidatures</p>
        </div>
        <button onClick={() => setShowAIGenerator(true)} className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0">
          <Sparkles size={14} />
          Créer avec l'IA
        </button>
      </div>
```

Replace with:

```tsx
      <div className="hidden md:flex mb-5 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Objectifs</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Définissez votre stratégie et suivez la cohérence de vos candidatures</p>
        </div>
        <button onClick={() => setShowAIGenerator(true)} className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0">
          <Sparkles size={14} />
          Créer avec l'IA
        </button>
      </div>

      <HeroHeader
        title="Objectifs"
        subtitle="Définissez votre stratégie et suivez la cohérence de vos candidatures"
        actions={
          <button
            onClick={() => setShowAIGenerator(true)}
            aria-label="Créer avec l'IA"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--glass-bg-dark)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border-dark)' }}
          >
            <Sparkles size={16} />
          </button>
        }
      />

      <div className="mb-5 md:mb-0" />
```

(The trailing empty spacer div keeps the existing `mb-5` bottom margin on mobile now that the `<h1>` block carries it on desktop only — remove it if visual spacing looks doubled during Task 12's verification pass.)

Add the import:

```tsx
import { HeroHeader } from '@/components/layout/HeroHeader'
```

- [ ] **Step 6: Type-check and build again**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/pages/GoalsPage.tsx
git commit -m "feat: make Goals secondary cards collapsible and add mobile hero header"
```

---

### Task 11: Applications page — mobile `HeroHeader`

**Files:**
- Modify: `src/pages/ApplicationsPage.tsx`

**Interfaces:**
- Consumes: `HeroHeader` (Task 3).

- [ ] **Step 1: Add the import**

```tsx
import { HeroHeader } from '@/components/layout/HeroHeader'
```

- [ ] **Step 2: Hide the existing title block on mobile, add `HeroHeader`**

Find:

```tsx
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Candidatures</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Gérez et suivez toutes vos candidatures</p>
        </div>
        <button className="btn btn-primary btn-sm shrink-0 gap-1.5" onClick={onAdd}>
          <Plus size={15} />
          Nouvelle candidature
        </button>
      </div>
```

Replace with:

```tsx
      <div className="hidden md:flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Candidatures</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Gérez et suivez toutes vos candidatures</p>
        </div>
        <button className="btn btn-primary btn-sm shrink-0 gap-1.5" onClick={onAdd}>
          <Plus size={15} />
          Nouvelle candidature
        </button>
      </div>

      <HeroHeader
        title="Candidatures"
        subtitle="Gérez et suivez toutes vos candidatures"
        actions={
          <button
            onClick={onAdd}
            aria-label="Nouvelle candidature"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--glass-bg-dark)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border-dark)' }}
          >
            <Plus size={17} />
          </button>
        }
      />
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ApplicationsPage.tsx
git commit -m "feat: add mobile hero header to Applications page"
```

---

### Task 12: Full verification pass on the iOS simulator

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `src/lib/collapsibleStorage.test.ts`.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Build and sync to iOS**

```bash
npm run build && npx cap sync ios
```

- [ ] **Step 4: Rebuild the native app and reinstall on the booted simulator**

```bash
cd ios/App
xcodebuild -workspace App.xcodeproj/project.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,id=0E0D1610-3817-4DAC-868A-71A6CC67184C' build
cd ../..
xcrun simctl install 0E0D1610-3817-4DAC-868A-71A6CC67184C \
  "$(xcodebuild -workspace ios/App/App.xcodeproj/project.xcworkspace -scheme App -configuration Debug -showBuildSettings 2>/dev/null | awk -F'= ' '/ TARGET_BUILD_DIR/{print $2; exit}')/App.app"
xcrun simctl terminate 0E0D1610-3817-4DAC-868A-71A6CC67184C com.dupinmael.jobtracker || true
xcrun simctl launch 0E0D1610-3817-4DAC-868A-71A6CC67184C com.dupinmael.jobtracker
```

(If the simulator with that UDID isn't booted, run `xcrun simctl list devices booted` first and substitute the correct UDID, or boot one with `xcrun simctl boot <udid>`.)

- [ ] **Step 5: Screenshot and visually verify each page**

```bash
sleep 2
xcrun simctl io 0E0D1610-3817-4DAC-868A-71A6CC67184C screenshot /tmp/liquid-glass-dashboard.png
```

Open `/tmp/liquid-glass-dashboard.png` and confirm:
- The gradient hero renders behind the status bar with legible white text.
- The avatar bubble and stat row are visible and not clipped by the notch/Dynamic Island.
- The bottom nav is a floating glass pill with a visibly elevated "+" button, not edge-to-edge.
- Tapping a collapsed section (e.g. "Pipeline des candidatures") expands it; tapping again collapses it.

Navigate to Candidatures, Objectifs, and Bibliothèque in the simulator (tap the bottom nav icons) and repeat the screenshot command for each (use distinct output filenames, e.g. `/tmp/liquid-glass-applications.png`), confirming each page's mobile hero header renders and existing functionality (filters, tabs, CV list, etc.) still works.

- [ ] **Step 6: Verify desktop is unaffected**

```bash
npm run dev
```

Open `http://localhost:5173` (or whatever port Vite reports) in a desktop browser window wider than 1024px, log in, and confirm: the sidebar shows the new translucent glass background, and every page's content area looks exactly as it did before this plan (no hero band, no collapsed sections — desktop always shows everything expanded). Stop the dev server afterwards (`Ctrl+C` or kill the background process).

- [ ] **Step 7: Final commit (only if Step 5/6 surfaced fixes)**

If any visual bug was found and fixed during verification, commit it:

```bash
git add -A
git commit -m "fix: address visual issues found during Liquid Glass simulator verification"
```

If no fixes were needed, skip this step — there's nothing to commit.
