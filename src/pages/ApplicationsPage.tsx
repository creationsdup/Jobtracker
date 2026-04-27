import { useState } from 'react'
import { Search } from 'lucide-react'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import type { Application, ApplicationStatus } from '@/lib/types'

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
}

export function ApplicationsPage({ applications, loading, onOpenDetail }: ApplicationsPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')

  const filtered = applications
    .filter((a) => {
      const q = search.toLowerCase()
      return !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
    })
    .filter((a) => !statusFilter || a.status === statusFilter)

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            className="input pl-8"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-52"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card px-5 py-4 h-16 animate-pulse bg-[var(--color-bg)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-semibold">Aucune candidature trouvée</p>
          <p className="text-xs mt-1">Modifiez les filtres ou ajoutez une candidature.</p>
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
