import { useState } from 'react'
import { Search, LayoutList, LayoutGrid, Columns } from 'lucide-react'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { StatusBadge } from '@/components/applications/StatusBadge'
import { KanbanPage } from '@/pages/KanbanPage'
import { formatDate, getInitial } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/lib/types'

type ViewMode = 'list' | 'grid' | 'kanban'

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'WISHLIST', label: 'À postuler' },
  { value: 'APPLIED', label: 'Postulée' },
  { value: 'PHONE_SCREEN', label: 'Pré-sélection' },
  { value: 'INTERVIEW', label: 'Entretien' },
  { value: 'TECHNICAL_TEST', label: 'Test technique' },
  { value: 'OFFER', label: 'Offre reçue' },
  { value: 'ACCEPTED', label: 'Acceptée' },
  { value: 'REJECTED', label: 'Refusée' },
  { value: 'WITHDRAWN', label: 'Abandonnée' },
]

interface ApplicationsPageProps {
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<string | null>
  onAdd: () => void
}

// ─── Thumbnail card (grid view) ───────────────────────────────────────────────

function AppThumbnail({ app, onClick }: { app: Application; onClick: () => void }) {
  const STATUS_DOT: Partial<Record<ApplicationStatus, string>> = {
    WISHLIST:       'bg-slate-400',
    APPLIED:        'bg-blue-400',
    PHONE_SCREEN:   'bg-sky-400',
    INTERVIEW:      'bg-amber-400',
    TECHNICAL_TEST: 'bg-orange-400',
    OFFER:          'bg-green-400',
    ACCEPTED:       'bg-emerald-500',
    REJECTED:       'bg-red-400',
    WITHDRAWN:      'bg-gray-400',
  }

  return (
    <div
      className="card px-4 py-4 flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:-translate-y-px hover:border-[var(--color-border)] border border-transparent"
      onClick={onClick}
    >
      {/* Logo + status dot */}
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-lg font-bold text-[var(--color-primary)]">
          {getInitial(app.company)}
        </div>
        <span className={`w-2.5 h-2.5 rounded-full mt-1 ${STATUS_DOT[app.status] ?? 'bg-gray-400'}`} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{app.position}</p>
        <p className="text-xs text-[var(--color-muted)] truncate">{app.company}</p>
        {app.location && (
          <p className="text-[10px] text-[var(--color-muted)] truncate mt-0.5">{app.location}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-[var(--color-border)]">
        <StatusBadge status={app.status} />
        <span className="text-[10px] text-[var(--color-muted)]">{formatDate(app.appliedAt ?? app.createdAt)}</span>
      </div>
    </div>
  )
}

// ─── View toggle button ───────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ApplicationsPage({ applications, loading, onOpenDetail, onStatusChange, onAdd }: ApplicationsPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [view, setView] = useState<ViewMode>('list')

  const filtered = applications
    .filter((a) => {
      const q = search.toLowerCase()
      return !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
    })
    .filter((a) => !statusFilter || a.status === statusFilter)

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            className="input pl-8"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter — hidden in kanban (columns already segment by status) */}
        {view !== 'kanban' && (
          <select
            className="input sm:w-52"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] px-1 py-1 self-start">
          <ViewBtn active={view === 'list'} onClick={() => setView('list')}>
            <LayoutList size={15} />
          </ViewBtn>
          <ViewBtn active={view === 'grid'} onClick={() => setView('grid')}>
            <LayoutGrid size={15} />
          </ViewBtn>
          <ViewBtn active={view === 'kanban'} onClick={() => setView('kanban')}>
            <Columns size={15} />
          </ViewBtn>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'flex flex-col gap-3'}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-[var(--color-bg)]" />
          ))}
        </div>
      ) : view === 'kanban' ? (
        <KanbanPage
          applications={filtered}
          onStatusChange={onStatusChange}
          onOpenDetail={onOpenDetail}
          onAdd={onAdd}
        />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-semibold">Aucune candidature trouvée</p>
          <p className="text-xs mt-1">Modifiez les filtres ou ajoutez une candidature.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((app) => (
            <AppThumbnail key={app.id} app={app} onClick={() => onOpenDetail(app)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((app) => (
            <ApplicationCard key={app.id} application={app} onClick={() => onOpenDetail(app)} />
          ))}
        </div>
      )}
    </div>
  )
}
