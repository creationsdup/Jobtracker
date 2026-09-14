import { LegalLayout } from '@/components/legal/LegalLayout'
import { ContactEmail, ExternalLink, LegalSections, List, PageLink, type LegalSection } from '@/components/legal/legalUi'
import { LEGAL } from '@/config/legal'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'mentions-legales',
    title: 'Mentions légales',
    content: (
      <List>
        <li>
          <strong>Éditeur et directeur de la publication&nbsp;:</strong> {LEGAL.editorName}, éditeur à titre non
          professionnel — <ContactEmail />
        </li>
        <li>
          <strong>Hébergement du site&nbsp;:</strong> {LEGAL.siteHost.name}, {LEGAL.siteHost.address} —{' '}
          <ExternalLink href={LEGAL.siteHost.website}>vercel.com</ExternalLink>
        </li>
        <li>
          <strong>Hébergement des données&nbsp;:</strong> {LEGAL.dataHost.name}, {LEGAL.dataHost.address} —{' '}
          <ExternalLink href={LEGAL.dataHost.website}>supabase.com</ExternalLink>. Les données sont stockées sur des
          serveurs situés dans l'Union européenne (Irlande).
        </li>
      </List>
    ),
  },
  {
    id: 'service',
    title: 'Le service',
    content: (
      <>
        <p>
          JobTracker est un outil gratuit pour suivre ses candidatures&nbsp;: entreprises, postes, statuts, étapes et notes,
          affichés en colonnes ou en liste.
        </p>
        <p>Aucune inscription n'est nécessaire&nbsp;: chaque tableau s'ouvre avec un code d'accès personnel.</p>
        <p>
          L'éditeur peut faire évoluer, suspendre ou arrêter tout ou partie du service. En cas d'arrêt définitif, il
          s'efforcera de prévenir sur le site au moins 30 jours à l'avance.
        </p>
      </>
    ),
  },
  {
    id: 'code-acces',
    title: "Ton code d'accès",
    content: (
      <List>
        <li>
          Le code de 12 caractères affiché à la création ouvre ton tableau depuis n'importe quel appareil. Il n'est
          montré qu'une seule fois&nbsp;: note-le et garde-le pour toi.
        </li>
        <li>
          Toute personne qui connaît ce code peut consulter, modifier ou supprimer ton tableau. Tu es responsable de sa
          confidentialité.
        </li>
        <li>
          Le code n'est jamais conservé en clair&nbsp;: personne, pas même l'éditeur, ne peut le retrouver. Si tu le perds
          sans avoir sécurisé ton tableau avec un email, ce tableau ne pourra plus être ouvert.
        </li>
        <li>
          Si tu penses que ton code a fuité, génère-en un nouveau depuis «&nbsp;Mon tableau&nbsp;»&nbsp;: l'ancien cesse aussitôt de
          fonctionner.
        </li>
        <li>Ton code ne te sera jamais demandé, ni par email ni autrement.</li>
      </List>
    ),
  },
  {
    id: 'utilisation',
    title: 'Utilisation acceptable',
    content: (
      <>
        <p>En utilisant JobTracker, tu t'engages à&nbsp;:</p>
        <List>
          <li>l'utiliser pour suivre tes propres démarches de recherche d'emploi, de stage ou d'alternance&nbsp;;</li>
          <li>
            ne pas y enregistrer de contenus illicites ni de données sensibles (santé, opinions, etc.), et limiter les
            informations sur d'autres personnes au strict nécessaire (par exemple le nom d'un recruteur)&nbsp;;
          </li>
          <li>ne pas tenter de deviner des codes, de contourner les limites d'essais ou de perturber le service.</li>
        </List>
        <p>En cas de manquement grave, l'éditeur peut supprimer le tableau concerné ou en bloquer l'accès.</p>
      </>
    ),
  },
  {
    id: 'donnees',
    title: 'Tes données',
    content: (
      <List>
        <li>
          Les informations que tu saisis t'appartiennent. Elles servent uniquement à faire fonctionner ton tableau&nbsp;;
          elles ne sont ni vendues ni utilisées pour de la publicité.
        </li>
        <li>
          Le détail figure dans la <PageLink href="/confidentialite">politique de confidentialité</PageLink>.
        </li>
        <li>
          Tu peux supprimer ton tableau à tout moment depuis «&nbsp;Mon tableau&nbsp;»&nbsp;: la suppression est immédiate et
          définitive.
        </li>
        <li>Un tableau qui n'a pas été ouvert depuis plus de deux ans peut être supprimé.</li>
      </List>
    ),
  },
  {
    id: 'responsabilite',
    title: 'Disponibilité et responsabilité',
    content: (
      <>
        <p>
          JobTracker est fourni gratuitement et en l'état. L'éditeur fait de son mieux pour que le service reste
          disponible et que tes données soient conservées, sans pouvoir le garantir&nbsp;: interruptions, erreurs ou perte de
          données restent possibles. Garde ailleurs une copie des informations importantes.
        </p>
        <p>
          JobTracker ne candidate pas à ta place et n'est lié à aucun recruteur. Les noms et logos d'entreprises
          affichés servent seulement à les reconnaître et restent la propriété de leurs titulaires.
        </p>
        <p>
          Dans les limites prévues par la loi, l'éditeur ne peut être tenu responsable des conséquences d'une
          indisponibilité du service, d'une perte de données ou de la divulgation d'un code par son utilisateur.
        </p>
      </>
    ),
  },
  {
    id: 'propriete',
    title: 'Propriété intellectuelle',
    content: <p>Le nom JobTracker, son logo et son interface sont protégés&nbsp;; ils ne peuvent être reproduits sans accord.</p>,
  },
  {
    id: 'modifications',
    title: 'Modification des conditions',
    content: (
      <p>
        Ces conditions peuvent évoluer. La version en vigueur est celle publiée sur cette page, avec sa date de mise à
        jour. Continuer à utiliser JobTracker après une modification vaut acceptation de la nouvelle version.
      </p>
    ),
  },
  {
    id: 'droit',
    title: 'Droit applicable',
    content: (
      <p>
        Ces conditions sont soumises au droit français. En cas de désaccord, écris d'abord à{' '}
        <ContactEmail subject="Réclamation" /> pour chercher une solution amiable&nbsp;; à défaut, les tribunaux français
        compétents pourront être saisis.
      </p>
    ),
  },
]

export function TermsPage() {
  return (
    <LegalLayout
      page="terms"
      eyebrow="Informations légales"
      title="Conditions générales d'utilisation"
      updatedOn={LEGAL.lastUpdated}
      lead="Ces conditions encadrent l'utilisation de JobTracker. En créant ou en ouvrant un tableau, tu les acceptes."
    >
      <LegalSections sections={SECTIONS} />
    </LegalLayout>
  )
}
