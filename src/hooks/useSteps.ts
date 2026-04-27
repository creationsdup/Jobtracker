import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TimelineStep } from '@/lib/types'

export function useSteps() {
  const [steps, setSteps] = useState<TimelineStep[]>([])

  const fetchStepsForApplication = useCallback(async (applicationId: string) => {
    const { data, error } = await supabase
      .from('TimelineStep')
      .select('*')
      .eq('applicationId', applicationId)
      .order('date', { ascending: true })
    if (!error) setSteps(data ?? [])
  }, [])

  const addStep = useCallback(async (data: Omit<TimelineStep, 'id' | 'createdAt'>) => {
    const { data: inserted, error } = await supabase
      .from('TimelineStep')
      .insert(data)
      .select()
      .single()
    if (!error) setSteps((prev) => [...prev, inserted].sort((a, b) => a.date.localeCompare(b.date)))
    return error
  }, [])

  const deleteStepsForApplication = useCallback(async (applicationId: string) => {
    await supabase.from('TimelineStep').delete().eq('applicationId', applicationId)
    setSteps((prev) => prev.filter((s) => s.applicationId !== applicationId))
  }, [])

  const getStepsForApplication = useCallback(
    (applicationId: string) => steps.filter((s) => s.applicationId === applicationId),
    [steps],
  )

  return { steps, fetchStepsForApplication, addStep, deleteStepsForApplication, getStepsForApplication }
}
