import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { browserTargets, configureUsage, setUsageOptedOut, startUsageSession, track } from '@/lib/usageClient'
import { AppShell } from '@/components/layout/AppShell'
import { LiteShell } from '@/components/layout/LiteShell'
import { BoardPage } from '@/pages/BoardPage'
import { LoginPage } from '@/pages/LoginPage'
import { LiteAccessGate } from '@/components/access/LiteAccessGate'
import { clearShortcutCode, takeShortcutCodeOnce } from '@/lib/shortcutLocation'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { MyBoardPage } from '@/pages/MyBoardPage'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { ApplicationDetail } from '@/components/applications/ApplicationDetail'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useApplications } from '@/hooks/useApplications'
import { useSteps } from '@/hooks/useSteps'
import { useGoals } from '@/hooks/useGoals'
import { useOrgLogos } from '@/hooks/useOrgLogos'
import { useCompanyDomains } from '@/hooks/useCompanyDomains'
import { useAutoCompanyDomains } from '@/hooks/useAutoCompanyDomains'
import { extractDomain } from '@/lib/url'
import { FEATURES } from '@/config/edition'
import type { Application, ApplicationStatus } from '@/lib/types'

// WHY: condition littérale (pas FEATURES) pour que Rollup supprime ces pages — et l'IA / pdfjs
// qu'elles importent — du build lite. Voir spec §3.3.
const GoalsPage = __APP_EDITION__ === 'full'
  ? lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
  : null
const LibraryPage = __APP_EDITION__ === 'full'
  ? lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })))
  : null

// WHY: chargée à la demande — la page d’administration ne doit jamais entrer dans le paquet que
// téléchargent les utilisateurs ordinaires, qui n’y auront jamais accès.
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))

const PAGE_FALLBACK = <div className="text-[var(--color-muted)] text-sm">Chargement...</div>

export function App() {
  const { user, loading: authLoading, isAuthenticated, isPasswordRecovery, signIn, signInWithGoogle, signUp, signOut, sendPasswordReset, completePasswordRecovery } = useAuth()
  const { applications, loading: appsLoading, addApplication, updateApplication, updateStatus, deleteApplication } = useApplications(user?.id ?? null)
  const { fetchStepsForApplication, addStep, updateStep, deleteStep, deleteStepsForApplication, getStepsForApplication } = useSteps()
  const { activeGoal: goal } = useGoals(FEATURES.goals ? user?.id ?? null : null)
  const isAdmin = useIsAdmin()
  const { logos: orgLogos, loaded: orgLogosLoaded, setOrgWebsite } = useOrgLogos(user?.id ?? null)
  const { lookup: lookupCompanyDomain, loaded: companyDomainsLoaded, contribute: contributeCompanyDomain } = useCompanyDomains()
  const companies = useMemo(() => applications.map((a) => a.company), [applications])
  const hasKnownLogo = useCallback(
    (company: string) => Boolean(orgLogos[company] ?? lookupCompanyDomain(company)),
    [orgLogos, lookupCompanyDomain],
  )
  const { lookup: lookupFoundDomain } = useAutoCompanyDomains(companies, hasKnownLogo, orgLogosLoaded && companyDomainsLoaded)

  // Catalogue partagé d'abord, puis le site trouvé automatiquement pendant cette visite.
  function lookupKnownDomain(company: string): string | undefined {
    return lookupCompanyDomain(company) ?? lookupFoundDomain(company)
  }

  function resolveLogo(company: string): string | undefined {
    return orgLogos[company] ?? lookupKnownDomain(company)
  }

  async function saveCompanyWebsite(company: string, website: string): Promise<string | null> {
    const err = await setOrgWebsite(company, website)
    if (err) return err
    const domain = extractDomain(website)
    if (domain) return contributeCompanyDomain(company, domain)
    return null
  }

  const [formOpen, setFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // WHY: hooks toujours appelés avant tout retour anticipé ; si une session existe déjà, le code
  // du raccourci est ignoré (on reste sur le tableau ouvert) — l'adresse est déjà nettoyée.
  const [shortcutCode, setShortcutCode] = useState(() => (FEATURES.accessCode ? takeShortcutCodeOnce() : ''))
  const consumeShortcutCode = useCallback(() => {
    clearShortcutCode()
    setShortcutCode('')
  }, [])

  useEffect(() => {
    // WHY: une session existe déjà au chargement (ex. re-render après StrictMode) : on reste sur
    // ce tableau et le code ne doit plus jamais être réutilisé plus tard (ex. après un signOut).
    if (!authLoading && isAuthenticated && shortcutCode) consumeShortcutCode()
  }, [authLoading, isAuthenticated, shortcutCode, consumeShortcutCode])

  useEffect(() => {
    if (!FEATURES.accessCode || !isAuthenticated) return
    configureUsage({ client: supabase })
    // WHY: la préférence arrive après coup ; les quelques événements émis entre-temps sont refusés
    // par la règle RLS si l'utilisateur a dit non — la base reste l'autorité, pas ce chargement.
    void supabase
      .from('usage_preferences')
      .select('opted_out')
      .maybeSingle()
      .then(({ data }) => setUsageOptedOut(data?.opted_out === true))
    return startUsageSession(browserTargets())
  }, [isAuthenticated])

  // WHY: une seule fabrique — les deux chemins ne diffèrent que par la provenance. Défini avant les
  // retours anticipés : les hooks doivent s'exécuter dans le même ordre à chaque rendu.
  const changeStatusVia = useCallback(
    (via: 'drag' | 'menu') => async (id: string, status: ApplicationStatus) => {
      const from = applications.find((a) => a.id === id)?.status
      const err = await updateStatus(id, status)
      if (!err) track('application_status_changed', { from, to: status, via })
      return err
    },
    [applications, updateStatus],
  )

  const changeStatusByDrag = useMemo(() => changeStatusVia('drag'), [changeStatusVia])
  const changeStatusByMenu = useMemo(() => changeStatusVia('menu'), [changeStatusVia])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-[var(--color-muted)] text-sm">Chargement...</div>
      </div>
    )
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage onSubmit={completePasswordRecovery} />
  }

  if (!isAuthenticated || !user) {
    // WHY: en lite, pas d'inscription : on entre par un code d'accès (spec lite-access-code §3.1).
    if (FEATURES.accessCode) return <LiteAccessGate shortcutCode={shortcutCode} onShortcutConsumed={consumeShortcutCode} />
    return <LoginPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} onForgotPassword={sendPasswordReset} />
  }

  async function handleSave(data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) {
    setSaveError(null)
    // WHY: lu avant l'await — editingApp est remis à null juste après, la valeur aurait changé.
    const editing = editingApp !== null
    const err = editing
      ? await updateApplication(editingApp!.id, data)
      : await addApplication(data)
    if (err) { setSaveError(err); return }
    track(editing ? 'application_edited' : 'application_added', { status: data.status })
    setFormOpen(false)
    setEditingApp(null)
  }

  async function handleDelete(app: Application) {
    if (!window.confirm('Supprimer cette candidature ? Cette action est irréversible.')) return
    const err = await deleteApplication(app.id)
    if (err) return
    await deleteStepsForApplication(app.id)
    track('application_deleted')
    setDetailApp(null)
  }

  function handleOpenDetail(app: Application) {
    const current = applications.find((a) => a.id === app.id) ?? app
    setDetailApp(current)
    fetchStepsForApplication(current.id)
    track('application_opened')
  }

  function openNewApplication() {
    setEditingApp(null)
    setFormOpen(true)
  }

  function openEditApplication(app: Application) {
    setEditingApp(app)
    setFormOpen(true)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={FEATURES.accessCode ? (
            <LiteShell onAddApplication={openNewApplication} />
          ) : (
            <AppShell
              userId={user.id}
              userEmail={user.email}
              applicationsCount={applications.filter((a) => !['REJECTED', 'WITHDRAWN', 'ACCEPTED'].includes(a.status)).length}
              onLogout={signOut}
              onAddApplication={openNewApplication}
            />
          )}
        >
          {FEATURES.accessCode ? (
            // WHY: en lite, le tableau est l'unique page ; /applications et /kanban retombent sur « * » → /.
            <Route index element={
              <BoardPage
                applications={applications}
                loading={appsLoading}
                onOpenDetail={handleOpenDetail}
                onStatusChange={changeStatusByDrag}
                onAdd={openNewApplication}
                onEdit={openEditApplication}
                onDelete={handleDelete}
                resolveLogo={resolveLogo}
              />
            } />
          ) : (
            <>
              <Route index element={<DashboardPage userId={user.id} userEmail={user.email} applications={applications} loading={appsLoading} onOpenDetail={handleOpenDetail} resolveLogo={resolveLogo} />} />
              <Route path="applications" element={
                <ApplicationsPage
                  applications={applications}
                  loading={appsLoading}
                  goal={goal}
                  onOpenDetail={handleOpenDetail}
                  onStatusChange={updateStatus}
                  onAdd={openNewApplication}
                  onEdit={openEditApplication}
                  onDelete={handleDelete}
                  resolveLogo={resolveLogo}
                />
              } />
              <Route path="kanban" element={
                <KanbanPage
                  applications={applications}
                  goal={goal}
                  onStatusChange={updateStatus}
                  onOpenDetail={handleOpenDetail}
                  resolveLogo={resolveLogo}
                />
              } />
            </>
          )}
          {LibraryPage && (
            <Route path="library" element={<Suspense fallback={PAGE_FALLBACK}><LibraryPage userId={user.id} userEmail={user.email} /></Suspense>} />
          )}
          {GoalsPage && (
            <Route path="goals" element={<Suspense fallback={PAGE_FALLBACK}><GoalsPage userId={user.id} applications={applications} /></Suspense>} />
          )}
          {FEATURES.accessCode
            ? <Route path="mon-tableau" element={<MyBoardPage />} />
            : <Route path="profile" element={<ProfilePage userId={user.id} userEmail={user.email} />} />}
          {/* WHY: tant que isAdmin vaut null (réponse pas encore connue), la route doit quand même
              exister — sinon un accès direct à /admin retombe sur « * » avant que la base réponde. */}
          {FEATURES.accessCode && isAdmin !== false && (
            <Route
              path="admin"
              element={isAdmin === null ? PAGE_FALLBACK : <Suspense fallback={PAGE_FALLBACK}><AdminPage /></Suspense>}
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {formOpen && (
        <ApplicationForm
          initial={editingApp}
          userId={user.id}
          onSave={handleSave}
          onSaveCompanyWebsite={saveCompanyWebsite}
          existingCompanyWebsite={editingApp ? resolveLogo(editingApp.company) ?? null : null}
          lookupCompanyDomain={lookupKnownDomain}
          externalError={saveError}
          onClose={() => { setFormOpen(false); setEditingApp(null); setSaveError(null) }}
        />
      )}

      {detailApp && (
        <ApplicationDetail
          application={applications.find((a) => a.id === detailApp.id) ?? detailApp}
          userEmail={user.email}
          steps={getStepsForApplication(detailApp.id)}
          onDelete={() => handleDelete(detailApp)}
          onClose={() => setDetailApp(null)}
          onUpdate={(data) => updateApplication(detailApp.id, data)}
          onSaveCompanyWebsite={saveCompanyWebsite}
          lookupCompanyDomain={lookupKnownDomain}
          onAddStep={(step) => addStep(step)}
          onUpdateStep={(stepId, data) => updateStep(stepId, data)}
          onDeleteStep={(stepId) => deleteStep(stepId)}
          onStatusChange={(status) => changeStatusByMenu(detailApp.id, status)}
          resolveLogo={resolveLogo}
          goal={goal}
        />
      )}
    </BrowserRouter>
  )
}
