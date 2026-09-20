import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoardAccess } from '@/hooks/useBoardAccess'
import type { BoardOpenVia } from '@/hooks/useBoardAccess'
import { savedAccessCode } from '@/lib/savedAccessCode'
import { AccessCodeScreen } from './AccessCodeScreen'
import { BoardCreatedScreen } from './BoardCreatedScreen'
import { MagicLinkScreen } from './MagicLinkScreen'
import { MagicLinkSentScreen } from './MagicLinkSentScreen'

type GateState =
  | { step: 'code' }
  | { step: 'created'; code: string; tokenHash: string }
  | { step: 'magic' }
  | { step: 'magic-sent' }

interface LiteAccessGateProps {
  // WHY: le fragment #CODE est lu et retiré de l'adresse une seule fois par App (takeShortcutCodeOnce,
  // avant tout retour anticipé) ; ce composant ne lit plus lui-même window.location.hash.
  shortcutCode: string
  // WHY: après une déconnexion, App remonte une nouvelle instance de ce composant dont le ref
  // shortcutHandled repart à false ; sans ce callback, elle resoumettrait le même code.
  onShortcutConsumed: () => void
}

export function LiteAccessGate({ shortcutCode, onShortcutConsumed }: LiteAccessGateProps) {
  const { createBoard, enterBoard, openBoard, requestMagicLink } = useBoardAccess()
  const [state, setState] = useState<GateState>({ step: 'code' })
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shortcutHandled = useRef(false)

  // WHY: cet écran ne s'affiche que sans session. Un code resté d'une session révoquée ou expirée
  // ne doit pas réapparaître dans « Mon tableau » après une entrée par lien email (il peut avoir changé).
  useEffect(() => {
    savedAccessCode.clear()
  }, [])

  // WHY: en cas de succès, onAuthStateChange (useAuth) bascule l'app et démonte ce composant :
  // on ne remet donc busy à false qu'en cas d'erreur.
  const handleOpen = useCallback(async (code: string, via: BoardOpenVia = 'code') => {
    setBusy(true)
    setError(null)
    const err = await openBoard(code, via)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }, [openBoard])

  useEffect(() => {
    if (!shortcutCode || shortcutHandled.current) return
    shortcutHandled.current = true
    onShortcutConsumed()
    void handleOpen(shortcutCode, 'shortcut')
  }, [shortcutCode, handleOpen, onShortcutConsumed])

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

  async function handleEnterCreated(tokenHash: string, code: string) {
    setBusy(true)
    setError(null)
    const err = await enterBoard(tokenHash, code, 'created')
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
    return <BoardCreatedScreen code={state.code} busy={busy} error={error} onOpen={() => handleEnterCreated(state.tokenHash, state.code)} />
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
