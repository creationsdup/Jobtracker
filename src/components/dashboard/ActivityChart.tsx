import type { DayActivity } from '@/hooks/useActivityData'

interface ActivityChartProps {
  data: DayActivity[]
}

const BAR_MAX_H = 48
const BAR_W = 20
const GAP = 8
const LABEL_H = 16

export function ActivityChart({ data }: ActivityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const totalW = data.length * (BAR_W + GAP) - GAP
  const totalH = BAR_MAX_H + LABEL_H + 6

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius)] shadow-[var(--shadow)] p-4 flex flex-col gap-3">
      <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Activité (7j)</span>

      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {data.map((d, i) => {
          const barH = d.count === 0 ? 3 : Math.max(4, (d.count / maxCount) * BAR_MAX_H)
          const x = i * (BAR_W + GAP)
          const y = BAR_MAX_H - barH

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={4}
                fill={d.isMax ? '#007EA7' : '#E0F4FB'}
              />
              <text
                x={x + BAR_W / 2}
                y={BAR_MAX_H + LABEL_H}
                textAnchor="middle"
                fontSize={10}
                fill="#5B6B73"
              >
                {d.day}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
