# Refonte complète : Objectifs + Matching d'offres

> Supersède `2026-06-19-goals-scoring-design.md`. Cette spec remplace
> entièrement l'approche précédente (qui corrigeait l'ancien système) par une
> réécriture complète demandée par l'utilisateur : nouveau modèle d'objectif
> plus riche, nouvelle fonction de matching à 7 catégories, nouveau composant
> de détail de score.

## Contexte et périmètre

L'ancien système (`computeAppScore`/`computeAppScoreBreakdown`/`computeAlignment`
dans `src/hooks/useGoals.ts`) ne matche que 4 critères (poste, zone, contrat,
entreprise), avec un matching texte fragile (`.includes()` brut) qui produit
des scores incohérents (beaucoup d'offres à 33%, offres pertinentes mal
notées).

Périmètre de la réécriture :
- Remplacer entièrement la logique de scoring par `calculateJobMatch()`.
- Étendre le modèle d'objectif (`UserGoal` / table `user_goals`) avec les
  nouveaux critères (secteurs, mots-clés positifs/négatifs, niveau
  d'expérience, intitulé cible, priorités informatives).
- Refaire la page Objectifs (cartes objectif, critères, score global,
  répartition, recommandations).
- Refaire l'affichage du score dans les listes de candidatures (badge +
  modale de détail) à la place de l'ancien `GoalBadge`/tooltip.
- Ne pas toucher : Dashboard, Bibliothèque, formulaire de candidature, table
  `Application` (pas de nouveau champ description/sector — voir ci-dessous).
- Ne pas casser : la suppression de `Application` reste interdite, aucune
  candidature existante n'est supprimée ou migrée destructivement.

## Décisions d'adaptation au schéma réel

1. **Pas de champ `description`/`sector` sur `Application`.** Le matching
   secteur et mots-clés analyse le texte disponible : `position`, `company`,
   `notes` (et `contractType`/`location` pour leurs catégories dédiées). Si
   `notes` est vide, c'est simplement remonté dans `missingData` — le score
   reste calculé sur ce qui est disponible, jamais à 0 pour absence de
   description.
2. **"Priorités de scoring" est un champ informatif**, pas un levier de
   pondération. Les poids (25/15/15/15/10/15/5) sont fixes et documentés dans
   le code. Le champ est un texte libre affiché dans la carte "Objectif
   principal", sans effet sur `calculateJobMatch()`.
3. **Niveau d'expérience requis par l'offre** : déduit du texte (position +
   notes) via une détection de motifs ("5 ans", "junior", "confirmé",
   "senior", "débutant accepté", etc.), pas un champ structuré séparé.

## Modèle de données

### `UserGoal` étendu (`src/lib/types.ts`)

```typescript
export interface UserGoal {
  id: string
  user_id: string
  target_title: string | null          // nouveau — intitulé cible libre
  target_roles: string[]               // remplace target_positions (renommé pour clarté)
  contract_types: string[]
  locations: string[]                  // remplace zones (renommé)
  target_companies: string[]
  sectors: string[]                    // nouveau
  keywords_wanted: string[]            // nouveau
  keywords_excluded: string[]          // nouveau
  experience_level: string[]           // nouveau
  scoring_priorities: string | null    // nouveau — texte libre, informatif
  target_date: string | null
  personal_target: number | null
  created_at: string
  updated_at: string
}
```

Renommage `target_positions → target_roles` et `zones → locations` pour
matcher le vocabulaire de la spec utilisateur et lever l'ambiguïté
"zone géographique" vs "liste de villes/pays". `type` (champ legacy déjà
documenté comme non-utilisé dans CLAUDE.md) est supprimé du type TypeScript ;
la colonne SQL reste en base mais n'est plus lue ni écrite.

### Migration SQL (`supabase/migrations/`)

Une seule migration additive (pas de perte de données) :

```sql
alter table user_goals
  add column if not exists target_title text,
  add column if not exists sectors text[] default '{}',
  add column if not exists keywords_wanted text[] default '{}',
  add column if not exists keywords_excluded text[] default '{}',
  add column if not exists experience_level text[] default '{}',
  add column if not exists scoring_priorities text;

-- Renommage des colonnes existantes pour clarté (données conservées)
alter table user_goals rename column target_positions to target_roles;
alter table user_goals rename column zones to locations;
```

Aucune table `Application` modifiée. Aucune candidature supprimée.

## Nouveaux fichiers

- `src/types/jobMatching.ts` — types purs : `JobMatchInput` (vue normalisée
  d'une candidature pour le matching : title, company, location, contract,
  text — agrégat de notes, niveauDétecté), `MatchLevel`, `MatchConfidence`,
  `CategoryScores`, `MatchResult`.
- `src/lib/jobMatching.ts` — toute la logique métier :
  - `normalizeText(text: string): string`
  - `calculateJobMatch(job: JobMatchInput, objective: UserGoal): MatchResult`
  - fonctions privées par catégorie : `scoreTitle`, `scoreContract`,
    `scoreLocation`, `scoreCompany`, `scoreSector`, `scoreKeywords`,
    `scoreExperience`
  - `applicationToJobMatchInput(app: Application): JobMatchInput` — adaptateur
- `src/components/applications/MatchScoreBadge.tsx` — remplace `GoalBadge.tsx`
  (supprimé). Affiche `XX% Niveau` avec couleur par niveau, ouvre la modale au
  clic (au lieu d'un simple tooltip).
- `src/components/applications/MatchDetailsModal.tsx` — détail au clic :
  score global, 7 barres de catégorie, raisons, points d'attention, données
  manquantes.

## Fichiers modifiés

- `src/hooks/useGoals.ts` — supprime `computeAppScore`,
  `computeAppScoreBreakdown`, `computeAlignment`, `ScoreCriterion`,
  `GoalAlignment` (tout l'ancien scoring). Garde uniquement le hook de
  lecture/écriture `useGoals()`, mis à jour pour les nouveaux champs.
- `src/pages/GoalsPage.tsx` — réécriture complète selon section 11 de la
  demande utilisateur (5 cartes : Objectif principal, Critères de recherche,
  Score global de cohérence, Répartition des candidatures, Recommandations).
  Supprime `computeScore`, `QuantifiedGoals`, `WeeklyProgressChart`,
  `StrategyGrid`, `GlobalScoreCard` existants — remplacés par les 5 nouvelles
  cartes. `EditGoalModal` étendu avec les nouveaux champs (intitulé cible,
  secteurs, mots-clés +/-, niveau d'expérience, priorités).
- `src/components/applications/CandidateTable.tsx`,
  `src/components/applications/ApplicationCard.tsx` — remplacent
  `GoalBadge` par `MatchScoreBadge`, branché sur `calculateJobMatch`.
- `src/utils/statusLabels.ts` — `scoreTierColor` remplacé par une fonction
  basée sur les 5 niveaux (`Très cohérent` → `Hors cible`) avec les bornes de
  la section 10 de la demande (≥75 / ≥60 / ≥45 / ≥30 / <30 — bornes exactes
  affinées pendant l'implémentation pour matcher les 4 exemples de test).

## Pondération et règles de score (reprises telles que spécifiées)

| Catégorie | Poids |
|---|---|
| Intitulé du poste | 25% |
| Contrat | 15% |
| Localisation | 15% |
| Entreprise | 15% |
| Secteur | 10% |
| Mots-clés métier | 15% |
| Niveau d'expérience | 5% |

Règles communes à toutes les catégories :
- Donnée absente → score neutre **50**, entrée ajoutée à `missingData`,
  confiance globale dégradée (jamais 0 pour absence d'info).
- `reasons[]` accumule les justifications positives (ex: "Le poste est proche
  de votre objectif"), `warnings[]` les points d'attention (ex: mots-clés
  négatifs détectés, secteur peu aligné).
- Mots-clés négatifs (`keywords_excluded`) : pénalité de 5 à 15 points sur le
  score global selon le nombre/gravité des occurrences, jamais un score à 0
  automatique.
- Localisation : matching par proximité simple — alias statique pour la
  région Île-de-France (Paris, Courbevoie, Puteaux, La Défense, Boulogne-
  Billancourt, Nanterre, Saint-Denis → considérées équivalentes à "Paris" /
  "Île-de-France" si l'un des deux est dans l'objectif), "France" en match
  partiel si l'objectif cible une ville/région française, pays étranger en
  score faible (pas 0) si l'objectif est franco-centré.
- Niveaux (`MatchLevel`) : Très cohérent (≥75), Cohérent (≥60), Moyen (≥45),
  Peu cohérent (≥30), Hors cible (<30) — seuils choisis pour satisfaire les 4
  cas de test de la section 14 (90/45/95/30 environ) ; ajustés si besoin
  pendant les tests unitaires tant que les 4 résultats attendus sont dans les
  fourchettes données.

## UI — Onglet Objectifs (5 cartes)

1. **Objectif principal** — `target_title`, contrat recherché, localisation,
   échéance (`target_date`).
2. **Critères de recherche** — postes ciblés (`target_roles`), secteurs,
   entreprises, mots-clés positifs, mots-clés négatifs.
3. **Score global de cohérence** — moyenne de `totalScore` sur les
   candidatures actives (hors REJECTED/WITHDRAWN), avec le même
   garde-fou que l'ancien système : si aucune candidature, n'affiche pas un
   chiffre fantôme (état vide explicite).
4. **Répartition des candidatures** — compte par niveau (Très cohérent →
   Hors cible), barres ou anneau coloré.
5. **Recommandations** — règles simples basées sur les données agrégées
   (ex : objectif trop large si `target_roles.length <= 1` et faible
   variance de score ; offres hors zone si `locationScore` moyen bas ;
   secteur dominant cohérent si une majorité de candidatures ont un bon
   `sectorScore`; données insuffisantes si `missingData` fréquent).

## UI — Score par candidature

- `MatchScoreBadge` dans `CandidateTable` et `ApplicationCard` : remplace
  l'ancien `GoalBadge`, affiche `XX% Niveau` coloré par niveau.
- Clic → `MatchDetailsModal` : score global, 7 barres de catégorie, listes
  `reasons`/`warnings`/`missingData` (format donné en section 10 de la
  demande).

## Tests

Tests unitaires Vitest sur `src/lib/jobMatching.ts` :
- `normalizeText()` : accents, casse, espaces.
- Les 4 cas de la section 14 de la demande (Keolis Graduate Program,
  Amazon logistique, EssilorLuxottica chef de projet, technicien
  maintenance Lyon) — vérifie que `totalScore` tombe dans la fourchette
  attendue pour chacun.
- Cas "donnée manquante" : localisation vide → `locationScore === 50` et
  présence dans `missingData`, jamais de score global à 0 pour ce seul
  motif.
- `computeAlignment`/ancien système : tests existants supprimés avec le code
  qu'ils couvraient.

Pas de test e2e (cohérent avec CLAUDE.md).

## Vérification finale

`npm run build` doit passer sans erreur TypeScript après la réécriture
(suppression complète des imports vers les anciennes fonctions/types
supprimés : `ScoreCriterion`, `GoalAlignment`, `scoreTierColor` ancien
format).

## Hors scope

- Pondérations personnalisables par l'utilisateur (le champ "priorités" reste
  informatif pour cette itération).
- Nouveau champ `description`/`sector` structuré sur `Application`.
- Matching flou/fuzzy (Levenshtein) au-delà de la normalisation accents/casse
  et du matching par mots-clés déjà détaillé.
