import type { Application } from '@/lib/types'

interface TipBannerProps {
  applications: Application[]
  onPrepare?: () => void
}

const TIPS = [
  'Personnalisez votre CV pour chaque offre — les recruteurs le remarquent.',
  'Relancez après 7 jours si vous n\'avez pas eu de retour.',
  'Ajoutez des métriques concrètes à vos expériences pour vous démarquer.',
  'Préparez 3 questions pertinentes pour chaque entretien.',
]

export function TipBanner({ applications, onPrepare }: TipBannerProps) {
  const interviewApp = applications.find(
    (a) => a.status === 'INTERVIEW' || a.status === 'TECHNICAL_TEST',
  )

  const tip = TIPS[new Date().getDay() % TIPS.length]

  return (
    <div
      className="rounded-[14px] p-4 flex items-center gap-4"
      style={{ background: 'var(--color-deep-space)' }}
    >
      <span style={{ fontSize: 22 }}>
        {interviewApp ? '🎯' : '💡'}
      </span>

      <div className="flex-1 min-w-0">
        {interviewApp ? (
          <>
            <p className="text-white font-semibold text-sm leading-tight">
              Entretien à venir
            </p>
            <p className="text-white/60 text-xs mt-0.5 truncate">
              {interviewApp.position} chez {interviewApp.company}
            </p>
          </>
        ) : (
          <p className="text-white/80 text-sm leading-snug">{tip}</p>
        )}
      </div>

      {interviewApp && (
        <button
          disabled={!onPrepare}
          onClick={onPrepare}
          className="flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border-0 cursor-not-allowed transition-opacity"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white', opacity: onPrepare ? 1 : 0.5 }}
        >
          Préparer ↗
        </button>
      )}
    </div>
  )
}
