import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { CVCertification } from '@/types/cvBuilder'

interface Props {
  items: CVCertification[]
  onAdd: (item: Omit<CVCertification, 'id'>) => void
  onDelete: (id: string) => void
}

const EMPTY: Omit<CVCertification, 'id'> = { name: '', issuer: '', date: '', url: '' }

export function CertificationsEditor({ items, onAdd, onDelete }: Props) {
  const [form, setForm] = useState<Omit<CVCertification, 'id'>>(EMPTY)
  const [open, setOpen] = useState(false)

  function handleAdd() {
    if (!form.name.trim()) return
    onAdd(form)
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(cert => (
        <div key={cert.id} className="card px-4 py-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{cert.name}</p>
            <p className="text-[11px] text-[var(--color-muted)]">{cert.issuer}{cert.date ? ` · ${cert.date}` : ''}</p>
            {cert.url && <p className="text-[10px] text-blue-500">{cert.url}</p>}
          </div>
          <button className="text-[var(--color-muted)] hover:text-[var(--color-danger)] shrink-0" onClick={() => onDelete(cert.id)}>
            <X size={14} />
          </button>
        </div>
      ))}

      {open ? (
        <div className="card p-4 border-dashed border-2 border-[var(--color-primary)]/30 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--color-primary)]">Nouvelle certification</p>
          <div>
            <label className="text-[10px] text-[var(--color-muted)] font-semibold">Nom *</label>
            <input className="input text-sm mt-0.5" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="AWS Certified Developer" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--color-muted)] font-semibold">Organisme</label>
              <input className="input text-sm mt-0.5" value={form.issuer} onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Amazon Web Services" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-muted)] font-semibold">Date</label>
              <input className="input text-sm mt-0.5" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="2023-05" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-muted)] font-semibold">URL (optionnel)</label>
            <input className="input text-sm mt-0.5" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="credly.com/…" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setForm(EMPTY) }}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Ajouter</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm flex items-center gap-1.5 w-full justify-center border-dashed" onClick={() => setOpen(true)}>
          <Plus size={13} /> Ajouter une certification
        </button>
      )}
    </div>
  )
}
