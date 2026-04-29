import { useEffect, useState } from 'react'
import type { Application } from '@/lib/types'
import { useGoals } from '@/hooks/useGoals'

const GOAL_TARGET = 10

function DonutChart({ pct }: { pct: number }) {
  const r = 20
  const cx = 26
  const cy = 26
  const circumference = 2 * Math.PI * r
  const filled = (pct / 100) * circumference

  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="5"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#111827"
      >
        {pct}%
      </text>
    </svg>
  )
}

interface GoalCardProps {
  userId: string
  applications: Application[]
}

export function GoalCard({ userId, applications }: GoalCardProps) {
  const { goal, loading, saving, saveGoal } = useGoals(userId)
  const [target, setTarget] = useState(GOAL_TARGET)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(target))

  useEffect(() => {
    if (goal?.personal_target) {
      setTarget(goal.personal_target)
      setDraft(String(goal.personal_target))
    }
  }, [goal?.personal_target])

  const now = new Date()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const thisMonth = applications.filter((a) => {
    const d = new Date(a.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const pct = Math.min(100, Math.round((thisMonth / target) * 100))

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Objectif
        </span>
        <button
          className="text-[11px] text-[var(--color-primary)] bg-transparent border-0 cursor-pointer hover:underline"
          onClick={() => { setEditing(true); setDraft(String(target)) }}
        >
          Modifier
        </button>
      </div>

      <div className="flex items-center gap-3">
        <DonutChart pct={pct} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const v = parseInt(draft, 10)
                if (v > 0) {
                  setTarget(v)
                  void saveGoal({ personal_target: v })
                }
                setEditing(false)
              }}
              className="flex gap-1"
            >
              <input
                className="input py-1 text-xs w-16"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                type="number"
                min="1"
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-sm text-[11px]" disabled={saving}>OK</button>
            </form>
          ) : (
            <p className="text-[13px] font-medium leading-tight">
              {thisMonth} / {target} candidatures
            </p>
          )}
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            {loading ? 'Chargement…' : `${monthLabel} · avant le ${endOfMonth}`}
          </p>
        </div>
      </div>
    </div>
  )
}
