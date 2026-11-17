// Sky dome, gold, portal ripples, silhouettes and the Key for pr-polychrom-79, ported from components/world/cutscene/moves/pr-polychrom-79/world.js.
// Solids write alpha 0.99, see-through portals are premultiplied, the glow is additive; the sky band is capped by uCap (-0.3 keeps the lowest crimson band).

import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Path, Shape, ShapeGeometry, ShaderMaterial, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAL } from "../pal.js";

const A = Math.PI * 2;
const clean = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (n.attributes.uv) n.deleteAttribute("uv");
  return n;
};

export function skyMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uCap: { value: -0.3 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uCap;
      varying vec3 vDir;
      void main() {
        float y = floor(min(clamp(vDir.y, -0.3, 1.0), uCap) * 7.0) / 7.0;
        vec3 c = mix(vec3(0.42, 0.001, 0.091), vec3(0.22, 0.02, 0.28), smoothstep(-0.2, 0.1, y));
        c = mix(c, vec3(0.05, 0.05, 0.5), smoothstep(0.05, 0.35, y));
        c = mix(c, vec3(0.02, 0.06, 0.6), smoothstep(0.3, 0.8, y));
        vec2 q = vDir.xz / max(0.25, 0.4 + vDir.y) * 18.0;
        float st = fract(sin(dot(floor(q), vec2(127.1, 311.7))) * 43758.5453);
        float tw = step(0.965, st) * (0.5 + 0.5 * sin(uTime * 3.0 + st * 60.0));
        c += vec3(1.0, 0.9, 0.6) * tw * smoothstep(0.0, 0.3, y);
        vec2 uv = vDir.xz / (abs(vDir.y) + 0.3) * 2.6 + vec2(0.0, uTime * 0.05);
        vec2 id = floor(uv);
        vec2 lp = fract(uv) - 0.5;
        float h = fract(sin(dot(id, vec2(41.7, 289.3))) * 9371.13);
        lp += (vec2(fract(h * 7.1), fract(h * 3.7)) - 0.5) * 0.25;
        float op = smoothstep(h * 6.0, h * 6.0 + 1.5, uTime);
        float rr = 0.34 * op * (1.0 + 0.05 * sin(uTime * 3.0 + h * 30.0));
        float d = length(lp);
        float ring = step(abs(d - rr), 0.03) * step(0.01, op);
        float tip = smoothstep(0.03, 0.0, abs(lp.x)) * step(0.0, lp.y) * step(lp.y, 0.34 * op * 1.3) * op;
        vec3 gold = vec3(0.85, 0.64, 0.25);
        c = mix(c, vec3(0.1, 0.02, 0.04), tip);
        c = mix(c, gold, ring);
        gl_FragColor = vec4(c, 0.99);
      }`,
  });
}

export function goldMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uBoost: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vC;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        vC = color;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBoost;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vC;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vV + vec3(0.0, 0.0, 1e-4));
        if (!gl_FrontFacing) N = -N;
        vec3 L = normalize(vec3(0.45, 0.8, 0.6));
        float d = max(dot(N, L), 0.0);
        vec3 base = (d > 0.42 ? vec3(1.0, 0.8, 0.26) : vec3(0.62, 0.36, 0.05)) * vC;
        vec3 H = normalize(L + V);
        float sp = pow(max(dot(N, H), 0.0), 36.0);
        float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
        vec3 env = mix(vec3(1.0, 0.25, 0.3), vec3(0.45, 0.65, 1.0), clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
        vec3 c = base + step(0.9, sp) * vec3(0.3, 0.25, 0.1);
        c = mix(c, vec3(0.16, 0.04, 0.03), step(0.8, 1.0 - clamp(dot(N, V), 0.0, 1.0)));
        gl_FragColor = vec4(c * uBoost, 0.99);
      }`,
  });
}

export function paint(g, lo, hi = lo, span = 1) {
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  const a = new Color(lo);
  const b = new Color(hi);
  const k = new Color();
  for (let i = 0; i < p.count; i++) {
    k.copy(a).lerp(b, Math.min(1, Math.max(0, p.getY(i) / span)));
    c.set([k.r, k.g, k.b], i * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  if (g.attributes.uv) g.deleteAttribute("uv");
  return g;
}

export function portalMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uGain: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vPh;
      void main() {
        vUv = uv;
        vPh = fract(sin(instanceMatrix[3].x * 12.9 + instanceMatrix[3].y * 78.2) * 43758.5);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uGain;
      varying vec2 vUv;
      varying float vPh;
      float edge(float x, float e) { float w = min(fwidth(x), 0.004); return smoothstep(e - w, e + w, x); }
      void main() {
        vec2 q = vUv - 0.5;
        float r = length(q) * 2.0;
        if (r > 0.90) discard;
        vec3 deep = vec3(0.85, 0.5, 0.06);
        vec3 gold = vec3(1.0, 0.8, 0.25);
        vec3 c = mix(deep, gold, step(0.5, fract(r * 5.0)));
        c = mix(c, vec3(1.0, 0.96, 0.78), 1.0 - edge(r, 0.12));
        float line = edge(r, 0.3) * (1.0 - edge(r, 0.33)) + edge(r, 0.86) * (1.0 - edge(r, 0.9));
        c = mix(c, vec3(0.2, 0.05, 0.04), clamp(line, 0.0, 1.0));
        gl_FragColor = vec4(c * uGain, 0.99);
      }`,
  });
}

const poly = (pts, holes = []) => {
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  for (const h of holes) {
    const p = new Path();
    h.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    s.holes.push(p);
  }
  return new ShapeGeometry(s);
};
const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const ell = (cx, cy, rx, ry, n = 14, rot = 0) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * A;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return p;
};
const mirror = (half) => [...half, ...[...half].reverse().map(([x, y]) => [-x, y])];

export const SIL_KINDS = 7;
export function silhouetteGeometries() {
  const merge = (list) => mergeGeometries(list.map(clean));
  const excalibur = merge([poly(ell(0, 0.02, 0.045, 0.045, 10)), rect(-0.016, 0.04, 0.016, 0.22), poly([[-0.2, 0.21], [-0.12, 0.2], [0.12, 0.2], [0.2, 0.21], [0.15, 0.27], [0.03, 0.245], [-0.03, 0.245], [-0.15, 0.27]]), poly([[-0.048, 0.245], [0.048, 0.245], [0.04, 0.9], [0, 1.0], [-0.04, 0.9]])]);
  const gae = merge([rect(-0.012, 0, 0.012, 0.7), poly([[-0.012, 0.7], [-0.08, 0.74], [-0.03, 0.79], [-0.085, 0.86], [-0.025, 0.9], [0, 1.0], [0.025, 0.9], [0.085, 0.86], [0.03, 0.79], [0.08, 0.74], [0.012, 0.7]])]);
  const petals = [];
  for (let k = 0; k < 7; k++) {
    const a = (k - 3) * 0.4;
    petals.push(poly(ell(Math.sin(a) * 0.32, 0.2 + Math.cos(a) * 0.32, 0.09, 0.22, 14, -a)));
  }
  petals.push(poly(ell(0, 0.08, 0.1, 0.1, 12)));
  const rho = merge(petals);
  const helm = merge([
    poly(mirror([[0.0, 0.52], [0.12, 0.5], [0.2, 0.42], [0.24, 0.28], [0.24, 0.06], [0.17, -0.02], [0.08, -0.05]]).slice(0, 14), [[[-0.17, 0.2], [0.17, 0.2], [0.17, 0.26], [-0.17, 0.26]]]),
    poly([[-0.025, 0.5], [0, 0.78], [0.025, 0.5]]),
    poly([[0.23, 0.3], [0.46, 0.5], [0.4, 0.28]]),
    poly([[-0.23, 0.3], [-0.46, 0.5], [-0.4, 0.28]]),
  ]);
  const arc = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => [Math.cos(a0 + ((a1 - a0) * i) / n) * r - r + 0.3, 0.5 + Math.sin(a0 + ((a1 - a0) * i) / n) * r]);
  const bowOut = arc(0.6, -1.0, 1.0, 12);
  const bowIn = arc(0.56, -1.0, 1.0, 12).reverse();
  const sword = (ang) => poly([[-0.02, 0.0], [0.02, 0.0], [0.03, 0.4], [0.0, 0.5], [-0.02, 0.4]].map(([x, y]) => [x * Math.cos(ang) - y * Math.sin(ang) + 0.3, x * Math.sin(ang) + y * Math.cos(ang) - 0.1]));
  const archer = merge([poly([...bowOut, ...bowIn]), rect(0.2, 0.02, 0.215, 0.98), sword(0.5), sword(-0.5)]);
  const grail = merge([poly(mirror([[0.0, 0.62], [0.18, 0.62], [0.22, 0.5], [0.16, 0.34], [0.06, 0.26], [0.035, 0.17], [0.035, 0.08], [0.15, 0.04]]).slice(0, 16)), rect(-0.18, 0, 0.18, 0.05), poly(ell(0.25, 0.5, 0.05, 0.08, 8)), poly(ell(-0.25, 0.5, 0.05, 0.08, 8))]);
  const links = [];
  for (let i = 0; i < 6; i++) {
    const wide = i % 2 === 0;
    const rx = wide ? 0.05 : 0.02;
    links.push(poly(ell(0, 0.08 + i * 0.12, rx, 0.085, 12), [ell(0, 0.08 + i * 0.12, rx * 0.5, 0.05, 10)]));
  }
  links.push(poly([[-0.05, 0.8], [0, 1.0], [0.05, 0.8]]));
  const chain = merge(links);
  return [excalibur, gae, rho, helm, archer, grail, chain];
}

export function keyGeometry() {
  const p = [];
  p.push(paint(clean(new TorusGeometry(0.2, 0.05, 10, 28).translate(0, 0.78, 0)), PAL.keyDk, PAL.keyLt, 0.2));
  p.push(paint(clean(new TorusGeometry(0.09, 0.03, 8, 20).translate(0, 0.78, 0.0)), PAL.keyMid, PAL.keyPale, 0.2));
  p.push(paint(clean(new CylinderGeometry(0.045, 0.045, 0.7, 10).translate(0, 0.32, 0)), PAL.keyDk, PAL.keyLt, 0.7));
  p.push(paint(clean(new BoxGeometry(0.22, 0.07, 0.07).translate(0.1, 0.1, 0)), PAL.keyMid, PAL.keyLt, 0.2));
  p.push(paint(clean(new BoxGeometry(0.16, 0.07, 0.07).translate(0.08, 0.24, 0)), PAL.keyMid, PAL.keyLt, 0.2));
  p.push(paint(clean(new ConeGeometry(0.08, 0.16, 6).translate(0, -0.06, 0).rotateX(Math.PI)), PAL.keyMid, PAL.keyPale, 0.2));
  return mergeGeometries(p);
}

export function glowMaterial(color = PAL.glow, fill = true) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    uniforms: { uC: { value: new Color(color) }, uK: { value: 1 }, uF: { value: fill ? 1 : 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC;
      uniform float uK;
      uniform float uF;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float on = step(0.001, uK);
        float ring = step(abs(r - 0.62), 0.03) * on;
        float a = max((1.0 - step(0.62, r)) * uF * on, ring);
        vec3 c = mix(uC, vec3(0.949, 0.788, 0.298), ring);
        gl_FragColor = vec4(c, 0.99) * a;
      }`,
  });
}
