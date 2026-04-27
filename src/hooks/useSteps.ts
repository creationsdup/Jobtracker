import { useState, useCallback } from 'react'
import type { TimelineStep } from '@/lib/types'
import { uid } from '@/lib/utils'

const STORAGE_KEY = 'jt_steps'

function load(): TimelineStep[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? []
  } catch {
    return []
  }
}

function save(steps: TimelineStep[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(steps))
}

export function useSteps() {
  const [steps, setSteps] = useState<TimelineStep[]>(load)

  const persist = useCallback((next: TimelineStep[]) => {
    save(next)
    setSteps(next)
  }, [])

  const addStep = useCallback(
    (data: Omit<TimelineStep, 'id' | 'created_at'>) => {
      const next = [...load(), { id: uid(), ...data, created_at: new Date().toISOString() }]
      persist(next)
    },
    [persist],
  )

  const deleteStepsForApplication = useCallback(
    (applicationId: string) => {
      persist(load().filter((s) => s.application_id !== applicationId))
    },
    [persist],
  )

  const getStepsForApplication = useCallback(
    (applicationId: string) =>
      steps.filter((s) => s.application_id === applicationId).sort((a, b) => a.date.localeCompare(b.date)),
    [steps],
  )

  return { steps, addStep, deleteStepsForApplication, getStepsForApplication }
}
