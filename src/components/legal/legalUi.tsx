import type { ReactNode } from 'react'
import { LEGAL } from '@/config/legal'
import { mailtoHref } from '@/lib/mailto'

// Briques des textes légaux : sommaire numéroté, sections, listes et liens.

export interface LegalSection {
  id: string
  title: string
  content: ReactNode
}

const LINK_CLASS = 'font-medium text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-primary)]'

export function LegalSections({ sections }: { sections: readonly LegalSection[] }) {
  return (
    <>
      <nav aria-label="Sommaire" className="mb-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">Sommaire</p>
        <ol className="grid gap-1.5 text-[14px] sm:grid-cols-2 sm:gap-x-6">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-[var(--color-accent)] no-underline hover:underline">
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section key={section.id} id={section.id} className="mb-10 scroll-mt-6">
          <h2 className="mb-3 text-[20px] font-bold tracking-[-0.01em] text-[var(--color-primary)]">
            {index + 1}. {section.title}
          </h2>
          <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-secondary)]">{section.content}</div>
        </section>
      ))}
    </>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-[var(--color-subtle)]">{children}</ul>
}

export function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className={LINK_CLASS}>{children}</a>
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{children}</a>
}

export function ContactEmail({ subject }: { subject?: string }) {
  return <a href={mailtoHref(LEGAL.contactEmail, subject)} className={LINK_CLASS}>{LEGAL.contactEmail}</a>
}

interface DataItemProps {
  title: string
  children: ReactNode
  why: ReactNode
  basis: string
  duration: ReactNode
}

export function DataItem({ title, children, why, basis, duration }: DataItemProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] px-4 py-3.5">
      <h3 className="mb-1.5 text-[15px] font-bold text-[var(--color-ink)]">{title}</h3>
      <p>{children}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-[14px] sm:grid-cols-[7.5rem_1fr]">
        <dt className="font-semibold text-[var(--color-ink)]">Pourquoi</dt>
        <dd>{why}</dd>
        <dt className="font-semibold text-[var(--color-ink)]">Base légale</dt>
        <dd>{basis}</dd>
        <dt className="font-semibold text-[var(--color-ink)]">Durée</dt>
        <dd>{duration}</dd>
      </dl>
    </div>
  )
}
