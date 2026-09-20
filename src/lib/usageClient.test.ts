import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureUsage, resetUsage, setUsageOptedOut, startUsageSession, track,
  type InsertOnlyClient, type SessionTargets,
} from './usageClient'

function fakeClient() {
  const inserted: unknown[][] = []
  const insert = vi.fn(async (rows: Record<string, unknown>[]) => { inserted.push(rows); return { error: null } })
  return { inserted, insert, client: { from: () => ({ insert }) } satisfies InsertOnlyClient }
}

function fakeTargets() {
  let clickHandler = () => {}
  let visibilityHandler = (_visible: boolean) => {}
  let time = 0
  return {
    click: () => clickHandler(),
    hide: () => visibilityHandler(false),
    show: () => visibilityHandler(true),
    advance: (seconds: number) => { time += seconds * 1000 },
    targets: {
      addClickListener: (handler) => { clickHandler = handler; return () => { clickHandler = () => {} } },
      addVisibilityListener: (handler) => { visibilityHandler = handler; return () => { visibilityHandler = () => {} } },
      setInterval: () => () => {},
      now: () => time,
    } satisfies SessionTargets,
  }
}

beforeEach(() => resetUsage())

describe('usageClient', () => {
  it('ne fait rien tant que la mesure n\'est pas configurée', () => {
    expect(() => track('session_started')).not.toThrow()
    const { targets } = fakeTargets()
    const stop = startUsageSession(targets)
    expect(() => stop()).not.toThrow()
  })

  it('insère les événements dans usage_events sans envoyer d\'identifiant', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    track('application_added', { status: 'SENT' })
    const { targets } = fakeTargets()
    const stop = startUsageSession(targets)
    stop()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as Record<string, unknown>[]
    expect(rows.some((row) => row.name === 'application_added' && row.source === 'web')).toBe(true)
    // WHY: user_id vient du défaut auth.uid() en base ; le client ne doit jamais l'envoyer.
    expect(rows.every((row) => !('user_id' in row))).toBe(true)
  })

  it('ouvre la session, compte les clics et les rend au masquage', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.click()
    scene.click()
    scene.advance(42)
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string; props: Record<string, unknown> }[]
    expect(rows.filter((row) => row.name === 'session_started')).toHaveLength(1)
    expect(rows.find((row) => row.name === 'session_ended')?.props).toEqual({ clicks: 2, duration_s: 42 })
  })

  it('rouvre une session au retour au premier plan', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.hide()
    scene.show()
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string }[]
    expect(rows.filter((row) => row.name === 'session_started')).toHaveLength(2)
    expect(rows.filter((row) => row.name === 'session_ended')).toHaveLength(2)
  })

  it('ne ferme pas deux fois la même session', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    const scene = fakeTargets()
    const stop = startUsageSession(scene.targets)
    scene.hide()
    stop()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const rows = fake.inserted.flat() as { name: string }[]
    expect(rows.filter((row) => row.name === 'session_ended')).toHaveLength(1)
  })

  it('n\'envoie plus rien après un refus', async () => {
    const fake = fakeClient()
    configureUsage({ client: fake.client })
    setUsageOptedOut(true)
    track('application_added')
    const scene = fakeTargets()
    startUsageSession(scene.targets)
    scene.hide()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fake.inserted.flat()).toHaveLength(0)
  })

  it('avale une erreur renvoyée par Supabase', async () => {
    const insert = vi.fn(async () => ({ error: { message: 'refusé par la règle' } }))
    configureUsage({ client: { from: () => ({ insert }) } satisfies InsertOnlyClient })
    track('application_added')
    const scene = fakeTargets()
    const stop = startUsageSession(scene.targets)
    expect(() => stop()).not.toThrow()
  })
})
