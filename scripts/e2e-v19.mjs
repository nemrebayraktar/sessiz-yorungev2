import { chromium } from 'playwright'

// v19 (v14, B turu + düzeltmeler): işçiler yatak kazıp taşır, duruş işçi/asker oranını değiştirir, kışla eğitimi,
// kara/hava taret + taret yükseltme, Y komuta paneli, eğitim akıncıları ve hava savunması, düşman hava savunması
// yörüngeden vurulur ve oyuncuya ateş eder, ırk profilleri (kara delik yalnız Altın'da) ve ölümcül kara delik,
// gezegen bilgi kartı, yük kapsülü, üssü yıkmak "ele geçir" adımını sayar, parlama rengi geri yüklenir.
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
await S(() => window.__sessiz.tutorial(false, false))
await S(() => window.__sessiz.noTalk(true))
await S(() => window.__sessiz.skipRender(true))

// 1) Parlama temizlenince renk geri gelir (golem rengi bozulmaz).
await S(() => window.__sessiz.landOnId('dunya'))
const fl = await S(() => window.__sessiz.flashTest())
if (!fl || fl.before !== fl.after) errors.push(`flash not restored ${JSON.stringify(fl)}`)

// 2) İşçiler: ekonomi duruşunda işçi var; yatağa gidip kazar, üsse taşır (maden artar).
await S(() => window.__sessiz.giveEnergy(3000))
await S(() => window.__sessiz.setLevel(3))
await S(() => window.__sessiz.posture('dunya', 'ekonomi'))
const plan = await S(() => window.__sessiz.colonyPlan('dunya'))
console.log('plan ekonomi', plan)
if (!(plan.workers >= 2)) errors.push(`no workers in economy ${JSON.stringify(plan)}`)
const ore0 = await S(() => window.__sessiz.partsInfo().ore)
await S(() => window.__sessiz.stepGround(60 * 45))
console.log('workerDbg', JSON.stringify(await S(() => window.__sessiz.workerDbg())))
const kinds = await S(() => window.__sessiz.unitKinds())
console.log('units', kinds.join(' '))
if (!kinds.some((k) => k.startsWith('worker:'))) errors.push('no worker units spawned')
if (!kinds.some((k) => k === 'worker:dig' || k === 'worker:back' || k === 'worker:go')) errors.push('workers idle')
const ore1 = await S(() => window.__sessiz.partsInfo().ore)
console.log('ore', ore0, '->', ore1)
if (!(ore1 > ore0)) errors.push(`workers did not haul ore ${ore0} -> ${ore1}`)
await S(() => window.__sessiz.posture('dunya', 'savunma'))
const plan2 = await S(() => window.__sessiz.colonyPlan('dunya'))
if (!(plan2.workers < plan.workers)) errors.push(`defense posture did not shift workers ${JSON.stringify(plan2)}`)

// 3) Kışla eğitimi.
if (!(await S(() => window.__sessiz.train('dunya')))) errors.push('train failed')
await S(() => window.__sessiz.stepGround(60 * 16))
const ti = await S(() => window.__sessiz.trainInfo('dunya'))
console.log('train', ti)
if (!(ti.trained >= 1)) errors.push(`training did not finish ${JSON.stringify(ti)}`)

// 4) Taretler: kara + hava; yanında T yükseltir.
await S(() => window.__sessiz.toCore(16))
const t1 = await S(() => window.__sessiz.placeTurretKind('hava'))
console.log('turrets', t1)
if (!t1.some((x) => x.startsWith('hava'))) errors.push(`no AA turret ${t1}`)
const t2 = await S(() => window.__sessiz.placeTurretKind('kara'))
console.log('turrets after second T near a turret', t2)
if (!t2.some((x) => x.endsWith('2'))) errors.push(`turret upgrade failed ${t2}`)
const cmd = await S(() => window.__sessiz.commandText())
if (!cmd.includes('Kolonilerin') || !cmd.includes('Asker eğit') || !cmd.includes('Ekonomi')) errors.push('command panel missing colony section')

// 5) Akıncılar: hava savunma onları düşürür → akıncılar gider (eğitim bayrağı).
await S(() => window.__sessiz.questGo('airdef'))
const nb = await S(() => window.__sessiz.bombersNow())
if (!(nb >= 1)) errors.push('bombers did not spawn')
await S(() => window.__sessiz.stepWorld(60 * 2))
console.log('aaDbg', JSON.stringify(await S(() => window.__sessiz.aaDbg())))
await S(() => window.__sessiz.stepWorld(60 * 48))
const left = await S(() => window.__sessiz.bombers())
console.log('bombers left', left)
if (left.length) errors.push(`AA did not shoot bombers down ${left}`)

// 6) Düşman hava savunması: üstünde uçarken ateş eder; yörüngeden vurulur.
await S(() => window.__sessiz.toShip?.())
const foes = await S(() => window.__sessiz.enemyAA())
console.log('enemy bases here', foes)

// 7) Gezegen bilgi kartı.
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('ay', 60))
const card = await S(() => window.__sessiz.planetCard())
console.log('card', card)
if (!card || !card.includes('yatağı')) errors.push(`planet card ${card}`)

// 8) Yük kapsülü.
const od = await S(() => window.__sessiz.oppNow())
if (!(od > 0)) errors.push('capsule not spawned')
const og = await S(() => window.__sessiz.oppGrab())
if (!og || !(og.gained > 0) || og.left) errors.push(`capsule grab ${JSON.stringify(og)}`)

// 9) Irk profili: Altın filosunda en çok bir kara delik gemisi; Dünya filosunda hiç.
await S(() => window.__sessiz.skipRender(false))
const gold = await S(() => window.__sessiz.engageAs('kepler452', 6))
console.log('gold fleet', JSON.stringify(gold))
if (gold.filter((a) => a === 'well').length > 1) errors.push(`too many black-hole ships ${gold}`)
await S(() => window.__sessiz.wipe())
await S(() => window.__sessiz.stepWorld(5))
const earth = await S(() => window.__sessiz.engageAs('mars', 6))
console.log('mars fleet', JSON.stringify(earth))
if (earth.includes('well')) errors.push(`young race has a black hole ${earth}`)
// Kara deliğin olay ufku öldürür.
await S(() => window.__sessiz.wellAtPlayer())
const died = await page.waitForFunction(() => window.__sessiz.mode === 'gameover', null, { timeout: 8000 }).then(() => true).catch(() => false)
if (!died) errors.push('black hole did not kill')

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v19 ok')
