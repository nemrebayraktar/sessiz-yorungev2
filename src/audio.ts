import { Music } from './music'

export class AudioBus {
  music: Music | null = null
  musicOn = true
  private musicTheme = 'gunes'
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private thrustGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private ambientFilter: BiquadFilterNode | null = null
  private low: OscillatorNode | null = null
  private high: OscillatorNode | null = null
  private noise: AudioBuffer | null = null
  private volume = 0.72
  failed = false

  ensure() {
    if (this.failed) return
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) {
      this.failed = true
      return
    }
    try {
      const ctx = new AC()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.42 * this.volume
      this.master.connect(ctx.destination)

      const o1 = ctx.createOscillator()
      const o2 = ctx.createOscillator()
      o1.type = 'sine'
      o2.type = 'sine'
      o1.frequency.value = 44
      o2.frequency.value = 66
      const mix = ctx.createGain()
      mix.gain.value = 0.22
      o1.connect(mix)
      o2.connect(mix)
      this.ambientFilter = ctx.createBiquadFilter()
      this.ambientFilter.type = 'lowpass'
      this.ambientFilter.frequency.value = 220
      mix.connect(this.ambientFilter)
      this.ambientGain = ctx.createGain()
      this.ambientGain.gain.value = 0.45
      this.ambientFilter.connect(this.ambientGain)
      this.ambientGain.connect(this.master)
      o1.start()
      o2.start()
      this.low = o1
      this.high = o2

      const count = ctx.sampleRate * 2
      const buf = ctx.createBuffer(1, count, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < count; i++) data[i] = Math.random() * 2 - 1
      this.noise = buf

      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 160
      bp.Q.value = 0.65
      this.thrustFilter = bp
      this.thrustGain = ctx.createGain()
      this.thrustGain.gain.value = 0
      src.connect(bp)
      bp.connect(this.thrustGain)
      this.thrustGain.connect(this.master)
      src.start()
      // Özgün uyarlanır müzik (sistem temaları + savaş katmanı).
      this.music = new Music(ctx, this.master, buf)
      this.music.enabled = this.musicOn
      this.music.setTheme(this.musicTheme)
      this.music.setVolume(1)
      this.music.start()
    } catch {
      this.failed = true
      this.ctx = null
    }
  }

  setMusicTheme(id: string) {
    if (id === this.musicTheme) return
    this.musicTheme = id
    this.music?.setTheme(id)
  }

  setMusicFight(level: number) {
    this.music?.setFight(level)
  }

  setMusicOn(on: boolean) {
    this.musicOn = on
    if (this.music) {
      this.music.enabled = on
      this.music.setVolume(1)
    }
  }

  setVolume(v: number) {
    this.volume = v
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(0.42 * v, this.ctx.currentTime, 0.05)
  }

  private thrustFilter: BiquadFilterNode | null = null

  setThrust(amount: number) {
    if (!this.thrustGain || !this.ctx) return
    if (this.thrustFilter) this.thrustFilter.frequency.setTargetAtTime(this.engineHz * (1 + amount * 0.8), this.ctx.currentTime, 0.1)
    const g = Math.max(0, Math.min(1, amount)) * 0.16 * this.volume
    this.thrustGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.08)
  }

  setMood(visibility: number, timeFactor: number) {
    if (!this.ctx || !this.low || !this.high || !this.ambientFilter || !this.ambientGain) return
    const t = this.ctx.currentTime
    this.low.frequency.setTargetAtTime(32 + timeFactor * 22, t, 0.45)
    this.high.frequency.setTargetAtTime(52 + timeFactor * 30 + visibility * 0.15, t, 0.45)
    this.ambientFilter.frequency.setTargetAtTime(140 + visibility * 8 + (1 - timeFactor) * 220, t, 0.4)
    this.ambientGain.gain.setTargetAtTime(0.28 + (1 - timeFactor) * 0.45, t, 0.4)
  }

  private tone(freq: number, dur: number, delay: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master || this.volume <= 0.001) return
    const t = this.ctx.currentTime + delay
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(Math.max(30, freq), t)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.55), t + dur)
    const peak = Math.max(0.0008, gain * this.volume)
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.03)
  }

  laser(enemy = false) {
    // Gerçekçi "piyuv": hızla düşen perde + kısa tıslama.
    if (enemy) {
      this.sweep(520 + Math.random() * 60, 140, 0.16, 'sawtooth', 0.045)
      this.noiseHit(2400, 1.5, 0.05, 0.03, 'highpass')
    } else {
      this.sweep(1500 + Math.random() * 120, 300, 0.11, 'square', 0.03)
      this.sweep(900, 180, 0.09, 'sine', 0.035)
      this.noiseHit(3200, 1.2, 0.04, 0.025, 'highpass')
    }
  }

  /** Hayvansı ses: testere dişi kaynak + nefes gürültüsü, ünlü biçimlendiricilerden (formant) geçer.
   *  Perde konturu, titreme (vibrato) ve pürüz (jitter) canlı bir ses verir. */
  creature(pitch: number, dur: number, formants: number[], gain: number, rough = 0.3, end = 0.7, delay = 0) {
    if (!this.ctx || !this.master || !this.noise || this.volume <= 0.001) return
    const ctx = this.ctx
    const t = this.now() + delay
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0008, t)
    out.gain.exponentialRampToValueAtTime(Math.max(0.001, gain * this.volume), t + Math.min(0.05, dur * 0.2))
    out.gain.setValueAtTime(Math.max(0.001, gain * this.volume * 0.8), t + dur * 0.6)
    out.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    out.connect(this.master)
    const src = ctx.createOscillator()
    src.type = 'sawtooth'
    src.frequency.setValueAtTime(pitch * 0.9, t)
    src.frequency.linearRampToValueAtTime(pitch * 1.08, t + dur * 0.25)
    src.frequency.exponentialRampToValueAtTime(Math.max(30, pitch * end), t + dur)
    const lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = 5 + Math.random() * 4
    lg.gain.value = pitch * 0.04
    lfo.connect(lg)
    lg.connect(src.frequency)
    const jit = ctx.createOscillator()
    const jg = ctx.createGain()
    jit.type = 'square'
    jit.frequency.value = 23 + Math.random() * 14
    jg.gain.value = pitch * rough * 0.12
    jit.connect(jg)
    jg.connect(src.frequency)
    const breath = ctx.createBufferSource()
    breath.buffer = this.noise
    const bg = ctx.createGain()
    bg.gain.value = 0.25 + rough * 0.6
    breath.connect(bg)
    for (const [i, f] of formants.entries()) {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(f, t)
      bp.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + dur)
      bp.Q.value = 6 + i * 2
      const fg = ctx.createGain()
      fg.gain.value = 1 / (i + 1)
      src.connect(bp)
      bg.connect(bp)
      bp.connect(fg)
      fg.connect(out)
    }
    for (const n of [src, lfo, jit]) {
      n.start(t)
      n.stop(t + dur + 0.05)
    }
    breath.start(t, Math.random())
    breath.stop(t + dur + 0.05)
  }

  collect() {
    this.tone(620, 0.09, 0, 'sine', 0.05)
    this.tone(880, 0.12, 0.07, 'sine', 0.045)
  }

  quest() {
    this.tone(523, 0.12, 0, 'triangle', 0.05)
    this.tone(659, 0.12, 0.1, 'triangle', 0.05)
    this.tone(784, 0.22, 0.2, 'triangle', 0.06)
  }

  ui() {
    this.tone(540, 0.045, 0, 'sine', 0.04)
  }

  warning() {
    this.tone(196, 0.16, 0, 'square', 0.05)
    this.tone(146, 0.22, 0.14, 'square', 0.05)
  }

  boom() {
    if (!this.ctx || !this.master || !this.noise || this.volume <= 0.001) return
    // Katmanlı patlama: derin vuruş + çatırtı + uzayan gürleme.
    this.sweep(120, 38, 0.6, 'sine', 0.12)
    this.noiseHit(3000, 0.7, 0.18, 0.08, 'highpass')
    this.noiseHit(400, 0.6, 1.1, 0.07, 'lowpass', 0.06)
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(900, t)
    f.frequency.exponentialRampToValueAtTime(70, t + 0.5)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.28 * this.volume, t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 0.56)
    this.tone(78, 0.42, 0, 'sine', 0.08)
  }

  hit(shield: boolean, gain = 1) {
    if (shield) {
      // Kalkan: elektrikli vızıltı + çınlama.
      this.sweep(900, 420, 0.12, 'triangle', 0.04 * gain)
      this.noiseHit(5000, 3, 0.08, 0.04 * gain)
    } else {
      // Gövde: metal ezilmesi.
      this.noiseHit(900, 1.4, 0.2, 0.09 * gain)
      this.sweep(160, 70, 0.22, 'sawtooth', 0.05 * gain)
      this.noiseHit(4200, 8, 0.12, 0.03 * gain, 'bandpass', 0.02)
    }
  }

  /* ---------- Irka özel sesler (sentez) ---------- */

  private race = 'earth'
  private voiceBudget = 0
  private voiceT = 0

  /** Oyuncunun ırkı: silah ve motor tınısı buna göre değişir. */
  setRace(id: string) {
    this.race = id
    if (this.ctx && this.thrustGain) {
      // Motor gürültüsünün rengi ırka göre.
      const f = RACE_TIMBRE[id]?.engine ?? 160
      this.engineHz = f
    }
  }

  engineHz = 160

  private now() {
    return this.ctx ? this.ctx.currentTime : 0
  }

  /** Kısa gürültü patlaması (vuruş gövdesi, ayak, kaya sesi). */
  private noiseHit(freq: number, q: number, dur: number, gain: number, type: BiquadFilterType = 'bandpass', delay = 0) {
    if (!this.ctx || !this.master || !this.noise || this.volume <= 0.001) return
    const t = this.now() + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur)
    f.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(Math.max(0.0008, gain * this.volume), t)
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t, Math.random())
    src.stop(t + dur + 0.02)
  }

  /** Perde kaydıran ton (cıvıltı / homurtu / çan). */
  sweep(from: number, to: number, dur: number, type: OscillatorType, gain: number, delay = 0, vibrato = 0) {
    if (!this.ctx || !this.master || this.volume <= 0.001) return
    const t = this.now() + delay
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(Math.max(30, from), t)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur)
    if (vibrato > 0) {
      const lfo = this.ctx.createOscillator()
      const lg = this.ctx.createGain()
      lfo.frequency.value = 22 + Math.random() * 10
      lg.gain.value = vibrato
      lfo.connect(lg)
      lg.connect(o.frequency)
      lfo.start(t)
      lfo.stop(t + dur + 0.05)
    }
    g.gain.setValueAtTime(0.0008, t)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain * this.volume), t + Math.min(0.02, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
    o.connect(g)
    g.connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.03)
  }

  /** Bir ırkın sesi: saldırı çığlığı, acı, ölüm. Çok sık çalmasın diye saniyede ~8 sesle sınırlı. */
  voice(race: string, kind: 'attack' | 'hurt' | 'die', gain = 1) {
    if (!this.ctx || gain < 0.05) return
    const t = this.now()
    if (t - this.voiceT > 1) {
      this.voiceT = t
      this.voiceBudget = 8
    }
    if (kind !== 'die' && this.voiceBudget <= 0) return
    this.voiceBudget--
    const tm = RACE_TIMBRE[race] ?? RACE_TIMBRE[race.startsWith('wild') || race === 'gariban' ? 'wild' : race === 'cherub' ? 'kepler452' : 'earth']
    const v = tm.voice
    const k = kind === 'die' ? 1.4 : kind === 'hurt' ? 1 : 0.8
    const pitch = v.pitch * (kind === 'hurt' ? 1.25 : kind === 'die' ? 0.8 : 1) * (0.92 + Math.random() * 0.16)
    const dur = v.dur * (kind === 'die' ? 2.2 : 1)
    const amp = 0.05 * gain * k
    switch (v.kind) {
      case 'chirp':
        this.creature(pitch, dur, [1200, 2600, 3800], amp * 1.6, 0.2, kind === 'die' ? 0.4 : 1.5)
        this.sweep(pitch * 1.5, pitch * 2.2, dur * 0.6, 'triangle', amp * 0.3, dur * 0.3)
        break
      case 'growl':
        this.creature(pitch * 0.8, dur * 1.3, [420, 900, 2300], amp * 2.2, 0.8, 0.6)
        break
      case 'chime':
        for (const [i, m] of [1, 2.01, 3.02].entries()) this.sweep(pitch * m, pitch * m * (kind === 'die' ? 0.6 : 1.02), dur * (1.4 - i * 0.3), 'sine', amp * (0.8 - i * 0.2), i * 0.03)
        break
      case 'bubble':
        for (let i = 0; i < 3; i++) this.sweep(pitch * (1 + i * 0.25), pitch * (1.8 + i * 0.3), dur * 0.35, 'sine', amp * 0.8, i * dur * 0.28)
        break
      case 'rustle':
        this.noiseHit(pitch * 6, 0.8, dur, amp * 1.1, 'highpass')
        this.sweep(pitch, pitch * 1.3, dur * 0.6, 'triangle', amp * 0.5)
        break
      case 'rock':
        // Golem: göğüsten gelen derin, taşlı bir böğürtü.
        this.creature(pitch * 0.6, dur * 1.5, [220, 520, 1200], amp * 2.4, 1, 0.5)
        this.noiseHit(pitch * 2, 1.2, dur * 1.3, amp * 1.2, 'lowpass')
        break
      case 'bell':
        this.sweep(pitch, pitch, dur * 1.8, 'sine', amp * 0.9)
        this.sweep(pitch * 1.5, pitch * 1.5, dur * 1.4, 'sine', amp * 0.45, 0.02)
        this.sweep(pitch * 2.76, pitch * 2.7, dur, 'triangle', amp * 0.2, 0.04)
        break
      case 'clank':
        this.noiseHit(pitch * 4, 6, dur * 0.6, amp * 1.2)
        this.sweep(pitch, pitch * 0.8, dur, 'square', amp * 0.4)
        break
      case 'roar':
        this.creature(pitch * 0.7, dur * 1.6, [300, 700, 1800], amp * 2.6, 0.9, 0.55)
        this.noiseHit(pitch * 2.5, 1, dur * 1.2, amp * 0.6, 'lowpass')
        break
      default:
        // İnsansı: "hah!/ah" ünlüsü.
        this.creature(pitch, dur * 1.1, [700, 1200, 2600], amp * 1.8, 0.35, kind === 'die' ? 0.5 : 0.85)
    }
  }

  /** Irka özgü saldırı sesi (gövde biçimine göre). Yancılarda daha ince ve kısık. */
  attackFx(form: string, gain = 1, small = false) {
    if (!this.ctx || gain < 0.05) return
    const t = this.now()
    if (t - this.voiceT > 1) {
      this.voiceT = t
      this.voiceBudget = 8
    }
    if (this.voiceBudget <= 0) return
    this.voiceBudget--
    const g = gain * (small ? 0.6 : 1)
    const up = small ? 1.4 : 1
    switch (form) {
      case 'astronaut': // savurma + tok yumruk
        this.noiseHit(1600 * up, 0.8, 0.1, 0.04 * g, 'highpass')
        this.sweep(150 * up, 70, 0.12, 'sine', 0.09 * g, 0.12)
        break
      case 'colonist': // metal balyoz
        this.noiseHit(700, 1, 0.12, 0.03 * g, 'lowpass', 0)
        this.noiseHit(2600 * up, 8, 0.25, 0.06 * g, 'bandpass', 0.14)
        this.sweep(220 * up, 160, 0.3, 'square', 0.03 * g, 0.14)
        break
      case 'shade': // çene şaklaması + hırıltı
        this.sweep(110 * up, 80, 0.2, 'sawtooth', 0.04 * g, 0, 30)
        this.noiseHit(4200, 6, 0.03, 0.08 * g, 'bandpass', 0.13)
        this.noiseHit(3600, 6, 0.03, 0.07 * g, 'bandpass', 0.17)
        break
      case 'bighead': // tuhaf "boing" kafa atışı
        this.sweep(260 * up, 520 * up, 0.12, 'sine', 0.05 * g, 0, 18)
        this.sweep(180, 90, 0.12, 'triangle', 0.06 * g, 0.13)
        break
      case 'crystal': // dönen kristal çınlaması
        for (let i = 0; i < 4; i++) this.sweep(1320 * up * (1 + i * 0.25), 1320 * up * (1 + i * 0.25), 0.18, 'sine', 0.025 * g, i * 0.05)
        this.noiseHit(6000, 2, 0.2, 0.02 * g, 'highpass', 0.05)
        break
      case 'belly': // göbek pıtırtısı
        this.sweep(90 * up, 160 * up, 0.08, 'sine', 0.08 * g, 0.12)
        this.sweep(160 * up, 70, 0.16, 'sine', 0.07 * g, 0.2)
        break
      case 'sprout': // kırbaç şaklaması
        this.noiseHit(2400, 0.7, 0.14, 0.03 * g, 'highpass')
        this.noiseHit(5200, 3, 0.025, 0.12 * g, 'bandpass', 0.17)
        break
      case 'golem': // yer sarsan darbe
        this.noiseHit(400, 0.7, 0.5, 0.12 * g, 'lowpass', 0.16)
        this.sweep(70 * up, 38, 0.5, 'sine', 0.14 * g, 0.16)
        break
      case 'regal': // büyü akoru
        for (const [i, f] of [523, 659, 784].entries()) this.sweep(f * up, f * up * 1.01, 0.35, 'sine', 0.03 * g, i * 0.03)
        this.noiseHit(8000, 1, 0.3, 0.015 * g, 'highpass', 0.1)
        break
      case 'yeti': // kükreme + çifte darbe
        this.sweep(150 * up, 90, 0.35, 'sawtooth', 0.05 * g, 0, 40)
        this.noiseHit(300, 0.8, 0.3, 0.08 * g, 'lowpass', 0.2)
        break
      default: // yabani: hırlayıp atılır
        this.sweep(220 * up, 140, 0.15, 'sawtooth', 0.035 * g, 0, 25)
        this.noiseHit(3000, 4, 0.04, 0.06 * g, 'bandpass', 0.15)
    }
  }

  /** Tarama pingi: sonar gibi yankılanan ton. */
  scan() {
    this.sweep(1400, 700, 0.5, 'sine', 0.05)
    this.sweep(1400, 700, 0.5, 'sine', 0.025, 0.35)
    this.sweep(1400, 700, 0.5, 'sine', 0.012, 0.7)
  }

  /** Solucan deliği geçişi: yükselen uğultu ve süpürme. */
  warp() {
    this.sweep(90, 620, 1.1, 'sawtooth', 0.035, 0, 12)
    this.sweep(180, 1240, 1.0, 'sine', 0.03, 0.05)
    this.noiseHit(3000, 0.6, 1.2, 0.05, 'bandpass')
  }

  /** Yumruk: hava savurma + isabet varsa tok darbe. */
  punch(landed: boolean) {
    // Savurma sesi attackFx'te; burada yalnız isabetin tok darbesi.
    if (landed) {
      this.sweep(140, 60, 0.14, 'sine', 0.12, 0.03)
      this.noiseHit(500, 1.4, 0.1, 0.09, 'lowpass', 0.03)
    }
  }

  turret(mine: boolean, gain = 1) {
    if (gain < 0.05) return
    this.sweep(mine ? 1300 : 900, mine ? 420 : 260, 0.09, 'square', 0.025 * gain)
    this.noiseHit(mine ? 3000 : 2000, 2, 0.05, 0.02 * gain)
  }

  /** Oyuncu gemisinin ateşi: ırkın tınısıyla. */
  /** Silaha özel atış sesi: ırkın tınısının üstüne silahın karakteri (gürleme, tıslama, kalkış). */
  weaponShot(kind: 'laser' | 'spread' | 'rocket' | 'plasma' | 'chain') {
    if (!this.ctx || this.volume <= 0.001) return
    if (kind === 'laser') {
      // Taramalı: kısa, sert "tak" + parlak çıt.
      this.sweep(2100 + Math.random() * 200, 420, 0.06, 'square', 0.022)
      this.noiseHit(5200, 1.4, 0.03, 0.03, 'highpass')
      this.sweep(160, 70, 0.07, 'sine', 0.04)
    } else if (kind === 'spread') {
      // Saçma: kalın patlama + metalik çınlama.
      this.noiseHit(1800, 0.8, 0.14, 0.09, 'lowpass')
      this.sweep(220, 50, 0.18, 'sine', 0.1)
      this.noiseHit(6000, 2, 0.05, 0.03, 'highpass')
    } else if (kind === 'rocket') {
      // Roket: ateşleme "tuf" + yükselen tıslama (uzaklaşan füze).
      this.sweep(90, 45, 0.25, 'sine', 0.1)
      this.noiseHit(900, 0.7, 0.5, 0.05, 'bandpass')
      this.sweep(380, 1400, 0.45, 'sawtooth', 0.018, 0.04)
    } else if (kind === 'plasma') {
      // Plazma: dolup boşalan uğultu.
      this.sweep(140, 520, 0.12, 'triangle', 0.05)
      this.sweep(520, 90, 0.28, 'sawtooth', 0.04, 0.1, 18)
    } else {
      // Şimşek: çatırtı.
      this.noiseHit(4200, 3, 0.12, 0.06, 'bandpass')
      this.sweep(2600, 900, 0.1, 'square', 0.02, 0, 60)
    }
  }

  shipShot() {
    const w = (RACE_TIMBRE[this.race] ?? RACE_TIMBRE.earth).shot
    this.sweep(w.from * (0.95 + Math.random() * 0.1), w.to, w.dur, w.type, w.gain)
    if (w.noise) this.noiseHit(w.noise, 2, w.dur * 0.8, w.gain * 0.6)
  }

  step(race: string, gain = 0.5) {
    const tm = RACE_TIMBRE[race] ?? RACE_TIMBRE.earth
    this.noiseHit(tm.step, 1.5, 0.05, 0.02 * gain, 'lowpass')
  }

  bang() {
    this.boom()
    this.tone(55, 0.8, 0, 'sine', 0.07)
  }
}

type Timbre = {
  voice: { kind: 'chirp' | 'growl' | 'chime' | 'bubble' | 'rustle' | 'rock' | 'bell' | 'clank' | 'roar' | 'hup'; pitch: number; dur: number }
  shot: { from: number; to: number; dur: number; type: OscillatorType; gain: number; noise?: number }
  engine: number
  step: number
}

/** Irkların ses kişiliği: ses rengi, silah ve motor tınısı. */
const RACE_TIMBRE: Record<string, Timbre> = {
  earth: { voice: { kind: 'hup', pitch: 220, dur: 0.14 }, shot: { from: 820, to: 420, dur: 0.07, type: 'square', gain: 0.03 }, engine: 160, step: 500 },
  mars: { voice: { kind: 'clank', pitch: 160, dur: 0.16 }, shot: { from: 520, to: 180, dur: 0.12, type: 'sawtooth', gain: 0.035, noise: 900 }, engine: 110, step: 380 },
  proxima: { voice: { kind: 'growl', pitch: 120, dur: 0.22 }, shot: { from: 1400, to: 900, dur: 0.05, type: 'sine', gain: 0.025 }, engine: 240, step: 900 },
  alpha: { voice: { kind: 'chirp', pitch: 620, dur: 0.12 }, shot: { from: 1100, to: 1900, dur: 0.08, type: 'sine', gain: 0.03 }, engine: 200, step: 700 },
  trappist: { voice: { kind: 'chime', pitch: 880, dur: 0.25 }, shot: { from: 1760, to: 1320, dur: 0.1, type: 'triangle', gain: 0.03 }, engine: 260, step: 1400 },
  k218: { voice: { kind: 'bubble', pitch: 260, dur: 0.24 }, shot: { from: 600, to: 300, dur: 0.1, type: 'sine', gain: 0.04, noise: 400 }, engine: 120, step: 300 },
  kepler186: { voice: { kind: 'rustle', pitch: 330, dur: 0.18 }, shot: { from: 700, to: 500, dur: 0.08, type: 'triangle', gain: 0.03, noise: 2400 }, engine: 180, step: 1200 },
  gliese: { voice: { kind: 'rock', pitch: 90, dur: 0.22 }, shot: { from: 300, to: 90, dur: 0.16, type: 'sawtooth', gain: 0.045, noise: 600 }, engine: 90, step: 220 },
  kepler452: { voice: { kind: 'bell', pitch: 520, dur: 0.22 }, shot: { from: 990, to: 990, dur: 0.12, type: 'sine', gain: 0.03 }, engine: 210, step: 800 },
  ice: { voice: { kind: 'roar', pitch: 140, dur: 0.3 }, shot: { from: 500, to: 200, dur: 0.1, type: 'square', gain: 0.03 }, engine: 140, step: 300 },
  wild: { voice: { kind: 'growl', pitch: 200, dur: 0.16 }, shot: { from: 500, to: 200, dur: 0.1, type: 'square', gain: 0.03 }, engine: 140, step: 400 },
}
