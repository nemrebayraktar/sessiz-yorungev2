import { chromium } from 'playwright'
import fs from 'node:fs'

const dir = '/tmp/sessiz-v6'
fs.mkdirSync(dir, { recursive: true })
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

const motion = await page.evaluate(() => {
  window.__sessiz.landOn('small')
  const before = window.__sessiz.rig()
  window.__sessiz.walk(0.8)
  window.__sessiz.snapCam()
  const after = window.__sessiz.rig()
  return { before, after, face: window.__sessiz.faceDot(), behind: window.__sessiz.behind() }
})
console.log('motion', motion)
if (Math.abs(motion.after.legL - motion.before.legL) < 0.05 && Math.abs(motion.after.legL) < 0.05) {
  errors.push(`legs did not swing ${JSON.stringify(motion)}`)
}
if (motion.face < 0.7) errors.push(`not facing travel ${motion.face}`)
if (motion.behind < 0.45) errors.push(`camera not behind ${motion.behind}`)
await page.screenshot({ path: `${dir}/walk-behind.png` })
const punch = await page.evaluate(() => window.__sessiz.punchPose())
console.log('punch', punch)
if (punch > -0.6) errors.push(`punch arm ${punch}`)
await page.screenshot({ path: `${dir}/punch.png` })
await page.screenshot({ path: `${dir}/locals.png` })

const route = await page.evaluate(() => window.__sessiz.setRoute(window.__sessiz.snap().planets.find((p) => p.kind === 'large').id))
console.log('route', route)
if (!route) errors.push('route line did not turn on')
await page.waitForTimeout(200)
await page.screenshot({ path: `${dir}/route.png` })

await page.evaluate(() => window.__sessiz.place(420, 80, 420))
await page.waitForTimeout(250)
const beacons = await page.evaluate(() => window.__sessiz.beacons())
console.log('beacons', beacons)
if (beacons < 1) errors.push('no offscreen planet arrows')
await page.screenshot({ path: `${dir}/beacons.png` })

const chase = await page.evaluate(() => window.__sessiz.simChase())
console.log('chase', chase)
if (Math.abs(chase.x) > 0.72 || Math.abs(chase.y) > 0.72) errors.push(`ship left frame ${JSON.stringify(chase)}`)
const mobile = await page.evaluate(() => {
  window.__sessiz.setMobile(true)
  return window.__sessiz.simChase()
})
console.log('mobile cam', mobile)
if (Math.abs(mobile.x) > 0.72 || Math.abs(mobile.y) > 0.72 || mobile.dist < 12) errors.push(`mobile camera ${JSON.stringify(mobile)}`)

const spin = await page.evaluate(() => window.__sessiz.spinPlanets(180))
console.log('spin', spin)
if (Math.abs(spin.y - spin.y0) > 0.05) errors.push(`planet Y drifted ${spin.y} ${spin.y0}`)
if (spin.drift > 30) errors.push(`planet ran off ${spin.drift}`)

const beforeFleets = await page.evaluate(() => window.__sessiz.snap().fleets)
await page.evaluate(() => window.__sessiz.jump('alpha'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'alpha' && !window.__sessiz.snap().fading)
const afterFleets = await page.evaluate(() => window.__sessiz.snap().fleets)
console.log('ambush', beforeFleets, afterFleets)
// Aşama 6: filolar sisteme bağlı (geçişte eski sistemin filoları kalır); yabancı ev sisteminde pusu filosu doğmalı.
if (afterFleets < 1) errors.push('ambush did not spawn')

await page.close()

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
phone.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await phone.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await phone.waitForFunction(() => window.__sessiz)
await phone.evaluate(() => {
  window.__sessiz.skipIntro()
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
  window.__sessiz.showTouch(true)
  window.__sessiz.setMobile(true)
})
await phone.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await phone.waitForTimeout(400)
await phone.screenshot({ path: `${dir}/mobile-flight.png` })
const mapBtn = await phone.locator('#btn-map').boundingBox()
if (!mapBtn || mapBtn.width < 20) errors.push('map button missing')
await phone.close()

fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ errors }, null, 2))
console.log('ERRORS', errors.length)
for (const e of errors) console.log(' -', e)
await browser.close()
process.exit(errors.length ? 1 : 0)
