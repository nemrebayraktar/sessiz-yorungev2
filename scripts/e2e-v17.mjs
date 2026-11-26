import { chromium } from 'playwright'

// v17 (v13 sürümü): üs yapısı (çekirdek + yan yapılar), üs oku, çekirdeğin yanına iniş, köy evleri gizli,
// atölye indirimi, sakin ev sistemi, baskın bildirimi ve savunma, düşman rolleri, kokpit topları,
// yerde gezegen etiketleri yok, dokunmatik "⋯" menüsü.
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
await S(() => window.__sessiz.skipIntro())
await S(() => {
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await S(() => window.__sessiz.tutorial(true, false))

// 1) Ev sistemi sakin: başta eğitim devriyesi yok.
await S(() => window.__sessiz.stepWorld(120))
const small = await S(() => window.__sessiz.homeSmallFleets())
if (small !== 0) errors.push(`home patrols at start ${small}`)

// 2) Üs yapısı: çekirdek + yan yapılar; köy evleri gizli; yerde gezegen etiketi yok.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.setLevel(4))
await S(() => window.__sessiz.stepGround(10))
const d = await S(() => window.__sessiz.district('dunya'))
console.log('district', d)
if (!d || d.filter((n) => n === 'bina-ev').length < 4 || !d.includes('bina-kisla') || !d.includes('bina-atolye') || !d.includes('bina-gozcu')) errors.push(`district ${JSON.stringify(d)}`)
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('dunya', 60))
await S(() => window.__sessiz.stepWorld(2))
if (await S(() => window.__sessiz.villageVisible('dunya'))) errors.push('native village visible on colony planet')

// 3) Gezegene inince çekirdeğin yanına iner; uzaklaşınca üs oku çıkar.
await S(() => window.__sessiz.landHere())
const gap = await S(() => window.__sessiz.coreGap())
console.log('landing gap to core', gap)
if (!(gap >= 10 && gap < 26)) errors.push(`landing spot vs core ${gap}`)
await S(() => window.__sessiz.toCore(60))
await S(() => window.__sessiz.stepGround(2))
await page.waitForTimeout(400)
if (!(await S(() => window.__sessiz.baseMark()))) errors.push('base marker not shown away from core')
if ((await S(() => window.__sessiz.beaconCount())) > 0) errors.push('planet labels shown on foot')

// 4) Atölye (sv3+) parça fiyatını düşürür.
const pc = await S(() => window.__sessiz.partCost(3))
if (!(pc.energy < 64)) errors.push(`workshop discount missing ${JSON.stringify(pc)}`)

// 5) Baskın: bildirim + rota; inince saldırı başlar.
await S(() => window.__sessiz.tutorial(false, false))
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('ay', 80))
const r = await S(() => window.__sessiz.forceRaid())
console.log('raid', r)
if (!r) errors.push('raid not created')
else {
  if (!(await S(() => !document.getElementById('raid-flag').classList.contains('hidden')))) errors.push('raid chip hidden')
  await S((id) => window.__sessiz.landOnId(id), r.planetId)
  if (await S(() => window.__sessiz.raidInfo())) errors.push('raid not answered on landing')
}

// 6) Düşman rolleri ve kokpit topları.
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.engage())
const roles = await S(() => window.__sessiz.roles())
console.log('roles', roles)
if (!roles.some((x) => x === 'avci') || !roles.some((x) => x === 'kalkan')) errors.push(`roles missing ${roles}`)
const ck = await S(() => window.__sessiz.cockpitFire())
if (!(ck[0] > 0 || ck[1] > 0)) errors.push('cockpit gun did not fire')
await S(() => window.__sessiz.setCam('chase'))
await S(() => window.__sessiz.wipe())
await S(() => window.__sessiz.skipRender(false))

// 7) Dokunmatik: "⋯" ikincil düğmeleri açar; ana gemi düğmeleri az.
await S(() => window.__sessiz.showTouch(true))
await page.waitForTimeout(200)
const prim = await S(() => [...document.querySelectorAll('#touch-buttons button')].filter((b) => getComputedStyle(b).display !== 'none').length)
await S(() => document.getElementById('touch-more').click())
await page.waitForTimeout(100)
const all = await S(() => [...document.querySelectorAll('#touch-buttons button')].filter((b) => getComputedStyle(b).display !== 'none').length)
console.log('touch buttons', prim, '->', all)
if (prim > 7) errors.push(`too many primary touch buttons ${prim}`)
if (!(all > prim)) errors.push('more menu did not reveal buttons')
if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/v13-touch.png` })

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v17 ok')
