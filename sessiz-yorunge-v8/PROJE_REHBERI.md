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
