// src/pages/ResumeBuilderPage.tsx
// CV Builder : sélection d'expériences + 3 templates + export PDF
import { useState, useRef } from 'react'
import { Plus, Download, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useExperiences } from '@/hooks/useExperiences'
import { useResumes } from '@/hooks/useResumes'
import { useProfile } from '@/hooks/useProfile'
import { formatDate } from '@/lib/utils'
import type { Experience } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type Template = 'classic' | 'modern' | 'minimal'

interface ResumeBuilderPageProps {
  userId: string
  userEmail: string
}

// ─── Template Components ──────────────────────────────────────────────────────

function ClassicPreview({ profile, selected }: { profile: ReturnType<typeof useProfile>['profile'], selected: Experience[] }) {
  return (
    <div className="bg-white text-[#1a1a1a] font-serif p-8 min-h-[297mm] text-[11px] leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-[#1a1a1a] pb-4 mb-5">
        <h1 className="text-2xl font-bold tracking-wide">{profile?.fullName ?? 'Votre Nom'}</h1>
        {profile?.title && <p className="text-sm text-gray-600 mt-1">{profile.title}</p>}
        <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
          {profile?.email && <span>{profile.email}</span>}
          {profile?.phone && <span>{profile.phone}</span>}
          {profile?.location && <span>{profile.location}</span>}
          {profile?.linkedin && <span>{profile.linkedin}</span>}
        </div>
      </div>
      {/* Summary */}
      {profile?.summary && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">Profil</h2>
          <p className="text-[10px] text-gray-700 leading-relaxed">{profile.summary}</p>
        </div>
      )}
      {/* Experiences */}
      {selected.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">Expériences</h2>
          <div className="flex flex-col gap-4">
            {selected.map(exp => (
              <div key={exp.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[11px]">{exp.title}</p>
                    <p className="text-gray-600 text-[10px]">{exp.organization}{exp.location ? ` — ${exp.location}` : ''}</p>
                  </div>
                  <p className="text-gray-400 text-[9px] shrink-0 ml-2">
                    {formatDate(exp.startDate)} – {exp.current ? "Présent" : exp.endDate ? formatDate(exp.endDate) : ''}
                  </p>
                </div>
                {exp.description && <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">{exp.description}</p>}
                {exp.skills.length > 0 && (
                  <p className="text-[9px] text-gray-400 mt-1">{exp.skills.join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModernPreview({ profile, selected }: { profile: ReturnType<typeof useProfile>['profile'], selected: Experience[] }) {
  return (
    <div className="bg-white text-[#1a1a1a] min-h-[297mm] text-[11px] flex">
      {/* Sidebar */}
      <div className="w-1/3 bg-[#1e293b] text-white p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-bold leading-tight">{profile?.fullName ?? 'Votre Nom'}</h1>
          {profile?.title && <p className="text-xs text-slate-300 mt-1">{profile.title}</p>}
        </div>
        <div className="flex flex-col gap-1 text-[10px] text-slate-300">
          {profile?.email && <span>{profile.email}</span>}
          {profile?.phone && <span>{profile.phone}</span>}
          {profile?.location && <span>{profile.location}</span>}
        </div>
        {profile?.summary && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Profil</p>
            <p className="text-[10px] leading-relaxed text-slate-200">{profile.summary}</p>
          </div>
        )}
        {/* Skills from experiences */}
        {selected.flatMap(e => e.skills).filter(Boolean).length > 0 && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">Compétences</p>
            <div className="flex flex-wrap gap-1">
              {[...new Set(selected.flatMap(e => e.skills))].map(s => (
                <span key={s} className="bg-slate-600 text-[9px] px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 p-6">
        {selected.length > 0 && (
          <>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-3 font-bold">Expériences</p>
            <div className="flex flex-col gap-4">
              {selected.map(exp => (
                <div key={exp.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="font-bold text-[11px]">{exp.title}</p>
                  <p className="text-gray-500 text-[10px]">{exp.organization}</p>
                  <p className="text-gray-400 text-[9px]">
                    {formatDate(exp.startDate)} – {exp.current ? "Présent" : exp.endDate ? formatDate(exp.endDate) : ''}
                  </p>
                  {exp.description && <p className="text-[10px] text-gray-600 mt-1">{exp.description}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MinimalPreview({ profile, selected }: { profile: ReturnType<typeof useProfile>['profile'], selected: Experience[] }) {
  return (
    <div className="bg-white text-[#1a1a1a] p-10 min-h-[297mm] text-[11px]">
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-tight">{profile?.fullName ?? 'Votre Nom'}</h1>
        {profile?.title && <p className="text-gray-400 mt-1 text-sm">{profile.title}</p>}
        <p className="text-[10px] text-gray-400 mt-2">
          {[profile?.email, profile?.phone, profile?.location].filter(Boolean).join('  ·  ')}
        </p>
      </div>
      {selected.length > 0 && selected.map(exp => (
        <div key={exp.id} className="flex gap-6 mb-4 py-3 border-t border-gray-100">
          <p className="text-[9px] text-gray-400 w-24 shrink-0 pt-0.5">
            {formatDate(exp.startDate)}<br/>{exp.current ? "Présent" : exp.endDate ? formatDate(exp.endDate) : ''}
          </p>
          <div>
            <p className="font-semibold text-[11px]">{exp.title} — {exp.organization}</p>
            {exp.description && <p className="text-[10px] text-gray-500 mt-0.5">{exp.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

const TEMPLATES: { id: Template; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classique', desc: 'Traditionnel, idéal pour les secteurs formels' },
  { id: 'modern', label: 'Moderne', desc: 'Sidebar sombre, design contemporain' },
  { id: 'minimal', label: 'Minimal', desc: 'Épuré, laisse le contenu parler' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumeBuilderPage({ userId, userEmail }: ResumeBuilderPageProps) {
  const { experiences, loading: expLoading } = useExperiences(userId)
  const { profile } = useProfile(userId, userEmail)
  const { resumes, createResume, updateResume, deleteResume } = useResumes(userId)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null)
  const [template, setTemplate] = useState<Template>('classic')
  const [resumeName, setResumeName] = useState('Mon CV')
  const [showPreview, setShowPreview] = useState(true)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['WORK']))
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const selected = experiences.filter(e => selectedIds.has(e.id))

  function toggleExp(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleType(type: string) {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const TYPE_LABELS: Record<string, string> = {
    WORK: 'Professionnel', VOLUNTEER: 'Bénévolat',
    EDUCATION: 'Formation', PROJECT: 'Projets', OTHER: 'Autre',
  }

  const grouped = experiences.reduce<Record<string, Experience[]>>((acc, e) => {
    ;(acc[e.type] ??= []).push(e)
    return acc
  }, {})

  async function handleSave() {
    if (!userId) return
    const payload = {
      userId,
      name: resumeName,
      targetPosition: null,
      experienceIds: [...selectedIds],
      customSections: { template },
    }
    if (activeResumeId) {
      const err = await updateResume(activeResumeId, payload)
      setSaveMsg(err ? 'Erreur lors de la sauvegarde' : 'CV sauvegardé !')
    } else {
      const created = await createResume(payload)
      if (created?.id) {
        setActiveResumeId(created.id)
        setSaveMsg('CV sauvegardé !')
      } else {
        setSaveMsg('Erreur lors de la sauvegarde')
      }
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  async function handlePrint() {
    // WHY: use window.print() with a print-specific style to avoid a PDF library dep
    const printStyles = `
      @media print {
        body > *:not(#cv-print-root) { display: none !important; }
        #cv-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
      }
    `
    const style = document.createElement('style')
    style.textContent = printStyles
    document.head.appendChild(style)
    if (printRef.current) {
      printRef.current.id = 'cv-print-root'
    }
    window.print()
    document.head.removeChild(style)
  }

  const PreviewComponent = template === 'classic' ? ClassicPreview
    : template === 'modern' ? ModernPreview
    : MinimalPreview

  return (
    <div className="flex gap-5 h-[calc(100vh-80px)]">
      {/* ── Left panel ── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Resume name */}
        <div className="card px-4 py-3 flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)]">Nom du CV</label>
          <input
            className="input text-sm"
            value={resumeName}
            onChange={e => setResumeName(e.target.value)}
            placeholder="Mon CV — Stage Développeur"
          />
        </div>

        {/* Template selector */}
        <div className="card px-4 py-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--color-muted)]">Template</p>
          {TEMPLATES.map(t => (
            <label key={t.id} className={`flex items-start gap-2 cursor-pointer p-2 rounded-[var(--radius-sm)] transition-colors ${template === t.id ? 'bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]' : 'hover:bg-[var(--color-bg)]'}`}>
              <input type="radio" className="mt-0.5 accent-[var(--color-primary)]" name="template" checked={template === t.id} onChange={() => setTemplate(t.id)} />
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-[10px] text-[var(--color-muted)]">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Experience selector */}
        <div className="card px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--color-muted)]">Expériences</p>
            <span className="text-xs text-[var(--color-primary)]">{selectedIds.size} sélectionnée(s)</span>
          </div>
          {expLoading ? (
            <p className="text-xs text-[var(--color-muted)] py-2">Chargement…</p>
          ) : experiences.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-2">Aucune expérience. Importez un CV depuis la bibliothèque.</p>
          ) : (
            Object.entries(grouped).map(([type, exps]) => (
              <div key={type}>
                <button
                  className="flex items-center justify-between w-full text-xs font-semibold text-[var(--color-muted)] py-1.5 hover:text-[var(--color-ink)]"
                  onClick={() => toggleType(type)}
                >
                  {TYPE_LABELS[type] ?? type}
                  {expandedTypes.has(type) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {expandedTypes.has(type) && exps.map(exp => (
                  <label key={exp.id} className={`flex items-start gap-2 cursor-pointer p-2 rounded-[var(--radius-sm)] transition-colors mb-0.5 ${selectedIds.has(exp.id) ? 'bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-bg)]'}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0 accent-[var(--color-primary)]"
                      checked={selectedIds.has(exp.id)}
                      onChange={() => toggleExp(exp.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-tight truncate">{exp.title}</p>
                      <p className="text-[10px] text-[var(--color-muted)] truncate">{exp.organization}</p>
                    </div>
                  </label>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="card px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--color-muted)]">CV sauvegardés</p>
            {activeResumeId && (
              <button
                className="text-xs text-[var(--color-primary)] hover:underline"
                onClick={() => {
                  setActiveResumeId(null)
                  setResumeName('Mon CV')
                  setSelectedIds(new Set())
                  setTemplate('classic')
                }}
              >
                Nouveau
              </button>
            )}
          </div>
          {resumes.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">Aucun CV sauvegardé pour le moment.</p>
          ) : (
            resumes.map((resume) => {
              const resumeTemplate = (resume.customSections.template as Template | undefined) ?? 'classic'
              const isActive = resume.id === activeResumeId
              return (
                <div key={resume.id} className={`rounded-[var(--radius-sm)] border p-2 ${isActive ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}>
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      setActiveResumeId(resume.id)
                      setResumeName(resume.name)
                      setTemplate(resumeTemplate)
                      setSelectedIds(new Set(resume.experienceIds))
                    }}
                  >
                    <p className="text-xs font-semibold">{resume.name}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{resume.experienceIds.length} expériences · {resumeTemplate}</p>
                  </button>
                  <button
                    className="mt-2 text-[10px] text-[var(--color-danger)] hover:underline"
                    onClick={async () => {
                      const err = await deleteResume(resume.id)
                      if (!err && activeResumeId === resume.id) {
                        setActiveResumeId(null)
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel (preview) ── */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            className="input text-sm flex-1"
            value={resumeName}
            onChange={e => setResumeName(e.target.value)}
            placeholder="Nom du CV"
          />
          <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPreview ? 'Masquer' : 'Aperçu'}
          </button>
          <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={handlePrint}>
            <Download size={13} /> Imprimer / PDF
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={handleSave}>
            <Plus size={13} /> Sauvegarder
          </button>
          {saveMsg && <span className="text-xs text-[var(--color-primary)]">{saveMsg}</span>}
        </div>

        {/* CV Preview */}
        {showPreview ? (
          <div className="flex-1 overflow-auto rounded-[var(--radius)] border border-[var(--color-border)] shadow-sm">
            <div ref={printRef} style={{ transformOrigin: 'top left' }}>
              <PreviewComponent profile={profile} selected={selected} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-muted)] text-sm">
            Aperçu masqué
          </div>
        )}
      </div>
    </div>
  )
}
