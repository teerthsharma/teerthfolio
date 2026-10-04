// Gilgamesh's treasury from Fate, built once at mount: a crimson and ultramarine sky, a premium gold shader with a
// strong rim, the Gate of Babylon's rippling portals, the dark silhouettes that poke out of them (Excalibur, Gae Bolg,
// Rho Aias, Saber's helmet, Archer's bow and swords, the Holy Grail, Enkidu's chains), the Key of the Heavens, the
// Bab-ilu vault gate with its red circuitry, Ea and its red spiral wind, and the pup's armour and hair.
// Nothing allocates per frame; the move disposes every geometry and material.

import { BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, AdditiveBlending, Float32BufferAttribute, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Path, BoxGeometry, OctahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const A = Math.PI * 2;

// ---------- the sky: deep crimson to ultramarine, a gold glow low down, drifting gold dust ----------
export function skyMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDir;
      void main() {
        float y = floor(clamp(vDir.y, -0.3, 1.0) * 7.0) / 7.0;
        vec3 c = mix(vec3(0.42, 0.01, 0.1), vec3(0.22, 0.02, 0.28), smoothstep(-0.2, 0.1, y));
        c = mix(c, vec3(0.05, 0.05, 0.5), smoothstep(0.05, 0.35, y));
        c = mix(c, vec3(0.02, 0.06, 0.6), smoothstep(0.3, 0.8, y));
        float g = exp(-abs(y + 0.05) * 14.0);
        c += vec3(1.0, 0.62, 0.12) * g * 0.25;
        vec2 q = vDir.xz / max(0.25, 0.4 + vDir.y) * 18.0;
        float st = fract(sin(dot(floor(q), vec2(127.1, 311.7))) * 43758.5453);
        float tw = step(0.965, st) * (0.5 + 0.5 * sin(uTime * 3.0 + st * 60.0));
        c += vec3(1.0, 0.9, 0.6) * tw * smoothstep(0.0, 0.3, y);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// ---------- gold: a fake PBR (a key light, a broad specular, a strong rim in warm white); vertex colour is the base ----------
export function goldMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
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
        
        gl_FragColor = vec4(c * uBoost, 1.0);
      }`,
  });
}

// y-gradient vertex colour; every geometry that wears the gold material needs a colour attribute
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
const clean = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (n.attributes.uv) n.deleteAttribute("uv");
  return n;
};

// ---------- the pup's Gilgamesh: slicked-back gold locks lying on the skull, a thin collar, layered pauldrons ----------
const GOLD_LO = "#c9962b";
const GOLD_HI = "#f2c94c";
const SK = [0.56, 0.52, 0.54];
// one tapered, flattened lock swept from the hairline over the crown; its tip lifts up and back. f = side (-1..1), t0/t1 = start/end angle from the crown (+ is forward)
function lock(f, t0, t1, wMax, lift, n = 18) {
  const L = f * 0.95;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const t = t0 + (t1 - t0) * u;
    const dx = Math.sin(L) * (0.55 + 0.45 * Math.cos(t * 0.9));
    const dy = Math.cos(t) * Math.cos(L * 0.6);
    const dz = Math.sin(t) * Math.cos(L);
    const m = Math.hypot(dx, dy, dz);
    const d = [dx / m, dy / m, dz / m];
    const k = 1.03 + 0.05 * Math.sin(Math.PI * u) + lift * Math.max(0, u - 0.6) ** 2 * 5;
    pts.push({ d, c: [d[0] * SK[0] * k, d[1] * SK[1] * k + lift * Math.max(0, u - 0.6) ** 2 * 1.4, d[2] * SK[2] * k], w: wMax * Math.max(0, Math.sin(Math.PI * Math.min(1, 0.22 + u * 0.78))) ** 0.8 * (1 - u * 0.9) });
  }
  const seg = 8;
  const pos = [];
  const col = [];
  const idx = [];
  const lo = new Color(GOLD_LO);
  const hi = new Color(GOLD_HI);
  const k2 = new Color();
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)].c;
    const b = pts[Math.min(n, i + 1)].c;
    const T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(...T) || 1;
    T[0] /= tl; T[1] /= tl; T[2] /= tl;
    const N = p.d;
    const B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
    k2.copy(lo).lerp(hi, Math.min(1, i / n + 0.15));
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * A;
      const cx = Math.cos(th) * p.w * 2.1;
      const cy = Math.sin(th) * p.w * 1.1;
      pos.push(p.c[0] + B[0] * cx + N[0] * cy, p.c[1] + B[1] * cx + N[1] * cy, p.c[2] + B[2] * cx + N[2] * cy);
      col.push(k2.r, k2.g, k2.b);
    }
  });
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      idx.push(a, b, a + seg, b, b + seg, a + seg);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}
export function hairGeometry() {
  const parts = [];
  const cap = new SphereGeometry(1, 20, 10, 0, A, 0, 0.8).scale(SK[0] * 1.01, SK[1] * 1.01, SK[2] * 1.01);
  parts.push(paint(clean(cap), GOLD_LO, GOLD_HI, 0.5));
  // seven long locks: centre pair longest, outer ones hug the temples; all end swept up and back
  for (const [f, t1, w, lf] of [[0, -2.3, 0.075, 0.5], [-0.38, -2.25, 0.07, 0.5], [0.38, -2.25, 0.07, 0.5], [-0.7, -2.1, 0.06, 0.4], [0.7, -2.1, 0.06, 0.4], [-0.95, -1.9, 0.05, 0.3], [0.95, -1.9, 0.05, 0.3]]) parts.push(lock(f, 0.75, t1, w, lf));
  // two short front tufts lifting off the hairline
  for (const f of [-0.18, 0.18]) parts.push(lock(f, 1.05, 0.35, 0.05, 0.6, 10));
  return mergeGeometries(parts);
}
export function armourGeometry() {
  const parts = [];
  const gold = (g, a = GOLD_LO, b = GOLD_HI, span = 0.3) => paint(clean(g), a, b, span);
  parts.push(gold(new TorusGeometry(0.42, 0.028, 8, 48).rotateX(Math.PI / 2).translate(0, -0.36, 0), GOLD_LO, GOLD_HI, 0.4));
  // geometric trim: small diamonds around the collar ring
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * A;
    parts.push(gold(new OctahedronGeometry(0.03).scale(1, 0.7, 1).translate(Math.sin(a) * 0.42, -0.36, Math.cos(a) * 0.42), GOLD_LO, GOLD_HI, 1));
  }
  // one small red gem on the collar at the throat
  parts.push(paint(clean(new SphereGeometry(0.04, 10, 8).translate(0, -0.37, 0.435)), "#d3122e", "#ff4a5a", 1));
  parts.push(gold(new CylinderGeometry(0.035, 0.05, 0.02, 4).rotateX(Math.PI / 2).translate(0, -0.37, 0.43), GOLD_LO, GOLD_HI, 1));
  // pauldrons: three layered angular plates per shoulder, each smaller and lower, sharp edges
  for (const s of [1, -1]) {
    for (let j = 0; j < 3; j++) {
      const r = 0.2 - j * 0.045;
      const plate = new CylinderGeometry(r * 0.7, r, 0.025, 4).scale(1.35, 1, 0.8).rotateY(Math.PI / 4).rotateZ(-(0.5 + j * 0.12) * s).translate((0.5 + j * 0.1) * s, -0.4 - j * 0.1, -0.03);
      parts.push(gold(plate, GOLD_LO, GOLD_HI, 1));
    }
    parts.push(gold(new ConeGeometry(0.03, 0.2, 4).rotateZ(-1.1 * s).translate(0.74 * s, -0.42, -0.03), GOLD_LO, GOLD_HI, 0.2));
  }
  return mergeGeometries(parts);
}

// ---------- the portals: instanced quads, a ripple ring shader; the opening scale lives in each instance's matrix ----------
export function portalMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vPh;
      void main() {
        vUv = uv;
        vPh = fract(sin(instanceMatrix[3].x * 12.9 + instanceMatrix[3].y * 78.2) * 43758.5);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    // a gold gate: a bright white-gold core, radial ripples travelling outward, gold sparkles, a soft gold glow past the rim
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vPh;
      void main() {
        vec2 q = vUv - 0.5;
        float r = length(q) * 2.0;
        if (r > 1.0) discard;
        float ang = atan(q.y, q.x);
        float core = pow(max(1.0 - r / 0.42, 0.0), 1.6);
        float rip = pow(0.5 + 0.5 * sin(r * 22.0 - uTime * 4.0 + vPh * 6.28), 3.0) * smoothstep(0.95, 0.35, r);
        float rim = smoothstep(0.62, 0.7, r) * (1.0 - smoothstep(0.76, 0.84, r));
        float glow = pow(max(1.0 - r, 0.0), 2.0) * 0.55;
        float sp = pow(max(0.0, sin(ang * 9.0 + uTime * 1.5 + vPh * 9.0) * sin(r * 30.0 - uTime * 3.0)), 14.0) * smoothstep(0.2, 0.5, r);
        vec3 deep = vec3(0.85, 0.5, 0.06);
        vec3 gold = vec3(1.0, 0.8, 0.25);
        vec3 wg = vec3(1.0, 0.96, 0.78);
        float band = step(0.5, rip);
        vec3 c = mix(deep, gold, band);
        c = mix(c, wg, step(r, 0.3));
        c = mix(c, vec3(0.2, 0.05, 0.04), smoothstep(0.86, 0.9, r) * step(r, 0.97) + step(0.3, r) * step(r, 0.33));
        c = mix(c, wg, step(0.93, sp));
        float a = step(r, 0.97);
        gl_FragColor = vec4(c, a);
      }`,
  });
}

// ---------- the silhouettes: flat dark shapes pointing +y from their base at the origin, one nominal metre long ----------
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
  // 0 Excalibur: pommel, grip, a winged crossguard, a long blade
  const excalibur = merge([poly(ell(0, 0.02, 0.045, 0.045, 10)), rect(-0.016, 0.04, 0.016, 0.22), poly([[-0.2, 0.21], [-0.12, 0.2], [0.12, 0.2], [0.2, 0.21], [0.15, 0.27], [0.03, 0.245], [-0.03, 0.245], [-0.15, 0.27]]), poly([[-0.048, 0.245], [0.048, 0.245], [0.04, 0.9], [0, 1.0], [-0.04, 0.9]])]);
  // 1 Gae Bolg: a barbed crimson spear, reduced to its dark outline
  const gae = merge([rect(-0.012, 0, 0.012, 0.7), poly([[-0.012, 0.7], [-0.08, 0.74], [-0.03, 0.79], [-0.085, 0.86], [-0.025, 0.9], [0, 1.0], [0.025, 0.9], [0.085, 0.86], [0.03, 0.79], [0.08, 0.74], [0.012, 0.7]])]);
  // 2 Rho Aias: seven petals fanned like a flower
  const petals = [];
  for (let k = 0; k < 7; k++) {
    const a = (k - 3) * 0.4;
    petals.push(poly(ell(Math.sin(a) * 0.32, 0.2 + Math.cos(a) * 0.32, 0.09, 0.22, 14, -a)));
  }
  petals.push(poly(ell(0, 0.08, 0.1, 0.1, 12)));
  const rho = merge(petals);
  // 3 Saber's helmet: a dome with cheek guards, a visor slit, a crest and swept wings
  const helm = merge([
    poly(mirror([[0.0, 0.52], [0.12, 0.5], [0.2, 0.42], [0.24, 0.28], [0.24, 0.06], [0.17, -0.02], [0.08, -0.05]]).slice(0, 14), [[[-0.17, 0.2], [0.17, 0.2], [0.17, 0.26], [-0.17, 0.26]]]),
    poly([[-0.025, 0.5], [0, 0.78], [0.025, 0.5]]),
    poly([[0.23, 0.3], [0.46, 0.5], [0.4, 0.28]]),
    poly([[-0.23, 0.3], [-0.46, 0.5], [-0.4, 0.28]]),
  ]);
  // 4 Archer's bow and his twin swords crossed under it
  const arc = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => [Math.cos(a0 + ((a1 - a0) * i) / n) * r - r + 0.3, 0.5 + Math.sin(a0 + ((a1 - a0) * i) / n) * r]);
  const bowOut = arc(0.6, -1.0, 1.0, 12);
  const bowIn = arc(0.56, -1.0, 1.0, 12).reverse();
  const sword = (ang) => poly([[-0.02, 0.0], [0.02, 0.0], [0.03, 0.4], [0.0, 0.5], [-0.02, 0.4]].map(([x, y]) => [x * Math.cos(ang) - y * Math.sin(ang) + 0.3, x * Math.sin(ang) + y * Math.cos(ang) - 0.1]));
  const archer = merge([poly([...bowOut, ...bowIn]), rect(0.2, 0.02, 0.215, 0.98), sword(0.5), sword(-0.5)]);
  // 5 the Holy Grail
  const grail = merge([poly(mirror([[0.0, 0.62], [0.18, 0.62], [0.22, 0.5], [0.16, 0.34], [0.06, 0.26], [0.035, 0.17], [0.035, 0.08], [0.15, 0.04]]).slice(0, 16)), rect(-0.18, 0, 0.18, 0.05), poly(ell(0.25, 0.5, 0.05, 0.08, 8)), poly(ell(-0.25, 0.5, 0.05, 0.08, 8))]);
  // 6 Enkidu's chains: alternating links ending in a spearhead
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

// ---------- the Key of the Heavens ----------
export function keyGeometry() {
  const p = [];
  p.push(paint(clean(new TorusGeometry(0.2, 0.05, 10, 28).translate(0, 0.78, 0)), "#a86a08", "#ffe27a", 0.2));
  p.push(paint(clean(new TorusGeometry(0.09, 0.03, 8, 20).translate(0, 0.78, 0.0)), "#c98a12", "#fff2a0", 0.2));
  p.push(paint(clean(new CylinderGeometry(0.045, 0.045, 0.7, 10).translate(0, 0.32, 0)), "#a86a08", "#ffe27a", 0.7));
  p.push(paint(clean(new BoxGeometry(0.22, 0.07, 0.07).translate(0.1, 0.1, 0)), "#c98a12", "#ffe27a", 0.2));
  p.push(paint(clean(new BoxGeometry(0.16, 0.07, 0.07).translate(0.08, 0.24, 0)), "#c98a12", "#ffe27a", 0.2));
  p.push(paint(clean(new ConeGeometry(0.08, 0.16, 6).translate(0, -0.06, 0).rotateX(Math.PI)), "#c98a12", "#fff2a0", 0.2));
  return mergeGeometries(p);
}

// ---------- the vault gate (Bab-ilu): a gold ring, red circuit lines spreading out from the middle as uSpread rises ----------
export function gateMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uSpread: { value: 0 }, uOpen: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSpread;
      uniform float uOpen;
      uniform float uTime;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        // circuit: cells with a trace along one axis, 45 degree bends, nodes at the corners
        vec2 g = p * 9.0;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float hh = h(id);
        float tr = hh < 0.5 ? smoothstep(0.07, 0.03, abs(f.y)) : smoothstep(0.07, 0.03, abs(f.x));
        float dg = hh > 0.82 ? smoothstep(0.07, 0.03, abs(abs(f.x) - abs(f.y))) : 0.0;
        float nd = smoothstep(0.14, 0.1, length(f)) * step(0.7, h(id + 7.0));
        float line = max(max(tr, dg), nd) * step(0.2, h(id + 3.0));
        float front = uSpread * 1.15;
        float reach = 1.0 - smoothstep(front - 0.12, front, r);
        float pulse = 0.65 + 0.35 * sin(r * 14.0 - uTime * 6.0);
        vec3 col = vec3(0.35, 0.02, 0.1) * 0.9;
        col += vec3(1.0, 0.1, 0.18) * line * reach * pulse * 1.6;
        float rim = smoothstep(0.9, 0.95, r) * (1.0 - smoothstep(0.985, 1.0, r));
        col = mix(col, vec3(1.0, 0.8, 0.3), rim);
        // opening: the middle blazes gold-white and the iris widens
        float hole = 1.0 - smoothstep(uOpen * 0.62 - 0.08, uOpen * 0.62, r);
        col = mix(col, mix(vec3(1.0, 0.5, 0.08), vec3(1.0, 0.8, 0.3), 1.0 - r), hole);
        gl_FragColor = vec4(col, 0.94);
      }`,
  });
}

// ---------- Ea: a black hilt with a gold guard, three stacked cylinders with red glowing runes, a blunt drill tip ----------
export function eaParts() {
  const rod = new CylinderGeometry(0.045, 0.045, 1.4, 10).translate(0, 0.7, 0);
  const grip = new CylinderGeometry(0.06, 0.07, 0.34, 10).translate(0, 0.05, 0);
  const pommel = new SphereGeometry(0.09, 10, 8).translate(0, -0.14, 0);
  const tip = new CylinderGeometry(0.035, 0.13, 0.24, 12).translate(0, 1.5, 0);
  const guard = mergeGeometries([paint(clean(new BoxGeometry(0.46, 0.05, 0.1).translate(0, 0.25, 0)), GOLD_LO, GOLD_HI, 1), paint(clean(new BoxGeometry(0.1, 0.09, 0.1).translate(0, 0.27, 0)), GOLD_LO, GOLD_HI, 1)]);
  const seg = new CylinderGeometry(0.14, 0.14, 0.3, 16, 1, false).translate(0, 0.15, 0);
  const glow = new CylinderGeometry(0.19, 0.19, 0.3, 16, 1, true).translate(0, 0.15, 0);
  return { core: mergeGeometries([rod, grip, pommel, tip].map(clean)), guard, seg, glow };
}
// the rune cylinder: dark metal with red glowing glyph lines that turn with the segment
export function runeMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.0;
        float v = abs(fract(a) - 0.5);
        float l1 = smoothstep(0.07, 0.02, v);
        float d = abs(fract(a * 0.5 + vUv.y * 3.0) - 0.5);
        float l2 = smoothstep(0.06, 0.015, d);
        float ring = smoothstep(0.06, 0.02, min(vUv.y, 1.0 - vUv.y));
        float L = max(max(l1, l2), ring);
        vec3 c = mix(vec3(0.04, 0.015, 0.025), vec3(1.0, 0.12, 0.2) * (1.3 + 0.3 * sin(uTime * 8.0)), L);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// the spiral wind: an open cone from the sword tip, red and white stripes turning round its axis (+y is its length; the move lays it down)
export function windMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uK;
      varying vec2 vUv;
      void main() {
        float a = vUv.x * 6.28318;
        float s = sin(5.0 * (a + vUv.y * 7.0 - uTime * 16.0));
        float band = smoothstep(0.35, 0.95, s);
        float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        vec3 c = mix(vec3(0.95, 0.06, 0.14), vec3(1.0, 0.75, 0.55), band * band) * (0.35 + band * 1.2);
        gl_FragColor = vec4(c * fade * uK, 1.0);
      }`,
  });
}
export const windGeometry = () => new CylinderGeometry(2.7, 0.14, 15, 40, 20, true).translate(0, 7.5, 0);

// a soft gold glow quad for the pup's rim light and the key's halo
export function glowMaterial(color = "#ffc34a") {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uC: { value: new Color(color) }, uK: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC;
      uniform float uK;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = pow(max(1.0 - r, 0.0), 2.0);
        gl_FragColor = vec4(uC * a * uK, 1.0);
      }`,
  });
}
export const discGeometry = () => new CircleGeometry(1, 40);
export { BufferGeometry };
