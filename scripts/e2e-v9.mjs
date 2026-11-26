import { chromium } from 'playwright'

// v5: gezegenler 2,5 kat büyük ve yörüngeleri ayrık; yüzeye yapışık gemi her gezegene inebilir.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
await page.evaluate(() => {
  window.__sessiz.skipIntro()
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.tutorial(false, false))

// 1) Hiçbir evrende iki gezegen yörüngede birbirine girmez (28 saatlik dönüş).
for (const uni of ['gunes', 'avlu', 'kizil', 'soluk', 'proxima']) {
  await page.evaluate((u) => window.__sessiz.jump(u), uni)
  await page.waitForFunction((u) => window.__sessiz.snap().universe === u && !window.__sessiz.snap().fading, uni)
  // Döngü parçalara bölünür: sayfa uzun süre kilitlenmesin (yazılımsal GL'de bellek şişiyor).
  let min = Infinity
  for (let chunk = 0; chunk < 20; chunk++) {
    const m = await page.evaluate(() => {
      const s = window.__sessiz
      const ids = s.snap().planets.map((p) => p.id)
      let m = Infinity
      for (let k = 0; k < 10; k++) {
        s.spinPlanets(60 * 500)
        const P = ids.map((id) => s.planetPos(id))
        for (let i = 0; i < P.length; i++)
          for (let j = i + 1; j < P.length; j++) m = Math.min(m, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y, P[i].z - P[j].z) - P[i].r - P[j].r)
      }
      return m
    })
    min = Math.min(min, m)
    await page.waitForTimeout(150)
  }
  if (min < 150) errors.push(`${uni}: planets too close (${Math.round(min)})`)
}

// 2) Yüzeye yapışık (yarıçap + 2,5) gemi, yıldız dışındaki her gövdeye L ile iner.
await page.evaluate(() => window.__sessiz.jump('gunes'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'gunes' && !window.__sessiz.snap().fading)
const ids = await page.evaluate(() => window.__sessiz.snap().planets.map((p) => p.id))
for (const id of ids) {
  const landed = await page.evaluate(async (pid) => {
    const s = window.__sessiz
    const p = s.planetPos(pid)
    const n = Math.hypot(0.3, 0.9, 0.3)
    s.place(p.x + (0.3 / n) * (p.r + 2.6), p.y + (0.9 / n) * (p.r + 2.6), p.z + (0.3 / n) * (p.r + 2.6))
    s.hold(false)
    await new Promise((r) => setTimeout(r, 400))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }))
    await new Promise((r) => setTimeout(r, 120))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyL' }))
    const layer = s.snap().layer
    if (layer === 'foot') s.board()
    return { layer, landable: p.landable }
  }, id)
  if (landed.landable && landed.layer !== 'foot') errors.push(`could not land on ${id} while hugging the surface`)
  if (!landed.landable && landed.layer === 'foot') errors.push(`landed on star ${id}`)
}

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v9 ok')
