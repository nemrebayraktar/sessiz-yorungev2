export const starVert = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 color;
varying float vPhase;
varying vec3 vColor;
void main() {
  vPhase = aPhase;
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * mv;
}
`

export const starFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uTint;
varying float vPhase;
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.02, d);
  float tw = 0.62 + 0.38 * sin(uTime * 1.15 + vPhase);
  float a = pow(core, 1.35) * tw;
  gl_FragColor = vec4(vColor * a * uTint, a);
}
`

export const nebulaVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uTint;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 2.4);
    a *= 0.5;
  }
  return s;
}
void main() {
  vec3 dir = normalize(vDir);
  float n = fbm(dir * 1.55 + vec3(uTime * 0.003, 0.0, 0.0));
  float n2 = fbm(dir * 3.2 - vec3(0.0, uTime * 0.002, 1.2));
  vec3 col = vec3(0.010, 0.012, 0.018);
  col += vec3(0.055, 0.032, 0.075) * smoothstep(0.40, 0.74, n);
  col += vec3(0.10, 0.040, 0.018) * smoothstep(0.58, 0.86, n2) * 0.55;
  float band = exp(-pow(dir.y * 3.1 + dir.x * 0.35, 2.0));
  col += vec3(0.075, 0.078, 0.095) * band * (0.30 + 0.7 * n);
  float pocket = smoothstep(0.5, 0.88, fbm(dir * 2.1 + vec3(3.0, 0.2, 1.0)));
  col += vec3(0.015, 0.035, 0.06) * pocket * 0.45;
  gl_FragColor = vec4(col * uTint, 1.0);
}
`

export const diskVert = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const diskFrag = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uAlpha;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uEdge;
varying vec2 vPos;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  float r = length(vPos);
  if (r < uInner || r > uOuter) discard;
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float ang = atan(vPos.y, vPos.x);
  float n1 = noise(vec2(cos(ang) * 2.4 + uTime * 0.22, sin(ang) * 2.4 - uTime * 0.16));
  float n2 = noise(vec2(cos(ang) * 5.5 + r * 0.04, sin(ang) * 5.5 + uTime * 0.28));
  vec3 col = mix(uHot, uMid, smoothstep(0.0, 0.42, t));
  col = mix(col, uEdge, smoothstep(0.38, 1.0, t));
  float filaments = smoothstep(0.32, 0.82, n1);
  col *= 0.42 + filaments * 0.9 + n2 * 0.22;
  float dop = 0.48 + 0.85 * pow(max(0.0, sin(ang + uTime * 0.16)), 1.35);
  col *= dop;
  float fade = smoothstep(uOuter, uOuter - 14.0, r) * smoothstep(uInner, uInner + 2.5, r);
  float alpha = fade * uAlpha * (0.28 + 0.72 * filaments);
  gl_FragColor = vec4(col * alpha, alpha);
}
`

export const shieldVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const shieldFrag = /* glsl */ `
uniform float uLevel;
uniform float uFlash;
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.1);
  float a = fres * (0.035 + uLevel * 0.11 + uFlash * 0.65);
  gl_FragColor = vec4(uColor, a);
}
`

import { Vector2, Vector3 } from 'three'

export const LensShader = {
  name: 'GravitationalLens',
  uniforms: {
    tDiffuse: { value: null as unknown },
    tDepth: { value: null as unknown },
    uResolution: { value: new Vector2(1, 1) },
    uBhUv: { value: new Vector2(0.5, 0.5) },
    uBhRadius: { value: 0.05 },
    uBhDepth: { value: 1 },
    uAspect: { value: 1 },
    uEnabled: { value: 0 },
    uStrength: { value: 6.5 },
    uTint: { value: new Vector3(1, 0.9, 0.72) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uBhUv;
    uniform float uBhRadius;
    uniform float uBhDepth;
    uniform float uAspect;
    uniform float uEnabled;
    uniform float uStrength;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      if (uEnabled < 0.5 || uBhRadius <= 0.0001) {
        gl_FragColor = base;
        return;
      }
      float depth = texture2D(tDepth, vUv).x;
      if (depth + 0.0015 < uBhDepth) {
        gl_FragColor = base;
        return;
      }
      vec2 d = vUv - uBhUv;
      d.x *= uAspect;
      float dist = length(d);
      float horizon = uBhRadius;
      if (dist < horizon) {
        float edge = smoothstep(horizon * 0.78, horizon, dist);
        vec3 col = vec3(1.0, 0.78, 0.48) * edge * 0.55;
        gl_FragColor = vec4(col, 1.0);
        return;
      }
      float fall = horizon * horizon * uStrength;
      float deflection = fall / max(dist, 0.0004);
      deflection = min(deflection, dist * 0.92);
      vec2 dir = d / max(dist, 0.0001);
      vec2 offset = dir * deflection;
      offset.x /= uAspect;
      vec2 uv2 = clamp(vUv + offset, 0.001, 0.999);
      vec3 col = texture2D(tDiffuse, uv2).rgb;
      float red = smoothstep(horizon * 3.4, horizon * 1.05, dist);
      col = mix(col, col * vec3(1.05, 0.42, 0.16), red * 0.55);
      float photon = horizon * 1.58;
      float ring = exp(-pow((dist - photon) / max(horizon * 0.085, 0.0018), 2.0));
      float ring2 = exp(-pow((dist - horizon * 1.18) / max(horizon * 0.035, 0.0012), 2.0));
      col += vec3(1.35, 1.15, 0.9) * uTint * ring * 0.95;
      col += vec3(1.1, 0.55, 0.22) * uTint * ring2 * 0.55;
      float shadow = smoothstep(horizon, horizon * 1.22, dist);
      col *= mix(0.15, 1.0, shadow);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}
