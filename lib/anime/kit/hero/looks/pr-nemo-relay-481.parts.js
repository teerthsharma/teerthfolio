// PARTS for the pr-nemo-relay-481 look (Son Goku, Ultra Instinct): the orange gi vest that leaves a belly strip, the
// blue sash with its short tail, built on the shared torso rows and sdf modeller.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { TORSO, cached, darker, fieldOf, piece, torsoRow } from "../body.js";

export const GI = "#f08a1f", GI_SH = "#da6d17", SASH = "#2a50c0", SASH_SH = "#263f90", INK = "#1c1230";
const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
const grown = (g) => (x, y, z) => TF(x, y, z) - g;
const dirOf = (th) => new Vector3(Math.sin(th), 0, Math.cos(th));
const tube = (pts, r, seg = 40) => new TubeGeometry(new CatmullRomCurve3(pts), seg, r, 6, false);

function along(F, o, d) {
  let a = 0, b = 0.7;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (F(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
const onF = (F, th, y, lift = 0) => { const d = dirOf(th), o = new Vector3(0, y, -0.02); return o.addScaledVector(d, along(F, o, d) + lift); };

function fig(engine, geo, ink) {
  const f = engine.figure(geo, { ink, lineMul: 1.3 });
  f.userData.hull.uniforms.uConst.value = 1;
  return f;
}

// the opening: half-width of the belly strip at height y (wide at the waist, closing toward the neck)
const strip = (y) => 0.098 - 0.04 * Math.max(0, (y - 0.3) / 0.2);

// a closed ring that hugs F between y0 and y1 and stands `out` proud
function ring(F, y0, y1, out, seg = 80) {
  const prof = [[0.0, y0], [out, y0 + 0.2 * (y1 - y0)], [out, y1 - 0.2 * (y1 - y0)], [0.0, y1]], M = prof.length, pos = [], idx = [];
  for (let i = 0; i < seg; i++) {
    const d = dirOf((i / seg) * Math.PI * 2);
    for (const [off, y] of prof) { const r = along(F, new Vector3(0, y, -0.02), d); pos.push(d.x * (r + off), y, -0.02 + d.z * (r + off)); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = ((i + 1) % seg) * M + j; idx.push(a, ((i + 1) % seg) * M + j + 1, b, a, i * M + j + 1, ((i + 1) % seg) * M + j + 1); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getZ(2) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

export function giVest(engine) {
  const geo = cached("nemo481|vest", () => {
    const G = 0.022, m = paint(GI, GI_SH), F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, m, G)));
    const arm = [0.235, 0.4, 0.03], f = (x, y, z) => Math.max(F(x, y, z), 0.11 - y, y - 0.5,
      Math.min(z - 0.02, strip(y) - Math.abs(x)), 0.068 - Math.hypot(x - arm[0] * Math.sign(x || 1), y - arm[1], z - arm[2]), y > 0.43 ? 0.14 - Math.hypot(x, z + 0.02) : -1);
    const body = polygonize([{ f, m, k: 0, lo: [-0.45, 0, -0.4], hi: [0.45, 0.6, 0.4] }], 0.008);
    const Fg = grown(G), parts = [body];
    for (const s of [1, -1]) {
      const pts = [];
      for (let y = 0.49; y >= 0.125; y -= 0.025) pts.push(onF(Fg, Math.atan2(s * (strip(y) + 0.006), 0.2), y, 0.003));
      parts.push(piece(tube(pts, 0.0085), darker(GI, 0.62), darker(GI, 0.42)));
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return fig(engine, geo, "#5a2a14");
}

export function blueSash(engine) {
  const geo = cached("nemo481|sash", () => {
    const Fg = grown(0.034), parts = [piece(ring(Fg, 0.15, 0.232, 0.012), SASH, SASH_SH)];
    const k = onF(Fg, -0.55, 0.19, 0.016);
    parts.push(piece(tube([k, k.clone().add(new Vector3(-0.02, -0.06, 0.01)), k.clone().add(new Vector3(-0.035, -0.14, 0.004))], 0.013, 14), SASH, SASH_SH));
    parts.push(piece(tube([k, k.clone().add(new Vector3(0.012, -0.05, 0.012)), k.clone().add(new Vector3(0.006, -0.1, 0.008))], 0.011, 12), SASH, SASH_SH));
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return fig(engine, geo, INK);
}
