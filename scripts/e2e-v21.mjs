import { chromium } from 'playwright'

// v21: evden başlangıç, Garibanlar ve Tombişler, tarama raporu (10 sn görünürlük), geri vites sınırı,
// F kilidi, kara delik birleşmesi, komuta şeridi, ekip sayısı seçimi, asker eğitimi, ırkların gemi kaldırması,
// yabancı filo ırkın kendi gemisi, karanlık orman sahnesi.
const errors = []
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sessiz)
const S = (fn, arg) => page.evaluate(fn, arg)
const shot = async (name) => {
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png` })
}
await S(() => window.__sessiz.skipIntro())

// 0) Seçim ekranında Tombiş ve Gariban görünümü kurulur (ekran görüntüsü için).
await page.waitForTimeout(300)
await S(() => document.getElementById('btn-start')?.click())
await page.waitForTimeout(300)
await S(() => window.__sessiz.pick('kepler452'))
await page.waitForTimeout(400)
await shot('look-gold')
for (const w of ['cherub', 'gariban']) {
  await S((w) => window.__sessiz.selLook(w), w)
  await page.waitForTimeout(400)
  await shot(`look-${w}`)
}
await S(() => window.__sessiz.selLook(null))

// 1) Evden başlangıç: yaya, Dünya'da, ilk görev 'walk'.
await S(() => {
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await S(() => window.__sessiz.tutorial(true, false))
const st = await S(() => ({ layer: window.__sessiz.snap().layer, q: window.__sessiz.questInfo().id }))
console.log('start', st)
if (st.layer !== 'foot') errors.push(`did not start on foot (${st.layer})`)
if (st.q !== 'walk') errors.push(`first quest ${st.q}`)
await shot('start-home')

// 2) Ekip: en çok 12 (gemi 4 + eşlik gemileri); sen seçersin.
const c0 = await S(() => window.__sessiz.crew())
const c1 = await S(() => window.__sessiz.crew(3))
console.log('crew', c0, c1)
if (c0.cap !== 12) errors.push(`crew cap ${c0.cap}`)
if (c1.want !== 3) errors.push('squad want not set')
await S(() => window.__sessiz.ordersOpen(true))
const want = await S(() => document.querySelector('.squad-want')?.textContent ?? '')
if (!want.includes('3 kişi')) errors.push(`squad chooser missing (${want})`)
await S(() => window.__sessiz.ordersOpen(false))
await S(() => window.__sessiz.crew(null))

// 3) Asker eğitimi: nüfus tavanında durur, kuyruk görünür.
await S(() => window.__sessiz.giveEnergy(5000))
await S(() => window.__sessiz.setRes(5000, 500, 100))
await S(() => window.__sessiz.setLevel(2))
const home = await S(() => window.__sessiz.homeId())
let trained = 0
for (let i = 0; i < 40; i++) if (await S((h) => window.__sessiz.train(h), home)) trained++
const ti = await S((h) => window.__sessiz.trainInfo(h), home)
const cap = (await S(() => window.__sessiz.capOf())).find((c) => c && c.id === home)
console.log('train', trained, ti, cap)
if (!(trained >= 1) && !(cap && ti && Math.floor(ti.pop) >= cap.cap)) errors.push(`could not train any soldier though population has room ${JSON.stringify(ti)}`)
if (cap && ti && Math.floor(ti.pop) + ti.q > cap.cap) errors.push(`training exceeded population cap ${ti.pop}+${ti.q} > ${cap.cap}`)

// 3b) Komuta şeridi: yayayken ekip toplayınca (K) 5/6/7 emirleri ekranda.
await S(() => window.__sessiz.toCore())
await S(() => window.__sessiz.squadAction())
await S(() => window.__sessiz.stepGround(3))
await S(() => window.__sessiz.skipRender(false))
await page.waitForTimeout(300)
const csFoot = await S(() => window.__sessiz.cmdStrip())
console.log('cmd strip foot', csFoot, await S(() => window.__sessiz.squadInfo().ground))
if ((await S(() => window.__sessiz.squadInfo().ground)) > 0 && (!csFoot.shown || csFoot.buttons < 3)) errors.push(`foot command strip ${JSON.stringify(csFoot)}`)
await shot('cmdstrip-foot')

// 4a) Biniş: üssünde asker varken L, kimlerin bineceğini/kalacağını soran paneli açar.
await S(() => window.__sessiz.toShip())
await page.keyboard.press('KeyL')
await page.waitForTimeout(300)
const bp = await S(() => ({ open: !document.getElementById('boarding').classList.contains('hidden'), landed: document.getElementById('board-landed').textContent, cap: document.getElementById('board-cap').textContent, left: document.getElementById('board-left').textContent, rows: document.querySelectorAll('#board-list label').length }))
console.log('boarding', JSON.stringify(bp))
if (!bp.open) errors.push('boarding panel did not open on L at own base')
else {
  if (!bp.landed.includes('ekipte')) errors.push(`boarding panel missing garrison info (${bp.landed})`)
  if (!bp.cap.includes('gemin 4')) errors.push(`boarding panel missing capacity info (${bp.cap})`)
  if (!(bp.rows >= 1)) errors.push('no soldiers listed for boarding')
}
await S(() => document.getElementById('board-x').click())

// 4) Gemi: tarama raporu ve 10 sn görünürlük.
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.setVis(0))
await page.keyboard.press('KeyT')
await S(() => window.__sessiz.stepWorld(10))
const sr = await S(() => window.__sessiz.scanReport())
console.log('scan', sr.text.slice(0, 160), sr.exposed.toFixed(1), Math.round(sr.vis))
if (!sr.shown) errors.push('scan report not shown')
if (!(sr.exposed > 8)) errors.push(`not exposed after scan (${sr.exposed})`)
if (!(sr.vis >= 55)) errors.push(`scan did not light up the ship (${sr.vis})`)
await S(() => window.__sessiz.skipRender(false))
await page.waitForTimeout(200)
await shot('scan')
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.stepWorld(60 * 11))
const sr2 = await S(() => window.__sessiz.scanReport())
if (sr2.shown || sr2.exposed > 0) errors.push(`scan exposure did not end ${JSON.stringify({ shown: sr2.shown, e: sr2.exposed })}`)

// 5) Geri vites: ileri hızın en çok %30'u; Shift geri giderken hızlandırmaz.
for (let i = 0; i < 10 && (await S(() => window.__sessiz.cineOn())); i++) {
  await S(() => window.__sessiz.cineSkip())
  await S(() => window.__sessiz.stepWorld(2))
}
console.log('before reverse', JSON.stringify(await S(() => ({ layer: window.__sessiz.snap().layer, brief: window.__sessiz.briefingOn(), cine: window.__sessiz.cineOn() }))))
// Açık uzayda dene (gezegenin içine geri geri gidilmesin).
await S(() => {
  const s = window.__sessiz
  const p = s.planetPos('dunya')
  s.place(p.x, p.y + p.r + 700, p.z)
  s.hold(false)
})
const cruise = await S(() => window.__sessiz.cruise())
await page.keyboard.down('KeyS')
await S(() => window.__sessiz.stepWorld(60 * 4))
const back1 = await S(() => window.__sessiz.speedNow())
await page.keyboard.down('ShiftLeft')
await S(() => window.__sessiz.stepWorld(60 * 3))
const back2 = await S(() => window.__sessiz.speedNow())
await page.keyboard.up('ShiftLeft')
await page.keyboard.up('KeyS')
console.log('reverse', cruise, back1, back2)
if (!(back1.fwd < -1)) errors.push(`reverse did not move backwards ${back1.fwd}`)
if (-back1.fwd > cruise * 0.33) errors.push(`reverse too fast ${back1.fwd} (cap ${cruise})`)
if (-back2.fwd > cruise * 0.33) errors.push(`shift boosted reverse ${back2.fwd}`)
await S(() => window.__sessiz.stepWorld(60 * 3))

// 6) Çatışma: F kilidi, kara delik birleşmesi, komuta şeridi.
await S(() => window.__sessiz.engage())
await S(() => window.__sessiz.stepWorld(5))
const lk = await S(() => window.__sessiz.lockToggle())
if (!lk.lock) errors.push(`lock-on failed ${JSON.stringify(lk)}`)
const lk2 = await S(() => window.__sessiz.lockToggle())
if (lk2.lock) errors.push('second F did not release lock')
const wm = await S(() => window.__sessiz.wellMerge())
console.log('well merge', wm)
if (!wm || !(wm.after > wm.before)) errors.push(`black hole did not grow ${JSON.stringify(wm)}`)
await S(() => window.__sessiz.skipRender(false))
await page.waitForTimeout(250)
const cs = await S(() => window.__sessiz.cmdStrip())
const esc = await S(() => window.__sessiz.squadInfo().escorts)
console.log('cmd strip', cs, 'escorts', esc)
if (esc > 0 && (!cs.shown || cs.buttons < 3)) errors.push(`command strip ${JSON.stringify(cs)}`)
if (esc === 0 && cs.shown) errors.push('command strip shown without escorts')
await shot('combat')
await S(() => window.__sessiz.wipe())
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.stepWorld(60 * 3))

// 7) Yabancı sistem: koloniler gemi kaldırır; filolar o ırkın.
await S(() => window.__sessiz.questGo('free'))
await S(() => window.__sessiz.jump('alpha'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'alpha' && !window.__sessiz.snap().fading, null, { timeout: 60000 })
const ln = await S(() => window.__sessiz.launchNow())
console.log('launch', ln)
if (!(ln.added >= 1)) errors.push(`no fleet launched from a colony ${JSON.stringify(ln)}`)
if (ln.factions.includes('') && ln.factions.every((f) => f === '')) errors.push('launched fleets have no race')

// 7b) Düşen mürettebat: gezegene yakın vurulan geminin içindekiler yüzeye yarı canla düşer; uzayda ölür.
await S(() => window.__sessiz.jump('gunes'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'gunes' && !window.__sessiz.snap().fading, null, { timeout: 60000 })
const far = await S(() => window.__sessiz.fallTest('venus', 900))
if (far && far.live) errors.push(`crew survived a blast in deep space ${JSON.stringify(far)}`)
const near = await S(() => window.__sessiz.fallTest('venus', 20))
console.log('fall', far, near)
if (!near || !(near.live > 0)) errors.push(`no crew fell to the planet ${JSON.stringify(near)}`)
await S(() => window.__sessiz.landOnId('venus'))
await S(() => window.__sessiz.stepGround(5))
const inv = await S(() => window.__sessiz.invaders())
console.log('fallen on ground', inv.length)
if (near?.live && !inv.some((u) => u.faction === 'mars' && u.hull <= u.max * 0.55)) errors.push(`fallen crew not on the ground (half health) ${JSON.stringify(inv.slice(0, 3))}`)
await S(() => window.__sessiz.board())

// 8) Karanlık orman: sinema, büyük başlık.
await S(() => window.__sessiz.jump('gunes'))
await page.waitForFunction(() => window.__sessiz.snap().universe === 'gunes' && !window.__sessiz.snap().fading, null, { timeout: 60000 })
await S(() => window.__sessiz.skipRender(false))
await S(() => window.__sessiz.darkForestNow())
await page.waitForTimeout(700)
const df = await S(() => window.__sessiz.dfInfo())
console.log('df', df)
if (!df.on || !df.cine) errors.push(`dark forest cine ${JSON.stringify(df)}`)
if (!df.title.includes('KARANLIK ORMAN')) errors.push(`dark forest title ${df.title}`)
await shot('darkforest')
for (let i = 0; i < 8 && (await S(() => window.__sessiz.cineOn())); i++) {
  await S(() => window.__sessiz.cineSkip())
  await page.waitForTimeout(250)
}
if (await S(() => window.__sessiz.cineOn())) errors.push('dark forest cine did not end')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v21 ok')
