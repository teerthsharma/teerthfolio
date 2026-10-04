// THE MANGA INK DIMENSION (Jujutsu Kaisen, Shibuya): one shader look for every solid.
// Heavy black ink, screentone dots, hatching and cross-hatching, a paper ground, and ONE accent
// colour (blood red). Every surface is drawn by the same fragment: lighting is reduced to a tone,
// the tone becomes dots, then hatching, then cross-hatching, then solid black; each polygon carries
// its own distances to its edges so its outline is inked in the fragment (no extra pass).
// The Mesher builds the geometry (convex polygons with per-vertex edge distances, face uv in
// metres, an info quad: kind, tone, accent, seed; and a slide vector + start time for slabs that
// slide apart on a cut). Frame of everything here: the move's city group.

import { BufferGeometry, Float32BufferAttribute, Matrix4, Euler, ShaderMaterial, Vector3 } from "three";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// kinds (info.x)
export const K = { solid: 0, window: 1, screen: 2, sign: 3, roof: 4, wood: 5, bone: 6, ice: 7, cut: 8, flat: 9, throat: 10, lacquer: 11 };

const BIG = 1e4;
const NOMOVE = [0, 0, 0, 1];
const A = new Vector3();
const B = new Vector3();
const N = new Vector3();
const U = new Vector3();
const W = new Vector3();
const M4 = new Matrix4();
const EU = new Euler();

export class Mesher {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.edge = [];
    this.uv = [];
    this.info = [];
    this.move = [];
    this.tris = 0;
  }

  // a convex polygon (3 or 4 vertices, arrays [x,y,z]). inside: a point the face looks away from.
  // hide: bitmask of edges (edge i runs vs[i] to vs[i+1]) that are not inked.
  poly(vs, info, mv = NOMOVE, hide = 0, inside = null) {
    const n = vs.length;
    if (n > 4) throw new Error("poly: at most 4 vertices");
    let v = vs;
    A.set(...v[1]).sub(B.set(...v[0]));
    N.set(...v[n - 1]).sub(B.set(...v[0]));
    N.crossVectors(A, N);
    if (n === 4) {
      A.set(...v[2]).sub(B.set(...v[0]));
      W.set(...v[3]).sub(B.set(...v[1]));
      N.crossVectors(A, W);
    }
    if (N.lengthSq() < 1e-14) return;
    N.normalize();
    if (inside) {
      B.set(0, 0, 0);
      for (const p of v) B.add(W.set(...p));
      B.multiplyScalar(1 / n).sub(W.set(...inside));
      if (N.dot(B) < 0) {
        v = [...vs].reverse();
        N.negate();
        // reversing flips which edge is which
        const h = hide;
        hide = 0;
        for (let i = 0; i < n; i++) if (h & (1 << i)) hide |= 1 << ((n - 2 - i + n) % n);
      }
    }
    // face uv in metres: walls run along the horizon and up; floors and roofs along x and z
    if (Math.abs(N.y) < 0.9) {
      U.set(N.z, 0, -N.x).normalize();
      W.crossVectors(N, U);
    } else {
      U.set(1, 0, 0);
      W.set(0, 0, 1);
    }
    const dist = (p, i) => {
      A.set(...v[(i + 1) % n]).sub(B.set(...v[i]));
      A.normalize();
      const q = new Vector3(...p).sub(B);
      return q.sub(A.multiplyScalar(q.dot(A))).length();
    };
    const verts = v.map((p, j) => {
      const e = [BIG, BIG, BIG, BIG];
      for (let i = 0; i < n; i++) if (!(hide & (1 << i))) e[i] = dist(p, i);
      return { p, e, uv: [new Vector3(...p).dot(U), new Vector3(...p).dot(W)], j };
    });
    for (let i = 1; i < n - 1; i++) {
      for (const k of [0, i, i + 1]) {
        const q = verts[k];
        this.pos.push(...q.p);
        this.nor.push(N.x, N.y, N.z);
        this.edge.push(...q.e);
        this.uv.push(...q.uv);
        this.info.push(...info);
        this.move.push(...mv);
      }
      this.tris++;
    }
  }

  // a triangle fan round a centre (a cap with more than four sides): only the rim is inked
  fan(vs, c, info, mv = NOMOVE, inside = null) {
    for (let i = 0; i < vs.length; i++) this.poly([c, vs[i], vs[(i + 1) % vs.length]], info, mv, 0b101, inside);
  }

  // an eight-corner solid: c[0..3] the bottom ring, c[4..7] the top ring above it (same order)
  hexa(c, info, mv = NOMOVE, hideAll = 0) {
    const mid = [0, 1, 2].map((a) => c.reduce((s, p) => s + p[a], 0) / 8);
    const f = (...ix) => ix.map((i) => c[i]);
    const inf = (k) => (typeof info === "function" ? info(k) : info);
    this.poly(f(0, 1, 2, 3), inf(0), mv, hideAll, mid);
    this.poly(f(4, 5, 6, 7), inf(1), mv, hideAll, mid);
    this.poly(f(0, 1, 5, 4), inf(2), mv, hideAll, mid);
    this.poly(f(1, 2, 6, 5), inf(3), mv, hideAll, mid);
    this.poly(f(2, 3, 7, 6), inf(4), mv, hideAll, mid);
    this.poly(f(3, 0, 4, 7), inf(5), mv, hideAll, mid);
  }

  // a box of size (sx, sy, sz) centred at (x, y, z), turned by (rx, ry, rz) about its centre
  box(x, y, z, sx, sy, sz, info, mv = NOMOVE, rot = [0, 0, 0], hideAll = 0) {
    EU.set(rot[0], rot[1], rot[2], "YXZ");
    M4.makeRotationFromEuler(EU).setPosition(x, y, z);
    const c = [];
    for (const k of [0, 1]) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.push(W.set((a * sx) / 2, (k ? 1 : -1) * (sy / 2), (b * sz) / 2).applyMatrix4(M4).toArray());
    this.hexa(c, info, mv, hideAll);
  }

  // a pyramid on a quad base (vs, CCW from outside the base's back) with its apex
  pyramid(base, apex, info, mv = NOMOVE, capped = true) {
    const mid = [0, 1, 2].map((a) => (base.reduce((s, p) => s + p[a], 0) + apex[a]) / (base.length + 1));
    for (let i = 0; i < base.length; i++) this.poly([base[i], base[(i + 1) % base.length], apex], info, mv, 0b100, mid);
    if (capped) this.poly(base, info, mv, 0, mid);
  }

  // a tube along a path (arrays [x,y,z]) with a radius at each point; `sides` 4..6; ends in a point if the last radius is 0
  tube(path, radii, info, mv = NOMOVE, sides = 4) {
    const up = new Vector3(0, 1, 0);
    const rings = [];
    let prevX = null;
    path.forEach((p, i) => {
      const d = new Vector3(...path[Math.min(i + 1, path.length - 1)]).sub(new Vector3(...path[Math.max(i - 1, 0)])).normalize();
      let x = new Vector3().crossVectors(d, Math.abs(d.y) > 0.95 ? new Vector3(1, 0, 0) : up).normalize();
      if (prevX && x.dot(prevX) < 0) x.negate();
      prevX = x;
      const y = new Vector3().crossVectors(d, x).normalize();
      const r = radii[i];
      const ring = [];
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 + Math.PI / 4;
        ring.push(new Vector3(...p).addScaledVector(x, Math.cos(a) * r).addScaledVector(y, Math.sin(a) * r).toArray());
      }
      rings.push(ring);
    });
    const mid = (a, b) => [0, 1, 2].map((k) => (a.reduce((s, q) => s + q[k], 0) + b.reduce((s, q) => s + q[k], 0)) / (a.length + b.length));
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i];
      const b = rings[i + 1];
      const m = mid(a, b);
      for (let s = 0; s < sides; s++) {
        const s2 = (s + 1) % sides;
        if (radii[i + 1] < 1e-4) this.poly([a[s], a[s2], b[0]], info, mv, 0b100, m);
        else this.poly([a[s], a[s2], b[s2], b[s]], info, mv, 0, m);
      }
    }
    const a = rings[0];
    this.poly(a.slice(0, 4), info, mv, 0, mid(a, rings[1]));
  }

  // a tiled roof: a rectangle of w x d at height y0, rising to `rise` at the ridge along z... a heightfield with upturned corners
  roof(w, d, y0, rise, curl, thick, info, nx = 14, nz = 8, mv = NOMOVE) {
    const h = (x, z) => {
      const ex = Math.abs(x) / (w / 2); // 0 centre .. 1 eave (left/right)
      const ez = Math.abs(z) / (d / 2); // 0 ridge line .. 1 eave (front/back)
      const slope = (1 - ez ** 1.25) * rise; // the ridge runs along x
      const corner = (Math.max(0, ex - 0.62) / 0.38) ** 2 * (0.35 + 0.65 * ez) * curl; // the ends and corners kick up
      const edge = (Math.max(0, ez - 0.78) / 0.22) ** 2 * curl * 0.55 * (0.4 + 0.6 * ex); // the long eaves lift a little too
      return y0 + slope + corner + edge;
    };
    const P = (i, j) => {
      const x = (i / nx - 0.5) * w;
      const z = (j / nz - 0.5) * d;
      return [x, h(x, z), z];
    };
    const mid = [0, y0 - 2, 0];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        let hide = 0b1111;
        if (j === 0) hide &= ~0b0001;
        if (i === nx - 1) hide &= ~0b0010;
        if (j === nz - 1) hide &= ~0b0100;
        if (i === 0) hide &= ~0b1000;
        const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
        // the top, then the thick underside (lower by `thick`, flat)
        this.poly(q, info, mv, hide, mid);
        const lo = q.map((p) => [p[0], p[1] - thick - 0.35 * (1 - Math.abs(p[0]) / (w / 2)), p[2]]);
        this.poly([lo[3], lo[2], lo[1], lo[0]], [info[0] === K.roof ? K.wood : info[0], 0.1, 0, info[3]], mv, hide, [0, y0 + rise + 3, 0]);
      }
    }
    // the eave faces: a band round the edge so the roof has thickness
    for (let i = 0; i < nx; i++) {
      for (const j of [0, nz]) {
        const a = P(i, j);
        const b = P(i + 1, j);
        const sgn = j ? 1 : -1;
        this.poly([[a[0], a[1] - thick - 0.35 * (1 - Math.abs(a[0]) / (w / 2)), a[2]], [b[0], b[1] - thick - 0.35 * (1 - Math.abs(b[0]) / (w / 2)), b[2]], b, a], [K.wood, 0.1, 0, info[3]], mv, 0b0111, [a[0], a[1], a[2] - sgn * 4]);
      }
    }
    for (let j = 0; j < nz; j++) {
      for (const i of [0, nx]) {
        const a = P(i, j);
        const b = P(i, j + 1);
        const sgn = i ? 1 : -1;
        this.poly([[a[0], a[1] - thick - 0.35 * (1 - Math.abs(a[0]) / (w / 2)), a[2]], [b[0], b[1] - thick - 0.35 * (1 - Math.abs(b[0]) / (w / 2)), b[2]], b, a], [K.wood, 0.1, 0, info[3]], mv, 0b0111, [a[0] - sgn * 4, a[1], a[2]]);
      }
    }
    return h;
  }

  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nor, 3));
    g.setAttribute("aEdge", new Float32BufferAttribute(this.edge, 4));
    g.setAttribute("aUV", new Float32BufferAttribute(this.uv, 2));
    g.setAttribute("aInfo", new Float32BufferAttribute(this.info, 4));
    g.setAttribute("aMove", new Float32BufferAttribute(this.move, 4));
    g.computeBoundingSphere();
    return g;
  }
}

// ---------------------------------------------------------------------------------------------
// THE SHADER

const PAPER = "vec3(0.925, 0.9, 0.835)";
const INKC = "vec3(0.055, 0.045, 0.05)";
const REDC = "vec3(0.80, 0.04, 0.09)";

export const INK_LIB = /* glsl */ `
  #define PAPER ${PAPER}
  #define INK ${INKC}
  #define RED ${REDC}
  uniform float uT, uDpr, uReveal, uSkyK, uOffA, uOffB, uPoolR, uDis, uLineW, uGlowK;
  uniform vec3 uCenter, uMouth, uPoolC;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  float lineM(float u, float w, float aa) { float d = abs(fract(u + 0.5) - 0.5); return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d); }
  // ink for a tone v (1 paper .. 0 black) at css-pixel position f: x is dots and hatch lines, y is the solid black
  vec2 inkCov(float v, vec2 f, float ang) {
    float cov = clamp(1.0 - v, 0.0, 1.0);
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * f / 5.0;
    float d = length(fract(p) - 0.5);
    float rad = 0.64 * sqrt(clamp((cov - 0.06) / 0.5, 0.0, 1.0));
    float aaD = 0.5 / (5.0 * uDpr) * 1.4 + 0.02;
    float dots = (1.0 - smoothstep(rad - aaD, rad + aaD, d)) * (1.0 - smoothstep(0.5, 0.64, cov));
    float c = cos(ang), s = sin(ang);
    float u1 = dot(f, vec2(c, s)) / 4.6;
    float u2 = dot(f, vec2(-s, c)) / 4.6;
    float aa = 0.5 / (4.6 * uDpr) * 1.4 + 0.02;
    float hatch = lineM(u1, clamp((cov - 0.4) * 1.5, 0.0, 0.6), aa) * smoothstep(0.4, 0.46, cov);
    float cross_ = lineM(u2, clamp((cov - 0.6) * 1.7, 0.0, 0.55), aa) * smoothstep(0.6, 0.66, cov);
    float solid = smoothstep(0.85, 0.95, cov);
    return vec2(max(max(dots, hatch), cross_), solid);
  }
  // 0 inside the pool, drawn in ink
  float poolAt(vec2 w) { return step(distance(w, uPoolC.xz) + (vn(w * 0.25) - 0.5) * 7.0, uPoolR); }
`;

const VERT = /* glsl */ `
  attribute vec4 aEdge;
  attribute vec2 aUV;
  attribute vec4 aInfo;
  attribute vec4 aMove;
  uniform float uT;
  varying vec3 vW;
  varying vec3 vN;
  varying vec4 vEdge;
  varying vec2 vUV;
  varying vec4 vInfo;
  varying vec3 vLit;
  void main() {
    vec4 lp = vec4(position, 1.0);
    vec3 ln = normal;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp;
      ln = mat3(instanceMatrix) * ln;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vLit = instanceColor;
    #else
      vLit = vec3(0.0);
    #endif
    // a slab slides apart along its cut: eased out, or (flag 100) accelerating like a fall
    float fall = step(100.0, aMove.w);
    float t0 = aMove.w - 100.0 * fall;
    float k = clamp((uT - t0) / mix(0.55, 1.1, fall), 0.0, 1.0);
    float e = mix(1.0 - pow(1.0 - k, 3.0), k * k, fall);
    lp.xyz += aMove.xyz * e;
    vec4 wp = modelMatrix * lp;
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * ln);
    vEdge = aEdge;
    vUV = aUV;
    vInfo = aInfo;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FRAG = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying vec4 vEdge;
  varying vec2 vUV;
  varying vec4 vInfo;
  varying vec3 vLit;
  ${INK_LIB}
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 V = normalize(cameraPosition - vW);
    float kind = floor(vInfo.x + 0.5);
    float tone = vInfo.y;
    float acc = vInfo.z;
    float seed = vInfo.w;
    vec2 fc = gl_FragCoord.xy / uDpr;

    // THE PICTURE DRAWS IN from the pup outward, tall things last, with an inked line on the wipe's edge
    float grow = uReveal - distance(vW.xz, uCenter.xz) + (vn(vW.xz * 0.22) - 0.5) * 14.0;
    float up = grow * 1.1 + 0.4 - vW.y;
    if (grow < 0.0 || up < 0.0) discard;
    float wipe = 1.0 - smoothstep(0.0, 1.0, min(grow, up));

    #ifdef SHRINE
      float dn = vn(vW.xy * 0.5 + vW.z * 0.3) * 0.7 + vn(vW.xz * 1.9) * 0.3;
      if (dn < uDis) discard;
      float burn = 1.0 - smoothstep(0.0, 0.06, dn - uDis);
    #endif

    // light: a key, the red glow of the shrine, the red sky from below, a rim
    vec3 keyD = normalize(vec3(-0.5, 0.62, 0.6));
    float key = max(dot(n, keyD), 0.0);
    vec3 toM = uMouth - vW;
    float dM = length(toM);
    toM /= dM;
    float glow = max(dot(n, toM), 0.0) * (1.0 - smoothstep(20.0, 160.0, dM)) * uSkyK;
    float down = max(-n.y, 0.0) * uSkyK;
    float rimF = pow(1.0 - max(dot(n, V), 0.0), 2.6);
    float L = 0.2 + 0.52 * key + 0.62 * glow + 0.2 * max(n.y, 0.0);
    float v = clamp(tone * L * 1.3 + rimF * 0.28 * uSkyK * (kind == 4.0 || kind == 5.0 || kind == 6.0 || kind == 11.0 ? 1.0 : 0.0), 0.0, 1.0);
    float ang = 0.55 + 0.95 * n.x - 0.5 * n.y;
    float redK = clamp(max(down * 1.3, glow * 0.85) + acc * 0.9, 0.0, 1.0);
    vec3 paper = PAPER * (0.965 + 0.07 * vn(fc * 0.55));
    vec3 inkC = mix(INK, RED, redK);
    float inkEdge = 1.0;
    vec3 col = paper;

    float off = uOffA + seed * uOffB;
    float alive = step(uT, off);
    float flick = smoothstep(0.0, 0.55, off - uT);

    if (kind == 1.0) {
      vec2 g = vec2(vUV.x / 3.2, vUV.y / 3.6);
      vec2 id = floor(g), f = fract(g);
      float inW = step(abs(f.x - 0.5), 0.3) * step(abs(f.y - 0.52), 0.3);
      vec2 ic = inkCov(v, fc, ang);
      col = mix(paper, inkC, ic.x);
      col = mix(col, INK, ic.y);
      if (inW > 0.5) {
        float hs = h21(id + seed * 37.0);
        float lit = step(0.4, hs) * alive * mix(step(0.5, fract(sin(uT * 41.0 + hs * 50.0) * 437.0)), 1.0, flick);
        vec3 wc = lit > 0.5 ? paper * 1.04 : INK;
        float mull = max(step(abs(f.x - 0.5), 0.028), step(abs(f.y - 0.52), 0.026));
        wc = mix(wc, INK, mull);
        float glint = lineM((f.x + f.y) * 3.2, 0.14, 0.06) * step(f.x, 0.62) * (1.0 - lit);
        wc = mix(wc, PAPER, glint * 0.55);
        col = wc;
      }
    } else if (kind == 2.0) {
      float ed = min(min(vEdge.x, vEdge.y), min(vEdge.z, vEdge.w));
      float sc = uT * 0.9 + seed * 17.0;
      vec2 g = vec2(vUV.x / 2.4 + sc, vUV.y / 1.6);
      vec2 id = floor(g), f = fract(g);
      float hs = h21(id + seed * 13.0);
      float inset = step(0.1, f.x) * step(f.x, 0.9) * step(0.12, f.y) * step(f.y, 0.88);
      vec3 cc = paper;
      if (hs < 0.28) cc = paper;
      else if (hs < 0.5) cc = INK;
      else if (hs < 0.68) { vec2 ic = inkCov(0.5, fc, 0.8); cc = mix(paper, INK, ic.x); }
      else if (hs < 0.82) cc = RED;
      else { vec2 ic = inkCov(0.7, fc, -0.8); cc = mix(paper, INK, ic.x); }
      float bar = lineM(vUV.y / 0.5, 0.12, 0.05) * step(0.5, h21(id + 4.0));
      cc = mix(cc, hs < 0.5 && hs > 0.28 ? paper : INK, bar * 0.8);
      col = mix(paper * 0.9, cc, inset);
      float live = alive * mix(step(0.45, fract(sin(uT * 53.0 + seed * 91.0) * 437.0)), 1.0, flick);
      float scan = lineM(fc.y / 3.0, 0.45, 0.1);
      col = mix(mix(INK, INK + vec3(0.06), scan), col, live);
      col = mix(col, INK, 1.0 - smoothstep(0.28, 0.4, ed));
      col = mix(col, RED, (1.0 - smoothstep(0.1, 0.18, abs(ed - 0.52))) * 0.0);
    } else if (kind == 3.0) {
      float cell = floor(vUV.y / 1.7);
      float hs = h21(vec2(cell, seed * 31.0));
      float f = fract(vUV.y / 1.7);
      vec3 cc;
      if (hs < 0.3) cc = mix(paper, INK, lineM(vUV.x * 1.4 + f * 0.0, 0.5, 0.06) + lineM(f * 4.0, 0.2, 0.06));
      else if (hs < 0.55) cc = mix(RED, INK, lineM(vUV.x * 2.2 + vUV.y * 2.2, 0.28, 0.06));
      else if (hs < 0.8) { vec2 ic = inkCov(0.42, fc, 0.7); cc = mix(paper, INK, ic.x); }
      else cc = INK;
      cc = mix(cc, INK, step(f, 0.05));
      float live = alive * mix(step(0.45, fract(sin(uT * 47.0 + seed * 71.0) * 437.0)), 1.0, flick);
      col = mix(INK, cc, live);
    } else if (kind == 4.0) {
      vec2 ic = inkCov(v, fc, ang);
      col = mix(paper, inkC, ic.x);
      col = mix(col, INK, ic.y);
      float aa = 0.04;
      float row = lineM(vUV.y / 0.8, 0.07, aa);
      float tile = lineM(vUV.x / 0.8 + floor(vUV.y / 0.8) * 0.5, 0.06, aa);
      col = mix(col, INK, max(row, tile) * (0.35 + 0.6 * smoothstep(0.1, 0.5, v)));
    } else if (kind == 5.0) {
      vec2 ic = inkCov(v, fc, ang);
      col = mix(paper, inkC, ic.x);
      col = mix(col, INK, ic.y);
      float plank = lineM(vUV.x / 1.1, 0.05, 0.03);
      float grain = step(0.72, vn(vec2(vUV.x * 5.0, vUV.y * 0.3 + seed * 9.0)));
      col = mix(col, paper * 0.9, grain * 0.25 * smoothstep(0.0, 0.3, v));
      col = mix(col, INK, plank * 0.8);
    } else if (kind == 6.0) {
      vec2 ic = inkCov(v * 0.9, fc, ang);
      col = mix(paper, inkC, ic.x);
      col = mix(col, INK, ic.y);
      float crk = 1.0 - smoothstep(0.0, 0.025, abs(vn(vW.xy * 1.7 + vW.z * 0.9 + seed * 5.0) - 0.5));
      col = mix(col, INK, crk * 0.55);
      float rim = smoothstep(0.55, 0.78, 1.0 - max(dot(n, V), 0.0));
      col = mix(col, INK, rim);
    } else if (kind == 7.0) {
      float lit = clamp(vLit.r, 0.0, 1.0);
      float pulse = vLit.g;
      vec2 ic = inkCov(mix(v * 0.85 + 0.12, 1.0, lit), fc, ang);
      vec3 ice = mix(paper * vec3(0.9, 0.95, 1.0), vec3(0.86, 0.96, 1.0), lit);
      col = mix(ice, mix(INK, vec3(0.12, 0.35, 0.5), lit), ic.x * (1.0 - lit * 0.7));
      col = mix(col, INK, ic.y);
      col = mix(col, vec3(0.78, 0.95, 1.0), lit * (0.25 + 0.5 * pulse));
      float rim = smoothstep(0.5, 0.85, 1.0 - max(dot(n, V), 0.0));
      col = mix(col, mix(vec3(0.35, 0.8, 1.0), vec3(0.97, 1.0, 1.0), pulse), rim * lit);
      inkEdge = 1.0 - lit * 0.55;
    } else if (kind == 8.0) {
      vec2 ic = inkCov(0.93, fc, ang);
      col = mix(paper * 1.02, INK, ic.x * 0.5);
    } else if (kind == 9.0) {
      col = paper * 1.0;
      float pl = poolAt(vW.xz);
      float rip = lineM(distance(vW.xz, uPoolC.xz) * 0.55 - uT * 0.5, 0.2, 0.08);
      col = mix(col, mix(INK, paper, rip * 0.5), pl);
    } else if (kind == 10.0) {
      float gv = clamp(exp(-distance(vW, uMouth) * 0.13) * 1.4 * (0.8 + 0.2 * sin(uT * 3.0)), 0.0, 1.0);
      vec2 ic = inkCov(gv, fc, 0.9);
      col = mix(RED * 1.05, INK, max(ic.x, ic.y) * (1.0 - gv * 0.2));
      col = mix(col, RED * 1.1, smoothstep(0.82, 1.0, gv) * 0.7);
    } else if (kind == 11.0) {
      vec2 ic = inkCov(v * 0.8 + 0.1, fc, ang);
      col = mix(RED, INK, max(ic.x, ic.y) * 0.9);
      col = mix(col, paper, lineM(vUV.y / 0.9, 0.04, 0.03) * 0.0);
    } else {
      // plain: tone only (stone, asphalt kerbs, walls)
      vec2 ic = inkCov(v, fc, ang);
      col = mix(paper, inkC, ic.x);
      col = mix(col, INK, ic.y);
    }

    // THE OUTLINE: every polygon's own edge, a hand-inked weight that wobbles
    float ed = min(min(vEdge.x, vEdge.y), min(vEdge.z, vEdge.w));
    float px = ed / max(fwidth(ed), 1e-5);
    float lw = uLineW * uDpr * (0.8 + 0.6 * vn(vec2(dot(vW, vec3(0.7, 0.3, 0.6)) * 1.7, 3.0)));
    float edge = 1.0 - smoothstep(lw - 0.9, lw + 0.4, px);
    col = mix(col, INK, edge * inkEdge * (kind == 8.0 ? 0.0 : 1.0));
    col = mix(col, mix(INK, RED, 0.85), edge * (kind == 8.0 ? 0.9 : 0.0) * uSkyK * 0.0);
    col = mix(col, INK, wipe * 0.92);
    #ifdef SHRINE
      col = mix(col, RED * 1.15, burn);
    #endif
    col += (h21(floor(gl_FragCoord.xy) + fract(uT * 7.13) * 113.0) - 0.5) * 0.045;
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  }`;

// the shared uniforms: one set, every ink material points at it
export function inkUniforms() {
  const u = (v) => ({ value: v });
  return {
    uT: u(0), uDpr: u(1), uReveal: u(0), uSkyK: u(0), uOffA: u(1e3), uOffB: u(0), uPoolR: u(0), uDis: u(0), uLineW: u(1.15), uGlowK: u(0),
    uCenter: u(new Vector3()), uMouth: u(new Vector3(0, 10, -60)), uPoolC: u(new Vector3(0, 0, -50)),
  };
}

export function inkMaterial(uniforms, { shrine = false } = {}) {
  return new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, defines: shrine ? { SHRINE: 1 } : {} });
}
