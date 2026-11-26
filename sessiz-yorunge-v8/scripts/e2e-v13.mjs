import { chromium } from 'playwright'

// v13 (v9 sürümü): menüde dokunmatik düğme yok, ayarlar paneli (joystick tarafı), kapanan kontroller paneli,
// önsöz → oyun, görev zinciri ve ◆ hedef, gezegen anlatısı, yaya yönü (D sağa), gemi joystick'le döner,
// uzak taret vuruşu nişan karesi yapmaz ama olay akışına düşer, seçim ekranında 3B karakter.
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
const shown = (id) => S((id) => !document.getElementById(id).classList.contains('hidden'), id)
const disp = (sel) => S((sel) => getComputedStyle(document.querySelector(sel)).display, sel)

// 1) Menüde dokunmatik düğmeler görünmez.
await S(() => window.__sessiz.showTouch(true))
await S(() => window.__sessiz.skipIntro())
await page.waitForTimeout(300)
if ((await disp('#touch')) !== 'none') errors.push('touch HUD visible on title')

// 2) Ayarlar: joystick sağa, ✕ ile kapanır.
await S(() => document.getElementById('btn-settings').click())
if (!(await shown('settings'))) errors.push('settings did not open from title')
await S(() => document.getElementById('set-side-right').click())
if (!(await S(() => document.body.classList.contains('stick-right')))) errors.push('stick-right not applied')
await S(() => document.getElementById('settings-x').click())
if (await shown('settings')) errors.push('settings did not close')
await S(() => document.getElementById('set-side-left').click())

// 3) Kontroller paneli ✕ ile kapanır (telefonda takılma hatası).
await S(() => document.getElementById('btn-controls').click())
if (!(await shown('controls'))) errors.push('controls did not open')
await S(() => document.getElementById('controls-x').click())
if (await shown('controls')) errors.push('controls did not close via ✕')

// 4) Seçim: 3B karakter sahnede; önsöz → oyun.
await S(() => document.getElementById('btn-start').click())
await page.waitForTimeout(800)
const probe = await S(() => window.__sessiz.selProbe())
if (!probe.creature || Math.abs(probe.creature[0]) > 1 || Math.abs(probe.creature[1]) > 1) errors.push(`creature off stage ${JSON.stringify(probe.creature)}`)
await S(() => document.getElementById('sel-go').click())
await page.waitForTimeout(300)
if (!(await shown('story'))) errors.push('story card missing after select')
await S(() => document.getElementById('story-go').click())
await page.waitForFunction(() => window.__sessiz.mode === 'map' && !window.__sessiz.snap().fading)
await page.waitForTimeout(600)
if ((await disp('#touch')) === 'none') errors.push('touch HUD hidden while playing')

// 5) Görev zinciri: Ay'a uç → in → yürü.
let q = await S(() => window.__sessiz.questInfo())
console.log('quest', q)
if (q.id !== 'fly' || !q.title.includes("Ay'a")) errors.push(`first quest ${JSON.stringify(q)}`)
if (!q.route || q.route.id !== 'ay') errors.push('quest route not set to Ay')
if (!q.mark) errors.push('quest marker hidden')
await S(() => window.__sessiz.flyTo('ay', 14))
await page.waitForFunction(() => window.__sessiz.questInfo().id === 'land', null, { timeout: 20000 }).catch(() => errors.push('fly quest did not complete'))
const landedAy = await S(() => window.__sessiz.landOnId('ay'))
const loreNow = await S(() => window.__sessiz.loreOn())
console.log('landed ay', landedAy, await S(() => [window.__sessiz.snap().layer, window.__sessiz.questInfo()]))
await page.waitForFunction(() => window.__sessiz.questInfo().id === 'walk', null, { timeout: 20000 }).catch(() => errors.push('land quest did not complete'))
if (!(await S(() => window.__sessiz.discovered().includes('ay')))) errors.push('Ay not in discoveries')
if (!loreNow) errors.push('lore card not shown on landing')

// 6) Yaya yönü: D ekranda sağa, A sola.
const dir = (x) =>
  S((x) => {
    const s = window.__sessiz
    s.stepGround(5)
    const a = s.screenOf()
    s.setStick(x, 0)
    s.stepGround(20)
    s.setStick(0, 0)
    const b = s.screenOf()
    return b.x - a.x
  }, x)
const dxD = await dir(1)
const dxA = await dir(-1)
console.log('foot dx', dxD.toFixed(3), dxA.toFixed(3))
if (!(dxD > 0.005)) errors.push(`D did not move right (${dxD})`)
if (!(dxA < -0.005)) errors.push(`A did not move left (${dxA})`)
const walked = await S(() => window.__sessiz.walkQuest(600))
console.log('walk', walked)
if (walked.id !== 'mine') errors.push(`walk quest did not complete ${JSON.stringify(walked)}`)

// 7) Dalga: uzak taret vuruşu nişan karesi yapmaz, olay akışına düşer.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.callWave())
let fed = 0
let marked = false
for (let k = 0; k < 30 && !fed; k++) {
  await S(() => window.__sessiz.stepGround(30))
  fed = await S(() => window.__sessiz.feedCount())
  marked = marked || (await S(() => window.__sessiz.hitmarkOn()))
}
if (!fed) errors.push('turret/unit hits did not reach the feed')
if (marked) errors.push('hitmark shown for non-player hits')

// 8) Gemi: dokunmatik joystick yatay ekseni gemiyi sağa çevirir.
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyTo('dunya', 60))
const f0 = await S(() => window.__sessiz.shipFwd())
await S(() => window.__sessiz.setStick(0.9, 0))
await S(() => window.__sessiz.stepWorld(40))
await S(() => window.__sessiz.setStick(0, 0))
const f1 = await S(() => window.__sessiz.shipFwd())
const turnY = f0[2] * f1[0] - f0[0] * f1[2]
console.log('ship turn', turnY.toFixed(3))
if (!(turnY < -0.05)) errors.push(`stick right did not turn ship right (${turnY})`)

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v13 ok')
