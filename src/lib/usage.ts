/**
 * Mesure d'usage (édition lite) : dictionnaire fermé d'actions, mise en file et envoi par lots.
 * Module pur — aucune dépendance React, Supabase ou navigateur, pour que l'extension le réutilise
 * tel quel et que tout soit testable. Le branchement navigateur vit dans usageClient.ts.
 */

export const USAGE_EVENT_NAMES = [
  'board_created', 'board_opened', 'session_started', 'session_ended',
  'application_added', 'application_status_changed', 'application_opened',
  'application_edited', 'application_deleted', 'follow_up_marked', 'view_switched',
  'code_revealed', 'code_rotated', 'email_secured',
  'extension_connected', 'extension_opened', 'extension_application_added',
  'extension_duplicate_blocked',
] as const

export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number]
export type UsageSource = 'web' | 'extension'

export interface UsageEvent {
  name: UsageEventName
  source: UsageSource
  props: Record<string, unknown>
  occurred_at: string
}

export interface UsageTrackerOptions {
  send: (events: UsageEvent[]) => Promise<void>
  source?: UsageSource
  now?: () => number
  batchSize?: number
  maxEvents?: number
}

export interface UsageTracker {
  track(name: UsageEventName, props?: Record<string, unknown>): void
  flush(): Promise<void>
  countClick(): void
  takeClicks(): number
  setOptedOut(optedOut: boolean): void
  pending(): number
}

export const DEFAULT_BATCH_SIZE = 20
/** WHY: garde-fou contre une boucle de code accidentelle, pas contre un abus (la base n'est pas en jeu). */
export const DEFAULT_MAX_EVENTS = 500

export function createUsageTracker(options: UsageTrackerOptions): UsageTracker {
  const {
    send,
    source = 'web',
    now = Date.now,
    batchSize = DEFAULT_BATCH_SIZE,
    maxEvents = DEFAULT_MAX_EVENTS,
  } = options

  let queue: UsageEvent[] = []
  let recorded = 0
  let clicks = 0
  let optedOut = false

  async function flush(): Promise<void> {
    if (queue.length === 0) return
    const batch = queue
    queue = []
    try {
      await send(batch)
    } catch {
      // WHY: jamais de nouvelle tentative. Un lot perdu vaut mieux qu'une file qui grossit hors
      // ligne puis part d'un coup, refusée de toute façon par la fenêtre d'une heure de la règle RLS.
    }
  }

  return {
    track(name, props = {}) {
      if (optedOut || recorded >= maxEvents) return
      recorded += 1
      queue.push({ name, source, props, occurred_at: new Date(now()).toISOString() })
      if (queue.length >= batchSize) void flush()
    },
    flush,
    countClick() {
      if (!optedOut) clicks += 1
    },
    takeClicks() {
      const total = clicks
      clicks = 0
      return total
    },
    setOptedOut(value) {
      optedOut = value
      if (value) {
        queue = []
        clicks = 0
      }
    },
    pending() {
      return queue.length
    },
  }
}
