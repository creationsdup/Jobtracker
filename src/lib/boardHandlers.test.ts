import { describe, expect, it } from 'vitest'
import { hashAccessCode, isValidAccessCode } from './accessCode'
import {
  handleCreate,
  handleDelete,
  handleOpen,
  handleRotate,
  type BoardCaller,
  type BoardDeps,
} from '../../supabase/functions/_shared/boardHandlers.ts'

const CALLER: BoardCaller = { id: 'user-1', token: 'caller-token' }

function fakeDeps(overrides: Partial<BoardDeps> = {}) {
  const calls: string[] = []
  const deps: BoardDeps = {
    pepper: 'test-pepper',
    allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return true },
    createUser: async (email) => { calls.push(`createUser:${email}`); return 'user-1' },
    deleteUser: async (id) => { calls.push(`deleteUser:${id}`); return true },
    insertAccess: async (id, hash) => { calls.push(`insert:${id}:${hash}`); return 'ok' },
    findUserIdByCodeHash: async (hash) => { calls.push(`find:${hash}`); return 'user-1' },
    getUserEmail: async () => 'board-x@boards.jobtracker.invalid',
    generateMagicLinkTokenHash: async (email) => { calls.push(`link:${email}`); return 'token-hash' },
    touchLastOpened: async (id) => { calls.push(`touch:${id}`) },
    hasBoard: async () => true,
    updateCodeHash: async (id, hash) => { calls.push(`update:${id}:${hash}`); return 'ok' },
    deleteBoardData: async (id) => { calls.push(`deleteData:${id}`); return true },
    revokeOtherSessions: async (token) => { calls.push(`revoke:${token}`); return true },
    ...overrides,
  }
  return { deps, calls }
}

describe('handleCreate', () => {
  it('refuse au-delà de la limite sans créer de compte', async () => {
    const { deps, calls } = fakeDeps({ allow: async () => false })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls.some((c) => c.startsWith('createUser'))).toBe(false)
  })

  it('crée le compte, stocke le hash du code et renvoie code + tokenHash', async () => {
    const { deps, calls } = fakeDeps()
    const result = await handleCreate(deps, 'ip-key', () => 'uuid-1')
    expect(result.status).toBe(200)
    const code = result.body.code as string
    expect(isValidAccessCode(code)).toBe(true)
    expect(result.body.tokenHash).toBe('token-hash')
    expect(calls).toContain('allow:create:ip-key:5:3600')
    expect(calls).toContain('createUser:board-uuid-1@boards.jobtracker.invalid')
    expect(calls).toContain(`insert:user-1:${await hashAccessCode(code, 'test-pepper')}`)
    expect(calls).toContain('link:board-uuid-1@boards.jobtracker.invalid')
  })

  it('réessaie une fois avec un nouveau code en cas de collision', async () => {
    let attempt = 0
    const { deps, calls } = fakeDeps({ insertAccess: async (id, hash) => { calls.push(`insert:${id}:${hash}`); attempt += 1; return attempt === 1 ? 'conflict' : 'ok' } })
    const result = await handleCreate(deps, 'ip-key', () => 'uuid-1')
    expect(result.status).toBe(200)
    const inserts = calls.filter((c) => c.startsWith('insert:'))
    expect(inserts).toHaveLength(2)
    expect(inserts[1]).toBe(`insert:user-1:${await hashAccessCode(result.body.code as string, 'test-pepper')}`)
  })

  it('supprime le compte si le code ne peut pas être enregistré', async () => {
    const { deps, calls } = fakeDeps({ insertAccess: async () => 'conflict' })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 500, body: { error: 'create_failed' } })
    expect(calls).toContain('deleteUser:user-1')
  })

  it('supprime le compte si le jeton de session ne peut pas être généré', async () => {
    const { deps, calls } = fakeDeps({ generateMagicLinkTokenHash: async () => null })
    expect((await handleCreate(deps, 'ip-key', () => 'uuid-1')).status).toBe(500)
    expect(calls).toContain('deleteUser:user-1')
  })

  it('ne supprime rien si la création du compte échoue', async () => {
    const { deps, calls } = fakeDeps({ createUser: async () => null })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 500, body: { error: 'create_failed' } })
    expect(calls.some((c) => c.startsWith('deleteUser'))).toBe(false)
  })

  it('répond create_failed sans réessayer si insertAccess renvoie une erreur (pas un conflit)', async () => {
    const { deps, calls } = fakeDeps({ insertAccess: async (id, hash) => { calls.push(`insert:${id}:${hash}`); return 'error' } })
    expect(await handleCreate(deps, 'ip-key', () => 'uuid-1')).toEqual({ status: 500, body: { error: 'create_failed' } })
    expect(calls.filter((c) => c.startsWith('insert:'))).toHaveLength(1)
    expect(calls).toContain('deleteUser:user-1')
  })
})

describe('handleOpen', () => {
  it('refuse au-delà de la limite avant toute recherche', async () => {
    const { deps, calls } = fakeDeps({ allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return false } })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2-M9XP-4RWD' })).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls).toEqual(['allow:open:ip-key:10:900'])
  })

  it('refuse un format invalide', async () => {
    const { deps } = fakeDeps()
    expect(await handleOpen(deps, 'ip-key', { code: 'abc' })).toEqual({ status: 400, body: { error: 'invalid_format' } })
    expect(await handleOpen(deps, 'ip-key', null)).toEqual({ status: 400, body: { error: 'invalid_format' } })
  })

  it('refuse un code inconnu', async () => {
    const { deps, calls } = fakeDeps({ findUserIdByCodeHash: async (hash) => { calls.push(`find:${hash}`); return null } })
    expect(await handleOpen(deps, 'ip-key', { code: 'k7q2-m9xp-4rwd' })).toEqual({ status: 401, body: { error: 'invalid_code' } })
    expect(calls).toContain(`find:${await hashAccessCode('K7Q2M9XP4RWD', 'test-pepper')}`)
  })

  it('renvoie un tokenHash pour l’email actuel et note l’ouverture', async () => {
    const { deps, calls } = fakeDeps({ getUserEmail: async () => 'prenom@exemple.fr' })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2 M9XP 4RWD' })).toEqual({ status: 200, body: { tokenHash: 'token-hash' } })
    expect(calls).toContain('link:prenom@exemple.fr')
    expect(calls).toContain('touch:user-1')
  })

  it('répond 500 sans noter l’ouverture si l’email est introuvable', async () => {
    const { deps, calls } = fakeDeps({ getUserEmail: async () => null })
    expect(await handleOpen(deps, 'ip-key', { code: 'K7Q2M9XP4RWD' })).toEqual({ status: 500, body: { error: 'server_error' } })
    expect(calls.some((c) => c.startsWith('touch'))).toBe(false)
  })
})

describe('handleRotate', () => {
  it('exige un appelant authentifié', async () => {
    const { deps } = fakeDeps()
    expect(await handleRotate(deps, null)).toEqual({ status: 401, body: { error: 'unauthorized' } })
  })

  it('applique la limite par utilisateur', async () => {
    const { deps, calls } = fakeDeps({ allow: async (bucket, limit, windowSeconds) => { calls.push(`allow:${bucket}:${limit}:${windowSeconds}`); return false } })
    expect(await handleRotate(deps, CALLER)).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls).toEqual(['allow:rotate:user-1:5:3600'])
  })

  it('refuse un compte sans tableau et signale une erreur de base', async () => {
    expect(await handleRotate(fakeDeps({ updateCodeHash: async () => 'not_found' }).deps, CALLER)).toEqual({ status: 404, body: { error: 'not_a_board' } })
    expect(await handleRotate(fakeDeps({ updateCodeHash: async () => 'error' }).deps, CALLER)).toEqual({ status: 500, body: { error: 'server_error' } })
  })

  it('n’appelle pas revokeOtherSessions quand la mise à jour échoue (not_found ou error)', async () => {
    const { deps: notFoundDeps, calls: notFoundCalls } = fakeDeps({ updateCodeHash: async () => 'not_found' })
    await handleRotate(notFoundDeps, CALLER)
    expect(notFoundCalls.some((c) => c.startsWith('revoke'))).toBe(false)

    const { deps: errorDeps, calls: errorCalls } = fakeDeps({ updateCodeHash: async () => 'error' })
    await handleRotate(errorDeps, CALLER)
    expect(errorCalls.some((c) => c.startsWith('revoke'))).toBe(false)
  })

  it('enregistre le hash du nouveau code, révoque les autres sessions de l’appelant et renvoie le code', async () => {
    const { deps, calls } = fakeDeps()
    const result = await handleRotate(deps, CALLER)
    expect(result.status).toBe(200)
    expect(isValidAccessCode(result.body.code as string)).toBe(true)
    expect(calls).toContain(`update:user-1:${await hashAccessCode(result.body.code as string, 'test-pepper')}`)
    expect(calls).toContain('revoke:caller-token')
  })

  it('renvoie tout de même 200 avec le code si la révocation échoue', async () => {
    const { deps, calls } = fakeDeps({ revokeOtherSessions: async (token) => { calls.push(`revoke:${token}`); return false } })
    const result = await handleRotate(deps, CALLER)
    expect(result.status).toBe(200)
    expect(isValidAccessCode(result.body.code as string)).toBe(true)
    expect(calls).toContain('revoke:caller-token')
  })
})

describe('handleDelete', () => {
  it('exige un appelant authentifié', async () => {
    expect(await handleDelete(fakeDeps().deps, null)).toEqual({ status: 401, body: { error: 'unauthorized' } })
  })

  it('refuse de supprimer un compte classique', async () => {
    const { deps, calls } = fakeDeps({ hasBoard: async () => false })
    expect(await handleDelete(deps, CALLER)).toEqual({ status: 404, body: { error: 'not_a_board' } })
    expect(calls.some((c) => c.startsWith('delete'))).toBe(false)
  })

  it('garde le compte si l’effacement des données échoue', async () => {
    const { deps, calls } = fakeDeps({ deleteBoardData: async () => false })
    expect(await handleDelete(deps, CALLER)).toEqual({ status: 500, body: { error: 'server_error' } })
    expect(calls.some((c) => c.startsWith('deleteUser'))).toBe(false)
  })

  it('efface les données puis le compte', async () => {
    const { deps, calls } = fakeDeps()
    expect(await handleDelete(deps, CALLER)).toEqual({ status: 200, body: { success: true } })
    expect(calls.filter((c) => c.startsWith('delete'))).toEqual(['deleteData:user-1', 'deleteUser:user-1'])
  })
})
