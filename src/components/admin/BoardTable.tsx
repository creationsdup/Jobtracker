import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { relativeDays, shortBoardId, type BoardRow } from '@/lib/adminStats'
import { cn } from '@/lib/utils'

type SortKey = 'last_seen_at' | 'created_at' | 'applications' | 'sessions' | 'clicks'

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: null, label: 'Tableau' },
  { key: 'created_at', label: 'Créé le' },
  { key: 'last_seen_at', label: 'Dernière utilisation' },
  { key: 'sessions', label: 'Sessions', numeric: true },
  { key: 'clicks', label: 'Clics', numeric: true },
  { key: 'applications', label: 'Candidatures', numeric: true },
  { key: null, label: 'Extension' },
  { key: null, label: 'Sécurisé' },
]

function compare(a: BoardRow, b: BoardRow, key: SortKey): number {
  if (key === 'last_seen_at' || key === 'created_at') return Date.parse(b[key]) - Date.parse(a[key])
  return b[key] - a[key]
}

export function BoardTable({ boards, now }: { boards: BoardRow[]; now: number }) {
  const [sortKey, setSortKey] = useState<SortKey>('last_seen_at')
  const sorted = [...boards].sort((a, b) => compare(a, b, sortKey))

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                className={cn('px-3 py-2.5 font-semibold text-[var(--color-muted)]', column.numeric ? 'text-right' : 'text-left')}
              >
                {column.key ? (
                  <button
                    type="button"
                    onClick={() => setSortKey(column.key!)}
                    aria-pressed={sortKey === column.key}
                    className={cn('inline-flex items-center gap-1', sortKey === column.key && 'text-[var(--color-primary)]')}
                  >
                    {column.label}
                    <ArrowUpDown size={12} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((board) => (
            <tr key={board.user_id} className="border-b border-[var(--color-border)] last:border-0">
              {/* WHY: jamais l’email ni le code — seulement un identifiant court, qui suffit à
                  reconnaître une ligne d’une visite à l’autre. */}
              <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--color-ink)]">{shortBoardId(board.user_id)}</td>
              <td className="px-3 py-2.5 text-[var(--color-muted)]">{board.created_at.slice(0, 10)}</td>
              <td className="px-3 py-2.5 text-[var(--color-ink)]">{relativeDays(board.last_seen_at, now)}</td>
              <td className="px-3 py-2.5 text-right">{board.sessions || '—'}</td>
              <td className="px-3 py-2.5 text-right">{board.clicks || '—'}</td>
              <td className="px-3 py-2.5 text-right">{board.applications}</td>
              <td className="px-3 py-2.5">{board.has_extension ? 'oui' : '—'}</td>
              <td className="px-3 py-2.5">{board.secured ? 'sécurisé' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="px-3 py-6 text-center text-[var(--color-muted)]">Aucun tableau.</p>}
    </div>
  )
}
