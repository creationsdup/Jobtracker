import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TimelineStep } from '@/lib/types'

type StepUpdate = Partial<Omit<TimelineStep, 'id' | 'applicationId' | 'createdAt'>>

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

  const addStep = useCallback(async (data: Omit<TimelineStep, 'id' | 'createdAt'>): Promise<string | null> => {
    const payload = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    }

    const { data: inserted, error } = await supabase
      .from('TimelineStep')
      .insert(payload)
      .select()
      .single()
    if (error) return error.message
    setSteps((prev) => [...prev, inserted].sort((a, b) => a.date.localeCompare(b.date)))
    return null
  }, [])

  const updateStep = useCallback(async (id: string, data: StepUpdate): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('TimelineStep')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setSteps((prev) => prev.map((step) => (step.id === id ? updated : step)).sort((a, b) => a.date.localeCompare(b.date)))
    return null
  }, [])

  const deleteStep = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase
      .from('TimelineStep')
      .delete()
      .eq('id', id)
    if (error) return error.message
    setSteps((prev) => prev.filter((step) => step.id !== id))
    return null
  }, [])

  const deleteStepsForApplication = useCallback(async (applicationId: string) => {
    await supabase.from('TimelineStep').delete().eq('applicationId', applicationId)
    setSteps((prev) => prev.filter((s) => s.applicationId !== applicationId))
  }, [])

  const getStepsForApplication = useCallback(
    (applicationId: string) => steps.filter((s) => s.applicationId === applicationId),
    [steps],
  )

  return { steps, fetchStepsForApplication, addStep, updateStep, deleteStep, deleteStepsForApplication, getStepsForApplication }
}
