import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Chrome } from 'lucide-react'
import { isBoardEmail } from '@/lib/accessCode'
import { savedAccessCode } from '@/lib/savedAccessCode'
import { cn } from '@/lib/utils'
import { useBoardAccess } from '@/hooks/useBoardAccess'
import { useBoardUser } from '@/hooks/useBoardUser'
import { track } from '@/lib/usageClient'
import { CodeRevealPanel } from '@/components/access/CodeRevealPanel'
import { DeleteBoardDialog } from '@/components/access/DeleteBoardDialog'
import { SavedCodePanel } from '@/components/access/SavedCodePanel'
import { ErrorText, Eyebrow, Field, PrimaryButton, SECONDARY_BUTTON_CLASS, SecondaryButton, Title } from '@/components/access/accessUi'

// Fiche non répertoriée du Chrome Web Store : elle n'est accessible que par ce lien.
const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/jobtracker-%E2%80%94-ajouter-une/bcjaopkifgjohhkpjllklapjmkbaoang'

type PillTone = 'warning' | 'info' | 'success'

const PILL_STYLES: Record<PillTone, string> = {
  warning: 'bg-[var(--color-status-interview-bg)] text-[var(--color-status-interview-fg)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
}

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={cn('ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold', PILL_STYLES[tone])}>{children}</span>
}

function Section({ title, danger = false, className, children }: { title: ReactNode; danger?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={cn('border-t border-[var(--color-border)] py-6', className)}>
      <h2 className={cn('mb-2 text-[17px] font-bold', danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-primary)]')}>{title}</h2>
      {children}
    </section>
  )
}

function Help({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">{children}</p>
}

export function MyBoardPage() {
  const { secureWithEmail, rotateCode, leaveBoard, deleteBoard } = useBoardAccess()
  const { userId, email, pendingEmail, loading, refresh } = useBoardUser()

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [rotateStep, setRotateStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const secured = email !== null && !isBoardEmail(email)
  // WHY: relu à chaque rendu (lecture locale, sans réseau) pour refléter tout de suite un nouveau code enregistré par rotateCode.
  const savedCode = userId ? savedAccessCode.read(userId) : null

  async function sendConfirmation(target: string) {
    setEmailBusy(true)
    setEmailError(null)
    const err = await secureWithEmail(target)
    setEmailBusy(false)
    if (err) {
      setEmailError(err)
      return
    }
    setNewEmail('')
    track('email_secured')
    await refresh()
  }

  function handleSecure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendConfirmation(newEmail)
  }

  async function handleRotate() {
    setRotateStep('busy')
    setRotateError(null)
    const result = await rotateCode()
    if ('error' in result) {
      setRotateError(result.error)
      setRotateStep('confirm')
      return
    }
    track('code_rotated')
    setRevealedCode(result.code)
    setRotateStep('idle')
  }

  async function handleDelete() {
    setDeleteBusy(true)
    setDeleteError(null)
    const err = await deleteBoard()
    // WHY: en cas de succès, la déconnexion renvoie vers l'accueil et démonte cette page.
    if (err) {
      setDeleteError(err)
      setDeleteBusy(false)
    }
  }

  // WHY: sans cette garde, la pastille affiche « non sécurisé » le temps que le premier
  // getUser() résolve, ce qui donne un flash trompeur avant que l'état réel soit connu.
  const pill = loading
    ? null
    : secured
      ? <Pill tone="success">sécurisé</Pill>
      : pendingEmail
        ? <Pill tone="info">en attente de confirmation</Pill>
        : <Pill tone="warning">non sécurisé</Pill>

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-accent)] no-underline hover:underline">
        <ArrowLeft size={15} />
        Retour au tableau
      </Link>
      <Eyebrow>Réglages</Eyebrow>
      <Title>Mon tableau</Title>

      <Section title={<>Sécuriser avec mon email{pill}</>}>
        {loading ? (
          <Help>Chargement…</Help>
        ) : secured ? (
          <Help>Sécurisé avec {email}</Help>
        ) : pendingEmail ? (
          <>
            <Help>Un email de confirmation a été envoyé à {pendingEmail}. Clique sur le lien reçu pour terminer.</Help>
            {emailError && <ErrorText>{emailError}</ErrorText>}
            <SecondaryButton onClick={() => void sendConfirmation(pendingEmail)} disabled={emailBusy}>Renvoyer</SecondaryButton>
          </>
        ) : (
          <form onSubmit={handleSecure} noValidate>
            <Help>Pour retrouver ton tableau par lien magique si tu perds ton code.</Help>
            <Field id="secure-email" label="Email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="prenom@exemple.fr" autoComplete="email" invalid={emailError !== null} />
            {emailError && <ErrorText>{emailError}</ErrorText>}
            <SecondaryButton type="submit" disabled={emailBusy}>Envoyer l'email de confirmation</SecondaryButton>
          </form>
        )}
      </Section>

      <Section title="Code d'accès">
        {revealedCode ? (
          <>
            <Help>Voici ton nouveau code. Note-le : il te faudra sur tes autres appareils. Ici, tu le retrouveras sur cette page.</Help>
            <CodeRevealPanel code={revealedCode} doneLabel="Fermer" onDone={() => setRevealedCode(null)} />
          </>
        ) : rotateStep === 'idle' ? (
          <>
            {loading ? (
              <Help>Chargement…</Help>
            ) : savedCode ? (
              <>
                <Help>Gardé sur cet appareil uniquement.</Help>
                <SavedCodePanel code={savedCode} />
                <Help>Ton code a fuité ? Génère-en un nouveau : l'ancien ne marchera plus et les autres appareils devront le retaper.</Help>
              </>
            ) : (
              <Help>
                Ton code n'est pas gardé sur cet appareil (tableau ouvert par lien email, ou avant cette mise à jour). Tu peux en
                générer un nouveau : l'ancien ne marchera plus et les autres appareils devront le retaper.
              </Help>
            )}
            <SecondaryButton onClick={() => setRotateStep('confirm')}>Générer un nouveau code</SecondaryButton>
          </>
        ) : (
          <>
            <Help>L'ancien code ne marchera plus. Continuer ?</Help>
            {rotateError && <ErrorText>{rotateError}</ErrorText>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={() => { setRotateStep('idle'); setRotateError(null) }} disabled={rotateStep === 'busy'}>Annuler</SecondaryButton>
              <PrimaryButton className="h-11 text-[14px]" onClick={() => void handleRotate()} disabled={rotateStep === 'busy'}>Générer</PrimaryButton>
            </div>
          </>
        )}
      </Section>

      {/* WHY: masquée sur téléphone, où l'on ne peut pas installer d'extension Chrome. */}
      <Section title="Extension Chrome" className="hidden md:block">
        <Help>
          Ajoute une offre à ton tableau depuis la page de l'annonce, sans retaper l'entreprise ni l'intitulé.
          Ton code d'accès n'est demandé qu'une fois.
        </Help>
        <a
          className={cn(SECONDARY_BUTTON_CLASS, 'no-underline')}
          href={CHROME_EXTENSION_URL}
          target="_blank"
          rel="noreferrer"
        >
          <Chrome size={16} />
          Installer l'extension
        </a>
      </Section>

      <Section title="Quitter ce tableau">
        <Help>Ferme le tableau sur cet appareil et y efface le code. Il faudra le retaper.</Help>
        <SecondaryButton onClick={() => void leaveBoard()}>Quitter ce tableau</SecondaryButton>
      </Section>

      <Section title="Supprimer mon tableau" danger>
        <Help>Efface définitivement le tableau et toutes ses candidatures.</Help>
        <SecondaryButton
          className="border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-red-light)] active:bg-[var(--color-red-light)]"
          onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
        >
          Supprimer…
        </SecondaryButton>
      </Section>

      {deleteOpen && (
        <DeleteBoardDialog busy={deleteBusy} error={deleteError} onConfirm={() => void handleDelete()} onCancel={() => setDeleteOpen(false)} />
      )}
    </div>
  )
}
