import { chromium } from 'playwright'

// v7: Ross 128 b (eski Marslılar), iki yönlü kapı ağı, ırka göre seyir hızı, sınırda yumuşak dönüş,
// takla/kamera düzeltmesi, sistem haritası ve "Eve dön".
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
  await page.waitForFunction((o) => window.__sessiz.snap().origin === o && window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading, id)
}
await page.evaluate(() => window.__sessiz.skipIntro())

// 1) Kapı ağı: hepsi iki yönlü; Kepler-452'ye en zor yol en zayıf ırklardan.
await start('earth')
const gates = await page.evaluate(() => window.__sessiz.gates())
for (const [a, list] of Object.entries(gates)) for (const b of list) if (!gates[b].includes(a)) errors.push(`one-way gate ${a} -> ${b}`)
const toLegend = await page.evaluate(() => {
  const s = window.__sessiz
  const homes = { earth: 'gunes', mars: 'marskol', proxima: 'proxima', alpha: 'alpha', trappist: 'trappist', k218: 'k218', kepler186: 'kepler186', gliese: 'gliese' }
  return Object.fromEntries(Object.entries(homes).map(([o, h]) => [o, s.hops('kepler452', h)]))
})
if (toLegend.earth !== 4 || toLegend.mars !== 4) errors.push(`weakest races should be 4 gates from Kepler-452 ${JSON.stringify(toLegend)}`)
if (Math.max(...Object.values(toLegend)) > 4) errors.push(`some race farther than 4 gates ${JSON.stringify(toLegend)}`)

// 2) Mars ırkı artık Ross 128 b'de.
await start('mars')
const mars = await page.evaluate(() => ({ s: window.__sessiz.snap(), uni: document.getElementById('uni-name').textContent }))
if (!mars.s.planets.some((p) => p.name === 'Ross 128 b')) errors.push('Ross 128 b missing in Mars race home')
if (mars.uni !== 'Ross 128') errors.push(`Mars race home system name ${mars.uni}`)

// 3) Irka göre seyir hızı: zayıf < güçlü, en güçlü eski 380'in altında.
const cruise = {}
for (const id of ['earth', 'kepler452']) {
  await start(id)
  cruise[id] = await page.evaluate(() => window.__sessiz.cruise())
}
if (!(cruise.earth < 160 && cruise.kepler452 > 280 && cruise.kepler452 < 380)) errors.push(`cruise speeds ${JSON.stringify(cruise)}`)

// 4) Takla ve kamera: dikey döngüde istenmeyen yuvarlanma ve ters kamera yok.
await start('earth')
const steer = await page.evaluate(() => ({ normal: window.__sessiz.steerProbe(-30, 400, false), easy: window.__sessiz.steerProbe(-30, 400, true) }))
for (const [m, r] of Object.entries(steer)) {
  if (r.maxRollDegPerFrame > 1.5) errors.push(`${m}: roll spikes ${r.maxRollDegPerFrame}°/frame`)
  if (r.cameraUpsideDownFrames > 0) errors.push(`${m}: camera upside down for ${r.cameraUpsideDownFrames} frames`)
}

// 5) Sınır: ileri basılı tutup dışarı uçarken gemi sınırda takılmaz, merkeze döner.
const edge = await page.evaluate(() => {
  const s = window.__sessiz
  const lim = s.mapLimit()
  s.place(lim - 200, 40, 0)
  s.hold(false)
  s.steerProbe(-30, 57, false)
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
  const over = []
  for (let k = 0; k < 24; k++) {
    s.stepWorld(30)
    over.push(Math.hypot(...s.snap().pos) - lim)
  }
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
  return { max: Math.max(...over), last: over[over.length - 1] }
})
if (edge.max > 150) errors.push(`ship went ${Math.round(edge.max)} past the edge`)
if (edge.last > -100) errors.push(`ship did not turn back from the edge (${Math.round(edge.last)})`)

// 6) Eve dön: Kepler-452'den kapı kapı Dünya'ya.
await page.evaluate(() => window.__sessiz.jump('kepler452'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'kepler452' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.routeHome())
let jumps = 0
for (; jumps < 6; jumps++) {
  const next = await page.evaluate(() => window.__sessiz.routeNextGate())
  const here = await page.evaluate(() => window.__sessiz.snap().universe)
  if (here === 'gunes') break
  if (!next) break
  await page.evaluate((n) => window.__sessiz.jump(n), next)
  await page.waitForFunction((n) => window.__sessiz.snap().universe === n && !window.__sessiz.snap().fading, next)
}
const final = await page.evaluate(() => ({ u: window.__sessiz.snap().universe, hint: document.getElementById('route-hint').textContent }))
if (final.u !== 'gunes' || jumps !== 4) errors.push(`route home ended in ${final.u} after ${jumps} jumps`)
if (!final.hint.includes('Dünya')) errors.push(`route hint at home: ${final.hint}`)

// 7) Sağ alt: radar ↔ sistem haritası.
await page.evaluate(() => window.__sessiz.toggleRadar())
if ((await page.evaluate(() => window.__sessiz.radarMode())) !== 'system') errors.push('radar did not switch to system map')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v11 ok')
