export class AudioBus {
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
      this.thrustGain = ctx.createGain()
      this.thrustGain.gain.value = 0
      src.connect(bp)
      bp.connect(this.thrustGain)
      this.thrustGain.connect(this.master)
      src.start()
    } catch {
      this.failed = true
      this.ctx = null
    }
  }

  setVolume(v: number) {
    this.volume = v
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(0.42 * v, this.ctx.currentTime, 0.05)
  }

  setThrust(amount: number) {
    if (!this.thrustGain || !this.ctx) return
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
    if (enemy) this.tone(240 + Math.random() * 40, 0.11, 0, 'sawtooth', 0.035)
    else this.tone(760 + Math.random() * 80, 0.07, 0, 'square', 0.03)
  }

  collect() {
    this.tone(620, 0.09, 0, 'sine', 0.05)
    this.tone(880, 0.12, 0.07, 'sine', 0.045)
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

  hit(shield: boolean) {
    this.tone(shield ? 420 : 140, shield ? 0.08 : 0.14, 0, shield ? 'triangle' : 'sawtooth', shield ? 0.04 : 0.06)
  }

  bang() {
    this.boom()
    this.tone(55, 0.8, 0, 'sine', 0.07)
  }
}
