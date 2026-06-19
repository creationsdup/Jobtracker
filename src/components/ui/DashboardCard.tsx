import type { ReactNode } from 'react'

interface DashboardCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardCard({
  title, subtitle, action, children, className,
}: DashboardCardProps) {
  return (
    <div className={`card px-4 py-3.5 flex flex-col gap-3 min-h-0 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-tight truncate" style={{ color: 'var(--color-primary)' }}>{title}</h3>
          {subtitle && <p className="text-[12px] text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
