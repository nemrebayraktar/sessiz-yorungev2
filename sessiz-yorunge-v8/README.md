# Sessiz Yörünge

Kara deliğin çevresinde küçük bir gemi. Karanlık orman kuralı geçerlidir: duyulan avlanır. İtiş, hızlanma ve ateş görünürlük biriktirir; sessiz sürüklenen gemi kaybolur.

Statik bir Vite uygulamasıdır. Sunucu yok, rekor tarayıcının `localStorage` alanına yazılır.

## Çalıştırma

```bash
npm install
npm run dev
```

Oyun [http://127.0.0.1:4317](http://127.0.0.1:4317) adresinde açılır.

Üretim derlemesi:

```bash
npm run build
npm run preview
```

`dist/` klasörü Vercel'e olduğu gibi yüklenebilir.

## Nasıl oynanır

Başla deyince bir yuva seçilir: gezegen, pilot ve gemi. Dokuz köken var; Kepler-452b efsane gemisi `G` ile sersemletir, `H` ile mini kara delik açar. Proxima `G` ile kararır, Kepler-186f `G` ile gövde onarır.

Haritada birden fazla kara delik vardır. Kütleleri ve zaman bükmeleri farklıdır. Açık mavi eşikten geçmek başka bir evrene taşır: Sessiz Avlu, Kızıl Sığ, Soluk Derin. Her birinin göğü, diski ve çekimi ayrıdır. Delik yaklaştıkça yerel zaman yavaşlar, dış saat hızlanır. Olay ufkuna düşmek oyunu bitirir.

Görünürlük eşikleri avcı filoları çağırır. Oyuncu insan değilse avcılar arasında insanlar da olur.

Savaşta 2–5 avcıya karşı it dalaşı vardır. Kazanınca enerji ganimeti ve geliştirme ekranı gelir. Yeterince uzaklaşırsan `F` ile kaçabilirsin. Gövde sıfırlanırsa avlanmış olursun.

Geliştirmeler: gövde, kalkan, silah, motor, gizlilik. Motor itişi artırır, gizlilik aynı itişin daha az gürültü çıkarmasını sağlar.

## Kontroller

| Tuş | Eylem |
| --- | --- |
| `W` / `S` | İleri / geri itiş |
| `A` / `D` | Sola / sağa kay |
| `Boşluk` / `Ctrl` | Yukarı / aşağı |
| Fare | Yunuslama ve sapma (tuvale tıkla, işaretçi kilitlenir) |
| `Q` / `E` | Yuvarlanma |
| `Shift` | Hızlandırma, çok gürültülü |
| Sol tık | Ateş, gürültülü |
| `R` | Ufka dengele |
| `C` | Kovalamaca kamerası / kokpit |
| `F` | Filoyla kapış veya yeterince uzaktaysan kaç |
| `G` | Gemide: özel yetenek · Yayayken: ırk yeteneği (Hava desteği, Deprem, Gölge adımı…) |
| `H` | Mini kara delik (Kepler-452b) |
| `X` | Açık silahlar arasında geç |
| `L` | Gezegene in / yüzeyde gemiye bin |
| `B` | Yüzeyde üs ya da karakol kur; üssün yanında onar / yükselt |
| `T` | Yüzeyde: üssün yanında taret kur · Gemide: tarama (filoları ve kaynak yataklarını gösterir, görünürlüğü artırır) |
| `V` | Sessiz süzülme: motor kapalı, yavaş ama neredeyse görünmez |
| `O` | Diplomasi paneli (hediye, ticaret, ittifak, haraç, sömürge, savaş) |
| `P` | Fotoğraf modu (sürükle: döndür, tekerlek: yakınlaş, filtre, kaydet) |
| `Y` | Emirler paneli (dizilim) |
| `1`–`4` | Üs birlikleri: Serbest / Taret önü / Taret arkası / Hücum |
| `5`–`7` | Ekip: Takip / Bekle / Saldır |
| `E` / sol tık | Yüzeyde, park ettiğin geminin yanında: gemi parçaları (her kademede iki seçenek, 5. kademe ırka özel efsane parça) |
| `F` (yüzeyde) | Yumruk; parlayan yatağın yanında kazı (⛏ maden, ◆ kristal) |
| `K` | Kendi üssünün yanında baskın ekibi topla / geri bırak |
| `J` | Görev günlüğü (görev, hikâye, keşifler) |
| Sağ tık / `Z` basılı | Kamerayı karakterin ya da durmuş geminin çevresinde döndür |
| `N` | Sağ altta radar ↔ sistem haritası |
| `Esc` | Duraklat |
| `M` | Sesi kapat / aç |

**Baskın ekibi:** üssündeki yancılar (ırkının küçük sürümü) ve üs seviyesiyle açılan ana karakterler `K` ile en fazla 8 kişilik ekip olur. Gemideyken eşlik gemisi olarak yanında uçar ve çatışmada ateş eder; indiğin gezegende yerlilere ve düşman üssüne saldırır. Düşman üssünü düşürürlerse üs senin olur ve ekip oraya yerleşir; boş gezegende karakol kurarsan (`B`) da ekip oraya katılır.

Ok tuşları da yön verir. **Kolay mod** kanatları dünya yukarısına göre düz tutar ve burnun ±80°'den fazla dikleşmesine izin vermez. **Harita** düğmesi kapı ağını gösterir; **⌂ Eve dön** kapı kapı ev gezegenine rota kurar. İşaretçi kilitlenmezse fareyi basılı tutarak bakılır. Dokunmatik ekranda sol çubuk itişi, sağ taraf bakışı yönetir.

## Sınırlar

Yerçekimi Newton çekimi, zaman oranı ise oyun için genişletilmiş bir Schwarzschild eğrisidir; tam genel görelilik yörüngesi değildir. Sesler WebAudio ile üretilir, dışarıdan varlık yüklenmez.
