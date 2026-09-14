// Code d'accès gardé dans le navigateur pour l'afficher dans « Mon tableau ». Côté serveur, seule l'empreinte existe.
import { isValidAccessCode, normalizeAccessCode } from './accessCode'

export interface CodeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const SAVED_CODE_KEY = 'jobtracker-board-code'

export function createSavedAccessCode(getStorage: () => CodeStorage) {
  return {
    /** Code du tableau `userId` s'il a été gardé sur cet appareil ; null sinon (autre tableau, valeur corrompue…). */
    read(userId: string): string | null {
      try {
        const raw = getStorage().getItem(SAVED_CODE_KEY)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null) return null
        const { userId: owner, code } = parsed as { userId?: unknown; code?: unknown }
        // WHY: sans ce contrôle, un code resté d'un tableau précédent s'afficherait dans un autre.
        if (owner !== userId || typeof code !== 'string' || !isValidAccessCode(code)) return null
        return code
      } catch {
        return null
      }
    },

    save(userId: string, input: string): void {
      const code = normalizeAccessCode(input)
      if (!isValidAccessCode(code)) return
      try {
        getStorage().setItem(SAVED_CODE_KEY, JSON.stringify({ userId, code }))
      } catch { /* stockage indisponible : le code ne sera simplement pas affiché */ }
    },

    clear(): void {
      try {
        getStorage().removeItem(SAVED_CODE_KEY)
      } catch { /* stockage indisponible : rien n'a pu être gardé */ }
    },
  }
}

export const savedAccessCode = createSavedAccessCode(() => window.localStorage)
