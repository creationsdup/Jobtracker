import type { ResolvedResumeData, CVSkill, CVExperience, CVEducation, CVProject, CVCertification, CVLanguage, CVInterest } from '@/types/cvBuilder'
import type { TemplateConfig, FontVariant, SectionStyle, HeaderStyle, ColorMode } from './templateRegistry'
import { formatCVDate } from '@/utils/cvHelpers'

interface Props {
  data: ResolvedResumeData
  config: TemplateConfig
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + amount)
  const g = Math.min(255, ((n >> 8) & 0xff) + amount)
  const b = Math.min(255, (n & 0xff) + amount)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function toRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

function skillPct(level: string): string {
  const map: Record<string, string> = {
    beginner: '25%', intermediate: '50%', advanced: '75%', expert: '100%',
  }
  return map[level] ?? '50%'
}

const FONTS: Record<FontVariant, string> = {
  sans: 'Inter, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
}

// ─── Section title renderers ──────────────────────────────────────────────────

function SectionTitle({
  title, color, style, textColor,
}: {
  title: string
  color: string
  style: SectionStyle
  textColor?: string
}) {
  const ink = textColor ?? '#111827'

  if (style === 'underline') {
    return (
      <div style={{ borderBottom: `1.5px solid ${toRgba(color, 0.25)}`, marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color, marginBottom: 4, textTransform: 'uppercase' }}>
          {title}
        </p>
      </div>
    )
  }
  if (style === 'border-left') {
    return (
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
          {title}
        </p>
      </div>
    )
  }
  if (style === 'dot') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: ink, textTransform: 'uppercase' }}>
          {title}
        </p>
      </div>
    )
  }
  if (style === 'minimal') {
    return (
      <p style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.16em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </p>
    )
  }
  if (style === 'box-bg') {
    return (
      <div style={{ background: toRgba(color, 0.1), borderRadius: 4, padding: '3px 8px', marginBottom: 8, display: 'inline-block' }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color, textTransform: 'uppercase' }}>
          {title}
        </p>
      </div>
    )
  }
  if (style === 'caps-line') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: ink, textTransform: 'uppercase', flexShrink: 0 }}>
          {title}
        </p>
        <div style={{ flex: 1, height: 1, background: toRgba(color, 0.3) }} />
      </div>
    )
  }
  return null
}

// ─── Sub-components: content blocks ──────────────────────────────────────────

interface SectionWrapProps {
  title: string
  color: string
  sectionStyle: SectionStyle
  textColor?: string
  children: React.ReactNode
  mb?: number
}

function SectionWrap({ title, color, sectionStyle, textColor, children, mb = 20 }: SectionWrapProps) {
  return (
    <div style={{ marginBottom: mb }}>
      <SectionTitle title={title} color={color} style={sectionStyle} textColor={textColor} />
      {children}
    </div>
  )
}

function ExperienceBlock({ exp, color: _color, ink }: { exp: CVExperience; color: string; ink: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 11, color: ink }}>{exp.position}</p>
          <p style={{ fontSize: 10, color: '#6b7280' }}>
            {exp.company}{exp.location ? ` — ${exp.location}` : ''}
          </p>
        </div>
        <p style={{ fontSize: 9, color: '#9ca3af', flexShrink: 0, marginLeft: 12 }}>
          {formatCVDate(exp.startDate)} – {exp.current ? 'Présent' : formatCVDate(exp.endDate)}
        </p>
      </div>
      {exp.description && (
        <p style={{ fontSize: 9.5, color: '#6b7280', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {exp.description}
        </p>
      )}
    </div>
  )
}

function EducationBlock({ edu, ink }: { edu: CVEducation; ink: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 10.5, color: ink }}>
            {edu.degree}{edu.field ? ` — ${edu.field}` : ''}
          </p>
          <p style={{ fontSize: 10, color: '#6b7280' }}>
            {edu.institution}{edu.location ? `, ${edu.location}` : ''}
          </p>
        </div>
        <p style={{ fontSize: 9, color: '#9ca3af', flexShrink: 0, marginLeft: 12 }}>
          {formatCVDate(edu.startDate)} – {edu.current ? 'Présent' : formatCVDate(edu.endDate)}
        </p>
      </div>
      {edu.description && (
        <p style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 2 }}>{edu.description}</p>
      )}
    </div>
  )
}

function ProjectBlock({ proj, color, ink }: { proj: CVProject; color: string; ink: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 10.5, color: ink }}>{proj.name}</p>
        {proj.url && <span style={{ fontSize: 9, color }}>{proj.url}</span>}
      </div>
      {proj.technologies && (
        <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{proj.technologies}</p>
      )}
      {proj.description && (
        <p style={{ fontSize: 9.5, color: '#6b7280', marginTop: 2 }}>{proj.description}</p>
      )}
    </div>
  )
}

function CertBlock({ cert }: { cert: CVCertification }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <div>
        <p style={{ fontWeight: 600, fontSize: 10 }}>{cert.name}</p>
        <p style={{ fontSize: 9, color: '#9ca3af' }}>{cert.issuer}</p>
      </div>
      {cert.date && <p style={{ fontSize: 9, color: '#9ca3af' }}>{formatCVDate(cert.date)}</p>}
    </div>
  )
}

function SkillsInline({ skills, color, onDark }: { skills: CVSkill[]; color: string; onDark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {skills.map(sk => (
        <span
          key={sk.id}
          style={{
            fontSize: 9,
            padding: '2px 7px',
            borderRadius: 3,
            background: onDark ? 'rgba(255,255,255,0.15)' : toRgba(color, 0.1),
            color: onDark ? 'rgba(255,255,255,0.85)' : color,
            fontWeight: 500,
          }}
        >
          {sk.name}
        </span>
      ))}
    </div>
  )
}

function SkillBars({ skills, onDark }: { skills: CVSkill[]; onDark?: boolean }) {
  const barBg = onDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'
  const barFill = onDark ? 'rgba(255,255,255,0.7)' : '#374151'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {skills.map(sk => (
        <div key={sk.id}>
          <p style={{ fontSize: 10, color: onDark ? 'rgba(255,255,255,0.85)' : '#374151', marginBottom: 2 }}>{sk.name}</p>
          <div style={{ height: 3, borderRadius: 2, background: barBg, overflow: 'hidden' }}>
            <div style={{ width: skillPct(sk.level), height: '100%', borderRadius: 2, background: barFill }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function LangList({ languages, onDark }: { languages: CVLanguage[]; onDark?: boolean }) {
  const textColor = onDark ? 'rgba(255,255,255,0.85)' : '#374151'
  const mutedColor = onDark ? 'rgba(255,255,255,0.5)' : '#9ca3af'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {languages.map(lang => (
        <div key={lang.id} style={{ fontSize: 10 }}>
          <span style={{ fontWeight: 600, color: textColor }}>{lang.name}</span>
          {lang.level && <span style={{ color: mutedColor, fontSize: 9, marginLeft: 6 }}>{lang.level}</span>}
        </div>
      ))}
    </div>
  )
}

function InterestList({ interests, onDark }: { interests: CVInterest[]; onDark?: boolean }) {
  return (
    <p style={{ fontSize: 9.5, color: onDark ? 'rgba(255,255,255,0.65)' : '#6b7280', lineHeight: 1.6 }}>
      {interests.map(i => i.name).join(' · ')}
    </p>
  )
}

// ─── Header renderers ─────────────────────────────────────────────────────────

interface HeaderCtx {
  personal: ResolvedResumeData['personal']
  color: string
  ink: string
  style: HeaderStyle
  colorMode: ColorMode
  onDark: boolean
}

function renderHeader({ personal, color, ink, style, colorMode, onDark }: HeaderCtx) {
  const contactItems = [personal.email, personal.phone, personal.location, personal.linkedin, personal.website, personal.github].filter(Boolean)
  const nameColor = onDark ? '#ffffff' : ink
  const titleColor = onDark ? 'rgba(255,255,255,0.7)' : (colorMode === 'minimal' ? '#9ca3af' : color)
  const contactColor = onDark ? 'rgba(255,255,255,0.55)' : '#9ca3af'

  if (style === 'simple') {
    return (
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${toRgba(color, 0.18)}` }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: nameColor, letterSpacing: '-0.5px', marginBottom: 2 }}>
          {personal.firstName} {personal.lastName}
        </h1>
        {personal.title && <p style={{ fontSize: 13, color: titleColor, fontWeight: 500, marginBottom: 6 }}>{personal.title}</p>}
        <p style={{ fontSize: 9.5, color: contactColor, letterSpacing: '0.04em' }}>
          {contactItems.join('   ·   ')}
        </p>
      </div>
    )
  }

  if (style === 'centered') {
    return (
      <div style={{ marginBottom: 20, textAlign: 'center', paddingBottom: 16, borderBottom: `1px solid ${toRgba(color, 0.18)}` }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: nameColor, letterSpacing: '-0.5px', marginBottom: 2 }}>
          {personal.firstName} {personal.lastName}
        </h1>
        {personal.title && <p style={{ fontSize: 12, color: titleColor, fontWeight: 500, marginBottom: 6 }}>{personal.title}</p>}
        <p style={{ fontSize: 9, color: contactColor, letterSpacing: '0.06em' }}>
          {contactItems.join('   ·   ')}
        </p>
      </div>
    )
  }

  if (style === 'bold-left') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${toRgba(color, 0.18)}` }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: nameColor, letterSpacing: '-1px', lineHeight: 1 }}>
            {personal.firstName}
          </h1>
          <h1 style={{ fontSize: 30, fontWeight: 300, color: colorMode === 'minimal' ? nameColor : color, letterSpacing: '-1px', lineHeight: 1.1 }}>
            {personal.lastName}
          </h1>
          {personal.title && <p style={{ fontSize: 12, color: titleColor, marginTop: 4 }}>{personal.title}</p>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 9.5, color: contactColor, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {contactItems.map((c, i) => <span key={i}>{c}</span>)}
        </div>
      </div>
    )
  }

  if (style === 'band') {
    return (
      <div style={{ background: color, padding: '24px 40px', marginBottom: 0, color: 'white' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: '-0.5px', marginBottom: 2 }}>
          {personal.firstName} {personal.lastName}
        </h1>
        {personal.title && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>{personal.title}</p>}
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
          {contactItems.join('   ·   ')}
        </p>
      </div>
    )
  }

  if (style === 'gradient-band') {
    return (
      <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${darken(color, 30)} 100%)`, padding: '26px 40px', marginBottom: 0, color: 'white' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: '-0.5px', marginBottom: 2 }}>
          {personal.firstName} {personal.lastName}
        </h1>
        {personal.title && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>{personal.title}</p>}
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
          {contactItems.join('   ·   ')}
        </p>
      </div>
    )
  }

  if (style === 'split-contact') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${color}` }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: nameColor, letterSpacing: '-0.5px', marginBottom: 2 }}>
            {personal.firstName} {personal.lastName}
          </h1>
          {personal.title && <p style={{ fontSize: 12, color: titleColor, fontWeight: 500 }}>{personal.title}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', textAlign: 'right', fontSize: 9.5, color: contactColor }}>
          {contactItems.map((c, i) => <span key={i}>{c}</span>)}
        </div>
      </div>
    )
  }

  return null
}

// ─── Sidebar renderer ─────────────────────────────────────────────────────────

interface SidebarProps {
  data: ResolvedResumeData
  config: TemplateConfig
  color: string
  width: number
}

function SidebarContent({ data, config, color, width }: SidebarProps) {
  const { personal, skills, languages, certifications, interests, sections } = data
  const isVisible = (id: string) => sections.find(s => s.id === id)?.visible !== false
  const onDark = config.colorMode === 'sidebar'
  const bg = onDark ? color : '#f9fafb'
  const ink = onDark ? '#ffffff' : '#111827'
  const muted = onDark ? 'rgba(255,255,255,0.5)' : '#9ca3af'

  const sideSecStyle = config.sectionStyle
  const sideColor = onDark ? 'rgba(255,255,255,0.85)' : color

  function SideSectionTitle({ title }: { title: string }) {
    return (
      <p style={{
        fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: onDark ? 'rgba(255,255,255,0.45)' : '#9ca3af',
        marginBottom: 8,
        ...(sideSecStyle === 'border-left' ? { borderLeft: `2px solid ${sideColor}`, paddingLeft: 6 } : {}),
      }}>
        {title}
      </p>
    )
  }

  const showIn = (id: string) => config.sidebarSections.includes(id) && isVisible(id)

  return (
    <div style={{ width, minHeight: '100%', background: bg, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Photo */}
      {personal.photoUrl ? (
        <img src={personal.photoUrl} alt="photo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: onDark ? '2px solid rgba(255,255,255,0.3)' : 'none' }} />
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: onDark ? 'rgba(255,255,255,0.2)' : toRgba(color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 22, fontWeight: 700, color: onDark ? '#fff' : color }}>
          {personal.firstName?.[0]}{personal.lastName?.[0]}
        </div>
      )}

      {/* Contact */}
      <div>
        <SideSectionTitle title="Contact" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9.5, color: onDark ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
          {personal.email && <span>{personal.email}</span>}
          {personal.phone && <span>{personal.phone}</span>}
          {personal.location && <span>{personal.location}</span>}
          {personal.linkedin && <span>{personal.linkedin}</span>}
          {personal.website && <span>{personal.website}</span>}
          {personal.github && <span>{personal.github}</span>}
        </div>
      </div>

      {showIn('skills') && skills.length > 0 && (
        <div>
          <SideSectionTitle title="Compétences" />
          <SkillBars skills={skills} onDark={onDark} />
        </div>
      )}

      {showIn('languages') && languages.length > 0 && (
        <div>
          <SideSectionTitle title="Langues" />
          <LangList languages={languages} onDark={onDark} />
        </div>
      )}

      {showIn('certifications') && certifications.length > 0 && (
        <div>
          <SideSectionTitle title="Certifications" />
          {certifications.map(cert => (
            <div key={cert.id} style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 9.5, fontWeight: 600, color: onDark ? '#fff' : ink }}>{cert.name}</p>
              <p style={{ fontSize: 9, color: muted }}>{cert.issuer}</p>
            </div>
          ))}
        </div>
      )}

      {showIn('interests') && interests.length > 0 && (
        <div>
          <SideSectionTitle title="Intérêts" />
          <InterestList interests={interests} onDark={onDark} />
        </div>
      )}
    </div>
  )
}

// ─── Main layout renderers ────────────────────────────────────────────────────

function renderMainSections(
  data: ResolvedResumeData,
  config: TemplateConfig,
  color: string,
  ink: string,
  excludeFromMain: string[] = [],
) {
  const { experiences, education, skills, languages, projects, certifications, interests, sections, summary } = data
  const isVisible = (id: string) => sections.find(s => s.id === id)?.visible !== false
  const excluded = new Set(excludeFromMain)
  const sectionStyle = config.sectionStyle
  const onDark = config.darkBg ?? false

  const sectionColor = onDark ? lighten(color, 60) : (config.colorMode === 'minimal' ? '#374151' : color)
  const textInk = onDark ? '#e2e8f0' : ink
  const mutedText = onDark ? '#94a3b8' : '#6b7280'

  return (
    <>
      {isVisible('summary') && summary && (
        <SectionWrap title="Profil" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          <p style={{ fontSize: 10, color: mutedText, lineHeight: 1.7 }}>{summary}</p>
        </SectionWrap>
      )}

      {!excluded.has('experiences') && isVisible('experiences') && experiences.length > 0 && (
        <SectionWrap title="Expériences" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          {experiences.map(exp => (
            <ExperienceBlock key={exp.id} exp={exp} color={sectionColor} ink={textInk} />
          ))}
        </SectionWrap>
      )}

      {!excluded.has('education') && isVisible('education') && education.length > 0 && (
        <SectionWrap title="Formation" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          {education.map(edu => (
            <EducationBlock key={edu.id} edu={edu} ink={textInk} />
          ))}
        </SectionWrap>
      )}

      {!excluded.has('projects') && isVisible('projects') && projects.length > 0 && (
        <SectionWrap title="Projets" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          {projects.map(proj => (
            <ProjectBlock key={proj.id} proj={proj} color={sectionColor} ink={textInk} />
          ))}
        </SectionWrap>
      )}

      {!excluded.has('skills') && isVisible('skills') && skills.length > 0 && (
        <SectionWrap title="Compétences" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          <SkillsInline skills={skills} color={sectionColor} onDark={onDark} />
        </SectionWrap>
      )}

      {!excluded.has('languages') && isVisible('languages') && languages.length > 0 && (
        <SectionWrap title="Langues" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          <LangList languages={languages} onDark={onDark} />
        </SectionWrap>
      )}

      {!excluded.has('certifications') && isVisible('certifications') && certifications.length > 0 && (
        <SectionWrap title="Certifications" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          {certifications.map(cert => <CertBlock key={cert.id} cert={cert} />)}
        </SectionWrap>
      )}

      {!excluded.has('interests') && isVisible('interests') && interests.length > 0 && (
        <SectionWrap title="Intérêts" color={sectionColor} sectionStyle={sectionStyle} textColor={textInk}>
          <InterestList interests={interests} onDark={onDark} />
        </SectionWrap>
      )}
    </>
  )
}

// ─── TemplateEngine ───────────────────────────────────────────────────────────

export function TemplateEngine({ data, config }: Props) {
  const { personal, customization } = data
  const color = customization.primaryColor
  const onDark = config.darkBg ?? false

  const bg = onDark ? '#1e293b' : '#ffffff'
  const ink = onDark ? '#f1f5f9' : '#111827'

  const fontFamily = FONTS[config.font]
  const SIDEBAR_WIDTH = 210
  const SIDEBAR_WIDTH_RIGHT = 200

  const headerCtx: HeaderCtx = {
    personal, color, ink, style: config.headerStyle,
    colorMode: config.colorMode, onDark,
  }

  // ── single layout ───────────────────────────────────────────────
  if (config.layout === 'single') {
    const hasBandHeader = config.headerStyle === 'band' || config.headerStyle === 'gradient-band'
    const innerPad = hasBandHeader ? '20px 40px 40px' : '40px'

    return (
      <div style={{ background: bg, minHeight: '297mm', width: 794, fontFamily, color: ink }}>
        {hasBandHeader && renderHeader(headerCtx)}
        <div style={{ padding: innerPad }}>
          {!hasBandHeader && renderHeader(headerCtx)}
          {renderMainSections(data, config, color, ink)}
        </div>
      </div>
    )
  }

  // ── sidebar-left layout ─────────────────────────────────────────
  if (config.layout === 'sidebar-left') {
    const hasBandHeader = config.headerStyle === 'band' || config.headerStyle === 'gradient-band'

    return (
      <div style={{ background: bg, minHeight: '297mm', width: 794, fontFamily, color: ink, display: 'flex', flexDirection: 'column' }}>
        {hasBandHeader && renderHeader(headerCtx)}
        <div style={{ display: 'flex', flex: 1 }}>
          <SidebarContent data={data} config={config} color={color} width={SIDEBAR_WIDTH} />
          <div style={{ flex: 1, padding: hasBandHeader ? '24px 32px' : '32px 32px' }}>
            {!hasBandHeader && renderHeader(headerCtx)}
            {renderMainSections(data, config, color, ink, config.sidebarSections)}
          </div>
        </div>
      </div>
    )
  }

  // ── sidebar-right layout ────────────────────────────────────────
  if (config.layout === 'sidebar-right') {
    const hasBandHeader = config.headerStyle === 'band' || config.headerStyle === 'gradient-band'

    return (
      <div style={{ background: bg, minHeight: '297mm', width: 794, fontFamily, color: ink, display: 'flex', flexDirection: 'column' }}>
        {hasBandHeader && renderHeader(headerCtx)}
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ flex: 1, padding: hasBandHeader ? '24px 32px' : '32px 32px' }}>
            {!hasBandHeader && renderHeader(headerCtx)}
            {renderMainSections(data, config, color, ink, config.sidebarSections)}
          </div>
          <SidebarContent data={data} config={config} color={color} width={SIDEBAR_WIDTH_RIGHT} />
        </div>
      </div>
    )
  }

  // ── two-col layout ──────────────────────────────────────────────
  if (config.layout === 'two-col') {
    const { experiences, education, skills, languages, projects, certifications, interests, sections, summary } = data
    const isVisible = (id: string) => sections.find(s => s.id === id)?.visible !== false
    const sectionStyle = config.sectionStyle
    const sectionColor = config.colorMode === 'minimal' ? '#374151' : color

    return (
      <div style={{ background: bg, minHeight: '297mm', width: 794, fontFamily, color: ink, padding: '40px' }}>
        {renderHeader(headerCtx)}

        {isVisible('summary') && data.summary && (
          <SectionWrap title="Profil" color={sectionColor} sectionStyle={sectionStyle} textColor={ink} mb={16}>
            <p style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.7 }}>{summary}</p>
          </SectionWrap>
        )}

        <div style={{ display: 'flex', gap: 32 }}>
          {/* Left column: experiences + projects */}
          <div style={{ flex: 1.4 }}>
            {isVisible('experiences') && experiences.length > 0 && (
              <SectionWrap title="Expériences" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                {experiences.map(exp => (
                  <ExperienceBlock key={exp.id} exp={exp} color={sectionColor} ink={ink} />
                ))}
              </SectionWrap>
            )}
            {isVisible('projects') && projects.length > 0 && (
              <SectionWrap title="Projets" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                {projects.map(proj => (
                  <ProjectBlock key={proj.id} proj={proj} color={sectionColor} ink={ink} />
                ))}
              </SectionWrap>
            )}
          </div>

          {/* Right column: education, skills, languages, certifications, interests */}
          <div style={{ flex: 1 }}>
            {isVisible('education') && education.length > 0 && (
              <SectionWrap title="Formation" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                {education.map(edu => (
                  <EducationBlock key={edu.id} edu={edu} ink={ink} />
                ))}
              </SectionWrap>
            )}
            {isVisible('skills') && skills.length > 0 && (
              <SectionWrap title="Compétences" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                <SkillsInline skills={skills} color={sectionColor} />
              </SectionWrap>
            )}
            {isVisible('languages') && languages.length > 0 && (
              <SectionWrap title="Langues" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                <LangList languages={languages} />
              </SectionWrap>
            )}
            {isVisible('certifications') && certifications.length > 0 && (
              <SectionWrap title="Certifications" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                {certifications.map(cert => <CertBlock key={cert.id} cert={cert} />)}
              </SectionWrap>
            )}
            {isVisible('interests') && interests.length > 0 && (
              <SectionWrap title="Intérêts" color={sectionColor} sectionStyle={sectionStyle} textColor={ink}>
                <InterestList interests={interests} />
              </SectionWrap>
            )}
          </div>
        </div>
      </div>
    )
  }

  // fallback
  return null
}
