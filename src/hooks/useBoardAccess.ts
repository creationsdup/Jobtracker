import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { configureUsage, track } from '@/lib/usageClient'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/accessCode'
import { savedAccessCode } from '@/lib/savedAccessCode'
import {
  MESSAGES,
  isPlausibleEmail,
  messageForEmailChangeError,
  messageForFunctionError,
  messageForMagicLinkError,
  type BoardAction,
} from '@/lib/boardAccessErrors'

type BoardFunction = 'board-create' | 'board-open' | 'board-rotate-code' | 'board-delete'

async function callBoardFunction<T>(
  name: BoardFunction,
  action: BoardAction,
  body: Record<string, unknown> = {},
): Promise<{ data: T } | { error: string }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  // WHY: chaque fonction board-* renvoie un corps JSON en cas de succès ; un 2xx sans corps est une réponse anormale, traitée volontairement comme un échec.
  if (!error && data) return { data }
  // WHY: une réponse HTTP non-2xx arrive avec la Response dans error.context ; sinon, pas de réponse (réseau).
  const context = (error as { context?: unknown } | null)?.context
  const status = context instanceof Response ? context.status : null
  return { error: messageForFunctionError(action, status) }
}

export type BoardOpenVia = 'code' | 'shortcut' | 'created'

export function useBoardAccess() {
  const enterBoard = useCallback(async (tokenHash: string, code?: string, via: BoardOpenVia = 'code'): Promise<string | null> => {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (error) return MESSAGES.network
    // WHY: le code n'est connu du client qu'à la création et à l'ouverture ; on le garde pour « Mon tableau » sur cet appareil.
    if (code && data.user) savedAccessCode.save(data.user.id, code)
    // WHY: la session existe dès que verifyOtp a résolu — on peut écrire tout de suite, sans
    // attendre l'effet de App, qui ne s'exécutera qu'au rendu suivant.
    configureUsage({ client: supabase })
    if (via === 'created') track('board_created')
    track('board_opened', { via })
    return null
  }, [])

  const createBoard = useCallback(async (): Promise<{ code: string; tokenHash: string } | { error: string }> => {
    const result = await callBoardFunction<{ code: string; tokenHash: string }>('board-create', 'create')
    return 'error' in result ? result : { code: result.data.code, tokenHash: result.data.tokenHash }
  }, [])

  const openBoard = useCallback(async (input: string, via: BoardOpenVia = 'code'): Promise<string | null> => {
    const code = normalizeAccessCode(input)
    if (!isValidAccessCode(code)) return MESSAGES.invalidFormat
    const result = await callBoardFunction<{ tokenHash: string }>('board-open', 'open', { code })
    if ('error' in result) return result.error
    return enterBoard(result.data.tokenHash, code, via)
  }, [enterBoard])

  const requestMagicLink = useCallback(async (email: string): Promise<string | null> => {
    const trimmed = email.trim()
    if (!isPlausibleEmail(trimmed)) return MESSAGES.emailInvalid
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    return error ? messageForMagicLinkError(error.status, error.code) : null
  }, [])

  const secureWithEmail = useCallback(async (email: string): Promise<string | null> => {
    const trimmed = email.trim()
    if (!isPlausibleEmail(trimmed)) return MESSAGES.emailInvalid
    const { error } = await supabase.auth.updateUser({ email: trimmed }, { emailRedirectTo: window.location.origin })
    return error ? messageForEmailChangeError(error.status, error.code) : null
  }, [])

  const rotateCode = useCallback(async (): Promise<{ code: string } | { error: string }> => {
    const result = await callBoardFunction<{ code: string }>('board-rotate-code', 'rotate')
    if ('error' in result) return result
    const { data } = await supabase.auth.getSession()
    if (data.session) savedAccessCode.save(data.session.user.id, result.data.code)
    return { code: result.data.code }
  }, [])

  const leaveBoard = useCallback(async (): Promise<void> => {
    savedAccessCode.clear()
    // WHY: « Quitter » ne doit fermer que cet appareil ; un signOut global déconnecterait aussi
    // les autres appareils qui ont ouvert le même tableau avec le code.
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  const deleteBoard = useCallback(async (): Promise<string | null> => {
    const result = await callBoardFunction<{ success: boolean }>('board-delete', 'delete')
    if ('error' in result) return result.error
    savedAccessCode.clear()
    await supabase.auth.signOut()
    return null
  }, [])

  return { createBoard, enterBoard, openBoard, requestMagicLink, secureWithEmail, rotateCode, leaveBoard, deleteBoard }
}
