import { Briefcase, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompanyLogo } from '../CompanyLogo'

interface FormHeaderProps {
  eyebrow: string
  company: string
  position: string
  companyWebsite: string
  onClose: () => void
}

// Même en-tête que la fiche d'une candidature (logo, poste, entreprise), rempli en direct pendant la saisie.
export function FormHeader({ eyebrow, company, position, companyWebsite, onClose }: FormHeaderProps) {
  const companyName = company.trim()
  const positionName = position.trim()

  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-5 border-b border-[var(--color-border)] flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {companyName ? (
          <CompanyLogo company={companyName} logoUrl={companyWebsite.trim() || null} size={44} />
        ) : (
          <span
            aria-hidden
            className="flex items-center justify-center w-11 h-11 rounded-[10px] flex-shrink-0 border border-dashed border-[var(--color-border-hover)] bg-[var(--color-bg)] text-[var(--color-subtle)]"
          >
            <Briefcase size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{eyebrow}</p>
          <h2 className={cn('text-lg font-bold truncate', !positionName && 'text-[var(--color-subtle)]')}>
            {positionName || 'Intitulé du poste'}
          </h2>
          <p className={cn('text-sm truncate', companyName ? 'text-[var(--color-muted)]' : 'text-[var(--color-subtle)]')}>
            {companyName || 'Entreprise'}
          </p>
        </div>
      </div>
      <button type="button" className="btn btn-ghost p-1 flex-shrink-0" onClick={onClose} aria-label="Fermer">
        <X size={18} />
      </button>
    </div>
  )
}
