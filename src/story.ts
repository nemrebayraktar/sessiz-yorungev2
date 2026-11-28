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
  cherub: 'Tombişlerin yurdu. Altınların tombul, bebek yüzlü kuzenleri süzülerek dolaşır; gülerek savaşır, yurtlarını kimseye bırakmazlar.',
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
  | 'clear'
  | 'orbit'
  | 'outpost2'
  | 'fortify'
  | 'order'
  | 'wave'
  | 'airdef'
  | 'upgrade'
  | 'gate'
  | 'meet'
  | 'outpost'
  | 'squad'
  | 'aa'
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
    id: 'walk',
    chapter: 'Bölüm 1 · Evin',
    title: 'Evini tanı',
    story: 'Burası senin evin: türünün ilk üssü, ortada parlayan yapı çekirdek. Yürü, etrafına bak; dağlar, yataklar ve halkın burada.',
    hint: 'WASD ile yürü (Boşluk zıpla, fare ile bak; yukarı bakıp gökyüzünü görebilirsin).',
    touch: 'Joystick ile yürü. Ekranı sürükleyerek etrafına bak.',
  },
  {
    id: 'mine',
    chapter: 'Bölüm 1 · Evin',
    title: 'Kaynak topla',
    story: 'Parlayan kayalar maden (⛏), ışıyan sivri taşlar kristal (◆). Maden: taret, üs yükseltmesi, gemi parçası. Kristal: ileri parçalar ve üst seviye üsler. İşçilerin de yataklardan taşır; sen de kazabilirsin.',
    hint: '◆ işaretindeki yatağa yürü ve F ile vur.',
    touch: '◆ işaretindeki yatağa yürü ve Yumruk ile vur.',
  },
  {
    id: 'fortify',
    chapter: 'Bölüm 1 · Evin',
    title: 'Üssünü güçlendir',
    story: 'Çekirdeğin yanında üssü büyütürsün. Taret (enerji + 2 maden) üssü korur; yükseltme (B) nüfus, kışla ve atölye açar.',
    hint: 'Çekirdeğin yanında T: kara tareti, B: üssü yükselt.',
    touch: 'Çekirdeğin yanında Taret ya da Üs düğmesi.',
  },
  {
    id: 'squad',
    chapter: 'Bölüm 1 · Evin',
    title: 'Ekibini topla',
    story: 'Halkın senin ordun. Çekirdeğin yanında ekip toplarsan seninle yürür, gemine biner ve indiğin gezegende savaşır. Ay\'daki Garibanları temizlemek için onlara ihtiyacın var.',
    hint: 'Çekirdeğin yanında K. (Aynı yerde tekrar K ekibi üsse geri bırakır.)',
    touch: 'Çekirdeğin yanında Ekip düğmesi.',
  },
  {
    id: 'fly',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: 'Gemine bin ve {target}\'a uç',
    story: 'Ekibin gemine biniyor. Komşu gezegeni Garibanlar tutuyor: uzay çöpçüleri, minik ve iri gözlü; her sistemin boş gezegenlerinde yaşarlar. Kendi sistemini onlardan alarak başlayacaksın.',
    hint: 'Gemine yürü, L ile bin. W ile ilerle, fareyle yön ver; ◆ işaretini izle.',
    touch: 'Gemine yürü, Bin. Joystick ile uç; ◆ işaretini izle.',
  },
  {
    id: 'land',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: '{target}\'a in',
    story: 'Yaklaştın. İnince ekibin de seninle iner.',
    hint: 'Gezegene yaklaşınca L ile in.',
    touch: 'Gezegene yaklaşınca İn düğmesi.',
  },
  {
    id: 'clear',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: '{target}\'daki Garibanları temizle',
    story: 'Garibanlar kulübelerinden çıkıp saldırır. Ekibin seninle dövüşür; G ile ırk yeteneğini de kullan.',
    hint: 'F yumruk, G yetenek. Ekibine Y panelinden "Saldır" diyebilirsin.',
    touch: 'Yumruk ve Yetenek düğmeleri; ekibin seninle dövüşür.',
  },
  {
    id: 'outpost',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: '{target}\'a karakol kur',
    story: 'Gezegen temizlendi. Burada bir karakol kur: halkın burada da büyür, işçiler bu yataklardan da taşır.',
    hint: 'B ile karakol kur.',
    touch: 'Üs düğmesiyle karakol kur.',
  },
  {
    id: 'silent',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: 'Sessiz süzül',
    story: 'Ormanda hayatta kalmanın yolu duyulmamak. Sessiz modda yavaşlarsın ama görünürlüğün hızla erir. Başkaları seni duymasın.',
    hint: 'Gemine bin (L), V ile sessiz moda geç ve biraz süzül.',
    touch: 'Gemine bin, Sessiz düğmesine bas ve biraz süzül.',
  },
  {
    id: 'scan',
    chapter: 'Bölüm 2 · Ay ve ötesi',
    title: 'Sistemini tara',
    story: 'Tarama sistemdeki türleri, kolonileri ve askerleri gösterir; ama birkaç saniye sen de radarda parlarsın. Az ve doğru zamanda kullan.',
    hint: 'Gemideyken T ile tara.',
    touch: 'Tara düğmesine bas.',
  },
  {
    id: 'orbit',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: '{target} yörüngesini temizle',
    story: 'İkinci gezegenin yörüngesinde Garibanların hurda gemileri dolaşıyor. Bu sefer gemiyle, havadan temizle.',
    hint: '◆ gezegene uç; yaklaşınca savaş başlar. Sol tık ateş, Tab hedef seç, B kaç.',
    touch: '◆ gezegene uç; Ateş düğmesiyle hurda gemileri düşür.',
  },
  {
    id: 'outpost2',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: '{target}\'a karakol kur',
    story: 'Yörünge temiz, yerliler kaçtı. İn ve ikinci karakolunu kur: kendi sistemin artık senin.',
    hint: 'Gezegene in (L) ve B ile karakol kur.',
    touch: 'Gezegene in ve Üs düğmesiyle karakol kur.',
  },
  {
    id: 'order',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: 'Komuta panelini tanı (Y)',
    story: 'Y komuta panelidir; yürürken de uçarken de açılır. Üç bölümü var. Üstte bulunduğun üssün dizilimi: taret önü (düşmanı ateşe çeker), taret arkası (az yara alır), hücum. Ortada yanındaki ekibin emri: takip, bekle, saldır. Altta bütün kolonilerin: kaç asker, işçi ve taret var; tek tıkla duruş (Ekonomi = çok işçi, çok kaynak · Savunma = çok asker, sert taret · Saldırı hazırlığı = hızlı eğitim, büyük ekip), kışlada asker eğit, komutan yetiştir.',
    hint: 'Y ile paneli aç; "Kolonilerin" bölümünde ana üssüne bir duruş seç ya da üstte bir dizilim seç (1–4).',
    touch: 'Emir düğmesine bas; "Kolonilerin" bölümünde bir duruş ya da üstte bir dizilim seç.',
  },
  {
    id: 'wave',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: 'İlk dalgayı savuştur',
    story: 'Dalgalar kendiliğinden gelir. Taretlerin ve yerleşimcilerin dizildikleri yerde savaşır; sen de yumruğun ve ırk yeteneğinle (G) yardım et.',
    hint: 'Üste kal; sayaç bitince dalga gelir. F yumruk, G ırk yeteneği.',
    touch: 'Üste kal; sayaç bitince dalga gelir. Yumruk ve Yetenek düğmeleri.',
  },
  {
    id: 'airdef',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: 'Hava saldırısını püskürt',
    story: 'İki tür taret var. Kara tareti (T) yerdeki saldırganı vurur; hava savunma tareti (Shift+T) gezegene yaklaşan gemileri. Şimdi düşman akıncıları üssünü yukarıdan bombalamaya geliyor.',
    hint: 'Çekirdeğin yanında Shift+T ile hava savunma tareti kur. Akıncılar gelince taretin vurur; istersen gemine binip F ile sen de kapış.',
    touch: 'Çekirdeğin yanında Taret düğmesi (önce hava savunma kurar). Akıncılar gelince taretin vurur; istersen gemine bin ve kapış.',
  },
  {
    id: 'upgrade',
    chapter: 'Bölüm 3 · Kendi sistemin',
    title: 'Gemine parça tak',
    story: 'Gemi düz güçlenmez: her kademede iki parçadan birini seçersin. En güzel ve en güçlü parçalar türüne özel efsane parçalar.',
    hint: 'Gemine yürü ve U tuşuna bas: bir yuva seç (1–5) ve iki parçadan birini tak.',
    touch: 'Gemine yürü, Geliştir: bir yuva seç ve iki parçadan birini tak.',
  },
  {
    id: 'gate',
    chapter: 'Bölüm 4 · Komşular',
    title: 'Solucan deliğinden geç: {target}',
    story: 'Dönen mor girdap ve çevresindeki altı direk: solucan deliği (eşik). Her eşik başka bir sisteme açılır; hepsi sonunda galaksinin ortasındaki kara deliğe, Sessiz Avlu\'ya bağlanır. Sol üstteki Harita düğmesi bütün yolları gösterir. Dikkat: başka sistemde çok daha çabuk görünür olursun.',
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
    id: 'aa',
    chapter: 'Bölüm 5 · İşgal',
    title: 'Hava savunmasını kır: {target}',
    story: 'Düşman üslerinin camgöbeği halkalı hava savunma taretleri yaklaşan gemiyi vurur, seni de. Ekibini indirmeden önce yörüngeden ateş ederek onları düşür.',
    hint: '◆ hedef üssün üstünde uç; camgöbeği halkalı taretlere ateş et. Can azalırsa menzilden (~130) çık, kalkan dolsun.',
    touch: '◆ hedef üssün üstünde uç; camgöbeği halkalı taretlere ateş et. Can azalırsa uzaklaş, kalkan dolsun.',
  },
  {
    id: 'capture',
    chapter: 'Bölüm 5 · İşgal',
    title: 'Bir düşman üssünü ele geçir: {target}',
    story: 'Düşman üssü tüm savunmacılarıyla bekler. Hepsini ve taretlerini düşürürsen üs teslim olur ve senin olur. Çekirdeği yıkarsan da (yumrukla ya da gemiden) adım tamamlanır; boş gezegene kendi karakolunu kurarsın. Herhangi bir düşman üssü sayılır.',
    hint: 'Ekibinle (K) düşman gezegenine in; kara taretlerini ve savunmacıları yen. Kayıpları kışlada yerine koy: Y → Asker eğit.',
    touch: 'Ekibinle düşman gezegenine in; kara taretlerini ve savunmacıları yen. Kayıpları kışlada yerine koy: Emir → Asker eğit.',
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
