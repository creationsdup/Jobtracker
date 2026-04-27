import { formatDate } from '@/lib/utils'
import { STATUS_LABELS, type Application, type ApplicationStatus } from '@/lib/types'

const COLUMNS: { status: ApplicationStatus; dotColor: string }[] = [
  { status: 'saved', dotColor: 'bg-gray-400' },
  { status: 'applied', dotColor: 'bg-blue-500' },
  { status: 'interview', dotColor: 'bg-orange-500' },
  { status: 'offer', dotColor: 'bg-green-500' },
  { status: 'rejected', dotColor: 'bg-red-500' },
]

interface KanbanPageProps {
  applications: Application[]
  onOpenDetail: (app: Application) => void
}

export function KanbanPage({ applications, onOpenDetail }: KanbanPageProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-160px)]">
      {COLUMNS.map(({ status, dotColor }) => {
        const cards = applications.filter((a) => a.status === status)
        return (
          <div
            key={status}
            className="bg-[var(--color-bg)] rounded-[var(--radius)] p-3 min-w-[220px] flex-1 border border-[var(--color-border)]"
          >
            <div className="flex items-center gap-2 text-xs font-semibold mb-3 px-1">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              {STATUS_LABELS[status]}
              <span className="ml-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
                {cards.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {cards.map((app) => (
                <div
                  key={app.id}
                  className="bg-[var(--color-surface)] rounded-lg p-3 shadow-[var(--shadow)] cursor-pointer transition-shadow duration-150 border border-transparent hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border)]"
                  onClick={() => onOpenDetail(app)}
                >
                  <div className="font-semibold text-xs mb-0.5">{app.role}</div>
                  <div className="text-[11px] text-[var(--color-muted)]">{app.company}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-2">{formatDate(app.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
