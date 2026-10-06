// SAKUGA: the timing and the hand-drawn effects.
//   step(t, fps)    characters and FX animate on twos/threes, t_c = floor(t fps) / fps;
//                   the camera and the composite run at the display rate.
//   Impact          frame-locked impact sequences (two-tone, inverted, swapped), no easing.
//   Trauma          shake = T^2 A noise(t f), T decaying linearly.
//   energyMaterial  scrolling 3D noise posterised to three hard tones (core / mid / edge)
//                   with an ink outline where the alpha crosses the edge; re-randomised every
//                   step so it boils like redrawn cels. The core is emissive (> 1) and blooms.
//   bolt / boltGeometry  midpoint-displacement lightning, offsets +-r 2^(-k H) over 5 levels,
//                   drawn as a camera-facing ribbon: white core, coloured body, ink edge, no fade.
//   snowMaterial    round point sprites with an ink rim.
import { BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from "three";

export const step = (t, fps = 12) => Math.floor(t * fps) / fps;
export const ease3 = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

// sequences are [mode, frames at 24 fps]; mode 1 two-tone, 2 inverted, 3 two-tone swapped
export class Impact {
  constructor() { this.t0 = -1e9; this.seq = []; }
  fire(t, seq = [[1, 2], [2, 1], [3, 2]]) { this.t0 = t; this.seq = seq; }
  mode(t) {
    let f = Math.floor((t - this.t0) * 24);
    if (f < 0) return 0;
    for (const [m, n] of this.seq) { if (f < n) return m; f -= n; }
    return 0;
  }
}

const n1 = (x) => { const i = Math.floor(x), f = x - i, h = (k) => { const s = Math.sin(k * 127.1) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return h(i) * (1 - u) + h(i + 1) * u - 0.5; };
export class Trauma {
  constructor(amp = 0.25, freq = 22, decay = 1.6) { this.T = 0; this.amp = amp; this.freq = freq; this.decay = decay; }
  add(x) { this.T = Math.min(1, this.T + x); }
  update(dt) { this.T = Math.max(0, this.T - this.decay * dt); }
  offset(t, out = new Vector3()) { const s = this.T * this.T * this.amp; return out.set(n1(t * this.freq) * s, n1(t * this.freq + 31.4) * s, n1(t * this.freq + 77.7) * s * 0.5); }
}

const NOISE = /* glsl */ `
  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p) { return vn(p) * 0.55 + vn(p * 2.1) * 0.3 + vn(p * 4.3) * 0.15; }`;

export function energyMaterial(o = {}) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uFps: { value: o.fps ?? 12 }, uScale: { value: o.scale ?? 2.5 }, uSpeed: { value: o.speed ?? 1.5 },
      uCore: { value: new Color(o.core ?? "#ffffff") }, uMid: { value: new Color(o.mid ?? "#5ab8ff") }, uEdge: { value: new Color(o.edge ?? "#1d4fd8") }, uInk: { value: new Color(o.ink ?? "#0a1240") },
      uEmit: { value: o.emit ?? 2.2 }, uCut: { value: o.cut ?? 0.0 }, uFire: { value: o.fire ?? 0 }, uDisp: { value: o.disp ?? 0.12 },
    },
    vertexShader: /* glsl */ `${NOISE}
      uniform float uTime; uniform float uFps; uniform float uScale; uniform float uSpeed; uniform float uDisp; uniform float uFire;
      varying vec3 vOP; varying vec3 vN; varying vec3 vV; varying float vSeed;
      void main() {
        float st = floor(uTime * uFps); float t = st / uFps;
        vec3 p = position;
        float d = fbm(p * uScale * 0.8 + vec3(st * 1.37, -t * uSpeed, st * 0.71)) - 0.5;
        p += normal * d * uDisp * (1.0 + uFire * max(0.0, p.y) * 3.0);
        vOP = position; vSeed = st;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `${NOISE}
      uniform float uTime; uniform float uFps; uniform float uScale; uniform float uSpeed; uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uEdge; uniform vec3 uInk;
      uniform float uEmit; uniform float uCut; uniform float uFire;
      varying vec3 vOP; varying vec3 vN; varying vec3 vV; varying float vSeed;
      void main() {
        float t = vSeed / uFps;
        float n = fbm(vOP * uScale + vec3(vSeed * 3.1, -t * uSpeed * 2.0, vSeed * 1.7));
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float a = facing * 0.75 + n * 0.55 - 0.2 - uCut - uFire * max(0.0, vOP.y) * 0.6;
        if (a < 0.30) discard;
        vec3 c = a > 0.70 ? uCore * uEmit : (a > 0.52 ? uMid * 1.25 : uEdge);
        if (a < 0.355) c = uInk;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// midpoint displacement between a and b; returns Vector3[] (2^levels + 1 points)
export function bolt(a, b, levels = 5, H = 0.8, r = 0.35, rnd = Math.random) {
  let pts = [a.clone(), b.clone()];
  const side = new Vector3();
  for (let k = 0; k < levels; k++) {
    const next = [pts[0]];
    const amp = r * 2 ** (-k * H);
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5);
      side.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(2 * amp);
      next.push(m.add(side), pts[i + 1]);
    }
    pts = next;
  }
  return pts;
}

// camera-facing ribbon through pts; uv.y in [-1, 1] across
export function boltGeometry(pts, eye, width = 0.06, geo = new BufferGeometry()) {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = [];
  const d = new Vector3(), v = new Vector3(), s = new Vector3();
  for (let i = 0; i < n; i++) {
    d.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    v.subVectors(eye, pts[i]).normalize();
    s.crossVectors(d, v).normalize().multiplyScalar(width * (1 - 0.6 * (i / (n - 1)) ** 2));
    pos.set([pts[i].x + s.x, pts[i].y + s.y, pts[i].z + s.z, pts[i].x - s.x, pts[i].y - s.y, pts[i].z - s.z], i * 6);
    uv.set([i / (n - 1), 1, i / (n - 1), -1], i * 4);
    if (i < n - 1) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

export function boltMaterial(col = "#7fd4ff", ink = "#0a1240") {
  return new ShaderMaterial({
    uniforms: { uCol: { value: new Color(col) }, uInk: { value: new Color(ink) } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uCol; uniform vec3 uInk; varying vec2 vUv;
      void main() { float a = abs(vUv.y); vec3 c = a < 0.38 ? vec3(2.6) : (a < 0.8 ? uCol * 1.6 : uInk); gl_FragColor = vec4(c, 1.0); }`,
    side: 2,
  });
}

export function snowMaterial(size = 0.06, col = "#ffffff", ink = "#7a8fc4") {
  return new ShaderMaterial({
    uniforms: { uSize: { value: size }, uH: { value: 800 }, uCol: { value: new Color(col) }, uInk: { value: new Color(ink) } },
    vertexShader: "uniform float uSize; uniform float uH; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(uSize * uH / -mv.z, 1.5, 24.0); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uCol; uniform vec3 uInk; void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(r > 0.36 ? uInk : min(uCol, vec3(0.9)), 1.0); }",
  });
}
