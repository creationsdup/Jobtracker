import { useMemo, useState } from 'react'
import {
  Briefcase, Heart, GraduationCap, Lightbulb, FileUp, Plus, Pencil,
  X, Sparkles, BookMarked, Shapes, FileText, Repeat,
} from 'lucide-react'
import { useExperiences, type NewExperience } from '@/hooks/useExperiences'
import { useProfile } from '@/hooks/useProfile'
import { useCvDocuments } from '@/hooks/useCvDocuments'
import { useAtsAnalyses } from '@/hooks/useAtsAnalyses'
import { useApplications } from '@/hooks/useApplications'
import { computeLibraryStats } from '@/lib/cvLibrary'
import { CVImporter } from '@/components/library/CVImporter'
import { CvCard } from '@/components/library/CvCard'
import { AtsAnalysisRow } from '@/components/library/AtsAnalysisRow'
import { NewAtsAnalysisModal } from '@/components/library/NewAtsAnalysisModal'
import { AtsAnalysisDetailModal } from '@/components/library/AtsAnalysisDetailModal'
import { AssociateAnalysisModal } from '@/components/library/AssociateAnalysisModal'
import { CompareCvModal } from '@/components/library/CompareCvModal'
import { LibrarySuggestionsPanel } from '@/components/library/LibrarySuggestionsPanel'
import { LibraryElementsTable } from '@/components/library/LibraryElementsTable'
import type { AtsAnalysis, Experience, ExperienceType } from '@/lib/types'

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
  const cvDocumentsHook = useCvDocuments(userId)
  const { cvDocuments, uploadCv, updateStatus, getSignedUrl, getCvText, reanalyze, deleteCv, updateAtsScore } = cvDocumentsHook
  const atsAnalysesHook = useAtsAnalyses(userId)
  const { atsAnalyses, createAnalysis, generateRecommendations, associateToApplication } = atsAnalysesHook
  const { applications } = useApplications(userId)

  const [tab, setTab] = useState<LibraryTab>('ALL')
  const [typeFilter, setTypeFilter] = useState<ExperienceType | ''>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importerOpen, setImporterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)
  const [listEditor, setListEditor] = useState<ListKind | null>(null)
  const [newAnalysisOpen, setNewAnalysisOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [detailAnalysis, setDetailAnalysis] = useState<{ id: string; mode: 'view' | 'optimize' } | null>(null)
  const [associatingAnalysis, setAssociatingAnalysis] = useState<AtsAnalysis | null>(null)
  const [showAllCv, setShowAllCv] = useState(false)
  const [showAllAnalyses, setShowAllAnalyses] = useState(false)

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

  const stats = computeLibraryStats(cvDocuments, atsAnalyses)
  const visibleCvDocuments = showAllCv ? cvDocuments : cvDocuments.slice(0, 5)
  const visibleAnalyses = showAllAnalyses ? atsAnalyses : atsAnalyses.slice(0, 5)
  const detailAnalysisData = detailAnalysis ? atsAnalyses.find((a) => a.id === detailAnalysis.id) ?? null : null

  function cvFileNameFor(cvId: string): string {
    return cvDocuments.find((cv) => cv.id === cvId)?.file_name ?? 'CV supprimé'
  }

  async function handleOpenCv(cv: { file_path: string }) {
    const url = await getSignedUrl(cv.file_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleDownloadCv(cv: { file_path: string; file_name: string }) {
    const url = await getSignedUrl(cv.file_path)
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = cv.file_name
    link.click()
  }

  async function handleCreateAnalysis(input: { cvId: string; title: string; jobTitle?: string; jobDescription?: string }): Promise<string | null> {
    const cv = cvDocuments.find((c) => c.id === input.cvId)
    if (!cv) return 'CV introuvable'
    let cvText: string
    try {
      cvText = await getCvText(cv)
    } catch (err) {
      return err instanceof Error ? err.message : "Impossible de lire le contenu du CV"
    }
    const { data, error } = await createAnalysis({
      cvId: input.cvId,
      cvText,
      title: input.title,
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
    })
    if (error) return error
    // WHY: ats_analyses row is the source of truth and already successfully created; cv_documents.ats_score is a denormalized cache. Swallow updateAtsScore failure deliberately rather than failing the whole analysis operation.
    if (data) await updateAtsScore(input.cvId, data.score)
    return null
  }

  async function handleGenerateRecommendations(analysisId: string): Promise<string | null> {
    const analysis = atsAnalyses.find((a) => a.id === analysisId)
    if (!analysis) return 'Analyse introuvable'
    const cv = cvDocuments.find((c) => c.id === analysis.cv_id)
    if (!cv) return 'CV source introuvable'
    let cvText: string
    try {
      cvText = await getCvText(cv)
    } catch (err) {
      return err instanceof Error ? err.message : "Impossible de lire le contenu du CV"
    }
    return generateRecommendations(analysisId, cvText)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Bibliothèque intelligente</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Importez vos CV, centralisez vos expériences, stockez vos analyses ATS et réutilisez vos meilleurs contenus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary flex items-center gap-2 text-sm" onClick={() => setImporterOpen(true)}>
            <FileUp size={15} />
            Importer un CV
          </button>
          <button className="btn btn-secondary flex items-center gap-2 text-sm" onClick={() => setCompareOpen(true)}>
            <Repeat size={15} />
            Comparer 2 CV
          </button>
          <button className="btn btn-primary flex items-center gap-2 text-sm" onClick={() => setNewAnalysisOpen(true)}>
            <Plus size={15} />
            Nouvelle analyse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="CV importés" value={stats.cvCount} icon={<FileText size={14} />} tone="var(--color-primary)" />
        <StatCard label="Analyses réalisées" value={stats.analysisCount} icon={<Sparkles size={14} />} tone="var(--color-accent)" />
        <StatCard label="Score ATS moyen" value={stats.avgScore !== null ? `${stats.avgScore}%` : '—'} icon={<BookMarked size={14} />} tone="var(--color-success)" />
        <StatCard label="Mots-clés manquants" value={stats.missingKeywordsCount} icon={<Shapes size={14} />} tone="var(--color-warning)" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Mes CV</h2>
            {cvDocuments.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllCv((v) => !v)}>
                {showAllCv ? 'Voir moins' : 'Voir tous'}
              </button>
            )}
          </div>
          {cvDocuments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez votre premier CV pour commencer.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleCvDocuments.map((cv) => (
                <CvCard
                  key={cv.id}
                  cv={cv}
                  onOpen={handleOpenCv}
                  onDownload={handleDownloadCv}
                  onReanalyze={async (c) => { await reanalyze(c) }}
                  onSetStatus={(id, status) => { updateStatus(id, status) }}
                  onDelete={async (id) => {
                    if (window.confirm('Supprimer ce CV ? Le fichier sera définitivement supprimé.')) await deleteCv(id)
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card px-5 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-deep-space)]">Analyses ATS récentes</h2>
            {atsAnalyses.length > 5 && (
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setShowAllAnalyses((v) => !v)}>
                {showAllAnalyses ? 'Voir moins' : 'Voir toutes'}
              </button>
            )}
          </div>
          {atsAnalyses.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Lancez votre première analyse ATS depuis un CV importé.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleAnalyses.map((analysis) => (
                <AtsAnalysisRow
                  key={analysis.id}
                  analysis={analysis}
                  cvFileName={cvFileNameFor(analysis.cv_id)}
                  onView={(a) => setDetailAnalysis({ id: a.id, mode: 'view' })}
                  onOptimize={(a) => setDetailAnalysis({ id: a.id, mode: 'optimize' })}
                  onAssociate={(a) => setAssociatingAnalysis(a)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <section className="card px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              className="input flex-1"
              placeholder="Rechercher une expérience, une formation, une compétence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input className="input lg:w-40" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input className="input lg:w-40" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {LIBRARY_TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${tab === id ? 'text-white' : 'text-[var(--color-deep-space)]'}`}
                style={{
                  background: tab === id ? 'var(--color-primary)' : '#ffffff',
                  border: tab === id ? 'none' : '1px solid var(--color-border)',
                }}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {(tab === 'ALL' || tab === 'EXPERIENCES') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Expériences</h3>
                <select
                  className="input sm:w-56"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ExperienceType | '')}
                >
                  <option value="">Tous les types hors formation</option>
                  {(Object.keys(TYPE_CONFIG) as ExperienceType[])
                    .filter((type) => type !== 'EDUCATION')
                    .map((type) => <option key={type} value={type}>{TYPE_CONFIG[type].label}</option>)}
                </select>
              </div>
              <LibraryElementsTable
                items={filteredExperiences}
                cvDocuments={cvDocuments}
                typeLabel={(exp) => TYPE_CONFIG[exp.type]?.label ?? TYPE_CONFIG.OTHER.label}
                onEdit={(exp) => { setEditingExperience(exp); setEditorOpen(true) }}
                onDelete={deleteExperience}
                emptyTitle="Aucune expérience trouvée"
                emptyText="Ajoutez vos expériences pour enrichir vos candidatures et vos CV."
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'EDUCATION') && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Formations</h3>
              <LibraryElementsTable
                items={filteredEducation}
                cvDocuments={cvDocuments}
                typeLabel={() => TYPE_CONFIG.EDUCATION.label}
                onEdit={(exp) => { setEditingExperience(exp); setEditorOpen(true) }}
                onDelete={deleteExperience}
                emptyTitle="Aucune formation trouvée"
                emptyText="Ajoutez vos diplômes et formations pour compléter votre profil."
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'SKILLS') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Compétences</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('skills')}>
                  <Pencil size={13} />
                  Gérer
                </button>
              </div>
              <ChipSection
                items={filteredSkills}
                emptyTitle="Aucune compétence"
                emptyText="Ajoutez vos compétences clés pour les réutiliser dans vos CV et candidatures."
                color="var(--color-green-light)"
                textColor="var(--color-green-text)"
                categoryLabel="Compétence"
              />
            </div>
          )}

          {(tab === 'ALL' || tab === 'INTERESTS') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-deep-space)]">Centres d'intérêt</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setListEditor('interests')}>
                  <Pencil size={13} />
                  Gérer
                </button>
              </div>
              <ChipSection
                items={filteredInterests}
                emptyTitle="Aucun centre d'intérêt"
                emptyText="Ajoutez quelques centres d'intérêt pour humaniser votre profil lorsque c'est pertinent."
                color="var(--color-red-light)"
                textColor="var(--color-red-text)"
                categoryLabel="Centre d'intérêt"
              />
            </div>
          )}
        </section>

        <LibrarySuggestionsPanel experiences={experiences} cvDocuments={cvDocuments} />
      </div>

      {importerOpen && (
        <CVImporter
          userId={userId}
          existingSkills={profile?.skills ?? []}
          existingInterests={profile?.interests ?? []}
          onImportEntries={bulkAddExperiences}
          onImportProfileData={(payload) => updateProfile(payload)}
          onUploadCv={uploadCv}
          onClose={() => setImporterOpen(false)}
        />
      )}

      {editorOpen && (
        <ExperienceEditor
          userId={userId}
          initial={editingExperience}
          onClose={() => { setEditorOpen(false); setEditingExperience(null) }}
          onSave={async (payload, id) => {
            const err = id ? await updateExperience(id, payload) : await addExperience(payload as NewExperience)
            if (!err) { setEditorOpen(false); setEditingExperience(null) }
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

      {newAnalysisOpen && (
        <NewAtsAnalysisModal
          cvDocuments={cvDocuments}
          onSubmit={handleCreateAnalysis}
          onClose={() => setNewAnalysisOpen(false)}
        />
      )}

      {detailAnalysisData && detailAnalysis && (
        <AtsAnalysisDetailModal
          analysis={detailAnalysisData}
          cvFileName={cvFileNameFor(detailAnalysisData.cv_id)}
          mode={detailAnalysis.mode}
          onGenerateRecommendations={handleGenerateRecommendations}
          onClose={() => setDetailAnalysis(null)}
        />
      )}

      {associatingAnalysis && (
        <AssociateAnalysisModal
          analysis={associatingAnalysis}
          applications={applications}
          onAssociate={associateToApplication}
          onClose={() => setAssociatingAnalysis(null)}
        />
      )}

      {compareOpen && (
        <CompareCvModal
          cvDocuments={cvDocuments}
          experiences={experiences}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-[18px] border px-4 py-4 bg-white/75 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="text-[1.7rem] leading-none font-bold text-[var(--color-deep-space)]">{value}</div>
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
        <div key={item} className="rounded-[18px] border bg-white/72 px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textColor }}>{categoryLabel}</p>
          <p className="mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: color, color: textColor }}>{item}</p>
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">{initial ? 'Modifier une entrée' : 'Ajouter une entrée'}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
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
              sourceCvId: initial?.sourceCvId ?? null,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-sm">Gérer : {title}</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
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
