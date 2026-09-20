import { supabase } from './supabase'
import type { BoardRow, DayRow, SessionRow } from './adminStats'

export interface AdminMeta {
  measurement_start: string | null
  boards_total: number
  events_total: number
  opted_out: number
}

export interface AdminData {
  meta: AdminMeta
  boards: BoardRow[]
  sessions: SessionRow[]
  days: DayRow[]
}

// WHY: une seule question à la base par session. La réponse ne change pas en cours de visite,
// et elle est posée par App (pour la route) comme par MyBoardPage (pour le lien).
let adminCheck: Promise<boolean> | null = null

export function checkIsAdmin(): Promise<boolean> {
  adminCheck ??= Promise.resolve(supabase.rpc('is_admin')).then(({ data, error }) => !error && data === true)
  return adminCheck
}

/** Pour les tests et après un changement de tableau. */
export function resetAdminCheck(): void {
  adminCheck = null
}

export async function fetchAdminData(days: number): Promise<AdminData | { error: string }> {
  const [meta, boards, sessions, series] = await Promise.all([
    supabase.rpc('admin_meta'),
    supabase.rpc('admin_boards', { p_days: days }),
    supabase.rpc('admin_sessions', { p_days: days }),
    // WHY: la courbe montre toujours au moins un trimestre, même quand les chiffres clés
    // portent sur 7 jours — sinon elle n’a que deux barres et ne dit rien.
    supabase.rpc('admin_timeseries', { p_days: Math.max(days, 90) }),
  ])

  if (meta.error || boards.error || sessions.error || series.error) {
    return { error: 'Impossible de charger le tableau de bord.' }
  }

  return {
    meta: meta.data as AdminMeta,
    boards: (boards.data ?? []) as BoardRow[],
    sessions: (sessions.data ?? []) as SessionRow[],
    days: (series.data ?? []) as DayRow[],
  }
}
