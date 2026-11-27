import type { OriginId } from './origins'

/* Irkların savaş profili: uzay savaşında nasıl saldırdıkları, gemilerinin görünüşü ve caydırıcı yetenekleri.
   İlk karşılaşmadaki tanıtım kartı, seçim ekranı ve düşman filosu kurulumu buradan okur. */

export type EnemyAttack = 'bolt' | 'homing' | 'goo' | 'well' | 'gate'

export type WarProfile = {
  /** Gelişmişlik: genç, gelişmiş, kadim. Caydırıcı yetenekler yalnız kadim/gelişmiş ırklarda. */
  tier: 'genç' | 'gelişmiş' | 'kadim'
  fleet: string
  tactic: string
  /** Sıradan gemilerin silah karışımı. */
  attacks: EnemyAttack[]
  /** Amiral gemisi kara delik açar (yalnız kadim). */
  well?: boolean
  /** Amiral gemisi geçit açıp takviye çağırır. */
  gate?: boolean
  deterrent?: string
  /** Gemi gövde rengi: savaşta hangi ırkla dövüştüğün renkten anlaşılır. */
  color: number
}

export const WAR: Record<OriginId, WarProfile> = {
  earth: { tier: 'genç', fleet: 'Gri, dengeli savaş uçakları.', tactic: 'Düz lazer ve güdümlü füze; avcı ve kalkanlı karışık.', attacks: ['bolt', 'homing'], color: 0xc8d0dc },
  mars: { tier: 'genç', fleet: 'Pas kırmızısı, kalın zırhlı gemiler.', tactic: 'Yakına gelir, ağır lazer yağdırır; zırhları sağlam.', attacks: ['bolt', 'bolt', 'homing'], color: 0xc4623a },
  proxima: { tier: 'gelişmiş', fleet: 'Obsidyen, sivri gölge gemiler.', tactic: 'Yapışkan zehir topları ve hızlı avcılar; seni yavaşlatıp kuşatır.', attacks: ['goo', 'bolt'], color: 0x5a4a7a },
  alpha: {
    tier: 'gelişmiş',
    fleet: 'Parlak gümüş diskler.',
    tactic: 'Güdümlü füze ve lazer. Amiral gemisi geçit açar: arkasından takviye gemiler çıkar.',
    attacks: ['homing', 'bolt'],
    gate: true,
    deterrent: 'Geçit: amiral gemisi savaşın ortasında takviye çağırır. Önce amirali düşür.',
    color: 0xd8e4f0,
  },
  trappist: { tier: 'gelişmiş', fleet: 'Işıyan kristal gemiler.', tactic: 'Uzaktan güdümlü kristal füzeler; bombacıları çok.', attacks: ['homing', 'homing', 'bolt'], color: 0x7ae0ff },
  k218: { tier: 'genç', fleet: 'Yüzgeçli, okyanus mavisi gemiler.', tactic: 'Jel topları ve yakın lazer; dağınık sürü halinde gelir.', attacks: ['goo', 'bolt', 'bolt'], color: 0x3a8ac8 },
  kepler186: { tier: 'genç', fleet: 'Canlı ağaç gövdeli gemiler.', tactic: 'Yavaş ama dayanıklı; kalkanlıları çok, lazerle dövüşür.', attacks: ['bolt', 'goo'], color: 0x6aa84a },
  gliese: { tier: 'gelişmiş', fleet: 'Lav damarlı kaya gövdeli ağır gemiler.', tactic: 'Ağır bombacılar ve güdümlü lav füzeleri; yavaş ama sert.', attacks: ['homing', 'bolt'], color: 0x8a3a1a },
  kepler452: {
    tier: 'kadim',
    fleet: 'Altın kaplı, süslü saray gemileri.',
    tactic: 'Kusursuz lazer ve füze. Amiral gemisi gerçek bir kara delik açar.',
    attacks: ['bolt', 'homing'],
    well: true,
    deterrent: 'Kara delik: amiral gemisi önünde bir kara delik açar; olay ufkuna düşen her gemi (sen, eşliğin, hatta kendileri) parçalanır. Uyarı gelince uzaklaş.',
    color: 0xe8c060,
  },
}
