import type { OriginId } from './origins'

/* Diplomasi: ırklar arası ilişki puanı (−100…100), anlaşmalar ve karşılaşma diyaloglarının sonuçları.
   Kurallar saf fonksiyonlar; oyun durumu game.ts'te. İleride çok oyunculu sürümde aynı kurallar
   oyuncular arasında da kullanılabilsin diye ayrı tutuldu. */

export type Res = { energy: number; ore: number; crystal: number }

export type Relation = {
  rel: number
  known: boolean
  trade: boolean
  ally: boolean
  /** Son karşılaşma/diplomasi eyleminden beri geçen süre (sn); sık hediye spam'ini önler. */
  cool: number
  /** Güven: ittifakı ne kadar sürdürür; düşükse ihanet edebilir. */
  trust: number
  /** Sömürge: bu ırk sana düzenli haraç öder; ilişki kötüleşirse ayaklanır. */
  vassal?: boolean
}

export type Stance = 'savaş' | 'gergin' | 'barış' | 'ticaret' | 'müttefik' | 'sömürge'

export function stance(r: Relation): Stance {
  if (r.vassal) return 'sömürge'
  if (r.ally) return 'müttefik'
  if (r.trade) return 'ticaret'
  if (r.rel <= -30) return 'savaş'
  if (r.rel < 10) return 'gergin'
  return 'barış'
}

/** Barış ve üstünde filolar seni avlamaz, birlikler saldırmaz. */
export function friendly(r: Relation | undefined) {
  return Boolean(r && (r.ally || r.trade || r.vassal || r.rel >= 10))
}

export type Persona = {
  leader: string
  /** Saldırganlık 0…1, açgözlülük 0…1, gurur 0…1. */
  temper: number
  greed: number
  pride: number
  greet: string
  angry: string
  warm: string
  /** Ticarette verdiği / istediği: ırkın bol kaynağı ucuz. */
  sells: keyof Res
}

export const PERSONA: Record<OriginId, Persona> = {
  earth: { leader: 'Amiral Deniz Kaya', temper: 0.45, greed: 0.5, pride: 0.4, greet: 'Burası Dünya filosu. Niyetinizi bildirin.', angry: 'Bu bir uyarı değil. Silahlar hazır.', warm: 'Dost bir yüz görmek iyi. Yıldızlar büyük, yer hepimize yeter.', sells: 'energy' },
  mars: { leader: 'Kervanbaşı Oru', temper: 0.55, greed: 0.6, pride: 0.7, greet: 'Kızıl Kervan yolunu kesmez; ama kesilmeye de gelmez.', angry: 'Zırhımız binlerce yıllık. Seninki kaç günlük?', warm: 'Kervanda yerin var, yolcu.', sells: 'ore' },
  proxima: { leader: 'Fısıltı', temper: 0.8, greed: 0.4, pride: 0.5, greet: '...seni çoktan gördük.', angry: 'Karanlık seni yutacak.', warm: 'Gölgede iki kişilik yer var. Şimdilik.', sells: 'crystal' },
  alpha: { leader: 'Bilge Uum', temper: 0.25, greed: 0.45, pride: 0.6, greet: 'İlginç. Senin türünü henüz kataloglamadık.', angry: 'Hesaplarımız senin yok oluşunu gösteriyor.', warm: 'Bilgi paylaşıldıkça çoğalır. Konuşalım.', sells: 'crystal' },
  trappist: { leader: 'Yedinci Işık', temper: 0.3, greed: 0.35, pride: 0.45, greet: 'Işığın titriyor, yabancı. Korkuyor musun?', angry: 'Kristaller kırılır; ama keskin kırılır.', warm: 'Işığın bizimkine uyumlu. Güzel.', sells: 'crystal' },
  k218: { leader: 'Derinlerin Annesi', temper: 0.35, greed: 0.55, pride: 0.35, greet: 'Okyanus geniş, sular sakin. Şimdilik.', angry: 'Dalga yükseliyor. Boğulacaksın.', warm: 'Gel, suyumuz serin, ticaretimiz bol.', sells: 'energy' },
  kepler186: { leader: 'Kök Ana', temper: 0.3, greed: 0.3, pride: 0.4, greet: 'Toprak seni hissediyor. Ağır basma.', angry: 'Kökler sabırlıdır; ama sonunda her şeyi sarar.', warm: 'Tohum ekiyoruz. Sen de ek.', sells: 'ore' },
  gliese: { leader: 'Kor Hükümdarı Thrag', temper: 0.85, greed: 0.5, pride: 0.8, greet: 'Kızıl güneşler altında yalnız güçlüler konuşur.', angry: 'EZİLECEKSİN.', warm: 'Güçlüsün. Saygı duyuyoruz. Şimdilik.', sells: 'ore' },
  kepler452: { leader: 'Altın Taç', temper: 0.5, greed: 0.7, pride: 0.95, greet: 'Huzurumuzda eğil, genç tür.', angry: 'Altın sabırsızlığı affetmez.', warm: 'Değerini kanıtladın. Tacın gölgesinde güvendesin.', sells: 'crystal' },
}

export function newRelation(): Relation {
  return { rel: 0, known: false, trade: false, ally: false, cool: 0, trust: 50 }
}

export function bump(r: Relation, d: number) {
  r.rel = Math.max(-100, Math.min(100, r.rel + d))
  if (r.rel < 25) r.trade = false
  if (r.rel < 55) r.ally = false
  if (r.rel < -20) r.vassal = false
}

/** Karşılaşmada seçenek sonucu. power: oyuncu gücü / filo gücü oranı. roll: 0…1 rastgele. */
export type Choice = 'attack' | 'peace' | 'pay' | 'demand' | 'trade' | 'flee'
export type Outcome = { fight: boolean; leave: boolean; rel: number; gain?: Partial<Res>; cost?: Partial<Res>; line: string; escape?: boolean }

export function resolve(choice: Choice, p: Persona, r: Relation, power: number, fleetSize: number, roll: number): Outcome {
  switch (choice) {
    case 'attack':
      return { fight: true, leave: false, rel: -18, line: p.angry }
    case 'peace': {
      const chance = 0.35 + r.rel / 150 + (1 - p.temper) * 0.35 + (power - 1) * 0.15
      if (roll < chance) return { fight: false, leave: true, rel: 12, line: p.warm }
      return { fight: true, leave: false, rel: -4, line: p.angry }
    }
    case 'pay': {
      const price = 12 * fleetSize
      if (p.temper > 0.8 && r.rel < -50 && roll < 0.5) return { fight: true, leave: false, rel: -2, line: p.angry, cost: {} }
      return { fight: false, leave: true, rel: 6, cost: { energy: price }, line: 'Kabul. Bu sefer.' }
    }
    case 'demand': {
      // Zayıfken de istenebilir; şansı düşüktür (reddederse saldırırlar).
      const chance = Math.max(0.06, 0.25 + (power - 1) * 0.45 - p.pride * 0.3)
      if (roll < chance) return { fight: false, leave: true, rel: -15, gain: { energy: 10 * fleetSize, ore: 4 * fleetSize }, line: 'Al ve git. Bunu unutmayacağız.' }
      return { fight: true, leave: false, rel: -12, line: p.angry }
    }
    case 'trade':
      return { fight: false, leave: true, rel: 3, line: p.warm }
    case 'flee':
      return { fight: false, leave: false, rel: -2, escape: true, line: p.greet }
  }
}

/** Ticaret fiyatı: ırkın bol kaynağı ucuz; ilişki iyiyse indirim. Enerji karşılığı bir birim kaynak. */
export function price(p: Persona, r: Relation, what: keyof Res) {
  const base = what === 'crystal' ? 9 : what === 'ore' ? 4 : 1
  const cheap = p.sells === what ? 0.7 : 1
  const mood = 1 - Math.max(-0.3, Math.min(0.3, r.rel / 200))
  return Math.max(1, Math.round(base * cheap * mood * (1 + p.greed * 0.3)))
}
