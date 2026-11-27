import { chromium } from 'playwright'

// v20 (v14, C turu): mahsur ekip inince katılır, biniş seçimi kalanları garnizona bırakır, komutan yetişir ve
// ekibe katılır, kayıt/yükleme tüm durumu geri getirir, başlıkta "Devam et".
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const S = (fn, arg) => page.evaluate(fn, arg)
await S(() => localStorage.removeItem('sessiz-yorunge-save2'))
await S(() => window.__sessiz.skipIntro())
await S(() => {
  window.__sessiz.pick('mars')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await S(() => window.__sessiz.tutorial(false, false))
await S(() => window.__sessiz.noTalk(true))
await S(() => window.__sessiz.skipRender(true))
const home = await S(() => window.__sessiz.homeId())

// 1) Mahsur ekip: gezegene inince ekibe katılır.
await S((id) => window.__sessiz.strandAt(id), home)
await S((id) => window.__sessiz.landOnId(id), home)
const sq = await S(() => window.__sessiz.squadCount())
console.log('squad after rescue', sq)
if (!(sq >= 2)) errors.push(`stranded crew not rescued (${sq})`)

// 2) Komutan: sv3 kışlada yetişir, üste belirir, K ile ekibe katılır.
await S(() => window.__sessiz.giveEnergy(4000))
await S(() => window.__sessiz.setLevel(3))
if (!(await S((id) => window.__sessiz.trainCmd(id), home))) errors.push('commander training refused')
await S(() => window.__sessiz.stepGround(60 * 32))
const kinds = await S(() => window.__sessiz.unitKinds())
if (!kinds.some((k) => k.startsWith('commander'))) errors.push(`no commander spawned ${kinds.join(' ')}`)
await S(() => window.__sessiz.toCore(6))
// Önce kurtarılanları üsse bırak (K), sonra komutanla birlikte yeniden topla (K).
await S(() => window.__sessiz.squadAction())
await S(() => window.__sessiz.squadAction())
const sq2 = await S(() => window.__sessiz.squadCount())
console.log('squad with commander', sq2)
if (!(sq2 >= 3)) errors.push(`squad too small with commander ${sq2}`)

// 3) Biniş seçimi ekranı açılır; kapasite aşılınca kalanlar garnizona.
await S(() => window.__sessiz.toShip())
const opened = await S(() => window.__sessiz.boardingOpen())
const vis = await S(() => !document.getElementById('boarding').classList.contains('hidden'))
if (!opened || !vis) errors.push('boarding screen did not open')
await S(() => document.getElementById('board-go').click())
const layer = await S(() => window.__sessiz.stepWorld(0).layer)
if (layer !== 'ship') errors.push(`did not board (${layer})`)

// 4) Kayıt ve yükleme: durum aynı geri gelir; başlıkta Devam et görünür.
await S(() => window.__sessiz.setRes(321, 45, 7))
if (!(await S(() => window.__sessiz.saveNow()))) errors.push('save failed')
const sig = await S(() => window.__sessiz.stateSig())
if (!(await S(() => window.__sessiz.continueVisible()))) errors.push('continue button hidden after save')
await S(() => window.__sessiz.setRes(0, 0, 0))
await S(() => window.__sessiz.loadNow())
const sig2 = await S(() => window.__sessiz.stateSig())
console.log('sig', sig, sig2)
for (const k of Object.keys(sig)) if (sig[k] !== sig2[k]) errors.push(`load mismatch ${k}: ${sig[k]} vs ${sig2[k]}`)

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v20 ok')
