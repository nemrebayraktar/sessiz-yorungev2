const BLOCK = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'KeyR',
  'KeyF',
  'KeyC',
  'KeyM',
  'KeyB',
  'KeyT',
  'KeyV',
  'KeyZ',
  'Tab',
  'Digit7',
  'Digit6',
  'Digit5',
  'Digit4',
  'Digit3',
  'Digit2',
  'Digit1',
  'KeyY',
  'KeyP',
  'KeyO',
  'KeyJ',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
])

export class Input {
  readonly keys = new Set<string>()
  private just = new Set<string>()
  mouseX = 0
  mouseY = 0
  mouseDown = false
  rightDown = false
  stickX = 0
  stickY = 0
  touchFire = false
  touchBoost = false
  touchUp = false
  touchDown = false
  touchRollL = false
  touchRollR = false
  touchAb1 = false
  touchAb2 = false
  touchLand = false
  touchJump = false
  touchPunch = false
  touchWeapon = false
  touchBuild = false
  touchTurret = false
  touchWave = false
  touchUpgrade = false
  touchSquad = false
  touchLook = false
  touchSilent = false
  touchScan = false
  touchSkill = false
  touchOrder = false
  touchDodge = false
  touchCam = false
  locked = false
  private readonly el: HTMLElement

  constructor(el: HTMLElement) {
    this.el = el
    window.addEventListener('keydown', (e) => {
      const typing = document.activeElement instanceof HTMLInputElement
      if (!typing && BLOCK.has(e.code) && !e.metaKey) e.preventDefault()
      if (e.repeat) {
        this.keys.add(e.code)
        return
      }
      if (!this.keys.has(e.code)) this.just.add(e.code)
      this.keys.add(e.code)
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.mouseDown = false
    })

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el
    })

    this.el.addEventListener('mousemove', (e) => {
      if (this.locked || e.buttons !== 0) {
        this.mouseX += e.movementX
        this.mouseY += e.movementY
      }
    })
    this.el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true
      if (e.button === 2) this.rightDown = true
    })
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false
      if (e.button === 2) this.rightDown = false
    })
    this.el.addEventListener('contextmenu', (e) => e.preventDefault())

    this.bindTouch()
    this.bindStick()
    this.bindTouchButtons()
  }

  requestLock() {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse) return
    const anyEl = this.el as HTMLElement & { requestPointerLock?: () => void | Promise<void> }
    try {
      const result = anyEl.requestPointerLock?.()
      if (result && typeof (result as Promise<void>).catch === 'function') {
        ;(result as Promise<void>).catch(() => {})
      }
    } catch {
      /* denied */
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock()
  }

  down(code: string) {
    return this.keys.has(code)
  }

  pressed(code: string) {
    return this.just.has(code)
  }

  anyPressed() {
    return this.just.size > 0
  }

  endFrame() {
    this.mouseX = 0
    this.mouseY = 0
    this.just.clear()
  }

  private bindTouch() {
    let lookId: number | null = null
    let lx = 0
    let ly = 0
    const pick = (list: TouchList, id: number) => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]
      return null
    }
    this.el.addEventListener(
      'touchstart',
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          // Joystick ve düğmeler ayrı öğelerdir; tuvaldeki her dokunuş bakış olur.
          if (lookId === null) {
            lookId = t.identifier
            lx = t.clientX
            ly = t.clientY
          }
        }
      },
      { passive: true },
    )
    this.el.addEventListener(
      'touchmove',
      (e) => {
        if (lookId === null) return
        const t = pick(e.touches, lookId)
        if (!t) return
        this.mouseX += t.clientX - lx
        this.mouseY += t.clientY - ly
        lx = t.clientX
        ly = t.clientY
        e.preventDefault()
      },
      { passive: false },
    )
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === lookId) lookId = null
    }
    this.el.addEventListener('touchend', end)
    this.el.addEventListener('touchcancel', end)
  }

  private bindStick() {
    const stick = document.getElementById('stick')
    const knob = document.getElementById('knob')
    if (!stick || !knob) return
    let id: number | null = null
    const move = (clientX: number, clientY: number) => {
      const rect = stick.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = clientX - cx
      const dy = clientY - cy
      const max = rect.width * 0.36
      const len = Math.hypot(dx, dy) || 1
      const k = Math.min(1, len / max)
      this.stickX = (dx / len) * k
      this.stickY = (-dy / len) * k
      const px = (dx / len) * k * max
      const py = (dy / len) * k * max
      knob.style.transform = `translate(${px}px, ${py}px)`
    }
    const reset = () => {
      id = null
      this.stickX = 0
      this.stickY = 0
      knob.style.transform = 'translate(0, 0)'
    }
    stick.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]
      id = t.identifier
      move(t.clientX, t.clientY)
      e.preventDefault()
    })
    stick.addEventListener(
      'touchmove',
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === id) move(t.clientX, t.clientY)
        }
        e.preventDefault()
      },
      { passive: false },
    )
    stick.addEventListener('touchend', reset)
    stick.addEventListener('touchcancel', reset)
  }

  private bindTouchButtons() {
    const root = document.getElementById('touch-buttons')
    if (!root) return
    const map: Record<string, keyof Input> = {
      fire: 'touchFire',
      boost: 'touchBoost',
      up: 'touchUp',
      down: 'touchDown',
      rollL: 'touchRollL',
      rollR: 'touchRollR',
      ab1: 'touchAb1',
      ab2: 'touchAb2',
      land: 'touchLand',
      jump: 'touchJump',
      punch: 'touchPunch',
      weapon: 'touchWeapon',
      build: 'touchBuild',
      turret: 'touchTurret',
      wave: 'touchWave',
      upgrade: 'touchUpgrade',
      squad: 'touchSquad',
      look: 'touchLook',
      silent: 'touchSilent',
      scan: 'touchScan',
      skill: 'touchSkill',
      order: 'touchOrder',
      dodge: 'touchDodge',
      cam: 'touchCam',
    }
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
      const key = map[btn.dataset.act || '']
      if (!key) return
      const set = (v: boolean) => {
        ;(this[key] as boolean) = v
        btn.classList.toggle('on', v)
      }
      const down = (e: Event) => {
        e.preventDefault()
        set(true)
      }
      const up = (e: Event) => {
        e.preventDefault()
        set(false)
      }
      btn.addEventListener('touchstart', down, { passive: false })
      btn.addEventListener('touchend', up)
      btn.addEventListener('touchcancel', up)
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return
        down(e)
      })
      btn.addEventListener('pointerup', up)
      btn.addEventListener('pointerleave', up)
    })
  }
}
