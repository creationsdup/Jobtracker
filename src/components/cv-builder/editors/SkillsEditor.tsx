import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { skillLevelLabel } from '@/utils/cvHelpers'
import type { CVSkill } from '@/types/cvBuilder'

interface Props {
  items: CVSkill[]
  onAdd: (item: Omit<CVSkill, 'id'>) => void
  onUpdate: (id: string, partial: Partial<CVSkill>) => void
  onDelete: (id: string) => void
}

const LEVELS: CVSkill['level'][] = ['beginner', 'intermediate', 'advanced', 'expert']

const LEVEL_COLORS: Record<CVSkill['level'], string> = {
  beginner: 'bg-gray-100 text-gray-600',
  intermediate: 'bg-blue-50 text-blue-700',
  advanced: 'bg-violet-50 text-violet-700',
  expert: 'bg-emerald-50 text-emerald-700',
}

export function SkillsEditor({ items, onAdd, onDelete, onUpdate }: Props) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState<CVSkill['level']>('intermediate')
  const [category, setCategory] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), level, category: category.trim() })
    setName('')
    setCategory('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Existing skills grouped by category */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(sk => (
            <div key={sk.id} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${LEVEL_COLORS[sk.level]}`}>
              <button onClick={() => {
                // Cycle through levels on click
                const idx = LEVELS.indexOf(sk.level)
                onUpdate(sk.id, { level: LEVELS[(idx + 1) % LEVELS.length] })
              }} className="font-medium hover:opacity-70 transition-opacity" title="Cliquer pour changer le niveau">
                {sk.name}
              </button>
              <span className="opacity-50 text-[9px]">·</span>
              <span className="text-[10px] opacity-70">{skillLevelLabel(sk.level)}</span>
              <button onClick={() => onDelete(sk.id)} className="ml-0.5 opacity-50 hover:opacity-100">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="card p-3 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-[var(--color-muted)]">Ajouter une compétence</p>
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="React, TypeScript, SQL…"
          />
          <select className="input text-sm w-36" value={level} onChange={e => setLevel(e.target.value as CVSkill['level'])}>
            {LEVELS.map(l => <option key={l} value={l}>{skillLevelLabel(l)}</option>)}
          </select>
        </div>
        <input
          className="input text-sm"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Catégorie (Frontend, Backend, Outil…)"
        />
        <button className="btn btn-primary btn-sm flex items-center gap-1 self-start" onClick={handleAdd}>
          <Plus size={13} /> Ajouter
        </button>
      </div>

      <p className="text-[10px] text-[var(--color-muted)]">
        Astuce : cliquez sur une compétence pour changer son niveau.
      </p>
    </div>
  )
}
