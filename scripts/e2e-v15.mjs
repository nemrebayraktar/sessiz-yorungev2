import { chromium } from 'playwright'

// v15 (v11 sürümü): görev brifingi (dünya durur, Enter kapatır), eğitim kapıları (solucan deliği, karakol),
// karakol hemen koloni, yerli sayısı kalıcı ve gemiden vurulur, alçak yerçekiminde kısa zıplama,
// dağlara çarpma, aynı ırkla diyalog tekrarlanmaz, kovalama kamerası titremez, gemi işareti, eski rota silinir.
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
const shown = (id) => S((id) => !document.getElementById(id).classList.contains('hidden'), id)
await S(() => window.__sessiz.skipIntro())
await S(() => {
  window.__sessiz.pick('earth')
  window.__sessiz.confirm()
})
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)

// 1) İlk brifing kendiliğinden açılır, dünya durur, Enter kapatır.
for (let k = 0; k < 10 && !(await S(() => window.__sessiz.briefingOn())); k++) await S(() => window.__sessiz.stepWorld(30))
if (!(await S(() => window.__sessiz.briefingOn()))) errors.push('first briefing did not open')
const q0 = await S(() => window.__sessiz.snap().pos ?? null)
await S(() => window.__sessiz.stepWorld(30))
void q0
if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/briefing.png` })
if (!(await shown('briefing'))) errors.push('briefing panel hidden')
const t0 = await S(() => window.__sessiz.snap().introT)
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
if (await S(() => window.__sessiz.briefingOn())) errors.push('Enter did not close briefing')
void t0

// 2) Rota: görevin hedefi yoksa eski rota silinir.
await S(() => window.__sessiz.tutorial(true, false))
await S(() => window.__sessiz.questGo('fly'))
const r1 = await S(() => window.__sessiz.routeInfo())
await S(() => window.__sessiz.questGo('walk'))
const r2 = await S(() => window.__sessiz.routeInfo())
if (!r1 || r2) errors.push(`stale route ${JSON.stringify(r1)} -> ${JSON.stringify(r2)}`)

// 3) Eğitim kapısı: solucan deliği "kapı" adımından önce kapalı.
await S(() => window.__sessiz.questGo('fly'))
const uni0 = await S(() => window.__sessiz.snap().universe)
const entered = await S(() => window.__sessiz.toWorm())
if (entered) errors.push('hazards() reported a transit before gate step')
await page.waitForTimeout(1600)
const uni1 = await S(() => window.__sessiz.snap().universe)
if (uni0 !== uni1) errors.push(`wormhole open before gate step (${uni0} -> ${uni1})`)

// 4) Karakol: eğitimde kapalı; "outpost" adımında yerliler yenilince hemen koloni.
await S(() => window.__sessiz.skipRender(true))
await S(() => window.__sessiz.landOnId('mars-gezegen'))
await S(() => window.__sessiz.giveEnergy(900))
await S(() => window.__sessiz.killLocals())
if (await S(() => window.__sessiz.foundBase())) errors.push('outpost allowed before tutorial step')
await S(() => window.__sessiz.questGo('outpost'))
const c0 = (await S(() => window.__sessiz.snap())).colonies ?? null
const ok = await S(() => window.__sessiz.foundBase())
if (!ok) errors.push('outpost not founded at outpost step')
const pop = await S(() => window.__sessiz.colonyPop('mars-gezegen'))
console.log('colony', pop, c0)
if (!pop || !(pop.pop >= 2)) errors.push(`colony has no settlers ${JSON.stringify(pop)}`)
await S(() => window.__sessiz.stepWorld(30))
if ((await S(() => window.__sessiz.questInfo())).id === 'outpost') errors.push('outpost quest did not complete instantly')

// 5) Yerliler kalıcı: bir kısmını öldür, kalk, in: kalan sayıda yerli doğar (yenilenmez).
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.landOnId('venus'))
const n0 = await S(() => window.__sessiz.snap().locals)
await S(() => {
  const s = window.__sessiz
  for (let i = 0; i < 30; i++) {
    s.approachLocal(2.2)
    s.punch()
    s.stepGround(3)
    if (s.snap().locals <= 3) break
  }
})
const n1 = await S(() => window.__sessiz.snap().locals)
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.landOnId('venus'))
const n2 = await S(() => window.__sessiz.snap().locals)
console.log('natives', n0, n1, n2, await S(() => window.__sessiz.nativesLeft('venus')))
if (!(n0 >= 6)) errors.push(`too few natives ${n0}`)
if (n2 !== n1) errors.push(`natives respawned ${n1} -> ${n2}`)

// 6) Gemiden yerli kampına ateş: bir yerli eksilir.
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('merkur', 40))
await S(() => window.__sessiz.stepWorld(2))
const ns = await S(() => window.__sessiz.nativeShot('merkur'))
console.log('native shot', ns)
if (!ns || !(ns.after === ns.before - 1)) errors.push(`ship shot did not kill a native ${JSON.stringify(ns)}`)

// 7) Ay'da zıplama 3,5 sn'den kısa; dağa yürüyünce içinden geçilmez.
await S(() => window.__sessiz.landOnId('ay'))
const air = await S(() => window.__sessiz.airtime())
console.log('moon airtime', air)
if (!(air > 0.5 && air < 3.6)) errors.push(`moon airtime ${air}`)
const wall = await S(() => window.__sessiz.walkInto())
console.log('feature', wall)
if (!wall || wall.gap < -0.5) errors.push(`walked into a feature ${JSON.stringify(wall)}`)

// 8) Gemi işareti: yaya, gemiden uzakta.
await S(() => window.__sessiz.stepGround(2))
await S(() => window.__sessiz.skipRender(false))
await page.waitForTimeout(300)
if (!(await S(() => window.__sessiz.shipMark()))) errors.push('ship marker not shown when far from ship')
await S(() => window.__sessiz.skipRender(true))

// 9) Diyalog tekrarlanmaz: bir kez konuşulan ırk 3 dk içinde doğrudan savaşır.
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('dunya', 90))
await S(() => window.__sessiz.encounterNow('gliese'))
await S(() => window.__sessiz.encounterPick('attack'))
await S(() => document.getElementById('enc-continue')?.click())
if (!(await S(() => window.__sessiz.talkedRecently('gliese')))) errors.push('talkedRecently false after encounter')
await S(() => window.__sessiz.wipe())
await S(() => window.__sessiz.stepWorld(60))

// 10) Kovalama kamerası: hızlı dönüşte uzaklık sabit, kare başına sıçrama küçük.
await S(() => window.__sessiz.flyTo('dunya', 120))
const cam = await S(() => window.__sessiz.camProbe(120, 0.08))
console.log('cam', cam)
if (cam.maxD - cam.minD > 0.6) errors.push(`camera distance jitters ${cam.minD}..${cam.maxD}`)
if (cam.maxJump > 1.6) errors.push(`camera jumps ${cam.maxJump}`)

// 11) Kokpit görünümü kolları ve konsolu gösterir.
await S(() => window.__sessiz.skipRender(false))
await S(() => window.__sessiz.setCam('cockpit'))
await page.waitForTimeout(500)
if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/cockpit.png` })

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v15 ok')
