import { describe, expect, it, vi } from 'vitest'
import { createUsageTracker, type UsageEvent } from './usage'

function fakeSender() {
  const batches: UsageEvent[][] = []
  return { batches, send: async (events: UsageEvent[]) => { batches.push(events) } }
}

describe('createUsageTracker', () => {
  it('met un événement en file sans l\'envoyer tout de suite', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    expect(tracker.pending()).toBe(1)
    expect(sender.batches).toHaveLength(0)
  })

  it('horodate avec l\'horloge fournie et marque la source', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, source: 'extension', now: () => 1_700_000_000_000 })
    tracker.track('extension_opened')
    void tracker.flush()
    expect(sender.batches[0][0]).toMatchObject({
      name: 'extension_opened',
      source: 'extension',
      occurred_at: new Date(1_700_000_000_000).toISOString(),
    })
  })

  it('envoie et vide la file au flush', async () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    await tracker.flush()
    expect(sender.batches).toEqual([[expect.objectContaining({ name: 'session_started' })]])
    expect(tracker.pending()).toBe(0)
  })

  it('n\'envoie rien quand la file est vide', async () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    await tracker.flush()
    expect(sender.batches).toHaveLength(0)
  })

  it('envoie tout seul dès que le lot est plein', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, batchSize: 3 })
    tracker.track('session_started')
    tracker.track('session_started')
    expect(sender.batches).toHaveLength(0)
    tracker.track('session_started')
    expect(sender.batches[0]).toHaveLength(3)
  })

  it('cesse d\'enregistrer au-delà du plafond', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send, batchSize: 1000, maxEvents: 2 })
    tracker.track('session_started')
    tracker.track('session_started')
    tracker.track('session_started')
    expect(tracker.pending()).toBe(2)
  })

  it('n\'enregistre plus rien et jette la file après un refus', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.track('session_started')
    tracker.countClick()
    tracker.setOptedOut(true)
    tracker.track('session_started')
    expect(tracker.pending()).toBe(0)
    tracker.countClick()
    expect(tracker.takeClicks()).toBe(0)
  })

  it('avale une erreur d\'envoi sans rejeter ni remettre en file', async () => {
    const send = vi.fn(async () => { throw new Error('réseau coupé') })
    const tracker = createUsageTracker({ send })
    tracker.track('session_started')
    await expect(tracker.flush()).resolves.toBeUndefined()
    expect(tracker.pending()).toBe(0)
  })

  it('compte les clics et remet le compteur à zéro quand on le lit', () => {
    const sender = fakeSender()
    const tracker = createUsageTracker({ send: sender.send })
    tracker.countClick()
    tracker.countClick()
    expect(tracker.takeClicks()).toBe(2)
    expect(tracker.takeClicks()).toBe(0)
  })
})
