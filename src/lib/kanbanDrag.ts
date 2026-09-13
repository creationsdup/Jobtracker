import { KANBAN_COLUMNS, type Application, type ApplicationStatus } from './types'

/** Cartes lâchées dans une autre colonne mais pas encore confirmées par Supabase : id → nouveau statut. */
export type PendingMoves = Readonly<Record<string, ApplicationStatus>>

/** Statut visé par un dépôt : la colonne survolée, ou la colonne de la carte survolée. */
export function resolveDropStatus(overId: string | number | null | undefined, applications: Application[]): ApplicationStatus | null {
  if (overId === null || overId === undefined) return null
  const id = String(overId)
  const column = KANBAN_COLUMNS.find((status) => status === id)
  if (column) return column
  return applications.find((app) => app.id === id)?.status ?? null
}

export function applyPendingMoves(applications: Application[], pending: PendingMoves): Application[] {
  if (Object.keys(pending).length === 0) return applications
  return applications.map((app) => {
    const status = pending[app.id]
    return status && status !== app.status ? { ...app, status } : app
  })
}

/** Oublie les déplacements que le serveur a confirmés (ou dont la carte a disparu). */
export function settlePendingMoves(pending: PendingMoves, applications: Application[]): PendingMoves {
  const ids = Object.keys(pending)
  const waiting = ids.filter((id) => {
    const app = applications.find((a) => a.id === id)
    return app !== undefined && app.status !== pending[id]
  })
  if (waiting.length === ids.length) return pending
  return Object.fromEntries(waiting.map((id) => [id, pending[id]]))
}

export function withMove(pending: PendingMoves, id: string, status: ApplicationStatus): PendingMoves {
  return { ...pending, [id]: status }
}

export function withoutMove(pending: PendingMoves, id: string): PendingMoves {
  if (!(id in pending)) return pending
  return Object.fromEntries(Object.entries(pending).filter(([key]) => key !== id))
}
