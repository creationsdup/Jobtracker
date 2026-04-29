import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Experience, ExperienceType } from '@/lib/types'

export interface NewExperience {
  id: string
  userId: string
  type: ExperienceType
  title: string
  organization: string
  location: string | null
  startDate: string
  endDate: string | null
  current: boolean
  description: string | null
  skills: string[]
  subsection: string | null
}

export function useExperiences(userId: string | null) {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) { setExperiences([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('Experience')
      .select('*')
      .eq('userId', userId)
      .order('startDate', { ascending: false })
    setExperiences(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  async function bulkAddExperiences(items: NewExperience[]): Promise<string | null> {
    const { error } = await supabase.from('Experience').insert(items)
    if (error) return error.message
    await fetch()
    return null
  }

  async function addExperience(item: NewExperience): Promise<string | null> {
    const { data, error } = await supabase
      .from('Experience')
      .insert(item)
      .select()
      .single()
    if (error) return error.message
    setExperiences((prev) => [data, ...prev].sort((a, b) => b.startDate.localeCompare(a.startDate)))
    return null
  }

  async function updateExperience(id: string, updates: Partial<NewExperience>): Promise<string | null> {
    const { data, error } = await supabase
      .from('Experience')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setExperiences((prev) => prev.map((exp) => (exp.id === id ? data : exp)))
    return null
  }

  async function deleteExperience(id: string): Promise<string | null> {
    const { error } = await supabase.from('Experience').delete().eq('id', id)
    if (error) return error.message
    setExperiences((prev) => prev.filter((exp) => exp.id !== id))
    return null
  }

  return { experiences, loading, bulkAddExperiences, addExperience, updateExperience, deleteExperience, refetch: fetch }
}
