// src/pages/ProfilePage.tsx
// Page de profil : infos personnelles, bio, liens
import { useState, useEffect } from 'react'
import { Save, Loader2, Upload } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'

interface ProfilePageProps {
  userId: string
  userEmail: string
}

export function ProfilePage({ userId, userEmail }: ProfilePageProps) {
  const { profile, loading, saving, error, updateProfile, uploadAvatar } = useProfile(userId, userEmail)
  const [form, setForm] = useState({
    fullName: '', title: '', phone: '',
    location: '', summary: '', website: '', linkedin: '', github: '',
  })
  const [saved, setSaved] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? '',
        title: profile.title ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        summary: profile.summary ?? '',
        website: profile.website ?? '',
        linkedin: profile.linkedin ?? '',
        github: profile.github ?? '',
      })
    }
  }, [profile])

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = await updateProfile(form)
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-muted)]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-5">
      {error && (
        <div className="card px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt={form.fullName || userEmail} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg">
            {(form.fullName || userEmail)[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{form.fullName || 'Votre nom'}</p>
          <p className="text-sm text-[var(--color-muted)]">{userEmail}</p>
        </div>
        <label className="btn btn-secondary btn-sm ml-auto cursor-pointer">
          <Upload size={14} />
          Avatar
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setAvatarError(null)
              const err = await uploadAvatar(file)
              if (err) setAvatarError(err)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {avatarError && <p className="text-sm text-[var(--color-danger)]">{avatarError}</p>}

      <Section title="Informations personnelles">
        <Row>
          <Field label="Nom complet" value={form.fullName} onChange={v => set('fullName', v)} required />
          <Field label="Titre / Poste" value={form.title} onChange={v => set('title', v)} placeholder="Développeur Full-Stack" />
        </Row>
        <Row>
          <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} placeholder="+33 6 00 00 00 00" />
          <Field label="Localisation" value={form.location} onChange={v => set('location', v)} placeholder="Paris, France" />
        </Row>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[var(--color-muted)]">Résumé / Bio</label>
          <textarea
            className="input text-sm resize-y"
            rows={4}
            placeholder="Décrivez votre profil en quelques phrases…"
            value={form.summary}
            onChange={e => set('summary', e.target.value)}
          />
        </div>
      </Section>

      <Section title="Liens">
        <Field label="Site web" value={form.website} onChange={v => set('website', v)} placeholder="https://monsite.dev" />
        <Field label="LinkedIn" value={form.linkedin} onChange={v => set('linkedin', v)} placeholder="https://linkedin.com/in/…" />
        <Field label="GitHub" value={form.github} onChange={v => set('github', v)} placeholder="https://github.com/…" />
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={saving}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde…</> : <><Save size={14} /> Sauvegarder</>}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Profil mis à jour</span>}
      </div>
    </form>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card px-5 py-4 flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{title}</p>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <input
        className="input text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
