export type LayoutId = 'classic' | 'sidebar' | 'minimal' | 'creative' | 'banner'

export interface TemplateColors {
  primary: string
  sidebar: string
  sidebarText: string
  bg: string
  text: string
  heading: string
  muted: string
  border: string
  accent: string
}

export type SectionStyle = 'line' | 'band' | 'dot' | 'badge' | 'caps' | 'minimal'
export type HeaderAlign = 'left' | 'center'
export type FontStyle = 'serif' | 'sans' | 'mono'
export type SpacingStyle = 'tight' | 'normal' | 'relaxed'

export interface CVTemplate {
  id: string
  name: string
  category: 'Classique' | 'Sidebar' | 'Minimal' | 'Créatif' | 'Pro'
  layout: LayoutId
  colors: TemplateColors
  font: FontStyle
  sectionStyle: SectionStyle
  headerAlign: HeaderAlign
  spacing: SpacingStyle
}
