import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ResumeBuilderPage } from '@/pages/ResumeBuilderPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { ApplicationDetail } from '@/components/applications/ApplicationDetail'
import { useAuth } from '@/hooks/useAuth'
import { useApplications } from '@/hooks/useApplications'
import { useSteps } from '@/hooks/useSteps'
import { useGoals } from '@/hooks/useGoals'
import type { Application } from '@/lib/types'

export function App() {
  const { user, loading: authLoading, isAuthenticated, signIn, signInWithGoogle, signUp, signOut } = useAuth()
  const { applications, loading: appsLoading, addApplication, updateApplication, updateStatus, deleteApplication } = useApplications(user?.id ?? null)
  const { fetchStepsForApplication, addStep, updateStep, deleteStep, deleteStepsForApplication, getStepsForApplication } = useSteps()
  const { goal } = useGoals(user?.id ?? null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-[var(--color-muted)] text-sm">Chargement...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} />
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
    if (!window.confirm('Supprimer cette candidature ?')) return
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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppShell
              userId={user.id}
              userEmail={user.email}
              applicationsCount={applications.filter((a) => !['REJECTED', 'WITHDRAWN', 'ACCEPTED'].includes(a.status)).length}
              onLogout={signOut}
              onAddApplication={() => { setEditingApp(null); setFormOpen(true) }}
            />
          }
        >
          <Route index element={<DashboardPage userId={user.id} applications={applications} loading={appsLoading} onOpenDetail={handleOpenDetail} />} />
          <Route path="applications" element={
            <ApplicationsPage
              applications={applications}
              loading={appsLoading}
              goal={goal}
              onOpenDetail={handleOpenDetail}
              onStatusChange={updateStatus}
              onAdd={() => { setEditingApp(null); setFormOpen(true) }}
            />
          } />
          <Route path="kanban" element={
            <KanbanPage
              applications={applications}
              goal={goal}
              onStatusChange={updateStatus}
              onOpenDetail={handleOpenDetail}
              onAdd={() => { setEditingApp(null); setFormOpen(true) }}
            />
          } />
          <Route path="library" element={<LibraryPage userId={user.id} userEmail={user.email} />} />
          <Route path="resumes" element={<ResumeBuilderPage userId={user.id} userEmail={user.email} />} />
          <Route path="goals" element={<GoalsPage userId={user.id} applications={applications} />} />
          <Route path="profile" element={<ProfilePage userId={user.id} userEmail={user.email} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {formOpen && (
        <ApplicationForm
          initial={editingApp}
          userId={user.id}
          onSave={handleSave}
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
        />
      )}
    </BrowserRouter>
  )
}
