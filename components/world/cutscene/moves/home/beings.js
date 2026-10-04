// THE FJORD'S PEOPLE AND ANIMALS, as meshes, and the pup's own wash: the
// orca (a low-poly spindle of black and bare paper, a curved swept fin, a
// saddle, flippers and a fluke), Thors (an ink silhouette in shape only: hair
// tied back, a full beard, a fur-collared cloak that lifts, empty open hands,
// no sword), two penguins, a gull, the water's rings, and the rain.

import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, PlaneGeometry, Quaternion, RingGeometry, SphereGeometry, Vector3 } from "three";
import { merge, paint, rgb, wash } from "./paper";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
function limb(a, b, r1, r2, seg = 7) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}

// ---- the orca -------------------------------------------------------------------------
// local frame: the nose along +z, the back up; its length 5.2 m, centred
const ORCA_L = 5.2;
export function orcaGeometry() {
  const ST = 15;
  const RING = 10;
  const pos = [];
  const col = [];
  const idx = [];
  const black = rgb("#161f2e");
  const white = rgb("#f4f0e8");
  const grey = rgb("#8f96a8");
  for (let i = 0; i <= ST; i++) {
    const t = i / ST; // 0 tail, 1 nose
    const z = (t - 0.5) * ORCA_L;
    // a spindle: slim at the tail stock, fullest behind the fin, tapering to a blunt rounded nose
    const r = 0.62 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.8) + 0.04;
    const hy = 0.92 - 0.25 * t; // a little flatter in the head
    for (let k = 0; k < RING; k++) {
      const th = (k / RING) * Math.PI * 2; // 0 = top
      const sx = Math.sin(th);
      const cy = Math.cos(th);
      pos.push(sx * r * (1.12 - 0.3 * Math.max(0, t - 0.8) * 5 * 0.2), cy * r * hy, z);
      // paint: black over the back and flanks, bare paper below, the eye patch, the grey saddle
      const wob = 0.12 * Math.sin(t * 17 + th * 2);
      let c = black;
      if (cy < -0.1 + wob * 0.8 - 0.3 * Math.sin(Math.PI * t) * 0.2) c = white;
      if (t > 0.78 && t < 0.88 && Math.abs(sx) > 0.7 && cy > -0.15) c = white; // the eye patch
      if (t > 0.5 && t < 0.58 && cy > 0.55) c = grey; // the saddle behind the fin
      if (t > 0.9 && cy < 0.1) c = white; // the chin
      col.push(...c);
    }
  }
  for (let i = 0; i < ST; i++) {
    for (let k = 0; k < RING; k++) {
      const a = i * RING + k;
      const b = i * RING + ((k + 1) % RING);
      idx.push(a, b, a + RING, b, b + RING, a + RING);
    }
  }
  const body = new BufferGeometry();
  body.setAttribute("position", new Float32BufferAttribute(pos, 3));
  body.setAttribute("color", new Float32BufferAttribute(col, 3));
  body.setIndex(idx);
  const flatBody = body.toNonIndexed();
  flatBody.computeVertexNormals();
  // the dorsal fin: a squashed four-sided cone, its tip swept back and curved, lit
  const fin = new ConeGeometry(0.34, 1.15, 4, 4).rotateY(Math.PI / 4).translate(0, 0.575, 0);
  const p = fin.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * 0.26);
    p.setZ(i, p.getZ(i) * 1.1 - 0.5 * y * y - 0.14 * y); // the sweep: the tip trails behind (toward the tail)
  }
  fin.translate(0, 0.5, -0.1);
  fin.computeVertexNormals();
  // flippers (paddles) and the fluke (two flat wings), bare paper underneath
  const flip = (s) => new SphereGeometry(0.5, 7, 4).scale(0.05, 0.28, 0.5).rotateZ(s * 0.5).translate(s * 0.62, -0.35, 0.55);
  const fluke = (s) => new SphereGeometry(0.5, 7, 4).scale(0.9, 0.05, 0.4).translate(s * 0.4, 0.02, -2.75).rotateY(s * 0.0);
  const parts = [
    flatBody,
    paint(fin, "#161f2e", 0.04, 300),
    paint(flip(-1), "#161f2e", 0.04, 301),
    paint(flip(1), "#161f2e", 0.04, 302),
    paint(fluke(-1), "#161f2e", 0.04, 303),
    paint(fluke(1), "#161f2e", 0.04, 304),
  ];
  for (const g of parts) {
    g.deleteAttribute("uv");
    if (!g.attributes.normal) g.computeVertexNormals();
  }
  return merge(parts);
}

// ---- Thors, the ink silhouette ---------------------------------------------------------
export const THORS_H = 2.35;
export function thorsGeometry() {
  const parts = [];
  const add = (g, hex = "#4a3020") => parts.push(paint(g, hex, 0.04, 7));
  for (const s of [-1, 1]) {
    add(limb([s * 0.16, 0.05, 0], [s * 0.18, 1.05, 0], 0.15, 0.19)); // legs, in trousers
    add(new IcosahedronGeometry(0.19, 0).scale(1, 0.6, 1.5).translate(s * 0.17, 0.08, 0.1)); // boots
    // the arms hang a little out and forward, the hands open and empty, palms forward
    add(limb([s * 0.52, 1.82, 0], [s * 0.66, 1.34, 0.1], 0.13, 0.11), "#3a2a1a");
    add(limb([s * 0.66, 1.34, 0.1], [s * 0.7, 1.0, 0.36], 0.11, 0.09), "#3a2a1a");
    add(new IcosahedronGeometry(0.1, 0).scale(1.05, 1.15, 0.45).translate(s * 0.7, 0.9, 0.44), "#c9a27a"); // the palm
    for (let f = 0; f < 4; f++) add(limb([s * (0.64 + f * 0.043), 0.85, 0.46], [s * (0.62 + f * 0.05), 0.68, 0.5], 0.022, 0.016, 4), "#c9a27a"); // the fingers
  }
  add(limb([0, 0.95, 0], [0, 1.85, 0], 0.4, 0.46).scale(1.25, 1, 0.8), "#4a3020"); // the torso: broad, a tunic to the knee
  add(limb([0, 0.75, 0], [0, 1.1, 0], 0.5, 0.42).scale(1.25, 1, 0.82)); // its skirt
  add(limb([-0.55, 1.9, 0], [0.55, 1.9, 0], 0.17, 0.17), "#3a2a1a"); // shoulders
  add(limb([0, 1.88, 0], [0, 2.0, 0.01], 0.13, 0.12)); // neck
  // the fur collar: a ring of ragged tufts round the neck and shoulders
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const g = new ConeGeometry(0.1, 0.34, 5).translate(0, 0.17, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, new Vector3(Math.sin(a) * 0.8, 0.7, Math.cos(a) * 0.8).normalize()));
    add(g.translate(Math.sin(a) * 0.42, 1.88, Math.cos(a) * 0.3), "#6b4a2b");
  }
  add(new CylinderGeometry(0.4, 0.5, 0.22, 10, 1).scale(1.12, 1, 0.8).translate(0, 1.84, 0)); // the collar's body
  // the head, the hair tied back, the full beard
  add(new IcosahedronGeometry(0.32, 1).scale(0.92, 1.12, 1.0).translate(0, 2.1, 0.03), "#c9a27a");
  add(new IcosahedronGeometry(0.215, 1).scale(0.95, 0.8, 1.0).translate(0, 2.2, -0.04), "#3a2a1a"); // the hair's crown
  add(limb([0, 2.2, -0.2], [0, 1.95, -0.62], 0.09, 0.05, 5), "#3a2a1a"); // the tail of the tie, swung back
  add(limb([0, 1.95, -0.62], [0, 1.52, -0.7], 0.06, 0.02, 5), "#3a2a1a");
  add(new IcosahedronGeometry(0.095, 0).translate(0, 2.2, -0.24)); // the knot
  add(new IcosahedronGeometry(0.2, 1).scale(1.0, 1.3, 0.8).translate(0, 1.93, 0.15), "#6b4a2b"); // the beard
  add(new ConeGeometry(0.17, 0.5, 6).rotateX(Math.PI).translate(0, 1.58, 0.15), "#6b4a2b"); // down to the chest
  const body = merge(parts);
  // the cloak: a sheet from the shoulders to the shin, lifting in the breeze (aSway: 0 at the shoulders, 1 at the hem)
  const cloak = new PlaneGeometry(1.2, 1.6, 6, 8);
  const cp = cloak.attributes.position;
  const sway = new Float32Array(cp.count);
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i);
    const y = cp.getY(i); // -0.8..0.8
    const k = (0.8 - y) / 1.6;
    sway[i] = k;
    cp.setXYZ(i, x * (1 + 0.55 * k), 1.95 - k * 1.65, -0.18 - 0.28 * (1 - (x / 0.62) ** 2) * (0.4 + 0.6 * k) - 0.1 * k);
  }
  cloak.setAttribute("aSway", new BufferAttribute(sway, 1));
  cloak.computeVertexNormals();
  return { body, cloak: paint(cloak, "#7a2e1c", 0.03, 9) };
}
// the ink: the one hard-edged thing in the dimension; a faint wash of violet where a facet takes the light,
// the sun on its edges
export function inkMaterial(cloak = false) {
  return wash({
    flat: true,
    paper: 0,
    edge: 0,
    rim: 1.0,
    haze: 0.0008,
    attributes: cloak ? "attribute float aSway;" : "",
    vtx: cloak ? "p.x += sin(uTime * 1.5 + p.y * 2.4) * 0.12 * aSway; p.z += (sin(uTime * 1.1 + p.y * 1.7) * 0.5 + 0.5) * 0.28 * aSway; p.y += sin(uTime * 2.0 + p.x * 3.0) * 0.03 * aSway;" : "",
    albedo: /* glsl */ `
      float t = clamp(dot(N, normalize(vec3(0.3, 0.6, -0.7))) * 0.5 + 0.5, 0.0, 1.0);
      return vc * (0.7 + 0.5 * smoothstep(0.3, 0.95, t));`,
  });
}

// ---- penguins and the gull ------------------------------------------------------------
export function penguinGeometry() {
  return merge([
    paint(new SphereGeometry(0.2, 8, 6).scale(1, 1.4, 0.9).translate(0, 0.28, 0), "#2b3150", 0.04, 1),
    paint(new SphereGeometry(0.15, 8, 6).scale(1, 1.3, 0.7).translate(0, 0.26, 0.09), "#f6f0e6", 0.02, 2),
    paint(new SphereGeometry(0.11, 8, 6).translate(0, 0.62, 0.02), "#2b3150", 0.04, 3),
    paint(new ConeGeometry(0.035, 0.1, 5).rotateX(Math.PI / 2).translate(0, 0.6, 0.15), "#e8862d", 0.03, 4),
    paint(new SphereGeometry(0.1, 5, 4).scale(0.35, 1, 0.7).translate(0.21, 0.3, 0), "#2b3150", 0.04, 5),
    paint(new SphereGeometry(0.1, 5, 4).scale(0.35, 1, 0.7).translate(-0.21, 0.3, 0), "#2b3150", 0.04, 6),
  ]);
}
export function gullBodyGeometry() {
  return merge([
    paint(new SphereGeometry(0.22, 8, 6).scale(1.55, 0.78, 0.8), "#fbf8f2", 0.02, 1),
    paint(new SphereGeometry(0.1, 6, 5).translate(0.27, 0.1, 0), "#fbf8f2", 0.02, 2),
    paint(new ConeGeometry(0.03, 0.12, 4).rotateZ(-Math.PI / 2).translate(0.4, 0.09, 0), "#e8a23a", 0.02, 3),
    paint(new ConeGeometry(0.07, 0.3, 4).rotateZ(Math.PI / 2).translate(-0.4, 0.0, 0), "#e8e4dc", 0.02, 4), // the tail
  ]);
}
export function gullWingGeometry() {
  // a wing is a long flat blade, its tip dipped in grey; the pivot is at the shoulder
  const g = new SphereGeometry(0.5, 6, 3).scale(0.5, 0.05, 0.9).translate(0, 0, 0.45);
  return merge([paint(g, "#f3efe8", 0.03, 5)]);
}

// ---- the water's rings and the rain ---------------------------------------------------------
export function ringGeometry() {
  return new RingGeometry(0.86, 1, 36).rotateX(-Math.PI / 2);
}
export function ringMaterial() {
  return wash({
    vertexColors: false,
    transparent: true,
    depthWrite: false,
    paper: 1,
    edge: 0,
    rim: 0,
    haze: 0.003,
    albedo: "return vec3(0.96, 0.95, 0.93);",
    alpha: "vC.r",
  });
}
export function rainGeometry() {
  return new PlaneGeometry(0.03, 0.9).translate(0, 0.45, 0);
}
export function rainMaterial(uRain) {
  return wash({
    vertexColors: false,
    transparent: true,
    depthWrite: false,
    paper: 0,
    edge: 0,
    rim: 0,
    haze: 0.002,
    uniforms: { uRain },
    vtx: /* glsl */ `
      float sd = float(gl_InstanceID);
      float fall = mod(uTime * (13.0 + 7.0 * fract(sd * 0.37)) + sd * 5.31, 26.0);
      p.y -= fall;
      p.x += p.y * 0.07;`,
    albedo: "return vec3(0.52, 0.62, 0.80);",
    alpha: "uRain * 0.55 * smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y))",
  });
}

// ---- the pup's own wash ---------------------------------------------------------------
// a wash twin for each of the pup's materials, swapped in for the scene and back at the end:
// its own colours, two glazes of light, its edge pooling a little darker
export function pupWash(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      const c = new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB();
      p = wash({
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        side: m.side,
        paper: 0.55,
        edge: 0.4,
        rim: 0.5,
        haze: 0.0012,
        uniforms: { uBase: { value: new Vector3(c.r, c.g, c.b) } },
        albedo: "return mix(uBase * vc, vec3(1.0, 0.95, 0.88), 0.1);",
      });
      p.userData.src = m;
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}

