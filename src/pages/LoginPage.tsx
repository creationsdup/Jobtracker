import { useState } from 'react'
import { RotatingText } from '../components/auth/RotatingText'
import styles from './LoginPage.module.css'

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<unknown>
  onSignUp: (email: string, password: string) => Promise<unknown>
}

export function LoginPage({ onSignIn, onSignUp }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
          <span className={styles.logoIcon}>💼</span>
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
