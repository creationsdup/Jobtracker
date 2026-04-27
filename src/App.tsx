import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { ApplicationDetail, STEP_TO_STATUS } from '@/components/applications/ApplicationDetail'
import { useAuth } from '@/hooks/useAuth'
import { useApplications } from '@/hooks/useApplications'
import { useSteps } from '@/hooks/useSteps'
import type { Application } from '@/lib/types'

export function App() {
  const { userName, isAuthenticated, login, logout } = useAuth()
  const { applications, addApplication, updateApplication, deleteApplication } = useApplications()
  const { addStep, deleteStepsForApplication, getStepsForApplication } = useSteps()

  const [formOpen, setFormOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | null>(null)

  if (!isAuthenticated || !userName) {
    return <LoginPage onLogin={login} />
  }

  function handleSave(data: Omit<Application, 'id' | 'created_at' | 'updated_at'>) {
    if (editingApp) {
      updateApplication(editingApp.id, data)
    } else {
      addApplication(data)
    }
    setFormOpen(false)
    setEditingApp(null)
  }

  function handleDelete(app: Application) {
    if (!window.confirm('Supprimer cette candidature ?')) return
    deleteApplication(app.id)
    deleteStepsForApplication(app.id)
    setDetailApp(null)
  }

  function handleOpenDetail(app: Application) {
    setDetailApp(applications.find((a) => a.id === app.id) ?? app)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppShell
              userName={userName}
              onLogout={logout}
              onAddApplication={() => { setEditingApp(null); setFormOpen(true) }}
            />
          }
        >
          <Route index element={<DashboardPage applications={applications} onOpenDetail={handleOpenDetail} />} />
          <Route path="applications" element={<ApplicationsPage applications={applications} onOpenDetail={handleOpenDetail} />} />
          <Route path="kanban" element={<KanbanPage applications={applications} onOpenDetail={handleOpenDetail} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {formOpen && (
        <ApplicationForm
          initial={editingApp}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingApp(null) }}
        />
      )}

      {detailApp && (
        <ApplicationDetail
          application={detailApp}
          steps={getStepsForApplication(detailApp.id)}
          onEdit={() => { setEditingApp(detailApp); setDetailApp(null); setFormOpen(true) }}
          onDelete={() => handleDelete(detailApp)}
          onClose={() => setDetailApp(null)}
          onAddStep={(step) => {
            addStep(step)
            const mappedStatus = STEP_TO_STATUS[step.step_type]
            if (mappedStatus) updateApplication(detailApp.id, { status: mappedStatus })
            setDetailApp((prev) => prev ? { ...prev, status: mappedStatus ?? prev.status } : null)
          }}
        />
      )}
    </BrowserRouter>
  )
}
