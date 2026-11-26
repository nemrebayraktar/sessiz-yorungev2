import type { OriginId } from './origins'

/* Gemi parçaları: düz seviye yerine her kademede iki seçenekten biri (artı/eksi dengesi),
   son kademe (5) ırka özel efsane parça. Parçalar enerji + maden + kristal ister. */

export type Slot = 'hull' | 'shield' | 'weapon' | 'engine' | 'stealth'

export type Mods = {
  hull: number
  shield: number
  regen: number
  weapon: number
  engine: number
  /** Gürültü çarpanı: küçük = daha sessiz. */
  noise: number
}

export type Cost = { energy: number; ore: number; crystal: number }

export type Part = { id: string; slot: Slot; tier: number; name: string; blurb: string; mods: Partial<Mods>; legend?: boolean }

export const SLOTS: { id: Slot; name: string }[] = [
  { id: 'hull', name: 'Gövde' },
  { id: 'shield', name: 'Kalkan' },
  { id: 'weapon', name: 'Silah' },
  { id: 'engine', name: 'Motor' },
  { id: 'stealth', name: 'Gizlilik' },
]

export function tierCost(tier: number): Cost {
  return [
    { energy: 0, ore: 0, crystal: 0 },
    { energy: 0, ore: 0, crystal: 0 },
    { energy: 36, ore: 4, crystal: 0 },
    { energy: 64, ore: 10, crystal: 1 },
    { energy: 100, ore: 18, crystal: 3 },
    { energy: 150, ore: 26, crystal: 6 },
  ][Math.max(0, Math.min(5, tier))]
}

const MK = ['', '', 'II', 'III', 'IV']

/** 2–4. kademede iki seçenek: biri güç, biri incelik. */
function choices(slot: Slot, tier: number): [Part, Part] {
  const k = tier - 1
  const mk = MK[tier]
  switch (slot) {
    case 'hull':
      return [
        { id: `hull-a${tier}`, slot, tier, name: `Zırh plakası ${mk}`, blurb: `+${20 * k} gövde, motor biraz yavaşlar`, mods: { hull: 20 * k, engine: 1 - 0.02 * k } },
        { id: `hull-b${tier}`, slot, tier, name: `Hafif alaşım ${mk}`, blurb: `+${9 * k} gövde, motor biraz hızlanır`, mods: { hull: 9 * k, engine: 1 + 0.03 * k } },
      ]
    case 'shield':
      return [
        { id: `shield-a${tier}`, slot, tier, name: `Kalın kalkan ${mk}`, blurb: `+${14 * k} kalkan`, mods: { shield: 14 * k } },
        { id: `shield-b${tier}`, slot, tier, name: `Hızlı dolum ${mk}`, blurb: `Kalkan ${Math.round(18 * k)}% daha hızlı dolar, +${5 * k} kalkan`, mods: { shield: 5 * k, regen: 1 + 0.18 * k } },
      ]
    case 'weapon':
      return [
        { id: `weapon-a${tier}`, slot, tier, name: `Ağır namlu ${mk}`, blurb: `Atışlar %${10 * k} daha sert, ama daha gürültülü`, mods: { weapon: 1 + 0.1 * k, noise: 1 + 0.05 * k } },
        { id: `weapon-b${tier}`, slot, tier, name: `Susturucu ${mk}`, blurb: `Atışlar %${4 * k} daha sert ve daha sessiz`, mods: { weapon: 1 + 0.04 * k, noise: 1 - 0.06 * k } },
      ]
    case 'engine':
      return [
        { id: `engine-a${tier}`, slot, tier, name: `Yıldırım iticisi ${mk}`, blurb: `%${8 * k} daha hızlı, biraz daha gürültülü`, mods: { engine: 1 + 0.08 * k, noise: 1 + 0.03 * k } },
        { id: `engine-b${tier}`, slot, tier, name: `Fısıltı iticisi ${mk}`, blurb: `%${3 * k} hızlı ve çok daha sessiz`, mods: { engine: 1 + 0.03 * k, noise: 1 - 0.07 * k } },
      ]
    case 'stealth':
      return [
        { id: `stealth-a${tier}`, slot, tier, name: `Sinyal emici ${mk}`, blurb: `Gürültü %${10 * k} azalır`, mods: { noise: 1 - 0.1 * k } },
        { id: `stealth-b${tier}`, slot, tier, name: `Yansıtıcı kaplama ${mk}`, blurb: `Gürültü %${5 * k} azalır, +${7 * k} kalkan`, mods: { noise: 1 - 0.05 * k, shield: 7 * k } },
      ]
  }
}

/** Irkların efsane parça adları ve ırka uygun özel güçleri. */
const LEGEND: Record<OriginId, { prefix: string; bias: Slot }> = {
  earth: { prefix: 'Öncü', bias: 'shield' },
  mars: { prefix: 'Kızıl Kervan', bias: 'hull' },
  proxima: { prefix: 'Sis', bias: 'stealth' },
  alpha: { prefix: 'Düşünce', bias: 'engine' },
  trappist: { prefix: 'Prizma', bias: 'shield' },
  k218: { prefix: 'Derinlik', bias: 'hull' },
  kepler186: { prefix: 'Kök', bias: 'shield' },
  gliese: { prefix: 'Kor', bias: 'weapon' },
  kepler452: { prefix: 'Taç', bias: 'weapon' },
}

const LEGEND_NAME: Record<Slot, string> = {
  hull: 'Gövdesi',
  shield: 'Kalkanı',
  weapon: 'Topu',
  engine: 'Çekirdeği',
  stealth: 'Peçesi',
}

export function legendPart(race: OriginId, slot: Slot): Part {
  const l = LEGEND[race] ?? LEGEND.earth
  const boost = l.bias === slot ? 1.5 : 1
  const mods: Partial<Mods> =
    slot === 'hull'
      ? { hull: 90 * boost }
      : slot === 'shield'
        ? { shield: 55 * boost, regen: 1 + 0.4 * boost }
        : slot === 'weapon'
          ? { weapon: 1 + 0.45 * boost }
          : slot === 'engine'
            ? { engine: 1 + 0.32 * boost, noise: 0.92 }
            : { noise: 1 - 0.35 * boost }
  const what = slot === 'hull' ? 'gövde' : slot === 'shield' ? 'kalkan' : slot === 'weapon' ? 'ateş gücü' : slot === 'engine' ? 'hız' : 'sessizlik'
  return { id: `legend-${race}-${slot}`, slot, tier: 5, name: `${l.prefix} ${LEGEND_NAME[slot]}`, blurb: `Efsane: çok büyük ${what}${boost > 1 ? ' (ırkının uzmanlığı, ekstra güçlü)' : ''}. Gemine ışıklı yeni bir görünüm verir.`, mods, legend: true }
}

/** Bir yuvanın sıradaki kademesindeki seçenekler (kademe 2–4 iki seçenek, 5 tek efsane). */
export function nextOptions(race: OriginId, slot: Slot, tier: number): Part[] {
  const next = tier + 1
  if (next > 5) return []
  if (next === 5) return [legendPart(race, slot)]
  return choices(slot, next)
}

export function partById(race: OriginId, id: string): Part | null {
  if (id.startsWith('legend-')) {
    const slot = id.split('-').pop() as Slot
    return legendPart(race, slot)
  }
  const m = /^(\w+)-([ab])(\d)$/.exec(id)
  if (!m) return null
  const [a, b] = choices(m[1] as Slot, Number(m[3]))
  return m[2] === 'a' ? a : b
}

/** Takılı parçaların toplam etkisi. */
export function sumMods(race: OriginId, ids: string[]): Mods {
  const out: Mods = { hull: 0, shield: 0, regen: 1, weapon: 1, engine: 1, noise: 1 }
  for (const id of ids) {
    const p = partById(race, id)
    if (!p) continue
    out.hull += p.mods.hull ?? 0
    out.shield += p.mods.shield ?? 0
    out.regen *= p.mods.regen ?? 1
    out.weapon *= p.mods.weapon ?? 1
    out.engine *= p.mods.engine ?? 1
    out.noise *= p.mods.noise ?? 1
  }
  return out
}
