/* Kayıt / Devam et: oyunun tüm kalıcı durumu tarayıcıya otomatik kaydedilir (localStorage).
   Sahne nesneleri (mesh) kaydedilmez; yüklemede yeniden kurulur. */

export const SAVE_KEY = 'sessiz-yorunge-save2'
export const SAVE_VERSION = 1

export type V3 = [number, number, number]

export type SavedTurret = { dir: V3; hull: number; kind?: 'kara' | 'hava'; lvl?: number }

export type SavedColony = Record<string, unknown> & { dir: V3; turrets: SavedTurret[]; planetId: string }

export type SavedGame = {
  v: number
  at: number
  origin: string
  universe: string
  pos: V3
  quat: [number, number, number, number]
  hull: number
  shield: number
  energy: number
  ore: number
  crystal: number
  score: number
  kills: number
  properTime: number
  clockT: number
  up: Record<string, number>
  parts: string[]
  owned: string[]
  weapon: string
  questIdx: number
  captured: number
  questLog: string[]
  discovered: { id: string; name: string; system: string; lore: string }[]
  colonies: SavedColony[]
  rel: Record<string, unknown>
  cleared: string[]
  razed: [string, number][]
  nativesLeft: [string, number][]
  mined: [string, number][]
  regrow: [string, number][]
  botSeeded: string[]
  squad: { kind: string; hull: number; hullMax: number }[]
  stranded: { planetId: string; universe: string; dir: V3; crew: { kind: string; hull: number; hullMax: number }[] }[]
  lastTalk: Record<string, number>
}

export function readGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as SavedGame
    if (!g || g.v !== SAVE_VERSION || typeof g.origin !== 'string' || !Array.isArray(g.colonies)) return null
    return g
  } catch {
    return null
  }
}

export function writeGame(g: SavedGame) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(g))
    return true
  } catch {
    return false
  }
}

export function dropGame() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* yok say */
  }
}
