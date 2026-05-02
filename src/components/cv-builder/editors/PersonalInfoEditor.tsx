import type { PersonalInfo } from '@/types/cvBuilder'

interface Props {
  data: PersonalInfo
  onChange: (partial: Partial<PersonalInfo>) => void
}

export function PersonalInfoEditor({ data, onChange }: Props) {
  function field(key: keyof PersonalInfo, label: string, placeholder?: string) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[var(--color-muted)]">{label}</label>
        <input
          className="input text-sm"
          value={data[key] as string}
          onChange={e => onChange({ [key]: e.target.value })}
          placeholder={placeholder ?? label}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {field('firstName', 'Prénom', 'Sophie')}
        {field('lastName', 'Nom', 'Martin')}
      </div>
      {field('title', 'Titre professionnel', 'Développeuse Full-Stack')}
      <div className="grid grid-cols-2 gap-3">
        {field('email', 'Email', 'sophie@email.com')}
        {field('phone', 'Téléphone', '+33 6 00 00 00 00')}
      </div>
      {field('location', 'Localisation', 'Paris, France')}
      <div className="h-px bg-[var(--color-border)] my-1" />
      <p className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wide">Liens</p>
      {field('linkedin', 'LinkedIn', 'linkedin.com/in/…')}
      {field('website', 'Site web / Portfolio', 'monsiteweb.com')}
      {field('github', 'GitHub', 'github.com/…')}
    </div>
  )
}
