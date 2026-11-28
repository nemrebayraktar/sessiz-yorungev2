import { chromium } from 'playwright'

// v18 (v14 sürümü, A turu): Ay Dünya'nın yanında, güneş ısısı (şarj + yanma), anıt çarpışması gerçek sınırdan,
// tüm sistemlerde yatak denetimi, geminin altına iniş / Shift+L üsse iniş, eğri meydan, savaştaki ırka ateşkes,
// hasar dumanı ve isabet sarsıntısı.
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
await S(() => window.__sessiz.tutorial(true, false))

// 1) Ay Dünya'ya Merkür'den çok daha yakın; birbirine girmez.
const pp = await S(() => ['dunya', 'ay', 'merkur'].map((id) => window.__sessiz.planetPos(id)))
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const dMoon = dist(pp[0], pp[1])
const dMerc = dist(pp[0], pp[2])
console.log('earth-moon', Math.round(dMoon), 'earth-mercury', Math.round(dMerc))
if (!(dMoon < dMerc * 0.6)) errors.push(`moon not near earth ${dMoon} vs ${dMerc}`)
if (!(dMoon > pp[0].r + pp[1].r + 40)) errors.push(`moon overlaps earth ${dMoon}`)

// 2) Eğri meydan + anıt ayak izi; çekirdeğe yürürken kulenin içine girilmez.
await S(() => window.__sessiz.landOnId('dunya'))
await S(() => window.__sessiz.stepGround(5))
if (!(await S(() => window.__sessiz.plazaCap()))) errors.push('plaza cap/skirt missing')
const nb = await S(() => window.__sessiz.coreBlocks())
if (!(nb >= 2)) errors.push(`core footprint blocks ${nb}`)
const wk = await S(() => window.__sessiz.walkToCore())
console.log('walk to core', wk)
if (!wk || wk.gap < -0.3) errors.push(`walked into landmark ${JSON.stringify(wk)}`)

// 3) İniş: geminin altına; üsten uzakken üssün yanına sıçramaz. Shift+L (landBase) üssün yanına indirir.
await S(() => window.__sessiz.toShip())
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyOver('dunya', 260, 40))
await S(() => window.__sessiz.landHere())
const far = await S(() => window.__sessiz.coreGap())
console.log('land far gap', far)
if (!(far > 200)) errors.push(`landing snapped to base from far ${far}`)
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyOver('dunya', 100, 40))
await S(() => window.__sessiz.landHere())
const near = await S(() => window.__sessiz.coreGap())
console.log('land near gap', near)
if (!(near >= 10 && near < 26)) errors.push(`near landing not by base ${near}`)
await S(() => window.__sessiz.board())
await S(() => window.__sessiz.flyOver('dunya', 300, 40))
await S(() => window.__sessiz.landBase())
const base = await S(() => window.__sessiz.coreGap())
console.log('land base gap', base)
if (!(base >= 10 && base < 26)) errors.push(`landBase not by base ${base}`)
await S(() => window.__sessiz.board())

// 4) Yatak denetimi: inilebilir her gezegende en az 2 yatak (12 sistem).
const audit = await S(() => window.__sessiz.depositAudit())
console.log('deposit audit', audit.total, audit.bad)
if (audit.bad.length) errors.push(`planets without deposits: ${audit.bad.join(', ')}`)

// 5) Güneş: dış kuşak şarj eder (yanmadan), iç kuşak kalkanı sonra gövdeyi yakar.
const out = await S(() => window.__sessiz.solarCharge(6, 3.2))
console.log('solar outer', out)
if (!(out.gained >= 12)) errors.push(`solar charge too low ${JSON.stringify(out)}`)
if (out.hull < 99) errors.push(`outer band burned hull ${JSON.stringify(out)}`)
const merc = await S(() => window.__sessiz.solarCharge(6, 1.3))
console.log('solar mercury band', merc)
if (merc.hull < 99 || !(merc.gained > out.gained)) errors.push(`mercury band ${JSON.stringify(merc)}`)
const inner = await S(() => window.__sessiz.solarCharge(6, 0.4))
console.log('solar inner', inner)
if (!(inner.shield < 5 && inner.hull < 95)) errors.push(`inner band did not burn ${JSON.stringify(inner)}`)

// 6) Savaştaki ırka ateşkes teklifi diplomasi panelinde.
// (diplomasi karanlık ormandan sonra açılır)
await S(() => window.__sessiz.setDarkForest(true))
const btns = await S(() => window.__sessiz.warWith('mars'))
if (!btns.some((t) => t && t.startsWith('Ateşkes'))) errors.push(`no ceasefire button ${JSON.stringify(btns)}`)
await S(() => document.getElementById('diplo').classList.add('hidden'))
if (!(await S(() => window.__sessiz.talkedRecently('mars')))) errors.push('war faction still opens dialog')

// 7) İsabet sarsıntısı + hasarlı gemide duman.
await S(() => window.__sessiz.flyTo('dunya', 120))
const shake = await S(() => window.__sessiz.hurtShip(5))
if (!(shake > 0.3)) errors.push(`ship shake ${shake}`)
await S(() => window.__sessiz.setHullFrac(0.2))
const f0 = await S(() => window.__sessiz.fxMade())
await S(() => window.__sessiz.stepWorld(30))
await page.waitForTimeout(5000)
const f1 = await S(() => window.__sessiz.fxMade())
console.log('smoke fx', f0, '->', f1)
if (!(f1 > f0)) errors.push(`no damage smoke ${f0} -> ${f1}`)

await browser.close()
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('v18 ok')
