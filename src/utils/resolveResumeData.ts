import type { ResumeData, ResolvedResumeData } from '@/types/cvBuilder'
import type { Experience } from '@/lib/types'

export function resolveResumeData(data: ResumeData, libraryItems: Experience[]): ResolvedResumeData {
  const selected = libraryItems.filter(e => data.selectedLibraryIds.includes(e.id))

  const experiences = selected
    .filter(e => e.type === 'WORK' || e.type === 'VOLUNTEER')
    .map(e => ({
      id: e.id,
      company: e.organization,
      position: e.title,
      location: e.location ?? '',
      startDate: e.startDate,
      endDate: e.endDate ?? '',
      current: e.current,
      description: e.description ?? '',
    }))

  const education = selected
    .filter(e => e.type === 'EDUCATION')
    .map(e => ({
      id: e.id,
      institution: e.organization,
      degree: e.title,
      field: '',
      location: e.location ?? '',
      startDate: e.startDate,
      endDate: e.endDate ?? '',
      current: e.current,
      description: e.description ?? '',
    }))

  const projects = selected
    .filter(e => e.type === 'PROJECT')
    .map(e => ({
      id: e.id,
      name: e.title,
      description: e.description ?? '',
      url: '',
      technologies: e.skills.join(', '),
      startDate: e.startDate,
      endDate: e.endDate ?? '',
    }))

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { selectedLibraryIds: _, ...rest } = data

  return { ...rest, experiences, education, projects }
}
