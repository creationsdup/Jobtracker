# Création d'objectifs assistée par IA

## Contexte et dépendance

L'utilisateur souhaite décrire en texte libre ce qu'il recherche (poste,
secteur, contrat, zone, entreprises visées, mots-clés à privilégier/éviter,
urgence, rythme de candidature) et obtenir un objectif (`user_goals`)
pré-rempli automatiquement, qu'il valide ou corrige avant sauvegarde.

**Dépendance dure** : cette fonctionnalité s'appuie sur le modèle `UserGoal`
étendu (`target_title`, `target_roles`, `locations`, `sectors`,
`keywords_wanted`, `keywords_excluded`, `experience_level`,
`scoring_priorities`) et sur `EditGoalModal` tels que définis dans
`docs/superpowers/plans/2026-06-19-job-matching-rewrite.md`. Ce plan doit être
implémenté avant celui-ci — sans les nouveaux champs, l'IA n'aurait que 4
critères à remplir (poste, zone, contrat, entreprise), ce qui n'apporte pas
assez de valeur pour justifier la fonctionnalité.

Hors scope : amélioration des 4 autres intégrations IA existantes (import
offre, import CV, deviner domaine entreprise, lettre de motivation) — scope
volontairement limité à la création d'objectifs.

## Architecture

Pas de nouvelle edge function : réutilisation de `generateStructuredData()`
(`src/lib/ai.ts`), qui passe déjà par l'edge function Supabase `ai-assistant`
(GPT-4o, réponse JSON, clé OpenAI côté serveur), avec fallback local existant
si `VITE_OPENAI_API_KEY` est définie.

```
src/lib/ai.ts
  + generateGoalFromText(freeText: string): Promise<GeneratedGoal>
    — construit le systemPrompt, appelle generateStructuredData, valide
      la forme de la réponse.

src/lib/types.ts (ou src/types/jobMatching.ts selon où vit déjà UserGoal)
  + interface GeneratedGoal

src/lib/goalDraft.ts (nouveau, logique pure testable)
  + mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate
    — convertit `timeline` en `target_date` via targetDateFromOption()
      (déplacée ou réexportée depuis GoalsPage.tsx si elle n'est pas déjà
      exportée), filtre contract_types contre CONTRACT_OPTIONS.

src/components/applications/ (ou src/components/goals/ si ce dossier existe
après la refonte job-matching)
  + AIGoalGeneratorModal.tsx
    — textarea + bouton Générer, état loading/erreur, appelle
      generateGoalFromText puis mapGeneratedGoalToDraft, puis transmet le
      draft au composant parent pour ouvrir EditGoalModal pré-rempli.

src/pages/GoalsPage.tsx
  + bouton "Créer avec l'IA" en haut de page, ouvre AIGoalGeneratorModal.
  + état pour porter le draft généré en initialValues de EditGoalModal
    (EditGoalModal doit accepter ces valeurs initiales en plus du goal
    existant — petite extension de ses props si ce n'est pas déjà le cas
    après la refonte job-matching).
```

## Contrat de données

```typescript
interface GeneratedGoal {
  target_title: string | null
  target_roles: string[]
  contract_types: string[]        // doit être un sous-ensemble de CONTRACT_OPTIONS
  locations: string[]
  target_companies: string[]
  sectors: string[]
  keywords_wanted: string[]
  keywords_excluded: string[]
  experience_level: string[]      // libre (ex: "junior", "0-2 ans", "confirmé")
  scoring_priorities: string | null
  timeline: '1m' | '3m' | '6m' | '12m' | null
  personal_target: number | null
}
```

Le `systemPrompt` (en français) :
- explique chaque champ avec un exemple ;
- impose `contract_types` parmi `CONTRACT_OPTIONS` exactement (`CDI, CDD,
  Stage, Alternance, Freelance, Mission`) — toute valeur hors liste doit être
  omise plutôt qu'approximée ;
- impose `timeline` parmi `1m | 3m | 6m | 12m | null`, mappé aux libellés
  affichés dans l'UI (Urgent < 1 mois, Court terme 1–3 mois, Moyen terme
  3–6 mois, Long terme > 6 mois) pour que l'IA choisisse le bucket le plus
  proche d'une urgence mentionnée ;
- précise qu'un champ non mentionné dans le texte doit être un tableau vide
  ou `null` — jamais une valeur inventée pour "remplir" un champ ;
- précise que `personal_target` n'est rempli que si un rythme de candidature
  est explicitement mentionné (ex: "10 candidatures par mois").

`mapGeneratedGoalToDraft()` :
- `timeline` → `target_date` via `targetDateFromOption(timeline ?? '3m')` si
  `timeline` non null, sinon `target_date: null` (l'utilisateur choisit
  manuellement dans `EditGoalModal`).
- `contract_types` re-filtré contre `CONTRACT_OPTIONS` par sécurité (défense
  en profondeur si l'IA ignore la consigne du prompt).
- tous les autres champs passent tels quels.

## Flux UX

1. Sur `GoalsPage.tsx`, bouton **« Créer avec l'IA »** en haut de page, à côté
   du bouton d'édition manuelle existant.
2. Clic → `AIGoalGeneratorModal` : un `textarea` (placeholder donnant des
   exemples de ce qui peut être décrit) + bouton **Générer**.
3. Pendant l'appel : bouton en état chargement, formulaire désactivé.
4. Succès → la modale se ferme, `EditGoalModal` s'ouvre avec le draft généré
   comme valeurs initiales (remplacement complet de l'affichage du
   formulaire, indépendamment d'un objectif déjà existant en base — pas de
   fusion). L'utilisateur relit/corrige chaque champ librement puis clique
   **Enregistrer**, ce qui déclenche `saveGoal()` sans modification de son
   comportement actuel (toujours un upsert qui remplace l'objectif existant).
5. Erreur (réseau, JSON invalide, edge function indisponible) → message
   d'erreur inline dans `AIGoalGeneratorModal`, le texte saisi reste affiché,
   l'utilisateur peut réessayer sans tout retaper.
6. Annuler à n'importe quelle étape (modale texte libre ou `EditGoalModal`)
   ne modifie jamais l'objectif déjà enregistré — le draft IA reste local
   jusqu'au clic Enregistrer.

## Limites assumées (YAGNI)

- Une génération à la fois, pas d'historique des générations précédentes.
- Pas de fusion intelligente avec l'objectif existant — toujours un
  remplacement complet proposé à la relecture.
- Pas de mode conversationnel ("régénère en changeant juste le secteur") —
  aller simple texte → formulaire, cohérent avec les autres imports IA du
  projet (`JobOfferImporter`, `CVImporter`).
- Aucune nouvelle surface de sécurité : même edge function, même clé API
  côté serveur que les fonctionnalités IA existantes.

## Tests

Tests unitaires Vitest sur `mapGeneratedGoalToDraft()` :
- `timeline` non null → `target_date` calculée correctement pour chacun des
  4 buckets.
- `timeline: null` → `target_date: null`.
- `contract_types` contenant une valeur hors `CONTRACT_OPTIONS` → valeur
  filtrée/supprimée du résultat.
- Champs tableau vides/`null` en entrée → restent vides/`null` en sortie (pas
  de valeur par défaut injectée).

Pas de test e2e (cohérent avec la politique de test du projet, cf.
`CLAUDE.md`). Pas de test sur l'appel réseau IA lui-même (mocké si testé,
comme pour les autres fonctions de `src/lib/ai.ts`, qui n'ont actuellement
pas de couverture de test).
