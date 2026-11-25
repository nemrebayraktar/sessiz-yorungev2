import { chromium } from 'playwright'

// Üs savunması, koloni, türler/yerleşimciler, botlar, yüzey dövüşü ve benzersiz sistemler. Dev sunucu ayaktayken çalıştırın.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`error: ${msg.text()}`)
})
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
await page.evaluate(() => {
  window.__sessiz.skipIntro()
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)

// 1) Evrenler farklı sistemler üretir.
const sigs = new Set()
for (const id of ['kizil', 'soluk', 'proxima', 'alpha']) {
  await page.evaluate((u) => window.__sessiz.jump(u), id)
  await page.waitForFunction((u) => window.__sessiz.snap().universe === u && !window.__sessiz.snap().fading, id)
  const names = await page.evaluate(() => window.__sessiz.snap().planets.map((p) => p.name).join('|'))
  sigs.add(names)
}
if (sigs.size !== 4) errors.push(`systems not unique: ${[...sigs].join(' // ')}`)

// 2) Ev gezegeninde üs, taret, dalga.
await page.evaluate(() => window.__sessiz.jump('gunes'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'gunes' && !window.__sessiz.snap().fading)
const landed = await page.evaluate(() => window.__sessiz.landOnId('dunya'))
if (!landed) errors.push('could not land on Dunya')
await page.evaluate(() => window.__sessiz.giveEnergy(300))
// Aşama 6: Dünyalı oyuncunun Dünya'daki karakolu başlangıçta hazır kurulu gelir.
const founded = await page.evaluate(() => window.__sessiz.foundBase() || window.__sessiz.snap().colonies.some((c) => c.id === 'dunya' && c.kind === 'main'))
if (!founded) errors.push('base not founded')
await page.evaluate(() => window.__sessiz.callWave())
let waveDone = false
for (let i = 0; i < 60 && !waveDone; i++) {
  await page.evaluate(() => window.__sessiz.stepGround(60))
  waveDone = await page.evaluate(() => window.__sessiz.snap().colonies.find((c) => c.id === 'dunya')?.wave >= 1)
}
if (!waveDone) errors.push('first wave never cleared')
const overlap = await page.evaluate(() => window.__sessiz.groundOverlap())
if (overlap > 0.2) errors.push(`ground overlap ${overlap}`)

// 3) Yürüyen karakter seçilen türün görünümünü taşır.
const look = await page.evaluate(() => window.__sessiz.snap().walkerLook)
if (look !== 'earth') errors.push(`walker look ${look}`)

// 4) Boş gezegende yerlileri temizle, karakol kur, seviyeye göre nüfus büyüsün, istilayı yerleşimciler savsın.
await page.evaluate(() => window.__sessiz.board())
const freeId = await page.evaluate(() => {
  const bots = window.__sessiz.botColonies().map((b) => b.id)
  return window.__sessiz.snap().planets.find((p) => p.kind !== 'large' && p.id !== 'dunya' && !bots.includes(p.id) && p.landable !== false)?.id
})
if (!freeId) errors.push('no free planet')
else {
  await page.evaluate((id) => window.__sessiz.landOnId(id), freeId)
  await page.evaluate(() => window.__sessiz.giveEnergy(900))
  await page.evaluate(() => {
    const s = window.__sessiz
    for (let i = 0; i < 24; i++) {
      s.approachLocal(2.2)
      s.punch()
      s.stepGround(2)
    }
  })
  if (!(await page.evaluate(() => window.__sessiz.foundBase()))) errors.push('outpost not founded')
  const pops = []
  for (const level of [1, 3, 5]) {
    await page.evaluate((lv) => {
      const s = window.__sessiz
      s.setLevel(lv, false)
      for (let i = 0; i < 50; i++) {
        s.setVitals(100, 52, 0, 0)
        s.stepGround(60)
      }
    }, level)
    pops.push(await page.evaluate(() => window.__sessiz.snap().settlers))
  }
  if (!(pops[0] < pops[1] && pops[1] < pops[2])) errors.push(`settlers do not scale with level: ${pops}`)
  await page.evaluate(() => {
    const s = window.__sessiz
    s.setLevel(5, true)
    s.stepGround(60 * 20)
    s.callWave()
    for (let i = 0; i < 60; i++) {
      s.setVitals(100, 52, 0, 0)
      s.stepGround(60)
    }
  })
  const after = await page.evaluate(() => window.__sessiz.snap())
  if (after.invaders > 0) errors.push(`settlers did not clear the invasion (${after.invaders} left)`)
}

// 5) Bot üssü: düşmandır, yıkılabilir, gezegen sonra boşalır.
await page.evaluate(() => window.__sessiz.board())
const bot = await page.evaluate(() => window.__sessiz.botColonies().find((b) => b.universe === 'gunes'))
if (bot) {
  await page.evaluate((id) => window.__sessiz.landOnId(id), bot.id)
  if (await page.evaluate(() => window.__sessiz.foundBase())) errors.push('founded on a bot planet')
  if (!(await page.evaluate(() => window.__sessiz.conquer()))) errors.push('bot colony could not be conquered')
}

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v7 ok')
