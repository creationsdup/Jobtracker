import { Pencil, Trash2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { GoalBadge } from './GoalBadge'
import { CompanyLogo } from './CompanyLogo'
import { formatDate } from '@/lib/utils'
import { computeAppScore, computeAppScoreBreakdown } from '@/hooks/useGoals'
import type { Application, UserGoal } from '@/lib/types'

interface CandidateTableProps {
  applications: Application[]
  goal?: UserGoal | null
  onOpenDetail: (app: Application) => void
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}

export function CandidateTable({ applications, goal, onOpenDetail, onEdit, onDelete, resolveLogo }: CandidateTableProps) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left border-collapse table-fixed">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[6%]" />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['Poste', 'Entreprise', 'Lieu', 'Statut', 'Date', 'Match', ''].map((col) => (
              <th
                key={col}
                className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] truncate"
                style={{ color: 'var(--color-muted)' }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const score = computeAppScore(goal ?? null, app)
            const scoreCriteria = computeAppScoreBreakdown(goal ?? null, app)
            return (
              <tr
                key={app.id}
                className="cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                style={{ borderBottom: '1px solid var(--color-border)' }}
                onClick={() => onOpenDetail(app)}
              >
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CompanyLogo company={app.company} logoUrl={resolveLogo(app.company)} size={28} />
                    <span className="font-semibold text-[13px] truncate" style={{ color: 'var(--color-text)' }} title={app.position}>
                      {app.position}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-[13px] truncate" style={{ color: 'var(--color-muted)' }} title={app.company}>{app.company}</td>
                <td className="px-3 py-3.5 text-[13px] truncate" style={{ color: 'var(--color-muted)' }} title={app.location ?? undefined}>{app.location ?? '—'}</td>
                <td className="px-3 py-3.5"><StatusBadge status={app.status} /></td>
                <td className="px-3 py-3.5 text-[13px] truncate" style={{ color: 'var(--color-muted)' }}>
                  {formatDate(app.appliedAt ?? app.createdAt)}
                </td>
                <td className="px-3 py-3.5">{score !== null ? <GoalBadge score={score} criteria={scoreCriteria} /> : <span className="text-[12px]" style={{ color: 'var(--color-subtle)' }}>—</span>}</td>
                <td className="px-2 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors hover:bg-[var(--color-bg)]"
                      style={{ color: 'var(--color-muted)' }}
                      onClick={() => onEdit(app)}
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors hover:bg-[var(--color-red-light)]"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => onDelete(app)}
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
