import { useState } from 'react'
import { RotatingText } from '../components/auth/RotatingText'
import { JobTrackerLogo } from '../components/ui/JobTrackerLogo'
import styles from './LoginPage.module.css'

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<unknown>
  onSignUp: (email: string, password: string) => Promise<unknown>
  onSignInWithGoogle: () => Promise<unknown>
}

export function LoginPage({ onSignIn, onSignUp, onSignInWithGoogle }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    const err = await onSignInWithGoogle()
    if (err) setError((err as { message: string }).message)
    setGoogleLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = mode === 'login'
      ? await onSignIn(email, password)
      : await onSignUp(email, password)
    if (err) setError((err as { message: string }).message)
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      {/* ─── Panneau gauche 28% ─── */}
      <div className={styles.left}>
        {/* Cercles décoratifs */}
        <div className={`${styles.circle} ${styles.circleTop}`} />
        <div className={`${styles.circle} ${styles.circleMid}`} />
        <div className={`${styles.circle} ${styles.circleSmall}`} />

        {/* Logo */}
        <div className={styles.logo}>
          <JobTrackerLogo size={48} onColor />
          JobTracker
        </div>

        {/* Texte rotatif + stats */}
        <div className={styles.leftBottom}>
          <p className={styles.tagSmall}>Pourquoi JobTracker ?</p>
          <RotatingText />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>3×</span>
              <span className={styles.statLabel}>plus de rappels</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>gratuit</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>∞</span>
              <span className={styles.statLabel}>candidatures</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Panneau droit 72% ─── */}
      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.formTitle}>
            {mode === 'login' ? 'Bon retour 👋' : 'Crée ton compte'}
          </h1>
          <p className={styles.formSub}>
            {mode === 'login'
              ? 'Connecte-toi pour accéder à tes candidatures.'
              : "Lance ta recherche d’emploi sur la bonne voie."}
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>ou</span>
            <span className={styles.dividerLine} />
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoFocus
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Mot de passe</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={`btn btn-primary btn-full ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </form>

          <p className={styles.switchRow}>
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
            <button
              className={styles.switchBtn}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
