import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { CVInterest } from '@/types/cvBuilder'

interface Props {
  items: CVInterest[]
  onAdd: (item: Omit<CVInterest, 'id'>) => void
  onDelete: (id: string) => void
}

export function InterestsEditor({ items, onAdd, onDelete }: Props) {
  const [name, setName] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim() })
    setName('')
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(interest => (
            <span key={interest.id} className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-full">
              {interest.name}
              <button className="text-[var(--color-muted)] hover:text-[var(--color-danger)]" onClick={() => onDelete(interest.id)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input text-sm flex-1"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Escalade, Photographie, Open Source…"
        />
        <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={handleAdd}>
          <Plus size={13} /> Ajouter
        </button>
      </div>
    </div>
  )
}
