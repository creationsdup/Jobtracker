export interface PersonalInfo {
  firstName: string
  lastName: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  photoUrl: string
}

export interface CVExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface CVEducation {
  id: string
  institution: string
  degree: string
  field: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface CVSkill {
  id: string
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  category: string
}

export interface CVLanguage {
  id: string
  name: string
  level: string
}

export interface CVProject {
  id: string
  name: string
  description: string
  url: string
  technologies: string
  startDate: string
  endDate: string
}

export interface CVCertification {
  id: string
  name: string
  issuer: string
  date: string
  url: string
}

export interface CVInterest {
  id: string
  name: string
}

export type SectionId =
  | 'personal'
  | 'summary'
  | 'experiences'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certifications'
  | 'interests'

export interface ResumeSection {
  id: SectionId
  label: string
  visible: boolean
}

export type TemplateType =
  // Professional
  | 'classic' | 'executive' | 'banker' | 'consultant' | 'corporate' | 'manager' | 'director' | 'senior'
  // Creative
  | 'modern' | 'creative' | 'designer' | 'portfolio' | 'freelance' | 'artiste' | 'vivid' | 'studio'
  // Minimal
  | 'minimal' | 'nordic' | 'clean' | 'swiss' | 'monochrome' | 'zen'
  // Tech
  | 'tech' | 'developer' | 'engineer' | 'data' | 'hacker'
  // Academic
  | 'academic' | 'researcher' | 'scientist' | 'professor' | 'scholar'

export type FontFamily = 'inter' | 'georgia' | 'roboto' | 'playfair'

export type FontSize = 'sm' | 'md' | 'lg'

export type Spacing = 'compact' | 'normal' | 'relaxed'

export interface CustomizationOptions {
  template: TemplateType
  primaryColor: string
  fontFamily: FontFamily
  fontSize: FontSize
  spacing: Spacing
}

export interface ResumeData {
  id: string
  personal: PersonalInfo
  summary: string
  // experiences, education, projects are resolved at render-time from library selection
  selectedLibraryIds: string[]
  skills: CVSkill[]
  languages: CVLanguage[]
  certifications: CVCertification[]
  interests: CVInterest[]
  sections: ResumeSection[]
  customization: CustomizationOptions
  updatedAt: string
}

// Fully resolved data passed to templates (library items expanded)
export interface ResolvedResumeData extends Omit<ResumeData, 'selectedLibraryIds'> {
  experiences: CVExperience[]
  education: CVEducation[]
  projects: CVProject[]
}
