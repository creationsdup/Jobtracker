import { useState } from 'react'
import { Briefcase, Heart, GraduationCap, Lightbulb, FileUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useExperiences } from '@/hooks/useExperiences'
import { CVImporter } from '@/components/library/CVImporter'
import type { ExperienceType } from '@/lib/types'

const TYPE_CONFIG: Record<ExperienceType, { label: string; icon: React.ReactNode; color: string }> = {
  WORK:      { label: 'Professionnel', icon: <Briefcase size={13} />, color: 'bg-blue-100 text-blue-700' },
  VOLUNTEER: { label: 'Bénévolat',     icon: <Heart size={13} />,     color: 'bg-pink-100 text-pink-700' },
  EDUCATION: { label: 'Formation',     icon: <GraduationCap size={13} />, color: 'bg-purple-100 text-purple-700' },
  PROJECT:   { label: 'Projet',        icon: <Lightbulb size={13} />, color: 'bg-yellow-100 text-yellow-700' },
  OTHER:     { label: 'Autre',         icon: null,                    color: 'bg-gray-100 text-gray-600' },
}

interface LibraryPageProps {
  userId: string
}

export function LibraryPage({ userId }: LibraryPageProps) {
  const { experiences, loading, bulkAddExperiences } = useExperiences(userId)
  const [typeFilter, setTypeFilter] = useState<ExperienceType | ''>('')
  const [search, setSearch] = useState('')
  const [importerOpen, setImporterOpen] = useState(false)

  const filtered = experiences
    .filter((e) => !typeFilter || e.type === typeFilter)
    .filter((e) => {
      const q = search.toLowerCase()
      return !q || e.title.toLowerCase().includes(q) || e.organization.toLowerCase().includes(q)
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          className="btn btn-primary flex items-center gap-2 text-sm"
          onClick={() => setImporterOpen(true)}
        >
          <FileUp size={15} />
          Importer un CV
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-col sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Rechercher une expérience..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-48"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ExperienceType | '')}
        >
          <option value="">Tous les types</option>
          {(Object.keys(TYPE_CONFIG) as ExperienceType[]).map((t) => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="card px-5 py-4 h-20 animate-pulse bg-[var(--color-bg)]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="text-5xl mb-3">💼</div>
          <p className="font-semibold">Aucune expérience trouvée</p>
          <p className="text-xs mt-1">Ajoutez vos expériences pour construire votre CV.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((exp) => {
            const config = TYPE_CONFIG[exp.type] ?? TYPE_CONFIG.OTHER
            return (
              <div key={exp.id} className="card px-5 py-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge flex items-center gap-1 ${config.color}`}>
                      {config.icon}{config.label}
                    </span>
                    {exp.current && (
                      <span className="badge bg-green-100 text-green-700">En cours</span>
                    )}
                  </div>
                  <div className="font-semibold text-sm">{exp.title}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">{exp.organization}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">
                    {formatDate(exp.startDate)} — {exp.current ? "aujourd'hui" : exp.endDate ? formatDate(exp.endDate) : ''}
                  </div>
                  {exp.description && (
                    <p className="text-xs text-[var(--color-muted)] mt-2 line-clamp-2">{exp.description}</p>
                  )}
                  {exp.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {exp.skills.map((s) => (
                        <span key={s} className="badge bg-[var(--color-bg)] text-[var(--color-muted)]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {importerOpen && (
        <CVImporter
          userId={userId}
          onImport={bulkAddExperiences}
          onClose={() => setImporterOpen(false)}
        />
      )}
    </div>
  )
}
