import { ORBIT_GAP, PLANET_SIZE, SYSTEM_SPREAD, bodyReach, generateSystem } from './worldgen'

export type OriginId =
  | 'earth'
  | 'mars'
  | 'proxima'
  | 'alpha'
  | 'trappist'
  | 'k218'
  | 'kepler186'
  | 'gliese'
  | 'kepler452'

export type AbilityId = 'cloak' | 'mend' | 'stun' | 'well'

export type Origin = {
  id: OriginId
  planet: string
  distance: string
  fact: string
  pilot: string
  species: 'human' | 'alien'
  ship: string
  legend: boolean
  speed: number
  armor: number
  weaponBar: number
  stealthBar: number
  hull: number
  shield: number
  engine: number
  weapon: number
  stealth: number
  regen: number
  ability?: AbilityId
  ability2?: AbilityId
  abilityText: string
}

export const ABILITY_INFO: Record<AbilityId, { name: string; key: string; blurb: string }> = {
  cloak: { name: 'Karanlık', key: 'G', blurb: 'Kısa süre neredeyse sessizsin.' },
  mend: { name: 'Filiz', key: 'G', blurb: 'Gövde bir anda toparlanır.' },
  stun: { name: 'Sersemlet', key: 'G', blurb: 'Yakındaki avcıları birkaç saniye dondurur.' },
  well: { name: 'Mini kuyu', key: 'H', blurb: 'Geçici bir kara delik açar; çeker ve yakar.' },
}

export const ORIGINS: Origin[] = [
  {
    id: 'earth',
    planet: 'Dünya',
    distance: '0 ışık yılı',
    fact: 'Tek bildiğimiz yaşam burada.',
    pilot: 'Deniz',
    species: 'human',
    ship: 'Denge',
    legend: false,
    speed: 3,
    armor: 3,
    weaponBar: 3,
    stealthBar: 3,
    hull: 100,
    shield: 52,
    engine: 1,
    weapon: 1,
    stealth: 1,
    regen: 7,
    abilityText: 'Özel yetenek yok. Dengeli bir başlangıç.',
  },
  {
    id: 'mars',
    planet: 'Ross 128 b',
    distance: '11 ışık yılı',
    fact: 'Mars\'ın eski uygarlığı, kuruyan yurdunu bırakıp bu sakin kızıl cücenin ılıman dünyasına göç etti.',
    pilot: 'Kerem',
    species: 'alien',
    ship: 'Tozkes',
    legend: false,
    speed: 2,
    armor: 5,
    weaponBar: 3,
    stealthBar: 2,
    hull: 140,
    shield: 48,
    engine: 0.86,
    weapon: 1.05,
    stealth: 1.12,
    regen: 6,
    abilityText: 'Kalın gövde. Yavaş, ama çok yer.',
  },
  {
    id: 'proxima',
    planet: 'Proxima Centauri b',
    distance: '4,24 ışık yılı',
    fact: 'En yakın yıldızın kilitli, loş dünyası.',
    pilot: 'Sarn',
    species: 'alien',
    ship: 'Gölge',
    legend: false,
    speed: 3,
    armor: 2,
    weaponBar: 2,
    stealthBar: 5,
    hull: 86,
    shield: 40,
    engine: 1,
    weapon: 0.9,
    stealth: 0.62,
    regen: 6,
    ability: 'cloak',
    abilityText: 'Karanlık: kısa süre neredeyse hiç gürültü yok.',
  },
  {
    id: 'alpha',
    planet: 'Alpha Centauri B',
    distance: '4,37 ışık yılı',
    fact: 'En yakın sistemin turuncu cücesi.',
    pilot: 'Pıpp',
    species: 'alien',
    ship: 'Topaç',
    legend: false,
    speed: 3,
    armor: 2,
    weaponBar: 2,
    stealthBar: 3,
    hull: 88,
    shield: 44,
    engine: 1.05,
    weapon: 0.86,
    stealth: 0.95,
    regen: 7,
    abilityText: 'Yuvarlak gemi, koca kafalı pilot. Biraz sallanır.',
  },
  {
    id: 'trappist',
    planet: 'TRAPPIST-1e',
    distance: '40 ışık yılı',
    fact: 'Yedi dünyalık sistemde, Dünya boyunda.',
    pilot: 'Işıl',
    species: 'alien',
    ship: 'Kıymık',
    legend: false,
    speed: 5,
    armor: 2,
    weaponBar: 3,
    stealthBar: 3,
    hull: 84,
    shield: 42,
    engine: 1.28,
    weapon: 1,
    stealth: 0.92,
    regen: 6,
    abilityText: 'Çevik. Aynı itişle daha uzağa kaçar.',
  },
  {
    id: 'k218',
    planet: 'K2-18b',
    distance: '124 ışık yılı',
    fact: 'Kalın atmosferli, okyanus adayı bir hycean.',
    pilot: 'Neris',
    species: 'alien',
    ship: 'Gelgit',
    legend: false,
    speed: 2,
    armor: 4,
    weaponBar: 2,
    stealthBar: 2,
    hull: 96,
    shield: 88,
    engine: 0.9,
    weapon: 0.92,
    stealth: 1.05,
    regen: 8,
    abilityText: 'Kalkanı geniş. Darbeyi önce su karşılar.',
  },
  {
    id: 'kepler186',
    planet: 'Kepler-186f',
    distance: '580 ışık yılı',
    fact: 'İlk Dünya boyunda yaşanabilir kuşak dünyası.',
    pilot: 'Tomur',
    species: 'alien',
    ship: 'Filiz',
    legend: false,
    speed: 3,
    armor: 3,
    weaponBar: 2,
    stealthBar: 3,
    hull: 104,
    shield: 46,
    engine: 0.98,
    weapon: 0.9,
    stealth: 0.9,
    regen: 13,
    ability: 'mend',
    abilityText: 'Filiz: gövde kendini onarır, bir de ani tomurcuk.',
  },
  {
    id: 'gliese',
    planet: 'Gliese 667 Cc',
    distance: '23,6 ışık yılı',
    fact: 'Üç yıldızın altında ağır bir süper-Dünya.',
    pilot: 'Brom',
    species: 'alien',
    ship: 'Örs',
    legend: false,
    speed: 1,
    armor: 5,
    weaponBar: 5,
    stealthBar: 1,
    hull: 130,
    shield: 50,
    engine: 0.78,
    weapon: 1.38,
    stealth: 1.25,
    regen: 5,
    abilityText: 'Ağır toplar. Her atış daha çok ses ve daha çok hasar.',
  },
  {
    id: 'kepler452',
    planet: 'Kepler-452b',
    distance: '1.800 ışık yılı',
    fact: 'Yıldızı Güneş’ten yaklaşık 1,5 milyar yıl daha yaşlı.',
    pilot: 'Arel',
    species: 'alien',
    ship: 'Vasiyet',
    legend: true,
    speed: 5,
    armor: 3,
    weaponBar: 4,
    stealthBar: 4,
    hull: 108,
    shield: 64,
    engine: 1.42,
    weapon: 1.12,
    stealth: 0.84,
    regen: 8,
    ability: 'stun',
    ability2: 'well',
    abilityText: 'Efsane. Sersemletme dalgası ve mini kara delik.',
  },
]

export function originById(id: OriginId) {
  return ORIGINS.find((o) => o.id === id) ?? ORIGINS[0]
}

export type WeaponId = 'laser' | 'spread' | 'rocket' | 'plasma' | 'chain'

export const WEAPONS: { id: WeaponId; name: string; blurb: string }[] = [
  { id: 'laser', name: 'Lazer', blurb: 'İnce ve hızlı. Az gürültü.' },
  { id: 'spread', name: 'Saçma', blurb: 'Yakın menzilde beş saçma.' },
  { id: 'rocket', name: 'Roket', blurb: 'Yavaş, güdümlü, sert.' },
  { id: 'plasma', name: 'Plazma', blurb: 'Şişko top. Çarptığı yeri yakar.' },
  { id: 'chain', name: 'Şimşek', blurb: 'Bir düşmandan diğerine atlar.' },
]

export function originTier(id: OriginId) {
  if (id === 'earth' || id === 'mars') return 0
  if (id === 'proxima' || id === 'alpha') return 1
  if (id === 'trappist' || id === 'k218') return 2
  if (id === 'kepler186' || id === 'gliese') return 3
  return 4
}

/** Açık uzayda en yüksek seyir hızı: kademe (gelişmişlik) belirler, seçim ekranındaki "Hız" biraz oynatır.
 *  Dünya ~140, Ross 128 b ~134 … Kepler-452b ~313. Motor geliştirmesi ayrıca seviye başına %5 ekler. */
const CRUISE_BY_TIER = [140, 175, 210, 250, 290]
export function cruiseSpeed(id: OriginId) {
  const o = originById(id)
  return Math.round(CRUISE_BY_TIER[originTier(id)] * (0.88 + 0.04 * o.speed))
}

export function starterWeapons(id: OriginId): WeaponId[] {
  return WEAPONS.slice(0, originTier(id) + 1).map((w) => w.id)
}

export function signatureWeapon(id: OriginId): WeaponId {
  const kit = starterWeapons(id)
  return kit[kit.length - 1]
}

export function homeSystem(id: OriginId): UniId {
  if (id === 'earth') return 'gunes'
  if (id === 'mars') return 'marskol'
  return id
}

export type PlanetKind = 'small' | 'large' | 'mid'
export type Village = 'human' | 'purple' | 'plant' | 'ocean' | 'red' | 'gold' | 'shadow' | 'ice' | 'mars'

export type PlanetDef = {
  id: string
  name: string
  kind: PlanetKind
  x: number
  y: number
  z: number
  radius: number
  gravity: number
  jump: number
  glide: number
  move: number
  color: number
  landable?: boolean
  home?: boolean
  rings?: boolean
  heat?: boolean
  village?: Village
  biome?: string
  /** İnince gösterilen kısa hikâye satırı. */
  lore?: string
}

export type UniId =
  | 'avlu'
  | 'kizil'
  | 'soluk'
  | 'marskol'
  | 'proxima'
  | 'alpha'
  | 'trappist'
  | 'k218'
  | 'kepler186'
  | 'gliese'
  | 'kepler452'
  | 'gunes'

export type HoleDef = {
  kind: 'hole' | 'worm'
  x: number
  y: number
  z: number
  rs: number
  gm: number
  curve: number
  to?: UniId
}

export type UniverseDef = {
  id: UniId
  name: string
  line: string
  gravMul: number
  timeMul: number
  enemyMul: number
  tint: [number, number, number]
  hot: [number, number, number]
  mid: [number, number, number]
  edge: [number, number, number]
  fog: [number, number, number]
  fogDensity: number
  holes: HoleDef[]
  planets: PlanetDef[]
}

function orb(
  id: string,
  name: string,
  x: number,
  y: number,
  z: number,
  radius: number,
  color: number,
  opt: Partial<PlanetDef> = {},
): PlanetDef {
  return {
    id,
    name,
    kind: 'mid',
    x,
    y,
    z,
    radius,
    color,
    gravity: 12,
    jump: 9,
    glide: 0.82,
    move: 0.95,
    landable: false,
    ...opt,
  }
}

type PlanetSource = PlanetDef[] | ((holes: HoleDef[]) => PlanetDef[])

/* Ev sistemleri ve ara bölgeler elle değil, evren kimliğinden üretilir (bkz. worldgen.ts).
   Ev gezegeninin kimliği (`<id>-ev`), köyü ve ev bonusu eskisi gibidir. */
function tilted(id: string, theme: number, homeName: string, homeColor: number, village: Village): PlanetSource {
  return (holes) => generateSystem({ id, theme, holes, home: { name: homeName, color: homeColor, village } })
}

function courtyard(id: string, theme: number): PlanetSource {
  return (holes) => generateSystem({ id, theme, holes })
}

const tone = (
  id: UniId,
  name: string,
  line: string,
  gravMul: number,
  tint: [number, number, number],
  hot: [number, number, number],
  mid: [number, number, number],
  edge: [number, number, number],
  fog: [number, number, number],
  fogDensity: number,
  holes: HoleDef[],
  planets: PlanetSource,
  spread = SYSTEM_SPREAD,
): UniverseDef => {
  // Elle yazılmış delik konumları dışa açılır; merkezdeki delik yerinde kalır. Sis de aynı oranda incelir,
  // yoksa uzaklaşan gezegenler sisin içinde kararır.
  const placed = holes.map((h) => ({ ...h, x: h.x * spread, y: h.y * spread, z: h.z * spread }))
  return {
    id,
    name,
    line,
    gravMul,
    timeMul: 1,
    enemyMul: 1,
    tint,
    hot,
    mid,
    edge,
    fog,
    fogDensity: fogDensity / SYSTEM_SPREAD,
    holes: placed,
    planets: typeof planets === 'function' ? planets(placed) : planets,
  }
}

/* Güneş Sistemi: gerçek sıra, elle seçilmiş boyutlar. Her gövde kendi yörünge halkasında,
   bir önceki halkanın dış kenarından en az ORBIT_GAP uzakta durur; böylece yörüngede dönerken
   iki gezegen (ör. Dünya ile Ay) hiçbir açıda birbirine girmez. */
type SolarBody = [id: string, name: string, base: number, color: number, y: number, opt: Partial<PlanetDef>]

const SOLAR: SolarBody[] = [
  ['merkur', 'Merkür', 16, 0xb5aa9e, 60, { kind: 'small', gravity: 7, jump: 12, glide: 0.55, move: 1.25 }],
  ['venus', 'Venüs', 40, 0xe6d2a2, -100, { gravity: 16, jump: 7, glide: 0.9, move: 0.75 }],
  ['dunya', 'Dünya', 130, 0x2f6eb8, 40, { home: true, village: 'human', gravity: 12, jump: 9, glide: 0.75, move: 1.05 }],
  ['ay', 'Ay', 46, 0xc8c4bc, 140, { kind: 'small', gravity: 3.6, jump: 16, glide: 0.4, move: 1.55 }],
  ['mars-gezegen', 'Mars', 68, 0xc45a32, -80, { gravity: 8.5, jump: 11, glide: 0.62, move: 1.15, village: 'mars', lore: 'Mars. Eski uygarlığın terk ettiği yurt; kubbelerinde geride kalanlar yaşıyor. Asıl halk Ross 128 b\'ye göç etti.' }],
  ['jupiter', 'Jüpiter', 200, 0xd2b48a, 160, { kind: 'large', gravity: 40, jump: 4, glide: 1, move: 0.3 }],
  ['saturn', 'Satürn', 150, 0xe6d3a1, -60, { kind: 'large', rings: true, gravity: 26, jump: 6, glide: 0.95, move: 0.48 }],
  ['titan', 'Titan', 36, 0xd08a45, 180, { gravity: 6, jump: 12, glide: 0.55, move: 1.2 }],
  ['uranus', 'Uranüs', 62, 0x9fd8d2, 100, { kind: 'large', gravity: 18, jump: 7, glide: 0.9, move: 0.6 }],
  ['neptun', 'Neptün', 60, 0x3d5fd0, -140, { kind: 'large', gravity: 18, jump: 7, glide: 0.9, move: 0.6 }],
]

function solarSystem(): PlanetDef[] {
  const sunR = 78 * PLANET_SIZE
  const out = [orb('gunes-yildiz', 'Güneş', 0, 0, 0, sunR, 0xffe08a, { heat: true, gravity: 8, jump: 6, glide: 1, move: 1 })]
  let edge = sunR + 60
  SOLAR.forEach(([id, name, base, color, y, opt], i) => {
    const radius = base * PLANET_SIZE
    const reach = bodyReach(radius, opt.rings)
    const flat = edge + ORBIT_GAP + reach
    edge = flat + reach
    const ang = 0.35 + i * 2.39996
    out.push(orb(id, name, Math.cos(ang) * flat, y, Math.sin(ang) * flat, radius, color, { landable: true, ...opt }))
  })
  return out
}

/** Solucan deliklerini halka düzleminin çok üstüne/altına koyar; hiçbir yörüngeye WORM_CLEAR'dan yakın değildir. */
function solarWorm(flat: number, y: number, ang: number, to: UniId): HoleDef {
  return { kind: 'worm', x: Math.cos(ang) * flat, y, z: Math.sin(ang) * flat, rs: 0, gm: 0, curve: 1, to }
}

export const UNIVERSES: Record<UniId, UniverseDef> = {
  avlu: tone(
    'avlu',
    'Sessiz Avlu',
    'Bildik karanlık. Buradan yollar ayrılır.',
    1,
    [1, 1, 1],
    [1.25, 1.05, 0.82],
    [0.95, 0.4, 0.09],
    [0.28, 0.045, 0.015],
    [0.03, 0.03, 0.05],
    0.00035,
    [
      { kind: 'hole', x: 0, y: 0, z: 0, rs: 18, gm: 82000, curve: 1.65 },
      { kind: 'hole', x: 190, y: 80, z: 36, rs: 10, gm: 26000, curve: 2.05 },
      { kind: 'worm', x: -150, y: 14, z: 64, rs: 0, gm: 0, curve: 1, to: 'kizil' },
      { kind: 'worm', x: 120, y: -22, z: -230, rs: 0, gm: 0, curve: 1, to: 'gunes' },
      { kind: 'worm', x: 125, y: -150, z: 217, rs: 0, gm: 0, curve: 1, to: 'marskol' },
      { kind: 'worm', x: -177, y: -150, z: -177, rs: 0, gm: 0, curve: 1, to: 'alpha' },
    ],
    courtyard('avlu', 0x8fd0c6),
  ),
  kizil: tone(
    'kizil',
    'Kızıl Sığ',
    'Daha ağır çekim, daha hızlı dış saat.',
    1.35,
    [1.35, 0.62, 0.42],
    [1.4, 0.55, 0.22],
    [0.85, 0.16, 0.05],
    [0.28, 0.03, 0.02],
    [0.12, 0.03, 0.02],
    0.00045,
    [
      { kind: 'hole', x: 0, y: 0, z: 0, rs: 24, gm: 128000, curve: 1.85 },
      { kind: 'hole', x: -180, y: 90, z: 110, rs: 12, gm: 42000, curve: 1.7 },
      { kind: 'worm', x: 150, y: 12, z: -80, rs: 0, gm: 0, curve: 1, to: 'soluk' },
      { kind: 'worm', x: -70, y: 22, z: -240, rs: 0, gm: 0, curve: 1, to: 'avlu' },
      { kind: 'worm', x: 30, y: 230, z: 60, rs: 0, gm: 0, curve: 1, to: 'alpha' },
      { kind: 'worm', x: -65, y: -150, z: 241, rs: 0, gm: 0, curve: 1, to: 'proxima' },
      { kind: 'worm', x: -246, y: -150, z: -43, rs: 0, gm: 0, curve: 1, to: 'k218' },
    ],
    courtyard('kizil', 0xf0a36b),
  ),
  soluk: tone(
    'soluk',
    'Soluk Derin',
    'Hafif çekim, zaman burada daha da kaçar.',
    0.7,
    [0.55, 0.75, 1.25],
    [0.85, 0.95, 1.25],
    [0.25, 0.4, 0.85],
    [0.05, 0.08, 0.22],
    [0.04, 0.06, 0.12],
    0.0004,
    [
      { kind: 'hole', x: 0, y: 0, z: 0, rs: 15, gm: 38000, curve: 2.15 },
      { kind: 'hole', x: 130, y: -90, z: 140, rs: 9, gm: 18000, curve: 1.7 },
      { kind: 'worm', x: -180, y: 20, z: 170, rs: 0, gm: 0, curve: 1, to: 'kizil' },
      { kind: 'worm', x: 0, y: 18, z: -190, rs: 0, gm: 0, curve: 1, to: 'kepler186' },
      { kind: 'worm', x: 70, y: -210, z: 30, rs: 0, gm: 0, curve: 1, to: 'gliese' },
      { kind: 'worm', x: -227, y: -150, z: -106, rs: 0, gm: 0, curve: 1, to: 'kepler452' },
    ],
    courtyard('soluk', 0x9eb6f2),
  ),
  marskol: tone(
    'marskol', // iç kimlik eskisi gibi; oyuncu "Ross 128" görür
    'Ross 128',
    'Sakin kızıl cüce. Eski Marslıların yeni yurdu.',
    1.05,
    [1.2, 0.55, 0.35],
    [1.3, 0.45, 0.2],
    [0.7, 0.18, 0.08],
    [0.22, 0.05, 0.02],
    [0.16, 0.05, 0.02],
    0.00055,
    [
      { kind: 'hole', x: -420, y: 160, z: -80, rs: 12, gm: 30000, curve: 1.7 },
      { kind: 'worm', x: 80, y: -40, z: -260, rs: 0, gm: 0, curve: 1, to: 'gunes' },
      { kind: 'worm', x: 260, y: 30, z: 220, rs: 0, gm: 0, curve: 1, to: 'proxima' },
      { kind: 'worm', x: -40, y: 240, z: 80, rs: 0, gm: 0, curve: 1, to: 'avlu' },
    ],
    tilted('marskol', 0xc4603a, 'Ross 128 b', 0x9a7a52, 'mars'),
  ),
  proxima: tone(
    'proxima',
    'Proxima',
    'Loş kırmızı cüce. Gölgeler uzar.',
    0.9,
    [1.1, 0.35, 0.4],
    [1, 0.3, 0.32],
    [0.45, 0.08, 0.12],
    [0.12, 0.02, 0.04],
    [0.1, 0.02, 0.04],
    0.0005,
    [
      { kind: 'hole', x: 400, y: -120, z: 40, rs: 11, gm: 24000, curve: 1.8 },
      { kind: 'worm', x: -30, y: 250, z: -20, rs: 0, gm: 0, curve: 1, to: 'marskol' },
      { kind: 'worm', x: -220, y: 40, z: -180, rs: 0, gm: 0, curve: 1, to: 'kepler186' },
      { kind: 'worm', x: 40, y: -180, z: 160, rs: 0, gm: 0, curve: 1, to: 'kizil' },
    ],
    tilted('proxima', 0x8a3040, 'Proxima b', 0x6a2438, 'shadow'),
  ),
  alpha: tone(
    'alpha',
    'Alpha Centauri',
    'Mor köy. Koca kafalar pencerede.',
    1,
    [0.85, 0.55, 1.15],
    [0.95, 0.6, 1.2],
    [0.45, 0.18, 0.7],
    [0.12, 0.04, 0.2],
    [0.08, 0.03, 0.14],
    0.00048,
    [
      { kind: 'hole', x: -380, y: 40, z: 200, rs: 10, gm: 22000, curve: 1.75 },
      { kind: 'worm', x: 240, y: 20, z: -200, rs: 0, gm: 0, curve: 1, to: 'k218' },
      { kind: 'worm', x: 20, y: 260, z: 10, rs: 0, gm: 0, curve: 1, to: 'avlu' },
      { kind: 'worm', x: -60, y: -160, z: 140, rs: 0, gm: 0, curve: 1, to: 'kizil' },
    ],
    tilted('alpha', 0x7a4ad0, 'Alpha B', 0x8d5ae0, 'purple'),
  ),
  trappist: tone(
    'trappist',
    'TRAPPIST-1',
    'Yedi dünyalık sıkışık bir avlu.',
    0.85,
    [0.45, 0.9, 0.85],
    [0.5, 1, 0.9],
    [0.1, 0.45, 0.4],
    [0.02, 0.1, 0.1],
    [0.02, 0.08, 0.08],
    0.00042,
    [
      { kind: 'hole', x: 360, y: 140, z: -160, rs: 9, gm: 18000, curve: 1.9 },
      { kind: 'worm', x: 90, y: -200, z: -40, rs: 0, gm: 0, curve: 1, to: 'gliese' },
      { kind: 'worm', x: -20, y: 220, z: 70, rs: 0, gm: 0, curve: 1, to: 'k218' },
      { kind: 'worm', x: -180, y: 30, z: 200, rs: 0, gm: 0, curve: 1, to: 'kepler186' },
    ],
    tilted('trappist', 0x3d9a90, 'TRAPPIST-1e', 0x2f8f86, 'ocean'),
  ),
  k218: tone(
    'k218',
    'K2-18',
    'Kalın hava, deniz kokusu.',
    1.1,
    [0.4, 0.85, 0.95],
    [0.55, 0.95, 1],
    [0.08, 0.35, 0.5],
    [0.02, 0.08, 0.14],
    [0.02, 0.07, 0.12],
    0.0005,
    [
      { kind: 'hole', x: -300, y: -80, z: 220, rs: 13, gm: 28000, curve: 1.7 },
      { kind: 'worm', x: 10, y: 250, z: -30, rs: 0, gm: 0, curve: 1, to: 'alpha' },
      { kind: 'worm', x: -80, y: -40, z: -240, rs: 0, gm: 0, curve: 1, to: 'kizil' },
      { kind: 'worm', x: 200, y: 60, z: 160, rs: 0, gm: 0, curve: 1, to: 'trappist' },
    ],
    tilted('k218', 0x2f8fbf, 'K2-18b', 0x1f7aa8, 'ocean'),
  ),
  kepler186: tone(
    'kepler186',
    'Kepler-186',
    'Filizlerin dünyası.',
    1,
    [0.55, 0.95, 0.5],
    [0.7, 1, 0.55],
    [0.15, 0.45, 0.12],
    [0.04, 0.12, 0.03],
    [0.03, 0.1, 0.04],
    0.00046,
    [
      { kind: 'hole', x: 280, y: 180, z: 80, rs: 11, gm: 26000, curve: 1.8 },
      { kind: 'worm', x: -30, y: -230, z: 20, rs: 0, gm: 0, curve: 1, to: 'proxima' },
      { kind: 'worm', x: 60, y: 40, z: -250, rs: 0, gm: 0, curve: 1, to: 'trappist' },
      { kind: 'worm', x: 180, y: 210, z: 40, rs: 0, gm: 0, curve: 1, to: 'soluk' },
    ],
    tilted('kepler186', 0x6aaa48, 'Kepler-186f', 0x4e8f38, 'plant'),
  ),
  gliese: tone(
    'gliese',
    'Gliese 667',
    'Üç güneşin ağır dünyası.',
    1.25,
    [1.15, 0.6, 0.25],
    [1.2, 0.45, 0.15],
    [0.55, 0.16, 0.05],
    [0.16, 0.04, 0.02],
    [0.12, 0.04, 0.02],
    0.0005,
    [
      { kind: 'hole', x: 120, y: -200, z: -180, rs: 14, gm: 36000, curve: 1.7 },
      { kind: 'worm', x: -20, y: 240, z: 50, rs: 0, gm: 0, curve: 1, to: 'trappist' },
      { kind: 'worm', x: 70, y: -30, z: 230, rs: 0, gm: 0, curve: 1, to: 'kepler452' },
      { kind: 'worm', x: -200, y: 80, z: -40, rs: 0, gm: 0, curve: 1, to: 'soluk' },
    ],
    tilted('gliese', 0xd06a28, 'Gliese 667 Cc', 0xc45a22, 'red'),
  ),
  kepler452: tone(
    'kepler452',
    'Kepler-452',
    'Yaşlı yıldız. Efsanenin evi.',
    1.05,
    [1.15, 0.9, 0.45],
    [1.2, 0.85, 0.4],
    [0.7, 0.4, 0.08],
    [0.18, 0.08, 0.02],
    [0.1, 0.07, 0.02],
    0.0004,
    [
      { kind: 'hole', x: -240, y: 40, z: 260, rs: 16, gm: 40000, curve: 1.6 },
      { kind: 'worm', x: -90, y: -40, z: -230, rs: 0, gm: 0, curve: 1, to: 'gliese' },
      { kind: 'worm', x: 20, y: 250, z: -10, rs: 0, gm: 0, curve: 1, to: 'soluk' },
    ],
    tilted('kepler452', 0xe0b15a, 'Kepler-452b', 0xf0c36a, 'gold'),
  ),
  gunes: tone(
    'gunes',
    'Güneş Sistemi',
    'Tanıdık sıra, gerçek boşluklar. Güneş yakar, yutmaz.',
    1,
    [1.05, 0.95, 0.8],
    [1.3, 0.95, 0.55],
    [0.85, 0.45, 0.12],
    [0.2, 0.08, 0.03],
    [0.05, 0.04, 0.03],
    0.00022,
    [solarWorm(1000, 700, 0.3, 'marskol'), solarWorm(3000, -900, 2.2, 'avlu')],
    solarSystem(),
    1,
  ),
}

