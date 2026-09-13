import { useCallback, useEffect, useRef, useState } from 'react'
import { parseShortcutHash } from '@/lib/accessCode'
import { useBoardAccess } from '@/hooks/useBoardAccess'
import { AccessCodeScreen } from './AccessCodeScreen'
import { BoardCreatedScreen } from './BoardCreatedScreen'
import { MagicLinkScreen } from './MagicLinkScreen'
import { MagicLinkSentScreen } from './MagicLinkSentScreen'

type GateState =
  | { step: 'code' }
  | { step: 'created'; code: string; tokenHash: string }
  | { step: 'magic' }
  | { step: 'magic-sent' }

export function LiteAccessGate() {
  const { createBoard, enterBoard, openBoard, requestMagicLink } = useBoardAccess()
  const [state, setState] = useState<GateState>({ step: 'code' })
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shortcutCode] = useState(() => parseShortcutHash(window.location.hash) ?? '')
  const shortcutHandled = useRef(false)

  // WHY: en cas de succès, onAuthStateChange (useAuth) bascule l'app et démonte ce composant :
  // on ne remet donc busy à false qu'en cas d'erreur.
  const handleOpen = useCallback(async (code: string) => {
    setBusy(true)
    setError(null)
    const err = await openBoard(code)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }, [openBoard])

  useEffect(() => {
    if (!shortcutCode || shortcutHandled.current) return
    shortcutHandled.current = true
    // WHY: le code ne doit pas rester dans l'adresse (historique, partage d'écran).
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    void handleOpen(shortcutCode)
  }, [shortcutCode, handleOpen])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const result = await createBoard()
    setCreating(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setState({ step: 'created', code: result.code, tokenHash: result.tokenHash })
  }

  async function handleEnterCreated(tokenHash: string) {
    setBusy(true)
    setError(null)
    const err = await enterBoard(tokenHash)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }

  async function handleMagicLink(email: string) {
    setBusy(true)
    setError(null)
    const err = await requestMagicLink(email)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setState({ step: 'magic-sent' })
  }

  function goTo(next: GateState) {
    setError(null)
    setBusy(false)
    setState(next)
  }

  if (state.step === 'created') {
    return <BoardCreatedScreen code={state.code} busy={busy} error={error} onOpen={() => handleEnterCreated(state.tokenHash)} />
  }
  if (state.step === 'magic') {
    return <MagicLinkScreen busy={busy} error={error} onSubmit={handleMagicLink} onBack={() => goTo({ step: 'code' })} />
  }
  if (state.step === 'magic-sent') {
    return <MagicLinkSentScreen onBack={() => goTo({ step: 'code' })} />
  }
  return (
    <AccessCodeScreen
      initialCode={shortcutCode}
      busy={busy}
      creating={creating}
      error={error}
      onSubmit={handleOpen}
      onCreate={handleCreate}
      onMagicLink={() => goTo({ step: 'magic' })}
    />
  )
}
