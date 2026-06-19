# Refonte du calcul des objectifs (Goals)

## Contexte

La page Objectifs (`src/pages/GoalsPage.tsx`) et le hook `src/hooks/useGoals.ts`
calculent actuellement un "score global" composite (CV / candidatures / matching /
réseau) qui souffre de plusieurs défauts :

- Valeurs par défaut arbitraires (50, 72, 25) injectées quand un critère n'est pas
  défini par l'utilisateur, qui faussent la moyenne (définir un critère et avoir un
  matching partiel peut donner un score *pire* que ne rien définir).
- Mélange de fenêtres temporelles incohérentes : candidatures comptées sur le mois
  civil en cours, entretiens/offres comptés sur toute la durée de vie des
  candidatures, comparés à des objectifs dérivés du compteur mensuel → ratios
  aberrants (ex: 267%).
- Matching texte (poste, zone, contrat, entreprise) en simple `.includes()` sans
  normalisation des accents/casse, et avec un bug réel : les options de contrat de
  l'objectif ("Freelance", "Mission") n'existent pas dans le select de candidature,
  et la comparaison exacte échoue pour des valeurs composées ("CDI-Graduate
  Program" vs "CDI").

Décisions validées avec l'utilisateur :
- Pas de score global agrégé — métriques séparées et honnêtes.
- Fenêtre glissante de 30 jours pour l'effort récent (candidatures envoyées).
- Taux de conversion (entretiens, offres) calculés sur l'historique complet,
  affichés séparément, jamais comparés directement à la fenêtre 30 jours.
- Alignement affiché un % par critère **réellement défini**, pas de valeur
  fantôme pour les critères non définis.
- Matching texte : normalisation (accents/casse/espaces) + comparaison par
  mots-clés bidirectionnelle, pas de fuzzy matching (Levenshtein) pour cette
  itération.

## Métriques affichées

Remplace le score global et `QuantifiedGoals` actuels par trois blocs :

1. **Candidatures (30 jours glissants)** — nombre de candidatures créées dans les
   30 derniers jours vs `personal_target`. Pas de cap visuel à 100% : un
   dépassement réel s'affiche tel quel (ex: "12/10 — 120%").
2. **Taux de conversion (historique complet)** — `entretiens obtenus /
   candidatures envoyées` et `offres / entretiens obtenus`, calculés sur toute la
   durée de vie des candidatures de l'utilisateur. Informatif uniquement, sans
   objectif chiffré associé, et sans mélange avec la fenêtre 30 jours.
3. **Alignement** — une ligne par critère défini dans l'objectif (poste, zone,
   contrat, entreprise), calculée sur les candidatures actives (statut hors
   `REJECTED`/`WITHDRAWN`). Si l'utilisateur n'a défini aucun critère, le bloc ne
   s'affiche pas du tout (pas de placeholder à 0% ou 50%).

Le critère "poste" est ajouté à `computeAlignment` (agrégat sur toutes les
candidatures) pour rejoindre les 3 autres critères déjà présents — actuellement
il n'existe qu'au niveau du score individuel par candidature (`computeAppScore`),
ce qui créait une incohérence entre les deux niveaux.

Le `GoalBadge` par candidature (`computeAppScore` / `computeAppScoreBreakdown`)
est conservé tel quel dans son principe : un % calculé uniquement sur les
critères définis, sans dénominateur fantôme. Seule la fonction de normalisation
texte sous-jacente change.

## Matching texte normalisé

Nouvelle fonction utilitaire `normalize(s: string): string` dans
`src/hooks/useGoals.ts` :
- minuscule
- suppression des accents (décomposition NFD + suppression des diacritiques)
- trim + réduction des espaces multiples

Appliquée aux deux côtés de chaque comparaison (objectif ET candidature —
actuellement seul le côté objectif était normalisé).

Règles de matching par critère :

- **Poste** : découpage en mots significatifs après normalisation, exclusion
  d'une petite liste de mots vides (`de`, `le`, `la`, `des`, `du`, `senior`,
  `junior`, `confirmé`). Match si au moins un mot du plus petit des deux
  ensembles (poste objectif vs poste candidature) apparaît comme sous-chaîne
  dans l'autre. Reste un matching simple par mots-clés, pas de distance
  d'édition.
- **Zone** : `.includes()` bidirectionnel après normalisation (gère par exemple
  "Île-de-France" vs "ile de france").
- **Entreprise** : `.includes()` bidirectionnel après normalisation.
- **Contrat** : `.includes()` bidirectionnel après normalisation (remplace la
  comparaison exacte actuelle). Corrige le cas "CDI-Graduate Program" (candidature)
  vs "CDI" (objectif) sans avoir à changer les listes d'options existantes dans
  les formulaires.

## Fichiers touchés

- `src/hooks/useGoals.ts`
  - Ajout de `normalize()`.
  - Refonte de `computeAppScoreBreakdown()` : nouvelles règles de matching
    ci-dessus.
  - Refonte de `computeAlignment()` : ajout du critère poste, suppression des
    valeurs par défaut (100 pour critère vide, 0 pour entreprise vide) — un
    critère non défini est simplement absent du résultat plutôt que de produire
    une valeur numérique arbitraire.
- `src/pages/GoalsPage.tsx`
  - Suppression de `computeScore()` et de l'affichage du score global.
  - Refonte de `QuantifiedGoals` : candidatures sur 30 jours glissants (au lieu
    du mois civil), section conversion historique séparée, suppression de la
    comparaison croisée entretiens/offres vs objectif mensuel.
  - Refonte de la section alignement : un bloc par critère défini uniquement.
- `src/components/applications/GoalBadge.tsx`, `src/utils/statusLabels.ts` —
  inchangés structurellement, bénéficient automatiquement du nouveau matching
  via `computeAppScoreBreakdown`.

Aucun changement de schéma de base de données n'est nécessaire — toutes les
données existent déjà dans `user_goals` et `"Application"`.

## Tests

Tests unitaires Vitest pour :
- `normalize()` : accents, casse, espaces multiples.
- `computeAppScoreBreakdown()` : mots de poste dans le désordre, contrat composé
  ("CDI-Graduate Program"), zone avec accent.
- `computeAlignment()` : aucun critère défini (résultat vide, pas de bloc),
  un seul critère défini, candidatures actives uniquement (exclusion
  REJECTED/WITHDRAWN du dénominateur).

Pas de test e2e pour ce changement (cohérent avec la politique de test du
projet, cf. CLAUDE.md).

## Hors scope

- Matching flou (Levenshtein / fuzzy) — explicitement écarté pour cette
  itération.
- Sous-objectifs dérivés des taux de conversion historiques de l'utilisateur
  (option écartée au profit de la transparence simple).
- Tout changement de schéma `user_goals` ou des formulaires de saisie d'objectif
  (les listes d'options contrat restent telles quelles).
