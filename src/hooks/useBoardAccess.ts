import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidAccessCode, normalizeAccessCode } from '@/lib/accessCode'
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
  if (!error && data) return { data }
  // WHY: une réponse HTTP non-2xx arrive avec la Response dans error.context ; sinon, pas de réponse (réseau).
  const context = (error as { context?: unknown } | null)?.context
  const status = context instanceof Response ? context.status : null
  return { error: messageForFunctionError(action, status) }
}

export function useBoardAccess() {
  const enterBoard = useCallback(async (tokenHash: string): Promise<string | null> => {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    return error ? MESSAGES.network : null
  }, [])

  const createBoard = useCallback(async (): Promise<{ code: string; tokenHash: string } | { error: string }> => {
    const result = await callBoardFunction<{ code: string; tokenHash: string }>('board-create', 'create')
    return 'error' in result ? result : { code: result.data.code, tokenHash: result.data.tokenHash }
  }, [])

  const openBoard = useCallback(async (input: string): Promise<string | null> => {
    const code = normalizeAccessCode(input)
    if (!isValidAccessCode(code)) return MESSAGES.invalidFormat
    const result = await callBoardFunction<{ tokenHash: string }>('board-open', 'open', { code })
    if ('error' in result) return result.error
    return enterBoard(result.data.tokenHash)
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
    return 'error' in result ? result : { code: result.data.code }
  }, [])

  const leaveBoard = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  const deleteBoard = useCallback(async (): Promise<string | null> => {
    const result = await callBoardFunction<{ success: boolean }>('board-delete', 'delete')
    if ('error' in result) return result.error
    await supabase.auth.signOut()
    return null
  }, [])

  return { createBoard, enterBoard, openBoard, requestMagicLink, secureWithEmail, rotateCode, leaveBoard, deleteBoard }
}
