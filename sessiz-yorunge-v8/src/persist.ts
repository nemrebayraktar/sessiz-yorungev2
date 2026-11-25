export type Settings = {
  easy: boolean
  volume: number
  sens: number
  stickDead: number
  stickSens: number
}

export type SaveData = {
  best: number
  wins: number
  bestWave: number
  settings: Settings
}

const KEY = 'sessiz-yorunge-v1'

const defaults = (): SaveData => ({
  best: 0,
  wins: 0,
  bestWave: 0,
  settings: { easy: false, volume: 0.72, sens: 1, stickDead: 0.18, stickSens: 1 },
})

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

export function loadSave(): SaveData {
  const base = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<SaveData>
    const s = parsed.settings
    return {
      best: typeof parsed.best === 'number' && Number.isFinite(parsed.best) ? parsed.best : 0,
      wins: typeof parsed.wins === 'number' && Number.isFinite(parsed.wins) ? parsed.wins : 0,
      bestWave: typeof parsed.bestWave === 'number' && Number.isFinite(parsed.bestWave) ? Math.max(0, Math.floor(parsed.bestWave)) : 0,
      settings: {
        easy: Boolean(s?.easy),
        volume: clamp(typeof s?.volume === 'number' ? s.volume : base.settings.volume, 0, 1),
        sens: clamp(typeof s?.sens === 'number' ? s.sens : base.settings.sens, 0.4, 2.2),
        stickDead: clamp(typeof s?.stickDead === 'number' ? s.stickDead : base.settings.stickDead, 0.05, 0.4),
        stickSens: clamp(typeof s?.stickSens === 'number' ? s.stickSens : base.settings.stickSens, 0.6, 1.6),
      },
    }
  } catch {
    return base
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* private mode / quota */
  }
}

const RUN = 'sessiz-yorunge-run'

export type RunBookmark = { pos: number[]; vel: number[]; quat: number[] }

export type RunState = {
  origin: string
  weapon: string
  hull: number
  shield: number
  cd1: number
  cd2: number
  universe: string
  returns: Record<string, RunBookmark>
}

export function writeRun(state: RunState) {
  try {
    sessionStorage.setItem(RUN, JSON.stringify(state))
  } catch {
    /* private mode */
  }
}

export function clearRun() {
  try {
    sessionStorage.removeItem(RUN)
  } catch {
    /* private mode */
  }
}
