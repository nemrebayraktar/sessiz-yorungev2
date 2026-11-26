import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const outDir = '/tmp/sessiz-v2'
fs.mkdirSync(outDir, { recursive: true })
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`)
})
const shot = (name) => page.screenshot({ path: path.join(outDir, name) })
const snap = () => page.evaluate(() => window.__sessiz.snap())
const waitMode = (mode, ms = 10000) =>
  page.waitForFunction((m) => window.__sessiz && window.__sessiz.mode === m && !window.__sessiz.snap().fading, mode, { timeout: ms })

await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz, null, { timeout: 15000 })
await page.evaluate(() => window.__sessiz.skipIntro())
await page.waitForTimeout(400)
await page.locator('#btn-start').click()
await waitMode('select')

const ids = ['earth', 'mars', 'proxima', 'alpha', 'trappist', 'k218', 'kepler186', 'gliese', 'kepler452']
for (const id of ids) {
  await page.evaluate((origin) => window.__sessiz.pick(origin), id)
  await page.waitForTimeout(120)
  const planet = await page.locator('#sel-planet').innerText()
  const s = await snap()
  if (s.origin !== id) errors.push(`origin stuck at ${s.origin} wanted ${id}`)
  if (!planet) errors.push(`empty planet label for ${id}`)
}
await page.evaluate(() => window.__sessiz.pick('alpha'))
await page.waitForTimeout(500)
await shot('select-alpha.png')
const alphaText = await page.locator('#sel-planet').innerText()
if (!alphaText.includes('Alpha')) errors.push(`alpha label ${alphaText}`)

await page.locator('#sel-next').click()
await page.waitForTimeout(150)
await page.evaluate(() => window.__sessiz.pick('kepler452'))
await page.locator('#sel-go').click()
await waitMode('map')
let s = await snap()
if (s.origin !== 'kepler452') errors.push('did not launch as Kepler-452b')
if (s.universe !== 'kepler452') errors.push(`did not start in own home system (kepler452), got ${s.universe}`)

// Aşama 6: savaş yerinde başlar, mod 'map' kalır.
await page.evaluate(() => window.__sessiz.engage())
await page.waitForTimeout(200)
s = await snap()
if (s.mode !== 'map' || !s.skirmish) errors.push(`combat should start in place (mode ${s.mode}, skirmish ${s.skirmish})`)
if (s.alive < 2) errors.push('combat missing fighters')
if (s.humans < 1) errors.push('alien origin should face human hunters')

await page.evaluate(() => {
  window.__sessiz.arrange()
  window.__sessiz.hold(false)
  window.__sessiz.setCam('chase')
  window.__sessiz.cast(1)
  window.__sessiz.cast(2)
})
await page.waitForTimeout(700)
s = await snap()
console.log('abilities', s)
if (s.stunned < 1) errors.push('stun did not freeze anyone')
if (s.well <= 0) errors.push('mini well did not open')
await shot('abilities.png')

await page.evaluate(() => window.__sessiz.wipe())
await page.waitForTimeout(300)
s = await snap()
if (s.mode !== 'map' || s.skirmish) errors.push(`after win should stay in map (mode ${s.mode}, skirmish ${s.skirmish})`)
if (s.loot < 1) errors.push('no loot dropped after win')
await page.evaluate(() => window.__sessiz.jump('kizil'))
await waitMode('map', 8000)
await page.waitForTimeout(600)
s = await snap()
console.log('universe', s.universe, s.tf, s.pos)
if (s.universe !== 'kizil') errors.push(`still in ${s.universe}`)
await page.evaluate(() => {
  window.__sessiz.place(0, 36, 70)
  window.__sessiz.setCam('chase')
})
await page.waitForTimeout(400)
await shot('universe-kizil.png')

await page.evaluate(() => window.__sessiz.jump('soluk'))
await waitMode('map', 8000)
s = await snap()
if (s.universe !== 'soluk') errors.push(`soluk missing, got ${s.universe}`)

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ errors }, null, 2))
console.log('ERRORS', errors.length)
for (const e of errors) console.log(' -', e)
await browser.close()
process.exit(errors.length ? 1 : 0)
