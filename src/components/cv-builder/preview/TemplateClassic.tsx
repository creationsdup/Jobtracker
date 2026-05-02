import type { ResolvedResumeData as ResumeData } from '@/types/cvBuilder'
import { formatCVDate, skillLevelLabel } from '@/utils/cvHelpers'

interface Props { data: ResumeData }

export function TemplateClassic({ data }: Props) {
  const { personal, summary, experiences, education, skills, languages, projects, certifications, interests, sections, customization } = data
  const color = customization.primaryColor
  const visibleSections = sections.filter(s => s.visible)

  const sectionContent: Record<string, React.ReactNode> = {
    experiences: experiences.length > 0 && (
      <Section title="EXPÉRIENCES PROFESSIONNELLES" color={color}>
        {experiences.map(exp => (
          <div key={exp.id} className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-[11px] text-gray-900">{exp.position}</p>
                <p className="text-[10px] text-gray-600">{exp.company}{exp.location ? ` — ${exp.location}` : ''}</p>
              </div>
              <p className="text-[9px] text-gray-400 shrink-0 ml-4">
                {formatCVDate(exp.startDate)} – {exp.current ? 'Présent' : formatCVDate(exp.endDate)}
              </p>
            </div>
            {exp.description && <p className="text-[9.5px] text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{exp.description}</p>}
          </div>
        ))}
      </Section>
    ),
    education: education.length > 0 && (
      <Section title="FORMATIONS" color={color}>
        {education.map(edu => (
          <div key={edu.id} className="mb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-[11px] text-gray-900">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
                <p className="text-[10px] text-gray-600">{edu.institution}{edu.location ? `, ${edu.location}` : ''}</p>
              </div>
              <p className="text-[9px] text-gray-400 shrink-0 ml-4">
                {formatCVDate(edu.startDate)} – {edu.current ? 'Présent' : formatCVDate(edu.endDate)}
              </p>
            </div>
            {edu.description && <p className="text-[9.5px] text-gray-500 mt-0.5">{edu.description}</p>}
          </div>
        ))}
      </Section>
    ),
    skills: skills.length > 0 && (
      <Section title="COMPÉTENCES" color={color}>
        <div className="flex flex-wrap gap-1.5">
          {skills.map(sk => (
            <span key={sk.id} className="inline-flex items-center gap-1 text-[9px] border border-gray-200 px-2 py-0.5 rounded">
              <span>{sk.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{skillLevelLabel(sk.level)}</span>
            </span>
          ))}
        </div>
      </Section>
    ),
    languages: languages.length > 0 && (
      <Section title="LANGUES" color={color}>
        <div className="flex flex-wrap gap-3">
          {languages.map(lang => (
            <span key={lang.id} className="text-[10px]">
              <span className="font-medium">{lang.name}</span>
              {lang.level && <span className="text-gray-500"> — {lang.level}</span>}
            </span>
          ))}
        </div>
      </Section>
    ),
    projects: projects.length > 0 && (
      <Section title="PROJETS" color={color}>
        {projects.map(proj => (
          <div key={proj.id} className="mb-3">
            <div className="flex justify-between">
              <p className="font-bold text-[11px]">{proj.name}</p>
              {proj.url && <p className="text-[9px] text-blue-500">{proj.url}</p>}
            </div>
            {proj.technologies && <p className="text-[9px] text-gray-400 mt-0.5">{proj.technologies}</p>}
            {proj.description && <p className="text-[9.5px] text-gray-600 mt-0.5">{proj.description}</p>}
          </div>
        ))}
      </Section>
    ),
    certifications: certifications.length > 0 && (
      <Section title="CERTIFICATIONS" color={color}>
        {certifications.map(cert => (
          <div key={cert.id} className="mb-2 flex justify-between">
            <div>
              <p className="font-medium text-[10px]">{cert.name}</p>
              <p className="text-[9px] text-gray-500">{cert.issuer}</p>
            </div>
            {cert.date && <p className="text-[9px] text-gray-400">{formatCVDate(cert.date)}</p>}
          </div>
        ))}
      </Section>
    ),
    interests: interests.length > 0 && (
      <Section title="CENTRES D'INTÉRÊT" color={color}>
        <p className="text-[10px] text-gray-600">{interests.map(i => i.name).join(' · ')}</p>
      </Section>
    ),
  }

  return (
    <div className="bg-white text-gray-900 p-10 min-h-[297mm] w-[794px]" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div className="pb-5 mb-6" style={{ borderBottom: `2px solid ${color}` }}>
        <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
          {personal.firstName} {personal.lastName}
        </h1>
        {personal.title && (
          <p className="text-[13px] mt-1 font-medium" style={{ color }}>{personal.title}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[10px] text-gray-500">
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <span>{personal.phone}</span>}
          {personal.location && <span>{personal.location}</span>}
          {personal.linkedin && <span>{personal.linkedin}</span>}
          {personal.website && <span>{personal.website}</span>}
          {personal.github && <span>{personal.github}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && visibleSections.find(s => s.id === 'summary') && (
        <Section title="PROFIL" color={color}>
          <p className="text-[10px] text-gray-700 leading-relaxed">{summary}</p>
        </Section>
      )}

      {/* Dynamic sections */}
      {visibleSections
        .filter(s => !['personal', 'summary'].includes(s.id))
        .map(s => sectionContent[s.id])}
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-[9px] font-bold tracking-[0.15em] mb-2.5 pb-1" style={{ color, borderBottom: `1px solid ${color}30` }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
