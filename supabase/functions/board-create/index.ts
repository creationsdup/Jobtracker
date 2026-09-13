import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCreate } from '../_shared/boardHandlers.ts'
import { json, preflight } from '../_shared/http.ts'
import { createDeps, ipKey, loadContext } from '../_shared/supabaseDeps.ts'

serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  const ctx = loadContext()
  if (!ctx) return json({ error: 'server_misconfigured' }, 500)
  try {
    const result = await handleCreate(createDeps(ctx), await ipKey(ctx, req), () => crypto.randomUUID())
    return json(result.body, result.status)
  } catch {
    // WHY: jamais de message d'erreur brut (détails internes, et le code ne doit pas fuiter).
    return json({ error: 'server_error' }, 500)
  }
})
