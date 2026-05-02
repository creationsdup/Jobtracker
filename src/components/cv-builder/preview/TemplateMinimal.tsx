import type { ResolvedResumeData as ResumeData } from '@/types/cvBuilder'
import { formatCVDate } from '@/utils/cvHelpers'

interface Props { data: ResumeData }

export function TemplateMinimal({ data }: Props) {
  const { personal, summary, experiences, education, skills, languages, projects, certifications, interests, sections } = data
  const visibleSections = sections.filter(s => s.visible)
  const isVisible = (id: string) => visibleSections.some(s => s.id === id)

  return (
    <div className="bg-white text-gray-900 px-14 py-12 min-h-[297mm] w-[794px]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-light tracking-tight text-gray-900">
          {personal.firstName} <strong className="font-bold">{personal.lastName}</strong>
        </h1>
        {personal.title && <p className="text-[13px] text-gray-400 mt-1">{personal.title}</p>}
        <p className="text-[10px] text-gray-400 mt-2 tracking-wide">
          {[personal.email, personal.phone, personal.location, personal.linkedin].filter(Boolean).join('   ·   ')}
        </p>
      </div>

      {/* Summary */}
      {isVisible('summary') && summary && (
        <div className="mb-7 pb-7 border-b border-gray-100">
          <p className="text-[11px] text-gray-500 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Experiences */}
      {isVisible('experiences') && experiences.length > 0 && (
        <MinSection title="Expérience">
          {experiences.map(exp => (
            <MinItem
              key={exp.id}
              title={`${exp.position} — ${exp.company}`}
              subtitle={exp.location}
              date={`${formatCVDate(exp.startDate)} – ${exp.current ? 'Présent' : formatCVDate(exp.endDate)}`}
              description={exp.description}
            />
          ))}
        </MinSection>
      )}

      {/* Education */}
      {isVisible('education') && education.length > 0 && (
        <MinSection title="Formation">
          {education.map(edu => (
            <MinItem
              key={edu.id}
              title={`${edu.degree}${edu.field ? `, ${edu.field}` : ''}`}
              subtitle={edu.institution}
              date={`${formatCVDate(edu.startDate)} – ${edu.current ? 'Présent' : formatCVDate(edu.endDate)}`}
              description={edu.description}
            />
          ))}
        </MinSection>
      )}

      {/* Skills */}
      {isVisible('skills') && skills.length > 0 && (
        <MinSection title="Compétences">
          <p className="text-[10px] text-gray-600 leading-loose">
            {skills.map(sk => sk.name).join('   ·   ')}
          </p>
        </MinSection>
      )}

      {/* Languages */}
      {isVisible('languages') && languages.length > 0 && (
        <MinSection title="Langues">
          <p className="text-[10px] text-gray-600">
            {languages.map(l => `${l.name}${l.level ? ` (${l.level})` : ''}`).join('   ·   ')}
          </p>
        </MinSection>
      )}

      {/* Projects */}
      {isVisible('projects') && projects.length > 0 && (
        <MinSection title="Projets">
          {projects.map(proj => (
            <div key={proj.id} className="mb-3">
              <div className="flex items-baseline gap-2">
                <p className="font-medium text-[11px]">{proj.name}</p>
                {proj.technologies && <span className="text-[9px] text-gray-400">{proj.technologies}</span>}
              </div>
              {proj.description && <p className="text-[10px] text-gray-500 mt-0.5">{proj.description}</p>}
            </div>
          ))}
        </MinSection>
      )}

      {/* Certifications */}
      {isVisible('certifications') && certifications.length > 0 && (
        <MinSection title="Certifications">
          {certifications.map(cert => (
            <div key={cert.id} className="mb-2">
              <span className="font-medium text-[10px]">{cert.name}</span>
              <span className="text-[9px] text-gray-400 ml-2">{cert.issuer}{cert.date ? ` · ${formatCVDate(cert.date)}` : ''}</span>
            </div>
          ))}
        </MinSection>
      )}

      {/* Interests */}
      {isVisible('interests') && interests.length > 0 && (
        <MinSection title="Intérêts">
          <p className="text-[10px] text-gray-500">{interests.map(i => i.name).join('   ·   ')}</p>
        </MinSection>
      )}
    </div>
  )
}

function MinSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex gap-8">
      <p className="text-[9px] font-semibold text-gray-300 uppercase tracking-[0.12em] w-24 shrink-0 pt-0.5">{title}</p>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function MinItem({ title, subtitle, date, description }: { title: string; subtitle?: string; date?: string; description?: string }) {
  return (
    <div className="mb-4 pb-4 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
      <div className="flex justify-between items-start">
        <p className="font-semibold text-[11px] text-gray-800">{title}</p>
        {date && <p className="text-[9px] text-gray-400 ml-4 shrink-0">{date}</p>}
      </div>
      {subtitle && <p className="text-[9.5px] text-gray-500 mt-0.5">{subtitle}</p>}
      {description && <p className="text-[9.5px] text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{description}</p>}
    </div>
  )
}
