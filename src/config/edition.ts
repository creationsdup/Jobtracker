import { featuresFor, type Edition, type FeatureFlags } from './editionCore'

// Édition injectée au build par vite.config.ts (define).
// WHY: FEATURES est calculé par un appel de fonction, que Rollup ne garantit pas de replier.
// Pour protéger un import() ou un React.lazy de code IA / Objectifs / Bibliothèque, écrire la
// condition en littéral `__APP_EDITION__ === 'full'`, sinon les chunks restent dans dist/.
// Voir docs/superpowers/specs/2026-09-13-lite-edition-design.md §3.3.
export const EDITION: Edition = __APP_EDITION__
export const FEATURES: FeatureFlags = featuresFor(EDITION)
