import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { aiTransforms } from '@/hooks/useCVBuilder'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function SummaryEditor({ value, onChange }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)

  function applyAI(type: 'improve' | 'professional' | 'bulletPoints') {
    if (!value.trim()) return
    setProcessing(type)
    // Simulate async AI with a short delay for UX realism
    setTimeout(() => {
      const result = aiTransforms[type](value)
      onChange(result)
      setProcessing(null)
    }, 700)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-[var(--color-muted)]">Résumé / Accroche</label>
        <span className="text-[10px] text-[var(--color-muted)]">{value.length} car.</span>
      </div>
      <textarea
        className="input text-sm resize-none"
        rows={6}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Décrivez votre profil en 3-5 phrases. Mettez en avant votre expertise, vos points forts et ce que vous recherchez."
      />

      {/* AI buttons */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-[var(--color-muted)] flex items-center gap-1">
          <Sparkles size={11} />
          Aide IA (simulation)
        </p>
        <div className="flex flex-wrap gap-2">
          <AIButton label="Améliorer le texte" loading={processing === 'improve'} onClick={() => applyAI('improve')} />
          <AIButton label="Rendre plus professionnel" loading={processing === 'professional'} onClick={() => applyAI('professional')} />
          <AIButton label="Transformer en bullet points" loading={processing === 'bulletPoints'} onClick={() => applyAI('bulletPoints')} />
        </div>
      </div>
    </div>
  )
}

function AIButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      className="btn btn-secondary btn-sm flex items-center gap-1 text-[11px]"
      onClick={onClick}
      disabled={loading}
    >
      <Sparkles size={11} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Traitement…' : label}
    </button>
  )
}
