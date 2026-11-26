/* Uyarlanır müzik: tamamen bu oyun için sentezlenen, özgün ortam müziği (telifli bir eserin kopyası değildir).
   Her sistemin kendi tonu, akor yürüyüşü, temposu ve tınısı var: geniş org benzeri katmanlar, saat tıkırtısı gibi
   yavaş bir arpej, derin bir dron. Savaşta tempo yükselir, bas ostinatosu ve vurmalılar girer. */

type Theme = {
  /** Kök nota (Hz) ve akorlar: kökten yarım ses aralıkları. */
  root: number
  chords: number[][]
  bpm: number
  /** Arpej tınısı: org (sinüs katmanları), çan, cam, sıcak (üçgen). */
  voice: 'organ' | 'bell' | 'glass' | 'warm'
  bright: number
}

const MINOR = [
  [0, 3, 7, 12],
  [-4, 0, 3, 8],
  [-9, -5, 0, 3],
  [-2, 2, 5, 10],
]

export const THEMES: Record<string, Theme> = {
  gunes: { root: 110, chords: MINOR, bpm: 66, voice: 'organ', bright: 0.6 },
  marskol: { root: 98, chords: [[0, 3, 7, 10], [5, 9, 12, 15], [-2, 2, 5, 9], [3, 7, 10, 14]], bpm: 70, voice: 'warm', bright: 0.5 },
  proxima: { root: 82.4, chords: [[0, 3, 6, 10], [-1, 3, 6, 11], [-5, -1, 3, 6], [1, 4, 8, 11]], bpm: 54, voice: 'organ', bright: 0.3 },
  alpha: { root: 123.5, chords: [[0, 4, 7, 11], [2, 6, 9, 14], [-5, -1, 2, 7], [4, 7, 11, 16]], bpm: 72, voice: 'glass', bright: 0.8 },
  trappist: { root: 130.8, chords: [[0, 7, 12, 16], [-3, 4, 9, 12], [5, 9, 12, 19], [2, 7, 11, 14]], bpm: 76, voice: 'bell', bright: 0.9 },
  k218: { root: 92.5, chords: [[0, 5, 7, 12], [-2, 3, 7, 10], [-5, 0, 5, 7], [3, 7, 10, 15]], bpm: 58, voice: 'warm', bright: 0.35 },
  kepler186: { root: 103.8, chords: [[0, 4, 7, 12], [5, 9, 12, 16], [-3, 0, 4, 9], [7, 11, 14, 19]], bpm: 68, voice: 'warm', bright: 0.6 },
  gliese: { root: 73.4, chords: [[0, 3, 7, 10], [1, 5, 8, 13], [-2, 1, 5, 10], [0, 3, 6, 10]], bpm: 62, voice: 'organ', bright: 0.35 },
  kepler452: { root: 116.5, chords: [[0, 4, 7, 14], [5, 9, 12, 17], [7, 11, 14, 19], [-3, 0, 4, 12]], bpm: 64, voice: 'organ', bright: 0.75 },
  avlu: { root: 77.8, chords: [[0, 1, 7, 12], [-1, 3, 6, 11], [0, 6, 7, 13], [-5, 0, 1, 8]], bpm: 48, voice: 'glass', bright: 0.25 },
  kizil: { root: 87.3, chords: MINOR, bpm: 60, voice: 'warm', bright: 0.4 },
  soluk: { root: 69.3, chords: [[0, 7, 10, 15], [-4, 3, 7, 12], [-2, 5, 9, 14], [-7, 0, 5, 10]], bpm: 52, voice: 'glass', bright: 0.3 },
}

const semi = (root: number, n: number) => root * Math.pow(2, n / 12)

export class Music {
  private ctx: AudioContext
  private out: GainNode
  private padBus: GainNode
  private arpBus: GainNode
  private fightBus: GainNode
  private filter: BiquadFilterNode
  private noise: AudioBuffer
  private theme: Theme = THEMES.gunes
  private next = 0
  private step = 0
  private chord = 0
  private fight = 0
  private fightWant = 0
  private timer: number | null = null
  private drone: OscillatorNode[] = []
  private droneGain: GainNode
  enabled = true

  constructor(ctx: AudioContext, dest: AudioNode, noise: AudioBuffer) {
    this.ctx = ctx
    this.noise = noise
    this.out = ctx.createGain()
    this.out.gain.value = 0.5
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 2400
    this.filter.connect(this.out)
    this.out.connect(dest)
    // Uzay yankısı: iki gecikmeli geri besleme (basit, ucuz bir hol).
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    for (const [t, fb] of [[0.31, 0.45], [0.47, 0.38]] as const) {
      const d = ctx.createDelay(1)
      d.delayTime.value = t
      const g = ctx.createGain()
      g.gain.value = fb
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1800
      d.connect(lp)
      lp.connect(g)
      g.connect(d)
      lp.connect(wet)
      this.filter.connect(d)
    }
    wet.connect(this.out)
    this.padBus = ctx.createGain()
    this.padBus.gain.value = 0.16
    this.padBus.connect(this.filter)
    this.arpBus = ctx.createGain()
    this.arpBus.gain.value = 0.09
    this.arpBus.connect(this.filter)
    this.fightBus = ctx.createGain()
    this.fightBus.gain.value = 0
    this.fightBus.connect(this.out)
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.05
    this.droneGain.connect(this.filter)
  }

  start() {
    if (this.timer !== null) return
    this.next = this.ctx.currentTime + 0.2
    this.setDrone()
    this.timer = window.setInterval(() => this.schedule(), 90)
  }

  setTheme(id: string) {
    const t = THEMES[id] ?? THEMES.gunes
    if (t === this.theme) return
    this.theme = t
    this.chord = 0
    this.step = 0
    this.setDrone()
  }

  /** 0 = sakin, 1 = tam savaş. Yavaşça geçer. */
  setFight(level: number) {
    this.fightWant = level
  }

  setVolume(v: number) {
    this.out.gain.setTargetAtTime(this.enabled ? 0.5 * v : 0, this.ctx.currentTime, 0.4)
  }

  private setDrone() {
    const t = this.ctx.currentTime
    for (const o of this.drone) o.stop(t + 2)
    this.drone = []
    for (const [m, type] of [[0.5, 'sine'], [0.75, 'sine'], [1, 'triangle']] as const) {
      const o = this.ctx.createOscillator()
      o.type = type
      o.frequency.value = this.theme.root * m
      o.detune.value = (Math.random() - 0.5) * 8
      o.connect(this.droneGain)
      o.start(t)
      this.drone.push(o)
    }
  }

  private schedule() {
    const ctx = this.ctx
    this.fight += (this.fightWant - this.fight) * 0.05
    this.fightBus.gain.setTargetAtTime(this.fight * 0.22, ctx.currentTime, 0.5)
    this.filter.frequency.setTargetAtTime(1400 + this.theme.bright * 2400 + this.fight * 1800, ctx.currentTime, 0.8)
    const bpm = this.theme.bpm * (1 + this.fight * 0.75)
    const beat = 60 / bpm / 2 // sekizlik
    while (this.next < ctx.currentTime + 0.35) {
      const t = this.next
      const chord = this.theme.chords[this.chord % this.theme.chords.length]
      if (this.step % 16 === 0) this.pad(t, chord, beat * 16)
      // Arpej: saat gibi düzenli, akorun notalarında yukarı-aşağı.
      const order = [0, 1, 2, 3, 2, 1, 3, 1]
      const n = chord[order[this.step % 8]] + 12
      this.arp(t, semi(this.theme.root, n), beat * 1.6, this.step % 4 === 0 ? 1 : 0.6)
      if (this.fight > 0.05) this.fightLayer(t, chord, beat)
      this.step++
      if (this.step % 16 === 0) this.chord++
      this.next += beat
    }
  }

  private env(t: number, a: number, d: number, peak: number) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
    return g
  }

  /** Org benzeri geniş akor: her notada sinüs + oktav + beşli, yavaş giriş. */
  private pad(t: number, chord: number[], len: number) {
    for (const n of chord) {
      const f = semi(this.theme.root, n)
      const g = this.env(t, len * 0.3, len * 0.85, 0.22)
      g.connect(this.padBus)
      for (const [m, amp] of [[1, 1], [2, 0.35], [3, 0.12], [0.5, 0.4]] as const) {
        const o = this.ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f * m
        o.detune.value = (Math.random() - 0.5) * 6
        const og = this.ctx.createGain()
        og.gain.value = amp
        o.connect(og)
        og.connect(g)
        o.start(t)
        o.stop(t + len * 1.2)
      }
    }
  }

  private arp(t: number, f: number, len: number, acc: number) {
    const v = this.theme.voice
    const g = this.env(t, v === 'warm' ? 0.04 : 0.008, len * (v === 'bell' ? 2.2 : 1.2), 0.3 * acc)
    g.connect(this.arpBus)
    const partials: [number, number, OscillatorType][] =
      v === 'bell' ? [[1, 1, 'sine'], [2.76, 0.35, 'sine'], [5.4, 0.12, 'sine']] : v === 'glass' ? [[1, 1, 'sine'], [2, 0.3, 'sine'], [4.01, 0.15, 'sine']] : v === 'warm' ? [[1, 1, 'triangle'], [2, 0.2, 'sine']] : [[1, 1, 'sine'], [2, 0.5, 'sine'], [4, 0.18, 'sine']]
    for (const [m, amp, type] of partials) {
      const o = this.ctx.createOscillator()
      o.type = type
      o.frequency.value = f * m
      const og = this.ctx.createGain()
      og.gain.value = amp
      o.connect(og)
      og.connect(g)
      o.start(t)
      o.stop(t + len * 2.5)
    }
  }

  /** Savaş katmanı: on altılık bas ostinatosu + davul (gürültü) + yükselen gerilim. */
  private fightLayer(t: number, chord: number[], beat: number) {
    const ctx = this.ctx
    const bassF = semi(this.theme.root, chord[0] - 12)
    for (let i = 0; i < 2; i++) {
      const tt = t + (i * beat) / 2
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = bassF * (i === 1 && this.step % 4 === 3 ? 1.5 : 1)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 380
      const g = this.env(tt, 0.005, beat * 0.4, 0.35)
      o.connect(lp)
      lp.connect(g)
      g.connect(this.fightBus)
      o.start(tt)
      o.stop(tt + beat * 0.6)
    }
    // Davul: 1 ve 3'te derin vuruş, aralarda tıkırtı.
    const kick = this.step % 4 === 0
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = kick ? 'lowpass' : 'highpass'
    f.frequency.value = kick ? 160 : 6000
    const g = this.env(t, 0.002, kick ? 0.25 : 0.05, kick ? 0.9 : 0.18)
    src.connect(f)
    f.connect(g)
    g.connect(this.fightBus)
    src.start(t, Math.random())
    src.stop(t + 0.3)
    if (kick) {
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(110, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.18)
      const kg = this.env(t, 0.002, 0.22, 0.8)
      o.connect(kg)
      kg.connect(this.fightBus)
      o.start(t)
      o.stop(t + 0.3)
    }
  }
}
