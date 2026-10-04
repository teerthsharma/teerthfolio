// THE STOCK CAR: one glossy, lofted shape (a superellipse section swept along
// the car's length, so the paint is smooth and the highlights run the whole
// body) in two builds. THE GUEST: the promoted highway car, a red stock car
// with a yellow lightning bolt down each flank, #3244 on the doors, a
// raked windscreen with two big friendly eyes, a bumper smile, a spoiler.
// Shape and colour only: no studio, film or sponsor marks. THE RIVALS: the same
// body, plain, painted by the instance colour. The car faces +x, y up, z the
// flank; wheels are x = +-1.12 at z = +-0.78.
// Cost: guest body ~7k triangles, rival ~3k; every part is one merged geometry.

import { CanvasTexture, CylinderGeometry, DoubleSide, ExtrudeGeometry, LatheGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace, TubeGeometry, CatmullRomCurve3, Vector2, Vector3, BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { at, jitterColour, merge, paint } from "./shade";

export const WHEEL_X = 1.12;
export const WHEEL_Z = 0.8;
export const WHEEL_R = 0.37;
export const ROOF = [-0.5, 1.34, 0]; // where the pup sits, in the car's frame

const sgn = (v) => (v < 0 ? -1 : 1);
const cr = (a, t) => {
  // Catmull-Rom through a row of numbers, t in [0, a.length - 1]
  const i = Math.min(a.length - 2, Math.max(0, Math.floor(t)));
  const f = t - i;
  const p0 = a[Math.max(0, i - 1)];
  const p1 = a[i];
  const p2 = a[i + 1];
  const p3 = a[Math.min(a.length - 1, i + 2)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
};

// A superellipse section swept along x; pts rows are [x, bottom, top, halfwidth]. The ends close in a rounded nose.
function loft(pts, { n = 3, rows = 36, radial = 22, p = 3 } = {}) {
  const col = (k) => pts.map((r) => r[k]);
  const X = col(0);
  const B = col(1);
  const T = col(2);
  const W = col(3);
  const pos = [];
  const idx = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const t = u * (pts.length - 1);
    const shrink = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), p)), 1 / p);
    const x = cr(X, t);
    const yb = cr(B, t);
    const yt = cr(T, t);
    const hw = cr(W, t);
    const ym = (yb + yt) / 2;
    const hh = ((yt - yb) / 2) * shrink;
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(x, ym + hh * sgn(s) * Math.pow(Math.abs(s), 2 / n), hw * shrink * sgn(c) * Math.pow(Math.abs(c), 2 / n));
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // wind the triangles outward: flip if the first normal points inward
  const nrm = g.attributes.normal;
  if (nrm.getY(Math.floor(rows / 2) * radial + Math.floor(radial / 4)) < 0) {
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k += 3) [ix[k + 1], ix[k + 2]] = [ix[k + 2], ix[k + 1]];
    g.computeVertexNormals();
  }
  return g;
}

const BODY = [
  [-1.85, 0.3, 0.6, 0.55],
  [-1.55, 0.22, 0.78, 0.72],
  [-1.0, 0.2, 0.8, 0.8],
  [-0.4, 0.2, 0.78, 0.8],
  [0.3, 0.2, 0.76, 0.8],
  [0.95, 0.2, 0.7, 0.78],
  [1.5, 0.24, 0.58, 0.7],
  [1.85, 0.3, 0.46, 0.5],
];
const CABIN = [
  [-1.15, 0.62, 0.84, 0.42],
  [-0.85, 0.62, 1.12, 0.55],
  [-0.5, 0.62, 1.28, 0.58],
  [-0.05, 0.62, 1.28, 0.58],
  [0.3, 0.62, 1.1, 0.58],
  [0.62, 0.62, 0.86, 0.56],
  [0.8, 0.62, 0.74, 0.5],
];
const ROOFCAP = [
  [-0.92, 1.1, 1.2, 0.38],
  [-0.65, 1.23, 1.32, 0.5],
  [-0.28, 1.27, 1.34, 0.54],
  [0.0, 1.26, 1.33, 0.5],
  [0.12, 1.18, 1.27, 0.4],
];
// the windscreen's slope, for the eyes: rises 0.42 over 0.67
const SLOPE = Math.atan2(0.42, 0.67);
const EYE_AT = [0.3, 1.075, 0];

// the tyre: a rounded lathe, axis along z
function tyreGeometry(hex = "#17151c") {
  const prof = [[0.17, -0.15], [0.3, -0.155], [0.36, -0.12], [0.375, -0.05], [0.375, 0.05], [0.36, 0.12], [0.3, 0.155], [0.17, 0.15]].map(([r, y]) => new Vector2(r, y));
  const tyre = paint(new LatheGeometry(prof, 18).rotateX(Math.PI / 2), hex, { gloss: 0.15, smooth: true });
  const hub = paint(new CylinderGeometry(0.2, 0.2, 0.32, 14).rotateX(Math.PI / 2), "#dfe4ee", { gloss: 1, smooth: true });
  const cap = paint(new SphereGeometry(0.1, 10, 6).scale(1, 1, 0.5).translate(0, 0, 0.16), "#ffd23a", { gloss: 1, smooth: true });
  const capB = paint(new SphereGeometry(0.1, 10, 6).scale(1, 1, 0.5).translate(0, 0, -0.16), "#ffd23a", { gloss: 1, smooth: true });
  return merge([tyre, hub, cap, capB]);
}
export const wheelGeometry = () => tyreGeometry();

const BOLT = [[0.15, 1.0], [-0.35, 0.45], [-0.05, 0.45], [-0.2, 0.0], [0.4, 0.6], [0.08, 0.6], [0.3, 1.0]];
function boltGeometry(hex, grow, depth, dir = 1) {
  const s = new Shape();
  BOLT.forEach(([x, y], i) => {
    // lie it down, tip forward (+x), stretched along the flank
    const px = dir * (y - 0.5) * 2.3 * (1 + grow);
    const py = -x * 0.62 * (1 + grow * 1.6);
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  });
  return paint(new ExtrudeGeometry(s, { depth, bevelEnabled: false }), hex, { gloss: 0.9 });
}

// everything of the car that does not move on its own, in one geometry; hero: the guest's decals, eyes aside
export function carGeometry({ hero = false, res = 1 } = {}) {
  const red = "#dc1f1a";
  const paintMask = hero ? 0 : 1;
  const L = [];
  const rows = Math.round(36 * res);
  const radial = Math.round(22 * res);
  L.push(jitterColour(paint(loft(BODY, { rows, radial }), hero ? red : "#ffffff", { gloss: 1, paintMask, smooth: true }), 0, 1));
  L.push(paint(loft(CABIN, { rows: Math.round(26 * res), radial: Math.round(18 * res) }), "#1a2c52", { gloss: 1, smooth: true }));
  L.push(paint(loft(ROOFCAP, { rows: Math.round(18 * res), radial: Math.round(16 * res) }), hero ? red : "#ffffff", { gloss: 1, paintMask, smooth: true }));
  // wheel arches: dark discs behind the tyres
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(paint(new CylinderGeometry(0.42, 0.42, 0.05, 14).rotateX(Math.PI / 2).translate(sx * WHEEL_X, 0.42, sz * (WHEEL_Z - 0.06)), "#1b1620", { gloss: 0.1, smooth: true }));
  // the spoiler on two struts, with end plates
  const sp = hero ? red : "#ffffff";
  L.push(paint(new BoxGeometry(0.46, 0.05, 1.36), sp, { gloss: 1, paintMask, m4: at(-1.68, 1.02, 0, 0, 0, -0.06) }));
  for (const sz of [-1, 1]) {
    L.push(paint(new BoxGeometry(0.5, 0.2, 0.04), sp, { gloss: 1, paintMask, m4: at(-1.68, 1.08, sz * 0.68) }));
    L.push(paint(new BoxGeometry(0.06, 0.26, 0.06), "#222028", { gloss: 0.3, m4: at(-1.66, 0.88, sz * 0.4) }));
  }
  // taillights, a bumper
  for (const sz of [-1, 1]) L.push(paint(new BoxGeometry(0.06, 0.1, 0.24), "#ff5648", { gloss: 1, m4: at(-1.79, 0.58, sz * 0.4) }));
  L.push(paint(new SphereGeometry(1, 16, 8), "#2a2630", { gloss: 0.8, smooth: true, m4: at(1.5, 0.3, 0, 0, 0, 0, [0.34, 0.1, 0.5]) }));
  if (hero) {
    // the bumper's smile: a thin pale tube across the front
    const sm = new CatmullRomCurve3([-0.34, -0.2, 0, 0.2, 0.34].map((z) => new Vector3(1.8, 0.26 + 0.1 * (z / 0.34) ** 2, z)));
    L.push(paint(new TubeGeometry(sm, 14, 0.018, 5), "#fff6e8", { gloss: 1, smooth: true }));
    // a lightning bolt down each flank (orange edge under yellow), and a small one on the hood
    for (const sz of [-1, 1]) {
      const flip = sz < 0 ? Math.PI : 0;
      L.push(boltGeometry("#ff7a14", 0.12, 0.01, sz).applyMatrix4(at(0.1, 0.43, sz * 0.8 + (sz < 0 ? -0.004 : 0.004), 0, flip, 0)));
      L.push(boltGeometry("#ffc820", 0, 0.02, sz).applyMatrix4(at(0.1, 0.43, sz * 0.8 + (sz < 0 ? -0.012 : 0.012), 0, flip, 0)));
    }
    L.push(paint(new BoxGeometry(1.0, 0.012, 0.14), "#ffc820", { gloss: 1, m4: at(1.15, 0.775, 0, 0, 0, -0.1) }));
  }
  if (!hero) for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(paint(tyreGeometry(), "#17151c", { gloss: 0.15, smooth: true, m4: at(sx * WHEEL_X, WHEEL_R, sz * WHEEL_Z) }));
  return merge(L);
}

// the two big windscreen eyes, in a frame whose x is the screen's outward normal and y runs up its slope
export function eyeGeometry() {
  const L = [];
  for (const sz of [-1, 1]) {
    const z = sz * 0.21;
    L.push(paint(new SphereGeometry(1, 18, 10), "#fffdf3", { gloss: 1, smooth: true, m4: at(0, 0, z, 0, 0, 0, [0.03, 0.19, 0.175]) }));
    L.push(paint(new SphereGeometry(1, 14, 8), "#2e83e6", { gloss: 1, smooth: true, m4: at(0.026, -0.015, z + 0.03, 0, 0, 0, [0.012, 0.115, 0.105]) }));
    L.push(paint(new SphereGeometry(1, 12, 8), "#0b0b16", { gloss: 1, smooth: true, m4: at(0.036, -0.015, z + 0.03, 0, 0, 0, [0.01, 0.062, 0.058]) }));
    L.push(paint(new SphereGeometry(1, 8, 6), "#ffffff", { gloss: 1, smooth: true, m4: at(0.046, 0.025, z + 0.0, 0, 0, 0, [0.008, 0.026, 0.026]) }));
  }
  return merge(L);
}
export const EYE = { at: EYE_AT, slope: SLOPE }; // the mesh sits at EYE.at, rotated z by PI/2 - slope

// the number on the doors: white on its own roundel, both sides, a canvas sticker
export function doorNumber() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    g.clearRect(0, 0, 512, 256);
    g.lineJoin = "round";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let px = 190;
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText("3244").width > 470 && px > 80) g.font = `800 ${(px -= 8)}px ${fam}`;
    g.lineWidth = px * 0.2;
    g.strokeStyle = "#1a1030";
    g.strokeText("3244", 256, 138);
    g.fillStyle = "#fffdf4";
    g.fillText("3244", 256, 138);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  const m = new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const geo = new PlaneGeometry(0.86, 0.43);
  const meshes = [-1, 1].map((sz) => {
    const mesh = new Mesh(geo, m);
    mesh.position.set(-0.52, 0.52, sz * 0.812);
    mesh.rotation.y = sz > 0 ? 0 : Math.PI;
    return mesh;
  });
  return { meshes, geo, m, tex };
}
