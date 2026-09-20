import { useMemo, useState } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { CandidateTable } from '@/components/applications/CandidateTable'
import { FilterSelect } from '@/components/applications/FilterSelect'
import { BoardSummaryStrip } from '@/components/board/BoardSummaryStrip'
import { BoardViewToggle } from '@/components/board/BoardViewToggle'
import { StatusTabs } from '@/components/board/StatusTabs'
import { KanbanPage } from '@/pages/KanbanPage'
import { track } from '@/lib/usageClient'
import { STATUS_OPTIONS, filterAndSortApplications, sortOptions, type SortMode } from '@/lib/applicationFilters'
import { computeBoardSummary } from '@/lib/boardSummary'
import { readBoardView, saveBoardView, type BoardView } from '@/lib/boardView'
import type { Application, ApplicationStatus } from '@/lib/types'

const SORT_OPTIONS = sortOptions(false)

interface BoardPageProps {
  applications: Application[]
  loading: boolean
  onOpenDetail: (app: Application) => void
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<string | null>
  onAdd: () => void
  onEdit: (app: Application) => void
  onDelete: (app: Application) => void
  resolveLogo: (company: string) => string | undefined
}

/** Page unique de l'édition lite : 4 chiffres, puis les candidatures en colonnes ou en liste. */
export function BoardPage({ applications, loading, onOpenDetail, onStatusChange, onAdd, onEdit, onDelete, resolveLogo }: BoardPageProps) {
  const [view, setView] = useState<BoardView>(readBoardView)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [sortMode, setSortMode] = useState<SortMode>('date_desc')

  const summary = useMemo(() => computeBoardSummary(applications, Date.now()), [applications])
  // WHY: le filtre de statut et le tri n'existent qu'en liste ; en colonnes, seule la recherche s'applique.
  const filtered = useMemo(
    () => filterAndSortApplications(applications, { search, status: view === 'list' ? statusFilter : '', contract: '', sort: sortMode }),
    [applications, search, statusFilter, sortMode, view],
  )

  function changeView(next: BoardView) {
    setView(next)
    saveBoardView(next)
    track('view_switched', { to: next })
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <h1 className="sr-only">Mes candidatures</h1>
      <BoardSummaryStrip summary={summary} />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
          <input
            className="input pl-9 rounded-full"
            placeholder="Rechercher une candidature..."
            aria-label="Rechercher une candidature"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {view === 'list' && (
          <>
            <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as ApplicationStatus | '')} options={STATUS_OPTIONS} />
            <FilterSelect value={sortMode} onChange={(v) => setSortMode(v as SortMode)} options={SORT_OPTIONS} icon={<ArrowUpDown size={13} />} />
          </>
        )}
        <BoardViewToggle value={view} onChange={changeView} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-[var(--color-bg)]" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <p className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>Ton tableau est vide</p>
          <p className="text-sm mt-1.5">Ajoute ta première candidature pour commencer le suivi.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={onAdd}>+ Ajouter une candidature</button>
        </div>
      ) : view === 'columns' ? (
        <>
          <div className="hidden md:block">
            <KanbanPage applications={filtered} onStatusChange={onStatusChange} onOpenDetail={onOpenDetail} resolveLogo={resolveLogo} standalone={false} />
          </div>
          <div className="md:hidden">
            <StatusTabs applications={filtered} onOpenDetail={onOpenDetail} resolveLogo={resolveLogo} />
          </div>
        </>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">Aucune candidature ne correspond à ces filtres.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <CandidateTable applications={filtered} onOpenDetail={onOpenDetail} onEdit={onEdit} onDelete={onDelete} resolveLogo={resolveLogo} />
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((app) => (
              <ApplicationCard key={app.id} application={app} onClick={() => onOpenDetail(app)} logoUrl={resolveLogo(app.company)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
