import { useState } from 'react'
import { JobTrackerLogo } from '../components/ui/JobTrackerLogo'
import { useTranslation } from '@/lib/i18n/I18nContext'
import styles from './LoginPage.module.css'

interface ResetPasswordPageProps {
  onSubmit: (password: string) => Promise<unknown>
}

export function ResetPasswordPage({ onSubmit }: ResetPasswordPageProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError(t('resetPassword.tooShort')); return }
    if (password !== confirmPassword) { setError(t('resetPassword.mismatch')); return }

    setLoading(true)
    const err = await onSubmit(password)
    setLoading(false)
    if (err) { setError((err as { message: string }).message); return }
    setDone(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={`${styles.circle} ${styles.circleTop}`} />
        <div className={`${styles.circle} ${styles.circleMid}`} />
        <div className={`${styles.circle} ${styles.circleSmall}`} />
        <div className={styles.logo}>
          <JobTrackerLogo size={48} onColor />
          JobTracker
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formBox}>
          <h1 className={styles.formTitle}>{t('resetPassword.title')}</h1>
          <p className={styles.formSub}>
            {done ? t('resetPassword.subDone') : t('resetPassword.subPending')}
          </p>

          {done ? (
            <div className={styles.successBox}>
              {t('resetPassword.done')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('resetPassword.newPassword')}</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('resetPassword.confirmPassword')}</label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
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
                {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
