import { chromium } from 'playwright'
import fs from 'node:fs'

const dir = '/tmp/sessiz-v3'
fs.mkdirSync(dir, { recursive: true })
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})

async function openSelect(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`)
  })
  await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__sessiz)
  await page.evaluate(() => window.__sessiz.skipIntro())
  await page.locator('#btn-start').click()
  await page.waitForFunction(() => window.__sessiz.mode === 'select')
  return page
}

function barMetrics(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('#sel-bar')
    const first = bar.querySelector('button')
    const selected = bar.querySelector('button.on')
    const br = bar.getBoundingClientRect()
    const fr = first.getBoundingClientRect()
    const sr = selected.getBoundingClientRect()
    const style = getComputedStyle(selected)
    return {
      scroll: bar.scrollLeft,
      firstLeft: Math.round(fr.left - br.left),
      firstRight: Math.round(fr.right - br.left),
      firstVisible: fr.left >= br.left - 1 && fr.right <= br.right + 1,
      selectedText: selected.textContent,
      selectedBg: style.backgroundColor,
      selectedColor: style.color,
      selectedInBar: sr.left >= br.left - 2 && sr.right <= br.right + 2,
    }
  })
}

const desktop = await openSelect(1440, 900)
await desktop.evaluate(() => window.__sessiz.pick('earth'))
await desktop.waitForTimeout(200)
const desktopFirst = await barMetrics(desktop)
console.log('desktop first', desktopFirst)
if (!desktopFirst.firstVisible || desktopFirst.scroll > 2) errors.push(`desktop first chip clipped ${JSON.stringify(desktopFirst)}`)
await desktop.screenshot({ path: `${dir}/select-desktop.png` })
const before = await desktop.evaluate(() => document.querySelector('#sel-bar').scrollLeft)
await desktop.locator('#sel-bar').hover()
await desktop.mouse.wheel(0, 120)
await desktop.waitForTimeout(120)
const afterWheel = await desktop.evaluate(() => document.querySelector('#sel-bar').scrollLeft)
console.log('wheel', before, afterWheel)
if (afterWheel <= before + 8) errors.push('mouse wheel did not scroll the origin bar')
await desktop.evaluate(() => window.__sessiz.pick('kepler452'))
await desktop.waitForTimeout(200)
const desktopLast = await barMetrics(desktop)
console.log('desktop last', desktopLast)
if (desktopLast.selectedText !== '452b') errors.push('452b not selected')
if (!desktopLast.selectedInBar) errors.push(`selected chip not fully in the bar ${JSON.stringify(desktopLast)}`)
await desktop.close()

const mobile = await openSelect(390, 844)
await mobile.evaluate(() => window.__sessiz.pick('earth'))
await mobile.waitForTimeout(250)
const mobileFirst = await barMetrics(mobile)
console.log('mobile first', mobileFirst)
if (!mobileFirst.firstVisible) errors.push(`mobile first chip clipped ${JSON.stringify(mobileFirst)}`)
await mobile.screenshot({ path: `${dir}/select-mobile.png` })
await mobile.evaluate(() => window.__sessiz.pick('alpha'))
await mobile.waitForTimeout(200)
await mobile.screenshot({ path: `${dir}/select-mobile-alpha.png` })
await mobile.close()

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`)
})
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const ids = ['earth', 'mars', 'proxima', 'alpha', 'trappist', 'k218', 'kepler186', 'gliese', 'kepler452']
await page.evaluate(() => window.__sessiz.skipIntro())
await page.locator('#btn-start').click()
await page.waitForFunction(() => window.__sessiz.mode === 'select')
for (const id of ids) {
  await page.evaluate((origin) => window.__sessiz.pick(origin), id)
  const got = await page.evaluate(() => window.__sessiz.snap().origin)
  if (got !== id) errors.push(`pick failed ${id} -> ${got}`)
}
await page.evaluate(() => window.__sessiz.pick('kepler452'))
await page.locator('#sel-go').click()
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.engage())
// Aşama 6: savaş yerinde, mod 'map' kalır.
await page.waitForFunction(() => window.__sessiz.mode === 'map' && window.__sessiz.snap().skirmish)
let snap = await page.evaluate(() => window.__sessiz.snap())
console.log('combat', snap.alive, snap.attacks, snap.humans)
if (snap.alive < 5) errors.push(`expected more enemies, got ${snap.alive}`)
if (!snap.attacks.includes('homing') || !snap.attacks.includes('goo') || !snap.attacks.includes('well')) {
  errors.push(`attack mix missing ${snap.attacks}`)
}
await page.evaluate(() => {
  window.__sessiz.arrange()
  window.__sessiz.hold(false)
  window.__sessiz.cast(1)
  window.__sessiz.cast(2)
})
await page.waitForTimeout(400)
snap = await page.evaluate(() => window.__sessiz.snap())
if (snap.stunned < 1 || snap.well <= 0) errors.push(`abilities failed ${JSON.stringify({ stunned: snap.stunned, well: snap.well })}`)
const poolBefore = snap.hull + snap.shield
await page.evaluate(() => window.__sessiz.parkPlayerInOwnWell())
await page.waitForTimeout(1200)
snap = await page.evaluate(() => window.__sessiz.snap())
const selfLoss = poolBefore - (snap.hull + snap.shield)
console.log('self well loss', selfLoss, 'hull', snap.hull, 'shield', snap.shield)
if (selfLoss > 8) errors.push(`player well hurt too much: ${selfLoss}`)
if (selfLoss <= 0) errors.push('player well did not tick inside its core')
const aliveBeforeWell = (await page.evaluate(() => window.__sessiz.snap())).alive
await page.evaluate(() => {
  window.__sessiz.hold(false)
  return window.__sessiz.dropEnemyWell()
})
await page.waitForTimeout(350)
await page.screenshot({ path: `${dir}/blackhole-death.png` })
// Aşama 6: harita sahnesi de çizildiği için yazılım GPU'sunda kare hızı düşük; kuyunun ömrü (oyun zamanı) bitene kadar bekle.
await page.waitForFunction((n) => window.__sessiz.snap().alive < n, aliveBeforeWell, { timeout: 6000 }).catch(() => {})
snap = await page.evaluate(() => window.__sessiz.snap())
console.log('after enemy well', snap.alive, snap.enemyWells, snap.hull)
// Aşama 6: yerinde savaşta düşman sayısı sabit 6 değil; kuyuyu açanın ölüp ölmediğine bakılır.
if (snap.alive >= aliveBeforeWell) errors.push(`enemy well did not kill its maker (${aliveBeforeWell} -> ${snap.alive})`)

fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ errors }, null, 2))
console.log('ERRORS', errors.length)
for (const e of errors) console.log(' -', e)
await browser.close()
process.exit(errors.length ? 1 : 0)
