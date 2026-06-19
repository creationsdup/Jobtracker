interface StatCardProps {
  label: string
  count: number
  accentColor: string
  badgeBg: string
  badgeFg: string
  loading?: boolean
  onClick?: () => void
}

export function StatCard({ label, count, accentColor, badgeBg, badgeFg, loading, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-2 text-left w-full cursor-pointer transition-shadow duration-150 hover:shadow-[var(--shadow-md)] border-0"
      style={{ borderBottom: `3px solid ${accentColor}` }}
    >
      <span
        className="font-medium leading-none"
        style={{ fontSize: 30, color: 'var(--color-deep-space)' }}
      >
        {loading ? '—' : count}
      </span>
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium w-fit"
        style={{ background: badgeBg, color: badgeFg }}
      >
        {label}
      </span>
    </button>
  )
}
