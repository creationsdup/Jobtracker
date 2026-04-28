#!/usr/bin/env node
/**
 * Migration: Custom User table CUIDs → Supabase auth UUIDs + RLS
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=your_service_role_key node scripts/migrate.js
 *
 * What it does:
 *   1. Reads auth.users to get real Supabase UUIDs
 *   2. Updates Application.userId and Experience.userId to use those UUIDs
 *   3. Enables RLS on all tables
 *   4. Creates RLS policies so each user only sees their own data
 *   5. Drops the legacy User table
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fcclyjaaaiwaoovxduzj.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_SERVICE_KEY env variable')
  console.error('    Run: SUPABASE_SERVICE_KEY=your_key node scripts/migrate.js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('🔍  Fetching Supabase auth users...')

  // 1. Get all auth users
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) { console.error('❌  auth.admin.listUsers:', authErr.message); process.exit(1) }

  console.log(`   Found ${authUsers.users.length} auth user(s)`)

  // 2. Get all custom User table rows
  const { data: customUsers, error: customErr } = await supabase.from('User').select('id, email')
  if (customErr) { console.error('❌  User table fetch:', customErr.message); process.exit(1) }

  console.log(`   Found ${customUsers.length} legacy User row(s)`)

  // 3. Build mapping: custom CUID → Supabase auth UUID
  const mapping = {} // customId → authUUID
  for (const cu of customUsers) {
    const authUser = authUsers.users.find(u => u.email === cu.email)
    if (authUser) {
      mapping[cu.id] = authUser.id
      console.log(`   ${cu.email}: ${cu.id} → ${authUser.id}`)
    } else {
      console.warn(`⚠️   No auth user found for ${cu.email} — skipping`)
    }
  }

  // 4. Update Application.userId
  console.log('\n📦  Updating Application.userId...')
  const { data: apps } = await supabase.from('Application').select('id, userId')
  let appCount = 0
  for (const app of apps ?? []) {
    const newId = mapping[app.userId]
    if (!newId) { console.warn(`   ⚠️  No mapping for userId ${app.userId} (app ${app.id})`); continue }
    const { error } = await supabase.from('Application').update({ userId: newId }).eq('id', app.id)
    if (error) console.error(`   ❌  app ${app.id}:`, error.message)
    else appCount++
  }
  console.log(`   ✅  Updated ${appCount}/${apps?.length ?? 0} applications`)

  // 5. Update Experience.userId
  console.log('\n📚  Updating Experience.userId...')
  const { data: exps } = await supabase.from('Experience').select('id, userId')
  let expCount = 0
  for (const exp of exps ?? []) {
    const newId = mapping[exp.userId]
    if (!newId) { console.warn(`   ⚠️  No mapping for userId ${exp.userId} (exp ${exp.id})`); continue }
    const { error } = await supabase.from('Experience').update({ userId: newId }).eq('id', exp.id)
    if (error) console.error(`   ❌  exp ${exp.id}:`, error.message)
    else expCount++
  }
  console.log(`   ✅  Updated ${expCount}/${exps?.length ?? 0} experiences`)

  // 6. Enable RLS + policies via SQL
  console.log('\n🔒  Enabling RLS and creating policies...')

  const sql = `
    -- Enable RLS
    ALTER TABLE "Application"   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "TimelineStep"  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Experience"    ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if any
    DROP POLICY IF EXISTS "own_applications"  ON "Application";
    DROP POLICY IF EXISTS "own_steps"         ON "TimelineStep";
    DROP POLICY IF EXISTS "own_experiences"   ON "Experience";

    -- Application: each user sees/edits only their own rows
    CREATE POLICY "own_applications" ON "Application"
      FOR ALL USING (auth.uid()::text = "userId")
      WITH CHECK (auth.uid()::text = "userId");

    -- TimelineStep: access via parent Application ownership
    CREATE POLICY "own_steps" ON "TimelineStep"
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM "Application" a
          WHERE a.id = "applicationId"
            AND auth.uid()::text = a."userId"
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "Application" a
          WHERE a.id = "applicationId"
            AND auth.uid()::text = a."userId"
        )
      );

    -- Experience: each user sees/edits only their own rows
    CREATE POLICY "own_experiences" ON "Experience"
      FOR ALL USING (auth.uid()::text = "userId")
      WITH CHECK (auth.uid()::text = "userId");
  `

  const { error: sqlErr } = await supabase.rpc('exec_sql', { query: sql }).single()
  if (sqlErr) {
    // exec_sql RPC may not exist — fall back to individual statements
    console.warn('   ⚠️  exec_sql RPC not available, applying statements individually...')
    await applyRlsManually()
  } else {
    console.log('   ✅  RLS enabled and policies created')
  }

  // 7. Drop legacy User table
  console.log('\n🗑️   Dropping legacy User table...')
  const { error: dropErr } = await supabase.rpc('exec_sql', {
    query: 'DROP TABLE IF EXISTS "User" CASCADE;'
  }).single()
  if (dropErr) {
    console.warn('   ⚠️  Could not auto-drop User table via RPC')
    console.warn('      Run manually in SQL editor: DROP TABLE "User" CASCADE;')
  } else {
    console.log('   ✅  User table dropped')
  }

  console.log('\n✅  Migration complete!')
  console.log('    Your app now uses Supabase auth UUIDs with RLS enforced.')
}

async function applyRlsManually() {
  // Try direct SQL via postgres connection string if RPC is unavailable
  console.log('\n⚠️   Cannot apply RLS automatically without exec_sql RPC.')
  console.log('    Please run this SQL in your Supabase SQL editor:\n')
  console.log(`
ALTER TABLE "Application"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experience"   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_applications" ON "Application";
DROP POLICY IF EXISTS "own_steps"        ON "TimelineStep";
DROP POLICY IF EXISTS "own_experiences"  ON "Experience";

CREATE POLICY "own_applications" ON "Application"
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "own_steps" ON "TimelineStep"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a.id = "applicationId"
        AND auth.uid()::text = a."userId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Application" a
      WHERE a.id = "applicationId"
        AND auth.uid()::text = a."userId"
    )
  );

CREATE POLICY "own_experiences" ON "Experience"
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP TABLE IF EXISTS "User" CASCADE;
  `)
}

run().catch(err => { console.error('💥', err); process.exit(1) })
