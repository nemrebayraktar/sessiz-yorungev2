import type { Group, Vector3 } from 'three'
import type { Rig, RigStyle } from './meshes'
import type { OriginId, UniId } from './origins'

/* Üs savunması ve koloni verisi. Burada yalnız sabitler ve saf mantık var;
   sahneyle konuşan kısım game.ts içindedir. */

export const BASE_COST_HOME = 30
export const OUTPOST_COST = 60
export const TURRET_COST = 20
export const REPAIR_COST = 10
export const UPGRADE_COST: Record<number, number> = { 2: 60, 3: 110, 4: 180, 5: 280 }
export const MAX_LEVEL = 5
export const SIEGE_WAVES = 3
export const FIRST_WAVE_DELAY = 22
export const WAVE_GAP = 30
export const BOT_WAVE_GAP = 75
export const BOT_TICK = 40
export const BOT_MAX_PER_UNIVERSE = 4
/** Ganimetin ana karakol deposuna giden payı (depo dolunca karakol seviye atlar). */
export const LOOT_TO_OUTPOST = 0.6
/** Bot türleri ilk bu kadar saniye oyuncunun ev sistemine dokunmaz. */
export const HOME_GRACE = 360
/** Yıkılan karakolun gezegeni bu kadar süre boş kalır (yerli ya da bot doğmaz). */
export const RAZE_LOCK = 300
/** Bot türlerinin başlangıç karakol seviyesi. */
export const BOT_START_LEVEL = 2
/** Karakol çekirdeği seviyeye göre gelen hasarı azaltır. */
export const coreArmor = (level: number) => 1 / (1 + 0.18 * (level - 1))
export const BUILD_REACH = 46
export const CORE_REACH = 9
export const CORE_RADIUS = 3.4
export const TURRET_RADIUS = 1.1
export const PLAYER_RADIUS = 0.8

export const coreHullMax = (level: number) => 220 + level * 120
export const turretSlots = (level: number) => 2 + level * 2
export const turretDamage = (level: number) => 6 + level * 3
export const turretCooldown = (level: number) => 0.85 - level * 0.1
export const TURRET_RANGE = 26
export const TURRET_HULL = 70
/** Yerleşimci tavanı: karakolun seviyesi ve taret sayısıyla büyür. Seviye 5'te gezegen dolup taşar. */
export const settlerCap = (level: number, turrets: number) => [0, 3, 8, 14, 22, 32][Math.min(5, Math.max(1, level))] + Math.floor(turrets * 0.5)
export const popGrowth = (level: number) => 0.04 + 0.03 * level
export const waveHullMul = (n: number) => 1 + (n - 1) * 0.07

export type InvaderKind = 'runner' | 'brute' | 'spitter' | 'queen'
export type SettlerKind = 'settler' | 'archer' | 'guard' | 'worker' | 'commander'
export type UnitKind = InvaderKind | SettlerKind

export type InvaderSpec = {
  name: string
  hull: number
  speed: number
  dmg: number
  reach: number
  radius: number
  scale: number
  color: number
  style: RigStyle
  score: number
  cool: number
}

export const INVADER: Record<InvaderKind, InvaderSpec> = {
  runner: { name: 'Koşucu', hull: 14, speed: 5.6, dmg: 4, reach: 2.3, radius: 0.7, scale: 1, color: 0x7be07a, style: 'hop', score: 8, cool: 0.9 },
  brute: { name: 'Kaba', hull: 52, speed: 2.7, dmg: 11, reach: 3.2, radius: 1.35, scale: 1.2, color: 0xd0508e, style: 'purple', score: 20, cool: 1.5 },
  spitter: { name: 'Tükürük', hull: 22, speed: 3.2, dmg: 5, reach: 15, radius: 0.9, scale: 1.0, color: 0x5fb4ee, style: 'shadow', score: 14, cool: 1.8 },
  queen: { name: 'Kovan Ana', hull: 260, speed: 2.1, dmg: 20, reach: 4.4, radius: 2.1, scale: 2.2, color: 0xe8b04a, style: 'purple', score: 120, cool: 1.8 },
}

export const SETTLER: Record<SettlerKind, InvaderSpec> = {
  settler: { name: 'Yancı', hull: 18, speed: 4.2, dmg: 3, reach: 2.2, radius: 0.65, scale: 1, color: 0xfff1c4, style: 'walk', score: 0, cool: 0.9 },
  archer: { name: 'Nişancı', hull: 20, speed: 3.2, dmg: 4, reach: 14, radius: 0.8, scale: 1, color: 0xbfe8ff, style: 'walk', score: 0, cool: 1.3 },
  guard: { name: 'Koruyucu', hull: 70, speed: 2.9, dmg: 10, reach: 3, radius: 1.15, scale: 1.3, color: 0xffd27a, style: 'walk', score: 0, cool: 1.2 },
  commander: { name: 'Komutan', hull: 160, speed: 3.3, dmg: 16, reach: 3.4, radius: 1.3, scale: 1.45, color: 0xffd27a, style: 'walk', score: 0, cool: 1.0 },
  worker: { name: 'İşçi', hull: 16, speed: 4.4, dmg: 2, reach: 2, radius: 0.6, scale: 0.95, color: 0xffb43a, style: 'walk', score: 0, cool: 1.1 },
}

/* ---------- Ekonomi ve ordu (B turu) ---------- */

/** Koloni duruşu: işçi/asker oranı, dizilim ve eğitim hızı tek tıkla. */
export type Posture = 'ekonomi' | 'savunma' | 'saldiri'
export const POSTURES: { id: Posture; name: string; blurb: string }[] = [
  { id: 'ekonomi', name: 'Ekonomi', blurb: 'Halkın çoğu işçi: yataklardan maden ve kristal taşır. Askerler işçilere eşlik eder.' },
  { id: 'savunma', name: 'Savunma', blurb: 'Çoğu asker, taret önünde dizilir; taretler %25 sert vurur. Üretim azalır.' },
  { id: 'saldiri', name: 'Saldırı hazırlığı', blurb: 'Kışla iki kat hızlı asker eğitir, ekip sınırı +2, birlikler hücumda. Üretim en az.' },
]
export const workerShare = (p: Posture | undefined) => (p === 'savunma' ? 0.25 : p === 'saldiri' ? 0.15 : 0.6)
export const postureOrder = (p: Posture | undefined): ColonyOrder => (p === 'savunma' ? 'on' : p === 'saldiri' ? 'hucum' : 'serbest')
/** Kışlada asker eğitimi: bedel ve süre (sn). */
export const TRAIN_COST = { energy: 15, ore: 3, crystal: 0 }
export const TRAIN_TIME = 14
/** Eğitilmiş asker sınırı (seviye başına iki). */
export const trainCap = (level: number) => level * 2
/** Komutan: kışla sv3+, koloni başına bir; ekibe +%25 hasar ve yavaş iyileşme verir. */
export const COMMANDER_COST = { energy: 60, ore: 10, crystal: 3 }
export const COMMANDER_TIME = 30
export const COMMANDER_NAMES = ['Ayaz', 'Bora', 'Doruk', 'Ece', 'Ilgın', 'Kaya', 'Mira', 'Nehir', 'Orkun', 'Selin', 'Tuna', 'Yaren']
/** Uzaktaki koloninin işçi başına dakikalık üretimi. */
export const WORKER_RATE = { ore: 0.9, crystal: 0.25 }

/** Taret türü: kara (yerdeki saldırganlar) ya da hava savunma (gezegene yaklaşan gemiler). */
export type TurretKind = 'kara' | 'hava'
export const TURRET_MAX_LVL = 3
export const turretUpCost = (lvl: number) => ({ energy: 25 * lvl, ore: 3 * lvl, crystal: lvl >= 2 ? 2 : 0 })
export const turretLvlMul = (lvl: number) => 1 + 0.4 * (lvl - 1)
export const AA_RANGE = 300

/** Nüfusun çoğu yancıdır (küçük, zayıf, ırkın sade sürümü). Ana karakterler (koruyucu, nişancı)
 *  seviyeyle açılır: sv 2'de 1, sv 5'te 4. Baskın ekibinin kalbi bunlardır. */
export const heroCap = (level: number) => Math.max(0, Math.min(4, level - 1))
export const isHero = (kind: string) => kind === 'archer' || kind === 'guard'
export const heroKind = (index: number): SettlerKind => (index % 2 === 0 ? 'guard' : 'archer')
/** Eski çağrılar için: i. yerleşimci. */
export function settlerKind(level: number, index: number): SettlerKind {
  return index < heroCap(level) ? heroKind(index) : 'settler'
}

export function waveRoster(n: number): InvaderKind[] {
  const runners = Math.min(14, 3 + n * 2)
  const brutes = n >= 3 ? Math.min(6, Math.floor((n - 1) / 2)) : 0
  const spitters = n >= 4 ? Math.min(6, Math.floor(n / 2) - 1) : 0
  const queens = n % 5 === 0 ? 1 + Math.floor(n / 15) : 0
  const out: InvaderKind[] = []
  const lanes: [InvaderKind, number][] = [['runner', runners], ['brute', brutes], ['spitter', spitters]]
  let left = true
  while (left) {
    left = false
    for (const lane of lanes) {
      if (lane[1] > 0) {
        out.push(lane[0])
        lane[1]--
        left = true
      }
    }
  }
  for (let i = 0; i < queens; i++) out.push('queen')
  return out
}

export const waveReward = (n: number, early: boolean) => Math.round((14 + n * 6) * (early ? 1.25 : 1))

export type Turret = {
  dir: Vector3 // gezegen yerelinde birim yön
  root: Group
  head: Group
  cool: number
  hull: number
  alive: boolean
  /** Kara (varsayılan) ya da hava savunma. */
  kind?: TurretKind
  /** Seviye 1–3. */
  lvl?: number
}

export type Colony = {
  planetId: string
  planetName: string
  universe: UniId
  owner: OriginId // üssü kuran türün kökeni
  pop: number // yerleşimci nüfusu (gezegen yüklü değilken de büyür)
  settleT: number
  attacker: OriginId | null // sürmekte olan dalgayı gönderen tür
  kind: 'main' | 'colony'
  dir: Vector3 // gezegen yerelinde birim yön
  level: number
  hull: number
  hullMax: number
  wave: number // tamamlanan dalga sayısı
  state: 'idle' | 'wave'
  countdown: number
  founded: boolean // koloni kuşatmayı tamamladı mı (ana üs için hep true)
  early: boolean
  queue: InvaderKind[]
  spawnT: number
  turrets: Turret[]
  root: Group | null
  core: Group | null
  coreBar: Group | null
  /** Ganimet deposu: dolunca karakol kendiliğinden seviye atlar. */
  store?: number
  /** Uzaydaki gemilere ateş eden çekirdek topunun bekleme süresi. */
  shipCool?: number
  /** İleride: gemiyle oyuncuyu takip edip baskına katılacak yerleşimci sayısı (şimdilik kullanılmıyor). */
  reserve?: number
  /** Kuşatma: oyuncu tarafı saldırdı; savunmacı yeniden doğmaz, hepsi düşünce üs teslim olur. */
  besieged?: boolean
  /** Dizilim emri: serbest dolaşma, taret önü, taret arkası ya da hücum. */
  order?: ColonyOrder
  /** Duruş (ekonomi / savunma / saldırı hazırlığı). */
  posture?: Posture
  /** Kışlada eğitilmiş ek asker sayısı ve eğitim kuyruğu. */
  trained?: number
  trainQ?: number
  trainT?: number
  /** Uzakta çalışan işçilerin biriken üretimi. */
  haulOre?: number
  haulCry?: number
  /** Komutan eğitimi ve doğmayı bekleyen komutan. */
  cmdT?: number
  cmdWaiting?: number
}

export type ColonyOrder = 'serbest' | 'on' | 'arka' | 'hucum'
export type SquadOrder = 'takip' | 'bekle' | 'saldir'

export const COLONY_ORDERS: { id: ColonyOrder; name: string; blurb: string }[] = [
  { id: 'serbest', name: 'Serbest', blurb: 'Üssün çevresinde dolaşır, yaklaşanı karşılar.' },
  { id: 'on', name: 'Taret önü', blurb: 'Taretlerin önüne dizilir; düşmanı taret menziline çeker.' },
  { id: 'arka', name: 'Taret arkası', blurb: 'Taretlerin arkasında bekler; yalnız üsse yaklaşanı vurur, daha az hasar alır.' },
  { id: 'hucum', name: 'Hücum', blurb: 'Uzaktaki düşmanın da üstüne koşar, daha sert vurur ama korumasız.' },
]

export const SQUAD_ORDERS: { id: SquadOrder; name: string; blurb: string }[] = [
  { id: 'takip', name: 'Takip', blurb: 'Seni izler, yakındaki düşmanla dövüşür.' },
  { id: 'bekle', name: 'Bekle', blurb: 'Bulunduğun yerde mevzi tutar.' },
  { id: 'saldir', name: 'Saldır', blurb: 'Gezegendeki düşman üssüne doğrudan yürür.' },
]

export type Unit = {
  alive: boolean
  kind: UnitKind
  spec: InvaderSpec
  faction: OriginId // hangi türden
  invader: boolean // saldıran mı, yerleşimci mi
  /** Vurulan gemiden gezegene düşen yaralı mürettebat (oyuncuyu arar). */
  fallen?: boolean
  colonyId: string // yerleşimcinin üssü (gezegen kimliği)
  root: Group
  rig: Rig
  dir: Vector3 // gezegen merkezine göre birim yön (dünya çerçevesi)
  hull: number
  hullMax: number
  cool: number
  phase: number
  attack: number
  goal: Vector3 | null
  /** Animasyon seyreltme için sabit sıra numarası. */
  seq?: number
  /** Oyuncunun baskın ekibinden: oyuncuyu izler, yerlilere ve düşman üssüne saldırır. */
  squad?: boolean
  /** İşçi işi: yatağa yürü, kaz, üsse taşı. */
  job?: 'go' | 'dig' | 'back'
  jobT?: number
  depKey?: string
  carry?: 'ore' | 'crystal' | null
  /** Komutanın adı. */
  name?: string
  /** Hasar çarpanı (güçlü ırkların savunmacıları). */
  dmgMul?: number
}
