import { useState } from 'react'
import {
  LayoutGrid, RefreshCw, FileDown,
  User, FileText, Briefcase, GraduationCap,
  Zap, Globe, FolderOpen, Award, Heart, Eye, EyeOff,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { useCVBuilder } from '@/hooks/useCVBuilder'
import { useExperiences } from '@/hooks/useExperiences'
import { useProfile } from '@/hooks/useProfile'
import { SectionEditor } from '@/components/cv-builder/SectionEditor'
import { CVPreview } from '@/components/cv-builder/preview/CVPreview'
import { TemplateGallery } from '@/components/cv-builder/engine/TemplateGallery'
import { resolveResumeData } from '@/utils/resolveResumeData'
import type { SectionId, TemplateType } from '@/types/cvBuilder'

interface ResumeBuilderPageProps {
  userId: string
  userEmail: string
}

interface SectionNavItem {
  id: SectionId
  label: string
  icon: LucideIcon
}

const SECTION_NAV: SectionNavItem[] = [
  { id: 'personal',       label: 'Infos personnelles', icon: User },
  { id: 'summary',        label: 'Résumé',             icon: FileText },
  { id: 'experiences',    label: 'Expériences',        icon: Briefcase },
  { id: 'education',      label: 'Formation',          icon: GraduationCap },
  { id: 'skills',         label: 'Compétences',        icon: Zap },
  { id: 'languages',      label: 'Langues',            icon: Globe },
  { id: 'projects',       label: 'Projets',            icon: FolderOpen },
  { id: 'certifications', label: 'Certifications',     icon: Award },
  { id: 'interests',      label: "Intérêts",           icon: Heart },
]

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#1e293b', '#ef4444']

export function ResumeBuilderPage({ userId, userEmail }: ResumeBuilderPageProps) {
  const cv = useCVBuilder()
  const { data, updateCustomization, toggleSectionVisibility, resetCV, loadSample } = cv
  const { experiences: libraryItems, loading: libraryLoading } = useExperiences(userId)
  useProfile(userId, userEmail) // preload profile

  const [activeSection, setActiveSection] = useState<SectionId>('personal')
  const [showGallery, setShowGallery] = useState(false)

  const resolved = resolveResumeData(data, libraryItems)

  const updatedTime = new Date(data.updatedAt).toLocaleTimeString('fr', {
    hour: '2-digit', minute: '2-digit',
  })

  const handleExportPDF = () => window.print()

  const handleTemplateSelect = (id: TemplateType) => updateCustomization({ template: id })

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-0">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-[var(--color-border)] shrink-0 flex-wrap">
        {/* Template gallery button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-ink)] hover:bg-gray-100 transition-all shadow-sm"
          onClick={() => setShowGallery(true)}
        >
          <LayoutGrid size={13} />
          <span>Templates</span>
          <span className="ml-1 text-[10px] text-[var(--color-muted)] font-normal">32</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--color-border)]" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              className={`w-[18px] h-[18px] rounded-full transition-all ${
                data.customization.primaryColor === c
                  ? 'ring-2 ring-offset-1 ring-gray-500 scale-110'
                  : 'hover:scale-110 opacity-80 hover:opacity-100'
              }`}
              style={{ background: c }}
              onClick={() => updateCustomization({ primaryColor: c })}
              title={c}
            />
          ))}
          <input
            type="color"
            className="w-[18px] h-[18px] rounded cursor-pointer border border-gray-200 p-0 overflow-hidden"
            value={data.customization.primaryColor}
            onChange={e => updateCustomization({ primaryColor: e.target.value })}
            title="Couleur personnalisée"
          />
        </div>

        {/* Right side */}
        <div className="flex-1" />

        <span className="text-[10px] text-[var(--color-muted)] hidden sm:block">
          Auto-sauvegardé {updatedTime}
        </span>

        <button className="btn btn-ghost btn-sm flex items-center gap-1 text-[10px]" onClick={loadSample}>
          <FileDown size={12} /> Exemple
        </button>

        <button
          className="btn btn-ghost btn-sm flex items-center gap-1 text-[10px] text-[var(--color-danger)]"
          onClick={resetCV}
        >
          <RefreshCw size={12} /> Reset
        </button>

        <button
          className="btn btn-primary btn-sm flex items-center gap-1 text-[11px]"
          onClick={handleExportPDF}
        >
          <Download size={12} /> Exporter PDF
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 min-h-0">

        {/* Left panel: vertical section nav + editor */}
        <div className="w-[300px] shrink-0 flex flex-col border-r border-[var(--color-border)] bg-white overflow-hidden">

          {/* Section nav — vertical list */}
          <nav className="shrink-0 py-2 border-b border-[var(--color-border)]">
            {SECTION_NAV.map(sec => {
              const Icon = sec.icon
              const section = data.sections.find(s => s.id === sec.id)
              const active = activeSection === sec.id
              const visible = section?.visible ?? true

              return (
                <div key={sec.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex-1 flex items-center gap-2.5 px-4 py-2 text-left text-xs font-medium transition-all ${
                      active
                        ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/8'
                        : 'text-[var(--color-muted)] hover:bg-gray-50 hover:text-[var(--color-ink)]'
                    } ${!visible ? 'opacity-40' : ''}`}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                        style={{ background: 'var(--color-primary)' }}
                      />
                    )}
                    <Icon size={13} className="shrink-0" />
                    <span>{sec.label}</span>
                  </button>

                  {/* Visibility toggle — appears on hover */}
                  <button
                    className="shrink-0 mr-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-300 hover:text-gray-600"
                    onClick={() => toggleSectionVisibility(sec.id)}
                    title={visible ? 'Masquer du CV' : 'Afficher dans le CV'}
                  >
                    {visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                </div>
              )
            })}
          </nav>

          {/* Section form */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SectionEditor
              activeSection={activeSection}
              data={data}
              cv={cv}
              libraryItems={libraryItems}
              libraryLoading={libraryLoading}
            />
          </div>
        </div>

        {/* Right panel: live preview */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gray-100">
          <div className="px-4 py-2 bg-white/80 backdrop-blur border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wide">
              Aperçu live — {data.customization.template}
            </span>
            <span className="text-[10px] text-[var(--color-muted)]">
              {data.selectedLibraryIds.length} entrée(s) sélectionnée(s)
            </span>
          </div>
          <div className="flex-1 overflow-auto" id="cv-preview-wrapper">
            <CVPreview data={resolved} />
          </div>
        </div>
      </div>

      {/* Template gallery modal */}
      {showGallery && (
        <TemplateGallery
          current={data.customization.template}
          onSelect={handleTemplateSelect}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  )
}
