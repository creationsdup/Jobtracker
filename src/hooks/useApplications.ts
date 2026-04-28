import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Application, ApplicationStatus } from '@/lib/types'

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
    else setApplications(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const addApplication = useCallback(
    async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
      const { data: inserted, error } = await supabase
        .from('Application')
        .insert(data)
        .select()
        .single()
      if (error) { setError(error.message); return error.message }
      setApplications((prev) => [inserted, ...prev])
      return null
    },
    [],
  )

  const updateApplication = useCallback(
    async (id: string, data: Partial<Omit<Application, 'id' | 'createdAt'>>): Promise<string | null> => {
      const { data: updated, error } = await supabase
        .from('Application')
        .update({ ...data, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) { setError(error.message); return error.message }
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)))
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
