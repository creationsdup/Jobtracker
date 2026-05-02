import { useState, useEffect, useCallback } from 'react'
import type {
  ResumeData,
  PersonalInfo,
  CVSkill,
  CVLanguage,
  CVCertification,
  CVInterest,
  ResumeSection,
  CustomizationOptions,
  SectionId,
} from '@/types/cvBuilder'

const STORAGE_KEY = 'cv-builder-data'

export const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: 'personal',       label: 'Informations personnelles', visible: true },
  { id: 'summary',        label: 'Résumé professionnel',      visible: true },
  { id: 'experiences',    label: 'Expériences',               visible: true },
  { id: 'education',      label: 'Formations',                visible: true },
  { id: 'skills',         label: 'Compétences',               visible: true },
  { id: 'languages',      label: 'Langues',                   visible: true },
  { id: 'projects',       label: 'Projets',                   visible: true },
  { id: 'certifications', label: 'Certifications',            visible: true },
  { id: 'interests',      label: "Centres d'intérêt",         visible: true },
]

function createEmptyResume(): ResumeData {
  return {
    id: crypto.randomUUID(),
    personal: {
      firstName: '', lastName: '', title: '', email: '',
      phone: '', location: '', website: '', linkedin: '', github: '', photoUrl: '',
    },
    summary: '',
    selectedLibraryIds: [],
    skills: [],
    languages: [],
    certifications: [],
    interests: [],
    sections: DEFAULT_SECTIONS,
    customization: {
      template: 'classic',
      primaryColor: '#3b82f6',
      fontFamily: 'inter',
      fontSize: 'md',
      spacing: 'normal',
    },
    updatedAt: new Date().toISOString(),
  }
}

function uid() { return crypto.randomUUID() }

export const aiTransforms = {
  improve(text: string): string {
    if (!text.trim()) return text
    const endings = [
      ` Cela a contribué à améliorer significativement les résultats de l'équipe.`,
      ` Ce travail a eu un impact direct et mesurable sur les performances du produit.`,
      ` Cette initiative a été reconnue comme une best practice au sein de l'organisation.`,
    ]
    return text.trimEnd() + endings[Math.floor(Math.random() * endings.length)]
  },
  professional(text: string): string {
    return text
      .replace(/\bj'ai fait\b/gi, "J'ai réalisé")
      .replace(/\btravaillé sur\b/gi, 'contribué à')
      .replace(/\bj'ai aidé\b/gi, "J'ai facilité")
      .replace(/\bfait\b/gi, 'réalisé')
      .replace(/\btravaillé\b/gi, 'collaboré')
  },
  bulletPoints(text: string): string {
    const sentences = text.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 8)
    if (sentences.length <= 1) return `• ${text.trim()}`
    return sentences.map(s => `• ${s.replace(/[.!?]$/, '')}`).join('\n')
  },
}

export function useCVBuilder() {
  const [data, setData] = useState<ResumeData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ResumeData
        // Migrate old format that had experiences[] instead of selectedLibraryIds
        if (!parsed.selectedLibraryIds) {
          parsed.selectedLibraryIds = []
        }
        return parsed
      }
    } catch { /* corrupted storage */ }
    return createEmptyResume()
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }))
  }, [data])

  const updatePersonal = useCallback((partial: Partial<PersonalInfo>) => {
    setData(d => ({ ...d, personal: { ...d.personal, ...partial } }))
  }, [])

  const updateSummary = useCallback((summary: string) => {
    setData(d => ({ ...d, summary }))
  }, [])

  // Library selection
  const toggleLibraryItem = useCallback((id: string) => {
    setData(d => ({
      ...d,
      selectedLibraryIds: d.selectedLibraryIds.includes(id)
        ? d.selectedLibraryIds.filter(x => x !== id)
        : [...d.selectedLibraryIds, id],
    }))
  }, [])

  const clearLibrarySelection = useCallback(() => {
    setData(d => ({ ...d, selectedLibraryIds: [] }))
  }, [])

  // Skills
  const addSkill = useCallback((skill: Omit<CVSkill, 'id'>) => {
    setData(d => ({ ...d, skills: [...d.skills, { ...skill, id: uid() }] }))
  }, [])
  const updateSkill = useCallback((id: string, partial: Partial<CVSkill>) => {
    setData(d => ({ ...d, skills: d.skills.map(s => (s.id === id ? { ...s, ...partial } : s)) }))
  }, [])
  const deleteSkill = useCallback((id: string) => {
    setData(d => ({ ...d, skills: d.skills.filter(s => s.id !== id) }))
  }, [])

  // Languages
  const addLanguage = useCallback((lang: Omit<CVLanguage, 'id'>) => {
    setData(d => ({ ...d, languages: [...d.languages, { ...lang, id: uid() }] }))
  }, [])
  const deleteLanguage = useCallback((id: string) => {
    setData(d => ({ ...d, languages: d.languages.filter(l => l.id !== id) }))
  }, [])

  // Certifications
  const addCertification = useCallback((cert: Omit<CVCertification, 'id'>) => {
    setData(d => ({ ...d, certifications: [...d.certifications, { ...cert, id: uid() }] }))
  }, [])
  const deleteCertification = useCallback((id: string) => {
    setData(d => ({ ...d, certifications: d.certifications.filter(c => c.id !== id) }))
  }, [])

  // Interests
  const addInterest = useCallback((interest: Omit<CVInterest, 'id'>) => {
    setData(d => ({ ...d, interests: [...d.interests, { ...interest, id: uid() }] }))
  }, [])
  const deleteInterest = useCallback((id: string) => {
    setData(d => ({ ...d, interests: d.interests.filter(i => i.id !== id) }))
  }, [])

  // Sections
  const updateSections = useCallback((sections: ResumeSection[]) => {
    setData(d => ({ ...d, sections }))
  }, [])
  const toggleSectionVisibility = useCallback((id: SectionId) => {
    setData(d => ({
      ...d,
      sections: d.sections.map(s => (s.id === id ? { ...s, visible: !s.visible } : s)),
    }))
  }, [])

  // Customization
  const updateCustomization = useCallback((partial: Partial<CustomizationOptions>) => {
    setData(d => ({ ...d, customization: { ...d.customization, ...partial } }))
  }, [])

  // Reset / sample
  const resetCV = useCallback(() => {
    if (window.confirm('Réinitialiser le CV ? Toutes les données seront perdues.')) {
      setData(createEmptyResume())
    }
  }, [])

  const loadSample = useCallback(() => {
    import('@/data/cvSampleData').then(({ CV_SAMPLE_DATA }) => {
      setData({ ...CV_SAMPLE_DATA, id: uid(), updatedAt: new Date().toISOString() })
    })
  }, [])

  return {
    data,
    updatePersonal,
    updateSummary,
    toggleLibraryItem,
    clearLibrarySelection,
    addSkill, updateSkill, deleteSkill,
    addLanguage, deleteLanguage,
    addCertification, deleteCertification,
    addInterest, deleteInterest,
    updateSections,
    toggleSectionVisibility,
    updateCustomization,
    resetCV,
    loadSample,
  }
}
