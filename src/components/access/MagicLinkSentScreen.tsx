import { AccessLayout } from './AccessLayout'
import { Eyebrow, Lead, TextButton, Title } from './accessUi'

interface MagicLinkSentScreenProps {
  onBack: () => void
}

export function MagicLinkSentScreen({ onBack }: MagicLinkSentScreenProps) {
  return (
    <AccessLayout>
      <Eyebrow>Tableau sécurisé</Eyebrow>
      <Title>Regarde ta boîte mail</Title>
      <Lead>Si un tableau est rattaché à cet email, tu vas recevoir un lien qui l'ouvre directement.</Lead>
      <TextButton onClick={onBack}>← J'ai mon code</TextButton>
    </AccessLayout>
  )
}
