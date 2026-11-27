import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  BufferAttribute,
  BufferGeometry,
  DepthFormat,
  DepthTexture,
  DoubleSide,
  Euler,
  BackSide,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  MathUtils,
  Matrix4,
  CylinderGeometry,
  MeshStandardMaterial,
  OctahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  TorusGeometry,
  SpriteMaterial,
  SRGBColorSpace,
  UnsignedIntType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { AudioBus } from './audio'
import { Input } from './input'
import { buildDwelling, buildBar, buildCuteAlien, buildFleetIcon, buildFragment, buildHumanFighter, buildPilot, buildPlanet, buildPoi, buildShip, buildWormhole, glowTexture, paintBar, paintLabel, paintPlanet, type PlayerVisual, type Rig, tickWormhole } from './meshes'
import { cruiseSpeed, ABILITY_INFO, ORIGINS, UNIVERSES, WEAPONS, homeSystem, originById, signatureWeapon, starterWeapons, type AbilityId, type OriginId, type PlanetDef, type UniId, type WeaponId } from './origins'
import { drawPortrait } from './portraits'
import {
  BASE_COST_HOME,
  BOT_START_LEVEL,
  HOME_GRACE,
  LOOT_TO_OUTPOST,
  RAZE_LOCK,
  coreArmor,
  BOT_TICK,
  BOT_WAVE_GAP,
  BUILD_REACH,
  CORE_RADIUS,
  CORE_REACH,
  FIRST_WAVE_DELAY,
  INVADER,
  MAX_LEVEL,
  OUTPOST_COST,
  PLAYER_RADIUS,
  REPAIR_COST,
  SETTLER,
  SIEGE_WAVES,
  TURRET_COST,
  TURRET_HULL,
  TURRET_RADIUS,
  TURRET_RANGE,
  UPGRADE_COST,
  WAVE_GAP,
  coreHullMax,
  popGrowth,
  settlerCap,
  heroCap,
  heroKind,
  isHero,
  POSTURES,
  type Posture,
  postureOrder,
  workerShare,
  TRAIN_COST,
  TRAIN_TIME,
  trainCap,
  WORKER_RATE,
  type TurretKind,
  TURRET_MAX_LVL,
  turretUpCost,
  turretLvlMul,
  AA_RANGE,
  COMMANDER_COST,
  COMMANDER_TIME,
  COMMANDER_NAMES,
  turretCooldown,
  turretDamage,
  turretSlots,
  waveHullMul,
  waveReward,
  waveRoster,
  type Colony,
  type ColonyOrder,
  type SquadOrder,
  COLONY_ORDERS,
  SQUAD_ORDERS,
  type InvaderKind,
  type SettlerKind,
  type Turret,
  type Unit,
  type UnitKind,
} from './colony'
import { RigFlash, Sparks, Swing, Tracers } from './groundfx'
import { FEET, buildCreature, buildMinion } from './creatures'
import { buildTurret } from './meshes'
import { WAR } from './races'
import { SAVE_VERSION, readGame, writeGame, type SavedColony, type SavedGame, type V3 } from './savegame'
import { buildLandmark, dressPlanet, planetLook, planetYield, scatterDeposits, scatterFeatures, spinLandmark, tickPlanet, type Deposit, type Feature, type PlanetLook } from './planets'
import { SHIP_STYLE, setShipHalos, spinShip } from './ships'
import { QUESTS, RACE_STORY, PROLOGUE, EPILOGUE, SYSTEM_LORE, planetLore, type QuestText } from './story'
import { factionName, footTrait, nativeLook, originLook } from './species'
import { skillOf } from './skills'
import { Fx } from './fx'
import { SLOTS, nextOptions, partById, sumMods, tierCost, type Cost, type Part } from './parts'
import { PERSONA, bump, friendly, newRelation, price, resolve, stance, type Choice, type Relation } from './diplomacy'
import { PLANET_SIZE, hashSeed, makeRng } from './worldgen'
import { clearRun, loadSave, writeRun, writeSave, type SaveData } from './persist'
import {
  diskFrag,
  diskVert,
  LensShader,
  nebulaFrag,
  nebulaVert,
  starFrag,
  starVert,
} from './shaders'

const RS = 18
const MAP_LIMIT = 2600 // en küçük sınır; gerçek sınır evrenin boyuna göre `mapLimit`
const SKY_RADIUS = 20000 // gökyüzü küresi kamerayla birlikte gider
const CRUISE_CAP = 215 // savaşta / gövde yakınında hız sınırı (ırkın seyir hızını aşmaz)
const RADAR_RANGE = 280
/** Tarama menzili. */
const SCAN_RANGE = 700
const BANDS = [
  { at: 36, n: 2, threat: 1 },
  { at: 64, n: 3, threat: 2 },
  { at: 88, n: 5, threat: 3 },
] as const

const LINES: [number, string][] = [
  [0, '13,8 milyar yıl önce…'],
  [5.2, 'Tek bir nokta vardı.\nSonra ışık.'],
  [9.6, 'Uzay açıldı.\nİlk yıldızlar tutuştu.'],
  [14.8, 'Yandılar, söndüler.\nGeriye kara delikler kaldı.'],
  [20.2, 'Galaksiler örüldü.\nSayısız dünya, sayısız uygarlık.'],
  [26.2, 'Karanlık orman:\nkimse konuşmaz. Duyulan, bulunur.'],
  [32.2, 'Bulunan da avlanır.'],
]

const TIPS = [
  'Yörüngedesin. Motoru yakmak seni görünür kılar.',
  'Parçaları topla. Delik yaklaştıkça dış zaman hızlanır.',
  'Kırmızı filolar gürültüye gelir. F ile kapış; uzaklaşırsan kaçabilirsin.',
]

type Mode = 'intro' | 'title' | 'select' | 'map' | 'combat' | 'upgrade' | 'pause' | 'gameover'
type UpId = 'hull' | 'shield' | 'weapon' | 'engine' | 'stealth'
type FleetState = 'patrol' | 'hunt' | 'search' | 'leave'
type CamMode = 'chase' | 'cockpit'

type Fleet = {
  id: number
  pos: Vector3
  vel: Vector3
  threat: number
  count: number
  state: FleetState
  lastKnown: Vector3
  searchLeft: number
  angle: number
  orbit: number
  center: Vector3
  root: THREEGroup
  /** Ev sistemindeki eğitim gemileri: tek, küçük ve zayıf. */
  small?: boolean
  /** Bir gezegene bağlı devriye: merkez gezegenle birlikte yörüngede ilerler. */
  around?: Planet
  offset?: Vector3
  /** İnişte yörüngeye çekilen savaş filosu; kalkınca yeniden saldırır. */
  stashed?: boolean
  /** Filonun ırkı (diplomasi ve karşılaşma diyaloğu için). */
  faction?: OriginId
  /** Karşılaşma diyaloğu yapıldı mı. */
  talked?: boolean
  /** Taramayla görünür kalan süre. */
  revealed?: number
  /** Eğitimdeki izci gemi. */
  scout?: boolean
  /** Eğitim akıncısı: ev üssünün üstünde dönüp bombalar. */
  bomber?: boolean
}

/** Uzay savaşında düşen ganimet parçası: yakına gelince oyuncuya çekilir. */
type Loot = {
  alive: boolean
  pos: Vector3
  vel: Vector3
  value: number
  age: number
  mesh: THREEGroup
}

type Frag = {
  alive: boolean
  angle: number
  radius: number
  y: number
  spin: number
  phase: number
  mesh: THREEGroup
}

type Enemy = {
  root: THREEGroup
  pos: Vector3
  vel: Vector3
  quat: Quaternion
  hull: number
  hullMax: number
  shield: number
  shieldMax: number
  cool: number
  strafe: number
  strafeT: number
  alive: boolean
  threat: number
  stun: number
  flashT: number
  human: boolean
  attack: 'bolt' | 'homing' | 'goo' | 'well' | 'gate'
  giant: boolean
  scale: number
  weak: Mesh | null
  bar: Sprite | null
  bodyFlash: () => void
  /** Eğitim gemisi: az can, az hasar, az ganimet. */
  small?: boolean
  /** Uzay savaşı rolü: avcı (hızlı, yakın), bombacı (uzaktan füze), kalkanlı (önce kalkanı kırılmalı). */
  role?: 'avci' | 'bombaci' | 'kalkan'
  bubble?: Mesh | null
  /** Hasarlı gemi duman/ateş izi zamanlayıcısı. */
  smokeT?: number
}

type ShotKind = 'bolt' | 'homing' | 'goo' | 'laser' | 'pellet' | 'rocket' | 'plasma' | 'chain'

type Shot = {
  alive: boolean
  friendly: boolean
  pos: Vector3
  prev: Vector3
  vel: Vector3
  age: number
  dmg: number
  kind: ShotKind
  hops: number
  mesh: Mesh
}

type Boom = {
  alive: boolean
  age: number
  life: number
  points: Points
  positions: Float32Array
  vels: Float32Array
  mat: PointsMaterial
  sprite: Sprite
  spriteMat: SpriteMaterial
}

type THREEGroup = Group

type Planet = { def: PlanetDef; pos: Vector3; mesh: Group; village: Group | null; anchor: Vector3; rate: number; spin: number; spinRate: number; features: Feature[]; look: PlanetLook; deposits: Deposit[] }

type Local = {
  alive: boolean
  root: Group
  rig: Rig
  home: Vector3
  axis: Vector3
  phase: number
  hull: number
  cool: number
  attack: number
  friendly: boolean
}

type RouteTarget = { kind: 'planet' | 'worm' | 'hole'; id: string; system: UniId }

type Gate = {
  alive: boolean
  pos: Vector3
  life: number
  owner: Enemy | null
  to: UniId
  mesh: Group
  brought: boolean
}

type CineShot = { a0: number; a1: number; d0: number; d1: number; h0: number; h1: number; f0: number; f1: number; side?: number }
type Bookmark = { pos: Vector3; vel: Vector3; quat: Quaternion }

type Hole = {
  kind: 'hole' | 'worm'
  pos: Vector3
  rs: number
  gm: number
  curve: number
  to?: UniId
  disk: Mesh | null
  worm: Group | null
}


const vA = new Vector3()
const vB = new Vector3()
const vC = new Vector3()
const vD = new Vector3()
const vE = new Vector3()
const vF = new Vector3()
const vQ = new Vector3()
const vR = new Vector3()
const vS = new Vector3()
const vT = new Vector3()
const vU = new Vector3()
const vV = new Vector3()
const qF = new Quaternion()
const eTmp = new Euler()
/** Yayayken varsayılan bakış eğimi (hafif aşağı, karakterin üstünden). */
const FOOT_PITCH0 = -0.21
const qA = new Quaternion()
/** Güneş ışığının geldiği uzak nokta (şehir ışıkları gece yüzünde yanar). */
const SUN_FAR = new Vector3(48, 32, 18).multiplyScalar(1e5)
/** Tek bir MediaQueryList: her karede matchMedia çağırıp yeni nesne üretme. */
const COARSE = window.matchMedia('(pointer: coarse)')
const vG = new Vector3()
const vH = new Vector3()
const vI = new Vector3()
const vJ = new Vector3()
const vK = new Vector3()
const vL = new Vector3()
const vM = new Vector3()
const vH2 = new Vector3()
const vI2 = new Vector3()
const vJ2 = new Vector3()
const vO1 = new Vector3()
const vO2 = new Vector3()
const vO3 = new Vector3()
const vO4 = new Vector3()
const vFa = new Vector3()
const vFb = new Vector3()
const bX = new Vector3()
const bY = new Vector3()
const bZ = new Vector3()
const qB = new Quaternion()
const basis = new Matrix4()
const WORLD_UP = new Vector3(0, 1, 0)
const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
function fmt(n: number) {
  return Math.floor(n).toLocaleString('tr-TR')
}
function fmt2(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const pad = (v: number) => v.toString().padStart(2, '0')
  const hh = Math.floor(s / 3600)
  const mm = Math.floor(s / 60) % 60
  const ss = s % 60
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}
/** Yürüyüş yerçekimi: çok alçak yerçekiminde oyun "uçmaya" dönmesin diye taban 7, çok ağırda tavan 22. */
function footGravity(g: number) {
  return clamp(g, 9, 22)
}
function timeFactorAt(r: number, rs = RS, curve = 1.65) {
  const safe = Math.max(r, rs + 0.04)
  const gr = Math.sqrt(Math.max(0, 1 - rs / safe))
  return Math.max(0.08, Math.pow(gr, curve))
}
/** Baskın ekibi sınırları ve eşlik gemilerinin kanat düzeni (gemi yerel ekseni; ileri −Z). */
const SQUAD_MAX = 8
const SQUAD_HEROES = 3
const ESCORT_SLOTS: [number, number, number][] = [
  [-5.5, -0.6, -2],
  [5.5, -0.6, -2],
  [-3.2, 1.8, 1],
  [3.2, 1.8, 1],
]
type HitBy = 'player' | 'turret' | 'unit' | 'local'
/** Türkçe yönelme eki: Merkür'e, Ay'a, Titan'a, TRAPPIST-1e'ye. */
function dative(name: string) {
  const low = name.toLocaleLowerCase('tr')
  const vowels = 'aıoueiöü'
  let last = ''
  for (const ch of low) if (vowels.includes(ch)) last = ch
  const front = 'eiöü'.includes(last)
  const endsVowel = vowels.includes(low[low.length - 1] ?? '')
  return `${name}'${endsVowel ? 'y' : ''}${front ? 'e' : 'a'}`
}
function quatFromForward(out: Quaternion, forward: Vector3) {
  bZ.set(-forward.x, -forward.y, -forward.z)
  if (bZ.lengthSq() < 1e-8) bZ.set(0, 0, 1)
  else bZ.normalize()
  bX.crossVectors(WORLD_UP, bZ)
  if (bX.lengthSq() < 1e-6) bX.set(1, 0, 0)
  else bX.normalize()
  bY.crossVectors(bZ, bX).normalize()
  basis.makeBasis(bX, bY, bZ)
  out.setFromRotationMatrix(basis)
  return out
}
function shipForward(q: Quaternion, out: Vector3) {
  return out.set(0, 0, -1).applyQuaternion(q)
}
function shipRight(q: Quaternion, out: Vector3) {
  return out.set(1, 0, 0).applyQuaternion(q)
}
function shipUp(q: Quaternion, out: Vector3) {
  return out.set(0, 1, 0).applyQuaternion(q)
}
function levelWings(q: Quaternion, dt: number, strength: number) {
  shipForward(q, vA)
  shipUp(q, vB)
  // Burun dik yukarı/aşağı bakarken "ufuk" tanımsızdır; düzlemeye çalışmak gemiyi her karede
  // rastgele yuvarlıyordu (takla). Dikleştikçe düzleme gücü sıfıra iner.
  const steep = Math.abs(WORLD_UP.dot(vA))
  // Ters dönmüş gemiyi (takla sonrası) kendiliğinden çevirmeye kalkmaz: saniyede yüzlerce derece yuvarlanıyordu.
  const upright = clamp((WORLD_UP.dot(vB) + 0.1) / 0.4, 0, 1)
  const fade = clamp((0.92 - steep) / 0.25, 0, 1) * upright
  if (fade <= 0) return
  strength *= fade
  vC.copy(WORLD_UP).addScaledVector(vA, -WORLD_UP.dot(vA))
  if (vC.lengthSq() < 1e-6) return
  vC.normalize()
  vD.crossVectors(vB, vC)
  const sin = Math.min(1, vD.length())
  const cos = clamp(vB.dot(vC), -1, 1)
  const angle = Math.atan2(sin, cos)
  if (angle < 0.0008) return
  vD.normalize()
  qA.setFromAxisAngle(vD, angle * (1 - Math.exp(-strength * dt)))
  q.premultiply(qA)
}
function stabilizeFull(q: Quaternion, dt: number) {
  shipForward(q, vE)
  vE.y = 0
  if (vE.lengthSq() < 1e-6) vE.set(0, 0, -1)
  else vE.normalize()
  quatFromForward(qB, vE)
  q.slerp(qB, 1 - Math.exp(-4 * dt))
}
function distPointSeg(p: Vector3, a: Vector3, b: Vector3) {
  vG.subVectors(b, a)
  const l2 = vG.lengthSq()
  if (l2 < 1e-6) return p.distanceTo(a)
  const t = clamp(vF.subVectors(p, a).dot(vG) / l2, 0, 1)
  return p.distanceTo(vF.copy(a).addScaledVector(vG, t))
}

function must<T extends HTMLElement>(id: string) {
  const el = document.getElementById(id)
  if (!el) throw new Error(`#${id} yok`)
  return el as T
}

class Game {
  mode: Mode = 'intro'
  pausedFrom: Mode = 'map'
  camMode: CamMode = 'chase'
  fading = false
  ending = false
  snapCamera = true
  pr = Math.min(window.devicePixelRatio || 1, 1.5)
  readonly prMax = Math.min(window.devicePixelRatio || 1, 1.5)
  private fastRun = 0
  slow = 0
  clockT = 0
  diskTime = 0
  introT = 0
  lineShown = -1
  bangPlayed = false
  skipLock = 0
  fadeToken = 0
  properTime = 0
  coordTime = 0
  tf = 1
  worldScale = 1
  score = 0
  best = 0
  energy = 0
  kills = 0
  fights = 0
  vis = 0
  grace = 2
  scoreTick = 0
  fragTimer = 0
  fireCd = 0
  hitCd = 0
  muzzleT = 0
  muzzleSide = 1
  stabilizeT = 0
  trauma = 0
  hurtV = 0
  shieldFlash = 0
  boosting = false
  lastLoot = 0
  /** Yerinde uzay savaşı sürüyor mu (ayrı sahne yok). */
  skirmish = false
  loot: Loot[] = []
  lootSum = 0
  lootToastT = 0
  homePatrols = 0
  homePatrolT = 0
  coreSpots: { c: Colony; planet: Planet; pos: Vector3; up: Vector3 }[] = []
  unitFrame = 0
  unitSeq = 0
  toastT = 0
  tipI = 0
  tipT = 1.4
  tipsOn = true
  hullWarned = false
  suppressPause = false
  fps = 60
  fleetSeq = 1
  bandFired = [false, false, false]
  combatCount = 2
  combatThreat = 1
  combatTime = 0
  forceAim = false
  autoFire = false
  holdPose = false
  muteMem = 0.72
  originId: OriginId = 'earth'
  originIndex = 0
  universeId: UniId = 'avlu'
  wins = 0
  cd1 = 0
  cd2 = 0
  cloakT = 0
  wellLife = 0
  wellPos = new Vector3()
  enemyWells: { alive: boolean; pos: Vector3; life: number; owner: Enemy | null; mesh: Group }[] = []
  boltMat!: MeshBasicMaterial
  homingMat!: MeshBasicMaterial
  gooMat!: MeshBasicMaterial
  transitionLock = 0
  ab1Was = false
  ab2Was = false
  layer: 'ship' | 'foot' = 'ship'
  footPlanet: Planet | null = null
  weapon: WeaponId = 'laser'
  owned: WeaponId[] = ['laser']
  floats: { el: HTMLElement; life: number; pos: Vector3; up?: Vector3 }[] = []
  powerT = 0
  yawSm = 0
  pitchSm = 0
  heat = 0
  hitMark = 0
  lockTarget: Enemy | null = null
  /** Tab ile seçilen hedef: nişan yardımı ve eşlik gemileri buna odaklanır. */
  pickedTarget: Enemy | null = null
  escortOrder: 'takip' | 'saldir' | 'koru' = 'takip'
  dodgeT = 0
  /** Uzaktayken kolonine baskın: süre dolmadan inersen dalga olarak savaşırsın, inmezsen üs hasar alır. */
  raid: { planetId: string; by: OriginId; t: number } | null = null
  raidT = 300
  dodgeCd = 0
  planets: Planet[] = []
  planetMeshes: Group[] = []
  pois: Group[] = []
  villages: Group[] = []
  locals: Local[] = []
  colonies: Record<string, Colony> = {}
  units: Unit[] = []
  botSeeded = new Set<string>()
  botT = 40
  cleared = new Set<string>()
  /** Gezegende kalan düşman yerli sayısı: inip kalkınca yenilenmez, gemiden vurulanlar da düşer. */
  nativesLeft = new Map<string, number>()
  /** Yıkılan karakolların gezegenleri: planetId -> yıkıldığı an (properTime). */
  razed = new Map<string, number>()
  walkerLook = ''
  incomeAcc = 0
  waveBearing = 0
  buildWas = false
  turretWas = false
  waveWas = false
  tmpTurretDir = new Vector3()
  sepList: { dir: Vector3; r: number; kind: 0 | 1 | 2 }[] = []
  sepCore = new Vector3()
  sepTurrets: Vector3[] = []
  flash = new RigFlash()
  sparks!: Sparks
  tracers!: Tracers
  swing!: Swing
  walkerRig!: Rig
  walker!: Group
  route: RouteTarget | null = null
  routeLine!: Line
  ambushCd = 20
  ambushes = 0
  punchT = 0
  mobileCam = false
  footForward = new Vector3(0, 0, -1)
  /** Yayada kameranın baktığı yön (yüzey teğeti). Karakter hareket yönüne döner, kamera bu yönden bakar. */
  footView = new Vector3(0, 0, -1)
  /** Dururken sürükleyerek kamerayı karakterin çevresinde çevirme (yüzünü görmek için). */
  orbitYaw = 0
  orbitPitch = 0
  playingClass = false
  atmoHidden: Planet | null = null
  lookMode = false
  /** Fotoğraf modu: dünya durur, arayüz gizlenir, kamera serbestçe döner. */
  photo = false
  photoYaw = 0
  photoPitch = 0.25
  photoDist = 16
  photoFilter = 0
  silentWas = false
  scanWas = false
  /** Sessiz süzülme: motor kapalı, küçük iticilerle yavaş ilerler; görünürlük neredeyse artmaz. */
  silent = false
  /** Tarama: menzil içindeki filolar ve kaynaklar kısa süre görünür (ama seni de duyarlar). */
  scanT = 0
  scanCd = 0
  scanFx: Mesh | null = null
  seenNotice = 0
  visCaught = false
  /** Kaynaklar: maden ve kristal (enerji ayrı tutuluyor: this.energy). */
  ore = 0
  crystal = 0
  /** Irklarla ilişkiler. */
  rel: Partial<Record<OriginId, Relation>> = {}
  encounter: { fleet: Fleet; faction: OriginId } | null = null
  feedItems: { key: string; el: HTMLElement; n: number; life: number }[] = []
  /** Tükenen kaynak yatakları (gezegen:sıra → kalan). */
  mined = new Map<string, number>()
  resAcc = 0
  /* ---- Görev zinciri ---- */
  questIdx = 0
  questBase = { colonies: 0, turrets: 0, level: 0, wave: 0, captured: 0 }
  questFlags = new Set<string>()
  questWalk = 0
  questSilentT = 0
  routeByQuest = false
  /** Görev brifingi açık mı (dünya durur), ve gösterilmeyi bekleyen brifing. */
  briefing = false
  /** Test: eğitim kapıları ve brifingler kapatılabilir (eski testler serbest dünyada koşar). */
  testGates = true
  testBrief = true
  gateWarnT = 0
  briefPending = -1
  briefT = 0
  /** Test: karşılaşma diyaloğunu atla (eski testler doğrudan savaş bekler). */
  noTalk = false
  scoutT = 0
  scoutFight = false
  questPlanetId = ''
  questT = 0
  questDoneT = 0
  questLog: string[] = []
  captured = 0
  discovered: { id: string; name: string; system: string; lore: string }[] = []
  lookWas = false
  shipOrbitYaw = 0
  shipOrbitPitch = 0
  footAlt = 1.1
  footVel = 0
  footSpeed = 0
  grounded = true
  parkedShip = new Vector3()
  parkOffset = new Vector3() // park yeri gezegene göre; gezegen yörüngede ilerledikçe gemi de gider
  fleetAimPos = new Vector3()
  footCenter = new Vector3() // yayayken gezegen merkezinin önceki konumu: karakter yüzeyde kaymasın
  jumpBuf = 0
  punchCd = 0
  landWas = false
  jumpWas = false
  punchWas = false
  weaponWas = false
  returns: Partial<Record<UniId, Bookmark>> = {}
  enemyGates: Gate[] = []
  laserMat!: MeshBasicMaterial
  pelletMat!: MeshBasicMaterial
  rocketMat!: MeshBasicMaterial
  plasmaMat!: MeshBasicMaterial
  chainMat!: MeshBasicMaterial
  ships: Partial<Record<OriginId, PlayerVisual>> = {}
  pilots: Partial<Record<OriginId, Group>> = {}
  holes: Hole[] = []
  diskMeshes: Mesh[] = []
  wormMeshes: Group[] = []
  diskGeo!: BufferGeometry
  wellMesh!: Group
  bhLight!: PointLight
  mapLimit = MAP_LIMIT
  edgeToastCd = 0
  clickWas = false
  upgradeWas = false
  /** Baskın ekibi: gemideyken taşınan yancılar ve ana karakterler. */
  squad: { kind: SettlerKind; hull: number; hullMax: number }[] = []
  escorts: Group[] = []
  escortCd = 0
  squadWas = false
  radarMode: 'radar' | 'system' = 'radar'
  camUp = new Vector3(0, 1, 0)
  fragInner = 120
  sky!: Mesh
  stars!: Points

  pos = new Vector3(0, 48, 220)
  vel = new Vector3()
  quat = new Quaternion()
  hull = 100
  hullMax = 100
  shield = 52
  shieldMax = 52
  regen = 7
  weaponMul = 1
  engineMul = 1
  stealthMul = 1
  up: Record<UpId, number> = { hull: 1, shield: 1, weapon: 1, engine: 1, stealth: 1 }
  /** Takılı parça kimlikleri (kademe sırasıyla). */
  parts: string[] = []
  skillCd = 0
  skillT = 0
  skillWas = false
  squadOrder: SquadOrder = 'takip'
  squadHold: Vector3 | null = null
  orderOpen = false
  orderWas = false
  /** Geliştirme ekranında seçili yuva. */
  upSlot: UpId = 'hull'
  saved = { pos: new Vector3(), vel: new Vector3(), quat: new Quaternion() }

  save: SaveData
  audio = new AudioBus()
  input: Input
  renderer: WebGLRenderer
  scene = new Scene()
  camera: PerspectiveCamera
  composer: EffectComposer
  lensPass: ShaderPass
  bloom: UnrealBloomPass
  visual!: PlayerVisual
  mapRoot = new Group()
  combatRoot = new Group()
  diskMat: ShaderMaterial
  starMat!: ShaderMaterial
  nebulaMat!: ShaderMaterial
  introPoints: Points
  introPos = new Float32Array()
  introVel = new Float32Array()
  introHome = new Float32Array()
  fleets: Fleet[] = []
  frags: Frag[] = []
  enemies: Enemy[] = []
  shots: Shot[] = []
  booms: Boom[] = []
  radar: CanvasRenderingContext2D

  dom = {
    intro: must<HTMLDivElement>('intro'),
    introText: must<HTMLParagraphElement>('intro-text'),
    title: must<HTMLDivElement>('title'),
    hud: must<HTMLDivElement>('hud'),
    controls: must<HTMLDivElement>('controls'),
    pause: must<HTMLDivElement>('pause'),
    upgrade: must<HTMLDivElement>('upgrade'),
    gameover: must<HTMLDivElement>('gameover'),
    fade: must<HTMLDivElement>('fade'),
    flash: must<HTMLDivElement>('flash'),
    grav: must<HTMLDivElement>('grav'),
    hurt: must<HTMLDivElement>('hurt'),
    prompt: must<HTMLParagraphElement>('prompt'),
    toast: must<HTMLParagraphElement>('toast'),
    lock: must<HTMLParagraphElement>('lock-hint'),
    vis: must<HTMLDivElement>('vis'),
    cross: must<HTMLDivElement>('crosshair'),
    horizon: must<HTMLSpanElement>('horizon-line'),
    easyTitle: must<HTMLInputElement>('easy-title'),
    easyPause: must<HTMLInputElement>('set-easy'),
    vol: must<HTMLInputElement>('set-vol'),
    sens: must<HTMLInputElement>('set-sens'),
    dead: must<HTMLInputElement>('set-dead'),
    stick: must<HTMLInputElement>('set-stick'),
    upList: must<HTMLDivElement>('up-list'),
    orders: must<HTMLDivElement>('orders'),
    orderList: must<HTMLDivElement>('order-list'),
    upLoot: must<HTMLParagraphElement>('up-loot'),
    upEnergy: must<HTMLParagraphElement>('up-energy'),
    goTitle: must<HTMLHeadingElement>('go-title'),
    goReason: must<HTMLParagraphElement>('go-reason'),
    goScore: must<HTMLElement>('go-score'),
    goKills: must<HTMLElement>('go-kills'),
    goBest: must<HTMLElement>('go-best'),
    levels: must<HTMLParagraphElement>('pa-levels'),
    fatal: must<HTMLParagraphElement>('fatal'),
  }

  constructor() {
    this.save = loadSave()
    this.best = this.save.best
    this.wins = this.save.wins
    this.audio.setVolume(this.save.settings.volume)
    this.audio.musicOn = this.save.settings.music
    const canvasParent = must<HTMLDivElement>('app')
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        alpha: false,
      })
    } catch {
      this.dom.fatal.hidden = false
      throw new Error('WebGL yok')
    }
    this.renderer = renderer
    if (!renderer.getContext()) {
      this.dom.fatal.hidden = false
      throw new Error('WebGL yok')
    }
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.setClearColor(0x03040a, 1)
    renderer.domElement.id = 'view'
    renderer.domElement.tabIndex = 0
    canvasParent.prepend(renderer.domElement)
    this.input = new Input(renderer.domElement)

    this.camera = new PerspectiveCamera(68, 1, 0.08, SKY_RADIUS * 1.2)
    this.camera.position.set(0, 12, 86)

    this.scene.add(new AmbientLight(0xc5d0e4, 0.42))
    this.scene.add(new HemisphereLight(0x8ea0c8, 0x2a140c, 0.55))
    const sun = new DirectionalLight(0xe7eefc, 2.35)
    sun.position.set(48, 32, 18)
    this.scene.add(sun)

    this.buildSky()
    this.diskMat = this.buildDisk()
    this.scene.add(this.mapRoot)
    this.scene.add(this.combatRoot)
    this.combatRoot.visible = false
    this.bhLight = new PointLight(0xff7a3c, 9000, 460, 2)
    this.mapRoot.add(this.bhLight)
    this.syncWalker()
    this.sparks = new Sparks(this.mapRoot)
    this.fx = new Fx(this.scene)
    this.tracers = new Tracers(this.mapRoot)
    const routeGeo = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(0, 0, 1)])
    const routeMat = new LineBasicMaterial({ color: 0x9adfff })
    this.routeLine = new Line(routeGeo, routeMat)
    this.routeLine.frustumCulled = false
    this.routeLine.visible = false
    this.mapRoot.add(this.routeLine)
    this.enemyGates = Array.from({ length: 2 }, () => {
      const mesh = buildWormhole()
      mesh.scale.setScalar(0.48)
      mesh.visible = false
      this.combatRoot.add(mesh)
      return { alive: false, pos: new Vector3(), life: 0, owner: null, to: 'kizil' as UniId, mesh, brought: false }
    })
    this.layoutUniverse('avlu')
    this.showShip('earth')
    this.visual.root.visible = false
    this.wellMesh = this.makeWell(0xffe2b0, 4.1)
    this.scene.add(this.wellMesh)
    this.enemyWells = Array.from({ length: 4 }, () => {
      const mesh = this.makeWell(0xb9a6ff, 3.1)
      this.scene.add(mesh)
      return { alive: false, pos: new Vector3(), life: 0, owner: null, mesh }
    })
    this.buildMotes()
    this.introPoints = this.buildIntro()

    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.lensPass = new ShaderPass(LensShader)
    this.composer.addPass(this.lensPass)
    this.bloom = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.4, 0.45, 0.84)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.patchLens()
    this.layoutUniverse(this.universeId)
    this.applySize()
    this.buildPools()
    this.bindUi()
    this.expose()
    const radar = must<HTMLCanvasElement>('radar').getContext('2d')
    if (!radar) throw new Error('radar yok')
    this.radar = radar
    this.syncSettingsUi()
    this.dom.introText.textContent = LINES[0][1]
    this.lineShown = 0
    window.addEventListener('resize', () => this.applySize())
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.renderer.domElement
      // Diyalog, brifing, emir/diplomasi paneli ya da fotoğraf modu için imleç serbest bırakılınca oyun duraklamaz.
      const panel = this.encounter || this.briefing || this.photo || this.orderOpen || this.cine || !must<HTMLElement>('diplo').classList.contains('hidden') || !must<HTMLElement>('boarding').classList.contains('hidden')
      if (!locked && (this.mode === 'map' || this.mode === 'combat') && !this.suppressPause && !panel) this.pause()
    })
  }

  start() {
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      this.fps = this.fps * 0.92 + (dt > 0 ? 1 / dt : 60) * 0.08
      if (dt > 0.022) this.slow++
      else this.slow = Math.max(0, this.slow - 1)
      // Otomatik çözünürlük: kalabalık savaşta kare süresi uzarsa çözünürlük kademeli düşer, rahatlayınca geri çıkar.
      if (this.slow > 40 && this.pr > 0.62) {
        this.pr = Math.max(0.6, this.pr - 0.15)
        this.applySize()
        this.slow = -240
        this.fastRun = 0
      }
      if (dt < 0.0145) this.fastRun++
      else this.fastRun = 0
      if (this.fastRun > 900 && this.pr < this.prMax - 0.01) {
        this.pr = Math.min(this.prMax, this.pr + 0.15)
        this.applySize()
        this.fastRun = 0
      }
      this.tick(dt)
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  private tick(dt: number) {
    this.clockT += dt
    this.skipLock = Math.max(0, this.skipLock - dt)
    this.diskTime += dt * (this.mode === 'map' ? Math.min(8, 1 / Math.max(0.08, this.tf)) : 1) * 0.35
    for (const worm of this.wormMeshes) tickWormhole(worm, this.clockT, dt)
    this.starMat.uniforms.uTime.value = this.clockT
    this.nebulaMat.uniforms.uTime.value = this.clockT
    this.diskMat.uniforms.uTime.value = this.diskTime
    if (this.fading) {
      // İniş/kalkış/geçiş sırasında motor sesi asılı kalmasın.
      this.audio.setThrust(0)
      this.composer.render()
      this.input.endFrame()
      return
    }
    this.handleGlobalKeys()
    // Dokunmatik düğmeler yalnız oyun sırasında görünür (giriş, menü, seçim ekranında gizli).
    const playing = this.mode === 'map' || this.mode === 'combat'
    if (playing !== this.playingClass) {
      this.playingClass = playing
      document.body.classList.toggle('playing', playing)
    }
    if (this.mode !== 'select' && this.selActive) {
      this.selActive = false
      this.leaveSelectStage()
    }
    if (this.mode === 'intro') this.updateIntro(dt)
    else if (this.mode === 'title' || this.mode === 'gameover') this.updateTitle(dt)
    else if (this.mode === 'select') this.updateSelect(dt)
    else if (this.mode === 'map') this.updateMap(dt)
    else if (this.mode === 'combat') this.updateCombat(dt)
    else if (this.mode === 'upgrade') this.updateUpgrade()
    // Motor sesi yalnız gemide uçarken: yaya, menü, oyun sonu, diyalog ve fotoğrafta susar.
    if (!playing || this.layer !== 'ship' || this.encounter || this.photo || this.holdPose || this.briefing) this.audio.setThrust(0)
    this.updateBooms(dt)
    this.fx.update(dt)
    // Müzik: bulunulan sistemin teması; savaşta ya da üs dalgasında gerilim katmanı.
    if (this.mode === 'map' || this.mode === 'combat') {
      this.audio.setMusicTheme(this.universeId)
      const wave = this.layer === 'foot' && this.units.some((u) => u.alive && u.invader)
      this.audio.setMusicFight(this.fighting() || this.mode === 'combat' ? 1 : wave ? 0.7 : this.vis > 60 ? 0.3 : 0)
    } else this.audio.setMusicFight(0)
    this.tickFeed(dt)
    this.applyPresentation()
    this.updateCamera(dt)
    // Gökyüzü sonsuz uzakta durur: uzak gezegenler küre duvarının arkasında kalmasın.
    this.sky.position.copy(this.camera.position)
    this.stars.position.copy(this.camera.position)
    this.updateLens()
    if (!this.skipRender) this.composer.render()
    this.input.endFrame()
  }

  /** Test kancası: yazılımsal GL'de çizim maliyetini ölçmek için çizimi atlar. */
  skipRender = false
  fx!: Fx
  /** Kovalama kamerasının yumuşak yönelimi ve uzaklığı. */
  camQ = new Quaternion()
  camDist = 9

  private orderWasShip = false
  private handleGlobalKeys() {
    if (this.input.pressed('KeyM')) this.toggleMute()
    const shipOrder = this.input.touchOrder && !this.orderWasShip
    this.orderWasShip = this.input.touchOrder
    if ((this.input.pressed('KeyY') || shipOrder) && this.mode === 'map' && this.layer === 'ship') this.toggleOrders()
    this.paintPlanetCard(1 / 60)
    if (this.input.pressed('KeyJ') && (this.mode === 'map' || this.mode === 'combat')) {
      const j = must<HTMLElement>('journal')
      if (j.classList.contains('hidden')) this.openJournal('quest')
      else j.classList.add('hidden')
    }
    const controlsOpen = !this.dom.controls.classList.contains('hidden')
    const settingsOpen = !must<HTMLElement>('settings').classList.contains('hidden')
    if (this.photo && this.input.pressed('Escape')) {
      this.closePhoto()
      return
    }
    const journalOpen = !must<HTMLElement>('journal').classList.contains('hidden')
    if (this.input.pressed('Escape') && journalOpen) must<HTMLElement>('journal').classList.add('hidden')
    else if (this.input.pressed('Escape') && settingsOpen) this.hideSettings()
    else if (this.input.pressed('Escape')) {
      if (controlsOpen) this.hideControls()
      else if (this.mode === 'pause') this.resume()
      else if (this.mode === 'upgrade') this.continueRun()
      else if (this.briefing) this.closeBriefing()
      else if ((this.mode === 'map' || this.mode === 'combat') && !this.encounter) this.pause()
      else if (this.mode === 'select') this.goTitle()
      else if (this.mode === 'intro') this.skipIntro()
    }
    if (this.mode === 'select' && this.dom.controls.classList.contains('hidden')) {
      if (this.input.pressed('ArrowRight') || this.input.pressed('KeyD')) this.stepOrigin(1)
      if (this.input.pressed('ArrowLeft') || this.input.pressed('KeyA')) this.stepOrigin(-1)
    }
    if (this.input.pressed('Enter')) {
      if (controlsOpen) this.hideControls()
      else if (this.mode === 'title' && this.skipLock <= 0) this.openSelect()
      else if (this.mode === 'select' && !must<HTMLElement>('story').classList.contains('hidden')) must<HTMLButtonElement>('story-go').click()
      else if (this.mode === 'select') this.beginStory()
      else if (this.mode === 'pause') this.resume()
      else if (this.mode === 'upgrade') this.continueRun()
      else if (this.mode === 'gameover') this.startRun()
    }
    if (this.mode === 'intro' && this.input.anyPressed()) this.skipIntro()
  }

  private updateIntro(dt: number) {
    this.introT += dt
    this.syncLine()
    if (this.introT > 5 && !this.bangPlayed) {
      this.bangPlayed = true
      this.audio.bang()
    }
    const flash = this.introT > 4.7 && this.introT < 6.3 ? Math.sin(clamp((this.introT - 4.7) / 1.5, 0, 1) * Math.PI) : 0
    this.dom.flash.style.opacity = String(flash)
    this.stepIntroParticles(dt)
    const p1 = smoothstep(12, 24, this.introT)
    const p2 = smoothstep(24, 36, this.introT)
    this.camera.position.set(lerp(lerp(0, 55, p1), 140, p2), lerp(lerp(12, 30, p1), 54, p2), lerp(lerp(86, 100, p1), 130, p2))
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(0, 0, 0)
    this.diskMat.uniforms.uAlpha.value = smoothstep(18, 26, this.introT)
    if (this.introT > 37.8) this.finishIntro()
  }

  private updateTitle(dt: number) {
    this.titleSpin += dt * 0.065
    const a = this.titleSpin
    this.camera.position.set(Math.cos(a) * 178, 58, Math.sin(a) * 168)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(0, 2, 0)
    this.diskMat.uniforms.uAlpha.value = 1
    if (this.mode === 'title' && this.skipLock <= 0 && this.input.pressed('Space') && this.dom.controls.classList.contains('hidden')) {
      this.openSelect()
    }
  }

  titleSpin = 0.85

  private updateMap(dt: number) {
    this.updatePlanets(dt)
    if (this.cine) {
      this.tickCine(dt)
      this.refreshHud()
      return
    }
    // Karşılaşma diyaloğu ya da fotoğraf modu açıkken dünya durur.
    if (this.holdPose || this.encounter || this.photo || this.briefing) {
      if (this.encounter) this.encounterKeys()
      if (this.briefing && (this.input.pressed('Enter') || this.input.pressed('Space') || this.input.pressed('NumpadEnter'))) this.closeBriefing()
      if (this.layer !== 'foot') {
        this.visual.root.position.copy(this.pos)
        this.visual.root.quaternion.copy(this.quat)
      } else this.poseWalker()
      const sample = this.sampleTime(this.pos)
      this.tf = sample.tf
      this.worldScale = sample.worldScale
      this.refreshHud()
      return
    }
    this.questTick(dt)
    this.tickDiplo(dt)
    spinShip(this.visual.root, dt)
    for (const e of this.escorts) spinShip(e, dt)
    this.transitionLock = Math.max(0, this.transitionLock - dt)
    if (this.route && !this.isHome()) this.ambushCd -= dt
    if (this.route && !this.isHome() && this.ambushCd <= 0 && this.fleets.length < 2 && this.mode === 'map') {
      this.ambushCd = 32
      this.raiseAmbush()
    }
    if (this.layer === 'foot') this.updateFoot(dt)
    else this.flight(dt, true)
    const sample = this.sampleTime(this.pos)
    this.tf = sample.tf
    this.worldScale = sample.worldScale
    const worldDt = dt * this.worldScale
    this.properTime += dt
    this.coordTime += worldDt
    this.accrueIncome(dt)
    this.scoreTick += dt
    if (this.scoreTick >= 3) {
      this.scoreTick = 0
      this.addScore(1)
    }
    this.grace = Math.max(0, this.grace - dt)
    this.gateWarnT = Math.max(0, this.gateWarnT - dt)
    // Eğitimde ev sistemi sakin: keşif gemisi görevine kadar gürültü filo çağırmaz.
    if (this.grace <= 0 && (!this.isHome() || this.tutorialAt('home'))) this.checkBands()
    this.updateFleets(worldDt)
    if (this.layer === 'ship') this.updateSkirmish(dt)
    this.updateEscorts(dt)
    this.keepHomePatrols(dt)
    this.updateLoot(dt)
    this.updateOutpostGuns(dt)
    this.updateFragments(worldDt)
    this.updateShots(dt)
    this.fragTimer += worldDt
    if (this.fragTimer > 6.5 && this.frags.filter((f) => f.alive).length < 12) {
      this.fragTimer = 0
      this.spawnFragment()
    }
    if (this.layer === 'ship' && this.pos.length() > this.mapLimit) this.edgeReturn(dt)
    this.edgeToastCd = Math.max(0, this.edgeToastCd - dt)
    if (this.hazards()) return
    if (this.tipsOn) {
      this.tipT -= dt
      if (this.tipT <= 0 && this.tipI < TIPS.length) {
        this.toast(TIPS[this.tipI])
        this.tipI++
        this.tipT = 6.2
      }
    }
    this.pollGear()
    if (this.layer === 'ship' && this.input.pressed('KeyF')) {
      const near = this.nearestFleet(140)
      if (near && near.fleet.state !== 'leave') {
        const fac = near.fleet.faction
        if (fac) bump(this.relOf(fac), -15)
        near.fleet.talked = true
        this.beginCombat(near.fleet)
      }
    }
    if (this.input.pressed('KeyU')) this.openUpgrades()
    // V: sessiz süzülme, T: tarama (gemide), O: diplomasi, P: fotoğraf modu.
    const silentEdge = this.input.pressed('KeyV') || (this.input.touchSilent && !this.silentWas)
    this.silentWas = this.input.touchSilent
    if (this.layer === 'ship' && silentEdge) this.toggleSilent()
    const scanEdge = (this.layer === 'ship' && this.input.pressed('KeyT')) || (this.input.touchScan && !this.scanWas)
    this.scanWas = this.input.touchScan
    if (scanEdge) this.scan()
    if (this.input.pressed('KeyO')) this.openDiplo()
    this.shipTactics(dt)
    this.raidTick(dt)
    this.bomberTick(dt)
    this.oppTick(dt)
    this.autosave(dt)
    if (this.input.pressed('KeyP')) this.openPhoto()
    if (this.layer === 'ship' && (this.input.pressed('KeyC') || (this.input.touchCam && !this.camWas))) this.toggleCam()
    this.camWas = this.input.touchCam
    if (this.input.pressed('KeyN')) this.toggleRadar()
    if (this.layer === 'ship') this.useAbilities(dt)
    else {
      this.cd1 = Math.max(0, this.cd1 - dt)
      this.cd2 = Math.max(0, this.cd2 - dt)
    }
    this.updateWell(dt)
    this.audio.setMood(this.vis, this.tf)
    this.refreshHud()
  }

  private updateCombat(dt: number) {
    if (this.holdPose) {
      this.visual.root.position.copy(this.pos)
      this.visual.root.quaternion.copy(this.quat)
      for (const e of this.enemies) {
        e.root.position.copy(e.pos)
        e.root.quaternion.copy(e.quat)
      }
      this.refreshHud()
      return
    }
    this.combatTime += dt
    this.flight(dt, false)
    this.tf = 1
    this.worldScale = 1
    this.properTime += dt
    this.coordTime += dt
    this.scoreTick += dt
    if (this.scoreTick >= 3) {
      this.scoreTick = 0
      this.addScore(1)
    }
    if (this.pos.length() > 260) {
      const pull = this.pos.length() - 260
      this.vel.addScaledVector(this.pos, (-pull * 0.8 * dt) / this.pos.length())
    }
    for (const e of this.enemies) this.updateEnemy(e, dt)
    this.updateEscorts(dt)
    this.updateShots(dt)
    this.updateGates(dt)
    if (this.input.pressed('KeyC')) this.toggleCam()
    if (this.input.pressed('KeyF') && this.canFlee()) this.flee()
    this.pollGear()
    this.useAbilities(dt)
    this.updateWell(dt)
    this.audio.setMood(this.vis, 1)
    this.refreshHud()
  }

  private updateUpgrade() {
    if (this.dom.controls.classList.contains('hidden')) {
      const keys: UpId[] = ['hull', 'shield', 'weapon', 'engine', 'stealth']
      keys.forEach((id, i) => {
        if (this.input.pressed(`Digit${i + 1}`)) {
          this.upSlot = id
          this.renderUpgrades()
        }
      })
    }
    this.refreshHud()
  }

  private flight(dt: number, gravity: boolean) {
    this.steer(dt)
    if (this.forceAim && this.enemies.length) this.aimAssist(dt)
    const axes = this.axes(true)
    const move = Math.abs(axes.f) + Math.abs(axes.s) * 0.75 + Math.abs(axes.u) * 0.75
    this.boosting = axes.boost && move > 0.04
    if (this.silent && axes.boost) this.boosting = false
    const quiet = this.silent ? 0.24 : 1
    const thrust = 62 * this.engineMul * (this.boosting ? 2.35 : 1) * quiet
    const strafe = 40 * this.engineMul * (axes.boost && !this.silent ? 1.35 : 1) * quiet
    shipForward(this.quat, vA)
    shipRight(this.quat, vB)
    shipUp(this.quat, vC)
    const coast = move > 0.04 ? 0.05 : 0.2
    this.vel.multiplyScalar(1 - dt * coast)
    this.vel.addScaledVector(vA, axes.f * thrust * 0.9 * dt)
    this.vel.addScaledVector(vB, axes.s * strafe * 0.9 * dt)
    this.vel.addScaledVector(vC, axes.u * strafe * 0.9 * dt)
    if (gravity) this.pullGravity(dt)
    this.powerT = Math.max(0, this.powerT - dt)
    this.applyHeat(dt)
    const cap = this.silent ? Math.min(this.speedCap(), 34) : this.speedCap()
    if (this.vel.length() > cap) this.vel.setLength(cap)
    this.pos.addScaledVector(this.vel, dt)
    this.visual.root.position.copy(this.pos)
    this.visual.root.quaternion.copy(this.quat)

    const firing = (this.input.mouseDown || this.input.touchFire || this.autoFire) && this.fireCd <= 0
    let gain = 0
    if (firing && this.silent) {
      this.silent = false
      this.toast('Ateş ettin: sessiz süzülme bozuldu.')
    }
    if (move > 0.04) gain += (this.silent ? 1.1 : 16) * move * (this.boosting ? 2.15 : 1)
    if (firing) gain += this.weaponNoise()
    // Kendi sisteminde az, yabancı sistemde çok duyulursun.
    gain *= this.stealthMul * this.visMul()
    if (this.cloakT > 0) {
      this.cloakT -= dt
      gain *= 0.12
      this.vis = Math.max(0, this.vis - 12 * dt)
    }
    if (gain > 0.01) this.vis = Math.min(100, this.vis + gain * dt)
    const fade = this.silent ? 10 : this.isHome() ? 8 : this.visMul() < 1 ? 6.5 : 4.5
    if (gain <= 0.01 || this.silent) this.vis = Math.max(0, this.vis - fade * dt)
    this.tickVisNotice()
    this.tickScan(dt)

    this.fireCd = Math.max(0, this.fireCd - dt)
    if (firing) this.firePrimary()
    this.hitCd = Math.max(0, this.hitCd - dt)
    if (this.hitCd <= 0) this.shield = Math.min(this.shieldMax, this.shield + this.regenRate() * dt)
    if (this.isHome() && this.hitCd <= 0) this.hull = Math.min(this.hullMax, this.hull + 1.3 * dt)
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.6)
    this.visual.shieldMat.uniforms.uFlash.value = this.shieldFlash
    this.visual.shieldMat.uniforms.uLevel.value = this.shieldMax > 0 ? this.shield / this.shieldMax : 0
    const throttle = clamp(move, 0, 1) * (this.silent ? 0.25 : 1)
    const showPlume = throttle > 0.01 && this.camMode !== 'cockpit'
    this.visual.plumes.forEach((plume, i) => {
      plume.visible = showPlume
      plume.scale.y = 0.2 + throttle * (this.boosting ? 1.9 : 1.05)
      this.visual.plumeMats[i].opacity = showPlume ? 0.28 + throttle * 0.55 : 0
      this.visual.plumeMats[i].color.set(this.boosting ? 0xfff1e2 : 0xffc49a)
    })
    this.visual.engineLight.intensity = showPlume ? (this.boosting ? 12 : 5) * throttle : 0
    this.muzzleT -= dt
    const muz = this.visual.muzzle.material as SpriteMaterial
    this.visual.muzzle.visible = this.muzzleT > 0 && !this.visual.cockpit.visible
    muz.opacity = this.muzzleT > 0 ? 0.95 : 0
    this.audio.setThrust(throttle * (this.boosting ? 1.45 : 1))
    if (this.hull < 30 && !this.hullWarned) {
      this.hullWarned = true
      this.toast('Gövde kritik.')
    }
    if (this.hull > 55) this.hullWarned = false
  }

  private steer(dt: number) {
    const sens = 0.00185 * this.save.settings.sens
    const follow = 1 - Math.exp(-12 * dt)
    // Bak modu: gemi yavaşken fare/sürükleme gemiyi değil kamerayı döndürür.
    const lookEdge = this.input.touchLook && !this.lookWas
    this.lookWas = this.input.touchLook
    if (lookEdge) {
      this.lookMode = !this.lookMode
      this.toast(this.lookMode ? 'Bak modu: sürükleyerek gemini çevresinden izle. Tekrar bas ya da hızlan: kapanır.' : 'Bak modu kapandı.')
    }
    if (this.lookMode && (this.vel.length() > 8 || this.input.touchFire || this.input.mouseDown)) this.lookMode = false
    document.querySelector('[data-act="look"]')?.classList.toggle('lit', this.lookMode)
    if (this.orbitKey() && this.vel.length() < 8) {
      this.shipOrbitYaw -= this.input.mouseX * 0.004 * this.save.settings.sens
      this.shipOrbitPitch = clamp(this.shipOrbitPitch + this.input.mouseY * 0.004 * this.save.settings.sens, -1.1, 1.1)
      this.input.mouseX = 0
      this.input.mouseY = 0
    } else {
      this.shipOrbitYaw *= Math.exp(-4 * dt)
      this.shipOrbitPitch *= Math.exp(-4 * dt)
    }
    this.yawSm = lerp(this.yawSm, -this.input.mouseX * sens, follow)
    this.pitchSm = lerp(this.pitchSm, -this.input.mouseY * sens * (this.save.settings.invert ? -1 : 1), follow)
    const pitch = this.pitchSm
    let yaw = this.yawSm
    if (this.touchy() && this.input.stickX) {
      const dead = this.save.settings.stickDead
      const a = Math.abs(this.input.stickX)
      if (a > dead) yaw -= Math.sign(this.input.stickX) * ((a - dead) / (1 - dead)) * 1.7 * this.save.settings.stickSens * dt
    }
    // Q/E: basılı tutuldukça sürekli yuvarlanır (takla atarak uçulabilir). Otomatik düzleme yok.
    let roll = 0
    if (this.input.down('KeyQ') || this.input.touchRollL) roll += 2.8 * dt
    if (this.input.down('KeyE') || this.input.touchRollR) roll -= 2.8 * dt
    if (this.save.settings.easy && !roll) {
      qA.setFromAxisAngle(AXIS_Y, yaw)
      this.quat.premultiply(qA)
      qA.setFromAxisAngle(AXIS_X, pitch)
      this.quat.multiply(qA)
      // Kolay modda burun ~80°'den fazla dikleşmez: takla yok, ters dönme yok.
      shipForward(this.quat, vF)
      if (Math.abs(vF.y) > 0.985 && Math.sign(vF.y) === Math.sign(pitch)) {
        qA.setFromAxisAngle(AXIS_X, -pitch)
        this.quat.multiply(qA)
      }
      levelWings(this.quat, dt, 8)
    } else {
      qA.setFromAxisAngle(AXIS_Y, yaw)
      this.quat.multiply(qA)
      qA.setFromAxisAngle(AXIS_X, pitch)
      this.quat.multiply(qA)
      qA.setFromAxisAngle(AXIS_Z, roll)
      this.quat.multiply(qA)
    }
    if (this.enemies.length && !this.forceAim) this.softAim(dt)
    if (this.input.down('KeyR')) this.stabilizeT = 1.15
    if (this.stabilizeT > 0) {
      this.stabilizeT -= dt
      stabilizeFull(this.quat, dt)
    }
    this.quat.normalize()
  }

  private aimAssist(dt: number) {
    const target = this.enemies.find((e) => e.alive)
    if (!target) return
    const dist = vA.subVectors(target.pos, this.pos).length()
    vB.copy(target.pos).addScaledVector(target.vel, dist / 215)
    vC.subVectors(vB, this.pos)
    if (vC.lengthSq() < 1e-6) return
    vC.normalize()
    quatFromForward(qA, vC)
    this.quat.slerp(qA, 1 - Math.exp(-14 * dt))
  }

  private softAim(dt: number) {
    shipForward(this.quat, vA)
    let best: Enemy | null = null
    let bestDot = 0.95
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      vB.subVectors(enemy.pos, this.pos)
      const dist = vB.length()
      if (dist > 170 || dist < 0.5) continue
      vB.multiplyScalar(1 / dist)
      const dot = vA.dot(vB)
      if (dot > bestDot) {
        bestDot = dot
        best = enemy
      }
    }
    this.lockTarget = best
    if (!best) return
    vC.subVectors(best.pos, this.pos).normalize()
    quatFromForward(qA, vC)
    this.quat.slerp(qA, 1 - Math.exp(-2.2 * dt))
  }

  /** Yerinde uzay savaşı: canlı düşman gemisi var mı. */
  private fighting() {
    return this.enemies.some((e) => e.alive)
  }

  private isHome() {
    return this.universeId === homeSystem(this.originId)
  }

  private foreignHome(id: UniId) {
    if (id === homeSystem(this.originId)) return false
    return ORIGINS.some((origin) => homeSystem(origin.id) === id)
  }

  private raiseAmbush() {
    this.ambushes += 1
    this.ambushCd = 32
    const at = this.pos.clone().add(new Vector3(36, 8, -28))
    this.spawnFleet(2, 1, at, 'hunt')
    this.toast('Pusu. Bu sistemin avcıları yola çıktı.')
  }

  /** Kendi ekseninde dönüş: yüzey hızı sabit (~2,4 birim/sn). Sabit açısal hız büyük gezegenlerde
   * yüzeyi (ve üstündeki karakolları) saniyede 30–60 birim akıtıyordu. */
  private spinRateOf(radius: number) {
    return Math.min(0.12, 2.4 / Math.max(1, radius))
  }

  /** Tükenen yatakların yeniden dolma zamanı (oyun saati). */
  regrow = new Map<string, number>()
  private regrowT = 0
  private regrowDeposits() {
    for (const [key, at] of this.regrow) {
      if (this.clockT < at) continue
      this.regrow.delete(key)
      this.mined.delete(key)
      for (const p of this.planets)
        for (const d of p.deposits)
          if (d.key === key) {
            d.left = d.kind === 'ore' ? 5 : 3
            d.obj.visible = true
            d.obj.scale.setScalar(1.7)
          }
    }
  }

  private updatePlanets(dt: number) {
    this.regrowT -= dt
    if (this.regrowT <= 0) {
      this.regrowT = 3
      if (this.regrow.size) this.regrowDeposits()
    }
    for (const planet of this.planets) {
      // Üstünde yürüdüğün gezegen kendi ekseninde dönmez: üs, taretler ve yürüyüş aynı zeminde kalır.
      const standing = this.layer === 'foot' && this.footPlanet === planet
      if (!standing) planet.spin += dt * planet.spinRate
      const a = this.clockT * planet.rate
      const x = planet.anchor.x
      const z = planet.anchor.z
      const c = Math.cos(a)
      const s = Math.sin(a)
      planet.mesh.position.set(x * c - z * s, planet.anchor.y, x * s + z * c)
      planet.mesh.rotation.y = planet.spin
      tickPlanet(planet.mesh, planet.mesh.children[0] as Mesh, SUN_FAR, this.clockT, dt)
    }
  }

  private stepRig(rig: Rig, speed: number, jumping: boolean, punch: number) {
    const moving = speed > 0.25 && !jumping
    const t = this.clockT + (rig.root.id % 17) * 0.37 // her gövde biraz farklı fazda
    const st = rig.style
    const freq = st === 'waddle' ? 3.4 : st === 'hop' ? 6.5 : st === 'purple' ? 4.6 : st === 'stalk' ? 2.8 : st === 'float' ? 3 : 8
    const amp = st === 'waddle' ? 0.38 : st === 'hop' ? 1.05 : st === 'stalk' ? 0.55 : st === 'float' ? 0.22 : 0.72
    const swing = moving ? Math.sin(t * freq) * amp : 0
    rig.legL.rotation.x = jumping ? -0.95 : swing
    rig.legR.rotation.x = jumping ? -0.95 : -swing
    rig.legL.rotation.z = st === 'waddle' ? 0.4 : 0
    rig.legR.rotation.z = st === 'waddle' ? -0.4 : 0
    const form = rig.root.userData.form as string | undefined
    const punchK = punch > 0 && !form ? Math.sin(clamp(1 - punch / 0.36, 0, 1) * Math.PI) : 0
    const reach = st === 'stalk' ? 0.35 : 0 // Gölge kollarını hep biraz önde tutar
    rig.armL.rotation.x = jumping ? -1.2 : -swing * 0.8 - reach
    rig.armR.rotation.x = punchK > 0.04 ? -1.6 * punchK : jumping ? -1.2 : swing * 0.8 - reach
    rig.head.rotation.x = jumping ? -0.25 : 0
    rig.head.rotation.z = (st === 'waddle' || st === 'purple') && moving ? Math.sin(t * freq) * 0.18 : 0
    const hips = rig.hips
    if (hips) {
      const bounce = Math.abs(Math.sin(t * freq))
      let y = FEET
      if (st === 'hop') y += moving ? bounce * 0.3 : Math.abs(Math.sin(t * 2.2)) * 0.04
      else if (st === 'float') y += 0.26 + Math.sin(t * 2.1) * 0.08
      else if (moving) y += bounce * (st === 'stalk' ? 0.05 : 0.06)
      hips.position.y = y
      hips.rotation.x = st === 'stalk' ? 0.14 + (moving ? 0.08 : 0) : 0
      hips.rotation.z = st === 'waddle' && moving ? Math.sin(t * freq) * 0.12 : 0
      const breathe = 1 + Math.sin(t * 2.4) * 0.025
      hips.scale.set(1, breathe, 1)
    }
    // Taban poz: saldırı animasyonunun değiştirdiği eksenleri sıfırla.
    rig.armL.rotation.z = 0
    rig.armR.rotation.z = 0
    rig.armL.scale.set(1, 1, 1)
    rig.armR.scale.set(1, 1, 1)
    if (hips) {
      hips.rotation.y = 0
      hips.position.z = 0
    }
    if (punch > 0) this.attackPose(rig, clamp(1 - punch / 0.36, 0, 1))
    const cape = rig.root.userData.cape as Group[] | undefined
    if (cape) {
      // Kumaş: hıza göre arkaya savrulur, bölümden bölüme gecikmeli dalga ilerler; yanlara hafif salınır.
      const flare = moving ? 0.22 + Math.min(1, speed / 6) * 0.35 : 0.04
      cape.forEach((seg, k) => {
        const wave = Math.sin(t * (moving ? 6.5 : 2.2) - k * 0.95) * (moving ? 0.16 : 0.05) * (0.6 + k * 0.2)
        seg.rotation.x = (k === 0 ? flare : flare * 0.35) + wave
        seg.rotation.z = Math.sin(t * (moving ? 3.2 : 1.4) - k * 0.7) * (moving ? 0.05 : 0.02) * (k + 1) * 0.5
      })
    }
    if (rig.wiggle) {
      rig.wiggle.forEach((obj, k) => {
        if (obj.userData.wz === undefined) obj.userData.wz = obj.rotation.z
        obj.rotation.z = (obj.userData.wz as number) + Math.sin(t * (moving ? 7 : 3) + k * 1.3) * (moving ? 0.22 : 0.1)
      })
    }
  }



  /** Irka özgü saldırı: p = 0 (başlangıç) → 1 (bitiş). Kurulma (wind) ve vuruş (strike) eğrileri. */
  private attackPose(rig: Rig, p: number) {
    const form = rig.root.userData.form as string | undefined
    const hips = rig.hips
    const wind = p < 0.4 ? Math.sin((p / 0.4) * Math.PI * 0.5) * (p < 0.4 ? 1 : 0) : Math.max(0, 1 - (p - 0.4) / 0.2)
    const strike = p < 0.35 ? 0 : Math.sin(clamp((p - 0.35) / 0.65, 0, 1) * Math.PI)
    const both = (x: number) => {
      rig.armL.rotation.x = x
      rig.armR.rotation.x = x
    }
    switch (form) {
      case 'astronaut': // düz yumruk: geri çek, gövdeyi çevirip vur
        rig.armR.rotation.x = 0.8 * wind - 1.9 * strike
        rig.armL.rotation.x = 0.5 * strike
        if (hips) {
          hips.rotation.y = -0.35 * wind + 0.45 * strike
          hips.position.z = 0.15 * strike
        }
        break
      case 'colonist': // iki elle tepeden balyoz
        both(-2.8 * wind * (1 - strike) - 0.5 * strike)
        if (hips) hips.rotation.x = -0.15 * wind + 0.35 * strike
        break
      case 'shade': { // atılıp ısırır, pençeyle savurur
        if (hips) {
          hips.rotation.x += -0.15 * wind + 0.32 * strike
          hips.position.z = 0.4 * strike
        }
        rig.head.rotation.x = -0.45 * wind + 0.35 * strike
        const jaw = rig.head.getObjectByName('jaw')
        if (jaw) {
          if (jaw.userData.y0 === undefined) jaw.userData.y0 = jaw.position.y
          jaw.position.y = (jaw.userData.y0 as number) - 0.16 * wind * (1 - strike)
        }
        both(-1.4 * strike)
        rig.armL.rotation.z = 0.5 * strike
        rig.armR.rotation.z = -0.5 * strike
        break
      }
      case 'bighead': // kafa atar
        if (hips) {
          hips.rotation.x = -0.18 * wind + 0.3 * strike
          hips.position.z = 0.25 * strike
        }
        rig.head.rotation.x = -0.25 * wind + 0.45 * strike
        both(0.6 * strike)
        break
      case 'crystal': // dönerek keser
        if (hips) hips.rotation.y = p * Math.PI * 2
        rig.armL.rotation.z = 1.3 * Math.max(wind, strike)
        rig.armR.rotation.z = -1.3 * Math.max(wind, strike)
        break
      case 'belly': // göbekle iter
        if (hips) {
          hips.position.z = -0.15 * wind + 0.5 * strike
          hips.scale.set(1 + 0.18 * strike, 1 - 0.14 * strike + 0.06 * wind, 1 + 0.2 * strike)
          hips.rotation.x = -0.25 * wind + 0.1 * strike
        }
        both(0.5 * wind)
        break
      case 'sprout': // sarmaşık kırbaç: kol uzar ve yandan çarpar
        rig.armR.rotation.z = -1.5 * wind + 1.4 * strike
        rig.armR.rotation.x = -1.3 * strike
        rig.armR.scale.set(1, 1 + 1.1 * strike, 1)
        if (hips) hips.rotation.y = 0.3 * wind - 0.3 * strike
        break
      case 'golem': // iki yumrukla yeri döver
        both(-3.0 * wind * (1 - strike) - 0.4 * strike)
        if (hips) {
          hips.position.y += 0.22 * wind * (1 - strike)
          hips.rotation.x = 0.45 * strike
          hips.scale.set(1 + 0.12 * strike, 1 - 0.12 * strike, 1 + 0.12 * strike)
        }
        break
      case 'regal': // asasını kaldırıp büyü yapar, süzülür
        rig.armR.rotation.x = -2.6 * Math.max(wind, strike)
        rig.armL.rotation.x = -0.8 * strike
        rig.head.rotation.x = -0.25 * wind
        if (hips) hips.position.y += 0.25 * Math.max(wind, strike)
        break
      case 'yeti': // kükreyip iki kolla ezer
        both(-2.5 * wind * (1 - strike) - 1.1 * strike)
        rig.head.rotation.x = -0.5 * wind + 0.2 * strike
        if (hips) hips.rotation.x = -0.2 * wind + 0.4 * strike
        break
      case 'wild': // sıçrayıp pençeler
        if (hips) {
          hips.position.z = 0.55 * strike
          hips.position.y += 0.35 * Math.sin(strike * Math.PI * 0.5) * (1 - p)
          hips.rotation.x = -0.3 * wind + 0.4 * strike
        }
        both(-1.5 * strike - 0.4 * wind)
        break
      default:
        rig.armR.rotation.x = -1.6 * Math.sin(p * Math.PI)
    }
  }

  /** Saldırı başında ırka özgü ses (bkz. audio.attackFx). */
  private attackSound(rig: Rig, at: Vector3, scale = 1) {
    const form = (rig.root.userData.form as string | undefined) ?? 'wild'
    this.audio.attackFx(form, this.earGain(at) * scale, Boolean(rig.root.userData.minion))
  }



  /* ---------- Fotoğraf modu ---------- */

  openPhoto() {
    if (this.photo || (this.mode !== 'map' && this.mode !== 'combat')) return
    this.photo = true
    document.body.classList.add('photo')
    must<HTMLElement>('photo-ui').classList.remove('hidden')
    this.photoDist = this.layer === 'foot' ? 9 : 18
    this.photoYaw = 0
    this.photoPitch = 0.25
    if (document.pointerLockElement) document.exitPointerLock()
    this.bindPhotoInput()
    this.questEvent('photo')
  }

  closePhoto() {
    if (!this.photo) return
    this.photo = false
    document.body.classList.remove('photo')
    must<HTMLElement>('photo-ui').classList.add('hidden')
    this.renderer.domElement.style.filter = ''
    this.snapCamera = true
  }

  private photoBound = false

  /** Fotoğraf modunda sürükleme (döndür), tekerlek ve iki parmak (yakınlaş). */
  private bindPhotoInput() {
    if (this.photoBound) return
    this.photoBound = true
    const el = this.renderer.domElement
    const pts = new Map<number, { x: number; y: number }>()
    let pinch = 0
    el.addEventListener('pointerdown', (e) => {
      if (!this.photo) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    })
    window.addEventListener('pointermove', (e) => {
      if (!this.photo || !pts.has(e.pointerId)) return
      const p = pts.get(e.pointerId) as { x: number; y: number }
      if (pts.size === 1) {
        this.photoYaw -= (e.clientX - p.x) * 0.008
        this.photoPitch = clamp(this.photoPitch + (e.clientY - p.y) * 0.006, -1.2, 1.4)
      }
      p.x = e.clientX
      p.y = e.clientY
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) this.photoDist = clamp(this.photoDist * (pinch / d), 3, 120)
        pinch = d
      }
    })
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = 0
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener(
      'wheel',
      (e) => {
        if (!this.photo) return
        e.preventDefault()
        this.photoDist = clamp(this.photoDist * (1 + Math.sign(e.deltaY) * 0.1), 3, 120)
      },
      { passive: false },
    )
  }

  private photoCamera() {
    const target = this.pos
    const up = vA
    if (this.layer === 'foot' && this.footPlanet) up.copy(this.pos).sub(this.footPlanet.pos).normalize()
    else shipUp(this.quat, up)
    const fwd = vB
    if (this.layer === 'foot') fwd.copy(this.footView)
    else shipForward(this.quat, fwd)
    fwd.addScaledVector(up, -fwd.dot(up)).normalize()
    vC.copy(fwd).multiplyScalar(-1).applyAxisAngle(up, this.photoYaw)
    vD.crossVectors(up, vC).normalize()
    vC.applyAxisAngle(vD, -this.photoPitch)
    this.camera.position.copy(target).addScaledVector(vC, this.photoDist)
    this.camera.up.copy(up)
    this.camera.lookAt(target)
  }

  private static FILTERS = [
    { name: 'Normal', css: '' },
    { name: 'Sinematik', css: 'contrast(1.15) saturate(1.25) sepia(0.12)' },
    { name: 'Neon', css: 'saturate(1.9) contrast(1.1) brightness(1.05)' },
    { name: 'Siyah-beyaz', css: 'grayscale(1) contrast(1.25)' },
  ]

  cyclePhotoFilter() {
    this.photoFilter = (this.photoFilter + 1) % Game.FILTERS.length
    const f = Game.FILTERS[this.photoFilter]
    this.renderer.domElement.style.filter = f.css
    this.domSet('photo-filter', `Filtre: ${f.name}`)
  }

  /** O anki kareyi (filtreyle) PNG olarak indir. */
  savePhoto() {
    this.composer.render()
    const src = this.renderer.domElement
    const out = document.createElement('canvas')
    out.width = src.width
    out.height = src.height
    const g = out.getContext('2d')
    if (!g) return
    g.filter = Game.FILTERS[this.photoFilter].css || 'none'
    g.drawImage(src, 0, 0)
    g.filter = 'none'
    g.font = `${Math.round(out.height * 0.022)}px sans-serif`
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.textAlign = 'right'
    g.fillText('Sessiz Yörünge', out.width - 16, out.height - 16)
    const a = document.createElement('a')
    a.download = `sessiz-yorunge-${Date.now()}.png`
    a.href = out.toDataURL('image/png')
    a.click()
    this.toast('Fotoğraf kaydedildi.')
    this.audio.ui()
  }

  /* ---------- Diplomasi ve karşılaşmalar ---------- */

  relOf(id: OriginId): Relation {
    let r = this.rel[id]
    if (!r) {
      r = newRelation()
      this.rel[id] = r
    }
    return r
  }

  /** Filonun ırkı: bu sistem bir ırkın eviyse o ırk, değilse komşu sistemlerden biri. */
  private fleetFaction(): OriginId {
    const owner = ORIGINS.find((o) => homeSystem(o.id) === this.universeId)?.id
    if (owner && owner !== this.originId) return owner
    const links = UNIVERSES[this.universeId].holes.filter((h) => h.kind === 'worm' && h.to).map((h) => h.to as UniId)
    const near = ORIGINS.filter((o) => o.id !== this.originId && links.includes(homeSystem(o.id))).map((o) => o.id)
    const pool = near.length ? near : ORIGINS.filter((o) => o.id !== this.originId).map((o) => o.id)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /** Oyuncu gücü / filo gücü: gövde + silah + gemi parçaları kabaca. */
  private powerRatio(fleet: Fleet) {
    const mine = (this.hullMax + this.shieldMax) * (1 + 0.15 * (this.up.weapon - 1))
    const theirs = 90 * fleet.count * (1 + fleet.threat * 0.5)
    return mine / Math.max(1, theirs)
  }

  /** Aynı ırkla 3 dakika içinde konuşulduysa ya da savaştaysanız diyalog yeniden açılmaz: doğrudan çatışma. */
  private talkedRecently(fac: OriginId) {
    const r = this.relOf(fac)
    // İlk karşılaşma her zaman konuşma; savaştaysanız hiç konuşulmaz (diplomasi panelinden ateşkes teklif edilir).
    if (!r.known) return false
    if (stance(r) === 'savaş') return true
    const t = this.lastTalk[fac]
    return t !== undefined && this.clockT - t < 600
  }

  lastTalk: Partial<Record<OriginId, number>> = {}
  encSel = 0

  private openEncounter(fleet: Fleet) {
    const fac = fleet.faction as OriginId
    this.lastTalk[fac] = this.clockT
    // Fare imleci serbest kalsın: seçim için Esc'ye basmak gerekmesin.
    this.input.exitLock()
    this.encSel = 0
    const r = this.relOf(fac)
    const first = !r.known
    r.known = true
    this.encounter = { fleet, faction: fac }
    fleet.talked = true
    const p = PERSONA[fac]
    this.domSet('enc-race', `${factionName(fac)} · ${fleet.count} gemi`)
    this.racePreview(first ? fac : null)
    {
      // İlk karşılaşma: ırk tanıtım kartı (gelişmişlik, gemiler, savaş biçimi, caydırıcı yetenek).
      const w = WAR[fac]
      const box = must<HTMLElement>('enc-intro')
      box.classList.toggle('hidden', !first)
      if (first) {
        const hex = `#${w.color.toString(16).padStart(6, '0')}`
        box.innerHTML = `<b>İlk karşılaşma · ${factionName(fac)}</b><span class="tier ${w.tier}">${w.tier}</span>
          <div><span class="swatch" style="background:${hex}"></span>Gemiler: ${w.fleet}</div>
          <div>Savaş biçimi: ${w.tactic}</div>
          ${w.deterrent ? `<div class="warn">⚠ ${w.deterrent}</div>` : '<div class="fine">Caydırıcı özel silahları yok.</div>'}`
      }
    }
    this.domSet('enc-leader', p.leader)
    this.domSet('enc-line', r.rel >= 10 ? p.warm : r.rel <= -30 ? p.angry : p.greet)
    this.domSet('enc-stance', `${stance(r)} · ilişki ${Math.round(r.rel)}`)
    const ratio = this.powerRatio(fleet)
    this.domSet('enc-power', ratio > 1.3 ? 'Senden zayıflar' : ratio < 0.75 ? 'Senden güçlüler' : 'Güçleriniz denk')
    const pay = 12 * fleet.count
    const set = (id: string, label: string, ok = true) => {
      const b = must<HTMLButtonElement>(id)
      b.textContent = label
      b.disabled = !ok
    }
    set('enc-peace', 'Barış teklif et')
    set('enc-pay', `Haraç öde (${pay} enerji değeri)`)
    set('enc-demand', ratio > 1.15 ? 'Haraç iste' : 'Haraç iste (riskli)')
    set('enc-trade', 'Ticaret yap', r.rel >= 0)
    set('enc-attack', 'Saldır')
    set('enc-flee', 'Geri çekil')
    must<HTMLElement>('enc-trade-box').classList.add('hidden')
    must<HTMLElement>('enc-choices').classList.remove('hidden')
    must<HTMLElement>('enc-after').classList.add('hidden')
    must<HTMLElement>('encounter').classList.remove('hidden')
    this.paintEncSel()
    if (first) this.feed('✦', `Yeni tür: ${factionName(fac)}`, 'info')
    this.questEvent('meet')
    this.audio.warning()
  }

  encounterChoose(choice: Choice) {
    const enc = this.encounter
    if (!enc) return
    const p = PERSONA[enc.faction]
    const r = this.relOf(enc.faction)
    if (choice === 'trade') {
      this.renderTrade()
      must<HTMLElement>('enc-trade-box').classList.remove('hidden')
      must<HTMLElement>('enc-choices').classList.add('hidden')
      return
    }
    if (choice === 'pay') {
      // Haraç enerjiyle, yetmezse madenle (4) ve kristalle (9) ödenir.
      const price = 12 * enc.fleet.count
      if (this.energy + this.ore * 4 + this.crystal * 9 < price) {
        this.domSet('enc-line', `Bu kadar kaynağın yok: ${price} enerji değeri gerekir (maden 4, kristal 9 sayılır).`)
        this.audio.ui()
        return
      }
    }
    const out = resolve(choice, p, r, this.powerRatio(enc.fleet), enc.fleet.count, Math.random())
    bump(r, out.rel)
    if (out.cost?.energy) {
      let due = out.cost.energy
      const e = Math.min(this.energy, due)
      this.energy -= e
      due -= e
      const o = Math.min(this.ore, Math.ceil(due / 4))
      this.ore -= o
      due -= o * 4
      if (due > 0) this.crystal = Math.max(0, this.crystal - Math.ceil(due / 9))
    }
    if (out.gain) this.addRes(out.gain)
    this.domSet('enc-line', out.line)
    this.domSet('enc-stance', `${stance(r)} · ilişki ${Math.round(r.rel)}`)
    const fleet = enc.fleet
    let next = ''
    if (out.fight) {
      next = 'Çatışma başlıyor!'
      this.encounterAfter = () => this.beginCombat(fleet)
    } else if (out.leave) {
      fleet.state = 'leave'
      next = out.gain ? `Kazandın: ${this.resText(out.gain)}` : 'Filo yoluna devam ediyor.'
      this.encounterAfter = null
    } else if (out.escape) {
      fleet.state = 'search'
      fleet.lastKnown.copy(this.pos).add(new Vector3(60, 0, 60))
      this.vis = Math.max(0, this.vis - 30)
      this.cloakT = Math.max(this.cloakT, 3)
      this.silent = true
      next = 'Geri çekildin. Sessiz süzülmeye geçtin; izini kaybettirmeye çalış.'
      this.encounterAfter = null
    }
    this.domSet('enc-next', next)
    must<HTMLElement>('enc-choices').classList.add('hidden')
    must<HTMLElement>('enc-after').classList.remove('hidden')
    this.questEvent('diplo')
  }

  encounterAfter: (() => void) | null = null

  /** Diyalog klavyeyle: 1–6 doğrudan seçer, oklar gezer, Enter/Boşluk onaylar. */
  private encounterKeys() {
    const after = !document.getElementById('enc-after')?.classList.contains('hidden')
    const trade = !document.getElementById('enc-trade-box')?.classList.contains('hidden')
    const i = this.input
    const ok = i.pressed('Enter') || i.pressed('Space') || i.pressed('NumpadEnter')
    if (after) {
      if (ok || i.pressed('Escape')) this.closeEncounter()
      return
    }
    if (trade) {
      if (ok || i.pressed('Escape')) must<HTMLButtonElement>('enc-trade-done').click()
      return
    }
    const ids = ['enc-peace', 'enc-trade', 'enc-pay', 'enc-demand', 'enc-attack', 'enc-flee']
    for (let k = 0; k < 6; k++) {
      if (i.pressed(`Digit${k + 1}`) || i.pressed(`Numpad${k + 1}`)) {
        const b = must<HTMLButtonElement>(ids[k])
        if (!b.disabled) b.click()
        return
      }
    }
    let sel = this.encSel
    if (i.pressed('ArrowRight') || i.pressed('KeyD')) sel = sel % 2 === 0 ? sel + 1 : sel
    if (i.pressed('ArrowLeft') || i.pressed('KeyA')) sel = sel % 2 === 1 ? sel - 1 : sel
    if (i.pressed('ArrowDown') || i.pressed('KeyS')) sel = Math.min(5, sel + 2)
    if (i.pressed('ArrowUp') || i.pressed('KeyW')) sel = Math.max(0, sel - 2)
    if (sel !== this.encSel) {
      this.encSel = sel
      this.paintEncSel()
    }
    if (ok) {
      const b = must<HTMLButtonElement>(ids[this.encSel])
      if (!b.disabled) b.click()
    }
  }

  private paintEncSel() {
    const ids = ['enc-peace', 'enc-trade', 'enc-pay', 'enc-demand', 'enc-attack', 'enc-flee']
    ids.forEach((id, k) => {
      const b = must<HTMLButtonElement>(id)
      b.classList.toggle('kbd', k === this.encSel)
      const label = b.textContent?.replace(/^\d · /, '') ?? ''
      b.textContent = `${k + 1} · ${label}`
    })
  }

  closeEncounter() {
    this.racePreview(null)
    must<HTMLElement>('encounter').classList.add('hidden')
    if (!this.touchy()) this.input.requestLock()
    const after = this.encounterAfter
    this.encounter = null
    this.encounterAfter = null
    after?.()
  }

  private renderTrade() {
    const enc = this.encounter
    const fac = enc?.faction
    if (!fac) return
    const p = PERSONA[fac]
    const r = this.relOf(fac)
    const box = must<HTMLElement>('enc-trade-rows')
    box.innerHTML = ''
    const row = (label: string, ok: boolean, fn: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.disabled = !ok
      b.addEventListener('click', () => {
        fn()
        bump(r, 1)
        this.renderTrade()
      })
      box.append(b)
    }
    const ore = price(p, r, 'ore')
    const cry = price(p, r, 'crystal')
    row(`5 maden al (${ore * 5} enerji)`, this.energy >= ore * 5, () => {
      this.energy -= ore * 5
      this.ore += 5
    })
    row(`2 kristal al (${cry * 2} enerji)`, this.energy >= cry * 2, () => {
      this.energy -= cry * 2
      this.crystal += 2
    })
    row(`5 maden sat (+${Math.round(ore * 5 * 0.7)} enerji)`, this.ore >= 5, () => {
      this.ore -= 5
      this.energy += Math.round(ore * 5 * 0.7)
    })
    row(`2 kristal sat (+${Math.round(cry * 2 * 0.7)} enerji)`, this.crystal >= 2, () => {
      this.crystal -= 2
      this.energy += Math.round(cry * 2 * 0.7)
    })
    this.domSet('enc-wallet', `Sende: ${Math.floor(this.energy)} enerji · ${this.ore} maden · ${this.crystal} kristal`)
  }

  addRes(g: { energy?: number; ore?: number; crystal?: number }) {
    if (g.energy) this.energy += g.energy
    if (g.ore) this.ore += g.ore
    if (g.crystal) this.crystal += g.crystal
  }

  private resText(g: { energy?: number; ore?: number; crystal?: number }) {
    return [g.energy ? `${g.energy} enerji` : '', g.ore ? `${g.ore} maden` : '', g.crystal ? `${g.crystal} kristal` : ''].filter(Boolean).join(' · ')
  }

  diploT = 0

  /** Ticaret ve ittifak gelirleri, soğuma süreleri (dakikada bir). */
  private tickDiplo(dt: number) {
    for (const r of Object.values(this.rel)) if (r) r.cool = Math.max(0, r.cool - dt)
    this.diploT += dt
    if (this.diploT < 60) return
    this.diploT = 0
    for (const [id, r] of Object.entries(this.rel) as [OriginId, Relation][]) {
      if (r?.vassal) {
        // Sömürge haracı; ilişki yavaşça düşer, çok düşerse ayaklanma.
        const g = { energy: 15, ore: 3 }
        this.addRes(g)
        bump(r, -2)
        this.feed('♛', `${factionName(id)} haracı: +${this.resText(g)}`, 'good')
        if (r.rel < -15 && Math.random() < 0.3) {
          r.vassal = false
          bump(r, -30)
          this.feed('⚠', `${factionName(id)} ayaklandı! Artık sömürgen değil.`, 'bad')
          this.toast(`⚠ ${factionName(id)} ayaklandı ve bağımsızlığını ilan etti.`)
        }
        continue
      }
      if (!r?.trade) continue
      const p = PERSONA[id]
      const g = p.sells === 'ore' ? { ore: 4 } : p.sells === 'crystal' ? { crystal: 1 } : { energy: 12 }
      this.addRes(g)
      this.feed('⇄', `${factionName(id)} ticareti: +${this.resText(g)}`, 'good')
    }
  }

  openDiplo() {
    if (this.mode !== 'map' && this.mode !== 'combat') return
    this.input.exitLock()
    this.renderDiplo()
    must<HTMLElement>('diplo').classList.remove('hidden')
  }

  private renderDiplo() {
    const list = must<HTMLElement>('diplo-list')
    list.innerHTML = ''
    const order = [...ORIGINS].sort((a, b) => Number(this.relOf(b.id).known) - Number(this.relOf(a.id).known))
    for (const o of order) {
      if (o.id === this.originId) continue
      const r = this.relOf(o.id)
      const card = document.createElement('div')
      card.className = `diplo-card ${r.known ? '' : 'unknown'}`
      const head = document.createElement('div')
      head.className = 'diplo-head'
      const name = document.createElement('strong')
      name.textContent = r.known ? factionName(o.id) : '???'
      const st = document.createElement('span')
      st.className = `stance s-${stance(r)}`
      st.textContent = r.known ? stance(r) : 'bilinmiyor'
      head.append(name, st)
      card.append(head)
      if (!r.known) {
        const p = document.createElement('p')
        p.className = 'fine'
        p.textContent = 'Henüz karşılaşmadınız. Filolarıyla karşılaşınca tanışırsınız.'
        card.append(p)
        list.append(card)
        continue
      }
      const leader = document.createElement('p')
      leader.className = 'fine'
      leader.textContent = `${PERSONA[o.id].leader} · ilişki ${Math.round(r.rel)}`
      const bar = document.createElement('div')
      bar.className = 'rel-bar'
      const fill = document.createElement('i')
      fill.style.left = r.rel < 0 ? `${50 + r.rel / 2}%` : '50%'
      fill.style.width = `${Math.abs(r.rel) / 2}%`
      fill.className = r.rel < 0 ? 'neg' : 'pos'
      bar.append(fill)
      const acts = document.createElement('div')
      acts.className = 'diplo-acts'
      const act = (label: string, ok: boolean, fn: () => void) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = label
        b.disabled = !ok
        b.addEventListener('click', () => {
          fn()
          this.renderDiplo()
          this.questEvent('diplo')
        })
        acts.append(b)
      }
      act('Hediye (30 enerji)', this.energy >= 30 && r.cool <= 0, () => {
        this.energy -= 30
        bump(r, 8)
        r.cool = 30
        r.trust = Math.min(100, r.trust + 4)
        this.toast(`${factionName(o.id)}: "${PERSONA[o.id].warm}"`)
      })
      act(r.trade ? 'Ticaret anlaşması var' : 'Ticaret anlaşması', !r.trade && r.rel >= 25, () => {
        r.trade = true
        this.toast(`${factionName(o.id)} ile ticaret anlaşması imzalandı: dakikada bir kaynak gelir.`)
      })
      act(r.ally ? 'Müttefiksiniz' : 'İttifak öner', !r.ally && r.trade && r.rel >= 55, () => {
        r.ally = true
        this.toast(`${factionName(o.id)} artık müttefikin. Filoları seni avlamaz, üslerine saldırmazlar.`)
      })
      act('Haraç iste', r.cool <= 0 && !r.ally, () => {
        r.cool = 45
        const theirs = Object.values(this.colonies).filter((c) => c && c.owner === o.id).length
        const mine = this.colonyCount()
        if (mine > theirs && Math.random() < 0.5 + (mine - theirs) * 0.1 - PERSONA[o.id].pride * 0.3) {
          const g = { energy: 25, ore: 6 }
          this.addRes(g)
          bump(r, -20)
          this.toast(`${factionName(o.id)} haraç ödedi: +${this.resText(g)}. Seni unutmayacaklar.`)
        } else {
          bump(r, -15)
          this.toast(`${factionName(o.id)}: "${PERSONA[o.id].angry}"`)
        }
      })
      const theirs = Object.values(this.colonies).filter((c) => c && c.owner === o.id).length
      const mineN = this.colonyCount()
      if (stance(r) === 'savaş') {
        const cost = { energy: 40 + Math.max(0, theirs - mineN) * 15, ore: 4, crystal: 0 }
        const chance = clamp(0.35 + (mineN - theirs) * 0.1 + (r.rel + 30) / 150 - PERSONA[o.id].pride * 0.2, 0.1, 0.9)
        act(`Ateşkes teklif et (${this.costText(cost)} · şans %${Math.round(chance * 100)})`, r.cool <= 0 && this.canPay(cost), () => {
          r.cool = 45
          if (Math.random() < chance) {
            this.energy -= cost.energy
            this.ore -= cost.ore
            r.rel = -10
            r.trust = Math.min(100, r.trust + 5)
            for (const f of this.fleets) if (f.faction === o.id && f.state !== 'leave') f.state = 'leave'
            this.toast(`${factionName(o.id)} ateşkesi kabul etti: haraç ödendi, filoları geri çekiliyor. İlişki artık gergin.`)
          } else {
            bump(r, -4)
            this.toast(`${factionName(o.id)} ateşkesi reddetti: "${PERSONA[o.id].angry}" (bedel ödenmedi)`)
          }
        })
      }
      act(r.vassal ? 'Sömürgen' : `Sömürge yap (senin ${mineN} – onların ${theirs} üs)`, !r.vassal && !r.ally && r.cool <= 0 && mineN >= theirs + 2, () => {
        r.cool = 60
        // Güçlüysen boyun eğerler; gururlu ırklar direnir.
        const chance = 0.35 + (mineN - theirs) * 0.12 - PERSONA[o.id].pride * 0.35 + r.rel / 200
        if (Math.random() < chance) {
          r.vassal = true
          r.trade = false
          bump(r, -5)
          this.toast(`${factionName(o.id)} sana boyun eğdi: artık sömürgen. Her dakika haraç öder; ama ilişki çok kötüleşirse ayaklanır.`)
        } else {
          bump(r, -25)
          this.toast(`${factionName(o.id)}: "${PERSONA[o.id].angry}"`)
        }
      })
      act(r.vassal ? 'Bağımsızlık ver' : 'Savaş ilan et', r.vassal || r.rel > -60, () => {
        if (r.vassal) {
          r.vassal = false
          bump(r, 30)
          this.toast(`${factionName(o.id)} özgür. Bunu unutmayacaklar.`)
          return
        }
        bump(r, -60)
        r.trade = false
        r.ally = false
        this.toast(`${factionName(o.id)} ile savaştasın.`)
      })
      card.append(leader, bar, acts)
      list.append(card)
    }
    this.domSet('diplo-wallet', `${Math.floor(this.energy)} enerji · ${this.ore} maden · ${this.crystal} kristal`)
  }

  /* ---------- Görevler: hikâye zinciri ve yol gösterici ---------- */

  private quest(): QuestText {
    return QUESTS[Math.min(this.questIdx, QUESTS.length - 1)]
  }

  private homePlanetId() {
    return UNIVERSES[homeSystem(this.originId)].planets.find((p) => p.home)?.id ?? ''
  }

  /** İlk görev gezegeni: ev sistemindeki, eve en yakın inilebilir komşu (Dünya için Ay). */
  private pickFirstPlanet() {
    if (this.planets.some((p) => p.def.id === 'ay')) return 'ay'
    const home = this.planets.find((p) => p.def.home)
    let best = ''
    let bd = Infinity
    for (const p of this.planets) {
      if (p.def.home || p.def.landable === false || p.def.heat) continue
      const d = home ? p.pos.distanceTo(home.pos) : p.pos.length()
      if (d < bd) {
        bd = d
        best = p.def.id
      }
    }
    return best
  }

  private planetName(id: string, system?: UniId) {
    const live = this.planets.find((p) => p.def.id === id)
    if (live) return live.def.name
    const uni = system ? UNIVERSES[system] : Object.values(UNIVERSES).find((u) => u.planets.some((p) => p.id === id))
    return uni?.planets.find((p) => p.id === id)?.name ?? id
  }

  /** Görevin hedefi (rota) ve ekranda yazılacak adı. */
  private questTarget(): { route: RouteTarget | null; name: string } {
    const q = this.quest()
    const home = homeSystem(this.originId)
    const homeId = this.homePlanetId()
    switch (q.id) {
      case 'fly':
      case 'land':
        return { route: { kind: 'planet', id: this.questPlanetId, system: home }, name: this.planetName(this.questPlanetId, home) }
      case 'walk':
      case 'mine':
      case 'silent':
      case 'scan':
      case 'meet':
        return { route: null, name: '' }
      case 'scout': {
        const sc = this.fleets.find((f) => f.scout)
        const who = sc?.faction ?? this.scoutFaction()
        return { route: null, name: `${factionName(who)} keşif gemisi` }
      }
      case 'order':
      case 'home':
      case 'fortify':
      case 'wave':
      case 'squad':
        return { route: { kind: 'planet', id: homeId, system: home }, name: this.planetName(homeId, home) }
      case 'upgrade':
        return { route: null, name: '' }
      case 'gate': {
        const next = UNIVERSES[this.universeId === home ? home : this.universeId].holes.find((h) => h.kind === 'worm' && h.to)?.to as UniId | undefined
        const to = this.universeId === home ? next : null
        return to ? { route: { kind: 'worm', id: to, system: to }, name: UNIVERSES[to].name } : { route: null, name: '' }
      }
      case 'outpost': {
        let best: Planet | null = null
        let bd = Infinity
        for (const p of this.planets) {
          if (p.def.home || p.def.landable === false || p.def.heat || this.colonies[p.def.id] || this.razed.has(p.def.id)) continue
          const d = p.pos.distanceTo(this.pos)
          if (d < bd) {
            bd = d
            best = p
          }
        }
        return best ? { route: { kind: 'planet', id: best.def.id, system: this.universeId }, name: best.def.name } : { route: null, name: '' }
      }
      case 'aa':
      case 'capture': {
        let best: Colony | null = null
        let score = Infinity
        for (const c of Object.values(this.colonies)) {
          if (!c || this.mine(c)) continue
          const hops = this.hopsTo(c.universe)
          if (hops < 0) continue
          const sc = hops * 10 + c.level
          if (sc < score) {
            score = sc
            best = c
          }
        }
        return best ? { route: { kind: 'planet', id: best.planetId, system: best.universe }, name: `${best.planetName} (${factionName(best.owner)})` } : { route: null, name: '' }
      }
      case 'avlu':
        return { route: { kind: 'hole', id: 'avlu', system: 'avlu' }, name: 'Sessiz Avlu' }
      default:
        return { route: null, name: '' }
    }
  }

  private questDone(): boolean {
    const q = this.quest()
    const homeC = this.homeColony()
    switch (q.id) {
      case 'fly': {
        const p = this.planets.find((x) => x.def.id === this.questPlanetId)
        return Boolean(p && (this.footPlanet === p || (this.universeId === homeSystem(this.originId) && this.pos.distanceTo(p.pos) < p.def.radius * 3 + 30)))
      }
      case 'land':
        return this.layer === 'foot' && this.footPlanet?.def.id === this.questPlanetId
      case 'walk':
        return this.questWalk >= 22
      case 'mine':
        return this.questFlags.has('mine')
      case 'silent':
        return this.questSilentT >= 3
      case 'scan':
        return this.questFlags.has('scan')
      case 'scout':
        return this.questFlags.has('scout')
      case 'order':
        return this.questFlags.has('order')
      case 'meet':
        return this.questFlags.has('meet') || this.questFlags.has('diplo')
      case 'home':
        return this.layer === 'foot' && this.footPlanet?.def.id === this.homePlanetId()
      case 'fortify':
        return Boolean(homeC && (homeC.turrets.length > this.questBase.turrets || homeC.level > this.questBase.level))
      case 'wave':
        return Boolean(homeC && homeC.wave > this.questBase.wave)
      case 'upgrade':
        return this.questFlags.has('upgrade')
      case 'gate':
        return this.universeId !== homeSystem(this.originId) || this.questFlags.has('gate')
      case 'outpost':
        return this.colonyCount() > this.questBase.colonies
      case 'squad':
        return this.questFlags.has('squad') || this.squadSize() > 0
      case 'capture':
        return this.captured > this.questBase.captured
      case 'airdef':
        return this.questFlags.has('bomberGone')
      case 'aa': {
        if (this.questFlags.has('aaDown') || this.captured > this.questBase.captured) return true
        const tc = this.questTargetColony()
        return Boolean(tc && !tc.turrets.some((t) => t.alive && t.kind === 'hava'))
      }
      case 'avlu': {
        if (this.universeId !== 'avlu') return false
        const hole = this.holes.find((h) => h.kind === 'hole')
        return Boolean(hole && this.pos.distanceTo(hole.pos) < hole.rs * 7)
      }
      default:
        return false
    }
  }

  private questStart(i: number, quiet = false) {
    this.questIdx = Math.min(i, QUESTS.length - 1)
    const homeC = this.homeColony()
    this.questBase = {
      colonies: this.colonyCount(),
      turrets: homeC?.turrets.length ?? 0,
      level: homeC?.level ?? 0,
      wave: homeC?.wave ?? 0,
      captured: this.captured,
    }
    this.questFlags.clear()
    this.questWalk = 0
    this.questSilentT = 0
    this.scoutT = 0
    const t = this.questTarget()
    // Önceki görevin rotası (ve çizgisi) yeni görevde asılı kalmasın.
    if (t.route) this.route = t.route
    else if (this.routeByQuest) this.route = null
    this.routeByQuest = Boolean(t.route)
    if (!quiet) {
      // Görev tamamlanınca kısa bir kutlama, ardından yeni görevin brifingi (dünya durur, okunmadan geçilmez).
      this.briefPending = this.questIdx
      this.briefT = 3.2
      document.getElementById('quest')?.classList.add('fresh')
    }
    if (this.quest().id === 'aa') {
      // Hedef üssün en az bir hava savunma tareti olsun (yoksa birini hava savunmaya çevir).
      const tc = this.questTargetColony()
      if (tc && !tc.turrets.some((t) => t.kind === 'hava') && tc.turrets.length) {
        tc.turrets[0].kind = 'hava'
        const pl = this.planetOf(tc)
        if (pl && tc.root) this.attachColony(tc, pl)
      }
    }
    if (this.quest().id === 'airdef') this.bomberT = 35
    if (this.quest().id === 'fortify' && !this.save.settings.guide && this.testBrief && !quiet) this.tourPending = !this.tourDone
    if (this.quest().id === 'wave') {
      // Dalga görevi başlayınca bekletmeden ilk dalga yaklaşır.
      const homeC = this.homeColony()
      if (homeC && homeC.state === 'idle') homeC.countdown = Math.min(homeC.countdown, 25)
    }
    this.paintQuest(true)
  }

  private questTitle(q: QuestText, target: string) {
    const name = target || 'hedef'
    return q.title.replace("{target}'a", dative(name)).replace('{target}', name)
  }

  /** 'aa' ve 'capture' adımlarının hedef düşman üssü. */
  private questTargetColony(): Colony | null {
    const r = this.route
    if (r && r.kind === 'planet') {
      const c = this.colonies[r.id]
      if (c && !this.mine(c)) return c
    }
    const t = this.questTarget()
    const id = t.route?.kind === 'planet' ? t.route.id : ''
    const c = id ? this.colonies[id] : null
    return c && !this.mine(c) ? c : null
  }

  /** Eğitim akıncıları: ev üssünü yukarıdan bombalayan küçük filo. Hava savunma onları vurur. */
  bomberT = -1
  private bomberTick(dt: number) {
    if (this.bomberT > 0) {
      const homeC = this.homeColony()
      const hasAA = Boolean(homeC?.turrets.some((t) => t.alive && t.kind === 'hava'))
      // Hava savunması kurulunca kısa sürede gelirler; kurulmasa da sonunda gelirler.
      this.bomberT -= dt * (hasAA ? 3 : 1)
      if (this.bomberT <= 0) this.spawnBombers()
    }
    for (const f of this.fleets) {
      if (!f.bomber) continue
      const c = this.homeColony()
      const planet = c ? this.planetOf(c) : null
      if (!c || !planet) continue
      const up = this.worldDir(c.dir, planet, vO1)
      // Üssün üstünde dönerek bombalar.
      f.angle += dt * 0.5
      vO2.set(Math.cos(f.angle), 0, Math.sin(f.angle)).multiplyScalar(26)
      vO2.addScaledVector(up, -vO2.dot(up))
      const want = vO3.copy(planet.pos).addScaledVector(up, planet.def.radius + 55).add(vO2)
      f.pos.lerp(want, 1 - Math.exp(-0.8 * dt))
      f.root.position.copy(f.pos)
      f.searchLeft -= dt
      if (f.searchLeft <= 0) {
        f.searchLeft = 4
        const at = this.surfacePos(up, planet, 2, new Vector3())
        this.tracers.fire(f.pos, at, 0xff5a3a, 0.35, 0.3)
        this.fx.explosion(at, 0xff7a3a, 1.2, up.clone())
        c.hull = Math.max(c.hullMax * 0.35, c.hull - c.hullMax * 0.04)
        this.paintCoreBar(c)
      }
    }
  }

  private spawnBombers() {
    const c = this.homeColony()
    const planet = c ? this.planetOf(c) : null
    if (!c || !planet) return
    const foe = this.pickAttacker(c)
    const up = this.worldDir(c.dir, planet, new Vector3())
    const at = planet.pos.clone().addScaledVector(up, planet.def.radius + 160)
    this.spawnFleet(2, 1, at, 'hunt')
    const f = this.fleets[this.fleets.length - 1]
    if (f) {
      f.bomber = true
      f.faction = foe
      f.talked = true
      f.small = true
      f.searchLeft = 3
    }
    this.raidAlarm(`${factionName(foe)} akıncıları üssünü bombalamaya geliyor! Hava savunma taretin vurur; sen de gemiyle kapışabilirsin.`)
  }

  private raidAlarm(msg: string) {
    this.audio.warning()
    this.toast(msg)
    this.feed('⚠', msg, 'bad')
  }

  questEvent(kind: string, _id = '') {
    this.questFlags.add(kind)
    if (kind === 'capture') this.captured++
  }

  /** Görev ilerlemesi: dört kez saniyede kontrol; tamamlanınca ödül ve sıradaki adım. */
  private questTick(dt: number) {
    if (this.briefPending >= 0) {
      this.briefT -= dt
      const calm = this.mode === 'map' && !this.encounter && !this.fading && !this.enemies.some((e) => e.alive) && !this.photo
      if (!this.testBrief) this.briefPending = -1
      else if (this.briefT <= 0 && calm && this.save.settings.guide) {
        const i = this.briefPending
        this.briefPending = -1
        this.openBriefing(i)
      } else if (!this.save.settings.guide) this.briefPending = -1
    }
    if (this.tourPending && !this.briefing && this.layer === 'foot' && this.mode === 'map' && !this.fading && !this.encounter) {
      this.tourPending = false
      this.coreTour()
    }
    if (this.layer === 'foot' && this.footSpeed > 0.5) this.questWalk += this.footSpeed * dt
    if (this.layer === 'ship' && this.silent && this.mode === 'map') this.questSilentT += dt
    if (this.quest().id === 'scout') this.tickScout(dt)
    this.questDoneT = Math.max(0, this.questDoneT - dt)
    this.questT -= dt
    if (this.questT > 0) return
    this.questT = 0.25
    const q = this.quest()
    if (q.id !== 'free' && this.questDone()) {
      const name = this.questTarget().name
      this.questLog.push(this.questTitle(q, name))
      const reward = 10 + this.questIdx * 5
      this.energy += reward
      this.addScore(15)
      this.audio.quest()
      this.feed('✔', `Görev: ${this.questTitle(q, name)} +${reward}`, 'good')
      this.celebrate(`✔ ${this.questTitle(q, name)}`, `+${reward} enerji`)
      this.questDoneT = 1.6
      if (q.id === 'avlu') this.showStory('Son', EPILOGUE, 'Devam et')
      this.questStart(this.questIdx + 1)
      return
    }
    // Rota başka yere çevrildiyse ve görevin hedefi varsa, varılınca görev hedefine geri dön.
    const t = this.questTarget()
    if (t.route && !this.route) {
      this.route = t.route
      this.routeByQuest = true
    }
    this.paintQuest(false)
  }

  private skipQuest() {
    const q = this.quest()
    if (q.id === 'free') return
    this.questLog.push(`${this.questTitle(q, this.questTarget().name)} (atlandı)`)
    this.questStart(this.questIdx + 1)
    this.renderJournal()
  }

  /** Görev brifingi: ne yapacağın, neden ve hangi tuşla. Kapatana kadar dünya bekler. */
  openBriefing(i: number) {
    const q = QUESTS[Math.min(i, QUESTS.length - 1)]
    const t = this.questTarget()
    this.briefing = true
    this.input.exitLock()
    this.domSet('brief-ch', q.id === 'free' ? q.chapter : `${q.chapter} · Adım ${i + 1}/${QUESTS.length - 1}`)
    this.domSet('brief-title', this.questTitle(q, t.name))
    this.domSet('brief-story', q.story)
    this.domSet('brief-how', this.touchy() ? q.touch : q.hint)
    this.domSet('brief-go', this.touchy() ? 'Anladım' : 'Anladım (Enter)')
    must<HTMLElement>('briefing').classList.remove('hidden')
    this.audio.quest()
  }

  closeBriefing() {
    if (!this.briefing) return
    this.briefing = false
    if (!this.touchy()) this.input.requestLock()
    must<HTMLElement>('briefing').classList.add('hidden')
    this.snapCamera = true
    window.setTimeout(() => document.getElementById('quest')?.classList.remove('fresh'), 2500)
    if (this.quest().id === 'fortify' && !this.tourDone) this.tourPending = true
  }

  /* ---------- Tanıtım çekimi: kamera bir yeri (çekirdek) dolaşır, altyazılar anlatır ---------- */
  cine: { t: number; caps: string[]; each: number; at: Vector3; up: Vector3; radius: number; height: number; shots?: CineShot[]; look?: Vector3; fresh?: boolean } | null = null
  tourDone = false
  tourPending = false

  startCine(at: Vector3, up: Vector3, caps: string[], radius = 16, height = 7, each = 4.2) {
    this.cine = { t: 0, caps, each, at: at.clone(), up: up.clone().normalize(), radius, height }
    this.input.exitLock()
    document.body.classList.add('cine-on')
    must<HTMLElement>('cine').classList.remove('hidden')
    this.domSet('cine-cap', caps[0])
  }

  private endCine() {
    this.cine = null
    document.body.classList.remove('cine-on')
    must<HTMLElement>('cine').classList.add('hidden')
    this.snapCamera = true
    if (!this.touchy() && this.mode === 'map') this.input.requestLock()
  }

  /** Çekim karesi: döner kamera + altyazı; Enter/Boşluk/dokunuş sonraki altyazıya geçer. */
  private tickCine(dt: number) {
    const c = this.cine
    if (!c) return
    const skip = this.input.pressed('Enter') || this.input.pressed('Space') || this.input.pressed('Escape') || this.cineTap
    this.cineTap = false
    const idx0 = Math.floor(c.t / c.each)
    c.t += dt
    if (skip) c.t = (idx0 + 1) * c.each
    const idx = Math.floor(c.t / c.each)
    if (idx >= c.caps.length) {
      this.endCine()
      return
    }
    if (idx !== idx0) this.domSet('cine-cap', c.caps[idx])
    vO1.set(1, 0, 0)
    if (Math.abs(vO1.dot(c.up)) > 0.9) vO1.set(0, 0, 1)
    vO1.addScaledVector(c.up, -vO1.dot(c.up)).normalize()
    const shot = c.shots?.[Math.min(idx, c.shots.length - 1)]
    if (shot) {
      // Çekim listesi: her altyazının kendi kamera hareketi (vinç yukarı/aşağı, yaklaşma, yan kayma).
      // Hareket yumuşak başlar ve yavaşlayarak biter; çekimler arası geçiş kamerayı kaydırarak bağlanır.
      const local = clamp((c.t - idx * c.each) / c.each, 0, 1)
      const e = local * local * (3 - 2 * local)
      const R = c.radius
      const ang = shot.a0 + (shot.a1 - shot.a0) * e
      const dist = (shot.d0 + (shot.d1 - shot.d0) * e) * R
      const h = (shot.h0 + (shot.h1 - shot.h0) * e) * R
      const fh = (shot.f0 + (shot.f1 - shot.f0) * e) * R
      vO1.applyAxisAngle(c.up, ang)
      vO3.copy(c.at).addScaledVector(vO1, dist).addScaledVector(c.up, h)
      if (shot.side) {
        vO2.crossVectors(c.up, vO1).normalize()
        vO3.addScaledVector(vO2, (e - 0.5) * shot.side * R)
      }
      vO2.copy(c.at).addScaledVector(c.up, fh)
      const k = c.fresh === false ? 1 - Math.exp(-3.2 * dt) : 1
      c.fresh = false
      this.camera.position.lerp(vO3, k)
      if (!c.look) c.look = vO2.clone()
      c.look.lerp(vO2, k)
      this.camera.up.copy(c.up)
      this.camera.lookAt(c.look)
      return
    }
    // Varsayılan: yerden yükselen yavaş bir yörünge.
    vO1.applyAxisAngle(c.up, c.t * 0.22)
    this.camera.position.copy(c.at).addScaledVector(vO1, c.radius).addScaledVector(c.up, c.height + Math.sin(c.t * 0.3) * 1.5)
    this.camera.up.copy(c.up)
    this.camera.lookAt(vO2.copy(c.at).addScaledVector(c.up, 2.5))
  }
  cineTap = false

  /** Çekirdek turu: üssün kalbini ve başka ırkların çekirdeklerini anlatır (bir kez). */
  private coreTour() {
    const planet = this.footPlanet
    const c = this.colonyHere(planet)
    if (!planet || !c || !this.mine(c) || this.tourDone) return false
    this.tourDone = true
    const up = this.worldDir(c.dir, planet, new Vector3())
    const at = planet.pos.clone().addScaledVector(up, planet.def.radius)
    this.startCine(at, up, [
      'Bu senin çekirdeğin: üssünün kalbi. Halkın burada doğar, ekibin burada toplanır.',
      'Çekirdeğin yanında: B üssü yükseltir, T kara tareti, Shift+T hava savunma tareti kurar, K ekip toplar.',
      'Çevresindeki evler halkını barındırır. Üs büyüdükçe kışla (asker eğitimi), atölye (ucuz parça) ve gözcü kulesi (taret menzili) açılır.',
      'Halkının bir kısmı işçidir: yataklara yürür, kazar, madeni ve kristali buraya taşır. Askerler onlara eşlik eder.',
      'Diğer ırkların da tıpkı bunun gibi çekirdekleri var. Bir üssü almak için savunmacılarını ve taretlerini düşürürsün; çekirdek düşerse üs düşer.',
      'Y komuta paneli: bütün kolonilerin, işçilerin, askerlerin ve taretlerin. Seyahat ederken de açılır.',
    ], Math.max(18, this.coreReach(c) * 2.2), 9)
    // Birimler çekim yarıçapı (R) cinsinden: açı, uzaklık, yükseklik, bakış yüksekliği; başlangıç → bitiş.
    if (this.cine) {
      this.cine.fresh = true
      this.cine.shots = [
        // 1) Çekirdek: dibinden yukarı bakarak başlar, vinçle yükselip bütününü gösterir.
        { a0: 0.2, a1: 0.5, d0: 0.35, d1: 0.75, h0: 0.04, h1: 0.45, f0: 0.35, f1: 0.12 },
        // 2) Kısayollar: göz hizasında yandan yavaşça yaklaşır.
        { a0: 1.3, a1: 1.15, d0: 0.9, d1: 0.55, h0: 0.14, h1: 0.12, f0: 0.08, f1: 0.08, side: 0.5 },
        // 3) Evler: tepeden aşağı bakan geniş plan, yavaşça alçalır.
        { a0: 2.4, a1: 2.9, d0: 0.25, d1: 0.5, h0: 1.7, h1: 1.05, f0: 0, f1: 0 },
        // 4) İşçiler: yere yakın, yanlamasına kayan takip çekimi.
        { a0: 3.6, a1: 4.4, d0: 1.15, d1: 1.15, h0: 0.08, h1: 0.1, f0: 0.05, f1: 0.05 },
        // 5) Diğer ırklar: geri çekilip yukarı yükselir; üs gezegenin üstünde küçülür.
        { a0: 4.6, a1: 5.0, d0: 0.9, d1: 1.8, h0: 0.5, h1: 2.4, f0: 0.1, f1: 0 },
        // 6) Komuta paneli: yeniden göz hizasına iner, çekirdeğe döner.
        { a0: 5.4, a1: 6.1, d0: 1.0, d1: 0.7, h0: 0.6, h1: 0.2, f0: 0.1, f1: 0.14 },
      ]
    }
    return true
  }

  /** Ekran ortasında kısa kutlama yazısı (görev tamamlandı). */
  private celebrate(title: string, sub: string) {
    const el = document.getElementById('celebrate')
    if (!el) return
    this.domSet('cel-title', title)
    this.domSet('cel-sub', sub)
    el.classList.remove('on')
    void el.offsetWidth
    el.classList.add('on')
  }

  /** Eğitim kapısı: rehber açıkken bir mekanik, öğretildiği adıma gelmeden açılmaz. */
  tutorialAt(id: string) {
    if (!this.save.settings.guide || this.testGates === false) return true
    const at = QUESTS.findIndex((q) => q.id === id)
    return at < 0 || this.questIdx >= at
  }

  private paintQuest(force: boolean) {
    const el = document.getElementById('quest')
    if (!el) return
    const show = this.save.settings.guide && (this.mode === 'map' || this.mode === 'combat')
    el.classList.toggle('hidden', !show)
    el.classList.toggle('done', this.questDoneT > 0)
    if (!show && !force) return
    const q = this.quest()
    const t = this.questTarget()
    this.domSet('q-ch', q.id === 'free' ? q.chapter : `${q.chapter} · Adım ${this.questIdx + 1}/${QUESTS.length - 1}`)
    this.domSet('q-title', this.questTitle(q, t.name))
    let extra = ''
    if (q.id === 'walk') extra = ` (${Math.min(22, Math.floor(this.questWalk))}/22)`
    if (q.id === 'silent') extra = this.layer === 'ship' ? ` · ${this.silent ? 'süzülüyorsun' : 'V\'ye bas'} ${Math.min(3, this.questSilentT).toFixed(1)}/3 sn` : ' · önce gemine bin'
    if (q.id === 'mine' && this.layer === 'foot' && this.footPlanet) {
      const d = this.nearestDeposit(this.footPlanet, vT)
      if (d) extra = ` · en yakın yatak ${fmt(d.distanceTo(this.pos))} m (◆ işaretini izle)`
    }
    if (q.id === 'scout') {
      const f = this.fleets.find((x) => x.scout)
      if (f && this.layer === 'ship') extra = ` · uzaklık ${fmt(f.pos.distanceTo(this.pos))} · görünürlük ${Math.round(this.vis)} (35'in altında kal)`
    }
    if (q.id === 'wave') {
      const hc = this.homeColony()
      if (hc && hc.state === 'idle') extra = ` · dalgaya ${Math.max(0, Math.ceil(hc.countdown))} sn`
    }
    if (q.id === 'squad' || q.id === 'capture') extra += ` · ekip ${this.squadSize()}`
    if (q.id === 'outpost' && this.layer === 'foot') {
      const wild = this.locals.filter((l) => l.alive && !l.friendly).length
      if (wild > 0) extra = ` · ${wild} yerli kaldı`
    }
    this.domSet('q-hint', (this.touchy() ? q.touch : q.hint) + extra)
  }

  /** Ekranda bir işareti dünya noktasına yerleştir; ekran dışındaysa kenarda ok. */
  private placeMark(el: HTMLElement, spot: Vector3) {
    vQ.copy(spot).applyMatrix4(this.camera.matrixWorldInverse)
    const behind = vQ.z > 0
    vQ.copy(spot).project(this.camera)
    let x = vQ.x
    let y = vQ.y
    if (behind) {
      x = -x
      y = -y
    }
    const off = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.86
    if (off) {
      const m = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8, 1e-3)
      x /= m
      y /= m
    }
    el.style.left = `${(x * 0.5 + 0.5) * 100}%`
    el.style.top = `${(-y * 0.5 + 0.5) * 100}%`
    el.classList.toggle('edge', off)
    const arrow = el.querySelector<HTMLElement>('i')
    if (arrow) arrow.style.transform = off ? `rotate(${Math.atan2(-y, x) + Math.PI / 2}rad)` : ''
  }

  /** Yayayken üs işareti: kendi üssün "⌂ Üssün", düşman üssü "⚔ Düşman çekirdeği" (her zaman, kenarda okla). */
  private paintBaseMark() {
    const el = document.getElementById('base-mark')
    if (!el) return
    const planet = this.layer === 'foot' ? this.footPlanet : null
    const c = planet ? this.colonyHere(planet) : null
    if (!planet || !c || this.mode !== 'map' || this.photo) {
      el.classList.add('hidden')
      return
    }
    const spot = this.surfacePos(this.worldDir(c.dir, planet, vQ), planet, 6, vU)
    const d = spot.distanceTo(this.pos)
    if (d < 12) {
      el.classList.add('hidden')
      return
    }
    el.classList.remove('hidden')
    el.classList.toggle('enemy', !this.mine(c))
    this.placeMark(el, spot)
    this.domSet('base-mark-name', this.mine(c) ? (c.kind === 'main' ? 'Ana üssün' : 'Kolonin') : `${factionName(c.owner)} çekirdeği`)
    this.domSet('base-mark-dist', fmt(d))
  }

  /** Yayayken en yakın kaynak yatağı işareti (görev "kaynak topla" değilse küçük, ◆ zaten onu gösterir). */
  private paintDepositMark() {
    const el = document.getElementById('dep-mark')
    if (!el) return
    const planet = this.layer === 'foot' ? this.footPlanet : null
    const spot = planet && this.mode === 'map' && !this.photo && this.quest().id !== 'mine' ? this.nearestDeposit(planet, vT) : null
    const d = spot ? spot.distanceTo(this.pos) : 0
    if (!spot || d < 6 || d > 700) {
      el.classList.add('hidden')
      return
    }
    el.classList.remove('hidden')
    this.placeMark(el, spot)
    this.domSet('dep-dist', fmt(d))
  }

  /** Yayayken gemi uzaktaysa ekranda (ya da kenarda okla) gemi işareti. */
  private paintShipMark() {
    const el = document.getElementById('ship-mark')
    if (!el) return
    const d = this.pos.distanceTo(this.parkedShip)
    if (this.layer !== 'foot' || this.mode !== 'map' || d < 14 || this.photo) {
      el.classList.add('hidden')
      return
    }
    el.classList.remove('hidden')
    vQ.copy(this.parkedShip).applyMatrix4(this.camera.matrixWorldInverse)
    const behind = vQ.z > 0
    vQ.copy(this.parkedShip).project(this.camera)
    let x = vQ.x
    let y = vQ.y
    if (behind) {
      x = -x
      y = -y
    }
    const off = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.86
    if (off) {
      const m = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8, 1e-3)
      x /= m
      y /= m
    }
    el.style.left = `${(x * 0.5 + 0.5) * 100}%`
    el.style.top = `${(-y * 0.5 + 0.5) * 100}%`
    el.classList.toggle('edge', off)
    const arrow = el.querySelector<HTMLElement>('i')
    if (arrow) arrow.style.transform = off ? `rotate(${Math.atan2(-y, x) + Math.PI / 2}rad)` : ''
    this.domSet('ship-dist', fmt(d))
  }

  /** Ekrandaki ◆ hedef işareti: hedef görünüyorsa üstünde, değilse ekran kenarında yön oku. */
  private paintQuestMark() {
    const el = document.getElementById('quest-mark')
    if (!el) return
    const obj = this.objectiveSpot()
    const spot = obj?.pos ?? null
    const onTarget = !obj?.local && this.layer === 'foot' && this.footPlanet && this.route?.kind === 'planet' && this.route.id === this.footPlanet.def.id
    if (!spot || !this.save.settings.guide || this.mode !== 'map' || onTarget || this.photo) {
      el.classList.add('hidden')
      return
    }
    el.classList.remove('hidden')
    vQ.copy(spot).applyMatrix4(this.camera.matrixWorldInverse)
    const behind = vQ.z > 0
    vQ.copy(spot).project(this.camera)
    let x = vQ.x
    let y = vQ.y
    if (behind) {
      x = -x
      y = -y
    }
    const off = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.86
    if (off) {
      const m = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8, 1e-3)
      x /= m
      y /= m
    }
    el.style.left = `${(x * 0.5 + 0.5) * 100}%`
    el.style.top = `${(-y * 0.5 + 0.5) * 100}%`
    el.classList.toggle('edge', off)
    const arrow = el.querySelector<HTMLElement>('i')
    if (arrow) arrow.style.transform = off ? `rotate(${Math.atan2(-y, x) + Math.PI / 2}rad)` : ''
    this.domSet('quest-dist', fmt(this.pos.distanceTo(spot)))
  }

  /** Gezegene inince: anlatı kartı ve keşif günlüğü. */
  private discover(planet: Planet) {
    const c = this.colonyHere(planet)
    const owner = c && !this.mine(c) ? factionName(c.owner) : undefined
    const lore = planetLore(planet.def, owner)
    if (!this.discovered.some((d) => d.id === planet.def.id)) {
      this.discovered.push({ id: planet.def.id, name: planet.def.name, system: UNIVERSES[this.universeId].name, lore })
      const card = document.getElementById('lore-card')
      if (card) {
        this.domSet('lore-name', `${planet.def.name} · ${UNIVERSES[this.universeId].name}`)
        this.domSet('lore-text', lore)
        card.classList.remove('hidden')
        card.classList.add('on')
        window.clearTimeout(this.loreTimer)
        this.loreTimer = window.setTimeout(() => card.classList.remove('on'), 7000)
      }
    }
  }

  loreTimer = 0
  storyPending = false

  /** Seçimden sonra: önsöz + türün açılış sahnesi, sonra yolculuk başlar. */
  private beginStory() {
    const race = RACE_STORY[this.originId]
    this.storyPending = true
    this.showStory(`${race.people} · Önsöz`, [...PROLOGUE, race.opening].join('\n'), 'Yola çık')
  }

  private showStory(eyebrow: string, text: string, button: string) {
    this.domSet('story-eyebrow', eyebrow)
    const body = document.getElementById('story-body')
    if (body) {
      body.innerHTML = ''
      for (const para of text.split('\n')) {
        const p = document.createElement('p')
        p.textContent = para
        body.append(p)
      }
    }
    this.domSet('story-go', button)
    must<HTMLElement>('story').classList.remove('hidden')
  }

  private openJournal(tab: 'quest' | 'story' | 'lore' = 'quest') {
    this.journalTab = tab
    this.renderJournal()
    must<HTMLElement>('journal').classList.remove('hidden')
  }

  journalTab: 'quest' | 'story' | 'lore' = 'quest'

  private renderJournal() {
    const body = document.getElementById('journal-body')
    if (!body) return
    document.querySelectorAll<HTMLButtonElement>('#journal .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.journalTab))
    body.innerHTML = ''
    const add = (tag: string, text: string, cls = '') => {
      const el = document.createElement(tag)
      el.textContent = text
      if (cls) el.className = cls
      body.append(el)
      return el
    }
    if (this.journalTab === 'quest') {
      const q = this.quest()
      const t = this.questTarget()
      add('p', q.chapter, 'eyebrow')
      add('h3', this.questTitle(q, t.name))
      add('p', q.story)
      add('p', this.touchy() ? q.touch : q.hint, 'fine')
      if (this.questLog.length) {
        add('p', 'Tamamlananlar', 'eyebrow')
        const ul = document.createElement('ul')
        ul.className = 'done-list'
        for (const line of this.questLog) {
          const li = document.createElement('li')
          li.textContent = `✔ ${line}`
          ul.append(li)
        }
        body.append(ul)
      }
      if (q.id !== 'free') {
        const skip = document.createElement('button')
        skip.type = 'button'
        skip.textContent = 'Bu görevi atla'
        skip.addEventListener('click', () => this.skipQuest())
        body.append(skip)
      }
    } else if (this.journalTab === 'story') {
      const race = RACE_STORY[this.originId]
      for (const para of PROLOGUE) add('p', para)
      add('p', race.people, 'eyebrow')
      add('p', race.who)
      add('p', race.opening)
      const sys = SYSTEM_LORE[this.universeId]
      if (sys) {
        add('p', 'Bulunduğun sistem', 'eyebrow')
        add('p', sys)
      }
    } else {
      if (!this.discovered.length) add('p', 'Henüz bir gezegene inmedin. İndiğin her dünyanın hikâyesi buraya yazılır.', 'fine')
      for (const d of this.discovered.slice().reverse()) {
        add('p', `${d.name} · ${d.system}`, 'eyebrow')
        add('p', d.lore)
      }
    }
  }

  objSpot = new Vector3()
  /** Görevin şu anki somut hedefi: yayayken yatak, çekirdek, gemi, yerli ya da düşman üssü; gemideyken keşif gemisi.
   *  Yoksa rota hedefi (gezegen/kapı). Ekrandaki ◆ ve radardaki elmas bunu gösterir. */
  private objectiveSpot(): { pos: Vector3; local: boolean } | null {
    const q = this.quest().id
    const out = this.objSpot
    const planet = this.layer === 'foot' ? this.footPlanet : null
    if (planet) {
      const c = this.colonyHere(planet)
      const shipQuest = q === 'silent' || q === 'scan' || q === 'scout' || q === 'upgrade' || q === 'gate' || q === 'meet' || q === 'avlu'
      if (q === 'mine') {
        const d = this.nearestDeposit(planet)
        if (d) return { pos: out.copy(d), local: true }
      }
      if ((q === 'fortify' || q === 'squad' || q === 'order' || q === 'wave') && c && this.mine(c)) {
        return { pos: this.surfacePos(this.worldDir(c.dir, planet, vQ), planet, 2, out), local: true }
      }
      if (q === 'outpost' || q === 'capture') {
        let best: Vector3 | null = null
        let bd = Infinity
        for (const l of this.locals) {
          if (!l.alive || l.friendly) continue
          const d = l.root.position.distanceTo(this.pos)
          if (d < bd) {
            bd = d
            best = l.root.position
          }
        }
        if (best) return { pos: out.copy(best), local: true }
        if (c && !this.mine(c)) return { pos: this.surfacePos(this.worldDir(c.dir, planet, vQ), planet, 2, out), local: true }
      }
      if (shipQuest && this.pos.distanceTo(this.parkedShip) > 10) return { pos: out.copy(this.parkedShip), local: true }
    }
    if (this.layer === 'ship' && q === 'scout') {
      const f = this.fleets.find((x) => x.scout)
      if (f) return { pos: out.copy(f.pos), local: true }
    }
    const w = this.waypoint()
    return w ? { pos: w, local: false } : null
  }

  /** Yayayken en yakın kaynak yatağının dünya konumu (yoksa null). */
  nearestDeposit(planet: Planet, out = new Vector3()) {
    let best: Deposit | null = null
    let bd = Infinity
    qF.copy(planet.mesh.quaternion).invert()
    vR.copy(this.pos).sub(planet.pos).normalize().applyQuaternion(qF)
    for (const d of planet.deposits) {
      if (d.left <= 0) continue
      const a = vR.angleTo(d.dir)
      if (a < bd) {
        bd = a
        best = d
      }
    }
    if (!best) return null
    return this.surfacePos(this.worldDir(best.dir, planet, vQ), planet, 1.5, out)
  }

  private wpUp = new Vector3()
  private wpSpot = new Vector3()
  private waypoint(): Vector3 | null {
    if (!this.route) return null
    if (this.route.system === this.universeId) {
      if (this.route.kind === 'planet') {
        const planet = this.planets.find((p) => p.def.id === this.route?.id)
        if (!planet) return null
        // Rota gezegenin ortasına değil, tam gidilecek yere: üs varsa çekirdeğin üstüne (inince üssün yanındasın),
        // yoksa gezegenin sana bakan yüzünün hemen üstüne.
        const c = this.colonies[planet.def.id]
        if (c && planet.def.landable !== false) {
          this.worldDir(c.dir, planet, this.wpUp)
          return this.wpSpot.copy(planet.pos).addScaledVector(this.wpUp, planet.def.radius + 16)
        }
        if (planet.def.heat) return planet.pos
        this.wpUp.subVectors(this.pos, planet.pos)
        if (this.wpUp.lengthSq() < 1e-4) this.wpUp.set(0, 1, 0)
        this.wpUp.normalize()
        return this.wpSpot.copy(planet.pos).addScaledVector(this.wpUp, planet.def.radius + 20)
      }
      if (this.route.kind === 'hole') {
        const hole = this.holes.find((h) => h.kind === 'hole')
        return hole ? hole.pos : null
      }
      const hole = this.holes.find((h) => h.kind === 'worm' && h.to === (this.route?.id as UniId))
      return hole ? hole.pos : null
    }
    const next = this.nextGate(this.universeId, this.route.system)
    if (!next) return null
    const hole = this.holes.find((h) => h.kind === 'worm' && h.to === next)
    return hole ? hole.pos : null
  }

  private nextGate(from: UniId, goal: UniId): UniId | null {
    const queue: { id: UniId; via: UniId | null }[] = [{ id: from, via: null }]
    const seen = new Set<UniId>([from])
    while (queue.length) {
      const cur = queue.shift()
      if (!cur) break
      const links = UNIVERSES[cur.id].holes.filter((h) => h.kind === 'worm' && h.to)
      for (const link of links) {
        const to = link.to as UniId
        if (seen.has(to)) continue
        if (to === goal) return cur.id === from ? to : cur.via
        seen.add(to)
        queue.push({ id: to, via: cur.id === from ? to : cur.via })
      }
    }
    return null
  }

  private paintRoute() {
    const spot = this.waypoint()
    const geo = this.routeLine.geometry as BufferGeometry
    if (!spot || this.mode !== 'map') {
      this.routeLine.visible = false
      this.domSet('route-hint', '')
      return
    }
    this.routeLine.visible = true
    const pos = geo.getAttribute('position') as BufferAttribute
    pos.setXYZ(0, this.pos.x, this.pos.y, this.pos.z)
    pos.setXYZ(1, spot.x, spot.y, spot.z)
    pos.needsUpdate = true
    const route = this.route
    let name: string
    if (route && route.system === this.universeId) {
      name =
        route.kind === 'planet'
          ? (this.planets.find((p) => p.def.id === route.id)?.def.name ?? route.id)
          : route.kind === 'hole'
            ? 'kara delik'
            : `eşik → ${UNIVERSES[route.id as UniId]?.name ?? route.id}`
    } else {
      const hops = route ? this.hopsTo(route.system) : 0
      name = `${UNIVERSES[route?.system ?? this.universeId].name} (${hops} kapı) · sıradaki eşik → ${UNIVERSES[this.nextGate(this.universeId, route?.system ?? this.universeId) ?? this.universeId].name}`
    }
    this.domSet('route-hint', `Rota · ${name} · ${fmt(this.pos.distanceTo(spot))}`)
  }

  private paintBeacons() {
    const host = document.getElementById('beacons')
    if (!host) return
    host.innerHTML = ''
    if (this.mode !== 'map' && this.mode !== 'combat') return
    // Yerdeyken gökyüzündeki gezegen etiketleri gizli: ekranda yalnız üs, gemi, görev ve yatak işaretleri kalır.
    if (this.layer === 'foot') return
    const marks: { name: string; pos: Vector3 }[] = []
    for (const planet of this.planets) {
      if (planet.def.heat || planet === this.footPlanet) continue // üstünde durduğun gezegenin etiketi gereksiz
      marks.push({ name: planet.def.name, pos: planet.pos })
    }
    for (const hole of this.holes) {
      if (hole.kind === 'worm' && hole.to) marks.push({ name: UNIVERSES[hole.to].name, pos: hole.pos })
    }
    const phone = window.innerWidth <= 820 || window.innerHeight <= 520
    const portrait = phone && window.innerHeight > window.innerWidth
    let shown = 0
    for (const mark of marks) {
      if (shown >= (phone ? 3 : 5)) break
      const p = mark.pos.clone().project(this.camera)
      const inView = p.z < 1 && Math.abs(p.x) < 0.82 && Math.abs(p.y) < 0.78
      if (inView) continue
      let x = 50 + p.x * 42
      let y = 50 - p.y * 42
      if (p.z > 1) {
        x = 100 - x
        y = 100 - y
      }
      // Kenar etiketleri HUD'un üstüne binmesin. Telefonda üstte durum blokları, altta kumandalar var.
      if (portrait) {
        x = clamp(x, 14, 86)
        y = clamp(y, 24, 62)
      } else if (phone) {
        x = clamp(x, 30, 70)
        y = clamp(y, 30, 66)
      } else {
        x = clamp(x, 6, 94)
        y = clamp(y, 16, 74)
        if (x < 14 && y < 24) y = 24
      }
      const dy = mark.pos.y - this.pos.y
      const chip = document.createElement('div')
      chip.className = 'beacon'
      chip.style.left = `${x}%`
      chip.style.top = `${y}%`
      chip.textContent = `${dy > 40 ? '▲ ' : dy < -40 ? '▼ ' : ''}${mark.name} ${fmt(this.pos.distanceTo(mark.pos))}`
      host.append(chip)
      shown += 1
    }
  }

  private paintAttitude() {
    shipForward(this.quat, vA)
    const heading = Math.round(((Math.atan2(vA.x, -vA.z) * 180) / Math.PI + 360) % 360)
    this.domSet('heading', `Yön ${heading}°`)
  }

  private regenRate() {
    const base = this.regen * (this.isHome() ? 2.8 : 1) * (1 + this.colonyBonus())
    return this.powerT > 0 ? base * 1.15 : base
  }

  private threatMul() {
    const ramp = smoothstep(0, 80, this.properTime)
    const eased = lerp(0.58, 0.84, ramp)
    return eased * (this.isHome() ? 0.82 : 1.18)
  }

  /** Güneş ısısı: dış kuşakta panel şarjı (enerji kazanırsın), iç kuşakta önce kalkan sonra gövde yanar.
   * Ekran kızarır, uyarı sesi çalar; ne kadar yakınsan o kadar hızlı. */
  heatWarnT = 0
  solarGain = 0
  burning = false
  private solarBank = 0
  private applyHeat(dt: number) {
    this.heat = 0
    this.solarGain = 0
    this.burning = false
    if (this.universeId !== 'gunes' || this.layer === 'foot') return
    const sun = this.planets.find((p) => p.def.heat)
    if (!sun) return
    const R = sun.def.radius
    const alt = this.pos.distanceTo(sun.pos) - R
    // Şarj kuşağı: güneşin ~3,5 yarıçap içi (Merkür burada: güvenle şarj olursun).
    // Yanma kuşağı: yüzeye ~1 yarıçaptan yakın; ne kadar dalarsan o kadar hızlı yanarsın.
    const zone = R * 3.5
    if (alt > zone) return
    this.heat = clamp(1 - alt / zone, 0, 1)
    if (this.mode !== 'map') return
    this.solarGain = 3 + this.heat * this.heat * 30
    this.solarBank += this.solarGain * dt
    if (this.solarBank >= 1) {
      const n = Math.floor(this.solarBank)
      this.solarBank -= n
      this.energy += n
    }
    const burnAlt = R * 0.95
    if (alt > burnAlt) return
    this.burning = true
    const k = clamp(1 - alt / burnAlt, 0, 1)
    const dps = 10 + k * 40
    this.hitCd = Math.max(this.hitCd, 0.6) // yanarken kalkan dolmaz
    this.hurtPlayer(dps * dt, true)
    this.hurtV = Math.max(this.hurtV, 0.3 + k * 0.45)
    this.trauma = Math.min(1, Math.max(this.trauma, 0.1 + k * 0.2))
    this.heatWarnT -= dt
    if (this.heatWarnT <= 0) {
      this.heatWarnT = 1.3 - k * 0.8
      this.audio.warning()
      this.toast(this.shield <= 0 ? 'Gövde eriyor! Güneşten uzaklaş.' : 'Kalkan ısıyla eriyor — uzaklaş.')
    }
  }

  /** Yakındaki kaynak yatağını kaz: maden +3, kristal +1; yatak tükenince ufalanır. */
  private mineDeposit(planet: Planet) {
    if (!planet.deposits.length) return false
    qF.copy(planet.mesh.quaternion).invert()
    vR.copy(this.pos).sub(planet.pos).normalize().applyQuaternion(qF)
    const reach = 5.2 / planet.def.radius
    for (const d of planet.deposits) {
      if (d.left <= 0 || vR.angleTo(d.dir) > reach) continue
      d.left -= 1
      this.mined.set(d.key, d.left)
      const g = d.kind === 'ore' ? { ore: 3 } : { crystal: 1 }
      this.addRes(g)
      this.surfacePos(this.worldDir(d.dir, planet, vJ), planet, 1.4, vM)
      this.sparks.burst(vM, d.kind === 'ore' ? 0xffb43a : 0x6af0ff, 14, 9, 1.1, vJ)
      this.feed(d.kind === 'ore' ? '⛏' : '◆', `+${d.kind === 'ore' ? '3 maden' : '1 kristal'}`, 'good')
      this.questEvent('mine')
      this.audio.collect()
      if (d.left <= 0) {
        d.obj.visible = false
        this.regrow.set(d.key, this.clockT + 300)
        this.toast(`Yatak tükendi (5 dakikada yeniden dolar). Bu gezegende ${this.depositsLeft(planet)} yatak kaldı.`)
      } else d.obj.scale.setScalar(1.7 * (0.55 + 0.45 * (d.left / (d.kind === 'ore' ? 5 : 3))))
      return true
    }
    return false
  }

  depositsLeft(planet: Planet) {
    return planet.deposits.filter((d) => d.left > 0).length
  }

  /** Yaya: yakında yatak varsa istem metni. */
  private nearDeposit(planet: Planet) {
    qF.copy(planet.mesh.quaternion).invert()
    vR.copy(this.pos).sub(planet.pos).normalize().applyQuaternion(qF)
    const reach = 5.2 / planet.def.radius
    return planet.deposits.find((d) => d.left > 0 && vR.angleTo(d.dir) < reach) ?? null
  }

  /** Görünürlük çarpanı: ev sisteminde çok az, kendi kolonin olan sistemde az, yabancı sistemde çok. */
  private visMul() {
    if (this.isHome()) return 0.22
    const ours = Object.values(this.colonies).some((c) => c && c.universe === this.universeId && this.mine(c))
    return ours ? 0.6 : 1.7
  }

  /** Radarlara düştüğünde bildir (bir kez; görünürlük düşünce yeniden kurulur). */
  private tickVisNotice() {
    if (!this.visCaught && this.vis > 22) {
      this.visCaught = true
      this.feed('📡', this.isHome() ? 'Sinyalin sistemde duyuluyor' : 'Radarlara yakalandın!', 'bad')
      if (!this.isHome()) this.toast('📡 Radarlara yakalandın! Sessiz süzülmeye geç (V) ya da gezegen arkasına saklan.')
    }
    if (this.visCaught && this.vis < 10) this.visCaught = false
  }

  toggleSilent() {
    if (this.layer !== 'ship') return
    this.silent = !this.silent
    this.toast(this.silent ? 'Sessiz süzülme: motor kapalı, iticilerle yavaş ilerliyorsun. Görünürlük hızla düşer.' : 'Motorlar açık.')
    this.questEvent(this.silent ? 'silent' : 'loud')
    this.audio.ui()
  }

  /** Tarama: 700 birim içindeki filoları ve kaynak yataklarını 10 sn gösterir; sinyalin de yükselir. */
  scan() {
    if (this.layer !== 'ship' || this.scanCd > 0) {
      if (this.scanCd > 0) this.toast(`Tarayıcı soğuyor: ${Math.ceil(this.scanCd)} sn`)
      return
    }
    this.scanT = 10
    this.scanCd = 12
    this.vis = Math.min(100, this.vis + 18 * this.visMul())
    if (this.silent) this.silent = false
    const near = this.fleets.filter((f) => f.pos.distanceTo(this.pos) < SCAN_RANGE)
    for (const f of near) {
      f.revealed = 10
      if (f.faction) this.relOf(f.faction).known = true
    }
    let deposits = 0
    for (const p of this.planets) if (p.pos.distanceTo(this.pos) < SCAN_RANGE + p.def.radius) deposits += this.depositsLeft(p)
    const names = [...new Set(near.map((f) => (f.faction ? factionName(f.faction) : 'Bilinmeyen')))]
    this.toast(near.length ? `Tarama: ${near.length} filo (${names.join(', ')}) · ${deposits} kaynak yatağı` : `Tarama: menzilde filo yok · ${deposits} kaynak yatağı`)
    this.questEvent('scan')
    this.audio.scan()
    if (!this.scanFx) {
      const m = new Mesh(new SphereGeometry(1, 32, 16), new MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: 0.25, wireframe: true, depthWrite: false }))
      this.mapRoot.add(m)
      this.scanFx = m
    }
    this.scanFx.userData.t = 0
    this.scanFx.visible = true
  }

  private tickScan(dt: number) {
    this.scanCd = Math.max(0, this.scanCd - dt)
    this.scanT = Math.max(0, this.scanT - dt)
    for (const f of this.fleets) if (f.revealed) f.revealed = Math.max(0, f.revealed - dt)
    const fx = this.scanFx
    if (fx?.visible) {
      fx.userData.t = (fx.userData.t as number) + dt
      const k = (fx.userData.t as number) / 1.3
      fx.position.copy(this.pos)
      fx.scale.setScalar(Math.max(1, k * SCAN_RANGE))
      ;(fx.material as MeshBasicMaterial).opacity = 0.3 * (1 - k)
      if (k >= 1) fx.visible = false
    }
  }

  /** Dağ, kristal, ağaç gibi büyük yapıların içinden geçme: yüzey boyunca dışarı it. */
  private pushOutOfFeatures(planet: Planet, radius: number) {
    const center = planet.pos
    const dist = this.pos.distanceTo(center)
    vR.copy(this.pos).sub(center).normalize()
    this.blockDir(vR, planet, PLAYER_RADIUS)
    this.pos.copy(center).addScaledVector(vR, dist)
    void radius
  }

  /** Yüzeydeki bir yönü (dünya çerçevesi, birim) dağlardan, yapılardan ve üs anıtından dışarı iter.
   *  Oyuncu da birlikler de bunu kullanır: kimse anıtların ve dağların içinden geçmez. */
  blockDir(dir: Vector3, planet: Planet, pad: number) {
    const R = planet.def.radius
    qF.copy(planet.mesh.quaternion).invert()
    vS.copy(dir).applyQuaternion(qF)
    const push = (center: Vector3, ang0: number) => {
      const ang = vS.angleTo(center)
      if (ang >= ang0 || ang < 1e-6) return
      vT.crossVectors(center, vS).normalize()
      vS.applyAxisAngle(vT, ang0 - ang)
    }
    for (const f of planet.features) if (f.obj.visible) push(f.dir, f.r + pad / R)
    const c = this.colonies[planet.def.id]
    if (c && c.universe === this.universeId) {
      push(c.dir, (CORE_RADIUS + 0.25 * (c.level - 1) + pad) / R)
      for (const b of (c.root?.userData.blocks as { dir: Vector3; r: number }[] | undefined) ?? []) push(b.dir, (b.r + pad) / R)
      for (const b of (c.core?.userData.blocks as { dir: Vector3; r: number }[] | undefined) ?? []) push(b.dir, (b.r + pad) / R)
    }
    dir.copy(vS).applyQuaternion(planet.mesh.quaternion)
  }

  /** Sağ tık / Z basılı ya da dokunmatik "Bak" açık: kamera karakterin/geminin çevresinde döner. */
  private orbitKey() {
    return this.input.rightDown || this.input.down('KeyZ') || this.lookMode
  }

  /** Dokunmatik kontroller kullanılıyor mu (telefon / tablet ya da zorla açılmış). */
  private touchy() {
    return document.body.classList.contains('force-touch') || COARSE.matches
  }

  private axes(ship = false) {
    const i = this.input
    let f = (i.down('KeyW') || i.down('ArrowUp') ? 1 : 0) - (i.down('KeyS') || i.down('ArrowDown') ? 1 : 0)
    let s = (i.down('KeyD') || i.down('ArrowRight') ? 1 : 0) - (i.down('KeyA') || i.down('ArrowLeft') ? 1 : 0)
    let u = (i.down('Space') || i.touchUp ? 1 : 0) - (i.down('ControlLeft') || i.down('ControlRight') || i.touchDown ? 1 : 0)
    const dead = this.save.settings.stickDead
    const stick = (v: number) => {
      const a = Math.abs(v)
      if (a < dead) return 0
      return Math.sign(v) * clamp(((a - dead) / (1 - dead)) * this.save.settings.stickSens, 0, 1)
    }
    const sy = stick(i.stickY)
    const sx = stick(i.stickX)
    if (sy) f = clamp(f + sy, -1, 1)
    // Gemide dokunmatik joystick'in yatay ekseni gemiyi döndürür (steer), yana kaydırmaz.
    if (sx && !(ship && this.touchy())) s = clamp(s + sx, -1, 1)
    const boost = i.down('ShiftLeft') || i.down('ShiftRight') || i.touchBoost
    return { f, s, u, boost }
  }

  private checkBands() {
    if (this.vis < 12) this.bandFired = [false, false, false]
    BANDS.forEach((band, i) => {
      if (this.bandFired[i] || this.vis < band.at || this.fleets.length >= 3) return
      this.bandFired[i] = true
      if (this.isHome()) {
        // Ev sistemi öğrenme alanı: yalnız çok gürültü (en yüksek eşik) tek küçük gemi çeker.
        if (i < BANDS.length - 1 || this.fleets.some((f) => f.small)) return
        const fleet = this.spawnFleet(1, 0, undefined, 'hunt')
        fleet.small = true
        return
      }
      this.spawnFleet(band.n, band.threat, undefined, 'hunt')
    })
  }

  private updateFleets(worldDt: number) {
    this.seenNotice = Math.max(0, this.seenNotice - worldDt)
    const aim = this.fleetAim()
    for (let i = this.fleets.length - 1; i >= 0; i--) {
      const fleet = this.fleets[i]
      if (fleet.bomber) {
        // Akıncı kendi yolunda (bomberTick); yalnız gemiyle yaklaşınca çatışma başlar.
        if (fleet.pos.distanceTo(this.pos) < 30 && this.mode === 'map' && this.layer === 'ship' && !this.fading) {
          this.beginCombat(fleet)
          return
        }
        continue
      }
      if (fleet.around && fleet.offset) {
        fleet.center.copy(fleet.around.pos).add(fleet.offset)
        if (fleet.state === 'search' && this.layer === 'foot') fleet.lastKnown.copy(fleet.center)
      }
      const dist = fleet.pos.distanceTo(aim)
      const calm = Boolean(fleet.faction && friendly(this.rel[fleet.faction]))
      // Ev sistemindeki küçük eğitim gemileri yalnız çok gürültüde ya da çok yakında fark eder; yerdeyken hiç.
      let sees = !calm && (fleet.small ? (this.vis > 45 || dist < 35) && this.layer === 'ship' : this.vis > 18 || dist < 64)
      if (fleet.scout) {
        // Keşif gemisi avlamaz: gürültülü yaklaşırsan seni fark edip kaçar. Sessiz yaklaşan yakalar.
        fleet.revealed = Math.max(fleet.revealed ?? 0, 2)
        const spotted = dist < 160 && this.vis > 34
        if (spotted && fleet.state === 'patrol') {
          fleet.state = 'leave'
          this.toast('📡 Keşif gemisi seni fark etti ve kaçıyor! Daha sessiz yaklaş (V).')
          this.feed('📡', 'Keşif gemisi kaçtı: çok gürültülüydün', 'bad')
        }
        sees = false
      }
      if (sees && fleet.state !== 'hunt' && fleet.state !== 'leave' && this.seenNotice <= 0) {
        this.seenNotice = 6
        this.feed('📡', `${fleet.faction ? factionName(fleet.faction) : 'Bir'} filosu seni radarında gördü`, 'bad')
      }
      if (fleet.state === 'patrol') {
        fleet.angle += worldDt * 0.12
        vD.set(
          fleet.center.x + Math.cos(fleet.angle) * fleet.orbit,
          fleet.center.y,
          fleet.center.z + Math.sin(fleet.angle) * fleet.orbit,
        )
        this.seekFleet(fleet, vD, worldDt, 16)
        if (sees) fleet.state = 'hunt'
      } else if (fleet.state === 'hunt') {
        if (sees) fleet.lastKnown.copy(aim)
        this.seekFleet(fleet, fleet.lastKnown, worldDt, 22 + fleet.threat * 8)
        if (!sees && fleet.pos.distanceTo(fleet.lastKnown) < 18) {
          fleet.state = 'search'
          fleet.searchLeft = 14
        }
      } else if (fleet.state === 'search') {
        fleet.searchLeft -= worldDt
        fleet.angle += worldDt * 0.7
        vD.set(
          fleet.lastKnown.x + Math.cos(fleet.angle) * 22,
          fleet.lastKnown.y,
          fleet.lastKnown.z + Math.sin(fleet.angle) * 22,
        )
        this.seekFleet(fleet, vD, worldDt, 16)
        if (sees) fleet.state = 'hunt'
        if (fleet.searchLeft <= 0) fleet.state = 'leave'
      } else {
        if (fleet.scout) {
          // Kaçan keşif gemisi oyuncudan uzaklaşır.
          vD.subVectors(fleet.pos, this.pos).setLength(800).add(fleet.pos)
        } else {
          vD.copy(fleet.pos)
          if (vD.lengthSq() < 1) vD.set(0, 0, 1)
          vD.setLength(800)
        }
        this.seekFleet(fleet, vD, worldDt, 30)
        if ((fleet.pos.length() > 640 && !fleet.scout) || dist > 520) this.removeFleet(fleet)
      }
      const now = fleet.pos.distanceTo(this.pos)
      if (now < 30 && fleet.state !== 'leave' && (fleet.state !== 'patrol' || fleet.scout) && this.mode === 'map' && this.layer === 'ship' && !this.fading) {
        // Warband usulü: çatışmadan önce karşılaşma diyaloğu (izci ve konuşulmuş filolar hariç).
        if (fleet.faction && !fleet.talked && !fleet.scout && !this.encounter && !this.noTalk && !this.talkedRecently(fleet.faction)) {
          this.openEncounter(fleet)
          return
        }
        this.beginCombat(fleet)
        return
      }
    }
  }

  /** Gemiler ve filolar gezegenlerin içinden geçmez; yüzeyin `pad` kadar dışına itilir. */
  private keepOutOfPlanets(pos: Vector3, pad: number) {
    for (const planet of this.planets) {
      const min = planet.def.radius + pad
      const d = pos.distanceTo(planet.pos)
      if (d >= min) continue
      if (d < 1e-3) pos.y += min
      else pos.sub(planet.pos).multiplyScalar(min / d).add(planet.pos)
    }
  }

  private seekFleet(fleet: Fleet, target: Vector3, worldDt: number, speed: number) {
    const tx = target.x
    const ty = target.y
    const tz = target.z
    vA.set(tx - fleet.pos.x, ty - fleet.pos.y, tz - fleet.pos.z)
    const d = vA.length()
    if (d > 0.6) vA.multiplyScalar(1 / d)
    else vA.set(0, 0, 0)
    for (const h of this.holes) {
      if (h.kind !== 'hole') continue
      const dist = fleet.pos.distanceTo(h.pos)
      if (dist < h.rs * 2.6) {
        vB.subVectors(fleet.pos, h.pos).normalize()
        vA.addScaledVector(vB, 1.6)
      }
    }
    if (vA.lengthSq() > 0.0001) vA.normalize()
    vA.multiplyScalar(speed)
    fleet.vel.lerp(vA, 1 - Math.exp(-1.7 * Math.max(worldDt, 0.001)))
    fleet.pos.addScaledVector(fleet.vel, worldDt)
    this.keepOutOfPlanets(fleet.pos, 40)
    if (fleet.vel.lengthSq() > 0.5) {
      vB.copy(fleet.vel).normalize()
      quatFromForward(fleet.root.quaternion, vB)
    }
    fleet.root.position.copy(fleet.pos)
  }

  private updateFragments(worldDt: number) {
    const reach = 8 + this.vel.length() * worldDt * 0.25 + this.vel.length() * 0.016
    for (const frag of this.frags) {
      if (!frag.alive) continue
      frag.angle += worldDt * frag.spin
      const bob = Math.sin(this.coordTime * 0.8 + frag.phase) * 1.4
      frag.mesh.position.set(Math.cos(frag.angle) * frag.radius, frag.y + bob, Math.sin(frag.angle) * frag.radius)
      frag.mesh.rotation.y = this.coordTime * 0.5 + frag.phase
      if (frag.mesh.position.distanceTo(this.pos) < reach) {
        frag.alive = false
        frag.mesh.visible = false
        this.energy += 8
        this.addScore(12)
        this.audio.collect()
        this.spawnBoom(frag.mesh.position, 0.45, 0xffc48a)
      }
    }
  }

  private updateEnemy(e: Enemy, dt: number) {
    if (!e.alive) return
    if (e.stun > 0) {
      e.stun -= dt
      e.vel.multiplyScalar(0.9)
      e.root.position.copy(e.pos)
      this.paintEnemyBar(e)
      return
    }
    vA.subVectors(this.pos, e.pos)
    const dist = Math.max(0.001, vA.length())
    vB.copy(vA).multiplyScalar(1 / dist)
    e.strafeT -= dt
    if (e.strafeT <= 0) {
      e.strafe = Math.random() < 0.5 ? -1 : 1
      e.strafeT = 1.2 + Math.random() * 1.8
    }
    vC.crossVectors(vB, WORLD_UP)
    if (vC.lengthSq() < 1e-4) vC.set(1, 0, 0)
    vC.normalize()
    const scared = e.hull < e.hullMax * 0.34 && e.role !== 'avci'
    // Rolüne göre tercih edilen uzaklık: avcı dibine girer, bombacı uzakta durur, kalkanlı orta mesafede.
    const near = e.role === 'avci' ? 12 : e.role === 'bombaci' ? 70 : 22
    const far = e.role === 'avci' ? 40 : e.role === 'bombaci' ? 120 : 74
    const mid = (near + far) / 2
    if (scared) vD.copy(vB).multiplyScalar(-1).addScaledVector(vC, e.strafe * 1.15)
    else if (dist > far) vD.copy(vB).addScaledVector(vC, e.strafe * 0.7)
    else if (dist < near) vD.copy(vB).multiplyScalar(-1).addScaledVector(vC, e.strafe)
    else vD.copy(vC).multiplyScalar(e.strafe).addScaledVector(vB, (dist - mid) * 0.035)
    // Açık kara delikten kaçınır (açan da dahil): yakındaysa dümen dışarı kırılır; yine de içine düşen parçalanır.
    for (const well of this.enemyWells) {
      if (!well.alive) continue
      vO4.subVectors(e.pos, well.pos)
      const wd = vO4.length()
      if (wd < 30 && wd > 0.01) vD.addScaledVector(vO4.normalize(), ((30 - wd) / 30) * 3.2)
    }
    if (vD.lengthSq() < 1e-6) vD.copy(vB)
    vD.normalize()
    const uniMul = UNIVERSES[this.universeId].enemyMul
    const roleSpeed = e.role === 'avci' ? 1.6 : e.role === 'bombaci' ? 0.75 : e.role === 'kalkan' ? 0.85 : 1
    e.vel.addScaledVector(vD, (40 + e.threat * 6) * uniMul * roleSpeed * dt)
    const maxS = (34 + e.threat * 6) * roleSpeed
    if (e.vel.length() > maxS) e.vel.setLength(maxS)
    e.vel.multiplyScalar(Math.max(0, 1 - dt * 0.12))
    e.pos.addScaledVector(e.vel, dt)
    const keep = e.giant ? 16 : 7
    if (dist < keep) e.pos.addScaledVector(vB, -(keep - dist) * 0.45)
    this.keepOutOfPlanets(e.pos, e.giant ? 14 : 6)
    quatFromForward(e.quat, vD)
    e.root.position.copy(e.pos)
    if (e.flashT > 0) {
      e.flashT -= dt
      e.root.position.x += Math.sin(this.clockT * 48) * 0.18
      e.root.position.y += Math.cos(this.clockT * 53) * 0.12
    }
    e.root.quaternion.copy(e.quat)
    this.paintEnemyBar(e)
    this.damageTrail(e, e.pos, e.hull / e.hullMax, dt, e.giant ? 1.8 : 1)
    if (e.bubble) {
      // Kalkanlı: kalkan küresi kalkan bittikçe söner; yavaşça yeniden dolar.
      const k = e.shieldMax > 0 ? e.shield / e.shieldMax : 0
      e.bubble.visible = k > 0.02
      ;(e.bubble.material as MeshBasicMaterial).opacity = 0.1 + 0.25 * k + (e.flashT > 0 ? 0.3 : 0)
      if (e.flashT <= 0) e.shield = Math.min(e.shieldMax, e.shield + e.shieldMax * 0.04 * dt)
    }
    e.cool -= dt
    shipForward(e.quat, vE)
    if (e.cool <= 0 && dist < 165 && (e.attack === 'well' || e.attack === 'gate' || vE.dot(vB) > 0.9)) {
      this.enemyShoot(e, dist)
      const pause = (e.attack === 'well' || e.attack === 'gate' ? 5.1 : e.attack === 'homing' ? 2.1 : e.attack === 'goo' ? 2.4 : 1.3) * (e.role === 'avci' ? 0.55 : e.role === 'bombaci' ? 1.4 : 1)
      e.cool = (pause + Math.random() * 0.6) * (e.giant ? 1.45 : 1) - e.threat * 0.08
    }
  }

  /** Hasarlı gemiden ateş ve duman izi: gövde %50'nin altında başlar, azaldıkça yoğunlaşır. */
  private damageTrail(o: { smokeT?: number }, at: Vector3, frac: number, dt: number, size = 1) {
    if (frac >= 0.5 || frac <= 0) return
    o.smokeT = (o.smokeT ?? 0) - dt
    if (o.smokeT > 0) return
    const bad = 1 - frac / 0.5
    o.smokeT = 0.22 - bad * 0.12
    this.fx.puff(at, 0x2a2624, 1, 0.9 * size + bad * 0.6, 1.3, undefined, false)
    if (bad > 0.35 || Math.random() < 0.5) this.fx.puff(at, 0xff7a2a, 1, 0.55 * size, 0.35, undefined, true)
  }

  shipShake = 0
  private playerSmoke = { smokeT: 0 }

  private paintEnemyBar(e: Enemy) {
    if (!e.bar) return
    const ctx = e.bar.userData.ctx as CanvasRenderingContext2D | null
    const tex = e.bar.userData.tex as { needsUpdate: boolean } | undefined
    if (!ctx || !tex) return
    paintBar(ctx, tex, e.hull / Math.max(1, e.hullMax), e.shield / Math.max(1, e.shieldMax))
  }

  private enemyShoot(e: Enemy, dist: number) {
    if (e.attack === 'well') {
      this.openEnemyWell(e)
      return
    }
    if (e.attack === 'gate') {
      this.openEnemyGate(e)
      return
    }
    // Eşlik gemileri de hedef olur (ekip onların içinde taşınır).
    const esc = this.escorts.length && Math.random() < 0.3 ? this.escorts[Math.floor(Math.random() * this.escorts.length)] : null
    if (esc && esc.visible) {
      vG.subVectors(esc.position, e.pos)
      vG.x += (Math.random() - 0.5) * 3
      vG.y += (Math.random() - 0.5) * 2
      if (vG.lengthSq() > 1e-4) {
        vG.normalize()
        this.spawnShot(false, e.pos, vG, (8 + e.threat * 3) * this.threatMul(), 'bolt')
        this.audio.laser(true)
        return
      }
    }
    const miss = lerp(1.45, 1.05, smoothstep(0, 80, this.properTime))
    const err = (e.attack === 'bolt' ? 7.5 - e.threat * 1.2 : 2.4) * miss
    const fan = e.giant && (e.attack === 'bolt' || e.attack === 'homing') ? 3 : 1
    const dmg = (e.attack === 'goo' ? 6 : 8 + e.threat * 3) * (e.giant ? 1.45 : 1) * (e.small ? 0.45 : 1) * this.threatMul()
    for (let i = 0; i < fan; i++) {
      vF.copy(this.pos).addScaledVector(this.vel, e.attack === 'bolt' ? dist / 128 : 0)
      vF.x += (Math.random() - 0.5) * err + (i - (fan - 1) / 2) * 6
      vF.y += (Math.random() - 0.5) * err * 0.6
      vF.z += (Math.random() - 0.5) * err
      vG.subVectors(vF, e.pos)
      if (vG.lengthSq() < 1e-4) continue
      vG.normalize()
      this.spawnShot(false, e.pos, vG, dmg, e.attack === 'homing' || e.attack === 'goo' ? e.attack : 'bolt')
    }
    this.audio.laser(true)
  }

  openEnemyWell(e: Enemy) {
    const slot = this.enemyWells.find((well) => !well.alive)
    if (!slot) return
    vA.subVectors(this.pos, e.pos)
    if (vA.lengthSq() < 1) vA.set(0, 0, -1)
    vA.normalize()
    slot.owner = e
    slot.pos.copy(e.pos).addScaledVector(vA, 18)
    slot.life = 4.5
    this.toast(`⚠ ${this.combatFaction ? factionName(this.combatFaction) : 'Amiral'} kara delik açtı! Olay ufkuna düşen parçalanır — uzaklaş.`)
    slot.alive = true
    slot.mesh.visible = true
    slot.mesh.position.copy(slot.pos)
    this.audio.warning()
  }

  private updateShots(dt: number) {
    for (const shot of this.shots) {
      if (!shot.alive) continue
      shot.prev.copy(shot.pos)
      shot.pos.addScaledVector(shot.vel, dt)
      shot.age += dt
      // Roket ve güdümlü füzeler arkasında duman izi bırakır.
      if ((shot.kind === 'rocket' || shot.kind === 'homing') && Math.floor(shot.age / 0.05) !== Math.floor((shot.age - dt) / 0.05)) {
        this.fx.puff(shot.prev, shot.friendly ? 0x8a8680 : 0x6a4a44, 1, 0.9, 0.9)
        this.fx.flash(shot.prev, 0xffa040, 0.9, 0.08)
      }
      if (shot.kind === 'rocket' || (!shot.friendly && (shot.kind === 'homing' || shot.kind === 'goo'))) {
        let target: Enemy | null = null
        if (shot.friendly) {
          let bestD = 240
          for (const e of this.enemies) {
            if (!e.alive) continue
            const d = e.pos.distanceTo(shot.pos)
            if (d < bestD) {
              target = e
              bestD = d
            }
          }
        }
        if (shot.friendly && target) vB.subVectors(target.pos, shot.pos)
        else if (!shot.friendly) vB.subVectors(this.pos, shot.pos)
        else vB.set(0, 0, 0)
        if (vB.lengthSq() > 1) {
          vB.normalize()
          const steer = shot.kind === 'goo' ? 26 : shot.kind === 'rocket' ? 36 : 48
          shot.vel.addScaledVector(vB, steer * dt)
          const cap = shot.kind === 'goo' ? 46 : shot.kind === 'rocket' ? 84 : 96
          if (shot.vel.length() > cap) shot.vel.setLength(cap)
        }
      }
      shot.mesh.position.copy(shot.pos)
      if (shot.vel.lengthSq() > 0.01) shot.mesh.lookAt(vA.copy(shot.pos).add(shot.vel))
      const life = shot.kind === 'goo' ? 3.5 : shot.kind === 'homing' || shot.kind === 'rocket' ? 2.6 : shot.kind === 'pellet' ? 0.62 : shot.kind === 'laser' || shot.kind === 'chain' ? 0.72 : shot.kind === 'plasma' ? 1.5 : 1.45
      if (shot.age > life) {
        this.killShot(shot)
        continue
      }
      if (shot.age < 0.04) continue
      if (shot.friendly && (this.hitOutpost(shot) || this.hitNatives(shot))) {
        this.killShot(shot)
        continue
      }
      if (shot.friendly && this.enemies.length) {
        let hit: Enemy | null = null
        let weak = false
        let best = 99
        for (const e of this.enemies) {
          if (!e.alive) continue
          const bodyR = e.giant ? 2.6 * e.scale : 3.4
          const bodyD = distPointSeg(e.pos, shot.prev, shot.pos)
          if (e.weak) {
            e.root.updateWorldMatrix(true, true)
            e.weak.getWorldPosition(vC)
            const weakD = distPointSeg(vC, shot.prev, shot.pos)
            if (weakD < 0.7 * e.scale && weakD < best) {
              hit = e
              weak = true
              best = weakD
              continue
            }
          }
          if (!weak && bodyD < bodyR && bodyD < best) {
            hit = e
            weak = false
            best = bodyD
          }
        }
        if (hit) {
          this.hurtEnemy(hit, shot.dmg * (weak ? 2.7 : 1))
          this.impactFx(shot.kind, hit.pos, shot.pos)
          if (shot.kind === 'rocket') {
            // Roket patlar: çevresindekilere de hasar.
            for (const other of this.enemies) {
              if (!other.alive || other === hit) continue
              if (other.pos.distanceTo(hit.pos) < 9) this.hurtEnemy(other, shot.dmg * 0.55)
            }
          }
          if (shot.kind === 'plasma') {
            const splash = this.originId === 'gliese' ? 8 : 6
            for (const other of this.enemies) {
              if (!other.alive || other === hit) continue
              if (other.pos.distanceTo(hit.pos) < splash) this.hurtEnemy(other, shot.dmg * 0.45)
            }
          }
          if (shot.kind === 'chain' && shot.hops > 1) {
            let next: Enemy | null = null
            let nextD = 42
            for (const other of this.enemies) {
              if (!other.alive || other === hit) continue
              const d = other.pos.distanceTo(hit.pos)
              if (d < nextD) {
                next = other
                nextD = d
              }
            }
            if (next) {
              this.zap(hit.pos, next.pos, 0xb8e6ff)
              vG.subVectors(next.pos, hit.pos)
              if (vG.lengthSq() > 0.01) {
                vG.normalize()
                this.spawnShot(true, hit.pos, vG, shot.dmg * 0.72, 'chain', shot.hops - 1)
              }
            }
          }
          this.killShot(shot)
        }
      } else if (!shot.friendly && distPointSeg(this.pos, shot.prev, shot.pos) < (shot.kind === 'goo' ? 2.3 : 1.85)) {
        this.hurtPlayer(shot.dmg)
        if (shot.kind === 'goo') this.vel.multiplyScalar(0.62)
        this.killShot(shot)
      } else if (!shot.friendly && this.escorts.length) {
        for (let i = 0; i < this.escorts.length; i++) {
          const es = this.escorts[i]
          if (!es.visible || distPointSeg(es.position, shot.prev, shot.pos) > 1.6) continue
          es.userData.hull = ((es.userData.hull as number) ?? 70) - shot.dmg
          this.fx.flash(es.position, 0xff7a3a, 1.6, 0.15)
          this.killShot(shot)
          if ((es.userData.hull as number) <= 0) this.loseEscort(i, 'Eşlik gemin düşürüldü.')
          break
        }
      }
    }
  }

  private hurtPlayer(dmg: number, quiet = false) {
    // Kaçınma taklası sırasında mermiler sıyırır.
    if (this.dodgeT > 0 && this.layer === 'ship') return
    if (!quiet) this.hitCd = 2.25
    const shieldBefore = this.shield
    if (this.shield > 0) {
      this.shield -= dmg
      if (this.shield < 0) {
        this.hull += this.shield
        this.shield = 0
      }
      if (!quiet) {
        this.shieldFlash = 1
        this.hurtV = Math.max(this.hurtV, shieldBefore > dmg ? 0.4 : 0.75)
        this.audio.hit(true)
      }
    } else {
      this.hull -= dmg
      if (!quiet) {
        this.hurtV = 1
        this.audio.hit(false)
      }
    }
    if (!quiet) this.trauma = Math.min(1, this.trauma + 0.42)
    if (!quiet && this.layer === 'ship') this.shipShake = Math.min(1, this.shipShake + (shieldBefore > 0 ? 0.45 : 0.85))
    if (!quiet && this.layer === 'ship') {
      // Gemiye isabet belirgin: kıvılcım, ışık ve kırmızı hasar sayısı.
      this.fx.flash(this.pos, shieldBefore > 0 ? 0x7ad7ff : 0xff5a3a, 3, 0.2)
      if (shieldBefore <= 0) this.fx.debris(this.pos, vU.set(0, 1, 0), 0x4a4a50, 4, 6, 0.8, 'metal')
      this.floatDamage(vU.copy(this.pos).add(vV.set(0, 1.6, 0)), dmg, 'hurt')
    }
    if (this.hull <= 0) {
      this.hull = 0
      this.lose('combat')
    }
  }

  private hurtEnemy(e: Enemy, dmg: number) {
    if (e.shield > 0) {
      e.shield -= dmg
      if (e.shield < 0) {
        e.hull += e.shield
        e.shield = 0
      }
    } else e.hull -= dmg
    e.flashT = 0.16
    e.bodyFlash()
    this.floatDamage(e.pos, dmg)
    this.hitMark = 0.18
    this.trauma = Math.min(0.45, this.trauma + 0.1)
    if (e.hull <= 0) {
      e.alive = false
      e.root.visible = false
      this.spawnBoom(e.pos, 1.15, 0xff6644)
      this.fx.explosion(e.pos, 0xff7a3a, e.giant ? 3 : 1.6)
      this.dropLoot(e.pos, e.small ? 12 : Math.round((14 + e.threat * 6) * (e.giant ? 2.5 : 1)), e.small ? 2 : e.giant ? 6 : 3)
      this.kills++
      this.addScore(45)
      this.audio.boom()
      this.trauma = Math.min(1, this.trauma + 0.18)
      if (this.enemies.every((en) => !en.alive)) this.winCombat()
    }
  }

  private updateBooms(dt: number) {
    for (const b of this.booms) {
      if (!b.alive) continue
      b.age += dt
      const pos = b.positions
      const vel = b.vels
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += vel[i] * dt
        pos[i + 1] += vel[i + 1] * dt
        pos[i + 2] += vel[i + 2] * dt
      }
      b.points.geometry.attributes.position.needsUpdate = true
      const k = 1 - b.age / b.life
      b.mat.opacity = Math.max(0, k)
      b.sprite.scale.setScalar(1.2 + b.age * 8)
      b.spriteMat.opacity = Math.max(0, k * 0.8)
      if (b.age >= b.life) {
        b.alive = false
        b.points.visible = false
        b.sprite.visible = false
      }
    }
  }

  private updateCamera(dt: number) {
    if (this.photo) {
      this.photoCamera()
      return
    }
    const flight = this.mode === 'map' || this.mode === 'combat' || this.mode === 'upgrade' || this.mode === 'pause'
    if (this.mode === 'select' || !flight) return
    const onFoot = this.layer === 'foot' && !(this.mode === 'combat' || (this.mode === 'pause' && this.pausedFrom === 'combat'))
    if (this.cine) return
    if (onFoot && this.footPlanet) {
      this.footCamera(dt)
      return
    }
    const cockpit = this.camMode === 'cockpit' && this.mode !== 'upgrade'
    shipForward(this.quat, vB)
    shipUp(this.quat, vC)
    const coarse = this.mobileCam || COARSE.matches || window.innerWidth < 820
    if (cockpit) {
      // Kokpit: kamera pilotun gözünde, gemiye kilitli (gecikme yok: iç mekân kameradan kaçmaz).
      vA.copy(this.pos).addScaledVector(vB, 0.22).addScaledVector(vC, 0.36)
      this.camera.position.copy(vA)
      this.camera.quaternion.copy(this.quat)
      this.camQ.copy(this.quat)
    } else {
      // Kovalama kamerası: geminin yönelimini yumuşakça izleyen bir "kamera yönelimi" (camQ) tutulur;
      // kamera her zaman tam o yönelimin arkasında sabit uzaklıkta durur. Ani dönüşte konum sıçramaz,
      // kamera titremez; sadece dönüş biraz gecikmeyle (yumuşak) izlenir.
      if (this.snapCamera) this.camQ.copy(this.quat)
      else this.camQ.slerp(this.quat, 1 - Math.exp(-(coarse ? 4.2 : 5.5) * dt))
      const want = clamp((coarse ? 14 : 9) + this.vel.length() * (coarse ? 0.045 : 0.03), coarse ? 14 : 9, coarse ? 26 : 16)
      this.camDist = this.snapCamera ? want : this.camDist + (want - this.camDist) * (1 - Math.exp(-3 * dt))
      const dist = this.camDist
      shipForward(this.camQ, vB)
      shipUp(this.camQ, vC)
      vD.copy(vB).multiplyScalar(-dist).addScaledVector(vC, dist * 0.18)
      if (Math.abs(this.shipOrbitYaw) + Math.abs(this.shipOrbitPitch) > 0.002) {
        // Gemi çevresinde yörünge: ofseti kameranın yukarı ve sağ ekseninde döndür.
        shipRight(this.camQ, vF)
        vD.applyAxisAngle(vC, this.shipOrbitYaw).applyAxisAngle(vF.applyAxisAngle(vC, this.shipOrbitYaw), this.shipOrbitPitch)
      }
      this.camera.position.copy(this.pos).add(vD)
      vE.copy(this.pos).addScaledVector(vB, coarse ? 0.25 : 0.55)
      this.camUp.copy(vC)
      this.camera.up.copy(vC)
      this.camera.lookAt(vE)
    }
    this.snapCamera = false
    const targetFov = clamp(62 + this.vel.length() * 0.03 + (this.boosting ? 2 : 0) + this.trauma * 2, 62, 72)
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-6 * dt))
    this.camera.updateProjectionMatrix()
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.7)
      const s = this.trauma * this.trauma
      this.camera.position.x += (Math.random() - 0.5) * s * 0.18
      this.camera.position.y += (Math.random() - 0.5) * s * 0.18
      if (!cockpit) this.camera.lookAt(vE)
    }
    if (this.shipShake > 0) {
      // İsabet sarsıntısı: gemi gövdesi (ve kokpit içi) belirgin biçimde sarsılır.
      this.shipShake = Math.max(0, this.shipShake - dt * 2.4)
      const s = this.shipShake * this.shipShake
      const r = this.visual.root
      r.position.x += (Math.random() - 0.5) * s * (cockpit ? 0.05 : 0.5)
      r.position.y += (Math.random() - 0.5) * s * (cockpit ? 0.05 : 0.5)
      qF.setFromEuler(eTmp.set((Math.random() - 0.5) * s * 0.16, (Math.random() - 0.5) * s * 0.1, (Math.random() - 0.5) * s * 0.22))
      r.quaternion.multiply(qF)
      if (cockpit) {
        qF.setFromEuler(eTmp.set((Math.random() - 0.5) * s * 0.03, (Math.random() - 0.5) * s * 0.03, (Math.random() - 0.5) * s * 0.05))
        this.camera.quaternion.multiply(qF)
      }
    }
    if (this.layer === 'ship' && (this.mode === 'map' || this.mode === 'combat')) {
      shipForward(this.quat, vF)
      vG.copy(this.pos).addScaledVector(vF, -1.6)
      this.damageTrail(this.playerSmoke, vG, this.hull / this.hullMax, dt)
      for (const es of this.escorts) if (es.visible) this.damageTrail(es.userData as { smokeT?: number }, es.position, ((es.userData.hull as number) ?? 70) / 70, dt, 0.7)
    }
    this.cockpitFx(cockpit)
  }

  ckYaw = 0
  ckPitch = 0
  ckKick = 0
  ckFire = [0, 0]

  /** Kokpit içi canlılık: kumanda kolları dönüşe göre eğilir, eller onlarla gider, ateşte geri teper, düğmeler yanıp söner. */
  private cockpitFx(on: boolean) {
    const ck = this.visual?.cockpit
    if (!on || !ck?.visible) return
    const dt = 1 / 60
    const yaw = clamp(this.input.mouseX * 0.04 + this.input.stickX, -1, 1)
    const pitch = clamp(this.input.mouseY * 0.04 - this.input.stickY * 0.5, -1, 1)
    this.ckYaw += (yaw - this.ckYaw) * 0.18
    this.ckPitch += (pitch - this.ckPitch) * 0.18
    const firing = this.input.mouseDown || this.input.touchFire
    if (firing) this.ckKick = Math.min(1, this.ckKick + 0.5)
    this.ckKick = Math.max(0, this.ckKick - dt * 6)
    const sticks = ck.userData.sticks as Group[] | undefined
    const arms = ck.userData.arms as Group[] | undefined
    sticks?.forEach((st, i) => {
      st.rotation.z = -this.ckYaw * 0.35
      st.rotation.x = this.ckPitch * 0.3 + (i === 1 ? this.ckKick * 0.12 : 0)
    })
    arms?.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1
      arm.position.set(side * 0.17 - this.ckYaw * 0.03, 0.25 - this.ckPitch * 0.02, -0.56 + this.ckKick * 0.025)
      arm.rotation.set(0.95 + this.ckPitch * 0.12, side * 0.45, -this.ckYaw * 0.25)
    })
    const guns = ck.userData.guns as Group[] | undefined
    const flashes = ck.userData.flashes as Sprite[] | undefined
    guns?.forEach((gun, i) => {
      this.ckFire[i] = Math.max(0, this.ckFire[i] - dt * 9)
      gun.position.z = -0.9 + this.ckFire[i] * 0.06
      const f = flashes?.[i]
      if (f) {
        ;(f.material as SpriteMaterial).opacity = this.ckFire[i]
        f.scale.setScalar(0.25 + this.ckFire[i] * 0.35)
        f.material.rotation = Math.random() * 6
      }
    })
    const buttons = ck.userData.buttons as Mesh[] | undefined
    if (buttons) {
      const t = this.clockT
      buttons.forEach((b, i) => {
        b.visible = Math.sin(t * (1.3 + (i % 5) * 0.7) + i * 1.7) > -0.55
      })
    }
  }

  private updateLens() {
    const u = this.lensPass.uniforms
    const focus = this.lensFocus()
    // Seçim ekranında mercek kapalı: karakter sahnesi bükülmesin (oyundaki mercek etkisi aynen duruyor).
    const show = focus && !(this.mode === 'intro' && this.introT < 17) && this.mode !== 'select'
    if (!show || !focus) {
      u.uEnabled.value = 0
      return
    }
    vA.copy(focus.pos).applyMatrix4(this.camera.matrixWorldInverse)
    if (vA.z > -0.25) {
      u.uEnabled.value = 0
      return
    }
    vB.copy(focus.pos).project(this.camera)
    u.uEnabled.value = 1
    ;(u.uBhUv.value as Vector2).set(vB.x * 0.5 + 0.5, vB.y * 0.5 + 0.5)
    u.uBhDepth.value = vB.z * 0.5 + 0.5
    const dist = Math.max(this.camera.position.distanceTo(focus.pos), 0.5)
    const half = Math.tan(MathUtils.degToRad(this.camera.fov) / 2)
    const ndcR = Math.tan(Math.atan(focus.rs / dist)) / half
    u.uBhRadius.value = ndcR * 0.5
    u.uAspect.value = this.camera.aspect
  }

  private refreshHud() {
    const r = this.pos.length()
    this.domSet('clk-local', clock(this.properTime))
    this.domSet('clk-out', clock(this.coordTime))
    this.domSet('time-ratio', `${fmt2(this.tf)}×`)
    this.domSet('world-mul', `dış dünya ×${fmt2(this.worldScale)}`)
    must<HTMLElement>('ratio-fill').style.width = `${clamp(this.tf, 0, 1) * 100}%`
    this.domSet('speed', fmt(this.vel.length()))
    this.domSet('dist', fmt(r))
    this.domSet('score', fmt(this.score))
    this.domSet('best', fmt(this.best))
    this.domSet('energy', fmt(this.energy))
    this.domSet('hull-num', fmt(Math.max(0, this.hull)))
    this.domSet('shield-num', fmt(Math.max(0, this.shield)))
    this.domSet('vis-num', fmt(this.vis))
    must<HTMLElement>('hull-fill').style.width = `${clamp(this.hull / this.hullMax, 0, 1) * 100}%`
    must<HTMLElement>('shield-fill').style.width = `${clamp(this.shield / this.shieldMax, 0, 1) * 100}%`
    must<HTMLElement>('vis-fill').style.width = `${clamp(this.vis, 0, 100)}%`
    this.dom.vis.classList.toggle('warm', this.vis >= 36 && this.vis < 80)
    this.dom.vis.classList.toggle('hot', this.vis >= 80)
    must<HTMLDivElement>('badge-easy').classList.toggle('hidden', !this.save.settings.easy)
    must<HTMLDivElement>('badge-stable').classList.toggle('hidden', this.stabilizeT <= 0)
    this.hurtV = Math.max(0, this.hurtV - 0.016)
    this.dom.hurt.style.opacity = String(this.hurtV)
    this.dom.grav.style.opacity = this.mode === 'map' ? String(clamp((78 - r) / 58, 0, 1) * 0.9) : '0'
    shipForward(this.quat, vA)
    shipUp(this.quat, vB)
    shipRight(this.quat, vC)
    const pitch = Math.asin(clamp(vA.y, -1, 1))
    const roll = Math.atan2(vC.y, vB.y)
    const pitchPx = clamp(-pitch, -0.7, 0.7) * 120
    this.dom.horizon.style.transform = `translateY(${pitchPx}px) rotate(${roll}rad)`
    let hot = false
    if (this.fighting()) {
      for (const e of this.enemies) {
        if (!e.alive) continue
        vD.subVectors(e.pos, this.pos)
        const d = vD.length()
        if (d < 170 && vA.dot(vD.multiplyScalar(1 / d)) > 0.985) hot = true
      }
    }
    this.dom.cross.classList.toggle('hot', hot)
    this.dom.lock.classList.toggle('hidden', this.holdPose || this.input.locked || (this.mode !== 'map' && this.mode !== 'combat'))
    let prompt = ''
    const gate = this.enemyGates.find((item) => item.alive && this.pos.distanceTo(item.pos) < 18)
    if (this.mode === 'combat') {
      const alive = this.enemies.filter((e) => e.alive).length
      if (gate) prompt = `Eşik → ${UNIVERSES[gate.to].name}`
      else prompt = this.canFlee() ? 'F — kaç' : `Düşman ${alive}`
    } else if (this.mode === 'map') {
      const near = this.nearestFleet(150)
      const lethal = this.holes.find((h) => h.kind === 'hole' && this.pos.distanceTo(h.pos) < h.rs * 2.1)
      const throat = this.holes.find((h) => h.kind === 'worm' && this.pos.distanceTo(h.pos) < 46)
      const land = this.layer === 'ship' ? this.nearestLandable() : null
      if (this.layer === 'foot' && this.footPlanet) {
        prompt = this.footPrompt()
      } else if (lethal) prompt = 'Olay ufkuna çok yakınsın'
      else if (throat?.to) prompt = `Eşik → ${UNIVERSES[throat.to].name}`
      else if (land) {
        const lc = this.colonies[land.def.id]
        prompt = lc && lc.universe === this.universeId && this.mine(lc) ? `L — buraya in · Shift+L — üsse in · ${land.def.name}` : `L — in · ${land.def.name}`
      }
      else if (near && near.fleet.state !== 'leave') prompt = near.dist < 48 ? 'F — kapış · çok yakın' : 'F — kapış'
    }
    const names = this.holes.filter((h) => h.kind === 'worm' && h.to).map((h) => UNIVERSES[h.to as UniId].name)
    const home = UNIVERSES[homeSystem(this.originId)]
    this.domSet('worm-net', names.length ? `Ağ → ${names.join(' · ')}` : '')
    this.domSet('netmap', `Ev: ${home.name}${this.isHome() ? ' · buradasın' : ''}${names.length ? ` · kapı: ${names.join(', ')}` : ''}`)
    must<HTMLElement>('home-flag').classList.toggle('hidden', !this.isHome())
    // Telefonda saatler yalnız zaman bükülürken görünür; yeteneği olmayan ırkta G/H düğmesi gizlenir.
    document.body.classList.toggle('rel', this.tf < 0.97 || this.worldScale > 1.03)
    const affordable = this.mode === 'map' && this.canUpgrade() && this.tutorialAt('upgrade')
    must<HTMLElement>('upgrade-hint').classList.toggle('hidden', !(affordable && this.layer === 'ship' && !this.fighting()))
    document.body.classList.toggle('upgrade-ready', affordable && this.nearParkedShip())
    const origin = this.origin()
    document.body.classList.toggle('no-ab1', !origin.ability)
    document.body.classList.toggle('no-ab2', !origin.ability2)
    const heatEl = must<HTMLElement>('heat')
    heatEl.classList.toggle('hidden', this.heat < 0.01)
    heatEl.classList.toggle('burn', this.burning)
    must<HTMLElement>('heat-fill').style.width = `${clamp(this.heat, 0, 1) * 100}%`
    must<HTMLElement>('heat-txt').textContent = this.burning ? 'Isı: yanıyorsun!' : `Güneş şarjı +${this.solarGain.toFixed(0)}/sn`
    must<HTMLElement>('hitmark').classList.toggle('on', this.hitMark > 0)
    this.hitMark = Math.max(0, this.hitMark - 0.016)
    this.paintLock()
    this.paintFloats()
    this.paintBase()
    const weapon = WEAPONS.find((item) => item.id === this.weapon)
    this.domSet('weapon-name', weapon?.name ?? 'Lazer')
    const landBtn = document.querySelector<HTMLButtonElement>('#touch-buttons button[data-act="land"]')
    if (landBtn) landBtn.textContent = this.layer === 'foot' ? 'Bin' : 'İn'
    this.domSet('uni-name', UNIVERSES[this.universeId].name)
    this.paintAbilities()
    this.updateLod()
    this.paintBeacons()
    this.paintRoute()
    this.paintQuestMark()
    this.paintShipMark()
    this.paintDepositMark()
    this.paintBaseMark()
    this.paintAttitude()
    if (this.dom.prompt.textContent !== prompt) this.dom.prompt.textContent = prompt
    if (this.toastT > 0) {
      this.toastT -= 0.016
      if (this.toastT <= 0) this.dom.toast.textContent = ''
    }
    this.drawRadar()
  }

  private toggleRadar() {
    this.radarMode = this.radarMode === 'radar' ? 'system' : 'radar'
    this.audio.ui()
  }

  /** Tek bakışta sistem: yörüngeler, gezegenler, karakollar, kapılar (nereye gittikleriyle), sen ve rotan. Kuzey yukarıda. */
  private drawSystemMap() {
    const ctx = this.radar
    const w = 180
    ctx.clearRect(0, 0, w, w)
    ctx.save()
    ctx.beginPath()
    ctx.arc(90, 90, 86, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = 'rgba(7,9,13,0.55)'
    ctx.fillRect(0, 0, w, w)
    const extent = Math.max(400, this.mapLimit - 900)
    const scale = 80 / extent
    const X = (p: Vector3) => 90 + p.x * scale
    const Y = (p: Vector3) => 90 + p.z * scale
    ctx.lineWidth = 1
    for (const planet of this.planets) {
      const flat = Math.hypot(planet.pos.x, planet.pos.z)
      if (flat < 1) continue
      ctx.strokeStyle = 'rgba(231,227,218,0.09)'
      ctx.beginPath()
      ctx.arc(90, 90, flat * scale, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const h of this.holes) {
      if (h.kind !== 'hole') continue
      ctx.strokeStyle = 'rgba(228,161,92,0.9)'
      ctx.beginPath()
      ctx.arc(X(h.pos), Y(h.pos), 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    const target = this.waypoint()
    for (const planet of this.planets) {
      const r = Math.max(planet.def.heat ? 4 : 1.8, Math.min(6, planet.def.radius * scale * 1.6))
      ctx.fillStyle = `#${planet.def.color.toString(16).padStart(6, '0')}`
      ctx.beginPath()
      ctx.arc(X(planet.pos), Y(planet.pos), r, 0, Math.PI * 2)
      ctx.fill()
      const c = this.colonies[planet.def.id]
      if (c) {
        ctx.strokeStyle = this.mine(c) ? '#7dff8a' : '#ff5a4a'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(X(planet.pos), Y(planet.pos), r + 2.4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = 1
      }
    }
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    for (const h of this.holes) {
      if (h.kind !== 'worm' || !h.to) continue
      const hot = target === h.pos
      ctx.strokeStyle = hot ? '#ffe27a' : '#7ad7ff'
      ctx.lineWidth = hot ? 2.2 : 1.4
      ctx.beginPath()
      ctx.arc(X(h.pos), Y(h.pos), 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = hot ? '#ffe27a' : '#bfeaff'
      const label = UNIVERSES[h.to].name.split(' ')[0].slice(0, 7)
      ctx.fillText(h.to === homeSystem(this.originId) ? `⌂${label}` : label, X(h.pos), Y(h.pos) - 7)
    }
    for (const fl of this.fleets) {
      ctx.fillStyle = '#e15b4c'
      ctx.fillRect(X(fl.pos) - 1.5, Y(fl.pos) - 1.5, 3, 3)
    }
    if (target) {
      ctx.strokeStyle = 'rgba(255,226,122,0.7)'
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(X(this.pos), Y(this.pos))
      ctx.lineTo(X(target), Y(target))
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
    shipForward(this.quat, vA)
    const ang = Math.atan2(vA.x, -vA.z)
    const px = clamp(X(this.pos), 8, 172)
    const py = clamp(Y(this.pos), 8, 172)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(ang)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(0, -7)
    ctx.lineTo(-4.5, 5)
    ctx.lineTo(4.5, 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawRadar() {
    const label = this.radarMode === 'system' && !this.fighting() ? `Sistem · N` : 'Radar · N'
    this.domSet('radar-label', label)
    if (this.radarMode === 'system' && !this.fighting()) {
      this.drawSystemMap()
      return
    }
    const ctx = this.radar
    const w = 180
    ctx.clearRect(0, 0, w, w)
    ctx.save()
    ctx.beginPath()
    ctx.arc(90, 90, 84, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = 'rgba(7,9,13,0.2)'
    ctx.fillRect(0, 0, w, w)
    ctx.strokeStyle = 'rgba(231,227,218,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(90, 90, 36, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(90, 90, 64, 0, Math.PI * 2)
    ctx.stroke()
    const combat = this.fighting()
    const range = combat ? 170 : RADAR_RANGE
    const scale = 76 / range
    shipForward(this.quat, vA)
    const yaw = Math.atan2(vA.x, -vA.z)
    const c = Math.cos(-yaw)
    const s = Math.sin(-yaw)
    const blip = (p: Vector3, color: string, rad: number) => {
      const dx = p.x - this.pos.x
      const dz = p.z - this.pos.z
      const rx = dx * c - dz * s
      const rz = dx * s + dz * c
      const x = 90 + rx * scale
      const y = 90 + rz * scale
      if ((x - 90) ** 2 + (y - 90) ** 2 > 80 ** 2) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
    if (!combat) {
      for (const h of this.holes) {
        if (h.kind === 'worm') blip(h.pos, '#7ad7ff', 3.5)
        else {
          blip(h.pos, '#07080c', 5)
          const dx = h.pos.x - this.pos.x
          const dz = h.pos.z - this.pos.z
          const x = 90 + (dx * c - dz * s) * scale
          const y = 90 + (dx * s + dz * c) * scale
          ctx.strokeStyle = 'rgba(228,161,92,0.8)'
          ctx.beginPath()
          ctx.arc(x, y, Math.max(3, h.rs * scale), 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.font = '10px sans-serif'
      for (const planet of this.planets) {
        blip(planet.pos, planet.def.kind === 'small' ? '#8fd0c6' : '#e4a15c', planet.def.kind === 'small' ? 2.4 : 4)
        const dy = planet.pos.y - this.pos.y
        if (Math.abs(dy) < 28) continue
        const dx = planet.pos.x - this.pos.x
        const dz = planet.pos.z - this.pos.z
        const x = 90 + (dx * c - dz * s) * scale
        const y = 90 + (dx * s + dz * c) * scale
        if ((x - 90) ** 2 + (y - 90) ** 2 > 70 ** 2) continue
        ctx.fillStyle = dy > 0 ? '#f3d7b0' : '#8fd0c8'
        ctx.fillText(dy > 0 ? '▲' : '▼', x - 3, y - 6)
      }
      for (const f of this.frags) if (f.alive) blip(f.mesh.position, '#e4a15c', 2)
      for (const fl of this.fleets) {
        const friend = fl.faction && friendly(this.rel[fl.faction])
        blip(fl.pos, fl.revealed ? '#ffd27a' : friend ? '#8ff0a4' : '#e15b4c', fl.revealed ? 4.5 : 3.5)
      }
      if (this.scanT > 0) {
        ctx.strokeStyle = 'rgba(122, 215, 255, 0.5)'
        ctx.beginPath()
        ctx.arc(90, 90, Math.min(76, (SCAN_RANGE / range) * 76), 0, Math.PI * 2)
        ctx.stroke()
      }
      // Görev hedefi: radarda kenara yapışan altın elmas.
      const obj = this.save.settings.guide ? this.objectiveSpot() : null
      if (obj) {
        const dx = obj.pos.x - this.pos.x
        const dz = obj.pos.z - this.pos.z
        let x = (dx * c - dz * s) * scale
        let y = (dx * s + dz * c) * scale
        const m = Math.hypot(x, y)
        if (m > 74) {
          x *= 74 / m
          y *= 74 / m
        }
        ctx.save()
        ctx.translate(90 + x, 90 + y)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = '#ffd38a'
        ctx.shadowColor = '#ffb050'
        ctx.shadowBlur = 8
        ctx.fillRect(-4, -4, 8, 8)
        ctx.restore()
      }
      if (this.layer === 'foot' && this.footPlanet) {
        for (const d of this.footPlanet.deposits) {
          if (d.left <= 0) continue
          blip(this.surfacePos(this.worldDir(d.dir, this.footPlanet, vQ), this.footPlanet, 1, vR), d.kind === 'ore' ? '#ffb43a' : '#6af0ff', 2.5)
        }
      }
    } else {
      for (const e of this.enemies) if (e.alive) blip(e.pos, e.stun > 0 ? '#9ae7ff' : e.giant ? '#ffd27a' : e.human ? '#d5dbe6' : '#e15b4c', e.giant ? 6 : 3.2)
      for (const g of this.enemyGates) if (g.alive) blip(g.pos, '#7ad7ff', 4)
      if (this.wellLife > 0) blip(this.wellPos, '#ffe2b0', 4)
    }
    ctx.restore()
    ctx.fillStyle = '#e7e3da'
    ctx.beginPath()
    ctx.moveTo(90, 80)
    ctx.lineTo(85, 98)
    ctx.lineTo(95, 98)
    ctx.closePath()
    ctx.fill()
  }

  private applyPresentation() {
    const flight = this.mode === 'map' || this.mode === 'combat' || this.mode === 'pause' || this.mode === 'upgrade'
    const combatView = this.mode === 'combat' || (this.mode === 'pause' && this.pausedFrom === 'combat')
    this.mapRoot.visible = !combatView && this.mode !== 'intro' && this.mode !== 'select'
    if (this.mode === 'intro') this.mapRoot.visible = this.introT > 16
    this.combatRoot.visible = combatView || flight
    const showShip = flight || this.mode === 'select'
    this.visual.root.visible = showShip
    const onFoot = this.layer === 'foot' && !combatView
    // Üzerinde yürünen gezegenin atmosfer kabuğu ve bulutları içeriden görünmesin.
    if (this.atmoHidden !== (onFoot ? this.footPlanet : null)) {
      for (const p of this.planets) {
        const hide = onFoot && p === this.footPlanet
        for (const name of ['atmo', 'clouds']) {
          const o = p.mesh.getObjectByName(name)
          if (o) o.visible = !hide
        }
      }
      this.atmoHidden = onFoot ? this.footPlanet : null
    }
    setShipHalos(this.visual.root, !onFoot || this.mode === 'select')
    const cockpit = this.camMode === 'cockpit' && flight && this.mode !== 'upgrade' && !onFoot
    this.visual.body.visible = !cockpit
    this.visual.cockpit.visible = cockpit
    this.visual.shield.visible = !cockpit && this.shield > 0 && !onFoot && this.mode !== 'select'
    const beacon = this.visual.root.getObjectByName('beacon')
    if (beacon) beacon.visible = !cockpit
    if (this.walker) this.walker.visible = onFoot && this.mapRoot.visible
    document.body.classList.toggle('on-foot', onFoot)
    document.body.classList.toggle('cockpit', cockpit && (this.mode === 'map' || this.mode === 'combat' || this.mode === 'pause'))
    document.body.classList.toggle('paused', this.mode === 'pause')
    this.dom.hud.classList.toggle('hidden', !flight)
    this.dom.intro.classList.toggle('hidden', this.mode !== 'intro')
    this.dom.title.classList.toggle('hidden', this.mode !== 'title')
    must<HTMLDivElement>('select').classList.toggle('hidden', this.mode !== 'select')
    this.dom.pause.classList.toggle('hidden', this.mode !== 'pause')
    this.dom.upgrade.classList.toggle('hidden', this.mode !== 'upgrade')
    this.dom.gameover.classList.toggle('hidden', this.mode !== 'gameover')
    this.dom.cross.classList.toggle('hidden', !flight || (this.layer === 'foot' && !combatView))
    this.introPoints.visible = this.mode === 'intro' && this.introT > 4.6 && this.introT < 33
  }

  private toggleCam() {
    this.camMode = this.camMode === 'chase' ? 'cockpit' : 'chase'
    this.snapCamera = true
    this.audio.ui()
  }

  private canFlee() {
    if (this.combatTime < 3) return false
    let min = Infinity
    for (const e of this.enemies) if (e.alive) min = Math.min(min, e.pos.distanceTo(this.pos))
    return this.pos.length() > 175 && min > 105
  }

  /** Filo yakalayınca savaş olduğun yerde başlar: sahne, kamera ve mod değişmez. */
  private beginCombat(fleet: Fleet) {
    if (this.fading || this.mode !== 'map' || this.layer !== 'ship') return
    const fresh = !this.enemies.some((e) => e.alive)
    if (fresh) {
      this.clearCombat()
      this.combatTime = 0
      this.combatCount = 0
      this.combatThreat = 0
    }
    this.combatCount += fleet.count
    this.combatThreat = Math.max(this.combatThreat, fleet.threat)
    const at = fleet.pos.clone()
    if (fleet.scout) this.scoutFight = true
    const small = Boolean(fleet.small)
    if (small) this.homePatrols = Math.max(0, this.homePatrols - 1)
    this.removeFleet(fleet)
    this.tipsOn = false
    this.skirmish = true
    this.ending = false
    this.spawnEnemies(fleet.count, fleet.threat, at, small, fleet.faction)
    if (fleet.faction && !small) this.feed('⚔', `${factionName(fleet.faction)}: ${WAR[fleet.faction].tactic}`, 'bad')
    this.audio.warning()
    this.toast(
      small
        ? 'Küçük bir uzaylı gemisi saldırıyor. Vur, düşen ganimeti topla.'
        : this.enemies.some((e) => e.alive && e.giant)
          ? 'Temas. İçlerinde dev bir avcı var.'
          : `Temas! ${this.roleSummary()} — Tab ile hedef seç, B ile kaç.`,
    )
  }

  /** Yerinde savaşın güncellemesi (harita modunda çalışır). */
  private updateSkirmish(dt: number) {
    if (!this.enemies.length) return
    this.combatTime += dt
    let alive = 0
    let near = Infinity
    vA.set(0, 0, 0)
    for (const e of this.enemies) {
      this.updateEnemy(e, dt)
      if (!e.alive) continue
      alive++
      vA.add(e.pos)
      near = Math.min(near, e.pos.distanceTo(this.pos))
    }
    this.updateGates(dt)
    if (!alive) {
      if (this.skirmish) this.winCombat()
      return
    }
    // Çok uzaklaşırsan savaş biter; kalanlar yeniden filo olur ve iz sürer.
    if (near > 260) {
      vA.multiplyScalar(1 / alive)
      const left = this.enemies.filter((e) => e.alive)
      const small = left.every((e) => e.small)
      const threat = Math.max(0, ...left.map((e) => e.threat))
      this.clearCombat()
      this.skirmish = false
      const fleet = this.spawnFleet(Math.max(1, left.length - (small ? 0 : 2)), threat, vA.clone(), small ? 'patrol' : 'search')
      fleet.small = small
      if (small) this.homePatrols++
      this.toast('Uzaklaştın. Savaş bitti, iz sürüyorlar.')
    }
  }

  private dropLoot(at: Vector3, value: number, pieces: number) {
    const per = Math.max(1, Math.round(value / pieces))
    for (let i = 0; i < pieces; i++) {
      let item = this.loot.find((l) => !l.alive)
      if (!item) {
        const mesh = new Group()
        const coreMat = new MeshBasicMaterial({ color: 0xffc46a })
        coreMat.toneMapped = false
        const gem = new Mesh(new OctahedronGeometry(0.75), coreMat)
        const haloMat = new MeshBasicMaterial({ color: 0xffd79a, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false })
        haloMat.toneMapped = false
        const halo = new Mesh(new SphereGeometry(1.5, 10, 8), haloMat)
        mesh.add(gem, halo)
        mesh.name = 'loot'
        this.mapRoot.add(mesh)
        item = { alive: false, pos: new Vector3(), vel: new Vector3(), value: 0, age: 0, mesh }
        this.loot.push(item)
      }
      item.alive = true
      item.age = 0
      item.value = per
      item.pos.copy(at)
      item.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 6)
      item.mesh.visible = true
      item.mesh.position.copy(item.pos)
    }
  }

  private updateLoot(dt: number) {
    for (const l of this.loot) {
      if (!l.alive) continue
      l.age += dt
      const d = l.pos.distanceTo(this.pos)
      if (this.layer === 'ship' && d < 48) {
        vA.subVectors(this.pos, l.pos).normalize()
        l.vel.lerp(vA.multiplyScalar(Math.max(40, this.vel.length() + 20)), 1 - Math.exp(-4 * dt))
      } else l.vel.multiplyScalar(Math.max(0, 1 - dt * 1.5))
      l.pos.addScaledVector(l.vel, dt)
      l.mesh.position.copy(l.pos)
      l.mesh.rotation.y += dt * 2.4
      l.mesh.scale.setScalar(1 + Math.sin(l.age * 6) * 0.12)
      if (this.layer === 'ship' && d < 6.5) {
        l.alive = false
        l.mesh.visible = false
        this.collectLoot(l.value)
      } else if (l.age > 45) {
        l.alive = false
        l.mesh.visible = false
      }
    }
    if (this.lootSum > 0) {
      this.lootToastT -= dt
      if (this.lootToastT <= 0) {
        const c = this.homeColony()
        const tail = c
          ? c.level >= MAX_LEVEL
            ? ` · karakol sv ${c.level} (azami)`
            : ` · karakol deposu ${Math.floor(c.store ?? 0)}/${UPGRADE_COST[c.level + 1]}`
          : ''
        this.toast(`Ganimet +${this.lootSum} enerji${tail}`)
        this.lootSum = 0
      }
    }
  }

  private clearLoot() {
    for (const l of this.loot) {
      l.alive = false
      l.mesh.visible = false
    }
    this.lootSum = 0
  }

  /** Ganimet enerji verir; bir payı da ana karakolun deposuna gider ve depo dolunca karakol seviye atlar. */
  private collectLoot(value: number) {
    this.energy += value
    this.lastLoot = value
    this.addScore(4)
    this.audio.collect()
    this.lootSum += value
    this.lootToastT = 0.35
    this.feedOutpost(value)
  }

  private feedOutpost(value: number) {
    const c = this.homeColony()
    if (!c || c.level >= MAX_LEVEL) return
    c.store = (c.store ?? 0) + value * LOOT_TO_OUTPOST
    while (c.level < MAX_LEVEL && (c.store ?? 0) >= UPGRADE_COST[c.level + 1]) {
      c.store = (c.store ?? 0) - UPGRADE_COST[c.level + 1]
      c.level++
      c.hullMax = coreHullMax(c.level)
      c.hull = c.hullMax
      const planet = this.planetOf(c)
      if (planet) this.attachColony(c, planet)
      this.toast(`Ganimetle karakol büyüdü: seviye ${c.level}. ${c.planetName} nüfus tavanı ${this.capOf(c)}.`)
      this.audio.collect()
    }
  }

  /** Filonun tamamı düştü: ekran değişmez, ganimet parçaları ortada kalır. */
  private winCombat() {
    if (!this.skirmish) return
    this.skirmish = false
    this.fights++
    this.wins += 1
    this.save.wins = this.wins
    writeSave(this.save)
    this.addScore(40 + this.combatCount * 20)
    this.vis = Math.min(this.vis, 34)
    this.grace = 3
    if (this.scoutFight) {
      this.scoutFight = false
      this.questEvent('scout')
      this.feed('✔', 'Keşif gemisi düştü', 'good')
    }
    this.clearCombat()
    this.toast('Filo düştü. Parlayan ganimeti topla. Gemine parça takmak için bir gezegene in, gemine yürü ve U tuşuna bas.')
  }

  private flee() {
    if (this.ending) return
    this.ending = true
    this.fadeTo(() => {
      const count = this.combatCount
      const threat = this.combatThreat
      this.restoreMap()
      this.clearCombat()
      this.clearShots()
      shipForward(this.quat, vA)
      vB.copy(this.pos).addScaledVector(vA, -190)
      this.spawnFleet(count, threat, vB, 'search')
      this.vis = Math.min(100, Math.max(this.vis, 60))
      this.mode = 'map'
      this.ending = false
      this.toast('Kaçtın. Hâlâ iz sürüyorlar.')
      this.input.requestLock()
    })
  }

  private lose(reason: 'ufuk' | 'combat') {
    if (this.ending || this.mode === 'gameover') return
    this.ending = true
    this.spawnBoom(this.pos, 1.7, 0xffd0b0)
    this.audio.boom()
    this.fadeTo(() => {
      this.mode = 'gameover'
      this.ending = false
      this.clearCombat()
      this.clearShots()
      this.visual.root.visible = false
      this.input.exitLock()
      this.dom.goTitle.textContent = reason === 'ufuk' ? 'Ufuk' : 'Avlandın'
      this.dom.goReason.textContent =
        reason === 'ufuk' ? 'Olay ufku seni yuttu. Dışarıda zaman akıp gitti.' : 'Sessizliği bozdun. Orman cevap verdi.'
      this.dom.goScore.textContent = fmt(this.score)
      this.dom.goKills.textContent = fmt(this.kills)
      this.dom.goBest.textContent = fmt(this.best)
    })
  }

  private restoreMap() {
    this.pos.copy(this.saved.pos)
    this.vel.copy(this.saved.vel)
    this.quat.copy(this.saved.quat)
    this.visual.root.position.copy(this.pos)
    this.visual.root.quaternion.copy(this.quat)
    this.snapCamera = true
  }

  private startRun() {
    this.fadeTo(() => {
      this.resetRun()
      this.mode = 'map'
      this.snapCamera = true
      this.input.requestLock()
    })
  }

  private resetRun() {
    this.clearCombat()
    this.clearGround()
    this.clearColonies()
    this.botSeeded.clear()
    this.cleared.clear()
    this.nativesLeft.clear()
    this.rel = {}
    this.stranded = []
    this.tourDone = false
    this.avluSeen = false
    this.mined.clear()
    this.regrow.clear()
    this.botT = 40
    this.clearFleets()
    this.clearShots()
    this.squad = []
    this.clearEscorts()
    this.score = 0
    this.energy = 0
    this.kills = 0
    this.fights = 0
    this.vis = 0
    this.grace = 2.4
    this.properTime = 0
    this.coordTime = 0
    this.tf = 1
    this.scoreTick = 0
    this.fragTimer = 0
    this.hitCd = 0
    this.fireCd = 0
    this.stabilizeT = 0
    this.trauma = 0
    this.hurtV = 0
    this.ending = false
    this.tipsOn = true
    this.tipI = 0
    this.tipT = 1.6
    this.hullWarned = false
    this.bandFired = [false, false, false]
    this.lastLoot = 0
    this.camMode = 'chase'
    this.cd1 = 0
    this.cd2 = 0
    this.cloakT = 0
    this.wellLife = 0
    if (this.wellMesh) this.wellMesh.visible = false
    this.layer = 'ship'
    this.footPlanet = null
    this.returns = {}
    clearRun()
    this.clearLocals()
    this.owned = starterWeapons(this.originId)
    this.weapon = signatureWeapon(this.originId)
    this.powerT = 0
    this.razed.clear()
    this.clearLoot()
    this.skirmish = false
    this.homePatrols = 0
    this.homePatrolT = 90
    // Bütün türler baştan dünyada: her biri kendi ev sisteminde karakolla başlar.
    this.seedWorld()
    this.layoutUniverse(homeSystem(this.originId))
    this.up = { hull: 1, shield: 1, weapon: 1, engine: 1, stealth: 1 }
    this.parts = []
    this.upSlot = 'hull'
    this.skillCd = 0
    this.skillT = 0
    this.squadOrder = 'takip'
    this.squadHold = null
    this.applyUpgradeStats()
    this.refreshShipLook()
    this.captured = 0
    this.questLog = []
    this.discovered = []
    this.route = null
    this.questPlanetId = this.pickFirstPlanet()
    this.tipsOn = false
    this.hull = this.hullMax
    this.shield = this.shieldMax
    const homePlanet = this.planets.find((p) => p.def.home) ?? null
    if (homePlanet) {
      vA.set(-homePlanet.pos.x, 0, -homePlanet.pos.z)
      if (vA.lengthSq() < 1) vA.set(0, 0, 1)
      vA.normalize().applyAxisAngle(AXIS_Y, 0.35)
      vA.y = 0.18
      vA.normalize()
      this.pos.copy(homePlanet.pos).addScaledVector(vA, homePlanet.def.radius + 34)
      this.vel.set(0, 0, 0)
      vB.copy(homePlanet.pos).sub(this.pos).normalize()
      vC.crossVectors(vB, WORLD_UP).normalize()
      vB.addScaledVector(vC, 0.9).normalize()
      quatFromForward(this.quat, vB)
      this.foundStartOutpost(homePlanet, vA)
    } else {
      this.pos.set(0, 48, 220)
      this.vel.set(0, 0, 0)
      quatFromForward(this.quat, vB.set(1, 0, 0))
    }
    this.visual.root.position.copy(this.pos)
    this.visual.root.quaternion.copy(this.quat)
    for (const f of this.frags) {
      f.alive = false
      f.mesh.visible = false
    }
    for (let i = 0; i < 4; i++) this.spawnFragment(Math.PI / 2 - 0.4 - i * 0.32, this.fragInner + 85 + i * 12, 18 + i * 6)
    for (let i = 0; i < 7; i++) this.spawnFragment()
    // Ev sistemi sakin: başta eğitim devriyesi yok (keşif gemisi görevinden sonra en çok bir tane).
    this.homePatrols = 0
    this.questStart(0, true)
    // İlk görevin brifingi oyun açılınca gelir.
    this.briefPending = 0
    this.briefT = 1.2
    this.briefing = false
    this.spawnHomePatrols(this.homePatrols)
    this.tipT = 7
    if (homePlanet) this.toast(`${homePlanet.def.name}: ev gezegenin. Üssün kuruldu (sv 1). Sol üstteki görev kartını izle.`)
    this.diskMat.uniforms.uAlpha.value = 1
    this.hideControls()
  }

  /* ---------- İlk karşılaşma kataloğu: ırkın kendisi ve gemisi, seçim ekranındaki gibi döner ---------- */
  private preview: { raf: number; scene: Scene } | null = null
  /** Önizleme çizicisi tek bir kez kurulur ve yeniden kullanılır (her karşılaşmada yeni WebGL bağlamı açmak tarayıcıyı çökertir). */
  private previewR: WebGLRenderer | null = null
  private racePreview(fac: OriginId | null) {
    const canvas = document.getElementById('enc-canvas') as HTMLCanvasElement | null
    if (this.preview) {
      cancelAnimationFrame(this.preview.raf)
      const old = this.preview
      this.preview = null
      old.scene.traverse((o) => (o as Mesh).geometry?.dispose())
      this.disposeMats(old.scene as unknown as THREEGroup)
    }
    if (!canvas) return
    canvas.classList.toggle('hidden', !fac)
    if (!fac) return
    if (!this.previewR) {
      try {
        this.previewR = new WebGLRenderer({ canvas, antialias: true, alpha: true })
        this.previewR.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.previewR.setSize(520, 300, false)
        this.previewR.outputColorSpace = SRGBColorSpace
        this.previewR.toneMapping = ACESFilmicToneMapping
      } catch {
        canvas.classList.add('hidden')
        return
      }
    }
    const r = this.previewR
    const scene = new Scene()
    scene.add(new HemisphereLight(0xffffff, 0x2a2030, 1.4))
    const key = new DirectionalLight(0xfff0d8, 2.2)
    key.position.set(3, 5, 4)
    scene.add(key)
    const cam = new PerspectiveCamera(32, 520 / 300, 0.1, 100)
    cam.position.set(0, 2.2, 9)
    cam.lookAt(0, 1.1, 0)
    const rig = buildCreature(originLook(fac))
    rig.root.position.set(-2.1, 0, 0)
    rig.root.scale.setScalar(1.35)
    scene.add(rig.root)
    const ship = buildShip(fac)
    ship.root.position.set(1.9, 1.3, 0)
    ship.root.scale.setScalar(0.85)
    ship.cockpit.visible = false
    ship.shield.visible = false
    scene.add(ship.root)
    const t0 = performance.now()
    const tick = () => {
      if (!this.preview || this.preview.scene !== scene) return
      const t = (performance.now() - t0) / 1000
      rig.root.rotation.y = Math.sin(t * 0.6) * 0.6
      ship.root.rotation.y = t * 0.7
      ship.root.position.y = 1.3 + Math.sin(t * 1.4) * 0.12
      this.stepRig(rig, 0, false, 0)
      if (!this.skipRender) r.render(scene, cam)
      this.preview.raf = requestAnimationFrame(tick)
    }
    this.preview = { raf: 0, scene }
    this.preview.raf = requestAnimationFrame(tick)
  }

  /* ---------- Kayıt / Devam et ---------- */
  private saveT = 30
  private v3(v: Vector3): V3 {
    return [v.x, v.y, v.z]
  }

  /** Oyunun kalıcı durumunun anlık görüntüsü. */
  snapshotGame(): SavedGame {
    const colonies: SavedColony[] = []
    for (const c of Object.values(this.colonies)) {
      if (!c) continue
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(c)) {
        if (k === 'root' || k === 'core' || k === 'coreBar' || k === 'turrets' || k === 'dir') continue
        out[k] = v
      }
      out.dir = this.v3(c.dir)
      out.turrets = c.turrets.map((t) => ({ dir: this.v3(t.dir), hull: t.hull, kind: t.kind, lvl: t.lvl }))
      colonies.push(out as SavedColony)
    }
    // Yayayken kayıt: gezegenin üstünde, gemide uyanırsın.
    const pos = this.layer === 'foot' && this.footPlanet ? this.footPlanet.pos.clone().addScaledVector(vO1.copy(this.pos).sub(this.footPlanet.pos).normalize(), this.footPlanet.def.radius + 40) : this.pos
    return {
      v: SAVE_VERSION,
      at: Date.now(),
      origin: this.originId,
      universe: this.universeId,
      pos: this.v3(pos),
      quat: [this.quat.x, this.quat.y, this.quat.z, this.quat.w],
      hull: Math.max(1, this.hull),
      shield: this.shield,
      energy: this.energy,
      ore: this.ore,
      crystal: this.crystal,
      score: this.score,
      kills: this.kills,
      properTime: this.properTime,
      clockT: this.clockT,
      up: { ...this.up },
      parts: [...this.parts],
      owned: [...this.owned],
      weapon: this.weapon,
      questIdx: this.questIdx,
      captured: this.captured,
      questLog: [...this.questLog],
      discovered: [...this.discovered],
      colonies,
      rel: JSON.parse(JSON.stringify(this.rel)) as Record<string, unknown>,
      cleared: [...this.cleared],
      razed: [...this.razed],
      nativesLeft: [...this.nativesLeft],
      mined: [...this.mined],
      regrow: [...this.regrow].map(([k, t]) => [k, t - this.clockT] as [string, number]),
      botSeeded: [...this.botSeeded],
      squad: [...this.squad, ...this.units.filter((u) => u.alive && u.squad).map((u) => ({ kind: u.kind as SettlerKind, hull: u.hull, hullMax: u.hullMax }))],
      stranded: this.stranded.map((x) => ({ planetId: x.planetId, universe: x.universe, dir: this.v3(x.dir), crew: x.crew })),
      lastTalk: {},
      flags: { tour: this.tourDone, avlu: this.avluSeen },
    }
  }

  /** Otomatik kayıt: yalnız sakin anda (savaşta, inişte, geçişte değil). */
  saveGame(force = false) {
    if (!force && (this.mode !== 'map' || this.fading || this.fighting() || this.hull <= 0)) return false
    const ok = writeGame(this.snapshotGame())
    this.refreshContinue()
    return ok
  }

  private autosave(dt: number) {
    this.saveT -= dt
    if (this.saveT > 0) return
    this.saveT = 30
    if (this.saveGame()) document.getElementById('save-dot')?.classList.add('on')
    window.setTimeout(() => document.getElementById('save-dot')?.classList.remove('on'), 1200)
  }

  refreshContinue() {
    const g = readGame()
    const b = document.getElementById('btn-continue')
    if (!b) return
    b.classList.toggle('hidden', !g)
    if (g) {
      const o = ORIGINS.find((x) => x.id === g.origin)
      const mins = Math.round(g.properTime / 60)
      b.textContent = `Devam et · ${o ? originLook(o.id).name : ''} · ${mins} dk`
    }
  }

  /** Kayıtlı oyunu yükle. */
  loadGame() {
    const g = readGame()
    if (!g || !ORIGINS.some((o) => o.id === g.origin)) return false
    this.showShip(g.origin as OriginId)
    this.fadeTo(() => {
      this.resetRun()
      this.applySaved(g)
      this.mode = 'map'
      this.snapCamera = true
      this.input.requestLock()
    })
    return true
  }

  applySaved(g: SavedGame) {
    this.clearColonies()
    this.colonies = {}
    for (const raw of g.colonies) {
      const c = { ...raw } as unknown as Colony
      c.dir = new Vector3(...raw.dir)
      c.root = null
      c.core = null
      c.coreBar = null
      c.turrets = raw.turrets.map((t) => ({ dir: new Vector3(...t.dir), root: new Group(), head: new Group(), cool: 0.5, hull: t.hull, alive: true, kind: t.kind, lvl: t.lvl }))
      this.colonies[c.planetId] = c
    }
    this.rel = g.rel as typeof this.rel
    this.cleared = new Set(g.cleared)
    this.razed = new Map(g.razed)
    this.nativesLeft = new Map(g.nativesLeft)
    this.mined = new Map(g.mined)
    this.botSeeded = new Set(g.botSeeded)
    this.clockT = g.clockT
    this.properTime = g.properTime
    this.regrow = new Map(g.regrow.map(([k, t]) => [k, this.clockT + t]))
    this.up = { ...this.up, ...(g.up as Record<UpId, number>) }
    this.parts = [...g.parts]
    this.owned = g.owned as WeaponId[]
    this.weapon = g.weapon as WeaponId
    this.applyUpgradeStats()
    this.refreshShipLook()
    this.layoutUniverse(g.universe as UniId)
    this.pos.set(...g.pos)
    this.keepOutOfPlanets(this.pos, 30)
    this.quat.set(...g.quat)
    this.vel.set(0, 0, 0)
    this.visual.root.position.copy(this.pos)
    this.visual.root.quaternion.copy(this.quat)
    this.hull = Math.min(this.hullMax, g.hull)
    this.shield = Math.min(this.shieldMax, g.shield)
    this.energy = g.energy
    this.ore = g.ore
    this.crystal = g.crystal
    this.score = g.score
    this.kills = g.kills
    this.questLog = [...g.questLog]
    this.discovered = [...g.discovered]
    this.squad = g.squad.map((m) => ({ kind: m.kind as SettlerKind, hull: m.hull, hullMax: m.hullMax }))
    this.stranded = g.stranded.map((x) => ({ planetId: x.planetId, universe: x.universe as UniId, dir: new Vector3(...x.dir), crew: x.crew.map((m) => ({ kind: m.kind as SettlerKind, hull: m.hull, hullMax: m.hullMax })) }))
    this.buildEscorts()
    this.captured = g.captured
    this.tourDone = Boolean(g.flags?.tour)
    this.avluSeen = Boolean(g.flags?.avlu)
    this.questStart(g.questIdx, true)
    this.briefPending = -1
    this.briefing = false
    this.toast(`Kaldığın yerden devam: ${UNIVERSES[this.universeId].name}.`)
  }

  private continueRun() {
    this.mode = 'map'
    this.grace = Math.max(this.grace, 2)
    this.input.requestLock()
  }

  private pause() {
    if (this.mode !== 'map' && this.mode !== 'combat') return
    this.suppressPause = true
    this.pausedFrom = this.mode
    this.mode = 'pause'
    this.input.exitLock()
    this.dom.levels.textContent = `Gövde ${this.up.hull} · Kalkan ${this.up.shield} · Silah ${this.up.weapon} · Motor ${this.up.engine} · Gizlilik ${this.up.stealth}`
    window.setTimeout(() => {
      this.suppressPause = false
    }, 0)
  }

  private resume() {
    this.mode = this.pausedFrom === 'combat' ? 'combat' : 'map'
    this.input.requestLock()
  }

  private goTitle() {
    this.refreshContinue()
    this.fadeToken++
    this.fading = false
    this.dom.fade.classList.remove('on')
    this.clearCombat()
    this.clearFleets()
    this.clearShots()
    this.mode = 'title'
    this.visual.root.visible = false
    this.mapRoot.visible = true
    this.diskMat.uniforms.uAlpha.value = 1
    this.input.exitLock()
    this.hideControls()
    this.applyPresentation()
  }

  private skipIntro() {
    if (this.mode !== 'intro') return
    this.finishIntro()
    this.skipLock = 0.45
    this.dom.title.style.pointerEvents = 'none'
    const block = this.dom.title.querySelector('.title-block')
    if (block instanceof HTMLElement) block.style.pointerEvents = 'none'
    window.setTimeout(() => {
      this.dom.title.style.pointerEvents = ''
      if (block instanceof HTMLElement) block.style.pointerEvents = ''
    }, 380)
  }

  private finishIntro() {
    this.mode = 'title'
    this.introPoints.visible = false
    this.dom.flash.style.opacity = '0'
    this.diskMat.uniforms.uAlpha.value = 1
    this.bangPlayed = true
    this.applyPresentation()
  }

  private syncLine() {
    let idx = 0
    for (let i = 0; i < LINES.length; i++) if (this.introT >= LINES[i][0]) idx = i
    if (idx !== this.lineShown) {
      this.lineShown = idx
      this.dom.introText.textContent = LINES[idx][1]
    }
  }

  /** Atölye (kendi üssün sv3+) parça fiyatlarını %15 düşürür. */
  partCost(tier: number): Cost {
    const c = tierCost(tier)
    const shop = Object.values(this.colonies).some((x) => x && this.mine(x) && x.level >= 3)
    if (!shop) return c
    return { energy: Math.round(c.energy * 0.85), ore: Math.round(c.ore * 0.85), crystal: Math.round(c.crystal * 0.85) }
  }

  /** Üs yükseltme: enerji + maden; üst seviyeler kristal de ister. */
  colonyUpCost(target: number): Cost {
    return { energy: UPGRADE_COST[target] ?? 0, ore: 2 + target * 2, crystal: target >= 4 ? target - 3 : 0 }
  }

  turretCost(): Cost {
    return { energy: TURRET_COST, ore: 2, crystal: 0 }
  }

  private canPay(c: Cost) {
    return this.energy >= c.energy && this.ore >= c.ore && this.crystal >= c.crystal
  }

  private costText(c: Cost) {
    const bits = [`${fmt(c.energy)} enerji`]
    if (c.ore) bits.push(`⛏ ${c.ore}`)
    if (c.crystal) bits.push(`◆ ${c.crystal}`)
    return bits.join(' · ')
  }

  /** Parça tak: yuvanın bir sonraki kademesinden seçilen parça. */
  private buy(id: UpId, partId?: string) {
    const level = this.up[id]
    if (level >= 5) return false
    const opts = nextOptions(this.originId, id, level)
    const part = opts.find((o) => o.id === partId) ?? opts[0]
    if (!part) return false
    const cost = this.partCost(level + 1)
    if (!this.canPay(cost)) {
      this.toast(`Yetersiz kaynak: ${this.costText(cost)}`)
      return false
    }
    this.energy -= cost.energy
    this.ore -= cost.ore
    this.crystal -= cost.crystal
    this.up[id] = level + 1
    this.parts.push(part.id)
    this.applyUpgradeStats()
    this.questEvent('upgrade')
    if (id === 'hull') this.hull = Math.min(this.hullMax, this.hull + 30)
    if (id === 'shield') this.shield = this.shieldMax
    this.audio.ui()
    this.toast(part.legend ? `Efsane parça takıldı: ${part.name}` : `Takıldı: ${part.name}`)
    this.refreshShipLook()
    this.renderUpgrades()
    return true
  }

  private applyUpgradeStats() {
    const o = originById(this.originId)
    const m = sumMods(this.originId, this.parts)
    // Taban kademe artışı küçük; asıl fark seçilen parçalardan gelir.
    this.hullMax = Math.round(o.hull + (this.up.hull - 1) * 14 + m.hull)
    this.shieldMax = Math.round(o.shield + (this.up.shield - 1) * 8 + m.shield)
    this.regen = (o.regen + (this.up.shield - 1) * 0.8) * 1.32 * m.regen
    this.weaponMul = o.weapon * (1 + (this.up.weapon - 1) * 0.1) * m.weapon
    this.engineMul = o.engine * (1 + (this.up.engine - 1) * 0.06) * m.engine
    this.stealthMul = (o.stealth / (1 + (this.up.stealth - 1) * 0.1)) * m.noise
    this.hull = Math.min(this.hull, this.hullMax)
    this.shield = Math.min(this.shield, this.shieldMax)
  }

  /** Takılı parçalar gemiye görünür ekler verir: kademe 3+ yan kanatçık, efsane parça parlayan halka. */
  private refreshShipLook() {
    const ship = this.visual?.root
    if (!ship) return
    const old = ship.getObjectByName('parts-fx')
    if (old) {
      ship.remove(old)
      old.traverse((o) => {
        const mm = o as Mesh
        if (mm.isMesh) {
          mm.geometry.dispose()
          ;(mm.material as MeshBasicMaterial).dispose()
        }
      })
    }
    const top = Math.max(...Object.values(this.up))
    if (top < 3) return
    const g = new Group()
    g.name = 'parts-fx'
    const tint = new Color((SHIP_STYLE[this.originId] ?? SHIP_STYLE.earth).neon)
    const legends = this.parts.filter((id) => id.startsWith('legend-')).length
    const fin = new MeshBasicMaterial({ color: tint.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.85 })
    const n = top >= 4 ? 2 : 1
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        const blade = new Mesh(new BoxGeometry(0.08, 0.05, 1.6 - i * 0.4), fin)
        blade.position.set(side * (1.55 + i * 0.35), -0.05 - i * 0.12, 0.2 + i * 0.3)
        blade.rotation.z = side * 0.25
        g.add(blade)
      }
    }
    if (legends > 0) {
      // Efsane parça: motorların arkasında küçük, parlayan halkalar (her efsane parça bir halka).
      const halo = new MeshBasicMaterial({ color: tint.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.7 })
      for (let i = 0; i < Math.min(3, legends); i++) {
        const ring = new Mesh(new TorusGeometry(0.3 + i * 0.06, 0.025, 6, 32), halo)
        ring.position.z = 2.3 + i * 0.35
        ring.name = 'legend-ring'
        g.add(ring)
      }
    }
    ship.add(g)
  }

  private renderUpgrades() {
    this.dom.upLoot.textContent = this.lastLoot > 0 ? `Ganimet +${fmt(this.lastLoot)} enerji` : ''
    this.dom.upEnergy.textContent = `Enerji ${fmt(this.energy)} · ⛏ Maden ${this.ore} · ◆ Kristal ${this.crystal}`
    const list = this.dom.upList
    list.innerHTML = ''
    const tabs = document.createElement('div')
    tabs.className = 'up-tabs'
    SLOTS.forEach((sl, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'up-tab' + (sl.id === this.upSlot ? ' on' : '')
      const pips = Array.from({ length: 5 }, (_, k) => `<i class="${k < this.up[sl.id] ? 'on' : ''}"></i>`).join('')
      b.innerHTML = `<b>${i + 1}</b> ${sl.name}<span class="pips">${pips}</span>`
      b.addEventListener('click', () => {
        this.upSlot = sl.id
        this.renderUpgrades()
      })
      tabs.append(b)
    })
    list.append(tabs)
    const slot = this.upSlot
    const level = this.up[slot]
    const fitted = this.parts.map((id) => partById(this.originId, id)).filter((p): p is Part => Boolean(p && p.slot === slot))
    const have = document.createElement('p')
    have.className = 'up-have'
    have.textContent = fitted.length ? `Takılı: ${fitted.map((p) => p.name).join(' → ')}` : 'Takılı: fabrika parçası'
    list.append(have)
    const opts = nextOptions(this.originId, slot, level)
    if (!opts.length) {
      const done = document.createElement('p')
      done.className = 'up-have'
      done.textContent = 'Bu yuva tamam: efsane parça takılı.'
      list.append(done)
      return
    }
    const cost = this.partCost(level + 1)
    const row = document.createElement('div')
    row.className = 'up-cards'
    for (const part of opts) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'up-card' + (part.legend ? ' legend' : '')
      b.disabled = !this.canPay(cost)
      b.innerHTML = `<strong>${part.name}</strong><small>${part.blurb}</small><em>${this.costText(cost)}</em>`
      b.addEventListener('click', () => this.buy(slot, part.id))
      row.append(b)
    }
    list.append(row)
    if (level + 1 < 5) {
      const hint = document.createElement('p')
      hint.className = 'up-hint'
      hint.textContent = `Kademe ${level + 1}/5 · ikisinden birini seç, seçim kalıcı. 5. kademe ırkına özel efsane parça.`
      list.append(hint)
    }
  }

  private addScore(n: number) {
    this.score += n
    this.checkUnlocks()
    if (this.score > this.best) {
      this.best = this.score
      this.save.best = this.best
      writeSave(this.save)
    }
  }

  private toast(msg: string) {
    this.dom.toast.textContent = msg
    this.toastT = 3.6
  }

  private checkUnlocks() {
    const order = WEAPONS.map((item) => item.id)
    const bonus = this.score >= 500 ? 4 : this.score >= 320 ? 3 : this.score >= 180 ? 2 : this.score >= 80 ? 1 : 0
    const want = Math.min(order.length, starterWeapons(this.originId).length + bonus)
    while (this.owned.length < want) {
      const next = order.find((id) => !this.owned.includes(id))
      if (!next) break
      this.owned.push(next)
      const info = WEAPONS.find((item) => item.id === next)
      const text = `Yeni silah: ${info?.name ?? next}`
      this.toast(text)
      const banner = document.getElementById('unlock')
      if (banner) {
        banner.textContent = text
        banner.classList.add('on')
        window.setTimeout(() => banner.classList.remove('on'), 2600)
      }
    }
  }

  /** Sağ üst olay akışı: aynı olay tekrarlanınca ×N sayacı artar, birkaç saniyede söner. */
  private feed(icon: string, text: string, tone: 'good' | 'bad' | 'info' = 'info') {
    const host = document.getElementById('feed')
    if (!host) return
    const key = `${icon}|${text}`
    const hit = this.feedItems.find((f) => f.key === key)
    if (hit) {
      hit.n++
      hit.life = 3.2
      const b = hit.el.querySelector('b')
      if (b) b.textContent = `×${hit.n}`
      return
    }
    const el = document.createElement('div')
    el.className = `feed-item ${tone}`
    const i = document.createElement('i')
    i.textContent = icon
    const span = document.createElement('span')
    span.textContent = text
    const b = document.createElement('b')
    el.append(i, span, b)
    host.prepend(el)
    this.feedItems.unshift({ key, el, n: 1, life: 3.2 })
    while (this.feedItems.length > 4) this.feedItems.pop()?.el.remove()
  }

  private tickFeed(dt: number) {
    for (let i = this.feedItems.length - 1; i >= 0; i--) {
      const f = this.feedItems[i]
      f.life -= dt
      f.el.style.opacity = String(clamp(f.life * 1.5, 0, 1))
      if (f.life <= 0) {
        f.el.remove()
        this.feedItems.splice(i, 1)
      }
    }
  }

  private floatDamage(at: Vector3, amount: number, cls = '', up?: Vector3) {
    const host = document.getElementById('floats')
    if (!host) return
    const el = document.createElement('span')
    el.textContent = String(Math.max(1, Math.round(amount)))
    if (cls) el.className = cls
    host.append(el)
    this.floats.push({ el, life: cls ? 1 : 0.8, pos: at.clone(), up: up?.clone() })
  }

  private paintFloats() {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const item = this.floats[i]
      item.life -= 0.016
      if (item.up) item.pos.addScaledVector(item.up, 0.12)
      else item.pos.y += 0.12
      const p = item.pos.clone().project(this.camera)
      if (item.life <= 0 || p.z > 1) {
        item.el.remove()
        this.floats.splice(i, 1)
        continue
      }
      item.el.style.left = `${(p.x * 0.5 + 0.5) * 100}%`
      item.el.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`
      item.el.style.opacity = String(clamp(item.life * 1.4, 0, 1))
    }
  }

  private paintLock() {
    const el = document.getElementById('lock-on')
    if (!el) return
    const target = this.fighting() ? (this.pickedTarget?.alive ? this.pickedTarget : this.lockTarget) : null
    if (!target?.alive) {
      el.classList.add('hidden')
      return
    }
    const p = target.pos.clone().project(this.camera)
    if (p.z > 1) {
      el.classList.add('hidden')
      return
    }
    el.classList.remove('hidden')
    el.style.left = `${(p.x * 0.5 + 0.5) * 100}%`
    el.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`
    el.classList.toggle('picked', target === this.pickedTarget)
    el.dataset.role = target.role === 'avci' ? 'AVCI' : target.role === 'bombaci' ? 'BOMBACI' : target.role === 'kalkan' ? (target.shield > 0 ? 'KALKANLI' : 'KALKAN KIRILDI') : target.giant ? 'DEV' : ''
  }

  private updateLod() {
    for (const planet of this.planets) {
      const dist = this.pos.distanceTo(planet.pos)
      if (planet.village) planet.village.visible = dist < Math.max(420, planet.def.radius * 4) && !this.colonies[planet.def.id]
    }
    for (const poi of this.pois) {
      poi.getWorldPosition(vA)
      poi.visible = this.pos.distanceTo(vA) < Math.max(520, (poi.parent?.scale.x ?? 0) * 2)
    }
    // Köy figürleri yalnız yörüngeden görülen yaşam izidir: yüzeye inince gerçek yerliler doğar,
    // gezegen temizlenince ya da üs kurulunca kaybolurlar. Vurulamayan, donmuş yerli kalmaz.
    for (const planet of this.planets) {
      const village = planet.village
      if (!village?.visible) continue
      const id = planet.def.id
      const life = !this.cleared.has(id) && !this.colonies[id] && !(this.layer === 'foot' && this.footPlanet === planet)
      const left = this.nativesLeftOf(planet)
      const rigs = (village.userData.rigs as Rig[] | undefined) ?? []
      for (let ri = 0; ri < rigs.length; ri++) {
        const rig = rigs[ri]
        rig.root.visible = life && ri < left
        if (rig.root.visible) this.stepRig(rig, rig.style === 'hop' ? 2.4 : 1.2, false, 0)
      }
    }
  }

  private buildVillage(def: PlanetDef, mesh: Group) {
    const g = new Group()
    g.scale.setScalar(1 / def.radius)
    const purple = def.village === 'purple'
    const rigs: Rig[] = []
    const huts: Vector3[] = []
    for (let i = 0; i < 6; i++) {
      const y = 1 - ((i + 0.5) / 6) * 2
      const ring = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * 2.4
      const up = new Vector3(Math.cos(phi) * ring, y, Math.sin(phi) * ring).normalize()
      const hut = buildDwelling(nativeLook(def).form, purple ? 0x8d5ae0 : def.color, i)
      const tangent = new Vector3(0, 1, 0).cross(up)
      if (tangent.lengthSq() < 1e-4) tangent.set(1, 0, 0)
      tangent.normalize()
      const bit = new Vector3().crossVectors(tangent, up).normalize()
      hut.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(tangent, up, bit))
      hut.position.copy(up).multiplyScalar(def.radius - 0.15)
      huts.push(up.clone())
      // Yerli evleri insan boyunda: üs çekirdeğinin yanında dev görünüp onu gizlemesin.
      hut.scale.setScalar(2.2)
      g.add(hut)
      if (i < 4) {
        const look = nativeLook(def)
        const rig = buildCreature(look)
        const size = purple ? 2.4 : 1.8
        rig.root.position.copy(up).multiplyScalar(def.radius - FEET * size + 0.05).addScaledVector(tangent, 4)
        rig.root.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(tangent, up, bit))
        rig.root.scale.setScalar(size)
        rig.root.userData.rig = rig
        rigs.push(rig)
        g.add(rig.root)
      }
    }
    g.userData.rigs = rigs
    g.userData.huts = huts
    mesh.add(g)
    this.villages.push(g)
    return g
  }

  private spawnFleet(count: number, threat: number, at: Vector3 | undefined, state: FleetState) {
    const pos = at ? at.clone() : this.randomFleetPos()
    const root = buildFleetIcon(count)
    root.position.copy(pos)
    this.mapRoot.add(root)
    const fleet: Fleet = {
      id: ++this.fleetSeq,
      pos,
      vel: new Vector3(),
      threat,
      count,
      state,
      lastKnown: this.pos.clone(),
      searchLeft: 16,
      angle: Math.random() * Math.PI * 2,
      orbit: 26 + Math.random() * 10,
      center: pos.clone(),
      root,
      faction: this.fleetFaction(),
    }
    // Dost ırkın filosu avlamaz; yoldan geçen tüccar gibi devriye gezer.
    if (fleet.faction && friendly(this.rel[fleet.faction]) && state === 'hunt') fleet.state = 'patrol'
    this.fleets.push(fleet)
    if (fleet.state === 'hunt') {
      const who = fleet.faction ? factionName(fleet.faction) : 'Bilinmeyen'
      this.toast(this.isHome() ? `⚠ ${who} gemisi sistemine girdi ve sinyalini izliyor.` : `Sinyal yayıldı. ${who} filosu rotanı aldı.`)
      this.feed('⚠', `${who} filosu yaklaşıyor`, 'bad')
      this.audio.warning()
    }
    return fleet
  }

  private randomFleetPos() {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2
      const elev = (Math.random() - 0.5) * 0.6
      const rad = 230 + Math.random() * 80
      vA.set(Math.cos(a), elev, Math.sin(a)).multiplyScalar(rad).add(this.pos)
      if (vA.length() > 80) return vA.clone()
    }
    return this.pos.clone().add(new Vector3(0, 10, -250))
  }

  private removeFleet(fleet: Fleet) {
    if (fleet.bomber && !this.fleets.some((f) => f !== fleet && f.bomber)) this.questEvent('bomberGone')
    const i = this.fleets.indexOf(fleet)
    if (i >= 0) this.fleets.splice(i, 1)
    this.mapRoot.remove(fleet.root)
    this.disposeMats(fleet.root)
  }

  private clearFleets() {
    for (const f of [...this.fleets]) this.removeFleet(f)
  }

  private nearestFleet(maxDist: number) {
    let best: { fleet: Fleet; dist: number } | null = null
    for (const fleet of this.fleets) {
      const dist = fleet.pos.distanceTo(this.pos)
      if (dist < maxDist && (!best || dist < best.dist)) best = { fleet, dist }
    }
    return best
  }

  private spawnFragment(angle?: number, radius?: number, y?: number) {
    const frag = this.frags.find((f) => !f.alive)
    if (!frag) return
    frag.alive = true
    frag.mesh.visible = true
    frag.angle = angle ?? Math.random() * Math.PI * 2
    frag.radius = radius ?? this.fragInner + Math.random() * 260
    frag.y = y ?? (Math.random() - 0.5) * 40
    frag.spin = 0.05 + Math.random() * 0.08
    frag.phase = Math.random() * Math.PI * 2
    frag.mesh.position.set(Math.cos(frag.angle) * frag.radius, frag.y, Math.sin(frag.angle) * frag.radius)
  }

  /** Irkın kendi gemi modeli düşman olarak: kokpit/kalkan gizli, ışık yok; gövde malzemesi parlama için. */
  private raceShipVisual(fac: OriginId) {
    const ship = buildShip(fac)
    ship.cockpit.visible = false
    ship.shield.visible = false
    ship.muzzle.visible = false
    ship.engineLight.removeFromParent()
    let bodyMat: MeshStandardMaterial | null = null
    ship.body.traverse((o) => {
      const m = (o as Mesh).material as MeshStandardMaterial | undefined
      if (!bodyMat && m && m.isMeshStandardMaterial) bodyMat = m
    })
    const bm = (bodyMat ?? new MeshStandardMaterial({ color: WAR[fac].color })) as MeshStandardMaterial
    bm.emissive.set(WAR[fac].color).multiplyScalar(0.25)
    bm.emissiveIntensity = 0.55
    ship.root.scale.setScalar(1)
    ship.root.userData.ownGeo = true
    return { root: ship.root, bodyMat: bm, eyeMat: new MeshBasicMaterial() }
  }

  combatFaction: OriginId | null = null
  private spawnEnemies(count: number, threat: number, at?: Vector3, small = false, faction?: OriginId) {
    this.combatFaction = faction ?? null
    const prof = faction ? WAR[faction] : null
    let special = false
    if (!at) this.clearCombat()
    const center = at ?? new Vector3(0, 0, -46)
    const spots = [
      new Vector3(0, 1, -46),
      new Vector3(-16, 5, -34),
      new Vector3(15, -3, -52),
      new Vector3(-8, 9, -68),
      new Vector3(12, -7, -28),
      new Vector3(-22, -4, -40),
      new Vector3(20, 8, -58),
      new Vector3(6, -8, -74),
    ]
    const attacks = ['bolt', 'homing', 'goo', 'well', 'gate'] as const
    const room = Math.max(0, 10 - this.enemies.filter((e) => e.alive).length)
    const n = Math.min(room, small ? Math.max(1, count) : Math.min(8, count + 3))
    const humanHunt = originById(this.originId).species === 'alien'
    for (let i = 0; i < n; i++) {
      const giant = !small && n >= 4 && i >= n - 2
      // Irkın silah karışımı; kara delik ve geçit yalnız gelişmiş ırkların amiral gemisinde ve savaş başına bir kez.
      let attack: (typeof attacks)[number] = small ? 'bolt' : prof ? prof.attacks[i % prof.attacks.length] : attacks[i % 3]
      if (giant && !special && prof?.well) {
        attack = 'well'
        special = true
      } else if (giant && !special && prof?.gate) {
        attack = 'gate'
        special = true
      }
      const human = !small && humanHunt && !prof && attack !== 'well' && attack !== 'gate' && i % 3 === 0
      if (human) attack = 'bolt'
      // Roller: normal gemilerin bir kısmı avcı, bombacı ya da kalkanlı olur.
      const role: Enemy['role'] = small || giant || attack === 'well' || attack === 'gate' ? undefined : (['avci', 'bombaci', 'kalkan'] as const)[i % 3]
      if (role === 'bombaci') attack = 'homing'
      if (role === 'avci') attack = 'bolt'
      // Irkı belli olan filo kendi gemileriyle gelir (ilk karşılaşma kataloğunda gördüğün gemi).
      const raceShip = Boolean(prof && !human && faction)
      const visual = human ? buildHumanFighter() : raceShip ? this.raceShipVisual(faction as OriginId) : buildCuteAlien(attack === 'well' || attack === 'gate' ? 4 : i % 4, 1)
      const scale = (small ? 0.8 : giant ? (human ? 2.7 : 3.35) : human ? 1 : 1.05) * (role === 'avci' ? 0.85 : role === 'bombaci' ? 1.25 : role === 'kalkan' ? 1.15 : 1)
      visual.root.scale.setScalar(scale)
      if (role === 'avci') visual.bodyMat.emissive.set(0x8a1a10)
      if (role === 'bombaci') visual.bodyMat.emissive.set(0x8a5a10)
      let bubble: Mesh | null = null
      if (role === 'kalkan') {
        const bm = new MeshBasicMaterial({ color: new Color(0x6ac8ff).multiplyScalar(1.3), transparent: true, opacity: 0.28, blending: AdditiveBlending, depthWrite: false })
        bm.toneMapped = false
        bubble = new Mesh(new SphereGeometry(2.1 / scale, 20, 14), bm)
        visual.root.add(bubble)
      }
      // Irk rengi: hangi ırkla dövüştüğün gemilerden anlaşılır.
      if (prof && !human && !raceShip) visual.bodyMat.color.set(prof.color)
      if (this.universeId === 'kizil' && !human && !prof) visual.bodyMat.color.set(0x6a2418)
      if (this.universeId === 'soluk' && !human) visual.bodyMat.emissive.set(0x123a4a)
      let weak: Mesh | null = null
      let bar: Sprite | null = null
      if (giant) {
        const weakMat = new MeshBasicMaterial({ color: 0xffe08a })
        weakMat.toneMapped = false
        weak = new Mesh(new SphereGeometry(0.22, 10, 8), weakMat)
        weak.name = 'weak'
        weak.position.set(0.2, 0.95, 0.4)
        visual.root.add(weak)
        const built = buildBar()
        bar = built.sprite
        bar.position.set(0, 1.85, 0)
        bar.scale.set(5.2 / scale, 0.85 / scale, 1)
        visual.root.add(bar)
        if (built.ctx) paintBar(built.ctx, built.tex, 1, 1)
        bar.userData.ctx = built.ctx
        bar.userData.tex = built.tex
      }
      const hull = (small ? 18 : (34 + threat * 10) * (giant ? scale * 2.15 : 1)) * (role === 'avci' ? 0.7 : role === 'bombaci' ? 1.2 : 1)
      const shield = small ? 0 : (12 + threat * 6) * (giant ? 2.3 : 1) * (role === 'kalkan' ? 3.2 : role === 'avci' ? 0.5 : 1)
      const e: Enemy = {
        root: visual.root,
        pos: spots[i % spots.length].clone().add(vH.set(0, 0, 46)).add(center),
        vel: new Vector3(),
        quat: new Quaternion(),
        hullMax: hull,
        hull,
        shieldMax: shield,
        shield,
        cool: 0.6 + Math.random() + (giant ? 0.8 : 0),
        strafe: Math.random() < 0.5 ? -1 : 1,
        strafeT: 1,
        alive: true,
        threat,
        stun: 0,
        flashT: 0,
        human,
        attack,
        giant,
        scale,
        weak,
        bar,
        small,
        role,
        bubble,
        bodyFlash: () => {
          visual.bodyMat.emissiveIntensity = 1.8
          window.setTimeout(() => {
            visual.bodyMat.emissiveIntensity = 0.55
          }, 70)
        },
      }
      quatFromForward(e.quat, vA.set(0, 0, 1))
      e.root.position.copy(e.pos)
      e.root.quaternion.copy(e.quat)
      this.combatRoot.add(e.root)
      this.enemies.push(e)
    }
  }

  private clearCombat() {
    for (const well of this.enemyWells) {
      well.alive = false
      well.owner = null
      well.mesh.visible = false
    }
    for (const e of this.enemies) {
      this.combatRoot.remove(e.root)
      this.disposeMats(e.root)
      // Irk gemileri kendi geometrilerini taşır (paylaşılmaz): onları da bırak.
      if (e.root.userData.ownGeo) e.root.traverse((o) => (o as Mesh).geometry?.dispose())
    }
    this.enemies.length = 0
    this.skirmish = false
    for (const gate of this.enemyGates) {
      gate.alive = false
      gate.owner = null
      gate.mesh.visible = false
    }
  }

  private spawnShot(friendly: boolean, origin: Vector3, dir: Vector3, dmg: number, kind: ShotKind = 'bolt', hops = 1) {
    const shot = this.shots.find((s) => !s.alive && s.friendly === friendly)
    if (!shot) return
    const ox = origin.x
    const oy = origin.y
    const oz = origin.z
    const dx = dir.x
    const dy = dir.y
    const dz = dir.z
    shot.alive = true
    shot.age = 0
    shot.dmg = dmg
    shot.hops = hops
    shot.kind = kind
    shot.mesh.material = this.shotMat(kind, friendly)
    if (kind === 'goo') shot.mesh.scale.set(3.1, 3.1, 0.9)
    else if (kind === 'homing' || kind === 'rocket') shot.mesh.scale.set(0.7, 0.7, 2.1)
    else if (kind === 'plasma') shot.mesh.scale.set(1.25, 1.25, 1.25)
    else if (kind === 'pellet') shot.mesh.scale.set(0.42, 0.42, 0.42)
    else if (kind === 'laser' || kind === 'chain') shot.mesh.scale.set(0.12, 0.12, 3.1)
    else shot.mesh.scale.set(1.35, 1.35, 1.6)
    const speed =
      kind === 'laser' || kind === 'chain' ? 340 : kind === 'pellet' ? 230 : kind === 'rocket' ? (friendly ? 150 : 74) : kind === 'plasma' ? (friendly ? 200 : 102) : kind === 'goo' ? 38 : kind === 'homing' ? 82 : friendly ? 260 : 128
    shot.vel.set(dx, dy, dz).multiplyScalar(speed)
    shot.pos.set(ox + dx * 1.6, oy + dy * 1.6, oz + dz * 1.6)
    shot.prev.copy(shot.pos)
    shot.mesh.visible = true
    shot.mesh.position.copy(shot.pos)
  }

  private killShot(shot: Shot) {
    shot.alive = false
    shot.mesh.visible = false
  }

  private clearShots() {
    for (const s of this.shots) this.killShot(s)
  }

  private spawnBoom(pos: Vector3, scale: number, color = 0xffd2b4) {
    const b = this.booms.find((x) => !x.alive) ?? this.booms[0]
    b.alive = true
    b.age = 0
    b.life = 0.55 + scale * 0.25
    b.points.position.copy(pos)
    b.sprite.position.copy(pos)
    b.points.visible = true
    b.sprite.visible = true
    b.mat.color.set(color)
    b.mat.opacity = 1
    b.spriteMat.color.set(color)
    b.sprite.scale.setScalar(scale * 2)
    for (let i = 0; i < b.positions.length; i += 3) {
      b.positions[i] = 0
      b.positions[i + 1] = 0
      b.positions[i + 2] = 0
      const dir = vA.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      const sp = (4 + Math.random() * 14) * scale
      b.vels[i] = dir.x * sp
      b.vels[i + 1] = dir.y * sp
      b.vels[i + 2] = dir.z * sp
    }
    b.points.geometry.attributes.position.needsUpdate = true
  }

  private disposeMats(root: THREEGroup) {
    const gone = new Set<object>()
    root.traverse((obj) => {
      const mesh = obj as Mesh
      // Geometri de bırakılır (sistem değiştikçe GPU belleği şişmesin); paylaşılan önbellek geometrileri kalır.
      const geo = mesh.geometry as { dispose?: () => void; userData?: { keep?: boolean } } | undefined
      if (geo?.dispose && !geo.userData?.keep && !gone.has(geo)) {
        gone.add(geo)
        geo.dispose()
      }
      const mat = mesh.material as { dispose?: () => void } | { dispose?: () => void }[] | undefined
      if (!mat) return
      const list = Array.isArray(mat) ? mat : [mat]
      for (const m of list) {
        if (!m || gone.has(m) || !m.dispose) continue
        gone.add(m)
        m.dispose()
      }
    })
  }

  private fadeTo(apply: () => void) {
    const token = ++this.fadeToken
    this.fading = true
    this.dom.fade.classList.add('on')
    window.setTimeout(() => {
      if (token !== this.fadeToken) return
      try {
        apply()
      } catch (err) {
        // Geçişte bir hata olsa bile ekran kararmış ve oyun kilitli kalmasın.
        console.error('fade apply failed', err)
      } finally {
        this.fading = false
        this.snapCamera = true
        this.applyPresentation()
        this.dom.fade.classList.remove('on')
      }
    }, 420)
  }

  private toggleMute() {
    if (this.save.settings.volume > 0.01) {
      this.muteMem = this.save.settings.volume
      this.setVolume(0)
    } else this.setVolume(this.muteMem || 0.72)
  }

  private setVolume(v: number) {
    this.save.settings.volume = v
    this.audio.setVolume(v)
    this.dom.vol.value = String(v)
    writeSave(this.save)
  }

  private setEasy(on: boolean) {
    this.save.settings.easy = on
    this.dom.easyTitle.checked = on
    this.dom.easyPause.checked = on
    writeSave(this.save)
  }

  private syncSettingsUi() {
    this.dom.easyTitle.checked = this.save.settings.easy
    this.dom.easyPause.checked = this.save.settings.easy
    this.dom.vol.value = String(this.save.settings.volume)
    this.dom.sens.value = String(this.save.settings.sens)
    this.dom.dead.value = String(this.save.settings.stickDead)
    this.dom.stick.value = String(this.save.settings.stickSens)
    must<HTMLInputElement>('set-invert').checked = this.save.settings.invert
    must<HTMLInputElement>('set-guide').checked = this.save.settings.guide
    must<HTMLInputElement>('set-music').checked = this.save.settings.music
    const right = this.save.settings.stickSide === 'right'
    document.body.classList.toggle('stick-right', right)
    must<HTMLElement>('set-side-left').classList.toggle('on', !right)
    must<HTMLElement>('set-side-right').classList.toggle('on', right)
    document.body.classList.toggle('no-guide', !this.save.settings.guide)
  }

  private showSettings() {
    this.syncSettingsUi()
    must<HTMLElement>('settings').classList.remove('hidden')
  }

  private hideSettings() {
    must<HTMLElement>('settings').classList.add('hidden')
  }

  /** Ev gezegenine rota: başka sistemdeysen kapı kapı, evdeysen doğrudan gezegene. */
  private routeHome() {
    const home = homeSystem(this.originId)
    const planet = UNIVERSES[home].planets.find((p) => p.home)
    this.route = planet ? { kind: 'planet', id: planet.id, system: home } : { kind: 'worm', id: home, system: home }
    const hops = this.hopsTo(home)
    this.toast(hops > 0 ? `Rota: eve (${UNIVERSES[home].name}) · ${hops} kapı` : `Rota: ${planet?.name ?? 'ev'}`)
  }

  /** Kapı ağında iki sistem arası en az geçiş sayısı. */
  private hopsTo(goal: UniId, from: UniId = this.universeId) {
    if (goal === from) return 0
    const dist = new Map<UniId, number>([[from, 0]])
    const queue: UniId[] = [from]
    while (queue.length) {
      const cur = queue.shift() as UniId
      for (const h of UNIVERSES[cur].holes) {
        if (h.kind !== 'worm' || !h.to || dist.has(h.to)) continue
        dist.set(h.to, (dist.get(cur) ?? 0) + 1)
        if (h.to === goal) return dist.get(h.to) ?? -1
        queue.push(h.to)
      }
    }
    return -1
  }

  /** Kapı ağı: zayıf ırklar solda, en gelişmişler sağda. Bulunduğun yer, evin ve rotanın yolu işaretli. */
  static readonly NET_LAYOUT: Record<UniId, [number, number]> = {
    gunes: [0.08, 0.27],
    marskol: [0.08, 0.73],
    avlu: [0.23, 0.5],
    alpha: [0.38, 0.17],
    proxima: [0.38, 0.83],
    kizil: [0.5, 0.5],
    k218: [0.62, 0.17],
    kepler186: [0.62, 0.83],
    trappist: [0.75, 0.33],
    soluk: [0.75, 0.67],
    gliese: [0.88, 0.3],
    kepler452: [0.92, 0.7],
  }

  private routePath(): UniId[] {
    const goal = this.route?.system
    if (!goal) return []
    const path: UniId[] = [this.universeId]
    let cur = this.universeId
    for (let i = 0; i < 12 && cur !== goal; i++) {
      const next = this.nextGate(cur, goal)
      if (!next) break
      path.push(next)
      cur = next
    }
    return path
  }

  private drawNetMap() {
    const canvas = must<HTMLCanvasElement>('net-map')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const at = (id: UniId) => [Game.NET_LAYOUT[id][0] * W, Game.NET_LAYOUT[id][1] * H] as const
    const path = this.routePath()
    const onPath = (a: UniId, b: UniId) => {
      for (let i = 0; i + 1 < path.length; i++) if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true
      return false
    }
    const ids = Object.keys(UNIVERSES) as UniId[]
    ctx.lineCap = 'round'
    for (const a of ids) {
      for (const h of UNIVERSES[a].holes) {
        if (h.kind !== 'worm' || !h.to || a > h.to) continue
        const [x1, y1] = at(a)
        const [x2, y2] = at(h.to)
        const hot = onPath(a, h.to)
        ctx.strokeStyle = hot ? '#ffe27a' : 'rgba(122,215,255,0.35)'
        ctx.lineWidth = hot ? 7 : 3
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }
    const home = homeSystem(this.originId)
    const owner = new Map<UniId, OriginId>()
    for (const o of ORIGINS) owner.set(homeSystem(o.id), o.id)
    ctx.textAlign = 'center'
    for (const id of ids) {
      const [x, y] = at(id)
      const here = id === this.universeId
      const mine = id === home
      const race = owner.get(id)
      ctx.fillStyle = here ? '#ffe27a' : mine ? '#7dff8a' : race ? '#e4a15c' : '#8a93a6'
      ctx.beginPath()
      ctx.arc(x, y, here ? 20 : 15, 0, Math.PI * 2)
      ctx.fill()
      if (here) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.fillStyle = '#f3ead8'
      ctx.font = `${here || mine ? 'bold ' : ''}26px sans-serif`
      ctx.fillText(`${mine ? '⌂ ' : ''}${UNIVERSES[id].name}`, x, y - 28)
      ctx.font = '20px sans-serif'
      ctx.fillStyle = '#c9b89a'
      const tag = race ? originLook(race).name : 'ara bölge'
      ctx.fillText(tag, x, y + 40)
    }
    const hops = this.hopsTo(home)
    this.domSet('net-line', `Sarı: buradasın · Yeşil: evin · Turuncu: başka ırkların evi · ${hops > 0 ? `eve ${hops} kapı` : 'evdesin'}. Bir sisteme dokun: oraya rota.`)
  }

  private netClick(event: MouseEvent) {
    const canvas = event.currentTarget as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height
    let best: UniId | null = null
    let bestD = 70
    for (const id of Object.keys(Game.NET_LAYOUT) as UniId[]) {
      const d = Math.hypot(Game.NET_LAYOUT[id][0] * canvas.width - x, Game.NET_LAYOUT[id][1] * canvas.height - y)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    if (!best) return
    if (best === this.universeId) return
    const planet = UNIVERSES[best].planets.find((p) => p.home)
    this.route = planet ? { kind: 'planet', id: planet.id, system: best } : { kind: 'worm', id: best, system: best }
    this.toast(`Rota: ${UNIVERSES[best].name} · ${this.hopsTo(best)} kapı`)
    this.drawNetMap()
  }

  private openMap() {
    this.drawNetMap()
    const list = must<HTMLDivElement>('map-list')
    list.innerHTML = ''
    const add = (label: string, route: RouteTarget) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.addEventListener('click', () => {
        this.route = route
        must<HTMLElement>('starmap').classList.add('hidden')
        this.toast(`Rota: ${label}`)
      })
      list.append(btn)
    }
    for (const planet of this.planets) {
      if (planet.def.heat) continue
      const colony = this.colonies[planet.def.id]
      const tag = colony ? (!this.mine(colony) ? ` · ${factionName(colony.owner)}` : colony.kind === 'main' ? ' · Ana üs' : colony.founded ? ' · Koloni' : ' · Karakol') : ''
      add(`${planet.def.name}${tag}`, { kind: 'planet', id: planet.def.id, system: this.universeId })
      if (colony && this.mine(colony) && colony.universe === this.universeId) {
        add(`⌂ Üsse in · ${planet.def.name}`, { kind: 'planet', id: planet.def.id, system: this.universeId })
        const b = list.lastElementChild as HTMLButtonElement
        b.addEventListener('click', () => {
          this.baseLandId = planet.def.id
          this.toast(`Rota: ${planet.def.name}. Yaklaşınca L ile doğrudan üssün yanına inersin.`)
        })
      }
    }
    for (const hole of this.holes) {
      if (hole.kind !== 'worm' || !hole.to) continue
      add(`Eşik → ${UNIVERSES[hole.to].name}`, { kind: 'worm', id: hole.to, system: this.universeId })
    }
    for (const origin of ORIGINS) {
      const system = homeSystem(origin.id)
      if (system === this.universeId) continue
      add(`Sistem · ${UNIVERSES[system].name}`, { kind: 'worm', id: system, system })
    }
    must<HTMLElement>('starmap').classList.remove('hidden')
  }

  private hideControls() {
    this.dom.controls.classList.add('hidden')
  }

  private showControls() {
    this.dom.controls.classList.remove('hidden')
  }

  private bindUi() {
    const click = () => this.audio.ensure()
    window.addEventListener('pointerdown', click)
    window.addEventListener('keydown', () => this.audio.ensure())
    this.dom.intro.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'intro') return
      e.preventDefault()
      this.skipIntro()
    })
    must<HTMLButtonElement>('btn-start').addEventListener('click', () => {
      this.audio.ensure()
      this.audio.ui()
      this.openSelect()
    })
    must<HTMLButtonElement>('sel-go').addEventListener('click', () => this.beginStory())
    must<HTMLElement>('cine').addEventListener('pointerdown', () => {
      this.cineTap = true
    })
    must<HTMLButtonElement>('btn-continue').addEventListener('click', () => {
      this.audio.ensure()
      this.audio.ui()
      this.loadGame()
    })
    this.refreshContinue()
    must<HTMLButtonElement>('story-go').addEventListener('click', () => {
      must<HTMLElement>('story').classList.add('hidden')
      if (this.storyPending) {
        this.storyPending = false
        this.startRun()
      }
    })
    must<HTMLButtonElement>('quest').addEventListener('click', () => this.openJournal('quest'))
    must<HTMLButtonElement>('pa-journal').addEventListener('click', () => this.openJournal('quest'))
    must<HTMLButtonElement>('journal-x').addEventListener('click', () => must<HTMLElement>('journal').classList.add('hidden'))
    must<HTMLElement>('journal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) must<HTMLElement>('journal').classList.add('hidden')
    })
    document.querySelectorAll<HTMLButtonElement>('#journal .tabs button').forEach((b) =>
      b.addEventListener('click', () => {
        this.journalTab = (b.dataset.tab as 'quest' | 'story' | 'lore') ?? 'quest'
        this.renderJournal()
      }),
    )
    must<HTMLButtonElement>('sel-prev').addEventListener('click', () => this.stepOrigin(-1))
    {
      // Seçim sahnesini sürükleyerek döndür (fare ve dokunmatik).
      const stage = must<HTMLElement>('sel-stage')
      let lastX = 0
      let id = -1
      stage.addEventListener('pointerdown', (e) => {
        id = e.pointerId
        lastX = e.clientX
        this.selDrag = true
        stage.setPointerCapture(e.pointerId)
      })
      stage.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return
        this.selYaw += (e.clientX - lastX) * 0.012
        lastX = e.clientX
      })
      const up = (e: PointerEvent) => {
        if (e.pointerId !== id) return
        id = -1
        this.selDrag = false
      }
      stage.addEventListener('pointerup', up)
      stage.addEventListener('pointercancel', up)
    }
    must<HTMLButtonElement>('sel-next').addEventListener('click', () => this.stepOrigin(1))
    must<HTMLButtonElement>('ab1').addEventListener('click', () => this.tryAbility(1))
    must<HTMLButtonElement>('ab2').addEventListener('click', () => this.tryAbility(2))
    must<HTMLButtonElement>('btn-controls').addEventListener('click', () => this.showControls())
    must<HTMLButtonElement>('btn-map').addEventListener('click', () => this.openMap())
    must<HTMLButtonElement>('btn-diplo').addEventListener('click', () => this.openDiplo())
    must<HTMLButtonElement>('diplo-x').addEventListener('click', () => must<HTMLElement>('diplo').classList.add('hidden'))
    must<HTMLButtonElement>('orders-x').addEventListener('click', () => this.toggleOrders(false))
    must<HTMLButtonElement>('brief-go').addEventListener('click', () => this.closeBriefing())
    // Dokunmatik "⋯": ikincil düğmeleri aç/kapa.
    must<HTMLButtonElement>('touch-more').addEventListener('click', () => {
      document.body.classList.toggle('more-open')
      this.audio.ui()
    })
    must<HTMLElement>('diplo').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) must<HTMLElement>('diplo').classList.add('hidden')
    })
    const enc: [string, Choice][] = [
      ['enc-peace', 'peace'],
      ['enc-trade', 'trade'],
      ['enc-pay', 'pay'],
      ['enc-demand', 'demand'],
      ['enc-attack', 'attack'],
      ['enc-flee', 'flee'],
    ]
    for (const [id, choice] of enc) must<HTMLButtonElement>(id).addEventListener('click', () => this.encounterChoose(choice))
    must<HTMLButtonElement>('enc-continue').addEventListener('click', () => this.closeEncounter())
    must<HTMLButtonElement>('enc-trade-done').addEventListener('click', () => {
      const enc = this.encounter
      if (enc) {
        enc.fleet.state = 'leave'
        bump(this.relOf(enc.faction), 3)
      }
      this.encounterAfter = null
      this.closeEncounter()
    })
    must<HTMLButtonElement>('photo-x').addEventListener('click', () => this.closePhoto())
    must<HTMLButtonElement>('photo-shot').addEventListener('click', () => this.savePhoto())
    must<HTMLButtonElement>('photo-filter').addEventListener('click', () => this.cyclePhotoFilter())
    must<HTMLButtonElement>('map-home').addEventListener('click', () => {
      this.routeHome()
      must<HTMLElement>('starmap').classList.add('hidden')
    })
    must<HTMLCanvasElement>('net-map').addEventListener('click', (event) => this.netClick(event))
    document.querySelector<HTMLElement>('.radar-wrap')?.addEventListener('click', (event) => {
      event.stopPropagation()
      this.toggleRadar()
    })
    must<HTMLButtonElement>('map-close').addEventListener('click', () => must<HTMLElement>('starmap').classList.add('hidden'))
    must<HTMLButtonElement>('controls-close').addEventListener('click', () => this.hideControls())
    must<HTMLButtonElement>('pa-resume').addEventListener('click', () => this.resume())
    must<HTMLButtonElement>('pa-controls').addEventListener('click', () => this.showControls())
    must<HTMLButtonElement>('pa-settings').addEventListener('click', () => this.showSettings())
    must<HTMLButtonElement>('btn-settings').addEventListener('click', () => this.showSettings())
    must<HTMLButtonElement>('settings-close').addEventListener('click', () => this.hideSettings())
    must<HTMLButtonElement>('settings-x').addEventListener('click', () => this.hideSettings())
    must<HTMLButtonElement>('controls-x').addEventListener('click', () => this.hideControls())
    // Panelin dışına (karartılmış alana) dokununca kapanır.
    for (const id of ['controls', 'settings']) {
      const el = must<HTMLElement>(id)
      el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.add('hidden')
      })
    }
    const side = (v: 'left' | 'right') => {
      this.save.settings.stickSide = v
      writeSave(this.save)
      this.syncSettingsUi()
    }
    must<HTMLButtonElement>('set-side-left').addEventListener('click', () => side('left'))
    must<HTMLButtonElement>('set-side-right').addEventListener('click', () => side('right'))
    must<HTMLInputElement>('set-invert').addEventListener('change', (e) => {
      this.save.settings.invert = (e.target as HTMLInputElement).checked
      writeSave(this.save)
    })
    must<HTMLInputElement>('set-guide').addEventListener('change', (e) => {
      this.save.settings.guide = (e.target as HTMLInputElement).checked
      writeSave(this.save)
      this.syncSettingsUi()
    })
    must<HTMLInputElement>('set-music').addEventListener('change', (e) => {
      this.save.settings.music = (e.target as HTMLInputElement).checked
      writeSave(this.save)
      this.audio.setMusicOn(this.save.settings.music)
    })
    must<HTMLButtonElement>('pa-upgrade').addEventListener('click', () => this.openUpgrades())
    must<HTMLButtonElement>('pa-restart').addEventListener('click', () => this.openSelect())
    must<HTMLButtonElement>('pa-menu').addEventListener('click', () => this.goTitle())
    must<HTMLButtonElement>('up-continue').addEventListener('click', () => this.continueRun())
    must<HTMLButtonElement>('go-retry').addEventListener('click', () => this.openSelect())
    must<HTMLButtonElement>('go-menu').addEventListener('click', () => this.goTitle())
    this.dom.easyTitle.addEventListener('change', () => this.setEasy(this.dom.easyTitle.checked))
    this.dom.easyPause.addEventListener('change', () => this.setEasy(this.dom.easyPause.checked))
    this.dom.vol.addEventListener('input', () => this.setVolume(Number(this.dom.vol.value)))
    this.dom.sens.addEventListener('input', () => {
      this.save.settings.sens = Number(this.dom.sens.value)
      writeSave(this.save)
    })
    this.dom.dead.addEventListener('input', () => {
      this.save.settings.stickDead = Number(this.dom.dead.value)
      writeSave(this.save)
    })
    this.dom.stick.addEventListener('input', () => {
      this.save.settings.stickSens = Number(this.dom.stick.value)
      writeSave(this.save)
    })
    this.renderer.domElement.addEventListener('click', () => {
      if (this.mode === 'map' || this.mode === 'combat') this.input.requestLock()
    })
  }

  private domSet(id: string, text: string) {
    const el = document.getElementById(id)
    if (el && el.textContent !== text) el.textContent = text
  }

  private buildSky() {
    const n = 3400
    const pos = new Float32Array(n * 3)
    const phase = new Float32Array(n)
    const size = new Float32Array(n)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const u = Math.random()
      const v = Math.random()
      const th = 2 * Math.PI * u
      const ph = Math.acos(2 * v - 1)
      const r = SKY_RADIUS * (0.86 + Math.random() * 0.1)
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r
      pos[i * 3 + 1] = Math.cos(ph) * r
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r
      phase[i] = Math.random() * Math.PI * 2
      size[i] = Math.random() < 0.06 ? 2.6 + Math.random() * 1.8 : 1.1 + Math.random() * 1.1
      const roll = Math.random()
      if (roll > 0.92) {
        col[i * 3] = 1
        col[i * 3 + 1] = 0.84
        col[i * 3 + 2] = 0.68
      } else if (roll < 0.1) {
        col[i * 3] = 0.7
        col[i * 3 + 1] = 0.82
        col[i * 3 + 2] = 1
      } else {
        const g = 0.75 + Math.random() * 0.25
        col[i * 3] = g
        col[i * 3 + 1] = g
        col[i * 3 + 2] = g + 0.04
      }
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('aPhase', new BufferAttribute(phase, 1))
    geo.setAttribute('aSize', new BufferAttribute(size, 1))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    this.starMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTint: { value: new Color(1, 1, 1) } },
      vertexShader: starVert,
      fragmentShader: starFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const stars = new Points(geo, this.starMat)
    stars.frustumCulled = false
    stars.renderOrder = -10
    this.scene.add(stars)
    this.stars = stars
    this.nebulaMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTint: { value: new Color(1, 1, 1) } },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      side: BackSide,
      depthWrite: true,
    })
    const sky = new Mesh(new SphereGeometry(SKY_RADIUS, 48, 32), this.nebulaMat)
    sky.frustumCulled = false
    sky.renderOrder = -20
    this.scene.add(sky)
    this.sky = sky
  }

  private buildDisk() {
    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uInner: { value: 24 },
        uOuter: { value: 112 },
        uAlpha: { value: 0 },
        uHot: { value: new Color(1.25, 1.05, 0.82) },
        uMid: { value: new Color(0.95, 0.4, 0.09) },
        uEdge: { value: new Color(0.28, 0.045, 0.015) },
      },
      vertexShader: diskVert,
      fragmentShader: diskFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })
    this.diskGeo = new RingGeometry(24, 112, 128, 4)
    return mat
  }

  private buildMotes() {
    const n = 180
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 50 + Math.random() * 260
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 70
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    const motes = new Points(
      geo,
      new PointsMaterial({ color: 0xaeb6c4, size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }),
    )
    this.mapRoot.add(motes)
  }

  private buildIntro() {
    const n = 1500
    this.introPos = new Float32Array(n * 3)
    this.introVel = new Float32Array(n * 3)
    this.introHome = new Float32Array(n * 3)
    this.resetIntroParticles()
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(this.introPos, 3))
    const mat = new PointsMaterial({
      color: 0xe7eefc,
      size: 1.7,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    })
    const pts = new Points(geo, mat)
    pts.frustumCulled = false
    pts.visible = false
    this.scene.add(pts)
    return pts
  }

  private resetIntroParticles() {
    const n = this.introPos.length / 3
    for (let i = 0; i < n; i++) {
      const arm = i % 3
      const u = (i % Math.floor(n / 3)) / (n / 3)
      const ang = u * Math.PI * 5.5 + arm * ((Math.PI * 2) / 3)
      const rad = 5 + u * 46
      this.introHome[i * 3] = Math.cos(ang) * rad
      this.introHome[i * 3 + 1] = (Math.random() - 0.5) * 3.5
      this.introHome[i * 3 + 2] = Math.sin(ang) * rad
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const sp = 10 + Math.random() * 28
      this.introVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp
      this.introVel[i * 3 + 1] = Math.cos(ph) * sp
      this.introVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp
      this.introPos[i * 3] = 0
      this.introPos[i * 3 + 1] = 0
      this.introPos[i * 3 + 2] = 0
    }
  }

  private stepIntroParticles(dt: number) {
    const attr = this.introPoints.geometry.attributes.position as BufferAttribute
    const mat = this.introPoints.material as PointsMaterial
    const swirl = smoothstep(15, 26, this.introT)
    mat.opacity = this.introT < 4.6 ? 0 : 1 - smoothstep(25, 32, this.introT)
    mat.color.set(this.introT < 8 ? 0xffffff : this.introT < 16 ? 0xffe1c4 : 0xb7c6ea)
    if (this.introT < 4.6) {
      attr.needsUpdate = true
      return
    }
    for (let i = 0; i < this.introPos.length; i += 3) {
      let x = this.introPos[i]
      let y = this.introPos[i + 1]
      let z = this.introPos[i + 2]
      x += this.introVel[i] * dt * (1 - swirl)
      y += this.introVel[i + 1] * dt * (1 - swirl)
      z += this.introVel[i + 2] * dt * (1 - swirl)
      this.introVel[i] *= 1 - dt * 0.28
      this.introVel[i + 1] *= 1 - dt * 0.28
      this.introVel[i + 2] *= 1 - dt * 0.28
      if (swirl > 0) {
        x += (this.introHome[i] - x) * swirl * dt * 1.5
        y += (this.introHome[i + 1] - y) * swirl * dt * 1.5
        z += (this.introHome[i + 2] - z) * swirl * dt * 1.5
      }
      this.introPos[i] = x
      this.introPos[i + 1] = y
      this.introPos[i + 2] = z
    }
    attr.needsUpdate = true
  }

  private buildPools() {
    const friendlyMat = new MeshBasicMaterial({ color: 0xffe1c4 })
    friendlyMat.color.multiplyScalar(2.1)
    friendlyMat.toneMapped = false
    this.boltMat = new MeshBasicMaterial({ color: 0xff4a3a })
    this.boltMat.color.multiplyScalar(1.8)
    this.boltMat.toneMapped = false
    this.homingMat = new MeshBasicMaterial({ color: 0xffb15a })
    this.homingMat.color.multiplyScalar(1.7)
    this.homingMat.toneMapped = false
    this.gooMat = new MeshBasicMaterial({ color: 0x7dff72 })
    this.gooMat.color.multiplyScalar(1.5)
    this.gooMat.toneMapped = false
    this.laserMat = new MeshBasicMaterial({ color: 0x9ae7ff })
    this.laserMat.toneMapped = false
    this.pelletMat = new MeshBasicMaterial({ color: 0xffe08a })
    this.pelletMat.toneMapped = false
    this.rocketMat = new MeshBasicMaterial({ color: 0xff8a3a })
    this.rocketMat.toneMapped = false
    this.plasmaMat = new MeshBasicMaterial({ color: 0xd07bff })
    this.plasmaMat.toneMapped = false
    this.chainMat = new MeshBasicMaterial({ color: 0xf4f7ff })
    this.chainMat.toneMapped = false
    const geo = new BoxGeometry(0.07, 0.07, 1.7)
    for (let i = 0; i < 48; i++) {
      const friendly = i < 24
      const mesh = new Mesh(geo, friendly ? friendlyMat : this.boltMat)
      mesh.visible = false
      mesh.frustumCulled = false
      this.scene.add(mesh)
      this.shots.push({
        alive: false,
        friendly,
        pos: new Vector3(),
        prev: new Vector3(),
        vel: new Vector3(),
        age: 0,
        dmg: 0,
        kind: 'bolt',
        hops: 1,
        mesh,
      })
    }
    for (let i = 0; i < 6; i++) {
      const count = 22
      const positions = new Float32Array(count * 3)
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      const mat = new PointsMaterial({
        color: 0xffd2b4,
        size: 0.55,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: AdditiveBlending,
      })
      const points = new Points(geometry, mat)
      points.frustumCulled = false
      points.visible = false
      const spriteMat = new SpriteMaterial({
        map: glowTexture(),
        color: 0xffd2b4,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0.8,
      })
      spriteMat.toneMapped = false
      const sprite = new Sprite(spriteMat)
      sprite.visible = false
      this.scene.add(points, sprite)
      this.booms.push({
        alive: false,
        age: 0,
        life: 0.8,
        points,
        positions,
        vels: new Float32Array(count * 3),
        mat,
        sprite,
        spriteMat,
      })
    }
    for (let i = 0; i < 16; i++) {
      const mesh = buildFragment()
      mesh.visible = false
      this.mapRoot.add(mesh)
      this.frags.push({
        alive: false,
        angle: 0,
        radius: 150,
        y: 0,
        spin: 0.08,
        phase: 0,
        mesh,
      })
    }
  }

  private patchLens() {
    const pass = this.lensPass
    const orig = pass.render.bind(pass)
    pass.render = (renderer: WebGLRenderer, write: WebGLRenderTarget, read: WebGLRenderTarget, delta?: number, mask?: boolean) => {
      pass.uniforms.tDepth.value = read.depthTexture
      orig(renderer, write, read, delta ?? 0, mask ?? false)
    }
  }

  private attachDepth(rt: WebGLRenderTarget) {
    if (!rt.depthTexture) {
      const depth = new DepthTexture(rt.width, rt.height)
      depth.type = UnsignedIntType
      depth.format = DepthFormat
      rt.depthTexture = depth
    } else {
      rt.depthTexture.image.width = rt.width
      rt.depthTexture.image.height = rt.height
    }
  }

  private applySize() {
    const w = window.innerWidth
    const h = Math.max(1, window.innerHeight)
    this.renderer.setPixelRatio(this.pr)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.composer.setPixelRatio(this.pr)
    this.composer.setSize(w, h)
    this.attachDepth(this.composer.renderTarget1)
    this.attachDepth(this.composer.renderTarget2)
  }

  private origin() {
    return originById(this.originId)
  }

  private showShip(id: OriginId) {
    this.originId = id
    const index = ORIGINS.findIndex((o) => o.id === id)
    if (index >= 0) this.originIndex = index
    if (!this.ships[id]) {
      const ship = buildShip(id)
      this.scene.add(ship.root)
      this.ships[id] = ship
    }
    if (!this.pilots[id]) {
      const pilot = buildPilot(id)
      pilot.visible = false
      this.scene.add(pilot)
      this.pilots[id] = pilot
    }
    for (const item of ORIGINS) {
      const ship = this.ships[item.id]
      if (ship) ship.root.visible = false
      const pilot = this.pilots[item.id]
      if (pilot) pilot.visible = false
    }
    this.visual = this.ships[id] as PlayerVisual
    this.audio.setRace(id)
    this.ensureBeacon()
    this.syncWalker()
  }

  /** Yürüyen karakter, seçilen türün görünümünü taşır. */
  private syncWalker() {
    const look = originLook(this.originId)
    if (this.walker && this.walkerLook === look.id) return
    if (this.walker) {
      this.flash.forget(this.walker)
      this.mapRoot.remove(this.walker)
      this.disposeMats(this.walker)
    }
    this.walkerRig = buildCreature(look)
    this.walker = this.walkerRig.root
    this.walker.visible = false
    this.mapRoot.add(this.walker)
    this.swing = new Swing(this.walker)
    this.walkerLook = look.id
  }

  private openSelect() {
    this.fadeToken++
    this.fading = false
    this.ending = false
    this.dom.fade.classList.remove('on')
    this.mode = 'select'
    this.showShip(this.originId)
    this.renderSelect()
    this.hideControls()
    this.input.exitLock()
    this.applyPresentation()
  }

  private stepOrigin(dir: number) {
    this.originIndex = (this.originIndex + dir + ORIGINS.length) % ORIGINS.length
    this.showShip(ORIGINS[this.originIndex].id)
    this.renderSelect()
    this.audio.ui()
  }

  private renderSelect() {
    const o = this.origin()
    const race = RACE_STORY[o.id]
    this.domSet('sel-planet', o.planet)
    this.domSet('sel-dist', o.distance)
    this.domSet('sel-fact', o.fact)
    this.domSet('sel-people', race.people)
    this.domSet('sel-who', race.who)
    const foot = footTrait(o.id)
    this.domSet('sel-foot-name', originLook(o.id).name)
    this.domSet('sel-foot', foot.blurb[0].toLocaleUpperCase('tr') + foot.blurb.slice(1))
    this.domSet('sel-ship-name', race.ship)
    this.domSet('sel-ship', race.shipBlurb)
    this.domSet('sel-race-tag', originLook(o.id).name)
    this.domSet('sel-ship-tag', race.ship)
    this.domSet('sel-pilot', `${o.pilot} · gemi ${o.ship} · yerde ${originLook(o.id).name}: ${foot.blurb}`)
    this.domSet('sel-ability', o.abilityText)
    {
      const w = WAR[o.id]
      this.domSet('sel-war', `Filo (${w.tier}): ${w.tactic}${w.deterrent ? ` Caydırıcı: ${w.deterrent.split(':')[0]}.` : ''}`)
    }
    const legend = must<HTMLElement>('sel-legend')
    legend.classList.toggle('hidden', !o.legend)
    legend.textContent = this.wins > 0 ? 'Efsane · kanıtlandı' : 'Efsane · zor kazanılan'
    drawPortrait(must<HTMLCanvasElement>('sel-portrait'), o.id)
    const stats = must<HTMLDivElement>('sel-stats')
    const bar = (label: string, n: number) => `<div class="stat"><span>${label}</span><i style="--w:${n * 20}%"></i></div>`
    stats.innerHTML = `${bar('Hız', o.speed)}${bar('Zırh', o.armor)}${bar('Silah', o.weaponBar)}${bar('Giz', o.stealthBar)}`
    const row = must<HTMLDivElement>('sel-bar')
    if (!row.dataset.wheel) {
      row.dataset.wheel = '1'
      row.addEventListener(
        'wheel',
        (event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
          row.scrollLeft += event.deltaY
          event.preventDefault()
        },
        { passive: false },
      )
    }
    row.innerHTML = ''
    ORIGINS.forEach((item, i) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = originLook(item.id).name
      if (i === this.originIndex) button.classList.add('on')
      button.addEventListener('click', () => {
        this.originIndex = i
        this.showShip(item.id)
        this.renderSelect()
      })
      row.append(button)
    })
    const active = row.children[this.originIndex] as HTMLElement | undefined
    if (this.originIndex === 0) row.scrollLeft = 0
    else active?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }

  selYaw = 0
  selSpin = 0
  selDrag = false
  selCreatures: Partial<Record<OriginId, Rig>> = {}
  selActive = false
  selAttackP = -1

  /** Seçim sahnesi: gerçek 3B karakter ve gemi, sürükleyerek döner; kamera sahne alanını ortalar. */
  private updateSelect(dt: number) {
    this.selActive = true
    const id = this.originId
    for (const o of ORIGINS) {
      const pilot = this.pilots[o.id]
      if (pilot) pilot.visible = false
    }
    let rig = this.selCreatures[id]
    if (!rig) {
      rig = buildCreature(originLook(id))
      this.scene.add(rig.root)
      this.selCreatures[id] = rig
    }
    for (const [k, r] of Object.entries(this.selCreatures)) if (r) r.root.visible = k === id && this.mode === 'select'
    if (!this.selDrag) this.selSpin += dt * 0.35
    const yaw = this.selYaw + this.selSpin
    const cx = 33
    const cz = 3
    // Karakter solda, gemi sağda (kameradan bakınca); ikisi de kendi ekseninde döner.
    const scale = 1.35
    rig.root.scale.setScalar(scale)
    rig.root.position.set(cx + 1.9, 1.05 * scale - 0.2, cz)
    rig.root.rotation.set(0, Math.PI + yaw, 0)
    this.stepRig(rig, 0, false, this.selAttackP >= 0 ? 0.36 * (1 - this.selAttackP) : 0)
    const wobble = id === 'alpha' ? Math.sin(this.clockT * 6.5) * 0.12 : 0
    this.visual.root.position.set(cx - 1.7, 1.9 + Math.sin(this.clockT * 1.5) * 0.1, cz + 1.2)
    this.visual.root.rotation.set(0.18, Math.PI * 0.75 + yaw, wobble)
    spinShip(this.visual.root, dt)
    // Kamera: sahne alanının ortasına bakar (dikey telefonda üst bant, masaüstünde sağ taraf).
    const stage = document.getElementById('sel-stage')?.getBoundingClientRect()
    const W = window.innerWidth
    const H = window.innerHeight
    this.camera.fov = 40
    this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    // Sahne alanının merkezini ekran koordinatında bul; kamerayı o noktada modeller görünecek şekilde nişanla.
    let fx = 0
    let fy = 0
    let sw = 1
    let sh = 1
    if (stage && stage.width > 10 && stage.height > 10) {
      fx = ((stage.left + stage.width / 2) / W) * 2 - 1
      fy = 1 - ((stage.top + stage.height / 2) / H) * 2
      sw = stage.width / W
      sh = stage.height / H
    }
    // Modeller sahne alanına sığsın: ~7 birim genişlik, ~4,6 birim yükseklik.
    const tanH = Math.tan(MathUtils.degToRad(this.camera.fov / 2))
    const dist = clamp(Math.max(8.6 / (2 * tanH * this.camera.aspect * sw), 4.8 / (2 * tanH * sh)), 7, 32)
    const halfH = dist * tanH
    const halfW = halfH * this.camera.aspect
    this.camera.position.set(cx + fx * halfW, 2.6 - fy * halfH, cz - dist)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(cx + fx * halfW, 1.55 - fy * halfH, cz)
    this.diskMat.uniforms.uAlpha.value = 1
  }

  /** Seçim ekranından çıkınca kamera görüş kaydırmasını ve sahne modellerini kaldır. */
  private leaveSelectStage() {
    this.camera.clearViewOffset()
    for (const r of Object.values(this.selCreatures)) if (r) r.root.visible = false
  }

  private layoutUniverse(id: UniId) {
    this.clearOpp()
    const uni = UNIVERSES[id]
    this.universeId = id
    const holeDefs = uni.holes.filter((h) => h.kind === 'hole')
    const wormDefs = uni.holes.filter((h) => h.kind === 'worm')
    while (this.diskMeshes.length < holeDefs.length) {
      const mesh = new Mesh(this.diskGeo, this.diskMat)
      mesh.rotation.x = -Math.PI / 2
      mesh.renderOrder = 1
      this.mapRoot.add(mesh)
      this.diskMeshes.push(mesh)
    }
    while (this.wormMeshes.length < wormDefs.length) {
      const worm = buildWormhole()
      this.mapRoot.add(worm)
      this.wormMeshes.push(worm)
    }
    for (const mesh of this.diskMeshes) mesh.visible = false
    for (const worm of this.wormMeshes) worm.visible = false
    this.holes = []
    holeDefs.forEach((def, i) => {
      const disk = this.diskMeshes[i]
      disk.visible = true
      disk.position.set(def.x, def.y, def.z)
      disk.scale.setScalar(Math.max(0.5, def.rs / 18))
      this.holes.push({
        kind: 'hole',
        pos: disk.position,
        rs: def.rs,
        gm: def.gm,
        curve: def.curve,
        disk,
        worm: null,
      })
    })
    wormDefs.forEach((def, i) => {
      const worm = this.wormMeshes[i]
      worm.visible = true
      worm.position.set(def.x, def.y, def.z)
      const label = worm.getObjectByName('label')
      if (label && def.to) paintLabel(label as Sprite, `→ ${UNIVERSES[def.to].name}`)
      this.holes.push({
        kind: 'worm',
        pos: worm.position,
        rs: 0,
        gm: 0,
        curve: 1,
        to: def.to,
        disk: null,
        worm,
      })
    })
    this.layoutPlanets(uni)
    const paint = (value: { set?: (hex: number) => void; setRGB?: (r: number, g: number, b: number) => void }, rgb: [number, number, number]) => {
      if (value.setRGB) value.setRGB(rgb[0], rgb[1], rgb[2])
    }
    paint(this.nebulaMat.uniforms.uTint.value as Color, uni.tint)
    paint(this.starMat.uniforms.uTint.value as Color, uni.tint)
    paint(this.diskMat.uniforms.uHot.value as Color, uni.hot)
    paint(this.diskMat.uniforms.uMid.value as Color, uni.mid)
    paint(this.diskMat.uniforms.uEdge.value as Color, uni.edge)
    if (this.lensPass) {
      const lensTint = this.lensPass.uniforms.uTint.value as Vector3
      lensTint.set(uni.tint[0], uni.tint[1], uni.tint[2])
    }
    const sun = this.planets.find((p) => p.def.heat)
    if (this.holes[0]) this.bhLight.position.copy(this.holes[0].pos)
    else if (sun) this.bhLight.position.copy(sun.pos)
    else if (this.planets[0]) this.bhLight.position.copy(this.planets[0].pos)
    this.scene.fog = new FogExp2(new Color(uni.fog[0], uni.fog[1], uni.fog[2]), uni.fogDensity)
    this.domSet('uni-name', uni.name)
    // Evrenin boyuna göre: dış sınır en uzak yörüngenin ötesinde, parçalar merkez gövdenin dışında.
    let far = 0
    for (const def of uni.planets) far = Math.max(far, Math.hypot(def.x, def.y, def.z) + def.radius * (def.rings ? 1.7 : 1))
    for (const h of uni.holes) far = Math.max(far, Math.hypot(h.x, h.y, h.z))
    this.mapLimit = Math.max(MAP_LIMIT, far + 900)
    const core = uni.planets.find((def) => Math.hypot(def.x, def.y, def.z) < 1)
    this.fragInner = Math.max(120, core ? core.radius + (core.heat ? core.radius * 1.4 : 60) : 120)
  }

  private sampleTime(pos: Vector3) {
    let tf = 1
    for (const hole of this.holes) {
      if (hole.kind !== 'hole') continue
      tf = Math.min(tf, timeFactorAt(pos.distanceTo(hole.pos), hole.rs, hole.curve))
    }
    const uni = UNIVERSES[this.universeId]
    return { tf, worldScale: Math.min(8, (1 / Math.max(0.08, tf)) * uni.timeMul) }
  }

  private pullGravity(dt: number) {
    const uni = UNIVERSES[this.universeId]
    for (const hole of this.holes) {
      vA.subVectors(hole.pos, this.pos)
      const r = Math.max(0.8, vA.length())
      const gm = hole.kind === 'worm' ? 5000 : hole.gm * uni.gravMul
      this.vel.addScaledVector(vA, (gm / (r * r) / r) * dt)
    }
    for (const planet of this.planets) {
      vA.subVectors(planet.pos, this.pos)
      const dist = Math.max(1, vA.length())
      const alt = dist - planet.def.radius
      if (alt < planet.def.radius * 2.3) {
        const falloff = clamp(1 - Math.max(0, alt) / (planet.def.radius * 2.3), 0, 1)
        const accel = Math.min(6, planet.def.gravity * 0.18) * falloff
        this.vel.addScaledVector(vA, (accel / dist) * dt)
      }
      if (dist < planet.def.radius + 2.5) {
        vB.copy(this.pos).sub(planet.pos).normalize()
        this.pos.copy(planet.pos).addScaledVector(vB, planet.def.radius + 2.5)
        const inward = this.vel.dot(vB)
        if (inward < 0) this.vel.addScaledVector(vB, -inward)
      }
    }
  }

  private hazards() {
    for (const hole of this.holes) {
      const dist = this.pos.distanceTo(hole.pos)
      if (hole.kind === 'hole' && dist < hole.rs) {
        this.lose('ufuk')
        return true
      }
      if (hole.kind === 'worm' && dist < 15 && this.transitionLock <= 0 && !this.fading && hole.to) {
        if (!this.tutorialAt('gate')) {
          // Eğitim bitmeden kapı kapalı: geri it ve söyle.
          vB.subVectors(this.pos, hole.pos).normalize()
          this.pos.copy(hole.pos).addScaledVector(vB, 16)
          this.vel.addScaledVector(vB, 20)
          if (this.gateWarnT <= 0) {
            this.gateWarnT = 4
            this.toast('Solucan deliği henüz kapalı: önce kendi sistemindeki eğitim görevlerini bitir (sol üstteki görev kartı).')
          }
          return false
        }
        this.transit(hole.to)
        return true
      }
    }
    return false
  }

  private transit(to: UniId) {
    if (this.fading || this.layer === 'foot') return
    if (this.mode === 'combat') {
      this.ending = true
      this.clearCombat()
      this.clearShots()
      this.mode = 'map'
      this.pos.copy(this.saved.pos)
      this.vel.copy(this.saved.vel)
      this.quat.copy(this.saved.quat)
      this.ending = false
      this.mapRoot.visible = true
      this.combatRoot.visible = false
    }
    if (this.mode !== 'map') return
    this.bookmark()
    const from = this.universeId
    const uni = UNIVERSES[to]
    this.questEvent('gate')
    // Işık tüneli: geçiş boyunca halkalar ve yıldız çizgileri, varış sistemi adı.
    const warp = document.getElementById('warp')
    if (warp) {
      this.domSet('warp-to', `→ ${uni.name}`)
      warp.classList.add('on')
      window.setTimeout(() => warp.classList.remove('on'), 1250)
    }
    this.audio.warp()
    this.fadeTo(() => {
      this.clearCombat()
      this.clearFleets()
      this.clearLoot()
      this.layoutUniverse(to)
      const saved = this.returns[to]
      if (saved) {
        this.pos.copy(saved.pos)
        this.vel.copy(saved.vel)
        this.quat.copy(saved.quat)
        this.escapeThroats()
      } else {
        const worm = this.holes.find((h) => h.kind === 'worm' && h.to === from) ?? this.holes.find((h) => h.kind === 'worm')
        const anchor = worm ? worm.pos : new Vector3()
        vA.set(anchor.x > 30 ? -70 : 40, 22, anchor.z > 10 ? -76 : 76)
        this.pos.copy(anchor).add(vA)
        vB.copy(vA).normalize()
        this.vel.copy(vB).multiplyScalar(34)
        quatFromForward(this.quat, vB)
      }
      this.layer = 'ship'
      this.visual.root.position.copy(this.pos)
      this.visual.root.quaternion.copy(this.quat)
      this.transitionLock = 2.8
      this.snapCamera = true
      this.toast(this.isHome() ? `${uni.name}. Ev sistemi — kalkanın burada çabuk döner.` : `${uni.name}. ${uni.line}`)
      if (this.isHome() && this.tutorialAt('home')) this.spawnHomePatrols(Math.min(1, this.homePatrols))
      if (this.foreignHome(to)) this.raiseAmbush()
      if (to === 'avlu' && !this.avluSeen) {
        this.avluSeen = true
        this.avluIntro()
      }
      this.mirrorRun()
    })
  }

  avluSeen = false
  /** Sessiz Avlu'ya ilk varış: kara deliğin ve ona bağlanan bütün eşiklerin tanıtımı. */
  private avluIntro() {
    const links = this.holes.filter((h) => h.kind === 'worm' && h.to).map((h) => UNIVERSES[h.to as UniId]?.name ?? h.to)
    const text = [
      "Galaksinin ortasındaki bu kara delik, Sessiz Avlu'nun kalbi. Bütün eşikler (solucan delikleri) bir ipliğin uçları gibi buraya bağlanır; her sistemden buraya, buradan her sisteme yol vardır.",
      `Çevresindeki mor girdaplar diğer sistemlere açılır: ${links.join(', ')}.`,
      'Kara deliğe yaklaştıkça zaman yavaşlar (sol üstteki zaman oranına bak) ve ışık bükülür. Olay ufkuna düşen hiçbir şey geri dönmez; kenarına kadar yaklaş, içine girme.',
    ].join('\n')
    this.showStory('Sessiz Avlu · Kavşak', text, 'Anladım')
  }

  private lensFocus() {
    if (this.wellLife > 0) return { pos: this.wellPos, rs: 5.4 }
    const enemyWell = this.enemyWells.find((well) => well.alive)
    if (enemyWell) return { pos: enemyWell.pos, rs: 3.8 }
    if (this.mode === 'combat' || (this.mode === 'pause' && this.pausedFrom === 'combat')) return null
    let best: Hole | null = null
    let score = 0
    for (const hole of this.holes) {
      if (hole.kind !== 'hole') continue
      const ang = hole.rs / Math.max(1, this.camera.position.distanceTo(hole.pos))
      if (ang > score) {
        score = ang
        best = hole
      }
    }
    return best ? { pos: best.pos, rs: best.rs } : null
  }

  private makeWell(ringColor = 0xffe2b0, radius = 4.1) {
    const group = new Group()
    const dark = new Mesh(new SphereGeometry(radius, 22, 16), new MeshBasicMaterial({ color: 0x000000 }))
    const ringMat = new MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    ringMat.toneMapped = false
    const ring = new Mesh(new TorusGeometry(radius * 1.55, 0.18, 10, 36), ringMat)
    group.add(dark, ring)
    group.visible = false
    return group
  }

  private updateWell(dt: number) {
    if (this.wellLife <= 0) this.wellMesh.visible = false
    else {
    this.wellLife -= dt
    this.wellMesh.visible = true
    this.wellMesh.position.copy(this.wellPos)
    this.wellMesh.rotation.y += dt
    this.wellMesh.scale.setScalar(0.9 + Math.sin(this.clockT * 7) * 0.06)
    {
      const selfDist = this.pos.distanceTo(this.wellPos)
      if (selfDist < 4.2) this.hurtPlayer(1.6 * dt, true)
      for (const enemy of [...this.enemies]) {
        if (!enemy.alive) continue
        vA.subVectors(this.wellPos, enemy.pos)
        const dist = Math.max(0.5, vA.length())
        enemy.vel.addScaledVector(vA, (64 / dist) * dt)
        if (dist < 24) this.hurtEnemy(enemy, 14 * dt)
      }
    }
    }
    for (const well of this.enemyWells) {
      if (!well.alive) continue
      well.life -= dt
      well.mesh.visible = well.life > 0
      well.mesh.position.copy(well.pos)
      well.mesh.rotation.y += dt * 1.4
      if (well.life <= 0) {
        well.alive = false
        well.owner = null
        continue
      }
      // Gerçek kara delik: olay ufkuna (WELL_EH) düşen her gemi parçalanır; çevresi güçlü çeker ve yakar.
      const WELL_EH = 4.2
      for (const enemy of [...this.enemies]) {
        if (!enemy.alive) continue
        vA.subVectors(well.pos, enemy.pos)
        const dist = Math.max(0.4, vA.length())
        // Açan gemi de dahil: herkes aynı güçle çekilir; olay ufkuna giren parçalanır.
        enemy.vel.addScaledVector(vA, Math.min(220, Math.max(60 / dist, 3000 / (dist * dist))) * dt)
        // Geminin gövdesi olay ufkuna değdiği an (yalnız merkezi değil) parçalanır.
        const bodyR = enemy.giant ? 2.6 * enemy.scale : 2.2
        if (dist < WELL_EH + bodyR * 0.6) {
          this.fx.explosion(enemy.pos, 0xffe2b0, enemy.giant ? 2.4 : 1.4)
          this.hurtEnemy(enemy, enemy.hull + enemy.shield + 1)
          if (enemy === well.owner) this.toast('Amiral gemisi kendi kara deliğine düştü!')
        } else if (dist < 16) this.hurtEnemy(enemy, 12 * dt)
      }
      for (let i = this.escorts.length - 1; i >= 0; i--) {
        if (this.escorts[i].position.distanceTo(well.pos) < WELL_EH + 1) this.loseEscort(i, 'Eşlik gemin kara deliğe düştü ve parçalandı.', true)
      }
      const playerDist = this.pos.distanceTo(well.pos)
      if (playerDist < 26 && (this.mode === 'combat' || this.mode === 'map') && this.layer === 'ship') {
        vC.subVectors(well.pos, this.pos)
        this.vel.addScaledVector(vC, (40 / Math.max(0.4, playerDist)) * dt)
        if (playerDist < WELL_EH) {
          // Olay ufku: gemi parçalanır.
          this.fx.explosion(this.pos, 0xffe2b0, 2.4)
          this.shield = 0
          this.hull = 0
          this.toast('Kara deliğin olay ufkuna düştün: gemi parçalandı.')
          this.lose('combat')
          return
        }
        if (playerDist < 14) {
          this.hitCd = Math.max(this.hitCd, 0.5)
          this.hurtPlayer(14 * dt, true)
          this.hurtV = Math.max(this.hurtV, 0.5)
          this.trauma = Math.min(1, Math.max(this.trauma, 0.4))
        }
      }
    }
  }

  private useAbilities(dt: number) {
    this.cd1 = Math.max(0, this.cd1 - dt)
    this.cd2 = Math.max(0, this.cd2 - dt)
    const a1 = this.input.touchAb1
    const a2 = this.input.touchAb2
    if (this.input.pressed('KeyG') || (a1 && !this.ab1Was)) this.tryAbility(1)
    if (this.input.pressed('KeyH') || (a2 && !this.ab2Was)) this.tryAbility(2)
    this.ab1Was = a1
    this.ab2Was = a2
  }

  private tryAbility(slot: 1 | 2) {
    const origin = this.origin()
    const id = (slot === 1 ? origin.ability : origin.ability2) as AbilityId | undefined
    if (!id) {
      this.toast('Bu geminin o yuvası boş.')
      return
    }
    const left = slot === 1 ? this.cd1 : this.cd2
    if (left > 0) {
      this.toast(`${ABILITY_INFO[id].name} ${Math.ceil(left)} sn`)
      return
    }
    if (id === 'stun') {
      if (!this.fighting()) {
        this.toast('Sersemletme yalnız savaşta.')
        return
      }
      let hit = 0
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue
        if (enemy.pos.distanceTo(this.pos) < 56) {
          enemy.stun = 3.4
          hit += 1
        }
      }
      this.cd1 = 14
      this.toast(hit ? 'Sersemletme dalgası.' : 'Menzilde kimse yok.')
      this.audio.warning()
      return
    }
    if (id === 'well') {
      shipForward(this.quat, vA)
      this.wellPos.copy(this.pos).addScaledVector(vA, 32)
      this.wellLife = 4.6
      this.wellMesh.visible = true
      this.wellMesh.position.copy(this.wellPos)
      this.cd2 = 22
      this.toast('Mini kara delik açıldı.')
      this.audio.boom()
      return
    }
    if (id === 'cloak') {
      this.cloakT = 3.6
      this.cd1 = 16
      this.vis = Math.max(0, this.vis - 20)
      this.toast('Karanlığa gömüldün.')
      this.audio.ui()
      return
    }
    if (id === 'mend') {
      this.hull = Math.min(this.hullMax, this.hull + 34)
      this.cd1 = 16
      this.toast('Gövde filizlendi.')
      this.audio.collect()
    }
  }

  private paintAbilities() {
    const origin = this.origin()
    const paint = (slot: 1 | 2, id: AbilityId | undefined) => {
      const button = must<HTMLButtonElement>(slot === 1 ? 'ab1' : 'ab2')
      if (!id || (this.mode !== 'map' && this.mode !== 'combat' && this.mode !== 'pause')) {
        button.classList.add('hidden')
        return
      }
      button.classList.remove('hidden')
      if (this.layer === 'foot') {
        button.classList.add('hidden')
        return
      }
      const info = ABILITY_INFO[id]
      this.domSet(slot === 1 ? 'ab1-name' : 'ab2-name', info.name)
      const left = slot === 1 ? this.cd1 : this.cd2
      this.domSet(slot === 1 ? 'ab1-cd' : 'ab2-cd', left > 0.15 ? `${Math.ceil(left)}` : 'hazır')
      const touch = document.querySelector<HTMLButtonElement>(`#touch-buttons button[data-act="ab${slot}"]`)
      const text = left > 0.15 ? `${slot === 1 ? 'G' : 'H'} ${Math.ceil(left)}` : `${slot === 1 ? 'G' : 'H'} · ${info.name}`
      if (touch && touch.textContent !== text) touch.textContent = text
    }
    paint(1, origin.ability)
    paint(2, origin.ability2)
  }

  private shotMat(kind: ShotKind, friendly: boolean) {
    if (kind === 'goo') return this.gooMat
    if (kind === 'homing') return this.homingMat
    if (kind === 'laser') return this.laserMat
    if (kind === 'pellet') return this.pelletMat
    if (kind === 'rocket') return this.rocketMat
    if (kind === 'plasma') return this.plasmaMat
    if (kind === 'chain') return this.chainMat
    return friendly ? this.laserMat : this.boltMat
  }

  private weaponNoise() {
    if (this.weapon === 'laser') return 16
    if (this.weapon === 'spread') return 42
    if (this.weapon === 'rocket') return 34
    if (this.weapon === 'plasma') return 30
    return 22
  }

  /** Silaha göre isabet efekti: roket patlaması, plazma topu, yıldırım çakması, lazer kıvılcımı. */
  private impactFx(kind: ShotKind, at: Vector3, _from: Vector3) {
    if (kind === 'rocket') {
      this.spawnBoom(at, 2.2, 0xffa050)
      this.spawnBoom(at, 1.2, 0xfff0c0)
      this.fx.explosion(at, 0xffa050, 2)
      this.audio.boom()
      this.trauma = Math.min(0.5, this.trauma + 0.12)
    } else if (kind === 'plasma') {
      this.spawnBoom(at, 1.4, this.originId === 'gliese' ? 0xff6a2a : 0x9a7aff)
    } else if (kind === 'chain') {
      this.spawnBoom(at, 0.9, 0xb8e6ff)
    } else if (kind === 'pellet') {
      this.spawnBoom(at, 0.45, 0xffd890)
    } else {
      this.spawnBoom(at, 0.55, 0xffe2c4)
    }
  }

  /** Yıldırım: iki nokta arasında kırık, parlayan bir çizgi; kısa sürede söner. */
  private zap(a: Vector3, b: Vector3, color: number) {
    const pts: number[] = []
    const n = 9
    vK.subVectors(b, a)
    const len = vK.length()
    vL.set(vK.y, -vK.x, vK.z * 0.3)
    if (vL.lengthSq() < 1e-6) vL.set(1, 0, 0)
    vL.normalize()
    vM.crossVectors(vK, vL).normalize()
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * len * 0.12
      const k = i === 0 || i === n ? 0 : (Math.random() - 0.5) * len * 0.12
      pts.push(a.x + vK.x * t + vL.x * j + vM.x * k, a.y + vK.y * t + vL.y * j + vM.y * k, a.z + vK.z * t + vL.z * j + vM.z * k)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
    const mat = new LineBasicMaterial({ color: new Color(color).multiplyScalar(2.2), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false })
    mat.toneMapped = false
    const line = new Line(geo, mat)
    this.scene.add(line)
    const t0 = performance.now()
    const fade = () => {
      const k = (performance.now() - t0) / 220
      if (k >= 1) {
        line.removeFromParent()
        geo.dispose()
        mat.dispose()
        return
      }
      mat.opacity = 1 - k
      requestAnimationFrame(fade)
    }
    requestAnimationFrame(fade)
  }

  /** Baskın zamanlayıcısı: eğitim karakol adımına gelince, ara sıra düşman bir ırk kolonilerinden birine saldırır. */
  /* ---------- Fırsatlar: 5–8 dakikada bir küçük ödül ya da sana gelen küçük tehdit ---------- */
  oppT = 300
  opp: { mesh: THREEGroup; pos: Vector3; t: number } | null = null
  private oppTick(dt: number) {
    const el = document.getElementById('opp-mark')
    if (this.opp) {
      const o = this.opp
      o.t -= dt
      o.mesh.rotation.y += dt * 1.5
      const d = this.pos.distanceTo(o.pos)
      if (el) {
        el.classList.toggle('hidden', this.layer !== 'ship' || this.mode !== 'map')
        if (this.layer === 'ship') {
          this.placeMark(el, o.pos)
          this.domSet('opp-dist', `${Math.round(d)}`)
        }
      }
      if (this.layer === 'ship' && this.mode === 'map' && d < 12) {
        const g = { energy: 35 + Math.round(Math.random() * 30), ore: 6 + Math.round(Math.random() * 6), crystal: 1 + Math.round(Math.random() * 2) }
        this.addRes(g)
        this.audio.collect()
        this.fx.flash(o.pos, 0xffd27a, 6, 0.3)
        this.toast(`Yük kapsülü açıldı: +${this.resText(g)}`)
        this.feed('🎁', `Kapsül: +${this.resText(g)}`, 'good')
        this.clearOpp()
      } else if (o.t <= 0) {
        this.feed('🎁', 'Yük kapsülü kayboldu', 'bad')
        this.clearOpp()
      }
      return
    }
    el?.classList.add('hidden')
    if (!this.tutorialAt('gate') || this.mode !== 'map') return
    this.oppT -= dt
    if (this.oppT > 0) return
    this.oppT = 300 + Math.random() * 180
    if (this.layer !== 'ship' || Math.random() < 0.6) this.spawnOpp()
    else {
      // Küçük tehdit: sana doğru gelen bir avcı çifti (yenince ganimet).
      const foes = ORIGINS.map((o) => o.id).filter((id) => id !== this.originId && !friendly(this.rel[id]))
      if (!foes.length) return this.spawnOpp()
      shipForward(this.quat, vO1)
      this.spawnFleet(2, 1, this.pos.clone().addScaledVector(vO1, 220).add(new Vector3(0, 40, 0)), 'hunt')
      const f = this.fleets[this.fleets.length - 1]
      if (f) f.faction = foes[Math.floor(Math.random() * foes.length)]
      this.raidAlarm(`${f?.faction ? factionName(f.faction) : 'Avcı'} gemileri seni fark etti ve geliyor! Kapış ya da sessizce sıvış.`)
    }
  }

  private spawnOpp() {
    const mesh = new Group()
    const m = new MeshBasicMaterial({ color: new Color(0xffc46a).multiplyScalar(1.5) })
    m.toneMapped = false
    const body = new Mesh(new BoxGeometry(2.2, 1.4, 1.4), new MeshStandardMaterial({ color: 0x6a6f7a, metalness: 0.6, roughness: 0.4 }))
    const band = new Mesh(new BoxGeometry(2.3, 0.3, 1.5), m)
    const beamM = new MeshBasicMaterial({ color: new Color(0xffc46a).multiplyScalar(1.2), transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false })
    beamM.toneMapped = false
    const beam = new Mesh(new CylinderGeometry(0.4, 0.4, 120, 8, 1, true), beamM)
    mesh.add(body, band, beam)
    // Oyuncunun önünde, yakın bir gezegenin içine düşmeyen bir nokta.
    shipForward(this.quat, vO1)
    const pos = this.pos.clone().addScaledVector(vO1, 180 + Math.random() * 80).add(new Vector3((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 120))
    this.keepOutOfPlanets(pos, 30)
    mesh.position.copy(pos)
    this.mapRoot.add(mesh)
    this.opp = { mesh, pos, t: 150 }
    this.audio.quest()
    this.toast('📡 Sinyal: terk edilmiş bir yük kapsülü yakında. Altın işareti izle; 150 sn içinde al.')
  }

  private clearOpp() {
    if (!this.opp) return
    this.opp.mesh.removeFromParent()
    this.disposeMats(this.opp.mesh)
    this.opp.mesh.traverse((o) => (o as Mesh).geometry?.dispose())
    this.opp = null
    document.getElementById('opp-mark')?.classList.add('hidden')
  }

  private raidTick(dt: number) {
    if (this.raid) {
      this.raid.t -= dt
      const c = this.colonies[this.raid.planetId]
      if (!c || !this.mine(c)) {
        this.raid = null
        return
      }
      if (this.raid.t <= 0) {
        // Yetişemedin: üs kendi gücüyle savunur; güçlüyse püskürtür, zayıfsa hasar alır ya da düşer.
        const by = this.raid.by
        this.raid = null
        const tPow = c.turrets.reduce((a, t) => a + (t.alive ? turretLvlMul(t.lvl ?? 1) * (t.kind === 'hava' ? 1.3 : 1) : 0), 0)
        const def = (c.level * 2 + tPow + this.colonyPlan(c).soldiers / 3) * (c.posture === 'savunma' ? 1.3 : 1)
        const atk = 3 + Math.random() * 6
        if (def >= atk) {
          this.feed('🛡', `${c.planetName} saldırıyı kendi püskürttü`, 'good')
          this.toast(`${c.planetName}: taretlerin ve halkın ${factionName(by)} saldırısını püskürttü.`)
        } else {
          c.hull -= c.hullMax * 0.45
          c.pop = Math.max(1, c.pop - 2)
          if (c.hull <= 0 && c.kind !== 'main') {
            this.flipOwner(c, this.planetOf(c), by)
            this.feed('⚠', `${c.planetName} düştü: ${factionName(by)} aldı`, 'bad')
            this.toast(`⚠ ${c.planetName} kolonini ${factionName(by)} ele geçirdi. Geri almak için ekibinle saldır.`)
          } else {
            c.hull = Math.max(1, c.hull)
            this.feed('⚠', `${c.planetName} hasar aldı`, 'bad')
            this.toast(`${c.planetName} saldırıda hasar aldı ve nüfus kaybetti. Taret ekle, üssü büyüt.`)
          }
        }
      }
      return
    }
    if (!this.tutorialAt('capture')) return
    this.raidT -= dt
    if (this.raidT > 0) return
    this.raidT = 240 + Math.random() * 240
    const mineList = Object.values(this.colonies).filter((c) => c && this.mine(c) && !this.standingOn(c.planetId))
    const foes = ORIGINS.map((o) => o.id).filter((id) => id !== this.originId && !friendly(this.rel[id]))
    if (!mineList.length || !foes.length) return
    const c = mineList[Math.floor(Math.random() * mineList.length)]
    const by = foes[Math.floor(Math.random() * foes.length)]
    this.raid = { planetId: c.planetId, by, t: 75 }
    this.route = { kind: 'planet', id: c.planetId, system: c.universe }
    this.routeByQuest = false
    this.audio.warning()
    this.feed('⚠', `${c.planetName} saldırı altında!`, 'bad')
    this.toast(`⚠ ${factionName(by)} ${c.planetName} kolonine saldırıyor! 75 sn içinde in ve savun — rota kuruldu.`)
  }

  /** Uzay savaşı taktikleri: Tab hedef seç, B kaçınma takla (kısa dokunulmazlık), 1–3 eşlik gemisi emirleri. */
  private shipTactics(dt: number) {
    this.dodgeCd = Math.max(0, this.dodgeCd - dt)
    this.dodgeT = Math.max(0, this.dodgeT - dt)
    if (this.layer !== 'ship') return
    if (this.input.pressed('Tab')) this.cycleTarget()
    if ((this.input.pressed('KeyB') || (this.input.touchDodge && !this.dodgeWas)) && this.dodgeCd <= 0) this.dodge()
    this.dodgeWas = this.input.touchDodge
    if (this.dodgeT > 0) {
      // Takla: geminin kendi ileri ekseni çevresinde hızlı dönüş.
      qA.setFromAxisAngle(AXIS_Z, (Math.PI * 2 / 0.45) * dt * this.dodgeDir)
      this.quat.multiply(qA)
    }
    if (this.escorts.length && !this.orderOpen) {
      const orders: ('takip' | 'saldir' | 'koru')[] = ['takip', 'saldir', 'koru']
      orders.forEach((o, i) => {
        if (this.input.pressed(`Digit${i + 1}`) && this.escortOrder !== o) {
          this.escortOrder = o
          this.toast(`Eşlik gemileri: ${o === 'takip' ? 'Takip (yanında uçar)' : o === 'saldir' ? 'Saldır (seçili hedefe yüklenir)' : 'Koru (sana yaklaşanı vurur)'}`)
          this.audio.ui()
        }
      })
    }
  }

  dodgeWas = false
  camWas = false
  dodgeDir = 1

  /** Savaş başında düşman rollerinin kısa özeti. */
  private roleSummary() {
    const n = (r: string) => this.enemies.filter((e) => e.alive && e.role === r).length
    const parts = [n('avci') ? `${n('avci')} avcı (hızlı, yakın)` : '', n('bombaci') ? `${n('bombaci')} bombacı (uzaktan füze)` : '', n('kalkan') ? `${n('kalkan')} kalkanlı (önce kalkanı kır)` : '']
    const giants = this.enemies.filter((e) => e.alive && e.giant).length
    if (giants) parts.push(`${giants} dev`)
    return parts.filter(Boolean).join(', ') || 'Filo üstüne geldi'
  }

  private cycleTarget() {
    const alive = this.enemies.filter((e) => e.alive)
    if (!alive.length) {
      this.pickedTarget = null
      return
    }
    alive.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))
    const i = this.pickedTarget ? alive.indexOf(this.pickedTarget) : -1
    this.pickedTarget = alive[(i + 1) % alive.length]
    this.audio.ui()
  }

  private dodge() {
    this.dodgeCd = 2.6
    this.dodgeT = 0.45
    const side = this.input.down('KeyA') ? -1 : this.input.down('KeyD') ? 1 : Math.random() < 0.5 ? -1 : 1
    this.dodgeDir = -side
    shipRight(this.quat, vH)
    this.vel.addScaledVector(vH, side * 46)
    this.fx.puff(this.pos, 0x9adfff, 4, 1.2, 0.5, undefined, true)
    this.audio.sweep(300, 900, 0.25, 'sine', 0.05)
  }

  private shotAssist(fwd: Vector3): Vector3 | null {
    if (!this.fighting()) return null
    let best: Enemy | null = null
    let bestA = 0.26
    const p = this.pickedTarget
    if (p?.alive) {
      vH.subVectors(p.pos, this.pos)
      if (vH.length() < 260 && vH.normalize().angleTo(fwd) < 0.42) {
        best = p
        bestA = -1
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || bestA < 0) continue
      vH.subVectors(e.pos, this.pos)
      const d = vH.length()
      if (d > 220 || d < 1) continue
      const a = vH.multiplyScalar(1 / d).angleTo(fwd)
      if (a < bestA) {
        bestA = a
        best = e
      }
    }
    if (!best) return null
    const d = best.pos.distanceTo(this.pos)
    const speed = this.weapon === 'rocket' ? 150 : this.weapon === 'plasma' ? 200 : this.weapon === 'spread' ? 230 : 340
    vI.copy(best.pos).addScaledVector(best.vel, d / speed).sub(this.pos).normalize()
    return vI
  }

  private firePrimary() {
    this.muzzleSide *= -1
    shipForward(this.quat, vA)
    shipRight(this.quat, vB)
    shipUp(this.quat, vC)
    vD.copy(this.pos).addScaledVector(vA, 1.2).addScaledVector(vB, this.muzzleSide * 0.32)
    const ck = this.visual.cockpit
    if (ck.visible) {
      // Kokpitte mermi o yandaki toptan çıkar; namlu parlar, top geri teper.
      const guns = ck.userData.guns as Group[] | undefined
      const gi = this.muzzleSide < 0 ? 0 : 1
      if (guns?.[gi]) {
        guns[gi].updateWorldMatrix(true, false)
        vD.set(0, 0, -0.62).applyMatrix4(guns[gi].matrixWorld)
        this.ckFire[gi] = 1
      }
      this.trauma = Math.min(0.35, this.trauma + 0.04)
    }
    // Nişan yardımı: bakış yönüne ~9° içindeki en yakın düşmana, hareketini önceden hesaplayarak yönel.
    const aim = this.shotAssist(vA)
    if (aim) vA.copy(aim)
    const mul =
      this.weaponMul *
      1.45 *
      (this.originId === 'gliese' && this.weapon === 'plasma' ? 1.35 : 1) *
      (this.originId === 'kepler452' && this.weapon === 'chain' ? 1.2 : 1) *
      (this.powerT > 0 ? 1.28 : 1)
    const dx = vA.x
    const dy = vA.y
    const dz = vA.z
    if (this.weapon === 'spread') {
      this.fireCd = 0.36
      for (let i = 0; i < 5; i++) {
        vE.set(dx, dy, dz).applyAxisAngle(vC, (i - 2) * 0.1)
        this.spawnShot(true, vD, vE, 5 * mul, 'pellet')
      }
    } else if (this.weapon === 'rocket') {
      this.fireCd = 0.45
      this.spawnShot(true, vD, vA, 28 * mul, 'rocket')
    } else if (this.weapon === 'plasma') {
      this.fireCd = 0.34
      this.spawnShot(true, vD, vA, 22 * mul, 'plasma')
    } else if (this.weapon === 'chain') {
      this.fireCd = 0.42
      const hops = this.originId === 'kepler452' ? 3 : 2
      const target = this.fighting() ? this.enemies.find((e) => e.alive && e.pos.distanceTo(this.pos) < 130) : undefined
      if (target) {
        vE.subVectors(target.pos, vD).normalize()
        this.zap(vD, target.pos, 0xd8f0ff)
      } else vE.set(dx, dy, dz)
      this.spawnShot(true, vD, vE, 16 * mul, 'chain', hops)
    } else {
      this.fireCd = 0.11
      this.spawnShot(true, vD, vA, 9 * mul, 'laser')
    }
    this.audio.shipShot()
    this.muzzleT = 0.045
    this.visual.muzzle.position.set(this.muzzleSide * 0.32, 0, -2.35)
  }

  private pollGear() {
    const controlsOpen = !this.dom.controls.classList.contains('hidden')
    const landEdge = this.input.pressed('KeyL') || (this.input.touchLand && !this.landWas)
    const weaponEdge = this.input.pressed('KeyX') || (this.input.touchWeapon && !this.weaponWas)
    this.landWas = this.input.touchLand
    this.weaponWas = this.input.touchWeapon
    if (!controlsOpen && landEdge && this.mode === 'map') {
      const shift = this.input.down('ShiftLeft') || this.input.down('ShiftRight')
      if (shift && this.layer === 'ship') this.land(true)
      else if (shift && this.layer === 'foot') this.openBoarding()
      else this.toggleSurface()
    }
    if (!controlsOpen && weaponEdge && this.layer === 'ship' && (this.mode === 'map' || this.mode === 'combat')) this.cycleWeapon()
  }

  private cycleWeapon() {
    const ids = this.owned.length ? this.owned : starterWeapons(this.originId)
    const next = ids[(Math.max(0, ids.indexOf(this.weapon)) + 1) % ids.length]
    this.weapon = next
    const info = WEAPONS.find((item) => item.id === next)
    this.toast(info ? `${info.name}. ${info.blurb}` : 'Silah')
    this.mirrorRun()
  }

  private ensureBeacon() {
    if (this.visual.root.getObjectByName('beacon')) return
    const mat = new SpriteMaterial({
      map: glowTexture(),
      color: 0xfff1d6,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
    })
    mat.toneMapped = false
    const beacon = new Sprite(mat)
    beacon.name = 'beacon'
    beacon.scale.set(1.7, 1.7, 1)
    this.visual.root.add(beacon)
  }

  private layoutPlanets(uni: { planets: PlanetDef[] }) {
    this.clearLocals()
    this.clearGround()
    for (const c of Object.values(this.colonies)) this.detachColony(c)
    for (const poi of this.pois) {
      poi.removeFromParent()
      this.disposeMats(poi)
    }
    this.pois = []
    for (const village of this.villages) {
      village.removeFromParent()
      this.disposeMats(village)
    }
    this.villages = []
    while (this.planetMeshes.length < uni.planets.length) {
      const mesh = buildPlanet('small')
      this.mapRoot.add(mesh)
      this.planetMeshes.push(mesh)
    }
    for (const mesh of this.planetMeshes) mesh.visible = false
    this.planets = uni.planets.map((def, i) => {
      const mesh = this.planetMeshes[i]
      mesh.visible = true
      mesh.position.set(def.x, def.y, def.z)
      mesh.rotation.set(0, 0, 0)
      mesh.scale.setScalar(def.radius)
      paintPlanet(mesh, def.kind, def.color, Boolean(def.rings), Boolean(def.heat))
      if (def.landable !== false || def.heat || def.radius > 50) {
        const sphere = mesh.children[0] as Mesh
        sphere.geometry.dispose()
        const fine = def.radius > 200 ? 64 : def.radius > 70 ? 40 : 24
        sphere.geometry = new SphereGeometry(1, fine, Math.round(fine * 0.62))
      }
      if (def.landable !== false) this.scatterPois(def, mesh)
      // Her yabani gezegende yerli kampı: yörüngeden görünür, gemiden vurulabilir.
      const village = def.village || (def.landable !== false && !def.heat && !def.home) ? this.buildVillage(def, mesh) : null
      const flat = Math.hypot(def.x, def.z)
      // İhtişamlı yüzey: prosedürel malzeme, atmosfer, bulut, halka ve büyük yapılar.
      const look = planetLook(def, this.universeId)
      const seed = (i + 1) * 13 + this.universeId.length * 7
      for (const name of ['features', 'deposits']) {
        const old = mesh.getObjectByName(name)
        if (old) {
          old.removeFromParent()
          this.disposeMats(old as THREEGroup)
        }
      }
      dressPlanet(mesh, mesh.children[0] as Mesh, look, seed)
      const features = scatterFeatures(mesh, def, look, seed)
      const deposits = scatterDeposits(mesh, def, look, seed, this.mined)
      return { def, pos: mesh.position, mesh, village, anchor: new Vector3(def.x, def.y, def.z), rate: 0.32 / Math.max(48, flat), spin: this.clockT * this.spinRateOf(def.radius), spinRate: this.spinRateOf(def.radius), features, look, deposits }
    })
    this.footPlanet = null
    if (this.layer === 'foot') this.layer = 'ship'
    this.seedBotColonies()
    this.attachColonies()
  }

  private scatterPois(def: PlanetDef, mesh: Group) {
    const kinds = ['hut', 'plant', 'rock'] as const
    for (let i = 0; i < 8; i++) {
      const y = 1 - ((i + 0.5) / 8) * 2
      const ring = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * Math.PI * (3 - Math.sqrt(5))
      const up = new Vector3(Math.cos(phi) * ring, y, Math.sin(phi) * ring).normalize()
      const poi = buildPoi(kinds[i % 3], def.color)
      const tangent = new Vector3(0, 1, 0).cross(up)
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
      tangent.normalize()
      const bit = new Vector3().crossVectors(tangent, up).normalize()
      poi.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(tangent, up, bit))
      const lift = kinds[i % 3] === 'hut' ? 0.2 : 0
      poi.position.copy(up).multiplyScalar(1 + lift / def.radius)
      poi.scale.setScalar(Math.max(1, def.radius / 30) / def.radius)
      mesh.add(poi)
      this.pois.push(poi)
    }
  }

  private clearLocals() {
    for (const local of this.locals) {
      this.mapRoot.remove(local.root)
      this.disposeMats(local.root)
    }
    this.locals = []
  }

  /** Gezegenin inilebilir menzili. Gemi yüzeye `yarıçap + 2,5`'ten yakına giremez; o yüzden alt sınır yok. */
  private landReach(planet: Planet) {
    return Math.max(40, planet.def.radius * 0.35)
  }

  private cardT = 0

  /** Gezegen bilgi kartı: gemideyken bir gezegene yaklaşınca yataklar, yerliler ve düşman savunması. */
  private paintPlanetCard(dt: number) {
    this.cardT -= dt
    if (this.cardT > 0) return
    this.cardT = 0.5
    const el = document.getElementById('planet-card')
    if (!el) return
    let planet: Planet | null = null
    if (this.mode === 'map' && this.layer === 'ship') {
      let best = Infinity
      for (const p of this.planets) {
        if (p.def.landable === false || p.def.heat) continue
        const alt = this.pos.distanceTo(p.pos) - p.def.radius
        if (alt < Math.max(260, p.def.radius * 1.2) && alt < best) {
          best = alt
          planet = p
        }
      }
    }
    el.classList.toggle('hidden', !planet)
    if (!planet) {

      return
    }
    const ore = planet.deposits.filter((d) => d.left > 0 && d.kind === 'ore').length
    const cry = planet.deposits.filter((d) => d.left > 0 && d.kind === 'crystal').length
    const c = this.colonies[planet.def.id]
    const kind = planet.def.kind === 'small' ? 'hafif' : planet.def.kind === 'large' ? 'ağır' : 'orta'
    const rows = [`<b>${planet.def.name}</b> <span class="pc-sub">${kind} yerçekimi</span>`, `⛏ ${ore} maden yatağı · ◆ ${cry} kristal yatağı`]
    if (c && c.universe === this.universeId) {
      const aa = c.turrets.filter((t) => t.alive && t.kind === 'hava').length
      const ground = c.turrets.filter((t) => t.alive && t.kind !== 'hava').length
      if (this.mine(c)) {
        const plan = this.colonyPlan(c)
        rows.push(`<span class="pc-good">${c.kind === 'main' ? 'Ana üssün' : 'Kolonin'} · sv ${c.level}</span>`, `⚔ ${plan.soldiers} asker · ⛏ ${plan.workers} işçi · ◈ ${ground} kara · ✈ ${aa} hava`)
        rows.push('<span class="pc-sub">Shift+L: üssün yanına in</span>')
      } else {
        const pop = Math.floor(Math.min(c.pop, this.capOf(c)))
        rows.push(`<span class="pc-bad">${factionName(c.owner)} üssü · sv ${c.level}</span>`, `Savunma: ~${pop} asker · ◈ ${ground} kara · ✈ ${aa} hava taret`)
        rows.push(aa ? '<span class="pc-bad">Hava savunması var: inmeden önce yörüngeden vur.</span>' : '<span class="pc-sub">Hava savunması yok: ekibinle inebilirsin.</span>')
      }
    } else if (!planet.def.home) {
      const n = this.cleared.has(planet.def.id) ? 0 : this.nativesLeftOf(planet)
      rows.push(n > 0 ? `<span class="pc-bad">Yerliler: ${n}</span> · yen, sonra B ile karakol kur` : '<span class="pc-good">Boş: karakol kurulabilir</span>')
    }
    const lost = this.stranded.filter((x) => x.planetId === planet?.def.id && x.universe === this.universeId).reduce((a, x) => a + x.crew.length, 0)
    if (lost) rows.push(`<span class="pc-bad">⚑ ${lost} mahsur ekip üyesi: in ve kurtar</span>`)
    el.innerHTML = rows.join('<br>')
  }

  private nearestLandable() {
    let best: Planet | null = null
    let bestAlt = Infinity
    for (const planet of this.planets) {
      if (planet.def.landable === false || planet.def.heat) continue
      const alt = this.pos.distanceTo(planet.pos) - planet.def.radius
      if (alt < this.landReach(planet) && alt < bestAlt) {
        best = planet
        bestAlt = alt
      }
    }
    return best
  }

  /** İniş olmadığında neden olmadığını söyler: yıldız mı, yoksa ne kadar uzak. */
  private landMiss() {
    let near: Planet | null = null
    let nearAlt = Infinity
    for (const planet of this.planets) {
      const alt = this.pos.distanceTo(planet.pos) - planet.def.radius
      if (alt < nearAlt) {
        near = planet
        nearAlt = alt
      }
    }
    if (!near) return 'İnecek kadar yakın gezegen yok.'
    if (near.def.heat || near.def.landable === false) return `${near.def.name} bir yıldız; inilmez.`
    const left = nearAlt - this.landReach(near)
    if (left < 2000) return `${near.def.name} yüzeyine ${fmt(Math.ceil(left))} birim daha yaklaş.`
    return 'İnecek kadar yakın gezegen yok.'
  }

  /** Açık uzayda gemi daha hızlı seyreder; savaşta ve gövdelerin yakınında eski sınır geçerli. */
  /** Sistemin kenarı: dışa doğru hız sönümlenir, gemi yavaşça merkeze döner. Eskiden yay gibi geri çekiyordu;
   * burun dışarı bakarken gemi geri geri uçuyor, oyuncu ileri bastıkça sınırda takılıp kalıyordu. */
  private edgeReturn(dt: number) {
    const r = this.pos.length()
    vA.copy(this.pos).multiplyScalar(-1 / r) // merkeze doğru
    const outward = -this.vel.dot(vA)
    if (outward > 0) this.vel.addScaledVector(vA, outward * (1 - Math.exp(-3 * dt)))
    this.vel.addScaledVector(vA, 24 * dt)
    quatFromForward(qB, vA)
    this.quat.slerp(qB, 1 - Math.exp(-1.4 * dt))
    const hard = this.mapLimit + 400
    if (r > hard) this.pos.multiplyScalar(hard / r)
    if (this.edgeToastCd <= 0) {
      this.edgeToastCd = 8
      this.toast('Sistemin kenarı. Gemi merkeze dönüyor — kapılar haritada (sağ alt).')
    }
  }

  /** Irkın açık uzay seyir hızı (motor geliştirmesiyle biraz artar). */
  private openCap() {
    return cruiseSpeed(this.originId) * (1 + 0.05 * (this.up.engine - 1))
  }

  /** Açık uzayda ırkın seyir hızına çıkılır; savaşta ve gövdelerin yakınında daha düşük sınır geçerli. */
  private speedCap() {
    const open = this.openCap()
    const near = Math.min(CRUISE_CAP, open * 0.85)
    if (this.fighting() || this.layer !== 'ship') return near
    let clear = Infinity
    for (const planet of this.planets) clear = Math.min(clear, this.pos.distanceTo(planet.pos) - planet.def.radius * (planet.def.rings ? 1.7 : 1))
    for (const hole of this.holes) clear = Math.min(clear, this.pos.distanceTo(hole.pos) - (hole.kind === 'hole' ? hole.rs * 6 : 60))
    const k = clamp((clear - 260) / 700, 0, 1)
    return lerp(near, open, k)
  }


  private toggleSurface() {
    if (this.layer === 'foot') this.board()
    else this.land()
  }

  /** İnerken süren savaş askıya alınır: düşman gemileri yere inmez, yörüngede bekler; kalkınca yeniden saldırır. */
  private stashSkirmish(planet: Planet, up: Vector3) {
    const left = this.enemies.filter((e) => e.alive)
    this.clearShots()
    if (!this.enemies.length) return
    const small = left.length > 0 && left.every((e) => e.small)
    const threat = Math.max(0, ...left.map((e) => e.threat))
    this.clearCombat()
    this.skirmish = false
    if (!left.length) return
    const at = planet.pos.clone().addScaledVector(up, planet.def.radius + 160)
    const fleet = this.spawnFleet(left.length, threat, at, 'search')
    fleet.small = small
    fleet.lastKnown.copy(at)
    fleet.searchLeft = 45
    fleet.around = planet
    fleet.offset = at.clone().sub(planet.pos)
    fleet.stashed = true
    // Yarıda kalan çatışma sürer: yeniden diyalog açılmaz.
    fleet.talked = true
    if (small) this.homePatrols++
  }

  /** Filoların kovaladığı nokta: yayayken yüzey değil, oyuncunun üstündeki yörünge. */
  private fleetAim() {
    if (this.layer === 'foot' && this.footPlanet) {
      const center = this.footPlanet.pos
      return this.fleetAimPos.copy(this.pos).sub(center).setLength(this.footPlanet.def.radius + 160).add(center)
    }
    return this.pos
  }

  /** İniş: geminin altındaki noktaya iner. Kendi üssüne ~150 birimden yakınsan ya da `toBase` (Shift+L)
   * ise üssün yanına iner; düşman üssünün dibine inmezsin (45 birim ötesi). */
  baseLandId: string | null = null
  private land(toBase = false) {
    const planet = this.nearestLandable()
    if (planet && this.baseLandId === planet.def.id) {
      toBase = true
      this.baseLandId = null
    }
    if (!planet || this.mode !== 'map') {
      this.toast(this.mode === 'map' ? this.landMiss() : 'İnecek kadar yakın gezegen yok.')
      return false
    }
    vA.copy(this.pos).sub(planet.pos).normalize()
    // Üssü olan gezegende iniş noktası üssün yanı: kendi üssünde 18 birim, düşman üssünde 45 birim ötesi.
    const landC = this.colonies[planet.def.id]
    if (landC && landC.universe === this.universeId) {
      const R = planet.def.radius
      const core = this.worldDir(landC.dir, planet, vD)
      const own = this.mine(landC)
      const gap = this.arc(core, vA, R)
      if (own && (toBase || gap < 150) && gap > 18) {
        vE.copy(vA)
        vA.copy(core)
        this.slideToward(vA, vE, 18, R)
      } else if (!own && gap > 45 && gap < 150) {
        // Yakındaki düşman üssü: baskın için 45 birim ötesine in (ekip hemen hücum edebilsin).
        vE.copy(vA)
        vA.copy(core)
        this.slideToward(vA, vE, 45, R)
      } else if (!own && gap < 45) {
        if (gap < 0.5) this.offsetDir(core, 0.6, 45, R, vA)
        else this.slideAway(vA, core, 45 - gap, R)
      } else if (gap < 14) {
        // Tam çekirdeğin üstüne inme: yanına (meydanın kenarına) in.
        if (gap < 0.5) this.offsetDir(core, 0.6, 14, R, vA)
        else this.slideAway(vA, core, 14 - gap, R)
      }
    }
    vB.crossVectors(WORLD_UP, vA)
    if (vB.lengthSq() < 1e-4) vB.set(1, 0, 0)
    vB.normalize()
    vC.crossVectors(vA, vB).normalize()
    // Gemi yere yatık park eder: gövdesi yüzeye değer, burnu yüzeye paralel (dik durup havada asılı kalmaz).
    vD.copy(vA).multiplyScalar(planet.def.radius).addScaledVector(vC, 7).normalize()
    this.parkedShip.copy(planet.pos).addScaledVector(vD, planet.def.radius + 0.75)
    this.parkOffset.copy(this.parkedShip).sub(planet.pos)
    this.footCenter.copy(planet.pos)
    this.visual.root.position.copy(this.parkedShip)
    this.stashSkirmish(planet, vA)
    vE.copy(vB).addScaledVector(vD, -vB.dot(vD)).normalize() // burun yönü (teğet)
    vF.crossVectors(vD, vE.clone().negate()).normalize() // sağ = yukarı × arka
    basis.makeBasis(vF, vD, vE.clone().negate())
    this.visual.root.quaternion.setFromRotationMatrix(basis)
    quatFromForward(this.quat, vA)
    this.pos.copy(planet.pos).addScaledVector(vA, planet.def.radius + 1.08)
    this.vel.set(0, 0, 0)
    this.footAlt = 1.08
    this.footVel = 0
    this.footSpeed = 0
    this.grounded = true
    this.footForward.copy(vB)
    this.footView.copy(vB)
    this.orbitYaw = 0
    this.orbitPitch = 0
    this.layer = 'foot'
    this.footPlanet = planet
    this.spawnLocals(planet)
    this.snapCamera = true
    if (planet.def.home && this.isHome()) {
      this.hull = this.hullMax
      this.shield = this.shieldMax
      this.powerT = 18
      this.toast(`${planet.def.name}. Evindesin — iyileştin, kısa süre daha sertsin.`)
    } else if (planet.def.lore) this.toast(planet.def.lore)
    else this.toast(planet.def.kind === 'small' ? `${planet.def.name}. Hafif — zıplama yükselir, havada süzülürsün.` : `${planet.def.name}. Ağır — adım yavaş, zıplama alçak.`)
    if (this.colonyHere(planet)) this.onLandColony(planet)
    else this.clearGround()
    this.disembark(planet)
    this.rescueStranded(planet)
    this.discover(planet)
    this.mirrorRun()
    return true
  }

  private board() {
    if (!this.footPlanet || this.mode !== 'map') return false
    if (this.pos.distanceTo(this.parkedShip) > 18) {
      this.toast('Gemi uzakta. Yürüyerek dön.')
      return false
    }
    vA.copy(this.parkedShip).sub(this.footPlanet.pos).normalize()
    const all = this.units.filter((u) => u.alive && u.squad)
    // Biniş: seçim yapıldıysa onlar, yoksa en iyiler (gemi kapasitesi kadar). Kalanlar garnizon olur.
    const picked = this.boardPick ? all.filter((u) => this.boardPick?.has(u)) : this.bestCrew(all).slice(0, this.crewCap())
    this.boardPick = null
    const crew = picked.slice(0, this.crewCap())
    const stay = all.filter((u) => !crew.includes(u))
    if (stay.length) this.leaveGarrison(stay, this.footPlanet)
    this.squad = crew.map((u) => ({ kind: u.kind as SettlerKind, hull: u.hull, hullMax: u.hullMax }))
    for (const u of stay) u.alive = false
    this.onBoardColony()
    this.clearLocals()
    this.pos.copy(this.parkedShip).addScaledVector(vA, 8)
    this.vel.copy(vA).multiplyScalar(12)
    quatFromForward(this.quat, vA)
    this.visual.root.position.copy(this.pos)
    this.visual.root.quaternion.copy(this.quat)
    this.layer = 'ship'
    // Yörüngede bekleyen filo kalkışını görür ve yeniden saldırır.
    for (const fleet of this.fleets) {
      if (!fleet.stashed) continue
      fleet.stashed = false
      fleet.around = undefined
      fleet.state = 'hunt'
      fleet.lastKnown.copy(this.pos)
    }
    this.footPlanet = null
    this.walker.visible = false
    this.snapCamera = true
    this.buildEscorts()
    this.toast(this.squad.length ? `Kalktın. Ekibin (${this.squad.length}) eşlik gemilerinde.` : 'Kalktın.')
    this.mirrorRun()
    return true
  }

  boardPick: Set<Unit> | null = null

  /** Gemi + eşlik gemilerinin taşıyabileceği ekip (gövde geliştirmesiyle artar). */
  crewCap() {
    return 10 + (this.up.hull - 1)
  }

  /** En iyiler: komutan, sonra ana karakterler, sonra canı yüksek olanlar. */
  private bestCrew(list: Unit[]) {
    const rank = (u: Unit) => (u.kind === 'commander' ? 3 : isHero(u.kind) ? 2 : 1) * 1000 + u.hull
    return list.slice().sort((a, b) => rank(b) - rank(a))
  }

  /** Binmeyenler: kendi üssündeysen o üssün halkına katılır; değilse olduğu yerde garnizon kurar (sonra gelip alırsın). */
  private leaveGarrison(stay: Unit[], planet: Planet) {
    const c = this.colonyHere(planet)
    if (c && this.mine(c)) {
      c.pop = Math.min(this.capOf(c) + stay.length, c.pop + stay.length)
      if (stay.some((u) => isHero(u.kind))) c.trained = Math.min(trainCap(c.level), (c.trained ?? 0) + stay.filter((u) => isHero(u.kind)).length)
      this.toast(`${stay.length} kişi ${planet.def.name} garnizonunda kaldı.`)
      return
    }
    const dir = this.toLocal(vO1.copy(this.pos).sub(planet.pos).normalize(), planet, new Vector3())
    this.stranded.push({ planetId: planet.def.id, universe: this.universeId, dir, crew: stay.map((u) => ({ kind: u.kind as SettlerKind, hull: u.hull, hullMax: u.hullMax })) })
    this.toast(`${stay.length} kişi ${planet.def.name}'da bekliyor; inince yeniden katılırlar.`)
  }

  /** Biniş seçimi ekranı (Shift+L / dokunmatikte uzun "Bin" yerine Emir panelinden). */
  openBoarding() {
    if (!this.footPlanet || this.mode !== 'map') return false
    if (this.pos.distanceTo(this.parkedShip) > 18) {
      this.toast('Gemi uzakta. Yürüyerek dön.')
      return false
    }
    const all = this.bestCrew(this.units.filter((u) => u.alive && u.squad))
    if (!all.length) return this.board()
    const pick = new Set(all.slice(0, this.crewCap()))
    const box = must<HTMLElement>('board-list')
    const paint = () => {
      box.innerHTML = ''
      for (const u of all) {
        const l = document.createElement('label')
        if (u.kind === 'commander') l.className = 'cmd'
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.checked = pick.has(u)
        cb.addEventListener('change', () => {
          if (cb.checked) pick.add(u)
          else pick.delete(u)
          paint()
        })
        const name = document.createElement('b')
        name.textContent = this.unitLabel(u)
        const hp = document.createElement('span')
        hp.textContent = `${Math.round(u.hull)}/${u.hullMax}`
        l.append(cb, name, hp)
        box.append(l)
      }
      this.domSet('board-cap', `Kapasite: ${pick.size}/${this.crewCap()} (gövde geliştirmesi artırır)`)
      const c = this.colonyHere(this.footPlanet)
      this.domSet('board-left', all.length - pick.size > 0 ? `Binmeyen ${all.length - pick.size} kişi ${c && this.mine(c) ? 'bu üssün garnizonuna katılır' : 'burada bekler; inince seni bulur'}.` : 'Herkes biniyor.')
      must<HTMLButtonElement>('board-go').disabled = pick.size > this.crewCap()
    }
    must<HTMLButtonElement>('board-best').onclick = () => {
      pick.clear()
      for (const u of all.slice(0, this.crewCap())) pick.add(u)
      paint()
    }
    must<HTMLButtonElement>('board-all').onclick = () => {
      pick.clear()
      for (const u of all.slice(0, this.crewCap())) pick.add(u)
      paint()
    }
    must<HTMLButtonElement>('board-go').onclick = () => {
      must<HTMLElement>('boarding').classList.add('hidden')
      this.boardPick = new Set(pick)
      this.board()
    }
    must<HTMLButtonElement>('board-x').onclick = () => must<HTMLElement>('boarding').classList.add('hidden')
    paint()
    this.input.exitLock()
    must<HTMLElement>('boarding').classList.remove('hidden')
    return true
  }

  private spawnLocals(planet: Planet) {
    this.clearLocals()
    // Yerliler yok edildiyse ya da gezegende bir üs varsa yeniden doğmaz.
    if (this.cleared.has(planet.def.id) || this.colonyHere(planet)) return
    vA.copy(this.pos).sub(planet.pos).normalize()
    const look = nativeLook(planet.def)
    const friendly = look.id === originLook(this.originId).id
    // Kalan yerli sayısı kalıcıdır: inip kalkınca yenilenmez.
    const count = friendly ? 4 : this.nativesLeftOf(planet)
    if (count <= 0) {
      this.cleared.add(planet.def.id)
      return
    }
    // Yerliler kamplarından gelir: yakın bir kulübe varsa oradan doğarlar.
    const huts = (planet.village?.userData.huts as Vector3[] | undefined) ?? []
    let camp: Vector3 | null = null
    let campGap = 70
    for (const h of huts) {
      const w = vB.copy(h).applyQuaternion(planet.mesh.quaternion)
      const gap = Math.acos(clamp(w.dot(vA), -1, 1)) * planet.def.radius
      if (gap < campGap && gap > 12) {
        campGap = gap
        camp = (camp ?? new Vector3()).copy(w)
      }
    }
    if (camp) vA.copy(camp)
    for (let i = 0; i < count; i++) {
      const rig = buildCreature(look)
      rig.root.scale.multiplyScalar(0.94 + (i % 3) * 0.06)
      const axis = new Vector3(1, 0, 0).cross(vA)
      if (axis.lengthSq() < 1e-4) axis.set(0, 0, 1)
      axis.normalize()
      // Uzaklık yay boyu (birim) olarak verilir; gezegen büyüse de yerliler yakında doğar.
      const ring = camp ? 2 + (i % 5) * 1.5 + Math.floor(i / 5) * 3 : 14 + (i % 5) * 5 + Math.floor(i / 5) * 9
      const home = vA.clone().applyAxisAngle(axis, ring / planet.def.radius).applyAxisAngle(vA, i * 1.3).normalize()
      rig.root.position.copy(planet.pos).addScaledVector(home, planet.def.radius + 1.05)
      this.mapRoot.add(rig.root)
      this.locals.push({ alive: true, root: rig.root, rig, home, axis, phase: i * 0.7, hull: 16, cool: 0.8, attack: 0, friendly })
    }
  }

  private updateFoot(dt: number) {
    const planet = this.footPlanet
    if (!planet) {
      this.layer = 'ship'
      return
    }
    // Gezegen yörüngede ilerler; yürüyen karakter ve park edilen gemi onunla birlikte gider.
    this.pos.add(vA.copy(planet.pos).sub(this.footCenter))
    this.footCenter.copy(planet.pos)
    this.parkedShip.copy(planet.pos).add(this.parkOffset)
    this.visual.root.position.copy(this.parkedShip)
    const trait = footTrait(this.originId)
    const center = planet.pos
    const radius = planet.def.radius
    vA.copy(this.pos).sub(center)
    if (vA.lengthSq() < 1) vA.set(0, 1, 0)
    vA.normalize()
    this.footForward.addScaledVector(vA, -this.footForward.dot(vA))
    if (this.footForward.lengthSq() < 1e-6) this.footForward.set(1, 0, 0)
    this.footForward.normalize()
    this.footView.addScaledVector(vA, -this.footView.dot(vA))
    if (this.footView.lengthSq() < 1e-6) this.footView.copy(this.footForward)
    this.footView.normalize()
    const axes = this.axes()
    const wish = Math.min(1, Math.hypot(axes.f, axes.s))
    // Sürükleme / fare: yürürken bakış yönünü çevirir; dururken kamerayı karakterin çevresinde döndürür.
    const look = -this.input.mouseX * 0.0022 * this.save.settings.sens
    // Dikey bakış daha az hassas (yatayın yarısı); küçük titremeler ölü bölgede yutulur.
    const rawUp = this.input.mouseY * 0.0011 * this.save.settings.sens * (this.save.settings.invert ? -1 : 1)
    const lookUp = Math.abs(this.input.mouseY) < 1.5 ? 0 : rawUp
    const orbiting = wish <= 0.08 && (this.touchy() || this.orbitKey())
    if (!orbiting) {
      if (look) this.footView.applyAxisAngle(vA, look)
      // Yukarı/aşağı bakış: gökyüzündeki saldırıyı görebilmek için kamera yukarı dönebilir.
      if (lookUp) {
        this.lookPitchT = clamp(this.lookPitchT - lookUp, FOOT_PITCH0 - 0.35, FOOT_PITCH0 + 1.05)
        this.pitchIdle = 0
      } else this.pitchIdle += dt
      // Yürürken bir süre dikey hareket yoksa bakış yavaşça ufka döner (oynanışı bozmaz).
      if (wish > 0.08 && this.pitchIdle > 1.6) this.lookPitchT += (FOOT_PITCH0 - this.lookPitchT) * (1 - Math.exp(-1.2 * dt))
      // Gerçek eğim hedefe yumuşakça yaklaşır: kayma ve sarsıntı olmaz.
      this.lookPitch += (this.lookPitchT - this.lookPitch) * (1 - Math.exp(-7 * dt))
      // Yürümeye başlayınca yörünge kamerası yumuşakça arkaya döner.
      this.orbitYaw *= Math.exp(-5 * dt)
      this.orbitPitch *= Math.exp(-5 * dt)
    } else {
      this.orbitYaw += look
      this.orbitPitch = clamp(this.orbitPitch + lookUp, -0.35, 0.9)
    }
    // Kamera-göreli hareket: ileri = bakış yönü, sağ = ekranın sağı.
    vB.crossVectors(this.footView, vA).normalize()
    // Ağır gezegende de yürüyüş sürünmeye dönmesin (taban ×0,75); havadayken yatay hız biraz düşer.
    const cap = 9.5 * Math.max(0.75, planet.def.move) * trait.speed * (this.grounded ? 1 : 0.75)
    const rate = planet.def.kind === 'large' ? 2.2 : 9
    this.footSpeed += ((wish > 0.08 ? cap : 0) - this.footSpeed) * (1 - Math.exp(-rate * dt))
    if (wish > 0.08) {
      vC.copy(this.footView).multiplyScalar(axes.f).addScaledVector(vB, axes.s)
      if (vC.lengthSq() > 1e-6) {
        vC.normalize()
        // Karakter gittiği yöne döner (yumuşak).
        const turn = Math.atan2(vF.crossVectors(this.footForward, vC).dot(vA), this.footForward.dot(vC))
        const maxTurn = 11 * dt
        this.footForward.applyAxisAngle(vA, clamp(turn, -maxTurn, maxTurn))
        // Dokunmatikte yana basınca kamera yavaşça arkaya geçer (geniş daire çizer).
        if (this.touchy() && axes.f > -0.2) {
          const side = Math.atan2(vF.crossVectors(this.footView, vC).dot(vA), this.footView.dot(vC))
          this.footView.applyAxisAngle(vA, clamp(side, -1, 1) * 1.6 * dt * Math.abs(axes.s))
        }
        if (this.footSpeed > 0.12) {
          vD.crossVectors(vA, vC).normalize()
          const angle = (this.footSpeed * dt) / radius
          vE.copy(this.pos).sub(center).applyAxisAngle(vD, angle)
          this.footForward.applyAxisAngle(vD, angle)
          this.footView.applyAxisAngle(vD, angle)
          this.pos.copy(center).add(vE)
          this.pushOutOfFeatures(planet, radius)
        }
      }
    }
    const jumpEdge = this.input.pressed('Space') || (this.input.touchJump && !this.jumpWas)
    this.jumpWas = this.input.touchJump
    if (this.jumpBuf > 0) {
      this.footVel = Math.min(11, this.jumpBuf)
      this.jumpBuf = 0
      this.grounded = false
    } else if (this.grounded && jumpEdge) {
      // Zıplama yüksekliği sınırlı: alçak yerçekiminde bile 3 sn'den uzun havada kalınmaz.
      this.footVel = Math.min(11, planet.def.jump * trait.jump)
      this.grounded = false
    }
    if (!this.grounded) this.footVel -= footGravity(planet.def.gravity) * (this.footAlt > 1.22 ? Math.max(0.85, planet.def.glide) : 1) * dt
    this.footAlt += this.footVel * dt
    if (this.footAlt <= 1.08) {
      this.footAlt = 1.08
      this.footVel = 0
      this.grounded = true
    } else this.grounded = false
    vA.copy(this.pos).sub(center)
    if (vA.lengthSq() < 1e-6) vA.set(0, 1, 0)
    vA.normalize()
    this.pos.copy(center).addScaledVector(vA, radius + this.footAlt)
    this.poseWalker()
    this.updateLocals(dt)
    this.tryPunch()
    this.updateGround(dt)
    this.punchCd = Math.max(0, this.punchCd - dt)
    this.powerT = Math.max(0, this.powerT - dt)
    if (this.hitCd <= 0) this.shield = Math.min(this.shieldMax, this.shield + this.regenRate() * dt)
    if (this.isHome()) this.hull = Math.min(this.hullMax, this.hull + 1.3 * dt)
    if (trait.regen > 0) this.hull = Math.min(this.hullMax, this.hull + trait.regen * dt)
  }

  private poseWalker() {
    const planet = this.footPlanet
    if (!planet) return
    vA.copy(this.pos).sub(planet.pos).normalize()
    this.footForward.addScaledVector(vA, -this.footForward.dot(vA))
    if (this.footForward.lengthSq() < 1e-6) this.footForward.set(1, 0, 0)
    this.footForward.normalize()
    vB.crossVectors(vA, this.footForward).normalize()
    basis.makeBasis(vB, vA, this.footForward)
    this.quat.setFromRotationMatrix(basis)
    this.walker.position.copy(this.pos)
    this.walker.quaternion.copy(this.quat)
    this.walker.visible = true
    this.punchT = Math.max(0, this.punchT - 0.016)
    const jumping = !this.grounded
    this.stepRig(this.walkerRig, jumping ? 0 : this.footSpeed, jumping, this.punchT)
  }

  lookPitch = FOOT_PITCH0
  lookPitchT = FOOT_PITCH0
  pitchIdle = 0
  private footCamera(dt: number) {
    vA.copy(this.pos).sub(this.footPlanet ? this.footPlanet.pos : this.pos).normalize()
    vB.copy(this.footView)
    if (this.orbitYaw) vB.applyAxisAngle(vA, this.orbitYaw)
    // Dikey telefonda karakter ekranı kaplamasın: kamera biraz daha geride ve yukarıda.
    const narrow = this.camera.aspect < 1
    const up = Math.max(0, this.lookPitch - FOOT_PITCH0)
    // Yukarı bakarken kamera hafifçe alçalır ve yaklaşır (az): görüntü kaymaz, yalnız bakış döner.
    const back = (narrow ? 7.8 : 5.4) * (1 - this.orbitPitch * 0.25) * (1 - up * 0.1)
    const lift = Math.max(0.9, (narrow ? 3.1 : 2.4) + this.orbitPitch * 3.2 - up * 0.5)
    vC.copy(this.pos).addScaledVector(vA, lift).addScaledVector(vB, -back)
    const k = this.snapCamera ? 1 : 1 - Math.exp(-8 * dt)
    this.camera.position.lerp(vC, k)
    vD.subVectors(this.camera.position, this.pos)
    if (vD.dot(vB) > -1.2) this.camera.position.copy(this.pos).addScaledVector(vB, -back).addScaledVector(vA, lift)
    this.camera.up.copy(vA) // yüzeyde yukarı = gezegenin normali; gezegenin yanında kamera yan yatmaz
    vE.copy(this.pos).addScaledVector(vA, 1.15).addScaledVector(vB, 0.4)
    const tilt = this.lookPitch - FOOT_PITCH0
    if (Math.abs(tilt) > 0.005) {
      // Bakış eğimi: karakterin omzunun üstünden yukarı (gökyüzü) ya da aşağı; varsayılandan sürekli döner.
      vF.subVectors(vE, this.camera.position).normalize()
      vG.crossVectors(vF, vA).normalize()
      vF.applyAxisAngle(vG, tilt)
      vE.copy(this.camera.position).addScaledVector(vF, 8)
    }
    this.camera.lookAt(vE)
    this.snapCamera = false
    const target = 64
    this.camera.fov += (target - this.camera.fov) * (1 - Math.exp(-6 * dt))
    this.camera.updateProjectionMatrix()
  }

  private updateLocals(dt: number) {
    const planet = this.footPlanet
    if (!planet) return
    vA.copy(this.pos).sub(planet.pos).normalize()
    for (const local of this.locals) {
      if (!local.alive) continue
      local.phase += dt
      local.cool = Math.max(0, local.cool - dt)
      const gap = Math.acos(clamp(local.home.dot(vA), -1, 1)) * planet.def.radius
      const peaceful = Boolean(planet.def.home && this.isHome()) || local.friendly
      // Düşman yerliler 40 birimden fark eder ve sabit hızla üstüne gelir (büyük gezegende de beklemezsin).
      if (!peaceful && gap < 40 && gap > 2.5) this.slideToward(local.home, vA, Math.min(gap - 2.4, 6.5 * dt), planet.def.radius)
      else if (gap < 9 && gap > 2.5) local.home.lerp(vA, 1 - Math.exp(-1.5 * dt)).normalize()
      if (!peaceful && gap < 3.1 && local.cool <= 0) {
        local.cool = 1.25
        local.attack = 0.35
        this.attackSound(local.rig, local.root.position)
        this.footHurt(this.isHome() ? 3 : 6)
      } else if (!peaceful && local.cool <= 0) {
        // Yerliler baskın ekibine de karşılık verir.
        for (const u of this.units) {
          if (!u.alive || !u.squad || this.arc(u.dir, local.home, planet.def.radius) > 3.1) continue
          local.cool = 1.4
          local.attack = 0.35
          this.attackSound(local.rig, local.root.position, 0.8)
          this.hitUnit(u, 4, local.home, planet, false, 'local', 'Yerli')
          break
        }
      }
      // Yerinde sallanma birim cinsinden: büyük gezegende yerli metrelerce kaymaz, yumruk ıskalamaz.
      vC.copy(local.home).applyAxisAngle(local.axis, (Math.sin(local.phase) * (local.rig.style === 'waddle' ? 1.2 : 0.5)) / planet.def.radius).normalize()
      local.root.position.copy(planet.pos).addScaledVector(vC, planet.def.radius + 1.05)
      const toward = vD.copy(vA).addScaledVector(vC, -vA.dot(vC))
      if (toward.lengthSq() > 1e-6) {
        toward.normalize()
        const right = vE.crossVectors(vC, toward)
        if (right.lengthSq() > 1e-6) {
          right.normalize()
          basis.makeBasis(right, vC, toward)
          local.root.quaternion.setFromRotationMatrix(basis)
        }
      }
      // Saldırı animasyonu vuruş anında başlar (local.cool sıfırlandığında); burada yalnız söner.
      local.attack = Math.max(0, local.attack - dt)
      const pace = local.rig.style === 'hop' ? 2.2 : local.rig.style === 'waddle' ? 1.1 : 1.6
      this.stepRig(local.rig, gap < (peaceful ? 9 : 40) ? pace : 0.4, false, local.attack)
    }
  }

  private tryPunch() {
    const planet = this.footPlanet
    const click = this.input.mouseDown && !this.clickWas
    this.clickWas = this.input.mouseDown
    // Geliştirme artık yumrukla değil, ayrı tuşla (U / E): gemi yanında düşmanla dövüşürken menü açılmaz.
    void click
    void this.hostileNear
    const want = this.input.pressed('KeyF') || this.input.mouseDown || this.input.touchPunch
    if (!want || this.punchCd > 0 || !planet) return
    this.punchCd = 0.4
    this.punchT = 0.36
    this.attackSound(this.walkerRig, this.pos, 1.2)
    const trait = footTrait(this.originId)
    const dmg = Math.round(12 * trait.punch * (this.powerT > 0 ? 1.5 : 1) * this.skillDmgMul(true))
    const reach = 3.6 * trait.reach
    vJ.copy(this.pos).sub(planet.pos).normalize()
    let landed = this.mineDeposit(planet)
    for (const local of this.locals) {
      if (!local.alive || local.friendly) continue
      vK.subVectors(local.root.position, this.pos)
      const dist = vK.length()
      if (dist > reach || dist < 0.001) continue
      if (this.footForward.dot(vK.multiplyScalar(1 / dist)) < 0.15) continue
      landed = true
      this.hitLocal(local, dmg, planet, undefined, 'player')
    }
    for (const u of this.units.slice()) {
      if (!u.alive || !this.hostileToPlayer(u.faction)) continue
      vK.subVectors(u.root.position, this.pos)
      const dist = vK.length()
      if (dist > reach + u.spec.radius || dist < 0.001) continue
      if (this.footForward.dot(vK.multiplyScalar(1 / dist)) < 0.1) continue
      landed = true
      this.hitUnit(u, dmg, vJ, planet, true, 'player')
    }
    // Düşman üssünün taretleri ve çekirdeği de yumrukla yıkılır.
    const c = this.colonyHere(planet)
    if (c && !this.mine(c)) {
      for (const t of c.turrets.slice()) {
        if (!t.alive) continue
        this.surfacePos(this.worldDir(t.dir, planet, vL), planet, 1, vK)
        vK.sub(this.pos)
        const dist = vK.length()
        if (dist > reach + TURRET_RADIUS || dist < 0.001) continue
        if (this.footForward.dot(vK.multiplyScalar(1 / dist)) < 0.1) continue
        landed = true
        t.hull -= dmg
        this.besiege(c.planetId)
        this.surfacePos(vL, planet, 1.6, vM)
        this.impact(vM, dmg, null, 0xffb15a, vL, 'player')
        if (t.hull <= 0) this.destroyTurret(c, t, planet)
      }
      this.surfacePos(this.worldDir(c.dir, planet, vL), planet, 1, vK)
      vK.sub(this.pos)
      const dist = vK.length()
      if (dist < reach + CORE_RADIUS && dist > 0.001 && this.footForward.dot(vK.multiplyScalar(1 / dist)) > 0.1) {
        landed = true
        c.hull -= dmg
        this.surfacePos(vL, planet, 2.4, vM)
        this.impact(vM, dmg, null, 0xffe2b0, vL, 'player')
        if (c.hull <= 0) {
          this.baseLost(c, planet, null)
          this.swing.play(true)
          return
        }
      }
    }
    this.swing.play(landed)
    this.audio.punch(landed)
  }

  private bookmark() {
    let slot = this.returns[this.universeId]
    if (!slot) {
      slot = { pos: new Vector3(), vel: new Vector3(), quat: new Quaternion() }
      this.returns[this.universeId] = slot
    }
    slot.pos.copy(this.pos)
    slot.vel.copy(this.vel)
    slot.quat.copy(this.quat)
    for (const hole of this.holes) {
      if (hole.kind !== 'worm') continue
      if (slot.pos.distanceTo(hole.pos) < 42) {
        vA.copy(slot.pos).sub(hole.pos)
        if (vA.lengthSq() < 1) vA.set(0, 26, 52)
        vA.setLength(54)
        slot.pos.copy(hole.pos).add(vA)
      }
    }
    this.mirrorRun()
  }

  private escapeThroats() {
    for (const hole of this.holes) {
      if (hole.kind !== 'worm') continue
      if (this.pos.distanceTo(hole.pos) < 36) {
        vA.copy(this.pos).sub(hole.pos)
        if (vA.lengthSq() < 1) vA.set(0, 20, 48)
        vA.setLength(48)
        this.pos.copy(hole.pos).add(vA)
      }
    }
  }

  private mirrorRun() {
    this.saveGame()
    const returns: Record<string, { pos: number[]; vel: number[]; quat: number[] }> = {}
    for (const id of Object.keys(this.returns) as UniId[]) {
      const slot = this.returns[id]
      if (!slot) continue
      returns[id] = {
        pos: [slot.pos.x, slot.pos.y, slot.pos.z],
        vel: [slot.vel.x, slot.vel.y, slot.vel.z],
        quat: [slot.quat.x, slot.quat.y, slot.quat.z, slot.quat.w],
      }
    }
    writeRun({
      origin: this.originId,
      weapon: this.weapon,
      hull: this.hull,
      shield: this.shield,
      cd1: this.cd1,
      cd2: this.cd2,
      universe: this.universeId,
      returns,
    })
  }

  private openEnemyGate(e: Enemy) {
    const slot = this.enemyGates.find((gate) => !gate.alive)
    if (!slot) return
    const order: UniId[] = ['avlu', 'kizil', 'soluk', 'marskol', 'proxima', 'alpha', 'trappist', 'k218', 'kepler186', 'gliese', 'kepler452', 'gunes']
    const next = order[(order.indexOf(this.universeId) + 1) % order.length]
    vA.crossVectors(WORLD_UP, vB.subVectors(this.pos, e.pos).normalize())
    if (vA.lengthSq() < 1e-4) vA.set(1, 0, 0)
    vA.normalize()
    slot.owner = e
    slot.to = next
    slot.pos.copy(e.pos).addScaledVector(vA, 14)
    slot.life = 7
    slot.alive = true
    slot.brought = false
    slot.mesh.visible = true
    slot.mesh.position.copy(slot.pos)
    const label = slot.mesh.getObjectByName('label')
    if (label) paintLabel(label as Sprite, `→ ${UNIVERSES[slot.to].name}`)
    if (Math.random() < 0.55) this.bringThrough(slot)
    this.audio.warning()
  }

  private bringThrough(gate: Gate) {
    if (gate.brought) return
    gate.brought = true
    if (this.enemies.filter((e) => e.alive).length >= 8) return
    this.spawnMinion(gate.pos)
  }

  private spawnMinion(at: Vector3) {
    const visual = buildCuteAlien(1, 0.9)
    const e: Enemy = {
      root: visual.root,
      pos: at.clone().add(new Vector3(5, 1.5, 3)),
      vel: new Vector3(),
      quat: new Quaternion(),
      hullMax: 28,
      hull: 28,
      shieldMax: 8,
      shield: 8,
      cool: 1.2,
      strafe: 1,
      strafeT: 1,
      alive: true,
      threat: 1,
      stun: 0,
      flashT: 0,
      human: false,
      attack: 'bolt',
      giant: false,
      scale: 0.9,
      weak: null,
      bar: null,
      bodyFlash: () => {
        visual.bodyMat.emissiveIntensity = 1.6
      },
    }
    e.root.position.copy(e.pos)
    this.combatRoot.add(e.root)
    this.enemies.push(e)
  }

  private updateGates(dt: number) {
    for (const gate of this.enemyGates) {
      if (!gate.alive) continue
      gate.life -= dt
      gate.mesh.visible = gate.life > 0
      gate.mesh.position.copy(gate.pos)
      gate.mesh.rotation.y += dt * 0.8
      if (gate.life <= 0) {
        gate.alive = false
        gate.owner = null
        continue
      }
      const owner = gate.owner
      if (owner?.alive && owner.pos.distanceTo(gate.pos) < 11) {
        this.bringThrough(gate)
        owner.alive = false
        owner.root.visible = false
        gate.owner = null
        if (this.skirmish && this.enemies.every((e) => !e.alive)) this.winCombat()
      }
      if (this.pos.distanceTo(gate.pos) < 6.5 && this.transitionLock <= 0 && !this.fading) {
        this.transit(gate.to)
        return
      }
    }
  }

  /* ---------- Üs savunması, koloniler, türler ve yüzey dövüşü ---------- */

  private colonyHere(planet: Planet | null = this.footPlanet) {
    return planet ? (this.colonies[planet.def.id] ?? null) : null
  }

  private arc(a: Vector3, b: Vector3, radius: number) {
    return Math.acos(clamp(a.dot(b), -1, 1)) * radius
  }

  /** `dir` birim yönünü `from` yönünden uzağa, büyük daire boyunca `dist` kadar kaydırır. */
  private slideAway(dir: Vector3, from: Vector3, dist: number, radius: number) {
    vH.copy(dir).multiplyScalar(dir.dot(from)).sub(from)
    if (vH.lengthSq() < 1e-8) {
      vH.crossVectors(dir, AXIS_X)
      if (vH.lengthSq() < 1e-6) vH.crossVectors(dir, AXIS_Y)
    }
    vH.normalize()
    const phi = dist / radius
    dir.multiplyScalar(Math.cos(phi)).addScaledVector(vH, Math.sin(phi)).normalize()
  }

  /** `dir`'i `target` yönüne doğru büyük daire boyunca `dist` kadar ilerletir (aşmaz). */
  private slideToward(dir: Vector3, target: Vector3, dist: number, radius: number) {
    vH.copy(target).addScaledVector(dir, -dir.dot(target))
    if (vH.lengthSq() < 1e-10) return
    vH.normalize()
    const phi = Math.min(dist / radius, Math.acos(clamp(dir.dot(target), -1, 1)))
    dir.multiplyScalar(Math.cos(phi)).addScaledVector(vH, Math.sin(phi)).normalize()
  }

  private worldDir(local: Vector3, planet: Planet, out: Vector3) {
    return out.copy(local).applyQuaternion(planet.mesh.quaternion).normalize()
  }

  private surfacePos(dir: Vector3, planet: Planet, lift: number, out: Vector3) {
    return out.copy(planet.pos).addScaledVector(dir, planet.def.radius + lift)
  }

  private stand(obj: Group, dir: Vector3, radius: number, lift = 0) {
    obj.position.copy(dir).multiplyScalar(radius + lift)
    vH.copy(AXIS_Y).cross(dir)
    if (vH.lengthSq() < 1e-6) vH.set(1, 0, 0)
    vH.normalize()
    vI.crossVectors(vH, dir).normalize()
    obj.quaternion.setFromRotationMatrix(basis.makeBasis(vH, dir, vI))
  }

  private detachColony(c: Colony) {
    const planet = this.planets.find((p) => p.def.id === c.planetId)
    if (planet) for (const f of planet.features) if (f.obj.userData.hiddenBy === c.planetId) f.obj.visible = true
    if (c.root) {
      c.root.removeFromParent()
      this.disposeMats(c.root)
    }
    c.root = null
    c.core = null
    for (const t of c.turrets) {
      t.root = new Group()
      t.head = new Group()
    }
  }

  private clearColonies() {
    for (const c of Object.values(this.colonies)) this.detachColony(c)
    this.colonies = {}
    this.incomeAcc = 0
  }

  private buildTurretMesh(c: Colony, kind: TurretKind = 'kara', lvl = 1) {
    const look = originLook(c.owner)
    return buildTurret(look.form, look.body ?? 0x8a8f9c, kind, lvl)
  }

  private attachColony(c: Colony, planet: Planet) {
    this.detachColony(c)
    const R = planet.def.radius
    const root = new Group()
    root.scale.setScalar(1 / R)
    planet.mesh.add(root)
    c.root = root
    const core = this.buildCoreMesh(c, R)
    this.stand(core, c.dir, R)
    root.add(core)
    c.core = core
    core.userData.blocks = this.coreFootprint(core, R)
    {
      let ext = 0
      for (const b of core.userData.blocks as { dir: Vector3; r: number }[]) ext = Math.max(ext, this.arc(b.dir, c.dir, R) + b.r)
      core.userData.reach = ext + 4.5
    }
    // Üssün dibindeki büyük doğal yapıları gizle (anıt ve taretlerle çakışmasın).
    for (const f of planet.features) {
      const near = f.dir.angleTo(c.dir) < 26 / R + f.r
      f.obj.visible = !near
      f.obj.userData.hiddenBy = near ? c.planetId : undefined
    }
    for (const t of c.turrets) {
      const m = this.buildTurretMesh(c, t.kind ?? 'kara', t.lvl ?? 1)
      t.root = m.root
      t.head = m.head
      this.stand(t.root, t.dir, R)
      root.add(t.root)
    }
    this.buildDistrict(c, planet, root)
    this.pullDeposits(c, planet)
    // Üs kurulan gezegende yerli köyü (eski evler) görünmez: üs yerleşimin kendisi olur.
    if (planet.village) planet.village.visible = false
  }

  /** Üssün yakınında hep birkaç yatak olsun: en yakın yataklar uzaktaysa 25–45 birim ötesine taşınır
   *  (işçiler ve oyuncu kaynak için gezegenin öbür ucuna yürümesin). */
  private pullDeposits(c: Colony, planet: Planet) {
    const R = planet.def.radius
    const live = planet.deposits.filter((d) => d.left > 0)
    const near = live.filter((d) => this.arc(d.dir, c.dir, R) < 60).length
    if (near >= 3) return
    const far = live.filter((d) => this.arc(d.dir, c.dir, R) >= 60).sort((a, b) => this.arc(a.dir, c.dir, R) - this.arc(b.dir, c.dir, R))
    const want = Math.min(far.length, 4 - near)
    for (let i = 0; i < want; i++) {
      const d = far[i]
      const dist = Math.min(25 + i * 7, Math.PI * R * 0.45)
      this.offsetDir(c.dir, 1.9 + i * 1.57, dist, R, d.dir)
      d.obj.position.copy(d.dir).multiplyScalar(R - 0.2)
      vH.copy(AXIS_Y).cross(d.dir)
      if (vH.lengthSq() < 1e-6) vH.set(1, 0, 0)
      vH.normalize()
      vI.crossVectors(vH, d.dir).normalize()
      d.obj.quaternion.setFromRotationMatrix(basis.makeBasis(vH, d.dir, vI))
    }
  }

  /** Anıtın gerçek ayak izi: yere yakın her parçanın yatay sınırı bir engel dairesine dönüşür
   *  (ör. Dünya'nın cam kulesi çekirdekten uzağa taşıyor; eskiden içinden geçiliyordu). */
  private coreFootprint(core: Group, R: number) {
    core.updateMatrix()
    core.updateMatrixWorld(true)
    const inv = new Matrix4().copy(core.matrixWorld).invert()
    const rel = new Matrix4()
    const box = new Box3()
    const out: { dir: Vector3; r: number }[] = []
    core.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh || !m.geometry) return
      const mat = m.material as MeshBasicMaterial
      if (mat && mat.transparent && mat.opacity < 0.5) return
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
      rel.multiplyMatrices(inv, m.matrixWorld)
      box.copy(m.geometry.boundingBox as Box3).applyMatrix4(rel)
      if (box.min.y > 3.2 || box.max.y - box.min.y > 200) return
      if (box.max.y < 1.6) return // yassı zemin/meydan: üstünde yürünür
      const hx = (box.max.x - box.min.x) / 2
      const hz = (box.max.z - box.min.z) / 2
      const r = Math.max(hx, hz) * 0.92
      if (r < 0.5) return
      const cx = (box.max.x + box.min.x) / 2
      const cz = (box.max.z + box.min.z) / 2
      // Çekirdek yerel (x, z) → gezegen yerel yön.
      const p = new Vector3(cx, 0, cz).applyQuaternion(core.quaternion).add(core.position)
      out.push({ dir: p.normalize(), r })
    })
    out.sort((a, b) => b.r - a.r)
    void R
    return out.slice(0, 28)
  }

  /** Üssün yan yapıları: çekirdeğin çevresinde, ondan küçük. Seviye arttıkça çoğalır.
   *  Evler nüfus, kışla (sv2+) ekip sınırı, atölye (sv3+) parça indirimi, gözcü kulesi (sv4+) taret menzili. */
  static districtOf(level: number) {
    const out: { kind: 'ev' | 'kisla' | 'atolye' | 'gozcu'; name: string }[] = []
    const houses = Math.min(6, 1 + level)
    for (let i = 0; i < houses; i++) out.push({ kind: 'ev', name: 'Yaşam evi' })
    if (level >= 2) out.push({ kind: 'kisla', name: 'Kışla' })
    if (level >= 3) out.push({ kind: 'atolye', name: 'Atölye' })
    if (level >= 4) out.push({ kind: 'gozcu', name: 'Gözcü kulesi' })
    return out
  }

  private buildDistrict(c: Colony, planet: Planet, root: Group) {
    const R = planet.def.radius
    const list = Game.districtOf(c.level)
    const blocks: { dir: Vector3; r: number }[] = []
    root.userData.blocks = blocks
    const form = originLook(c.owner).form
    const tint = originLook(c.owner).body ?? 0x8a8f9c
    list.forEach((b, i) => {
      const bearing = (i / list.length) * Math.PI * 2 + 0.4
      const ring = b.kind === 'ev' ? 15 + (i % 2) * 3 : 13
      const dir = this.offsetDir(c.dir, bearing, ring, R, new Vector3())
      blocks.push({ dir, r: b.kind === 'ev' ? 2.2 : 2.6 })
      let g: Group
      if (b.kind === 'ev') {
        g = buildDwelling(form, tint, i)
        g.scale.setScalar(1.35)
      } else {
        g = new Group()
        const hall = buildDwelling(form, tint, i + 7)
        hall.scale.setScalar(1.6)
        g.add(hall)
        const neon = new MeshBasicMaterial({ color: new Color(b.kind === 'kisla' ? 0xff6a4a : b.kind === 'atolye' ? 0x6af0ff : 0xffd76a).multiplyScalar(1.6) })
        neon.toneMapped = false
        if (b.kind === 'kisla') {
          const pole = new Mesh(new CylinderGeometry(0.06, 0.06, 5, 6), new MeshStandardMaterial({ color: 0x3a3f48 }))
          pole.position.set(1.8, 2.5, 0)
          const flag = new Mesh(new BoxGeometry(1.2, 0.7, 0.04), neon)
          flag.position.set(2.4, 4.5, 0)
          g.add(pole, flag)
        } else if (b.kind === 'atolye') {
          const gear = new Mesh(new TorusGeometry(0.8, 0.14, 6, 12), neon)
          gear.position.set(0, 4.2, 0)
          gear.name = 'spin'
          g.add(gear)
        } else {
          const tower = new Mesh(new CylinderGeometry(0.3, 0.5, 7, 6), new MeshStandardMaterial({ color: 0x4a4f58, metalness: 0.4 }))
          tower.position.set(1.6, 3.5, 0)
          const lamp = new Mesh(new SphereGeometry(0.45, 10, 8), neon)
          lamp.position.set(1.6, 7.2, 0)
          g.add(tower, lamp)
        }
      }
      g.position.copy(dir).multiplyScalar(R - 0.2)
      vH.copy(AXIS_Y).cross(dir)
      if (vH.lengthSq() < 1e-6) vH.set(1, 0, 0)
      vH.normalize()
      vI.crossVectors(vH, dir).normalize()
      g.quaternion.setFromRotationMatrix(basis.makeBasis(vH, dir, vI))
      g.name = `bina-${b.kind}`
      root.add(g)
    })
  }

  private attachColonies() {
    for (const c of Object.values(this.colonies)) {
      if (c.universe !== this.universeId) continue
      const planet = this.planets.find((p) => p.def.id === c.planetId)
      if (planet) this.attachColony(c, planet)
    }
  }

  private addTurret(c: Colony, planet: Planet, localDir: Vector3, kind: TurretKind = 'kara', lvl = 1) {
    const m = this.buildTurretMesh(c, kind, lvl)
    const t: Turret = { dir: localDir.clone().normalize(), root: m.root, head: m.head, cool: 0.6, hull: Math.round(TURRET_HULL * turretLvlMul(lvl)), alive: true, kind, lvl }
    this.stand(t.root, t.dir, planet.def.radius)
    c.root?.add(t.root)
    c.turrets.push(t)
    return t
  }

  private toLocal(worldDir: Vector3, planet: Planet, out: Vector3) {
    return out.copy(worldDir).applyQuaternion(qB.copy(planet.mesh.quaternion).invert()).normalize()
  }

  /** Çekirdekle etkileşim mesafesi: anıtın gerçek ayak izinin kenarından ~4 birim (büyük anıtlarda içine girilemiyor). */
  private coreReach(c: Colony) {
    const r = c.core?.userData.reach as number | undefined
    return Math.max(CORE_REACH, r ?? 0)
  }

  private coreDistance(c: Colony, planet: Planet) {
    this.worldDir(c.dir, planet, vJ)
    vK.copy(this.pos).sub(planet.pos).normalize()
    return this.arc(vJ, vK, planet.def.radius)
  }

  private impact(at: Vector3, dmg: number, rig: Rig | null, hex: number, up: Vector3, by: HitBy = 'player') {
    const near = at.distanceTo(this.camera.position) < 30
    vM.copy(at).addScaledVector(up, 1.0)
    this.sparks.burst(vM, hex, by === 'player' ? 9 : 5, 8, 0.95, up)
    if (rig) this.flash.flash(rig.root, 0xffffff, 0.14)
    if (by !== 'player') {
      // Taret / birlik vuruşu: ekrana nişan karesi koyma, kamerayı sarsma; yakınsa küçük sayı ve kısık ses.
      if (near) {
        vL.copy(at).addScaledVector(up, 2.1)
        this.floatDamage(vL, dmg, 'hit soft', up)
        this.audio.hit(false, 0.35)
      }
      return
    }
    vL.copy(at).addScaledVector(up, 2.1)
    this.floatDamage(vL, dmg, 'hit', up)
    this.hitMark = 0.18
    this.trauma = Math.min(0.5, this.trauma + 0.06)
    this.audio.hit(false)
  }

  private footHurt(dmg: number) {
    const planet = this.footPlanet
    dmg = Math.max(1, Math.round(dmg * this.skillGuardMul()))
    this.hitCd = Math.max(this.hitCd, 1)
    this.hurtPlayer(dmg, true)
    this.hurtV = Math.max(this.hurtV, 0.55)
    this.trauma = Math.min(0.85, this.trauma + 0.25)
    if (planet) {
      vL.copy(this.pos).sub(planet.pos).normalize()
      vM.copy(this.pos).addScaledVector(vL, 2.3)
      this.floatDamage(vM, dmg, 'hurt', vL)
      vM.copy(this.pos).addScaledVector(vL, 1)
      this.sparks.burst(vM, 0xff6a4a, 8, 6, 0.9, vL)
    }
    this.flash.flash(this.walker, 0xff3a2a, 0.2)
    this.audio.hit(this.shield > 0)
  }

  private destroyTurret(c: Colony, t: Turret, planet: Planet) {
    t.alive = false
    this.surfacePos(this.worldDir(t.dir, planet, vJ), planet, 1.2, vM)
    this.sparks.burst(vM, 0xffa060, 16, 10, 1.3, vJ)
    this.spawnBoom(vM, 0.6, 0xffa060)
    t.root.removeFromParent()
    this.disposeMats(t.root)
    c.turrets = c.turrets.filter((x) => x !== t)
    this.audio.boom()
  }

  private paintCoreBar(c: Colony | null) {
    if (!c?.core) return
    const crystal = c.core.userData.crystal as Mesh | undefined
    if (crystal) crystal.rotation.y += 0.02
    spinLandmark(c.core, 1 / 60)
    // Seviye değiştiyse anıtı yeniden kur (büyür, yan yapılar eklenir).
    if (c.core.userData.level !== c.level) {
      const planet = this.planets.find((p) => p.def.id === c.planetId)
      if (planet) {
        this.attachColony(c, planet)
        return
      }
    }
    const bar = c.core.userData.bar as ReturnType<typeof buildBar> | undefined
    const last = c.core.userData.last as number
    const now = Math.round((c.hull / c.hullMax) * 100)
    if (bar && now !== last) {
      c.core.userData.last = now
      paintBar(bar.ctx, bar.tex, c.hull / c.hullMax, -1)
    }
  }

  private mine(c: Colony) {
    return c.owner === this.originId
  }

  private colonyCount() {
    return Object.values(this.colonies).filter((c) => this.mine(c) && c.founded).length
  }

  private colonyBonus() {
    return Math.min(0.6, this.colonyCount() * 0.1)
  }

  private hostileToPlayer(faction: string) {
    return faction !== this.originId && !friendly(this.rel[faction as OriginId])
  }

  /** Gezegenin yaşanabilirliği nüfus tavanını değiştirir: yeşil/okyanus dünyalar kalabalık, buz ve lav seyrek. */
  planetCapMul(planetId: string, system: UniId) {
    const def = UNIVERSES[system]?.planets.find((p) => p.id === planetId)
    if (!def) return 1
    const b = planetLook(def, system).biome
    const rich = b === 'earth' || b === 'ocean' || b === 'forest' ? 1.35 : b === 'ice' || b === 'lava' || b === 'dark' ? 0.8 : b === 'dwarf' ? 0.7 : 1
    const size = clamp(def.radius / (90 * PLANET_SIZE), 0.75, 1.3)
    return rich * size
  }

  capOf(c: Colony) {
    return Math.max(2, Math.round(settlerCap(c.level, c.turrets.length) * this.planetCapMul(c.planetId, c.universe)))
  }

  /** Eğitimdeki keşif gemisi komşu türden gelir (ilk solucan deliğinin arkasındaki ırk). */
  private scoutFaction(): OriginId {
    const home = homeSystem(this.originId)
    const to = UNIVERSES[home].holes.find((h) => h.kind === 'worm' && h.to)?.to as UniId | undefined
    const o = to ? ORIGINS.find((x) => homeSystem(x.id) === to) : undefined
    return o && o.id !== this.originId ? o.id : (ORIGINS.find((x) => x.id !== this.originId)?.id ?? 'mars')
  }

  /** Keşif gemisi yoksa (ya da kaçtıysa) birkaç saniye sonra ev sisteminde yenisi belirir. */
  private tickScout(dt: number) {
    if (this.universeId !== homeSystem(this.originId) || this.fleets.some((f) => f.scout) || this.scoutFight) return
    this.scoutT += dt
    if (this.scoutT < 3) return
    this.scoutT = 0
    this.spawnScout()
  }

  spawnScout() {
    // Oyuncudan ~260 birim ötede, gezegenlerin dışında yavaşça dolaşır.
    const at = new Vector3()
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2
      at.set(Math.cos(a), (Math.random() - 0.5) * 0.3, Math.sin(a)).multiplyScalar(260).add(this.pos)
      this.keepOutOfPlanets(at, 40)
      if (at.distanceTo(this.pos) > 200) break
    }
    const fleet = this.spawnFleet(1, 0.3, at, 'patrol')
    fleet.scout = true
    fleet.small = true
    fleet.faction = this.scoutFaction()
    fleet.orbit = 40
    fleet.center.copy(at)
    fleet.revealed = 12
    this.relOf(fleet.faction).known = true
    const who = factionName(fleet.faction)
    this.toast(`📡 Radar: ${who} keşif gemisi sisteminde dolaşıyor. Sessizce yaklaş ve vur!`)
    this.feed('📡', `${who} keşif gemisi radarda`, 'bad')
    this.audio.warning()
    return fleet
  }

  /** Birlikler hep gezegen yüzeyine dik durur: baktıkları yön korunur, "yukarı" yüzey normalidir.
   *  (Eskiden inişteki düzleme göre kalan yönelim yüzünden bazıları yan yatıyordu.) */
  private uprightUnits() {
    for (const u of this.units) {
      if (!u.alive) continue
      vO1.set(0, 0, 1).applyQuaternion(u.root.quaternion)
      vO1.addScaledVector(u.dir, -vO1.dot(u.dir))
      if (vO1.lengthSq() < 1e-6) {
        vO1.set(1, 0, 0).addScaledVector(u.dir, -u.dir.x)
        if (vO1.lengthSq() < 1e-6) vO1.set(0, 0, 1).addScaledVector(u.dir, -u.dir.z)
      }
      vO1.normalize()
      vO2.crossVectors(u.dir, vO1).normalize()
      basis.makeBasis(vO2, u.dir, vO1)
      u.root.quaternion.setFromRotationMatrix(basis)
    }
  }

  /** Etkin yetenekten gelen hasar çarpanı (Altın hale; Gölge adımında oyuncunun yumruğu). */
  skillDmgMul(player = false) {
    if (this.skillT <= 0) return 1
    const id = skillOf(this.originId).id
    if (id === 'halo') return 1.5
    if (id === 'shadow' && player) return 3
    return 1
  }

  skillGuardMul() {
    if (this.skillT <= 0) return 1
    const id = skillOf(this.originId).id
    return id === 'shell' ? 0.3 : id === 'halo' ? 0.7 : 1
  }

  /** Irk yeteneği: anlık alan etkisi ya da süreli güçlendirme. */
  private useSkill(planet: Planet) {
    const sk = skillOf(this.originId)
    if (this.skillCd > 0) {
      this.toast(`${sk.name} ${Math.ceil(this.skillCd)} sn sonra hazır.`)
      return
    }
    this.skillCd = sk.cd
    this.skillT = sk.dur
    const R = planet.def.radius
    const up = vFa.copy(this.pos).sub(planet.pos).normalize()
    this.audio.attackFx(sk.sound, 1.2)
    if (sk.id === 'quake' || sk.id === 'strike') this.audio.boom()
    this.audio.voice(this.originId, 'attack', 1.3)
    this.trauma = Math.min(0.9, this.trauma + (sk.id === 'quake' ? 0.7 : 0.25))
    if (sk.id === 'shadow') {
      // İleri ışınlan: yüzeyde bakılan yöne 10 birim.
      vFb.copy(up).addScaledVector(this.footForward, 0.5).normalize()
      this.slideToward(up, vFb, 10, R)
      this.pos.copy(planet.pos).addScaledVector(up, R + this.footAlt)
      this.sparks.burst(this.pos, sk.color, 12, 8, 1, up)
    }
    const myDir = vFa.copy(this.pos).sub(planet.pos).normalize()
    this.skillVisual(sk.id, planet, myDir.clone(), sk.color, sk.radius || 7, sk.dur)
    if (sk.radius > 0) {
      for (const u of this.units.slice()) {
        if (!u.alive || !this.hostileToPlayer(u.faction)) continue
        if (this.arc(u.dir, myDir, R) > sk.radius) continue
        if (sk.id === 'mind' || sk.id === 'roots') u.cool = Math.max(u.cool, sk.id === 'mind' ? 4 : 3)
        if (sk.id === 'roots') u.attack = 0
        if (sk.id === 'tide') this.slideAway(u.dir, myDir, 8, R)
        if (sk.dmg) this.hitUnit(u, sk.dmg, myDir, planet, true, 'player')
      }
      for (const l of this.locals) {
        if (!l.alive || l.friendly) continue
        if (this.arc(l.home, myDir, R) > sk.radius) continue
        if (sk.id === 'mind' || sk.id === 'roots') l.cool = Math.max(l.cool, 4)
        if (sk.id === 'tide') this.slideAway(l.home, myDir, 6, R)
        if (sk.dmg) this.hitLocal(l, sk.dmg, planet, myDir, 'player')
      }
    }
    if (sk.id === 'tide' || sk.id === 'roots') {
      this.hull = Math.min(this.hullMax, this.hull + this.hullMax * 0.25)
      this.shield = Math.min(this.shieldMax, this.shield + this.shieldMax * 0.4)
      for (const u of this.units) if (u.alive && (u.squad || (!u.invader && u.faction === this.originId))) u.hull = Math.min(u.hullMax, u.hull + u.hullMax * 0.4)
    }
    if (sk.id === 'strike') {
      // Üç ışın gökten iner.
      // Işınlar kameranın önüne değil karakterin önüne iner (kamerayı kör etmesin).
      vO1.crossVectors(myDir, this.footForward).normalize()
      for (let i = 0; i < 3; i++) {
        vFb.copy(myDir).addScaledVector(this.footForward, 7 / R).addScaledVector(vO1, ((i - 1) * 4.5) / R).normalize()
        this.surfacePos(vFb, planet, 0.5, vM)
        vL.copy(vM).addScaledVector(vFb, 60)
        this.tracers.fire(vL, vM, sk.color, 0.12, 0.35)
        this.sparks.burst(vM, sk.color, 8, 7, 1, vFb)
        const at = vM.clone()
        const up = vFb.clone()
        window.setTimeout(() => {
          this.fx.column(at, up, sk.color, 40, 1.2, 0.5)
          this.fx.explosion(at, 0xffa050, 1.6, up)
          this.audio.boom()
        }, 120 + i * 140)
      }
    }
    this.feed('✦', `${sk.name}${sk.dur ? ` (${sk.dur} sn)` : ''}`, 'good')
    this.questEvent('skill')
  }

  /** Irk yeteneklerinin görünümü: her biri kendi efekt dizisi (yarıklar, kubbe, sütun, kristal fırtınası...). */
  private skillVisual(id: string, planet: Planet, up: Vector3, color: number, radius: number, dur: number) {
    const at = this.surfacePos(up, planet, 0.2, new Vector3())
    const fx = this.fx
    switch (id) {
      case 'quake':
        // Golem yere vurur: yarıklar açılır, kayalar fırlar, toz bulutu yükselir, iki şok dalgası.
        this.punchT = 0.36
        this.jumpBuf = 6
        fx.cracks(at, up, 0xff5a1a, radius, 1.8)
        fx.debris(at, up, 0x3a2418, 18, 11, 1.4, 'rock')
        fx.debris(at, up, 0xff6a2a, 8, 9, 1.0, 'rock', true)
        fx.puff(at, 0x6a4a34, 12, 3.2, 1.8, up)
        fx.ring(at, up, 0xff7a3a, radius, 0.55, 0.1)
        window.setTimeout(() => fx.ring(at, up, 0xffb060, radius * 1.3, 0.7, 0.05), 180)
        break
      case 'strike':
        fx.ring(at, up, color, 6, 0.4)
        break
      case 'shell':
        fx.dome(this.pos, up, color, 3.4, dur)
        fx.ring(at, up, color, 5, 0.5)
        break
      case 'shadow':
        fx.puff(at, 0x1a0a14, 10, 2.2, 1.0, up)
        fx.puff(at, 0xff2a6a, 6, 1.4, 0.6, up, true)
        fx.ring(at, up, color, 6, 0.4)
        break
      case 'mind':
        fx.wave(this.pos, color, radius, 0.8)
        fx.ring(at, up, color, radius, 0.7)
        window.setTimeout(() => fx.ring(at, up, 0xffffff, radius * 0.7, 0.5, 0.04), 150)
        break
      case 'shards':
        fx.debris(this.pos.clone().addScaledVector(up, 1.2), up, color, 24, 12, 1.1, 'crystal', true)
        fx.ring(at, up, color, radius, 0.6)
        break
      case 'tide':
        fx.ring(at, up, 0x4ad8ff, radius, 0.7, 0.18)
        fx.wave(this.pos, 0x2a9aff, radius * 0.8, 0.6)
        fx.puff(at, 0x9ae8ff, 10, 2.4, 1.0, up, true)
        break
      case 'roots':
        fx.cracks(at, up, 0x7aff7a, radius, 2.4)
        fx.debris(at, up, 0x3a8a2a, 12, 5, 1.6, 'crystal')
        fx.ring(at, up, 0x7aff7a, radius, 0.8)
        break
      case 'halo':
        fx.column(at, up, 0xffd76a, 30, 2.2, 1.2)
        fx.dome(this.pos, up, 0xffd76a, 3.6, dur)
        fx.ring(at, up, 0xffe8a0, 10, 0.8)
        break
      default:
        this.skillFx(planet, color, radius)
    }
  }

  /** Yeteneğin yüzeyde genişleyen halkası. */
  private skillFx(planet: Planet, color: number, radius: number) {
    const up = vFb.copy(this.pos).sub(planet.pos).normalize()
    const mat = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false, blending: AdditiveBlending })
    const ring = new Mesh(new RingGeometry(0.93, 1, 64), mat)
    ring.position.copy(planet.pos).addScaledVector(up, planet.def.radius + 0.4)
    ring.lookAt(vL.copy(ring.position).add(up))
    this.scene.add(ring)
    const t0 = performance.now()
    const grow = () => {
      const k = (performance.now() - t0) / 600
      if (k >= 1 || !ring.parent) {
        ring.removeFromParent()
        ring.geometry.dispose()
        mat.dispose()
        return
      }
      ring.scale.setScalar(1 + k * radius)
      mat.opacity = 0.55 * (1 - k)
      requestAnimationFrame(grow)
    }
    requestAnimationFrame(grow)
  }

  /** Dizilim noktası: her birim sırayla bir tarete atanır; önünde (dışa doğru) ya da arkasında (çekirdeğe doğru) durur. */
  private formationGoal(u: Unit, c: Colony, planet: Planet, coreDir: Vector3, ord: ColonyOrder, out: Vector3) {
    const R = planet.def.radius
    const live = c.turrets.filter((t) => t.alive)
    const idx = (u.seq ?? 0) % Math.max(1, live.length || 6)
    const spread = (((u.seq ?? 0) / Math.max(1, live.length || 6)) | 0) % 3
    if (!live.length) {
      const ring = ord === 'on' ? 17 : 6
      this.offsetDir(coreDir, (idx / 6) * Math.PI * 2 + spread * 0.35, ring + spread * 1.5, R, out)
      return
    }
    const t = live[idx]
    const td = this.worldDir(t.dir, planet, vFa)
    const tc = this.arc(td, coreDir, R)
    if (ord === 'on') {
      out.copy(td)
      this.slideAway(out, coreDir, 5 + spread * 1.6, R)
    } else {
      out.copy(td)
      this.slideToward(out, coreDir, Math.min(tc - 2.5, 3 + spread * 1.2), R)
    }
    // Yan yana: aynı tarete düşenleri yana kaydır.
    if (spread) {
      vFb.crossVectors(out, coreDir)
      if (vFb.lengthSq() > 1e-8) out.addScaledVector(vFb.normalize(), ((spread % 2 ? 1 : -1) * 2.2) / R).normalize()
    }
  }

  private setColonyOrder(o: ColonyOrder) {
    const planet = this.footPlanet
    const c = this.colonyHere(planet)
    if (!planet || !c || !this.mine(c)) {
      this.toast('Dizilim emri için kendi üssünün gezegeninde ol.')
      return false
    }
    c.order = o
    for (const u of this.units) if (!u.invader && !u.squad && u.colonyId === c.planetId) u.goal = null
    const info = COLONY_ORDERS.find((x) => x.id === o)
    this.toast(`Üs birlikleri: ${info?.name}. ${info?.blurb ?? ''}`)
    this.audio.ui()
    this.questEvent('order')
    this.renderOrders()
    return true
  }

  private setSquadOrder(o: SquadOrder) {
    this.squadOrder = o
    if (o === 'bekle') this.squadHold = this.footPlanet ? this.pos.clone().sub(this.footPlanet.pos).normalize() : null
    else this.squadHold = null
    const info = SQUAD_ORDERS.find((x) => x.id === o)
    this.toast(`Ekip: ${info?.name}. ${info?.blurb ?? ''}`)
    this.audio.ui()
    this.questEvent('order')
    this.renderOrders()
  }

  private toggleOrders(force?: boolean) {
    this.orderOpen = force ?? !this.orderOpen
    this.dom.orders.classList.toggle('hidden', !this.orderOpen)
    if (this.orderOpen) this.input.exitLock()
    else if (!this.touchy() && this.mode === 'map') this.input.requestLock()
    if (this.orderOpen) this.renderOrders()
  }

  private renderOrders() {
    if (!this.orderOpen) return
    const c = this.colonyHere(this.footPlanet)
    const mineC = Boolean(c && this.mine(c))
    const box = this.dom.orderList
    box.innerHTML = ''
    const head1 = document.createElement('h4')
    head1.textContent = mineC ? `Üs birlikleri · ${c?.planetName}` : 'Üs birlikleri (kendi üssünde açılır)'
    box.append(head1)
    const row1 = document.createElement('div')
    row1.className = 'ord-row'
    COLONY_ORDERS.forEach((o, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'ord' + ((c?.order ?? 'serbest') === o.id && mineC ? ' on' : '')
      b.disabled = !mineC
      b.title = o.blurb
      b.innerHTML = `<b>${i + 1}</b>${o.name}`
      b.addEventListener('click', () => this.setColonyOrder(o.id))
      row1.append(b)
    })
    box.append(row1)
    const head2 = document.createElement('h4')
    head2.textContent = `Ekip (${this.squadSize()} kişi)`
    box.append(head2)
    const row2 = document.createElement('div')
    row2.className = 'ord-row'
    SQUAD_ORDERS.forEach((o, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'ord' + (this.squadOrder === o.id ? ' on' : '')
      b.title = o.blurb
      b.innerHTML = `<b>${i + 5}</b>${o.name}`
      b.addEventListener('click', () => this.setSquadOrder(o.id))
      row2.append(b)
    })
    box.append(row2)
    const tip = document.createElement('p')
    tip.className = 'ord-tip'
    tip.textContent = mineC ? COLONY_ORDERS.find((o) => o.id === (c?.order ?? 'serbest'))?.blurb ?? '' : 'Taret kur, sonra birliklerini önüne ya da arkasına diz.'
    box.append(tip)
    // Komuta: bütün kolonilerin; sayılar, tek tıkla duruş, kışla eğitimi, burada taret kurma.
    const head3 = document.createElement('h4')
    head3.textContent = 'Kolonilerin'
    box.append(head3)
    const help = document.createElement('p')
    help.className = 'ord-tip'
    help.textContent = 'Duruş, halkın ne kadarının işçi ne kadarının asker olacağını seçer. Ekonomi: işçiler yataklardan maden/kristal taşır. Savunma: askerler taret önüne dizilir, taretler %25 sert. Saldırı hazırlığı: kışla iki kat hızlı, ekip +2. ⚔ asker · ⛏ işçi · ◈ kara taret · ✈ hava taret.'
    box.append(help)
    const own = Object.values(this.colonies).filter((x): x is Colony => Boolean(x && this.mine(x)))
    own.sort((a, b) => Number(b.kind === 'main') - Number(a.kind === 'main'))
    for (const col of own) {
      const plan = this.colonyPlan(col)
      const aa = col.turrets.filter((t) => t.alive && t.kind === 'hava').length
      const ground = col.turrets.filter((t) => t.alive && t.kind !== 'hava').length
      const card = document.createElement('div')
      card.className = 'col-card' + (col === c ? ' here' : '')
      const title = document.createElement('div')
      title.className = 'col-title'
      title.innerHTML = `<b>${col.planetName}</b> <span>${col.kind === 'main' ? 'Ana üs' : 'Koloni'} · sv ${col.level} · ${UNIVERSES[col.universe].name}</span>`
      const counts = document.createElement('div')
      counts.className = 'col-counts'
      const train = col.trainQ ? ` · eğitimde ${col.trainQ} (${Math.ceil((col.trainT ?? 0) / (col.posture === 'saldiri' ? 2 : 1))} sn)` : ''
      counts.textContent = `⚔ ${plan.soldiers} asker (${plan.heroes} ana) · ⛏ ${plan.workers} işçi · ◈ ${ground} kara · ✈ ${aa} hava taret${train}`
      const posts = document.createElement('div')
      posts.className = 'ord-row'
      for (const pz of POSTURES) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'ord' + ((col.posture ?? 'ekonomi') === pz.id ? ' on' : '')
        b.title = pz.blurb
        b.textContent = pz.name
        b.addEventListener('click', () => this.setPosture(col, pz.id))
        posts.append(b)
      }
      const acts = document.createElement('div')
      acts.className = 'ord-row'
      const tb = document.createElement('button')
      tb.type = 'button'
      tb.className = 'ord'
      tb.disabled = col.level < 2
      tb.title = col.level < 2 ? 'Kışla üs seviye 2 ile açılır.' : `Kışla: ${this.costText(TRAIN_COST)}, ${TRAIN_TIME} sn (saldırı hazırlığında yarısı).`
      tb.textContent = `Asker eğit (${(col.trained ?? 0) + (col.trainQ ?? 0)}/${trainCap(col.level)})`
      tb.addEventListener('click', () => {
        this.trainSoldier(col)
        this.renderOrders()
      })
      acts.append(tb)
      const cb = document.createElement('button')
      cb.type = 'button'
      cb.className = 'ord'
      cb.disabled = col.level < 3
      cb.title = col.level < 3 ? 'Komutan üs seviye 3 ile açılır.' : `Komutan: ${this.costText(COMMANDER_COST)}, ${COMMANDER_TIME} sn. Ekibe +%25 hasar, yavaş iyileşme.`
      cb.textContent = (col.cmdT ?? 0) > 0 ? `Komutan yetişiyor (${Math.ceil(col.cmdT ?? 0)} sn)` : 'Komutan yetiştir'
      cb.addEventListener('click', () => {
        this.trainCommander(col)
        this.renderOrders()
      })
      acts.append(cb)
      if (col === c) {
        for (const [k, label] of [['kara', 'Kara taret kur'], ['hava', 'Hava taret kur']] as const) {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'ord'
          b.textContent = label
          b.title = k === 'hava' ? 'Gezegene yaklaşan gemileri vurur (Shift+T).' : 'Yerdeki saldırganları vurur (T).'
          b.addEventListener('click', () => {
            this.placeTurret(k)
            this.renderOrders()
          })
          acts.append(b)
        }
      }
      card.append(title, counts, posts, acts)
      box.append(card)
    }
    if (this.layer === 'foot' && this.units.some((u) => u.alive && u.squad)) {
      const bb = document.createElement('button')
      bb.type = 'button'
      bb.className = 'ord'
      bb.textContent = `Binecekleri seç (ekip ${this.squadSize()}, kapasite ${this.crewCap()}) · Shift+L`
      bb.addEventListener('click', () => {
        this.toggleOrders(false)
        this.openBoarding()
      })
      box.append(bb)
    }
    if (!own.length) {
      const p = document.createElement('p')
      p.className = 'ord-tip'
      p.textContent = 'Henüz kolonin yok.'
      box.append(p)
    }
  }

  private offsetDir(base: Vector3, bearing: number, dist: number, radius: number, out: Vector3) {
    vH.crossVectors(base, AXIS_Y)
    if (vH.lengthSq() < 1e-6) vH.crossVectors(base, AXIS_X)
    vH.normalize()
    vI.crossVectors(base, vH).normalize()
    const phi = dist / radius
    return out
      .copy(base)
      .multiplyScalar(Math.cos(phi))
      .addScaledVector(vH, Math.sin(phi) * Math.cos(bearing))
      .addScaledVector(vI, Math.sin(phi) * Math.sin(bearing))
      .normalize()
  }

  private clearGround() {
    for (const u of this.units) {
      this.flash.forget(u.root)
      this.mapRoot.remove(u.root)
      this.disposeMats(u.root)
    }
    this.units = []
    this.flash.clear()
    this.sparks?.clear()
    this.tracers?.clear()
  }

  private buildCoreMesh(c: Colony, R = 400) {
    const g = new Group()
    const tint = c.kind === 'main' ? 0xe4a15c : originLook(c.owner).body ?? 0x6fe0d0
    const steel = new MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.5, metalness: 0.45, emissive: 0x20242c, emissiveIntensity: 0.4 })
    const base = new Mesh(new CylinderGeometry(3.1, 3.6, 0.9, 20), steel)
    base.position.y = 0.45
    // Irka özel anıt: dağ kalesi, volkan, kristal küme, dünya ağacı... Seviye arttıkça büyür.
    const dome = buildLandmark(c.owner, c.level, tint)
    dome.position.y = 0.8
    // Meydan gezegenin eğrisine oturur: düz disk yerine küresel kapak + yere gömülen temel eteği
    // (küçük gezegende kenarları havada kalmaz, altı boş görünmez).
    {
      const flat = dome.getObjectByName('plaza') as Mesh | undefined
      const flatRim = dome.getObjectByName('plaza-rim') as Mesh | undefined
      if (flat) {
        flat.visible = false
        const mat = flat.material as MeshStandardMaterial
        const Rc = R + 0.45
        const th = Math.min(0.7, 11.5 / R)
        const cap = new Mesh(new SphereGeometry(Rc, 56, Math.max(3, Math.ceil(th * 40)), 0, Math.PI * 2, 0, th), mat)
        cap.position.y = -R
        cap.name = 'plaza-cap'
        const edgeR = Rc * Math.sin(th)
        const edgeY = Rc * Math.cos(th) - R
        const skirt = new Mesh(new CylinderGeometry(edgeR, edgeR * 0.97, 3.2, 56, 1, true), new MeshStandardMaterial({ color: mat.color.clone().multiplyScalar(0.6), roughness: 0.9, side: DoubleSide }))
        skirt.position.y = edgeY - 1.5
        skirt.name = 'plaza-skirt'
        g.add(cap, skirt)
        if (flatRim) {
          flatRim.visible = false
          const rim = new Mesh(new TorusGeometry(edgeR, 0.13, 6, 72), flatRim.material as MeshBasicMaterial)
          rim.rotation.x = Math.PI / 2
          rim.position.y = edgeY + 0.12
          g.add(rim)
        }
      }
      for (const o of dome.children) if (o.name === 'sat') o.position.y -= (8 * 8) / (2 * R) + 0.15
    }
    g.userData.level = c.level
    const crystalMat = new MeshBasicMaterial({ color: tint })
    crystalMat.color.multiplyScalar(1.8)
    crystalMat.toneMapped = false
    const crystal = new Mesh(new OctahedronGeometry(0.95), crystalMat)
    crystal.position.y = 1.6
    const ring = new Mesh(new TorusGeometry(2.9, 0.12, 6, 28), new MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.7 }))
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.95
    const pillarMat = new MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false })
    pillarMat.toneMapped = false
    const pillar = new Mesh(new CylinderGeometry(0.35, 0.35, 70, 8, 1, true), pillarMat)
    pillar.position.y = 36
    const bar = buildBar()
    // Sabit ekran boyutu: uzaktan da görünür, yakından HUD'u örtmez.
    ;(bar.sprite.material as SpriteMaterial).sizeAttenuation = false
    bar.sprite.scale.set(0.11, 0.024, 1)
    bar.sprite.position.y = 22 + c.level * 2.5
    paintBar(bar.ctx, bar.tex, c.hull / c.hullMax, -1)
    g.add(base, dome, crystal, ring, pillar, bar.sprite)
    g.userData.crystal = crystal
    g.userData.bar = bar
    g.userData.last = -1
    return g
  }

  private newColony(planet: { def: PlanetDef }, owner: OriginId, main: boolean, level: number, dir: Vector3, uid: UniId = this.universeId): Colony {
    const hullMax = coreHullMax(level)
    return {
      planetId: planet.def.id,
      planetName: planet.def.name,
      universe: uid,
      owner,
      pop: 1,
      settleT: 0,
      attacker: null,
      kind: main ? 'main' : 'colony',
      dir,
      level,
      hull: hullMax,
      hullMax,
      wave: 0,
      state: 'idle',
      countdown: FIRST_WAVE_DELAY,
      founded: main,
      early: false,
      queue: [],
      spawnT: 0,
      turrets: [],
      root: null,
      core: null,
      coreBar: null,
    }
  }

  private foundBase() {
    const planet = this.footPlanet
    if (!planet || this.mode !== 'map') return false
    const existing = this.colonyHere(planet)
    if (existing) {
      if (!this.mine(existing)) this.toast(`Bu gezegen ${factionName(existing.owner)} üssü. Çekirdeğine vurup yık (F).`)
      return false
    }
    if (planet.def.landable === false || planet.def.heat) return false
    const main = Boolean(planet.def.home && this.isHome())
    if (!main && !this.tutorialAt('outpost')) {
      this.toast('Koloni kurmayı eğitimin "Karakol kur" adımında öğreneceksin. Şimdilik görev kartındaki hedefi izle.')
      return false
    }
    const wild = this.locals.filter((l) => l.alive && !l.friendly).length
    if (!main && wild > 0) {
      this.toast(`Önce bu gezegenin yerlilerini yen: ${wild} kaldı. Baskın ekibi getirirsen daha kolay olur.`)
      return false
    }
    const cost = main ? BASE_COST_HOME : OUTPOST_COST
    if (this.energy < cost) {
      this.toast(`${main ? 'Üs' : 'Karakol'} için ${cost} enerji gerek. Elinde ${fmt(this.energy)} var.`)
      return false
    }
    const R = planet.def.radius
    vJ.copy(this.pos).sub(planet.pos).normalize()
    vK.copy(vJ)
    vL.copy(vJ).addScaledVector(this.footForward, 0.6).normalize()
    this.slideToward(vK, vL, 6.5, R)
    const local = this.toLocal(vK, planet, new Vector3())
    this.energy -= cost
    const colony = this.newColony(planet, this.originId, main, 1, local)
    // Yerliler zaten yenildi: kuşatma dalgası beklemeden koloni olur, halkın hemen yerleşir.
    colony.founded = true
    colony.pop = Math.max(colony.pop, Math.min(this.capOf(colony), 4))
    colony.countdown = main ? FIRST_WAVE_DELAY : this.waveGap(colony)
    this.colonies[planet.def.id] = colony
    this.attachColony(colony, planet)
    const joined = this.joinSquad(colony)
    vL.copy(vK)
    vM.copy(vK).addScaledVector(this.footForward, 0.6).normalize()
    this.slideToward(vL, vM, 6.5, R)
    this.addTurret(colony, planet, this.toLocal(vL, planet, new Vector3()))
    this.surfacePos(vK, planet, 2, vL)
    this.sparks.burst(vL, 0xffe2b0, 22, 10, 1.4, vK)
    this.audio.collect()
    this.toast(
      main
        ? `Üs kuruldu. ${FIRST_WAVE_DELAY} sn sonra ilk dalga. Seviye yükseldikçe ${originLook(this.originId).name} yerleşimciler çoğalır.`
        : joined
          ? `${planet.def.name} artık senin kolonin! Ekibin (${joined}) ve halkın buraya yerleşti. T ile taret ekle.`
          : `${planet.def.name} artık senin kolonin! Halkın yerleşti ve çoğalacak. T ile taret ekle, B ile büyüt.`,
    )
    this.mirrorRun()
    return true
  }

  private baseAction() {
    const planet = this.footPlanet
    if (!planet) return
    const c = this.colonyHere(planet)
    if (!c) {
      this.foundBase()
      return
    }
    if (!this.mine(c)) {
      this.toast(`${factionName(c.owner)} üssü. Çekirdeğine vurup yıkmadan senin olmaz.`)
      return
    }
    if (this.coreDistance(c, planet) > this.coreReach(c)) {
      this.toast('Çekirdeğe yaklaş.')
      return
    }
    if (c.hull < c.hullMax * 0.999) {
      if (this.energy < REPAIR_COST) {
        this.toast(`Onarım ${REPAIR_COST} enerji.`)
        return
      }
      this.energy -= REPAIR_COST
      c.hull = Math.min(c.hullMax, c.hull + c.hullMax * 0.35)
      this.audio.ui()
      this.toast('Çekirdek onarıldı.')
      return
    }
    if (c.level >= MAX_LEVEL) {
      this.toast('Üs zaten en üst seviyede.')
      return
    }
    const uc = this.colonyUpCost(c.level + 1)
    if (!this.canPay(uc)) {
      this.toast(`Yükseltme: ${this.costText(uc)}. Maden ve kristal yataklardan çıkar.`)
      return
    }
    this.energy -= uc.energy
    this.ore -= uc.ore
    this.crystal -= uc.crystal
    c.level++
    c.hullMax = coreHullMax(c.level)
    c.hull = c.hullMax
    this.attachColony(c, planet)
    this.audio.collect()
    this.toast(`Üs seviye ${c.level}. Nüfus tavanı ${this.capOf(c)}, taret yuvası ${turretSlots(c.level)}.`)
  }

  /** Yakındaki kendi taretin (yükseltmek için). */
  private nearTurret(c: Colony, planet: Planet, reach = 4.5) {
    let best: Turret | null = null
    let bd = reach
    for (const t of c.turrets) {
      if (!t.alive) continue
      const d = this.worldDir(t.dir, planet, vJ).multiplyScalar(planet.def.radius).add(planet.pos).distanceTo(this.pos)
      if (d < bd) {
        bd = d
        best = t
      }
    }
    return best
  }

  private upgradeTurret(c: Colony, planet: Planet, t: Turret) {
    const lvl = t.lvl ?? 1
    if (lvl >= TURRET_MAX_LVL) {
      this.toast('Taret en üst seviyede (3).')
      return
    }
    const cost = turretUpCost(lvl)
    if (!this.canPay(cost)) {
      this.toast(`Taret seviye ${lvl + 1}: ${this.costText(cost)}.`)
      return
    }
    this.energy -= cost.energy
    this.ore -= cost.ore
    this.crystal -= cost.crystal
    t.lvl = lvl + 1
    t.hull = Math.round(TURRET_HULL * turretLvlMul(t.lvl))
    const m = this.buildTurretMesh(c, t.kind ?? 'kara', t.lvl)
    t.root.removeFromParent()
    this.disposeMats(t.root as THREEGroup)
    t.root = m.root
    t.head = m.head
    this.stand(t.root, t.dir, planet.def.radius)
    c.root?.add(t.root)
    this.surfacePos(this.worldDir(t.dir, planet, vL), planet, 1.6, vM)
    this.fx.column(vM, vL.clone(), t.kind === 'hava' ? 0x6af0ff : 0xffa040, 8, 1.4, 0.7)
    this.audio.collect()
    this.toast(`${t.kind === 'hava' ? 'Hava savunma' : 'Kara'} tareti seviye ${t.lvl}: daha sert, daha uzun menzil, daha dayanıklı.`)
    this.questEvent('turretUp')
  }

  private placeTurret(kind: TurretKind = 'kara') {
    const planet = this.footPlanet
    const c = this.colonyHere(planet)
    if (!planet || !c) {
      this.toast('Önce üs kur (B).')
      return
    }
    if (!this.mine(c)) {
      this.toast('Bu üs senin değil.')
      return
    }
    const nearT = this.nearTurret(c, planet)
    if (nearT) {
      this.upgradeTurret(c, planet, nearT)
      return
    }
    const slots = turretSlots(c.level)
    if (c.turrets.length >= slots) {
      this.toast(`Taret yuvaları dolu (${slots}). Üssü yükselt.`)
      return
    }
    const tc = this.turretCost()
    if (!this.canPay(tc)) {
      this.toast(`Taret: ${this.costText(tc)}. Maden yataklardan çıkar.`)
      return
    }
    if (this.coreDistance(c, planet) > BUILD_REACH) {
      this.toast('Üsse çok uzaksın.')
      return
    }
    const R = planet.def.radius
    vL.copy(this.pos).sub(planet.pos).normalize()
    this.slideToward(vL, vM.copy(vL).addScaledVector(this.footForward, 0.6).normalize(), 3.6, R)
    const local = this.toLocal(vL, planet, new Vector3())
    const toCore = this.arc(local, c.dir, R)
    if (toCore < 6.2) this.slideAway(local, c.dir, 6.2 - toCore, R)
    for (const t of c.turrets) {
      if (this.arc(local, t.dir, R) < 3.4) {
        this.toast('Burada başka bir taret var.')
        return
      }
    }
    this.energy -= tc.energy
    this.ore -= tc.ore
    this.crystal -= tc.crystal
    this.addTurret(c, planet, local, kind)
    this.worldDir(local, planet, vL)
    this.surfacePos(vL, planet, 1.2, vM)
    this.sparks.burst(vM, 0xe4a15c, 10, 6, 0.9, vL)
    this.audio.ui()
    this.toast(`${kind === 'hava' ? 'Hava savunma tareti (gemileri vurur)' : 'Kara tareti (yerdeki saldırganı vurur)'} kuruldu (${c.turrets.length}/${slots}). Yanında T: yükselt.`)
    this.questEvent(kind === 'hava' ? 'turretAA' : 'turret')
  }

  private callWave() {
    const c = this.colonyHere()
    if (!c) return
    if (!this.mine(c)) {
      this.toast('Bu üs senin değil.')
      return
    }
    if (c.state === 'wave') {
      this.toast('Dalga zaten sürüyor.')
      return
    }
    c.countdown = 0
    c.early = true
  }

  private waveGap(c: Colony) {
    if (!this.mine(c)) return BOT_WAVE_GAP
    return c.kind === 'colony' && c.founded ? WAVE_GAP * 3 : WAVE_GAP
  }

  private pickAttacker(c: Colony): OriginId {
    let pool = ORIGINS.map((o) => o.id).filter((id) => id !== c.owner)
    // Oyuncunun üslerine barıştaki ırklar saldırmaz.
    if (this.mine(c)) {
      const foes = pool.filter((id) => !friendly(this.rel[id]))
      if (foes.length) pool = foes
    }
    const local = Object.values(this.colonies)
      .filter((x) => x.universe === c.universe && x.owner !== c.owner)
      .map((x) => x.owner)
    const from = local.length && Math.random() < 0.6 ? local : pool
    return from[Math.floor(Math.random() * from.length)]
  }

  private startWave(c: Colony) {
    c.state = 'wave'
    c.attacker = c.attacker ?? this.pickAttacker(c)
    c.queue = waveRoster(c.wave + 1)
    c.spawnT = 0.6
    this.waveBearing = Math.random() * Math.PI * 2
    const who = factionName(c.attacker)
    if (this.mine(c)) {
      this.toast(`Dalga ${c.wave + 1} — ${who} saldırıyor (${c.queue.length} kişi)!`)
      this.audio.warning()
    } else this.toast(`${factionName(c.owner)} üssüne ${who} saldırıyor.`)
  }

  private finishWave(c: Colony, planet: Planet) {
    c.wave++
    c.state = 'idle'
    c.attacker = null
    c.countdown = this.waveGap(c)
    c.hull = Math.min(c.hullMax, c.hull + c.hullMax * 0.2)
    for (const t of c.turrets) t.hull = TURRET_HULL
    if (!this.mine(c)) {
      this.toast(`${factionName(c.owner)} üssü saldırıyı püskürttü.`)
      return
    }
    const reward = waveReward(c.wave, c.early)
    c.early = false
    this.energy += reward
    this.lastLoot = reward
    this.addScore(60 + c.wave * 20)
    this.audio.collect()
    if (c.kind === 'colony' && !c.founded && c.wave >= SIEGE_WAVES) {
      c.founded = true
      c.countdown = this.waveGap(c)
      this.energy += 60
      this.addScore(300)
      this.toast(`${planet.def.name} kolonileşti! Pasif enerji, kalkan bonusu ve nüfus artışı kazandın.`)
      this.mirrorRun()
      return
    }
    this.toast(`Dalga ${c.wave} savuşturuldu. +${reward} enerji.`)
    if (c.kind === 'main' && c.wave > this.save.bestWave) {
      this.save.bestWave = c.wave
      writeSave(this.save)
    }
  }

  /** Üs el değiştirir: yeni sahip düşük seviyeyle başlar, eski taretler ve yerleşimciler gider. */
  private flipOwner(c: Colony, planet: Planet | null, owner: OriginId) {
    this.units = this.units.filter((u) => {
      if (u.colonyId !== c.planetId || u.invader) return true
      this.flash.forget(u.root)
      this.mapRoot.remove(u.root)
      this.disposeMats(u.root)
      return false
    })
    for (const t of c.turrets) {
      t.root.removeFromParent()
      this.disposeMats(t.root)
    }
    c.turrets = []
    c.owner = owner
    c.level = Math.max(1, c.level - 2)
    c.hullMax = coreHullMax(c.level)
    c.hull = c.hullMax
    c.pop = 2
    c.wave = 0
    c.state = 'idle'
    c.queue = []
    c.attacker = null
    c.founded = true
    c.kind = 'colony'
    c.countdown = this.waveGap(c)
    if (planet) this.attachColony(c, planet)
  }

  private baseLost(c: Colony, planet: Planet, conqueror: OriginId | null) {
    if (!this.mine(c) && conqueror) {
      if (conqueror === this.originId) this.questEvent('capture', planet.def.id)
      // Baskın ekibi üssü aldıysa ekip ölmez: yeni koloninin ilk nüfusu olur.
      const raid = conqueror === this.originId ? this.units.filter((u) => u.alive && u.squad) : []
      if (raid.length) {
        for (const u of this.units) {
          if (raid.includes(u)) continue
          this.flash.forget(u.root)
          this.mapRoot.remove(u.root)
          this.disposeMats(u.root)
        }
        this.units = raid
        this.tracers?.clear()
      } else {
        for (const u of this.units) if (u.invader) u.alive = false
        this.clearGround()
      }
      this.flipOwner(c, planet, conqueror)
      for (const u of raid) {
        u.squad = false
        u.colonyId = c.planetId
        u.goal = null
      }
      if (raid.length) c.pop = Math.max(c.pop, raid.length)
      this.trauma = Math.min(1, this.trauma + 0.4)
      this.audio.boom()
      this.toast(
        raid.length
          ? `Baskın başarılı! Ekibin ${planet.def.name} üssünü ele geçirdi; ${raid.length} kişi burada kaldı.`
          : conqueror === this.originId
            ? `Türün ${planet.def.name} üssünü ele geçirdi!`
            : `${factionName(conqueror)} ${planet.def.name} üssünü ele geçirdi.`,
      )
      this.mirrorRun()
      return
    }
    const wasMine = this.mine(c)
    this.clearGround()
    this.detachColony(c)
    delete this.colonies[c.planetId]
    this.trauma = 1
    this.audio.boom()
    if (wasMine) this.toast(`${c.kind === 'main' ? 'Üs' : 'Karakol'} düştü. Yeniden kurabilirsin (B).`)
    else {
      // Yıkılan karakolun gezegeninde yeni doğum yok: yerli gelmez, botlar bir süre kuramaz.
      this.cleared.add(c.planetId)
      this.razed.set(c.planetId, this.properTime)
      this.energy += 40
      this.addScore(150)
      // Yıkmak da sayılır: "düşman üssünü ele geçir" adımı ilerler (eskiden yalnız teslim alma sayılıyordu, eğitim burada takılıyordu).
      this.questEvent('capture', c.planetId)
      this.toast(`${factionName(c.owner)} üssü yıkıldı. +40 enerji. Gezegen boş; kendi üssünü kurabilirsin (B).`)
    }
    this.mirrorRun()
  }

  private makeUnit(kind: UnitKind, faction: OriginId, invader: boolean, c: Colony | null, planet: Planet, dir: Vector3): Unit {
    const spec = invader ? INVADER[kind as InvaderKind] : SETTLER[kind as SettlerKind]
    const look = originLook(faction)
    // Yancılar ve koşucular ırkın küçük sürümüdür; ana karakterler ve ağır istilacılar tam gövde.
    const rig = kind === 'settler' || kind === 'runner' || kind === 'worker' ? buildMinion(look) : buildCreature(look)
    rig.root.scale.multiplyScalar(spec.scale)
    const friendly = faction === this.originId
    const marker = new Mesh(
      new RingGeometry(0.55, 0.74, 16),
      new MeshBasicMaterial({ color: friendly ? 0x7dff8a : 0xff5a4a, side: DoubleSide, transparent: true, opacity: 0.8, depthWrite: false }),
    )
    marker.rotation.x = -Math.PI / 2
    marker.position.y = FEET + 0.05
    rig.root.add(marker)
    if (kind === 'commander') {
      // Komutan: sırtında ırk renginde sancak, başında ışıklı halka.
      const pole = new Mesh(new CylinderGeometry(0.04, 0.04, 2.6, 6), new MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.5 }))
      pole.position.set(0.25, 1.6, -0.45)
      const flagM = new MeshBasicMaterial({ color: new Color(look.body ?? 0xffd27a).multiplyScalar(1.3), side: DoubleSide })
      flagM.toneMapped = false
      const flag = new Mesh(new BoxGeometry(0.02, 0.6, 0.9), flagM)
      flag.position.set(0.25, 2.55, -0.9)
      flag.name = 'flag'
      const ringM = new MeshBasicMaterial({ color: new Color(0xffd27a).multiplyScalar(1.7) })
      ringM.toneMapped = false
      const crown = new Mesh(new TorusGeometry(0.32, 0.04, 6, 20), ringM)
      crown.rotation.x = Math.PI / 2
      crown.position.y = 1.55
      rig.root.add(pole, flag, crown)
    }
    if (kind === 'worker') {
      // İşçi: sırtında ışıyan yük (taşırken görünür) ve elinde kazma.
      const packMat = new MeshBasicMaterial({ color: 0xffb43a })
      packMat.toneMapped = false
      const pack = new Mesh(new OctahedronGeometry(0.32), packMat)
      pack.position.set(0, 1.45, -0.45)
      pack.visible = false
      rig.root.add(pack)
      rig.root.userData.pack = pack
      const pick = new Mesh(new BoxGeometry(0.06, 0.06, 0.9), new MeshStandardMaterial({ color: 0x6a5a48 }))
      const head = new Mesh(new BoxGeometry(0.5, 0.08, 0.08), new MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.6 }))
      head.position.z = 0.42
      pick.add(head)
      pick.position.set(0.45, 0.9, 0.2)
      pick.rotation.x = -0.6
      rig.root.add(pick)
    }
    rig.root.position.copy(planet.pos).addScaledVector(dir, planet.def.radius + 1.05)
    this.mapRoot.add(rig.root)
    const hull = !c ? spec.hull : invader ? Math.round(spec.hull * waveHullMul(c.wave + 1)) : Math.round(spec.hull * (1 + 0.12 * (c.level - 1)))
    const unit: Unit = {
      alive: true,
      kind,
      spec,
      faction,
      invader,
      colonyId: c?.planetId ?? '',
      root: rig.root,
      rig,
      dir,
      hull,
      hullMax: hull,
      cool: 0.5 + Math.random() * 0.6,
      phase: Math.random() * 6,
      attack: 0,
      goal: null,
    }
    unit.seq = this.unitSeq++
    if (kind === 'commander') unit.name = COMMANDER_NAMES[Math.floor(Math.random() * COMMANDER_NAMES.length)]
    this.units.push(unit)
    return unit
  }

  private spawnInvader(c: Colony, planet: Planet, kind: InvaderKind) {
    const R = planet.def.radius
    const core = this.worldDir(c.dir, planet, vJ)
    const far = Math.min(54, Math.PI * R * 0.8)
    const dist = Math.max(18, far - 6 * Math.random())
    const dir = this.offsetDir(core, this.waveBearing + (Math.random() - 0.5) * 1.5, Math.min(dist, far), R, new Vector3())
    const unit = this.makeUnit(kind, c.attacker ?? this.pickAttacker(c), true, c, planet, dir)
    this.surfacePos(dir, planet, 1.5, vM)
    this.sparks.burst(vM, unit.spec.color, 6, 6, 1.0, dir)
  }

  private spawnSettler(c: Colony, planet: Planet, kind: SettlerKind) {
    const R = planet.def.radius
    const core = this.worldDir(c.dir, planet, vJ)
    const dir = this.offsetDir(core, Math.random() * Math.PI * 2, Math.min(5.5 + Math.random() * 5, Math.PI * R * 0.4), R, new Vector3())
    this.makeUnit(kind, c.owner, false, c, planet, dir)
    this.surfacePos(dir, planet, 1.2, vM)
    this.sparks.burst(vM, 0xfff1c4, 5, 4, 0.8, dir)
  }

  private updateSettlers(c: Colony, planet: Planet, dt: number) {
    const cap = this.capOf(c)
    c.pop = Math.min(c.pop, cap)
    const target = Math.floor(c.pop)
    let alive = 0
    let heroes = 0
    let workers = 0
    for (const u of this.units) {
      if (!u.alive || u.invader || u.squad || u.colonyId !== c.planetId) continue
      alive++
      if (isHero(u.kind)) heroes++
      else if (u.kind === 'worker') workers++
    }
    c.settleT -= dt
    if (c.besieged && !this.mine(c)) {
      // Kuşatılan üs takviye çıkaramaz; savunma tükenince teslim olur.
      if (alive === 0 && !c.turrets.some((t) => t.alive)) this.surrender(c, planet)
      return
    }
    if (c.cmdWaiting && this.mine(c)) {
      c.cmdWaiting = 0
      this.spawnSettler(c, planet, 'commander')
    }
    if (alive < target && c.settleT <= 0) {
      // Baskın sürerken düşman üssü savunmacısını yavaş çıkarır; baskın sürpriz etkisi taşır.
      c.settleT = !this.mine(c) && this.units.some((u) => u.alive && u.squad) ? 3 : 0.4
      const plan = this.colonyPlan(c)
      this.spawnSettler(c, planet, heroes < plan.heroes ? heroKind(heroes) : workers < plan.workers ? 'worker' : 'settler')
    }
  }

  /** Koloninin hedef dağılımı: ana karakterler (seviye + kışla eğitimi), işçiler (duruşa göre), kalan askerler. */
  colonyPlan(c: Colony) {
    const pop = Math.floor(Math.min(c.pop, this.capOf(c)))
    const heroes = Math.min(pop, heroCap(c.level) + (c.trained ?? 0))
    const workers = Math.floor(Math.max(0, pop - heroes) * workerShare(c.posture))
    return { pop, heroes, workers, soldiers: pop - workers }
  }


  private surrender(c: Colony, planet: Planet) {
    const owner = c.owner
    this.baseLost(c, planet, this.originId)
    this.feed('⚑', `${factionName(owner)} üssü teslim oldu`, 'good')
  }

  /** Oyuncu tarafı düşman üssüne saldırınca kuşatma başlar. */
  private besiege(colonyId: string) {
    const c = this.colonies[colonyId]
    if (!c || this.mine(c) || c.besieged) return
    c.besieged = true
    this.toast(`${c.planetName} kuşatıldı: takviye gelmiyor. Kalan savunmacıları ve taretleri düşür.`)
  }

  private killUnit(u: Unit, planet: Planet, credit: boolean) {
    u.alive = false
    this.flash.forget(u.root)
    this.mapRoot.remove(u.root)
    this.disposeMats(u.root)
    this.surfacePos(u.dir, planet, 1.2, vM)
    this.sparks.burst(vM, u.spec.color, 14, 10, 1.4, u.dir)
    if (!u.invader && !u.squad) {
      const col = this.colonies[u.colonyId]
      if (col) {
        col.pop = Math.max(0, col.pop - 1)
        if (isHero(u.kind) && (col.trained ?? 0) > 0) col.trained = (col.trained ?? 0) - 1
      }
    }
    if (credit) {
      this.spawnBoom(vM, u.kind === 'queen' ? 1.4 : 0.5, u.spec.color)
      this.audio.boom()
      if (u.invader || u.faction !== this.originId) {
        this.kills++
        this.addScore(Math.max(6, u.spec.score))
      }
    }
  }

  private hitUnit(u: Unit, dmg: number, from: Vector3, planet: Planet, credit: boolean, by: HitBy = 'unit', who = '') {
    // Baskın ekibi kalkanlı iner: aldığı hasar yarıya düşer.
    if (u.squad) dmg *= 0.5 * this.skillGuardMul()
    else if (!u.invader) {
      const col = this.colonies[u.colonyId]
      if (col && col.order === 'arka') dmg *= 0.7
      if (col && col.owner === this.originId) dmg *= this.skillGuardMul()
    }
    u.hull -= dmg
    this.impact(u.root.position, dmg, u.rig, u.spec.color, vK.copy(u.dir), by)
    this.slideAway(u.dir, from, u.kind === 'queen' ? 0.15 : u.kind === 'brute' || u.kind === 'guard' ? 0.45 : 0.9, planet.def.radius)
    const ours = u.faction === this.originId
    this.audio.voice(u.faction, u.hull <= 0 ? 'die' : 'hurt', this.earGain(u.root.position))
    if (!ours && !u.invader && credit) this.besiege(u.colonyId)
    if (by !== 'player') this.feed(by === 'turret' ? '◈' : by === 'local' ? '✦' : ours ? '▼' : '▲', `${who || 'Birlik'} → ${this.unitLabel(u)}`, ours ? 'bad' : 'good')
    if (u.hull <= 0) {
      if (by !== 'player') this.feed('✖', `${this.unitLabel(u)} düştü`, ours ? 'bad' : 'good')
      this.killUnit(u, planet, credit)
    }
  }

  /** Uzaklığa göre ses kazancı: kameraya yakın olaylar duyulur, uzaktakiler sessiz. */
  private earGain(at: Vector3) {
    return clamp(1 - at.distanceTo(this.camera.position) / 45, 0, 1)
  }

  private unitLabel(u: Unit) {
    if (u.kind === 'commander') return `Komutan ${u.name ?? ''}`.trim()
    const ours = u.faction === this.originId
    return `${ours ? '' : u.invader ? 'İstilacı ' : ''}${u.spec.name}${ours ? '' : ''}`
  }

  private hitLocal(local: Local, dmg: number, planet: Planet, from?: Vector3, by: HitBy = 'player') {
    const R = planet.def.radius
    local.hull -= dmg
    if (from) vJ.copy(from)
    else vJ.copy(this.pos).sub(planet.pos).normalize()
    this.impact(local.root.position, dmg, local.rig, 0xffe2b0, vK.copy(local.home), by)
    this.audio.voice(nativeLook(planet.def).id, local.hull <= 0 ? 'die' : 'hurt', this.earGain(local.root.position))
    if (by !== 'player') this.feed('▲', 'Ekibin → yerli', 'good')
    this.slideAway(local.home, vJ, 0.9, R)
    if (local.hull <= 0) {
      local.alive = false
      this.flash.forget(local.root)
      local.root.visible = false
      this.addScore(12)
      this.spawnBoom(local.root.position, 0.4, 0xffd2b4)
      if (!local.friendly) this.nativesLeft.set(planet.def.id, Math.max(0, this.nativesLeftOf(planet) - 1))
      if (this.locals.every((l) => !l.alive)) {
        this.cleared.add(planet.def.id)
        this.toast(`${planet.def.name} yerlilerinden temizlendi. Karakol kurunca türün burada çoğalır (B).`)
      }
    }
  }

  private updateColonyWave(c: Colony, planet: Planet, dt: number) {
    if (c.state === 'idle') {
      // Eğitimde dalgalar "İlk dalgayı savuştur" adımına kadar bekler.
      if (this.mine(c) && !this.tutorialAt('wave')) return
      c.countdown -= dt
      if (c.countdown <= 0) this.startWave(c)
      return
    }
    c.spawnT -= dt
    if (c.queue.length && c.spawnT <= 0) {
      c.spawnT = 0.85
      const next = c.queue.shift()
      if (next) this.spawnInvader(c, planet, next)
    }
    if (!c.queue.length && !this.units.some((u) => u.alive && u.invader)) this.finishWave(c, planet)
  }

  squadCommander = false
  private updateUnits(planet: Planet, c: Colony | null, dt: number) {
    this.unitFrame++
    const R = planet.def.radius
    this.units = this.units.filter((u) => u.alive)
    // Komutan ekipteyse: herkes %25 sert vurur ve yavaşça iyileşir.
    this.squadCommander = this.units.some((u) => u.squad && u.kind === 'commander')
    if (this.squadCommander) for (const u of this.units) if (u.squad && u.hull < u.hullMax) u.hull = Math.min(u.hullMax, u.hull + 1.5 * dt)
    const crew = this.units.some((u) => u.squad)
    if (!c && !crew) {
      if (this.units.length) this.clearGround()
      return
    }
    const playerDir = vH2.copy(this.pos).sub(planet.pos).normalize()
    const coreDir = c ? this.worldDir(c.dir, planet, vI2) : null
    const peaceful = Boolean(planet.def.home && this.isHome())
    const list = this.units.slice()
    for (const u of list) {
      if (!u.alive) continue
      u.phase += dt
      u.cool = Math.max(0, u.cool - dt)
      u.attack = Math.max(0, u.attack - dt)
      let kind: 'none' | 'player' | 'unit' | 'turret' | 'core' | 'local' = 'none'
      let target: Vector3 | null = null
      let radius = 0
      let enemy: Unit | null = null
      let prey: Local | null = null
      let turret: Turret | null = null
      let best = 99
      if (this.hostileToPlayer(u.faction)) {
        const d = this.arc(u.dir, playerDir, R)
        if (d < 12) {
          best = d
          kind = 'player'
          target = playerDir
          radius = PLAYER_RADIUS
        }
      }
      for (const v of list) {
        if (!v.alive || v.faction === u.faction) continue
        const d = this.arc(u.dir, v.dir, R)
        // Yerleşimciler üssü savunmak için istilacıları uzaktan da fark eder.
        // Baskın ekibi daha uzağı görür; düşman yerleşimci baskıncıyı da istilacı gibi karşılar.
        let sight = !u.invader && (v.invader || v.squad) ? 34 : u.squad ? 22 : 10
        if (u.squad) sight = this.squadOrder === 'saldir' ? 40 : this.squadOrder === 'bekle' ? 15 : 22
        else if (u.kind === 'worker') sight = 3 // işçi savaşmaz; yalnız dibine geleni iter
        else if (!u.invader && c && c.owner === u.faction && sight > 10) {
          const ord = c.order ?? 'serbest'
          if (ord === 'hucum') sight = 60
          else if (ord === 'arka') {
            // Taret arkası: yalnız üsse yaklaşanı karşılar.
            if (!coreDir || this.arc(v.dir, coreDir, R) > 20) sight = 0
          }
        }
        if (d < sight && d < best) {
          best = d
          kind = 'unit'
          enemy = v
          target = v.dir
          radius = v.spec.radius
        }
      }
      if (u.squad && !peaceful) {
        for (const local of this.locals) {
          if (!local.alive || local.friendly) continue
          const d = this.arc(u.dir, local.home, R)
          if (d < 30 && d < best) {
            best = d
            kind = 'local'
            prey = local
            enemy = null
            target = local.home
            radius = 0.8
          }
        }
      }
      if ((u.invader || u.squad) && c && coreDir && u.faction !== c.owner) {
        for (const t of c.turrets) {
          if (!t.alive) continue
          const td = this.worldDir(t.dir, planet, vJ2)
          const d = this.arc(u.dir, td, R)
          if (d < 11 && d < best) {
            best = d
            kind = 'turret'
            turret = t
            enemy = null
            target = this.tmpTurretDir.copy(td)
            radius = TURRET_RADIUS
          }
        }
        // Baskın ekibi uzaktaki çekirdeğe tek başına yürümez; oyuncu yaklaştırınca hücum eder.
        if (kind === 'none' && (!u.squad || this.squadOrder === 'saldir' || this.arc(u.dir, coreDir, R) < 70)) {
          kind = 'core'
          target = coreDir
          radius = CORE_RADIUS
        }
      }
      let moving = false
      if (kind === 'none' && u.squad) {
        // Baskın ekibi boştayken oyuncunun peşinden gelir; "Bekle" emrinde mevzisinde durur.
        const anchor = this.squadOrder === 'bekle' && this.squadHold ? this.squadHold : playerDir
        const gap = this.arc(u.dir, anchor, R)
        if (gap > 4.5) {
          this.slideToward(u.dir, anchor, u.spec.speed * (gap > 14 ? 1.25 : 0.9) * dt, R)
          moving = true
          vK.copy(anchor).addScaledVector(u.dir, -u.dir.dot(anchor))
          if (vK.lengthSq() > 1e-8) {
            vK.normalize()
            vL.crossVectors(u.dir, vK).normalize()
            u.root.quaternion.setFromRotationMatrix(basis.makeBasis(vL, u.dir, vK))
          }
        }
        if (moving) this.blockDir(u.dir, planet, u.spec.radius)
        u.root.position.copy(planet.pos).addScaledVector(u.dir, R + 1.05)
        if (this.animNow(u)) this.stepRig(u.rig, moving ? u.spec.speed : 0, false, u.attack)
        continue
      }
      if (kind === 'none' && u.kind === 'worker' && c && coreDir && c.owner === u.faction) {
        this.workerTick(u, c, planet, coreDir, dt)
        continue
      }
      if (kind === 'none') {
        // Yerleşimci: üssün çevresinde dolaşır.
        if (!u.invader && coreDir) {
          const home = coreDir
          if (!u.goal) u.goal = new Vector3()
          const ord = c && c.owner === u.faction ? (c.order ?? 'serbest') : 'serbest'
          if (ord !== 'serbest' && ord !== 'hucum' && c) {
            this.formationGoal(u, c, planet, coreDir, ord, u.goal)
          } else if (u.phase > 1e8 || u.goal.lengthSq() < 0.5 || this.arc(u.dir, u.goal, R) < 1.2) {
            // Askerler sahadaki işçilere eşlik eder; yoksa üssün çevresinde dolaşır.
            const escort = u.kind === 'settler' && Math.random() < 0.65 ? this.fieldWorker(u, planet, home) : null
            if (escort) this.offsetDir(escort, Math.random() * Math.PI * 2, 3 + Math.random() * 3, R, u.goal)
            else this.offsetDir(home, Math.random() * Math.PI * 2, 4 + Math.random() * 18, R, u.goal)
            u.phase = 0
          }
          if (this.arc(u.dir, u.goal, R) > 1.2) {
            this.slideToward(u.dir, u.goal, u.spec.speed * 0.45 * dt, R)
            moving = true
            vK.copy(u.goal).addScaledVector(u.dir, -u.dir.dot(u.goal))
            if (vK.lengthSq() > 1e-8) {
              vK.normalize()
              vL.crossVectors(u.dir, vK).normalize()
              u.root.quaternion.setFromRotationMatrix(basis.makeBasis(vL, u.dir, vK))
            }
          }
        }
        if (moving) this.blockDir(u.dir, planet, u.spec.radius)
        u.root.position.copy(planet.pos).addScaledVector(u.dir, R + 1.05)
        if (this.animNow(u)) this.stepRig(u.rig, moving ? u.spec.speed * 0.5 : 0, false, u.attack)
        continue
      }
      if (!target) continue
      const gap = this.arc(u.dir, target, R)
      const hold = u.spec.reach * 0.8 + radius + u.spec.radius
      const reach = u.spec.reach + radius + u.spec.radius
      if (gap > hold) {
        this.slideToward(u.dir, target, u.spec.speed * dt, R)
        moving = true
      }
      if (moving) this.blockDir(u.dir, planet, u.spec.radius)
      u.root.position.copy(planet.pos).addScaledVector(u.dir, R + 1.05)
      vK.copy(target).addScaledVector(u.dir, -u.dir.dot(target))
      if (vK.lengthSq() > 1e-8) {
        vK.normalize()
        vL.crossVectors(u.dir, vK).normalize()
        u.root.quaternion.setFromRotationMatrix(basis.makeBasis(vL, u.dir, vK))
      }
      if (gap <= reach && u.cool <= 0) {
        u.cool = u.spec.cool
        u.attack = 0.35
        this.attackSound(u.rig, u.root.position, 0.8)
        if (Math.random() < 0.25) this.audio.voice(u.faction, 'attack', this.earGain(u.root.position) * 0.6)
        const ordMul = !u.invader && !u.squad && c && c.owner === u.faction ? (c.order === 'hucum' ? 1.3 : 1) : 1
        const dmg = u.squad
          ? Math.round(u.spec.dmg * 1.5 * this.skillDmgMul() * (this.squadCommander ? 1.25 : 1))
          : u.invader
            ? Math.round(u.spec.dmg * (1 + (c?.wave ?? 0) * 0.04))
            : Math.round(u.spec.dmg * (1 + 0.15 * ((c?.level ?? 1) - 1)) * ordMul)
        if (u.spec.reach > 6) {
          vM.copy(u.root.position).addScaledVector(u.dir, 1.4)
          if (kind === 'player') vL.copy(this.pos).addScaledVector(playerDir, 1)
          else this.surfacePos(target, planet, 1.5, vL)
          this.tracers.fire(vM, vL, u.spec.color, 0.14, 0.18)
        }
        if (kind === 'player') this.footHurt(dmg)
        else if (kind === 'unit' && enemy) this.hitUnit(enemy, dmg, u.dir, planet, u.faction === this.originId, 'unit', this.unitLabel(u))
        else if (kind === 'local' && prey) this.hitLocal(prey, dmg, planet, u.dir, 'unit')
        else if (kind === 'turret' && turret && c) {
          turret.hull -= dmg
          this.surfacePos(target, planet, 1.5, vM)
          this.sparks.burst(vM, 0xffb15a, 6, 6, 0.9, target)
          if (turret.hull <= 0) this.destroyTurret(c, turret, planet)
        } else if (kind === 'core' && c) {
          c.hull -= dmg
          this.surfacePos(target, planet, 2.2, vM)
          this.sparks.burst(vM, 0xffb15a, 6, 7, 1, target)
          this.trauma = Math.min(0.6, this.trauma + 0.05)
          if (c.hull <= 0) {
            this.baseLost(c, planet, u.faction)
            return
          }
        }
      }
      if (this.animNow(u)) this.stepRig(u.rig, moving ? u.spec.speed : 0.4, false, u.attack)
    }
  }

  /** Üssünden uzakta çalışan bir işçi (eşlik edilecek). */
  private fieldWorker(u: Unit, planet: Planet, home: Vector3) {
    const R = planet.def.radius
    const list = this.units.filter((w) => w.alive && w.kind === 'worker' && w.colonyId === u.colonyId && w.job !== 'back' && this.arc(w.dir, home, R) > 12)
    return list.length ? list[Math.floor(Math.random() * list.length)].dir : null
  }

  workerHaul = { ore: 0, crystal: 0, t: 0 }

  /** İşçi: en yakın yataklardan birine yürür, kazar, yükü çekirdeğe taşır. */
  private workerTick(u: Unit, c: Colony, planet: Planet, coreDir: Vector3, dt: number) {
    const R = planet.def.radius
    let moving = false
    let target: Vector3 | null = null
    if (!u.job) u.job = 'go'
    const pack = u.root.userData.pack as Mesh | undefined
    if (u.job === 'go') {
      let dep = u.depKey ? planet.deposits.find((d) => d.key === u.depKey && d.left > 0) : undefined
      if (!dep) {
        const open = planet.deposits
          .filter((d) => d.left > 0)
          .map((d) => ({ d, gap: this.arc(this.worldDir(d.dir, planet, vJ2), coreDir, R) }))
          .filter((x) => x.gap < 260)
          .sort((a, b) => a.gap - b.gap)
          .slice(0, 3)
        dep = open.length ? open[Math.floor(Math.random() * open.length)].d : undefined
        u.depKey = dep?.key
      }
      if (dep) {
        target = this.worldDir(dep.dir, planet, this.tmpTurretDir)
        if (this.arc(u.dir, target, R) > 2.4) {
          this.slideToward(u.dir, target, u.spec.speed * 0.8 * dt, R)
          moving = true
        } else {
          u.job = 'dig'
          u.jobT = 3.2
        }
      } else {
        // Yatak yok: üssün çevresinde bekle.
        target = coreDir
        if (this.arc(u.dir, coreDir, R) > 9) {
          this.slideToward(u.dir, coreDir, u.spec.speed * 0.5 * dt, R)
          moving = true
        }
      }
    } else if (u.job === 'dig') {
      const dep = planet.deposits.find((d) => d.key === u.depKey)
      u.jobT = (u.jobT ?? 0) - dt
      if (dep) target = this.worldDir(dep.dir, planet, this.tmpTurretDir)
      if (u.cool <= 0) {
        u.cool = 0.75
        u.attack = 0.35
        if (dep && this.animNow(u)) {
          this.surfacePos(target as Vector3, planet, 1.2, vM)
          this.sparks.burst(vM, dep.kind === 'ore' ? 0xffb43a : 0x6af0ff, 4, 4, 0.6, target as Vector3)
        }
      }
      if ((u.jobT ?? 0) <= 0) {
        if (!dep || dep.left <= 0) {
          u.job = 'go'
          u.depKey = undefined
        } else {
          u.carry = dep.kind
          // Her iki taşımada bir yatak bir birim azalır (oyuncuya da kaynak kalsın).
          if (Math.random() < 0.5) {
            dep.left -= 1
            this.mined.set(dep.key, dep.left)
            if (dep.left <= 0) {
              dep.obj.visible = false
              this.regrow.set(dep.key, this.clockT + 300)
              u.depKey = undefined
            }
          }
          u.job = 'back'
        }
      }
    } else {
      target = coreDir
      if (this.arc(u.dir, coreDir, R) > CORE_RADIUS + 2.4) {
        this.slideToward(u.dir, coreDir, u.spec.speed * 0.7 * dt, R)
        moving = true
      } else {
        if (this.mine(c)) {
          if (u.carry === 'crystal') {
            this.crystal += 1
            this.workerHaul.crystal += 1
          } else {
            this.ore += 2
            this.workerHaul.ore += 2
          }
        } else c.store = (c.store ?? 0) + 3
        u.carry = null
        u.job = 'go'
      }
    }
    if (pack) {
      pack.visible = Boolean(u.carry)
      if (u.carry) (pack.material as MeshBasicMaterial).color.setHex(u.carry === 'ore' ? 0xffb43a : 0x6af0ff).multiplyScalar(1.6)
    }
    if (target) {
      vK.copy(target).addScaledVector(u.dir, -u.dir.dot(target))
      if (vK.lengthSq() > 1e-8) {
        vK.normalize()
        vL.crossVectors(u.dir, vK).normalize()
        u.root.quaternion.setFromRotationMatrix(basis.makeBasis(vL, u.dir, vK))
      }
    }
    if (moving) this.blockDir(u.dir, planet, u.spec.radius)
    u.root.position.copy(planet.pos).addScaledVector(u.dir, R + 1.05)
    if (this.animNow(u)) this.stepRig(u.rig, moving ? u.spec.speed * 0.8 : 0, false, u.attack)
  }

  /** Mobil performans: uzak birimlerin uzuv animasyonu her 3 karede bir, çok uzaktakiler her 6 karede bir işlenir. */
  private animNow(u: Unit) {
    const d2 = u.root.position.distanceToSquared(this.pos)
    if (d2 < 30 * 30) return true
    const every = d2 < 60 * 60 ? 3 : 6
    return (this.unitFrame + (u.seq ?? 0)) % every === 0
  }

  private updateTurrets(planet: Planet, c: Colony | null, dt: number) {
    if (!c) return
    const mine = this.mine(c)
    for (const t of c.turrets) {
      if (!t.alive || t.kind === 'hava') continue
      t.cool = Math.max(0, t.cool - dt)
      const td = this.worldDir(t.dir, planet, vJ)
      this.surfacePos(td, planet, 1.7, vK)
      let target: Unit | null = null
      const lv = turretLvlMul(t.lvl ?? 1)
      // Gözcü kulesi (sv4+) taret menzilini %25 artırır; seviye de menzili açar.
      const range = TURRET_RANGE * (c.level >= 4 ? 1.25 : 1) * (1 + 0.15 * ((t.lvl ?? 1) - 1))
      let best = range
      for (const u of this.units) {
        if (!u.alive || u.faction === c.owner) continue
        const d = vK.distanceTo(u.root.position)
        if (d < best) {
          best = d
          target = u
        }
      }
      let atPlayer = false
      if (!mine) {
        const d = vK.distanceTo(this.pos)
        if (d < Math.min(best, range * 0.8)) {
          best = d
          target = null
          atPlayer = true
        }
      }
      if (!target && !atPlayer) continue
      t.root.updateWorldMatrix(true, false)
      vL.copy(atPlayer ? this.pos : (target as Unit).root.position)
      t.root.worldToLocal(vL)
      const yaw = Math.atan2(vL.x, vL.z)
      let dy = yaw - t.head.rotation.y
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      t.head.rotation.y += dy * (1 - Math.exp(-12 * dt))
      if (t.cool > 0) continue
      t.cool = turretCooldown(c.level) * (atPlayer ? 1.4 : 1)
      const dmg = turretDamage(c.level) * lv * (c.posture === 'savunma' ? 1.25 : 1)
      if (atPlayer) {
        vM.copy(this.pos).addScaledVector(td, 1)
        this.tracers.fire(vK, vM, 0xff7a5a, 0.12, 0.14)
        this.audio.laser(true)
        this.footHurt(Math.round(dmg * 0.8))
        continue
      }
      const u = target as Unit
      vM.copy(u.root.position).addScaledVector(u.dir, 0.9)
      this.tracers.fire(vK, vM, 0xffd27a, 0.1, 0.12)
      this.audio.turret(mine, this.earGain(vK))
      this.hitUnit(u, Math.round(dmg), td, planet, mine, 'turret', mine ? 'Taretin' : 'Düşman tareti')
    }
  }

  private separate(planet: Planet, c: Colony | null) {
    const R = planet.def.radius
    const list = this.sepList
    list.length = 0
    const pd = vH2.copy(this.pos).sub(planet.pos).normalize()
    const playerStart = vJ2.copy(pd)
    list.push({ dir: pd, r: PLAYER_RADIUS, kind: 1 })
    if (c) {
      list.push({ dir: this.worldDir(c.dir, planet, this.sepCore), r: CORE_RADIUS, kind: 0 })
      c.turrets.forEach((t, i) => {
        if (!t.alive) return
        if (!this.sepTurrets[i]) this.sepTurrets[i] = new Vector3()
        list.push({ dir: this.worldDir(t.dir, planet, this.sepTurrets[i]), r: TURRET_RADIUS, kind: 0 })
      })
    }
    for (const local of this.locals) if (local.alive) list.push({ dir: local.home, r: 0.8, kind: 2 })
    for (const u of this.units) if (u.alive) list.push({ dir: u.dir, r: u.spec.radius, kind: 2 })
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]
          const b = list[j]
          if (a.kind === 0 && b.kind === 0) continue
          const gap = this.arc(a.dir, b.dir, R)
          const need = a.r + b.r
          if (gap >= need) continue
          const over = need - gap + 0.001
          const lo = a.kind <= b.kind ? a : b
          const hi = lo === a ? b : a
          if (lo.kind < hi.kind) this.slideAway(hi.dir, lo.dir, over, R)
          else {
            this.slideAway(a.dir, b.dir, over * 0.5, R)
            this.slideAway(b.dir, a.dir, over * 0.5, R)
          }
        }
      }
    }
    if (pd.dot(playerStart) < 0.9999999) this.pos.copy(planet.pos).addScaledVector(pd, R + this.footAlt)
  }

  private updateGround(dt: number) {
    const planet = this.footPlanet
    if (!planet) return
    this.hitCd = Math.max(0, this.hitCd - dt)
    this.flash.update(dt)
    this.sparks.update(dt)
    this.tracers.update(dt)
    this.swing.update(dt)
    const controlsOpen = !this.dom.controls.classList.contains('hidden')
    const buildEdge = this.input.pressed('KeyB') || (this.input.touchBuild && !this.buildWas)
    const turretEdge = this.input.pressed('KeyT') || (this.input.touchTurret && !this.turretWas)
    const upgradeEdge = this.input.pressed('KeyE') || (this.input.touchUpgrade && !this.upgradeWas)
    this.upgradeWas = this.input.touchUpgrade
    this.skillCd = Math.max(0, this.skillCd - dt)
    this.skillT = Math.max(0, this.skillT - dt)
    const skillEdge = this.input.pressed('KeyG') || (this.input.touchSkill && !this.skillWas)
    this.skillWas = this.input.touchSkill
    if (skillEdge && !controlsOpen) this.useSkill(planet)
    const orderEdge = this.input.pressed('KeyY') || (this.input.touchOrder && !this.orderWas)
    this.orderWas = this.input.touchOrder
    if (orderEdge && !controlsOpen) this.toggleOrders()
    if (!controlsOpen) {
      for (let i = 0; i < 4; i++) if (this.input.pressed(`Digit${i + 1}`)) this.setColonyOrder(COLONY_ORDERS[i].id)
      for (let i = 0; i < 3; i++) if (this.input.pressed(`Digit${i + 5}`)) this.setSquadOrder(SQUAD_ORDERS[i].id)
    }
    const squadEdge = this.input.pressed('KeyK') || (this.input.touchSquad && !this.squadWas)
    this.squadWas = this.input.touchSquad
    if (squadEdge && !controlsOpen) this.squadAction()
    if (upgradeEdge && !controlsOpen && this.nearParkedShip()) this.openUpgrades()
    this.buildWas = this.input.touchBuild
    this.turretWas = this.input.touchTurret
    if (!controlsOpen) {
      if (buildEdge) this.baseAction()
      if (turretEdge) {
        const shift = this.input.down('ShiftLeft') || this.input.down('ShiftRight')
        // Dokunmatik: eksik olan tür (hava savunma yoksa önce o).
        const cc = this.colonyHere(planet)
        const auto: TurretKind = cc && cc.turrets.some((t) => t.alive && (t.kind ?? 'kara') === 'kara') && !cc.turrets.some((t) => t.alive && t.kind === 'hava') ? 'hava' : 'kara'
        this.placeTurret(shift ? 'hava' : this.input.touchTurret ? auto : 'kara')
      }
    }
    const c = this.colonyHere(planet)
    if (c) {
      this.updateColonyWave(c, planet, dt)
      this.updateSettlers(c, planet, dt)
    }
    this.updateUnits(planet, this.colonyHere(planet), dt)
    this.uprightUnits()
    this.updateTurrets(planet, this.colonyHere(planet), dt)
    this.separate(planet, this.colonyHere(planet))
    this.paintCoreBar(this.colonyHere(planet))
  }

  /** Kendi üssünün yanında: K ekibi toplar ya da yerdeki ekibi koloniye geri bırakır. */
  private squadAction() {
    const planet = this.footPlanet
    if (!planet) return
    const c = this.colonyHere(planet)
    const ground = this.units.filter((u) => u.alive && u.squad)
    if (!c || !this.mine(c) || this.coreDistance(c, planet) > this.coreReach(c) * 2) {
      this.toast(ground.length ? `Ekibin seninle (${ground.length}). Bir gezegene in, yerlilere ve düşman üssüne saldırsınlar.` : 'Ekip toplamak için kendi üssünün çekirdeğine yaklaş (K).')
      return
    }
    if (ground.length) {
      for (const u of ground) {
        u.squad = false
        u.colonyId = c.planetId
        u.goal = null
      }
      c.pop += ground.length
      this.toast(`Ekip koloniye döndü. Nüfus ${Math.floor(c.pop)}.`)
      return
    }
    const pool = this.units.filter((u) => u.alive && !u.invader && !u.squad && u.colonyId === c.planetId && u.faction === this.originId && u.kind !== 'worker')
    if (pool.length < 2) {
      this.toast('Ekip için üste en az 2 yerleşimci olmalı. Üssü yükselt, nüfus artsın.')
      return
    }
    const heroes = pool.filter((u) => isHero(u.kind)).slice(0, SQUAD_HEROES)
    const cmd = pool.filter((u) => u.kind === 'commander')
    const minions = pool.filter((u) => !isHero(u.kind) && u.kind !== 'commander')
    // Kışla (üs sv2+) ekip sınırını 2 artırır; komutan sınıra sayılmaz.
    const room = Math.min(SQUAD_MAX + (c.level >= 2 ? 2 : 0) + (c.posture === 'saldiri' ? 2 : 0), pool.length - 1 - cmd.length)
    const pick = [...cmd, ...[...heroes, ...minions].slice(0, Math.max(0, room))]
    for (const u of pick) {
      u.squad = true
      u.colonyId = ''
      u.goal = null
    }
    c.pop = Math.max(0, c.pop - pick.filter((u) => u.kind !== 'commander').length)
    const h = pick.filter((u) => isHero(u.kind)).length
    this.questEvent('squad')
    this.toast(`Ekibin hazır: ${pick.length} kişi${h ? ` (${h} ana karakter)` : ''}. Gemine bin; indiğin gezegende yerlilere ve düşman üssüne saldırırlar.`)
    this.audio.collect()
  }

  /** Yerdeki ekip yeni kurulan karakola katılır; katılan sayısını döndürür. */
  private joinSquad(c: Colony) {
    const crew = this.units.filter((u) => u.alive && u.squad)
    for (const u of crew) {
      u.squad = false
      u.colonyId = c.planetId
      u.goal = null
    }
    c.pop += crew.length
    return crew.length
  }

  private squadSize() {
    if (this.layer === 'ship') return this.squad.length
    let n = 0
    for (const u of this.units) if (u.alive && u.squad) n++
    return n
  }

  private disembark(planet: Planet) {
    this.clearEscorts()
    if (!this.squad.length) return
    const R = planet.def.radius
    const me = vA.copy(this.pos).sub(planet.pos).normalize().clone()
    this.squad.forEach((m, i) => {
      const dir = this.offsetDir(me, (i / this.squad.length) * Math.PI * 2, 3.5 + (i % 2) * 1.5, R, new Vector3())
      const u = this.makeUnit(m.kind, this.originId, false, null, planet, dir)
      u.squad = true
      u.hullMax = m.hullMax
      u.hull = Math.max(1, m.hull)
    })
    this.squad = []
  }

  /** Eşlik gemisi yok olur: içindeki ekipten iki kişi de ölür. */
  /** Mahsur kalan ekip: düşen eşlik gemisinden sağ kurtulanlar. Gezegene inince sana katılırlar. */
  stranded: { planetId: string; universe: UniId; dir: Vector3; crew: { kind: SettlerKind; hull: number; hullMax: number }[] }[] = []

  /** Eşlik gemisi yok olur. İçindeki iki kişi: kara delikte ölür; bir gezegenin yakınındaysa düşer —
   *  yükseklik arttıkça ölme olasılığı artar; sağ kalanlar gezegende mahsur kalır, inince seni bulurlar. */
  private loseEscort(i: number, why: string, noSurvivors = false) {
    const e = this.escorts[i]
    if (!e) return
    const at = e.position.clone()
    this.fx.explosion(at, 0xff8a3a, 1.6)
    e.removeFromParent()
    this.disposeMats(e)
    this.escorts.splice(i, 1)
    const crew = this.squad.splice(0, Math.min(2, this.squad.length))
    this.audio.boom()
    if (!crew.length) {
      this.toast(why)
      return
    }
    // En yakın inilebilir gezegen (uzay savaşı ayrı bir alanda olsa da savaşın başladığı yerin gezegeni sayılır).
    const from = this.pos
    let planet: Planet | null = null
    let alt = Infinity
    for (const p of this.planets) {
      if (p.def.landable === false || p.def.heat) continue
      const a = from.distanceTo(p.pos) - p.def.radius
      if (a < alt) {
        alt = a
        planet = p
      }
    }
    if (noSurvivors || !planet || alt > 320) {
      this.toast(`${why} İçindeki ${crew.length} kişi uzayda kayboldu.`)
      this.feed('✖', `Eşlik gemisi düştü: ${crew.length} kişi öldü`, 'bad')
      return
    }
    const live = crew.filter(() => Math.random() < clamp(1.05 - alt / 260, 0.1, 0.9))
    const dead = crew.length - live.length
    if (live.length) {
      const dir = this.toLocal(vO1.copy(from).sub(planet.pos).normalize(), planet, new Vector3())
      this.stranded.push({ planetId: planet.def.id, universe: this.universeId, dir, crew: live })
    }
    this.toast(`${why} Ekip ${planet.def.name}'a düştü: ${dead ? `${dead} kişi öldü` : 'herkes sağ'}${live.length ? `, ${live.length} kişi mahsur — inip kurtar.` : '.'}`)
    this.feed('⚑', `${planet.def.name}: ${live.length} mahsur ekip üyesi`, live.length ? 'bad' : 'bad')
  }

  /** İndiğin gezegende mahsur ekip varsa: konumlarında belirir, sana katılırlar. */
  private rescueStranded(planet: Planet) {
    const here = this.stranded.filter((s) => s.planetId === planet.def.id && s.universe === this.universeId)
    if (!here.length) return
    this.stranded = this.stranded.filter((s) => !here.includes(s))
    let n = 0
    for (const s of here) {
      const w = this.worldDir(s.dir, planet, new Vector3())
      for (const m of s.crew) {
        const dir = this.offsetDir(w, Math.random() * Math.PI * 2, 2 + Math.random() * 3, planet.def.radius, new Vector3())
        const u = this.makeUnit(m.kind, this.originId, false, null, planet, dir)
        u.squad = true
        u.hullMax = m.hullMax
        u.hull = Math.max(1, m.hull)
        n++
      }
    }
    this.toast(`Mahsur kalan ${n} ekip üyesi seni gördü ve sana katılıyor.`)
    this.feed('⚑', `${n} mahsur ekip üyesi kurtarıldı`, 'good')
    this.questEvent('rescue')
  }

  private buildEscorts() {
    this.clearEscorts()
    const n = Math.min(4, Math.ceil(this.squad.length / 2))
    for (let i = 0; i < n; i++) {
      const ship = buildShip(this.originId)
      ship.shield.visible = false
      ship.engineLight.removeFromParent()
      ship.root.scale.multiplyScalar(0.5)
      ship.root.position.copy(this.pos)
      ship.root.quaternion.copy(this.quat)
      this.scene.add(ship.root)
      this.escorts.push(ship.root)
      ship.root.userData.hull = 70
    }
  }

  private clearEscorts() {
    for (const e of this.escorts) {
      e.removeFromParent()
      this.disposeMats(e)
      // Eşlik gemilerinin geometrisi kendine ait: onu da bırak.
      e.traverse((o) => (o as Mesh).geometry?.dispose())
    }
    this.escorts = []
  }

  /** Eşlik gemileri oyuncunun arkasında kanat düzeninde uçar, çatışmada en yakın düşmana ateş eder. */
  private updateEscorts(dt: number) {
    if (!this.escorts.length) return
    const show = this.layer === 'ship' && (this.mode === 'map' || this.mode === 'combat')
    const k = 1 - Math.exp(-5 * dt)
    const target = this.escortOrder === 'saldir' ? (this.pickedTarget?.alive ? this.pickedTarget : this.enemies.find((x) => x.alive) ?? null) : null
    this.escorts.forEach((e, i) => {
      e.visible = show
      const slot = ESCORT_SLOTS[i]
      if (target && this.fighting()) {
        // Saldır: hedefin çevresinde dönerek ateş et.
        const a = this.clockT * 0.9 + i * 1.6
        vA.set(Math.cos(a) * 22, Math.sin(a * 0.7) * 8, Math.sin(a) * 22).add(target.pos)
      } else {
        const spread = this.escortOrder === 'koru' ? 0.55 : 1
        vA.set(slot[0] * spread, slot[1] * spread, slot[2] * spread).applyQuaternion(this.quat).add(this.pos)
      }
      if (e.position.distanceToSquared(this.pos) > 400 * 400) e.position.copy(vA)
      else e.position.lerp(vA, k)
      e.quaternion.slerp(this.quat, k)
    })
    if (!show || this.mode === 'upgrade') return
    this.escortCd -= dt
    if (this.escortCd > 0) return
    this.escortCd = this.escortOrder === 'saldir' ? 0.8 : this.escortOrder === 'koru' ? 1.1 : 1.4
    for (const e of this.escorts) {
      let best: Enemy | null = target
      let bd = 170
      for (const en of this.enemies) {
        if (best === target && target) break
        if (!en.alive) continue
        // Koru: yalnız sana yaklaşanları vurur.
        if (this.escortOrder === 'koru' && en.pos.distanceTo(this.pos) > 70) continue
        const d = en.pos.distanceTo(e.position)
        if (d < bd) {
          bd = d
          best = en
        }
      }
      if (!best) return
      vB.copy(best.pos).sub(e.position).normalize()
      this.spawnShot(true, e.position, vB, (7 + this.squad.length) * (this.escortOrder === 'saldir' ? 1.3 : 1), 'bolt')
    }
  }

  private onLandColony(planet: Planet) {
    const c = this.colonyHere(planet)
    this.clearGround()
    if (!c) return
    c.state = 'idle'
    c.queue = []
    c.attacker = null
    c.countdown = Math.max(c.countdown, 12)
    c.besieged = false
    if (this.raid && this.raid.planetId === c.planetId && this.mine(c)) {
      // Baskına yetiştin: saldırganlar hemen iner.
      const by = this.raid.by
      this.raid = null
      c.countdown = 3
      c.attacker = by
      this.toast(`Yetiştin! ${factionName(by)} saldırısı başlıyor; savun.`)
    }
    if (!this.mine(c)) {
      // Düşman üssü tüm birlikleriyle hazır bekler.
      const n = Math.floor(Math.min(c.pop, this.capOf(c)))
      let heroes = 0
      for (let i = 0; i < n; i++) {
        const kind = heroes < heroCap(c.level) ? heroKind(heroes) : 'settler'
        if (kind !== 'settler') heroes++
        this.spawnSettler(c, planet, kind)
      }
      this.toast(`${planet.def.name}: ${factionName(c.owner)} üssü — ${n} savunmacı. Hepsini ve taretleri düşürürsen üs teslim olur.`)
    }
    else if (c.kind === 'colony' && c.founded) this.toast(`${planet.def.name}: koloniye döndün. Nüfus ${Math.floor(c.pop)}.`)
    else this.toast(`${planet.def.name}: üssündesin. Sonraki dalga ${Math.ceil(c.countdown)} sn.`)
  }

  private onBoardColony() {
    const c = this.colonyHere()
    const had = this.units.some((u) => u.invader)
    this.clearGround()
    if (c && (c.state === 'wave' || had)) {
      c.state = 'idle'
      c.queue = []
      c.attacker = null
      c.countdown = this.mine(c) ? 18 : BOT_WAVE_GAP
      if (this.mine(c)) this.toast('Dalga yarıda kaldı. Üs seni bekliyor.')
    }
  }

  /** Dar (dikey telefon) ekranda istem tek satırda kalsın: yalnız ilk iki eylem. */
  private footPrompt(): string {
    const text = this.footPromptFull()
    return this.camera.aspect < 1 ? text.split(' · ').slice(0, 2).join(' · ') : text
  }

  private footPromptFull(): string {
    const planet = this.footPlanet
    if (!planet) return ''
    const dep = this.nearDeposit(planet)
    if (dep) return `F / Yumruk — kaz: ${dep.kind === 'ore' ? 'maden' : 'kristal'} yatağı (${dep.left} vuruş kaldı)`
    if (this.nearParkedShip()) {
      const price = this.cheapestUpgrade()
      if (price !== null && this.canUpgrade()) return 'U — gemiye parça tak · L — bin'
      if (price !== null) return `Gemi · sonraki parça: ${this.costText(price)} · L — bin`
    }
    const nearShip = this.pos.distanceTo(this.parkedShip) < 14
    const tail = nearShip ? `L — bin · ${planet.def.name}` : `${planet.def.name} · Boşluk zıpla · F yumruk`
    const c = this.colonyHere(planet)
    if (!c) {
      if (planet.def.landable === false || planet.def.heat) return tail
      const main = Boolean(planet.def.home && this.isHome())
      return `B — ${main ? 'üs kur' : 'karakol kur'} (${main ? BASE_COST_HOME : OUTPOST_COST}) · ${tail}`
    }
    if (!this.mine(c)) return `${factionName(c.owner)} üssü — çekirdeğe vur (F) · ${tail}`
    const near = this.coreDistance(c, planet) <= this.coreReach(c)
    if (near) {
      const act = c.hull < c.hullMax * 0.999 ? `onar (${REPAIR_COST})` : c.level < MAX_LEVEL ? `yükselt (${this.costText(this.colonyUpCost(c.level + 1))})` : 'üs tam'
      const crew = this.units.some((u) => u.alive && u.squad)
      return `B — ${act} · K — ${crew ? 'ekibi bırak' : 'ekip topla'} · T — taret (${TURRET_COST} · ⛏ 2) · ${tail}`
    }
    return `T — taret (${TURRET_COST} · ⛏ 2) · ${tail}`
  }

  private paintBase() {
    const hud = must<HTMLElement>('base-hud')
    const planet = this.footPlanet
    const c = this.layer === 'foot' ? this.colonyHere(planet) : null
    hud.classList.toggle('hidden', !c)
    document.body.classList.toggle('base-on', Boolean(c))
    this.domSet('colony-flag', `Koloni ${this.colonyCount()}`)
    must<HTMLElement>('colony-flag').classList.toggle('hidden', this.colonyCount() === 0)
    this.domSet('res-chip', `⛏ ${this.ore} · ◆ ${this.crystal}`)
    must<HTMLElement>('silent-flag').classList.toggle('hidden', !(this.silent && this.layer === 'ship'))
    const raidEl = must<HTMLElement>('raid-flag')
    raidEl.classList.toggle('hidden', !this.raid)
    if (this.raid) this.domSet('raid-flag', `⚠ ${this.colonies[this.raid.planetId]?.planetName ?? ''} saldırı altında · ${Math.ceil(this.raid.t)} sn`)
    const crew = this.squadSize()
    this.domSet('squad-flag', `Ekip ${crew}`)
    must<HTMLElement>('squad-flag').classList.toggle('hidden', crew === 0)
    const own = c && this.mine(c) && planet && this.coreDistance(c, planet) <= this.coreReach(c) * 2
    document.body.classList.toggle('squad-ready', Boolean(own))
    document.body.classList.toggle('order-ready', this.layer === 'foot' && Boolean((c && this.mine(c)) || crew > 0))
    const sk = skillOf(this.originId)
    const skBtn = document.querySelector<HTMLButtonElement>('#touch-buttons button[data-act="skill"]')
    const skTxt = this.skillCd > 0 ? `${Math.ceil(this.skillCd)} sn` : sk.name
    if (skBtn && skBtn.textContent !== skTxt) skBtn.textContent = skTxt
    this.domSet('skill-chip', this.layer === 'foot' ? (this.skillCd > 0 ? `G · ${sk.name} ${Math.ceil(this.skillCd)} sn` : `G · ${sk.name} hazır`) : '')
    must<HTMLElement>('skill-chip').classList.toggle('hidden', this.layer !== 'foot')
    if (!c) return
    let title: string
    if (!this.mine(c)) title = `${factionName(c.owner)} üssü · sv ${c.level} · düşman`
    else if (c.kind === 'main') title = `Ana üs · sv ${c.level} · rekor dalga ${this.save.bestWave}`
    else title = c.founded ? `Koloni · sv ${c.level}` : `Karakol · kuşatma ${Math.min(c.wave, SIEGE_WAVES)}/${SIEGE_WAVES}`
    this.domSet('base-title', title)
    must<HTMLElement>('base-core-fill').style.width = `${clamp(c.hull / c.hullMax, 0, 1) * 100}%`
    const left = c.queue.length + this.units.filter((u) => u.alive && u.invader).length
    const cap = this.capOf(c)
    let line: string
    if (c.state === 'wave') line = `Dalga ${c.wave + 1} · ${c.attacker ? factionName(c.attacker) : ''} · kalan ${left}`
    else if (this.mine(c)) line = `Sıradaki dalga ${Math.max(0, Math.ceil(c.countdown))} sn`
    else {
      const def = this.units.filter((u) => u.alive && !u.invader && u.colonyId === c.planetId).length
      const tur = c.turrets.filter((t) => t.alive).length
      line = c.besieged ? `Kuşatma · savunmacı ${def} · taret ${tur}` : `Savunmacı ${def} · taret ${tur} — hepsi düşerse teslim olur`
    }
    if (!this.mine(c)) {
      this.domSet('base-line', line)
      return
    }
    const store = this.mine(c) && c.level < MAX_LEVEL && c === this.homeColony() ? ` · Ganimet deposu ${Math.floor(c.store ?? 0)}/${UPGRADE_COST[c.level + 1]}` : ''
    const d = Game.districtOf(c.level)
    const houses = d.filter((b) => b.kind === 'ev').length
    const extra = [c.level >= 2 ? 'Kışla +2 ekip' : '', c.level >= 3 ? 'Atölye −%15 parça' : '', c.level >= 4 ? 'Gözcü +%25 menzil' : ''].filter(Boolean).join(' · ')
    this.domSet('base-line', `${line} · Nüfus ${Math.floor(c.pop)}/${cap} · Taret ${c.turrets.length}/${turretSlots(c.level)}${store} · ${houses} ev${extra ? ' · ' + extra : ''}`)
  }

  /* ---------- Botlar: diğer türlerin üsleri ---------- */

  private botColony(planet: { def: PlanetDef }, owner: OriginId, level: number, rnd: () => number, uid: UniId = this.universeId) {
    const R = planet.def.radius
    const dir = new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5)
    if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0)
    dir.normalize()
    const c = this.newColony(planet, owner, false, level, dir, uid)
    c.founded = true
    c.countdown = BOT_WAVE_GAP * (0.5 + rnd())
    c.pop = settlerCap(level, 0) * 0.75
    const count = Math.min(turretSlots(level), level + 1)
    for (let i = 0; i < count; i++) {
      const d = this.offsetDir(dir, (i / count) * Math.PI * 2 + rnd(), 8 + rnd() * 4, R, new Vector3())
      const lvl = Math.max(1, Math.min(TURRET_MAX_LVL, Math.ceil(level / 2)))
      c.turrets.push({ dir: d, root: new Group(), head: new Group(), cool: rnd(), hull: Math.round(TURRET_HULL * turretLvlMul(lvl)), alive: true, kind: i % 2 === 1 ? 'hava' : 'kara', lvl })
    }
    this.colonies[planet.def.id] = c
    return c
  }

  private seedBotColonies() {
    const uid = this.universeId
    if (this.botSeeded.has(uid)) return
    this.botSeeded.add(uid)
    // Ev sistemleri dünya kurulurken tohumlanır (seedWorld); oyuncunun ev sisteminde başta bot yok.
    if (ORIGINS.some((o) => homeSystem(o.id) === uid)) return
    const rnd = makeRng(hashSeed(`bots:${uid}`))
    const others = ORIGINS.map((o) => o.id).filter((id) => id !== this.originId)
    const homeOwner = ORIGINS.find((o) => homeSystem(o.id) === uid && o.id !== this.originId)
    const homePlanet = this.planets.find((p) => p.def.home)
    if (homeOwner && homePlanet && !this.colonies[homePlanet.def.id]) this.botColony(homePlanet, homeOwner.id, 3, rnd)
    const free = () => this.planets.filter((p) => p.def.landable !== false && !p.def.heat && !p.def.home && !this.colonies[p.def.id])
    const count = Math.floor(rnd() * 3)
    for (let i = 0; i < count; i++) {
      const pool = free()
      if (!pool.length) break
      const planet = pool[Math.floor(rnd() * pool.length)]
      this.botColony(planet, others[Math.floor(rnd() * others.length)], 1 + Math.floor(rnd() * 2), rnd)
    }
  }

  /* ---------- Dünya: türler, ev sistemleri, bot genişlemesi ---------- */

  /** Her tür kendi ev sisteminde, ev gezegeninde karakolla başlar. Oyuncunun sistemi oyuncunun. */
  private seedWorld() {
    for (const o of ORIGINS) {
      const uid = homeSystem(o.id)
      this.botSeeded.add(uid)
      if (o.id === this.originId) continue
      const def = UNIVERSES[uid].planets.find((d) => d.home)
      if (!def || this.colonies[def.id]) continue
      const rnd = makeRng(hashSeed(`world:${uid}`))
      const c = this.botColony({ def }, o.id, BOT_START_LEVEL, rnd, uid)
      c.countdown = BOT_WAVE_GAP
    }
  }

  /** Oyuncunun ev gezegeninde başlangıç karakolu (sv 1, bir taret). */
  private foundStartOutpost(planet: Planet, towardWorld: Vector3) {
    const R = planet.def.radius
    const local = this.toLocal(towardWorld, planet, new Vector3())
    const c = this.newColony(planet, this.originId, true, 1, local)
    c.countdown = 90
    c.store = 0
    this.colonies[planet.def.id] = c
    this.attachColony(c, planet)
    this.addTurret(c, planet, this.offsetDir(local, 0.8, 7, R, new Vector3()))
    this.cleared.add(planet.def.id)
  }

  private homeColony() {
    const list = Object.values(this.colonies).filter((c) => this.mine(c))
    return list.find((c) => c.kind === 'main') ?? list[0] ?? null
  }

  private planetOf(c: Colony) {
    if (c.universe !== this.universeId) return null
    return this.planets.find((p) => p.def.id === c.planetId) ?? null
  }

  private spawnHomePatrols(n: number) {
    const home = this.planets.find((p) => p.def.home)
    const at = home ? home.pos : new Vector3()
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.6
      const r = (home ? home.def.radius : 40) + 110 + Math.random() * 70
      const pos = new Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 30, Math.sin(a) * r).add(at)
      const fleet = this.spawnFleet(1, 0, pos, 'patrol')
      fleet.small = true
      if (home) {
        fleet.around = home
        fleet.offset = pos.clone().sub(home.pos)
      }
    }
  }

  /** Ev sisteminde eğitim gemileri 3-5 arasında tutulur. */
  private keepHomePatrols(dt: number) {
    if (!this.isHome() || this.layer !== 'ship' || !this.tutorialAt('home')) return
    this.homePatrolT -= dt
    const live = this.fleets.filter((f) => f.small).length + this.enemies.filter((e) => e.alive && e.small).length
    this.homePatrols = this.fleets.filter((f) => f.small).length
    if (live >= 1 || this.homePatrolT > 0) return
    this.homePatrolT = 90
    this.spawnHomePatrols(1)
    this.homePatrols++
  }

  nativesLeftOf(planet: Planet) {
    const id = planet.def.id
    if (this.cleared.has(id)) return 0
    const n = this.nativesLeft.get(id)
    if (n !== undefined) return n
    // Kalabalık yerliler: gezegen büyüdükçe daha çok (6–10); hepsi yenilince karakol hemen kurulur.
    const base = clamp(6 + Math.floor(planet.def.radius / 80), 6, 10)
    this.nativesLeft.set(id, base)
    return base
  }

  /** Gemiden yerli kampına ateş: görünen yerli figürü vurulursa bir yerli eksilir. */
  private hitNatives(shot: Shot) {
    if (this.layer !== 'ship') return false
    for (const planet of this.planets) {
      const village = planet.village
      if (!village?.visible || this.cleared.has(planet.def.id) || this.colonies[planet.def.id]) continue
      if (planet.pos.distanceTo(shot.pos) > planet.def.radius + 40) continue
      for (const rig of (village.userData.rigs as Rig[] | undefined) ?? []) {
        if (!rig.root.visible) continue
        rig.root.getWorldPosition(vO1)
        if (distPointSeg(vO1, shot.prev, shot.pos) > 6) continue
        const left = Math.max(0, this.nativesLeftOf(planet) - 1)
        this.nativesLeft.set(planet.def.id, left)
        this.spawnBoom(vO1, 0.7, 0xffb070)
        this.audio.boom()
        this.hitMark = 0.18
        this.addScore(12)
        this.kills++
        if (left <= 0) {
          this.cleared.add(planet.def.id)
          this.toast(`${planet.def.name}: yerli kampı yok edildi. İn ve B ile koloni kur.`)
        } else this.toast(`${planet.def.name}: yerli vuruldu · ${left} kaldı`)
        this.feed('▲', `Gemiden yerli vuruldu (${left} kaldı)`, 'good')
        return true
      }
    }
    return false
  }

  /** Uzaydan bot karakoluna isabet: çekirdeğin canı seviyeyle artar, zırhı hasarı azaltır. */
  aaWarned = false
  private hitOutpost(shot: Shot) {
    if (this.layer !== 'ship') return false
    for (const spot of this.turretSpots) {
      if (!spot.t.alive || !this.colonies[spot.c.planetId]) continue
      if (distPointSeg(spot.pos, shot.prev, shot.pos) < 2.8) {
        spot.t.hull -= shot.dmg
        this.floatDamage(spot.pos, Math.max(1, Math.round(shot.dmg)))
        this.hitMark = 0.18
        this.sparks.burst(spot.pos, 0xffb15a, 8, 7, 0.9, spot.up)
        if (spot.t.hull <= 0) {
          this.destroyTurret(spot.c, spot.t, spot.planet)
          this.fx.explosion(spot.pos, 0xff8a3a, 1.5, spot.up)
          this.feed('◈', `${spot.t.kind === 'hava' ? 'Hava savunma' : 'Kara'} tareti yörüngeden düşürüldü`, 'good')
          if (spot.t.kind === 'hava') this.questEvent('aaDown')
        }
        return true
      }
    }
    for (const spot of this.coreSpots) {
      if (!this.colonies[spot.c.planetId]) continue
      if (distPointSeg(spot.pos, shot.prev, shot.pos) < 4.6) {
        this.damageOutpost(spot.c, spot.planet, shot.dmg, spot.pos, spot.up)
        return true
      }
    }
    return false
  }

  private damageOutpost(c: Colony, planet: Planet, dmg: number, at: Vector3, up: Vector3) {
    const real = dmg * coreArmor(c.level)
    c.hull -= real
    this.floatDamage(at, Math.max(1, Math.round(real)))
    this.hitMark = 0.18
    this.paintCoreBar(c)
    if (c.hull > 0) return
    vO2.copy(at).addScaledVector(up, 10)
    this.spawnBoom(at, 2.4, 0xffa060)
    this.audio.boom()
    this.dropLoot(vO2, 30 + c.level * 25, 6)
    this.baseLost(c, planet, null)
  }

  /** Uzaydan vurulabilen taretler (düşman üslerinde). */
  turretSpots: { c: Colony; planet: Planet; t: Turret; pos: Vector3; up: Vector3 }[] = []

  /** Hava savunma tareti: menzildeki hedefe (oyuncu gemisi ya da düşman filo) ateş eder. */
  private aaRange(t: Turret) {
    return AA_RANGE * (1 + 0.2 * ((t.lvl ?? 1) - 1))
  }

  /** Kendi hava savunman: gezegene yaklaşan düşman filolarını vurur (filoyu küçültür, sonunda düşürür). */
  private updateOwnAA(dt: number) {
    for (const c of Object.values(this.colonies)) {
      if (!c || c.universe !== this.universeId || !this.mine(c)) continue
      const planet = this.planetOf(c)
      if (!planet) continue
      for (const t of c.turrets) {
        if (!t.alive || t.kind !== 'hava') continue
        t.cool = Math.max(0, t.cool - dt)
        if (t.cool > 0) continue
        const up = this.worldDir(t.dir, planet, vO1)
        const pos = this.surfacePos(up, planet, 2.6, vO2)
        const range = this.aaRange(t)
        let target: Fleet | null = null
        let bd = range
        for (const f of this.fleets) {
          if (!f.bomber && (!f.faction || !this.hostileToPlayer(f.faction) || f.state === 'leave')) continue
          const d = f.pos.distanceTo(pos)
          if (d < bd) {
            bd = d
            target = f
          }
        }
        if (!target) continue
        const lvl = t.lvl ?? 1
        t.cool = 1.1 / (1 + 0.25 * (lvl - 1)) * (c.posture === 'savunma' ? 0.8 : 1)
        this.tracers.fire(pos, target.pos, 0x6af0ff, 0.25, 0.2)
        this.fx.flash(target.pos, 0x6af0ff, 2.2, 0.18)
        if (this.pos.distanceTo(pos) < 200) this.audio.turret(true, 0.5)
        const hp = ((target.root.userData.aa as number | undefined) ?? 0) + 10 * turretLvlMul(lvl)
        target.root.userData.aa = hp
        if (hp >= 45) {
          target.root.userData.aa = 0
          target.count--
          this.fx.explosion(target.pos, 0xff8a3a, 1.4)
          this.feed('◈', `Hava savunman bir ${target.faction ? factionName(target.faction) : 'düşman'} gemisini düşürdü`, 'good')
          if (target.count <= 0) {
            this.removeFleet(target)
            this.questEvent('aaKill')
          }
        }
      }
    }
  }

  /** Bot karakolları yakındaki oyuncu gemisine ateş eder; seviye arttıkça daha sık ve sert.
   *  Hava savunma taretleri de menzildeki gemiye ateş eder; uzaydan vurularak düşürülebilirler. */
  private updateOutpostGuns(dt: number) {
    this.coreSpots.length = 0
    this.turretSpots.length = 0
    if (this.mode === 'map') this.updateOwnAA(dt)
    if (this.layer !== 'ship') return
    for (const c of Object.values(this.colonies)) {
      if (c.universe !== this.universeId || this.mine(c) || !c.core) continue
      const planet = this.planetOf(c)
      if (!planet) continue
      const up = this.worldDir(c.dir, planet, new Vector3())
      const pos = this.surfacePos(up, planet, 2.2, new Vector3())
      this.coreSpots.push({ c, planet, pos, up })
      for (const t of c.turrets) {
        if (!t.alive) continue
        const tu = this.worldDir(t.dir, planet, new Vector3())
        const tp = this.surfacePos(tu, planet, 1.8, new Vector3())
        this.turretSpots.push({ c, planet, t, pos: tp, up: tu })
        if (t.kind !== 'hava' || this.mode !== 'map') continue
        const td = tp.distanceTo(this.pos)
        if (td > this.aaRange(t)) continue
        t.cool = Math.max(0, t.cool - dt)
        if (t.cool > 0) continue
        const lvl = t.lvl ?? 1
        t.cool = Math.max(0.5, 1.5 - 0.25 * lvl)
        vO1.copy(this.pos).addScaledVector(this.vel, td / 140).sub(tp)
        vO1.x += (Math.random() - 0.5) * 4
        vO1.y += (Math.random() - 0.5) * 3
        vO1.z += (Math.random() - 0.5) * 4
        if (vO1.lengthSq() < 1e-4) continue
        vO1.normalize()
        this.spawnShot(false, tp, vO1, (4 + 2 * c.level) * turretLvlMul(lvl), 'bolt')
        this.audio.laser(true)
        if (!this.aaWarned) {
          this.aaWarned = true
          this.toast('Hava savunma tareti ateş ediyor! Yörüngeden vurup düşür ya da menzilinden (~130) çık.')
        }
      }
      const d = pos.distanceTo(this.pos)
      if (d > 95) continue
      c.shipCool = (c.shipCool ?? 1.2) - dt
      if (c.shipCool > 0) continue
      c.shipCool = Math.max(0.55, 2.4 - 0.3 * c.level)
      vO1.copy(this.pos).addScaledVector(this.vel, d / 128).sub(pos)
      vO1.x += (Math.random() - 0.5) * 3
      vO1.y += (Math.random() - 0.5) * 2
      vO1.z += (Math.random() - 0.5) * 3
      if (vO1.lengthSq() < 1e-4) continue
      vO1.normalize()
      this.spawnShot(false, pos, vO1, 3 + 2.2 * c.level, 'bolt')
      this.audio.laser(true)
    }
  }

  private hostileNear(reach: number) {
    for (const l of this.locals) if (l.alive && !l.friendly && l.root.position.distanceTo(this.pos) < reach) return true
    for (const u of this.units) if (u.alive && this.hostileToPlayer(u.faction) && u.root.position.distanceTo(this.pos) < reach + u.spec.radius) return true
    return false
  }

  /** En ucuz açık geliştirmenin fiyatı; hepsi tam ise null. */
  private cheapestUpgrade() {
    let best: Cost | null = null
    for (const sl of SLOTS) {
      if (this.up[sl.id] >= 5) continue
      const c = this.partCost(this.up[sl.id] + 1)
      if (best === null || c.energy < best.energy) best = c
    }
    return best
  }

  private canUpgrade() {
    return SLOTS.some((sl) => this.up[sl.id] < 5 && this.canPay(this.partCost(this.up[sl.id] + 1)))
  }

  /** Gemi geliştirme yalnız yüzeyde, park edilmiş geminin yanında yapılır. */
  private nearParkedShip(reach = 9) {
    return this.layer === 'foot' && Boolean(this.footPlanet) && this.pos.distanceTo(this.parkedShip) < reach
  }

  private openUpgrades() {
    if (this.mode !== 'map' && this.mode !== 'pause') return
    if (!this.nearParkedShip()) {
      if (this.mode === 'pause') this.resume()
      this.toast(this.layer === 'foot' ? 'Gemine yürü; yanındayken U ile parça tak.' : 'Gemiye parça takmak için bir gezegene in, gemine yürü ve U\'ya bas.')
      return
    }
    if (this.enemies.some((e) => e.alive)) {
      this.toast('Savaş sürerken geliştirme yok.')
      if (this.mode === 'pause') this.resume()
      return
    }
    this.mode = 'upgrade'
    this.input.exitLock()
    this.renderUpgrades()
  }

  private razedLocked(id: string) {
    const t = this.razed.get(id)
    return t !== undefined && this.properTime - t < RAZE_LOCK
  }

  private standingOn(id: string) {
    return this.layer === 'foot' && this.footPlanet?.def.id === id
  }

  private freeDefs(uid: UniId, allowHome: boolean) {
    return UNIVERSES[uid].planets.filter(
      (d) => d.landable !== false && !d.heat && (allowHome || !d.home) && !this.colonies[d.id] && !this.standingOn(d.id) && !this.razedLocked(d.id),
    )
  }

  private botNotice(uid: UniId, msg: string) {
    if (uid === this.universeId || uid === homeSystem(this.originId)) this.toast(msg)
  }

  private botFound(def: PlanetDef, uid: UniId, owner: OriginId, level: number) {
    const c = this.botColony({ def }, owner, level, Math.random, uid)
    c.countdown = BOT_WAVE_GAP
    if (uid === this.universeId) {
      const planet = this.planetOf(c)
      if (planet) this.attachColony(c, planet)
    }
    this.botNotice(uid, `${factionName(owner)} ${def.name} gezegeninde karakol kurdu.`)
    return c
  }

  /** Bot zamanlayıcısı: her turda iki tür hamle yapar. */
  private botEvent() {
    const factions = ORIGINS.map((o) => o.id).filter((id) => id !== this.originId)
    for (let k = 0; k < 2; k++) this.botMove(factions[Math.floor(Math.random() * factions.length)])
  }

  /** Bir türün hamlesi: önce kendi sistemini karakollaştırır, sonra geliştirir, sonra solucan deliğinden baskın yapar. */
  private botMove(f: OriginId) {
    const own = Object.values(this.colonies).filter((c) => c.owner === f)
    if (!own.length) return
    const home = homeSystem(f)
    const playerHome = homeSystem(this.originId)
    const early = this.properTime < HOME_GRACE
    const atHome = own.filter((c) => c.universe === home)
    const free = this.freeDefs(home, true)
    const roll = Math.random()
    if (atHome.length < 3 && free.length && roll < 0.6) {
      this.botFound(free[Math.floor(Math.random() * free.length)], home, f, 1)
      return
    }
    const grow = own.filter((c) => c.level < 4 && !this.standingOn(c.planetId)).sort((a, b) => a.level - b.level)
    if (grow.length && roll < 0.8) {
      const c = grow[0]
      c.level++
      c.hullMax = coreHullMax(c.level)
      c.hull = c.hullMax
      const planet = this.planetOf(c)
      if (planet) this.attachColony(c, planet)
      this.botNotice(c.universe, `${factionName(f)} ${c.planetName} karakolunu büyüttü (sv ${c.level}).`)
      return
    }
    const from = [...new Set(own.map((c) => c.universe))]
    const targets = new Set<UniId>()
    for (const u of from) for (const h of UNIVERSES[u].holes) if (h.kind === 'worm' && h.to) targets.add(h.to)
    const list = [...targets].filter((u) => !(u === playerHome && early))
    if (!list.length) return
    const uid = list[Math.floor(Math.random() * list.length)]
    const open = this.freeDefs(uid, uid !== playerHome)
    const victims = Object.values(this.colonies).filter((c) => c.universe === uid && c.owner !== f && !this.mine(c) && !this.standingOn(c.planetId))
    if (open.length && (!victims.length || Math.random() < 0.5)) {
      this.botFound(open[Math.floor(Math.random() * open.length)], uid, f, 1)
      return
    }
    if (!victims.length) return
    const v = victims[Math.floor(Math.random() * victims.length)]
    const best = own.reduce((m, c) => Math.max(m, c.level * 2 + c.turrets.length), 0)
    const sa = best + 1
    const sb = v.level * 2 + v.turrets.length
    if (Math.random() < sa / (sa + sb)) {
      this.flipOwner(v, this.planetOf(v), f)
      this.botNotice(uid, `${factionName(f)} baskınla ${v.planetName} karakolunu ele geçirdi.`)
    } else v.hull = Math.max(1, v.hull - v.hullMax * 0.3)
  }

  /** Kışla eğitimi: kuyruktaki asker süresi dolunca nüfusa ve ana karakter sınırına eklenir. */
  private trainTick(c: Colony, dt: number) {
    if ((c.cmdT ?? 0) > 0) {
      c.cmdT = (c.cmdT ?? 0) - dt * (c.posture === 'saldiri' ? 2 : 1)
      if (c.cmdT <= 0) {
        c.cmdT = 0
        c.cmdWaiting = 1
        if (this.mine(c)) this.feed('★', `${c.planetName}: komutan hazır (üsse gelince ekibe al: K)`, 'good')
      }
    }
    if (!c.trainQ) return
    c.trainT = (c.trainT ?? TRAIN_TIME) - dt * (c.posture === 'saldiri' ? 2 : 1)
    if (c.trainT > 0) return
    c.trainQ--
    c.trainT = TRAIN_TIME
    c.trained = Math.min(trainCap(c.level), (c.trained ?? 0) + 1)
    c.pop = Math.min(this.capOf(c), c.pop + 1)
    if (this.mine(c)) this.feed('⚔', `${c.planetName}: kışlada bir asker hazır`, 'good')
  }

  /** Komutan yetiştir (kışla sv3+, koloni başına bir). */
  trainCommander(c: Colony) {
    if (!this.mine(c)) return false
    if (c.level < 3) {
      this.toast('Komutan için üs seviye 3 gerekir.')
      return false
    }
    const has = (c.cmdT ?? 0) > 0 || (c.cmdWaiting ?? 0) > 0 || this.units.some((u) => u.alive && u.kind === 'commander' && u.colonyId === c.planetId) || this.squad.some((m) => m.kind === 'commander')
    if (has) {
      this.toast('Bu koloninin zaten bir komutanı var (ya da yetişiyor).')
      return false
    }
    if (!this.canPay(COMMANDER_COST)) {
      this.toast(`Komutan: ${this.costText(COMMANDER_COST)}.`)
      return false
    }
    this.energy -= COMMANDER_COST.energy
    this.ore -= COMMANDER_COST.ore
    this.crystal -= COMMANDER_COST.crystal
    c.cmdT = COMMANDER_TIME
    this.audio.ui()
    this.toast(`${c.planetName} kışlası komutan yetiştiriyor (${COMMANDER_TIME} sn). Komutan ekibe katılınca herkes %25 sert vurur.`)
    return true
  }

  /** Kışlada asker eğit (sv2+): enerji + maden, kısa süre. */
  trainSoldier(c: Colony) {
    if (!this.mine(c)) return false
    if (c.level < 2) {
      this.toast('Kışla seviye 2 üste açılır. Üssü yükselt (B).')
      return false
    }
    const queued = (c.trained ?? 0) + (c.trainQ ?? 0)
    if (queued >= trainCap(c.level)) {
      this.toast(`Kışla dolu (${trainCap(c.level)} eğitimli asker). Üssü yükselt ya da asker kaybedince yeniden eğit.`)
      return false
    }
    if (!this.canPay(TRAIN_COST)) {
      this.toast(`Asker eğitimi: ${this.costText(TRAIN_COST)}.`)
      return false
    }
    this.energy -= TRAIN_COST.energy
    this.ore -= TRAIN_COST.ore
    c.trainQ = (c.trainQ ?? 0) + 1
    if (!c.trainT || c.trainT <= 0) c.trainT = TRAIN_TIME
    this.audio.ui()
    this.toast(`${c.planetName} kışlası: asker eğitiliyor (${Math.ceil(c.trainT / (c.posture === 'saldiri' ? 2 : 1))} sn).`)
    this.questEvent('train')
    return true
  }

  setPosture(c: Colony, p: Posture) {
    if (!this.mine(c)) return
    c.posture = p
    c.order = postureOrder(p)
    const info = POSTURES.find((x) => x.id === p)
    this.toast(`${c.planetName}: ${info?.name}. ${info?.blurb ?? ''}`)
    this.audio.ui()
    this.questEvent('order')
    // Yüklü üste işçi/asker dengesi yeniden kurulur: fazla işçiler askere döner (ve tersi) bir sonraki doğumda.
    if (this.standingOn(c.planetId)) {
      const plan = this.colonyPlan(c)
      const ws = this.units.filter((u) => u.alive && !u.squad && u.colonyId === c.planetId && u.kind === 'worker')
      for (const w of ws.slice(plan.workers)) this.retype(w, 'settler')
      const ss = this.units.filter((u) => u.alive && !u.squad && u.colonyId === c.planetId && u.kind === 'settler')
      for (const x of ss.slice(0, Math.max(0, plan.workers - ws.length))) this.retype(x, 'worker')
    }
    this.renderOrders()
  }

  /** Birimin işini değiştir (işçi ↔ asker): aynı yerde yeni gövde. */
  private retype(u: Unit, kind: SettlerKind) {
    const c = this.colonies[u.colonyId]
    const planet = this.footPlanet
    if (!c || !planet) return
    u.alive = false
    this.flash.forget(u.root)
    this.mapRoot.remove(u.root)
    this.disposeMats(u.root)
    this.makeUnit(kind, c.owner, false, c, planet, u.dir.clone())
  }

  private accrueIncome(dt: number) {
    this.workerHaul.t += dt
    if (this.workerHaul.t > 20) {
      this.workerHaul.t = 0
      const h = this.workerHaul
      if (h.ore + h.crystal > 0) this.feed('⛏', `İşçiler taşıdı: +${h.ore} maden${h.crystal ? ` · +${h.crystal} kristal` : ''}`, 'good')
      h.ore = 0
      h.crystal = 0
    }
    let rate = 0
    for (const c of Object.values(this.colonies)) {
      // Nüfus, gezegen yüklü olmasa da seviyeye göre büyür.
      c.pop = Math.min(this.capOf(c), c.pop + popGrowth(c.level) * dt)
      this.trainTick(c, dt)
      if (!this.mine(c)) continue
      if (c.kind === 'main') rate += 0.08 + 0.05 * c.level
      else if (c.founded) rate += 0.14 + 0.02 * c.turrets.length
    }
    // Koloniler gezegenlerinin kaynağını üretir (dakikada bir, seviyeyle artar).
    this.resAcc += dt
    if (this.resAcc >= 60) {
      this.resAcc = 0
      let ore = 0
      let cry = 0
      for (const c of Object.values(this.colonies)) {
        if (!c || !this.mine(c) || !c.founded) continue
        const def = UNIVERSES[c.universe]?.planets.find((p) => p.id === c.planetId)
        if (!def) continue
        const y = planetYield(planetLook(def, c.universe))
        ore += y.ore * c.level
        cry += y.crystal * Math.ceil(c.level / 2)
        // Uzaktaki koloninin işçileri de çalışır (yanındaysan işçiler yatakları gerçekten taşır).
        if (!this.standingOn(c.planetId)) {
          const w = this.colonyPlan(c).workers
          ore += Math.round(w * WORKER_RATE.ore)
          cry += Math.round(w * WORKER_RATE.crystal)
        }
      }
      if (ore + cry > 0) {
        this.ore += ore
        this.crystal += cry
        this.feed('⛏', `Kolonilerin üretti: +${ore} maden${cry ? ` · +${cry} kristal` : ''}`, 'good')
      }
    }
    this.botT -= dt
    if (this.botT <= 0) {
      this.botT = BOT_TICK
      this.botEvent()
    }
    if (rate <= 0) return
    this.incomeAcc += rate * dt
    if (this.incomeAcc >= 1) {
      const whole = Math.floor(this.incomeAcc)
      this.incomeAcc -= whole
      this.energy += whole
    }
  }

  private expose() {
    const game = this
    const api = {
      get mode() {
        return game.mode
      },
      get forceAim() {
        return game.forceAim
      },
      set forceAim(v: boolean) {
        game.forceAim = v
      },
      get autoFire() {
        return game.autoFire
      },
      set autoFire(v: boolean) {
        game.autoFire = v
      },
      snap: () => ({
        mode: game.mode,
        fading: game.fading,
        pos: [game.pos.x, game.pos.y, game.pos.z],
        speed: game.vel.length(),
        vis: game.vis,
        hull: game.hull,
        shield: game.shield,
        energy: game.energy,
        score: game.score,
        best: game.best,
        fleets: game.fleets.length,
        enemies: game.enemies.length,
        alive: game.enemies.filter((e) => e.alive).length,
        fragments: game.frags.filter((f) => f.alive).length,
        tf: game.tf,
        cam: game.camMode,
        fps: game.fps,
        fights: game.fights,
        kills: game.kills,
        introT: game.introT,
        intro: game.dom.introText.textContent,
        upgrades: { ...game.up },
        easy: game.save.settings.easy,
        origin: game.originId,
        universe: game.universeId,
        stunned: game.enemies.filter((e) => e.alive && e.stun > 0).length,
        well: game.wellLife,
        enemyWells: game.enemyWells.filter((well) => well.alive).length,
        attacks: game.enemies.map((enemy) => enemy.attack),
        humans: game.enemies.filter((e) => e.human).length,
        layer: game.layer,
        weapon: game.weapon,
        owned: [...game.owned],
        home: homeSystem(game.originId),
        atHome: game.universeId === homeSystem(game.originId),
        heat: game.heat,
        regen: game.regenRate(),
        threat: game.threatMul(),
        net: document.getElementById('netmap')?.textContent ?? '',
        ys: game.planets.map((p) => Math.round(p.pos.y)),
        power: game.powerT,
        footAlt: game.footAlt,
        planets: game.planets.map((p) => ({ id: p.def.id, kind: p.def.kind, name: p.def.name, landable: p.def.landable !== false && !p.def.heat })),
        worms: game.holes.filter((h) => h.kind === 'worm').map((h) => h.to),
        pois: game.pois.length,
        giants: game.enemies.filter((e) => e.alive && e.giant).length,
        giantHull: Math.max(0, ...game.enemies.filter((e) => e.giant).map((e) => e.hullMax)),
        normalHull: Math.max(0, ...game.enemies.filter((e) => !e.giant).map((e) => e.hullMax), 0),
        bars: game.enemies.filter((e) => e.giant && e.bar).length,
        gates: game.enemyGates.filter((g) => g.alive).length,
        colonies: Object.values(game.colonies).map((c) => ({
          id: c.planetId,
          kind: c.kind,
          level: c.level,
          hull: c.hull,
          hullMax: c.hullMax,
          wave: c.wave,
          state: c.state,
          founded: c.founded,
          turrets: c.turrets.length,
          countdown: c.countdown,
        })),
        invaders: game.units.filter((i) => i.alive && i.invader).length,
        settlers: game.units.filter((i) => i.alive && !i.invader).length,
        pops: Object.values(game.colonies).map((c) => ({ id: c.planetId, owner: c.owner, level: c.level, pop: c.pop, cap: this.capOf(c) })),
        walkerLook: game.walkerLook,
        locals: game.locals.filter((l) => l.alive).length,
        queued: Object.values(game.colonies).reduce((n, c) => n + c.queue.length, 0),
        bestWave: game.save.bestWave,
        skirmish: game.skirmish,
        enemyHulls: game.enemies.map((e) => (e.alive ? Math.round(e.hull + e.shield) : -1)),
        enemiesAlive: game.enemies.filter((e) => e.alive).length,
        smallEnemies: game.enemies.filter((e) => e.alive && e.small).length,
        loot: game.loot.filter((l) => l.alive).length,
        smallFleets: game.fleets.filter((f) => f.small).length,
        fleetCount: game.fleets.length,
        homeColony: (() => {
          const c = game.homeColony()
          return c ? { id: c.planetId, universe: c.universe, level: c.level, store: c.store ?? 0, kind: c.kind, pop: c.pop } : null
        })(),
        startPlanet: game.planets.find((p) => p.def.home)?.def.id ?? null,
        distHome: (() => {
          const p = game.planets.find((x) => x.def.home)
          return p ? p.pos.distanceTo(game.pos) - p.def.radius : -1
        })(),
        properTime: game.properTime,
      }),
      worldColonies: () =>
        Object.values(game.colonies).map((c) => ({
          id: c.planetId,
          owner: c.owner,
          universe: c.universe,
          level: c.level,
          hull: c.hull,
          hullMax: c.hullMax,
          kind: c.kind,
          mine: game.mine(c),
          home: Boolean(UNIVERSES[c.universe].planets.find((d) => d.id === c.planetId)?.home),
        })),
      homeOf: (id: OriginId) => homeSystem(id),
      origins: () => ORIGINS.map((o) => o.id),
      botTick: (n = 1) => {
        for (let i = 0; i < n; i++) game.botEvent()
        return Object.values(game.colonies).filter((c) => !game.mine(c)).length
      },
      addTime: (sec: number) => {
        game.properTime += sec
      },
      collectLoot: (v: number) => game.collectLoot(v),
      lootPositions: () => game.loot.filter((l) => l.alive).map((l) => l.pos.distanceTo(game.pos)),
      stepMap: (n: number, dt = 1 / 60) => {
        for (let i = 0; i < n; i++) game.updateMap(dt)
        return game.mode
      },
      shootOutpost: (id: string, dmg: number) => {
        game.updateOutpostGuns(0)
        const spot = game.coreSpots.find((s) => s.c.planetId === id)
        if (!spot) return null
        game.damageOutpost(spot.c, spot.planet, dmg, spot.pos, spot.up)
        const c = game.colonies[id]
        return c ? { hull: c.hull, hullMax: c.hullMax, alive: true } : { hull: 0, hullMax: 0, alive: false }
      },
      flyTo: (id: string, alt = 30) => {
        const planet = game.planets.find((p) => p.def.id === id)
        if (!planet) return false
        game.fadeToken++
        game.fading = false
        game.dom.fade.classList.remove('on')
        game.mode = 'map'
        game.layer = 'ship'
        game.footPlanet = null
        const c = game.colonies[id]
        const up = c ? game.worldDir(c.dir, planet, new Vector3()) : new Vector3(0, 1, 0)
        game.pos.copy(planet.pos).addScaledVector(up, planet.def.radius + alt)
        game.vel.set(0, 0, 0)
        quatFromForward(game.quat, vA.copy(planet.pos).sub(game.pos).normalize())
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        return true
      },
      razedLocked: (id: string) => game.razedLocked(id),
      gotoLoot: () => {
        const l = game.loot.find((x) => x.alive)
        if (!l) return false
        game.pos.copy(l.pos).add(new Vector3(0, 0, 20))
        game.vel.set(0, 0, 0)
        return true
      },
      colonyPop: (id: string) => {
        const c = game.colonies[id]
        return c ? { pop: c.pop, cap: this.capOf(c), level: c.level, store: c.store ?? 0 } : null
      },
      locals: () => game.locals.filter((l) => l.alive).length,
      planetPos: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        return planet ? { x: planet.pos.x, y: planet.pos.y, z: planet.pos.z, r: planet.def.radius, landable: planet.def.landable !== false && !planet.def.heat } : null
      },
      stepWorld: (n: number, dt = 1 / 60) => {
        for (let i = 0; i < n && game.mode === 'map'; i++) {
          game.clockT += dt
          game.updateMap(dt)
        }
        return { alive: game.enemies.filter((e) => e.alive).length, fleets: game.fleets.length, layer: game.layer }
      },
      localsDebug: () => game.locals.map((l) => ({ alive: l.alive, hull: l.hull, friendly: l.friendly, d: Math.round(l.root.position.distanceTo(game.pos) * 100) / 100 })),
      steerProbe: (mouseY: number, frames: number, easy: boolean) => {
        const was = game.save.settings.easy
        game.save.settings.easy = easy
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        const fwd = new Vector3()
        const up0 = new Vector3()
        const up1 = new Vector3()
        let maxRoll = 0
        let camFlip = 0
        shipUp(game.quat, up0)
        for (let i = 0; i < frames; i++) {
          game.input.mouseY = mouseY
          game.steer(1 / 60)
          game.input.mouseY = 0
          game.updateCamera(1 / 60)
          shipForward(game.quat, fwd)
          shipUp(game.quat, up1)
          // yuvarlanma değişimi: önceki "yukarı"nın ileri eksen etrafındaki dönüşü
          const a = up0.clone().addScaledVector(fwd, -up0.dot(fwd))
          if (a.lengthSq() > 1e-8) {
            a.normalize()
            const roll = Math.acos(Math.max(-1, Math.min(1, a.dot(up1)))) * 57.3
            maxRoll = Math.max(maxRoll, roll)
          }
          if (game.camera.up.dot(up1) < 0) camFlip++
          up0.copy(up1)
        }
        game.save.settings.easy = was
        shipForward(game.quat, fwd)
        return { maxRollDegPerFrame: Math.round(maxRoll * 100) / 100, cameraUpsideDownFrames: camFlip, noseY: Math.round(fwd.y * 1000) / 1000 }
      },
      routeNextGate: () => (game.route ? game.nextGate(game.universeId, game.route.system) : null),
      hops: (goal: UniId, from?: UniId) => game.hopsTo(goal, from ?? game.universeId),
      cruise: () => Math.round(game.openCap()),
      gates: () => Object.fromEntries((Object.keys(UNIVERSES) as UniId[]).map((id) => [id, UNIVERSES[id].holes.filter((h) => h.kind === 'worm').map((h) => h.to)])),
      radarMode: () => game.radarMode,
      toggleRadar: () => game.toggleRadar(),
      routeHome: () => game.routeHome(),
      villageLife: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        const rigs = (planet?.village?.userData.rigs as Rig[] | undefined) ?? []
        return { rigs: rigs.length, visible: rigs.filter((r) => r.root.visible).length }
      },
      shipGap: () => {
        const planet = game.footPlanet
        if (!planet) return null
        return { surface: game.parkedShip.distanceTo(planet.pos) - planet.def.radius, walker: game.parkedShip.distanceTo(game.pos), visual: game.visual.root.position.distanceTo(game.parkedShip) }
      },
      fleetAlt: () => {
        const planet = game.footPlanet
        if (!planet) return null
        return game.fleets.map((f) => f.pos.distanceTo(planet.pos) - planet.def.radius)
      },
      skyOnCamera: () => game.sky.position.distanceTo(game.camera.position) < 1e-6,
      mapLimit: () => game.mapLimit,
      landOnId: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        if (!planet) return false
        game.fadeToken++
        game.fading = false
        game.ending = false
        game.dom.fade.classList.remove('on')
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        game.pos.copy(planet.pos).add(new Vector3(0, planet.def.radius + 14, 0))
        game.vel.set(0, 0, 0)
        game.applyPresentation()
        return game.land()
      },
      giveEnergy: (n: number) => {
        game.energy += n
        game.ore += Math.round(n / 20)
        game.crystal += Math.round(n / 100)
      },
      setLevel: (level: number, fillPop = true) => {
        const c = game.colonyHere()
        const planet = game.footPlanet
        if (!c || !planet) return false
        c.level = level
        c.hullMax = coreHullMax(level)
        c.hull = c.hullMax
        if (fillPop) c.pop = settlerCap(level, c.turrets.length)
        game.attachColony(c, planet)
        return true
      },
      botColonies: () =>
        Object.values(game.colonies)
          .filter((c) => !game.mine(c))
          .map((c) => ({ id: c.planetId, owner: c.owner, level: c.level, turrets: c.turrets.length, universe: c.universe })),
      conquer: () => {
        const planet = game.footPlanet
        const c = game.colonyHere()
        if (!planet || !c || game.mine(c)) return false
        const R = planet.def.radius
        for (let i = 0; i < 400 && game.colonyHere(); i++) {
          const core = game.worldDir(c.dir, planet, new Vector3())
          const d = game.offsetDir(core, 0.7, 4.6, R, new Vector3())
          game.pos.copy(planet.pos).addScaledVector(d, R + game.footAlt)
          game.footForward.copy(core).addScaledVector(d, -d.dot(core)).normalize()
          game.hull = 100
          game.shield = 52
          game.punchCd = 0
          game.input.mouseDown = true
          game.updateFoot(1 / 60)
          game.input.mouseDown = false
        }
        return !game.colonyHere()
      },
      foundBase: () => game.foundBase(),
      squadAction: () => game.squadAction(),
      landHere: () => game.land(),
      landBase: () => game.land(true),
      squadInfo: () => {
        const ground = game.units.filter((u) => u.alive && u.squad)
        const c = game.colonyHere()
        return {
          ship: game.squad.length,
          ground: ground.length,
          heroes: (game.layer === 'ship' ? game.squad.map((m) => m.kind) : ground.map((u) => u.kind)).filter((k) => isHero(k)).length,
          escorts: game.escorts.length,
          escortGap: game.escorts.length ? Math.round(Math.max(...game.escorts.map((e) => e.position.distanceTo(game.pos)))) : 0,
          invader: ground.some((u) => u.invader),
          colony: c ? { owner: c.owner, mine: game.mine(c), pop: c.pop, hull: c.hull, besieged: Boolean(c.besieged), turrets: c.turrets.filter((t) => t.alive).length, units: game.units.filter((u) => u.alive && u.colonyId === c.planetId && !u.invader).length } : null,
          locals: game.locals.filter((l) => l.alive).length,
          ready: document.body.classList.contains('squad-ready'),
          chip: document.getElementById('squad-flag')?.textContent ?? '',
        }
      },
      toShip: () => {
        const planet = game.footPlanet
        if (!planet) return false
        const d = new Vector3().copy(game.parkedShip).sub(planet.pos).normalize()
        game.pos.copy(planet.pos).addScaledVector(d, planet.def.radius + game.footAlt)
        return true
      },
      toCore: (gap = 5) => {
        const planet = game.footPlanet
        const c = game.colonyHere()
        if (!planet || !c) return false
        const core = game.worldDir(c.dir, planet, new Vector3())
        const d = game.offsetDir(core, 0.7, gap, planet.def.radius, new Vector3())
        game.pos.copy(planet.pos).addScaledVector(d, planet.def.radius + game.footAlt)
        return true
      },
      killLocals: () => {
        const planet = game.footPlanet
        if (!planet) return 0
        let n = 0
        for (const l of game.locals) {
          if (!l.alive || l.friendly) continue
          game.hitLocal(l, 9999, planet, undefined, 'player')
          n++
        }
        return n
      },
      weakenDefenders: () => {
        const c = game.colonyHere()
        if (!c) return 0
        let n = 0
        for (const u of game.units) {
          if (u.alive && !u.invader && u.colonyId === c.planetId) {
            u.hull = 1
            n++
          }
        }
        for (const t of c.turrets) if (t.alive) t.hull = 1
        return n
      },
      questInfo: () => ({ idx: game.questIdx, id: game.quest().id, title: document.getElementById('q-title')?.textContent ?? '', route: game.route, mark: !document.getElementById('quest-mark')?.classList.contains('hidden') }),
      questSet: (i: number) => game.questStart(i, true),
      airtime: () => {
        if (game.layer !== 'foot') return -1
        for (let i = 0; i < 30; i++) game.updateFoot(1 / 60)
        game.jumpBuf = 99
        let n = 0
        game.updateFoot(1 / 60)
        while (!game.grounded && n < 3600) {
          game.updateFoot(1 / 60)
          n++
        }
        return n / 60
      },
      walkInto: () => {
        // En yakın yapının merkezine doğru 6 sn yürü; sonunda yapının çarpışma dairesinin dışında mıyız?
        const planet = game.footPlanet
        if (!planet || !planet.features.length) return null
        const f = planet.features[0]
        const R = planet.def.radius
        const w = f.dir.clone().applyQuaternion(planet.mesh.quaternion)
        const start = w.clone()
        game.slideAway(start, w, f.r * R + 12, R)
        game.pos.copy(planet.pos).addScaledVector(start, R + game.footAlt)
        for (let i = 0; i < 360; i++) {
          const d = game.pos.clone().sub(planet.pos).normalize()
          const want = w.clone().addScaledVector(d, -w.dot(d)).normalize()
          game.footView.copy(want)
          game.footForward.copy(want)
          game.input.stickY = 1
          game.updateFoot(1 / 60)
        }
        game.input.stickY = 0
        const d = game.pos.clone().sub(planet.pos).normalize()
        return { gap: (d.angleTo(w) - f.r) * R, r: f.r * R }
      },
      nativeShot: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        const rigs = (planet?.village?.userData.rigs as Rig[] | undefined) ?? []
        if (!planet) return null
        game.updateLod()
        const rig = rigs.find((r) => r.root.visible)
        if (!rig) return { before: game.nativesLeftOf(planet), after: -1 }
        const before = game.nativesLeftOf(planet)
        const at = rig.root.getWorldPosition(new Vector3())
        const up = at.clone().sub(planet.pos).normalize()
        const from = at.clone().addScaledVector(up, 30)
        game.pos.copy(from).addScaledVector(up, 4)
        game.spawnShot(true, from, up.clone().negate(), 20, 'laser')
        for (let i = 0; i < 20; i++) game.updateShots(1 / 60)
        return { before, after: game.nativesLeftOf(planet) }
      },
      nativesLeft: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        return planet ? game.nativesLeftOf(planet) : -1
      },
      camProbe: (frames: number, turn: number) => {
        // Gemi hızla döner; kamera-gemi uzaklığı ve kare başına kamera sıçraması ölçülür.
        game.camMode = 'chase'
        let maxJump = 0
        let minD = 1e9
        let maxD = 0
        const prev = game.camera.position.clone()
        for (let i = 0; i < frames; i++) {
          const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), turn * (i % 40 < 20 ? 1 : -1))
          game.quat.premultiply(q)
          game.updateCamera(1 / 60)
          const d = game.camera.position.distanceTo(game.pos)
          minD = Math.min(minD, d)
          maxD = Math.max(maxD, d)
          if (i > 0) maxJump = Math.max(maxJump, game.camera.position.distanceTo(prev))
          prev.copy(game.camera.position)
        }
        return { maxJump, minD, maxD }
      },
      toWorm: () => {
        const worm = game.holes.find((h) => h.kind === 'worm' && h.to)
        if (!worm) return null
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        game.transitionLock = 0
        game.pos.copy(worm.pos)
        return game.hazards()
      },
      shipMark: () => !document.getElementById('ship-mark')?.classList.contains('hidden'),
      routeInfo: () => game.route,
      talkedRecently: (fac: string) => game.talkedRecently(fac as OriginId),
      rollProbe: (frames: number) => {
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        const up0 = new Vector3(0, 1, 0).applyQuaternion(game.quat)
        game.input.keys.add('KeyQ')
        for (let i = 0; i < frames; i++) game.steer(1 / 60)
        game.input.keys.delete('KeyQ')
        const up1 = new Vector3(0, 1, 0).applyQuaternion(game.quat)
        for (let i = 0; i < 120; i++) game.steer(1 / 60)
        const up2 = new Vector3(0, 1, 0).applyQuaternion(game.quat)
        return { rolled: up0.angleTo(up1), drift: up1.angleTo(up2) }
      },
      cockpitLag: () => {
        game.camMode = 'cockpit'
        game.mode = 'map'
        game.layer = 'ship'
        game.vel.set(0, 0, -150)
        game.pos.add(new Vector3(0, 0, -2.5))
        game.updateCamera(1 / 60)
        const want = game.pos.clone().addScaledVector(new Vector3(0, 0, -1).applyQuaternion(game.quat), 0.22).addScaledVector(new Vector3(0, 1, 0).applyQuaternion(game.quat), 0.36)
        game.vel.set(0, 0, 0)
        return game.camera.position.distanceTo(want)
      },
      unitTilt: () => {
        let worst = 1
        for (const u of game.units) {
          if (!u.alive) continue
          const up = new Vector3(0, 1, 0).applyQuaternion(u.root.quaternion)
          worst = Math.min(worst, up.dot(u.dir))
        }
        return worst
      },
      parkedAlt: () => {
        const planet = game.footPlanet
        if (!planet) return -1
        return game.parkedShip.distanceTo(planet.pos) - planet.def.radius
      },
      clickNearShip: () => {
        game.input.mouseDown = true
        game.clickWas = false
        game.tryPunch()
        game.input.mouseDown = false
        return game.mode
      },
      depositAudit: () => {
        const bad: string[] = []
        let total = 0
        for (const uid of Object.keys(UNIVERSES) as UniId[]) {
          game.layoutUniverse(uid)
          for (const p of game.planets) {
            if (p.def.landable === false || p.def.heat) continue
            total++
            if (p.deposits.length < 2) bad.push(`${uid}/${p.def.name}(${p.look.biome}):${p.deposits.length}`)
          }
        }
        return { total, bad }
      },
      depositInfo: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        return planet ? { n: planet.deposits.length, beams: planet.deposits.filter((d) => d.obj.getObjectByName('beam')).length } : null
      },
      objective: () => {
        const o = game.objectiveSpot()
        return o ? { local: o.local, d: o.pos.distanceTo(game.pos) } : null
      },
      depMark: () => !document.getElementById('dep-mark')?.classList.contains('hidden'),
      fxCount: () => game.fx.count,
      fxMade: () => game.fx.made,
      perf: () => {
        let objs = 0
        game.scene.traverse(() => objs++)
        const info = game.renderer.info
        return { objs, geo: info.memory.geometries, tex: info.memory.textures, calls: info.render.calls, fx: game.fx.count, pr: game.pr, fps: Math.round(game.fps) }
      },
      dodgeTest: () => {
        game.mode = 'map'
        game.layer = 'ship'
        game.dodgeCd = 0
        game.dodge()
        const h0 = game.hull + game.shield
        game.hurtPlayer(30)
        return { dodgeT: game.dodgeT, lost: h0 - (game.hull + game.shield) }
      },
      cycleTarget: () => {
        game.cycleTarget()
        return Boolean(game.pickedTarget)
      },
      escortOrder: (o: string) => {
        game.escortOrder = o as 'takip' | 'saldir' | 'koru'
        return game.escortOrder
      },
      musicState: () => ({ music: Boolean(game.audio.music), on: game.audio.musicOn }),
      district: (id: string) => {
        const c = game.colonies[id]
        if (!c?.root) return null
        return c.root.children.filter((o) => o.name.startsWith('bina-')).map((o) => o.name)
      },
      baseMark: () => !document.getElementById('base-mark')?.classList.contains('hidden'),
      flyOver: (id: string, arc: number, alt = 40) => {
        const planet = game.planets.find((p) => p.def.id === id)
        const c = game.colonies[id]
        if (!planet || !c) return false
        const core = game.worldDir(c.dir, planet, new Vector3())
        const d = game.offsetDir(core, 1.1, arc, planet.def.radius, new Vector3())
        game.mode = 'map'
        game.layer = 'ship'
        game.footPlanet = null
        game.pos.copy(planet.pos).addScaledVector(d, planet.def.radius + alt)
        game.vel.set(0, 0, 0)
        return true
      },
      coreBlocks: () => {
        const c = game.colonyHere()
        return ((c?.core?.userData.blocks as unknown[]) ?? []).length
      },
      walkToCore: () => {
        // Çekirdeğe doğru 8 sn yürü: anıtın gerçek sınırında durmalı (cam kulenin içine girmemeli).
        const planet = game.footPlanet
        const c = game.colonyHere()
        if (!planet || !c) return null
        const R = planet.def.radius
        const blocks = (c.core?.userData.blocks as { dir: Vector3; r: number }[]) ?? []
        const big = blocks[0]
        if (!big) return null
        const w = big.dir.clone().applyQuaternion(planet.mesh.quaternion)
        const start = w.clone()
        game.slideAway(start, w, big.r + 14, R)
        game.pos.copy(planet.pos).addScaledVector(start, R + game.footAlt)
        for (let i = 0; i < 480; i++) {
          const d = game.pos.clone().sub(planet.pos).normalize()
          const want = w.clone().addScaledVector(d, -w.dot(d)).normalize()
          game.footView.copy(want)
          game.footForward.copy(want)
          game.input.stickY = 1
          game.updateFoot(1 / 60)
        }
        game.input.stickY = 0
        const d = game.pos.clone().sub(planet.pos).normalize()
        return { gap: d.angleTo(w) * R - big.r, r: big.r }
      },
      plazaCap: () => {
        const c = game.colonyHere()
        return Boolean(c?.core?.getObjectByName('plaza-cap')) && Boolean(c?.core?.getObjectByName('plaza-skirt'))
      },
      warWith: (fac: string) => {
        const r = game.relOf(fac as OriginId)
        r.known = true
        r.rel = -70
        r.cool = 0
        game.openDiplo()
        return [...document.querySelectorAll('#diplo-list button')].map((b) => b.textContent)
      },
      hurtShip: (dmg: number) => {
        game.hurtPlayer(dmg)
        return game.shipShake
      },
      setHullFrac: (k: number) => {
        game.hull = game.hullMax * k
      },
      solar: () => ({ gain: game.solarGain, heat: game.heat }),
      solarCharge: (seconds: number, altK: number) => {
        game.layoutUniverse('gunes')
        game.mode = 'map'
        game.layer = 'ship'
        const sun = game.planets.find((p) => p.def.heat)
        if (!sun) return null
        game.pos.copy(sun.pos).add(new Vector3(0, sun.def.radius * (1 + altK), 0))
        game.vel.set(0, 0, 0)
        game.hull = game.hullMax
        game.shield = game.shieldMax
        const e0 = game.energy
        for (let i = 0; i < Math.round(seconds * 60) && game.hull > 15; i++) game.applyHeat(1 / 60)
        return { gained: game.energy - e0, hull: game.hull, shield: game.shield, heat: game.heat }
      },
      coreGap: () => {
        const planet = game.footPlanet
        const c = planet ? game.colonyHere(planet) : null
        if (!planet || !c) return -1
        return game.arc(game.worldDir(c.dir, planet, new Vector3()), game.pos.clone().sub(planet.pos).normalize(), planet.def.radius)
      },
      villageVisible: (id: string) => Boolean(game.planets.find((p) => p.def.id === id)?.village?.visible),
      partCost: (tier: number) => game.partCost(tier),
      forceRaid: () => {
        game.raidT = 0
        game.raidTick(0.016)
        return game.raid ? { ...game.raid } : null
      },
      raidInfo: () => (game.raid ? { ...game.raid } : null),
      spawnTrainers: (n: number) => {
        game.spawnHomePatrols(n)
        game.homePatrols += n
      },
      homeSmallFleets: () => game.fleets.filter((f) => f.small).length,
      roles: () => game.enemies.filter((e) => e.alive).map((e) => e.role ?? (e.giant ? 'dev' : 'normal')),
      cockpitFire: () => {
        game.camMode = 'cockpit'
        game.applyPresentation()
        game.firePrimary()
        return [...game.ckFire]
      },
      beaconCount: () => document.querySelectorAll('#beacons > *').length,
      tutorial: (gates: boolean, brief: boolean) => {
        game.testGates = gates
        game.testBrief = brief
      },
      briefingOn: () => game.briefing,
      briefDbg: () => ({ p: game.briefPending, t: game.briefT, guide: game.save.settings.guide, tb: game.testBrief, mode: game.mode, enc: Boolean(game.encounter), fading: game.fading, en: game.enemies.filter((e) => e.alive).length, photo: game.photo }),
      closeBriefing: () => game.closeBriefing(),
      noTalk: (on: boolean) => {
        game.noTalk = on
      },
      toDeposit: () => {
        const planet = game.footPlanet
        const d = planet?.deposits.find((x) => x.left > 0)
        if (!planet || !d) return null
        // Yatağın biraz yanına koy (dünya yönü = yerel yön × gezegen dönüşü).
        const w = d.dir.clone().applyQuaternion(planet.mesh.quaternion)
        const side = new Vector3(0, 1, 0).cross(w)
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
        w.addScaledVector(side.normalize(), 1.5 / planet.def.radius).normalize()
        game.pos.copy(planet.pos).addScaledVector(w, planet.def.radius + game.footAlt)
        return { kind: d.kind, left: d.left, near: Boolean(game.nearDeposit(planet)) }
      },
      mineHit: () => {
        const planet = game.footPlanet
        if (!planet) return null
        const ok = game.mineDeposit(planet)
        return { ok, ore: game.ore, crystal: game.crystal }
      },
      encounterNow: (fac: string) => {
        if (game.layer !== 'ship') game.board()
        shipForward(game.quat, vA)
        const f = game.spawnFleet(2, 0.6, game.pos.clone().addScaledVector(vA, 20), 'hunt')
        f.faction = fac as OriginId
        game.openEncounter(f)
        return Boolean(game.encounter)
      },
      encounterPick: (c: string) => {
        game.encounterChoose(c as Choice)
        return { open: Boolean(game.encounter), mode: game.mode, fights: game.enemies.filter((e) => e.alive).length }
      },
      relOf: (fac: string) => ({ ...game.relOf(fac as OriginId), stance: stance(game.relOf(fac as OriginId)) }),
      diploOpen: () => {
        game.openDiplo()
        return document.querySelectorAll('#diplo-list .diplo-card').length
      },
      vassalTry: (fac: string, mine: number) => {
        // Test: oyuncuya sahte koloni sayısı vermek yerine ilişkiyi doğrudan dener.
        const r = game.relOf(fac as OriginId)
        r.known = true
        r.cool = 0
        r.rel = 40
        const real = game.colonyCount
        game.colonyCount = () => mine
        game.renderDiplo()
        const btn = [...document.querySelectorAll<HTMLButtonElement>('#diplo-list button')].find((b) => b.textContent?.startsWith('Sömürge yap'))
        const rnd = Math.random
        Math.random = () => 0
        btn?.click()
        Math.random = rnd
        game.colonyCount = real
        return { found: Boolean(btn), disabled: btn?.disabled ?? null, vassal: Boolean(r.vassal), stance: stance(r) }
      },
      diploTick: (sec: number) => {
        game.tickDiplo(sec)
        return { energy: game.energy, ore: game.ore }
      },
      photo: (on: boolean) => {
        if (on) game.openPhoto()
        else game.closePhoto()
        return { photo: game.photo, body: document.body.classList.contains('photo') }
      },
      questGo: (id: string) => game.questStart(QUESTS.findIndex((q) => q.id === id), true),
      questIds: () => QUESTS.map((q) => q.id),
      setRes: (energy: number, ore: number, crystal: number) => {
        game.energy = energy
        game.ore = ore
        game.crystal = crystal
      },
      partsInfo: () => ({ up: { ...game.up }, parts: [...game.parts], hullMax: game.hullMax, shieldMax: game.shieldMax, weaponMul: game.weaponMul, engineMul: game.engineMul, stealthMul: game.stealthMul, ore: game.ore, crystal: game.crystal, energy: game.energy, fx: Boolean(game.visual?.root.getObjectByName('parts-fx')) }),
      buyPart: (slot: string, pick: number) => {
        const opts = nextOptions(game.originId, slot as UpId, game.up[slot as UpId])
        const part = opts[Math.min(pick, opts.length - 1)]
        return part ? game.buy(slot as UpId, part.id) : false
      },
      openUpgradesNow: () => {
        game.mode = 'upgrade'
        game.renderUpgrades()
      },
      useSkill: () => {
        if (game.footPlanet) game.useSkill(game.footPlanet)
        return { cd: game.skillCd, t: game.skillT }
      },
      skillReset: () => {
        game.skillCd = 0
      },
      colonyOrder: (o: string) => game.setColonyOrder(o as ColonyOrder),
      squadOrder: (o: string) => game.setSquadOrder(o as SquadOrder),
      ordersOpen: (v: boolean) => game.toggleOrders(v),
      ordersHtml: () => game.dom.orderList.innerHTML.length,
      orderSpots: () => {
        const planet = game.footPlanet
        const c = game.colonyHere(planet)
        if (!planet || !c) return null
        const core = game.worldDir(c.dir, planet, new Vector3())
        const R = planet.def.radius
        return game.units.filter((u) => u.alive && !u.invader && !u.squad && u.colonyId === c.planetId).map((u) => ({ d: game.arc(u.dir, core, R), g: u.goal ? game.arc(u.goal, core, R) : -1 }))
      },
      capOf: () => Object.values(game.colonies).map((c) => (c ? { id: c.planetId, cap: game.capOf(c), base: settlerCap(c.level, c.turrets.length) } : null)),
      spawnScout: () => {
        const f = game.spawnScout()
        return { id: f.id, faction: f.faction, dist: f.pos.distanceTo(game.pos) }
      },
      scoutInfo: () => game.fleets.filter((f) => f.scout).map((f) => ({ state: f.state, dist: f.pos.distanceTo(game.pos), revealed: f.revealed })),
      flyToScout: (gap: number) => {
        const f = game.fleets.find((x) => x.scout)
        if (!f) return false
        vA.subVectors(game.pos, f.pos).normalize()
        game.pos.copy(f.pos).addScaledVector(vA, gap)
        game.vel.set(0, 0, 0)
        game.vis = 0
        return true
      },
      homeId: () => game.homePlanetId(),
      footKids: () => (game.footPlanet ? game.footPlanet.mesh.children.map((c) => `${c.name || c.type}:${c.visible}:${c.children.length}`) : []),
      hideKid: (i: number) => {
        const c = game.footPlanet?.mesh.children[i]
        if (c) c.visible = false
      },
      counts: () => ({ floats: game.floats.length, booms: game.booms.length, units: game.units.length, alive: game.units.filter((u) => u.alive).length, feed: game.feedItems.length, dom: document.querySelectorAll('*').length, scene: game.scene.children.length, map: game.mapRoot.children.length }),
      skipRender: (on: boolean) => {
        game.skipRender = on
      },
      gpuInfo: () => ({ ...game.renderer.info.memory, programs: game.renderer.info.programs?.length ?? 0 }),
      selAttack: (p: number, yaw = 0) => {
        game.selAttackP = p
        game.selYaw = yaw
        game.selSpin = 0
        game.selDrag = true
      },
      walkQuest: (n: number) => {
        game.input.stickY = 1
        for (let i = 0; i < n; i++) {
          game.updateFoot(1 / 60)
          game.questTick(1 / 60)
        }
        game.input.stickY = 0
        return { id: game.quest().id, walk: game.questWalk }
      },
      setStick: (x: number, y: number) => {
        game.input.stickX = x
        game.input.stickY = y
      },
      shipFwd: () => {
        const v = new Vector3(0, 0, -1).applyQuaternion(game.quat)
        return [v.x, v.y, v.z]
      },
      loreOn: () => document.getElementById('lore-card')?.classList.contains('on') ?? false,
      discovered: () => game.discovered.map((d) => d.id),
      feedCount: () => game.feedItems.length,
      hitmarkOn: () => document.getElementById('hitmark')?.classList.contains('on') ?? false,
      weakenCore: (hull: number) => {
        const c = game.colonyHere()
        if (!c) return false
        c.hull = Math.min(c.hull, hull)
        return true
      },
      wildPlanet: () => {
        const p = game.planets.find((x) => x.def.landable !== false && !x.def.heat && !game.colonies[x.def.id] && !game.cleared.has(x.def.id) && !x.def.home)
        return p ? p.def.id : null
      },
      placeTurret: () => game.placeTurret(),
      baseAction: () => game.baseAction(),
      callWave: () => game.callWave(),
      selProbeOff: () => {
        return 0
      },
      selProbe: () => {
        const rig = game.selCreatures[game.originId]
        const a = rig ? rig.root.position.clone().project(game.camera) : null
        const b = game.visual.root.position.clone().project(game.camera)
        return { cam: game.camera.position.toArray(), fov: game.camera.fov, view: game.camera.view, creature: a && [a.x, a.y, a.z], ship: [b.x, b.y, b.z], shipPos: game.visual.root.position.toArray(), shipScale: game.visual.root.scale.x, vis: game.visual.root.visible }
      },
      screenOf: () => {
        const v = game.pos.clone().project(game.camera)
        return { x: v.x, y: v.y }
      },
      stepGround: (n: number, dt = 1 / 60) => {
        for (let i = 0; i < n; i++) {
          game.clockT += dt
          game.updatePlanets(dt)
          if (game.layer === 'foot') game.updateFoot(dt)
          // Gerçek döngüdeki gibi: nüfus büyümesi ve koloni geliri accrueIncome'da işler.
          game.accrueIncome(dt)
        }
        return { hull: game.hull, shield: game.shield, alive: game.units.filter((x) => x.alive && game.hostileToPlayer(x.faction)).length }
      },
      faceNearest: () => {
        const planet = game.footPlanet
        if (!planet) return 0
        let best: Vector3 | null = null
        let bd = 1e9
        for (const i of game.units) {
          if (!i.alive || !game.hostileToPlayer(i.faction)) continue
          const d = i.root.position.distanceTo(game.pos)
          if (d < bd) {
            bd = d
            best = i.dir
          }
        }
        if (!best) return 0
        vA.copy(game.pos).sub(planet.pos).normalize()
        game.footForward.copy(best).addScaledVector(vA, -vA.dot(best))
        if (game.footForward.lengthSq() < 1e-9) return bd
        game.footForward.normalize()
        return bd
      },
      approachLocal: (gap = 2) => {
        const planet = game.footPlanet
        const l = game.locals.find((x) => x.alive)
        if (!planet || !l) return false
        const R = planet.def.radius
        const side = new Vector3().crossVectors(l.home, AXIS_X)
        if (side.lengthSq() < 1e-6) side.crossVectors(l.home, AXIS_Y)
        side.normalize()
        const phi = gap / R
        const d = l.home.clone().multiplyScalar(Math.cos(phi)).addScaledVector(side, Math.sin(phi)).normalize()
        game.pos.copy(planet.pos).addScaledVector(d, R + game.footAlt)
        game.footForward.copy(l.home).addScaledVector(d, -d.dot(l.home)).normalize()
        return true
      },
      punch: () => {
        game.punchCd = 0
        game.input.mouseDown = true
        game.updateFoot(1 / 60)
        game.input.mouseDown = false
        return game.units.filter((x) => x.alive && game.hostileToPlayer(x.faction)).length
      },
      groundOverlap: () => {
        const planet = game.footPlanet
        if (!planet) return 0
        const pts: { p: Vector3; r: number }[] = [{ p: game.pos.clone(), r: 0.8 }]
        for (const l of game.locals) if (l.alive) pts.push({ p: l.root.position.clone(), r: 0.8 })
        for (const i of game.units) if (i.alive) pts.push({ p: i.root.position.clone(), r: i.spec.radius })
        let worst = 0
        for (let a = 0; a < pts.length; a++) {
          for (let b = a + 1; b < pts.length; b++) {
            const gap = pts[a].p.distanceTo(pts[b].p)
            worst = Math.max(worst, pts[a].r + pts[b].r - gap)
          }
        }
        return worst
      },
      landOn: (kind: 'small' | 'large') => {
        const planet = game.planets.find((p) => p.def.kind === kind)
        if (!planet) return false
        game.fadeToken++
        game.fading = false
        game.ending = false
        game.dom.fade.classList.remove('on')
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        game.pos.copy(planet.pos).add(new Vector3(0, planet.def.radius + 14, 0))
        game.vel.set(0, 0, 0)
        game.applyPresentation()
        return game.land()
      },
      board: () => game.board(),
      measureHop: (kind: 'small' | 'large') => {
        const planet = game.planets.find((p) => p.def.kind === kind)
        if (!planet) return 0
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        game.pos.copy(planet.pos).add(new Vector3(0, planet.def.radius + 14, 0))
        game.vel.set(0, 0, 0)
        if (!game.land()) return 0
        game.jumpBuf = planet.def.jump
        let peak = game.footAlt
        for (let i = 0; i < 480; i++) {
          game.updateFoot(1 / 60)
          peak = Math.max(peak, game.footAlt)
          if (i > 8 && game.grounded) break
        }
        return peak
      },
      walk: (sec: number) => {
        const planet = game.footPlanet
        if (!planet) return { angle: 0, alt: 0 }
        const start = game.pos.clone().sub(planet.pos).normalize()
        game.input.keys.add('KeyW')
        const steps = Math.max(1, Math.round(sec * 60))
        for (let i = 0; i < steps; i++) game.updateFoot(1 / 60)
        game.input.keys.delete('KeyW')
        const end = game.pos.clone().sub(planet.pos).normalize()
        const dot = clamp(start.dot(end), -1, 1)
        return { angle: Math.acos(dot), alt: game.pos.distanceTo(planet.pos) - planet.def.radius, pois: game.pois.length }
      },
      setVitals: (hull: number, shield: number, cd1: number, cd2: number) => {
        game.hull = hull
        game.shield = shield
        game.cd1 = cd1
        game.cd2 = cd2
      },
      cycle: () => game.cycleWeapon(),
      setMobile: (on: boolean) => {
        game.mobileCam = on
      },
      simChase: () => {
        game.mode = 'map'
        game.layer = 'ship'
        game.camMode = 'chase'
        game.holdPose = true
        game.pos.set(30, 16, 40)
        game.vel.set(0, 0, -200)
        quatFromForward(game.quat, vA.set(0, 0, -1))
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        const step = (n: number) => {
          for (let i = 0; i < n; i++) {
            game.pos.addScaledVector(game.vel, 1 / 60)
            game.visual.root.position.copy(game.pos)
            game.updateCamera(1 / 60)
          }
        }
        step(50)
        qA.setFromAxisAngle(AXIS_Y, 1.5)
        game.quat.multiply(qA)
        game.vel.set(0, 0, -1).applyQuaternion(game.quat).multiplyScalar(200)
        step(36)
        game.camera.updateMatrixWorld(true)
        const ndc = game.pos.clone().project(game.camera)
        return { x: ndc.x, y: ndc.y, z: ndc.z, dist: game.camera.position.distanceTo(game.pos) }
      },
      simGiant: () => {
        const giant = game.enemies.find((e) => e.alive && e.giant)
        if (!giant) return null
        game.camMode = 'chase'
        game.layer = 'ship'
        shipForward(game.quat, vA)
        giant.pos.copy(game.pos).addScaledVector(vA, 7)
        giant.root.position.copy(giant.pos)
        game.vel.copy(vA).multiplyScalar(150)
        game.snapCamera = true
        for (let i = 0; i < 36; i++) {
          game.pos.addScaledVector(game.vel, 1 / 60)
          giant.pos.addScaledVector(game.vel, 1 / 60)
          giant.root.position.copy(giant.pos)
          game.visual.root.position.copy(game.pos)
          game.updateCamera(1 / 60)
        }
        game.camera.updateMatrixWorld(true)
        const ndc = game.pos.clone().project(game.camera)
        return { x: ndc.x, y: ndc.y, z: ndc.z, dist: game.camera.position.distanceTo(game.pos) }
      },
      strike: (where: 'body' | 'weak') => {
        const pool = game.enemies.filter((e) => e.alive && e.giant)
        const e = where === 'weak' ? pool[0] : pool[1]
        if (!e) return 0
        for (const s of game.shots) if (s.alive) game.killShot(s)
        const before = e.hull + e.shield
        const shot = game.shots.find((s) => !s.alive && s.friendly)
        if (!shot) return 0
        shot.alive = true
        shot.kind = 'laser'
        shot.dmg = 12
        shot.hops = 1
        shot.age = 0.12
        shot.vel.set(0, 0, 0)
        if (where === 'weak' && e.weak) {
          e.root.position.copy(e.pos)
          e.root.updateWorldMatrix(true, true)
          e.weak.getWorldPosition(shot.pos)
        } else shot.pos.copy(e.pos)
        shot.prev.copy(shot.pos)
        shot.mesh.visible = false
        game.updateShots(0.016)
        return before - (e.hull + e.shield)
      },
      dropEnemyGate: () => {
        const enemy = game.enemies.find((item) => item.alive && item.attack === 'gate') ?? game.enemies.find((item) => item.alive)
        if (!enemy) return null
        game.openEnemyGate(enemy)
        const gate = game.enemyGates.find((item) => item.alive)
        if (!gate) return null
        return { to: gate.to, x: gate.pos.x, y: gate.pos.y, z: gate.pos.z }
      },
      swallowGate: () => {
        const gate = game.enemyGates.find((item) => item.alive && item.owner?.alive)
        if (!gate?.owner) return false
        gate.owner.pos.copy(gate.pos)
        const owner = gate.owner
        game.updateGates(0.05)
        return !owner.alive
      },
      enterGate: () => {
        const gate = game.enemyGates.find((item) => item.alive)
        if (!gate) return false
        game.pos.copy(gate.pos)
        game.vel.set(0, 0, 0)
        game.holdPose = false
        game.updateGates(0.05)
        return gate.to
      },
      framePlanet: (kind: 'small' | 'large') => {
        const planet = game.planets.find((p) => p.def.kind === kind)
        if (!planet) return false
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = true
        game.camMode = 'chase'
        vA.set(0.15, 0.92, 0.35).normalize()
        game.pos.copy(planet.pos).addScaledVector(vA, planet.def.radius + (kind === 'large' ? 78 : 26))
        game.vel.set(0, 0, 0)
        vB.subVectors(planet.pos, game.pos).normalize()
        quatFromForward(game.quat, vB)
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        game.updateCamera(1)
        return true
      },
      frameWorm: () => {
        const worm = game.holes.find((h) => h.kind === 'worm')
        if (!worm) return false
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = true
        game.camMode = 'chase'
        game.pos.copy(worm.pos).add(new Vector3(0, 8, 28))
        game.vel.set(0, 0, 0)
        vB.subVectors(worm.pos, game.pos).normalize()
        quatFromForward(game.quat, vB)
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        game.updateCamera(1)
        game.refreshHud()
        return worm.to ?? null
      },
      grant: (n: number) => {
        game.addScore(n)
        return [...game.owned]
      },
      heatPulse: (seconds: number) => {
        game.layoutUniverse('gunes')
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = true
        const sun = game.planets.find((p) => p.def.heat)
        if (!sun) return null
        game.pos.copy(sun.pos).add(new Vector3(0, sun.def.radius + 70, 0))
        game.vel.set(0, 0, 0)
        game.hull = 100
        game.shield = 60
        const before = game.hull + game.shield
        const steps = Math.round(seconds * 60)
        for (let i = 0; i < steps; i++) game.applyHeat(1 / 60)
        return { loss: before - (game.hull + game.shield), hull: game.hull, shield: game.shield, heat: game.heat }
      },
      landId: (id: string) => {
        game.layoutUniverse(game.universeId)
        const planet = game.planets.find((p) => p.def.id === id)
        if (!planet) return false
        game.fadeToken++
        game.fading = false
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = false
        game.pos.copy(planet.pos).add(new Vector3(0, planet.def.radius + 20, 8))
        game.vel.set(0, 0, 0)
        game.applyPresentation()
        return game.land()
      },
      frameBase: (id: string, arc = 40, alt = 12) => {
        const planet = game.planets.find((p) => p.def.id === id)
        const c = game.colonies[id]
        if (!planet || !c) return false
        game.mode = 'map'
        game.layer = 'ship'
        game.footPlanet = null
        game.holdPose = true
        game.camMode = 'chase'
        const core = game.worldDir(c.dir, planet, new Vector3())
        const d = game.offsetDir(core, 1.1, arc, planet.def.radius, new Vector3())
        game.pos.copy(planet.pos).addScaledVector(d, planet.def.radius + alt)
        game.vel.set(0, 0, 0)
        vB.copy(planet.pos).addScaledVector(core, planet.def.radius).sub(game.pos).normalize()
        quatFromForward(game.quat, vB)
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        game.updateCamera(1)
        return true
      },
      frameBody: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        if (!planet) return false
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = true
        game.camMode = 'chase'
        vA.set(0.2, 0.72, 0.55).normalize()
        game.pos.copy(planet.pos).addScaledVector(vA, planet.def.radius * 1.85)
        game.vel.set(0, 0, 0)
        vB.subVectors(planet.pos, game.pos).normalize()
        quatFromForward(game.quat, vB)
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        game.updateCamera(1)
        game.refreshHud()
        return true
      },
      frameSolar: () => {
        game.layoutUniverse('gunes')
        game.mode = 'map'
        game.layer = 'ship'
        game.holdPose = true
        game.camMode = 'chase'
        const earth = game.planets.find((p) => p.def.id === 'dunya')
        const focus = earth ? earth.pos : new Vector3()
        game.pos.copy(focus).add(new Vector3(-900, 1400, 1300))
        game.vel.set(0, 0, 0)
        vB.copy(focus).sub(game.pos).normalize()
        quatFromForward(game.quat, vB)
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.applyPresentation()
        game.updateCamera(1)
        game.refreshHud()
        return true
      },
      rig: () => ({
        legL: game.walkerRig.legL.rotation.x,
        legR: game.walkerRig.legR.rotation.x,
        armL: game.walkerRig.armL.rotation.x,
        armR: game.walkerRig.armR.rotation.x,
      }),
      snapCam: () => {
        game.snapCamera = true
        game.updateCamera(1)
      },
      faceDot: () => {
        const forward = new Vector3(0, 0, 1).applyQuaternion(game.walker.quaternion)
        return forward.dot(game.footForward.clone().normalize())
      },
      behind: () => {
        const back = game.footForward.clone().negate().normalize()
        const off = game.camera.position.clone().sub(game.walker.position).normalize()
        return off.dot(back)
      },
      anchorY: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        return planet ? planet.pos.y : null
      },
      spinPlanets: (steps: number) => {
        const before = game.planets.find((p) => p.def.kind === 'small')
        const y0 = before ? before.anchor.y : 0
        const p0 = before ? before.pos.clone() : new Vector3()
        for (let i = 0; i < steps; i++) {
          game.clockT += 1 / 60
          game.updatePlanets(1 / 60)
        }
        const after = game.planets.find((p) => p.def.kind === 'small')
        return { y: after?.pos.y ?? 0, y0, drift: after ? after.pos.distanceTo(p0) : 0, anchor: y0 }
      },
      beacons: () => document.querySelectorAll('#beacons .beacon').length,
      setRoute: (id: string) => {
        game.route = { kind: 'planet', id, system: game.universeId }
        game.paintRoute()
        return game.routeLine.visible
      },
      routeOn: () => game.routeLine.visible,
      waypointNow: () => {
        const w = game.waypoint()
        return w ? { x: w.x, y: w.y, z: w.z } : null
      },
      punchPose: () => {
        game.punchT = 0.18
        game.poseWalker()
        return game.walkerRig.armR.rotation.x
      },
      ambushNow: () => {
        const before = game.fleets.length
        game.raiseAmbush()
        return game.fleets.length > before
      },
      showTouch: (on: boolean) => {
        document.body.classList.toggle('force-touch', on)
      },
      pressAct: (name: 'land' | 'jump' | 'punch' | 'weapon', on: boolean) => {
        if (name === 'land') game.input.touchLand = on
        if (name === 'jump') game.input.touchJump = on
        if (name === 'punch') game.input.touchPunch = on
        if (name === 'weapon') game.input.touchWeapon = on
      },
      pick: (id: OriginId) => {
        game.showShip(id)
        if (game.mode === 'select') game.renderSelect()
      },
      confirm: () => game.startRun(),
      cast: (slot: 1 | 2) => game.tryAbility(slot),
      jump: (id: UniId) => game.transit(id),
      ownerWell: () => {
        const e = game.enemies.find((x) => x.alive && x.attack === 'well') ?? game.enemies.find((x) => x.alive)
        if (!e) return null
        game.openEnemyWell(e)
        const well = game.enemyWells.find((w) => w.owner === e)
        return { found: Boolean(well), dist: well ? well.pos.distanceTo(e.pos) : -1, giant: e.giant }
      },
      ownerNear: (gap: number) => {
        const well = game.enemyWells.find((w) => w.alive && w.owner?.alive)
        if (!well || !well.owner) return null
        well.owner.pos.copy(well.pos).add(new Vector3(gap, 0, 0))
        well.owner.vel.set(0, 0, 0)
        return true
      },
      stepCombat: (n: number, dt = 1 / 60) => {
        for (let i = 0; i < n && game.mode === 'combat'; i++) {
          game.clockT += dt
          game.updateCombat(dt)
        }
        return game.mode
      },
      wellDbg: () => game.enemyWells.map((w) => ({ alive: w.alive, life: w.life, owner: w.owner ? { alive: w.owner.alive, d: w.owner.pos.distanceTo(w.pos), hull: w.owner.hull, attack: w.owner.attack } : null })).concat([{ mode: game.mode, hold: game.holdPose, wells: game.enemies.filter((e) => e.alive && e.attack === 'well').length } as never]),
      ownerAlive: () => game.enemies.some((x) => x.alive && x.attack === 'well'),
      dropEnemyWell: () => {
        const enemy = game.enemies.find((item) => item.alive)
        if (!enemy) return false
        const slot = game.enemyWells.find((well) => !well.alive) ?? game.enemyWells[0]
        slot.owner = enemy
        slot.pos.copy(enemy.pos)
        slot.life = 3.4
        slot.alive = true
        slot.mesh.visible = true
        slot.mesh.position.copy(slot.pos)
        return true
      },
      parkPlayerInOwnWell: () => {
        game.wellPos.copy(game.pos)
        game.wellLife = 4.6
        game.wellMesh.visible = true
        game.wellMesh.position.copy(game.wellPos)
      },
      skipIntro: () => game.skipIntro(),
      start: () => game.startRun(),
      setIntroTime: (t: number) => {
        game.mode = 'intro'
        game.introT = 0
        game.lineShown = -1
        game.bangPlayed = true
        game.resetIntroParticles()
        game.diskMat.uniforms.uAlpha.value = 0
        while (game.introT < t - 0.001) game.updateIntro(Math.min(0.05, t - game.introT))
        game.applyPresentation()
      },
      place: (x: number, y: number, z: number) => {
        game.fadeToken++
        game.fading = false
        game.ending = false
        game.dom.fade.classList.remove('on')
        game.holdPose = true
        game.mode = 'map'
        game.pos.set(x, y, z)
        game.vel.set(0, 0, 0)
        game.faceOrigin()
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.snapCamera = true
        game.mapRoot.visible = true
        game.combatRoot.visible = false
        game.hideControls()
        game.dom.toast.textContent = ''
        game.dom.prompt.textContent = ''
        game.toastT = 0
        game.applyPresentation()
      },
      hold: (on: boolean) => {
        game.holdPose = on
      },
      faceOrigin: () => game.faceOrigin(),
      setVis: (v: number) => {
        game.vis = v
      },
      engage: () => {
        if (game.mode !== 'map') {
          game.mode = 'map'
          game.applyPresentation()
        }
        if (game.layer !== 'ship') game.board()
        shipForward(game.quat, vA)
        const fleet = game.spawnFleet(3, 2, game.pos.clone().addScaledVector(vA, 60), 'hunt')
        game.beginCombat(fleet)
      },
      engageAs: (fac: string, count = 5) => {
        if (game.layer !== 'ship') game.board()
        game.fadeToken++
        game.fading = false
        game.layer = 'ship'
        game.footPlanet = null
        game.mode = 'map'
        shipForward(game.quat, vA)
        const fleet = game.spawnFleet(count, 2, game.pos.clone().addScaledVector(vA, 60), 'hunt')
        fleet.faction = fac as OriginId
        game.beginCombat(fleet)
        return game.enemies.filter((e) => e.alive).map((e) => e.attack)
      },
      wellAtPlayer: () => {
        const e = game.enemies.find((x) => x.alive)
        const slot = game.enemyWells.find((w) => !w.alive) ?? game.enemyWells[0]
        if (!e || !slot) return false
        slot.owner = e
        slot.pos.copy(game.pos)
        slot.life = 3
        slot.alive = true
        slot.mesh.visible = true
        game.updateWell(1 / 60)
        return true
      },
      colonyPlan: (id: string) => {
        const c = game.colonies[id]
        return c ? game.colonyPlan(c) : null
      },
      unitKinds: () => game.units.filter((u) => u.alive && !u.invader).map((u) => `${u.kind}:${u.job ?? ''}`),
      workerDbg: () => {
        const planet = game.footPlanet
        const c = game.colonyHere()
        if (!planet || !c) return null
        const core = game.worldDir(c.dir, planet, new Vector3())
        const w = game.units.find((u) => u.alive && u.kind === 'worker')
        const deps = planet.deposits.filter((d) => d.left > 0).map((d) => Math.round(game.arc(game.worldDir(d.dir, planet, new Vector3()), core, planet.def.radius))).sort((a, b) => a - b).slice(0, 5)
        return { deps, w: w ? { job: w.job, key: w.depKey, toCore: Math.round(game.arc(w.dir, core, planet.def.radius)) } : null }
      },
      posture: (id: string, p: string) => {
        const c = game.colonies[id]
        if (c) game.setPosture(c, p as Posture)
      },
      train: (id: string) => {
        const c = game.colonies[id]
        return c ? game.trainSoldier(c) : false
      },
      trainInfo: (id: string) => {
        const c = game.colonies[id]
        return c ? { q: c.trainQ ?? 0, t: c.trainT ?? 0, trained: c.trained ?? 0, pop: c.pop } : null
      },
      placeTurretKind: (kind: string) => {
        game.placeTurret(kind as TurretKind)
        const c = game.colonyHere()
        return c ? c.turrets.map((t) => `${t.kind ?? 'kara'}${t.lvl ?? 1}`) : []
      },
      commandText: () => {
        game.orderOpen = true
        game.renderOrders()
        const h = document.getElementById('order-list')?.textContent ?? ''
        game.orderOpen = false
        return h
      },
      bombersNow: () => {
        game.bomberT = 0.01
        game.bomberTick(0.02)
        return game.fleets.filter((f) => f.bomber).length
      },
      bombers: () => game.fleets.filter((f) => f.bomber).map((f) => f.count),
      aaDbg: () => {
        const c = game.homeColony()
        const planet = c ? game.planetOf(c) : null
        if (!c || !planet) return null
        const t = c.turrets.find((x) => x.kind === 'hava')
        const f = game.fleets.find((x) => x.bomber)
        if (!t || !f) return { t: Boolean(t), f: Boolean(f), mode: game.mode, uni: game.universeId, cu: c.universe }
        const pos = game.surfacePos(game.worldDir(t.dir, planet, new Vector3()), planet, 2.6, new Vector3())
        return { d: Math.round(pos.distanceTo(f.pos)), range: game.aaRange(t), cool: t.cool, alive: t.alive, mode: game.mode, aa: f.root.userData.aa }
      },
      questFlag: (k: string) => game.questFlags.has(k),
      enemyAA: () => {
        // Hedef: en yakın düşman üssü; hava taretleri ve konumları.
        const list = Object.values(game.colonies).filter((c) => c && !game.mine(c) && c.universe === game.universeId)
        return list.map((c) => ({ id: c.planetId, aa: c.turrets.filter((t) => t.alive && t.kind === 'hava').length, kara: c.turrets.filter((t) => t.alive && t.kind !== 'hava').length }))
      },
      flyOverEnemy: (id: string, alt = 40) => {
        const planet = game.planets.find((p) => p.def.id === id)
        const c = game.colonies[id]
        if (!planet || !c) return false
        if (game.layer !== 'ship') game.board()
        game.mode = 'map'
        game.layer = 'ship'
        const up = game.worldDir(c.dir, planet, new Vector3())
        game.pos.copy(planet.pos).addScaledVector(up, planet.def.radius + alt)
        game.vel.set(0, 0, 0)
        game.updateOutpostGuns(0)
        return true
      },
      shootAA: () => {
        // Hava tareti noktasından geçen sahte bir mermi: yörüngeden isabet.
        game.updateOutpostGuns(0)
        const spot = game.turretSpots.find((x) => x.t.alive && x.t.kind === 'hava')
        if (!spot) return null
        const shot = { alive: true, friendly: true, pos: spot.pos.clone().addScaledVector(spot.up, -0.5), prev: spot.pos.clone().addScaledVector(spot.up, 3), vel: new Vector3(), age: 0, dmg: 400, kind: 'bolt' as const, hops: 1, mesh: new Mesh() }
        return game.hitOutpost(shot as unknown as Shot)
      },
      planetCard: () => {
        game.cardT = 0
        game.paintPlanetCard(0.1)
        const el = document.getElementById('planet-card')
        return el && !el.classList.contains('hidden') ? el.textContent : null
      },
      oppNow: () => {
        game.oppT = 0
        game.spawnOpp()
        return game.opp ? game.opp.pos.distanceTo(game.pos) : -1
      },
      oppGrab: () => {
        if (!game.opp) return null
        const e0 = game.energy
        game.pos.copy(game.opp.pos)
        game.oppTick(0.016)
        return { gained: game.energy - e0, left: Boolean(game.opp) }
      },
      razeNearestEnemy: () => {
        const c = Object.values(game.colonies).find((x) => x && !game.mine(x) && x.universe === game.universeId)
        const planet = c ? game.planetOf(c) : null
        if (!c || !planet) return null
        const before = game.captured
        game.damageOutpost(c, planet, 1e6, planet.pos.clone(), new Vector3(0, 1, 0))
        return { before, after: game.captured }
      },
      saveNow: () => game.saveGame(true),
      loadNow: () => {
        const g = readGame()
        if (!g) return false
        game.showShip(g.origin as OriginId)
        game.resetRun()
        game.applySaved(g)
        game.mode = 'map'
        return true
      },
      continueVisible: () => !document.getElementById('btn-continue')?.classList.contains('hidden'),
      stateSig: () => ({
        energy: Math.round(game.energy),
        ore: game.ore,
        crystal: game.crystal,
        quest: game.questIdx,
        colonies: Object.values(game.colonies).filter((c) => c && game.mine(c)).map((c) => `${c.planetId}:${c.level}:${c.turrets.length}`).sort().join(','),
        up: JSON.stringify(game.up),
        universe: game.universeId,
      }),
      strandAt: (id: string) => {
        const planet = game.planets.find((p) => p.def.id === id)
        if (!planet) return false
        game.stranded.push({ planetId: id, universe: game.universeId, dir: new Vector3(0, 1, 0), crew: [{ kind: 'guard', hull: 40, hullMax: 70 }, { kind: 'settler', hull: 18, hullMax: 18 }] })
        return true
      },
      squadCount: () => game.squadSize(),
      boardingOpen: () => game.openBoarding(),
      trainCmd: (id: string) => {
        const c = game.colonies[id]
        return c ? game.trainCommander(c) : false
      },
      coreTour: () => {
        game.tourDone = false
        return game.coreTour()
      },
      cineOn: () => Boolean(game.cine),
      cineSkip: () => {
        game.cineTap = true
      },
      setPitch: (p: number) => {
        game.lookPitch = p
        game.lookPitchT = p
      },
      flashTest: () => {
        const w = game.walker
        let m: MeshStandardMaterial | null = null
        w.traverse((o) => {
          const mm = (o as Mesh).material as MeshStandardMaterial | undefined
          if (!m && mm && mm.isMeshStandardMaterial) m = mm
        })
        if (!m) return null
        const before = (m as MeshStandardMaterial).emissive.getHex()
        game.flash.flash(w, 0xff3a2a, 0.2)
        game.clearGround()
        return { before, after: (m as MeshStandardMaterial).emissive.getHex() }
      },
      engageNearest: () => {
        const near = game.nearestFleet(10000)
        if (!near) return false
        const small = Boolean(near.fleet.small)
        // Temas: filo oyuncunun önüne alınır (gerçek oyunda filo yaklaşınca başlar).
        near.fleet.pos.copy(game.pos).addScaledVector(new Vector3(0, 0, -1).applyQuaternion(game.quat), 30)
        game.beginCombat(near.fleet)
        return small
      },
      damage: (n: number) => game.hurtPlayer(n),
      wipe: () => {
        for (const e of game.enemies) if (e.alive) game.hurtEnemy(e, 9999)
      },
      setCam: (m: CamMode) => {
        game.camMode = m
        game.snapCamera = true
        game.applyPresentation()
      },
      arrange: () => {
        const spots = [
          [0, 2, -34],
          [-14, 5, -46],
          [13, -2, -40],
        ]
        const base = game.pos.clone()
        game.enemies.forEach((e, i) => {
          const s = spots[i % spots.length]
          e.pos.set(s[0], s[1] - 0.4, s[2] - 18).add(base)
          e.vel.set(0, 0, 0)
          e.alive = true
          e.root.visible = true
        })
        game.pos.copy(base)
        game.vel.set(0, 0, -6)
        game.quat.identity()
        game.visual.root.position.copy(game.pos)
        game.visual.root.quaternion.copy(game.quat)
        game.enemies.forEach((e) => {
          quatFromForward(e.quat, vA.set(0, 0, 1))
          e.root.position.copy(e.pos)
          e.root.quaternion.copy(e.quat)
        })
        game.holdPose = true
        game.snapCamera = true
      },
      volley: () => {
        shipForward(game.quat, vA)
        for (let i = 0; i < 4; i++) {
          vB.copy(game.pos).addScaledVector(vA, 6 + i * 6)
          game.spawnShot(true, vB, vA, 15)
        }
      },
    }
    ;(window as unknown as { __sessiz: typeof api }).__sessiz = api
  }

  private faceOrigin() {
    if (this.pos.lengthSq() < 1) return
    vA.copy(this.pos).negate().normalize()
    quatFromForward(this.quat, vA)
    this.visual.root.quaternion.copy(this.quat)
  }
}

export function boot() {
  const game = new Game()
  game.start()
  return game
}
