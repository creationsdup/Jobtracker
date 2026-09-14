import type { ReactNode } from 'react'
import { Bug, KeyRound, Mail, ShieldAlert, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { PageLink } from '@/components/legal/legalUi'
import { LEGAL } from '@/config/legal'
import { mailtoHref } from '@/lib/mailto'

interface Topic {
  icon: LucideIcon
  title: string
  body: ReactNode
  subject?: string
}

const TOPICS: readonly Topic[] = [
  {
    icon: KeyRound,
    title: "J'ai perdu mon code",
    body: (
      <>
        Si ton tableau est sécurisé par email, choisis «&nbsp;Recevoir un lien de connexion&nbsp;» sur l'écran d'accès. Sinon, il
        ne peut malheureusement plus être ouvert&nbsp;: le code n'est conservé nulle part en clair.
      </>
    ),
  },
  {
    icon: ShieldAlert,
    title: 'Mon code a peut-être fuité',
    body: <>Ouvre «&nbsp;Mon tableau&nbsp;» et génère un nouveau code&nbsp;: l'ancien cesse aussitôt de fonctionner.</>,
  },
  {
    icon: Trash2,
    title: 'Supprimer mon tableau',
    body: <>Dans «&nbsp;Mon tableau&nbsp;», choisis «&nbsp;Supprimer mon tableau&nbsp;»&nbsp;: tout est effacé immédiatement, sans avoir besoin d'écrire.</>,
  },
  {
    icon: ShieldCheck,
    title: 'Mes données personnelles',
    body: (
      <>
        Pour exercer tes droits (voir la <PageLink href="/confidentialite">politique de confidentialité</PageLink>),
        écris par email&nbsp;: réponse sous un mois.
      </>
    ),
    subject: 'Données personnelles',
  },
  {
    icon: Bug,
    title: 'Un bug, une idée',
    body: <>Décris ce que tu faisais, sur quel appareil et avec quel navigateur. Une capture d'écran aide beaucoup.</>,
    subject: 'Bug ou suggestion',
  },
]

export function ContactPage() {
  return (
    <LegalLayout
      page="contact"
      eyebrow="Une question ?"
      title="Contact"
      lead={`JobTracker est édité par ${LEGAL.editorName}. Pour toute question, écris à l'adresse ci-dessous.`}
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">Email</p>
          <a
            href={mailtoHref(LEGAL.contactEmail)}
            className="mt-1 block break-all text-[20px] font-bold text-[var(--color-primary)] no-underline hover:underline"
          >
            {LEGAL.contactEmail}
          </a>
        </div>
        <a
          href={mailtoHref(LEGAL.contactEmail, 'JobTracker')}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)]"
        >
          <Mail size={17} />
          Écrire un email
        </a>
      </div>

      <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[14px] leading-snug text-[#92400E]">
        <strong>Ne communique jamais ton code d'accès</strong>, même par email&nbsp;: il ne te sera jamais demandé.
      </p>

      <h2 className="mb-4 mt-12 text-[20px] font-bold tracking-[-0.01em] text-[var(--color-primary)]">Avant d'écrire</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map(({ icon: Icon, title, body, subject }) => (
          <li key={title} className="rounded-xl border border-[var(--color-border)] px-4 py-4">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-light)] text-[var(--color-accent)]">
                <Icon size={17} />
              </span>
              <h3 className="text-[15px] font-bold text-[var(--color-ink)]">{title}</h3>
            </div>
            <p className="text-[14px] leading-relaxed text-[var(--color-ink-secondary)]">{body}</p>
            {subject && (
              <a
                href={mailtoHref(LEGAL.contactEmail, subject)}
                className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-accent)] no-underline hover:underline"
              >
                <Mail size={15} />
                Écrire à ce sujet
              </a>
            )}
          </li>
        ))}
      </ul>
    </LegalLayout>
  )
}
