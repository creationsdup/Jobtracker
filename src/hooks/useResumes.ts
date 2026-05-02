// src/hooks/useResumes.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Resume } from '@/lib/types'

export type ResumeCreate = Omit<Resume, 'id' | 'createdAt'>

export function useResumes(userId: string | null) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResumes = useCallback(async () => {
    if (!userId) { setResumes([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('Resume')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (error) setError(error.message)
    else setResumes(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchResumes() }, [fetchResumes])

  const createResume = useCallback(async (data: ResumeCreate): Promise<{ id: string } | null> => {
    const { data: inserted, error } = await supabase
      .from('Resume')
      .insert(data)
      .select()
      .single()
    if (error) return null
    setResumes(prev => [inserted, ...prev])
    return { id: inserted.id }
  }, [])

  const updateResume = useCallback(async (id: string, data: Partial<ResumeCreate>): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('Resume')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setResumes(prev => prev.map(r => r.id === id ? updated : r))
    return null
  }, [])

  const deleteResume = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('Resume').delete().eq('id', id)
    if (error) return error.message
    setResumes(prev => prev.filter(r => r.id !== id))
    return null
  }, [])

  return { resumes, loading, error, createResume, updateResume, deleteResume, refetch: fetchResumes }
}
