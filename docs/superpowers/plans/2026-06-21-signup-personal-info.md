# Signup Personal Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prénom, nom (requis) et date de naissance (optionnelle) au formulaire d'inscription, et les rendre éditables plus tard dans Paramètres.

**Architecture:** Les champs sont capturés dans `LoginPage.tsx` (mode `signup`) et transmis à `supabase.auth.signUp()` via `options.data` (Supabase Auth `user_metadata`) — car aucune session n'existe encore tant que l'email n'est pas confirmé, donc on ne peut pas écrire directement dans la table `Profile` (RLS). Au premier login, `ensureRemoteProfile` (dans `useProfile.ts`) lit ces metadata depuis la session et préremplit la ligne `Profile` (`fullName`, nouvelle colonne `birthDate`). `ProfilePage.tsx` expose ensuite `birthDate` comme champ éditable.

**Tech Stack:** React 18 + TypeScript, Supabase Auth (`@supabase/supabase-js`), Postgres (migration SQL via `mcp__supabase__apply_migration`).

## Global Constraints

- Pas de vérification d'âge minimum (date de naissance = info, pas de blocage légal).
- Pas de colonnes `firstName`/`lastName` séparées dans `Profile` — continuer à combiner dans `fullName`, comme fait déjà `ProfilePage.tsx`.
- Pas de migration de données pour les comptes existants — `birthDate` reste `null` tant que non renseigné.
- Tous les messages utilisateur en français (suit la convention déjà établie dans `LoginPage.tsx` / `authErrors.ts`).
- Ce projet n'a pas de suite de tests automatisés (`vitest` n'est pas installé, aucun fichier `*.test.ts*` n'existe). Chaque tâche se vérifie via `npx tsc --noEmit` (zéro erreur) + une vérification manuelle décrite dans la tâche. Ne pas installer de framework de test pour ce travail — hors scope.

---

### Task 1: Migration — colonne `birthDate` sur `Profile`

**Files:**
- Create: `supabase/migrations/20260621120000_add_profile_birth_date.sql`

**Interfaces:**
- Produces: colonne `public."Profile"."birthDate"` (type `date`, nullable) — consommée par Task 2 (`useProfile.ts`).

- [ ] **Step 1: Écrire la migration**

```sql
-- supabase/migrations/20260621120000_add_profile_birth_date.sql
alter table "Profile" add column if not exists "birthDate" date;
```

- [ ] **Step 2: Appliquer la migration**

Utiliser l'outil `mcp__supabase__apply_migration` avec :
- `name`: `add_profile_birth_date`
- `query`: le contenu SQL du Step 1

- [ ] **Step 3: Vérifier que la colonne existe**

Utiliser `mcp__supabase__list_tables` avec `schemas: ["public"]`, `verbose: true`. Dans le résultat, la table `public.Profile` doit maintenant lister une colonne :

```json
{"name":"birthDate","data_type":"date","format":"date","options":["nullable","updatable"]}
```

Expected: colonne présente, sinon revenir au Step 2.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260621120000_add_profile_birth_date.sql
git commit -m "feat: add birthDate column to Profile table"
```

---

### Task 2: `useProfile.ts` — interface + sync des metadata au premier profil

**Files:**
- Modify: `src/hooks/useProfile.ts:5-23` (interface `Profile`)
- Modify: `src/hooks/useProfile.ts:35-55` (`buildDefaultProfile`)
- Modify: `src/hooks/useProfile.ts:57-83` (`ensureRemoteProfile`)
- Modify: `src/hooks/useProfile.ts:125-168` (`fetchProfile`)

**Interfaces:**
- Consumes: rien de nouveau (utilise `supabase.auth.getSession()` déjà importé via `@/lib/supabase`).
- Produces: `Profile.birthDate: string | null` — consommé par Task 6 (`ProfilePage.tsx`). `ensureRemoteProfile(userId, fallbackEmail, metadata)` — signature interne, pas consommée hors de ce fichier.

- [ ] **Step 1: Ajouter `birthDate` à l'interface `Profile` et au profil par défaut**

Dans `src/hooks/useProfile.ts`, remplacer :

```ts
export interface Profile {
  id: string
  fullName: string
  email: string
  phone: string | null
  location: string | null
  title: string | null
  summary: string | null
  website: string | null
  linkedin: string | null
  github: string | null
  avatarUrl: string | null
  skills: string[]
  interests: string[]
  createdAt: string
  language: 'fr' | 'en'
  remindersEnabled: boolean
  reminderThresholdDays: number
}
```

par :

```ts
export interface Profile {
  id: string
  fullName: string
  email: string
  phone: string | null
  location: string | null
  title: string | null
  summary: string | null
  website: string | null
  linkedin: string | null
  github: string | null
  avatarUrl: string | null
  skills: string[]
  interests: string[]
  createdAt: string
  language: 'fr' | 'en'
  remindersEnabled: boolean
  reminderThresholdDays: number
  birthDate: string | null
}
```

Et dans `buildDefaultProfile`, ajouter `birthDate: null,` juste après `fullName: '',` :

```ts
function buildDefaultProfile(userId: string, fallbackEmail?: string | null): Profile {
  return {
    id: userId,
    fullName: '',
    birthDate: null,
    email: fallbackEmail ?? '',
    phone: null,
    location: null,
    title: null,
    summary: null,
    website: null,
    linkedin: null,
    github: null,
    avatarUrl: null,
    skills: [],
    interests: [],
    createdAt: new Date().toISOString(),
    language: 'fr',
    remindersEnabled: true,
    reminderThresholdDays: 7,
  }
}
```

- [ ] **Step 2: Faire accepter des metadata à `ensureRemoteProfile`**

Remplacer la signature et le corps de `ensureRemoteProfile` :

```ts
interface SignupMetadata {
  firstName?: string
  lastName?: string
  birthDate?: string | null
}

async function ensureRemoteProfile(userId: string, fallbackEmail?: string | null, metadata?: SignupMetadata) {
  const base = buildDefaultProfile(userId, fallbackEmail)
  const fullName = [metadata?.firstName?.trim(), metadata?.lastName?.trim()].filter(Boolean).join(' ')

  const { data, error } = await supabase
    .from('Profile')
    .upsert({
      id: base.id,
      email: base.email,
      fullName: fullName || base.fullName,
      birthDate: metadata?.birthDate ?? base.birthDate,
      phone: base.phone,
      location: base.location,
      title: base.title,
      summary: base.summary,
      website: base.website,
      linkedin: base.linkedin,
      github: base.github,
      avatarUrl: base.avatarUrl,
      skills: base.skills,
      interests: base.interests,
      language: base.language,
      remindersEnabled: base.remindersEnabled,
      reminderThresholdDays: base.reminderThresholdDays,
    })
    .select()
    .single()

  return { data, error }
}
```

- [ ] **Step 3: Lire les `user_metadata` de la session dans `fetchProfile` avant l'appel à `ensureRemoteProfile`**

Dans `fetchProfile`, remplacer :

```ts
    const ensured = await ensureRemoteProfile(userId, fallbackEmail)
```

par :

```ts
    const { data: sessionData } = await supabase.auth.getSession()
    const rawMetadata = sessionData.session?.user.user_metadata ?? {}
    const metadata: SignupMetadata = {
      firstName: typeof rawMetadata.firstName === 'string' ? rawMetadata.firstName : undefined,
      lastName: typeof rawMetadata.lastName === 'string' ? rawMetadata.lastName : undefined,
      birthDate: typeof rawMetadata.birthDate === 'string' ? rawMetadata.birthDate : null,
    }
    const ensured = await ensureRemoteProfile(userId, fallbackEmail, metadata)
```

- [ ] **Step 4: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune erreur (sortie vide, code de retour 0).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProfile.ts
git commit -m "feat: sync firstName/lastName/birthDate metadata into Profile on first login"
```

---

### Task 3: `useAuth.ts` — `signUp` accepte les champs personnels

**Files:**
- Modify: `src/hooks/useAuth.ts:48-52`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `signUp(email: string, password: string, profileFields: { firstName: string; lastName: string; birthDate: string | null }): Promise<{ error: AuthError | null; needsConfirmation: boolean }>` — consommé par Task 5 (`LoginPage.tsx` via `App.tsx`).

- [ ] **Step 1: Étendre `signUp`**

Remplacer :

```ts
  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    // When email confirmation is required, Supabase returns a user but no
    // session and no error — without this flag the signup form looks broken.
    const needsConfirmation = !error && !data.session
    return { error, needsConfirmation }
  }, [])
```

par :

```ts
  const signUp = useCallback(async (
    email: string,
    password: string,
    profileFields: { firstName: string; lastName: string; birthDate: string | null },
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: profileFields },
    })
    // When email confirmation is required, Supabase returns a user but no
    // session and no error — without this flag the signup form looks broken.
    const needsConfirmation = !error && !data.session
    return { error, needsConfirmation }
  }, [])
```

- [ ] **Step 2: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: des erreurs vont apparaître dans `LoginPage.tsx` et `App.tsx` (signature pas encore mise à jour côté appelants) — c'est attendu à ce stade, elles seront corrigées aux Tasks 5 et 6. Confirmer que l'erreur pointe bien vers `onSignUp(email, password)` dans `LoginPage.tsx` (argument manquant) et pas vers `useAuth.ts` lui-même.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: pass firstName/lastName/birthDate to Supabase signUp metadata"
```

---

### Task 4: Traductions — nouvelles clés FR/EN

**Files:**
- Modify: `src/lib/i18n/translations.ts`

**Interfaces:**
- Produces: clés `login.firstName`, `login.lastName`, `login.firstNamePlaceholder`, `login.lastNamePlaceholder`, `login.birthDate`, `login.birthDateOptional`, `login.birthDateFuture`, `login.firstNameRequired`, `login.lastNameRequired`, `settings.birthDate` — consommées par Task 5 et Task 6.

- [ ] **Step 1: Ajouter les clés FR**

Dans `src/lib/i18n/translations.ts`, bloc `fr`, juste après `'login.password': 'Mot de passe',` :

```ts
    'login.password': 'Mot de passe',
    'login.firstName': 'Prénom',
    'login.lastName': 'Nom',
    'login.firstNamePlaceholder': 'Jean',
    'login.lastNamePlaceholder': 'Dupont',
    'login.birthDate': 'Date de naissance',
    'login.birthDateOptional': 'Date de naissance (optionnel)',
    'login.birthDateFuture': 'La date de naissance ne peut pas être dans le futur.',
    'login.firstNameRequired': 'Le prénom est requis.',
    'login.lastNameRequired': 'Le nom est requis.',
```

- [ ] **Step 2: Ajouter les clés EN**

Dans le bloc `en`, juste après `'login.password': 'Password',` :

```ts
    'login.password': 'Password',
    'login.firstName': 'First name',
    'login.lastName': 'Last name',
    'login.firstNamePlaceholder': 'John',
    'login.lastNamePlaceholder': 'Doe',
    'login.birthDate': 'Date of birth',
    'login.birthDateOptional': 'Date of birth (optional)',
    'login.birthDateFuture': 'Date of birth cannot be in the future.',
    'login.firstNameRequired': 'First name is required.',
    'login.lastNameRequired': 'Last name is required.',
```

- [ ] **Step 3: Ajouter `settings.birthDate` (FR puis EN)**

Dans le bloc `fr`, juste après `'settings.lastName': 'Nom',` :

```ts
    'settings.lastName': 'Nom',
    'settings.birthDate': 'Date de naissance',
```

Dans le bloc `en`, juste après `'settings.lastName': 'Last name',` :

```ts
    'settings.lastName': 'Last name',
    'settings.birthDate': 'Date of birth',
```

- [ ] **Step 4: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur liée à `translations.ts` (les erreurs de Task 3 sur `LoginPage.tsx`/`App.tsx` persistent, c'est normal).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/translations.ts
git commit -m "feat: add FR/EN translations for signup personal info fields"
```

---

### Task 5: `LoginPage.tsx` — champs prénom/nom/date de naissance

**Files:**
- Modify: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `onSignUp(email, password, { firstName, lastName, birthDate }): Promise<{ error; needsConfirmation }>` (Task 3), clés de traduction de Task 4.
- Produces: rien de nouveau pour les tâches suivantes (composant terminal).

- [ ] **Step 1: Mettre à jour le type de `onSignUp` et ajouter l'état local**

Remplacer :

```ts
interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ message: string; code?: string } | null>
  onSignUp: (email: string, password: string) => Promise<{ error: { message: string; code?: string } | null; needsConfirmation: boolean }>
  onSignInWithGoogle: () => Promise<unknown>
  onForgotPassword: (email: string) => Promise<unknown>
}

export function LoginPage({ onSignIn, onSignUp, onSignInWithGoogle, onForgotPassword }: LoginPageProps) {
  const { t, locale } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
```

par :

```ts
interface SignupProfileFields {
  firstName: string
  lastName: string
  birthDate: string | null
}

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<{ message: string; code?: string } | null>
  onSignUp: (
    email: string,
    password: string,
    profileFields: SignupProfileFields,
  ) => Promise<{ error: { message: string; code?: string } | null; needsConfirmation: boolean }>
  onSignInWithGoogle: () => Promise<unknown>
  onForgotPassword: (email: string) => Promise<unknown>
}

export function LoginPage({ onSignIn, onSignUp, onSignInWithGoogle, onForgotPassword }: LoginPageProps) {
  const { t, locale } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
```

- [ ] **Step 2: Valider et transmettre les champs dans `handleSubmit`**

Remplacer :

```ts
    if (mode === 'signup') {
      const { error: err, needsConfirmation } = await onSignUp(email, password)
      setLoading(false)
      if (err) { setError(getAuthErrorMessage(err, locale)); return }
      if (needsConfirmation) setConfirmationSent(true)
      return
    }
```

par :

```ts
    if (mode === 'signup') {
      if (!firstName.trim()) { setError(t('login.firstNameRequired')); setLoading(false); return }
      if (!lastName.trim()) { setError(t('login.lastNameRequired')); setLoading(false); return }
      if (birthDate && new Date(birthDate) > new Date()) {
        setError(t('login.birthDateFuture')); setLoading(false); return
      }

      const { error: err, needsConfirmation } = await onSignUp(email, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || null,
      })
      setLoading(false)
      if (err) { setError(getAuthErrorMessage(err, locale)); return }
      if (needsConfirmation) setConfirmationSent(true)
      return
    }
```

- [ ] **Step 3: Réinitialiser les nouveaux champs au changement de mode**

Remplacer :

```ts
  function switchMode(next: 'login' | 'signup' | 'forgot') {
    setMode(next)
    setError(null)
    setResetSent(false)
    setConfirmationSent(false)
  }
```

par :

```ts
  function switchMode(next: 'login' | 'signup' | 'forgot') {
    setMode(next)
    setError(null)
    setResetSent(false)
    setConfirmationSent(false)
    setFirstName('')
    setLastName('')
    setBirthDate('')
  }
```

- [ ] **Step 4: Ajouter les champs dans le JSX, avant le champ email**

Remplacer ce bloc existant (début du `<form>`) :

```tsx
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('login.email')}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoFocus
                />
              </div>
```

par (ajout du bloc signup, champ email inchangé en dessous) :

```tsx
            <form onSubmit={handleSubmit} className={styles.form}>
              {mode === 'signup' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>{t('login.firstName')}</label>
                      <input
                        className="input"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t('login.firstNamePlaceholder')}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>{t('login.lastName')}</label>
                      <input
                        className="input"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t('login.lastNamePlaceholder')}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('login.birthDateOptional')}</label>
                    <input
                      className="input"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      autoComplete="bday"
                    />
                  </div>
                </>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('login.email')}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoFocus
                />
              </div>
```

Cette version remplace `autoFocus` implicitement déplacé sur l'email — vérifier qu'il n'y a bien qu'une seule balise `<div className={styles.fieldGroup}>` pour l'email dans le fichier après cette modification (`grep -c "login.email" src/pages/LoginPage.tsx` doit retourner `1`).

- [ ] **Step 5: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans `LoginPage.tsx`. Il peut rester une erreur dans `App.tsx` (Task 6 la corrige).

- [ ] **Step 6: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: add firstName/lastName/birthDate fields to signup form"
```

---

### Task 6: `App.tsx` — adapter l'appel à `signUp`

**Files:**
- Modify: `src/App.tsx:24` et `src/App.tsx:60-62`

**Interfaces:**
- Consumes: `signUp` de `useAuth()` (Task 3), `LoginPage` (Task 5).

- [ ] **Step 1: Vérifier que `signUp` passe directement**

`App.tsx` passe déjà `signUp` directement à `LoginPage` (`<LoginPage onSignUp={signUp} ... />`). Comme `useAuth().signUp` a maintenant 3 paramètres et que `LoginPage` appelle `onSignUp(email, password, profileFields)` avec exactement cette forme, **aucune modification de `App.tsx` n'est nécessaire** — la signature passe directement par référence.

Vérifier ceci en lisant `src/App.tsx:60-62` :

```ts
  if (!isAuthenticated || !user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} onForgotPassword={sendPasswordReset} />
  }
```

Confirmer que `signUp` (déstructuré depuis `useAuth()` à la ligne 24) n'est pas wrappé dans une fonction qui tronquerait les arguments.

- [ ] **Step 2: Vérifier les types sur tout le projet**

Run: `npx tsc --noEmit`
Expected: sortie vide, code de retour 0. Si une erreur persiste dans `App.tsx`, c'est qu'un wrapper local existe — dans ce cas, l'ajuster pour transmettre les 3 arguments à `signUp`.

- [ ] **Step 3: Commit (si modification nécessaire)**

```bash
git add src/App.tsx
git commit -m "fix: forward profile fields through signUp wiring in App.tsx"
```

Si aucune modification n'a été nécessaire au Step 1, passer directement à la Task 7 sans commit.

---

### Task 7: `ProfilePage.tsx` — champ Date de naissance éditable

**Files:**
- Modify: `src/pages/ProfilePage.tsx:562-571` (`InputField` — élargir le type)
- Modify: `src/pages/ProfilePage.tsx:14-29` (état local)
- Modify: `src/pages/ProfilePage.tsx:54-60` (effet de préremplissage depuis `profile`)
- Modify: `src/pages/ProfilePage.tsx:62-73` (`handleSaveInfo`)
- Modify: `src/pages/ProfilePage.tsx:246-262` (JSX du formulaire)

**Interfaces:**
- Consumes: `Profile.birthDate: string | null` (Task 2), `updateProfile(updates: ProfileUpdate)` (déjà existant dans `useProfile.ts`), `settings.birthDate` (Task 4).

- [ ] **Step 1: Élargir le type accepté par `InputField`**

Dans `src/pages/ProfilePage.tsx`, remplacer :

```ts
function InputField({ label, value, onChange, placeholder, type = 'text', readonly, hint, autoComplete, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'url' | 'tel'
  readonly?: boolean
  hint?: string
  autoComplete?: string
  required?: boolean
}) {
```

par :

```ts
function InputField({ label, value, onChange, placeholder, type = 'text', readonly, hint, autoComplete, required, max }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'url' | 'tel' | 'date'
  readonly?: boolean
  hint?: string
  autoComplete?: string
  required?: boolean
  max?: string
}) {
```

Puis, dans le JSX retourné par `InputField` (juste après la ligne `autoComplete={autoComplete}`), ajouter `max={max}` :

```tsx
        autoComplete={autoComplete}
        max={max}
        required={required}
```

- [ ] **Step 2: Ajouter l'état local `birthDate`**

Remplacer :

```ts
  // Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [infoDirty, setInfoDirty] = useState(false)
```

par :

```ts
  // Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [infoDirty, setInfoDirty] = useState(false)
```

- [ ] **Step 3: Préremplir `birthDate` depuis le profil chargé**

Dans le `useEffect` qui découpe `fullName` (juste après `setInfoDirty(false)`), ajouter la lecture de `profile.birthDate` :

```ts
  useEffect(() => {
    if (!profile) return
    const parts = (profile.fullName ?? '').trim().split(/\s+/)
    setFirstName(parts[0] ?? '')
    setLastName(parts.slice(1).join(' '))
    setBirthDate(profile.birthDate ?? '')
    setInfoDirty(false)
  }, [profile])
```

- [ ] **Step 4: Inclure `birthDate` dans la sauvegarde**

Remplacer :

```ts
  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setInfoError(null)
    setInfoSaving(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const err = await updateProfile({ fullName })
    setInfoSaving(false)
    if (err) { setInfoError(err); return }
    setInfoSaved(true)
    setInfoDirty(false)
    setTimeout(() => setInfoSaved(false), 3000)
  }
```

par :

```ts
  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setInfoError(null)
    if (birthDate && new Date(birthDate) > new Date()) {
      setInfoError(t('login.birthDateFuture'))
      return
    }
    setInfoSaving(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const err = await updateProfile({ fullName, birthDate: birthDate || null })
    setInfoSaving(false)
    if (err) { setInfoError(err); return }
    setInfoSaved(true)
    setInfoDirty(false)
    setTimeout(() => setInfoSaved(false), 3000)
  }
```

- [ ] **Step 5: Ajouter le champ dans le JSX**

Remplacer :

```tsx
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <InputField
                  label={t('settings.firstName')}
                  value={firstName}
                  onChange={v => { setFirstName(v); setInfoDirty(true) }}
                  placeholder={t('settings.firstNamePlaceholder')}
                  autoComplete="given-name"
                  required
                />
                <InputField
                  label={t('settings.lastName')}
                  value={lastName}
                  onChange={v => { setLastName(v); setInfoDirty(true) }}
                  placeholder={t('settings.lastNamePlaceholder')}
                  autoComplete="family-name"
                />
              </div>
```

par :

```tsx
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <InputField
                  label={t('settings.firstName')}
                  value={firstName}
                  onChange={v => { setFirstName(v); setInfoDirty(true) }}
                  placeholder={t('settings.firstNamePlaceholder')}
                  autoComplete="given-name"
                  required
                />
                <InputField
                  label={t('settings.lastName')}
                  value={lastName}
                  onChange={v => { setLastName(v); setInfoDirty(true) }}
                  placeholder={t('settings.lastNamePlaceholder')}
                  autoComplete="family-name"
                />
              </div>

              <div className="mt-4">
                <InputField
                  label={t('settings.birthDate')}
                  value={birthDate}
                  onChange={v => { setBirthDate(v); setInfoDirty(true) }}
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  autoComplete="bday"
                />
              </div>
```

- [ ] **Step 6: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: sortie vide, code de retour 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProfilePage.tsx
git commit -m "feat: make birthDate editable in account settings"
```

---

### Task 8: Vérification manuelle de bout en bout

**Files:** aucun (vérification uniquement).

**Interfaces:** aucune.

- [ ] **Step 1: Lancer un serveur de dev isolé**

```bash
npx vite --host 0.0.0.0 --port 5180
```

Expected: `Local: http://localhost:5180/`. Si le port est pris, noter le port réellement utilisé dans la sortie et l'utiliser pour les steps suivants.

- [ ] **Step 2: Inscription avec les nouveaux champs**

Avec un navigateur piloté (Playwright, comme dans la vérification précédente du flux auth) :
1. Ouvrir `http://localhost:5180/`, passer en mode "Créer un compte".
2. Vérifier que les champs Prénom, Nom et Date de naissance (optionnel) sont visibles.
3. Soumettre le formulaire sans remplir Prénom → vérifier que l'erreur affichée est `t('login.firstNameRequired')` (« Le prénom est requis. ») et qu'aucune requête réseau n'est partie.
4. Remplir Prénom, Nom, email valide, mot de passe, laisser la date de naissance vide → soumettre.

Expected: pas d'erreur de validation bloquante ; soit le message de confirmation email apparaît, soit (si le rate-limit Supabase Auth est atteint, comme observé précédemment) le message d'erreur traduit en français apparaît.

- [ ] **Step 3: Vérifier les metadata côté Supabase**

Utiliser `mcp__supabase__get_logs` avec `service: "auth"` et chercher l'entrée `path":"/signup"` la plus récente. Le corps ne montre pas les metadata directement, donc vérifier plutôt via `mcp__supabase__execute_sql` (lecture seule) :

```sql
select id, email, raw_user_meta_data from auth.users order by created_at desc limit 1;
```

Expected: `raw_user_meta_data` contient `firstName` et `lastName` correspondant à ce qui a été saisi.

- [ ] **Step 4: Vérifier le préremplissage du profil après confirmation**

Si un compte de test a pu être confirmé et connecté (ou en utilisant un compte existant après avoir relancé `fetchProfile`), vérifier en base :

```sql
select id, "fullName", "birthDate" from "Profile" where id = '<user-id-du-step-3>';
```

Expected: `fullName` = `"<firstName> <lastName>"`, `birthDate` = la valeur saisie ou `null` si laissée vide.

- [ ] **Step 5: Vérifier le champ dans Paramètres**

Avec un compte déjà connecté (ex. compte existant `mael.pepito22@gmail.com` utilisé lors des vérifications précédentes), ouvrir la page Paramètres, modifier la date de naissance, sauvegarder, recharger la page.

Expected: la valeur saisie persiste après rechargement (lue depuis `Profile.birthDate`).

- [ ] **Step 6: Arrêter le serveur de dev de test**

```bash
kill %1 2>/dev/null || true
```

(ou tuer explicitement le PID du process lancé au Step 1 s'il n'a pas été lancé en job shell)
