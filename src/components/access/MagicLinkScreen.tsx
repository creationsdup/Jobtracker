import { useState, type FormEvent } from 'react'
import { AccessLayout } from './AccessLayout'
import { ErrorText, Eyebrow, Field, Lead, PrimaryButton, TextButton, Title } from './accessUi'

interface MagicLinkScreenProps {
  busy: boolean
  error: string | null
  onSubmit: (email: string) => void
  onBack: () => void
}

export function MagicLinkScreen({ busy, error, onSubmit, onBack }: MagicLinkScreenProps) {
  const [email, setEmail] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(email)
  }

  return (
    <AccessLayout>
      <Eyebrow>Tableau sécurisé</Eyebrow>
      <Title>Reçois ton lien de connexion</Title>
      <Lead>Tape l'email rattaché à ton tableau. On t'envoie un lien qui l'ouvre directement.</Lead>
      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <Field
          id="magic-link-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="prenom@exemple.fr"
          autoComplete="email"
          invalid={error !== null}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton type="submit" disabled={busy}>Recevoir mon lien</PrimaryButton>
      </form>
      <TextButton onClick={onBack}>← J'ai mon code</TextButton>
    </AccessLayout>
  )
}
