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

/**
 * WHY: « Impossible de charger le tableau de bord. » ne distingue pas les trois pannes les plus
 * probables le premier jour (migration non appliquée, auteur pas encore admin, débordement SQL).
 * On garde donc le code et le message d’erreur d’origine pour les afficher en petit sous la
 * phrase principale, en plus d’un console.error détaillé.
 */
export interface AdminApiError {
  error: string
  code?: string
  detail?: string
}

// WHY: une seule question à la base par session. La réponse ne change pas en cours de visite,
// et elle est posée par App (pour la route) comme par MyBoardPage (pour le lien).
let adminCheck: Promise<boolean> | null = null

export function checkIsAdmin(): Promise<boolean> {
  // WHY: une erreur (appel sans session, réseau) n’est pas une réponse. La mettre en cache
  // figerait le « false » d’avant l’authentification pour toute la vie de la page.
  adminCheck ??= Promise.resolve(supabase.rpc('is_admin'))
    .then(({ data, error }) => {
      if (error) { adminCheck = null; return false }
      return data === true
    })
    .catch(() => { adminCheck = null; return false })
  return adminCheck
}

/** Pour les tests et après un changement de tableau. */
export function resetAdminCheck(): void {
  adminCheck = null
}

// WHY: les trois pannes les plus probables le premier jour ont chacune un code reconnaissable —
// autant le dire clairement plutôt que de laisser l’auteur deviner entre « migration pas passée »
// et « pas encore admin ».
function friendlyMessage(code: string | undefined): string {
  if (code === 'PGRST202') return 'Les fonctions SQL du tableau de bord ne sont pas installées.'
  if (code === '42501') return 'Ce tableau n’est pas inscrit comme administrateur.'
  return 'Impossible de charger le tableau de bord.'
}

export async function fetchAdminData(days: number): Promise<AdminData | AdminApiError> {
  const [meta, boards, sessions, series] = await Promise.all([
    supabase.rpc('admin_meta'),
    supabase.rpc('admin_boards', { p_days: days }),
    supabase.rpc('admin_sessions', { p_days: days }),
    // WHY: la courbe montre toujours au moins un trimestre, même quand les chiffres clés
    // portent sur 7 jours — sinon elle n’a que deux barres et ne dit rien.
    supabase.rpc('admin_timeseries', { p_days: Math.max(days, 90) }),
  ])

  const first = [meta, boards, sessions, series].find((result) => result.error)?.error
  if (first) {
    console.error('[admin] échec du chargement du tableau de bord', first)
    return { error: friendlyMessage(first.code), code: first.code, detail: first.message }
  }

  return {
    meta: meta.data as AdminMeta,
    boards: (boards.data ?? []) as BoardRow[],
    sessions: (sessions.data ?? []) as SessionRow[],
    days: (series.data ?? []) as DayRow[],
  }
}
