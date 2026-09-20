#!/usr/bin/env node
/**
 * verify-usage-sql — vérifie les migrations de mesure d'usage contre la base réelle.
 *
 * Crée un tableau de test, exerce les règles d'accès et les fonctions d'administration,
 * puis supprime le tableau. À lancer après `npm run db:push`.
 *
 * Usage : npm run verify:usage
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim()
  }
}
loadEnv()

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_KEY
if (!URL || !ANON || !SERVICE) {
  console.error('❌  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY et SUPABASE_SERVICE_KEY sont requis dans .env.local')
  process.exit(1)
}

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

/** Un refus n'est concluant que si Postgres donne LE code attendu : sinon l'erreur vient d'ailleurs. */
function checkRefused(label, error, expectedCodes) {
  if (!error) return check(label, false, 'aucune erreur : l\'insertion est passée')
  const code = error.code ?? '(sans code)'
  const ok = expectedCodes.includes(code)
  check(label, ok, ok ? `code ${code}` : `code inattendu ${code} — ${error.message ?? ''}`)
}

const board = createClient(URL, ANON, { auth: { persistSession: false } })
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let userId = null

try {
  const created = await board.functions.invoke('board-create', { body: {} })
  if (created.error || !created.data?.tokenHash) throw new Error('board-create a échoué')
  const verified = await board.auth.verifyOtp({ token_hash: created.data.tokenHash, type: 'magiclink' })
  if (verified.error) throw new Error('verifyOtp a échoué')
  userId = verified.data.user.id
  console.log(`   tableau de test : ${userId}`)

  const ok = await board.from('usage_events').insert({ name: 'session_started' })
  check("un tableau écrit son propre événement", ok.error === null, ok.error?.message ?? '')

  const other = await board.from('usage_events').insert({ name: 'session_started', user_id: '00000000-0000-0000-0000-000000000000' })
  checkRefused("écrire pour un autre tableau est refusé", other.error, ['42501'])

  const old = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const backdated = await board.from('usage_events').insert({ name: 'session_started', occurred_at: old })
  checkRefused('antidater de deux heures est refusé', backdated.error, ['42501'])

  const unknown = await board.from('usage_events').insert({ name: 'pas_dans_le_dictionnaire' })
  checkRefused('un nom hors dictionnaire est refusé', unknown.error, ['23514'])

  await board.from('usage_preferences').upsert({ user_id: userId, opted_out: true })
  const refused = await board.from('usage_events').insert({ name: 'session_started' })
  checkRefused("le refus de mesure bloque l'écriture", refused.error, ['42501'])
  await board.from('usage_preferences').upsert({ user_id: userId, opted_out: false })

  const read = await board.from('usage_events').select('id')
  check('lire usage_events ne rend aucune ligne', (read.data?.length ?? 0) === 0)

  const notAdmin = await board.rpc('is_admin')
  check('is_admin rend false pour un tableau ordinaire', notAdmin.data === false, notAdmin.error?.message ?? '')

  const forbidden = await board.rpc('admin_boards', { p_days: 30 })
  checkRefused('admin_boards est refusée à un non-administrateur', forbidden.error, ['42501'])

  await admin.from('admin_users').insert({ user_id: userId })
  const boards = await board.rpc('admin_boards', { p_days: 30 })
  check('admin_boards rend le tableau de test', (boards.data ?? []).some((row) => row.user_id === userId), boards.error?.message ?? '')
  const meta = await board.rpc('admin_meta')
  check('admin_meta répond', meta.error === null && meta.data !== null, meta.error?.message ?? '')
  const sessions = await board.rpc('admin_sessions', { p_days: 30 })
  check('admin_sessions répond', sessions.error === null, sessions.error?.message ?? '')
  const series = await board.rpc('admin_timeseries', { p_days: 7 })
  check('admin_timeseries rend 8 jours', (series.data ?? []).length === 8, series.error?.message ?? '')
  await admin.from('admin_users').delete().eq('user_id', userId)
} catch (error) {
  check('parcours complet', false, String(error))
} finally {
  if (userId) {
    const deleted = await board.functions.invoke('board-delete', { body: {} })
    check('tableau de test supprimé', !deleted.error)
  }
}

console.log(failures === 0 ? '\n✅  Toutes les vérifications passent.' : `\n❌  ${failures} vérification(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
