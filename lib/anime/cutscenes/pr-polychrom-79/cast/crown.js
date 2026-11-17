// CROWN for pr-polychrom-79: the live's gold hair, collar and pauldrons on the pale pup, grown at 0.55 to 1.15 s (world.js hairGeometry, armourGeometry, unchanged).
import { BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { goldMaterial } from "../live/set.js";

const A = Math.PI * 2;
function paint(g, lo, hi = lo, span = 1) {
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

const GOLD_LO = "#c9962b";
const GOLD_HI = "#f2c94c";
const SK = [0.56, 0.52, 0.54];
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
function hairGeometry() {
  const parts = [];
  const cap = new SphereGeometry(1, 20, 10, 0, A, 0, 0.8).scale(SK[0] * 1.01, SK[1] * 1.01, SK[2] * 1.01);
  parts.push(paint(clean(cap), GOLD_LO, GOLD_HI, 0.5));
  for (const [f, t1, w, lf] of [[0, -2.3, 0.075, 0.5], [-0.38, -2.25, 0.07, 0.5], [0.38, -2.25, 0.07, 0.5], [-0.7, -2.1, 0.06, 0.4], [0.7, -2.1, 0.06, 0.4], [-0.95, -1.9, 0.05, 0.3], [0.95, -1.9, 0.05, 0.3]]) parts.push(lock(f, 0.75, t1, w, lf));
  for (const f of [-0.18, 0.18]) parts.push(lock(f, 1.05, 0.35, 0.05, 0.6, 10));
  return mergeGeometries(parts);
}
function armourGeometry() {
  const parts = [];
  const gold = (g, a = GOLD_LO, b = GOLD_HI, span = 0.3) => paint(clean(g), a, b, span);
  parts.push(gold(new TorusGeometry(0.42, 0.028, 8, 48).rotateX(Math.PI / 2).translate(0, -0.36, 0), GOLD_LO, GOLD_HI, 0.4));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * A;
    parts.push(gold(new OctahedronGeometry(0.03).scale(1, 0.7, 1).translate(Math.sin(a) * 0.42, -0.36, Math.cos(a) * 0.42), GOLD_LO, GOLD_HI, 1));
  }
  parts.push(paint(clean(new SphereGeometry(0.04, 10, 8).translate(0, -0.37, 0.435)), "#d3122e", "#ff4a5a", 1));
  parts.push(gold(new CylinderGeometry(0.035, 0.05, 0.02, 4).rotateX(Math.PI / 2).translate(0, -0.37, 0.43), GOLD_LO, GOLD_HI, 1));
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

export function buildCrown() {
  const group = new Group(), mat = goldMaterial();
  const hair = new Mesh(hairGeometry(), mat), armour = new Mesh(armourGeometry(), mat);
  group.add(hair, armour);
  return {
    group,
    set(k) { group.scale.setScalar(Math.max(k, 1e-4)); group.visible = k > 0.001; },
    dispose() { hair.geometry.dispose(); armour.geometry.dispose(); mat.dispose(); group.removeFromParent(); },
  };
}
