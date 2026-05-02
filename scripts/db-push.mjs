#!/usr/bin/env node
/**
 * db-push — applies pending SQL migrations to Supabase
 *
 * Setup (once):
 *   1. Go to https://supabase.com/dashboard/account/tokens
 *   2. Create a personal access token
 *   3. Add it to .env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxxx
 *
 * Usage:
 *   npm run db:push
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, '..')

// ── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim()
  }
}
loadEnv()

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_URL = process.env.VITE_SUPABASE_URL

if (!ACCESS_TOKEN) {
  console.error('\n❌  SUPABASE_ACCESS_TOKEN manquant dans .env.local')
  console.error('   1. Allez sur https://supabase.com/dashboard/account/tokens')
  console.error('   2. Créez un token personnel')
  console.error('   3. Ajoutez dans .env.local : SUPABASE_ACCESS_TOKEN=sbp_xxxx\n')
  process.exit(1)
}

if (!SUPABASE_URL) {
  console.error('\n❌  VITE_SUPABASE_URL manquant dans .env.local\n')
  process.exit(1)
}

// Extract project ref from URL (https://<ref>.supabase.co)
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
const API_BASE    = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

// ── Supabase Management API ────────────────────────────────────────────────
async function runSQL(sql) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { error: text } }

  if (!res.ok) {
    const msg = json?.message || json?.error || text
    throw new Error(`SQL error (${res.status}): ${msg}`)
  }
  return json
}

// ── Bootstrap migrations tracking table ───────────────────────────────────
async function ensureTrackingTable() {
  await runSQL(`
    create table if not exists _schema_migrations (
      name       text primary key,
      applied_at timestamptz default now()
    );
  `)
}

async function getApplied() {
  const rows = await runSQL(`select name from _schema_migrations order by name;`)
  return new Set((rows ?? []).map(r => r.name))
}

async function markApplied(name) {
  await runSQL(`insert into _schema_migrations (name) values ('${name}') on conflict do nothing;`)
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌  Dossier supabase/migrations/ introuvable')
    process.exit(1)
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`\n🔌  Connexion au projet Supabase (${PROJECT_REF})…\n`)

  await ensureTrackingTable()
  const applied = await getApplied()

  const pending = files.filter(f => !applied.has(f))

  if (pending.length === 0) {
    console.log('✅  Base de données à jour — aucune migration en attente.\n')
    return
  }

  console.log(`📦  ${pending.length} migration(s) à appliquer :\n`)

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim()
    process.stdout.write(`   ⏳  ${file} … `)
    try {
      await runSQL(sql)
      await markApplied(file)
      console.log('✅')
    } catch (err) {
      console.log('❌')
      console.error(`\n      ${err.message}\n`)
      process.exit(1)
    }
  }

  console.log(`\n✅  ${pending.length} migration(s) appliquée(s) avec succès.\n`)
}

main().catch(err => { console.error('💥', err.message); process.exit(1) })
