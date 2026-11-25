import type { HoleDef, PlanetDef, Village } from './origins'

/* Her evrenin gezegen sistemi, evrenin kimliğinden (id) türeyen sabit bir tohumla üretilir.
   Aynı evren her oyunda aynıdır; farklı evrenler birbirine benzemez. Saf veri üretir,
   Three.js'e bağımlı değildir. */

export function hashSeed(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Biome = 'rocky' | 'desert' | 'ice' | 'ocean' | 'lava' | 'gas' | 'dwarf'

const NAME_POOL = [
  'Kıymık', 'Sis', 'Boncuk', 'Kütük', 'Uç', 'Çakıl', 'Pusula', 'Kor', 'Yeşim', 'Mercan',
  'Zümrüt', 'Kehribar', 'Fener', 'Bulut', 'Dalga', 'Yılkı', 'Sedef', 'Kırağı', 'Alev', 'Gümüş',
  'Tüy', 'Ebru', 'Yankı', 'Çınar', 'Menekşe', 'Sarnıç', 'Lodos', 'Poyraz', 'Meltem', 'Ilgın',
  'Kuzgun', 'Zeybek', 'Hüma', 'Nar', 'Ahenk', 'Kıvam', 'Gölge', 'Işık', 'Sürgün', 'Dolunay',
  'Tuna', 'Pınar', 'Kehkeşan', 'Ardıç', 'Yaylak', 'Sarkıt', 'Hasat', 'Kandil', 'Karaca', 'Düden',
]
const SYL_A = ['Zor', 'Ve', 'Kal', 'Mir', 'Tur', 'Asa', 'Bel', 'Dor', 'Ney', 'Ras', 'Sol', 'Yun']
const SYL_B = ['ka', 'lun', 'tis', 'ren', 'dam', 'ova', 'ris', 'kel', 'nar', 'mut', 'ber', 'zan']

const VILLAGES: Record<Biome, Village[]> = {
  rocky: ['plant', 'purple', 'shadow'],
  desert: ['gold', 'red'],
  ice: ['ice'],
  ocean: ['ocean'],
  lava: ['red', 'shadow'],
  gas: ['purple'],
  dwarf: ['plant'],
}

function hue(hex: number) {
  const r = ((hex >> 16) & 255) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h /= 6
  return h < 0 ? h + 1 : h
}

function hsl(h: number, s: number, l: number) {
  const hh = ((h % 1) + 1) % 1
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + hh * 12) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const to = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255)
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4))
}

function biomeColor(b: Biome, themeHue: number, r: () => number) {
  switch (b) {
    case 'rocky':
      return hsl(themeHue + (r() - 0.5) * 0.14, 0.28 + r() * 0.2, 0.4 + r() * 0.12)
    case 'desert':
      return hsl(0.07 + r() * 0.05, 0.4 + r() * 0.2, 0.5 + r() * 0.1)
    case 'ice':
      return hsl(0.54 + r() * 0.06, 0.2 + r() * 0.15, 0.78 + r() * 0.08)
    case 'ocean':
      return hsl(0.55 + r() * 0.07, 0.5 + r() * 0.2, 0.36 + r() * 0.08)
    case 'lava':
      return hsl(0.0 + r() * 0.05, 0.6 + r() * 0.2, 0.3 + r() * 0.08)
    case 'gas':
      return hsl(themeHue + r() * 0.35, 0.35 + r() * 0.25, 0.55 + r() * 0.12)
    default:
      return hsl(themeHue + (r() - 0.5) * 0.1, 0.1 + r() * 0.1, 0.55 + r() * 0.12)
  }
}

export type SystemSpec = {
  id: string
  theme: number
  holes: HoleDef[]
  /** Ev gezegeni varsa (yıldızlı ev sistemleri). Yoksa sistem bir kara deliğin avlusudur. */
  home?: { name: string; color: number; village: Village }
}

/** Gezegen gövdeleri bu katsayıyla büyütülür (görsel ve çarpışma yarıçapı). */
export const PLANET_SIZE = 2.5
/** Elle yazılmış kara delik / solucan deliği konumları bu katsayıyla dışa açılır. */
export const SYSTEM_SPREAD = 3.4
/** İki yörünge halkasının yüzeyleri arasında kalacak en az boşluk (dünya birimi). */
export const ORBIT_GAP = 200
/** Solucan deliğinin çevresinde gezegensiz kalacak pay: varış noktası bir gövdenin içine düşmesin. */
export const WORM_CLEAR = 260

function ringGap(flatA: number, yA: number, flatB: number, yB: number) {
  return Math.hypot(flatA - flatB, yA - yB)
}

/** Halkalı gezegenin halkası da çarpışma payına girer. */
export function bodyReach(radius: number, rings?: boolean) {
  return rings ? radius * 1.7 : radius
}

function holeClear(hole: HoleDef, radius: number) {
  return radius + (hole.kind === 'hole' ? hole.rs * 4 + 140 : WORM_CLEAR)
}

export function generateSystem(spec: SystemSpec): PlanetDef[] {
  const rnd = makeRng(hashSeed(`sessiz:${spec.id}`))
  const themeHue = hue(spec.theme)
  const out: PlanetDef[] = []
  const rings: { flat: number; y: number; r: number }[] = []
  const place = (flat: number, y: number, r: number) => rings.push({ flat, y, r })
  const clearOfHoles = (flat: number, y: number, radius: number) =>
    spec.holes.every((hole) => ringGap(flat, y, Math.hypot(hole.x, hole.z), hole.y) >= holeClear(hole, radius))
  let ring = 160 // halkaların dış sınırı; kara delik avlusunda merkez delikten pay

  if (spec.home) {
    const sr = (20 + rnd() * 16) * PLANET_SIZE
    out.push({
      id: `${spec.id}-yildiz`,
      name: 'Yıldız',
      kind: 'mid',
      x: 0,
      y: 0,
      z: 0,
      radius: sr,
      color: spec.theme,
      gravity: 6,
      jump: 8,
      glide: 1,
      move: 1,
      landable: false,
    })
    place(0, 0, sr + 60)
    const hr = (100 + rnd() * 40) * PLANET_SIZE
    let dist = sr + 60 + ORBIT_GAP + hr + rnd() * 260
    let ang = rnd() * Math.PI * 2
    const hy = (rnd() - 0.5) * 240
    let hx = 0
    let hz = 0
    for (let attempt = 0; attempt < 40; attempt++) {
      hx = Math.cos(ang) * dist
      hz = Math.sin(ang) * dist * 0.8
      if (clearOfHoles(Math.hypot(hx, hz), hy, hr)) break
      ang += 0.9
      dist += 80
    }
    out.push({
      id: `${spec.id}-ev`,
      name: spec.home.name,
      kind: 'large',
      x: hx,
      y: hy,
      z: hz,
      radius: hr,
      color: spec.home.color,
      gravity: 10 + rnd() * 2.4,
      jump: 9.5,
      glide: 0.78,
      move: 1.02,
      landable: true,
      home: true,
      village: spec.home.village,
      biome: 'home',
    })
    const homeFlat = Math.hypot(hx, hz)
    place(homeFlat, hy, hr)
    ring = sr + 60
  }

  // İsim havuzu: tohuma göre karıştırılır, sonra üretilmiş heceli adlar eklenir.
  const names = NAME_POOL.slice()
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  for (let i = 0; i < 6; i++) names.push(`${SYL_A[Math.floor(rnd() * SYL_A.length)]}${SYL_B[Math.floor(rnd() * SYL_B.length)]}`)

  // Sistemin kişiliği: kaç dünya, hangi türler sık.
  const count = 4 + Math.floor(rnd() * 5)
  const flavor = Math.floor(rnd() * 4) // 0 dengeli · 1 devler · 2 küçük kalabalık · 3 buzul/okyanus
  const pickBiome = (): Biome => {
    const roll = rnd()
    if (flavor === 1) return roll < 0.45 ? 'gas' : roll < 0.7 ? 'rocky' : roll < 0.85 ? 'desert' : 'lava'
    if (flavor === 2) return roll < 0.4 ? 'dwarf' : roll < 0.65 ? 'rocky' : roll < 0.85 ? 'desert' : 'ice'
    if (flavor === 3) return roll < 0.35 ? 'ice' : roll < 0.65 ? 'ocean' : roll < 0.8 ? 'gas' : 'rocky'
    return (['rocky', 'desert', 'ice', 'ocean', 'lava', 'gas', 'dwarf'] as Biome[])[Math.floor(rnd() * 7)]
  }

  for (let i = 0; i < count; i++) {
    // İlk dünya hep küçük, ikincisi hep bir dev. Yıldız dışında her gövdeye inilebilir.
    const biome: Biome = i === 0 ? 'dwarf' : i === 1 ? 'gas' : pickBiome()
    let base: number // oynanış değerleri (yerçekimi, adım) eski boyuta göre hesaplanır
    let kind: PlanetDef['kind']
    let hasRings = false
    if (biome === 'dwarf') {
      base = 9 + rnd() * 8
      kind = 'small'
    } else if (biome === 'gas') {
      base = 40 + rnd() * 24
      kind = 'large'
      rnd()
      hasRings = rnd() < 0.6
    } else {
      base = 16 + rnd() * 20
      kind = 'mid'
      if (i !== 1) rnd()
    }
    const radius = base * PLANET_SIZE
    const reach = bodyReach(radius, hasRings)

    let x = 0
    let y = 0
    let z = 0
    let flat = 0
    let ok = false
    let dist = ring + ORBIT_GAP + reach + rnd() * 180
    for (let attempt = 0; attempt < 60 && !ok; attempt++) {
      const ang = rnd() * Math.PI * 2
      y = (rnd() - 0.5) * Math.min(dist * 0.55, 900)
      x = Math.cos(ang) * dist
      z = Math.sin(ang) * dist * 0.8
      flat = Math.hypot(x, z)
      ok = clearOfHoles(flat, y, reach)
      for (const other of rings) {
        if (ringGap(flat, y, other.flat, other.y) < reach + other.r + ORBIT_GAP) ok = false
      }
      if (!ok) dist += 70
    }
    ring = Math.max(ring, flat + reach)
    place(flat, y, reach)

    const gravity =
      kind === 'small' ? 6 + rnd() * 2 : kind === 'large' ? 26 + rnd() * 10 : 10 + (base - 16) * 0.35 + rnd() * 3
    const jump = kind === 'small' ? 12 + rnd() * 2 : kind === 'large' ? 5 + rnd() * 1.2 : 8 + rnd() * 1.6
    const glide = kind === 'small' ? 0.45 : kind === 'large' ? 1 : 0.78 + rnd() * 0.14
    const move = kind === 'small' ? 1.35 + rnd() * 0.2 : kind === 'large' ? 0.36 + rnd() * 0.12 : 0.8 + rnd() * 0.3
    let village: Village | undefined
    if (kind !== 'small' && rnd() < 0.38) {
      const pool = VILLAGES[biome]
      village = pool[Math.floor(rnd() * pool.length)]
    }
    out.push({
      id: `${spec.id}-w${i}`,
      name: names[i % names.length],
      kind,
      x,
      y,
      z,
      radius,
      color: biomeColor(biome, themeHue, rnd),
      gravity,
      jump,
      glide,
      move,
      landable: true,
      rings: hasRings || undefined,
      village,
      biome,
    })
  }
  return out
}
