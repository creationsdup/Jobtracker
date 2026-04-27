import type { Application } from '@/lib/types'

const THRESHOLD_DAYS = 7
const MAX_DAYS = 21

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

interface UrgencyCardProps {
  applications: Application[]
}

export function UrgencyCard({ applications }: UrgencyCardProps) {
  const candidates = applications
    .filter((a) => a.status === 'APPLIED' || a.status === 'PHONE_SCREEN')
    .map((a) => ({ app: a, days: daysSince(a.appliedAt ?? a.updatedAt) }))
    .filter(({ days }) => days >= THRESHOLD_DAYS && days <= MAX_DAYS)
    .sort((a, b) => b.days - a.days)

  const top = candidates[0]
  if (!top) return null

  return (
    <div
      className="rounded-[var(--radius)] p-4 flex flex-col gap-3"
      style={{ background: '#fff8f0', border: '1px solid #fcd9a8' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: '#92400e' }}>
          Prochaine relance
        </span>
      </div>

      <div>
        <p className="text-[12px] font-medium truncate" style={{ color: '#b45309' }}>
          {top.app.company}
        </p>
        <p className="text-[11px] truncate" style={{ color: '#d97706' }}>
          {top.app.position}
        </p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-medium leading-none" style={{ fontSize: 22, color: '#f59e0b' }}>
          {top.days}
        </span>
        <span className="text-[12px]" style={{ color: '#b45309' }}>
          jours sans réponse
        </span>
      </div>

      <button
        className="w-full py-2 rounded-[var(--radius-sm)] text-white text-xs font-medium border-0 cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: '#f59e0b' }}
        onClick={() => {
          if (top.app.jobUrl) window.open(top.app.jobUrl, '_blank')
        }}
      >
        Envoyer la relance →
      </button>
    </div>
  )
}
