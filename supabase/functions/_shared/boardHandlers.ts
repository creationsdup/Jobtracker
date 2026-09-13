// Logique pure des fonctions board-* : aucun import d'URL, aucune API Deno.
// Les accès Supabase sont injectés (supabaseDeps.ts) pour être testés par Vitest.
import {
  BOARD_EMAIL_DOMAIN,
  generateAccessCode,
  hashAccessCode,
  isValidAccessCode,
  normalizeAccessCode,
} from './accessCode.ts'

export interface HandlerResult {
  status: number
  body: Record<string, unknown>
}

export type InsertAccessResult = 'ok' | 'conflict' | 'error'
export type UpdateCodeResult = 'ok' | 'not_found' | 'error'

export interface BoardDeps {
  pepper: string
  allow(bucket: string, limit: number, windowSeconds: number): Promise<boolean>
  createUser(email: string): Promise<string | null>
  deleteUser(userId: string): Promise<boolean>
  insertAccess(userId: string, codeHash: string): Promise<InsertAccessResult>
  findUserIdByCodeHash(codeHash: string): Promise<string | null>
  getUserEmail(userId: string): Promise<string | null>
  generateMagicLinkTokenHash(email: string): Promise<string | null>
  touchLastOpened(userId: string): Promise<void>
  hasBoard(userId: string): Promise<boolean>
  updateCodeHash(userId: string, codeHash: string): Promise<UpdateCodeResult>
  deleteBoardData(userId: string): Promise<boolean>
}

export const CREATE_LIMIT = { limit: 5, windowSeconds: 3600 }
export const OPEN_LIMIT = { limit: 10, windowSeconds: 900 }
export const ROTATE_LIMIT = { limit: 5, windowSeconds: 3600 }

function reply(status: number, body: Record<string, unknown>): HandlerResult {
  return { status, body }
}

function readCode(body: unknown): string {
  if (typeof body !== 'object' || body === null) return ''
  const code = (body as { code?: unknown }).code
  return typeof code === 'string' ? code : ''
}

export function boardEmailFor(uuid: string): string {
  return `board-${uuid}@${BOARD_EMAIL_DOMAIN}`
}

export async function handleCreate(deps: BoardDeps, ipKey: string, newUuid: () => string): Promise<HandlerResult> {
  if (!(await deps.allow(`create:${ipKey}`, CREATE_LIMIT.limit, CREATE_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const email = boardEmailFor(newUuid())
  const userId = await deps.createUser(email)
  if (!userId) return reply(500, { error: 'create_failed' })

  let code = generateAccessCode()
  let inserted = await deps.insertAccess(userId, await hashAccessCode(code, deps.pepper))
  if (inserted === 'conflict') {
    code = generateAccessCode()
    inserted = await deps.insertAccess(userId, await hashAccessCode(code, deps.pepper))
  }
  const tokenHash = inserted === 'ok' ? await deps.generateMagicLinkTokenHash(email) : null
  if (!tokenHash) {
    // WHY: ne jamais laisser un compte de tableau sans code utilisable.
    await deps.deleteUser(userId)
    return reply(500, { error: 'create_failed' })
  }
  return reply(200, { code, tokenHash })
}

export async function handleOpen(deps: BoardDeps, ipKey: string, body: unknown): Promise<HandlerResult> {
  if (!(await deps.allow(`open:${ipKey}`, OPEN_LIMIT.limit, OPEN_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const code = normalizeAccessCode(readCode(body))
  if (!isValidAccessCode(code)) return reply(400, { error: 'invalid_format' })

  const userId = await deps.findUserIdByCodeHash(await hashAccessCode(code, deps.pepper))
  if (!userId) return reply(401, { error: 'invalid_code' })

  // WHY: email actuel (technique ou réel) — le code reste valable après « Sécuriser avec mon email ».
  const email = await deps.getUserEmail(userId)
  const tokenHash = email ? await deps.generateMagicLinkTokenHash(email) : null
  if (!tokenHash) return reply(500, { error: 'server_error' })

  await deps.touchLastOpened(userId)
  return reply(200, { tokenHash })
}

export async function handleRotate(deps: BoardDeps, callerId: string | null): Promise<HandlerResult> {
  if (!callerId) return reply(401, { error: 'unauthorized' })
  if (!(await deps.allow(`rotate:${callerId}`, ROTATE_LIMIT.limit, ROTATE_LIMIT.windowSeconds))) {
    return reply(429, { error: 'rate_limited' })
  }
  const code = generateAccessCode()
  const updated = await deps.updateCodeHash(callerId, await hashAccessCode(code, deps.pepper))
  if (updated === 'not_found') return reply(404, { error: 'not_a_board' })
  if (updated === 'error') return reply(500, { error: 'server_error' })
  return reply(200, { code })
}

export async function handleDelete(deps: BoardDeps, callerId: string | null): Promise<HandlerResult> {
  if (!callerId) return reply(401, { error: 'unauthorized' })
  // WHY: cette voie ne doit jamais supprimer un compte classique de l'édition full.
  if (!(await deps.hasBoard(callerId))) return reply(404, { error: 'not_a_board' })
  if (!(await deps.deleteBoardData(callerId))) return reply(500, { error: 'server_error' })
  if (!(await deps.deleteUser(callerId))) return reply(500, { error: 'server_error' })
  return reply(200, { success: true })
}
