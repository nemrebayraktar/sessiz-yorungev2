import { chromium } from 'playwright'
import fs from 'node:fs'

// Aşama 6: ev sisteminden başlangıç, yerinde uzay savaşı, ganimetle büyüyen karakol,
// canlı düşman karakolları ve bot genişlemesi. Dev sunucu ayaktayken çalıştırın.
const shots = process.env.SHOTS_DIR || ''
if (shots) fs.mkdirSync(shots, { recursive: true })
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})

async function boot(width, height, origin, touch = false) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
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
await page.evaluate(() => { window.__sessiz.tutorial(false, false); window.__sessiz.noTalk(true) })
  return page
}

async function restart(page, origin) {
  await page.evaluate((id) => {
    window.__sessiz.pick(id)
    window.__sessiz.confirm()
  }, origin)
  await page.waitForFunction((id) => window.__sessiz.snap().origin === id && window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading, origin)
}

// 1) Her köken kendi ev sisteminde, ev gezegeninin yanında, kendi karakoluyla başlar; diğer bütün türler de kendi ev sistemlerinde karakollarıyla vardır.
const page = await boot(1280, 800, 'earth')
const origins = await page.evaluate(() => window.__sessiz.origins())
const homes = await page.evaluate((list) => Object.fromEntries(list.map((id) => [id, window.__sessiz.homeOf(id)])), origins)
if (new Set(Object.values(homes)).size !== origins.length) errors.push(`home systems not unique ${JSON.stringify(homes)}`)
for (const id of origins) {
  await restart(page, id)
  const s = await page.evaluate(() => window.__sessiz.snap())
  const world = await page.evaluate(() => window.__sessiz.worldColonies())
  const tag = `[${id}]`
  if (s.universe !== homes[id]) errors.push(`${tag} started in ${s.universe}, home ${homes[id]}`)
  if (!s.homeColony || s.homeColony.universe !== homes[id] || s.homeColony.kind !== 'main' || s.homeColony.level !== 1) errors.push(`${tag} start outpost ${JSON.stringify(s.homeColony)}`)
  if (s.homeColony && s.homeColony.id !== s.startPlanet) errors.push(`${tag} outpost not on home planet ${s.homeColony.id} vs ${s.startPlanet}`)
  if (!(s.distHome > 0 && s.distHome < 80)) errors.push(`${tag} not near home planet (${s.distHome})`)
  for (const other of origins) {
    if (other === id) continue
    const c = world.find((w) => w.owner === other && w.universe === homes[other] && w.home)
    if (!c) errors.push(`${tag} ${other} has no starting outpost in ${homes[other]}`)
  }
  const foreignAtHome = world.filter((w) => w.universe === homes[id] && !w.mine)
  if (foreignAtHome.length) errors.push(`${tag} foreign outposts in player home: ${JSON.stringify(foreignAtHome)}`)
  // v13: ev sistemi sakin başlar (eğitim devriyesi yok).
  if (s.smallFleets !== 0) errors.push(`${tag} home ships at start ${s.smallFleets}/${s.fleetCount}`)
  if (s.mode !== 'map') errors.push(`${tag} mode ${s.mode}`)
}
console.log('starts ok for', origins.length, 'origins')

// 2) Yerinde savaş: küçük gemiyle temas sahneyi/modu/evreni değiştirmez; düşünce ganimet düşer, toplanınca enerji ve karakol deposu artar.
await restart(page, 'earth')
if (shots) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${shots}/1-baslangic-ev-gezegeni-ve-karakol.png` })
}
await page.evaluate(() => window.__sessiz.spawnTrainers(3))
const before = await page.evaluate(() => window.__sessiz.snap())
const small = await page.evaluate(() => window.__sessiz.engageNearest())
await page.waitForTimeout(150)
let s = await page.evaluate(() => window.__sessiz.snap())
if (!small) errors.push('nearest home ship was not a small trainer')
if (s.mode !== 'map' || !s.skirmish) errors.push(`fight not in place: mode ${s.mode} skirmish ${s.skirmish}`)
if (s.universe !== before.universe) errors.push('fight changed universe')
const moved = Math.hypot(s.pos[0] - before.pos[0], s.pos[1] - before.pos[1], s.pos[2] - before.pos[2])
if (moved > 8) errors.push(`fight teleported player ${moved}`)
if (s.smallEnemies !== 1 || s.enemiesAlive !== 1) errors.push(`trainer fight should be 1 small ship, got ${s.smallEnemies}/${s.enemiesAlive}`)
if (s.enemyHulls[0] > 30) errors.push(`trainer ship too strong ${s.enemyHulls[0]}`)
await page.evaluate(() => window.__sessiz.wipe())
s = await page.evaluate(() => window.__sessiz.snap())
if (s.mode !== 'map' || s.skirmish) errors.push(`after win: mode ${s.mode} skirmish ${s.skirmish}`)
if (s.loot < 1) errors.push('no loot dropped')
const energy0 = s.energy
const store0 = s.homeColony.store
await page.evaluate(() => window.__sessiz.gotoLoot())
const mode1 = await page.evaluate(() => window.__sessiz.stepMap(90))
s = await page.evaluate(() => window.__sessiz.snap())
if (mode1 !== 'map') errors.push(`loot pickup changed mode ${mode1}`)
if (s.loot !== 0) errors.push(`loot not collected (${s.loot} left)`)
if (!(s.energy > energy0)) errors.push(`loot gave no energy ${energy0} -> ${s.energy}`)
if (!(s.homeColony.store > store0)) errors.push(`loot did not feed outpost store ${store0} -> ${s.homeColony.store}`)
const toast = await page.locator('#toast').innerText()
if (!toast.includes('Ganimet')) errors.push(`no loot toast: ${toast}`)
console.log('loot', energy0, '->', s.energy, 'store', store0, '->', s.homeColony.store, toast)

// Normal filoyla yerinde savaş ekran görüntüsü + ganimet.
await page.evaluate(() => window.__sessiz.engage())
s = await page.evaluate(() => window.__sessiz.snap())
if (s.mode !== 'map' || s.enemiesAlive < 3) errors.push(`normal fight ${s.mode} ${s.enemiesAlive}`)
if (shots) {
  await page.evaluate(() => {
    window.__sessiz.arrange()
    window.__sessiz.setCam('chase')
  })
  await page.evaluate(() => window.__sessiz.volley())
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${shots}/2-yerinde-uzay-savasi.png` })
  await page.evaluate(() => {
    window.__sessiz.hold(false)
    window.__sessiz.wipe()
  })
  await page.evaluate(() => {
    window.__sessiz.hold(true)
    window.__sessiz.setCam('chase')
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${shots}/3-ganimet-parcalari.png` })
  await page.evaluate(() => window.__sessiz.hold(false))
} else await page.evaluate(() => window.__sessiz.wipe())

// 3) Ganimet karakolu büyütür, nüfus tavanı seviyeyle artar.
const lv0 = await page.evaluate(() => window.__sessiz.snap().homeColony)
const cap0 = await page.evaluate((id) => window.__sessiz.colonyPop(id).cap, lv0.id)
await page.evaluate(() => window.__sessiz.collectLoot(260))
const lv1 = await page.evaluate(() => window.__sessiz.snap().homeColony)
const cap1 = await page.evaluate((id) => window.__sessiz.colonyPop(id).cap, lv1.id)
console.log('outpost', lv0.level, '->', lv1.level, 'cap', cap0, '->', cap1)
if (!(lv1.level > lv0.level)) errors.push(`loot did not level outpost ${lv0.level} -> ${lv1.level}`)
if (!(cap1 > cap0)) errors.push(`settler cap did not grow ${cap0} -> ${cap1}`)

// 4) Düşman karakolları: canı ve zırhı seviyeyle artar; yıkılınca gezegende yeni doğum yok, oyuncu kurabilir.
await page.evaluate(() => window.__sessiz.jump('marskol'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'marskol' && !window.__sessiz.snap().fading)
let world = await page.evaluate(() => window.__sessiz.worldColonies())
const marsHome = world.find((w) => w.owner === 'mars' && w.universe === 'marskol' && w.home)
if (!marsHome) errors.push('mars home outpost missing')
else {
  const lvl = marsHome.level
  if (marsHome.hullMax !== 220 + 120 * lvl) errors.push(`outpost hull ${marsHome.hullMax} for level ${lvl}`)
  await page.evaluate((id) => window.__sessiz.flyTo(id, 26), marsHome.id)
  await page.evaluate(() => window.__sessiz.stepMap(2))
  const vit0 = await page.evaluate(() => window.__sessiz.snap())
  await page.evaluate(() => window.__sessiz.stepMap(360))
  const vit1 = await page.evaluate(() => window.__sessiz.snap())
  if (!(vit1.hull + vit1.shield < vit0.hull + vit0.shield)) errors.push(`outpost guns did not fire ${vit0.hull + vit0.shield} -> ${vit1.hull + vit1.shield}`)
  await page.evaluate(() => window.__sessiz.setVitals(100, 52, 0, 0))
  await page.evaluate((id) => window.__sessiz.flyTo(id, 26), marsHome.id)
  if (shots) {
    await page.evaluate(() => window.__sessiz.shootOutpost(window.__sessiz.worldColonies().find((w) => w.owner === 'mars' && w.home).id, 120))
    await page.evaluate(() => window.__sessiz.hold(true))
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${shots}/4-dusman-karakolu-can-cubugu.png` })
    await page.evaluate(() => window.__sessiz.hold(false))
  }
  const hullPre = await page.evaluate((id) => window.__sessiz.worldColonies().find((w) => w.id === id)?.hull ?? 0, marsHome.id)
  const hit = await page.evaluate((id) => window.__sessiz.shootOutpost(id, 100), marsHome.id)
  console.log('outpost hit', hit)
  if (!hit || !hit.alive) errors.push('outpost hit failed')
  // Seviye arttıkça zırh artar: gelen hasar coreArmor(level) ile azalır.
  const armorLow = 100 * (1 / (1 + 0.18 * (lvl - 1)))
  if (hit && hit.alive && Math.abs(hullPre - hit.hull - armorLow) > 1) errors.push(`armor math ${JSON.stringify(hit)} expected ${armorLow}`)
  if (lvl > 1 && !(armorLow < 100)) errors.push('no armor on leveled outpost')
  let alive = true
  for (let i = 0; i < 40 && alive; i++) alive = (await page.evaluate((id) => window.__sessiz.shootOutpost(id, 60), marsHome.id))?.alive ?? false
  world = await page.evaluate(() => window.__sessiz.worldColonies())
  if (world.some((w) => w.id === marsHome.id)) errors.push('mars outpost not destroyed')
  if (!(await page.evaluate((id) => window.__sessiz.razedLocked(id), marsHome.id))) errors.push('razed planet not locked')
  const ticks = await page.evaluate(() => {
    window.__sessiz.addTime(60)
    return window.__sessiz.botTick(60)
  })
  world = await page.evaluate(() => window.__sessiz.worldColonies())
  if (world.some((w) => w.id === marsHome.id)) errors.push('bots respawned on razed planet during lock')
  const landed = await page.evaluate((id) => window.__sessiz.landOnId(id), marsHome.id)
  if (!landed) errors.push('could not land on razed planet')
  await page.evaluate(() => window.__sessiz.stepGround(30))
  const locals = await page.evaluate(() => window.__sessiz.locals())
  if (locals !== 0) errors.push(`natives respawned on razed planet (${locals})`)
  await page.evaluate(() => window.__sessiz.giveEnergy(500))
  if (!(await page.evaluate(() => window.__sessiz.foundBase()))) errors.push('player could not found outpost on razed planet')
  console.log('razed ok, bot colonies after ticks', ticks)
}
const hulls = await page.evaluate(() => {
  const list = window.__sessiz.worldColonies().filter((w) => !w.mine)
  const by = {}
  for (const w of list) by[w.level] = w.hullMax
  return by
})
const levels = Object.keys(hulls).map(Number).sort()
for (let i = 1; i < levels.length; i++) if (!(hulls[levels[i]] > hulls[levels[i - 1]])) errors.push(`hull does not grow with level ${JSON.stringify(hulls)}`)
console.log('hull by level', hulls)

// 5) Bot genişlemesi: önce kendi sistemini doldurur ve büyür, sonra solucan deliğiyle başka sistemlere geçer; oyuncunun evine ilk dakikalarda dokunmaz.
await restart(page, 'earth')
const w0 = await page.evaluate(() => window.__sessiz.worldColonies())
await page.evaluate(() => window.__sessiz.botTick(25))
const w1 = await page.evaluate(() => window.__sessiz.worldColonies())
const playerHome = homes.earth
if (w1.some((w) => w.universe === playerHome && !w.mine)) errors.push('bots entered player home during grace period')
const homeCount = (list, owner) => list.filter((w) => w.owner === owner && w.universe === homes[owner]).length
const grewHome = origins.filter((o) => o !== 'earth' && homeCount(w1, o) > homeCount(w0, o))
if (grewHome.length < 3) errors.push(`bots did not expand in their own systems (${grewHome})`)
const lvl0 = w0.filter((w) => !w.mine).reduce((n, w) => n + w.level, 0)
const lvl1 = w1.filter((w) => !w.mine).reduce((n, w) => n + w.level, 0)
if (!(lvl1 > lvl0)) errors.push(`bots did not level up ${lvl0} -> ${lvl1}`)
await page.evaluate(() => {
  window.__sessiz.addTime(400)
  window.__sessiz.botTick(80)
})
const w2 = await page.evaluate(() => window.__sessiz.worldColonies())
const abroad = w2.filter((w) => !w.mine && w.universe !== homes[w.owner])
if (abroad.length < 2) errors.push(`bots did not raid other systems (${abroad.length})`)
console.log('bots', w0.length, '->', w1.length, '->', w2.length, 'abroad', abroad.length, 'grewHome', grewHome.length)
const finalMode = await page.evaluate(() => window.__sessiz.mode)
if (finalMode === 'combat') errors.push('combat mode still used')
await page.close()

// 6) Mobil: başlangıç ekranı ve yerinde savaş.
const phone = await boot(844, 390, 'alpha', true)
await phone.evaluate(() => {
  window.__sessiz.showTouch(true)
  window.__sessiz.setMobile(true)
})
await phone.evaluate(() => {
  window.__sessiz.spawnTrainers(2)
  window.__sessiz.engageNearest()
})
await phone.waitForTimeout(700)
s = await phone.evaluate(() => window.__sessiz.snap())
if (s.mode !== 'map' || !s.skirmish) errors.push(`mobile fight ${s.mode} ${s.skirmish}`)
if (shots) await phone.screenshot({ path: `${shots}/5-mobil-yerinde-savas.png` })
await phone.close()

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v8 ok')
