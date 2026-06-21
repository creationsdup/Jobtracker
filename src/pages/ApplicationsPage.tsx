import { useMemo, useState } from 'react'
import { Search, LayoutList, LayoutGrid, Columns, ArrowUpDown, ChevronDown, Plus } from 'lucide-react'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { StatusBadge } from '@/components/applications/StatusBadge'
import { MatchScoreBadge } from '@/components/applications/MatchScoreBadge'
import { CompanyLogo } from '@/components/applications/CompanyLogo'
import { CandidateTable } from '@/components/applications/CandidateTable'
import { KanbanPage } from '@/pages/KanbanPage'
import { formatDate } from '@/lib/utils'
import { calculateJobMatch, applicationToJobMatchInput } from '@/lib/jobMatching'
import type { Application, ApplicationStatus, UserGoal } from '@/lib/types'
import { APPLICABLE_STATUSES, STATUS_LABELS } from '@/lib/types'

type ViewMode = 'list' | 'grid' | 'kanban'

type SortMode = 'date_desc' | 'date_asc' | 'position_asc' | 'company_asc' | 'match_desc'

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  ...APPLICABLE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
]

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'date_desc', label: 'Plus récentes' },
  { value: 'date_asc', label: 'Plus anciennes' },
  { value: 'position_asc', label: 'Poste (A-Z)' },
  { value: 'company_asc', label: 'Entreprise (A-Z)' },
  { value: 'match_desc', label: 'Meilleur match' },
]

interface ApplicationsPageProps {
  applications: Application[]
  loading: boolean
  goal?: UserGoal | null
  onOpenDetail: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<string | null>
  onAdd: () => void
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}

// ─── Thumbnail card (grid view) ───────────────────────────────────────────────

function AppThumbnail({ app, goal, onClick, logoUrl }: { app: Application; goal?: UserGoal | null; onClick: () => void; logoUrl?: string }) {
  const match = goal ? calculateJobMatch(applicationToJobMatchInput(app), goal) : null
  const STATUS_DOT: Partial<Record<ApplicationStatus, string>> = {
    WISHLIST:  'bg-slate-400',
    APPLIED:   'bg-blue-400',
    INTERVIEW: 'bg-amber-400',
    OFFER:     'bg-green-400',
    REJECTED:  'bg-red-400',
  }

  return (
    <div
      className="card px-4 py-4 flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:-translate-y-px"
      style={{ borderColor: 'var(--color-border)' }}
      onClick={onClick}
    >
      {/* Logo + status dot */}
      <div className="flex items-start justify-between">
        <CompanyLogo company={app.company} logoUrl={logoUrl} size={44} />
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
        <div className="flex items-center gap-1">
          {match && <MatchScoreBadge result={match} onClick={onClick} />}
          <span className="text-[10px] text-[var(--color-muted)]">{formatDate(app.appliedAt ?? app.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── View toggle button ───────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full transition-all duration-150"
      style={active
        ? { background: 'var(--color-primary)', color: '#ffffff' }
        : { color: 'var(--color-muted)' }
      }
    >
      {children}
    </button>
  )
}

// ─── Filter select (pill-styled, custom chevron) ──────────────────────────────

function FilterSelect({ value, onChange, options, icon }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  icon?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted)]">
          {icon}
        </span>
      )}
      <select
        className={`appearance-none rounded-full text-[13px] font-medium cursor-pointer outline-none transition-colors ${icon ? 'pl-9' : 'pl-4'} pr-9 py-2 bg-white hover:bg-[var(--color-bg)]`}
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted)]" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ApplicationsPage({ applications, loading, goal, onOpenDetail, onStatusChange, onAdd, onEdit, onDelete, resolveLogo }: ApplicationsPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [contractFilter, setContractFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('date_desc')
  const [view, setView] = useState<ViewMode>('list')

  const contractOptions = useMemo(
    () => Array.from(new Set(applications.map((a) => a.contractType).filter((c): c is string => !!c))).sort(),
    [applications],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = applications
      .filter((a) => !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q))
      .filter((a) => !statusFilter || a.status === statusFilter)
      .filter((a) => !contractFilter || a.contractType === contractFilter)

    return [...result].sort((a, b) => {
      switch (sortMode) {
        case 'date_asc':
          return new Date(a.appliedAt ?? a.createdAt).getTime() - new Date(b.appliedAt ?? b.createdAt).getTime()
        case 'position_asc':
          return a.position.localeCompare(b.position)
        case 'company_asc':
          return a.company.localeCompare(b.company)
        case 'match_desc': {
          const scoreOf = (app: Application) => goal ? calculateJobMatch(applicationToJobMatchInput(app), goal).totalScore : -1
          return scoreOf(b) - scoreOf(a)
        }
        case 'date_desc':
        default:
          return new Date(b.appliedAt ?? b.createdAt).getTime() - new Date(a.appliedAt ?? a.createdAt).getTime()
      }
    })
  }, [applications, search, statusFilter, contractFilter, sortMode, goal])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Candidatures</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Gérez et suivez toutes vos candidatures</p>
        </div>
        <button className="btn btn-primary btn-sm shrink-0 gap-1.5" onClick={onAdd}>
          <Plus size={15} />
          Nouvelle candidature
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2.5 flex-col sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
          <input
            className="input pl-9 rounded-full"
            placeholder="Rechercher une candidature..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter — hidden in kanban (columns already segment by status) */}
        {view !== 'kanban' && (
          <FilterSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ApplicationStatus | '')}
            options={STATUS_OPTIONS}
          />
        )}

        {/* Contract type filter */}
        {view !== 'kanban' && contractOptions.length > 0 && (
          <FilterSelect
            value={contractFilter}
            onChange={setContractFilter}
            options={[{ value: '', label: 'Tous les contrats' }, ...contractOptions.map((c) => ({ value: c, label: c }))]}
          />
        )}

        {/* Sort */}
        {view !== 'kanban' && (
          <FilterSelect
            value={sortMode}
            onChange={(v) => setSortMode(v as SortMode)}
            options={SORT_OPTIONS}
            icon={<ArrowUpDown size={13} />}
          />
        )}

        <div className="flex-1 hidden sm:block" />

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-full bg-[var(--color-bg)] p-1 self-start" style={{ border: '1px solid var(--color-border)' }}>
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
          goal={goal}
          onStatusChange={onStatusChange}
          onOpenDetail={onOpenDetail}
          resolveLogo={resolveLogo}
          standalone={false}
        />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-deep-space-light)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <p className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>Aucune candidature trouvée</p>
          <p className="text-sm mt-1.5">Modifiez les filtres ou ajoutez votre première opportunité.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={onAdd}>+ Ajouter une candidature</button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((app) => (
            <AppThumbnail key={app.id} app={app} goal={goal} onClick={() => onOpenDetail(app)} logoUrl={resolveLogo(app.company)} />
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <CandidateTable applications={filtered} goal={goal} onOpenDetail={onOpenDetail} onEdit={onEdit} onDelete={onDelete} resolveLogo={resolveLogo} />
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((app) => (
              <ApplicationCard key={app.id} application={app} goal={goal} onClick={() => onOpenDetail(app)} logoUrl={resolveLogo(app.company)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
