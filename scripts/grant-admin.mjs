#!/usr/bin/env node
/**
 * grant-admin — inscrit un tableau dans la liste blanche admin_users, qui ouvre /admin.
 *
 * Usage :
 *   npm run grant:admin -- --list          liste les tableaux, du plus récemment ouvert au plus ancien
 *   npm run grant:admin -- <user_id>       inscrit ce tableau
 *   npm run grant:admin -- --revoke <id>   le retire
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
const SERVICE = process.env.SUPABASE_SERVICE_KEY
if (!URL || !SERVICE) {
  console.error('❌  VITE_SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis dans .env.local')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const [flag, value] = process.argv.slice(2)

if (flag === '--list') {
  const { data: boards, error } = await admin
    .from('board_access')
    .select('user_id, created_at, last_opened_at')
    .order('last_opened_at', { ascending: false, nullsFirst: false })
  if (error) { console.error('❌ ', error.message); process.exit(1) }

  const { data: current } = await admin.from('admin_users').select('user_id')
  const admins = new Set((current ?? []).map((row) => row.user_id))

  for (const board of boards ?? []) {
    const { count } = await admin
      .from('Application')
      .select('id', { count: 'exact', head: true })
      .eq('userId', board.user_id)
    const opened = board.last_opened_at ? board.last_opened_at.slice(0, 10) : 'jamais'
    console.log(`${admins.has(board.user_id) ? '★' : ' '} ${board.user_id}  créé ${board.created_at.slice(0, 10)}  ouvert ${opened}  ${count ?? 0} candidature(s)`)
  }
  console.log('\n★ = déjà administrateur')
  process.exit(0)
}

if (flag === '--revoke') {
  const { error } = await admin.from('admin_users').delete().eq('user_id', value)
  if (error) { console.error('❌ ', error.message); process.exit(1) }
  console.log(`✅  ${value} retiré de admin_users`)
  process.exit(0)
}

if (!flag) {
  console.error('Usage : npm run grant:admin -- --list | <user_id> | --revoke <user_id>')
  process.exit(1)
}

const { error } = await admin.from('admin_users').upsert({ user_id: flag })
if (error) { console.error('❌ ', error.message); process.exit(1) }
console.log(`✅  ${flag} peut maintenant ouvrir /admin`)
