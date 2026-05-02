import type { ResolvedResumeData as ResumeData } from '@/types/cvBuilder'
import { formatCVDate, skillLevelDots } from '@/utils/cvHelpers'

interface Props { data: ResumeData }

export function TemplateModern({ data }: Props) {
  const { personal, summary, experiences, education, skills, languages, projects, certifications, interests, sections, customization } = data
  const color = customization.primaryColor
  const visibleSections = sections.filter(s => s.visible)

  const isVisible = (id: string) => visibleSections.some(s => s.id === id)

  return (
    <div className="bg-white text-gray-900 min-h-[297mm] w-[794px] flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left sidebar */}
      <div className="w-[240px] shrink-0 min-h-[297mm] text-white px-6 py-8 flex flex-col gap-6" style={{ background: `linear-gradient(160deg, ${color} 0%, ${darken(color, 20)} 100%)` }}>
        {/* Photo placeholder */}
        {personal.photoUrl ? (
          <img src={personal.photoUrl} alt="photo" className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-white/30" />
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold bg-white/20">
            {personal.firstName?.[0]}{personal.lastName?.[0]}
          </div>
        )}

        {/* Contact */}
        {(personal.email || personal.phone || personal.location) && (
          <SideSection title="CONTACT" light>
            <div className="flex flex-col gap-1 text-[10px] text-white/80">
              {personal.email && <span>{personal.email}</span>}
              {personal.phone && <span>{personal.phone}</span>}
              {personal.location && <span>{personal.location}</span>}
              {personal.linkedin && <span>{personal.linkedin}</span>}
              {personal.website && <span>{personal.website}</span>}
              {personal.github && <span>{personal.github}</span>}
            </div>
          </SideSection>
        )}

        {/* Skills */}
        {isVisible('skills') && skills.length > 0 && (
          <SideSection title="COMPÉTENCES" light>
            <div className="flex flex-col gap-1.5">
              {skills.map(sk => (
                <div key={sk.id}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] text-white/90">{sk.name}</span>
                    <span className="text-[9px] text-white/50">{skillLevelDots(sk.level)}</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white/70" style={{ width: skillLevelPct(sk.level) }} />
                  </div>
                </div>
              ))}
            </div>
          </SideSection>
        )}

        {/* Languages */}
        {isVisible('languages') && languages.length > 0 && (
          <SideSection title="LANGUES" light>
            {languages.map(lang => (
              <div key={lang.id} className="text-[10px] mb-1">
                <span className="font-medium text-white">{lang.name}</span>
                {lang.level && <span className="text-white/60 block text-[9px]">{lang.level}</span>}
              </div>
            ))}
          </SideSection>
        )}

        {/* Interests */}
        {isVisible('interests') && interests.length > 0 && (
          <SideSection title="INTÉRÊTS" light>
            <div className="flex flex-wrap gap-1">
              {interests.map(i => (
                <span key={i.id} className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full text-white/80">{i.name}</span>
              ))}
            </div>
          </SideSection>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 px-7 py-8">
        {/* Name & title */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">
            {personal.firstName} <span style={{ color }}>{personal.lastName}</span>
          </h1>
          {personal.title && <p className="text-[13px] text-gray-500 mt-1 font-medium">{personal.title}</p>}
        </div>

        {/* Summary */}
        {isVisible('summary') && summary && (
          <div className="mb-5 p-3 rounded-lg text-[10px] text-gray-600 leading-relaxed" style={{ background: `${color}10`, borderLeft: `3px solid ${color}` }}>
            {summary}
          </div>
        )}

        {/* Experiences */}
        {isVisible('experiences') && experiences.length > 0 && (
          <MainSection title="Expériences" color={color}>
            {experiences.map(exp => (
              <div key={exp.id} className="mb-4 pl-3 border-l-2" style={{ borderColor: `${color}40` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[11px] text-gray-900">{exp.position}</p>
                    <p className="text-[10px] text-gray-500">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 shrink-0 ml-3 font-medium">
                    {formatCVDate(exp.startDate)} – {exp.current ? 'Présent' : formatCVDate(exp.endDate)}
                  </span>
                </div>
                {exp.description && <p className="text-[9.5px] text-gray-600 mt-1.5 leading-relaxed whitespace-pre-line">{exp.description}</p>}
              </div>
            ))}
          </MainSection>
        )}

        {/* Education */}
        {isVisible('education') && education.length > 0 && (
          <MainSection title="Formations" color={color}>
            {education.map(edu => (
              <div key={edu.id} className="mb-3 pl-3 border-l-2" style={{ borderColor: `${color}40` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[11px]">{edu.degree}{edu.field ? ` · ${edu.field}` : ''}</p>
                    <p className="text-[10px] text-gray-500">{edu.institution}{edu.location ? `, ${edu.location}` : ''}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 shrink-0 ml-3">
                    {formatCVDate(edu.startDate)} – {edu.current ? 'Présent' : formatCVDate(edu.endDate)}
                  </span>
                </div>
                {edu.description && <p className="text-[9.5px] text-gray-500 mt-0.5">{edu.description}</p>}
              </div>
            ))}
          </MainSection>
        )}

        {/* Projects */}
        {isVisible('projects') && projects.length > 0 && (
          <MainSection title="Projets" color={color}>
            {projects.map(proj => (
              <div key={proj.id} className="mb-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[11px]">{proj.name}</p>
                  {proj.url && <span className="text-[9px]" style={{ color }}>{proj.url}</span>}
                </div>
                {proj.technologies && (
                  <p className="text-[9px] text-gray-400 mt-0.5">{proj.technologies}</p>
                )}
                {proj.description && <p className="text-[9.5px] text-gray-600 mt-0.5">{proj.description}</p>}
              </div>
            ))}
          </MainSection>
        )}

        {/* Certifications */}
        {isVisible('certifications') && certifications.length > 0 && (
          <MainSection title="Certifications" color={color}>
            {certifications.map(cert => (
              <div key={cert.id} className="mb-2 flex justify-between items-center">
                <div>
                  <p className="font-medium text-[10px]">{cert.name}</p>
                  <p className="text-[9px] text-gray-500">{cert.issuer}</p>
                </div>
                {cert.date && <p className="text-[9px] text-gray-400">{formatCVDate(cert.date)}</p>}
              </div>
            ))}
          </MainSection>
        )}
      </div>
    </div>
  )
}

function SideSection({ title, children, light }: { title: string; children: React.ReactNode; light?: boolean }) {
  return (
    <div>
      <p className={`text-[9px] font-bold tracking-[0.15em] mb-2 ${light ? 'text-white/50' : 'text-gray-400'}`}>{title}</p>
      {children}
    </div>
  )
}

function MainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[12px] font-bold" style={{ color }}>{title}</h2>
        <div className="flex-1 h-[1px]" style={{ background: `${color}30` }} />
      </div>
      {children}
    </div>
  )
}

function skillLevelPct(level: string): string {
  const map: Record<string, string> = { beginner: '25%', intermediate: '50%', advanced: '75%', expert: '100%' }
  return map[level] ?? '50%'
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
