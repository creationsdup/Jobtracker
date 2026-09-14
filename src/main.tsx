import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { I18nProvider } from './lib/i18n/I18nContext'
import { legalPageFromPath } from './lib/legalRoutes'

// WHY: les pages légales doivent se lire sans code d'accès ni session. Elles sont choisies ici,
// avant App (donc sans charger l'authentification ni les candidatures), dans un chunk à part.
const LegalPage = lazy(() => import('./pages/legal/LegalPage').then((m) => ({ default: m.LegalPage })))
const legalPage = legalPageFromPath(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      {legalPage ? (
        <Suspense fallback={null}>
          <LegalPage page={legalPage} />
        </Suspense>
      ) : (
        <App />
      )}
    </I18nProvider>
  </StrictMode>,
)
