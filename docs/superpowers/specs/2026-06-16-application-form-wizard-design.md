# Refonte du formulaire d'ajout/modification de candidature — Assistant en étapes

## Contexte

Le formulaire actuel (`src/components/applications/ApplicationForm.tsx`) est une modale centrée contenant tous les champs à plat. Après un premier agrandissement (modale plus large), le retour utilisateur est que **le concept de modale lui-même** n'est pas le bon format. Décidé en brainstorming visuel (3 maquettes comparées) : remplacer la modale par un **panneau latéral (drawer) plein écran** contenant un **assistant en 3 étapes**.

## Objectif

Remplacer `ApplicationForm` par un drawer glissant depuis la droite, occupant toute la hauteur de l'écran, avec une progression en 3 étapes plutôt qu'un formulaire à plat.

## Répartition des champs

- **Étape 1 — L'offre** : Entreprise* (`company`), Poste* (`position`), Lieu (`location`), Contrat (`contractType`), URL de l'offre (`jobUrl`). Le bouton "Import IA" reste disponible sur cette étape (uniquement en création, comme aujourd'hui) pour pré-remplir les champs avant de continuer.
- **Étape 2 — Suivi** : Statut (`status`), Date de candidature (`appliedAt`)
- **Étape 3 — Notes** : Notes (`notes`, facultatif)

Champs non couverts par le formulaire aujourd'hui (salaire, contact, remote_type...) restent hors scope — pas de changement de schéma ni d'ajout de champs, uniquement la réorganisation de l'UI existante.

## Comportement de l'assistant

- Barre de progression en haut + libellé "Étape X/3"
- Navigation "Précédent" / "Suivant" ; le dernier "Suivant" devient "Enregistrer"
- Validation bloquante à l'étape 1 : `company` et `position` doivent être non vides pour passer à l'étape 2 (mirroring les `required` actuels)
- **Mode édition** (modification d'une candidature existante) : les 3 étapes sont accessibles directement en cliquant sur leur indicateur dans la barre de progression, sans repasser par "Suivant" à chaque fois — puisque les champs sont déjà remplis, l'utilisateur doit pouvoir sauter directement à ce qu'il veut corriger.
- **Mode création** : navigation strictement séquentielle (Suivant/Précédent), pas de saut direct vers une étape non encore validée.
- Échap ferme toujours le drawer (comportement actuel conservé)
- Soumission finale identique à l'existant : appelle `onSave(...)` avec la même forme de données qu'aujourd'hui — aucun changement côté `useApplications` / `App.tsx`.

## Visuel / style

- Drawer plein écran : `position: fixed`, glisse depuis la droite (`translate-x` transition), largeur fixe confortable (ex. ~480-560px sur desktop, pleine largeur sur mobile), fond légèrement obscurci derrière (overlay semi-transparent comme la modale actuelle)
- Reprend les couleurs du design system actuel (#003459 / #007EA7 / #00A8E8, fond blanc/#F8FAFB) — pas de nouvelle palette
- Header du drawer : titre ("Nouvelle candidature" / "Modifier la candidature") + bouton fermer (X), sous lequel s'affiche la barre de progression

## Hors scope

- Pas de changement de schéma DB ni de nouveaux champs
- Pas de changement du flux `JobOfferImporter` (Import IA) au-delà de son point d'intégration dans l'étape 1
- Pas de changement des autres pages (Kanban, ApplicationsPage) qui ouvrent ce formulaire — seul le composant `ApplicationForm` change de forme, son interface (`props`) reste compatible avec les appelants actuels (`App.tsx`)

## Risques / points d'attention

- `ApplicationDetail.tsx` et `KanbanPage.tsx`/`ApplicationsPage.tsx` invoquent `ApplicationForm` avec les mêmes props (`initial`, `userId`, `onSave`, `externalError`, `onClose`) — l'interface publique du composant ne doit pas changer pour éviter de toucher les appelants.
- Le `formSeed` actuel (remount du form via `key`) doit être adapté pour aussi réinitialiser l'étape courante à 1 quand on passe de l'import IA aux données importées.
