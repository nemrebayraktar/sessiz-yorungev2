import {
  type Material,
  AdditiveBlending,
  BackSide,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three'
import type { OriginId, PlanetDef, UniId } from './origins'

/* İhtişamlı gezegenler: prosedürel yüzey (kıta/okyanus, kutup buzu, lav, gaz bantları, kristal damarlar,
   gece yüzünde şehir ışıkları), atmosfer, bulut, gelişmiş dünyalarda yörünge halkası; ırka özel anıt üsler
   ve yüzeye büyük doğal yapılar (dağ, kristal, dev ağaç, volkan kayası...). Hepsi tek dosyada. */

/** Yüzey türü kodu (gölgelendiricide). */
export const BIOME = {
  rocky: 0,
  desert: 1,
  ice: 2,
  ocean: 3,
  lava: 4,
  gas: 5,
  dwarf: 6,
  earth: 7,
  crystal: 8,
  forest: 9,
  dark: 10,
  gold: 11,
  purple: 12,
  star: 13,
} as const
export type BiomeName = keyof typeof BIOME

export type PlanetLook = {
  biome: BiomeName
  /** Üç renk: alçak / orta / yüksek (ya da su / kara / kar). */
  c1: number
  c2: number
  c3: number
  atmo: number | null
  atmoPower: number
  clouds: boolean
  city: number
  ring: 'orbital' | 'gold' | null
  /** Gerçek görüntü dokusu (Dünya: NASA Blue Marble + gece ışıkları; Ay: gerçek Ay haritası). */
  tex?: 'earth' | 'moon'
}

const L = (biome: BiomeName, c1: number, c2: number, c3: number, atmo: number | null, extra: Partial<PlanetLook> = {}): PlanetLook => ({
  biome,
  c1,
  c2,
  c3,
  atmo,
  atmoPower: 1,
  clouds: false,
  city: 0,
  ring: null,
  ...extra,
})

/** Ev dünyaları ırklarının uygarlığını yansıtır. */
const HOME_LOOK: Partial<Record<UniId, PlanetLook>> = {
  gunes: L('earth', 0x0b2a5c, 0x3f7a3a, 0xe8eef2, 0x6fb6ff, { clouds: true, city: 1, atmoPower: 1.2, tex: 'earth' }),
  marskol: L('desert', 0x6a2a18, 0xb5552e, 0xe8c79a, 0xffa06a, { city: 0.6, atmoPower: 0.7 }),
  proxima: L('dark', 0x0c080c, 0x2a1418, 0xff2a4a, 0xff3a5a, { city: 0.4, atmoPower: 0.6 }),
  alpha: L('purple', 0x2a1450, 0x7a4ac0, 0xf0d8ff, 0xc08aff, { city: 0.7, clouds: true }),
  trappist: L('crystal', 0x0c3a38, 0x3ac8b4, 0xd8fff8, 0x5affe6, { city: 0.3 }),
  k218: L('ocean', 0x06204a, 0x1a6aa0, 0xbff0ff, 0x5ad8ff, { clouds: true, city: 0.5, atmoPower: 1.3 }),
  kepler186: L('forest', 0x3a0c14, 0x8a2a24, 0xe8a060, 0xff8a6a, { clouds: true, city: 0.4 }),
  gliese: L('lava', 0x140a08, 0x3a1a10, 0xff5a1a, 0xff6a2a, { city: 0.3, atmoPower: 0.9 }),
  kepler452: L('gold', 0x6a4a18, 0xd8b060, 0xfff2d0, 0xffe2a0, { clouds: true, city: 0.8, ring: 'gold' }),
}

/** Güneş Sistemi'nin tanıdık gezegenleri. */
const NAMED_LOOK: Record<string, PlanetLook> = {
  'gunes-yildiz': L('star', 0xffb040, 0xffe080, 0xffffff, 0xffc860),
  merkur: L('dwarf', 0x4a4440, 0x8a827a, 0xc8c0b8, null),
  venus: L('desert', 0xa07028, 0xd8b060, 0xf8e8b8, 0xffd890, { clouds: true, atmoPower: 1.6 }),
  ay: L('dwarf', 0x5a5a60, 0x9a9aa2, 0xdedee4, null, { tex: 'moon' }),
  'mars-gezegen': L('desert', 0x6a2414, 0xb04a28, 0xe8b890, 0xff9a6a, { atmoPower: 0.5 }),
  jupiter: L('gas', 0x8a5a38, 0xd8b088, 0xf4e8d8, 0xffd8a0),
  saturn: L('gas', 0xa08050, 0xe0c890, 0xf8f0d8, 0xffe8b0),
  titan: L('desert', 0x8a4a10, 0xc87a28, 0xf0b060, 0xffa040, { clouds: true, atmoPower: 1.8 }),
  uranus: L('gas', 0x5ab0c0, 0x8ae0e8, 0xd8fbff, 0xa8f0ff),
  neptun: L('gas', 0x1a3a9a, 0x3a6ad8, 0x9ac0ff, 0x6a9aff),
}

function shade(hex: number, k: number) {
  return new Color(hex).multiplyScalar(k).getHex()
}

export function planetLook(def: PlanetDef, system: UniId): PlanetLook {
  const named = NAMED_LOOK[def.id]
  if (named) return named
  if (def.home && HOME_LOOK[system]) return HOME_LOOK[system] as PlanetLook
  const c = def.color
  if (def.heat) return L('star', shade(c, 0.9), shade(c, 1.2), 0xffffff, c)
  switch (def.biome) {
    case 'desert':
      return L('desert', shade(c, 0.6), c, shade(c, 1.35), shade(c, 1.2), { atmoPower: 0.7 })
    case 'ice':
      return L('ice', shade(c, 0.7), c, 0xffffff, 0xbfe8ff, { atmoPower: 0.8 })
    case 'ocean':
      return L('ocean', shade(c, 0.45), shade(c, 1.05), 0xf0f4f0, shade(c, 1.4), { clouds: true })
    case 'lava':
      return L('lava', 0x120806, shade(c, 0.5), 0xff6a20, 0xff7a3a, { atmoPower: 0.8 })
    case 'gas':
      return L('gas', shade(c, 0.6), c, shade(c, 1.4), shade(c, 1.3))
    case 'dwarf':
      return L('dwarf', shade(c, 0.55), c, shade(c, 1.3), null)
    default:
      return L('rocky', shade(c, 0.55), c, shade(c, 1.4), shade(c, 1.3), { atmoPower: 0.6 })
  }
}

/* ---------- Gölgelendirici parçaları ---------- */

const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
float ridge(vec3 p){ return 1.0 - abs(fbm(p) * 2.0 - 1.0); }
`

const SURFACE = /* glsl */ `
vec3 P = normalize(vObj) + uSeed;
float h = fbm(P * 2.3 + fbm(P * 1.3) * 0.9);
float fine = fbm(P * 90.0) * 0.5 + fbm(P * 420.0) * 0.5;
float lat = abs(normalize(vObj).y);
vec3 col = uC2;
vec3 glowCol = vec3(0.0);
int b = int(uBiome + 0.5);
float sunK = clamp(dot(normalize(vWN), normalize(uSun - vWP)) * 1.6 + 0.15, 0.0, 1.0);
// Şehir ışıkları yalnız uzaktan: yüzeyde dev lekeler olmasın, noktacıklar halinde kümelensin.
float cityFar = smoothstep(60.0, 420.0, length(vViewPosition));
float dots = step(0.62, vnoise(P * 700.0));
if (b == 3 || b == 7) {
  float sea = b == 7 ? 0.5 : 0.56;
  if (h < sea) {
    col = mix(uC1 * 0.7, uC1 * 1.35, smoothstep(sea - 0.18, sea, h));
  } else {
    float k = smoothstep(sea, sea + 0.28, h);
    vec3 land = b == 7 ? mix(vec3(0.24, 0.42, 0.2), vec3(0.55, 0.46, 0.3), k) : mix(uC2 * 0.8, uC2 * 1.2, k);
    col = mix(land, uC3, smoothstep(0.78, 0.9, h));
    if (uCity > 0.0) {
      float cityMask = step(0.6, fbm(P * 26.0)) * smoothstep(sea, sea + 0.06, h) * (0.35 + 0.65 * dots);
      glowCol += vec3(1.0, 0.78, 0.45) * cityMask * (1.0 - sunK) * uCity * 2.2 * cityFar;
    }
  }
  if (uCity <= 0.0) col = mix(col, uC3, smoothstep(0.93, 0.98, lat + (h - 0.5) * 0.15));
} else if (b == 5) {
  float band = sin(normalize(vObj).y * 18.0 + fbm(P * 3.0) * 4.0);
  col = mix(uC1, uC2, band * 0.5 + 0.5);
  col = mix(col, uC3, smoothstep(0.6, 0.95, fbm(P * vec3(2.0, 10.0, 2.0))));
} else if (b == 4 || b == 10) {
  float r = ridge(P * 4.0);
  col = mix(uC1, uC2, h);
  // İnce çatlaklar: büyük ölçek + yakından görünen ince ağ (yüzeyde dev lekeler olmasın).
  float crack = smoothstep(0.9, 0.985, r) * (0.55 + 0.45 * ridge(P * 34.0)) + smoothstep(0.94, 0.995, ridge(P * 60.0)) * 0.6;
  crack = clamp(crack, 0.0, 1.0);
  col = mix(col, uC3 * 0.45, crack);
  glowCol += uC3 * crack * (b == 4 ? 1.6 : 1.1);
} else if (b == 8) {
  float r = ridge(P * 6.0);
  col = mix(uC1, uC2, h * 1.2);
  float vein = smoothstep(0.92, 0.99, r) + smoothstep(0.95, 0.995, ridge(P * 50.0)) * 0.6;
  glowCol += uC2 * vein * 1.3;
  col = mix(col, uC3, vein * 0.5);
} else if (b == 12) {
  col = mix(uC1, uC2, smoothstep(0.3, 0.7, h));
  float grid = smoothstep(0.92, 0.99, ridge(P * 8.0));
  glowCol += uC3 * grid * 0.6 * uCity * (0.3 + 0.7 * cityFar);
} else if (b == 13) {
  col = mix(uC1, uC3, fbm(P * 6.0 + uTime * 0.05));
  glowCol += col * 1.4;
} else if (b == 2) {
  float r = ridge(P * 5.0);
  col = mix(uC3, uC2, smoothstep(0.55, 0.95, r));
} else {
  float r = ridge(P * 3.5);
  col = mix(uC1, uC2, smoothstep(0.25, 0.7, h));
  col = mix(col, uC3, smoothstep(0.86, 0.97, r) * 0.45 * (0.6 + 0.4 * fbm(P * 40.0)));
  if (b == 9) col = mix(col, uC1 * 0.7, smoothstep(0.5, 0.65, fbm(P * 12.0)));
  if (b == 11) col = mix(col, uC3, smoothstep(0.7, 0.8, h) * 0.6);
}
if (uCity > 0.0 && b != 3 && b != 7) {
  float cityMask = step(0.64, fbm(P * 24.0)) * step(0.45, h) * (0.35 + 0.65 * dots);
  glowCol += mix(vec3(1.0, 0.8, 0.5), uC3, 0.35) * cityMask * (1.0 - sunK) * uCity * 1.6 * cityFar;
}
col *= 0.82 + fine * 0.36;
diffuseColor.rgb = col;
`

/* Gerçek dokular (public/tex): göreli yol, GitHub Pages alt klasöründe de çalışır. */
const texLoader = new TextureLoader()
const texCache = new Map<string, Texture>()
function tex(name: string, srgb = true) {
  let t = texCache.get(name)
  if (!t) {
    t = texLoader.load(`tex/${name}`)
    if (srgb) t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    texCache.set(name, t)
  }
  return t
}

/** Dokulu gezegen: gerçek renk haritası + yakından görünen prosedürel ince ayrıntı. */
const REALTEX = /* glsl */ `
vec3 tc = texture2D(uMap, vUv2).rgb;
float detail = 0.86 + fine * 0.28;
vec3 procCol = diffuseColor.rgb;
diffuseColor.rgb = tc * detail * (uIsMoon > 0.5 ? 1.15 : 1.0);
// Kutuplarda haritanın sıkışması ve yakından bulanıklık görünmesin: oralarda prosedürel yüzeye geçilir.
float poleK = smoothstep(0.9, 0.985, lat);
float nearK = 1.0 - smoothstep(40.0, 260.0, length(vViewPosition));
diffuseColor.rgb = mix(diffuseColor.rgb, procCol * (uIsMoon > 0.5 ? 1.05 : 1.0), max(poleK, nearK * 0.55));
if (uIsMoon > 0.5) {
  // Ay: haritadaki denizlere ek olarak yakından kraterli ayrıntı.
  float cr = ridge(P * 40.0);
  diffuseColor.rgb *= 0.85 + 0.3 * smoothstep(0.6, 0.95, cr);
}
glowCol = vec3(0.0);
if (uIsMoon < 0.5) {
  vec3 night = texture2D(uNight, vUv2).rgb;
  glowCol = night * night * vec3(1.0, 0.85, 0.6) * 2.4 * (1.0 - sunK) * (0.25 + 0.75 * cityFar);
}
`

/** Gezegen malzemesi: MeshStandard'ın ışığını korur, rengi ve parıltıyı prosedürel üretir. */
export function planetMaterial(look: PlanetLook, seed: number) {
  const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: look.biome === 'ocean' || look.biome === 'earth' ? 0.55 : 0.85, metalness: look.biome === 'gold' ? 0.35 : 0.04 })
  const uniforms = {
    uBiome: { value: BIOME[look.biome] },
    uSeed: { value: new Vector3((seed * 0.731) % 7, (seed * 0.317) % 5, (seed * 0.173) % 3) },
    uC1: { value: new Color(look.c1) },
    uC2: { value: new Color(look.c2) },
    uC3: { value: new Color(look.c3) },
    uSun: { value: new Vector3() },
    uCity: { value: look.city },
    uTime: { value: 0 },
  }
  const real = look.tex
  const texU = real
    ? {
        uMap: { value: tex(real === 'earth' ? 'earth-day.jpg' : 'moon.jpg') },
        uNight: { value: tex(real === 'earth' ? 'earth-night.jpg' : 'moon.jpg') },
        uWater: { value: tex(real === 'earth' ? 'earth-water.jpg' : 'moon.jpg', false) },
        uIsMoon: { value: real === 'moon' ? 1 : 0 },
      }
    : null
  if (texU) Object.assign(uniforms, texU)
  mat.userData.uniforms = uniforms
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying vec3 vWN;\nvarying vec3 vWP;\nvarying vec2 vUv2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvUv2 = uv;\nvWN = normalize(mat3(modelMatrix) * normal);\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vObj;\nvarying vec3 vWN;\nvarying vec3 vWP;\nvarying vec2 vUv2;\n${texU ? 'uniform sampler2D uMap;\nuniform sampler2D uNight;\nuniform sampler2D uWater;\nuniform float uIsMoon;\n' : ''}uniform float uBiome;\nuniform vec3 uSeed;\nuniform vec3 uC1;\nuniform vec3 uC2;\nuniform vec3 uC3;\nuniform vec3 uSun;\nuniform float uCity;\nuniform float uTime;\n${NOISE}`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${SURFACE}${texU ? REALTEX : ''}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glowCol;')
    // Dünya: denizler parlak (güneş yansıması), karalar mat.
    if (real === 'earth') sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.9, 0.32, texture2D(uWater, vUv2).r);')
  }
  mat.customProgramCacheKey = () => `planet-v2-${real ?? 'proc'}`
  return mat
}

/** Atmosfer kabuğu: kenarda parlayan ince bir hale. */
export function atmosphere(color: number, power = 1) {
  const mat = new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uPower: { value: power } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.6); gl_FragColor = vec4(uColor * f * 1.6 * uPower, f * uPower); }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: BackSide,
  })
  mat.toneMapped = false
  const m = new Mesh(new SphereGeometry(1.06, 48, 28), mat)
  m.name = 'atmo'
  return m
}

export function clouds(seed: number, real?: 'earth' | 'moon') {
  const mat = new MeshStandardMaterial({ color: 0xffffff, transparent: true, depthWrite: false, roughness: 1 })
  if (real === 'earth') {
    // Gerçek bulut haritası (alfa olarak).
    mat.alphaMap = tex('earth-clouds.jpg', false)
    mat.opacity = 0.85
    const m = new Mesh(new SphereGeometry(1.008, 64, 40), mat)
    m.name = 'clouds'
    return m
  }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSeed = { value: seed % 9 }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nuniform float uSeed;\n${NOISE}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat cl = fbm(normalize(vObj) * vec3(5.0, 11.0, 5.0) + uSeed) * 0.7 + fbm(normalize(vObj) * 22.0 + uSeed) * 0.3;\ndiffuseColor.a = smoothstep(0.56, 0.74, cl) * 0.55;')
  }
  mat.customProgramCacheKey = () => 'clouds-v1'
  const m = new Mesh(new SphereGeometry(1.012, 48, 28), mat)
  m.name = 'clouds'
  return m
}

/** Gelişmiş uygarlık halkası: yörüngede dönen şehir halkası ve istasyonlar. */
export function orbitalRing(kind: 'orbital' | 'gold') {
  const g = new Group()
  g.name = 'orbital'
  const tint = kind === 'gold' ? 0xffd88a : 0x9ad8ff
  const steel = new MeshStandardMaterial({ color: kind === 'gold' ? 0xc8a050 : 0xb8c0cc, metalness: 0.7, roughness: 0.35 })
  const neon = new MeshBasicMaterial({ color: new Color(tint).multiplyScalar(1.6) })
  neon.toneMapped = false
  const ring = new Mesh(new TorusGeometry(1.5, 0.012, 6, 160), steel)
  ring.rotation.x = Math.PI / 2
  const glow = new Mesh(new TorusGeometry(1.5, 0.004, 4, 160), neon)
  glow.rotation.x = Math.PI / 2
  glow.position.y = 0.012
  g.add(ring, glow)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const st = new Mesh(new CylinderGeometry(0.035, 0.035, 0.06, 8), steel)
    st.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5)
    const light = new Mesh(new OctahedronGeometry(0.015), neon)
    light.position.copy(st.position).setY(0.045)
    g.add(st, light)
    // Uzay asansörleri: ekvatordan halkaya inen ışık çizgileri (dört tane).
    if (i % 2 === 0) {
      const beam = new Mesh(new CylinderGeometry(0.003, 0.003, 0.5, 4), neon)
      beam.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25)
      beam.rotation.z = Math.PI / 2
      beam.rotation.y = -a
      g.add(beam)
    }
  }
  g.rotation.z = 0.18
  return g
}

/** Gezegeni giydir: malzeme, atmosfer, bulut, halka. sphere = gezegen grubunun ilk çocuğu (birim küre). */
export function dressPlanet(group: Group, sphere: Mesh, look: PlanetLook, seed: number) {
  for (const name of ['atmo', 'clouds', 'orbital']) {
    const old = group.getObjectByName(name)
    if (old) {
      old.removeFromParent()
      ;(old as Mesh).geometry?.dispose?.()
      const m = (old as Mesh).material as Material | undefined
      m?.dispose?.()
    }
  }
  const prev = sphere.material as MeshStandardMaterial
  prev.dispose()
  sphere.material = planetMaterial(look, seed)
  if (look.atmo !== null && look.biome !== 'star') group.add(atmosphere(look.atmo, look.atmoPower))
  const cl = look.clouds ? clouds(seed, look.tex) : null
  if (cl) group.add(cl)
  const ring = look.ring ? orbitalRing(look.ring) : null
  if (ring) group.add(ring)
  // Her karede ağacı taramamak için doğrudan başvuru.
  group.userData.cloudsObj = cl
  group.userData.orbitalObj = ring
}

/** Her karede: güneş yönü (şehir ışıkları gece yüzünde yanar), bulut ve halka dönüşü. */
export function tickPlanet(group: Group, sphere: Mesh, sun: Vector3, t: number, dt: number) {
  const u = (sphere.material as MeshStandardMaterial).userData.uniforms as { uSun: { value: Vector3 }; uTime: { value: number } } | undefined
  if (u) {
    u.uSun.value.copy(sun)
    u.uTime.value = t
  }
  const c = group.userData.cloudsObj as Object3D | null | undefined
  if (c) c.rotation.y += dt * 0.012
  const o = group.userData.orbitalObj as Object3D | null | undefined
  if (o) o.rotation.y += dt * 0.02
}

/* ---------- Yüzeydeki büyük yapılar ---------- */

export type Feature = { obj: Object3D; dir: Vector3; r: number }

function stoneMat(hex: number, glow = 0) {
  return new MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0.05, flatShading: true, emissive: hex, emissiveIntensity: glow })
}

function neonM(hex: number, k = 1.6) {
  const m = new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(k) })
  m.toneMapped = false
  return m
}

function jitter(geo: BufferGeometry, amt: number, seed: number) {
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
    const r = (s - Math.floor(s) - 0.5) * amt
    pos.setXYZ(i, pos.getX(i) * (1 + r), pos.getY(i) * (1 + r * 0.5), pos.getZ(i) * (1 + r))
  }
  geo.computeVertexNormals()
  return geo
}

/** Biyoma göre büyük yapı: dağ, mesa, buz kulesi, kristal küme, dev ağaç, lav kayası, altın dikilitaş... */
function featureFor(look: PlanetLook, k: number, seed: number): { g: Group; r: number } {
  const g = new Group()
  const b = look.biome
  if (b === 'crystal' || b === 'ice') {
    const m = b === 'crystal' ? new MeshStandardMaterial({ color: look.c2, emissive: look.c2, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.9 }) : stoneMat(0xdff4ff, 0.08)
    for (let i = 0; i < 4; i++) {
      const c = new Mesh(new OctahedronGeometry(1, 0), m)
      const h = (3 + ((seed * (i + 3)) % 4)) * k
      c.scale.set(h * 0.25, h, h * 0.25)
      c.position.set(Math.cos(i * 2.1 + seed) * k * 1.2, h * 0.7, Math.sin(i * 2.1 + seed) * k * 1.2)
      c.rotation.set((i - 1.5) * 0.18, i, (i - 1.5) * 0.12)
      g.add(c)
    }
    return { g, r: 2.2 * k }
  }
  if (b === 'forest' || b === 'earth' || b === 'ocean') {
    const trunk = stoneMat(b === 'forest' ? 0x3a1a10 : 0x4a3424)
    const leaf = new MeshStandardMaterial({ color: b === 'forest' ? 0xa02a2a : 0x2f6a2a, roughness: 0.8, flatShading: true, emissive: b === 'forest' ? 0x3a0808 : 0x0a1a08, emissiveIntensity: 0.4 })
    const t = new Mesh(new CylinderGeometry(0.35 * k, 0.6 * k, 7 * k, 7), trunk)
    t.position.y = 3.5 * k
    g.add(t)
    for (let i = 0; i < 3; i++) {
      const c = new Mesh(jitter(new IcosahedronGeometry(2.4 * k, 1), 0.25, seed + i), leaf)
      c.position.set((i - 1) * 1.6 * k, 7.4 * k + (i % 2) * 1.2 * k, ((i * 7) % 3 - 1) * 1.1 * k)
      g.add(c)
    }
    if (b === 'forest') {
      const fruit = neonM(0xffb04a)
      for (let i = 0; i < 4; i++) {
        const f = new Mesh(new OctahedronGeometry(0.3 * k), fruit)
        f.position.set(Math.cos(i * 1.7) * 2.2 * k, 6.2 * k, Math.sin(i * 1.7) * 2.2 * k)
        g.add(f)
      }
    }
    return { g, r: 1.4 * k }
  }
  if (b === 'lava' || b === 'dark') {
    const rock = stoneMat(b === 'lava' ? 0x24140e : 0x120c10)
    const m = new Mesh(jitter(new ConeGeometry(4 * k, 9 * k, 9, 3), 0.25, seed), rock)
    m.position.y = 4.5 * k
    const vein = neonM(look.c3, b === 'lava' ? 2 : 1.6)
    const top = new Mesh(new CylinderGeometry(0.9 * k, 1.4 * k, 0.6 * k, 9), vein)
    top.position.y = 8.6 * k
    g.add(m, top)
    for (let i = 0; i < 3; i++) {
      const v = new Mesh(new CylinderGeometry(0.12 * k, 0.2 * k, 7 * k, 4), vein)
      v.position.set(Math.cos(i * 2.1) * 1.9 * k, 3.6 * k, Math.sin(i * 2.1) * 1.9 * k)
      v.rotation.set(Math.sin(i * 2.1) * 0.42, 0, -Math.cos(i * 2.1) * 0.42)
      g.add(v)
    }
    return { g, r: 3.4 * k }
  }
  if (b === 'gold' || b === 'purple') {
    const stone = stoneMat(b === 'gold' ? 0xd8b868 : 0x5a3a8a, 0.1)
    const ob = new Mesh(new CylinderGeometry(0.4 * k, 1.2 * k, 12 * k, 4), stone)
    ob.position.y = 6 * k
    const cap = new Mesh(new OctahedronGeometry(0.9 * k), neonM(look.c3, 1.4))
    cap.position.y = 12.8 * k
    g.add(ob, cap)
    if (b === 'purple') {
      const ring = new Mesh(new TorusGeometry(1.8 * k, 0.08 * k, 6, 24), neonM(0xc08aff))
      ring.position.y = 10 * k
      ring.rotation.x = Math.PI / 2
      g.add(ring)
    }
    return { g, r: 1.4 * k }
  }
  if (b === 'gas') return { g, r: 0 }
  // Kayalık / çöl / cüce: sıra dağ ya da mesa.
  const rock = stoneMat(b === 'desert' ? shade(look.c2, 0.85) : shade(look.c2, 0.75), 0.05)
  const snow = stoneMat(look.c3, 0.05)
  const mesa = b === 'desert' && seed % 2 === 0
  if (mesa) {
    const m = new Mesh(jitter(new CylinderGeometry(4.5 * k, 6 * k, 5 * k, 10, 2), 0.18, seed), rock)
    m.position.y = 2.5 * k
    g.add(m)
    return { g, r: 5.5 * k }
  }
  for (let i = 0; i < 3; i++) {
    const h = (8 - i * 2) * k
    const m = new Mesh(jitter(new ConeGeometry(h * 0.6, h, 8, 3), 0.22, seed + i), rock)
    m.position.set((i - 1) * 3.6 * k, h / 2, (i % 2) * 2 * k)
    g.add(m)
    if (i === 0 && b !== 'desert' && b !== 'dwarf') {
      const cap = new Mesh(new ConeGeometry(h * 0.24, h * 0.36, 8), snow)
      cap.position.set(m.position.x, h * 0.85, m.position.z)
      g.add(cap)
    }
  }
  // Üç tepe yan yana: çarpışma dairesi sıranın tamamını kapsar.
  return { g, r: 7.4 * k }
}

/** Gezegenin üstüne büyük yapılar diz; çarpışma için yön + açısal yarıçap döndürür (gezegen yerel uzayı). */
export function scatterFeatures(mesh: Group, def: PlanetDef, look: PlanetLook, seed: number): Feature[] {
  const out: Feature[] = []
  if (look.biome === 'gas' || look.biome === 'star' || def.landable === false) return out
  const n = def.kind === 'small' ? 7 : def.kind === 'large' ? 16 : 12
  const holder = new Group()
  holder.name = 'features'
  holder.scale.setScalar(1 / def.radius)
  mesh.add(holder)
  // Yapılar gezegene oranlı: küçük uyduda dev sivri dağlar ufukta diken gibi durmasın.
  const k = Math.max(0.9, Math.min(2.8, def.radius / 70))
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * 2.39996 + seed
    const dir = new Vector3(Math.cos(phi) * ring, y, Math.sin(phi) * ring).normalize()
    const { g, r } = featureFor(look, k * (0.8 + ((seed + i * 7) % 5) * 0.12), seed + i)
    if (!g.children.length) continue
    const tangent = new Vector3(0, 1, 0).cross(dir)
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
    tangent.normalize()
    const bit = new Vector3().crossVectors(tangent, dir).normalize()
    g.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(tangent, dir, bit))
    // Taban gezegenin eğriliğine göre gömülür: kenarları havada kalmaz, yüzeyden ayrı görünmez.
    const sink = (r * r) / (2 * def.radius) + 0.6 + r * 0.08
    g.position.copy(dir).multiplyScalar(def.radius - sink)
    g.userData.dir = dir
    holder.add(g)
    out.push({ obj: g, dir, r: r / def.radius })
  }
  return out
}

/* ---------- Irka özel anıt üsler ---------- */

/** Irkın görkemli üs yapısı; seviye arttıkça büyür ve çevresine yan yapılar eklenir. */
export function buildLandmark(owner: OriginId | string, level: number, tint: number): Group {
  const g = new Group()
  g.name = 'landmark'
  const s = 0.75 + level * 0.12
  const main = new Group()
  main.scale.setScalar(s)
  g.add(main)
  const glow = neonM(tint, 1.7)
  switch (owner) {
    case 'earth': {
      // Gelecek şehri kulesi: kademeli cam kule, halkalar, anten.
      const glass = new MeshStandardMaterial({ color: 0x9ac8f0, metalness: 0.6, roughness: 0.15, emissive: 0x204a7a, emissiveIntensity: 0.5 })
      const steel = new MeshStandardMaterial({ color: 0xd8dee8, metalness: 0.7, roughness: 0.3 })
      ;[[3.2, 4], [2.4, 4], [1.6, 4], [0.9, 3]].reduce((y, [r, h]) => {
        const t = new Mesh(new CylinderGeometry(r * 0.85, r, h, 12), glass)
        t.position.y = y + h / 2
        const band = new Mesh(new TorusGeometry(r * 0.95, 0.08, 6, 24), glow)
        band.rotation.x = Math.PI / 2
        band.position.y = y + h
        main.add(t, band)
        return y + h
      }, 0)
      const ant = new Mesh(new CylinderGeometry(0.06, 0.12, 5, 6), steel)
      ant.position.y = 17.5
      const tip = new Mesh(new OctahedronGeometry(0.4), glow)
      tip.position.y = 20.2
      main.add(ant, tip)
      break
    }
    case 'mars': {
      // Dağ kalesi: kızıl dağ, oyulmuş kapı ve turuncu pencereler, kubbeler.
      const rock = stoneMat(0x8a3a22, 0.05)
      const m = new Mesh(jitter(new ConeGeometry(6, 13, 9, 4), 0.18, 3), rock)
      m.position.y = 6.5
      const gate = new Mesh(new CylinderGeometry(1.2, 1.2, 0.4, 12, 1, false, 0, Math.PI), glow)
      gate.rotation.x = Math.PI / 2
      gate.position.set(0, 1.2, 5.3)
      main.add(m, gate)
      for (let i = 0; i < 6; i++) {
        const w = new Mesh(new CylinderGeometry(0.22, 0.22, 0.1, 6), glow)
        const a = i * 1.1
        w.position.set(Math.sin(a) * (4.2 - i * 0.45), 3 + i * 1.3, Math.cos(a) * (4.2 - i * 0.45))
        w.lookAt(w.position.x * 2, w.position.y, w.position.z * 2)
        w.rotateX(Math.PI / 2)
        main.add(w)
      }
      const dome = new Mesh(new SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xffb07a, transparent: true, opacity: 0.5, emissive: 0xff7a3a, emissiveIntensity: 0.5 }))
      dome.position.set(4.5, 0, 2)
      main.add(dome)
      break
    }
    case 'proxima': {
      // Obsidyen sivri kule kümesi ve tepede kızıl göz.
      const ob = stoneMat(0x120a10)
      for (let i = 0; i < 5; i++) {
        const h = i === 0 ? 16 : 6 + i * 1.5
        const sp = new Mesh(new ConeGeometry(i === 0 ? 1.8 : 0.9, h, 5), ob)
        const a = i * 1.3
        sp.position.set(i === 0 ? 0 : Math.cos(a) * 3.2, h / 2, i === 0 ? 0 : Math.sin(a) * 3.2)
        sp.rotation.z = i === 0 ? 0 : Math.cos(a) * 0.15
        main.add(sp)
      }
      const eye = new Mesh(new SphereGeometry(0.9, 14, 10), glow)
      eye.position.y = 12
      eye.scale.set(1, 0.6, 1)
      main.add(eye)
      break
    }
    case 'alpha': {
      // Akıl kulesi: ince sap, havada süzülen mor küre ve dönen halkalar.
      const stone = stoneMat(0x4a2a7a, 0.15)
      const stalk = new Mesh(new CylinderGeometry(0.5, 1.6, 12, 8), stone)
      stalk.position.y = 6
      const orb = new Mesh(new SphereGeometry(2.4, 20, 14), new MeshStandardMaterial({ color: 0xe0b0ff, emissive: 0x8d5ae0, emissiveIntensity: 0.6, roughness: 0.4 }))
      orb.position.y = 15
      main.add(stalk, orb)
      for (let i = 0; i < 2; i++) {
        const r = new Mesh(new TorusGeometry(3.4 + i * 0.9, 0.1, 6, 36), glow)
        r.position.y = 15
        r.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, 0)
        r.name = 'spin'
        main.add(r)
      }
      break
    }
    case 'trappist': {
      // Dev kristal küme.
      const m = new MeshStandardMaterial({ color: 0x8ff0e6, emissive: 0x2ad8c8, emissiveIntensity: 0.5, roughness: 0.1, transparent: true, opacity: 0.88, flatShading: true })
      for (let i = 0; i < 7; i++) {
        const h = i === 0 ? 16 : 5 + (i % 3) * 2.5
        const c = new Mesh(new OctahedronGeometry(1, 0), m)
        c.scale.set(h * 0.22, h, h * 0.22)
        const a = i * 0.9
        c.position.set(i === 0 ? 0 : Math.cos(a) * 3, h * 0.6, i === 0 ? 0 : Math.sin(a) * 3)
        c.rotation.set(i === 0 ? 0 : Math.sin(a) * 0.35, a, i === 0 ? 0 : -Math.cos(a) * 0.35)
        main.add(c)
      }
      break
    }
    case 'k218': {
      // Dev deniz kabuğu kulesi ve su ışığı.
      const shell = new MeshStandardMaterial({ color: 0x8ad8e8, roughness: 0.4, metalness: 0.2, emissive: 0x1a6a8a, emissiveIntensity: 0.3 })
      for (let i = 0; i < 9; i++) {
        const r = 3.4 - i * 0.33
        const t = new Mesh(new TorusGeometry(r, 0.55 - i * 0.04, 8, 20), shell)
        t.rotation.x = Math.PI / 2
        t.position.y = 0.6 + i * 1.3
        t.rotation.z = i * 0.5
        main.add(t)
      }
      const pearl = new Mesh(new SphereGeometry(1, 16, 12), glow)
      pearl.position.y = 13
      main.add(pearl)
      break
    }
    case 'kepler186': {
      // Dünya ağacı: kalın gövde, kızıl taç ve parlayan meyveler.
      const bark = stoneMat(0x3a1a10)
      const trunk = new Mesh(new CylinderGeometry(1.4, 2.8, 12, 9), bark)
      trunk.position.y = 6
      main.add(trunk)
      const leaf = new MeshStandardMaterial({ color: 0xb02a2a, roughness: 0.8, flatShading: true, emissive: 0x4a0a0a, emissiveIntensity: 0.4 })
      for (let i = 0; i < 6; i++) {
        const c = new Mesh(jitter(new IcosahedronGeometry(3.6, 1), 0.2, i), leaf)
        const a = i * 1.05
        c.position.set(Math.cos(a) * 3.4, 13 + (i % 2) * 2, Math.sin(a) * 3.4)
        main.add(c)
      }
      for (let i = 0; i < 10; i++) {
        const f = new Mesh(new OctahedronGeometry(0.45), glow)
        const a = i * 0.63
        f.position.set(Math.cos(a) * 5.4, 11 + (i % 3), Math.sin(a) * 5.4)
        main.add(f)
      }
      break
    }
    case 'gliese': {
      // Volkan: lav kraterli dev koni ve akan lav nehirleri.
      const rock = stoneMat(0x1e120e)
      const v = new Mesh(jitter(new CylinderGeometry(2.2, 8, 13, 12, 4, true), 0.15, 7), rock)
      v.position.y = 6.5
      const lava = new Mesh(new CylinderGeometry(2.1, 2.1, 0.4, 12), neonM(0xff5a1a, 2.2))
      lava.position.y = 12.6
      main.add(v, lava)
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + 0.4
        const river = new Mesh(new CylinderGeometry(0.25, 0.5, 12, 4), neonM(0xff6a1a, 1.8))
        river.position.set(Math.cos(a) * 4.6, 6.2, Math.sin(a) * 4.6)
        river.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55)
        main.add(river)
      }
      break
    }
    case 'kepler452': {
      // Altın saray: basamaklı zigurat, altın kubbe ve dönen taç.
      const gold = new MeshStandardMaterial({ color: 0xe8c060, metalness: 0.85, roughness: 0.25, emissive: 0x5a3a08, emissiveIntensity: 0.3 })
      const white = new MeshStandardMaterial({ color: 0xf8f0e0, roughness: 0.4 })
      for (let i = 0; i < 4; i++) {
        const step = new Mesh(new CylinderGeometry(5.6 - i * 1.2, 6 - i * 1.2, 2, 4), i % 2 ? gold : white)
        step.rotation.y = Math.PI / 4
        step.position.y = 1 + i * 2
        main.add(step)
      }
      const dome = new Mesh(new SphereGeometry(1.8, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold)
      dome.position.y = 8
      const crown = new Mesh(new TorusGeometry(2.6, 0.12, 8, 36), glow)
      crown.position.y = 12
      crown.rotation.x = Math.PI / 2
      crown.name = 'spin'
      main.add(dome, crown)
      break
    }
    default: {
      // Yabani / buz: taş totem.
      const stone = stoneMat(0x6a7480, 0.05)
      const t = new Mesh(jitter(new DodecahedronGeometry(2.6, 0), 0.2, 2), stone)
      t.position.y = 2.6
      const top = new Mesh(new OctahedronGeometry(1), glow)
      top.position.y = 6.2
      main.add(t, top)
    }
  }
  // Meydan: anıtın oturduğu ırk renginde taş zemin ve ışıklı çember.
  const plaza = new Mesh(new CylinderGeometry(10.5, 11, 0.5, 40), new MeshStandardMaterial({ color: shade(tint, 0.35), roughness: 0.7, metalness: 0.2 }))
  plaza.position.y = -0.55
  const rim = new Mesh(new TorusGeometry(10.6, 0.12, 6, 64), glow)
  rim.rotation.x = Math.PI / 2
  rim.position.y = -0.28
  g.add(plaza, rim)
  // Seviyeyle çoğalan yan yapılar: küçük kuleler, ışıklı direkler.
  const sat = Math.max(0, level - 1)
  for (let i = 0; i < sat; i++) {
    const a = (i / Math.max(1, sat)) * Math.PI * 2 + 0.6
    const tower = new Group()
    const body = new Mesh(new CylinderGeometry(0.5, 0.8, 4 + i, 6), stoneMat(shade(tint, 0.45), 0.2))
    body.position.y = (4 + i) / 2
    const lamp = new Mesh(new OctahedronGeometry(0.45), glow)
    lamp.position.y = 4.6 + i
    tower.add(body, lamp)
    tower.position.set(Math.cos(a) * 8, 0, Math.sin(a) * 8)
    g.add(tower)
  }
  return g
}

export function spinLandmark(g: Object3D, dt: number) {
  g.traverse((o) => {
    if (o.name === 'spin') o.rotation.z += dt * 0.5
  })
}

/* ---------- Kaynak yatakları ---------- */

export type Deposit = { obj: Group; dir: Vector3; kind: 'ore' | 'crystal'; left: number; key: string }

/** Biyoma göre maden/kristal yatağı sayısı. */
function depositMix(look: PlanetLook, def: PlanetDef): ['ore' | 'crystal', number][] {
  if (def.home) return [['ore', 2], ['crystal', 1]]
  switch (look.biome) {
    case 'ice':
    case 'crystal':
    case 'purple':
      return [['crystal', 3], ['ore', 1]]
    case 'ocean':
    case 'earth':
    case 'forest':
      return [['ore', 2], ['crystal', 1]]
    case 'gas':
    case 'star':
      return []
    default:
      return [['ore', 4], ['crystal', 1]]
  }
}

function depositMesh(kind: 'ore' | 'crystal') {
  const g = new Group()
  const rock = new MeshStandardMaterial({ color: kind === 'ore' ? 0x5a4636 : 0x3a4a5a, roughness: 0.85, flatShading: true })
  const vein = neonM(kind === 'ore' ? 0xffb43a : 0x6af0ff, kind === 'ore' ? 1.5 : 1.8)
  const base = new Mesh(jitter(new DodecahedronGeometry(1.3, 0), 0.25, kind === 'ore' ? 3 : 5), rock)
  base.scale.set(1.3, 0.7, 1.1)
  base.position.y = 0.5
  g.add(base)
  for (let i = 0; i < 5; i++) {
    const c = new Mesh(new OctahedronGeometry(kind === 'ore' ? 0.32 : 0.42, 0), vein)
    const a = i * 1.3
    c.position.set(Math.cos(a) * 0.9, 0.9 + (i % 2) * 0.35, Math.sin(a) * 0.7)
    c.scale.set(1, kind === 'crystal' ? 2.2 : 1.2, 1)
    c.rotation.set(Math.sin(a) * 0.4, a, Math.cos(a) * 0.4)
    g.add(c)
  }
  return g
}

/** Yüzeye kaynak yatakları diz. mined: daha önce tükenmiş yatakların anahtarları. */
export function scatterDeposits(mesh: Group, def: PlanetDef, look: PlanetLook, seed: number, mined: Map<string, number>): Deposit[] {
  const out: Deposit[] = []
  const mix = depositMix(look, def)
  if (!mix.length || def.landable === false) return out
  const holder = new Group()
  holder.name = 'deposits'
  holder.scale.setScalar(1 / def.radius)
  mesh.add(holder)
  let i = 0
  for (const [kind, n] of mix) {
    for (let k = 0; k < n; k++, i++) {
      const key = `${def.id}:${i}`
      const full = kind === 'ore' ? 5 : 3
      const left = mined.has(key) ? (mined.get(key) as number) : full
      if (left <= 0) continue
      // Yataklar ev üssünün çevresine (kutup) çok yakın olmasın ama yürünebilir mesafede dağılsın.
      const y = 0.75 - (i / Math.max(1, mix.reduce((a, [, c]) => a + c, 0))) * 1.55
      const phi = i * 2.1 + seed * 0.37
      const ring = Math.sqrt(Math.max(0, 1 - y * y))
      const dir = new Vector3(Math.cos(phi) * ring, y, Math.sin(phi) * ring).normalize()
      const obj = depositMesh(kind)
      const tangent = new Vector3(0, 1, 0).cross(dir)
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
      tangent.normalize()
      const bit = new Vector3().crossVectors(tangent, dir).normalize()
      obj.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(tangent, dir, bit))
      obj.position.copy(dir).multiplyScalar(def.radius - 0.2)
      obj.scale.setScalar(1.3)
      holder.add(obj)
      out.push({ obj, dir, kind, left, key })
    }
  }
  return out
}

/** Gezegenin kaynak türü (koloni üretimi için). */
export function planetYield(look: PlanetLook): { ore: number; crystal: number } {
  switch (look.biome) {
    case 'ice':
    case 'crystal':
    case 'purple':
      return { ore: 1, crystal: 2 }
    case 'gas':
      return { ore: 0, crystal: 1 }
    case 'lava':
    case 'dark':
    case 'gold':
      return { ore: 3, crystal: 1 }
    default:
      return { ore: 2, crystal: 0 }
  }
}
