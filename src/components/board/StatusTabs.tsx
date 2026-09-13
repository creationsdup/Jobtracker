import { useState } from 'react'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { KANBAN_COLUMNS, STATUS_LABELS, type Application, type ApplicationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatusTabsProps {
  applications: Application[]
  onOpenDetail: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}

// WHY: sur téléphone, 5 colonnes côte à côte obligent à défiler de côté et le glisser-déposer gêne
// le défilement : on affiche un statut à la fois, et le statut se change depuis la fiche détail.
export function StatusTabs({ applications, onOpenDetail, resolveLogo }: StatusTabsProps) {
  const [selected, setSelected] = useState<ApplicationStatus | null>(null)

  const counts = KANBAN_COLUMNS.map((status) => ({
    status,
    count: applications.filter((a) => a.status === status).length,
  }))
  // Tant que rien n'est choisi, on ouvre le premier statut qui contient des candidatures.
  const current = selected ?? counts.find(({ count }) => count > 0)?.status ?? KANBAN_COLUMNS[0]
  const visible = applications.filter((a) => a.status === current)

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Statut" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar">
        {counts.map(({ status, count }) => {
          const active = status === current
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(status)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                active ? 'text-white' : 'bg-white text-[var(--color-muted)]',
              )}
              style={active ? { background: 'var(--color-primary)' } : { border: '1px solid var(--color-border)' }}
            >
              {STATUS_LABELS[status]} · {count}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">Aucune candidature « {STATUS_LABELS[current]} ».</p>
      ) : (
        visible.map((app) => (
          <ApplicationCard key={app.id} application={app} onClick={() => onOpenDetail(app)} logoUrl={resolveLogo(app.company)} />
        ))
      )}
    </div>
  )
}
