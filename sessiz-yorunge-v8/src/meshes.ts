import {
  AdditiveBlending,
  OctahedronGeometry,
  CircleGeometry,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
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

  const cockpit = new Group()
  cockpit.name = 'cockpit'
  cockpit.visible = false
  const frameMat = new MeshBasicMaterial({ color: 0x12151b })
  const bar = new BoxGeometry(1.15, 0.035, 0.04)
  const top = new Mesh(bar, frameMat)
  top.position.set(0, 0.72, -0.85)
  const bottom = new Mesh(bar, frameMat)
  bottom.position.set(0, -0.02, -0.72)
  const sideGeo = new BoxGeometry(0.03, 0.78, 0.04)
  const left = new Mesh(sideGeo, frameMat)
  left.position.set(-0.58, 0.34, -0.78)
  left.rotation.z = 0.18
  const right = left.clone()
  right.position.x = 0.58
  right.rotation.z = -0.18
  const dash = new Mesh(
    new BoxGeometry(0.7, 0.05, 0.22),
    new MeshStandardMaterial({
      color: 0x16191f,
      emissive: 0x8fb8c4,
      emissiveIntensity: 0.25,
      roughness: 0.6,
    }),
  )
  dash.position.set(0, 0.02, -0.58)
  cockpit.add(top, bottom, left, right, dash)
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

function wrapShip(body: Group, plumeHex: number): PlayerVisual {
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
  const cockpit = new Group()
  cockpit.name = 'cockpit'
  cockpit.visible = false
  const frameMat = new MeshBasicMaterial({ color: 0x12151b })
  const bar = new BoxGeometry(1.15, 0.035, 0.04)
  const top = new Mesh(bar, frameMat)
  top.position.set(0, 0.72, -0.85)
  const bottom = new Mesh(new BoxGeometry(1.15, 0.035, 0.04), frameMat)
  bottom.position.set(0, -0.02, -0.72)
  const side = new BoxGeometry(0.03, 0.78, 0.04)
  const left = new Mesh(side, frameMat)
  left.position.set(-0.58, 0.34, -0.78)
  left.rotation.z = 0.18
  const right = left.clone()
  right.position.x = 0.58
  right.rotation.z = -0.18
  cockpit.add(top, bottom, left, right)
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
    const v = wrapShip(buildNeonBody(kind), style.plume)
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
