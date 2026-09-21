import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfiguration' }, 500)
    }

    // Client scoped to the caller's JWT, used only to identify who is making the request.
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData?.user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    const userId = userData.user.id

    // Admin client bypasses RLS — used to purge data and the auth user.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 1) Legacy Prisma tables ("Application", "TimelineStep", "Experience", "Resume",
    //    "OrgLogo") key their owner by a `text` "userId" column, NOT a real FK to
    //    auth.users(id), so deleting the auth user does NOT cascade to them — they must be
    //    removed explicitly first or they would be orphaned. Stored ids are lowercase (see
    //    the iOS app's UUID.uuidString.lowercased() gotcha), so match on the lowercased uid.
    const legacyError = await deleteLegacyData(adminClient, userId.toLowerCase())
    if (legacyError) {
      return json({ error: `Failed to delete legacy data: ${legacyError}` }, 500)
    }

    // 2) Delete the auth user. Modern tables (Profile, Resume, user_goals, cv_documents,
    //    ats_analyses, tasks, target_companies/positions, …) reference auth.users(id) with
    //    ON DELETE CASCADE, so they are cleaned up automatically here.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      return json({ error: deleteError.message }, 500)
    }

    return json({ success: true }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected edge error'
    return json({ error: message }, 500)
  }
})

/**
 * Removes the user's rows from the legacy Prisma tables that have no cascading FK.
 * Order matters: "TimelineStep" rows reference "Application" rows, so they go first.
 * Returns an error message on failure, or null on success.
 */
async function deleteLegacyData(admin: SupabaseClient, userIdLower: string): Promise<string | null> {
  // Find the user's applications so their timeline steps can be removed first.
  const { data: apps, error: appsError } = await admin
    .from('Application')
    .select('id')
    .eq('userId', userIdLower)
  if (appsError) return appsError.message

  const applicationIds = (apps ?? []).map((row: { id: string }) => row.id)
  if (applicationIds.length > 0) {
    const { error: stepsError } = await admin
      .from('TimelineStep')
      .delete()
      .in('applicationId', applicationIds)
    if (stepsError) return stepsError.message
  }

  const { error: appDeleteError } = await admin
    .from('Application')
    .delete()
    .eq('userId', userIdLower)
  if (appDeleteError) return appDeleteError.message

  const { error: experienceError } = await admin
    .from('Experience')
    .delete()
    .eq('userId', userIdLower)
  if (experienceError) return experienceError.message

  // "OrgLogo" is owner-scoped by the same text "userId" column, with no cascading FK either.
  // delete_board_data() (the lite path, see 20260913120000_board_access.sql) removes it too —
  // both deletion paths must clear the same set of legacy tables.
  const { error: orgLogoError } = await admin
    .from('OrgLogo')
    .delete()
    .eq('userId', userIdLower)
  if (orgLogoError) return orgLogoError.message

  // Legacy "Resume" rows (text "userId", owner-scoped). The CV builder UI was removed,
  // but web-created rows may still exist; deleting is a no-op when there are none.
  const { error: resumeError } = await admin
    .from('Resume')
    .delete()
    .eq('userId', userIdLower)
  if (resumeError) return resumeError.message

  return null
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders() })
}
