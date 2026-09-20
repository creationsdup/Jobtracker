import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Briques du style validé en brainstorming : colonne centrée, libellé vert, grand titre bleu nuit.

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--color-success)]">{children}</p>
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-[34px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[var(--color-primary)] sm:text-[40px]">{children}</h1>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[16px] leading-relaxed text-[var(--color-muted)]">{children}</p>
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mb-6 text-[14px] font-semibold leading-snug text-[var(--color-ink)]">{children}</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p role="alert" className="-mt-2 mb-4 text-[13px] text-[var(--color-danger)]">{children}</p>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  invalid?: boolean
}

export function Field({ id, label, invalid = false, className, ...inputProps }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[14px] text-[var(--color-ink)]">{label}</label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full rounded-lg border bg-white px-4 text-[16px] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-accent)]',
          invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className,
        )}
        {...inputProps}
      />
    </div>
  )
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] text-[16px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

// WHY: partagé avec les liens externes (lien vers le Chrome Web Store) qui doivent être des <a>
// tout en gardant l'aspect d'un bouton secondaire.
export const SECONDARY_BUTTON_CLASS =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] bg-white text-[14px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-bg-light)] active:bg-[var(--color-bg-light)] disabled:cursor-not-allowed disabled:opacity-50'

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(SECONDARY_BUTTON_CLASS, className)}
      {...props}
    />
  )
}

export function OutlineButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 whitespace-nowrap rounded-lg border border-[var(--color-primary)] bg-white px-3.5 py-2 text-[14px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-bg-light)] active:bg-[var(--color-bg-light)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function TextButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'mt-5 block w-full text-center text-[14px] font-medium text-[var(--color-accent)] underline-offset-2 hover:underline active:underline',
        className,
      )}
      {...props}
    />
  )
}
