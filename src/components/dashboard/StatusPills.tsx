import type { Application, ApplicationStatus } from '@/lib/types'

interface Pill {
  status: ApplicationStatus
  label: string
  color: string
}

const PILLS: Pill[] = [
  { status: 'WISHLIST',  label: 'À postuler', color: '#9ca3af' },
  { status: 'APPLIED',   label: 'Postulée',   color: '#6366f1' },
  { status: 'INTERVIEW', label: 'Entretien',  color: '#f59e0b' },
  { status: 'OFFER',     label: 'Offre',      color: '#10b981' },
  { status: 'REJECTED',  label: 'Refusée',    color: '#ef4444' },
]

interface StatusPillsProps {
  applications: Application[]
  loading: boolean
}

export function StatusPills({ applications, loading }: StatusPillsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {PILLS.map(({ status, label, color }) => {
        const count = applications.filter((a) => a.status === status).length
        return (
          <div
            key={status}
            className="card px-3 py-3 flex flex-col gap-1 transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
            style={{ borderTop: `2px solid ${color}` }}
          >
            <span
              className="font-medium leading-none"
              style={{ fontSize: 22 }}
            >
              {loading ? '—' : count}
            </span>
            <span
              className="text-[var(--color-muted)] leading-tight"
              style={{ fontSize: 11 }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
