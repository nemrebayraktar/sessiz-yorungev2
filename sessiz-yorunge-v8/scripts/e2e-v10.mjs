import { chromium } from 'playwright'

// v6: park edilen gemi gezegenle gider, inişte savaş yörüngede bekler, köy figürleri donmuş kalmaz,
// yerliler vurulabilir, karakol topları büyük gezegende de isabet eder, her tür kendi gövdesiyle yürür.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const start = async (id) => {
  await page.evaluate((o) => {
    window.__sessiz.pick(o)
    window.__sessiz.confirm()
  }, id)
  await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.noTalk(true))
}
await page.evaluate(() => window.__sessiz.skipIntro())

// 1) Her tür kendi gövdesiyle yürür.
for (const id of ['earth', 'alpha', 'proxima', 'k218']) {
  await start(id)
  const look = await page.evaluate(() => window.__sessiz.snap().walkerLook)
  if (look !== id) errors.push(`walker look ${look} for ${id}`)
}
await start('earth')

// 2) Park edilen gemi ve yürüyen karakter gezegenle birlikte gider (10 dk).
await page.evaluate(() => window.__sessiz.landOnId('dunya'))
const g0 = await page.evaluate(() => window.__sessiz.shipGap())
await page.evaluate(() => window.__sessiz.stepGround(60 * 600))
const g1 = await page.evaluate(() => window.__sessiz.shipGap())
if (Math.abs(g1.surface - g0.surface) > 0.01) errors.push(`parked ship drifted ${g0.surface} -> ${g1.surface}`)
if (Math.abs(g1.walker - g0.walker) > 0.5) errors.push(`walker slid ${g0.walker} -> ${g1.walker}`)

// 3) İnişte savaş yörüngede bekler, kalkınca geri gelir.
await page.evaluate(() => {
  const s = window.__sessiz
  s.board()
  s.hold(false)
  s.engage()
  s.landOnId('dunya')
  s.stepGround(60 * 10)
})
const onFoot = await page.evaluate(() => ({ s: window.__sessiz.snap(), alt: window.__sessiz.fleetAlt() }))
if (onFoot.s.alive > 0) errors.push(`${onFoot.s.alive} enemy ships followed the walker down`)
if (onFoot.alt.some((a) => a < 30)) errors.push(`fleet inside/too close to planet ${onFoot.alt}`)
const back = await page.evaluate(() => {
  const s = window.__sessiz
  s.board()
  s.hold(false)
  for (let k = 0; k < 20; k++) if (s.stepWorld(30).alive) return true
  return false
})
if (!back) errors.push('stashed fleet did not re-engage after takeoff')

// 4) Mars: yerliler vurulur, karakoldan sonra köy figürü kalmaz.
await page.evaluate(() => {
  const s = window.__sessiz
  s.landOnId('mars-gezegen')
  s.giveEnergy(500)
  for (let i = 0; i < 40; i++) {
    s.approachLocal(2.2)
    s.punch()
    s.stepGround(3)
  }
})
if ((await page.evaluate(() => window.__sessiz.snap().locals)) !== 0) errors.push('natives could not be cleared')
if (!(await page.evaluate(() => window.__sessiz.foundBase()))) errors.push('outpost not founded on Mars')
const vill = await page.evaluate(() => window.__sessiz.villageLife('mars-gezegen'))
if (vill.visible) errors.push(`frozen village figures still visible (${vill.visible})`)

// 5) Büyük gezegendeki düşman karakolunun topları gemiye isabet eder (gezegen dönüşü yüzeyi akıtmaz).
await page.evaluate(() => {
  window.__sessiz.flyTo('mars-gezegen', 80) // gemiye dön (yerlileri kovalarken gemiden uzaklaşıldı)
  window.__sessiz.hold(false)
  window.__sessiz.jump('marskol')
})
await page.waitForFunction(() => window.__sessiz.snap().universe === 'marskol' && !window.__sessiz.snap().fading)
const home = (await page.evaluate(() => window.__sessiz.worldColonies())).find((w) => w.owner === 'mars' && w.home)
await page.evaluate((id) => window.__sessiz.flyTo(id, 26), home.id)
await page.evaluate(() => window.__sessiz.stepMap(2))
const v0 = await page.evaluate(() => window.__sessiz.snap())
await page.evaluate(() => window.__sessiz.stepMap(360))
const v1 = await page.evaluate(() => window.__sessiz.snap())
if (!(v1.hull + v1.shield < v0.hull + v0.shield)) errors.push('outpost guns never hit the ship')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v10 ok')
