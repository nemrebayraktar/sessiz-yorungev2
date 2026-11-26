import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Matrix4,
  type BufferGeometry,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/* Irklara özel neon gemiler. Gövde ileri −Z yönüne bakar; motorlar +Z ucunda (z ≈ 2.1).
   Neon şeritler MeshBasicMaterial + toneMapped=false: oyundaki bloom geçişi onları parlatır.
   Dönen parçalar root.userData.spin listesinde; spinShip() her karede döndürür. */

type Spin = { obj: Object3D; axis: 'x' | 'y' | 'z'; speed: number }

export type ShipStyle = {
  /** Gövde (koyu metal) ve iz (neon) renkleri, motor alevi rengi. */
  hull: number
  trim: number
  neon: number
  plume: number
  /** Motor alevlerinin yeri: [x, y, z] (x ±simetrik). */
  engine: [number, number, number]
}

export const SHIP_STYLE: Record<string, ShipStyle> = {
  earth: { hull: 0xd9dee8, trim: 0x2a3446, neon: 0x4fb8ff, plume: 0x8fd0ff, engine: [0.42, 0, 2.2] },
  mars: { hull: 0x7a3628, trim: 0x2a120c, neon: 0xff7a2a, plume: 0xff8a4a, engine: [0.35, 0, 2.5] },
  proxima: { hull: 0x1a1018, trim: 0x0a0608, neon: 0xff2a6a, plume: 0xff5a8a, engine: [0.2, 0, 2.4] },
  alpha: { hull: 0x3b2a5e, trim: 0x1c1430, neon: 0xc07aff, plume: 0xd2b0ff, engine: [0.5, -0.05, 2.0] },
  trappist: { hull: 0x2a6f6a, trim: 0x10302e, neon: 0x5affe6, plume: 0xa8fff2, engine: [0.42, 0, 2.4] },
  k218: { hull: 0x1d4f6e, trim: 0x0c2434, neon: 0x3ae0ff, plume: 0x8ef0ff, engine: [0.55, -0.05, 2.3] },
  kepler186: { hull: 0x2f5a26, trim: 0x16280f, neon: 0x9aff5a, plume: 0xc6f0a4, engine: [0.35, -0.1, 2.4] },
  gliese: { hull: 0x2e2420, trim: 0x140e0c, neon: 0xff5a1a, plume: 0xff7a2a, engine: [0.55, -0.05, 2.4] },
  kepler452: { hull: 0xe8d6a8, trim: 0x5a4524, neon: 0xffd25a, plume: 0xffe2a0, engine: [0.45, 0, 2.3] },
}

function hullMat(color: number, metalness = 0.72, roughness = 0.32) {
  return new MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: 0.06 })
}

/** Parlayan neon malzeme: ton eşlemesi kapalı, renk 1'in üstüne itilir ki bloom yakalasın. */
function neonMat(color: number, power = 1.8) {
  const m = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) })
  m.toneMapped = false
  return m
}

function glassMat(color: number) {
  return new MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.08, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.85 })
}

function glow(color: number, size: number) {
  const tex = glowSprite()
  const m = new SpriteMaterial({ map: tex, color, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.9 })
  m.toneMapped = false
  const s = new Sprite(m)
  s.scale.set(size, size, 1)
  s.name = 'halo'
  return s
}

let glowCanvasTex: CanvasTexture | null = null
function glowSprite() {
  if (glowCanvasTex) return glowCanvasTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.3, 'rgba(255,255,255,0.5)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 64, 64)
  }
  glowCanvasTex = new CanvasTexture(c)
  glowCanvasTex.colorSpace = SRGBColorSpace
  return glowCanvasTex
}

/** Kanat: XZ düzleminde bir şekli inceltip kalınlık verir (y ekseni kalınlık). */
function wing(points: [number, number][], depth: number, mat: MeshStandardMaterial | MeshBasicMaterial) {
  const shape = new Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (const [x, z] of points.slice(1)) shape.lineTo(x, z)
  shape.closePath()
  const geo = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 1 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, depth / 2, 0)
  return new Mesh(geo, mat)
}

/** Neon kenar şeridi: iki nokta arasında ince kutu. */
function strip(ax: number, ay: number, az: number, bx: number, by: number, bz: number, mat: MeshBasicMaterial, w = 0.05) {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const len = Math.hypot(dx, dy, dz)
  const m = new Mesh(new BoxGeometry(w, w, len), mat)
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
  m.lookAt(m.position.x + dx, m.position.y + dy, m.position.z + dz)
  return m
}

function engine(x: number, y: number, z: number, r: number, hull: MeshStandardMaterial, neon: MeshBasicMaterial, color: number) {
  const g = new Group()
  const can = new Mesh(new CylinderGeometry(r * 0.85, r, 0.9, 14), hull)
  can.rotation.x = Math.PI / 2
  const ring = new Mesh(new TorusGeometry(r * 0.95, r * 0.12, 8, 20), neon)
  ring.position.z = 0.46
  const core = new Mesh(new CylinderGeometry(r * 0.7, r * 0.7, 0.05, 14), neon)
  core.rotation.x = Math.PI / 2
  core.position.z = 0.47
  const halo = glow(color, r * 3.4)
  halo.position.z = 0.6
  g.add(can, ring, core, halo)
  g.position.set(x, y, z)
  return g
}

function navLight(x: number, y: number, z: number, color: number) {
  const g = new Group()
  const bulb = new Mesh(new SphereGeometry(0.07, 8, 6), neonMat(color, 2.4))
  const halo = glow(color, 0.7)
  g.add(bulb, halo)
  g.position.set(x, y, z)
  return g
}

function earthShip(st: ShipStyle) {
  const g = new Group()
  const hull = hullMat(st.hull, 0.65, 0.3)
  const dark = hullMat(st.trim, 0.8, 0.4)
  const neon = neonMat(st.neon)
  const pts = [0.02, 0.22, 0.42, 0.5, 0.52, 0.46, 0.36].map((r, i) => new Vector2(r, -2.3 + i * 0.72))
  const body = new Mesh(new LatheGeometry(pts, 18), hull)
  body.rotation.x = -Math.PI / 2
  body.rotation.z = Math.PI
  body.scale.set(1, 0.72, 1)
  const canopy = new Mesh(new SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassMat(0x6ac8ff))
  canopy.scale.set(1, 0.7, 1.9)
  canopy.position.set(0, 0.24, -0.9)
  const wl = wing([[0.35, -0.6], [2.2, 1.0], [2.3, 1.5], [0.4, 1.4]], 0.08, hull)
  const wr = wl.clone()
  wr.scale.x = -1
  const fin = wing([[0, 0.4], [0, 1.6], [0.9, 1.8], [0.5, 0.9]], 0.06, dark)
  fin.rotation.z = Math.PI / 2
  fin.position.set(0.03, 0.25, 0)
  g.add(body, canopy, wl, wr, fin)
  for (const s of [1, -1]) {
    g.add(strip(0.4 * s, 0.1, -0.55, 2.22 * s, 0.1, 1.02, neon))
    g.add(strip(2.3 * s, 0.1, 1.05, 2.3 * s, 0.1, 1.5, neon))
    g.add(engine(0.42 * s, 0, 1.75, 0.26, dark, neon, st.neon))
    g.add(navLight(2.32 * s, 0.12, 1.5, s > 0 ? 0x5aff8a : 0xff5a5a))
  }
  g.add(strip(0, 0.32, -0.2, 0, 0.32, 1.2, neon, 0.04))
  return { g, spin: [] as Spin[] }
}

function marsShip(st: ShipStyle) {
  const g = new Group()
  const hull = hullMat(st.hull, 0.55, 0.5)
  const dark = hullMat(st.trim, 0.6, 0.55)
  const neon = neonMat(st.neon)
  const core = new Mesh(new BoxGeometry(1.2, 0.62, 3.6), hull)
  const top = new Mesh(new BoxGeometry(0.9, 0.3, 2.2), dark)
  top.position.set(0, 0.42, 0.2)
  const nose = new Mesh(new ConeGeometry(0.62, 1.3, 4), hull)
  nose.rotation.x = -Math.PI / 2
  nose.rotation.y = Math.PI / 4
  nose.position.z = -2.4
  const visor = new Mesh(new BoxGeometry(0.7, 0.1, 0.5), neon)
  visor.position.set(0, 0.6, -0.8)
  g.add(core, top, nose, visor)
  for (const s of [1, -1]) {
    const pod = new Mesh(new BoxGeometry(0.6, 0.5, 2.4), hull)
    pod.position.set(1.15 * s, -0.08, 0.5)
    const arm = new Mesh(new BoxGeometry(0.6, 0.14, 0.9), dark)
    arm.position.set(0.75 * s, 0, 0.3)
    g.add(pod, arm)
    for (const z of [-0.3, 0.3, 0.9]) g.add(strip(1.46 * s, 0, z - 0.18, 1.46 * s, 0, z + 0.18, neon, 0.07))
    g.add(strip(0.61 * s, 0.32, -1.6, 0.61 * s, 0.32, 1.5, neon, 0.045))
    g.add(engine(1.15 * s, -0.08, 1.95, 0.24, dark, neon, st.neon))
    g.add(engine(0.35 * s, 0, 2.05, 0.22, dark, neon, st.neon))
    g.add(navLight(1.46 * s, 0.3, -0.7, 0xffb05a))
  }
  return { g, spin: [] as Spin[] }
}

function proximaShip(st: ShipStyle) {
  const g = new Group()
  const hull = hullMat(st.hull, 0.4, 0.7)
  const neon = neonMat(st.neon, 2.2)
  const blade = wing([[0, -2.8], [0.45, -0.6], [0.32, 1.9], [-0.32, 1.9], [-0.45, -0.6]], 0.22, hull)
  blade.position.y = -0.11
  g.add(blade)
  for (const s of [1, -1]) {
    const w = wing([[0.3 * s, 0.4], [2.4 * s, -1.2], [2.55 * s, -0.95], [0.4 * s, 1.5]], 0.06, hull)
    g.add(w)
    g.add(strip(0.32 * s, 0.05, 0.4, 2.42 * s, 0.05, -1.18, neon, 0.045))
    g.add(strip(0.42 * s, 0.05, 1.5, 2.55 * s, 0.05, -0.95, neon, 0.03))
    const claw = new Mesh(new ConeGeometry(0.06, 0.8, 5), hull)
    claw.rotation.x = -Math.PI / 2
    claw.position.set(2.48 * s, 0.03, -1.4)
    g.add(claw)
    g.add(engine(0.2 * s, 0, 1.95, 0.16, hull, neon, st.neon))
  }
  const eye = new Mesh(new SphereGeometry(0.16, 14, 10), neon)
  eye.scale.set(1, 0.7, 1.4)
  eye.position.set(0, 0.14, -1.2)
  const eyeGlow = glow(st.neon, 1.6)
  eyeGlow.position.copy(eye.position)
  g.add(eye, eyeGlow, strip(0, 0.13, -2.6, 0, 0.13, -1.4, neon, 0.03))
  return { g, spin: [] as Spin[] }
}

function alphaShip(st: ShipStyle) {
  const g = new Group()
  const hull = hullMat(st.hull, 0.6, 0.3)
  const neon = neonMat(st.neon)
  const disc = new Mesh(new SphereGeometry(1.7, 28, 10), hull)
  disc.scale.set(1, 0.22, 1)
  const dome = new Mesh(new SphereGeometry(0.72, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat(0xb88aff))
  dome.position.y = 0.26
  const brain = new Mesh(new SphereGeometry(0.42, 14, 10), new MeshStandardMaterial({ color: 0xe2b0ff, emissive: 0x8d5ae0, emissiveIntensity: 0.4, roughness: 0.6 }))
  brain.position.y = 0.42
  brain.scale.set(1.1, 0.9, 1)
  const ring = new Mesh(new TorusGeometry(1.72, 0.05, 8, 48), neon)
  ring.rotation.x = Math.PI / 2
  const ring2 = new Mesh(new TorusGeometry(2.15, 0.035, 8, 56), neon)
  ring2.rotation.x = Math.PI / 2
  ring2.position.y = -0.05
  const ringHolder = new Group()
  ringHolder.add(ring2)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ringHolder.add(navLight(Math.cos(a) * 2.15, -0.05, Math.sin(a) * 2.15, st.neon))
  }
  const under = glow(st.neon, 3.4)
  under.position.y = -0.4
  g.add(disc, dome, brain, ring, ringHolder, under)
  for (const s of [1, -1]) g.add(engine(0.5 * s, -0.05, 1.55, 0.2, hull, neon, st.neon))
  return { g, spin: [{ obj: ringHolder, axis: 'y', speed: 0.9 }] as Spin[] }
}

function trappistShip(st: ShipStyle) {
  const g = new Group()
  const crystal = new MeshStandardMaterial({ color: 0x8ff0e6, metalness: 0.1, roughness: 0.05, emissive: st.neon, emissiveIntensity: 0.35, transparent: true, opacity: 0.82, flatShading: true })
  const neon = neonMat(st.neon)
  const core = new Mesh(new OctahedronGeometry(0.9, 0), crystal)
  core.scale.set(0.8, 0.8, 2.4)
  const heart = new Mesh(new OctahedronGeometry(0.32, 0), neon)
  const spinner = new Group()
  spinner.add(heart)
  g.add(core, spinner)
  for (const s of [1, -1]) {
    const shard = new Mesh(new OctahedronGeometry(0.7, 0), crystal)
    shard.scale.set(2.6, 0.18, 0.8)
    shard.position.set(1.7 * s, 0, 0.3)
    shard.rotation.y = 0.35 * s
    const tip = new Mesh(new OctahedronGeometry(0.22, 0), crystal)
    tip.scale.set(0.6, 0.6, 1.8)
    tip.position.set(1.2 * s, 0.35, 1.2)
    g.add(shard, tip)
    g.add(strip(0.5 * s, 0, 0.1, 3.4 * s, 0, 0.9, neon, 0.035))
    g.add(engine(0.42 * s, 0, 1.95, 0.17, crystal, neon, st.neon))
    g.add(navLight(3.45 * s, 0, 0.95, st.neon))
  }
  const halo = glow(st.neon, 2.6)
  g.add(halo)
  return { g, spin: [{ obj: spinner, axis: 'z', speed: 2.2 }] as Spin[] }
}

function oceanShip(st: ShipStyle) {
  const g = new Group()
  const hull = hullMat(st.hull, 0.5, 0.35)
  const belly = hullMat(0x8fd8e8, 0.3, 0.5)
  const neon = neonMat(st.neon)
  const body = new Mesh(new SphereGeometry(1, 24, 14), hull)
  body.scale.set(1.1, 0.42, 2.1)
  const under = new Mesh(new SphereGeometry(0.98, 20, 10), belly)
  under.scale.set(1.02, 0.3, 2)
  under.position.y = -0.08
  const tail = new Mesh(new ConeGeometry(0.22, 1.6, 8), hull)
  tail.rotation.x = Math.PI / 2
  tail.position.z = 2.4
  const fin = wing([[0, 0.6], [0, 2.4], [0.8, 2.6], [0.3, 1.2]], 0.05, hull)
  fin.rotation.z = Math.PI / 2
  fin.position.set(0.03, 0.3, 0)
  g.add(body, under, tail, fin)
  for (const s of [1, -1]) {
    const w = wing([[0.6 * s, -0.8], [3.0 * s, 0.6], [2.6 * s, 1.2], [0.7 * s, 1.3]], 0.07, hull)
    w.position.y = -0.05
    g.add(w)
    for (let i = 0; i < 3; i++) g.add(strip(0.55 * s, 0.32, -0.6 + i * 0.32, 0.95 * s, 0.24, -0.55 + i * 0.32, neon, 0.035))
    g.add(strip(0.62 * s, 0.03, -0.78, 2.98 * s, 0.03, 0.6, neon, 0.04))
    g.add(engine(0.55 * s, -0.05, 1.85, 0.22, hull, neon, st.neon))
    g.add(navLight(3.0 * s, 0.05, 0.62, st.neon))
  }
  const eyeL = navLight(0.35, 0.22, -1.7, 0xffffff)
  const eyeR = navLight(-0.35, 0.22, -1.7, 0xffffff)
  g.add(eyeL, eyeR)
  return { g, spin: [] as Spin[] }
}

function plantShip(st: ShipStyle) {
  const g = new Group()
  const bark = hullMat(0x5a3a22, 0.1, 0.8)
  const leaf = new MeshStandardMaterial({ color: st.hull, roughness: 0.55, metalness: 0.05, emissive: 0x2a5a12, emissiveIntensity: 0.25, side: DoubleSide })
  const neon = neonMat(st.neon)
  const pod = new Mesh(new SphereGeometry(0.75, 20, 14), bark)
  pod.scale.set(1, 0.85, 2.6)
  const tipSeed = new Mesh(new ConeGeometry(0.35, 0.9, 10), bark)
  tipSeed.rotation.x = -Math.PI / 2
  tipSeed.position.z = -2.2
  const bud = new Mesh(new SphereGeometry(0.3, 12, 10), neon)
  bud.position.set(0, 0.55, -0.4)
  g.add(pod, tipSeed, bud, glow(st.neon, 1.4))
  ;(g.children[g.children.length - 1] as Sprite).position.copy(bud.position)
  for (const s of [1, -1]) {
    const l = wing([[0.4 * s, -0.4], [1.6 * s, -0.9], [2.8 * s, -0.2], [2.4 * s, 0.9], [0.6 * s, 1.0]], 0.05, leaf)
    l.rotation.z = -0.15 * s
    g.add(l)
    g.add(strip(0.45 * s, 0.08, 0.2, 2.7 * s, 0.32, -0.1, neon, 0.035))
    g.add(strip(1.4 * s, 0.17, 0.05, 1.6 * s, 0.17, -0.8, neon, 0.025))
    g.add(strip(1.9 * s, 0.22, 0.0, 2.3 * s, 0.25, 0.8, neon, 0.025))
    g.add(engine(0.35 * s, -0.1, 1.95, 0.2, bark, neon, st.neon))
  }
  const vine = new Mesh(new TorusGeometry(0.78, 0.04, 6, 30), neon)
  vine.position.z = 0.4
  g.add(vine)
  return { g, spin: [] as Spin[] }
}

function glieseShip(st: ShipStyle) {
  const g = new Group()
  const rock = new MeshStandardMaterial({ color: st.hull, roughness: 0.9, metalness: 0.05, flatShading: true })
  const neon = neonMat(st.neon, 2.2)
  const core = new Mesh(new DodecahedronGeometry(1.05, 0), rock)
  core.scale.set(1, 0.7, 1.9)
  const glowCore = new Mesh(new IcosahedronGeometry(0.98, 0), neon)
  glowCore.scale.set(0.96, 0.64, 1.82)
  const nose = new Mesh(new ConeGeometry(0.5, 1.3, 5), rock)
  nose.rotation.x = -Math.PI / 2
  nose.position.z = -2.2
  g.add(glowCore, core, nose)
  for (const s of [1, -1]) {
    const chunk = new Mesh(new DodecahedronGeometry(0.55, 0), rock)
    chunk.scale.set(1.6, 0.55, 1.2)
    chunk.position.set(1.35 * s, -0.05, 0.6)
    const spike = new Mesh(new ConeGeometry(0.16, 1.1, 5), rock)
    spike.rotation.z = -Math.PI / 2 * s
    spike.position.set(2.3 * s, 0, 0.5)
    g.add(chunk, spike)
    g.add(strip(0.7 * s, 0.38, -1.2, 1.1 * s, 0.2, 0.6, neon, 0.05))
    g.add(strip(1.0 * s, 0.25, 0.4, 1.9 * s, 0.1, 0.8, neon, 0.05))
    g.add(engine(0.55 * s, -0.05, 1.95, 0.27, rock, neon, st.neon))
    const horn = new Mesh(new ConeGeometry(0.12, 0.7, 5), rock)
    horn.position.set(0.45 * s, 0.75, -0.5)
    horn.rotation.z = -0.4 * s
    g.add(horn)
  }
  const heat = glow(st.neon, 3.2)
  heat.position.z = 0.3
  g.add(heat)
  return { g, spin: [] as Spin[] }
}

function goldShip(st: ShipStyle) {
  const g = new Group()
  const gold = new MeshStandardMaterial({ color: st.hull, metalness: 0.9, roughness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.2 })
  const white = hullMat(0xf8f2e4, 0.4, 0.25)
  const neon = neonMat(st.neon, 2)
  const pts = [0.02, 0.28, 0.46, 0.55, 0.5, 0.4, 0.3].map((r, i) => new Vector2(r, -2.4 + i * 0.75))
  const body = new Mesh(new LatheGeometry(pts, 20), white)
  body.rotation.x = -Math.PI / 2
  body.rotation.z = Math.PI
  body.scale.set(1, 0.7, 1)
  const canopy = new Mesh(new SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassMat(0xffe2a0))
  canopy.scale.set(1, 0.7, 1.8)
  canopy.position.set(0, 0.25, -0.8)
  g.add(body, canopy)
  for (const s of [1, -1]) {
    const w = wing([[0.4 * s, -0.2], [2.6 * s, 0.3], [2.9 * s, 0.9], [0.45 * s, 1.3]], 0.07, gold)
    g.add(w)
    g.add(strip(0.42 * s, 0.1, -0.2, 2.6 * s, 0.1, 0.3, neon, 0.04))
    g.add(strip(2.62 * s, 0.1, 0.32, 2.9 * s, 0.1, 0.9, neon, 0.04))
    g.add(engine(0.45 * s, 0, 1.85, 0.24, gold, neon, st.neon))
    g.add(navLight(2.92 * s, 0.12, 0.92, st.neon))
  }
  // Taç: geminin arkasında dönen altın hale.
  const crown = new Group()
  const halo = new Mesh(new TorusGeometry(1.1, 0.06, 8, 48), neon)
  crown.add(halo)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const tooth = new Mesh(new ConeGeometry(0.09, 0.35, 4), gold)
    tooth.position.set(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0)
    tooth.rotation.z = a - Math.PI / 2
    crown.add(tooth)
  }
  crown.position.set(0, 0.35, 1.0)
  const sun = glow(st.neon, 2.6)
  sun.position.copy(crown.position)
  g.add(crown, sun)
  return { g, spin: [{ obj: crown, axis: 'z', speed: 0.7 }] as Spin[] }
}

const BUILDERS: Record<string, (st: ShipStyle) => { g: Group; spin: Spin[] }> = {
  earth: earthShip,
  mars: marsShip,
  proxima: proximaShip,
  alpha: alphaShip,
  trappist: trappistShip,
  k218: oceanShip,
  kepler186: plantShip,
  gliese: glieseShip,
  kepler452: goldShip,
}

/** Irkın neon gemi gövdesi; dönen parçalar userData.spin'de. */
export function buildNeonBody(kind: string): Group {
  const st = SHIP_STYLE[kind] ?? SHIP_STYLE.earth
  const make = BUILDERS[kind] ?? earthShip
  const { g, spin } = make(st)
  mergeStatic(g, new Set(spin.map((x) => x.obj)))
  g.name = 'body'
  g.userData.spin = spin
  return g
}

export function spinShip(root: Object3D, dt: number) {
  root.traverse((o) => {
    const list = o.userData.spin as Spin[] | undefined
    if (!list) return
    for (const s of list) s.obj.rotation[s.axis] += s.speed * dt
  })
}

/** Park halindeki gemide (oyuncu yürürken kamera çok yakın) parıltı sprite'larını kapat: telefonda doluluk maliyeti. */
export function setShipHalos(root: Object3D, on: boolean) {
  if (root.userData.halosOn === on) return
  root.userData.halosOn = on
  root.traverse((o) => {
    if (o.name === 'halo') o.visible = on
  })
}

/** Gövdenin sabit parçalarını malzemeye göre tek ağa birleştir: 30–50 çizim yerine birkaç çizim.
   Dönen gruplar ve parıltı sprite'ları olduğu gibi kalır. */
function mergeStatic(g: Group, spinning: Set<Object3D>) {
  g.updateMatrixWorld(true)
  const inv = new Matrix4().copy(g.matrixWorld).invert()
  const byMat = new Map<Material, BufferGeometry[]>()
  const drop: Mesh[] = []
  g.traverse((o) => {
    if (!(o instanceof Mesh)) return
    for (let a: Object3D | null = o; a && a !== g; a = a.parent) if (spinning.has(a)) return
    const mat = o.material as Material
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as BufferGeometry
    for (const key of Object.keys(geo.attributes)) if (key !== 'position' && key !== 'normal') geo.deleteAttribute(key)
    geo.clearGroups()
    const m = new Matrix4().multiplyMatrices(inv, o.matrixWorld)
    geo.applyMatrix4(m)
    // Aynalanmış parça (negatif ölçek): üçgen sırasını çevir ki içi dışına dönmesin.
    if (m.determinant() < 0) {
      for (const key of ['position', 'normal']) {
        const attr = geo.getAttribute(key)
        if (!attr) continue
        const arr = attr.array as Float32Array
        for (let t = 0; t < arr.length; t += 9) {
          for (let k = 0; k < 3; k++) {
            const tmp = arr[t + 3 + k]
            arr[t + 3 + k] = arr[t + 6 + k]
            arr[t + 6 + k] = tmp
          }
        }
      }
    }
    const list = byMat.get(mat) ?? []
    list.push(geo)
    byMat.set(mat, list)
    drop.push(o)
  })
  for (const m of drop) m.removeFromParent()
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false)
    for (const x of geos) x.dispose()
    if (merged) g.add(new Mesh(merged, mat))
  }
}
