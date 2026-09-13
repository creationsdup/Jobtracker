import type { ReactNode } from 'react'
import { ExternalLink, Link2, SlidersHorizontal, StickyNote } from 'lucide-react'
import { isStatusSelected } from '@/lib/applicationDraft'
import { STATUS_CHOICES, contractLabel, detailsSummary, offerLinkLabel } from '@/lib/applicationSummary'
import type { Application, ApplicationStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { CompanyLogo } from '../CompanyLogo'
import { ChoiceChips } from '../form/ChoiceChips'
import { CollapsibleSection } from '../form/CollapsibleSection'

const LABEL_CLASS = 'text-xs font-medium text-[var(--color-ink-secondary)]'
// WHY: mêmes cases que les champs du formulaire, sur fond gris pour signaler la lecture seule.
const BOX_LAYOUT = 'flex items-center gap-2 min-h-[38px] px-3 py-2 rounded-[var(--radius-sm)] border text-sm'
const READ_BOX = `${BOX_LAYOUT} border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)]`
const LINK_BOX = `${BOX_LAYOUT} border-[var(--color-border-hover)] bg-[var(--color-surface)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`

function ReadValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className={LABEL_CLASS}>{label}</span>
      <div className={READ_BOX}>{children}</div>
    </div>
  )
}

function Empty({ children = 'Non renseigné' }: { children?: string }) {
  return <span className="text-[var(--color-subtle)]">{children}</span>
}

function withProtocol(url: string): string {
  return url.includes('://') ? url : `https://${url}`
}

interface DetailSummaryProps {
  application: Application
  logoUrl: string | null
  statusError: string | null
  onStatusSelect: (status: ApplicationStatus) => void
}

/** Haut de la fiche, disposé comme le formulaire : lien de l'offre, entreprise et poste, statut. */
export function DetailSummary({ application, logoUrl, statusError, onStatusSelect }: DetailSummaryProps) {
  return (
    <>
      {application.jobUrl ? (
        <a href={withProtocol(application.jobUrl)} target="_blank" rel="noreferrer" className={LINK_BOX}>
          <Link2 size={16} aria-hidden className="flex-shrink-0 text-[var(--color-subtle)]" />
          <span className="flex-1 min-w-0 truncate">{offerLinkLabel(application.jobUrl)}</span>
          <ExternalLink size={14} aria-hidden className="flex-shrink-0" />
          <span className="sr-only">(ouvre l'offre dans un nouvel onglet)</span>
        </a>
      ) : (
        <div className={READ_BOX}>
          <Link2 size={16} aria-hidden className="flex-shrink-0 text-[var(--color-subtle)]" />
          <Empty>Pas de lien vers l'offre</Empty>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ReadValue label="Entreprise">
          <CompanyLogo company={application.company} logoUrl={logoUrl} size={22} />
          <span className="truncate" title={application.company}>{application.company}</span>
        </ReadValue>
        <ReadValue label="Poste">
          <span className="truncate" title={application.position}>{application.position}</span>
        </ReadValue>
      </div>

      <div className="flex flex-col gap-3">
        <ChoiceChips
          label="Statut"
          options={STATUS_CHOICES}
          isSelected={(column) => isStatusSelected(application.status, column)}
          onSelect={onStatusSelect}
        />
        {application.status !== 'WISHLIST' && application.appliedAt && (
          <p className="text-xs text-[var(--color-muted)]">
            Date de candidature : <span className="font-medium text-[var(--color-ink-secondary)]">{formatDate(application.appliedAt)}</span>
          </p>
        )}
        {statusError && <p role="alert" className="text-xs text-[var(--color-danger)]">{statusError}</p>}
      </div>
    </>
  )
}

interface DetailInfoSectionsProps {
  application: Application
  logoUrl: string | null
  sections: { details: boolean; notes: boolean }
  onToggleSection: (section: 'details' | 'notes') => void
}

/** Blocs repliables « Plus de détails » et « Notes », comme dans le formulaire. */
export function DetailInfoSections({ application, logoUrl, sections, onToggleSection }: DetailInfoSectionsProps) {
  const summary = detailsSummary(application)
  const notes = application.notes?.trim() ?? ''

  return (
    <>
      <CollapsibleSection
        title="Plus de détails"
        hint={summary || "Lieu, contrat, site de l'entreprise"}
        icon={SlidersHorizontal}
        open={sections.details}
        onToggle={() => onToggleSection('details')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReadValue label="Lieu">{application.location?.trim() ? <span className="truncate">{application.location}</span> : <Empty />}</ReadValue>
          <ReadValue label="Site de l'entreprise">
            {logoUrl ? (
              <a href={withProtocol(logoUrl)} target="_blank" rel="noreferrer" className="truncate text-[var(--color-accent)] hover:underline">
                {offerLinkLabel(logoUrl)}
              </a>
            ) : <Empty />}
          </ReadValue>
        </div>
        <ReadValue label="Contrat">{contractLabel(application.contractType) ?? <Empty />}</ReadValue>
      </CollapsibleSection>

      <CollapsibleSection
        title="Notes"
        hint={notes ? notes.split('\n')[0] : 'Aucune note'}
        icon={StickyNote}
        open={sections.notes}
        onToggle={() => onToggleSection('notes')}
      >
        {notes
          ? <p className="text-sm text-[var(--color-ink-secondary)] whitespace-pre-wrap">{notes}</p>
          : <p className="text-sm text-[var(--color-subtle)]">Aucune note pour l'instant — ajoute-en avec « Modifier ».</p>}
      </CollapsibleSection>
    </>
  )
}
