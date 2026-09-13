// Implémentation Supabase (service_role) des dépendances injectées dans boardHandlers.ts.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1'
import { hmacSha256Hex } from './accessCode.ts'
import { clientIpFromHeaders } from './clientIp.ts'
import type { BoardCaller, BoardDeps } from './boardHandlers.ts'

export interface ServerContext {
  admin: SupabaseClient
  pepper: string
}

export function loadContext(): ServerContext | null {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const pepper = Deno.env.get('CODE_PEPPER')
  if (!url || !serviceRoleKey || !pepper) return null
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return { admin, pepper }
}

export async function getCaller(ctx: ServerContext, req: Request): Promise<BoardCaller | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null
  const { data, error } = await ctx.admin.auth.getUser(token)
  return error || !data?.user ? null : { id: data.user.id, token }
}

export function ipKey(ctx: ServerContext, req: Request): Promise<string> {
  // WHY: x-forwarded-for peut être fixé par le client ; cf-connecting-ip (Cloudflare, devant
  // Supabase) n'est pas falsifiable, et la dernière entrée de x-forwarded-for est ajoutée par
  // l'infrastructure, jamais par l'appelant. Voir supabase/functions/_shared/clientIp.ts.
  const ip = clientIpFromHeaders((name) => req.headers.get(name))
  // WHY: l'IP n'est jamais stockée en clair (RGPD).
  return hmacSha256Hex(`ip:${ip}`, ctx.pepper)
}

export function createDeps(ctx: ServerContext): BoardDeps {
  const { admin } = ctx
  return {
    pepper: ctx.pepper,

    async allow(bucket, limit, windowSeconds) {
      const { data, error } = await admin.rpc('hit_rate_limit', { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds })
      // WHY: si la base ne répond pas, on refuse (fail-closed) plutôt que de désactiver la protection.
      return !error && data === true
    },

    async createUser(email) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { board: true } })
      return error || !data.user ? null : data.user.id
    },

    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      return !error
    },

    async insertAccess(userId, codeHash) {
      const { error } = await admin.from('board_access').insert({ user_id: userId, code_hash: codeHash })
      if (!error) return 'ok'
      return error.code === '23505' ? 'conflict' : 'error'
    },

    async findUserIdByCodeHash(codeHash) {
      const { data, error } = await admin.from('board_access').select('user_id').eq('code_hash', codeHash).maybeSingle()
      return error || !data ? null : (data.user_id as string)
    },

    async getUserEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      return error || !data.user?.email ? null : data.user.email
    },

    async generateMagicLinkTokenHash(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      return error || !data.properties?.hashed_token ? null : data.properties.hashed_token
    },

    async touchLastOpened(userId) {
      // WHY: information de purge future (RGPD) ; un échec ne doit pas bloquer l'ouverture.
      await admin.from('board_access').update({ last_opened_at: new Date().toISOString() }).eq('user_id', userId)
    },

    async hasBoard(userId) {
      const { data, error } = await admin.from('board_access').select('user_id').eq('user_id', userId).maybeSingle()
      return !error && !!data
    },

    async updateCodeHash(userId, codeHash) {
      const { data, error } = await admin
        .from('board_access')
        .update({ code_hash: codeHash, code_rotated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('user_id')
      if (error) return 'error'
      return data && data.length > 0 ? 'ok' : 'not_found'
    },

    async deleteBoardData(userId) {
      // WHY: une seule transaction côté base (public.delete_board_data) plutôt que plusieurs
      // suppressions séparées, pour ne jamais laisser un tableau partiellement effacé.
      const { error } = await admin.rpc('delete_board_data', { p_user_id: userId })
      return !error
    },

    async revokeOtherSessions(callerToken) {
      const { error } = await admin.auth.admin.signOut(callerToken, 'others')
      return !error
    },
  }
}
