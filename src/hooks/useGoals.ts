import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserGoal } from '@/lib/types'

export interface GoalUpdate {
  target_title?: string | null
  target_roles?: string[]
  contract_types?: string[]
  locations?: string[]
  target_companies?: string[]
  sectors?: string[]
  keywords_wanted?: string[]
  keywords_excluded?: string[]
  experience_level?: string[]
  scoring_priorities?: string | null
  target_date?: string | null
  personal_target?: number | null
}

export function useGoals(userId: string | null) {
  const [goals, setGoals] = useState<UserGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    setGoals(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // The goal used for match scoring everywhere outside this page. Falls back
  // to the first goal if none is flagged active yet (shouldn't happen once
  // the migration backfill has run, but keeps the app usable either way).
  const activeGoal = useMemo(
    () => goals.find((g) => g.is_active) ?? goals[0] ?? null,
    [goals],
  )

  const createGoal = useCallback(async (updates: GoalUpdate): Promise<{ id: string | null; error: string | null }> => {
    if (!userId) return { id: null, error: 'Non authentifié' }
    setSaving(true)

    const { data, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: userId,
        is_active: goals.length === 0,
        target_title: updates.target_title ?? null,
        target_roles: updates.target_roles ?? [],
        contract_types: updates.contract_types ?? [],
        locations: updates.locations ?? [],
        target_companies: updates.target_companies ?? [],
        sectors: updates.sectors ?? [],
        keywords_wanted: updates.keywords_wanted ?? [],
        keywords_excluded: updates.keywords_excluded ?? [],
        experience_level: updates.experience_level ?? [],
        scoring_priorities: updates.scoring_priorities ?? null,
        target_date: updates.target_date ?? null,
        personal_target: updates.personal_target ?? 12,
      })
      .select()
      .single()

    setSaving(false)
    if (error) return { id: null, error: error.message }
    setGoals((prev) => [...prev, data])
    return { id: data.id, error: null }
  }, [userId, goals.length])

  const saveGoal = useCallback(async (goalId: string, updates: GoalUpdate): Promise<string | null> => {
    setSaving(true)

    const { data, error } = await supabase
      .from('user_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .single()

    setSaving(false)
    if (error) return error.message
    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)))
    return null
  }, [])

  const setActiveGoal = useCallback(async (goalId: string): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    setSaving(true)

    // Clear the previous active row before setting the new one — the unique
    // partial index on user_goals would reject having two active at once.
    const { error: clearError } = await supabase
      .from('user_goals')
      .update({ is_active: false })
      .eq('user_id', userId)
    if (clearError) {
      setSaving(false)
      return clearError.message
    }

    const { error: setError } = await supabase
      .from('user_goals')
      .update({ is_active: true })
      .eq('id', goalId)

    setSaving(false)
    if (setError) return setError.message
    setGoals((prev) => prev.map((g) => ({ ...g, is_active: g.id === goalId })))
    return null
  }, [userId])

  const deleteGoal = useCallback(async (goalId: string): Promise<string | null> => {
    setSaving(true)
    const { error } = await supabase.from('user_goals').delete().eq('id', goalId)
    setSaving(false)
    if (error) return error.message

    setGoals((prev) => {
      const deletedWasActive = prev.find((g) => g.id === goalId)?.is_active ?? false
      const remaining = prev.filter((g) => g.id !== goalId)
      if (!deletedWasActive || remaining.length === 0) return remaining

      // Deleting the active goal must promote another one, otherwise scoring
      // silently has nothing to use app-wide until the user picks a new active goal.
      const promoted = remaining[0]
      void supabase.from('user_goals').update({ is_active: true }).eq('id', promoted.id)
      return remaining.map((g) => (g.id === promoted.id ? { ...g, is_active: true } : g))
    })
    return null
  }, [])

  return { goals, activeGoal, loading, saving, createGoal, saveGoal, setActiveGoal, deleteGoal, refetch: fetchGoals }
}
