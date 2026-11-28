import type { CreatureLook } from './creatures'
import { originById, type OriginId, type PlanetDef, type Village } from './origins'

/* Türler. Her köken bir türdür; seçtiğin gemi yürüyen karakterin görünümünü belirler.
   Gezegen yerlileri gezegenin köyüne ya da biyomuna göre kendi türündedir.
   Üs kuran, istila eden ve botlar aynı türleri kullanır. Gövdeler `creatures.ts` içinde. */

export type Look = CreatureLook & { name: string }

const ORIGIN_LOOKS: Record<OriginId, Look> = {
  earth: { id: 'earth', name: 'Dünya insanı', form: 'astronaut', style: 'walk', body: 0x5a86c8, skin: 0xffe1c4 },
  mars: { id: 'mars', name: 'Eski Marslı', form: 'colonist', style: 'walk', body: 0xc45a32, skin: 0xf0c8a8 },
  proxima: { id: 'proxima', name: 'Gölge', form: 'shade', style: 'stalk', body: 0x2a1426 },
  alpha: { id: 'alpha', name: 'Koca kafa', form: 'bighead', style: 'purple', body: 0x8d5ae0, skin: 0xd2b0ff },
  trappist: { id: 'trappist', name: 'Işıltı', form: 'crystal', style: 'hop', body: 0x2f9a90, skin: 0xbfeee6 },
  k218: { id: 'k218', name: 'Deniz', form: 'belly', style: 'waddle', body: 0x2f8fbf },
  kepler186: { id: 'kepler186', name: 'Filiz', form: 'sprout', style: 'walk', body: 0x4e8f38, skin: 0xcfe8a8 },
  gliese: { id: 'gliese', name: 'Kızıl', form: 'golem', style: 'waddle', body: 0xc45a22 },
  kepler452: { id: 'kepler452', name: 'Altın', form: 'regal', style: 'float', body: 0xe0b15a, skin: 0xfff0c0 },
}


/** Garibanlar: her sistemde boş gezegenleri koruyan tek tip yerli tür (uzay çöpçüleri). */
export const GARIBAN_LOOK: Look = { id: 'gariban', name: 'Gariban', form: 'gariban', style: 'waddle', body: 0x7a8a6a, skin: 0xb8e0a0 }

/** Tombişler: Altınların kuzenleri. Soluk Derin'in iki gezegeninde yaşarlar; oynanmaz, yerli olarak savunur. */
export const CHERUB_LOOK: Look = { id: 'cherub', name: 'Tombiş', form: 'cherub', style: 'float', body: 0xf2c860, skin: 0xffd9c2 }

/** Türlerin yerdeki farkı: hız, zıplama, yumruk gücü ve erimi. Kepler-186f yerde kendini onarır. */
export type FootTrait = { speed: number; jump: number; punch: number; reach: number; regen: number; blurb: string }

const FOOT: Record<OriginId, FootTrait> = {
  earth: { speed: 1, jump: 1, punch: 1, reach: 1, regen: 0, blurb: 'dengeli' },
  mars: { speed: 0.95, jump: 0.9, punch: 1.25, reach: 1, regen: 0, blurb: 'zırhlı kıyafet, sert yumruk' },
  proxima: { speed: 1.3, jump: 1.1, punch: 1.1, reach: 1.15, regen: 0, blurb: 'hızlı, uzun pençeli' },
  alpha: { speed: 0.95, jump: 1.3, punch: 0.8, reach: 1, regen: 0, blurb: 'yüksek zıplar, yumruğu yumuşak' },
  trappist: { speed: 1.1, jump: 1.45, punch: 0.85, reach: 1, regen: 0, blurb: 'seker, çok yükseğe çıkar' },
  k218: { speed: 0.85, jump: 0.9, punch: 1.35, reach: 1.25, regen: 0, blurb: 'göbekle iter: yavaş, ağır vurur' },
  kepler186: { speed: 1, jump: 1, punch: 0.9, reach: 1, regen: 1.6, blurb: 'toprağa basınca iyileşir' },
  gliese: { speed: 0.8, jump: 0.8, punch: 1.65, reach: 1.1, regen: 0, blurb: 'kaya yumruk: yavaş, çok sert' },
  kepler452: { speed: 1.12, jump: 1.2, punch: 1.3, reach: 1.1, regen: 0.6, blurb: 'süzülür, her şeyde iyi' },
}

export function footTrait(id: OriginId): FootTrait {
  return FOOT[id]
}

const VILLAGE_ORIGIN: Partial<Record<Village, OriginId>> = {
  human: 'earth',
  purple: 'alpha',
  plant: 'kepler186',
  ocean: 'k218',
  red: 'gliese',
  mars: 'mars',
  gold: 'kepler452',
  shadow: 'proxima',
}

export function originLook(id: OriginId): Look {
  return ORIGIN_LOOKS[id]
}

function mix(a: number, b: number, t: number) {
  const ch = (shift: number) => {
    const x = (a >> shift) & 255
    const y = (b >> shift) & 255
    return Math.round(x + (y - x) * t) << shift
  }
  return ch(16) | ch(8) | ch(0)
}

/** Gezegenin yerlilerinin türü: köyü varsa köyün türü, yoksa gezegenin rengine göre yabani tür. */
export function nativeLook(def: PlanetDef): Look {
  // Irk köyü olmayan bütün gezegenlerin yerlisi Garibanlardır.
  if (!def.village || def.village === 'ice') return GARIBAN_LOOK
  if (def.village === 'cherub') return CHERUB_LOOK
  const origin = def.village ? VILLAGE_ORIGIN[def.village] : undefined
  if (origin) return ORIGIN_LOOKS[origin]
  const variant = def.kind
  return {
    id: `wild:${def.id}`,
    name: 'Yerli',
    form: 'wild',
    variant,
    style: variant === 'small' ? 'hop' : variant === 'large' ? 'stalk' : 'waddle',
    body: mix(def.color, 0xffffff, 0.18),
    skin: mix(def.color, 0xffffff, 0.55),
    leg: mix(def.color, 0x000000, 0.35),
  }
}

export function factionName(id: OriginId) {
  if (id === 'earth') return 'Dünya insanları'
  if (id === 'mars') return 'Eski Marslılar'
  return `${originById(id).planet} halkı`
}
