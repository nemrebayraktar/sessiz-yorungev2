import { chromium } from 'playwright'
import fs from 'node:fs'

const dir = '/tmp/sessiz-v5'
fs.mkdirSync(dir, { recursive: true })
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})

async function boot(origin, width, height, touch = false) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`error: ${msg.text()}`)
  })
  await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__sessiz)
  await page.evaluate((id) => {
    window.__sessiz.skipIntro()
    window.__sessiz.pick(id)
    window.__sessiz.confirm()
  }, origin)
  await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
  return page
}

const earth = await boot('earth', 1440, 900)
let snap = await earth.evaluate(() => window.__sessiz.snap())
console.log('earth kit', snap.owned, 'threat', snap.threat, 'regen', snap.regen, 'ys', snap.ys)
if (snap.owned.length !== 1 || snap.owned[0] !== 'laser') errors.push(`earth weapons ${snap.owned}`)
if (!(snap.threat < 0.7)) errors.push(`early threat ${snap.threat}`)
const span = Math.max(...snap.ys) - Math.min(...snap.ys)
if (span < 80) errors.push(`planets too flat ${span}`)
if (!snap.net.includes('Ev:') || !snap.net.includes('kapı')) errors.push(`netmap ${snap.net}`)
const unlocked = await earth.evaluate(() => window.__sessiz.grant(80))
const banner = await earth.locator('#unlock').innerText()
console.log('unlock', unlocked, banner)
if (!unlocked.includes('spread')) errors.push(`unlock set ${unlocked}`)
if (!banner.includes('Yeni silah')) errors.push(`banner ${banner}`)
await earth.screenshot({ path: `${dir}/unlock.png` })

await earth.evaluate(() => window.__sessiz.jump('gunes'))
await earth.waitForFunction(() => window.__sessiz.snap().universe === 'gunes' && !window.__sessiz.snap().fading, null, { timeout: 8000 })
snap = await earth.evaluate(() => window.__sessiz.snap())
console.log('home', snap.atHome, snap.regen, snap.home, snap.net)
if (!snap.atHome || snap.home !== 'gunes') errors.push('earth not home in solar system')
if (!(snap.regen > 20)) errors.push(`home regen ${snap.regen}`)
const names = await earth.evaluate(() => window.__sessiz.snap().planets.map((p) => p.id))
for (const id of ['gunes-yildiz', 'dunya', 'ay', 'mars-gezegen', 'jupiter', 'saturn', 'neptun']) {
  if (!names.includes(id)) errors.push(`missing ${id}`)
}
await earth.evaluate(() => {
  window.__sessiz.setVitals(40, 12, 0, 0)
  return window.__sessiz.landId('dunya')
})
await earth.waitForTimeout(200)
snap = await earth.evaluate(() => window.__sessiz.snap())
console.log('earth surface', snap.layer, snap.hull, snap.shield, snap.power)
if (snap.layer !== 'foot') errors.push('did not land on Earth')
if (snap.hull < 90 || snap.shield < 40 || snap.power <= 0) errors.push(`home heal ${snap.hull} ${snap.shield} ${snap.power}`)
await earth.screenshot({ path: `${dir}/earth-surface.png` })
await earth.evaluate(() => window.__sessiz.frameSolar())
await earth.waitForTimeout(250)
await earth.screenshot({ path: `${dir}/solar-wide.png` })
await earth.evaluate(() => window.__sessiz.frameBody('saturn'))
await earth.waitForTimeout(200)
await earth.screenshot({ path: `${dir}/saturn.png` })
const moon = await earth.evaluate(() => window.__sessiz.landId('ay'))
if (!moon) errors.push('moon landing failed')
await earth.close()

const away = await boot('kepler452', 1280, 720)
const heat = await away.evaluate(() => window.__sessiz.heatPulse(1.4))
console.log('heat', heat)
if (!heat || heat.loss < 8) errors.push(`sun did not heat ${JSON.stringify(heat)}`)
if (heat.hull < 40) errors.push(`sun killed too fast ${heat.hull}`)
await away.evaluate(() => window.__sessiz.jump('alpha'))
await away.waitForFunction(() => window.__sessiz.snap().universe === 'alpha' && !window.__sessiz.snap().fading)
await away.evaluate(() => window.__sessiz.frameBody('alpha-ev'))
await away.waitForTimeout(250)
await away.screenshot({ path: `${dir}/alpha.png` })
await away.evaluate(() => window.__sessiz.jump('proxima'))
await away.waitForFunction(() => window.__sessiz.snap().universe === 'proxima' && !window.__sessiz.snap().fading)
await away.evaluate(() => window.__sessiz.frameBody('proxima-ev'))
await away.waitForTimeout(250)
await away.screenshot({ path: `${dir}/proxima.png` })
const hostile = await away.evaluate(() => window.__sessiz.snap())
if (hostile.atHome) errors.push('kepler should not be home in proxima')
if (!(hostile.threat > 0.6)) errors.push(`hostile threat ${hostile.threat}`)
await away.close()

const phone = await boot('earth', 390, 844, true)
await phone.evaluate(() => window.__sessiz.showTouch(true))
await phone.waitForTimeout(200)
const hud = await phone.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }
  const a = box('.bars')
  const b = box('#stick')
  const overlap = a && b && !(a.right < b.left + 1 || a.left > b.right - 1 || a.bottom < b.top + 1 || a.top > b.bottom - 1)
  return { net: document.getElementById('netmap')?.textContent, overlap, bars: a, stick: b }
})
console.log('phone', hud.net, hud.overlap)
if (hud.overlap) errors.push('mobile bars overlap stick')
if (!hud.net?.includes('Ev:')) errors.push('mobile net missing')
await phone.screenshot({ path: `${dir}/mobile-hud.png` })
await phone.close()

fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ errors }, null, 2))
console.log('ERRORS', errors.length)
for (const e of errors) console.log(' -', e)
await browser.close()
process.exit(errors.length ? 1 : 0)
