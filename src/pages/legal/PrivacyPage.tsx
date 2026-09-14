import { LegalLayout } from '@/components/legal/LegalLayout'
import { ContactEmail, DataItem, ExternalLink, LegalSections, List, type LegalSection } from '@/components/legal/legalUi'
import { LEGAL } from '@/config/legal'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable du traitement',
    content: (
      <p>
        Tes données sont traitées par <strong>{LEGAL.editorName}</strong>, éditeur de JobTracker, joignable à{' '}
        <ContactEmail subject="Données personnelles" />. C'est à cette adresse que tu peux poser tes questions et exercer
        tes droits.
      </p>
    ),
  },
  {
    id: 'donnees',
    title: 'Données enregistrées',
    content: (
      <>
        <p>JobTracker ne fait ni profilage ni décision automatisée. Voici tout ce qui est enregistré&nbsp;:</p>
        <DataItem
          title="Ton tableau"
          why="Afficher et synchroniser tes candidatures sur tes appareils."
          basis="Exécution du service que tu utilises."
          duration="Tant que le tableau existe. Un tableau non ouvert depuis plus de deux ans peut être supprimé."
        >
          Les entreprises, postes, lieux, types de contrat, liens vers les offres, statuts, dates, étapes et notes que tu
          saisis.
        </DataItem>
        <DataItem
          title="Ton code d'accès"
          why="Vérifier le code sans jamais pouvoir le retrouver."
          basis="Exécution du service que tu utilises."
          duration="Tant que le tableau existe."
        >
          Jamais stocké en clair&nbsp;: seule une empreinte cryptographique est conservée, avec un identifiant technique
          aléatoire et les dates de création, de changement de code et de dernière ouverture.
        </DataItem>
        <DataItem
          title="Ton email (facultatif)"
          why="T'envoyer l'email de confirmation, puis un lien de connexion si tu perds ton code."
          basis="Exécution du service que tu as demandé."
          duration="Tant que le tableau existe."
        >
          Enregistré seulement si tu choisis «&nbsp;Sécuriser avec mon email&nbsp;». Il ne sert jamais à de la prospection.
        </DataItem>
        <DataItem
          title="Adresse IP (anti-essais)"
          why="Limiter le nombre de codes essayés, pour protéger les tableaux."
          basis="Intérêt légitime&nbsp;: la sécurité du service."
          duration="24 heures, puis effacement automatique au nettoyage suivant."
        >
          À la création ou à l'ouverture d'un tableau, ton adresse IP est transformée en empreinte avec une clé secrète
          pour compter les essais. Elle n'est jamais stockée en clair.
        </DataItem>
        <DataItem
          title="Journaux techniques"
          why="Sécurité et bon fonctionnement du site."
          basis="Intérêt légitime&nbsp;: la sécurité du service."
          duration="Durée limitée, fixée par chaque hébergeur."
        >
          Comme pour tout site, les hébergeurs enregistrent les connexions&nbsp;: adresse IP, date, navigateur, page demandée.
        </DataItem>
        <p>
          Quand tu indiques le site d'une entreprise, le couple «&nbsp;nom de l'entreprise – nom de domaine&nbsp;» rejoint un
          catalogue partagé qui aide à afficher son logo pour tout le monde. Ce catalogue ne contient aucun lien avec ton
          tableau.
        </p>
      </>
    ),
  },
  {
    id: 'destinataires',
    title: 'Qui y a accès',
    content: (
      <>
        <p>Tes données ne sont ni vendues, ni louées, ni utilisées pour de la publicité. Seuls y ont accès&nbsp;:</p>
        <List>
          <li>l'éditeur, uniquement lorsque c'est nécessaire à la sécurité ou au fonctionnement du service&nbsp;;</li>
          <li>
            <strong>Supabase</strong> (base de données, connexion, envoi des emails de confirmation et de connexion), avec
            des serveurs dans l'Union européenne (Irlande)&nbsp;;
          </li>
          <li>
            <strong>Vercel</strong>, qui héberge le site&nbsp;;
          </li>
          <li>
            <strong>icon.horse</strong> et <strong>Google</strong>&nbsp;: pour afficher le logo d'une entreprise, ton
            navigateur leur demande l'icône de son site. Ils reçoivent le nom de domaine de l'entreprise (par exemple
            airbus.com) et, comme pour toute requête web, ton adresse IP. Jamais le reste de ton tableau.
          </li>
          <li>
            <strong>Clearbit</strong>, un service de HubSpot&nbsp;: pour trouver automatiquement le site d'une entreprise,
            et donc son logo, ton navigateur lui envoie le nom de l'entreprise tel que tu l'as écrit (par exemple Airbus)
            et, comme pour toute requête web, ton adresse IP. Jamais le reste de ton tableau.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'transferts',
    title: "Transferts hors de l'Union européenne",
    content: (
      <p>
        Tes candidatures sont stockées dans l'Union européenne. Certains prestataires sont établis ailleurs (Vercel,
        Google et HubSpot aux États-Unis, Supabase à Singapour) et peuvent y accéder pour fournir leur service. Ces
        transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou, pour Vercel, Google
        et HubSpot, par le Data Privacy Framework UE–États-Unis.
      </p>
    ),
  },
  {
    id: 'stockage-local',
    title: 'Cookies et stockage local',
    content: (
      <>
        <p>JobTracker n'utilise ni cookie publicitaire, ni mesure d'audience, ni pixel de suivi.</p>
        <p>
          Ton navigateur garde seulement l'indispensable&nbsp;: la session qui laisse ton tableau ouvert sur cet appareil, et
          tes préférences d'affichage (colonnes ou liste, langue). Ces éléments strictement nécessaires ne demandent pas de
          consentement. «&nbsp;Quitter ce tableau&nbsp;» efface la session de l'appareil.
        </p>
        <p>La police de caractères est servie par JobTracker lui-même&nbsp;: aucune requête n'est envoyée à Google Fonts.</p>
      </>
    ),
  },
  {
    id: 'droits',
    title: 'Tes droits',
    content: (
      <>
        <p>
          Tu disposes d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité
          sur tes données.
        </p>
        <List>
          <li>Tout se modifie directement depuis ton tableau.</li>
          <li>Dans «&nbsp;Mon tableau&nbsp;», «&nbsp;Supprimer mon tableau&nbsp;» efface immédiatement le tableau et toutes ses candidatures.</li>
          <li>
            Pour le reste, écris à <ContactEmail subject="Données personnelles" />&nbsp;: réponse sous un mois. Si ton tableau
            est sécurisé, écris depuis l'email qui le sécurise pour prouver qu'il est à toi. N'envoie jamais ton code
            d'accès.
          </li>
        </List>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (
          <ExternalLink href="https://www.cnil.fr">cnil.fr</ExternalLink>).
        </p>
      </>
    ),
  },
  {
    id: 'securite',
    title: 'Sécurité',
    content: (
      <p>
        Connexions chiffrées (HTTPS), code conservé sous forme d'empreinte, nombre d'essais limité et tableaux isolés les
        uns des autres par des règles d'accès dans la base de données. Aucune protection n'étant absolue, en cas de
        violation de données présentant un risque, l'éditeur préviendra la CNIL et, si possible, les personnes
        concernées.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications',
    content: (
      <p>
        Cette politique peut évoluer, par exemple si un prestataire change. La version en vigueur est celle publiée sur
        cette page, avec sa date de mise à jour.
      </p>
    ),
  },
]

export function PrivacyPage() {
  return (
    <LegalLayout
      page="privacy"
      eyebrow="Informations légales"
      title="Politique de confidentialité"
      updatedOn={LEGAL.lastUpdated}
      lead="JobTracker collecte le moins de données possible&nbsp;: pas de compte, pas de publicité, pas de mesure d'audience. Voici ce qui est enregistré, pourquoi, et comment garder la main dessus."
    >
      <LegalSections sections={SECTIONS} />
    </LegalLayout>
  )
}
