import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  DodecahedronGeometry,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  RingGeometry,
  type Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'

/* Zamanla güncellenen görsel efektler: yetenekler (deprem yarıkları, fırlayan kayalar, kubbeler, ışık sütunları,
   kristal fırtınası, şok dalgası), patlamalar (parça, duman, ışık), roket duman izi. Hepsi tek listede,
   her karede `update(dt)` ile ilerler ve ömrü bitince sahneden silinir. */

type Item = { obj: Group | Mesh | Sprite; t: number; life: number; tick: (k: number, dt: number) => void; mats: Material[]; geos: BufferGeometry[] }

let smokeTex: CanvasTexture | null = null
function smoke() {
  if (smokeTex) return smokeTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  smokeTex = new CanvasTexture(c)
  return smokeTex
}

const tmp = new Vector3()
const tmp2 = new Vector3()

export class Fx {
  private items: Item[] = []
  private scene: Scene
  constructor(scene: Scene) {
    this.scene = scene
  }

  private push(obj: Group | Mesh | Sprite, life: number, tick: Item['tick'], mats: Material[], geos: BufferGeometry[]) {
    this.scene.add(obj)
    this.items.push({ obj, t: 0, life, tick, mats, geos })
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]
      it.t += dt
      const k = it.t / it.life
      if (k >= 1) {
        it.obj.removeFromParent()
        for (const m of it.mats) m.dispose()
        for (const g of it.geos) g.dispose()
        this.items.splice(i, 1)
        continue
      }
      it.tick(k, dt)
    }
  }

  get count() {
    return this.items.length
  }

  private glow(color: number, opacity = 1, k = 1.6) {
    const m = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
    m.toneMapped = false
    return m
  }

  /** Yüzeyde genişleyen ince halka (şok dalgası). */
  ring(at: Vector3, up: Vector3, color: number, radius: number, life = 0.6, width = 0.08) {
    const geo = new RingGeometry(1 - width, 1, 64)
    const mat = this.glow(color, 0.9, 1.2)
    const m = new Mesh(geo, mat)
    m.position.copy(at).addScaledVector(up, 0.3)
    m.lookAt(tmp.copy(m.position).add(up))
    this.push(m, life, (k) => {
      m.scale.setScalar(0.5 + k * radius)
      mat.opacity = 0.9 * (1 - k) * (1 - k)
    }, [mat], [geo])
  }

  /** Yerden yükselen ışık sütunu (hava desteği, altın hale). */
  column(at: Vector3, up: Vector3, color: number, height: number, radius: number, life = 0.7) {
    const geo = new CylinderGeometry(radius, radius * 1.4, height, 16, 1, true)
    geo.translate(0, height / 2, 0)
    const mat = this.glow(color, 0.8, 1.5)
    const m = new Mesh(geo, mat)
    m.position.copy(at)
    m.quaternion.setFromUnitVectors(tmp.set(0, 1, 0), up)
    this.push(m, life, (k) => {
      m.scale.set(1 - k * 0.6, Math.min(1, k * 6), 1 - k * 0.6)
      mat.opacity = 0.8 * (1 - k)
    }, [mat], [geo])
  }

  /** Saydam kubbe (zırh kabuğu, kalkan). Hedefi izlemek için `follow` konumu her karede okunur. */
  dome(follow: Vector3, up: Vector3, color: number, radius: number, life: number) {
    const geo = new SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const mat = this.glow(color, 0.35, 1.2)
    const m = new Mesh(geo, mat)
    const upc = up.clone()
    this.push(m, life, (k) => {
      m.position.copy(follow)
      m.quaternion.setFromUnitVectors(tmp.set(0, 1, 0), upc)
      const pulse = 0.85 + Math.sin(k * life * 9) * 0.08
      mat.opacity = 0.35 * pulse * (k > 0.85 ? (1 - k) / 0.15 : Math.min(1, k * 8))
      m.scale.setScalar(k < 0.1 ? k * 10 : 1)
    }, [mat], [geo])
  }

  /** Genişleyen küre dalgası (zihin dalgası). */
  wave(at: Vector3, color: number, radius: number, life = 0.7) {
    const geo = new SphereGeometry(1, 24, 14)
    const mat = this.glow(color, 0.45, 1.3)
    const m = new Mesh(geo, mat)
    m.position.copy(at)
    this.push(m, life, (k) => {
      m.scale.setScalar(0.5 + k * radius)
      mat.opacity = 0.45 * (1 - k)
    }, [mat], [geo])
  }

  /** Yerde ışıyan yarıklar (deprem). */
  cracks(at: Vector3, up: Vector3, color: number, radius: number, life = 1.6) {
    const g = new Group()
    const mat = this.glow(color, 1, 1.8)
    const geos: BufferGeometry[] = []
    g.position.copy(at).addScaledVector(up, 0.08)
    g.quaternion.setFromUnitVectors(tmp.set(0, 1, 0), up)
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4
      let px = 0
      let pz = 0
      const segs = 4
      for (let s = 0; s < segs; s++) {
        const len = (radius / segs) * (0.7 + Math.random() * 0.6)
        const ang = a + (Math.random() - 0.5) * 0.8
        const geo = new BoxGeometry(0.22, 0.05, len)
        geos.push(geo)
        const m = new Mesh(geo, mat)
        m.position.set(px + Math.cos(ang) * len * 0.5, 0, pz + Math.sin(ang) * len * 0.5)
        m.rotation.y = -ang + Math.PI / 2
        g.add(m)
        px += Math.cos(ang) * len
        pz += Math.sin(ang) * len
      }
    }
    this.push(g, life, (k) => {
      g.scale.setScalar(Math.min(1, k * 5))
      mat.opacity = k < 0.6 ? 1 : (1 - k) / 0.4
    }, [mat], geos)
  }

  /** Fırlayan parçalar: kaya, kristal ya da metal; yerçekimiyle düşer, döner. */
  debris(at: Vector3, up: Vector3, color: number, count: number, speed: number, life = 1.3, kind: 'rock' | 'crystal' | 'metal' = 'rock', glow = false) {
    const g = new Group()
    const geo = kind === 'crystal' ? new OctahedronGeometry(0.3, 0) : kind === 'metal' ? new BoxGeometry(0.35, 0.12, 0.5) : new DodecahedronGeometry(0.35, 0)
    const mat = glow ? this.glow(color, 1, 1.4) : new MeshStandardMaterial({ color, roughness: kind === 'metal' ? 0.4 : 0.9, metalness: kind === 'metal' ? 0.6 : 0, flatShading: true, emissive: color, emissiveIntensity: 0.25 })
    const parts: { m: Mesh; v: Vector3; r: Vector3 }[] = []
    const upc = up.clone()
    for (let i = 0; i < count; i++) {
      const m = new Mesh(geo, mat)
      m.position.copy(at)
      m.scale.setScalar(0.5 + Math.random() * 1.1)
      // Rastgele yön: yukarı ağırlıklı yarım küre.
      tmp.set(Math.random() - 0.5, 0, Math.random() - 0.5)
      tmp.addScaledVector(upc, -tmp.dot(upc))
      const v = tmp.normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.7)).addScaledVector(upc, speed * (0.6 + Math.random() * 0.8))
      parts.push({ m, v, r: new Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) })
      g.add(m)
    }
    this.push(g, life, (k, dt) => {
      for (const p of parts) {
        p.v.addScaledVector(upc, -speed * 2.2 * dt)
        p.m.position.addScaledVector(p.v, dt)
        p.m.rotation.x += p.r.x * dt
        p.m.rotation.y += p.r.y * dt
        p.m.rotation.z += p.r.z * dt
      }
      if (k > 0.75) {
        const s = (1 - k) / 0.25
        for (const p of parts) p.m.scale.multiplyScalar(0.9 + s * 0.1)
      }
    }, [mat], [geo])
  }

  /** Duman/toz bulutu: büyüyen, yükselen, sönen puflar. */
  puff(at: Vector3, color: number, count: number, size: number, life = 1.2, rise?: Vector3, additive = false) {
    const g = new Group()
    const mats: Material[] = []
    const parts: { s: Sprite; v: Vector3; m: SpriteMaterial; base: number }[] = []
    for (let i = 0; i < count; i++) {
      const m = new SpriteMaterial({ map: smoke(), color, transparent: true, opacity: 0.6, depthWrite: false, blending: additive ? AdditiveBlending : undefined })
      if (additive) m.toneMapped = false
      mats.push(m)
      const s = new Sprite(m)
      s.position.copy(at).add(tmp2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(size * 0.6))
      const base = size * (0.6 + Math.random() * 0.8)
      s.scale.setScalar(base)
      const v = tmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(size * 0.9).clone()
      if (rise) v.addScaledVector(rise, size * 0.8)
      parts.push({ s, v, m, base })
      g.add(s)
    }
    this.push(g, life, (k, dt) => {
      for (const p of parts) {
        p.s.position.addScaledVector(p.v, dt)
        p.v.multiplyScalar(1 - dt * 1.5)
        p.s.scale.setScalar(p.base * (1 + k * 1.8))
        p.m.opacity = 0.6 * (1 - k)
      }
    }, mats, [])
  }

  /** Kısa, parlak patlama ışığı. */
  flash(at: Vector3, color: number, size: number, life = 0.25) {
    const m = new SpriteMaterial({ map: smoke(), color: new Color(color).multiplyScalar(2), transparent: true, depthWrite: false, blending: AdditiveBlending })
    m.toneMapped = false
    const s = new Sprite(m)
    s.position.copy(at)
    this.push(s, life, (k) => {
      s.scale.setScalar(size * (0.6 + k * 1.2))
      m.opacity = 1 - k
    }, [m], [])
  }

  /** Büyük patlama: ışık + ateş + duman + parçalar. */
  explosion(at: Vector3, color: number, size: number, up = new Vector3(0, 1, 0)) {
    this.flash(at, 0xfff0d0, size * 3, 0.22)
    this.puff(at, color, 6, size * 1.2, 0.5, undefined, true)
    this.puff(at, 0x2a2622, 7, size * 1.4, 1.6, up)
    this.debris(at, up, 0x3a3634, Math.round(4 + size * 3), size * 7, 1.2, 'metal')
  }
}
