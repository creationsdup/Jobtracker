import type { ResolvedResumeData as ResumeData } from '@/types/cvBuilder'
import { formatCVDate } from '@/utils/cvHelpers'

interface Props { data: ResumeData }

export function TemplateCreative({ data }: Props) {
  const { personal, summary, experiences, education, skills, languages, projects, certifications, interests, sections, customization } = data
  const color = customization.primaryColor
  const visibleSections = sections.filter(s => s.visible)
  const isVisible = (id: string) => visibleSections.some(s => s.id === id)

  return (
    <div className="bg-white text-gray-900 min-h-[297mm] w-[794px]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top accent band */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${lighten(color, 30)})` }} />

      <div className="px-10 py-8">
        {/* Header — 2 columns */}
        <div className="flex justify-between items-start mb-7 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight text-gray-900 leading-none">
              {personal.firstName}
            </h1>
            <h1 className="text-[30px] font-light tracking-tight leading-none" style={{ color }}>{personal.lastName}</h1>
            {personal.title && <p className="text-[12px] text-gray-500 mt-2 font-medium">{personal.title}</p>}
          </div>
          <div className="text-right text-[10px] text-gray-500 flex flex-col gap-0.5">
            {personal.email && <span>{personal.email}</span>}
            {personal.phone && <span>{personal.phone}</span>}
            {personal.location && <span>{personal.location}</span>}
            {personal.linkedin && <span>{personal.linkedin}</span>}
            {personal.website && <span>{personal.website}</span>}
            {personal.github && <span>{personal.github}</span>}
          </div>
        </div>

        {/* Summary */}
        {isVisible('summary') && summary && (
          <div className="mb-6 relative pl-4">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: color }} />
            <p className="text-[11px] text-gray-600 leading-relaxed italic">{summary}</p>
          </div>
        )}

        {/* Two-column grid for content */}
        <div className="flex gap-8">
          {/* Left column — main */}
          <div className="flex-1">
            {isVisible('experiences') && experiences.length > 0 && (
              <CreSection title="Expérience" color={color}>
                {experiences.map(exp => (
                  <div key={exp.id} className="mb-5 relative">
                    <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full border-2" style={{ borderColor: color, background: 'white' }} />
                    <p className="font-bold text-[11px] text-gray-900">{exp.position}</p>
                    <div className="flex justify-between mt-0.5">
                      <p className="text-[10px]" style={{ color }}>{exp.company}{exp.location ? ` — ${exp.location}` : ''}</p>
                      <p className="text-[9px] text-gray-400">
                        {formatCVDate(exp.startDate)} – {exp.current ? 'Présent' : formatCVDate(exp.endDate)}
                      </p>
                    </div>
                    {exp.description && <p className="text-[9.5px] text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{exp.description}</p>}
                  </div>
                ))}
              </CreSection>
            )}

            {isVisible('projects') && projects.length > 0 && (
              <CreSection title="Projets" color={color}>
                {projects.map(proj => (
                  <div key={proj.id} className="mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[11px]">{proj.name}</p>
                      {proj.url && <span className="text-[9px]" style={{ color }}>{proj.url}</span>}
                    </div>
                    {proj.technologies && <p className="text-[9px] text-gray-400">{proj.technologies}</p>}
                    {proj.description && <p className="text-[9.5px] text-gray-600 mt-0.5">{proj.description}</p>}
                  </div>
                ))}
              </CreSection>
            )}
          </div>

          {/* Right column — sidebar info */}
          <div className="w-[200px] shrink-0">
            {isVisible('education') && education.length > 0 && (
              <CreSection title="Formation" color={color}>
                {education.map(edu => (
                  <div key={edu.id} className="mb-3">
                    <p className="font-semibold text-[10px]">{edu.degree}</p>
                    {edu.field && <p className="text-[9px] text-gray-500">{edu.field}</p>}
                    <p className="text-[9.5px] font-medium mt-0.5" style={{ color }}>{edu.institution}</p>
                    <p className="text-[9px] text-gray-400">
                      {formatCVDate(edu.startDate)} – {edu.current ? 'Présent' : formatCVDate(edu.endDate)}
                    </p>
                  </div>
                ))}
              </CreSection>
            )}

            {isVisible('skills') && skills.length > 0 && (
              <CreSection title="Compétences" color={color}>
                <div className="flex flex-wrap gap-1">
                  {skills.map(sk => (
                    <span key={sk.id} className="text-[9px] px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{sk.name}</span>
                  ))}
                </div>
              </CreSection>
            )}

            {isVisible('languages') && languages.length > 0 && (
              <CreSection title="Langues" color={color}>
                {languages.map(lang => (
                  <div key={lang.id} className="mb-1 text-[10px]">
                    <span className="font-medium">{lang.name}</span>
                    {lang.level && <span className="text-gray-500 text-[9px] ml-1">— {lang.level}</span>}
                  </div>
                ))}
              </CreSection>
            )}

            {isVisible('certifications') && certifications.length > 0 && (
              <CreSection title="Certifications" color={color}>
                {certifications.map(cert => (
                  <div key={cert.id} className="mb-2 text-[9.5px]">
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-gray-500">{cert.issuer}{cert.date ? ` · ${formatCVDate(cert.date)}` : ''}</p>
                  </div>
                ))}
              </CreSection>
            )}

            {isVisible('interests') && interests.length > 0 && (
              <CreSection title="Intérêts" color={color}>
                <p className="text-[9.5px] text-gray-600 leading-relaxed">
                  {interests.map(i => i.name).join(' · ')}
                </p>
              </CreSection>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-3 h-3 rounded" style={{ background: color }} />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-700">{title}</h2>
      </div>
      <div className="pl-5 border-l border-gray-100">{children}</div>
    </div>
  )
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + amount)
  const g = Math.min(255, ((n >> 8) & 0xff) + amount)
  const b = Math.min(255, (n & 0xff) + amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
