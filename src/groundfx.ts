import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Group,
  type Object3D,
} from 'three'
import { glowTexture } from './meshes'

/* Yüzey dövüşünün görsel geri bildirimi: vuruşta beyaz/kırmızı parlama, kıvılcım,
   mermi izi ve yumruk savurması. Hepsi küçük, önceden kurulmuş havuzlardır. */

type Saved = { mat: MeshStandardMaterial; color: Color; intensity: number }

export class RigFlash {
  private items = new Map<Object3D, { saved: Saved[]; t: number }>()

  flash(root: Object3D, hex: number, dur = 0.16) {
    let item = this.items.get(root)
    if (!item) {
      const saved: Saved[] = []
      root.traverse((obj) => {
        const mat = (obj as Mesh).material as MeshStandardMaterial | undefined
        if (mat && mat.isMeshStandardMaterial && !saved.some((s) => s.mat === mat)) {
          saved.push({ mat, color: mat.emissive.clone(), intensity: mat.emissiveIntensity })
        }
      })
      item = { saved, t: 0 }
      this.items.set(root, item)
    }
    item.t = dur
    for (const s of item.saved) {
      s.mat.emissive.setHex(hex)
      s.mat.emissiveIntensity = 2.2
    }
  }

  update(dt: number) {
    for (const [root, item] of this.items) {
      item.t -= dt
      if (item.t > 0) continue
      for (const s of item.saved) {
        s.mat.emissive.copy(s.color)
        s.mat.emissiveIntensity = s.intensity
      }
      this.items.delete(root)
    }
  }

  forget(root: Object3D) {
    this.items.delete(root)
  }

  clear() {
    this.items.clear()
  }
}

type Spark = { sprite: Sprite; mat: SpriteMaterial; vel: Vector3; life: number; max: number; size: number }

export class Sparks {
  private pool: Spark[] = []

  constructor(parent: Object3D, count = 48) {
    for (let i = 0; i < count; i++) {
      const mat = new SpriteMaterial({
        map: glowTexture(),
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0,
      })
      mat.toneMapped = false
      const sprite = new Sprite(mat)
      sprite.visible = false
      parent.add(sprite)
      this.pool.push({ sprite, mat, vel: new Vector3(), life: 0, max: 1, size: 1 })
    }
  }

  burst(pos: Vector3, hex: number, count: number, speed: number, size: number, up?: Vector3) {
    let made = 0
    for (const s of this.pool) {
      if (s.life > 0) continue
      s.life = s.max = 0.28 + Math.random() * 0.22
      s.size = size * (0.6 + Math.random() * 0.8)
      s.sprite.position.copy(pos)
      s.sprite.visible = true
      s.mat.color.setHex(hex)
      s.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()))
      if (up) s.vel.addScaledVector(up, speed * 0.6)
      if (++made >= count) break
    }
  }

  update(dt: number) {
    for (const s of this.pool) {
      if (s.life <= 0) continue
      s.life -= dt
      if (s.life <= 0) {
        s.sprite.visible = false
        s.mat.opacity = 0
        continue
      }
      const k = s.life / s.max
      s.sprite.position.addScaledVector(s.vel, dt)
      s.vel.multiplyScalar(Math.exp(-3 * dt))
      s.sprite.scale.setScalar(s.size * (0.4 + k))
      s.mat.opacity = k
    }
  }

  clear() {
    for (const s of this.pool) {
      s.life = 0
      s.sprite.visible = false
    }
  }
}

type Tracer = { mesh: Mesh; mat: MeshBasicMaterial; life: number; max: number }

export class Tracers {
  private pool: Tracer[] = []
  private geo = new BoxGeometry(1, 1, 1)

  constructor(parent: Object3D, count = 18) {
    for (let i = 0; i < count; i++) {
      const mat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
      mat.toneMapped = false
      const mesh = new Mesh(this.geo, mat)
      mesh.visible = false
      mesh.frustumCulled = false
      parent.add(mesh)
      this.pool.push({ mesh, mat, life: 0, max: 1 })
    }
  }

  fire(from: Vector3, to: Vector3, hex: number, width = 0.12, life = 0.14) {
    const t = this.pool.find((x) => x.life <= 0) ?? this.pool[0]
    t.life = t.max = life
    t.mat.color.setHex(hex)
    t.mat.opacity = 1
    const len = Math.max(0.01, from.distanceTo(to))
    t.mesh.position.copy(from).add(to).multiplyScalar(0.5)
    t.mesh.scale.set(width, width, len)
    t.mesh.lookAt(to)
    t.mesh.visible = true
  }

  update(dt: number) {
    for (const t of this.pool) {
      if (t.life <= 0) continue
      t.life -= dt
      if (t.life <= 0) {
        t.mesh.visible = false
        continue
      }
      t.mat.opacity = t.life / t.max
    }
  }

  clear() {
    for (const t of this.pool) {
      t.life = 0
      t.mesh.visible = false
    }
  }
}

/* Yumruk savurması: oyuncunun önünde kısa süre beliren parlak yay. */
export class Swing {
  private mesh: Mesh
  private mat: MeshBasicMaterial
  private t = 0
  private dur = 0.22

  constructor(parent: Group) {
    this.mat = new MeshBasicMaterial({
      color: 0xffe2b0,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    this.mat.toneMapped = false
    this.mesh = new Mesh(new RingGeometry(0.85, 1.7, 20, 1, -Math.PI / 2 - Math.PI * 0.46, Math.PI * 0.92), this.mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.set(0, 0.05, 0.3) // gövde ortası: ayaklar kökün 1,05 altında
    this.mesh.visible = false
    parent.add(this.mesh)
  }

  play(hit: boolean) {
    this.t = this.dur
    this.mat.color.setHex(hit ? 0xfff0c0 : 0xffd2a0)
    this.mesh.visible = true
  }

  update(dt: number) {
    if (this.t <= 0) return
    this.t -= dt
    if (this.t <= 0) {
      this.mesh.visible = false
      return
    }
    const k = 1 - this.t / this.dur
    this.mesh.rotation.z = (0.8 - 1.6 * k) * 1
    this.mat.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.9
    this.mesh.scale.setScalar(0.9 + k * 0.5)
  }
}
