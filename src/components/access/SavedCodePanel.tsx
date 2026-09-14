import { useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { formatAccessCode } from '@/lib/accessCode'
import { cn } from '@/lib/utils'
import { SecondaryButton } from './accessUi'

interface SavedCodePanelProps {
  code: string
}

const MASK = '••••-••••-••••'

export function SavedCodePanel({ code }: SavedCodePanelProps) {
  // WHY: masqué par défaut, pour ne pas l'exposer lors d'un partage d'écran ou à un regard par-dessus l'épaule.
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const formatted = formatAccessCode(code)

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // WHY: presse-papiers indisponible (contexte non sécurisé) : « Afficher » permet encore de recopier le code.
    }
  }

  return (
    <div className="mb-4">
      <p
        aria-label={visible ? undefined : 'Code masqué'}
        className={cn(
          'mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-light)] px-4 py-4 text-center font-mono text-[22px] font-bold tracking-[0.08em] text-[var(--color-primary)]',
          visible && 'select-all',
        )}
      >
        {visible ? formatted : MASK}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SecondaryButton onClick={() => setVisible((current) => !current)} aria-pressed={visible}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {visible ? 'Masquer' : 'Afficher'}
        </SecondaryButton>
        <SecondaryButton onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copié' : 'Copier le code'}
        </SecondaryButton>
      </div>
    </div>
  )
}
