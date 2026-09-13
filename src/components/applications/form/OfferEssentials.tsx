import type { RefObject } from 'react'
import { Link2, Sparkles } from 'lucide-react'
import type { ApplicationDraft } from '@/lib/applicationDraft'

interface OfferEssentialsProps {
  draft: ApplicationDraft
  onChange: (patch: Partial<ApplicationDraft>) => void
  linkInputRef: RefObject<HTMLInputElement>
  onImportClick?: () => void
  onCompanyBlur?: () => void
  logoLookupLoading?: boolean
}

const LABEL_CLASS = 'text-xs font-medium text-[var(--color-ink-secondary)]'

// L'essentiel d'une candidature : le lien de l'offre (facultatif), l'entreprise et le poste.
export function OfferEssentials({ draft, onChange, linkInputRef, onImportClick, onCompanyBlur, logoLookupLoading }: OfferEssentialsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link2
            size={16}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)] pointer-events-none"
          />
          <input
            ref={linkInputRef}
            type="url"
            inputMode="url"
            autoComplete="url"
            aria-label="Lien de l'offre"
            className="input pl-9"
            placeholder="Coller le lien de l'offre (facultatif)"
            value={draft.jobUrl}
            onChange={(e) => onChange({ jobUrl: e.target.value })}
          />
        </div>
        {onImportClick && (
          <button type="button" className="btn btn-secondary btn-sm flex-shrink-0" onClick={onImportClick}>
            <Sparkles size={13} aria-hidden />
            Import IA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="application-company" className={LABEL_CLASS}>Entreprise</label>
          <input
            id="application-company"
            autoComplete="organization"
            className="input"
            placeholder="Airbus"
            value={draft.company}
            onChange={(e) => onChange({ company: e.target.value })}
            onBlur={onCompanyBlur}
          />
          {logoLookupLoading && <span className="text-xs text-[var(--color-muted)]">Recherche du logo…</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="application-position" className={LABEL_CLASS}>Poste</label>
          <input
            id="application-position"
            autoComplete="organization-title"
            className="input"
            placeholder="Chef de projet innovation"
            value={draft.position}
            onChange={(e) => onChange({ position: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
