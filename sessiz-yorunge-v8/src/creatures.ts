import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  type BufferGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  Box3,
  Raycaster,
  Vector3,
  type Material,
} from 'three'
import type { Rig, RigStyle } from './meshes'

/* Türlerin yaya gövdeleri. Her tür kendine has: kimi tatlı (koca göbek, kocaman gözler), kimi korkunç.
   Hepsi aynı `Rig` arayüzünü verir (kol, bacak, kafa, kalça); yürüyüş animasyonu `stepRig` değişmeden çalışır.
   Kökün (root) yeri eskisi gibi yüzeyden ~1,05 yukarıdadır; ayakları yere değsin diye gövde `FEET` kadar aşağıda kurulur. */

export type CreatureForm =
  | 'astronaut'
  | 'colonist'
  | 'shade'
  | 'bighead'
  | 'crystal'
  | 'belly'
  | 'sprout'
  | 'golem'
  | 'regal'
  | 'yeti'
  | 'wild'

export type CreatureLook = {
  id: string
  form: CreatureForm
  style: RigStyle
  body?: number
  skin?: number
  leg?: number
  /** Yabani yerliler için gezegen boyuna göre biçim: 'small' sekici, 'mid' sümüklü, 'large' böcek. */
  variant?: 'small' | 'mid' | 'large'
}

export const FEET = -1.05

const geoCache = new Map<string, BufferGeometry>()
function cached(key: string, make: () => BufferGeometry) {
  let g = geoCache.get(key)
  if (!g) {
    g = make()
    geoCache.set(key, g)
  }
  return g
}
const sph = (r: number, w = 14, h = 10) => cached(`s${r}:${w}:${h}`, () => new SphereGeometry(r, w, h))
const box = (x: number, y: number, z: number) => cached(`b${x}:${y}:${z}`, () => new BoxGeometry(x, y, z))
const cone = (r: number, h: number, s = 8) => cached(`c${r}:${h}:${s}`, () => new ConeGeometry(r, h, s))
const cyl = (a: number, b: number, h: number, s = 10) => cached(`y${a}:${b}:${h}:${s}`, () => new CylinderGeometry(a, b, h, s))
const cap = (r: number, l: number) => cached(`p${r}:${l}`, () => new CapsuleGeometry(r, l, 4, 10))
const tor = (r: number, t: number) => cached(`t${r}:${t}`, () => new TorusGeometry(r, t, 8, 28))
const ico = (r: number, d = 0) => cached(`i${r}:${d}`, () => new IcosahedronGeometry(r, d))
const oct = (r: number) => cached(`o${r}`, () => new OctahedronGeometry(r))

function mat(color: number, opt: { rough?: number; metal?: number; glow?: number; emissive?: number; opacity?: number } = {}) {
  const m = new MeshStandardMaterial({
    color,
    roughness: opt.rough ?? 0.55,
    metalness: opt.metal ?? 0.05,
    emissive: opt.emissive ?? color,
    emissiveIntensity: opt.glow ?? 0.12,
  })
  if (opt.opacity !== undefined) {
    m.transparent = true
    m.opacity = opt.opacity
    m.depthWrite = false
  }
  return m
}

function shine(color: number, boost = 1.6) {
  const m = new MeshBasicMaterial({ color })
  m.color.multiplyScalar(boost)
  m.toneMapped = false
  return m
}

function part(geo: BufferGeometry, material: MeshStandardMaterial | MeshBasicMaterial, x = 0, y = 0, z = 0) {
  const m = new Mesh(geo, material)
  m.position.set(x, y, z)
  return m
}

/** Tatlı göz: beyaz küre, iri bebek, parlak nokta. `look` öne bakar (+z). */
function cuteEye(size: number, iris: number, x: number, y: number, z: number) {
  const g = new Group()
  g.position.set(x, y, z)
  const white = part(sph(size, 14, 12), mat(0xffffff, { rough: 0.2, glow: 0.35 }))
  white.scale.set(1, 1.08, 0.7)
  const pupil = part(sph(size * 0.62, 12, 10), new MeshBasicMaterial({ color: iris }), 0, -size * 0.06, size * 0.5)
  pupil.scale.set(1, 1.1, 0.5)
  const glint = part(sph(size * 0.2, 8, 6), new MeshBasicMaterial({ color: 0xffffff }), size * 0.22, size * 0.24, size * 0.78)
  const glint2 = part(sph(size * 0.1, 6, 6), new MeshBasicMaterial({ color: 0xffffff }), -size * 0.2, -size * 0.2, size * 0.8)
  g.add(white, pupil, glint, glint2)
  return g
}

function blush(x: number, y: number, z: number, r = 0.08) {
  const m = new MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.75, depthWrite: false })
  const b = part(sph(r, 8, 6), m, x, y, z)
  b.scale.set(1.3, 0.7, 0.3)
  return b
}

function smile(width: number, y: number, z: number, color = 0x3a1a24) {
  const g = new Group()
  const m = new Mesh(cached(`smile${width}`, () => new TorusGeometry(width, width * 0.18, 6, 12, Math.PI)), new MeshBasicMaterial({ color }))
  m.rotation.z = Math.PI
  g.position.set(0, y, z)
  g.add(m)
  return g
}

/** Omuz/kalça eklemi: grup eklemde durur, uzuv aşağı sarkar; `stepRig` x ekseninde döndürür. */
function joint(x: number, y: number, z = 0) {
  const g = new Group()
  g.position.set(x, y, z)
  return g
}

type Parts = { hips: Group; head: Group; armL: Group; armR: Group; legL: Group; legR: Group; wiggle: Object3D[] }

function frame(): Parts {
  return { hips: new Group(), head: new Group(), armL: joint(0, 0), armR: joint(0, 0), legL: joint(0, 0), legR: joint(0, 0), wiggle: [] }
}

/* ---------------- Dünya: tatlı astronot ---------------- */
function astronaut(look: CreatureLook): Parts {
  const p = frame()
  const suit = mat(0xf2f4f8, { rough: 0.45 })
  const trim = mat(look.body ?? 0x5a86c8, { glow: 0.2 })
  const body = part(cap(0.34, 0.32), suit, 0, 0.9, 0)
  body.scale.set(1.1, 1, 0.95)
  const belt = part(tor(0.36, 0.05), trim, 0, 0.76, 0)
  belt.rotation.x = Math.PI / 2
  const pack = part(box(0.5, 0.55, 0.26), mat(0xc9ced8), 0, 0.98, -0.36)
  const light = part(sph(0.05, 6, 6), shine(0x7dff9a), 0.16, 1.18, -0.5)
  const badge = part(sph(0.07, 8, 6), trim, -0.17, 1.08, 0.33)
  p.head.position.set(0, 1.62, 0)
  const face = part(sph(0.34, 18, 14), mat(look.skin ?? 0xffe1c4, { glow: 0.15 }), 0, 0, 0.02)
  const glass = part(sph(0.46, 20, 16), mat(0x9fd8ff, { rough: 0.05, metal: 0.3, glow: 0.25, opacity: 0.32 }))
  const rim = part(tor(0.42, 0.06), mat(0xd7dbe3), 0, -0.3, 0)
  rim.rotation.x = Math.PI / 2
  const ant = part(cyl(0.015, 0.015, 0.32, 5), mat(0xd7dbe3), 0.2, 0.52, -0.05)
  const bulb = part(sph(0.06, 8, 6), shine(0xff6a5a), 0.2, 0.7, -0.05)
  p.wiggle.push(ant)
  ant.add(bulb)
  bulb.position.set(0, 0.18, 0)
  p.head.add(face, cuteEye(0.09, 0x1c140e, -0.12, 0.05, 0.27), cuteEye(0.09, 0x1c140e, 0.12, 0.05, 0.27), blush(-0.2, -0.07, 0.28), blush(0.2, -0.07, 0.28), smile(0.06, -0.12, 0.31), glass, rim, ant)
  p.armL.position.set(-0.44, 1.15, 0)
  p.armR.position.set(0.44, 1.15, 0)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(cap(0.11, 0.32), suit, 0, -0.26, 0))
    arm.add(part(sph(0.13, 10, 8), trim, 0, -0.52, 0))
  }
  p.legL.position.set(-0.17, 0.55, 0)
  p.legR.position.set(0.17, 0.55, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(cap(0.12, 0.26), suit, 0, -0.24, 0))
    const boot = part(box(0.24, 0.16, 0.32), mat(0x3d4658), 0, -0.48, 0.05)
    leg.add(boot)
  }
  p.hips.add(body, belt, pack, light, badge)
  return p
}

/* ---------------- Eski Marslı (Ross 128 b): tıknaz, pas rengi zırh ve kubbe miğfer ---------------- */
function colonist(look: CreatureLook): Parts {
  const p = frame()
  const armor = mat(look.body ?? 0xc45a32, { rough: 0.7, metal: 0.25 })
  const dark = mat(0x5a2a1c, { rough: 0.8 })
  const body = part(box(0.78, 0.72, 0.56), armor, 0, 0.95, 0)
  const chest = part(box(0.5, 0.32, 0.08), mat(0xe8b07a, { glow: 0.2 }), 0, 1.02, 0.3)
  const vent = part(box(0.36, 0.05, 0.03), shine(0xffb26a, 1.3), 0, 0.92, 0.35)
  const tankL = part(cyl(0.12, 0.12, 0.55), mat(0xd9d4cc, { metal: 0.5 }), -0.18, 1.0, -0.38)
  const tankR = part(cyl(0.12, 0.12, 0.55), mat(0xd9d4cc, { metal: 0.5 }), 0.18, 1.0, -0.38)
  const padL = part(sph(0.22, 10, 8), armor, -0.46, 1.25, 0)
  const padR = part(sph(0.22, 10, 8), armor, 0.46, 1.25, 0)
  padL.scale.set(1, 0.6, 1)
  padR.scale.set(1, 0.6, 1)
  p.head.position.set(0, 1.6, 0)
  const helm = part(sph(0.36, 18, 14), armor)
  helm.scale.set(1.08, 1, 1.05)
  const visor = part(box(0.5, 0.15, 0.1), shine(0xffa04a, 1.5), 0, 0.02, 0.33)
  const mask = part(cyl(0.12, 0.15, 0.18, 8), dark, 0, -0.2, 0.3)
  mask.rotation.x = Math.PI / 2
  const ant = part(cyl(0.02, 0.02, 0.4, 5), dark, -0.24, 0.38, -0.08)
  p.wiggle.push(ant)
  p.head.add(helm, visor, mask, ant)
  p.armL.position.set(-0.5, 1.2, 0)
  p.armR.position.set(0.5, 1.2, 0)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(cap(0.13, 0.32), armor, 0, -0.28, 0))
    arm.add(part(box(0.26, 0.24, 0.26), dark, 0, -0.58, 0))
  }
  p.legL.position.set(-0.22, 0.6, 0)
  p.legR.position.set(0.22, 0.6, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(cap(0.15, 0.24), armor, 0, -0.24, 0))
    leg.add(part(box(0.3, 0.2, 0.38), dark, 0, -0.52, 0.05))
  }
  p.hips.add(body, chest, vent, tankL, tankR, padL, padR)
  return p
}

/* ---------------- Proxima: Gölge — korkunç, kambur, tek kırmızı göz, pençeler ---------------- */
function shade(look: CreatureLook): Parts {
  const p = frame()
  const skin = mat(look.body ?? 0x2a1426, { rough: 0.9, glow: 0.06 })
  const bone = mat(0xd8cbb8, { rough: 0.6 })
  const torso = part(cone(0.42, 1.35, 7), skin, 0, 1.45, -0.05)
  torso.rotation.x = Math.PI + 0.35
  const ribs = part(box(0.5, 0.06, 0.2), mat(0x4a2440), 0, 1.2, 0.22)
  const hip = part(sph(0.3, 10, 8), skin, 0, 0.95, 0)
  hip.scale.set(1, 0.7, 0.9)
  const spikes: Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const s = part(cone(0.07, 0.36 - i * 0.03, 5), bone, 0, 1.85 - i * 0.2, -0.32 + i * 0.04)
    s.rotation.x = -0.9
    spikes.push(s)
  }
  p.head.position.set(0, 2.1, 0.32)
  const skull = part(sph(0.32, 14, 12), skin)
  skull.scale.set(0.9, 1.25, 1.15)
  const brow = part(box(0.48, 0.08, 0.16), mat(0x14080f), 0, 0.12, 0.25)
  brow.rotation.x = 0.3
  const eyeGlow = part(sph(0.13, 14, 12), shine(0xff2a2a, 2.2), 0, 0.02, 0.3)
  const slit = part(box(0.025, 0.2, 0.04), new MeshBasicMaterial({ color: 0x120000 }), 0, 0.02, 0.42)
  const halo = new Mesh(sph(0.3, 12, 10), new MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false }))
  halo.position.set(0, 0.02, 0.32)
  const jaw = part(box(0.36, 0.08, 0.18), new MeshBasicMaterial({ color: 0x0a0306 }), 0, -0.26, 0.26)
  jaw.name = 'jaw'
  p.head.add(skull, brow, eyeGlow, slit, halo, jaw)
  for (let i = 0; i < 6; i++) {
    const tooth = part(cone(0.025, 0.1, 4), bone, -0.14 + i * 0.056, -0.21, 0.34)
    tooth.rotation.x = Math.PI
    p.head.add(tooth)
  }
  for (const side of [-1, 1]) {
    const horn = part(cone(0.06, 0.5, 6), bone, side * 0.2, 0.38, -0.1)
    horn.rotation.set(-0.6, 0, side * -0.35)
    p.head.add(horn)
  }
  p.armL.position.set(-0.4, 1.75, 0.18)
  p.armR.position.set(0.4, 1.75, 0.18)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(cyl(0.06, 0.05, 1.35, 6), skin, 0, -0.68, 0))
    for (let k = -1; k <= 1; k++) {
      const claw = part(cone(0.035, 0.32, 5), bone, k * 0.07, -1.45, 0.06)
      claw.rotation.x = Math.PI - 0.4
      arm.add(claw)
    }
  }
  p.legL.position.set(-0.2, 0.95, 0)
  p.legR.position.set(0.2, 0.95, 0)
  for (const leg of [p.legL, p.legR]) {
    const thigh = part(cyl(0.08, 0.06, 0.55, 6), skin, 0, -0.27, -0.06)
    thigh.rotation.x = 0.25
    const shin = part(cyl(0.06, 0.04, 0.5, 6), skin, 0, -0.72, -0.02)
    const foot = part(cone(0.07, 0.3, 4), bone, 0, -0.95, 0.12)
    foot.rotation.x = Math.PI / 2
    leg.add(thigh, shin, foot)
  }
  p.hips.add(torso, ribs, hip, ...spikes)
  return p
}

/* ---------------- Alpha: Koca kafa — mor, kocaman parlak gözler, titreyen antenler ---------------- */
function bighead(look: CreatureLook): Parts {
  const p = frame()
  const skin = mat(look.body ?? 0x8d5ae0, { glow: 0.18, rough: 0.4 })
  const pale = mat(look.skin ?? 0xd2b0ff, { glow: 0.2 })
  const body = part(sph(0.3, 14, 10), skin, 0, 0.72, 0)
  body.scale.set(0.95, 1.15, 0.85)
  const tummy = part(sph(0.2, 12, 10), pale, 0, 0.68, 0.14)
  tummy.scale.set(1, 1.1, 0.6)
  p.head.position.set(0, 1.42, 0)
  const skull = part(sph(0.62, 22, 18), skin)
  skull.scale.set(1.15, 0.95, 1)
  const chin = part(sph(0.34, 14, 10), skin, 0, -0.38, 0.12)
  p.head.add(skull, chin)
  p.head.add(cuteEye(0.24, 0x1b1030, -0.27, 0.02, 0.44), cuteEye(0.24, 0x1b1030, 0.27, 0.02, 0.44))
  p.head.add(blush(-0.42, -0.2, 0.42, 0.1), blush(0.42, -0.2, 0.42, 0.1), smile(0.07, -0.3, 0.48))
  for (const side of [-1, 1]) {
    const stalk = part(cyl(0.02, 0.02, 0.5, 5), pale, side * 0.28, 0.75, -0.05)
    stalk.rotation.z = side * -0.35
    const tip = part(sph(0.09, 10, 8), shine(0x9cf2ff, 1.8), 0, 0.28, 0)
    stalk.add(tip)
    p.head.add(stalk)
    p.wiggle.push(stalk)
  }
  p.armL.position.set(-0.3, 0.88, 0)
  p.armR.position.set(0.3, 0.88, 0)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(cap(0.07, 0.24), skin, 0, -0.18, 0))
    arm.add(part(sph(0.09, 8, 6), pale, 0, -0.36, 0))
  }
  p.legL.position.set(-0.13, 0.46, 0)
  p.legR.position.set(0.13, 0.46, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(cap(0.08, 0.2), skin, 0, -0.2, 0))
    const foot = part(sph(0.12, 10, 8), pale, 0, -0.4, 0.06)
    foot.scale.set(1, 0.55, 1.4)
    leg.add(foot)
  }
  p.hips.add(body, tummy)
  return p
}

/* ---------------- TRAPPIST: Işıltı — parlayan kristal peri, seker ---------------- */
function crystal(look: CreatureLook): Parts {
  const p = frame()
  const glass = mat(look.body ?? 0x2f9a90, { rough: 0.1, metal: 0.2, glow: 0.55, opacity: 0.78 })
  const pale = mat(look.skin ?? 0xbfeee6, { glow: 0.5, rough: 0.2 })
  const shell = part(oct(0.45), glass, 0, 0.95, 0)
  shell.scale.set(1, 1.35, 0.9)
  const core = part(sph(0.17, 12, 10), shine(0xbffcff, 2.2), 0, 0.95, 0)
  const ring = part(tor(0.5, 0.025), shine(0x9ff7ea, 1.6), 0, 0.95, 0)
  ring.rotation.x = Math.PI / 2 - 0.3
  p.wiggle.push(ring)
  p.head.position.set(0, 1.62, 0)
  const face = part(sph(0.3, 16, 12), pale)
  face.scale.set(1.1, 0.95, 0.95)
  p.head.add(face, cuteEye(0.12, 0x0c3a3a, -0.13, 0.03, 0.22), cuteEye(0.12, 0x0c3a3a, 0.13, 0.03, 0.22), smile(0.045, -0.12, 0.28), blush(-0.2, -0.08, 0.24), blush(0.2, -0.08, 0.24))
  for (const [x, z, h, tilt] of [[0, 0, 0.42, 0], [-0.17, -0.05, 0.3, 0.45], [0.17, -0.05, 0.3, -0.45]]) {
    const shard = part(cone(0.07, h, 4), glass, x, 0.3 + h * 0.3, z)
    shard.rotation.z = tilt
    p.head.add(shard)
  }
  p.armL.position.set(-0.36, 1.1, 0)
  p.armR.position.set(0.36, 1.1, 0)
  for (const arm of [p.armL, p.armR]) {
    const a = part(cone(0.07, 0.42, 4), glass, 0, -0.22, 0)
    a.rotation.x = Math.PI
    arm.add(a)
  }
  p.legL.position.set(-0.14, 0.45, 0)
  p.legR.position.set(0.14, 0.45, 0)
  for (const leg of [p.legL, p.legR]) {
    const l = part(cone(0.08, 0.42, 4), glass, 0, -0.22, 0)
    l.rotation.x = Math.PI
    leg.add(l)
  }
  p.hips.add(shell, core, ring)
  return p
}

/* ---------------- K2-18: Deniz — kocaman göbek, iri gözler, aksolotl solungaçları ---------------- */
function belly(look: CreatureLook): Parts {
  const p = frame()
  const skin = mat(look.body ?? 0x2f8fbf, { glow: 0.16, rough: 0.35 })
  const cream = mat(0xf3ead4, { glow: 0.18, rough: 0.5 })
  const gill = mat(0xff8fb8, { glow: 0.35 })
  const bodyM = part(sph(0.66, 22, 18), skin, 0, 0.88, 0)
  bodyM.scale.set(1.08, 1.02, 0.98)
  const tum = part(sph(0.5, 18, 14), cream, 0, 0.78, 0.26)
  tum.scale.set(1, 1.05, 0.6)
  const navel = part(sph(0.04, 6, 6), mat(0xd8c8a8), 0, 0.72, 0.56)
  p.head.position.set(0, 1.55, 0.02)
  const top = part(sph(0.42, 18, 14), skin)
  top.scale.set(1.25, 0.85, 1)
  p.head.add(top, cuteEye(0.17, 0x0a1e30, -0.22, 0.06, 0.3), cuteEye(0.17, 0x0a1e30, 0.22, 0.06, 0.3), smile(0.1, -0.18, 0.36), blush(-0.36, -0.1, 0.28, 0.09), blush(0.36, -0.1, 0.28, 0.09))
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const frond = part(cap(0.045, 0.26), gill, side * (0.48 + i * 0.03), 0.18 - i * 0.16, -0.05)
      frond.rotation.z = side * (-0.9 - i * 0.25)
      p.head.add(frond)
      p.wiggle.push(frond)
    }
  }
  p.armL.position.set(-0.66, 1.05, 0)
  p.armR.position.set(0.66, 1.05, 0)
  for (const arm of [p.armL, p.armR]) {
    const fl = part(sph(0.2, 10, 8), skin, 0, -0.18, 0)
    fl.scale.set(0.45, 1.2, 0.8)
    arm.add(fl)
  }
  p.legL.position.set(-0.28, 0.32, 0)
  p.legR.position.set(0.28, 0.32, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(cap(0.12, 0.08), skin, 0, -0.08, 0))
    const flip = part(sph(0.17, 10, 8), cream, 0, -0.25, 0.1)
    flip.scale.set(1, 0.35, 1.5)
    leg.add(flip)
  }
  p.hips.add(bodyM, tum, navel)
  return p
}

/* ---------------- Kepler-186: Filiz — fasulye gövde, başında filiz, pembe yanaklar ---------------- */
function sprout(look: CreatureLook): Parts {
  const p = frame()
  const green = mat(look.body ?? 0x4e8f38, { glow: 0.14, rough: 0.5 })
  const leaf = mat(0x8fd86a, { glow: 0.25, rough: 0.4 })
  const root = mat(0x7a5a32, { rough: 0.8 })
  const bodyM = part(cap(0.4, 0.4), green, 0, 0.92, 0)
  bodyM.scale.set(1, 1, 0.9)
  const tummy = part(sph(0.28, 14, 10), mat(look.skin ?? 0xcfe8a8, { glow: 0.2 }), 0, 0.82, 0.24)
  tummy.scale.set(1, 1.15, 0.5)
  p.head.position.set(0, 1.38, 0)
  const face = part(sph(0.36, 18, 14), green)
  p.head.add(face, cuteEye(0.12, 0x10200a, -0.14, 0.05, 0.28), cuteEye(0.12, 0x10200a, 0.14, 0.05, 0.28), blush(-0.24, -0.08, 0.28, 0.09), blush(0.24, -0.08, 0.28, 0.09), smile(0.06, -0.14, 0.33))
  const stem = part(cyl(0.03, 0.04, 0.4, 6), leaf, 0, 0.5, 0)
  p.wiggle.push(stem)
  for (const side of [-1, 1]) {
    const lf = part(sph(0.2, 10, 8), leaf, side * 0.17, 0.18, 0)
    lf.scale.set(1.2, 0.18, 0.6)
    lf.rotation.z = side * 0.5
    stem.add(lf)
  }
  const bud = part(sph(0.09, 10, 8), shine(0xffd0e8, 1.3), 0, 0.24, 0)
  stem.add(bud)
  p.head.add(stem)
  p.armL.position.set(-0.4, 1.08, 0)
  p.armR.position.set(0.4, 1.08, 0)
  for (const arm of [p.armL, p.armR]) {
    const a = part(sph(0.18, 10, 8), leaf, 0, -0.22, 0)
    a.scale.set(0.5, 1.3, 0.25)
    arm.add(a)
  }
  p.legL.position.set(-0.15, 0.5, 0)
  p.legR.position.set(0.15, 0.5, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(cap(0.1, 0.22), root, 0, -0.22, 0))
    const toe = part(sph(0.12, 8, 6), root, 0, -0.44, 0.05)
    toe.scale.set(1.1, 0.5, 1.3)
    leg.add(toe)
  }
  p.hips.add(bodyM, tummy)
  return p
}

/* ---------------- Gliese: Kızıl — lav çatlaklı kaya dev, boynuzlu, ürkütücü ---------------- */
function golem(look: CreatureLook): Parts {
  const p = frame()
  const rock = mat(0x5a3a2c, { rough: 0.95, glow: 0.04 })
  const crust = mat(look.body ?? 0xc45a22, { rough: 0.9, glow: 0.08 })
  const lava = shine(0xff6a1a, 1.8)
  const torso = part(ico(0.62, 0), rock, 0, 1.05, 0)
  torso.scale.set(1.15, 1, 0.9)
  const plate = part(ico(0.36, 0), crust, 0, 1.15, 0.36)
  plate.scale.set(1.2, 0.9, 0.5)
  const cracks: Mesh[] = []
  for (const [x, y, rz] of [[-0.2, 0.95, 0.6], [0.18, 1.25, -0.5], [0.05, 0.75, 0.1]]) {
    const c = part(box(0.05, 0.34, 0.04), lava, x, y, 0.5)
    c.rotation.z = rz
    cracks.push(c)
  }
  const core = part(sph(0.12, 10, 8), lava, 0, 1.02, 0.52)
  p.head.position.set(0, 1.82, 0.08)
  const skull = part(ico(0.34, 0), rock)
  skull.scale.set(1.15, 0.85, 1)
  const brow = part(box(0.5, 0.1, 0.16), crust, 0, 0.08, 0.24)
  const eyeL = part(box(0.11, 0.05, 0.04), lava, -0.12, -0.02, 0.32)
  const eyeR = part(box(0.11, 0.05, 0.04), lava, 0.12, -0.02, 0.32)
  eyeL.rotation.z = -0.25
  eyeR.rotation.z = 0.25
  const mouth = part(box(0.24, 0.04, 0.04), lava, 0, -0.18, 0.3)
  p.head.add(skull, brow, eyeL, eyeR, mouth)
  for (const side of [-1, 1]) {
    const horn = part(cone(0.08, 0.45, 6), mat(0x2a1a12, { rough: 0.6 }), side * 0.32, 0.25, 0)
    horn.rotation.z = side * -0.7
    p.head.add(horn)
  }
  p.armL.position.set(-0.72, 1.35, 0)
  p.armR.position.set(0.72, 1.35, 0)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(ico(0.2, 0), rock, 0, -0.25, 0))
    const fist = part(ico(0.3, 0), crust, 0, -0.62, 0.05)
    arm.add(fist, part(box(0.04, 0.2, 0.04), lava, 0, -0.62, 0.3))
  }
  p.legL.position.set(-0.3, 0.55, 0)
  p.legR.position.set(0.3, 0.55, 0)
  for (const leg of [p.legL, p.legR]) {
    leg.add(part(ico(0.22, 0), rock, 0, -0.22, 0))
    const foot = part(box(0.36, 0.18, 0.42), crust, 0, -0.46, 0.05)
    leg.add(foot)
  }
  p.hips.add(torso, plate, core, ...cracks)
  return p
}

/* ---------------- Kepler-452: Altın — zarif, süzülen, başında hale ---------------- */
function regal(look: CreatureLook): Parts {
  const p = frame()
  const gold = mat(look.body ?? 0xe0b15a, { metal: 0.65, rough: 0.28, glow: 0.18 })
  const ivory = mat(look.skin ?? 0xfff0c0, { glow: 0.25, rough: 0.35 })
  const robe = part(cone(0.42, 1.2, 12), gold, 0, 0.62, 0)
  const sash = part(tor(0.27, 0.04), ivory, 0, 1.0, 0)
  sash.rotation.x = Math.PI / 2
  const chest = part(sph(0.26, 14, 10), gold, 0, 1.24, 0)
  chest.scale.set(1.1, 0.9, 0.9)
  const gem = part(oct(0.08), shine(0x8fe8ff, 2), 0, 1.25, 0.24)
  const capeM = new MeshStandardMaterial({ color: 0xb8323a, roughness: 0.6, side: DoubleSide, emissive: 0x6a1018, emissiveIntensity: 0.25 })
  const cape = new Mesh(cached('cape', () => new CylinderGeometry(0.3, 0.55, 1.25, 12, 1, true, Math.PI * 0.65, Math.PI * 0.7)), capeM)
  cape.position.set(0, 0.8, -0.02)
  p.wiggle.push(cape)
  p.head.position.set(0, 1.72, 0)
  const face = part(sph(0.27, 16, 12), ivory)
  face.scale.set(0.95, 1.1, 0.95)
  const eyeM = shine(0xffc23a, 2)
  const eL = part(sph(0.05, 8, 6), eyeM, -0.1, 0.03, 0.23)
  const eR = part(sph(0.05, 8, 6), eyeM, 0.1, 0.03, 0.23)
  eL.scale.set(1.6, 0.7, 0.6)
  eR.scale.set(1.6, 0.7, 0.6)
  const crest = part(cone(0.1, 0.5, 4), gold, 0, 0.36, -0.05)
  const halo = part(tor(0.3, 0.03), shine(0xffe7a0, 1.8), 0, 0.52, -0.04)
  halo.rotation.x = Math.PI / 2 - 0.15
  p.wiggle.push(halo)
  p.head.add(face, eL, eR, crest, halo)
  for (const side of [-1, 1]) {
    const fin = part(cone(0.05, 0.32, 4), gold, side * 0.25, 0.12, -0.02)
    fin.rotation.z = side * -1.1
    p.head.add(fin)
  }
  p.armL.position.set(-0.34, 1.36, 0)
  p.armR.position.set(0.34, 1.36, 0)
  for (const arm of [p.armL, p.armR]) {
    arm.add(part(cyl(0.05, 0.04, 0.58, 6), gold, 0, -0.29, 0))
    arm.add(part(sph(0.07, 8, 6), ivory, 0, -0.6, 0))
  }
  p.armR.add(part(sph(0.1, 10, 8), shine(0x9ff0ff, 1.8), 0, -0.72, 0.06))
  p.legL.position.set(-0.12, 0.2, 0)
  p.legR.position.set(0.12, 0.2, 0)
  for (const leg of [p.legL, p.legR]) leg.add(part(cone(0.07, 0.24, 5), gold, 0, -0.14, 0))
  p.hips.add(robe, sash, chest, gem, cape)
  return p
}

/* ---------------- Buz: Kartopu yeti — tüylü, mavi suratlı, minik boynuzlu ---------------- */
function yeti(look: CreatureLook): Parts {
  const p = frame()
  const fur = mat(look.body ?? 0xeef6ff, { rough: 0.9, glow: 0.15 })
  const face = mat(0x8ab4d0, { glow: 0.2 })
  const puff: Mesh[] = []
  for (const [x, y, z, r] of [[0, 0.85, 0, 0.5], [-0.28, 1.0, 0.1, 0.3], [0.28, 1.0, 0.1, 0.3], [0, 0.6, 0.2, 0.32], [-0.2, 0.62, -0.15, 0.3], [0.2, 0.62, -0.15, 0.3]]) puff.push(part(sph(r, 12, 10), fur, x, y, z))
  p.head.position.set(0, 1.42, 0.04)
  const head = part(sph(0.4, 16, 12), fur)
  const mask = part(sph(0.28, 14, 10), face, 0, -0.02, 0.3)
  mask.scale.set(1.15, 0.9, 0.5)
  p.head.add(head, mask, cuteEye(0.1, 0x0a1e30, -0.11, 0.03, 0.34), cuteEye(0.1, 0x0a1e30, 0.11, 0.03, 0.34), smile(0.05, -0.12, 0.37))
  for (const side of [-1, 1]) {
    const horn = part(cone(0.06, 0.22, 6), mat(0xd8e6f0), side * 0.24, 0.34, 0)
    horn.rotation.z = side * -0.4
    p.head.add(horn)
  }
  p.armL.position.set(-0.5, 1.05, 0)
  p.armR.position.set(0.5, 1.05, 0)
  for (const arm of [p.armL, p.armR]) arm.add(part(sph(0.17, 10, 8), fur, 0, -0.22, 0))
  p.legL.position.set(-0.2, 0.4, 0)
  p.legR.position.set(0.2, 0.4, 0)
  for (const leg of [p.legL, p.legR]) leg.add(part(sph(0.17, 10, 8), fur, 0, -0.24, 0.04))
  p.hips.add(...puff)
  return p
}

/* ---------------- Yabani yerliler: gezegenin rengini taşır; boyuna göre üç biçim ---------------- */
function wild(look: CreatureLook): Parts {
  const p = frame()
  const body = look.body ?? 0x8fd0c6
  const skin = mat(body, { glow: 0.16, rough: 0.5 })
  const pale = mat(look.skin ?? 0xffffff, { glow: 0.2 })
  const dark = mat(look.leg ?? 0x333333, { rough: 0.7 })
  if (look.variant === 'large') {
    // Kabuklu böcek: ürkütücü, kıskaçlı.
    const shell = part(sph(0.62, 16, 12), dark, 0, 0.95, -0.08)
    shell.scale.set(1.1, 0.8, 1.2)
    const belly2 = part(sph(0.5, 14, 10), skin, 0, 0.85, 0.12)
    belly2.scale.set(1, 0.8, 1)
    p.head.position.set(0, 1.05, 0.62)
    const h = part(sph(0.3, 12, 10), skin)
    h.scale.set(1.2, 0.8, 1)
    p.head.add(h)
    for (const side of [-1, 1]) {
      const eye = part(sph(0.07, 8, 6), shine(0xfff06a, 2), side * 0.14, 0.1, 0.22)
      const mand = part(cone(0.05, 0.32, 5), pale, side * 0.12, -0.1, 0.3)
      mand.rotation.set(Math.PI / 2, 0, side * 0.6)
      p.head.add(eye, mand)
    }
    p.armL.position.set(-0.6, 1.0, 0.3)
    p.armR.position.set(0.6, 1.0, 0.3)
    for (const arm of [p.armL, p.armR]) {
      arm.add(part(cyl(0.06, 0.05, 0.5, 6), dark, 0, -0.25, 0))
      const claw = part(cone(0.14, 0.32, 5), pale, 0, -0.58, 0.06)
      claw.rotation.x = Math.PI
      arm.add(claw)
    }
    p.legL.position.set(-0.36, 0.55, 0)
    p.legR.position.set(0.36, 0.55, 0)
    for (const leg of [p.legL, p.legR]) leg.add(part(cyl(0.07, 0.05, 0.55, 6), dark, 0, -0.27, 0))
    p.hips.add(shell, belly2)
    return p
  }
  if (look.variant === 'small') {
    // Tek gözlü sekici yumak: tatlı.
    const ball = part(sph(0.5, 18, 14), skin, 0, 0.6, 0)
    p.head.position.set(0, 0.78, 0)
    p.head.add(cuteEye(0.22, 0x101010, 0, 0.02, 0.36), smile(0.07, -0.22, 0.44), blush(-0.3, -0.14, 0.38), blush(0.3, -0.14, 0.38))
    for (const side of [-1, 1]) {
      const ear = part(cap(0.08, 0.3), skin, side * 0.25, 0.45, -0.05)
      ear.rotation.z = side * -0.35
      p.head.add(ear)
      p.wiggle.push(ear)
    }
    p.armL.position.set(-0.42, 0.62, 0)
    p.armR.position.set(0.42, 0.62, 0)
    for (const arm of [p.armL, p.armR]) arm.add(part(sph(0.1, 8, 6), pale, 0, -0.12, 0))
    p.legL.position.set(-0.18, 0.2, 0)
    p.legR.position.set(0.18, 0.2, 0)
    for (const leg of [p.legL, p.legR]) {
      const f = part(sph(0.14, 8, 6), pale, 0, -0.12, 0.06)
      f.scale.set(1, 0.5, 1.4)
      leg.add(f)
    }
    p.hips.add(ball)
    return p
  }
  // Orta: göz saplı sümüklü.
  const bodyM = part(cap(0.36, 0.5), skin, 0, 0.75, 0)
  bodyM.rotation.x = 0.35
  const spots = [[-0.18, 0.95, -0.2], [0.2, 0.7, -0.25], [0.05, 1.1, -0.1]].map(([x, y, z]) => part(sph(0.07, 8, 6), pale, x, y, z))
  p.head.position.set(0, 1.2, 0.22)
  p.head.add(smile(0.08, -0.12, 0.3))
  for (const side of [-1, 1]) {
    const stalk = part(cyl(0.03, 0.04, 0.5, 6), skin, side * 0.14, 0.25, 0)
    stalk.rotation.z = side * -0.3
    stalk.add(cuteEye(0.11, 0x101010, 0, 0.3, 0.02))
    p.head.add(stalk)
    p.wiggle.push(stalk)
  }
  p.armL.position.set(-0.36, 0.9, 0.1)
  p.armR.position.set(0.36, 0.9, 0.1)
  for (const arm of [p.armL, p.armR]) arm.add(part(cap(0.06, 0.25), skin, 0, -0.2, 0))
  p.legL.position.set(-0.17, 0.35, 0)
  p.legR.position.set(0.17, 0.35, 0)
  for (const leg of [p.legL, p.legR]) leg.add(part(cap(0.1, 0.1), dark, 0, -0.18, 0.04))
  p.hips.add(bodyM, ...spots)
  return p
}


/* ---------- Uzuvları gövdeye bağlama ----------
   Modeller aynen kalır; yalnız aradaki boşluklar kapanır: omuz/kalça eklem topu, eklemden gövde yüzeyine
   kısa bir bağlantı (kol kökü / uyluk) ve kafa havada duruyorsa boyun. Yüzey, eklemden gövde merkezine
   atılan bir ışınla bulunur; böylece koni ya da küre gövdelerde de tam yüzeye oturur. */
const ray = new Raycaster()
const tmpA = new Vector3()
const tmpB = new Vector3()

function firstMesh(g: Object3D): Mesh | null {
  for (const c of g.children) {
    if (c instanceof Mesh) return c
  }
  for (const c of g.children) {
    const m = firstMesh(c)
    if (m) return m
  }
  return null
}

function bodyMeshes(p: Parts) {
  const skip = new Set<Object3D>([p.head, p.armL, p.armR, p.legL, p.legR])
  return p.hips.children.filter((c): c is Mesh => c instanceof Mesh && !skip.has(c) && !(c.material instanceof MeshBasicMaterial))
}

/** Eklemden gövde merkezine ışın: ilk vurduğu gövde yüzeyi (hips uzayında). */
function surfaceHit(p: Parts, from: Vector3, toward: Vector3) {
  const meshes = bodyMeshes(p)
  if (!meshes.length) return null
  p.hips.updateMatrixWorld(true)
  tmpA.subVectors(toward, from)
  const len = tmpA.length()
  if (len < 1e-4) return null
  ray.set(from, tmpA.normalize())
  ray.far = len + 0.5
  const hits = ray.intersectObjects(meshes, false)
  return hits.length ? hits[0] : null
}

function limbRadius(limb: Group) {
  const m = firstMesh(limb)
  if (!m) return 0.06
  m.geometry.computeBoundingBox()
  const bb = m.geometry.boundingBox as Box3
  const sx = (bb.max.x - bb.min.x) * Math.abs(m.scale.x)
  const sz = (bb.max.z - bb.min.z) * Math.abs(m.scale.z)
  return Math.min(0.15, Math.max(0.03, Math.min(sx, sz) * 0.42))
}

function bridge(from: Vector3, to: Vector3, r: number, material: Material) {
  const len = Math.round(from.distanceTo(to) * 100) / 100
  const rr = Math.round(r * 100) / 100
  // Paylaşılan geometri: kalabalık nüfusta her birim yeni geometri üretmesin.
  const geo = cached(`br${rr}:${len}`, () => new CylinderGeometry(rr * 0.92, rr, len, 10))
  const m = new Mesh(geo, material)
  m.position.copy(from).add(to).multiplyScalar(0.5)
  tmpB.subVectors(to, from).normalize()
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tmpB)
  m.castShadow = false
  return m
}

function connectParts(p: Parts) {
  const meshes = bodyMeshes(p)
  if (!meshes.length) return
  const box = new Box3()
  p.hips.updateMatrixWorld(true)
  for (const m of meshes) box.expandByObject(m)
  const center = box.getCenter(new Vector3())
  for (const limb of [p.armL, p.armR, p.legL, p.legR]) {
    const m = firstMesh(limb)
    if (!m) continue
    const r = limbRadius(limb)
    const material = m.material as Material
    // Eklem topu: uzuv dönse de omuz/kalça hep dolu görünür.
    const ball = new Mesh(sph(Math.round(r * 112) / 100, 12, 10), material)
    limb.add(ball)
    const pivot = limb.position.clone()
    const isLeg = limb === p.legL || limb === p.legR
    // Bacakta gövde merkezine yukarı-içeri, kolda yatay-içeri bak.
    const aim = isLeg ? new Vector3(pivot.x * 0.4, center.y, pivot.z) : new Vector3(0, pivot.y, pivot.z)
    const inside = box.containsPoint(pivot) && surfaceHit(p, pivot, aim) === null
    if (inside) continue
    const hit = surfaceHit(p, pivot, aim)
    if (!hit) {
      // Işın kaçtıysa kutunun en yakın noktasına bağla.
      const q = box.clampPoint(pivot, new Vector3())
      if (q.distanceTo(pivot) > r * 0.6) p.hips.add(bridge(pivot, q.lerp(center, 0.08), r * 0.9, material))
      continue
    }
    if (hit.distance > r * 0.6) {
      const q = hit.point.clone().lerp(center, 0.06)
      p.hips.add(bridge(pivot, q, r * 0.9, material))
    }
  }
  // Boyun: kafa gövdenin üstünde havada duruyorsa.
  const headMesh = firstMesh(p.head)
  if (headMesh) {
    headMesh.geometry.computeBoundingSphere()
    const hr = (headMesh.geometry.boundingSphere?.radius ?? 0.25) * Math.min(Math.abs(headMesh.scale.y), Math.abs(headMesh.scale.x))
    const hp = p.head.position.clone()
    const hit = surfaceHit(p, hp, new Vector3(center.x, Math.min(center.y, box.max.y - 0.05), center.z))
    const gap = hit ? hit.distance - hr : 0
    if (hit && gap > 0.02) {
      const from = hp.clone().addScaledVector(tmpA.subVectors(hit.point, hp).normalize(), hr * 0.7)
      p.hips.add(bridge(from, hit.point.clone().lerp(center, 0.05), Math.max(0.05, hr * 0.32), headMesh.material as Material))
    }
  }
}

const BUILDERS: Record<CreatureForm, (look: CreatureLook) => Parts> = {
  astronaut,
  colonist,
  shade,
  bighead,
  crystal,
  belly,
  sprout,
  golem,
  regal,
  yeti,
  wild,
}

/** Tür görünümünden yürüyen bir gövde kurar. Ayaklar kökün `FEET` kadar altındadır. */
export function buildCreature(look: CreatureLook): Rig {
  const p = BUILDERS[look.form](look)
  connectParts(p)
  const root = new Group()
  const lift = new Group() // stepRig'in zıplama/süzülme için oynattığı ara katman
  lift.position.y = FEET
  p.hips.add(p.head, p.armL, p.armR, p.legL, p.legR)
  lift.add(p.hips)
  root.add(lift)
  root.userData.form = look.form
  return { root, armL: p.armL, armR: p.armR, legL: p.legL, legR: p.legR, head: p.head, style: look.style, hips: lift, wiggle: p.wiggle }
}

/* ---------------- Yancılar: her ırkın küçük, sade sürümü ----------------
   Ana karakterle aynı renkler ve o ırkı tanıtan tek bir imza parça; 10–14 parça (ana karakterler 25–40).
   Kalabalık nüfus telefonu daha az yorar, büyük = güçlü göz kararıyla okunur. */
function minionParts(look: CreatureLook): Parts {
  const p = frame()
  const bodyHex = look.body ?? 0x8fd0c6
  const skinHex = look.skin ?? bodyHex
  const body = mat(bodyHex, { glow: 0.16, rough: 0.5 })
  const skin = mat(skinHex, { glow: 0.18, rough: 0.45 })
  const dark = mat(look.leg ?? 0x3a3a44, { rough: 0.7 })
  const form = look.form
  // Gövde biçimi
  let torso: Mesh
  if (form === 'crystal') {
    torso = part(oct(0.3), mat(bodyHex, { glow: 0.55, rough: 0.1, opacity: 0.8 }), 0, 0.6, 0)
    torso.scale.set(1, 1.3, 0.9)
  } else if (form === 'golem') {
    torso = part(ico(0.34, 0), mat(0x5a3a2c, { rough: 0.95 }), 0, 0.62, 0)
  } else if (form === 'belly') {
    torso = part(sph(0.4, 14, 12), body, 0, 0.55, 0)
  } else if (form === 'shade') {
    torso = part(cone(0.24, 0.8, 7), body, 0, 0.8, 0)
    torso.rotation.x = Math.PI
  } else if (form === 'regal') {
    torso = part(cone(0.26, 0.75, 10), mat(bodyHex, { metal: 0.6, rough: 0.3, glow: 0.18 }), 0, 0.42, 0)
  } else {
    torso = part(sph(0.3, 12, 10), body, 0, 0.6, 0)
    torso.scale.set(1, 1.1, 0.9)
  }
  // Kafa
  const big = form === 'bighead'
  const headR = big ? 0.36 : form === 'belly' ? 0.26 : 0.24
  p.head.position.set(0, form === 'belly' ? 1.02 : form === 'shade' ? 1.3 : big ? 1.18 : 1.05, form === 'shade' ? 0.12 : 0)
  const head = part(sph(headR, 14, 12), form === 'golem' ? mat(0x4a2e22, { rough: 0.9 }) : form === 'shade' || form === 'crystal' ? body : skin)
  if (big) head.scale.set(1.15, 0.95, 1)
  p.head.add(head)
  // Gözler: Gölge tek kırmızı göz, golem lav yarıkları, diğerleri tatlı iri gözler
  if (form === 'shade') {
    p.head.add(part(sph(0.08, 10, 8), shine(0xff2a2a, 2.2), 0, 0.02, headR * 0.88))
  } else if (form === 'golem') {
    for (const x of [-0.08, 0.08]) p.head.add(part(box(0.08, 0.03, 0.03), shine(0xff6a1a, 1.8), x, 0, headR * 0.92))
  } else if (form === 'regal') {
    for (const x of [-0.07, 0.07]) p.head.add(part(sph(0.035, 6, 6), shine(0xffc23a, 2), x, 0.02, headR * 0.9))
  } else {
    const e = big ? 0.13 : 0.075
    const iris = form === 'astronaut' || form === 'colonist' ? 0x1c140e : 0x10141e
    p.head.add(cuteEye(e, iris, -headR * 0.42, 0.02, headR * 0.78), cuteEye(e, iris, headR * 0.42, 0.02, headR * 0.78))
  }
  // İmza parça
  switch (form) {
    case 'astronaut': {
      p.head.add(part(sph(headR + 0.08, 14, 12), mat(0x9fd8ff, { rough: 0.05, metal: 0.3, glow: 0.25, opacity: 0.3 })))
      torso.material = mat(0xf2f4f8, { rough: 0.45 })
      break
    }
    case 'colonist': {
      p.head.add(part(box(0.34, 0.08, 0.06), shine(0xffa04a, 1.5), 0, 0.02, headR * 0.92))
      break
    }
    case 'shade': {
      for (const side of [-1, 1]) {
        const horn = part(cone(0.04, 0.3, 5), mat(0xd8cbb8), side * 0.13, 0.24, -0.04)
        horn.rotation.z = side * -0.35
        p.head.add(horn)
      }
      break
    }
    case 'bighead': {
      for (const side of [-1, 1]) {
        const stalk = part(cyl(0.015, 0.015, 0.32, 5), skin, side * 0.17, 0.44, 0)
        stalk.rotation.z = side * -0.35
        stalk.add(part(sph(0.06, 8, 6), shine(0x9cf2ff, 1.8), 0, 0.18, 0))
        p.head.add(stalk)
        p.wiggle.push(stalk)
      }
      break
    }
    case 'crystal': {
      p.head.add(part(cone(0.05, 0.28, 4), mat(bodyHex, { glow: 0.6, opacity: 0.8 }), 0, 0.3, 0))
      break
    }
    case 'belly': {
      for (const side of [-1, 1]) {
        const frond = part(cap(0.03, 0.16), mat(0xff8fb8, { glow: 0.35 }), side * 0.3, 0.06, -0.03)
        frond.rotation.z = side * -1.1
        p.head.add(frond)
        p.wiggle.push(frond)
      }
      break
    }
    case 'sprout': {
      const stem = part(cyl(0.02, 0.025, 0.24, 5), mat(0x8fd86a, { glow: 0.25 }), 0, 0.32, 0)
      const lf = part(sph(0.12, 8, 6), mat(0x8fd86a, { glow: 0.25 }), 0.08, 0.12, 0)
      lf.scale.set(1.2, 0.2, 0.6)
      stem.add(lf)
      p.head.add(stem)
      p.wiggle.push(stem)
      break
    }
    case 'golem': {
      for (const side of [-1, 1]) {
        const horn = part(cone(0.05, 0.24, 5), mat(0x2a1a12), side * 0.2, 0.18, 0)
        horn.rotation.z = side * -0.7
        p.head.add(horn)
      }
      break
    }
    case 'regal': {
      const halo = part(tor(0.2, 0.022), shine(0xffe7a0, 1.8), 0, 0.36, 0)
      halo.rotation.x = Math.PI / 2
      p.head.add(halo)
      break
    }
    case 'yeti': {
      for (const side of [-1, 1]) {
        const horn = part(cone(0.04, 0.14, 5), mat(0xd8e6f0), side * 0.16, 0.22, 0)
        horn.rotation.z = side * -0.4
        p.head.add(horn)
      }
      break
    }
    default: {
      for (const side of [-1, 1]) {
        const ear = part(cap(0.05, 0.16), body, side * 0.17, 0.26, -0.03)
        ear.rotation.z = side * -0.35
        p.head.add(ear)
        p.wiggle.push(ear)
      }
    }
  }
  // Kollar ve bacaklar: kısa, sade
  const limbMat = form === 'astronaut' ? mat(0xf2f4f8) : form === 'golem' ? mat(0x5a3a2c, { rough: 0.95 }) : body
  const w = form === 'belly' ? 0.42 : form === 'golem' ? 0.38 : 0.3
  p.armL.position.set(-w, 0.74, 0)
  p.armR.position.set(w, 0.74, 0)
  for (const arm of [p.armL, p.armR]) arm.add(part(cap(0.06, 0.16), limbMat, 0, -0.14, 0))
  p.legL.position.set(-0.11, form === 'regal' ? 0.12 : 0.3, 0)
  p.legR.position.set(0.11, form === 'regal' ? 0.12 : 0.3, 0)
  for (const leg of [p.legL, p.legR]) leg.add(part(cap(0.07, form === 'regal' ? 0.02 : 0.12), form === 'astronaut' ? mat(0x3d4658) : dark, 0, -0.15, 0.02))
  p.hips.add(torso)
  // Sivri uçlu gövdelerde (Gölge, Işıltı) bacaklar boşta kalmasın: küçük bir leğen.
  if (form === 'shade' || form === 'crystal') {
    const pelvis = part(sph(0.13, 12, 10), form === 'crystal' ? mat(bodyHex, { glow: 0.45, rough: 0.2 }) : body, 0, 0.36, 0)
    pelvis.scale.set(1.45, 0.85, 1.05)
    p.hips.add(pelvis)
  }
  return p
}

/** Yancı gövdesi: ırkın küçük, sade sürümü. Ayaklar ana karakterlerdeki gibi `FEET` hizasında. */
export function buildMinion(look: CreatureLook): Rig {
  const p = minionParts(look)
  connectParts(p)
  const root = new Group()
  const lift = new Group()
  lift.position.y = FEET
  p.hips.add(p.head, p.armL, p.armR, p.legL, p.legR)
  lift.add(p.hips)
  root.add(lift)
  root.userData.form = look.form
  root.userData.minion = true
  const style: RigStyle = look.style === 'float' ? 'float' : look.style === 'stalk' ? 'stalk' : look.style === 'waddle' ? 'waddle' : 'hop'
  return { root, armL: p.armL, armR: p.armR, legL: p.legL, legR: p.legR, head: p.head, style, hips: lift, wiggle: p.wiggle }
}
