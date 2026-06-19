import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  delta?: string
  deltaTone?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, icon, delta, deltaTone = 'neutral' }: StatCardProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] px-4 py-3.5 flex flex-col gap-2.5"
      style={{ background: 'var(--color-primary)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-white/80">{label}</span>
        <div
          className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[38px] leading-none font-extrabold text-white">{value}</span>
        {delta && (
          <span
            className="text-[11px] font-semibold pb-1"
            style={{
              color:
                deltaTone === 'up' ? '#86efac' : deltaTone === 'down' ? '#fca5a5' : 'rgba(255,255,255,0.7)',
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
