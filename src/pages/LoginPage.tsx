import { useState } from 'react'

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)' }}
    >
      <div className="card w-full max-w-sm p-10 shadow-[var(--shadow-md)]">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💼</div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">JobTracker</h1>
          <p className="text-xs text-[var(--color-muted)] mt-1">Suivez vos candidatures simplement</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Email</label>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Mot de passe</label>
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

          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted)] mt-5">
          {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            className="text-[var(--color-primary)] underline bg-transparent border-0 cursor-pointer"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
