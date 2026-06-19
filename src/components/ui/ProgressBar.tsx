interface ProgressBarProps {
  label: string
  value: number
  tone?: string
}

export function ProgressBar({ label, value, tone = 'var(--color-accent)' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[var(--color-text)]">{label}</span>
        <span className="text-[12px] font-semibold text-[var(--color-muted)]">{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>
    </div>
  )
}
