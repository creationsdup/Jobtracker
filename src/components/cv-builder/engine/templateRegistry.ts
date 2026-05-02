import type { TemplateType } from '@/types/cvBuilder'

export type LayoutType = 'single' | 'sidebar-left' | 'sidebar-right' | 'two-col'
export type HeaderStyle = 'simple' | 'centered' | 'bold-left' | 'band' | 'gradient-band' | 'split-contact'
export type SectionStyle = 'underline' | 'border-left' | 'dot' | 'minimal' | 'box-bg' | 'caps-line'
export type ColorMode = 'accent' | 'sidebar' | 'header' | 'minimal'
export type FontVariant = 'sans' | 'serif' | 'mono'

export interface TemplateConfig {
  id: TemplateType
  label: string
  category: 'professional' | 'creative' | 'minimal' | 'tech' | 'academic'
  layout: LayoutType
  headerStyle: HeaderStyle
  sectionStyle: SectionStyle
  colorMode: ColorMode
  font: FontVariant
  /** Which sections to render in the sidebar (sidebar-left / sidebar-right layouts only) */
  sidebarSections: string[]
  /** Use a dark background (slate-800) for the full template */
  darkBg?: boolean
}

// Legacy templates handled by their own files
export const LEGACY_TEMPLATES = new Set<TemplateType>(['classic', 'modern', 'minimal', 'creative'])

const REGISTRY: TemplateConfig[] = [
  // ─── Professional ───────────────────────────────────────────────────────────
  {
    id: 'classic', label: 'Classique', category: 'professional',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'underline',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
  {
    id: 'executive', label: 'Exécutif', category: 'professional',
    layout: 'single', headerStyle: 'bold-left', sectionStyle: 'underline',
    colorMode: 'header', font: 'serif', sidebarSections: [],
  },
  {
    id: 'banker', label: 'Bancaire', category: 'professional',
    layout: 'single', headerStyle: 'centered', sectionStyle: 'border-left',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
  {
    id: 'consultant', label: 'Consultant', category: 'professional',
    layout: 'sidebar-left', headerStyle: 'band', sectionStyle: 'minimal',
    colorMode: 'sidebar', font: 'sans',
    sidebarSections: ['skills', 'languages', 'certifications', 'interests'],
  },
  {
    id: 'corporate', label: 'Corporate', category: 'professional',
    layout: 'sidebar-left', headerStyle: 'gradient-band', sectionStyle: 'box-bg',
    colorMode: 'sidebar', font: 'sans',
    sidebarSections: ['skills', 'languages', 'interests'],
  },
  {
    id: 'manager', label: 'Manager', category: 'professional',
    layout: 'single', headerStyle: 'split-contact', sectionStyle: 'border-left',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },
  {
    id: 'director', label: 'Directeur', category: 'professional',
    layout: 'sidebar-right', headerStyle: 'bold-left', sectionStyle: 'minimal',
    colorMode: 'header', font: 'serif',
    sidebarSections: ['skills', 'languages', 'certifications', 'interests'],
  },
  {
    id: 'senior', label: 'Senior', category: 'professional',
    layout: 'two-col', headerStyle: 'simple', sectionStyle: 'underline',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },

  // ─── Creative ────────────────────────────────────────────────────────────────
  {
    id: 'modern', label: 'Moderne', category: 'creative',
    layout: 'sidebar-left', headerStyle: 'gradient-band', sectionStyle: 'border-left',
    colorMode: 'sidebar', font: 'sans',
    sidebarSections: ['skills', 'languages', 'interests'],
  },
  {
    id: 'creative', label: 'Créatif', category: 'creative',
    layout: 'single', headerStyle: 'gradient-band', sectionStyle: 'dot',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },
  {
    id: 'designer', label: 'Designer', category: 'creative',
    layout: 'sidebar-left', headerStyle: 'band', sectionStyle: 'caps-line',
    colorMode: 'sidebar', font: 'sans',
    sidebarSections: ['skills', 'languages', 'interests'],
  },
  {
    id: 'portfolio', label: 'Portfolio', category: 'creative',
    layout: 'sidebar-right', headerStyle: 'bold-left', sectionStyle: 'dot',
    colorMode: 'header', font: 'sans',
    sidebarSections: ['skills', 'languages', 'certifications'],
  },
  {
    id: 'freelance', label: 'Freelance', category: 'creative',
    layout: 'single', headerStyle: 'centered', sectionStyle: 'minimal',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },
  {
    id: 'artiste', label: 'Artiste', category: 'creative',
    layout: 'two-col', headerStyle: 'centered', sectionStyle: 'dot',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
  {
    id: 'vivid', label: 'Vif', category: 'creative',
    layout: 'single', headerStyle: 'band', sectionStyle: 'box-bg',
    colorMode: 'header', font: 'sans', sidebarSections: [],
  },
  {
    id: 'studio', label: 'Studio', category: 'creative',
    layout: 'sidebar-left', headerStyle: 'split-contact', sectionStyle: 'border-left',
    colorMode: 'sidebar', font: 'sans',
    sidebarSections: ['skills', 'languages', 'interests', 'certifications'],
  },

  // ─── Minimal ─────────────────────────────────────────────────────────────────
  {
    id: 'minimal', label: 'Minimaliste', category: 'minimal',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'minimal',
    colorMode: 'minimal', font: 'sans', sidebarSections: [],
  },
  {
    id: 'nordic', label: 'Nordique', category: 'minimal',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'dot',
    colorMode: 'minimal', font: 'sans', sidebarSections: [],
  },
  {
    id: 'clean', label: 'Clean', category: 'minimal',
    layout: 'two-col', headerStyle: 'simple', sectionStyle: 'minimal',
    colorMode: 'minimal', font: 'sans', sidebarSections: [],
  },
  {
    id: 'swiss', label: 'Suisse', category: 'minimal',
    layout: 'single', headerStyle: 'centered', sectionStyle: 'caps-line',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },
  {
    id: 'monochrome', label: 'Monochrome', category: 'minimal',
    layout: 'single', headerStyle: 'bold-left', sectionStyle: 'underline',
    colorMode: 'minimal', font: 'sans', sidebarSections: [],
  },
  {
    id: 'zen', label: 'Zen', category: 'minimal',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'minimal',
    colorMode: 'minimal', font: 'serif', sidebarSections: [],
  },

  // ─── Tech ────────────────────────────────────────────────────────────────────
  {
    id: 'tech', label: 'Tech', category: 'tech',
    layout: 'single', headerStyle: 'split-contact', sectionStyle: 'border-left',
    colorMode: 'accent', font: 'mono', sidebarSections: [],
  },
  {
    id: 'developer', label: 'Développeur', category: 'tech',
    layout: 'sidebar-left', headerStyle: 'band', sectionStyle: 'border-left',
    colorMode: 'sidebar', font: 'mono',
    sidebarSections: ['skills', 'languages', 'certifications'],
  },
  {
    id: 'engineer', label: 'Ingénieur', category: 'tech',
    layout: 'two-col', headerStyle: 'simple', sectionStyle: 'minimal',
    colorMode: 'accent', font: 'mono', sidebarSections: [],
  },
  {
    id: 'data', label: 'Data', category: 'tech',
    layout: 'single', headerStyle: 'gradient-band', sectionStyle: 'box-bg',
    colorMode: 'header', font: 'mono', sidebarSections: [],
  },
  {
    id: 'hacker', label: 'Hacker', category: 'tech',
    layout: 'single', headerStyle: 'band', sectionStyle: 'border-left',
    colorMode: 'header', font: 'mono', sidebarSections: [],
    darkBg: true,
  },

  // ─── Academic ────────────────────────────────────────────────────────────────
  {
    id: 'academic', label: 'Académique', category: 'academic',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'underline',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
  {
    id: 'researcher', label: 'Chercheur', category: 'academic',
    layout: 'single', headerStyle: 'centered', sectionStyle: 'minimal',
    colorMode: 'minimal', font: 'serif', sidebarSections: [],
  },
  {
    id: 'scientist', label: 'Scientifique', category: 'academic',
    layout: 'single', headerStyle: 'simple', sectionStyle: 'box-bg',
    colorMode: 'accent', font: 'sans', sidebarSections: [],
  },
  {
    id: 'professor', label: 'Professeur', category: 'academic',
    layout: 'two-col', headerStyle: 'simple', sectionStyle: 'underline',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
  {
    id: 'scholar', label: 'Érudit', category: 'academic',
    layout: 'single', headerStyle: 'bold-left', sectionStyle: 'caps-line',
    colorMode: 'accent', font: 'serif', sidebarSections: [],
  },
]

const registryMap = new Map<TemplateType, TemplateConfig>(
  REGISTRY.map(t => [t.id, t])
)

export function getTemplateConfig(id: TemplateType): TemplateConfig {
  const config = registryMap.get(id)
  if (!config) {
    // fallback to classic config if unknown
    return registryMap.get('classic')!
  }
  return config
}

export function getTemplatesByCategory(
  category: TemplateConfig['category']
): TemplateConfig[] {
  return REGISTRY.filter(t => t.category === category)
}

export { REGISTRY as ALL_TEMPLATES }
