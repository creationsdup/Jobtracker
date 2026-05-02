import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { CVLanguage } from '@/types/cvBuilder'

interface Props {
  items: CVLanguage[]
  onAdd: (item: Omit<CVLanguage, 'id'>) => void
  onDelete: (id: string) => void
}

const LEVELS = ['Natif', 'C2 — Bilingue', 'C1 — Courant', 'B2 — Avancé', 'B1 — Intermédiaire', 'A2 — Élémentaire', 'A1 — Débutant']

export function LanguagesEditor({ items, onAdd, onDelete }: Props) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState('B2 — Avancé')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), level })
    setName('')
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map(lang => (
            <div key={lang.id} className="flex items-center justify-between card px-3 py-2">
              <div>
                <span className="text-sm font-medium">{lang.name}</span>
                {lang.level && <span className="text-[11px] text-[var(--color-muted)] ml-2">{lang.level}</span>}
              </div>
              <button className="text-[var(--color-muted)] hover:text-[var(--color-danger)]" onClick={() => onDelete(lang.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card p-3 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-[var(--color-muted)]">Ajouter une langue</p>
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Anglais, Espagnol…"
          />
          <select className="input text-sm" value={level} onChange={e => setLevel(e.target.value)}>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm flex items-center gap-1 self-start" onClick={handleAdd}>
          <Plus size={13} /> Ajouter
        </button>
      </div>
    </div>
  )
}
