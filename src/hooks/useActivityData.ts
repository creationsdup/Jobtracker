import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface DayActivity {
  day: string
  count: number
  isMax: boolean
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function useActivityData(userId: string | null): DayActivity[] {
  const [data, setData] = useState<DayActivity[]>([])

  useEffect(() => {
    if (!userId) return

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    supabase
      .from('Application')
      .select('createdAt')
      .eq('userId', userId)
      .gte('createdAt', sevenDaysAgo)
      .then(({ data: rows }) => {
        const counts: Record<string, number> = {}

        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86_400_000)
          const key = d.toISOString().split('T')[0]
          counts[key] = 0
        }

        for (const row of rows ?? []) {
          const key = new Date(row.createdAt).toISOString().split('T')[0]
          if (key in counts) counts[key]++
        }

        const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
        const max = Math.max(...entries.map(([, v]) => v), 1)

        setData(
          entries.map(([dateStr, count]) => ({
            day: DAY_LABELS[new Date(dateStr).getDay()],
            count,
            isMax: count === max && count > 0,
          })),
        )
      })
  }, [userId])

  return data
}
