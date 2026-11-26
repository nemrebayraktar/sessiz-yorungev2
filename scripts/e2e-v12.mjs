import { chromium } from 'playwright'

// v12: yancılar (küçük gövde) + ana karakterler, baskın ekibi: topla → gemiyle taşı (eşlik gemileri) →
// yerlileri temizle → karakol kurunca katıl → tekrar topla → düşman üssünü düşür, üs senin olur ve ekip yerleşir.
// Telefon: Ekip düğmesi yalnız üssün yanında görünür.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
await page.evaluate(() => window.__sessiz.skipIntro())
await page.evaluate(() => {
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.tutorial(false, false))
const S = (fn, arg) => page.evaluate(fn, arg)
const info = () => S(() => window.__sessiz.squadInfo())
const safe = () => S(() => window.__sessiz.setVitals(100, 52, 0, 0))

// 1) Ev üssü, seviye 3: yancılar + ana karakterler doğar; K ile ekip toplanır.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.giveEnergy(2000))
if (!(await S(() => window.__sessiz.colonyPop(window.__sessiz.snap().homeColony?.id ?? '')))) {
  await S(() => window.__sessiz.foundBase())
}
await S(() => window.__sessiz.setLevel(3))
await S(() => window.__sessiz.stepGround(60 * 8))
await S(() => window.__sessiz.toCore())
await S(() => window.__sessiz.stepGround(2))
let i0 = await info()
if (!i0.ready) errors.push('squad-ready class missing near own core')
const before = i0.colony?.units ?? 0
await S(() => window.__sessiz.squadAction())
let i1 = await info()
console.log('recruit', before, '->', i1)
if (!(i1.ground >= 2)) errors.push(`recruit took ${i1.ground}`)
if (!(i1.heroes >= 1)) errors.push('no hero in squad at level 3')
if (i1.ground > 8) errors.push('squad over cap')
if (!(i1.colony.units >= 1)) errors.push('colony emptied by recruit')
await S(() => window.__sessiz.stepGround(60 * 3))
const i1b = await info()
if (i1b.colony.units > i1.colony.units + 1) errors.push(`colony refilled instantly ${i1.colony.units} -> ${i1b.colony.units}`)
if (!i1b.chip.includes(String(i1.ground))) errors.push(`chip ${i1b.chip}`)

// 2) Gemiye bin: ekip taşınır, eşlik gemileri yanında uçar.
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.stepGround(60 * 4))
await S(() => window.__sessiz.toShip())
if (!(await S(() => window.__sessiz.board()))) errors.push('board failed')
const i2 = await info()
console.log('aboard', i2)
if (i2.ship !== i1.ground) errors.push(`ship carries ${i2.ship} of ${i1.ground}`)
if (!(i2.escorts >= 1)) errors.push('no escorts')
await S(() => window.__sessiz.stepWorld(120))
const i2b = await info()
if (i2b.escortGap > 40) errors.push(`escorts lag ${i2b.escortGap}`)

// 3) Yabani gezegen: ekip iner, yerlilere saldırır.
// Uzun dövüş döngüleri mantığı test eder; yazılımsal GL'de bellek şişmesin diye çizim kapalı (6. adımda açılır).
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.jump('marskol'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'marskol' && !window.__sessiz.snap().fading)
const wild = await S(() => window.__sessiz.wildPlanet())
if (!wild) errors.push('no wild planet in marskol')
else {
  await S((id) => window.__sessiz.landOnId(id), wild)
  const i3 = await info()
  console.log('landed wild', wild, i3)
  if (i3.ground !== i2.ship || i3.ship !== 0 || i3.escorts !== 0) errors.push(`disembark ${JSON.stringify(i3)}`)
  const l0 = i3.locals
  for (let k = 0; k < 40; k++) {
    await safe()
    await S(() => window.__sessiz.stepGround(60))
    if ((await info()).locals === 0) break
  }
  const i3b = await info()
  console.log('locals', l0, '->', i3b.locals, 'squad', i3b.ground)
  if (!(i3b.locals < l0)) errors.push(`squad did not fight locals ${l0} -> ${i3b.locals}`)
  // 4) Karakol kur: önce yerliler yenilmeli (v9 kuralı), sonra ekip katılır.
  await S(() => window.__sessiz.giveEnergy(500))
  if (i3b.locals > 0) {
    if (await S(() => window.__sessiz.foundBase())) errors.push('outpost allowed while natives alive')
    await S(() => window.__sessiz.killLocals())
  }
  const crew = (await info()).ground
  if (!(await S(() => window.__sessiz.foundBase()))) errors.push('foundBase failed on wild planet')
  const i4 = await info()
  console.log('founded', i4)
  if (i4.ground !== 0 || !(i4.colony && i4.colony.units >= crew)) errors.push(`squad did not join outpost ${JSON.stringify(i4)}`)
  // 5) Yeniden topla ve düşman üssüne baskın.
  await S(() => window.__sessiz.toCore())
  await S(() => window.__sessiz.stepGround(30))
  await S(() => window.__sessiz.squadAction())
  const i5 = await info()
  if (!(i5.ground >= 1)) errors.push(`re-recruit ${i5.ground}`)
  await S(() => window.__sessiz.toShip())
  await S(() => window.__sessiz.stepGround(60 * 4))
  await S(() => window.__sessiz.toShip())
  await S(() => window.__sessiz.board())
  const world = await S(() => window.__sessiz.worldColonies())
  const enemy = world.find((w) => !w.mine && w.universe === 'marskol')
  if (!enemy) errors.push('no enemy colony in marskol')
  else {
    await S((id) => {
      window.__sessiz.flyTo(id, 14)
      return window.__sessiz.landHere()
    }, enemy.id)
    const i6 = await info()
    console.log('raid landing', enemy.id, i6)
    if (i6.ground !== i5.ground) errors.push(`raid disembark ${i6.ground}/${i5.ground}`)
    // v9: düşman üssü tüm savunmacılarıyla hazır; ekip saldırınca kuşatma başlar, savunma düşünce üs teslim olur.
    if (!(i6.colony && i6.colony.units >= 2)) errors.push(`enemy base not manned at landing: ${JSON.stringify(i6.colony)}`)
    for (let k = 0; k < 6; k++) {
      await safe()
      await S(() => window.__sessiz.stepGround(30))
      if ((await info()).colony?.besieged) break
    }
    const i6b = await info()
    console.log('siege', i6b.colony)
    if (!i6b.colony?.besieged && i6b.ground > 0) errors.push('squad attack did not start a siege')
    await S(() => window.__sessiz.weakenDefenders())
    for (let k = 0; k < 40; k++) {
      await safe()
      await S(() => window.__sessiz.weakenDefenders())
      await S(() => window.__sessiz.stepGround(30))
      const now = await info()
      if (!now.ground || now.colony?.mine) break
    }
    const i7 = await info()
    console.log('captured', i7)
    if (i6b.ground > 0 && !i7.colony?.mine) errors.push(`raid did not capture ${JSON.stringify(i7.colony)}`)
    if (i7.colony?.mine && i7.ground !== 0) errors.push('squad not settled after capture')
    if (i7.colony?.mine && !(i7.colony.units >= 1)) errors.push('captured colony has no settlers')
  }
}

// 6) Telefon: Ekip düğmesi yalnız üssün yanında.
await S(() => window.__sessiz.skipRender(false))
await page.setViewportSize({ width: 390, height: 844 })
await S(() => document.body.classList.add('force-touch'))
await S(() => window.__sessiz.toCore())
await S(() => window.__sessiz.stepGround(2))
await page.waitForTimeout(400)
const vis = await S(() => getComputedStyle(document.querySelector('[data-act="squad"]')).display !== 'none')
if (!vis) errors.push('squad touch button hidden near own core')
await S(() => window.__sessiz.toCore(60))
await S(() => window.__sessiz.stepGround(2))
await page.waitForTimeout(400)
const vis2 = await S(() => getComputedStyle(document.querySelector('[data-act="squad"]')).display !== 'none')
if (vis2) errors.push('squad touch button visible away from core')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v12 ok')
