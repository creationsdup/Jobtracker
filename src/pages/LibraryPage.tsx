import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase, Heart, GraduationCap, Lightbulb, FileUp, Plus, Pencil, Trash2,
  X, Sparkles, BookMarked, Shapes,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useExperiences, type NewExperience } from '@/hooks/useExperiences'
import { CVImporter } from '@/components/library/CVImporter'
import { useProfile } from '@/hooks/useProfile'
import type { Experience, ExperienceType } from '@/lib/types'

const TYPE_CONFIG: Record<ExperienceType, { label: string; icon: React.ReactNode; color: string }> = {
  WORK:      { label: 'Professionnel', icon: <Briefcase size={13} />, color: 'bg-blue-100 text-blue-700' },
  VOLUNTEER: { label: 'Bénévolat', icon: <Heart size={13} />, color: 'bg-pink-100 text-pink-700' },
  EDUCATION: { label: 'Formation', icon: <GraduationCap size={13} />, color: 'bg-purple-100 text-purple-700' },
  PROJECT:   { label: 'Projet', icon: <Lightbulb size={13} />, color: 'bg-yellow-100 text-yellow-700' },
  OTHER:     { label: 'Autre', icon: null, color: 'bg-gray-100 text-gray-600' },
}

type LibraryTab = 'ALL' | 'EXPERIENCES' | 'EDUCATION' | 'SKILLS' | 'INTERESTS'
type ListKind = 'skills' | 'interests'

const LIBRARY_TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'ALL', label: 'Tout' },
  { id: 'EXPERIENCES', label: 'Expériences' },
  { id: 'EDUCATION', label: 'Formations' },
  { id: 'SKILLS', label: 'Compétences' },
  { id: 'INTERESTS', label: "Centres d'intérêt" },
]

interface LibraryPageProps {
  userId: string
  userEmail: string
}

export function LibraryPage({ userId, userEmail }: LibraryPageProps) {
  const { experiences, bulkAddExperiences, addExperience, updateExperience, deleteExperience } = useExperiences(userId)
  const { profile, updateProfile, saving: profileSaving } = useProfile(userId, userEmail)

  const [tab, setTab] = useState<LibraryTab>('ALL')
  const [typeFilter, setTypeFilter] = useState<ExperienceType | ''>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importerOpen, setImporterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [listEditor, setListEditor] = useState<ListKind | null>(null)

  const normalizedSearch = search.trim().toLowerCase()

  function matchesDateRange(exp: Experience) {
    if (!dateFrom && !dateTo) return true
    const start = exp.startDate
    const end = exp.current ? null : exp.endDate
    if (dateFrom && end && end < dateFrom) return false
    if (dateFrom && !end && start < dateFrom) return false
    if (dateTo && start > dateTo) return false
    return true
  }

  const allExperiences = useMemo(
    () => experiences.filter((exp) => exp.type !== 'EDUCATION'),
    [experiences],
  )

  const educationExperiences = useMemo(
    () => experiences.filter((exp) => exp.type === 'EDUCATION'),
    [experiences],
  )

  const filteredExperiences = useMemo(
    () => allExperiences
      .filter((exp) => !typeFilter || exp.type === typeFilter)
      .filter(matchesDateRange)
      .filter((exp) => {
        if (!normalizedSearch) return true
        return [
          exp.title,
          exp.organization,
          exp.description ?? '',
          exp.location ?? '',
          ...(exp.skills ?? []),
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allExperiences, normalizedSearch, typeFilter, dateFrom, dateTo],
  )

  const filteredEducation = useMemo(
    () => educationExperiences
      .filter(matchesDateRange)
      .filter((exp) => !normalizedSearch || [
        exp.title,
        exp.organization,
        exp.description ?? '',
        exp.location ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [educationExperiences, normalizedSearch, dateFrom, dateTo],
  )

  const filteredSkills = useMemo(
    () => (profile?.skills ?? []).filter((skill) => !normalizedSearch || skill.toLowerCase().includes(normalizedSearch)),
    [profile?.skills, normalizedSearch],
  )

  const filteredInterests = useMemo(
    () => (profile?.interests ?? []).filter((interest) => !normalizedSearch || interest.toLowerCase().includes(normalizedSearch)),
    [profile?.interests, normalizedSearch],
  )

  const stats = [
    { label: 'Expériences', value: allExperiences.length, icon: <Briefcase size={14} />, tone: 'var(--color-violet-deep)' },
    { label: 'Formations', value: educationExperiences.length, icon: <BookMarked size={14} />, tone: 'var(--color-amber-text)' },
    { label: 'Compétences', value: profile?.skills?.length ?? 0, icon: <Sparkles size={14} />, tone: 'var(--color-green-text)' },
    { label: "Centres d'intérêt", value: profile?.interests?.length ?? 0, icon: <Shapes size={14} />, tone: 'var(--color-red-text)' },
  ]

  return (
    <div className="flex flex-col gap-5 px-1 md:px-2 xl:px-4 py-2 md:py-4">
      <section className="card px-5 py-5 md:px-7 md:py-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-violet-text)]">
                Bibliothèque candidat
              </p>
              <h1 className="mt-2 text-xl md:text-2xl font-bold text-[var(--color-violet-deep)]">
                Centralise tout ce qui alimente ton CV
              </h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Expériences, formations, compétences et centres d&apos;intérêt au même endroit pour préparer plus vite
                chaque candidature.
              </p>
            </div>

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
                Ajouter une entrée
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <SummaryCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              className="input flex-1"
              placeholder="Rechercher une expérience, une formation, une compétence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="input lg:w-44"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              className="input lg:w-44"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {LIBRARY_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                    tab === id ? 'text-white' : 'text-[var(--color-violet-deep)]'
                  }`}
                  style={{
                    background: tab === id ? 'linear-gradient(135deg, #6c3de0 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.84)',
                    border: tab === id ? 'none' : '1px solid var(--color-border)',
                  }}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(tab === 'ALL' || tab === 'EXPERIENCES') && (
        <section className="card px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-col gap-4">
            <SectionHeader
              title="Expériences"
              description="Tes missions, projets et expériences professionnelles."
            >
              <select
                className="input sm:w-56"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ExperienceType | '')}
              >
                <option value="">Tous les types hors formation</option>
                {(Object.keys(TYPE_CONFIG) as ExperienceType[])
                  .filter((type) => type !== 'EDUCATION')
                  .map((type) => (
                    <option key={type} value={type}>{TYPE_CONFIG[type].label}</option>
                  ))}
              </select>
            </SectionHeader>

            <ExperienceList
              items={filteredExperiences}
              emptyTitle="Aucune expérience trouvée"
              emptyText="Ajoute tes expériences pour enrichir tes candidatures et tes CV."
              onEdit={(exp) => {
                setEditingExperience(exp)
                setEditorOpen(true)
              }}
              onDelete={deleteExperience}
            />
          </div>
        </section>
      )}

      {(tab === 'ALL' || tab === 'EDUCATION') && (
        <section className="card px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-col gap-4">
            <SectionHeader
              title="Formations"
              description="Diplômes, cursus, certifications ou bootcamps."
            />

            <ExperienceList
              items={filteredEducation}
              emptyTitle="Aucune formation trouvée"
              emptyText="Ajoute tes diplômes et formations pour compléter ton profil."
              onEdit={(exp) => {
                setEditingExperience(exp)
                setEditorOpen(true)
              }}
              onDelete={deleteExperience}
            />
          </div>
        </section>
      )}

      {(tab === 'ALL' || tab === 'SKILLS') && (
        <section className="card px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-col gap-4">
            <SectionHeader
              title="Compétences"
              description="Stack, outils, soft skills et expertises à mettre en avant."
            >
              <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('skills')}>
                <Pencil size={13} />
                Gérer
              </button>
            </SectionHeader>

            <ChipSection
              items={filteredSkills}
              emptyTitle="Aucune compétence"
              emptyText="Ajoute tes compétences clés pour les réutiliser dans tes CV et candidatures."
              color="var(--color-green-light)"
              textColor="var(--color-green-text)"
              categoryLabel="Compétence"
            />
          </div>
        </section>
      )}

      {(tab === 'ALL' || tab === 'INTERESTS') && (
        <section className="card px-5 py-5 md:px-7 md:py-7">
          <div className="flex flex-col gap-4">
            <SectionHeader
              title="Centres d&apos;intérêt"
              description="Activités personnelles, passions et sujets qui te définissent."
            >
              <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('interests')}>
                <Pencil size={13} />
                Gérer
              </button>
            </SectionHeader>

            <ChipSection
              items={filteredInterests}
              emptyTitle="Aucun centre d'intérêt"
              emptyText="Ajoute quelques centres d’intérêt pour humaniser ton profil quand c’est pertinent."
              color="var(--color-red-light)"
              textColor="var(--color-red-text)"
              categoryLabel="Centre d'intérêt"
            />
          </div>
        </section>
      )}

      {importerOpen && (
        <CVImporter
          userId={userId}
          existingSkills={profile?.skills ?? []}
          existingInterests={profile?.interests ?? []}
          onImportEntries={bulkAddExperiences}
          onImportProfileData={(payload) => updateProfile(payload)}
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

      {listEditor && (
        <TagListEditor
          title={listEditor === 'skills' ? 'Compétences' : "Centres d'intérêt"}
          items={listEditor === 'skills' ? profile?.skills ?? [] : profile?.interests ?? []}
          saving={profileSaving}
          onClose={() => setListEditor(null)}
          onSave={async (items) => {
            const err = await updateProfile({ [listEditor]: items })
            if (!err) setListEditor(null)
            return err
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: string
}) {
  return (
    <div
      className="rounded-[18px] border px-4 py-4 bg-white/75 flex flex-col gap-2"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="text-[1.7rem] leading-none font-bold text-[var(--color-violet-deep)]">{value}</div>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold leading-tight text-[var(--color-violet-deep)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      </div>
      {children ? <div className="flex-shrink-0">{children}</div> : null}
    </div>
  )
}

function ExperienceList({
  items,
  emptyTitle,
  emptyText,
  onEdit,
  onDelete,
}: {
  items: Experience[]
  emptyTitle: string
  emptyText: string
  onEdit: (exp: Experience) => void
  onDelete: (id: string) => Promise<string | null>
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="text-4xl mb-3">🗂️</div>
        <p className="font-semibold">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((exp) => {
        const config = TYPE_CONFIG[exp.type] ?? TYPE_CONFIG.OTHER
        return (
          <div
            key={exp.id}
            className="rounded-[18px] border px-4 py-4 bg-white/72 flex flex-col gap-4 lg:flex-row"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`badge flex items-center gap-1 ${config.color}`}>
                  {config.icon}{config.label}
                </span>
                {exp.current && (
                  <span className="badge bg-green-100 text-green-700">En cours</span>
                )}
                {exp.subsection && (
                  <span className="badge bg-[var(--color-violet-light)] text-[var(--color-violet-text)]">{exp.subsection}</span>
                )}
              </div>
              <div className="font-semibold text-base leading-tight text-[var(--color-violet-deep)]">{exp.title}</div>
              <div className="text-sm font-medium text-[var(--color-ink)] mt-1">{exp.organization}</div>
              <div className="text-xs leading-5 text-[var(--color-muted)] mt-1">
                {formatDate(exp.startDate)} — {exp.current ? "aujourd'hui" : exp.endDate ? formatDate(exp.endDate) : ''}
                {exp.location ? ` · ${exp.location}` : ''}
              </div>
              {exp.description && (
                <p className="text-sm leading-6 text-[var(--color-ink)]/85 mt-3 line-clamp-3">{exp.description}</p>
              )}
              {exp.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {exp.skills.map((skill) => (
                    <span key={skill} className="badge bg-[var(--color-bg)] text-[var(--color-muted)]">{skill}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 lg:flex-col lg:w-[132px]">
              <button className="btn btn-secondary btn-sm" onClick={() => onEdit(exp)}>
                <Pencil size={13} />
                Modifier
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (!window.confirm('Supprimer cette entrée ?')) return
                  await onDelete(exp.id)
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
  )
}

function ChipSection({
  items,
  emptyTitle,
  emptyText,
  color,
  textColor,
  categoryLabel,
}: {
  items: string[]
  emptyTitle: string
  emptyText: string
  color: string
  textColor: string
  categoryLabel: string
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state py-10">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-[18px] border bg-white/72 px-4 py-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textColor }}>
            {categoryLabel}
          </p>
          <p
            className="mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-medium"
            style={{ background: color, color: textColor }}
          >
            {item}
          </p>
        </div>
      ))}
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
          <h2 className="font-semibold text-sm">{initial ? 'Modifier une entrée' : 'Ajouter une entrée'}</h2>
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
                {(Object.keys(TYPE_CONFIG) as ExperienceType[]).map((type) => (
                  <option key={type} value={type}>{TYPE_CONFIG[type].label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sous-section">
              <input className="input" name="subsection" defaultValue={initial?.subsection ?? ''} placeholder="Backend, produit, alternance..." />
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
            Entrée en cours
          </label>

          <Field label="Description">
            <textarea className="input resize-y" name="description" rows={4} defaultValue={initial?.description ?? ''} />
          </Field>

          <Field label="Compétences liées">
            <input className="input" name="skills" defaultValue={initial?.skills.join(', ') ?? ''} placeholder="React, TypeScript, Figma..." />
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

function TagListEditor({
  title,
  items,
  saving,
  onClose,
  onSave,
}: {
  title: string
  items: string[]
  saving: boolean
  onClose: () => void
  onSave: (items: string[]) => Promise<string | null>
}) {
  const [value, setValue] = useState(items.join(', '))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(items.join(', '))
  }, [items])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">Gérer : {title}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form
          className="p-5 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const parsed = value.split(',').map((item) => item.trim()).filter(Boolean)
            const unique = [...new Set(parsed)]
            const err = await onSave(unique)
            setError(err)
          }}
        >
          <Field label={title}>
            <textarea
              className="input resize-y"
              rows={5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Sépare chaque élément par une virgule"
            />
          </Field>
          <p className="text-xs text-[var(--color-muted)]">
            Exemple : {title === 'Compétences' ? 'TypeScript, React, UX Writing' : 'Escalade, photographie, bénévolat'}
          </p>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
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
      <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      {children}
    </div>
  )
}
