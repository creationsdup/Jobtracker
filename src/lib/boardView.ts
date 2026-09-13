export type BoardView = 'columns' | 'list'

const BOARD_VIEW_KEY = 'jobtracker-board-view'

/** Mode d'affichage mémorisé sur l'appareil ; « colonnes » par défaut ou si le stockage est indisponible. */
export function readBoardView(): BoardView {
  try {
    return localStorage.getItem(BOARD_VIEW_KEY) === 'list' ? 'list' : 'columns'
  } catch {
    return 'columns'
  }
}

export function saveBoardView(view: BoardView): void {
  try {
    localStorage.setItem(BOARD_VIEW_KEY, view)
  } catch { /* stockage indisponible : le choix ne sera simplement pas retenu */ }
}
