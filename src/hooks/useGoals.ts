import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserGoal } from '@/lib/types'

export interface GoalUpdate {
  type?: string | null
  contract_types?: string[]
  target_date?: string | null
  personal_target?: number | null
  zones?: string[]
}

export function useGoals(userId: string | null) {
  const [goal, setGoal] = useState<UserGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchGoal = useCallback(async () => {
    if (!userId) {
      setGoal(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setGoal(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  const saveGoal = useCallback(async (updates: GoalUpdate): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    setSaving(true)

    const payload = goal
      ? { ...goal, ...updates, updated_at: new Date().toISOString() }
      : {
          user_id: userId,
          type: updates.type ?? null,
          contract_types: updates.contract_types ?? [],
          target_date: updates.target_date ?? null,
          personal_target: updates.personal_target ?? 12,
          zones: updates.zones ?? [],
        }

    const { data, error } = await supabase
      .from('user_goals')
      .upsert(payload)
      .select()
      .single()

    setSaving(false)
    if (error) return error.message
    setGoal(data)
    return null
  }, [goal, userId])

  return { goal, loading, saving, saveGoal, refetch: fetchGoal }
}
