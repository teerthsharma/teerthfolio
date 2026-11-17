// PARTS for the Godsealzilla look (pr-tensorflow-128930): the pebbled hide with its tapered tail and seal tail-flipper,
// 27 crystal dorsal fins shaped as seal flippers (3 rows x 9 columns; dormant housings in the body figure, the lit
// crystal in one emissive overlay), the heavy brow and jaw scutes, the throat glow, and the Mechasealzilla skin.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, ExtrudeGeometry, Matrix4, Mesh, ShaderMaterial, Shape, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { HF, TF, TAU, normalAt, onF, patch, strip, stud } from "../wear/geo.js";

export const HIDE = { col: "#555b65", shade: "#2a2e37", hi: "#707883", ink: "#121419" };
const FIN = { col: "#3a4048", shade: "#1c2026", rib: "#5c6670" };
const HC = [0, 0.17, 0], TC = [0, 0, -0.02];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (parts) => mergeGeometries(parts.map(ni));
const rng = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

function build(engine, geo, ink, lineMul = 1.2, head = null) {
  const fig = engine.figure(geo, head ? { ink, lineMul, head } : { ink, lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// a tapered tube with true radial normals (taper() from wear/geo.js can come out inside-out), closed at the thin end
function taper(pts, r0, r1, seg = 24, radial = 8) {
  const curve = new CatmullRomCurve3(pts), C = curve.getPoints(seg), fr = curve.computeFrenetFrames(seg, false), pos = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) for (let j = 0; j < radial; j++) {
    const a = (j / radial) * TAU, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)), r = r0 + (r1 - r0) * (i / seg);
    pos.push(C[i].x + n.x * r, C[i].y + n.y * r, C[i].z + n.z * r); nor.push(n.x, n.y, n.z);
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
    idx.push(a, c, b, b, c, d);
  }
  const e = C[seg], ei = pos.length / 3, t = fr.tangents[seg];
  pos.push(e.x, e.y, e.z); nor.push(t.x, t.y, t.z);
  for (let j = 0; j < radial; j++) idx.push(seg * radial + j, ei, seg * radial + ((j + 1) % radial));
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  const P = g.attributes.position, v = (k) => new Vector3().fromBufferAttribute(P, idx[k]);
  if (new Vector3().crossVectors(v(1).sub(v(0)), v(2).sub(v(0))).dot(new Vector3(nor[idx[0] * 3], nor[idx[0] * 3 + 1], nor[idx[0] * 3 + 2])) < 0) for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------------ tail: centreline [z, y, radius]
const TAIL = [[-0.2, 0.11, 0.12], [-0.42, 0.12, 0.1], [-0.62, 0.16, 0.075], [-0.8, 0.23, 0.052], [-0.94, 0.31, 0.036], [-1.02, 0.37, 0.028]];
function tailAt(z) {
  for (let i = 0; i < TAIL.length - 1; i++) {
    const [z0, y0, r0] = TAIL[i], [z1, y1, r1] = TAIL[i + 1];
    if (z <= z0 && z >= z1) { const u = (z - z0) / (z1 - z0); return [y0 + (y1 - y0) * u, r0 + (r1 - r0) * u]; }
  }
  return [TAIL[0][1], TAIL[0][2]];
}
const tailF = (x, y, z) => { const [yc, r] = tailAt(Math.min(-0.2, Math.max(-1.04, z))); return Math.hypot(x, y - yc) - r; };

function tailGeo(smooth) {
  const pts = TAIL.map(([z, y]) => new Vector3(0, y, z)), parts = [piece(taper(pts, 0.118, 0.026, 36, 12), HIDE.col, HIDE.shade)];
  // the seal tail-flipper: a two-lobed fan lying along the tail's end direction, rim in the lighter tone
  const d = new Vector3(0, 0.37 - 0.31, -1.02 + 0.94).normalize(), L = new Vector3(1, 0, 0), V = new Vector3().crossVectors(L, d).normalize(), x = L.clone().multiplyScalar(0.55).addScaledVector(V, 0.83).normalize(), z = new Vector3().crossVectors(x, d).normalize();
  const sh = new Shape();
  sh.moveTo(-0.014, 0);
  sh.bezierCurveTo(-0.07, 0.02, -0.15, 0.08, -0.14, 0.15);
  sh.bezierCurveTo(-0.12, 0.185, -0.05, 0.17, -0.02, 0.11);
  sh.bezierCurveTo(-0.008, 0.095, 0.008, 0.095, 0.02, 0.11);
  sh.bezierCurveTo(0.05, 0.17, 0.12, 0.185, 0.14, 0.15);
  sh.bezierCurveTo(0.15, 0.08, 0.07, 0.02, 0.014, 0);
  const fan = new ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 8 }).translate(0, 0, -0.006);
  fan.applyMatrix4(new Matrix4().makeBasis(x, d, z).setPosition(0, 0.365, -1.015));
  parts.push(piece(fan, smooth ? "#53585f" : HIDE.col, smooth ? "#272a30" : HIDE.shade));
  const rib = new ConeGeometry(0.008, 0.15, 3).translate(0, 0.075, 0);
  parts.push(piece(rib.applyMatrix4(new Matrix4().makeBasis(x, d, z).setPosition(0, 0.365, -1.015)), HIDE.hi, HIDE.shade));
  return parts;
}

// ------------------------------------------------------------------ pebbled hide: flat studs laid on the torso and tail
function hideStuds(F, rows, pick, seed) {
  const R = rng(seed), out = [];
  for (const [y, n] of rows) for (let i = 0; i < n; i++) {
    const th = ((i + (R() - 0.5) * 0.8 + (y * 97) % 1) / n) * TAU - Math.PI;
    if (pick(th, y)) { const p = onF(F, TC, th, y, 0.002 + R() * 0.002); out.push(piece(stud(F, p, 0.006 + R() * 0.005, 0.4), R() < 0.3 ? HIDE.hi : "#626973", HIDE.shade, { line: 0 })); }
  }
  return out;
}
const TORSO_ROWS = Array.from({ length: 13 }, (_, i) => [0.07 + i * 0.033, 32 - Math.abs(i - 4) * 1.4 | 0]);
const bellyFree = (th, y) => !(Math.abs(th) < 0.78 && y < 0.4);

function bodyGeo(kind) {
  return cached(`zilla|body|${kind}`, () => {
    const mecha = kind === "mecha", parts = [...tailGeo(mecha)];
    if (!mecha) {
      parts.push(...hideStuds(TF, TORSO_ROWS, bellyFree, 5));
      const G = rng(3); // keloid fissures: short dark zigzag grooves running down the back and flanks
      for (let k = 0; k < 34; k++) {
        const th0 = (G() * 2 - 1) * Math.PI, y0 = 0.14 + G() * 0.3, path = []; if (Math.abs(th0) < 0.95) continue;
        for (let i = 0; i < 5; i++) path.push([th0 + (i % 2 ? 0.04 : -0.03) + (G() - 0.5) * 0.03, y0 - i * 0.022]);
        parts.push(piece(strip(TF, TC, path, 0.007, 0.002, 0.0012), "#12141a", "#0a0b0e", { line: 0 }));
      }
      const R = rng(11);
      for (let k = 0; k < 40; k++) { // the tail: studs round the tube
        const z = -0.24 - (k / 40) * 0.74, a = R() * TAU, [yc, r] = tailAt(z), p = new Vector3(Math.sin(a) * r, yc + Math.cos(a) * r, z);
        parts.push(piece(stud(tailF, p, 0.004 + r * 0.05, 0.4), "#626973", HIDE.shade, { line: 0 }));
      }
    } else {
      // seams: too-even bands, the first tell of the fake; rivets stand on them in the lighter metal tone
      for (const y of [0.16, 0.26, 0.36]) {
        const pts = []; for (let a = -3.1; a <= 3.1; a += 0.12) pts.push(onF(TF, TC, a, y, 0.0015));
        for (const th of [-2.2, -1.1, 1.1, 2.2]) if (y === 0.26) parts.push(piece(new SphereGeometry(0.008, 8, 6).translate(...onF(TF, TC, th, y, 0.004).toArray()), "#b8c0c8", "#6a727c", { line: 0.3 }));
        parts.push(piece(rimTube(pts), "#2a3038", "#161a20", { line: 0.3 }));
      }
    }
    return merge(parts);
  });
}
const rimTube = (pts) => taper(pts, 0.0035, 0.0035, pts.length * 2, 4);

// ------------------------------------------------------------------ dorsal fins
const finShape = (h, w) => {
  const s = new Shape(), r = w / 2;
  s.moveTo(-0.2 * r, 0);
  s.bezierCurveTo(-0.55 * r, 0.25 * h, -r, 0.45 * h, -r * 0.95, 0.68 * h);
  s.bezierCurveTo(-r * 0.9, 0.9 * h, -0.35 * r, h, 0, h);
  s.bezierCurveTo(0.45 * r, h, r * 0.95, 0.88 * h, r, 0.66 * h);
  s.bezierCurveTo(r, 0.44 * h, 0.5 * r, 0.22 * h, 0.2 * r, 0);
  s.lineTo(-0.2 * r, 0);
  return s;
};
const finLocal = (h, w, t) => new ExtrudeGeometry(finShape(h, w), { depth: t, bevelEnabled: true, bevelThickness: t * 0.5, bevelSize: t * 0.55, bevelSegments: 1, curveSegments: 8 }).translate(0, 0, -t / 2);

// the 27 fin frames: [col][row] -> { p, a (axis), T (spine tangent), h }. Columns 0-2 stand on the tail, 3-8 up the back.
function finFrames(even) {
  const BACK_Y = [0.13, 0.19, 0.25, 0.31, 0.37, 0.43], TAIL_Z = [-0.76, -0.57, -0.38], anchors = [];
  for (let c = 0; c < 9; c++) {
    const row = [];
    for (const r of [0, -1, 1]) {
      let p, n;
      if (c >= 3) { p = onF(TF, TC, Math.PI - r * 0.3, BACK_Y[c - 3] - (r ? 0.015 : 0), 0); n = normalAt(TF, p); }
      else { const z = TAIL_Z[c], [yc, rad] = tailAt(z); p = new Vector3(r * 0.052, yc + rad * 0.93, z); n = new Vector3(r * 0.35, 1, 0.12).normalize(); }
      row.push({ p, n, r });
    }
    anchors.push(row);
  }
  return anchors.map((row, c) => row.map(({ p, n, r }) => {
    const a0 = anchors[Math.max(0, c - 1)][0].p, a1 = anchors[Math.min(8, c + 1)][0].p, T = a1.clone().sub(a0).normalize();
    const h = even ? 0.15 * (r ? 0.8 : 1) : (0.08 + 0.12 * Math.sin((Math.PI * (c + 0.5)) / 9)) * 2.2 * (r ? 0.72 : 1);
    const lat = new Vector3(Math.sign(r) * (c >= 3 ? Math.abs(p.x) / (Math.abs(p.x) + 1e-6) : 1), 0, 0), a = n.clone().multiplyScalar(0.55).add(new Vector3(0, 0.75, 0));
    if (r && !even) a.addScaledVector(lat, 0.7);
    a.normalize();
    return { p: p.clone().addScaledVector(n, -0.012), a, T, h, c };
  }));
}
function finMatrix({ p, a, T }) {
  const side = T.clone().sub(a.clone().multiplyScalar(T.dot(a))).normalize(), z = new Vector3().crossVectors(side, a).normalize();
  return new Matrix4().makeBasis(side, a, z).setPosition(p);
}

function housingGeo(kind) {
  return cached(`zilla|fins2|${kind}`, () => {
    const even = kind === "mecha", parts = [];
    for (const f of finFrames(even).flat()) {
      const M = finMatrix(f), w = f.h * 0.44, t = 0.0105 + f.h * 0.012;
      parts.push(piece(finLocal(f.h, w, t).applyMatrix4(M), even ? "#464a50" : FIN.col, even ? "#24272c" : FIN.shade));
      parts.push(piece(new ConeGeometry(0.0075 * (f.h / 0.2) + 0.002, f.h * 0.8, 3).translate(0, f.h * 0.4, 0).applyMatrix4(M), even ? "#5a5f66" : FIN.rib, FIN.shade, { line: 0.5 }));
    }
    return merge(parts);
  });
}

// the lit crystal: the same 27 paddles a hair larger, one draw, per-vertex column / height / across / axis
function overlayGeo() {
  return cached("zilla|glow2", () => {
    const geos = [];
    for (const f of finFrames(false).flat()) {
      const w = f.h * 0.44, t = 0.0105 + f.h * 0.012 + 0.006, g = finLocal(f.h * 1.015, w * 1.05, t), P = g.attributes.position, n = P.count;
      const aH = new Float32Array(n), aU = new Float32Array(n), aAx = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { aH[i] = Math.min(1, Math.max(0, P.getY(i) / f.h)); aU[i] = P.getX(i) / (w / 2); aAx.set([f.a.x * f.h, f.a.y * f.h, f.a.z * f.h], i * 3); }
      g.deleteAttribute("uv");
      g.applyMatrix4(finMatrix(f));
      g.setAttribute("aFin", new BufferAttribute(new Float32Array(n).fill(f.c), 1));
      g.setAttribute("aH", new BufferAttribute(aH, 1)); g.setAttribute("aU", new BufferAttribute(aU, 1)); g.setAttribute("aAx", new BufferAttribute(aAx, 3));
      geos.push(g);
    }
    // the throat: a rounded patch on the neck front with three gill slits, column 9
    const throat = [];
    for (const [th, dy] of [[0, 0], [0.42, 0.006], [-0.42, 0.006], [0.78, -0.008], [-0.78, -0.008]]) throat.push(patch(TF, TC, th, 0.402 + dy, (a) => (th ? 0.02 : 0.026) * (1 + 0.15 * Math.cos(a)), { sx: 0.45, R: 0.2, lift: 0.005, seg: 14, rot: th * 0.5 }));
    for (const g of throat) {
      const n = g.attributes.position.count;
      g.setAttribute("aFin", new BufferAttribute(new Float32Array(n).fill(9), 1));
      g.setAttribute("aH", new BufferAttribute(new Float32Array(n).fill(0.55), 1)); g.setAttribute("aU", new BufferAttribute(new Float32Array(n).fill(1), 1)); g.setAttribute("aAx", new BufferAttribute(new Float32Array(n * 3), 3));
    }
    return merge([...geos, ...throat]);
  });
}

const GLOW_V = /* glsl */ `
  attribute float aFin; attribute float aH; attribute float aU; attribute vec3 aAx;
  uniform float uLit[10]; uniform float uExt[10];
  varying vec3 vN; varying float vH; varying float vU; varying float vL;
  void main() {
    int i = int(aFin + 0.5);
    vL = uLit[i]; vH = aH; vU = aU;
    vN = normalize(mat3(modelMatrix) * normal);
    vec3 p = position + aAx * aH * aH * uExt[i];
    gl_Position = vL > 0.001 ? projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  }`;
const GLOW_F = /* glsl */ `
  uniform vec3 uLightDir; uniform vec3 uEdge; uniform vec3 uCore; uniform vec3 uHot;
  varying vec3 vN; varying float vH; varying float vU; varying float vL;
  void main() {
    float lit = step(0.5, 0.5 * dot(normalize(vN), uLightDir) + 0.5);
    vec3 c = mix(uEdge, uCore, smoothstep(0.2, 0.9, vH)) * mix(0.62, 1.0, lit);
    float rib = 1.0 - smoothstep(0.07, 0.13, abs(vU));
    c = mix(c, uHot, rib * 0.6 * step(0.01, vH));
    gl_FragColor = vec4(c * (0.3 + 0.95 * vL), 1.0);
  }`;

// the fin driver. Auto mode (nothing called `set`) loops a 3.7 s charge from the shader clock so a lab still shows it;
// a cutscene calls `h.fins.set(n, f, throat)` from its update: n columns locked (0..9), f the stepped drawing for the pulse.
export function finGlow(engine) {
  const lit = new Float32Array(10), ext = new Float32Array(10);
  const mat = new ShaderMaterial({
    uniforms: { uLit: { value: lit }, uExt: { value: ext }, uLightDir: engine.shared.uLightDir, uEdge: { value: new Color("#3ac8ff") }, uCore: { value: new Color("#bfefff") }, uHot: { value: new Color("#f4fdff") } },
    vertexShader: GLOW_V, fragmentShader: GLOW_F,
  });
  const mesh = new Mesh(overlayGeo(), mat);
  mesh.frustumCulled = false;
  let manual = null;
  const api = {
    mesh,
    set(n, f = 0, throat = 0) { manual = { n, f, throat }; return api; },
    auto() { manual = null; return api; },
    sync() {
      let s = manual;
      if (!s) { const p = (Math.floor(engine.shared.uTime.value * 24) / 24) % 3.7; s = { n: p < 3.3 ? Math.floor(p / 0.33) : p < 3.6 ? 9 : 0, f: p * 12, throat: p >= 2.8 && p < 3.6 ? 1 : 0 }; }
      for (let j = 0; j < 9; j++) {
        const on = j < s.n ? 1 : 0, newest = on && j === s.n - 1 ? Math.exp(-(s.f % 4) * 0.5) : 0;
        lit[j] = on * (0.85 + 0.15 * newest); ext[j] = on * (0.08 + 0.04 * newest);
      }
      lit[9] = s.throat;
    },
  };
  mesh.onBeforeRender = api.sync;
  return api;
}

// ------------------------------------------------------------------ head: heavy brow, sunken-eye shadow, jaw scutes
export function headScutes(engine) {
  const geo = cached("zilla|head", () => {
    const parts = [], ink = darker(HIDE.shade, 0.7);
    for (const s of [1, -1]) {
      // the brow: a thick ridge sweeping out and down over the eye, with a dark under-shadow strip so the eye sinks
      const ridge = [[0.06, 0.262], [0.3, 0.272], [0.62, 0.288], [0.98, 0.3]].map(([th, y]) => onF(HF, HC, s * th, y, 0.007));
      parts.push(piece(taper(ridge, 0.019, 0.011, 20, 10), HIDE.col, HIDE.shade, { line: 0.55 }));
      const sink = [[0.1, 0.244], [0.34, 0.251], [0.62, 0.266], [0.92, 0.278]].map(([th, y]) => onF(HF, HC, s * th, y, 0.0035));
      parts.push(piece(taper(sink, 0.0085, 0.005, 16, 6), ink, darker(ink, 0.6), { line: 0.2 }));
      // three jaw scutes stepping back along the cheek
      for (let i = 0; i < 3; i++) {
        const p = onF(HF, HC, s * (1.12 + i * 0.2), 0.09 + i * 0.012, 0), n = normalAt(HF, p), up = n.clone().multiplyScalar(0.8).add(new Vector3(0, 0.5, -0.25)).normalize();
        const m = new Matrix4().lookAt(new Vector3(), up, new Vector3(0, 1, 0)).multiply(new Matrix4().makeRotationX(Math.PI / 2)).setPosition(p.addScaledVector(n, -0.006));
        parts.push(piece(new ConeGeometry(0.019 - i * 0.003, 0.05 - i * 0.008, 4).translate(0, 0.025, 0).applyMatrix4(m), HIDE.col, HIDE.shade, { line: 0.9 }));
      }
    }
    // a centre crest of studs from the brow back over the dome
    const R = rng(23);
    for (let k = 0; k < 22; k++) {
      const th = (R() < 0.5 ? -1 : 1) * (0.3 + R() * 1.4), y = 0.28 + R() * 0.04;
      if (Math.abs(th) < 1.8) parts.push(piece(stud(HF, onF(HF, HC, th, y, 0.002), 0.005 + R() * 0.004, 0.4), "#626973", HIDE.shade, { line: 0 }));
    }
    return merge(parts);
  });
  return build(engine, geo, HIDE.ink, 0.95, { pos: HC, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.2 + 0.03 });
}

// the Mechasealzilla visor: a red lacquer band where the eyes were, emissive, with a dark frame
export function visor(engine) {
  const geo = cached("zilla|visor", () => {
    const parts = [], pts = [];
    for (let a = -1.5; a <= 1.5; a += 0.1) pts.push(onF(HF, HC, a, 0.205, 0.012));
    parts.push(piece(taper(pts, 0.021, 0.021, 30, 8), "#ff3a2a", "#c02214", { line: 0.6 }));
    return merge(parts);
  });
  const fig = build(engine, geo, "#2a0a08", 0.8, { pos: HC, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.23 });
  fig.userData.mat.uniforms.uEmit.value.setRGB(1.1, 0.08, 0.04);
  return fig;
}

export const bodyFigure = (engine, kind = "hero") => build(engine, merge([bodyGeo(kind), housingGeo(kind)]), kind === "mecha" ? "#1c1f24" : HIDE.ink, 1.25);
