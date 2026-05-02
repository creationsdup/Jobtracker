import type { SectionId, ResumeData } from '@/types/cvBuilder'
import type { useCVBuilder } from '@/hooks/useCVBuilder'
import type { Experience } from '@/lib/types'
import { PersonalInfoEditor } from './editors/PersonalInfoEditor'
import { SummaryEditor } from './editors/SummaryEditor'
import { ExperiencesEditor } from './editors/ExperiencesEditor'
import { EducationEditor } from './editors/EducationEditor'
import { SkillsEditor } from './editors/SkillsEditor'
import { LanguagesEditor } from './editors/LanguagesEditor'
import { ProjectsEditor } from './editors/ProjectsEditor'
import { CertificationsEditor } from './editors/CertificationsEditor'
import { InterestsEditor } from './editors/InterestsEditor'

type CV = ReturnType<typeof useCVBuilder>

interface Props {
  activeSection: SectionId
  data: ResumeData
  cv: CV
  libraryItems: Experience[]
  libraryLoading: boolean
}

const SECTION_HINTS: Record<SectionId, string> = {
  personal:       'Ces informations apparaissent en en-tête de votre CV.',
  summary:        'Une accroche percutante de 3-5 phrases sur votre profil.',
  experiences:    'Sélectionnez les expériences depuis votre bibliothèque.',
  education:      'Sélectionnez les formations depuis votre bibliothèque.',
  skills:         'Compétences techniques et soft skills.',
  languages:      'Langues parlées avec votre niveau de maîtrise.',
  projects:       'Sélectionnez les projets depuis votre bibliothèque.',
  certifications: 'Certifications et badges professionnels obtenus.',
  interests:      "Vos centres d'intérêt — cela humanise votre candidature.",
}

const SECTION_TITLES: Record<SectionId, string> = {
  personal:       'Informations personnelles',
  summary:        'Résumé professionnel',
  experiences:    'Expériences',
  education:      'Formations',
  skills:         'Compétences',
  languages:      'Langues',
  projects:       'Projets',
  certifications: 'Certifications',
  interests:      "Centres d'intérêt",
}

export function SectionEditor({ activeSection, data, cv, libraryItems, libraryLoading }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2.5 border-b border-[var(--color-border)] shrink-0">
        <h3 className="text-sm font-bold text-[var(--color-ink)]">{SECTION_TITLES[activeSection]}</h3>
        <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{SECTION_HINTS[activeSection]}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {activeSection === 'personal' && (
          <PersonalInfoEditor data={data.personal} onChange={cv.updatePersonal} />
        )}
        {activeSection === 'summary' && (
          <SummaryEditor value={data.summary} onChange={cv.updateSummary} />
        )}
        {activeSection === 'experiences' && (
          <ExperiencesEditor
            libraryItems={libraryItems}
            selectedIds={data.selectedLibraryIds}
            onToggle={cv.toggleLibraryItem}
            loading={libraryLoading}
          />
        )}
        {activeSection === 'education' && (
          <EducationEditor
            libraryItems={libraryItems}
            selectedIds={data.selectedLibraryIds}
            onToggle={cv.toggleLibraryItem}
            loading={libraryLoading}
          />
        )}
        {activeSection === 'skills' && (
          <SkillsEditor items={data.skills} onAdd={cv.addSkill} onUpdate={cv.updateSkill} onDelete={cv.deleteSkill} />
        )}
        {activeSection === 'languages' && (
          <LanguagesEditor items={data.languages} onAdd={cv.addLanguage} onDelete={cv.deleteLanguage} />
        )}
        {activeSection === 'projects' && (
          <ProjectsEditor
            libraryItems={libraryItems}
            selectedIds={data.selectedLibraryIds}
            onToggle={cv.toggleLibraryItem}
            loading={libraryLoading}
          />
        )}
        {activeSection === 'certifications' && (
          <CertificationsEditor items={data.certifications} onAdd={cv.addCertification} onDelete={cv.deleteCertification} />
        )}
        {activeSection === 'interests' && (
          <InterestsEditor items={data.interests} onAdd={cv.addInterest} onDelete={cv.deleteInterest} />
        )}
      </div>
    </div>
  )
}
