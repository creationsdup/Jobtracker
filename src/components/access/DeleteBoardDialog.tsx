import { useState } from 'react'
import { ErrorText, Field, PrimaryButton, SecondaryButton } from './accessUi'

interface DeleteBoardDialogProps {
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

const CONFIRMATION_WORD = 'SUPPRIMER'

export function DeleteBoardDialog({ busy, error, onConfirm, onCancel }: DeleteBoardDialogProps) {
  const [typed, setTyped] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-board-title">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[var(--shadow-lg)]">
        <h2 id="delete-board-title" className="mb-2 text-[20px] font-bold text-[var(--color-danger)]">Supprimer mon tableau</h2>
        <p className="mb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">
          Efface définitivement le tableau et toutes ses candidatures. Tape {CONFIRMATION_WORD} pour confirmer.
        </p>
        <Field
          id="delete-board-confirm"
          label="Confirmation"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Annuler</SecondaryButton>
          <PrimaryButton
            onClick={onConfirm}
            disabled={busy || typed !== CONFIRMATION_WORD}
            className="h-11 bg-[var(--color-danger)] text-[14px] hover:bg-[var(--color-danger-dark)] active:bg-[var(--color-danger-dark)]"
          >
            Supprimer définitivement
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
