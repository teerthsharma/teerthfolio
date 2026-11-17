// SINBAD (Magi) PARTS: the pieces of this look the shared hero rig does not offer. A black feather wing cloak
// (5 blades a side, one figure), two red scarves whipping up and out (one figure each, rigid sway on the stepped
// clock), hanging waist panels and flat black cut markings laid on the torso (one figure on the body).
import { BufferAttribute, BufferGeometry, Color, ExtrudeGeometry, Group, Matrix4, OctahedronGeometry, Shape, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TORSO, cached, darker, fieldOf, piece, torsoRow } from "../body.js";

const INK = "#1a1424", INK_SHADE = "#0b0916", FEATHER_EDGE = "#4a3a82", RED = "#b32a3a", RED_EDGE = "#e0586a", GOLD = "#d9a83a", GOLD_SH = "#a8741a";
const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));

// recolour a non-indexed piece per triangle: fn(cx, cy, cz, seg) -> [colour, shade]
function colour(g, fn) {
  const P = g.attributes.position, A = g.attributes.aCol, S = g.attributes.aShade, tmp = new Color();
  for (let t = 0; t < P.count; t += 3) {
    const cx = (P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3, cy = (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3, cz = (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3;
    const [c, s] = fn(cx, cy, cz, t / 3);
    for (let k = 0; k < 3; k++) { tmp.set(c); A.setXYZ(t + k, tmp.r, tmp.g, tmp.b); tmp.set(s); S.setXYZ(t + k, tmp.r, tmp.g, tmp.b); }
  }
  return g;
}
const flipX = (g) => {
  const m = g.clone();
  for (const a of Object.values(m.attributes)) { const n = a.itemSize, r = a.array; for (let t = 0; t < a.count; t += 3) for (let k = 0; k < n; k++) { const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k; [r[i1], r[i2]] = [r[i2], r[i1]]; } }
  const p = m.attributes.position.array, nr = m.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) { p[i] = -p[i]; nr[i] = -nr[i]; }
  return m;
};
const tinted = (geo, col, shade) => { const g = piece(geo.index ? geo.toNonIndexed() : geo, col, shade); return g; };

// ---- feathers ---------------------------------------------------------------------------------------------
// a leaf outline with a barbed edge, extruded thin; bends toward +x along its length
function blade(L, W, bend, seed) {
  const sh = new Shape(), n = 9, side = (s) => W * 0.5 * Math.sin(Math.PI * Math.min(1, s * 1.1) ** 0.75) * (1 - s) ** 0.25;
  const bx = (s) => bend * s * s;
  sh.moveTo(0, 0);
  for (let i = 1; i <= n; i++) { const s = i / n, k = 1 + (i % 2 ? 0.2 : -0.05) * (1 - s); sh.lineTo(bx(s) + side(s) * k, L * s); }
  for (let i = n; i >= 1; i--) { const s = i / n, k = 1 + ((i + seed) % 2 ? 0.2 : -0.05) * (1 - s); sh.lineTo(bx(s) - side(s) * k, L * s); }
  const g = new ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -0.006);
  return g;
}
function wingGeometry() {
  return cached("mono|wings", () => {
    const parts = [], root = new Vector3(0.1, 0.43, -0.2);
    const spec = [[0.55, 0.5, 0.13], [0.9, 0.5, 0.13], [1.3, 0.46, 0.12], [1.7, 0.4, 0.11], [2.1, 0.34, 0.1]];
    spec.forEach(([phi, L, W, ] , i) => {
      const psi = 0.35 - 0.04 * i, d = new Vector3(Math.sin(phi) * Math.cos(psi), -Math.cos(phi) * Math.cos(psi), -Math.sin(psi)).normalize();
      const z0 = new Vector3(0, 0, 1), z = z0.clone().addScaledVector(d, -z0.dot(d)).normalize(), x = new Vector3().crossVectors(d, z).normalize();
      const M = new Matrix4().makeBasis(x, d, z).setPosition(root.x + 0.02 * i, root.y - 0.015 * i, root.z - 0.012 * i);
      const g = blade(L, W, 0.06, i).applyMatrix4(M);
      parts.push(colour(tinted(g, INK, INK_SHADE), (cx, cy) => {
        const along = Math.hypot(cx - root.x, cy - root.y) / L;
        return along > 0.68 ? [FEATHER_EDGE, darker(FEATHER_EDGE, 0.5)] : [INK, INK_SHADE];
      }));
    });
    const right = mergeGeometries(parts);
    return mergeGeometries([right, flipX(right)]);
  });
}

// ---- ribbons ----------------------------------------------------------------------------------------------
// a thin closed ribbon along `pts`, `wid[i]` wide, the wide face toward +z; edge strips take the lighter colour
function ribbon(pts, wid, thick, col, edge, shadeK = 0.5) {
  const n = pts.length, ring = [[-1, 1], [-0.74, 1], [0.74, 1], [1, 1], [1, -1], [0.74, -1], [-0.74, -1], [-1, -1]], R = ring.length, pos = [], tri = [];
  const frames = pts.map((p, i) => {
    const t = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize(), w = new Vector3().crossVectors(t, new Vector3(0, 0, 1)).normalize();
    return { w, nn: new Vector3().crossVectors(t, w).normalize() };
  });
  pts.forEach((p, i) => { const { w, nn } = frames[i]; const half = wid[i] / 2; for (const [a, b] of ring) pos.push(p.x + w.x * a * half + nn.x * b * thick, p.y + w.y * a * half + nn.y * b * thick, p.z + w.z * a * half + nn.z * b * thick); });
  const seg = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + ((j + 1) % R), c = (i + 1) * R + ((j + 1) % R), d = (i + 1) * R + j;
    tri.push(a, c, b, a, d, c); seg.push(j, j);
  }
  const last = (n - 1) * R;
  for (const [base, flip] of [[0, 1], [last, 0]]) for (let j = 1; j < R - 1; j++) { tri.push(base, base + j + (flip ? 1 : 0), base + j + (flip ? 0 : 1)); seg.push(0); }
  const flat = new Float32Array(tri.length * 3);
  tri.forEach((v, k) => { flat[k * 3] = pos[v * 3]; flat[k * 3 + 1] = pos[v * 3 + 1]; flat[k * 3 + 2] = pos[v * 3 + 2]; });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(flat, 3));
  g.computeVertexNormals();
  tinted(g, col, darker(col, shadeK));
  return colour(g, (cx, cy, cz, k) => (seg[k] % 2 === 0 && seg[k] !== 2 && seg[k] !== 5 ? [edge, darker(edge, 0.55)] : [col, darker(col, shadeK)]));
}
const curve = (pts, n = 22) => {
  const out = [], P = pts.map((p) => new Vector3(...p));
  for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * (P.length - 1), a = Math.min(P.length - 2, Math.floor(u)), t = u - a, p0 = P[Math.max(0, a - 1)], p1 = P[a], p2 = P[a + 1], p3 = P[Math.min(P.length - 1, a + 2)];
    out.push(new Vector3(...[0, 1, 2].map((k) => 0.5 * (2 * p1.getComponent(k) + (-p0.getComponent(k) + p2.getComponent(k)) * t + (2 * p0.getComponent(k) - 5 * p1.getComponent(k) + 4 * p2.getComponent(k) - p3.getComponent(k)) * t * t + (-p0.getComponent(k) + 3 * p1.getComponent(k) - 3 * p2.getComponent(k) + p3.getComponent(k)) * t * t * t)))); }
  return out;
};

function scarfGeometry() {
  return cached("mono|scarf", () => {
    const pts = curve([[0.1, 0.47, -0.05], [0.17, 0.5, -0.15], [0.23, 0.46, -0.25], [0.28, 0.51, -0.35], [0.33, 0.47, -0.44]], 24);
    const wid = pts.map((_, i) => { const u = i / (pts.length - 1); return 0.022 + 0.018 * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - 0.4 * u) - (u > 0.9 ? 0.015 * (u - 0.9) / 0.1 : 0); });
    return ribbon(pts, wid, 0.012, RED, RED_EDGE);
  });
}
function panelGeometry() {
  return cached("mono|panels", () => {
    const mk = (s) => ribbon(curve([[0.13 * s, 0.2, 0.3], [0.17 * s, 0.14, 0.33], [0.21 * s, 0.08, 0.35], [0.25 * s, 0.025, 0.34]], 12), new Array(12).fill(0).map((_, i) => 0.085 - 0.03 * (i / 11)), 0.004, RED, RED_EDGE);
    return mergeGeometries([mk(1), mk(-1)]);
  });
}

// ---- cut markings -----------------------------------------------------------------------------------------
function along(o, d) { let a = 0, b = 0.7; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (TF(o.x + d.x * m, o.y, o.z + d.z * m) < 0) a = m; else b = m; } return (a + b) / 2; }
const surf = (th, y, lift) => { const d = new Vector3(Math.sin(th), 0, Math.cos(th)), o = new Vector3(0, y, -0.02); return o.addScaledVector(d, along(o, d) + lift); };
// a tapered flame cut from (th0, y0) to (th1, y1): `w` metres wide at the belly, jagged on one side
function shard(th0, y0, th1, y1, w, jag = 0.35) {
  w *= 0.4;
  const n = 9, left = [], right = [], dth = th1 - th0, dy = y1 - y0, len = Math.hypot(dth * 0.28, dy), nx = -dy / len, ny = dth * 0.28 / len;
  for (let i = 0; i <= n; i++) {
    const u = i / n, c = [th0 + dth * u, y0 + dy * u], hw = w * 0.5 * Math.sin(Math.PI * u ** 0.6) ** 0.9 * (1 - 0.6 * u * u), k = 1 + (i % 2 ? jag : -jag * 0.3);
    left.push(surf(c[0] - (nx / 0.28) * hw * k, c[1] - ny * hw * k, 0.004)); right.push(surf(c[0] + (nx / 0.28) * hw, c[1] + ny * hw, 0.004));
  }
  const pos = [];
  for (let i = 0; i < n; i++) pos.push(...left[i].toArray(), ...right[i].toArray(), ...right[i + 1].toArray(), ...left[i].toArray(), ...right[i + 1].toArray(), ...left[i + 1].toArray());
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return tinted(g, INK, INK_SHADE);
}
function markingsGeometry() {
  return cached("mono|marks", () => {
    const parts = [shard(0.05, 0.4, -0.12, 0.27, 0.05), shard(-0.34, 0.38, -0.28, 0.24, 0.035)];
    for (const s of [1, -1]) for (const [t, y0, t1, y1, w] of [[1.0, 0.36, 1.18, 0.2, 0.06], [1.3, 0.31, 1.5, 0.14, 0.055], [1.6, 0.28, 1.78, 0.11, 0.05], [0.72, 0.1, 0.9, 0.03, 0.035]]) parts.push(shard(s * t, y0, s * t1, y1, w));
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
}
// gold pendant on the necklace: two chain links and a gem, hung from the chain's low point
function pendantGeometry() {
  return cached("mono|pendant", () => {
    const at = (y, g) => { const p = surf(0, y, 0.014); return g.translate(p.x, p.y, p.z); };
    return mergeGeometries([at(0.3, new TorusGeometry(0.009, 0.0025, 6, 12)), at(0.278, new TorusGeometry(0.009, 0.0025, 6, 12).rotateY(Math.PI / 2)), at(0.252, new OctahedronGeometry(0.016).scale(0.8, 1.1, 0.5))].map((g) => tinted(g, GOLD, GOLD_SH)));
  });
}

// ---- the dress --------------------------------------------------------------------------------------------
// attaches everything to the hero's body and wraps h.update so the scarves sway on the stepped clock (rigid, pure in ts)
export function dressSinbad(engine, h) {
  const figs = [], make = (geo, o) => { const f = engine.figure(geo, o); f.userData.hull.uniforms.uConst.value = 1; figs.push(f); return f; };
  const wings = make(wingGeometry(), { ink: "#0b0916", lineMul: 0.8 }), pendant = make(pendantGeometry(), { ink: "#4a3208", lineMul: 0.8 }), trim = make(mergeGeometries([markingsGeometry(), panelGeometry()]), { ink: "#0b0916", lineMul: 0.7 });
  const scarf = scarfGeometry(), pivots = [];
  const put = (o) => { h.attach(o, "body"); o.traverse((c) => c.layers.set(1)); return o; };
  put(wings); put(trim); put(pendant);
  for (const s of [1, -1]) {
    const f = make(s > 0 ? scarf : flipX(scarf), { ink: "#4a0f1c", lineMul: 0.9 }), g = new Group();
    g.position.set(0.1 * s, 0.47, -0.05); f.position.set(-0.1 * s, -0.47, 0.05);
    g.add(f); put(g); pivots.push([g, s]);
  }
  const update = h.update;
  h.update = (ts = 0) => {
    for (const [g, s] of pivots) { g.rotation.z = -s * (0.07 * Math.sin(ts * 7.1 + s) + 0.04 * Math.sin(ts * 12.3)); g.rotation.x = 0.06 * Math.sin(ts * 5.3 + s * 1.7); }
    return update(ts);
  };
  return figs.length ? [wings, trim, pendant] : [];
}
