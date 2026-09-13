import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { useApplications } from '@/hooks/useApplications'
import { useSteps } from '@/hooks/useSteps'
import { useGoals } from '@/hooks/useGoals'
import { useOrgLogos } from '@/hooks/useOrgLogos'
import { useCompanyDomains } from '@/hooks/useCompanyDomains'
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

export function App() {
  const { user, loading: authLoading, isAuthenticated, isPasswordRecovery, signIn, signInWithGoogle, signUp, signOut, sendPasswordReset, completePasswordRecovery } = useAuth()
  const { applications, loading: appsLoading, addApplication, updateApplication, updateStatus, deleteApplication } = useApplications(user?.id ?? null)
  const { fetchStepsForApplication, addStep, updateStep, deleteStep, deleteStepsForApplication, getStepsForApplication } = useSteps()
  const { activeGoal: goal } = useGoals(FEATURES.goals ? user?.id ?? null : null)
  const { logos: orgLogos, setOrgWebsite } = useOrgLogos(user?.id ?? null)
  const { lookup: lookupCompanyDomain, contribute: contributeCompanyDomain } = useCompanyDomains()

  function resolveLogo(company: string): string | undefined {
    return orgLogos[company] ?? lookupCompanyDomain(company)
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
    const err = editingApp
      ? await updateApplication(editingApp.id, data)
      : await addApplication(data)
    if (err) { setSaveError(err); return }
    setFormOpen(false)
    setEditingApp(null)
  }

  async function handleDelete(app: Application) {
    if (!window.confirm('Supprimer cette candidature ? Cette action est irréversible.')) return
    const err = await deleteApplication(app.id)
    if (err) return
    await deleteStepsForApplication(app.id)
    setDetailApp(null)
  }

  function handleOpenDetail(app: Application) {
    const current = applications.find((a) => a.id === app.id) ?? app
    setDetailApp(current)
    fetchStepsForApplication(current.id)
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
                onStatusChange={updateStatus}
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
          lookupCompanyDomain={lookupCompanyDomain}
          externalError={saveError}
          onClose={() => { setFormOpen(false); setEditingApp(null); setSaveError(null) }}
        />
      )}

      {detailApp && (
        <ApplicationDetail
          application={applications.find((a) => a.id === detailApp.id) ?? detailApp}
          userEmail={user.email}
          steps={getStepsForApplication(detailApp.id)}
          onEdit={() => { setEditingApp(detailApp); setDetailApp(null); setFormOpen(true) }}
          onDelete={() => handleDelete(detailApp)}
          onClose={() => setDetailApp(null)}
          onAddStep={(step) => addStep(step)}
          onUpdateStep={(stepId, data) => updateStep(stepId, data)}
          onDeleteStep={(stepId) => deleteStep(stepId)}
          onStatusChange={(status) => updateStatus(detailApp.id, status)}
          resolveLogo={resolveLogo}
          goal={goal}
        />
      )}
    </BrowserRouter>
  )
}
