import type { OriginId, PlanetDef, UniId, Village } from './origins'

/* Hikâye, ırk tanıtımları, gezegen anlatıları ve ana görev zinciri metinleri.
   Oyun mantığı (hedefler, tamamlanma) game.ts'te; burada yalnız metin ve sıra var. */

export const PROLOGUE = [
  'Her şey tek bir noktaydı. Sonra ışık.',
  'Milyarlarca yıl sonra galakside dokuz tür yaşıyor ve hepsi aynı kuralı biliyor: ses çıkaran avlanır. Bu yüzden herkes saklanıyor. Buna karanlık orman diyorlar.',
  "Şimdi Sessiz Avlu'nun kara deliğinden bir çağrı geliyor. Işığın ilk anından kalma, çok eski bir sinyal. Kara deliğin kalbine ilk ulaşan tür ormanın kurallarını yeniden yazacak.",
]

export type RaceStory = {
  /** Tür adı (çoğul / halk). */
  people: string
  /** Kim oldukları, iki kısa cümle. */
  who: string
  /** Geminin adı ve kısa tarifi. */
  ship: string
  shipBlurb: string
  /** Bu türün başlangıç sahnesi. */
  opening: string
}

export const RACE_STORY: Record<OriginId, RaceStory> = {
  earth: {
    people: 'Dünya insanları',
    who: 'Galaksinin en genç ve en gürültülü türü. Merakları korkularından büyük.',
    ship: 'Öncü',
    shipBlurb: 'Dengeli gövde, mavi motor ışığı. Her işi biraz yapar.',
    opening: "Dünya'nın radyo yayınları yüz yıldır uzaya sızıyor. Birileri duymuş olmalı. Ay'ın ötesine ilk kez silahlı bir gemi çıkıyor ve pilotu sensin.",
  },
  mars: {
    people: 'Eski Marslılar',
    who: "Kuruyan Mars'ı bırakıp Ross 128 b'ye göçen kadim bir uygarlık. Zırhlı giysileri ve sert yumruklarıyla bilinirler.",
    ship: 'Kızıl Kervan',
    shipBlurb: 'Ağır zırh, turuncu çekirdek. Yavaş ama zor düşer.',
    opening: "Göçün üzerinden bin yıl geçti ve Ross 128 b artık yuva. Ama Mars'taki eski üslerden hâlâ sinyal geliyor. Kervanın kalkıyor.",
  },
  proxima: {
    people: 'Gölgeler',
    who: "Proxima b'nin hiç gün görmeyen yüzünde doğdular. Tek gözleri karanlıkta görür, pençeleri uzundur.",
    ship: 'Sis Bıçağı',
    shipBlurb: 'İnce, mor neonlu avcı. Karanlık yeteneğiyle neredeyse duyulmaz.',
    opening: 'Gölgeler saklanmayı herkesten iyi bilir. Yine de kara delikten gelen çağrı onları da uyandırdı. Sessizce avlanma vakti.',
  },
  alpha: {
    people: 'Koca kafalar',
    who: "Alpha B'nin mor ovalarında yaşayan bilgin bir tür. Kafaları büyük, kolları kısa. Yüksek zıplarlar.",
    ship: 'Düşünce Kubbesi',
    shipBlurb: 'Kubbeli, mor halkalı. Hızlı ve meraklı.',
    opening: 'Koca kafalar sinyali ilk çözen tür oldu. Çağrının bir yol tarifi olduğunu biliyorlar. Kubbeler kalkıyor.',
  },
  trappist: {
    people: 'Işıltılar',
    who: 'Yedi dünyalı TRAPPIST-1 sisteminde doğan kristal varlıklar. Sekerek yürür, ışıkla konuşurlar.',
    ship: 'Prizma',
    shipBlurb: 'Kristal kanatlar, turkuaz parıltı. Çevik.',
    opening: "Kristal kuleler sinyale ötüyor ve Işıltılar bu sesi duymazdan gelemiyor. TRAPPIST'in yedi dünyasından ilk prizma havalanıyor.",
  },
  k218: {
    people: 'Deniz halkı',
    who: "K2-18b'nin sınırsız okyanusunda yaşayan, göbekleriyle iten iri yüzücüler. Yavaştırlar ama ağır vururlar.",
    ship: 'Dalgakıran',
    shipBlurb: 'Geniş gövde, mavi su ışığı. Dayanıklı.',
    opening: 'Okyanus yükseliyor ve yuva daralıyor. Deniz halkı yeni sular arıyor. Dalgakıran ilk kez göğe dalıyor.',
  },
  kepler186: {
    people: 'Filizler',
    who: "Kepler-186f'nin kızıl ormanlarında yaşayan yürüyen bitkiler. Toprağa bastıkça iyileşirler.",
    ship: 'Tohum',
    shipBlurb: 'Yaprak kanatlı, yeşil ışıklı. Kendini onarır.',
    opening: 'Orman sinyali kökleriyle duydu. Filizler tohum gemilerini yıldızlara savuruyor; biri senin.',
  },
  gliese: {
    people: 'Kızıllar',
    who: "Gliese 667 Cc'nin ağır yerçekiminde, üç güneşin altında taşlaşmış lav devleri. Yavaş ama korkunç güçlüler.",
    ship: 'Kor',
    shipBlurb: 'Kaya zırh, lav çatlakları. Ağır ateş gücü.',
    opening: 'Üç güneş battığında Kızıllar savaşa çıkar. Kara delikten gelen çağrı onlara bir meydan okuma gibi geldi.',
  },
  kepler452: {
    people: 'Altınlar',
    who: "Kepler-452b'nin yaşlı yıldızı altında olgunlaşmış, süzülerek gezen soylu bir tür. En eski ve en güçlü olanlar onlar.",
    ship: 'Taç',
    shipBlurb: 'Altın halkalı efsane gemi. Her şeyde iyi.',
    opening: 'Altınlar ormanın en eski avcılarıdır. Çağrıyı duyduklarında gülümsediler: Işığın sahibi zaten onlar olmalı.',
  },
}

/** Yerli köylerinin kim olduğu ve oraya nereden geldikleri. */
const VILLAGE_LORE: Record<Village, string> = {
  human: 'Dünya insanlarının şehirleri burada. Gece yarısı bile ışıkları yanıyor.',
  mars: "Eski Marslıların terk edilmiş kubbeleri burada. Bazıları gitmeyi reddedip kaldı.",
  shadow: 'Gölgeler burada yaşıyor. Göz göze gelmeden önce seni çoktan görmüş olurlar.',
  purple: 'Koca kafaların araştırma köyü burada. Kafa sallayıp seni ölçüp biçerler.',
  ocean: "K2-18b'den taşan Deniz halkı bu dünyaya yerleşti. Sığ kıyılarda aileleriyle yaşarlar.",
  plant: 'Filizlerin tohumları bu toprağa düşmüş. Burada orman yürür.',
  red: 'Kızılların sürgünleri burada. Taş derileri sıcakta parlar.',
  gold: 'Altınların yazlık sarayları burada. Yabancılara karşı kibar ama acımasızlar.',
  ice: 'Buz yetileri bu donmuş dünyanın asıl sahipleri. Tüylü, iri ve sinirliler.',
}

const KIND_LORE: Record<string, string> = {
  small: 'Küçük, hafif bir dünya. Zıplayınca uçar gibi süzülürsün.',
  medium: 'Orta boy, kayalık bir dünya.',
  large: 'Ağır bir dev dünya. Her adım zor, zıplamak neredeyse imkânsız.',
}

/** Güneş Sistemi gezegenleri için elle yazılmış anlatılar. */
const NAMED_LORE: Record<string, string> = {
  merkur: "Güneş'e en yakın kavrulmuş taş. Gölgede donar, ışıkta erir.",
  venus: 'Asit bulutlarının altında cehennem sıcağı. Kimse burada uzun kalmaz.',
  dunya: 'Ev. Okyanuslar, şehirler ve yüz yıllık radyo gürültüsü.',
  ay: "Dünya'nın sessiz yoldaşı. Burada iz bırakan ilk ayak izleri hâlâ duruyor.",
  jupiter: 'Gaz devi. Fırtınaları Dünya’dan büyük.',
  saturn: 'Halkalarının arasında buzdan dağlar döner.',
  titan: 'Metan gölleri ve turuncu sis. Yaşam için tuhaf bir aday.',
  uranus: 'Yan yatmış buz devi. Mavi ve soğuk.',
  neptun: 'En uzak mavi dev. Rüzgârları sesten hızlı.',
}

export const SYSTEM_LORE: Partial<Record<UniId, string>> = {
  avlu: 'Sessiz Avlu: dokuz türün yollarının kesiştiği kara delik avlusu. Çağrı buradan geliyor.',
  kizil: 'Kızıl Sığ: kızıl cücelerin kalabalık sığlığı. Kapılar buradan her yöne açılır.',
  soluk: 'Soluk Derin: galaksinin unutulmuş, loş köşesi. En yaşlı türlere giden yol buradan geçer.',
}

export function planetLore(def: PlanetDef, owner?: string): string {
  const named = NAMED_LORE[def.id]
  if (def.lore) return def.lore
  const parts: string[] = []
  if (named) parts.push(named)
  else parts.push(KIND_LORE[def.kind] ?? '')
  if (def.village) parts.push(VILLAGE_LORE[def.village])
  else if (!named && def.landable !== false) parts.push('Burada yalnız yabani yerliler var. Kendi türlerinden başkasını tanımazlar.')
  if (owner) parts.push(`Şu an ${owner} burada üs tutuyor.`)
  return parts.filter(Boolean).join(' ')
}

export type QuestId =
  | 'fly'
  | 'land'
  | 'walk'
  | 'mine'
  | 'silent'
  | 'scan'
  | 'scout'
  | 'home'
  | 'fortify'
  | 'order'
  | 'wave'
  | 'upgrade'
  | 'gate'
  | 'meet'
  | 'outpost'
  | 'squad'
  | 'capture'
  | 'avlu'
  | 'free'

export type QuestText = {
  id: QuestId
  chapter: string
  title: string
  story: string
  /** Masaüstü ipucu ve dokunmatik ipucu. {target} hedefin adıyla değişir. */
  hint: string
  touch: string
}

/* Öğretici zincir: uçuş → yüzey → kaynak → sessizlik → tarama → ilk av → yuva → dizilim →
   dalga → parça → kapı → diplomasi → karakol → baskın → çağrı. Her adım bir mekaniği öğretir. */
export const QUESTS: QuestText[] = [
  {
    id: 'fly',
    chapter: 'Bölüm 1 · İlk adım',
    title: "{target}'a uç",
    story: 'Evinin yörüngesinden ilk kez ayrılıyorsun. Kendi sisteminde az duyulursun; ama motor ve silah sesi yine de birikir.',
    hint: 'W ile ilerle, fareyle yön ver. Ekrandaki ◆ işareti hedefi gösterir.',
    touch: 'Joystick ile ilerle ve dön. Ekrandaki ◆ işareti hedefi gösterir.',
  },
  {
    id: 'land',
    chapter: 'Bölüm 1 · İlk adım',
    title: "{target}'a in",
    story: 'Yüzeye yakınsın. Gemiyi park et ve ayağını toprağa bas.',
    hint: 'Gezegene yaklaşınca L ile in.',
    touch: 'Gezegene yaklaşınca İn düğmesine bas.',
  },
  {
    id: 'walk',
    chapter: 'Bölüm 1 · İlk adım',
    title: 'Yüzeyi keşfet',
    story: 'Gezegenler dağlarla, kristallerle, yataklarla dolu. Etrafına bak.',
    hint: 'WASD ile biraz yürü (Boşluk zıpla). Sağ tık basılıyken fareyi oynatırsan karakterinin yüzünü görürsün.',
    touch: 'Joystick ile biraz yürü. Dururken ekranı sürüklersen kamera karakterinin çevresinde döner.',
  },
  {
    id: 'mine',
    chapter: 'Bölüm 1 · İlk adım',
    title: 'Kaynak topla',
    story: 'Parlayan kayalar maden (⛏), ışıyan sivri taşlar kristal (◆). Gemi parçaları ve üsler bunlarla yapılır.',
    hint: 'Bir yatağın yanına yürü ve F ile vur. Yatak tükenince söner.',
    touch: 'Bir yatağın yanına yürü ve Yumruk ile vur. Yatak tükenince söner.',
  },
  {
    id: 'silent',
    chapter: 'Bölüm 2 · Sessizlik',
    title: 'Sessiz süzül',
    story: 'Ormanda hayatta kalmanın yolu duyulmamak. Motoru kapatınca yavaşlarsın ama küçük iticilerle süzülürsün; görünürlüğün hızla erir.',
    hint: 'Gemine bin (L), V ile sessiz moda geç ve biraz süzül.',
    touch: 'Gemine bin, Sessiz düğmesine bas ve biraz süzül.',
  },
  {
    id: 'scan',
    chapter: 'Bölüm 2 · Sessizlik',
    title: 'Çevreyi tara',
    story: 'Tarama, menzilindeki gemileri ve yatakları ortaya çıkarır; ama bir an için sen de parlarsın. Az ve doğru zamanda kullan.',
    hint: 'T ile tara. Radar halkası menzili gösterir.',
    touch: 'Tara düğmesine bas. Radar halkası menzili gösterir.',
  },
  {
    id: 'scout',
    chapter: 'Bölüm 2 · Sessizlik',
    title: 'Keşif gemisini avla: {target}',
    story: 'Taraman bir yabancı yakaladı: komşu türün keşif gemisi sistemde dolaşıyor ve gürültü yapıyor. O seni görmeden sen onu gör.',
    hint: 'Radardaki kırmızı noktaya sessizce yaklaş, sonra ateş et (sol tık). Yaklaşınca savaş başlar.',
    touch: 'Radardaki kırmızı noktaya sessizce yaklaş, sonra Ateş.',
  },
  {
    id: 'home',
    chapter: 'Bölüm 3 · Yuva',
    title: 'Üssüne dön: {target}',
    story: 'Keşif gemisi düştü; ama gönderen tür artık seni arayacak. Yuvanı hazırla.',
    hint: '◆ işaretini izle ve ev gezegenine in.',
    touch: '◆ işaretini izle ve ev gezegenine in.',
  },
  {
    id: 'fortify',
    chapter: 'Bölüm 3 · Yuva',
    title: 'Üssünü güçlendir',
    story: 'Üsler büyüdükçe görkemli yapılara dönüşür ve daha çok halk barındırır. Bir taret dik ya da üssü yükselt.',
    hint: 'Çekirdeğin yanında T: taret, B: yükselt.',
    touch: 'Çekirdeğin yanında Taret ya da Üs düğmesine bas.',
  },
  {
    id: 'order',
    chapter: 'Bölüm 3 · Yuva',
    title: 'Birliklerini diz',
    story: 'Halkın emrini bekliyor. Taretlerin önüne dizilirlerse düşmanı ateşe çekerler; arkasında beklerlerse daha az yara alırlar.',
    hint: 'Y ile Emirler panelini aç ya da 1–4 tuşlarıyla dizilim seç (2: taret önü, 3: taret arkası).',
    touch: 'Emir düğmesine bas ve bir dizilim seç.',
  },
  {
    id: 'wave',
    chapter: 'Bölüm 3 · Yuva',
    title: 'İlk dalgayı savuştur',
    story: 'Dalgalar kendiliğinden gelir. Taretlerin ve yerleşimcilerin dizildikleri yerde savaşır; sen de yumruğun ve ırk yeteneğinle (G) yardım et.',
    hint: 'Üste kal; sayaç bitince dalga gelir. F yumruk, G ırk yeteneği.',
    touch: 'Üste kal; sayaç bitince dalga gelir. Yumruk ve Yetenek düğmeleri.',
  },
  {
    id: 'upgrade',
    chapter: 'Bölüm 3 · Yuva',
    title: 'Gemine parça tak',
    story: 'Gemi düz güçlenmez: her kademede iki parçadan birini seçersin. En güzel ve en güçlü parçalar türüne özel efsane parçalar.',
    hint: 'Gemine yürü, sol tık / E: bir yuva seç ve iki parçadan birini tak.',
    touch: 'Gemine yürü, Geliştir: bir yuva seç ve iki parçadan birini tak.',
  },
  {
    id: 'gate',
    chapter: 'Bölüm 4 · Komşular',
    title: 'Solucan deliğinden geç: {target}',
    story: 'Dönen mor girdap ve çevresindeki altı direk: solucan deliği. Dikkat: başka sistemde çok daha çabuk görünür olursun.',
    hint: '◆ işaretindeki solucan deliğine dal.',
    touch: '◆ işaretindeki solucan deliğine dal.',
  },
  {
    id: 'meet',
    chapter: 'Bölüm 4 · Komşular',
    title: 'Bir türle konuş',
    story: 'Her filo düşman değil. Barış, ticaret, haraç ya da savaş: seçimlerin ilişkileri kalıcı olarak değiştirir.',
    hint: 'Bir filoyla karşılaşınca seçeneklerden birini seç ya da O ile Diplomasi panelini aç.',
    touch: 'Bir filoyla karşılaşınca seçeneklerden birini seç ya da Diplomasi düğmesine bas.',
  },
  {
    id: 'outpost',
    chapter: 'Bölüm 4 · Komşular',
    title: 'Karakol kur',
    story: 'Yeni bir dünyada türünün izini bırak. Önce oranın yerlilerini yenmen gerekir. Yeşil ve okyanuslu dünyalar daha kalabalık koloniler taşır.',
    hint: 'Bir gezegene in, yerlileri yen, sonra B ile karakol kur.',
    touch: 'Bir gezegene in, yerlileri yen, sonra Üs düğmesiyle karakol kur.',
  },
  {
    id: 'squad',
    chapter: 'Bölüm 5 · Baskın',
    title: 'Baskın ekibi topla',
    story: 'Tek başına bir üssü alamazsın. Halkından bir ekip seninle gelsin; Emirler panelinden takip, bekle ya da saldır de.',
    hint: 'Kendi üssünün çekirdeğinin yanında K. Ekibe 5 takip, 6 bekle, 7 saldır.',
    touch: 'Kendi üssünün çekirdeğinin yanında Ekip düğmesi; emir için Emir düğmesi.',
  },
  {
    id: 'capture',
    chapter: 'Bölüm 5 · Baskın',
    title: 'Bir düşman üssünü ele geçir: {target}',
    story: 'Düşman üssü tüm savunmacılarıyla bekler. Hepsini ve taretlerini düşürürsen üs teslim olur ve senin olur.',
    hint: 'Ekibinle düşman gezegenine in; savunmacıları ve taretleri yen.',
    touch: 'Ekibinle düşman gezegenine in; savunmacıları ve taretleri yen.',
  },
  {
    id: 'avlu',
    chapter: 'Bölüm 6 · Çağrı',
    title: "Sessiz Avlu'nun kara deliğine ulaş",
    story: 'Çağrı buradan geliyor. Olay ufkuna yaklaş; ama ışığın büküldüğü yerde zaman da bükülür.',
    hint: "◆ işaretini izle: Sessiz Avlu'daki kara deliğe yaklaş.",
    touch: "◆ işaretini izle: Sessiz Avlu'daki kara deliğe yaklaş.",
  },
  {
    id: 'free',
    chapter: 'Son · Işığın sahibi',
    title: 'Ormanı büyüt',
    story: 'Çağrıyı duydun ve ona ulaştın. Artık orman senin kurallarınla işliyor. Koloni kur, üs al, türünü büyüt. İpucu: P ile fotoğraf modu.',
    hint: 'Serbest oyun: koloni sayını artır, düşman üslerini al, ittifaklar kur.',
    touch: 'Serbest oyun: koloni sayını artır, düşman üslerini al, ittifaklar kur.',
  },
]

export const EPILOGUE =
  'Olay ufkunun kenarında ışık durdu ve çağrının ne olduğunu anladın: sinyal bir çağrı değil, bir aynaymış. Ona ulaşan her tür kendi sesini duyar. Senin sesin artık ormanın en yüksek sesi. Saklanmak yok; büyüme var.'
