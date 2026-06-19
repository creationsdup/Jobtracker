import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
  collapsed?: boolean
}

export function SidebarItem({ to, label, icon: Icon, end, badge, collapsed }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 py-2.5 rounded-[12px] text-[13.5px] font-medium no-underline transition-all duration-150',
          collapsed ? 'justify-center px-0' : 'px-3.5',
          isActive
            ? 'text-white'
            : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
        )
      }
      style={({ isActive }) => (isActive ? { background: 'var(--color-nav-active-bg)' } : {})}
    >
      {({ isActive }) => (
        <>
          <Icon size={17} strokeWidth={isActive ? 2.25 : 1.9} className="flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{label}</span>
              {!!badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-px rounded-full leading-[1.4]"
                  style={
                    isActive
                      ? { background: '#ffffff', color: 'var(--color-primary)' }
                      : { background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }
                  }
                >
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}
