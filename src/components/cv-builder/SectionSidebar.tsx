import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  User, FileText, Briefcase, GraduationCap, Zap,
  Globe, FolderOpen, Award, Heart, GripVertical, Eye, EyeOff,
  type LucideIcon,
} from 'lucide-react'
import type { ResumeSection, SectionId, CustomizationOptions, TemplateType } from '@/types/cvBuilder'

interface Props {
  sections: ResumeSection[]
  activeSection: SectionId
  customization: CustomizationOptions
  onSelectSection: (id: SectionId) => void
  onReorderSections: (sections: ResumeSection[]) => void
  onToggleVisibility: (id: SectionId) => void
  onCustomizationChange: (partial: Partial<CustomizationOptions>) => void
}

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  personal: User,
  summary: FileText,
  experiences: Briefcase,
  education: GraduationCap,
  skills: Zap,
  languages: Globe,
  projects: FolderOpen,
  certifications: Award,
  interests: Heart,
}

const TEMPLATES: { id: TemplateType; label: string }[] = [
  { id: 'classic', label: 'Classique' },
  { id: 'modern', label: 'Moderne' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'creative', label: 'Créatif' },
]

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#10b981', '#f59e0b', '#ef4444', '#0ea5e9',
  '#64748b', '#1e293b',
]

export function SectionSidebar({
  sections,
  activeSection,
  customization,
  onSelectSection,
  onReorderSections,
  onToggleVisibility,
  onCustomizationChange,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sections.findIndex(s => s.id === active.id)
    const newIdx = sections.findIndex(s => s.id === over.id)
    onReorderSections(arrayMove(sections, oldIdx, newIdx))
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-4">
      {/* Sections nav */}
      <div className="card px-3 py-3 flex flex-col gap-0.5">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold px-2 pb-2">
          Sections
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map(section => (
              <SortableItem
                key={section.id}
                section={section}
                active={activeSection === section.id}
                onSelect={() => onSelectSection(section.id)}
                onToggle={() => onToggleVisibility(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Template */}
      <div className="card px-3 py-3 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Template</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`text-xs px-2 py-2 rounded-lg transition-all font-medium text-center ${
                customization.template === t.id
                  ? 'text-white shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-muted)] hover:bg-gray-200/60'
              }`}
              style={customization.template === t.id ? { background: customization.primaryColor } : {}}
              onClick={() => onCustomizationChange({ template: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="card px-3 py-3 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Couleur</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              className={`w-7 h-7 rounded-full transition-all ${customization.primaryColor === c ? 'ring-2 ring-offset-1 ring-[var(--color-ink)]' : 'hover:scale-110'}`}
              style={{ background: c }}
              onClick={() => onCustomizationChange({ primaryColor: c })}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <label className="text-[10px] text-[var(--color-muted)]">Personnalisée</label>
          <input
            type="color"
            className="w-8 h-6 rounded cursor-pointer border border-[var(--color-border)]"
            value={customization.primaryColor}
            onChange={e => onCustomizationChange({ primaryColor: e.target.value })}
          />
        </div>
      </div>

      {/* Typography */}
      <div className="card px-3 py-3 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-semibold">Typographie</p>
        <div>
          <label className="text-[10px] text-[var(--color-muted)]">Police</label>
          <select
            className="input text-xs mt-0.5 w-full"
            value={customization.fontFamily}
            onChange={e => onCustomizationChange({ fontFamily: e.target.value as CustomizationOptions['fontFamily'] })}
          >
            <option value="inter">Inter (moderne)</option>
            <option value="georgia">Georgia (classique)</option>
            <option value="roboto">Roboto (neutre)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--color-muted)]">Espacement</label>
          <select
            className="input text-xs mt-0.5 w-full"
            value={customization.spacing}
            onChange={e => onCustomizationChange({ spacing: e.target.value as CustomizationOptions['spacing'] })}
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Aéré</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function SortableItem({
  section,
  active,
  onSelect,
  onToggle,
}: {
  section: ResumeSection
  active: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const Icon = SECTION_ICONS[section.id]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-lg transition-all ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      {/* Drag handle */}
      <button className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={12} />
      </button>

      {/* Section button */}
      <button
        className={`flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-left transition-all ${
          active
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'hover:bg-[var(--color-bg)] text-[var(--color-ink)]'
        } ${!section.visible ? 'opacity-40' : ''}`}
        onClick={onSelect}
      >
        <Icon size={13} />
        <span className="text-xs font-medium truncate">{section.label}</span>
      </button>

      {/* Visibility toggle */}
      <button
        className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
        onClick={e => { e.stopPropagation(); onToggle() }}
        title={section.visible ? 'Masquer du CV' : 'Afficher dans le CV'}
      >
        {section.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>
    </div>
  )
}
