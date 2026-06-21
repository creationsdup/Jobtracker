# Liquid Glass redesign — design spec

Date: 2026-06-21
Status: Approved by user, ready for implementation planning

## Contexte

Suite à l'adaptation responsive de l'app pour iPhone (Capacitor), l'utilisateur a demandé un restyle complet vers l'esthétique "Liquid Glass" d'Apple (iOS 26), avec une référence visuelle concrète (mockup Dashboard mobile fourni). En cours de cadrage, l'utilisateur a aussi signalé que l'interface est "trop chargée visuellement" — la simplification de la densité d'information est donc intégrée à ce même chantier plutôt que traitée séparément.

Ce spec remplace l'idée initiale d'un toggle clair/sombre : ce n'est plus un changement de thème commutable, mais l'adoption d'**un seul nouveau design fixe** pour toute l'app.

## Référence visuelle (mockup Dashboard mobile)

- Bandeau héro plein écran en haut (gradient bleu nuit profond avec glow subtil), couvrant la zone status bar + salutation + ligne de stats.
- Salutation ("Bonjour {prénom}" + emoji + date) en texte clair directement sur le gradient, pas de carte.
- Avatar de profil + bouton recherche : bulles rondes translucides ("verre") flottant sur le héro.
- Ligne de 5 stats : icônes en bulles colorées + label + valeur, flottant directement sur le héro, sans cadre de carte.
- Sous le héro : bascule vers fond clair, contenu en cartes blanches élevées (ombre, coins arrondis), structure proche de l'existant.
- Bottom nav : pilule flottante en verre dépoli (insets latéraux/bas, pas edge-to-edge), bouton central "+" surélevé en cercle plein accent.

## Décisions de cadrage (issues du dialogue)

1. **Portée** : toute l'app (pas seulement le Dashboard) — chaque page reçoit le même bandeau héro mobile, garde son contenu actuel en cartes claires en dessous.
2. **Pas de toggle clair/sombre** : un seul design, fixe, pour tous les utilisateurs.
3. **Desktop** : pas de bandeau héro dans la zone de contenu — la sidebar existante (déjà un gradient sombre) reçoit le traitement verre (translucidité + flou). Le contenu desktop garde sa structure actuelle de cartes.
4. **Simplification intégrée** : sur Dashboard, Bibliothèque et Objectifs, une seule section reste ouverte par défaut (la plus importante), les sections secondaires passent en accordéon repliable. Candidatures ne change pas structurellement (déjà une vue unique).
5. **Pas de changement backend.**

## Architecture

### Tokens de couleur (`src/styles/tokens.css`)

Ajout, sans modifier les tokens clairs existants :

```css
--gradient-hero: linear-gradient(160deg, #0A2A4A 0%, #0F3D63 45%, #0A2A4A 100%);
--glass-bg-dark: rgba(15, 32, 56, 0.55);
--glass-border-dark: rgba(255, 255, 255, 0.18);
--glass-bg-light: rgba(255, 255, 255, 0.6);
--glass-blur: blur(20px) saturate(160%);
--glass-blur-light: blur(12px) saturate(140%);
```

### Composants nouveaux

- **`src/components/layout/HeroHeader.tsx`** — bandeau mobile (`md:hidden`) avec `paddingTop: env(safe-area-inset-top)`, fond `var(--gradient-hero)`. Props : `title` (ou `greeting` pour le mode Dashboard avec prénom/date), `actions` (avatar + recherche en bulles verre), `stats?` (slot optionnel pour la ligne de stats Dashboard).
- **`src/components/ui/GlassStatRow.tsx`** — remplace le scroll-strip de stats actuel sur Dashboard : icônes en bulles colorées + label + valeur, sans conteneur carte, posées sur le héro.
- **`src/components/ui/CollapsibleSection.tsx`** — wrapper généralisant `DashboardCard` : ajoute un chevron d'ouverture/fermeture, état persisté en `localStorage` par clé de section (`jobtracker-section-{id}`), replié par défaut sauf la section "principale" passée en prop `defaultOpen`.

### Composants modifiés

- **`MobileBottomNav.tsx`** — refonte : pilule flottante (`mx-4 mb-3 rounded-full`), `--glass-bg-dark` + `backdrop-filter: var(--glass-blur)`, bouton central "+" surélevé (`translate-y-[-12px]`, cercle plein `--color-accent`, ombre), branché sur l'action `onAddApplication` déjà existante dans le contexte `AppShell`.
- **`Sidebar.tsx`** (desktop) — fond passe de gradient opaque à `var(--gradient-hero)` + `backdrop-filter: var(--glass-blur)` + transparence ; structure de nav inchangée.
- **`.card` (src/index.css)** — variante `.card-glass` optionnelle : `background: var(--glass-bg-light)` + `backdrop-filter: var(--glass-blur-light)` au lieu de `#fff` plein, utilisée sur les cartes de contenu sous le héro.
- **`DashboardPage.tsx`** — intègre `HeroHeader` (mode greeting + `GlassStatRow`) sur mobile ; les sections sous le héro (`Objectif du mois`, `Pipeline`, `Candidatures par semaine`, `Activité récente`) passent dans `CollapsibleSection` (repliées par défaut) ; `Prochaine meilleure action` reste ouverte (`defaultOpen`).
- **`LibraryPage.tsx`** — `HeroHeader` simple (titre) sur mobile ; sections `CV importés`/`Analyses ATS`/`Suggestions` passent en `CollapsibleSection` repliées ; la section Éléments (déjà à onglets) reste ouverte par défaut.
- **`GoalsPage.tsx`** — `HeroHeader` simple sur mobile ; `MainObjectiveCard` reste ouverte ; `Score de cohérence`, `Distribution`, `Recommandations`, `Comparaison` passent en `CollapsibleSection`.
- **`ApplicationsPage.tsx`** — `HeroHeader` simple (titre + bouton "Nouvelle candidature" en action du header) sur mobile ; pas de changement structurel du contenu (liste/grille/kanban).

### Desktop

Aucun nouveau composant héro côté desktop. Seul changement : `Sidebar.tsx` adopte le traitement verre (gradient + blur + transparence). Les cartes de contenu desktop peuvent optionnellement recevoir `.card-glass`, mais ce n'est pas un changement structurel.

## Hors scope

- Toggle clair/sombre (abandonné, voir décision 2).
- Tout changement de schéma Supabase ou de logique métier.
- Remaniement de la page Candidatures (déjà une vue unique sans empilement de sections).

## Risques / points d'attention

- `backdrop-filter` est supporté par WKWebView (Capacitor iOS) mais nécessite de vérifier le rendu réel sur simulateur après implémentation (pas seulement Chrome desktop).
- La persistance `localStorage` de l'état ouvert/fermé par section doit avoir une valeur par défaut sûre (replié sauf section principale) même si la clé n'existe pas encore.
- Le contraste texte clair sur le gradient héro doit rester lisible (vérifier WCAG AA a minima sur le texte de la salutation et des stats).
