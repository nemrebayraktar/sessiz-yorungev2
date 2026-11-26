import { chromium } from 'playwright'
import fs from 'node:fs'

const dir = '/tmp/sessiz-v4'
fs.mkdirSync(dir, { recursive: true })
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})

async function boot(width, height, touch = false) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`error: ${msg.text()}`)
  })
  await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__sessiz)
  await page.evaluate(() => {
    window.__sessiz.skipIntro()
    window.__sessiz.pick('kepler452')
    window.__sessiz.confirm()
  })
  await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
  return page
}

function overlaps(a, b) {
  if (!a || !b || a.width < 2 || b.width < 2) return false
  return !(a.right < b.left + 1 || a.left > b.right - 1 || a.bottom < b.top + 1 || a.top > b.bottom - 1)
}

const desk = await boot(1440, 900)
// Aşama 6: oyun kendi ev sisteminde (kepler452) başlar; bu bölüm Sessiz Avlu'yu sınadığı için önce oraya geçilir.
let snap = await desk.evaluate(() => window.__sessiz.snap())
if (snap.universe !== 'kepler452') errors.push(`kepler452 should start at home, got ${snap.universe}`)
await desk.evaluate(() => window.__sessiz.jump('avlu'))
await desk.waitForFunction(() => window.__sessiz.snap().universe === 'avlu' && !window.__sessiz.snap().fading)
snap = await desk.evaluate(() => window.__sessiz.snap())
console.log('planets', snap.planets, 'worms', snap.worms, 'pois', snap.pois, 'weapon', snap.weapon)
if (snap.planets.filter((p) => p.kind === 'small').length < 1 || snap.planets.filter((p) => p.kind === 'large').length < 1) {
  errors.push(`avlu planets ${JSON.stringify(snap.planets)}`)
}
if (snap.pois < 8) errors.push(`pois ${snap.pois}`)
if (!snap.worms.includes('kizil') || !snap.worms.includes('soluk')) errors.push(`avlu worms ${snap.worms}`)
if (snap.weapon !== 'chain') errors.push(`kepler weapon ${snap.weapon}`)

const hops = await desk.evaluate(() => ({
  small: window.__sessiz.measureHop('small'),
  large: window.__sessiz.measureHop('large'),
}))
console.log('hops', hops)
if (!(hops.small > hops.large * 2)) errors.push(`jump small ${hops.small} large ${hops.large}`)

const walked = await desk.evaluate(() => {
  window.__sessiz.landOn('small')
  const small = window.__sessiz.walk(2)
  window.__sessiz.board()
  window.__sessiz.landOn('large')
  const large = window.__sessiz.walk(2)
  const back = window.__sessiz.board()
  return { small, large, back, layer: window.__sessiz.snap().layer }
})
console.log('walk', walked)
if (walked.small.angle < 0.45) errors.push(`small walk angle ${walked.small.angle}`)
if (walked.small.alt < 0.8 || walked.small.alt > 3) errors.push(`small alt ${walked.small.alt}`)
if (!(walked.large.angle < walked.small.angle * 0.65)) errors.push(`large not heavier ${walked.large.angle}`)
if (!walked.back || walked.layer !== 'ship') errors.push('board failed')

await desk.evaluate(() => window.__sessiz.landOn('small'))
await desk.waitForTimeout(250)
await desk.screenshot({ path: `${dir}/foot-small.png` })
await desk.evaluate(() => window.__sessiz.framePlanet('large'))
await desk.waitForTimeout(200)
await desk.screenshot({ path: `${dir}/planet-large.png` })
await desk.evaluate(() => window.__sessiz.landOn('large'))
await desk.waitForTimeout(200)
await desk.screenshot({ path: `${dir}/landing.png` })
const wormTo = await desk.evaluate(() => window.__sessiz.frameWorm())
await desk.waitForTimeout(200)
const wormText = await desk.locator('#worm-net').innerText()
const prompt = await desk.locator('#prompt').innerText()
console.log('worm hud', wormTo, wormText, prompt)
if (!wormText.includes('Kızıl') || !wormText.includes('Soluk')) errors.push(`worm net ${wormText}`)
if (!prompt.includes('Eşik')) errors.push(`worm prompt ${prompt}`)
await desk.screenshot({ path: `${dir}/worm-hud.png` })

const chase = await desk.evaluate(() => window.__sessiz.simChase())
console.log('chase', chase)
if (Math.abs(chase.x) > 0.72 || Math.abs(chase.y) > 0.72 || chase.dist > 22 || chase.dist < 6) {
  errors.push(`camera lost the ship ${JSON.stringify(chase)}`)
}

await desk.evaluate(() => {
  window.__sessiz.place(0, 80, 200)
  window.__sessiz.setVitals(77, 33, 9, 4)
  window.__sessiz.cycle()
})
const before = await desk.evaluate(() => window.__sessiz.snap())
await desk.evaluate(() => window.__sessiz.jump('kizil'))
await desk.waitForFunction(() => window.__sessiz.snap().universe === 'kizil' && !window.__sessiz.snap().fading)
const mid = await desk.evaluate(() => window.__sessiz.snap())
console.log('transit', mid.universe, mid.hull, mid.shield, mid.weapon, mid.worms, mid.origin)
if (mid.hull !== 77 || mid.shield !== 33) errors.push(`vitals lost ${mid.hull} ${mid.shield}`)
if (mid.origin !== 'kepler452') errors.push(`origin lost ${mid.origin}`)
if (Math.abs(mid.cd1 - 9) > 0.35) errors.push(`cd1 ${mid.cd1}`)
if (before.weapon === 'chain') errors.push('weapon did not cycle')
if (mid.weapon !== before.weapon) errors.push(`weapon not kept ${before.weapon} -> ${mid.weapon}`)
if (!mid.worms.includes('avlu') || !mid.worms.includes('soluk')) errors.push(`kizil worms ${mid.worms}`)
if (mid.planets.length < 4) errors.push('kizil planets missing')
await desk.evaluate(() => window.__sessiz.jump('avlu'))
await desk.waitForFunction(() => window.__sessiz.snap().universe === 'avlu' && !window.__sessiz.snap().fading)
const backPos = await desk.evaluate(() => window.__sessiz.snap().pos)
const home = before.pos
const drift = Math.hypot(backPos[0] - home[0], backPos[1] - home[1], backPos[2] - home[2])
console.log('return drift', drift, backPos)
if (drift > 30) errors.push(`return position drift ${drift}`)
await desk.close()

const fight = await boot(1280, 720)
await fight.evaluate(() => window.__sessiz.engage())
await fight.waitForFunction(() => window.__sessiz.mode === 'map' && window.__sessiz.snap().skirmish)
snap = await fight.evaluate(() => window.__sessiz.snap())
console.log('giants', snap.giants, snap.giantHull, snap.normalHull, snap.bars, snap.attacks)
if (snap.giants < 1) errors.push('no giant')
if (snap.giantHull < snap.normalHull * 2) errors.push(`giant hull ${snap.giantHull} vs ${snap.normalHull}`)
if (snap.bars < 1) errors.push('giant bar missing')
const strike = await fight.evaluate(() => ({
  weak: window.__sessiz.strike('weak'),
  body: window.__sessiz.strike('body'),
}))
console.log('strike', strike)
if (!(strike.weak > strike.body * 1.4)) errors.push(`weak point ${JSON.stringify(strike)}`)
await fight.evaluate(() => window.__sessiz.arrange())
await fight.waitForTimeout(300)
await fight.screenshot({ path: `${dir}/giant.png` })
const gate = await fight.evaluate(() => window.__sessiz.dropEnemyGate())
console.log('gate', gate)
if (!gate?.to) errors.push('gate did not open')
const near = await fight.evaluate(() => window.__sessiz.simGiant())
console.log('giant cam', near)
if (!near || Math.abs(near.x) > 0.75 || Math.abs(near.y) > 0.75 || near.dist > 22) errors.push(`giant camera ${JSON.stringify(near)}`)
const swallowed = await fight.evaluate(() => window.__sessiz.swallowGate())
if (!swallowed) errors.push('alien did not escape through its gate')
const hullBefore = await fight.evaluate(() => {
  window.__sessiz.setVitals(81, 22, 6, 3)
  return window.__sessiz.enterGate()
})
await fight.waitForFunction(() => !window.__sessiz.snap().fading && window.__sessiz.mode === 'map')
const afterGate = await fight.evaluate(() => window.__sessiz.snap())
console.log('player gate', hullBefore, afterGate.universe, afterGate.hull, afterGate.shield, afterGate.origin)
if (afterGate.universe === 'avlu') errors.push('player gate did not change universe')
if (afterGate.hull !== 81 || afterGate.shield < 22 || afterGate.shield > 30) errors.push(`gate transit vitals ${afterGate.hull} ${afterGate.shield}`)
if (afterGate.origin !== 'kepler452') errors.push('gate transit dropped origin')
await fight.close()

const phone = await boot(390, 844, true)
await phone.evaluate(() => window.__sessiz.showTouch(true))
await phone.waitForTimeout(200)
const hud = await phone.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }
  return {
    bars: box('.bars'),
    stick: box('#stick'),
    fire: box('#touch-buttons button[data-act="fire"]'),
    uni: box('#uni-name'),
    ab: box('#ab1'),
    land: box('#touch-buttons button[data-act="land"]'),
    weapon: box('#touch-buttons button[data-act="weapon"]'),
  }
})
console.log('hud', hud)
const hit = (name, a, b) => {
  if (overlaps(a, b)) errors.push(`${name} overlap`)
}
if (!hud.bars || hud.bars.width < 20) errors.push('bars missing')
if (!hud.stick || hud.stick.width < 20) errors.push('stick missing')
if (!hud.fire || hud.fire.width < 20) errors.push('fire missing')
if (!hud.uni || hud.uni.width < 20) errors.push('universe label missing')
if (!hud.ab || hud.ab.width < 20) errors.push('ability missing')
hit('bars/stick', hud.bars, hud.stick)
hit('bars/fire', hud.bars, hud.fire)
hit('uni/ability', hud.uni, hud.ab)
await phone.screenshot({ path: `${dir}/mobile-hud.png` })
await phone.evaluate(() => window.__sessiz.landOn('small'))
await phone.waitForTimeout(250)
const footBtns = await phone.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return { width: r.width, height: r.height, display: style.display, text: el.textContent }
  }
  return {
    land: box('#touch-buttons button[data-act="land"]'),
    jump: box('#touch-buttons button[data-act="jump"]'),
    punch: box('#touch-buttons button[data-act="punch"]'),
  }
})
console.log('foot buttons', footBtns)
if (footBtns.land?.text !== 'Bin') errors.push(`land label ${footBtns.land?.text}`)
if (!footBtns.jump || footBtns.jump.width < 20 || footBtns.jump.display === 'none') errors.push('jump button hidden')
if (!footBtns.punch || footBtns.punch.width < 20) errors.push('punch button hidden')
await phone.screenshot({ path: `${dir}/mobile-foot.png` })
await phone.close()

fs.writeFileSync(`${dir}/report.json`, JSON.stringify({ errors }, null, 2))
console.log('ERRORS', errors.length)
for (const e of errors) console.log(' -', e)
await browser.close()
process.exit(errors.length ? 1 : 0)
