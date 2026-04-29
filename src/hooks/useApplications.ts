import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Application, ApplicationStatus } from '@/lib/types'
import { getDbStatusCandidates, isEnumStatusError, normalizeApplicationFromDb } from '@/lib/applicationStatus'

async function insertWithStatusFallback(data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) {
  const candidates = getDbStatusCandidates(data.status)
  let lastError: { message: string } | null = null
  const now = new Date().toISOString()
  const baseInsert = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  for (const candidate of candidates) {
    const response = await supabase
      .from('Application')
      .insert({ ...baseInsert, status: candidate })
      .select()
      .single()

    if (!response.error) return response
    lastError = response.error
    if (!isEnumStatusError(response.error.message)) return response
  }

  return { data: null, error: lastError }
}

async function updateWithStatusFallback(
  id: string,
  data: Partial<Omit<Application, 'id' | 'createdAt'>>,
) {
  const basePayload = {
    ...data,
    updatedAt: new Date().toISOString(),
  }

  if (!data.status) {
    return supabase
      .from('Application')
      .update(basePayload)
      .eq('id', id)
      .select()
      .single()
  }

  const candidates = getDbStatusCandidates(data.status)
  let lastError: { message: string } | null = null

  for (const candidate of candidates) {
    const response = await supabase
      .from('Application')
      .update({ ...basePayload, status: candidate })
      .eq('id', id)
      .select()
      .single()

    if (!response.error) return response
    lastError = response.error
    if (!isEnumStatusError(response.error.message)) return response
  }

  return { data: null, error: lastError }
}

export function useApplications(userId: string | null) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    if (!userId) { setApplications([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('Application')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (error) setError(error.message)
    else setApplications((data ?? []).map(normalizeApplicationFromDb))
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const addApplication = useCallback(
    async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
      const { data: inserted, error } = await insertWithStatusFallback(data)
      if (error) { setError(error.message); return error.message }
      setApplications((prev) => [normalizeApplicationFromDb(inserted), ...prev])
      return null
    },
    [],
  )

  const updateApplication = useCallback(
    async (id: string, data: Partial<Omit<Application, 'id' | 'createdAt'>>): Promise<string | null> => {
      const { data: updated, error } = await updateWithStatusFallback(id, data)
      if (error) { setError(error.message); return error.message }
      setApplications((prev) => prev.map((a) => (a.id === id ? normalizeApplicationFromDb(updated) : a)))
      return null
    },
    [],
  )

  const deleteApplication = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('Application').delete().eq('id', id)
    if (error) { setError(error.message); return error.message }
    setApplications((prev) => prev.filter((a) => a.id !== id))
    return null
  }, [])

  const updateStatus = useCallback(
    (id: string, status: ApplicationStatus) => updateApplication(id, { status }),
    [updateApplication],
  )

  return { applications, loading, error, addApplication, updateApplication, deleteApplication, updateStatus, refetch: fetchApplications }
}
