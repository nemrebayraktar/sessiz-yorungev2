import { chromium } from 'playwright'

// v16 (v12 sürümü): Q/E ile sürekli yuvarlanma (otomatik düzleme yok), kokpit gemiye kilitli, birlikler dik,
// park eden gemi yere değer, geliştirme yumrukla açılmaz (U), kaynak yatakları bol ve ışık sütunlu,
// görev hedefi yayayken somut (yatak), deprem yeteneği efekt üretir, kaçınma taklası, hedef seçimi, müzik.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const S = (fn, arg) => page.evaluate(fn, arg)
await page.mouse.click(10, 10)
await S(() => window.__sessiz.skipIntro())
await S(() => {
  window.__sessiz.pick('gliese')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await S(() => window.__sessiz.tutorial(true, false))
await S(() => window.__sessiz.skipRender(true))

// 1) Q basılıyken gemi sürekli yuvarlanır; bırakınca bir düzleme geri çekilmez.
const roll = await S(() => window.__sessiz.rollProbe(90))
console.log('roll', roll)
if (!(roll.rolled > 1.5)) errors.push(`Q did not roll ${roll.rolled}`)
if (roll.drift > 0.05) errors.push(`ship auto-leveled after roll ${roll.drift}`)

// 2) Kokpit kamerası gemiye kilitli (hızda iç mekân kaçmaz).
const lag = await S(() => window.__sessiz.cockpitLag())
if (lag > 0.01) errors.push(`cockpit camera lags ${lag}`)
await S(() => window.__sessiz.setCam('chase'))

// 3) Ev gezegeni: bol yatak, ışık sütunları; yayayken görev hedefi en yakın yatak.
const home = await S(() => window.__sessiz.homeId())
const dep = await S((id) => window.__sessiz.depositInfo(id), home)
console.log('deposits', dep)
if (!dep || dep.n < 8 || dep.beams !== dep.n) errors.push(`deposits ${JSON.stringify(dep)}`)
await S((id) => window.__sessiz.landOnId(id), home)
await S(() => window.__sessiz.questGo('mine'))
const obj = await S(() => window.__sessiz.objective())
if (!obj || !obj.local) errors.push(`mine objective not local ${JSON.stringify(obj)}`)

// 4) Park eden gemi yere değer; yumruk geliştirme açmaz.
const alt = await S(() => window.__sessiz.parkedAlt())
console.log('parked alt', alt)
if (!(alt > 0 && alt < 1.6)) errors.push(`parked ship floats ${alt}`)
await S(() => window.__sessiz.toShip())
const m = await S(() => window.__sessiz.clickNearShip())
if (m === 'upgrade') errors.push('left click near ship still opens upgrades')

// 5) Deprem yeteneği görsel efekt üretir.
await S(() => window.__sessiz.skillReset())
const f0 = await S(() => window.__sessiz.fxCount())
await S(() => window.__sessiz.useSkill())
const f1 = await S(() => window.__sessiz.fxCount())
if (!(f1 > f0 + 3)) errors.push(`quake fx missing ${f0} -> ${f1}`)

// 6) Birlikler yüzeye dik durur (yan yatmaz).
await S(() => window.__sessiz.giveEnergy(2000))
await S(() => window.__sessiz.setLevel(3))
await S(() => window.__sessiz.stepGround(60 * 3))
await S(() => window.__sessiz.toCore())
await S(() => window.__sessiz.squadAction())
await S(() => window.__sessiz.stepGround(60 * 2))
const tilt = await S(() => window.__sessiz.unitTilt())
console.log('unit tilt', tilt)
if (tilt < 0.98) errors.push(`units tilted ${tilt}`)

// 7) Kaçınma taklası hasarı önler; Tab hedef seçer.
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
const dg = await S(() => window.__sessiz.dodgeTest())
if (!(dg.dodgeT > 0) || dg.lost > 0) errors.push(`dodge ${JSON.stringify(dg)}`)
await S(() => window.__sessiz.engage())
if (!(await S(() => window.__sessiz.cycleTarget()))) errors.push('Tab did not pick a target')
await S(() => window.__sessiz.escortOrder('saldir'))
await S(() => window.__sessiz.stepWorld(30))
await S(() => window.__sessiz.wipe())

// 8) Müzik oluşturuldu.
const mus = await S(() => window.__sessiz.musicState())
console.log('music', mus)

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v16 ok')
