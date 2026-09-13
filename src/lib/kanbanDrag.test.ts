import { describe, expect, it } from 'vitest'
import { applyPendingMoves, resolveDropStatus, settlePendingMoves, withMove, withoutMove } from './kanbanDrag'
import type { Application, ApplicationStatus } from './types'

function app(id: string, status: ApplicationStatus): Application {
  return { id, status, company: `Entreprise ${id}`, position: 'Poste' } as Application
}

const APPS = [app('a', 'WISHLIST'), app('b', 'APPLIED'), app('c', 'INTERVIEW')]

describe('resolveDropStatus', () => {
  it('renvoie le statut de la colonne survolée', () => {
    expect(resolveDropStatus('OFFER', APPS)).toBe('OFFER')
  })

  it('renvoie le statut de la carte survolée', () => {
    expect(resolveDropStatus('c', APPS)).toBe('INTERVIEW')
  })

  it('renvoie null hors de toute colonne ou pour un identifiant inconnu', () => {
    expect(resolveDropStatus(null, APPS)).toBeNull()
    expect(resolveDropStatus(undefined, APPS)).toBeNull()
    expect(resolveDropStatus('zzz', APPS)).toBeNull()
  })
})

describe('applyPendingMoves', () => {
  it('affiche les cartes déplacées dans leur nouvelle colonne sans toucher aux autres', () => {
    const displayed = applyPendingMoves(APPS, { b: 'OFFER' })
    expect(displayed.map((a) => a.status)).toEqual(['WISHLIST', 'OFFER', 'INTERVIEW'])
    expect(displayed[0]).toBe(APPS[0])
    expect(displayed[2]).toBe(APPS[2])
    expect(APPS[1].status).toBe('APPLIED')
  })

  it('renvoie la même liste quand rien n’est en attente', () => {
    expect(applyPendingMoves(APPS, {})).toBe(APPS)
  })
})

describe('settlePendingMoves', () => {
  it('oublie les déplacements confirmés par le serveur et garde ceux en attente', () => {
    const pending = { b: 'OFFER', c: 'REJECTED' } as const
    const confirmed = [app('a', 'WISHLIST'), app('b', 'OFFER'), app('c', 'INTERVIEW')]
    expect(settlePendingMoves(pending, confirmed)).toEqual({ c: 'REJECTED' })
  })

  it('oublie les déplacements de cartes supprimées', () => {
    expect(settlePendingMoves({ zzz: 'OFFER' }, APPS)).toEqual({})
  })

  it('renvoie le même objet quand rien n’a changé', () => {
    const pending = { b: 'OFFER' } as const
    expect(settlePendingMoves(pending, APPS)).toBe(pending)
  })
})

describe('withMove / withoutMove', () => {
  it('ajoute puis retire un déplacement sans modifier l’objet d’origine', () => {
    const empty = {}
    const moved = withMove(empty, 'a', 'APPLIED')
    expect(moved).toEqual({ a: 'APPLIED' })
    expect(empty).toEqual({})
    expect(withoutMove(moved, 'a')).toEqual({})
    expect(moved).toEqual({ a: 'APPLIED' })
  })
})
