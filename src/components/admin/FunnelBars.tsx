import { formatShare, type FunnelStep } from '@/lib/adminStats'

export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="text-[var(--color-ink)]">{step.label}</span>
            <span className="text-[var(--color-muted)]">
              {step.count} · {formatShare(step.share)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${Math.round(step.share * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
