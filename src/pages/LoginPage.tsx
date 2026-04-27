interface LoginPageProps {
  onLogin: (name: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = (new FormData(e.currentTarget).get('username') as string).trim()
    if (name) onLogin(name)
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
            <label className="text-xs font-medium">Nom d'utilisateur</label>
            <input className="input" name="username" placeholder="Votre prénom" required autoFocus />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2">
            Commencer
          </button>
        </form>
      </div>
    </div>
  )
}
