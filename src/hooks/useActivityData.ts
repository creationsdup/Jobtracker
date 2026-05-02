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
      .then(({ data: rows, error }) => {
        if (error) return
        const counts: Record<string, number> = {}

        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86_400_000)
          const key = d.toISOString().split('T')[0]
          counts[key] = 0
        }

        for (const row of rows ?? []) {
          // Use local date so the activity lands on the correct day in the user's timezone
          const d = new Date(row.createdAt)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (key in counts) counts[key]++
        }

        const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
        const max = Math.max(...entries.map(([, v]) => v), 1)

        setData(
          entries.map(([dateStr, count]) => ({
            // Parse as local date to avoid UTC-midnight off-by-one in negative UTC offsets
            day: DAY_LABELS[new Date(`${dateStr}T00:00:00`).getDay()],
            count,
            isMax: count === max && count > 0,
          })),
        )
      })
  }, [userId])

  return data
}
