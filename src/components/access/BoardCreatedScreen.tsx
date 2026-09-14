import { AccessLayout } from './AccessLayout'
import { CodeRevealPanel } from './CodeRevealPanel'
import { ErrorText, Eyebrow, Note, Title } from './accessUi'

interface BoardCreatedScreenProps {
  code: string
  busy: boolean
  error: string | null
  onOpen: () => void
}

export function BoardCreatedScreen({ code, busy, error, onOpen }: BoardCreatedScreenProps) {
  return (
    <AccessLayout>
      <Eyebrow>Tableau créé</Eyebrow>
      <Title>Voici ton code d'accès</Title>
      <Note>Note-le : il te faudra sur tes autres appareils, et sans lui (ou sans email rattaché) le tableau est perdu. Sur cet appareil, tu le retrouveras dans « Mon tableau ».</Note>
      {error && <ErrorText>{error}</ErrorText>}
      <CodeRevealPanel code={code} doneLabel="Ouvrir mon tableau" onDone={onOpen} busy={busy} />
    </AccessLayout>
  )
}
