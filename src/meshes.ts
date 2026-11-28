import {
  AdditiveBlending,
  OctahedronGeometry,
  CircleGeometry,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  MeshStandardMaterial,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from 'three'
import { shieldFrag, shieldVert } from './shaders'
import { SHIP_STYLE, buildNeonBody } from './ships'

let glowTex: CanvasTexture | null = null

export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  if (!g) {
    glowTex = new CanvasTexture(c)
    return glowTex
  }
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  glowTex = new CanvasTexture(c)
  glowTex.colorSpace = SRGBColorSpace
  return glowTex
}

export type PlayerVisual = {
  root: Group
  body: Group
  cockpit: Group
  plumes: Mesh[]
  plumeMats: MeshBasicMaterial[]
  shield: Mesh
  shieldMat: ShaderMaterial
  engineLight: PointLight
  muzzle: Sprite
}

export function buildPlayer(): PlayerVisual {
  const root = new Group()
  const body = new Group()
  body.name = 'body'

  const pts = [
    new Vector2(0.02, -2.25),
    new Vector2(0.22, -2.05),
    new Vector2(0.4, -1.15),
    new Vector2(0.5, -0.15),
    new Vector2(0.42, 0.75),
    new Vector2(0.24, 1.45),
    new Vector2(0.1, 2.05),
    new Vector2(0.0, 2.48),
  ]
  const hullMat = new MeshStandardMaterial({
    color: 0xc9ced6,
    metalness: 0.74,
    roughness: 0.32,
    emissive: 0x12151c,
    emissiveIntensity: 0.45,
  })
  const hull = new Mesh(new LatheGeometry(pts, 20), hullMat)
  hull.rotation.x = -Math.PI / 2
  body.add(hull)

  const wingMat = new MeshStandardMaterial({
    color: 0x8e96a3,
    metalness: 0.68,
    roughness: 0.38,
    emissive: 0x0c0e13,
    emissiveIntensity: 0.3,
  })
  const wingGeo = new BoxGeometry(1.7, 0.045, 0.95)
  const wingL = new Mesh(wingGeo, wingMat)
  wingL.position.set(-1.15, 0.02, 0.35)
  wingL.rotation.z = 0.08
  wingL.rotation.y = 0.25
  const wingR = wingL.clone()
  wingR.position.x = 1.15
  wingR.rotation.z = -0.08
  wingR.rotation.y = -0.25
  body.add(wingL, wingR)

  const canard = new BoxGeometry(0.55, 0.03, 0.28)
  const cL = new Mesh(canard, wingMat)
  cL.position.set(-0.48, 0.08, -1.15)
  const cR = cL.clone()
  cR.position.x = 0.48
  body.add(cL, cR)

  const spine = new Mesh(new BoxGeometry(0.07, 0.05, 2.4), wingMat)
  spine.position.set(0, 0.46, 0.05)
  body.add(spine)
  const fin = new Mesh(new BoxGeometry(0.035, 0.55, 0.7), wingMat)
  fin.position.set(0, 0.38, 1.35)
  body.add(fin)

  const glass = new Mesh(
    new SphereGeometry(0.28, 16, 12),
    new MeshStandardMaterial({
      color: 0x10151c,
      metalness: 0.2,
      roughness: 0.08,
      emissive: 0x1a3344,
      emissiveIntensity: 0.4,
    }),
  )
  glass.scale.set(0.85, 0.7, 1.35)
  glass.position.set(0, 0.22, -0.85)
  body.add(glass)

  const nose = new Mesh(
    new SphereGeometry(0.045, 8, 8),
    new MeshBasicMaterial({ color: 0xd5e7ff }),
  )
  nose.position.set(0, 0.12, -2.2)
  ;(nose.material as MeshBasicMaterial).toneMapped = false
  body.add(nose)

  const nozzleGeo = new CylinderGeometry(0.13, 0.18, 0.36, 12)
  const nozzleMat = new MeshStandardMaterial({
    color: 0x2a241c,
    emissive: 0xffb07a,
    emissiveIntensity: 0.35,
    metalness: 0.4,
    roughness: 0.45,
  })
  const nL = new Mesh(nozzleGeo, nozzleMat)
  nL.rotation.x = Math.PI / 2
  nL.position.set(-0.28, 0, 2.05)
  const nR = nL.clone()
  nR.position.x = 0.28
  body.add(nL, nR)

  root.add(body)

  const plumeGeo = new ConeGeometry(0.2, 1.5, 10, 1, true)
  plumeGeo.translate(0, 0.75, 0)
  const plumes: Mesh[] = []
  const plumeMats: MeshBasicMaterial[] = []
  for (const x of [-0.28, 0.28]) {
    const mat = new MeshBasicMaterial({
      color: 0xffc49a,
      transparent: true,
      opacity: 0.0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    mat.toneMapped = false
    const plume = new Mesh(plumeGeo, mat)
    plume.rotation.x = Math.PI / 2
    plume.position.set(x, 0, 2.15)
    plume.visible = false
    root.add(plume)
    plumes.push(plume)
    plumeMats.push(mat)
  }

  const shieldMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uLevel: { value: 1 },
      uFlash: { value: 0 },
      uColor: { value: new Color(0.62, 0.86, 0.84) },
    },
    vertexShader: shieldVert,
    fragmentShader: shieldFrag,
  })
  const shield = new Mesh(new SphereGeometry(1.15, 28, 18), shieldMat)
  shield.scale.set(1.2, 0.78, 1.62)
  shield.renderOrder = 2
  root.add(shield)

  const engineLight = new PointLight(0xffb080, 0, 14, 2)
  engineLight.position.set(0, 0, 2.4)
  root.add(engineLight)

  const muzzleMat = new SpriteMaterial({
    map: glowTexture(),
    color: 0xffe2c4,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  })
  muzzleMat.toneMapped = false
  const muzzle = new Sprite(muzzleMat)
  muzzle.scale.set(1.4, 1.4, 1)
  muzzle.position.set(0, 0, -2.35)
  muzzle.visible = false
  root.add(muzzle)

  const cockpit = buildCockpit(0x7fd0ff)
  root.add(cockpit)
  return { root, body, cockpit, plumes, plumeMats, shield, shieldMat, engineLight, muzzle }
}

const alienCone = new ConeGeometry(0.58, 2.7, 5)
const alienWing = new BoxGeometry(1.55, 0.05, 0.42)
const alienEye = new SphereGeometry(0.14, 12, 10)

export type AlienVisual = {
  root: Group
  bodyMat: MeshStandardMaterial
  eyeMat: MeshBasicMaterial
}

const cuteColors = [0xc45b78, 0x6fbf73, 0xe0a15a, 0x7d6bd6, 0x3a2a55]

export function buildCuteAlien(shape = 0, scale = 1): AlienVisual {
  const root = new Group()
  const color = cuteColors[shape % cuteColors.length]
  const bodyMat = new MeshStandardMaterial({
    color,
    metalness: 0.28,
    roughness: 0.48,
    emissive: color,
    emissiveIntensity: shape === 4 ? 0.35 : 0.22,
  })
  const eyeMat = new MeshBasicMaterial({ color: shape === 4 ? 0xd7c6ff : 0xfff6ea })
  eyeMat.toneMapped = false
  const body = new Mesh(new SphereGeometry(0.72, 14, 12), bodyMat)
  const head = new Mesh(new SphereGeometry(0.46, 14, 12), bodyMat)
  head.position.set(0, 0.62, -0.15)
  if (shape === 1) {
    body.scale.set(0.85, 1.15, 0.9)
    head.scale.set(1.25, 1.05, 1.1)
  } else if (shape === 2) {
    body.scale.set(1.25, 0.72, 1.05)
    head.position.y = 0.42
  } else if (shape === 3) {
    body.scale.set(0.55, 0.7, 0.55)
    head.scale.set(1.45, 0.55, 1.45)
    head.position.y = 0.85
  } else if (shape === 4) {
    body.scale.set(1.15, 0.9, 1.05)
    const ring = new Mesh(new TorusGeometry(1.05, 0.08, 8, 24), bodyMat)
    ring.rotation.x = Math.PI / 2
    root.add(ring)
  }
  const pupilMat = new MeshBasicMaterial({ color: 0x1a1020 })
  for (const x of [-0.18, 0.18]) {
    const eye = new Mesh(new SphereGeometry(0.13, 10, 8), eyeMat)
    eye.position.set(x, head.position.y + 0.05, 0.32)
    const pupil = new Mesh(new SphereGeometry(0.06, 8, 8), pupilMat)
    pupil.position.set(x, head.position.y + 0.04, 0.42)
    root.add(eye, pupil)
  }
  root.add(body, head)
  root.scale.setScalar(scale)
  return { root, bodyMat, eyeMat }
}

export function buildAlien(scale = 1): AlienVisual {
  const root = new Group()
  const bodyMat = new MeshStandardMaterial({
    color: 0x3a1a22,
    metalness: 0.62,
    roughness: 0.4,
    emissive: 0x4a1016,
    emissiveIntensity: 0.55,
  })
  const body = new Mesh(alienCone, bodyMat)
  body.rotation.x = -Math.PI / 2
  root.add(body)
  const wingL = new Mesh(alienWing, bodyMat)
  wingL.position.set(-0.95, 0, 0.25)
  wingL.rotation.y = 0.55
  wingL.rotation.z = 0.12
  const wingR = wingL.clone()
  wingR.position.x = 0.95
  wingR.rotation.y = -0.55
  wingR.rotation.z = -0.12
  root.add(wingL, wingR)
  const eyeMat = new MeshBasicMaterial({ color: 0xff3a2a })
  eyeMat.color.multiplyScalar(1.7)
  eyeMat.toneMapped = false
  const eye = new Mesh(alienEye, eyeMat)
  eye.position.set(0, 0.08, -1.15)
  root.add(eye)
  const beaconMat = new SpriteMaterial({
    map: glowTexture(),
    color: 0xff3b32,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  })
  beaconMat.toneMapped = false
  const beacon = new Sprite(beaconMat)
  beacon.scale.set(2.6, 2.6, 1)
  beacon.position.set(0, 0, 0.2)
  root.add(beacon)
  root.scale.setScalar(scale)
  return { root, bodyMat, eyeMat }
}

export function buildFragment() {
  const root = new Group()
  const mesh = new Mesh(
    new IcosahedronGeometry(0.62, 0),
    new MeshStandardMaterial({
      color: 0xd8a15a,
      emissive: 0xffb15a,
      emissiveIntensity: 0.85,
      metalness: 0.35,
      roughness: 0.28,
    }),
  )
  const glowMat = new SpriteMaterial({
    map: glowTexture(),
    color: 0xffc48a,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0.8,
  })
  const glow = new Sprite(glowMat)
  glow.scale.set(3.4, 3.4, 1)
  root.add(mesh, glow)
  return root
}

export function buildFleetIcon(count: number) {
  const root = new Group()
  const n = Math.min(3, count)
  const offsets = [
    [0, 0, 0],
    [-2.4, 0.3, 1.8],
    [2.3, -0.25, 1.7],
  ]
  for (let i = 0; i < n; i++) {
    const a = buildAlien(0.62)
    a.root.position.set(offsets[i][0], offsets[i][1], offsets[i][2])
    root.add(a.root)
  }
  return root
}

function metal(color: number, emissive: number, intensity = 0.35) {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    metalness: 0.62,
    roughness: 0.38,
  })
}

/** Kokpit içi (birinci şahıs): konsol, ekranlar, ışıklı düğmeler, pilotun kolları ve iki kumanda kolu.
 *  Kamera gemi yerelinde (0, 0.36, -0.22) noktasında; ileri -z. Hepsi MeshBasic: ışıktan bağımsız okunur. */
/** Irka özel pilot kolu: kol rengi/kalınlığı, el biçimi ve ekler (pençe, diken, yaprak, kristal...). */
type ArmStyle = { suit: number; glove: number; r: number; hand: 'glove' | 'claw' | 'rock' | 'crystal' | 'fin' | 'vine' | 'gold' | 'slim'; extra?: number }
const ARM_STYLE: Record<string, ArmStyle> = {
  earth: { suit: 0xd8dde6, glove: 0x8a929e, r: 1, hand: 'glove' },
  mars: { suit: 0x8a3a24, glove: 0x4a2a20, r: 1.15, hand: 'glove', extra: 0xff8a4a },
  proxima: { suit: 0x1a1016, glove: 0x0a0608, r: 0.8, hand: 'claw', extra: 0xff2a6a },
  alpha: { suit: 0x6a4a9a, glove: 0x9a7ac8, r: 0.7, hand: 'slim' },
  trappist: { suit: 0x2a8a80, glove: 0x8af0e0, r: 0.9, hand: 'crystal' },
  k218: { suit: 0x1a5a8a, glove: 0x3a8ac0, r: 1, hand: 'fin' },
  kepler186: { suit: 0x5a2a1a, glove: 0x8a3a2a, r: 0.9, hand: 'vine', extra: 0x7aff7a },
  gliese: { suit: 0x2a1a14, glove: 0x3a2418, r: 1.5, hand: 'rock', extra: 0xff5a1a },
  kepler452: { suit: 0xc8a050, glove: 0xf0d890, r: 0.95, hand: 'gold', extra: 0xffe08a },
}

function buildArm(kind: string, side: number, neon: Color) {
  const st = ARM_STYLE[kind] ?? ARM_STYLE.earth
  const arm = new Group()
  const suit = new MeshBasicMaterial({ color: st.suit })
  const glove = new MeshBasicMaterial({ color: st.glove })
  const glow = new MeshBasicMaterial({ color: new Color(st.extra ?? neon.getHex()).multiplyScalar(1.6) })
  glow.toneMapped = false
  const r = 0.026 * st.r
  const fore = new Mesh(new CylinderGeometry(r, r * 1.25, 0.32, st.hand === 'rock' ? 6 : 10), suit)
  fore.position.set(0, 0, 0.18)
  fore.rotation.x = Math.PI / 2
  arm.add(fore)
  const cuff = new Mesh(new CylinderGeometry(r * 1.08, r * 1.08, 0.016, 10), glow)
  cuff.position.set(0, 0, 0.035)
  cuff.rotation.x = Math.PI / 2
  arm.add(cuff)
  switch (st.hand) {
    case 'claw': {
      const palm = new Mesh(new SphereGeometry(0.024, 10, 8), glove)
      arm.add(palm)
      for (let i = 0; i < 3; i++) {
        const c = new Mesh(new ConeGeometry(0.006, 0.05, 5), glow)
        c.position.set((i - 1) * 0.013, 0.012, -0.03)
        c.rotation.x = -Math.PI / 2 - 0.3
        arm.add(c)
      }
      break
    }
    case 'rock': {
      const fist = new Mesh(new IcosahedronGeometry(0.045, 0), glove)
      arm.add(fist)
      for (let i = 0; i < 3; i++) {
        const crack = new Mesh(new BoxGeometry(0.004, 0.004, 0.2), glow)
        crack.position.set((i - 1) * 0.015, r * 0.9, 0.16)
        arm.add(crack)
      }
      break
    }
    case 'crystal': {
      const hand = new Mesh(new OctahedronGeometry(0.032, 0), glove)
      hand.scale.set(1, 1.4, 1)
      arm.add(hand)
      const spike = new Mesh(new OctahedronGeometry(0.014, 0), glow)
      spike.position.set(side * 0.025, 0.03, 0.08)
      arm.add(spike)
      break
    }
    case 'fin': {
      const hand = new Mesh(new SphereGeometry(0.03, 12, 8), glove)
      hand.scale.set(1.1, 0.8, 1.2)
      const fin = new Mesh(new ConeGeometry(0.02, 0.09, 4), glow)
      fin.position.set(side * 0.03, 0.01, 0.12)
      fin.rotation.z = side * -1.2
      arm.add(hand, fin)
      break
    }
    case 'vine': {
      const hand = new Mesh(new SphereGeometry(0.028, 10, 8), glove)
      arm.add(hand)
      for (let i = 0; i < 3; i++) {
        const leaf = new Mesh(new ConeGeometry(0.012, 0.04, 4), glow)
        leaf.position.set(side * 0.022, 0.01, 0.08 + i * 0.07)
        leaf.rotation.z = side * -1.3
        arm.add(leaf)
      }
      break
    }
    case 'gold': {
      const hand = new Mesh(new SphereGeometry(0.03, 12, 8), glove)
      hand.scale.set(1, 0.9, 1.2)
      const ring = new Mesh(new TorusGeometry(r * 1.3, 0.005, 6, 18), glow)
      ring.position.z = 0.09
      const gem = new Mesh(new OctahedronGeometry(0.008), glow)
      gem.position.set(0, 0.026, -0.005)
      arm.add(hand, ring, gem)
      break
    }
    case 'slim': {
      const hand = new Mesh(new SphereGeometry(0.022, 10, 8), glove)
      arm.add(hand)
      for (let i = 0; i < 3; i++) {
        const f = new Mesh(new CylinderGeometry(0.0035, 0.004, 0.05, 5), glove)
        f.position.set((i - 1) * 0.01, 0, -0.035)
        f.rotation.x = Math.PI / 2 + 0.25
        arm.add(f)
      }
      break
    }
    default: {
      const hand = new Mesh(new SphereGeometry(0.03, 12, 8), glove)
      hand.scale.set(1, 0.9, 1.2)
      arm.add(hand)
      if (st.extra) {
        const plate = new Mesh(new BoxGeometry(0.05, 0.012, 0.1), glow)
        plate.position.set(0, r * 1.1, 0.14)
        arm.add(plate)
      }
    }
  }
  return arm
}

function buildCockpit(neonHex: number, kind = 'earth') {
  const g = new Group()
  g.name = 'cockpit'
  g.visible = false
  const neon = new Color(neonHex)
  const dark = new MeshBasicMaterial({ color: 0x0c0f15 })
  const metal = new MeshBasicMaterial({ color: 0x1b212b })
  const trimMat = new MeshBasicMaterial({ color: neon.clone().multiplyScalar(1.4) })
  trimMat.toneMapped = false
  // Konsol: kameranın altında öne eğik pano.
  const dash = new Mesh(new BoxGeometry(1.5, 0.05, 0.42), metal)
  dash.position.set(0, 0.02, -0.72)
  dash.rotation.x = -0.42
  g.add(dash)
  const lip = new Mesh(new BoxGeometry(1.5, 0.012, 0.012), trimMat)
  lip.position.set(0, 0.1, -0.9)
  g.add(lip)
  // Üç ekran: radar, durum çubukları, hedef.
  const screen = (x: number, w: number, hex: number, kind: number) => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 96
    const ctx = c.getContext('2d') as CanvasRenderingContext2D
    ctx.fillStyle = '#04070c'
    ctx.fillRect(0, 0, 128, 96)
    const col = `#${new Color(hex).getHexString()}`
    ctx.strokeStyle = col
    ctx.fillStyle = col
    ctx.lineWidth = 2
    if (kind === 0) {
      for (const r of [14, 28, 42]) {
        ctx.beginPath()
        ctx.arc(64, 48, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.fillRect(62, 46, 4, 4)
      ctx.fillRect(84, 30, 3, 3)
    } else if (kind === 1) {
      ;[0.9, 0.65, 0.4, 0.75].forEach((k, i) => ctx.fillRect(14, 14 + i * 18, 100 * k, 9))
    } else {
      ctx.beginPath()
      ctx.moveTo(64, 18)
      ctx.lineTo(64, 78)
      ctx.moveTo(34, 48)
      ctx.lineTo(94, 48)
      ctx.stroke()
      ctx.strokeRect(46, 30, 36, 36)
    }
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    const m = new MeshBasicMaterial({ map: tex, color: 0xffffff })
    m.toneMapped = false
    const p = new Mesh(new BoxGeometry(w, 0.1, 0.006), m)
    p.position.set(x, 0.1, -0.84)
    p.rotation.x = -0.75
    g.add(p)
    return p
  }
  screen(-0.46, 0.2, neonHex, 0)
  screen(0, 0.24, 0x8af0ff, 2)
  screen(0.46, 0.2, 0xffc070, 1)
  // Işıklı düğmeler (yanıp söner).
  const buttons: Mesh[] = []
  const bCols = [0xff5a5a, 0x5affa0, 0xffd060, neonHex, 0x8ac8ff]
  for (let i = 0; i < 14; i++) {
    const m = new MeshBasicMaterial({ color: new Color(bCols[i % bCols.length]).multiplyScalar(1.5) })
    m.toneMapped = false
    const b = new Mesh(new BoxGeometry(0.03, 0.012, 0.022), m)
    const side = i < 7 ? -1 : 1
    const k = i % 7
    b.position.set(side * (0.62 + (k % 2) * 0.05), 0.06 + Math.floor(k / 2) * 0.012, -0.62 - Math.floor(k / 2) * 0.03)
    b.rotation.x = -0.42
    g.add(b)
    buttons.push(b)
  }
  // Kanopi çerçevesi: üst kemer ve yan dikmeler, neon şeritli.
  const strut = (x: number, rz: number) => {
    const m = new Mesh(new BoxGeometry(0.04, 0.95, 0.05), dark)
    m.position.set(x, 0.62, -0.78)
    m.rotation.z = rz
    const t = new Mesh(new BoxGeometry(0.008, 0.9, 0.008), trimMat)
    t.position.set(x + (x < 0 ? 0.024 : -0.024), 0.62, -0.75)
    t.rotation.z = rz
    g.add(m, t)
  }
  strut(-0.74, 0.22)
  strut(0.74, -0.22)
  const arch = new Mesh(new BoxGeometry(1.25, 0.045, 0.06), dark)
  arch.position.set(0, 1.07, -0.85)
  g.add(arch)
  // Pilotun kolları ve kumanda kolları.
  // Yan ve üst modüller: sol/sağ duvarda ekranlı paneller, tepede anahtar sırası (önü açık kalır).
  const panel = (x: number, y: number, z: number, ry: number, rz: number, w: number, h: number, hex: number) => {
    const p = new Mesh(new BoxGeometry(w, h, 0.02), metal)
    p.position.set(x, y, z)
    p.rotation.set(0, ry, rz)
    g.add(p)
    const scr = new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(0.9), transparent: true, opacity: 0.85 })
    scr.toneMapped = false
    const sc = new Mesh(new BoxGeometry(w * 0.7, h * 0.45, 0.004), scr)
    sc.position.set(x + Math.sin(ry) * 0.012, y + h * 0.12, z + Math.cos(ry) * 0.012)
    sc.rotation.set(0, ry, rz)
    g.add(sc)
    for (let i = 0; i < 4; i++) {
      const l = new Mesh(new BoxGeometry(0.012, 0.012, 0.006), i % 2 ? trimMat : scr)
      l.position.set(x + Math.sin(ry) * 0.012 + Math.cos(ry) * (i - 1.5) * w * 0.18, y - h * 0.3, z + Math.cos(ry) * 0.012 - Math.sin(ry) * (i - 1.5) * w * 0.18)
      l.rotation.set(0, ry, rz)
      g.add(l)
    }
  }
  panel(-0.62, 0.22, -0.45, 1.05, 0, 0.3, 0.2, 0x5affa0)
  panel(0.62, 0.22, -0.45, -1.05, 0, 0.3, 0.2, 0xffb060)
  panel(-0.66, 0.5, -0.4, 1.2, 0.2, 0.22, 0.14, neonHex)
  panel(0.66, 0.5, -0.4, -1.2, -0.2, 0.22, 0.14, 0x8ac8ff)
  const top = new Mesh(new BoxGeometry(0.7, 0.03, 0.22), metal)
  top.position.set(0, 0.98, -0.42)
  g.add(top)
  for (let i = 0; i < 7; i++) {
    const sw = new Mesh(new BoxGeometry(0.018, 0.025, 0.018), i % 3 === 0 ? trimMat : dark)
    sw.position.set((i - 3) * 0.07, 0.955, -0.42)
    g.add(sw)
  }
  const sticks: Group[] = []
  const arms: Group[] = []
  for (const side of [-1, 1]) {
    const stick = new Group()
    stick.position.set(side * 0.17, 0.06, -0.56)
    const rod = new Mesh(new CylinderGeometry(0.012, 0.016, 0.16, 8), metal)
    rod.position.y = 0.08
    const grip = new Mesh(new CylinderGeometry(0.022, 0.02, 0.07, 10), dark)
    grip.position.y = 0.19
    const trig = new Mesh(new BoxGeometry(0.012, 0.02, 0.012), trimMat)
    trig.position.set(0, 0.2, -0.022)
    stick.add(rod, grip, trig)
    g.add(stick)
    sticks.push(stick)
    const arm = buildArm(kind, side, neon)
    arm.position.set(side * 0.17, 0.25, -0.56)
    arm.rotation.set(0.95, side * 0.45, 0)
    g.add(arm)
    arms.push(arm)
  }
  // Konsolun iki yanında ikiz toplar: ateşte namlu parlar, top geri teper.
  const guns: Group[] = []
  const flashes: Sprite[] = []
  for (const side of [-1, 1]) {
    const gun = new Group()
    gun.position.set(side * 0.56, 0.17, -0.9)
    const body = new Mesh(new BoxGeometry(0.1, 0.08, 0.34), metal)
    const barrel = new Mesh(new CylinderGeometry(0.022, 0.028, 0.42, 10), dark)
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = -0.32
    const ringM = new Mesh(new TorusGeometry(0.03, 0.008, 6, 14), trimMat)
    ringM.position.z = -0.5
    const fm = new SpriteMaterial({ map: glowTexture(), color: new Color(neonHex).lerp(new Color(0xffffff), 0.5).multiplyScalar(2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    fm.toneMapped = false
    const flash = new Sprite(fm)
    flash.scale.set(0.35, 0.35, 1)
    flash.position.z = -0.6
    gun.add(body, barrel, ringM, flash)
    g.add(gun)
    guns.push(gun)
    flashes.push(flash)
  }
  g.userData.sticks = sticks
  g.userData.arms = arms
  g.userData.buttons = buttons
  g.userData.guns = guns
  g.userData.flashes = flashes
  return g
}

function wrapShip(body: Group, plumeHex: number, kind = 'earth'): PlayerVisual {
  const root = new Group()
  root.add(body)
  const plumeGeo = new ConeGeometry(0.2, 1.5, 10, 1, true)
  plumeGeo.translate(0, 0.75, 0)
  const plumes: Mesh[] = []
  const plumeMats: MeshBasicMaterial[] = []
  for (const x of [-0.28, 0.28]) {
    const mat = new MeshBasicMaterial({
      color: plumeHex,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    mat.toneMapped = false
    const plume = new Mesh(plumeGeo, mat)
    plume.rotation.x = Math.PI / 2
    plume.position.set(x, 0, 2.15)
    plume.visible = false
    root.add(plume)
    plumes.push(plume)
    plumeMats.push(mat)
  }
  const shieldMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uLevel: { value: 1 },
      uFlash: { value: 0 },
      uColor: { value: new Color(0.62, 0.86, 0.84) },
    },
    vertexShader: shieldVert,
    fragmentShader: shieldFrag,
  })
  const shield = new Mesh(new SphereGeometry(1.15, 24, 16), shieldMat)
  shield.scale.set(1.2, 0.78, 1.62)
  shield.renderOrder = 2
  root.add(shield)
  const engineLight = new PointLight(plumeHex, 0, 14, 2)
  engineLight.position.set(0, 0, 2.4)
  root.add(engineLight)
  const muzzleMat = new SpriteMaterial({
    map: glowTexture(),
    color: plumeHex,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  })
  muzzleMat.toneMapped = false
  const muzzle = new Sprite(muzzleMat)
  muzzle.scale.set(1.4, 1.4, 1)
  muzzle.position.set(0, 0, -2.35)
  muzzle.visible = false
  root.add(muzzle)
  const cockpit = buildCockpit(plumeHex, kind)
  root.add(cockpit)
  return { root, body, cockpit, plumes, plumeMats, shield, shieldMat, engineLight, muzzle }
}

function bodyMars() {
  const g = new Group()
  const mat = metal(0x8d4638, 0x3a140e, 0.4)
  const hull = new Mesh(new BoxGeometry(1.15, 0.55, 3.6), mat)
  const plate = new Mesh(new BoxGeometry(1.7, 0.12, 1.4), mat)
  plate.position.set(0, 0.28, 0.2)
  const nose = new Mesh(new ConeGeometry(0.42, 1.1, 4), mat)
  nose.rotation.x = -Math.PI / 2
  nose.position.set(0, 0, -2.2)
  g.add(hull, plate, nose)
  return g
}

function bodyProxima() {
  const g = new Group()
  const mat = metal(0x241018, 0x6a1020, 0.55)
  const hull = new Mesh(new ConeGeometry(0.7, 4.2, 3), mat)
  hull.rotation.x = -Math.PI / 2
  const fin = new Mesh(new BoxGeometry(2.2, 0.04, 0.7), mat)
  fin.position.set(0, 0, 0.4)
  g.add(hull, fin)
  return g
}

function bodyAlpha() {
  const g = new Group()
  const mat = metal(0x6a3ec4, 0xc9a6ff, 0.7)
  const ball = new Mesh(new SphereGeometry(0.95, 18, 14), mat)
  const ring = new Mesh(new TorusGeometry(1.25, 0.08, 8, 24), mat)
  ring.rotation.x = Math.PI / 2
  const nubL = new Mesh(new SphereGeometry(0.22, 8, 8), mat)
  nubL.position.set(-1.15, 0.1, 0.2)
  const nubR = nubL.clone()
  nubR.position.x = 1.15
  g.add(ball, ring, nubL, nubR)
  return g
}

function bodyTrappist() {
  const g = new Group()
  const mat = metal(0xd7f6ff, 0x7ee7ff, 0.65)
  const shard = new Mesh(new ConeGeometry(0.45, 4.4, 4), mat)
  shard.rotation.x = -Math.PI / 2
  const wing = new Mesh(new ConeGeometry(0.7, 1.6, 3), mat)
  wing.rotation.z = Math.PI / 2
  wing.position.set(0.9, 0, 0.3)
  const wingR = wing.clone()
  wingR.position.x = -0.9
  wingR.rotation.z = -Math.PI / 2
  g.add(shard, wing, wingR)
  return g
}

function bodyOcean() {
  const g = new Group()
  const mat = metal(0x1c6e72, 0x8ef0e4, 0.55)
  const hull = new Mesh(new SphereGeometry(0.7, 16, 12), mat)
  hull.scale.set(1.1, 0.55, 2.1)
  const fin = new Mesh(new BoxGeometry(0.08, 0.7, 1.1), mat)
  fin.position.set(0, 0.45, -0.2)
  g.add(hull, fin)
  return g
}

function bodyPlant() {
  const g = new Group()
  const mat = metal(0x3d7a3a, 0xb6e38a, 0.45)
  const hull = new Mesh(new SphereGeometry(0.55, 12, 10), mat)
  hull.scale.set(0.8, 0.7, 2.2)
  for (const x of [-0.7, 0.7]) {
    const leaf = new Mesh(new SphereGeometry(0.45, 10, 8), mat)
    leaf.scale.set(1.4, 0.12, 0.7)
    leaf.position.set(x, 0.05, 0.2)
    g.add(leaf)
  }
  g.add(hull)
  return g
}

function bodyGliese() {
  const g = new Group()
  const mat = metal(0x6b5344, 0xff6a2a, 0.4)
  const hull = new Mesh(new BoxGeometry(1.8, 0.7, 2.6), mat)
  for (const x of [-0.55, 0.55]) {
    const gun = new Mesh(new CylinderGeometry(0.16, 0.2, 2.4, 8), mat)
    gun.rotation.x = Math.PI / 2
    gun.position.set(x, -0.1, -0.8)
    g.add(gun)
  }
  g.add(hull)
  return g
}

function bodyLegend() {
  const g = new Group()
  const mat = metal(0xf3ead4, 0xffc56a, 0.85)
  const hull = new Mesh(new ConeGeometry(0.38, 5.2, 8), mat)
  hull.rotation.x = -Math.PI / 2
  const ring = new Mesh(new TorusGeometry(0.7, 0.05, 8, 28), mat)
  ring.position.set(0, 0, 0.4)
  g.add(hull, ring)
  return g
}

export function buildShip(kind: string): PlayerVisual {
  // Yeni neon gemiler (ships.ts). Eski gövdeler aşağıda yedek olarak duruyor.
  const style = SHIP_STYLE[kind] ?? SHIP_STYLE.earth
  if (SHIP_STYLE[kind]) {
    const v = wrapShip(buildNeonBody(kind), style.plume, kind)
    const [ex, ey, ez] = style.engine
    v.plumes.forEach((p, i) => p.position.set(i === 0 ? -ex : ex, ey, ez))
    v.engineLight.position.set(0, ey, ez + 0.3)
    return v
  }
  if (kind === 'earth') return buildPlayer()
  const bodies: Record<string, () => Group> = {
    mars: bodyMars,
    proxima: bodyProxima,
    alpha: bodyAlpha,
    trappist: bodyTrappist,
    k218: bodyOcean,
    kepler186: bodyPlant,
    gliese: bodyGliese,
    kepler452: bodyLegend,
  }
  const colors: Record<string, number> = {
    mars: 0xff7a4a,
    proxima: 0xff5a6a,
    alpha: 0xd2b0ff,
    trappist: 0xbff6ff,
    k218: 0x8ef0e4,
    kepler186: 0xc6f0a4,
    gliese: 0xff6a2a,
    kepler452: 0xffd27a,
  }
  const make = bodies[kind] ?? bodyMars
  return wrapShip(make(), colors[kind] ?? 0xffc49a)
}

function limb(color: number) {
  return new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, emissive: color, emissiveIntensity: 0.12 })
}

export function buildPilot(kind: string) {
  const g = new Group()
  if (kind === 'alpha') {
    const skin = limb(0x8d5ae0)
    const head = new Mesh(new SphereGeometry(0.78, 16, 12), skin)
    head.position.y = 1.45
    head.scale.set(1.2, 1.05, 1)
    const body = new Mesh(new SphereGeometry(0.28, 10, 8), limb(0x5a32a4))
    body.position.y = 0.48
    body.scale.set(0.85, 1.15, 0.7)
    const eye = new MeshBasicMaterial({ color: 0xf7f4ff })
    const pupil = new MeshBasicMaterial({ color: 0x1b1030 })
    for (const x of [-0.28, 0.28]) {
      const e = new Mesh(new SphereGeometry(0.2, 10, 8), eye)
      e.position.set(x, 1.52, 0.58)
      const p = new Mesh(new SphereGeometry(0.09, 8, 8), pupil)
      p.position.set(x, 1.5, 0.74)
      g.add(e, p)
    }
    g.add(head, body)
    g.userData.wobble = 1
    return g
  }
  if (kind === 'trappist') {
    const crystal = new Mesh(new ConeGeometry(0.45, 1.7, 4), limb(0xd7f6ff))
    crystal.position.y = 0.9
    g.add(crystal)
    return g
  }
  if (kind === 'k218') {
    const body = new Mesh(new SphereGeometry(0.42, 12, 10), limb(0x2f8f86))
    body.scale.set(1, 1.4, 0.8)
    body.position.y = 0.7
    const head = new Mesh(new SphereGeometry(0.28, 12, 10), limb(0x7ed0c6))
    head.position.y = 1.35
    g.add(body, head)
    return g
  }
  if (kind === 'kepler186') {
    const body = new Mesh(new SphereGeometry(0.36, 10, 8), limb(0x4e8a42))
    body.position.y = 0.7
    const leaf = new Mesh(new SphereGeometry(0.4, 8, 6), limb(0x8fce72))
    leaf.scale.set(1.5, 0.2, 0.6)
    leaf.position.set(0, 1.15, 0)
    g.add(body, leaf)
    return g
  }
  if (kind === 'gliese') {
    const body = new Mesh(new BoxGeometry(0.7, 0.7, 0.45), limb(0x8a6a52))
    body.position.y = 0.55
    const head = new Mesh(new SphereGeometry(0.28, 10, 8), limb(0xc4a07a))
    head.position.y = 1.15
    g.add(body, head)
    return g
  }
  if (kind === 'kepler452') {
    const body = new Mesh(new CylinderGeometry(0.16, 0.22, 1.15, 8), limb(0xf4efe4))
    body.position.y = 0.7
    const head = new Mesh(new SphereGeometry(0.22, 12, 10), limb(0xffe2b0))
    head.position.y = 1.45
    g.add(body, head)
    return g
  }
  if (kind === 'proxima') {
    const body = new Mesh(new CylinderGeometry(0.2, 0.24, 0.8, 8), limb(0x4a1824))
    body.position.y = 0.55
    const head = new Mesh(new SphereGeometry(0.32, 12, 10), limb(0x6a2430))
    head.position.y = 1.25
    const eye = new Mesh(new SphereGeometry(0.1, 8, 8), new MeshBasicMaterial({ color: 0xffd0c8 }))
    eye.position.set(0, 1.28, 0.26)
    g.add(body, head, eye)
    return g
  }
  const suit = kind === 'mars' ? 0x8a3d32 : 0x3d5168
  const skin = kind === 'mars' ? 0xc98462 : 0xe2b394
  const body = new Mesh(new CylinderGeometry(0.22, 0.26, 0.9, 8), limb(suit))
  body.position.y = 0.6
  const head = new Mesh(new SphereGeometry(0.24, 12, 10), limb(skin))
  head.position.y = 1.25
  g.add(body, head)
  return g
}

export function buildHumanFighter(): AlienVisual {
  const root = new Group()
  const bodyMat = new MeshStandardMaterial({
    color: 0xd5dbe6,
    metalness: 0.72,
    roughness: 0.32,
    emissive: 0x1c4a6e,
    emissiveIntensity: 0.45,
  })
  const body = new Mesh(new BoxGeometry(0.55, 0.22, 2.3), bodyMat)
  body.position.z = 0.1
  const nose = new Mesh(new ConeGeometry(0.22, 0.7, 4), bodyMat)
  nose.rotation.x = -Math.PI / 2
  nose.position.set(0, 0, -1.15)
  const wing = new Mesh(new BoxGeometry(1.7, 0.04, 0.45), bodyMat)
  wing.position.set(0, 0, 0.25)
  const eyeMat = new MeshBasicMaterial({ color: 0x9fd4ff })
  eyeMat.toneMapped = false
  const eye = new Mesh(new SphereGeometry(0.1, 8, 8), eyeMat)
  eye.position.set(0, 0.08, -0.85)
  root.add(body, nose, wing, eye)
  return { root, bodyMat, eyeMat }
}

/** Solucan deliği: dönen sarmal girdap (ortası karanlık boğaz), sabitleyici halka ve süzülen neon direkler.
   Tanınır olsun diye tek tasarım: mavi-mor sarmal, altı direk. userData.vortex her karede döner. */
export function buildWormhole() {
  const g = new Group()
  const vortexMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float swirl = sin(a * 4.0 + log(r + 0.02) * 9.0 - uTime * 2.2);
        float arms = smoothstep(0.2, 1.0, swirl) * smoothstep(1.0, 0.25, r);
        float throat = smoothstep(0.32, 0.05, r);
        vec3 c1 = vec3(0.35, 0.85, 1.0);
        vec3 c2 = vec3(0.7, 0.4, 1.0);
        vec3 col = mix(c2, c1, r) * arms * 2.2 + vec3(0.9, 0.95, 1.0) * smoothstep(0.42, 0.3, r) * smoothstep(0.18, 0.3, r) * 1.6;
        float alpha = clamp(arms * 0.9 + smoothstep(1.0, 0.6, r) * 0.25, 0.0, 1.0) * (1.0 - throat * 0.2);
        col = mix(col, vec3(0.0), throat);
        gl_FragColor = vec4(col, max(alpha, throat * 0.95));
      }`,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  vortexMat.toneMapped = false
  const vortex = new Mesh(new CircleGeometry(7.2, 64), vortexMat)
  vortex.rotation.x = -Math.PI / 2
  const ringMat = new MeshStandardMaterial({ color: 0x2a3346, metalness: 0.8, roughness: 0.3, emissive: 0x1a2a4a, emissiveIntensity: 0.4 })
  const neon = new MeshBasicMaterial({ color: new Color(0x9ae7ff).multiplyScalar(1.8) })
  neon.toneMapped = false
  const ring = new Mesh(new TorusGeometry(8, 0.55, 12, 64), ringMat)
  ring.rotation.x = Math.PI / 2
  const ringGlow = new Mesh(new TorusGeometry(8, 0.14, 8, 64), neon)
  ringGlow.rotation.x = Math.PI / 2
  ringGlow.position.y = 0.5
  const pylons = new Group()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const pylon = new Mesh(new OctahedronGeometry(0.8, 0), ringMat)
    pylon.scale.set(0.6, 2.2, 0.6)
    pylon.position.set(Math.cos(a) * 10, 0, Math.sin(a) * 10)
    const core = new Mesh(new OctahedronGeometry(0.35, 0), neon)
    core.position.copy(pylon.position)
    pylons.add(pylon, core)
  }
  const glow = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: 0x7ad7ff, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.7 }),
  )
  glow.scale.set(22, 22, 1)
  const label = buildLabel('Solucan deliği')
  label.name = 'label'
  label.position.set(13, 2.5, 0)
  g.add(vortex, ring, ringGlow, pylons, glow, label)
  g.userData.vortex = vortexMat
  g.userData.pylons = pylons
  return g
}

/** Solucan deliği animasyonu: girdap akar, direkler ters yönde döner. */
export function tickWormhole(g: Group, t: number, dt: number) {
  const m = g.userData.vortex as ShaderMaterial | undefined
  if (m) m.uniforms.uTime.value = t
  const p = g.userData.pylons as Group | undefined
  if (p) p.rotation.y -= dt * 0.25
}

export function buildLabel(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const sprite = new Sprite(mat)
  sprite.scale.set(16, 4, 1)
  sprite.userData.canvas = canvas
  sprite.userData.tex = tex
  paintLabel(sprite, text)
  return sprite
}

export function paintLabel(sprite: Sprite, text: string) {
  const canvas = sprite.userData.canvas as HTMLCanvasElement | undefined
  const tex = sprite.userData.tex as CanvasTexture | undefined
  if (!canvas || !tex) return
  const g = canvas.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = 'rgba(6, 10, 16, 0.62)'
  g.fillRect(16, 28, 480, 72)
  g.fillStyle = '#d7f4ff'
  g.font = '600 44px sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 256, 64)
  tex.needsUpdate = true
}

export function buildPlanet(kind: string) {
  const g = new Group()
  const fine = kind === 'large'
  const mat = new MeshStandardMaterial({ color: 0x8fd0c6, roughness: 0.78, metalness: 0.06, emissive: 0x8fd0c6, emissiveIntensity: 0.08 })
  const sphere = new Mesh(new SphereGeometry(1, fine ? 22 : 12, fine ? 14 : 8), mat)
  const ring = new Mesh(
    new TorusGeometry(1.62, 0.03, 6, 36),
    new MeshBasicMaterial({ color: 0xf0d2b0, transparent: true, opacity: 0.4, side: DoubleSide }),
  )
  ring.rotation.x = 0.8
  ring.visible = false
  g.add(sphere, ring)
  return g
}

export function paintPlanet(group: Group, kind: string, color: number, rings = false, hot = false) {
  const sphere = group.children[0] as Mesh
  const mat = sphere.material as MeshStandardMaterial
  mat.color.setHex(color)
  mat.emissive.setHex(color)
  mat.emissiveIntensity = hot ? 1.35 : kind === 'small' ? 0.22 : 0.06
  const ring = group.children[1]
  if (ring) ring.visible = rings
}

export function buildPoi(kind: 'rock' | 'plant' | 'hut', color: number) {
  const g = new Group()
  const mat = new MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04, emissive: color, emissiveIntensity: 0.08 })
  if (kind === 'rock') {
    const rock = new Mesh(new IcosahedronGeometry(1, 0), mat)
    rock.scale.set(1.3, 0.72, 1.05)
    g.add(rock)
  } else if (kind === 'plant') {
    const stem = new Mesh(new CylinderGeometry(0.08, 0.14, 1.3, 5), mat)
    stem.position.y = 0.65
    const cap = new Mesh(new SphereGeometry(0.48, 8, 6), new MeshStandardMaterial({ color: 0x7dce78, roughness: 0.6, emissive: 0x2d6a32, emissiveIntensity: 0.2 }))
    cap.position.y = 1.35
    cap.scale.set(1, 0.7, 1)
    g.add(stem, cap)
  } else {
    const wall = new Mesh(new BoxGeometry(1.5, 1.05, 1.2), mat)
    wall.position.y = 0.52
    const roof = new Mesh(new ConeGeometry(1.15, 0.7, 4), new MeshStandardMaterial({ color: 0xe4a15c, roughness: 0.7 }))
    roof.position.y = 1.3
    roof.rotation.y = Math.PI / 4
    g.add(wall, roof)
  }
  return g
}

export type RigStyle = 'walk' | 'hop' | 'waddle' | 'purple' | 'shadow' | 'float' | 'stalk'

export type Rig = {
  root: Group
  armL: Group
  armR: Group
  legL: Group
  legR: Group
  head: Group
  style: RigStyle
  /** Zıplama/süzülme için oynayan ara katman (yeni tür gövdelerinde var). */
  hips?: Group
  /** Anten, solungaç, yaprak gibi kendiliğinden sallanan parçalar. */
  wiggle?: Object3D[]
}

function joint(color: number, w: number, h: number, d: number) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), limb(color))
  mesh.position.y = -h * 0.5
  return mesh
}

export type RigPalette = { body?: number; skin?: number; leg?: number }

export function buildRig(style: RigStyle = 'walk', palette: RigPalette = {}): Rig {
  const root = new Group()
  const purple = style === 'purple'
  const shadow = style === 'shadow'
  const bodyColor = palette.body ?? (purple ? 0x8d5ae0 : shadow ? 0x4a2040 : style === 'waddle' ? 0xc45a32 : 0xf3d7b0)
  const skin = palette.skin ?? (purple ? 0xd2b0ff : shadow ? 0x6a2438 : 0xffe1c4)
  const legColor = palette.leg ?? 0xe4a15c
  const hips = new Group()
  const body = new Mesh(new SphereGeometry(purple ? 0.34 : 0.4, 12, 10), limb(bodyColor))
  body.scale.set(purple ? 0.9 : 1.05, 0.86, 0.92)
  body.position.y = 0.78
  const head = new Group()
  const skull = new Mesh(new SphereGeometry(purple ? 0.46 : 0.32, 12, 10), limb(skin))
  skull.position.y = purple ? 0.15 : 0.05
  const eyeMat = new MeshBasicMaterial({ color: 0x1c140e })
  const eyeL = new Mesh(new SphereGeometry(0.06, 8, 8), eyeMat)
  eyeL.position.set(-0.12, purple ? 0.22 : 0.08, 0.28)
  const eyeR = eyeL.clone()
  eyeR.position.x = 0.12
  head.add(skull, eyeL, eyeR)
  head.position.y = purple ? 1.35 : 1.22
  const armL = new Group()
  armL.position.set(-0.42, 1.05, 0)
  armL.add(joint(bodyColor, 0.14, 0.55, 0.14))
  const armR = new Group()
  armR.position.set(0.42, 1.05, 0)
  armR.add(joint(bodyColor, 0.14, 0.55, 0.14))
  const legL = new Group()
  legL.position.set(-0.16, 0.48, 0)
  legL.add(joint(legColor, 0.16, 0.48, 0.16))
  const legR = new Group()
  legR.position.set(0.16, 0.48, 0)
  legR.add(joint(legColor, 0.16, 0.48, 0.16))
  hips.add(body, head, armL, armR, legL, legR)
  root.add(hips)
  root.scale.setScalar(purple ? 1.55 : style === 'hop' ? 1.05 : 1.25)
  return { root, armL, armR, legL, legR, head, style }
}

export function buildWalker() {
  return buildRig('walk').root
}

export function buildBar() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 28
  const ctx = canvas.getContext('2d')
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const sprite = new Sprite(mat)
  sprite.name = 'bar'
  sprite.center.set(0.5, 0)
  return { sprite, canvas, ctx, tex }
}

export function paintBar(ctx: CanvasRenderingContext2D | null, tex: { needsUpdate: boolean }, hull: number, shield: number) {
  if (!ctx) return
  ctx.clearRect(0, 0, 128, 28)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 2, 128, 12)
  ctx.fillStyle = '#f3d7b0'
  ctx.fillRect(0, 2, Math.max(0, Math.min(1, hull)) * 128, 12)
  // Negatif kalkan: kalkan satırı hiç çizilmez (karakol çubukları).
  if (shield >= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 16, 128, 8)
    ctx.fillStyle = '#8fd0c8'
    ctx.fillRect(0, 16, Math.max(0, Math.min(1, shield)) * 128, 8)
  }
  tex.needsUpdate = true
}

/** Yerli kampı yapıları: türün biçimine göre ayrıntılı ev (kubbe, kule, kabuk, ağaç ev, kaya kulübesi...).
 *  Taban yerin içine uzanır (yüzeyden ayrı durmaz); ışıklı pencere/kapı uzaktan seçilir. */
export function buildDwelling(form: string, color: number, seed = 0) {
  const g = new Group()
  const base = new Color(color)
  const wallM = new MeshStandardMaterial({ color: base, roughness: 0.75, metalness: 0.05, flatShading: true })
  const darkM = new MeshStandardMaterial({ color: base.clone().multiplyScalar(0.45), roughness: 0.85, flatShading: true })
  const lightM = new MeshBasicMaterial({ color: new Color(0xffc870).multiplyScalar(1.5) })
  lightM.toneMapped = false
  const add = (m: Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z)
    g.add(m)
    return m
  }
  // Toprağa gömülü temel: eğimli yüzeyde bile havada kalmaz.
  add(new Mesh(new CylinderGeometry(1.25, 1.45, 1.2, 10), darkM), 0, -0.45, 0)
  const door = (y: number, z: number, w = 0.34, h = 0.5) => add(new Mesh(new BoxGeometry(w, h, 0.06), lightM), 0, y, z)
  switch (form) {
    case 'cherub': {
      // Beşik ev: krem kubbe, altın şeritler, yuvarlak ışıklı pencere ve tepede yıldız.
      const cream = new MeshStandardMaterial({ color: 0xfff1d8, roughness: 0.6, flatShading: true })
      const goldM = new MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.35, metalness: 0.7, flatShading: true })
      add(new Mesh(new SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cream), 0, 0.05, 0)
      for (let k = 0; k < 4; k++) {
        const band = add(new Mesh(new TorusGeometry(1.15, 0.05, 6, 20, Math.PI), goldM), 0, 0.05, 0)
        band.rotation.y = (k / 4) * Math.PI
      }
      add(new Mesh(new CylinderGeometry(0.3, 0.3, 0.06, 14), lightM), 0, 0.55, 1.02).rotation.x = Math.PI / 2 - 0.5
      add(new Mesh(new OctahedronGeometry(0.22), lightM), 0, 1.45, 0)
      door(0.25, 1.05, 0.4, 0.45)
      break
    }
    case 'gariban': {
      // Hurda kulübe: eğri sac duvarlar, yamalar, çanak anten ve ışıklı pencere.
      const rust = new MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85, metalness: 0.3, flatShading: true })
      const tin = new MeshStandardMaterial({ color: 0x7a8288, roughness: 0.6, metalness: 0.5, flatShading: true })
      const hut = add(new Mesh(new BoxGeometry(1.7, 1.1, 1.5), tin), 0, 0.5, 0)
      hut.rotation.y = 0.12 + seed * 0.3
      hut.rotation.z = 0.05
      add(new Mesh(new BoxGeometry(1.95, 0.12, 1.75), rust), 0, 1.1, 0).rotation.z = -0.12
      add(new Mesh(new BoxGeometry(0.5, 0.45, 0.04), rust), -0.45, 0.6, 0.77)
      add(new Mesh(new BoxGeometry(0.35, 0.3, 0.06), lightM), 0.35, 0.65, 0.76)
      const pole = add(new Mesh(new CylinderGeometry(0.035, 0.035, 1.2, 5), tin), 0.6, 1.6, -0.4)
      pole.rotation.z = 0.15
      const dish = add(new Mesh(new SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), tin), 0.7, 2.15, -0.4)
      dish.rotation.x = -2.1
      add(new Mesh(new BoxGeometry(0.6, 0.35, 0.5), rust), -0.95, 0.15, -0.5).rotation.y = 0.6
      break
    }
    case 'astronaut': {
      add(new Mesh(new SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), wallM), 0, 0.1, 0)
      add(new Mesh(new TorusGeometry(1.1, 0.06, 6, 24), lightM), 0, 0.3, 0).rotation.x = Math.PI / 2
      door(0.35, 1.02)
      const ant = add(new Mesh(new CylinderGeometry(0.03, 0.03, 1.2, 5), darkM), 0.4, 1.4, 0)
      ant.rotation.z = 0.2
      add(new Mesh(new SphereGeometry(0.08, 8, 6), lightM), 0.52, 2.0, 0)
      add(new Mesh(new BoxGeometry(0.9, 0.04, 0.5), new MeshStandardMaterial({ color: 0x2a4a8a, metalness: 0.6, roughness: 0.3 })), -0.9, 1.0, 0).rotation.z = 0.5
      break
    }
    case 'colonist': {
      add(new Mesh(new CylinderGeometry(0.9, 1.0, 1.6, 8), wallM), 0, 0.75, 0)
      add(new Mesh(new CylinderGeometry(0.6, 0.75, 1.0, 8), wallM), 0.2, 2.0, 0.1)
      add(new Mesh(new CylinderGeometry(0.75, 0.75, 0.12, 8), darkM), 0.2, 2.55, 0.1)
      door(0.4, 0.98)
      for (let i = 0; i < 3; i++) add(new Mesh(new BoxGeometry(0.18, 0.18, 0.05), lightM), Math.cos(i * 2.1) * 0.74, 2.0, Math.sin(i * 2.1) * 0.74 + 0.1)
      break
    }
    case 'shade': {
      const sp = add(new Mesh(new ConeGeometry(1.0, 3.2, 5), darkM), 0, 1.4, 0)
      sp.rotation.y = seed
      add(new Mesh(new ConeGeometry(0.5, 1.8, 5), darkM), 0.9, 0.7, 0.3)
      const eye = add(new Mesh(new SphereGeometry(0.16, 10, 8), new MeshBasicMaterial({ color: new Color(0xff2a5a).multiplyScalar(2) })), 0, 1.6, 0.55)
      ;(eye.material as MeshBasicMaterial).toneMapped = false
      break
    }
    case 'bighead': {
      add(new Mesh(new CylinderGeometry(0.35, 0.5, 1.4, 10), wallM), 0, 0.6, 0)
      add(new Mesh(new SphereGeometry(1.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: base.clone().lerp(new Color(0xffffff), 0.3), roughness: 0.5 })), 0, 1.25, 0).scale.set(1, 0.6, 1)
      for (let i = 0; i < 5; i++) add(new Mesh(new SphereGeometry(0.1, 8, 6), lightM), Math.cos(i * 1.26) * 1.0, 1.35, Math.sin(i * 1.26) * 1.0)
      door(0.35, 0.4, 0.22, 0.45)
      break
    }
    case 'crystal': {
      const cm = new MeshStandardMaterial({ color: base.clone().lerp(new Color(0x9affef), 0.4), emissive: base, emissiveIntensity: 0.35, roughness: 0.15, flatShading: true, transparent: true, opacity: 0.92 })
      for (let i = 0; i < 5; i++) {
        const h = 1.6 + ((seed + i * 3) % 4) * 0.5
        const c = add(new Mesh(new OctahedronGeometry(1, 0), cm), Math.cos(i * 1.3) * 0.6, h * 0.55, Math.sin(i * 1.3) * 0.6)
        c.scale.set(0.35, h, 0.35)
        c.rotation.z = (i - 2) * 0.12
      }
      add(new Mesh(new SphereGeometry(0.2, 8, 6), lightM), 0, 0.5, 0.7)
      break
    }
    case 'belly': {
      for (let i = 0; i < 4; i++) add(new Mesh(new TorusGeometry(0.9 - i * 0.18, 0.28 - i * 0.04, 8, 16), wallM), 0, 0.3 + i * 0.42, 0).rotation.x = Math.PI / 2
      add(new Mesh(new ConeGeometry(0.25, 0.6, 8), wallM), 0, 2.1, 0)
      door(0.3, 0.95, 0.3, 0.4)
      break
    }
    case 'sprout': {
      add(new Mesh(new CylinderGeometry(0.35, 0.55, 2.6, 7), new MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.9, flatShading: true })), 0, 1.2, 0)
      add(new Mesh(new SphereGeometry(1.15, 12, 8), wallM), 0, 2.8, 0).scale.set(1, 0.75, 1)
      add(new Mesh(new BoxGeometry(0.3, 0.3, 0.05), lightM), 0, 2.7, 1.08)
      for (let i = 0; i < 3; i++) add(new Mesh(new IcosahedronGeometry(0.5, 0), new MeshStandardMaterial({ color: 0x3a8a2a, flatShading: true })), Math.cos(i * 2.1) * 1.0, 3.3, Math.sin(i * 2.1) * 1.0)
      break
    }
    case 'golem': {
      const rock = new MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.95, flatShading: true })
      add(new Mesh(new DodecahedronGeometry(1.3, 0), rock), 0, 0.6, 0).scale.set(1, 0.8, 1)
      add(new Mesh(new DodecahedronGeometry(0.7, 0), rock), 0.8, 1.5, -0.2)
      const lava = new MeshBasicMaterial({ color: new Color(0xff5a1a).multiplyScalar(1.8) })
      lava.toneMapped = false
      add(new Mesh(new BoxGeometry(0.4, 0.6, 0.06), lava), 0, 0.5, 1.15)
      add(new Mesh(new CylinderGeometry(0.15, 0.2, 0.7, 6), rock), -0.5, 1.6, 0)
      break
    }
    case 'regal': {
      const gold = new MeshStandardMaterial({ color: 0xd8b060, metalness: 0.6, roughness: 0.3 })
      for (let i = 0; i < 3; i++) add(new Mesh(new BoxGeometry(2 - i * 0.55, 0.5, 2 - i * 0.55), gold), 0, 0.25 + i * 0.5, 0)
      add(new Mesh(new ConeGeometry(0.45, 0.9, 4), gold), 0, 2.0, 0).rotation.y = Math.PI / 4
      add(new Mesh(new OctahedronGeometry(0.18), lightM), 0, 2.6, 0)
      door(0.35, 1.0)
      break
    }
    case 'yeti': {
      add(new Mesh(new SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.6, flatShading: true })), 0, 0, 0)
      add(new Mesh(new CylinderGeometry(0.4, 0.4, 0.8, 10, 1, false, 0, Math.PI), new MeshStandardMaterial({ color: 0xe8f4ff })), 0, 0.3, 1.0).rotation.x = Math.PI / 2
      door(0.3, 1.25, 0.3, 0.4)
      break
    }
    default: {
      // Yabani yerli: yuvarlak kulübe, sazdan çatı, kapı ışığı ve küçük baca.
      add(new Mesh(new CylinderGeometry(1.0, 1.1, 1.1, 10), wallM), 0, 0.5, 0)
      add(new Mesh(new ConeGeometry(1.35, 1.2, 10), new MeshStandardMaterial({ color: base.clone().lerp(new Color(0xc89a5a), 0.6), roughness: 0.9, flatShading: true })), 0, 1.6, 0)
      door(0.4, 1.06)
      add(new Mesh(new CylinderGeometry(0.12, 0.14, 0.6, 6), darkM), 0.5, 2.0, 0.2)
      for (let i = 0; i < 4; i++) add(new Mesh(new CylinderGeometry(0.05, 0.05, 1.0, 5), darkM), Math.cos(i * 1.57 + 0.4) * 1.6, 0.4, Math.sin(i * 1.57 + 0.4) * 1.6)
    }
  }
  return g
}

/** Irka özel taret: kara (alçak, kalın namlu) ya da hava savunma (radar çanağı, yukarı bakan ikiz/dörtlü namlu).
 *  Seviye 2 zırh yakası, seviye 3 ışıklı halka ve daha büyük gövde ekler. */
export function buildTurret(form: string, color: number, kind: 'kara' | 'hava', lvl: number) {
  const root = new Group()
  const base = new Color(color)
  const accent = kind === 'hava' ? 0x6af0ff : 0xffa040
  const wall = new MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.55, metalness: 0.35, flatShading: true })
  const dark = new MeshStandardMaterial({ color: base.clone().multiplyScalar(0.35), roughness: 0.7, metalness: 0.4, flatShading: true })
  const glow = new MeshBasicMaterial({ color: new Color(accent).multiplyScalar(1.6) })
  glow.toneMapped = false
  const steel = new MeshStandardMaterial({ color: 0x8a909c, roughness: 0.4, metalness: 0.7 })
  // Gömülü temel.
  const sink = new Mesh(new CylinderGeometry(1.15, 1.35, 1.0, 12), dark)
  sink.position.y = -0.3
  root.add(sink)
  let foot: Mesh
  switch (form) {
    case 'astronaut':
      foot = new Mesh(new SphereGeometry(1.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), wall)
      break
    case 'colonist':
      foot = new Mesh(new CylinderGeometry(0.9, 1.25, 0.9, 6), wall)
      foot.position.y = 0.45
      break
    case 'shade':
      foot = new Mesh(new ConeGeometry(1.2, 1.4, 5), wall)
      foot.position.y = 0.7
      break
    case 'bighead':
      foot = new Mesh(new SphereGeometry(0.95, 18, 12), wall)
      foot.position.y = 0.55
      foot.scale.y = 0.75
      break
    case 'crystal':
      foot = new Mesh(new OctahedronGeometry(1.1, 0), wall)
      foot.position.y = 0.55
      foot.scale.y = 0.8
      break
    case 'belly':
      foot = new Mesh(new TorusGeometry(0.75, 0.42, 8, 16), wall)
      foot.rotation.x = Math.PI / 2
      foot.position.y = 0.35
      break
    case 'sprout':
      foot = new Mesh(new CylinderGeometry(0.55, 0.95, 1.2, 8), new MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true }))
      foot.position.y = 0.6
      break
    case 'golem':
      foot = new Mesh(new DodecahedronGeometry(1.0, 0), wall)
      foot.position.y = 0.5
      break
    case 'regal':
      foot = new Mesh(new CylinderGeometry(0.8, 1.15, 1.0, 8), new MeshStandardMaterial({ color: 0xe8c060, metalness: 0.85, roughness: 0.25 }))
      foot.position.y = 0.5
      break
    default:
      foot = new Mesh(new CylinderGeometry(1.0, 1.2, 0.6, 12), wall)
      foot.position.y = 0.3
  }
  root.add(foot)
  const post = new Mesh(new CylinderGeometry(0.3, 0.42, 1.0, 8), steel)
  post.position.y = 1.1
  root.add(post)
  const head = new Group()
  head.position.y = 1.75
  root.add(head)
  if (kind === 'kara') {
    const box = new Mesh(new BoxGeometry(1.0, 0.55, 1.0), wall)
    head.add(box)
    const n = lvl >= 3 ? 2 : 1
    for (let i = 0; i < n; i++) {
      const barrel = new Mesh(new CylinderGeometry(0.13, 0.16, 1.6, 8), steel)
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(n === 1 ? 0 : i === 0 ? -0.22 : 0.22, 0.02, 0.95)
      head.add(barrel)
      const tip = new Mesh(new CylinderGeometry(0.17, 0.17, 0.12, 8), glow)
      tip.rotation.x = Math.PI / 2
      tip.position.set(barrel.position.x, 0.02, 1.75)
      head.add(tip)
    }
  } else {
    const box = new Mesh(new CylinderGeometry(0.55, 0.6, 0.5, 10), wall)
    head.add(box)
    const dish = new Mesh(new SphereGeometry(0.55, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), steel)
    dish.rotation.x = -2.2
    dish.position.set(0, 0.55, -0.45)
    head.add(dish)
    const elev = new Group()
    elev.rotation.x = -0.65
    elev.position.y = 0.15
    head.add(elev)
    const n = lvl >= 3 ? 4 : 2
    for (let i = 0; i < n; i++) {
      const x = (i % 2 === 0 ? -1 : 1) * 0.2
      const y = n === 4 ? (i < 2 ? 0.14 : -0.14) : 0
      const barrel = new Mesh(new CylinderGeometry(0.07, 0.09, 1.9, 6), steel)
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(x, y, 0.95)
      elev.add(barrel)
      const tip = new Mesh(new SphereGeometry(0.1, 6, 4), glow)
      tip.position.set(x, y, 1.9)
      elev.add(tip)
    }
  }
  // Tür işareti: kara turuncu, hava camgöbeği halka.
  const ring = new Mesh(new TorusGeometry(0.62, 0.05, 6, 20), glow)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 1.45
  root.add(ring)
  if (lvl >= 2) {
    const collar = new Mesh(new TorusGeometry(1.15, 0.16, 6, 18), dark)
    collar.rotation.x = Math.PI / 2
    collar.position.y = 0.55
    root.add(collar)
  }
  if (lvl >= 3) {
    const halo = new Mesh(new TorusGeometry(1.35, 0.06, 6, 28), glow)
    halo.rotation.x = Math.PI / 2
    halo.position.y = 0.2
    root.add(halo)
    root.scale.setScalar(1.15)
  }
  return { root, head }
}
