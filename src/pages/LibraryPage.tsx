import { useEffect, useState } from 'react'
import { Briefcase, Heart, GraduationCap, Lightbulb, FileUp, Plus, Pencil, Trash2, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useExperiences, type NewExperience } from '@/hooks/useExperiences'
import { CVImporter } from '@/components/library/CVImporter'
import type { Experience, ExperienceType } from '@/lib/types'

const TYPE_CONFIG: Record<ExperienceType, { label: string; icon: React.ReactNode; color: string }> = {
  WORK:      { label: 'Professionnel', icon: <Briefcase size={13} />, color: 'bg-blue-100 text-blue-700' },
  VOLUNTEER: { label: 'Bénévolat', icon: <Heart size={13} />, color: 'bg-pink-100 text-pink-700' },
  EDUCATION: { label: 'Formation', icon: <GraduationCap size={13} />, color: 'bg-purple-100 text-purple-700' },
  PROJECT:   { label: 'Projet', icon: <Lightbulb size={13} />, color: 'bg-yellow-100 text-yellow-700' },
  OTHER:     { label: 'Autre', icon: null, color: 'bg-gray-100 text-gray-600' },
}

interface LibraryPageProps {
  userId: string
}

export function LibraryPage({ userId }: LibraryPageProps) {
  const { experiences, loading, bulkAddExperiences, addExperience, updateExperience, deleteExperience } = useExperiences(userId)
  const [typeFilter, setTypeFilter] = useState<ExperienceType | ''>('')
  const [search, setSearch] = useState('')
  const [importerOpen, setImporterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)

  const filtered = experiences
    .filter((e) => !typeFilter || e.type === typeFilter)
    .filter((e) => {
      const q = search.toLowerCase()
      return !q || e.title.toLowerCase().includes(q) || e.organization.toLowerCase().includes(q)
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary flex items-center gap-2 text-sm" onClick={() => setImporterOpen(true)}>
            <FileUp size={15} />
            Importer un CV
          </button>
          <button
            className="btn btn-secondary flex items-center gap-2 text-sm"
            onClick={() => {
              setEditingExperience(null)
              setEditorOpen(true)
            }}
          >
            <Plus size={15} />
            Ajouter manuellement
          </button>
        </div>
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
                <div className="flex flex-col gap-2">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingExperience(exp)
                      setEditorOpen(true)
                    }}
                  >
                    <Pencil size={13} />
                    Modifier
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      if (!window.confirm('Supprimer cette expérience ?')) return
                      await deleteExperience(exp.id)
                    }}
                  >
                    <Trash2 size={13} />
                    Supprimer
                  </button>
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

      {editorOpen && (
        <ExperienceEditor
          userId={userId}
          initial={editingExperience}
          onClose={() => {
            setEditorOpen(false)
            setEditingExperience(null)
          }}
          onSave={async (payload, id) => {
            const err = id ? await updateExperience(id, payload) : await addExperience(payload as NewExperience)
            if (!err) {
              setEditorOpen(false)
              setEditingExperience(null)
            }
            return err
          }}
        />
      )}
    </div>
  )
}

interface ExperienceEditorProps {
  userId: string
  initial: Experience | null
  onClose: () => void
  onSave: (payload: Partial<NewExperience>, id?: string) => Promise<string | null>
}

function ExperienceEditor({ userId, initial, onClose, onSave }: ExperienceEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [current, setCurrent] = useState(initial?.current ?? false)

  useEffect(() => {
    setCurrent(initial?.current ?? false)
  }, [initial])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">{initial ? 'Modifier une expérience' : 'Ajouter une expérience'}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const payload: NewExperience = {
              id: initial?.id ?? crypto.randomUUID(),
              userId,
              type: fd.get('type') as ExperienceType,
              title: (fd.get('title') as string).trim(),
              organization: (fd.get('organization') as string).trim(),
              location: (fd.get('location') as string).trim() || null,
              startDate: fd.get('startDate') as string,
              endDate: current ? null : ((fd.get('endDate') as string) || null),
              current,
              description: (fd.get('description') as string).trim() || null,
              skills: (fd.get('skills') as string).split(',').map((s) => s.trim()).filter(Boolean),
              subsection: (fd.get('subsection') as string).trim() || null,
            }
            setSaving(true)
            const err = await onSave(payload, initial?.id)
            setSaving(false)
            setError(err)
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className="input" name="type" defaultValue={initial?.type ?? 'WORK'}>
                {(Object.keys(TYPE_CONFIG) as ExperienceType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sous-section">
              <input className="input" name="subsection" defaultValue={initial?.subsection ?? ''} placeholder="Backend, produit, recherche..." />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Titre">
              <input className="input" name="title" defaultValue={initial?.title ?? ''} required />
            </Field>
            <Field label="Organisation">
              <input className="input" name="organization" defaultValue={initial?.organization ?? ''} required />
            </Field>
          </div>

          <Field label="Localisation">
            <input className="input" name="location" defaultValue={initial?.location ?? ''} placeholder="Paris, France" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Début">
              <input className="input" type="date" name="startDate" defaultValue={initial?.startDate ?? ''} required />
            </Field>
            <Field label="Fin">
              <input className="input" type="date" name="endDate" defaultValue={initial?.endDate ?? ''} disabled={current} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
            Poste ou mission en cours
          </label>

          <Field label="Description">
            <textarea className="input resize-y" name="description" rows={4} defaultValue={initial?.description ?? ''} />
          </Field>

          <Field label="Compétences">
            <input className="input" name="skills" defaultValue={initial?.skills.join(', ') ?? ''} placeholder="React, TypeScript, produit..." />
          </Field>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
