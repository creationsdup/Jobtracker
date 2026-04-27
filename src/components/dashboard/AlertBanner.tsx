import type { Application } from '@/lib/types'

interface AlertBannerProps {
  applications: Application[]
  onOpenDetail: (app: Application) => void
}

export function AlertBanner({ applications, onOpenDetail }: AlertBannerProps) {
  const interviewApps = applications
    .filter((a) => a.status === 'INTERVIEW')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const active = interviewApps[0]
  if (!active) return null

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] mb-4"
      style={{
        background: '#f0f4ff',
        border: '0.5px solid #bfcfff',
      }}
    >
      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-[var(--color-ink)]">
        Entretien en cours —{' '}
        <strong>{active.position}</strong>{' '}
        chez {active.company}
      </p>
      <button
        className="text-[var(--color-primary)] text-sm font-medium whitespace-nowrap bg-transparent border-0 cursor-pointer hover:underline"
        onClick={() => onOpenDetail(active)}
      >
        Préparer l'entretien →
      </button>
    </div>
  )
}
