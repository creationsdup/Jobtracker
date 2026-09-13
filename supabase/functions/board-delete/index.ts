import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleDelete } from '../_shared/boardHandlers.ts'
import { json, preflight } from '../_shared/http.ts'
import { createDeps, getCallerId, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleDelete(createDeps(ctx), await getCallerId(ctx, req))
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes).
    return json({ error: 'server_error' }, 500)
  }
})
