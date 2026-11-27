# Sessiz Yörünge — proje rehberi

Türkçe tarayıcı oyunu. Tek sayfa, sunucusuz. Oyuncu bir gemi seçer, kara deliklerin ve yıldız sistemlerinin arasında uçar, solucan deliğiyle evren değiştirir, gezegene inip yürür.  Taban commit: `8ad4cc1`; üs savunması, kolonizasyon ve üretilmiş sistemler bunun üstüne eklendi.

Bu dosya kodun yanında durur. Yeni bir oturumda önce bunu oku, sonra `src/game.ts` içine dal.

## Çalıştırma

Gereken: Node.js ve npm. Bağımlılık yalnızca `three` (0.187). Tipler `@types/three@0.187`.

```bash
npm install
npm run dev
```

Adres: http://127.0.0.1:4317 (`vite.config.ts`, `host: 0.0.0.0`, `strictPort`). Üretim:

```bash
npm run build
npm run preview
```

`npm run build` önce `tsc`, sonra Vite. Çıktı `dist/`. `dist/` ve `node_modules/` kaynağın parçası değildir.

Headless test, dev sunucu ayaktayken:

```bash
node scripts/e2e-v6.mjs
```

Playwright Chromium ister (`npx playwright install chromium`). WebGL için scriptler `--use-gl=angle --use-angle=swiftshader` kullanır. `requestAnimationFrame` headless ortamda yavaşlar; hasar testleri duvar saatiyle değil, `window.__sessiz` üzerinden sabit `dt` adımlarıyla yazılır.

## Klasör

| Yol | Ne işe yarar |
|---|---|
| `index.html` | Bütün DOM: intro, seçim, HUD, dokunmatik düğmeler, harita paneli, duraklatma. Metinler Türkçe. |
| `src/main.ts` | Fontları ve CSS'i import eder, `boot()` çağırır. |
| `src/game.ts` | Simülasyonun tamamı. `Game` sınıfı: modlar, uçuş, savaş, yaya, evren, kamera, HUD. En büyük dosya; yeni davranış buraya eklenir. |
| `src/origins.ts` | 9 köken, silah kademeleri, 12 evren (`UNIVERSES`), gezegen tanımları, `homeSystem`, `starterWeapons`. Güneş Sistemi elle yazılıdır; diğer 11 evrenin gezegenleri `worldgen.ts` ile üretilir. |
| `src/worldgen.ts` | Evren kimliğinden türeyen sabit tohumla gezegen sistemi üretir: sayı, tür, boyut, renk, halka, isim, köy. Kara delik ve solucan deliğine yörünge çarpışması denetler. Saf veri, Three.js yok. |
| `src/colony.ts` | Üs/koloni/dalga sabitleri ve saf mantığı (maliyetler, taret/çekirdek/nüfus formülleri, istilacı ve yerleşimci birimleri, `waveRoster`) ile `Colony`, `Turret`, `Unit` tipleri. |
| `src/species.ts` | Türler: `originLook`, `nativeLook`, `factionName`, `footTrait`. Köken ve yerli görünümleri, türlerin yerdeki farkları tek yerde. |
| `src/creatures.ts` | Türlerin yaya gövdeleri (`buildCreature`): astronot, kolonist, Gölge, Koca kafa, kristal, göbekli Deniz, Filiz, lav golemi, Altın, yeti ve üç yabani yerli biçimi. Ortak `Rig` arayüzü, paylaşılan geometri önbelleği. |
| `src/groundfx.ts` | Yüzey dövüşü görselleri: `RigFlash` (vuruş parlaması), `Sparks`, `Tracers` (mermi izi), `Swing` (yumruk yayı). |
| `src/meshes.ts` | Three.js gövdeleri: gemiler, yaya rig'i (`buildRig`), yerliler, gezegen, solucan deliği, etiket. |
| `src/shaders.ts` | Yıldız, bulutsu, kara delik diski ve mercek post-process. |
| `src/input.ts` | Klavye, fare, sağdaki bakış dokunuşu, sol joystick, `data-act` düğmeleri. |
| `src/persist.ts` | `localStorage` ayar/rekor (`sessiz-yorunge-v1`). Koşu yedeği `sessionStorage` (`sessiz-yorunge-run`). |
| `src/audio.ts` | Küçük WebAudio bus. Dosya çalmaz. |
| `src/portraits.ts` | Seçim ekranındaki pilot portrelerini canvas'a çizer. |
| `src/style.css` | HUD, seçim çubuğu, 820px altı mobil yerleşim. |
| `scripts/e2e*.mjs` | Playwright. `e2e.mjs` ilk tur, `e2e-v3` … `e2e-v11` sonraki turlar. Hepsi `window.__sessiz` kullanır. |
| `public/` | `favicon.svg`, `icons.svg`. Küçük, prosedürel ikonlar. |
| `vite.config.ts` | `base: '/'`, port 4317. |
| `tsconfig.json` | `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`. Enum ve parametre property yok. |
| `vercel.json` | Statik Vite çıktısı. Oyun sunucusuz. |

## Mimari kurallar

- Vite `base` `'/'` kalır. GitHub Pages alt yolu (`/sessiz-yorunge/`) için kullanıcı derlenmiş `index.html` içindeki `/assets/...` yollarını elle `./` yapar. Kaynakta yeni mutlak `/dosya` yüklemesi ekleme. Font, shader, doku ve model `import` ile gelsin. `index.html` favicon'u `./favicon.svg`.
- Sahne Three.js r152+ API'si (projede 0.187). `EffectComposer`: RenderPass, mercek, bloom, OutputPass. Tek `WebGLRenderer`.
- Oyun durumu `Game` alanlarında. Ayrı bir state kütüphanesi yok. Kalıcı rekor ve ayar `persist.ts`. Evren değişince can, kalkan, silah ve yetenek beklemesi bellektekidir; konum evren başına `returns` içinde.
- Modlar: `intro | title | select | map | combat | upgrade | pause | gameover`. Yaya/gemi `layer: 'ship' | 'foot'`. Yaya yalnız haritada.
- Dokunmatik: `#touch` (`pointer: coarse` veya testlerde `body.force-touch`). Joystick `#stick`. Düğmeler `data-act` (`fire`, `land`, `jump`, `punch`, `weapon`, `ab1`, `ab2`, …). `Input` bunları boolean bayrak yapar; oyun kenar tetiklerini kendi sayar.
- Test kancası `window.__sessiz` (`Game.expose`). Yeni davranışı headless doğrulamak için buraya ince bir metod ekle; rAF'a güvenme.
- UI metni Türkçe kalsın. Dokuz köken, G/H yetenekleri, seçim çubuğu ve mevcut evrenler bozulmasın.
- Performans: yalnız aktif evrenin gezegenleri ve köyleri sahnededir (`layoutUniverse`). Uzak ilgi noktaları gizlenir.

## Oynanışın iskeleti

Dokuz köken: Dünya, Ross 128 b (eski Marslılar), Proxima b, Alpha Centauri B, TRAPPIST-1e, K2-18b, Kepler-186f, Gliese 667 Cc, Kepler-452b. Her birinin evi bir yıldız sistemidir (`homeSystem`). Dünya'nın evi `gunes` (Güneş, Merkür, Venüs, Dünya, Ay, Mars, Jüpiter, Satürn, Titan, Uranüs, Neptün). Ara bölgeler: Sessiz Avlu, Kızıl Sığ, Soluk Derin. Kapı ağı aşağıda (Aşama 9).

Kendi evine girince kalkan hızlanır (`Ev sistemi`). Ev gezegenine inince tam iyileşme ve kısa silah gücü. Yabancı köken evine girince pusu filosu çıkar.

Silahlar sırayla: lazer, saçma, roket, plazma, şimşek. Başlangıç köken kademesine göredir (Dünya/Ross 128 b yalnız lazer, Kepler-452b beşi). Skor 80 / 180 / 320 / 500 ile sonrakiler açılır.

Gezegenler yatay düzlemde yavaş yörünge çizer; Y sabittir. Kendi eksenlerinde dönerler. İniş `L` veya İn. Yürüyüş eklemli rig (`buildRig`): yön `footForward`, kamera arkada.

## Türler, üs savunması ve kolonizasyon

Yaya modunda (`layer: 'foot'`) çalışır; mantık `game.ts` içinde "Üs savunması, koloniler, türler ve yüzey dövüşü" bloğundadır (`updateGround` giriş noktası, `updateFoot` çağırır).

**Türler (`src/species.ts`).** Her köken bir türdür (`originLook`). Seçtiğin gemi yürüyen karakterin görünümünü belirler (`syncWalker`, `buildRig(style, palette)`). Gezegen yerlileri gezegenin köyüne göre kendi türündedir (`nativeLook`): köyü olmayan gezegende renginden türeyen yabani bir tür. Aynı türden yerliler dost sayılır. Yerliler temizlenince (`cleared`) ya da gezegende üs varsa yeniden doğmaz. Üs kuran, istila eden, bot ve oyuncu aynı kuralları kullanır; her `Unit` bir `faction` (köken kimliği) taşır ve farklı hizip = düşman.

**Üs ve koloni.**
- **B**: üs yoksa kurar. Kendi ev gezegeninde **Ana üs** (30 enerji, bir taret bedava, sınırsız dalga). Başka her inilebilir gezegende **karakol** (60 enerji, bir taret bedava): üç dalgayı (`SIEGE_WAVES`) savuşturursan **koloni** olur (sonra da seyrek baskın alır). Üssün yanında B: hasar varsa onarır, yoksa seviye yükseltir (en çok 5).
- **T**: taret (20 enerji, yuva `turretSlots`). **V**: sıradaki dalgayı erken çağırır.
- **Nüfus:** üssün türünden yerleşimciler `settlerCap(level, taretSayısı)` tavanına kadar doğar (seviye 1'de 3, seviye 5'te 32+). Nüfus (`Colony.pop`) gezegen yüklü değilken de büyür; ölen yerleşimci nüfusu düşürür. Yüksek seviyede Nişancı ve Koruyucu da çıkar (`settlerKind`).
- **Savunma:** dalgayı bir hizip gönderir (`pickAttacker`); yerleşimciler istilacıları uzaktan fark edip saldırır (`updateUnits`), taretler de vurur. Dalga yalnız oyuncu o gezegende yürürken ilerler; gemiye binersen yarıda kalır.
- Çekirdek düşerse oyuncunun üssü silinir; bot üssü ise istilacının türüne geçer (`flipOwner`). İstilacı türü oyuncununki ise bot üssü oyuncunun olur.
- Koloniler pasif enerji (`accrueIncome`) ve kalkan bonusu (`colonyBonus`) verir. Üsler `Game.colonies` içinde bellektedir; `resetRun` ile silinir. Rekor dalga `save.bestWave`.

**Botlar (diğer türler).** Evren ilk kurulduğunda tohumla (`seedBotColonies`) ev sahibi tür ev gezegenini, bazı gezegenleri rastgele türler tutar. Bot üsleri de aynı mekanikle nüfus büyütür, taret ve çekirdeğe sahiptir; oyuncu yürürken kendi dalgalarını alırlar. Düşman bot yerleşimcileri ve taretleri oyuncuya saldırır; çekirdeğe ve taretlere yumruk atarak yıkılır (+40 enerji, gezegen boşalır). `botEvent` her ~70 sn'de bulunduğun evrende yeni üs kurar, üs büyütür ya da iki bot üssünü savaştırıp birini el değiştirir.

**Yüzey.** Üstünde yürüdüğün gezegen kendi ekseninde dönmez (`Planet.spin`). `separate()` oyuncuyu, yerlileri, birimleri, taretleri ve çekirdeği daire gibi iter. Vuruşlar `impact()`/`footHurt()` ile görünür (hasar sayısı, kıvılcım, parlama, yumruk yayı, sarsıntı). Dost birimin ayağında yeşil, düşmanın ayağında kırmızı halka vardır.

## Gezegen sistemleri

`UNIVERSES` yüklenirken `tilted()` (yıldızlı ev sistemleri) ve `courtyard()` (kara delik avluları) `generateSystem` çağırır. Tohum `sessiz:<evren id>` olduğundan bir evren her oyunda aynıdır ama evrenler birbirine benzemez. Değişmez kurallar: ev gezegeni `<id>-ev` (büyük, inilebilir, köylü), her sistemde en az bir küçük ve bir büyük inilebilir dünya var. Eski sabit kimlikler (`cakil`, `yuk`, `kutle`, `dev`, `boncuk`...) artık yoktur; testlerde türden (`kind`) bul.

## Test

`scripts/e2e-v7.mjs` sistem benzersizliğini, üs/dalga/taret akışını ve kolonizasyonu dener. Yeni test kancaları: `landOnId`, `giveEnergy`, `setLevel`, `botColonies`, `conquer`, `foundBase`, `placeTurret`, `baseAction`, `callWave`, `stepGround`, `punch`, `faceNearest`, `approachLocal`, `groundOverlap`; `snap()` içinde `colonies`, `invaders`, `settlers`, `pops`, `walkerLook`, `locals`, `queued`, `bestWave`.

## Dokunma

`src/game.ts` tek sınıf ve uzundur. Küçük bir değişiklik için önce ilgili özel metodu ara (`updateFoot`, `updateCamera`, `layoutUniverse`, `transit`, `firePrimary`). Davranışı `origins.ts` verisine çekmek, `game.ts`'e yeni sabit gömmekten iyidir.

## Aşama 6 (ev sisteminden başlangıç, yerinde savaş, ganimet, karakol canı)
- Başlangıç: `resetRun` → `seedWorld()` dokuz türün hepsine kendi ev sisteminde (homeSystem) ev gezegeninde BOT_START_LEVEL karakol kurar; oyuncu kendi ev sisteminde, ev gezegeninin yanında `foundStartOutpost` ile sv 1 ana karakolla başlar. Oyuncunun ev sisteminde başta bot yok; 3-5 küçük eğitim gemisi (`Fleet.small`) dolaşır (`spawnHomePatrols`, `keepHomePatrols`).
- Savaş: `beginCombat` artık sahne/mod değiştirmez (mode 'map' kalır). Düşmanlar filonun bulunduğu yerde doğar (`spawnEnemies(count, threat, at, small)`), `updateSkirmish` haritada çalışır. 'combat' modu tipte duruyor ama kullanılmıyor.
- Ganimet: düşen gemi/karakol `dropLoot` ile parlak parçalar bırakır; 48 birimde gemiye çekilir, `collectLoot` enerji verir, LOOT_TO_OUTPOST payı ana karakol deposuna (`Colony.store`) gider, depo UPGRADE_COST'a ulaşınca karakol kendiliğinden seviye atlar (`feedOutpost`). Gemi geliştirme: U tuşu / Esc menüsü "Gemiyi geliştir".
- Düşman karakolu: can coreHullMax(level), zırh coreArmor(level); uzaydan vurulabilir (`hitOutpost`, `damageOutpost`), yakındaki gemiye ateş eder (`updateOutpostGuns`). Yıkılınca gezegen `cleared` (yerli doğmaz) ve RAZE_LOCK süre `razed` (bot kuramaz); oyuncu kurabilir. Can çubuğu sabit ekran boyutlu sprite (HUD'u örtmez).
- Botlar: `botEvent` → `botMove(f)` her BOT_TICK'te iki tür: önce ev sistemini karakollaştırır, sonra geliştirir, sonra solucan deliği komşularına baskın (boş gezegene kurar ya da başka botun karakolunu ele geçirir). HOME_GRACE saniye oyuncunun ev sistemine dokunmaz. Oyuncu kolonilerine soyut baskın yok (oyuncu oradayken dalgalar gelir).
- İleride: `Colony.reserve` yerleşimcilerin gemiyle oyuncuyu takip etmesi için ayrıldı (şimdilik kullanılmıyor).
- Mobil performans: uzak yerleşimcilerin uzuv animasyonu `animNow` ile seyreltilir.
- Test: scripts/e2e-v8.mjs (SHOTS_DIR=... ile ekran görüntüsü).

## Aşama 7 (v5: büyük gezegenler, ayrık yörüngeler, iniş düzeltmesi)
- Ölçek sabitleri `worldgen.ts` içinde: `PLANET_SIZE` (2,5; gövde yarıçapı), `SYSTEM_SPREAD` (3,4; elle yazılmış kara delik ve solucan deliği konumları `tone()` içinde bununla dışa açılır, sis yoğunluğu da aynı oranda incelir), `ORBIT_GAP` (200; iki yörünge halkasının yüzeyleri arasındaki en az boşluk), `WORM_CLEAR` (260; solucan deliği çevresinde gezegensiz pay).
- Çakışma kuralı halka tabanlıdır: gezegenler merkez çevresinde farklı açısal hızlarla döndüğü için iki gövdenin konumları değil, yörünge halkaları (düz yarıçap, y) arasındaki mesafe denetlenir (`bodyReach`, halkalı devlerde 1,7 × yarıçap). Böylece hiçbir açıda iki gezegen birbirine girmez. Eski v4'te Dünya ile Ay 44 birim iç içe giriyordu.
- Güneş Sistemi `solarSystem()` ile halka halka dizilir (Güneş 195, Dünya 325, Jüpiter 500 yarıçap; sistem ~6.800 birim). Solucan delikleri halka düzleminin çok üstünde/altındadır (`solarWorm`). Üretilen sistemler 2.400–4.400 birim yayılır.
- Oynanış değerleri (yerçekimi, zıplama, adım) eski boyuttan hesaplanır; yalnız görünür/çarpışma yarıçapı büyüdü. Yıldız dışındaki her gövdeye inilebilir (Jüpiter, Uranüs, Neptün ve üretilmiş gaz devleri dahil).
- İniş hatası: gemi yüzeye `yarıçap + 2,5`'te kenetlenirken `nearestLandable` `irtifa > 3,2` istiyordu, ayrıca `bestAlt = 99` büyük gezegenlerde menzili 99'a kesiyordu. Şimdi alt sınır yok, menzil `landReach()` = max(40, 0,35 × yarıçap). İniş olmazsa `landMiss()` nedenini söyler (yıldız / kaç birim daha yaklaşmalı).
- Evrene göre: harita sınırı `mapLimit` (en uzak yörünge + 900), enerji parçaları merkez gövdenin dışında (`fragInner`), Güneş ısı bölgesi yarıçapla orantılı. Gökyüzü küresi (`SKY_RADIUS` 20.000) ve yıldızlar kamerayla birlikte gider; kamera uzak düzlemi 24.000.
- Seyir: açık uzayda hız sınırı 380'e çıkar (`speedCap`); çatışmada, gövdelerin ve deliklerin yakınında eski 215 geçerli.
- Test kancaları: `planetPos(id)`, `skyOnCamera()`, `mapLimit()`. Test: `scripts/e2e-v9.mjs`.

## Aşama 8 (v6: tür karakterleri, park edilen gemi, yayayken savaş)
- **Tür gövdeleri** `src/creatures.ts`: `buildCreature(look)` her türe ayrı gövde kurar; `Look.form` hangisi olduğunu seçer (`species.ts`). Tatlılar: astronot (Dünya), Koca kafa (Alpha, antenli), kristal Işıltı (TRAPPIST), koca göbekli Deniz (K2-18, solungaçlı), Filiz (Kepler-186f), yeti (buz köyleri). Korkunçlar: Gölge (Proxima; tek kırmızı göz, dişler, pençeler, sırt dikenleri), lav golemi Kızıl (Gliese). Kolonist (Mars) ve Altın (Kepler-452b, haleli, süzülür) ayrı. Yabani yerliler gezegen rengini taşır: küçük gezegende tek gözlü sekici, ortada göz saplı sümüklü, büyükte kıskaçlı böcek.
- `Rig` artık `hips` (zıplama/süzülme katmanı) ve `wiggle` (anten, solungaç, yaprak) taşır. `RigStyle` yeni değerler: `float` (süzülür), `stalk` (kambur, sinsi). Ayaklar kökün `FEET` (−1,05) altındadır; kök eskisi gibi yüzeyden ~1,05 yukarıda kalır. Birim halkası ve yumruk yayı ayak/gövde hizasına göre konumlanır.
- **Yaya özellikleri** `footTrait(origin)`: hız, zıplama, yumruk gücü ve erimi, yerde iyileşme (Kepler-186f, Kepler-452b). Seçim ekranında "yerde <tür>: <özellik>" yazar.
- **Park edilen gemi** gezegene göre saklanır (`parkOffset`); yürüyen karakter de gezegenin yer değiştirmesini alır (`footCenter`). Eskiden gezegen yörüngede ilerlerken gemi yerinde kalıyor, karakter yüzeyde kayıyordu.
- **Yayayken savaş:** inişte süren savaş `stashSkirmish` ile askıya alınır; düşman gemileri gezegenin 160 birim üstünde filo olur, yere inmez. Filolar yayayken oyuncunun üstündeki yörüngeyi hedefler (`fleetAim`). Kalkışta bu filo yeniden saldırır (`Fleet.stashed`). `updateSkirmish` yalnız gemideyken çalışır.
- **Gezegene bağlı devriyeler:** eğitim gemileri ev gezegenine bağlıdır (`Fleet.around/offset`); gemiler ve filolar gezegenlerin içinden geçmez (`keepOutOfPlanets`).
- **Köy figürleri** yalnız yörüngeden görülen yaşam izidir; yüzeye inince, gezegen temizlenince ya da üs kurulunca gizlenir (`updateLod`). Eskiden karakoldan sonra vurulamayan, donmuş bir "yerli" kalıyordu.
- **Yerliler** artık yay boyu (birim) cinsinden doğar ve sallanır; büyük gezegende 50–125 birim uzakta doğmaz, yerinde ±8 birim kaymaz (yumruklar ıskalamaz).
- Test kancaları: `shipGap`, `fleetAlt`, `villageLife`, `localsDebug`, `stepWorld`. Test: `scripts/e2e-v10.mjs`.
- Gezegenin kendi ekseninde dönüşü yüzey hızına göre (`spinRateOf`, ~2,4 birim/sn): v5 büyütmesinde sabit açısal hız büyük gezegenlerde yüzeyi saniyede 30–60 birim akıtıyor, karakol topları gemiyi ıskalıyordu.

## Aşama 9 (v7: Ross 128 b, kapı ağı, ırka göre hız, sınır/kamera, haritalar)
- **Eski Marslılar:** `mars` kökeninin evi artık Ross 128 b (11 ışık yılı, sakin kızıl cüce). Hikâye: Mars'ın eski uygarlığı kuruyan yurdunu bırakıp buraya göç etti. İç kimlikler değişmedi (`mars`, evren `marskol`, gezegen `marskol-ev`); oyuncu "Ross 128" görür. Tür adı "Eski Marslı", `species: 'alien'`. Güneş Sistemi aynen duruyor; oradaki Mars terk edilmiş eski yurt (köyü `mars`, inince `lore` satırı). Yeni köy türü `mars` → Eski Marslı görünümü (eskiden "kızıl" köy Gliese golemi gösteriyordu).
- **Kapı ağı** (`origins.ts`, bütün kapılar iki yönlü): Güneş–Ross 128, Güneş–Avlu, Ross–Avlu, Ross–Proxima, Avlu–Kızıl, Avlu–Alpha, Alpha–Kızıl, Alpha–K2-18, Proxima–Kızıl, Proxima–Kepler-186, Kızıl–Soluk, Kızıl–K2-18, K2-18–TRAPPIST, TRAPPIST–Gliese, TRAPPIST–Kepler-186, Kepler-186–Soluk, Soluk–Gliese, Soluk–Kepler-452, Gliese–Kepler-452. Kepler-452'ye: Dünya ve Ross 4 kapı, Proxima/Alpha/K2-18 3, TRAPPIST/Kepler-186 2, Gliese 1. Sessiz Avlu zayıfların, Kızıl Sığ ortanın, Soluk Derin güçlülerin kavşağı. Eski tek yönlü iki kapı (TRAPPIST→Soluk, Gliese→Mars) yok. Yeni kapı ağı yalnız Kızıl Sığ'ın gezegen dizilimini değiştirdi.
- **Irka göre seyir hızı** `cruiseSpeed(origin)` (`origins.ts`): kademe tablosu `CRUISE_BY_TIER = [140, 175, 210, 250, 290]` × (0,88 + 0,04 × Hız). Dünya 140 … Kepler-452b 313; motor geliştirmesi seviye başına %5. Gövde yakınında ve savaşta sınır `min(215, seyir × 0,85)`. Zayıf ırkla sistemi geçmek ~35–50 sn, güçlüyle ~16 sn.
- **Takla/kamera:** `levelWings` burun dikleştikçe ve gemi ters dönmüşken düzlemez (eskiden dikeyde ve takladan sonra saniyede yüzlerce derece yuvarlıyordu). Kolay modda burun ±80°'yi geçmez. Kovalama kamerası "yukarı"yı gemiden alır (`camUp`), yaya kamerası gezegen normalinden; başlık/seçim kameraları dünya yukarısına döner.
- **Sınır** `edgeReturn`: dışa hız sönümlenir, gemi merkeze döner, `mapLimit + 400`'de sert duvar; 8 sn'de bir uyarı. Eskiden yay gibi çekiyordu, ileri basılıyken sınırda takılıp kalınıyordu.
- **Haritalar:** sağ alt radar N tuşu ya da tıklamayla "Sistem" görünümüne geçer (`drawSystemMap`: yörüngeler, gezegenler, karakollar yeşil/kırmızı, kapılar ve gittikleri yer, rota). Harita panelinde kapı ağı diyagramı (`drawNetMap`, `NET_LAYOUT`; düğüme dokun → rota) ve "⌂ Eve dön" (`routeHome`, kapı kapı ev gezegenine). Rota satırı kalan kapı sayısını ve sıradaki eşiği yazar. Kenar etiketleri HUD'un üstüne binmez.
- Test kancaları: `steerProbe`, `hops`, `cruise`, `gates`, `radarMode`, `toggleRadar`, `routeHome`, `routeNextGate`. Test: `scripts/e2e-v11.mjs`.

## Aşama 10 (v8: telefon ekranı, geminin yanında geliştirme, yancılar, baskın ekibi)
- **Telefon HUD.** Üst bar sıkıştırıldı (`.flight` hız + mesafe, `.chips` rozetleri). Dikey (`max-width 820 portrait`) ve yatay (`max-height 520 landscape`) için ayrı bloklar: radar sağ üstte sabit, saatler yalnız `body.rel` iken (zaman/ölçek bükülmesi), dokunmatik ızgara dikeyde 3, yatayda 4 sütun. Yayayken gemi düğmeleri gizli (`body.on-foot .ship-only`), boş yetenek yuvaları gizli (`no-ab1/no-ab2`). Telefonda en çok 3 işaret, ekran kenarına kıstırılır (`paintBeacons`). Dar ekranda yaya kamerası daha geride (`footCamera`).
- **Gemi geliştirme.** `U` artık yalnız uzayda hatırlatır. Yeterli enerji olunca `#upgrade-hint` parlar ("bir gezegene in, gemine dokun"). Yüzeyde park edilmiş geminin 9 birim yakınında **sol tık** (yakında düşman yoksa) ya da **E** / dokunmatik **Geliştir** menüyü açar (`nearParkedShip`, `canUpgrade`, `openUpgrades`).
- **Yancılar (`buildMinion`, creatures.ts).** Her ırkın küçük, sade sürümü + bir imza parçası (kask, vizör, tek göz, anten, kristal…). `settler` ve istilacı `runner` bu gövdeyi kullanır; ana karakterler (`guard`, `archer`) ve ağır istilacılar tam gövde (`buildCreature`, dokunulmadı). Ana karakter sayısı üs seviyesine bağlı: `heroCap(level) = min(4, level-1)`; geri kalan nüfus yancı.
- **Baskın ekibi.** Kendi üssünün çekirdeğine yakınken **K** / dokunmatik **Ekip** (yalnız `body.squad-ready` iken görünür): önce ana karakterler (en çok 3, `SQUAD_HEROES`), sonra yancılar, toplam en çok 8 (`SQUAD_MAX`); üste en az 1 kişi kalır. Toplananlar `Unit.squad = true`, `colonyId = ''` olur ve nüfustan düşer. Yerdeyken oyuncuyu izler. Aynı yerde K tekrar: ekip koloniye döner.
  - Gemiye binince (`board`) ekip `Game.squad` listesine alınır, 1–4 küçük **eşlik gemisi** (`buildEscorts`, `ESCORT_SLOTS`) arkada kanat düzeninde uçar ve çatışmada her 1,4 sn en yakın düşmana ateş eder (dokunulmaz).
  - İnişte (`land` → `disembark`) ekip oyuncunun çevresine iner. Dost olmayan yerlileri (30 birim), düşman birimlerini (22), düşman taretlerini ve 70 birim içindeki düşman çekirdeğini hedefler. Ekip aldığı hasarı yarıya indirir, 1,5× vurur. Yerliler ekibe karşılık verir. Baskın sürerken düşman üssü savunmacıyı 3 sn'de bir çıkarır.
  - Ekip düşman çekirdeğini düşürürse `baseLost` üssü oyuncunun türüne geçirir ve ekip oraya yerleşir (ölmez). Ekip yerdeyken karakol kurarsan (`foundBase` → `joinSquad`) ekip yeni karakola katılır.
  - HUD: `#squad-flag` rozeti "Ekip N"; üs yanında istem "K — ekip topla / ekibi bırak".
- Test: `scripts/e2e-v12.mjs` (topla → bin → eşlik → yerliler → karakola katılım → yeniden topla → baskın ve ele geçirme → telefon düğmesi). Kancalar: `squadAction`, `squadInfo`, `toShip`, `toCore(gap)`, `weakenCore`, `wildPlanet`, `landHere`.

## Aşama 11 (v9: kontrol düzeltmeleri, 3B seçim ekranı, hikâye ve görevler, neon gemiler, ırk sesleri)
- **Yaya kontrolü yeniden yazıldı.** Eskiden sağ/sol ters çalışıyordu (sağ vektörü `cross(up, forward)` aslında soldu). Artık hareket kameraya göre: `footView` kameranın baktığı yön, `footForward` karakterin yüzü; karakter gittiği yöne döner. Dokunmatikte yana basınca kamera yavaşça arkaya geçer. Dururken sürükleme (dokunmatik) ya da sağ tık / Z basılıyken fare kamerayı karakterin çevresinde döndürür (`orbitYaw/orbitPitch`), yüzünü görürsün.
- **Gemi dokunmatik:** joystick yatay ekseni artık gemiyi döndürür (yana kaymaz). Gemi yavaşken "Bak" düğmesi ya da sağ tık / Z: kamera geminin çevresinde döner (`shipOrbitYaw/Pitch`). Q/E dokunmatik düğmeleri kaldırıldı.
- **Ayarlar ayrı panel** (`#settings`): ana menüden ve duraklatmadan açılır. Joystick tarafı (sol/sağ, `body.stick-right`), ters bakış, görev rehberi aç/kapa, hassasiyetler. Paneller kaydırılabilir, üstte ✕ ve dışına dokununca kapanır (kontroller paneli artık telefonda kilitlenmez). Dokunmatik düğmeler yalnız oyun sırasında (`body.playing`).
- **Uzak vuruş karesi kalktı.** `impact(..., by)`: yalnız oyuncunun vuruşu nişan karesi/sarsıntı yapar. Taret ve birlik vuruşları sağ üstteki **olay akışında** (`#feed`, `feed()`): ×N sayaçlı, birkaç saniyede söner.
- **Dalga/işgal:** V ve "Dalga" düğmesi kaldırıldı, dalgalar zamanla kendiliğinden gelir. Karakol için o gezegenin dost olmayan yerlileri yenilmeli. Düşman üssüne inince tüm savunmacılar hazırdır; oyuncu tarafı saldırınca **kuşatma** başlar (`besieged`: takviye yok), savunmacılar ve taretler düşünce **üs teslim olur** (`surrender` → `baseLost(..., originId)`).
- **Hikâye ve görevler** (`story.ts`): önsöz + ırkın açılış sahnesi seçimden sonra (`#story`). 12 adımlı görev zinciri (`QUESTS`): ilk uçuş/iniş → keşif → eve dönüş → üs güçlendirme → dalga → geliştirme → kapı → karakol → ekip → fetih → Sessiz Avlu kara deliği → serbest oyun. Görev kartı (`#quest`), ekranda ◆ hedef işareti ve kenar oku (`paintQuestMark`), rota otomatik görev hedefine kurulur (`RouteTarget` artık `hole` da olabilir). Günlük (`#journal`, J): görev, hikâye, keşifler. İnilen her gezegenin anlatısı (`planetLore`) bir kartla gösterilir ve günlüğe yazılır. Görev tamamlanınca enerji ödülü.
- **Seçim ekranı:** gerçek 3B karakter (`buildCreature`) ve gemi, sürükleyerek döndürülür; kamera sahne alanını hedefler (dikey telefonda üst bant). Seçim ekranında mercek kapalı (oyundaki mercek aynen duruyor). Irk adı, kim oldukları, yerdeki ve gemideki özellik kartları.
- **Neon gemiler** (`ships.ts`, `buildNeonBody`): her ırka ayrı tasarım; neon şeritler `toneMapped=false` ile bloom'da parlar; dönen parçalar (`spinShip`). Motor alevleri `SHIP_STYLE.engine` konumunda.
- **Sesler** (`audio.ts`): ırka özel sentez sesler (`RACE_TIMBRE`): birim saldırı/acı/ölüm sesleri, yumruk, taret, ırka göre gemi ateşi ve motor tınısı; uzaklığa göre kısılır (`earGain`).
- **Uzuvlar gövdeye bağlı** (`creatures.ts`, `connectParts`): modeller aynen korunur; her kol/bacağa eklem topu eklenir, eklemden gövde yüzeyine (gövde merkezine atılan ışınla bulunur) kısa bir bağlantı silindiri çizilir, kafa havadaysa boyun eklenir. Ana karakterler ve yancılar (`buildMinion`) için ortak. Sivri gövdeli yancılara (Gölge, Işıltı) küçük bir leğen eklendi.
- Test: `scripts/e2e-v13.mjs` (menüde dokunmatik yok, ayarlar/joystick tarafı, kontroller ✕, 3B seçim, önsöz, görev zinciri ve ◆, gezegen anlatısı, D/A yönü, gemi joystick dönüşü, olay akışı/nişan karesi). v12 yeni kurallara göre güncellendi (yerliler temizlenmeden karakol yok; kuşatma ve teslim).
- **Irka özgü saldırılar** (`attackPose`, `attackSound`, `audio.attackFx`): saldırı zamanlayıcısı (0,36 sn) kurulma ve vuruş eğrisine bölünür; gövde biçimine göre poz: Dünya düz yumruk, Marslı tepeden balyoz, Gölge atılıp ısırır (çene açılır) ve pençeler, Koca kafa kafa atar, Işıltı dönerek keser, Deniz göbekle iter, Filiz sarmaşık kolla kırbaçlar, Kızıl (golem) iki yumrukla yeri döver, Altın asa kaldırıp büyü yapar, Buz yetisi kükreyip ezer, yabaniler sıçrar. Her birinin kendi sentez sesi var; yancılarda ses daha ince. Oyuncu, birimler ve yerliler aynı sistemi kullanır.
- **Performans:** gemi gövdesinin sabit parçaları malzemeye göre tek ağa birleştirilir (`mergeStatic`; aynalı parçaların üçgen sırası çevrilir), parıltı sprite'ları gemi park halindeyken kapanır (`setShipHalos`), `matchMedia` her karede değil bir kez oluşturulur (`COARSE`). Test kancası `skipRender`: uzun dövüş döngülerinde yazılımsal GL'nin belleği şişmesin diye v12 çizimi kapatır.

## Aşama 12 (v10: görkemli gezegenler, ırk anıtları, sessizlik, diplomasi, kaynaklar, gemi parçaları, dizilim, yetenekler, öğretici)
- **Gezegenler** (`planets.ts`): her gezegen bir biyomla (kaya, çöl, buz, okyanus, lav, gaz, cüce, dünya, kristal, orman, karanlık, altın, mor) gölgelenir: `planetMaterial` `MeshStandardMaterial.onBeforeCompile` ile fbm/sırt gürültüsü, kıtalar, çatlaklar, kutup başlıkları, gece tarafında şehir ışıkları (uzaktan görünür, yüzeyde söner: `cityFar`). Atmosfer kabuğu (`atmo`), bulut katmanı (`clouds`), gelişmiş dünyalarda yörünge halkası (`orbital`). Ev gezegenleri `HOME_LOOK`: Dünya bulutlu, şehir ışıklı ve halkalı; Ross kızıl çöl, Proxima karanlık, Alpha mor, TRAPPIST kristal, K2-18 okyanus, Kepler-186 orman, Gliese lav, Kepler-452 altın halkalı. Yüzeyde biyoma göre dağlar, meseler, kristal kümeleri, ağaçlar, volkan kayaları (`scatterFeatures`); oyuncu bunlara çarpar (`pushOutOfFeatures`), üs kurulunca çevresindekiler gizlenir.
- **Irk anıtları** (`buildLandmark`): üs çekirdeği düz kare değil, ırka özel görkemli yapı: Dünya cam kule, Marslı dağ kalesi, Proxima obsidyen kuleler, Alpha dönen halkalı zihin kulesi, TRAPPIST kristal küme, K2-18 deniz kabuğu kulesi, Kepler-186 dünya ağacı, Gliese lav akan volkan, Kepler-452 altın zigurat. Seviye arttıkça büyür ve çevresine uydu kuleler eklenir.
- **Nüfus gezegene göre** (`capOf`, `planetCapMul`): yeşil/okyanus/dünya biyomları ×1,35, buz/lav/karanlık ×0,8, cüce ×0,7; büyük gezegen biraz daha kalabalık.
- **Görünürlük ve sessizlik:** `visMul`: ev sisteminde ×0,22, kendi kolonin olan sistemde ×0,6, yabancı sistemde ×1,7. **V** sessiz süzülme (motor kapalı, küçük iticilerle yavaş, görünürlük hızla söner; ateş etmek sessizliği bozar). Görünürlük eşiği aşılınca "📡 Radarlara yakalandın" bildirimi. **T** tarama: 700 birim içindeki filoları (radarda sarı) ve kaynak yataklarını 10 sn gösterir, ama görünürlüğü artırır (bekleme 12 sn).
- **Karşılaşma diyaloğu ve diplomasi** (`diplomacy.ts`): ırklı bir filo yaklaşınca savaş yerine önce diyalog (`#encounter`): Barış, Ticaret, Haraç öde, Haraç iste, Saldır, Geri çekil. Sonuç ırkın mizacına (öfke/açgözlülük/gurur), ilişkiye ve güç oranına bağlı. **O / Diplomasi** paneli: hediye, ticaret anlaşması (ilişki ≥25, dakikada kaynak), ittifak (≥55), haraç iste, **sömürge yap** (senin üs sayın onlarınkinden en az 2 fazlaysa; gururlu ırklar direnir; sömürge dakikada haraç öder, ilişki çok düşerse ayaklanır), savaş ilan et / bağımsızlık ver. Barış ve üstündeki ırkların filoları avlamaz, birlikleri saldırmaz. Kurallar saf fonksiyonlar: çevrimiçi sürümde oyuncular arasında da kullanılabilir.
- **Kaynaklar:** enerji + ⛏ maden + ◆ kristal. Gezegenlerde parlayan yataklar (`scatterDeposits`): yumrukla kazılır (maden 5, kristal 3 vuruş), tükenen yatak kayıtlıdır (`mined`). Koloniler biyoma göre dakikada maden/kristal üretir (`planetYield`). Ticaret anlaşmaları ve sömürgeler de kaynak getirir.
- **Gemi parçaları** (`parts.ts`): düz seviye yerine her yuvada (Gövde, Kalkan, Silah, Motor, Gizlilik) kademe 2–4'te iki parçadan biri seçilir (ör. Zırh plakası ↔ Hafif alaşım, Ağır namlu ↔ Susturucu, Yıldırım iticisi ↔ Fısıltı iticisi); seçim kalıcı. 5. kademe ırka özel **efsane parça** (ör. Kor Topu, Sis Peçesi, Taç Kalkanı); ırkın uzman olduğu yuvada ×1,5 güçlü. Fiyat enerji + maden + kristal (`tierCost`). Kademe 3'te gemiye ışıklı kanatçıklar, efsane parçada parlayan halkalar eklenir (`refreshShipLook`).
- **Dizilim emirleri** (`colony.ts`: `COLONY_ORDERS`, `SQUAD_ORDERS`): **Y** / dokunmatik **Emir** paneli ya da kısayollar. Üs birlikleri: **1** Serbest, **2** Taret önü (her birim bir taretin dışına dizilir), **3** Taret arkası (taretle çekirdek arasında, yalnız üsse yaklaşanı vurur, %30 az hasar), **4** Hücum (uzağı görür, %30 sert vurur). Ekip: **5** Takip, **6** Bekle (bulunduğun yerde mevzi), **7** Saldır (gezegendeki düşman çekirdeğine yürür). `formationGoal` her birimi sırasına göre bir tarete atar.
- **Irk yetenekleri** (`skills.ts`, yayayken **G** / dokunmatik **Yetenek**): Dünya Hava desteği (gökten üç ışın), Marslı Zırh kabuğu (6 sn %70 az hasar, ekip dahil), Proxima Gölge adımı (ileri ışınlan, 4 sn yumruk ×3), Alpha Zihin dalgası (sersemletme), TRAPPIST Kristal fırtınası, K2-18 Gelgit (it + iyileş), Kepler-186 Kök sarmaşığı (bağla + iyileş), Gliese Deprem (geniş ağır hasar), Kepler-452 Altın hale (8 sn herkes ×1,5 vurur). HUD rozetinde bekleme süresi.
- **Solucan deliği tasarımı** (`buildWormhole`): spiral kollu mor girdap, karanlık boğaz, neon halka ve çevresinde altı direk; uzaktan "Solucan deliği" etiketi. Geçişte tünel efekti (`#warp`) ve ses.
- **Fotoğraf modu** (**P**): dünya durur, arayüz gizlenir; sürükleyerek döndür, tekerlek/iki parmakla yakınlaş, filtreler (Normal, Sinematik, Neon, Siyah-beyaz), "Kaydet" filigranlı PNG indirir.
- **Öğretici zincir** (19 adım): Ay'a uç → in → yürü → **kaynak topla** → **sessiz süzül** → **tara** → **keşif gemisini avla** (komşu ırkın keşif gemisi ev sisteminde dolaşır ve radarda görünür; gürültülü yaklaşırsan kaçar, yenisi gelir; sessiz yaklaşınca savaş) → eve dön → üssü güçlendir → **birliklerini diz** → dalga → **gemine parça tak** → solucan deliği → **bir türle konuş** → karakol → ekip → fetih → Sessiz Avlu → serbest oyun.
- **PWA:** `public/manifest.webmanifest`, simgeler (`icon-192/512`, maskable, apple-touch), `public/sw.js` (HTML önce ağdan, dosyalar önbellekten). Yalnız derlenmiş sürümde ve göreli yolla kaydedilir (`main.ts`), GitHub Pages alt klasöründe çalışır. Telefonda "Ana ekrana ekle" ile tam ekran açılır.
- Test: `scripts/e2e-v14.mjs` (PWA bağlantıları, görev sırası, kazı, sessiz/tarama/keşif gemisi, kaçan keşif gemisi, parça seçimi/efsane/görsel, dizilim hedefleri, yetenek bekleme süresi, nüfus çarpanı, karşılaşma barışı, sömürge ve haracı, fotoğraf modu). v13 yeni görev sırasına göre güncellendi.
- **Sonraki tura bırakılanlar:** gezegen şefleri/komutanlar (saldırıda haber verip savunan yancı karakterler), doğal afetler (göktaşı yağmuru, iki kara deliğin birleşmesi), dost gelen / kaybolmuş / ihanet eden ırk olayları, patron karşılaşmaları, uzay savaşına taktik derinlik, bot ırkların kendi aralarında diplomasi ve sömürge kurması. Daha sonra: grafik kalitesi ayarı, dil desteği, skor tablosu.

## Aşama 13 (v11: eğitim akışı, gerçek Dünya/Ay, fizik ve çarpışma, yerliler, diyalog, kamera ve uzay savaşı)
- **Görev brifingi** (`#briefing`, `openBriefing/closeBriefing`): her yeni görevde ekran ortasında kart: bölüm · adım N/18, başlık, neden, "Nasıl yapılır" (masaüstü/dokunmatik ipucu). Kart açıkken dünya durur, Enter/Boşluk/düğme kapatır. Önceki görev bitince ortada yeşil "✔" kutlaması (`#celebrate`). Görev kartında adım sayacı ve yeni görevde parlama (`.fresh`).
- **Eğitim kapıları** (`tutorialAt(id)`, rehber açıkken): solucan deliği "kapı" adımına kadar kapalı (geri iter, söyler); başka gezegende koloni "karakol" adımına kadar yok; ev sisteminde gürültü filoları ve eğitim devriyeleri keşif gemisi görevi bitene kadar gelmez; kendi üslerine dalgalar "dalga" adımına kadar gelmez (o adım başlayınca ilk dalga 25 sn'de). Geliştirme ipucu da kendi adımına kadar gizli. Ayarlardan rehber kapatılırsa kapılar kalkar.
- **Görev sırası:** Ay'a uç → in → yürü → kaynak topla → sessiz süzül → tara → keşif gemisi → eve dön → üssü güçlendir → **ekip topla** → **birliklerini diz** → dalga → parça tak → solucan deliği → bir türle konuş → karakol → fetih → Sessiz Avlu → serbest.
- **Gemi işareti** (`#ship-mark`, `paintShipMark`): yayayken gemi 14 birimden uzaksa ekranda ▲ "Gemin" ve uzaklık; ekran dışındaysa kenarda ok.
- **Eski rota silinir:** hedefi olmayan görev başlayınca görevden gelen rota (ve çizgisi) kaldırılır (`routeByQuest`).
- **Gerçek Dünya ve Ay** (`public/tex`): Dünya NASA Blue Marble renk haritası, gece şehir ışıkları (yalnız gece yüzünde), deniz parlaklığı (su maskesi), gerçek bulut haritası; Ay gerçek Ay haritası + yakından krater ayrıntısı. Kutuplarda ve yakından prosedürel yüzeye karışır. Yörünge halkası Dünya'dan kaldırıldı. Kaynaklar: three-globe örnek görselleri (NASA, kamu malı), Cesium `moonSmall.jpg` (Apache-2.0).
- **Yürüyüş fiziği:** yerçekimi 9–22 aralığında (`footGravity`), zıplama hızı en çok 11: Ay'da ~2,8 sn havada kalınır (eskiden 30 sn uçuluyordu). Havada yatay hız ×0,75. Ağır gezegenlerde yürüyüş hızı tabanı ×0,75.
- **Çarpışma** (`blockDir`): oyuncu ve tüm birlikler dağlara, ağaçlara, kristallere ve üs anıtına çarpar. (v10'da `pushOutOfFeatures` mesafeyi kopyadan sonra ölçtüğü için hatalıydı.) Yapılar eğriliğe göre gömülür (havada kalmaz), boyları gezegene oranlı, sıra dağların çarpışma dairesi genişletildi.
- **Yerliler:** gezegen başına 6–10; sayı kalıcı (`nativesLeft`): inip kalkınca yenilenmez, kalanlar en yakın kamptan (kulübe) doğar. Her yabani gezegende yörüngeden görünen kamp var; **gemiden ateş edilen** yerli figürü düşer ve sayı azalır (`hitNatives`). Düşman yerliler 40 birimden fark edip sabit hızla gelir.
- **Karakol = koloni:** yerliler yenilip karakol kurulunca kuşatma dalgası yok; hemen koloni olur, halk yerleşir.
- **Diyalog:** aynı ırkla 3 dk içinde ya da savaş halindeyken yeniden diyalog açılmaz, doğrudan çatışma (`talkedRecently`). Diyalog açılınca fare imleci serbest kalır (oyun duraklamaz); 1–6 doğrudan seçim, oklar + Enter. Esc diyalogda duraklatma açmaz. Brifing, emir ve diplomasi panelleri de imleci serbest bırakır, kapanınca kilit geri gelir.
- **Motor sesi:** yaya, menü, oyun sonu, geçiş, diyalog ve fotoğrafta susturulur.
- **Kovalama kamerası** (`camQ`, `camDist`): geminin yönelimini yumuşakça izleyen kamera yönelimi; kamera hep onun arkasında sabit uzaklıkta. Eskiden konum gecikmesi + sert sınırlar ani dönüşte kamerayı sıçratıyordu.
- **Kokpit** (`buildCockpit`, `cockpitFx`): konsol, üç ekran (radar, nişan, durum), yanıp sönen düğmeler, kanopi dikmeleri, pilotun iki kolu ve kumanda kolları; kollar dönüşe göre eğilir, ateşte geri teper. Kokpitte nişangah büyük.
- **Uzay savaşı:** nişan yardımı (bakışın ~9° içindeki düşmana, hareketini önceden hesaplayarak), daha büyük isabet kutusu; roket patlar ve çevresine hasar verir; yıldırım namludan hedefe ve hedeften hedefe kırık şimşek çizer; plazma ve saçma isabet efektleri.
- Test: `scripts/e2e-v15.mjs`. Eski testler `tutorial(false, false)` ile serbest dünyada koşar; v14 brifingsiz koşar.

## Aşama 14 (v12: serbest uçuş, kokpit, kaynak bulma, ırk evleri, efektler, ses ve müzik, uzay taktikleri)
- **Serbest uçuş:** normal modda otomatik kanat düzleme kaldırıldı; Q/E basılı tutuldukça saniyede ~160° sürekli yuvarlanır (takla atarak uçulur). Kolay modda düzleme yalnız Q/E'ye basılmıyorken. R hâlâ ufka dengeler.
- **Kokpit:** kamera pilot gözünde gemiye kilitli (eskiden yumuşatılmış kamera hızda geride kalıyor, iç mekân önde uçuyordu). Irka özel kollar (`ARM_STYLE`, `buildArm`): Dünya astronot eldiveni, Marslı zırhlı eldiven, Proxima pençe, Alpha ince parmaklar, TRAPPIST kristal el, K2-18 yüzgeçli el, Kepler-186 yapraklı kol, Gliese lav damarlı kaya yumruk, Kepler-452 altın bilezikli el. Yan duvarlarda ekranlı modüller, tepede anahtar sırası; ön görüş açık.
- **Dik birlikler** (`uprightUnits`): her karede birimlerin "yukarı"sı yüzey normaline hizalanır. **Park:** gemi yüzeye yatık ve değerek park eder.
- **Geliştirme tuşu:** yumruk (sol tık) artık geliştirme açmaz; U (ya da E) ile açılır. Öğretici metni güncellendi.
- **Kaynaklar:** yatak sayısı gezegen boyuyla artar (ev gezegeninde 6 → büyük gezegende ~18); her yatakta yörüngeden görünen ışık sütunu; yayayken radarda yataklar ve ekranda en yakın yatak işareti (`#dep-mark`); "Kaynak topla" görevinde ◆ en yakın yatağı gösterir.
- **Görev hedefi her adımda somut** (`objectiveSpot`): yatak, kendi çekirdeğin, gemin, en yakın yerli, düşman üssü ya da keşif gemisi; ekranda ◆ + kenar oku ve radarda altın elmas. Görev kartında canlı ilerleme (sessiz süzülme süresi, en yakın yatak uzaklığı, keşif gemisine uzaklık ve görünürlük, dalga sayacı, ekip sayısı).
- **Yerli evleri** (`buildDwelling`): türe göre kubbe habitat, kerpiç kule, obsidyen sivri çadır, mantar kubbe, kristal küme, deniz kabuğu, ağaç ev, lav kapılı kaya kulübesi, altın pagoda, buz iglo, yabani yuvarlak kulübe; temeli toprağa gömülü.
- **Efektler** (`fx.ts`): yarıklar, fırlayan kayalar/kristaller/metal parçalar, duman ve toz, şok halkası, kubbe, ışık sütunu, küre dalgası, patlama (ışık+ateş+duman+parça). Her ırk yeteneğinin kendi görünümü (deprem: yarıklar + kayalar + toz + çift şok dalgası, golem zıplayıp yere vurur). Roketlerde duman izi; düşman ölümünde patlama; gemiye isabette kıvılcım, ışık ve kırmızı hasar sayısı; hasar sayıları büyük.
- **Sesler:** hayvansı ses üreteci (`audio.creature`: testere dişi + nefes, formant filtreleri, titreme, pürüz) ırk seslerinde; katmanlı patlama; gerçekçi lazer "piyuv"; kalkan vızıltısı ve gövde ezilmesi.
- **Uzay taktikleri:** Tab hedef seçer (nişan yardımı geniş açıyla ona kilitlenir, kilit işareti onu gösterir); B kaçınma taklası (yana kayma + takla, 0,45 sn hasar almaz, 2,6 sn bekleme; dokunmatikte "Kaç"); eşlik gemilerine 1 takip / 2 saldır (seçili hedefin çevresinde dönüp daha sık ve sert ateş) / 3 koru (yanında kalır, sana yaklaşanı vurur).
- **Müzik** (`music.ts`): tamamen sentezlenen özgün uyarlanır müzik; her sistemin tonu, akor yürüyüşü, temposu ve tınısı ayrı (org, çan, cam, sıcak); org benzeri katmanlar, saat tıkırtısı gibi arpej, dron ve uzay yankısı. Savaşta tempo artar, bas ostinatosu ve davul girer; üs dalgasında yarı gerilim. Ayarlardan kapatılabilir.
- Test: `scripts/e2e-v16.mjs`.

## Aşama 15 (v13: üs yapısı ve oklar, sakin ev sistemi, baskınlar, kokpit topları, sade dokunmatik, düşman rolleri)
- **Üs yapısı** (`buildDistrict`, `Game.districtOf`): çekirdek (ırk anıtı) her zaman en büyük yapı; çevresinde ondan küçük yan yapılar: yaşam evleri (seviyeyle 2→6), kışla (sv2+, ekip sınırı +2), atölye (sv3+, parça fiyatı −%15, `partCost`), gözcü kulesi (sv4+, taret menzili +%25). Yan yapılara çarpılır (`blockDir` → `root.userData.blocks`). Üs paneli yapıları ve etkilerini yazar.
- **Köy evleri:** yerli evleri sabit insan boyunda (eskiden gezegen boyuyla büyüyüp çekirdeği gizliyordu); üs kurulan gezegende köy görünmez.
- **Üs oku** (`#base-mark`, `paintBaseMark`): yayayken kendi üssün yeşil "⌂ Ana üssün / Kolonin", düşman gezegeninde kırmızı "… çekirdeği"; ekran dışındaysa kenarda ok.
- **İniş:** üssü olan gezegende L ile iniş üssün yanına (kendi üssünde 14–18 birim, düşman üssünde 45 birim ötesi).
- **Sakin ev sistemi:** başta eğitim devriyesi yok; keşif gemisi görevinden sonra en çok 1 devriye, 90 sn arayla; küçük gemiler yalnız çok gürültüde (görünürlük 45+) ya da çok yakında fark eder, yerdeyken hiç. Gürültü bantları evde yalnız en yüksek eşikte tek küçük gemi çağırır.
- **Baskınlar** (`raidTick`): "fetih" adımından sonra 4–8 dk'da bir, dost olmayan bir ırk uzaktaki kolonine saldırır: uyarı, olay akışı, kırmızı rozet ve rota. 75 sn içinde inersen saldırganlar hemen gelir ve savunursun; inmezsen üs kendi gücüyle (seviye ve taretler) savunur: püskürtür ya da hasar/nüfus kaybeder, kolonilerse düşebilir.
- **Yerde sade ekran:** yayayken gökyüzündeki gezegen etiketleri gizli.
- **Kokpit topları:** konsolun iki yanında ikiz top; mermi o toptan çıkar, namlu parlar, top geri teper, hafif sarsıntı. Ortadaki eski namlu parlaması kokpitte gizli.
- **Dokunmatik düzen:** gemide Ateş/Hız/Sessiz/Kaç/İn/⋯, yayayken Yumruk/Zıpla/Yetenek/Üs/İn/⋯; duruma göre Parça (gemi yanında) ve Ekip (çekirdek yanında). "⋯" ikincilleri açar: Tara, Silah, **Kamera** (kokpit), Yukarı/Aşağı, Bak, G/H; yayayken Taret, Emir.
- **Düşman rolleri:** avcı (küçük, kırmızımsı, çok hızlı, dibine girer, sık ateş, az can), bombacı (büyük, turuncumsu, uzakta durur, güdümlü füze atar), kalkanlı (mavi kalkan küresi, 3,2× kalkan, yavaşça yeniden dolar). Savaş başında rol özeti; kilit işaretinin altında hedefin rolü (KALKANLI / KALKAN KIRILDI…).
- Test: `scripts/e2e-v17.mjs`.

## Aşama 16 (v14, A turu: düzeltmeler ve his)
- **Ay–Dünya:** Ay artık Dünya'nın hemen yanında, aynı yörünge yarıçapında (aynı açısal hızla birlikte döner, birbirinden ayrılmaz); Merkür güneşe en yakın halkada, Dünya'dan çok uzakta.
- **Güneş ısısı** (`applyHeat`): güneşin ~3,5 yarıçap içi şarj kuşağı (enerji kazanırsın; Merkür burada, güvenli); yüzeye ~1 yarıçaptan yakın yanma kuşağı: önce kalkan sonra gövde erir, kalkan dolmaz, ekran kızarır, uyarı sesi ve yazısı. HUD: "Güneş şarjı +N/sn" ya da yanıp sönen "Isı: yanıyorsun!".
- **Kaynakların anlamı:** taret = enerji + 2 maden; üs yükseltmesi = enerji + maden (sv4+ kristal de); gemi parçaları maden/kristal. "Kaynak topla" ve "Üssünü güçlendir" görevleri bunu anlatır. Tükenen yatak 5 dakikada yeniden dolar.
- **Yatak denetimi:** gaz devlerinde de yatak var (eskiden hiç yoktu; Gümüş/Kehkeşan gibi gezegenler buydu). `depositAudit` 12 sistemin inilebilir 85 gezegeninin hepsinde ≥2 yatak olduğunu doğrular.
- **Anıt çarpışması gerçek sınırdan** (`coreFootprint`): anıtın yere yakın her parçası bir engel dairesi olur (Dünya'nın cam kulesine artık girilmez).
- **İniş:** L geminin altındaki noktaya iner. Kendi üssüne ~150 birimden yakınsan üssün yanına; Shift+L ya da Harita → "⌂ Üsse in" her zaman üssün yanına indirir. Düşman üssünün 45 birim yakınına inilmez.
- **Eğri meydan:** meydan düz disk değil, gezegenin eğrisine oturan küresel kapak + yere gömülen temel eteği; yan kuleler de yüzeye indirilir (küçük gezegende üs havada/altı boş görünmez).
- **Diplomasi:** diyalog yalnız ilk karşılaşmada (ve gerginken 10 dakikada bir); savaştaki ırk konuşmadan saldırır. Diplomasi panelinde savaştaki ırka "Ateşkes teklif et" (bedel + güç ve ilişkiye bağlı şans; kabul ederse ilişki gergin olur, filoları çekilir).
- **Performans:** efekt geometrileri paylaşılır, puf bulutları tek malzeme, efekt üst sınırı (`FX_CAP`), otomatik çözünürlük (kare süresi uzarsa kademeli düşer, rahatlayınca geri çıkar).
- **Hasar hissi:** gövdesi %50'nin altındaki gemilerden (düşman ve oyuncu) duman ve ateş izi; isabette gemi gövdesi ve kokpit belirgin sarsılır.
- Test: `scripts/e2e-v18.mjs`.
- **Oyuncu bildirimi düzeltmeleri (A turu içinde):** "Düşman üssünü ele geçir" adımı çekirdeği yıkınca da tamamlanır (eskiden yalnız teslim alma sayılıyordu, eğitim 17. adımda takılıyordu). Vuruş parlaması temizlenirken renkler geri yüklenir (golemin rengi iniş/binişte kalıcı turuncu kalıyordu).

## Aşama 17 (v14, B turu: ekonomi ve ordu)
- **İşçiler** (`worker`, `workerTick`): halkın bir kısmı işçi; en yakın 3 yataktan birine yürür, kazar (kıvılcım), yükü sırtında (ışıyan taş) çekirdeğe taşır → oyuncuya maden/kristal. Her iki taşımada yatak bir birim azalır. Askerler (`settler`) sahadaki işçilere eşlik eder. Uzaktaki kolonilerin işçileri dakikalık üretime eklenir (`WORKER_RATE`).
- **Duruş** (`Posture`, `setPosture`): Ekonomi (%60 işçi), Savunma (%25 işçi, taret önü dizilim, taretler +%25), Saldırı hazırlığı (%15 işçi, hücum, eğitim 2×, ekip sınırı +2). Yüklü üste işçi/asker hemen yeniden dağılır.
- **Kışla eğitimi** (`trainSoldier`): sv2+, 15 enerji + 3 maden, 14 sn; eğitilmiş ana karakter sınırı seviye×2. Ölen ana karakter eğitimli sayısından düşer.
- **Taretler** (`buildTurret`, `placeTurret(kind)`, `upgradeTurret`): kara (T) ve hava savunma (Shift+T; dokunmatikte eksik olan tür). Irka özel gövde (astronot kubbesi, Marslı altıgen sığınak, Gölge sivri koni, Alpha küre, kristal, kabuk, gövde, kaya, altın), kara: kalın namlu (sv3 çift), hava: radar çanağı + yukarı bakan ikiz/dörtlü namlu. Taretin yanında T: seviye 2–3 (enerji + maden + kristal; hasar/can/menzil artar, yaka ve hale eklenir).
- **Hava savunması:** kendi hava taretlerin gezegene yaklaşan düşman filolarını vurur (filoyu küçültür, düşürür). Düşman üslerinin hava taretleri menzildeki (~130) gemine ateş eder; yörüngeden vurulup düşürülebilir (`turretSpots`, `hitOutpost`).
- **Komuta paneli (Y, gemide de; dokunmatikte ⋯ → Komuta):** bütün kolonilerin; asker/ana/işçi/kara/hava sayıları, eğitim kuyruğu, tek tıkla duruş, Asker eğit, Komutan yetiştir, üstündeysen Kara/Hava taret kur, yayayken "Binecekleri seç".
- **Eğitim:** yeni "Hava saldırısını püskürt" adımı (Bölüm 3: hava taretini kur, akıncılar üssü bombalar, taretin ya da sen düşürürsün) ve "Hava savunmasını kır" adımı (Bölüm 5 · İşgal: hedef üssün hava taretlerini yörüngeden düşür). "Ele geçir" adımı kışlada asker yenilemeyi anlatır. Kontroller ekranında "İşgal nasıl yapılır" ve "Ekonomi" rehberi.
- **Gezegen bilgi kartı** (`#planet-card`): gemideyken yaklaşınca yataklar, yerliler, kolonin ya da düşman savunması (asker, kara, hava), mahsur ekip.
- **Fırsatlar** (`oppTick`): Bölüm 4'ten sonra 5–8 dakikada bir ya yakında altın işaretli yük kapsülü (150 sn; enerji+maden+kristal) ya da sana doğru gelen küçük avcı çifti.
- **Irk savaş profilleri** (`races.ts`, `WAR`): her ırkın gelişmişliği (genç/gelişmiş/kadim), gemi görünüşü (rengi), saldırı biçimi ve caydırıcı yeteneği. Seçim ekranında ve ilk karşılaşmada (tanıtım kartı) gösterilir; savaş başında olay akışında ırkın taktiği. Kara delik yalnız Altınların (kadim) amiral gemisinde, savaş başına bir; geçit yalnız Alpha'da. Kara deliğin olay ufkuna düşen gemi parçalanır (oyuncu, eşlik gemisi, düşman); çevresi güçlü çeker ve yakar, açılınca uyarı.
- **Altın ırkı yeniden tasarlandı:** uzun boylu soylu; altın göğüs zırhı ve kakma ışık çizgileri, omuzluklar, dilimli zırh eteği, bileklikler, alın tacı ve sivri taç, arkaya uzanan başlık, ışınlı hale, hilal başlı asa; pelerin beş zincir bölümden oluşur, yürürken hıza göre arkaya savrulur ve bölümden bölüme dalgalanır.
- Test: `scripts/e2e-v19.mjs`.

## Aşama 18 (v14, C turu: ekip, komutan, kayıt)
- **Eşlik gemileri vurulabilir** (70 can, hasarlıyken duman): düşerse içindeki 2 kişi en yakın gezegene düşer; yükseklik arttıkça ölme olasılığı artar, sağ kalanlar mahsur kalır (`stranded`). O gezegene inince sana katılırlar; bilgi kartında görünür. Kara delikte düşen eşlik gemisinden kimse kurtulmaz.
- **Biniş seçimi** (Shift+L yayayken ya da Y → Binecekleri seç): ekip listesi, kapasite (10 + gövde geliştirmesi), "En iyileri al" (komutan → ana karakterler → canı yüksek). Binmeyenler kendi üssündeysen garnizona katılır, değilse orada bekler; sonra inince seni bulurlar.
- **Komutan** (`commander`): kışla sv3+, 60 enerji + 10 maden + 3 kristal, 30 sn; koloni başına bir; adı, sırtında sancağı, başında ışık halkası var. Ekipteyken herkes %25 sert vurur ve yavaşça iyileşir; ekip sınırına sayılmaz.
- **Kayıt / Devam et** (`savegame.ts`): 30 sn'de bir ve önemli olaylarda (iniş, biniş, üs kazanma/kaybetme) otomatik kayıt (savaşta değil). Başlıkta "Devam et · ırk · dakika". Kaydedilenler: konum, kaynaklar, gemi parçaları, silahlar, görev adımı, bütün koloniler (seviye, taretler, duruş, eğitim), ilişkiler, yerliler, tükenen yataklar, ekip, mahsur ekipler.
- Test: `scripts/e2e-v20.mjs`.

## Aşama 19 (v16, oyuncu geri bildirimi)
- **Yukarı bakış:** yayayken fare yukarı/aşağı bakış eğimini değiştirir (`lookPitch`); gökyüzündeki hava saldırısı görülebilir.
- **Çekirdeğe ulaşma:** etkileşim mesafesi anıtın gerçek ayak izinin kenarından ölçülür (`coreReach`); büyük anıtlarda da yükseltme/taret/ekip çalışır.
- **Y gemideyken:** komuta paneli artık kapanmıyor ve oyun durmuyor; seyahat ederken düzenlenebilir.
- **Kara delik:** açan amiral gemisi de olay ufkuna girerse parçalanır.
- **Son bölüm:** Sessiz Avlu'ya ilk varışta kavşak tanıtımı (kara delik + ona bağlanan bütün eşikler, zaman bükülmesi). Son adım için kara deliğe gerçekten yaklaşmak gerekir (7 rs). "Solucan deliğinden geç" adımı eşiklerin Avlu'ya bağlandığını anlatır.
- **Gemi savaşı:** oyuncu mermileri çok daha hızlı (roket 150, plazma 200, saçma 230, lazer 340), hasar ×1,45, atış hızları arttı, nişan yardımı konisi genişledi.
- **İlk karşılaşma kataloğu:** ırk kartının altında ırkın karakteri ve gemisi dönen 3B önizlemede (`racePreview`). Irkı belli filolar savaşta kendi ırk gemileriyle gelir (`raceShipVisual`).
- **Çekirdek turu** (`coreTour`, `startCine`): "Üssünü güçlendir" brifinginden sonra kamera çekirdeğin çevresinde döner, altyazılar çekirdeği, yapıları, işçileri, diğer ırkların çekirdeklerini ve Y panelini anlatır (Enter/dokunuş geçer).
- **Eğitim temposu:** adımlar arası brifing gecikmesi 3,2 sn; "Komuta panelini tanı (Y)" adımı paneli bölüm bölüm anlatır; panelde duruşları ve simgeleri açıklayan yardım satırı.
- **Karşılaşmada haraç:** "Haraç öde" her zaman tıklanır; enerji yetmezse maden (4) ve kristal (9) ile tamamlanır, hiç yetmiyorsa ne kadar gerektiği söylenir. "Haraç iste" zayıfken de denenebilir (riskli; düşük şans).
- **Performans:** oyun içi panellerde `backdrop-filter` bulanıklığı kaldırıldı (zayıf GPU'da hikâye kartı açıkken kareler çok yavaşlıyordu).
