import { useState, useCallback } from 'react'
import type { Application, ApplicationStatus } from '@/lib/types'
import { uid } from '@/lib/utils'

const STORAGE_KEY = 'jt_applications'

function load(): Application[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? []
  } catch {
    return []
  }
}

function save(apps: Application[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>(load)

  const persist = useCallback((apps: Application[]) => {
    save(apps)
    setApplications(apps)
  }, [])

  const addApplication = useCallback(
    (data: Omit<Application, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString()
      const next = [{ id: uid(), ...data, created_at: now, updated_at: now }, ...load()]
      persist(next)
    },
    [persist],
  )

  const updateApplication = useCallback(
    (id: string, data: Partial<Omit<Application, 'id' | 'created_at'>>) => {
      const apps = load().map((a) =>
        a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a,
      )
      persist(apps)
    },
    [persist],
  )

  const deleteApplication = useCallback(
    (id: string) => {
      persist(load().filter((a) => a.id !== id))
    },
    [persist],
  )

  const updateStatus = useCallback(
    (id: string, status: ApplicationStatus) => updateApplication(id, { status }),
    [updateApplication],
  )

  return { applications, addApplication, updateApplication, deleteApplication, updateStatus }
}
