// Gilgamesh's treasury from Fate, built once at mount: a crimson and ultramarine sky, a premium gold shader with a
// strong rim, the Gate of Babylon's rippling portals, the dark silhouettes that poke out of them (Excalibur, Gae Bolg,
// Rho Aias, Saber's helmet, Archer's bow and swords, the Holy Grail, Enkidu's chains), the Key of the Heavens, the
// Bab-ilu vault gate with its red circuitry, Ea and its red spiral wind, and the pup's armour and hair.
// Nothing allocates per frame; the move disposes every geometry and material.

import { BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, AdditiveBlending, Float32BufferAttribute, Shape, ShapeGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Path, BoxGeometry } from "three";
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
        float y = clamp(vDir.y, -0.3, 1.0);
        vec3 c = mix(vec3(0.95, 0.12, 0.2), vec3(0.62, 0.05, 0.3), smoothstep(-0.1, 0.25, y));
        c = mix(c, vec3(0.2, 0.1, 0.78), smoothstep(0.2, 0.6, y));
        c = mix(c, vec3(0.06, 0.2, 0.95), smoothstep(0.55, 1.0, y));
        float g = exp(-abs(y + 0.02) * 7.0);
        c += vec3(1.0, 0.72, 0.2) * g * 0.55;
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
        vec3 base = mix(vec3(0.42, 0.2, 0.02), vec3(1.0, 0.78, 0.22), 0.25 + 0.75 * d) * vC;
        vec3 H = normalize(L + V);
        float sp = pow(max(dot(N, H), 0.0), 36.0);
        float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
        vec3 env = mix(vec3(1.0, 0.25, 0.3), vec3(0.45, 0.65, 1.0), clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
        vec3 c = base + sp * vec3(1.0, 0.93, 0.7) * 1.3 + fr * mix(env, vec3(1.0, 0.92, 0.6), 0.55) * 1.35;
        c += vec3(1.0, 0.85, 0.4) * 0.12 * (0.5 + 0.5 * sin(uTime * 4.0 + vV.x * 9.0));
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

// ---------- the pup's Gilgamesh: slicked-back gold hair on the crown, a collar, pauldrons ----------
export function hairGeometry() {
  const parts = [];
  const cap = new SphereGeometry(1, 20, 10, 0, A, 0, 0.82).scale(0.545, 0.5, 0.525);
  parts.push(paint(clean(cap), "#c98a12", "#ffd54a", 0.5));
  const spike = (x, z, h, back, side, w = 0.1) => {
    const g = new ConeGeometry(w, h, 6).translate(0, h / 2, 0);
    paint(clean(g), "#d99a10", "#fff2a0", h);
    g.rotateZ(-side).rotateX(-back).translate(x, 0.36, z);
    parts.push(g);
  };
  // rows from the brow back over the crown: all swept up and back, the middle row tallest
  spike(0, 0.2, 0.62, 0.35, 0);
  spike(0.2, 0.15, 0.6, 0.3, 0.35);
  spike(-0.2, 0.15, 0.6, 0.3, -0.35);
  spike(0, 0.0, 0.86, 0.3, 0, 0.11);
  spike(0.24, 0.0, 0.72, 0.4, 0.5);
  spike(-0.24, 0.0, 0.72, 0.4, -0.5);
  spike(0.38, -0.05, 0.5, 0.35, 0.95, 0.08);
  spike(-0.38, -0.05, 0.5, 0.35, -0.95, 0.08);
  spike(0.12, -0.2, 0.8, 0.55, 0.15);
  spike(-0.12, -0.2, 0.8, 0.55, -0.15);
  spike(0, -0.28, 0.7, 0.7, 0);
  spike(0.3, -0.2, 0.6, 0.55, 0.6);
  spike(-0.3, -0.2, 0.6, 0.55, -0.6);
  return mergeGeometries(parts);
}
export function armourGeometry() {
  const parts = [];
  const collar = new TorusGeometry(0.47, 0.075, 12, 40).rotateX(Math.PI / 2).translate(0, -0.42, 0.02);
  parts.push(paint(clean(collar), "#a86a08", "#ffd54a", 0.4));
  const gem = new SphereGeometry(0.075, 10, 8).translate(0, -0.42, 0.5);
  parts.push(paint(clean(gem), "#ff1f3a", "#ff6a7a", 1));
  for (const s of [1, -1]) {
    const dome = new SphereGeometry(0.3, 16, 8, 0, A, 0, Math.PI / 2).scale(1, 0.75, 1).rotateZ(-0.55 * s).translate(0.58 * s, -0.52, -0.02);
    parts.push(paint(clean(dome), "#a86a08", "#ffe27a", 0.3));
    const rim = new TorusGeometry(0.3, 0.035, 8, 24).rotateX(Math.PI / 2).scale(1, 1, 1).rotateZ(-0.55 * s).translate(0.58 * s + 0.0, -0.52, -0.02);
    parts.push(paint(clean(rim), "#c98a12", "#ffe27a", 0.3));
    const horn = new ConeGeometry(0.07, 0.3, 6).translate(0, 0.15, 0).rotateZ(-1.0 * s).translate(0.8 * s, -0.42, -0.02);
    parts.push(paint(clean(horn), "#c98a12", "#fff2a0", 0.3));
  }
  return mergeGeometries(parts);
}

// ---------- the portals: instanced quads, a ripple ring shader; the opening scale lives in each instance's matrix ----------
export function portalMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
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
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vPh;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float rim = smoothstep(0.78, 0.86, r) * (1.0 - smoothstep(0.94, 1.0, r));
        float rip = 0.5 + 0.5 * sin(r * 26.0 - uTime * 5.0 + vPh * 6.28);
        float ring2 = smoothstep(0.8, 1.0, rip) * (1.0 - smoothstep(0.55, 0.78, r)) * 0.6;
        float core = (1.0 - r) * 0.5;
        vec3 gold = vec3(1.0, 0.78, 0.26);
        vec3 c = gold * (core + ring2) + mix(gold, vec3(1.0), 0.6) * rim * 1.4;
        gl_FragColor = vec4(c, 1.0);
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
        float hole = 1.0 - smoothstep(uOpen * 0.9 - 0.08, uOpen * 0.9, r);
        col = mix(col, mix(vec3(1.0, 0.82, 0.35), vec3(1.0, 0.97, 0.85), 1.0 - r), hole);
        gl_FragColor = vec4(col, 0.94);
      }`,
  });
}

// ---------- Ea: a black drill-sword, three red glowing segments that turn ----------
export function eaParts() {
  const core = new CylinderGeometry(0.07, 0.07, 1.3, 12).translate(0, 0.65, 0);
  const tip = new ConeGeometry(0.07, 0.34, 12).translate(0, 1.47, 0);
  const grip = new CylinderGeometry(0.06, 0.06, 0.22, 10).translate(0, -0.1, 0);
  // a segment: an open cylinder of 4.3 rad with a thicker lip, so its turning reads
  const seg = (h) => new CylinderGeometry(0.15, 0.15, h, 14, 1, true, 0, 4.3).translate(0, h / 2, 0);
  const glow = (h) => new CylinderGeometry(0.2, 0.2, h, 14, 1, true, 0, 4.3).translate(0, h / 2, 0);
  return { core: mergeGeometries([core, tip, grip].map(clean)), seg: seg(0.26), glow: glow(0.26) };
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
