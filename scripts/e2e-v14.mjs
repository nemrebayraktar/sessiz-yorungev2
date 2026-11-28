import { chromium } from 'playwright'

// v14 (v10 sürümü): yeni öğretici zincir (kaynak → sessiz → tarama → keşif gemisi), gemi parçaları (iki seçenek + efsane),
// ırk yetenekleri, dizilim emirleri (taret önü/arkası), gezegene göre nüfus, karşılaşma diyaloğu ve sömürge,
// fotoğraf modu, solucan deliği görünümü, PWA bağlantıları.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const S = (fn, arg) => page.evaluate(fn, arg)
await S(() => window.__sessiz.skipIntro())
await S(() => {
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.evaluate(() => window.__sessiz.tutorial(true, false))

// 0) PWA bağlantıları sayfada.
const pwa = await S(() => ({ manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'), apple: Boolean(document.querySelector('link[rel="apple-touch-icon"]')) }))
if (pwa.manifest !== './manifest.webmanifest' || !pwa.apple) errors.push(`pwa links ${JSON.stringify(pwa)}`)
const man = await S(() => fetch('./manifest.webmanifest').then((r) => r.json()).catch(() => null))
if (!man || man.icons?.length < 2) errors.push('manifest missing/invalid')

// 1) Öğretici zincir sırası (evden başlar: yürü, kaz, savun, ekip; sonra Ay ve kendi sistemin).
const ids = await S(() => window.__sessiz.questIds())
const want = ['walk', 'mine', 'fortify', 'squad', 'fly', 'land', 'clear', 'outpost', 'silent', 'scan', 'orbit', 'outpost2', 'order', 'wave', 'airdef', 'upgrade', 'gate', 'meet', 'aa', 'capture', 'avlu', 'free']
if (ids.join() !== want.join()) errors.push(`quest chain ${ids.join()}`)

// 2) Kaynak toplama: Ay'da yatağa yürü ve kaz → 'mine' görevi biter, 'fortify' gelir.
await S(() => window.__sessiz.landOnId('ay'))
await S(() => window.__sessiz.questGo('mine'))
const dep = await S(() => window.__sessiz.toDeposit())
console.log('deposit', dep)
if (!dep?.near) errors.push(`not near deposit ${JSON.stringify(dep)}`)
const m1 = await S(() => window.__sessiz.mineHit())
if (!m1?.ok || m1.ore + m1.crystal < 1) errors.push(`mining failed ${JSON.stringify(m1)}`)
await S(() => window.__sessiz.stepWorld(30))
let q = await S(() => window.__sessiz.questInfo())
if (q.id !== 'fortify') errors.push(`mine quest did not advance (${q.id})`)

// 3) Sessiz süzülme: bin, V, 3+ sn → 'scan'; T → 'orbit'.
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
if ((await S(() => window.__sessiz.snap().layer)) !== 'ship') errors.push('board failed')
await S(() => window.__sessiz.questGo('silent'))
await page.keyboard.press('KeyV')
await S(() => window.__sessiz.stepWorld(60 * 4))
q = await S(() => window.__sessiz.questInfo())
if (q.id !== 'scan') errors.push(`silent quest did not advance (${q.id})`)
await page.keyboard.press('KeyT')
await S(() => window.__sessiz.stepWorld(30))
q = await S(() => window.__sessiz.questInfo())
if (q.id !== 'orbit') errors.push(`scan quest did not advance (${q.id})`)
const scanPanel = await S(() => !document.getElementById('scan-panel')?.classList.contains('hidden'))
if (!scanPanel) errors.push('scan report not shown')

// 4) Yörüngeyi temizle: ikinci gezegenin çevresinde Gariban hurda gemileri; yaklaşınca savaş, düşünce görev biter.
let gi = await S(() => window.__sessiz.garibanInfo())
for (let k = 0; k < 4 && !gi.fleets.length; k++) {
  await S(() => window.__sessiz.stepWorld(60))
  gi = await S(() => window.__sessiz.garibanInfo())
}
console.log('gariban', JSON.stringify(gi))
if (!gi.planet2) errors.push('no second planet picked')
if (gi.fleets.length !== 1) errors.push(`gariban fleets ${gi.fleets.length}`)
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.flyToGariban(30))
await S(() => window.__sessiz.stepWorld(5))
const fight = await S(() => window.__sessiz.snap())
if (!(fight.alive > 0)) errors.push(`gariban combat did not start (alive ${fight.alive})`)
await S(() => window.__sessiz.wipe())
for (let k = 0; k < 20; k++) {
  await S(() => window.__sessiz.stepWorld(30))
  if ((await S(() => window.__sessiz.questInfo())).id !== 'orbit') break
}
q = await S(() => window.__sessiz.questInfo())
if (q.id !== 'outpost2') errors.push(`orbit quest did not complete (${q.id})`)

// 5) Gemi parçaları: iki seçenek, kaynak ister, efsane parça 5. kademede ve gemide görünür ek.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.setRes(0, 0, 0))
if (await S(() => window.__sessiz.buyPart('hull', 0))) errors.push('part bought without resources')
await S(() => window.__sessiz.setRes(5000, 500, 100))
const p0 = await S(() => window.__sessiz.partsInfo())
await S(() => window.__sessiz.buyPart('hull', 0))
const pA = await S(() => window.__sessiz.partsInfo())
await S(() => window.__sessiz.buyPart('engine', 1))
const pB = await S(() => window.__sessiz.partsInfo())
console.log('parts', p0.hullMax, pA.hullMax, pA.parts, pB.engineMul.toFixed(3), pB.stealthMul.toFixed(3))
if (!(pA.hullMax > p0.hullMax)) errors.push('armor plate did not raise hull')
if (pA.ore >= 500) errors.push('ore not spent')
if (!(pB.engineMul > pA.engineMul && pB.stealthMul < pA.stealthMul)) errors.push('whisper thruster mods wrong')
for (let k = 0; k < 3; k++) await S((k) => window.__sessiz.buyPart('weapon', k % 2), k)
const pC = await S(() => window.__sessiz.partsInfo())
if (pC.up.weapon !== 4) errors.push(`weapon tier ${pC.up.weapon}`)
if (!pC.fx) errors.push('no visual parts at tier 3+')
await S(() => window.__sessiz.buyPart('weapon', 0))
const pD = await S(() => window.__sessiz.partsInfo())
if (!pD.parts.some((p) => p.startsWith('legend-earth-weapon'))) errors.push(`legend not fitted ${pD.parts}`)
if (!(pD.weaponMul > pC.weaponMul * 1.2)) errors.push('legend weak')
await S(() => window.__sessiz.openUpgradesNow())
const upUi = await S(() => ({ tabs: document.querySelectorAll('.up-tab').length, cards: document.querySelectorAll('.up-card').length }))
if (upUi.tabs !== 5 || upUi.cards < 1) errors.push(`upgrade UI ${JSON.stringify(upUi)}`)
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/parts.png` : '/dev/null' }).catch(() => {})
await S(() => {
  window.__sessiz.stepMap(0)
})
await page.keyboard.press('Escape')

// 6) Dizilim: taret kur, taret arkası/önü emirleri hedefleri değiştirir.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.giveEnergy(3000))
await S(() => window.__sessiz.setLevel(3))
await S(() => window.__sessiz.toCore(9))
await S(() => window.__sessiz.placeTurret())
await S(() => window.__sessiz.toCore(10))
await S(() => window.__sessiz.placeTurret())
await S(() => window.__sessiz.stepGround(60 * 4))
await S(() => window.__sessiz.colonyOrder('arka'))
await S(() => window.__sessiz.stepGround(60 * 3))
const back = await S(() => window.__sessiz.orderSpots())
await S(() => window.__sessiz.colonyOrder('on'))
await S(() => window.__sessiz.stepGround(60 * 3))
const front = await S(() => window.__sessiz.orderSpots())
const avg = (a) => a.reduce((s, x) => s + x.g, 0) / Math.max(1, a.length)
console.log('formation goals back/front', avg(back).toFixed(1), avg(front).toFixed(1), back.length)
if (!back.length) errors.push('no settlers for formation')
else if (!(avg(front) > avg(back) + 3)) errors.push(`front ${avg(front)} not beyond back ${avg(back)}`)
await S(() => window.__sessiz.ordersOpen(true))
if (!(await S(() => window.__sessiz.ordersHtml()))) errors.push('orders panel empty')
await S(() => window.__sessiz.ordersOpen(false))

// 7) Irk yeteneği: kullanılır, bekleme süresi başlar; dalgada hasar verir.
await S(() => window.__sessiz.skillReset())
const sk = await S(() => window.__sessiz.useSkill())
if (!(sk.cd > 10)) errors.push(`skill cooldown ${sk.cd}`)
const sk2 = await S(() => window.__sessiz.useSkill())
if (sk2.cd < sk.cd - 1) errors.push('skill reused during cooldown')

// 8) Nüfus gezegene göre: Dünya (yeşil, büyük) tavanı tabandan yüksek.
const caps = await S(() => window.__sessiz.capOf())
const home = caps.find((c) => c && c.id === 'dunya')
console.log('cap', home)
if (!home || !(home.cap > home.base)) errors.push(`earth cap not boosted ${JSON.stringify(home)}`)

// 9) Karşılaşma (diplomasi karanlık ormandan sonra açılır: kapı adımına geç):
await S(() => window.__sessiz.questGo('meet'))
// 9) barış teklifi kabul edilirse filo ayrılır; ilişki artar. Sömürge seçeneği.
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('dunya', 80))
if (!(await S(() => window.__sessiz.encounterNow('kepler186')))) errors.push('encounter did not open')
if (!(await S(() => !document.getElementById('encounter').classList.contains('hidden')))) errors.push('encounter panel hidden')
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/encounter.png` : '/dev/null' }).catch(() => {})
const r0 = await S(() => window.__sessiz.relOf('kepler186'))
await S(() => {
  const rnd = Math.random
  Math.random = () => 0
  window.__sessiz.encounterPick('peace')
  Math.random = rnd
})
const r1 = await S(() => window.__sessiz.relOf('kepler186'))
console.log('rel', r0.rel, '->', r1.rel, r1.stance)
if (!(r1.rel > r0.rel) || !r1.known) errors.push('peace did not raise relation')
await S(() => document.getElementById('enc-continue')?.click())
const cards = await S(() => window.__sessiz.diploOpen())
if (cards !== 8) errors.push(`diplo cards ${cards}`)
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/diplo.png` : '/dev/null' }).catch(() => {})
const v = await S(() => window.__sessiz.vassalTry('mars', 6))
console.log('vassal', v)
if (!v.found || !v.vassal || v.stance !== 'sömürge') errors.push(`vassal ${JSON.stringify(v)}`)
const e0 = (await S(() => window.__sessiz.partsInfo())).energy
await S(() => window.__sessiz.diploTick(61))
const e1 = (await S(() => window.__sessiz.partsInfo())).energy
if (!(e1 > e0)) errors.push('vassal tribute missing')
await S(() => document.getElementById('diplo-x').click())

// 10) Fotoğraf modu: arayüz gizlenir, kapanınca geri gelir.
await S(() => window.__sessiz.skipRender(false))
const ph = await S(() => window.__sessiz.photo(true))
if (!ph.photo || !ph.body) errors.push('photo mode did not open')
const hudHidden = await S(() => getComputedStyle(document.getElementById('hud')).display === 'none')
if (!hudHidden) errors.push('HUD visible in photo mode')
const ph2 = await S(() => window.__sessiz.photo(false))
if (ph2.photo || ph2.body) errors.push('photo mode did not close')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v14 ok')
