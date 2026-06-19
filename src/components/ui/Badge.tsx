import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  bg: string
  fg: string
  icon?: ReactNode
  className?: string
}

export function Badge({ children, bg, fg, icon, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none ${className ?? ''}`}
      style={{ background: bg, color: fg }}
    >
      {icon}
      {children}
    </span>
  )
}
