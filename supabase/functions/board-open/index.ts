import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleOpen } from '../_shared/boardHandlers.ts'
import { json, preflight, readJson } from '../_shared/http.ts'
import { createDeps, ipKey, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleOpen(createDeps(ctx), await ipKey(ctx, req), await readJson(req))
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes, et le code ne doit pas fuiter).
    return json({ error: 'server_error' }, 500)
  }
})
