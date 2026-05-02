import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Application, UserGoal } from '@/lib/types'

export interface GoalUpdate {
  type?: string | null
  target_positions?: string[]
  contract_types?: string[]
  target_date?: string | null
  personal_target?: number | null
  zones?: string[]
  target_companies?: string[]
}

export interface GoalAlignment {
  zoneMatch: number        // % of applications in target zones
  contractMatch: number    // % of applications with target contract type
  companyMatch: number     // % of applications at target companies
  zoneApps: Application[]
  contractApps: Application[]
  companyApps: Application[]
  offTargetApps: Application[]
}

export function computeAppScore(goal: UserGoal | null, app: Application): number | null {
  if (!goal) return null

  const positions = goal.target_positions?.map((p) => p.toLowerCase().trim()) ?? []
  const zones     = goal.zones?.map((z) => z.toLowerCase().trim()) ?? []
  const contracts = goal.contract_types?.map((c) => c.toLowerCase().trim()) ?? []
  const companies = goal.target_companies?.map((c) => c.toLowerCase().trim()) ?? []

  const criteria: boolean[] = []

  if (positions.length > 0)
    criteria.push(positions.some((p) => app.position.toLowerCase().includes(p)))
  if (zones.length > 0)
    criteria.push(!!app.location && zones.some((z) => app.location!.toLowerCase().includes(z)))
  if (contracts.length > 0)
    criteria.push(!!app.contractType && contracts.includes(app.contractType.toLowerCase().trim()))
  if (companies.length > 0)
    criteria.push(companies.some((c) => app.company.toLowerCase().includes(c)))

  if (criteria.length === 0) return null
  return Math.round((criteria.filter(Boolean).length / criteria.length) * 100)
}

export function computeAlignment(goal: UserGoal | null, applications: Application[]): GoalAlignment {
  const active = applications.filter(
    (a) => !['REJECTED', 'WITHDRAWN'].includes(a.status),
  )

  if (!goal || active.length === 0) {
    return {
      zoneMatch: 0, contractMatch: 0, companyMatch: 0,
      zoneApps: [], contractApps: [], companyApps: [], offTargetApps: active,
    }
  }

  const zones = goal.zones.map((z) => z.toLowerCase().trim())
  const contracts = goal.contract_types.map((c) => c.toLowerCase().trim())
  const companies = goal.target_companies.map((c) => c.toLowerCase().trim())

  const zoneApps = zones.length === 0 ? active : active.filter(
    (a) => a.location && zones.some((z) => a.location!.toLowerCase().includes(z)),
  )
  const contractApps = contracts.length === 0 ? active : active.filter(
    (a) => a.contractType && contracts.includes(a.contractType.toLowerCase().trim()),
  )
  const companyApps = companies.length === 0 ? [] : active.filter(
    (a) => companies.some((c) => a.company.toLowerCase().includes(c)),
  )

  const offTargetApps = active.filter((a) => {
    const zoneOk = zones.length === 0 || zoneApps.includes(a)
    const contractOk = contracts.length === 0 || contractApps.includes(a)
    return !zoneOk || !contractOk
  })

  return {
    zoneMatch: zones.length === 0 ? 100 : Math.round((zoneApps.length / active.length) * 100),
    contractMatch: contracts.length === 0 ? 100 : Math.round((contractApps.length / active.length) * 100),
    companyMatch: companies.length === 0 ? 0 : Math.round((companyApps.length / active.length) * 100),
    zoneApps,
    contractApps,
    companyApps,
    offTargetApps,
  }
}

export function useGoals(userId: string | null, applications?: Application[]) {
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
          target_positions: updates.target_positions ?? [],
          contract_types: updates.contract_types ?? [],
          target_date: updates.target_date ?? null,
          personal_target: updates.personal_target ?? 12,
          zones: updates.zones ?? [],
          target_companies: updates.target_companies ?? [],
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

  const alignment = useMemo(
    () => computeAlignment(goal, applications ?? []),
    [goal, applications],
  )

  return { goal, loading, saving, saveGoal, refetch: fetchGoal, alignment }
}
