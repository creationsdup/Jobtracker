import { JobTrackerLogo } from '@/components/ui/JobTrackerLogo'

const LEGAL_LINKS = [
  { label: 'Confidentialité', href: '#' },
  { label: 'CGU',             href: '#' },
  { label: 'Contact',         href: '#' },
]

const dot = <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>·</span>

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: 'var(--color-nav-bg-end)' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <JobTrackerLogo size={16} onColor />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            JobTracker
          </span>
        </div>

        {/* Legal + copyright */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {LEGAL_LINKS.map(({ label, href }, i) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && dot}
              <a
                href={href}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
              >
                {label}
              </a>
            </span>
          ))}
          {dot}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>© {year}</span>
        </div>
      </div>
    </footer>
  )
}
