import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatAccessCode } from '@/lib/accessCode'
import { PrimaryButton, SecondaryButton } from './accessUi'

interface CodeRevealPanelProps {
  code: string
  doneLabel: string
  onDone: () => void
  busy?: boolean
}

type CopyTarget = 'code' | 'shortcut'

export function CodeRevealPanel({ code, doneLabel, onDone, busy = false }: CodeRevealPanelProps) {
  const [noted, setNoted] = useState(false)
  const [copied, setCopied] = useState<CopyTarget | null>(null)
  const formatted = formatAccessCode(code)
  const shortcut = `${window.location.origin}/#${formatted}`

  async function copy(target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(target === 'code' ? formatted : shortcut)
      setCopied(target)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      // WHY: presse-papiers indisponible (contexte non sécurisé) : le code reste affiché et sélectionnable.
    }
  }

  return (
    <div>
      <p className="mb-4 select-all rounded-xl border border-dashed border-[var(--color-accent)] bg-[var(--color-bg-light)] px-4 py-5 text-center font-mono text-[26px] font-bold tracking-[0.08em] text-[var(--color-primary)] sm:text-[28px]">
        {formatted}
      </p>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SecondaryButton onClick={() => copy('code')}>
          {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'code' ? 'Copié' : 'Copier le code'}
        </SecondaryButton>
        <SecondaryButton onClick={() => copy('shortcut')}>
          {copied === 'shortcut' ? <Check size={16} /> : <Copy size={16} />}
          {copied === 'shortcut' ? 'Copié' : 'Copier le raccourci'}
        </SecondaryButton>
      </div>
      <label className="mb-5 flex cursor-pointer items-center gap-3 text-[15px] text-[var(--color-ink)]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-primary)]"
          checked={noted}
          onChange={(event) => setNoted(event.target.checked)}
        />
        J'ai noté mon code
      </label>
      <PrimaryButton disabled={!noted || busy} onClick={onDone}>{doneLabel}</PrimaryButton>
    </div>
  )
}
