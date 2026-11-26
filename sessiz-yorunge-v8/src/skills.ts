import type { OriginId } from './origins'

/* Irkların yaya yetenekleri (G / dokunmatik "Yetenek"). Her ırkın kendi tarzına uygun:
   kolonistler hava desteği çağırır, golemler yeri sarsar, gölgeler arkadan vurur... */

export type SkillId = 'strike' | 'shell' | 'shadow' | 'mind' | 'shards' | 'tide' | 'roots' | 'quake' | 'halo'

export type Skill = {
  id: SkillId
  name: string
  blurb: string
  cd: number
  /** Etkin kalma süresi (anlık yetenekler için 0). */
  dur: number
  radius: number
  dmg: number
  color: number
  sound: string
}

export const SKILLS: Record<OriginId, Skill> = {
  earth: { id: 'strike', name: 'Hava desteği', blurb: 'Yörüngeden üç atış: çevrendeki düşmanları vurur.', cd: 18, dur: 0, radius: 14, dmg: 38, color: 0x7fc8ff, sound: 'colonist' },
  mars: { id: 'shell', name: 'Zırh kabuğu', blurb: '6 sn boyunca sen ve ekibin çok az hasar alırsınız.', cd: 20, dur: 6, radius: 0, dmg: 0, color: 0xff8a4a, sound: 'clank' },
  proxima: { id: 'shadow', name: 'Gölge adımı', blurb: 'İleri ışınlanır, yanındakini keser; 4 sn yumrukların üç kat vurur.', cd: 14, dur: 4, radius: 6, dmg: 30, color: 0xff3a7a, sound: 'shade' },
  alpha: { id: 'mind', name: 'Zihin dalgası', blurb: 'Çevredeki düşmanları 4 sn sersemletir.', cd: 18, dur: 0, radius: 16, dmg: 10, color: 0xb98aff, sound: 'bighead' },
  trappist: { id: 'shards', name: 'Kristal fırtınası', blurb: 'Etrafına keskin kristaller saçar.', cd: 16, dur: 0, radius: 12, dmg: 34, color: 0x8af0ff, sound: 'crystal' },
  k218: { id: 'tide', name: 'Gelgit', blurb: 'Düşmanları geri iter; sen ve ekibin iyileşirsiniz.', cd: 20, dur: 0, radius: 13, dmg: 14, color: 0x4ad8ff, sound: 'belly' },
  kepler186: { id: 'roots', name: 'Kök sarmaşığı', blurb: 'Düşmanları kökle bağlar, ekibini iyileştirir.', cd: 18, dur: 0, radius: 14, dmg: 12, color: 0x7aff7a, sound: 'sprout' },
  gliese: { id: 'quake', name: 'Deprem', blurb: 'Yeri yarar: geniş alanda ağır hasar.', cd: 20, dur: 0, radius: 15, dmg: 46, color: 0xff6a2a, sound: 'golem' },
  kepler452: { id: 'halo', name: 'Altın hale', blurb: '8 sn: sen, ekibin ve üs birliklerin daha sert vurur, daha az hasar alır.', cd: 24, dur: 8, radius: 0, dmg: 0, color: 0xffd76a, sound: 'regal' },
}

export function skillOf(id: OriginId): Skill {
  return SKILLS[id] ?? SKILLS.earth
}
