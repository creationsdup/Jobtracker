import { useState, type FormEvent } from 'react'
import { formatAccessCode, normalizeAccessCode } from '@/lib/accessCode'
import { AccessLayout } from './AccessLayout'
import { ErrorText, Eyebrow, Field, Lead, Note, OutlineButton, PrimaryButton, TextButton, Title } from './accessUi'

interface AccessCodeScreenProps {
  initialCode?: string
  busy: boolean
  creating: boolean
  error: string | null
  onSubmit: (code: string) => void
  onCreate: () => void
  onMagicLink: () => void
}

function toDisplay(input: string): string {
  return formatAccessCode(normalizeAccessCode(input).slice(0, 12))
}

export function AccessCodeScreen({ initialCode = '', busy, creating, error, onSubmit, onCreate, onMagicLink }: AccessCodeScreenProps) {
  const [value, setValue] = useState(() => toDisplay(initialCode))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <AccessLayout headerAction={<OutlineButton onClick={onCreate} disabled={creating || busy}>Créer un tableau</OutlineButton>}>
      <Eyebrow>Accès à ton tableau</Eyebrow>
      <Title>Entre ton code d'accès</Title>
      <Lead>Le code t'a été donné à la création de ton tableau.</Lead>
      <Note>12 caractères : ce code ouvre toutes tes candidatures.</Note>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          id="access-code"
          label="Code d'accès"
          value={value}
          onChange={(event) => setValue(toDisplay(event.target.value))}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          invalid={error !== null}
          className="font-mono tracking-[0.08em]"
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton type="submit" disabled={busy || creating}>Ouvrir mon tableau</PrimaryButton>
      </form>
      <TextButton onClick={onMagicLink}>Tableau sécurisé par email ? Recevoir un lien de connexion</TextButton>
    </AccessLayout>
  )
}
