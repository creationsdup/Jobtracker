import { createUsageTracker, type UsageEventName, type UsageSource, type UsageTracker } from './usage'

const FLUSH_INTERVAL_MS = 10_000

/** Le strict minimum attendu d'un client Supabase : de quoi insérer dans usage_events. */
export interface InsertOnlyClient {
  from(table: string): { insert(rows: Record<string, unknown>[]): Promise<{ error: { message: string } | null }> }
}

export interface SessionTargets {
  addClickListener(handler: () => void): () => void
  addVisibilityListener(handler: (visible: boolean) => void): () => void
  setInterval(handler: () => void, ms: number): () => void
  now(): number
}

let tracker: UsageTracker | null = null

export function configureUsage({ client, source = 'web' }: { client: InsertOnlyClient; source?: UsageSource }): void {
  // WHY: idempotent — useBoardAccess configure la mesure dès l'entrée dans le tableau, et l'effet
  // de App la configure aussi au montage ; le deuxième appel ne doit pas repartir de zéro.
  if (tracker) return
  tracker = createUsageTracker({
    source,
    send: async (events) => {
      // WHY: user_id n'est jamais envoyé — la colonne vaut auth.uid() par défaut, et la règle
      // d'écriture le vérifie. Rien à falsifier côté client.
      const rows = events.map(({ name, source: eventSource, props, occurred_at }) => ({
        name, source: eventSource, props, occurred_at,
      }))
      const { error } = await client.from('usage_events').insert(rows)
      if (error) throw new Error(error.message)
    },
  })
}

export function track(name: UsageEventName, props?: Record<string, unknown>): void {
  tracker?.track(name, props)
}

export function setUsageOptedOut(optedOut: boolean): void {
  tracker?.setOptedOut(optedOut)
}

/** Vide la file tout de suite. Utile là où aucune session ne le fait, comme la fenêtre de l'extension. */
export function flushUsage(): Promise<void> {
  return tracker?.flush() ?? Promise.resolve()
}

/** Pour les tests : oublie la configuration en cours. */
export function resetUsage(): void {
  tracker = null
}

/**
 * Une session = une période où l'onglet est au premier plan. Passer à un autre onglet la ferme,
 * revenir en ouvre une nouvelle : c'est ce qui donne un sens à « clics par session ».
 */
export function startUsageSession(targets: SessionTargets): () => void {
  const current = tracker
  if (!current) return () => {}

  let startedAt = targets.now()
  let open = false

  function begin() {
    if (open) return
    open = true
    startedAt = targets.now()
    current.track('session_started')
  }

  function end() {
    if (!open) return
    open = false
    current.track('session_ended', {
      clicks: current.takeClicks(),
      duration_s: Math.max(0, Math.round((targets.now() - startedAt) / 1000)),
    })
    void current.flush()
  }

  begin()
  const offClick = targets.addClickListener(() => current.countClick())
  const offVisibility = targets.addVisibilityListener((visible) => (visible ? begin() : end()))
  const stopInterval = targets.setInterval(() => void current.flush(), FLUSH_INTERVAL_MS)

  return () => {
    offClick()
    offVisibility()
    stopInterval()
    end()
  }
}

export function browserTargets(): SessionTargets {
  return {
    addClickListener(handler) {
      // WHY: en capture, pour compter aussi les clics dont un gestionnaire arrête la propagation.
      document.addEventListener('click', handler, true)
      return () => document.removeEventListener('click', handler, true)
    },
    addVisibilityListener(handler) {
      const onVisibility = () => handler(document.visibilityState === 'visible')
      // WHY: pagehide couvre la fermeture de l'onglet et le retour arrière, où visibilitychange
      // n'est pas garanti sur les navigateurs mobiles.
      const onHide = () => handler(false)
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('pagehide', onHide)
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('pagehide', onHide)
      }
    },
    setInterval(handler, ms) {
      const id = window.setInterval(handler, ms)
      return () => window.clearInterval(id)
    },
    now: () => Date.now(),
  }
}
