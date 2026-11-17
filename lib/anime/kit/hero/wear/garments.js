// GARMENTS: every torso layer of the hero as cloth. Each layer is a clipped shell (the torso rows grown), then the
// things that make it read as cloth rather than a recoloured body: a rolled hem, a front seam, lapels, a collar that
// stands off the neck with a hard shadow ring under it, and a few designed fold shapes in the shadow tone. A layer
// returns parts [{ geo, bone }] and passes the sleeve it wants on through `st.sleeve` (null = sleeveless).
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ell } from "../../../sdf.js";
import { BONE, TORSO, armJoints, darker, mirrorX, piece, torsoRow, withBone } from "../body.js";
import { propGeometry } from "./props.js";
import { ALL_ROWS, P, TAU, pg, along, band, clipped, dirOf, grown, lobes, onF, patch, poly, stud, strip, taper, torsoShell, tube } from "./geo.js";

const C0 = [0, 0, -0.02];
const lum = (h) => { const c = new Color(h); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };
const lift = (h) => `#${new Color(h).multiplyScalar(2.6).addScalar(0.045).getHexString()}`;
const lerp = (a, b, t) => a + (b - a) * t;
// a near-black cloth shade lifted to a blue-grey so its one hard shadow step reads
const shadeOf = (o) => { const s = o.shade ?? darker(o.col, 0.5); if (lum(s) >= 0.02) return s; const c = new Color(s); c.r += 0.006; c.g += 0.006; c.b += 0.016; return `#${c.getHexString()}`; };
const body = (geo) => ({ geo, bone: BONE.body });
const dec = (geo, col, line = 0.45) => body(piece(geo, col, darker(col, 0.7), { line }));
const shell = (m, g, clip) => body(pg([torsoShell(ALL_ROWS, g, clip, m)], 0.009));

// the hem rides a gentle wave (about 7 cycles round) so it is cloth, not a ruler line
const hemWave = (th, amp) => amp * (Math.sin(th * 7 + 0.6) + 0.5 * Math.sin(th * 3 - 1));
const hemAt = (x, z, amp) => hemWave(Math.atan2(x, z), amp);

// a closed rolled tube round the body at height y (a hem, a belt edge, a collar base)
export function ring(F, y, r, lift = 0.004, c = C0, seg = 96, amp = 0) {
  const pts = []; for (let i = 0; i < seg; i++) { const th = (i / seg) * TAU; pts.push(onF(F, c, th, y + hemWave(th, amp), lift)); }
  return new TubeGeometry(new CatmullRomCurve3(pts, true), seg * 2, r, 6, true);
}

// a collar that stands off the neck: an outer wall, an inner wall and a rounded rim, flaring open at the top.
// `gap` is the half angle left open at the front, `lean` pushes the front further out than the back.
export function stand(F, y0, y1, o = {}) {
  const seg = o.seg ?? 72, out = o.out ?? 0.014, flare = o.flare ?? 0.02, thick = o.thick ?? 0.009, gap = o.gap ?? 0, lean = o.lean ?? 0, dip = o.dip ?? 0, rise = o.rise ?? 0, rows = 6, ref = o.ref ?? (y0 + y1) / 2, c = o.c ?? C0;
  const prof = [];
  for (let j = 0; j <= rows; j++) { const t = j / rows; prof.push([out + flare * t ** 1.4, t]); }
  for (let j = rows; j >= 0; j--) { const t = j / rows; prof.push([Math.max(0.002, out - thick) + flare * 0.7 * t ** 1.4, t, j === rows ? 0.003 : 0]); }
  const M = prof.length, pos = [], idx = [], steps = seg + 1, rim = [];
  for (let i = 0; i < steps; i++) {
    const th = gap + (i / seg) * (TAU - 2 * gap), d = dirOf(th), r0 = along(F, new Vector3(c[0], ref, c[2]), d), front = Math.max(0, Math.cos(th)) * lean, top = y1 - dip * Math.max(0, Math.cos(th)) + rise * ((1 - Math.cos(th)) / 2) ** 1.3;
    for (const [off, t, sink = 0] of prof) { const y = lerp(y0, top, t) - sink, r = Math.max(along(F, new Vector3(c[0], y, c[2]), d), 0.55 * r0); pos.push(c[0] + d.x * (r + off + front * (y - y0)), y, c[2] + d.z * (r + off + front * (y - y0))); }
    const rt = Math.max(along(F, new Vector3(c[0], top, c[2]), d), 0.55 * r0);
    rim.push(new Vector3(c[0] + d.x * (rt + out + flare + front * (top - y0)), top, c[2] + d.z * (rt + out + flare + front * (top - y0))));
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = (i + 1) * M + j; idx.push(a, b + 1, b, a, a + 1, b + 1); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.rim = rim;
  const d0 = dirOf(gap + (seg / 2 / seg) * (TAU - 2 * gap)), n0 = [g.attributes.normal.getX(M * (seg / 2)), g.attributes.normal.getZ(M * (seg / 2))];
  if (n0[0] * d0.x + n0[1] * d0.z < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// a stand collar plus its rolled top edge in `edge` colour
function collar(F, y0, y1, o, col, shade, edge) {
  const g = stand(F, y0, y1, o), e = edge ?? darker(col, 1.35);
  return [body(piece(g, col, shade, { line: 1 })), body(piece(tube(g.userData.rim.filter((_, i) => i % 3 === 0), 0.0052, 40), e, darker(e, 0.5), { line: 0.9 }))];
}
// designed fold shapes: tapered decals in the shadow tone that run from the hem toward the waist
function folds(F, hem, top, ths, col0, o = {}) {
  const out = [], col = o.base && lum(o.base) < 0.14 ? lift(o.base) : col0;
  for (const th of ths) {
    const k = Math.sign(th) * (o.pull ?? 0.5), n = 5, path = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1); path.push([th + (th * k * t) - Math.sign(th) * 0.12 * Math.sin(t * 3.1), lerp(hem + 0.012, top, t)]); }
    out.push(dec(strip(F, C0, path, o.w ?? 0.016, 0.002, 0.0016), col, 0.3));
  }
  return out;
}
// the shadow ring: a hard dark band on the body just under a collar or a belt
const shadowRing = (F, y, w, col, from = 0.9) => dec(strip(F, C0, Array.from({ length: 49 }, (_, i) => [from + (i / 48) * (TAU - 2 * from), y]), w, w, 0.0012), col, 0.2);

// a button: a domed stud with a rim ring, lying on the surface
function button(F, y, th, r, col, shade) {
  const p = onF(F, C0, th, y, 0.001), g = stud(F, p, r, 0.55);
  return body(piece(g, col, shade ?? darker(col, 0.5), { line: 0.8 }));
}

// ---- tailored garments: jacket, uniform, blazer, vest, tabard, gi vest, tunic -------------------------------------
const KINDS = {
  uniform: { hem: 0.1, collar: "stand", sleeves: "fitted", buttons: 3 },
  jacket: { hem: 0.1, collar: "stand", sleeves: "fitted", buttons: 3 },
  blazer: { hem: 0.1, collar: "open", sleeves: "fitted", buttons: 2, shirt: "#efece4", tie: true, notch: true },
  vest: { hem: 0.09, collar: "v", sleeves: "none", buttons: 3 },
  tabard: { hem: 0.1, collar: "round", sleeves: "none", buttons: 0, panels: true },
  gi: { hem: 0.12, collar: "wrap", sleeves: "none", buttons: 0, v0: 0.2 },
  tunic: { hem: 0.07, collar: "round", sleeves: "fitted", buttons: 0, belt: true, laces: true },
};

function tailored(o, st, kind) {
  const k = { ...KINDS[kind], ...o }, shadeC = shadeOf(o), m = P(o.col, shadeC), g = st.g + 0.011, F = grown(g), out = [], amp = o.hemWave ?? 0.012;
  const trim = o.trim ?? darker(o.col, 1.6), hem = k.hem, mode = k.collar, open = mode === "open" || mode === "v" || mode === "wrap";
  const v0 = k.v0 ?? 0.27, slope = mode === "wrap" ? 0.135 / (0.5 - v0) : 0.6, vw = (y) => Math.max(0, (y - v0) * slope), top = open ? v0 : 0.44;
  const sleeveless = k.sleeves === "none", ah = (x, y, z) => (sleeveless ? 0.1 - Math.hypot(Math.abs(x) - 0.238, y - 0.43, (z - 0.03) * 1.2) : -1);
  out.push(shell(m, g, (x, y, z) => Math.max(hem + hemAt(x, z, amp) - y, y - 0.5, ah(x, y, z), open ? Math.min(z, vw(y) - Math.abs(x)) : -1)));
  const shirtCol = k.shirt, sF = grown(g - 0.005);
  if (open && shirtCol) out.push(body(pg([clipped(["neck", "trap", "chest"].map((n) => torsoRow(n, P(shirtCol), g - 0.005)), (x, y, z) => Math.max(0.05 - z, y - 0.5, 0.24 - y), P(shirtCol))], 0.007)));
  if (open && shirtCol && k.tie) {
    const tc = typeof k.tie === "string" ? k.tie : (o.tieCol ?? "#16213a");
    out.push(dec(patch(sF, C0, 0, 0.452, lobes([[0, 0, 0.0155], [0.005, 0.004, 0.0135]]), { lift: 0.003 }), tc, 0.8));
    out.push(dec(poly(sF, C0, [[-0.06, 0.44], [0.06, 0.44], [0.092, 0.3], [0, 0.262], [-0.092, 0.3]], 0.0026), tc, 0.8));
    out.push(dec(strip(sF, C0, [[0, 0.43], [0, 0.285]], 0.004, 0.004, 0.0034), darker(tc, 0.6), 0.3));
  }
  if (open) {
    const lap = o.lapel ?? darker(o.col, 1.7), edge = [];
    for (let y = 0.5; y >= v0 - 0.004; y -= 0.02) edge.push(y);
    for (const s of [1, -1]) {
      const path = edge.map((y) => [s * Math.atan2(vw(y) + 0.004, 0.2), y]);
      out.push(dec(strip(F, C0, path, k.notch ? 0.034 : 0.026, k.notch ? 0.01 : 0.016, 0.0028), lap, 0.7));
      out.push(body(piece(tube(path.map(([th, y]) => onF(F, C0, th, y, 0.0045)), 0.0045), darker(o.col, 1.3), shadeC, { line: 0.9 })));
    }
  }
  if (!open && mode !== "round" && mode !== false) {
    out.push(...collar(F, 0.425, mode === "high" ? 0.59 : 0.54, mode === "high" ? { out: 0.02, flare: 0.034, thick: 0.01, lean: 0.03, dip: 0.04, rise: 0.12, gap: 0.5 } : { out: 0.009, flare: 0.016, thick: 0.008, lean: 0.03, dip: 0.035, rise: 0.05 }, o.col, shadeC));
    out.push(shadowRing(F, 0.418, 0.014, darker(shadeC, 0.7)));
    out.push(dec(strip(F, C0, [[-0.5, 0.42], [-0.3, 0.428], [0.3, 0.428], [0.5, 0.42]].map(([t, y]) => [t, y]), 0.01, 0.01, 0.014), darker(shadeC, 0.9), 0.5));
  } else if (mode === "round") {
    out.push(body(piece(ring(F, 0.465, 0.0095, 0.004), trim, darker(trim, 0.6), { line: 0.9 })));
    out.push(shadowRing(F, 0.448, 0.012, shadeC));
  }
  if (open) out.push(...collar(F, 0.43, 0.5, { out: 0.01, flare: 0.012, thick: 0.008, gap: 0.35, lean: 0.02 }, o.col, shadeC));
  if (open && shirtCol) out.push(...collar(sF, 0.45, 0.5, { out: 0.004, flare: 0.01, thick: 0.004, gap: 0.5, ref: 0.47 }, shirtCol, darker(shirtCol, 0.7), shirtCol));
  if (mode === "wrap") for (const s of [1, -1]) {
    const path = []; for (let y = 0.5; y >= 0.19; y -= 0.025) path.push([s * Math.atan2(vw(y) + 0.004, 0.2), y]);
    out.push(dec(strip(F, C0, path, 0.03, 0.02, 0.003), trim, 0.8));
  }
  out.push(body(piece(ring(F, hem + 0.003, 0.0072, 0.004, C0, 96, amp), k.hemCol ?? darker(o.col, 1.35), shadeC, { line: 1 })));
  const seam = []; for (let y = top; y >= hem + 0.01; y -= 0.03) seam.push([0, y]);
  if (mode !== "wrap") out.push(dec(strip(F, C0, seam, 0.0052, 0.0052, 0.002), darker(shadeC, 0.75), 0.6));
  if (o.folds !== false) out.push(...folds(F, hem, hem + 0.19, [0.95, 1.55, -0.95, -1.55], darker(shadeC, 0.85), { base: o.col }), ...folds(F, 0.3, 0.38, [2.7, -2.7], darker(shadeC, 0.85), { w: 0.02, base: o.col }), ...folds(F, 0.17, 0.32, [0.45, -0.45], darker(shadeC, 0.85), { w: 0.018, pull: 0.8, base: o.col }));
  const nb = k.buttons;
  for (let i = 0; i < nb; i++) out.push(button(F, top - 0.035 - i * (top - hem - 0.03) / Math.max(3, nb), 0, 0.0135, trim, darker(trim, 0.55)));
  if (k.panels) {
    const pc = o.panel ?? "#b8262c", pd = darker(pc, 0.55);
    for (const s of [1, -1]) {
      const path = [[1.28, 0.44], [1.32, 0.27], [1.22, hem + 0.01]].map(([t, y]) => [s * t, y]);
      out.push(dec(strip(F, C0, path, 0.1, 0.13, 0.003), pc, 0.8));
      out.push(dec(strip(F, C0, path.map(([t, y]) => [t - s * 0.06, y]), 0.004, 0.004, 0.0035), pd, 0.4));
    }
  }
  if (k.belt) {
    const bc = typeof k.belt === "string" ? k.belt : (o.belt ?? "#5a3c22"), y = o.beltAt ?? 0.185;
    out.push(body(piece(band(F, C0, y - 0.016, y + 0.016, 0.009), bc, darker(bc, 0.5), { line: 1 })));
    out.push(shadowRing(F, y - 0.03, 0.012, darker(shadeC, 0.8)));
    const bk = onF(F, C0, 0, y, 0.011);
    out.push(body(piece(plateAt(0.042, 0.036, 0.012, bk), o.buckle ?? "#d9b34a", "#7a5612", { line: 0.9 })));
    if (o.beads) out.push(body(piece(beadChain(F, y + 0.03, 0.007, 60), o.beads, darker(o.beads, 0.5))));
  }
  if (k.laces) {
    const lc = o.lace ?? "#d8c9a4";
    for (let y = 0.47; y > 0.38; y -= 0.03) for (const s of [1, -1]) out.push(dec(strip(F, C0, [[s * 0.2, y], [0, y - 0.018], [-s * 0.2, y]].map(([t, yy]) => [t * 0.5, yy]), 0.007, 0.007, 0.004), lc, 0.5));
  }
  st.g = g;
  st.sleeve = sleeveless ? null : { m, trim: o.cuffs === false ? null : P(o.col, o.shade), cuffAt: o.cuffAt, rim: o.cuffs === false ? null : (o.cuffTrim ?? darker(o.col, 1.35)), wide: false };
  return out;
}

// a rounded plate standing proud at point p, facing the surface normal: belt buckles, clasps, brooches
function plateAt(w, h, d, p) {
  const g = new SphereGeometry(0.5, 14, 10).scale(w, h, d).translate(p.x, p.y, p.z);
  return g;
}
function beadChain(F, y, r, n) {
  const parts = [];
  for (let i = 0; i < n; i++) { const th = (i / n) * TAU, p = onF(F, C0, th, y + 0.006 * Math.sin(th * 6), 0.008); parts.push(new SphereGeometry(r, 8, 6).translate(p.x, p.y, p.z)); }
  return mergeGeometries(parts);
}

// ---- long outer wear: coat, haori, cloak, mantle ----------------------------------------------------------------
// a front-open shell with hem rim, edge trim, collar, folds and an optional printed motif
function longcoat(o, st, kind) {
  const D = { coat: { grow: 0.014, hem: 0.03, collar: "stand", w0: 0.03, w1: 0.2, sleeves: "fitted" }, haori: { grow: 0.02, hem: 0.03, collar: "fold", w0: 0.045, w1: 0.17, sleeves: "wide" },
    cloak: { grow: 0.026, hem: 0.03, collar: "high", w0: 0.03, w1: 0.12, sleeves: "wide", skirt: true }, mantle: { grow: 0.034, hem: 0.1, collar: "round", w0: 0.02, w1: 0.05, sleeves: "short", skirt: true } }[kind];
  const k = { ...D, ...o }, shadeC = shadeOf(o), m = P(o.col, shadeC), g = st.g + k.grow, F = grown(g), amp = o.hemWave ?? 0.012, trim = o.trim ?? darker(o.col, 0.8), out = [];
  const w = (y) => k.w0 + k.w1 * Math.max(0, 0.44 - y), hem = k.hem;
  const rows = ALL_ROWS.map((n) => torsoRow(n, m, g + (n === "base" ? 0.02 : 0)));
  if (k.skirt) rows.push(ell([0, 0.06, 0], [0.33 + g, 0.07, 0.285 + g], m, 0.06));
  const sleeveless = k.sleeves === "none";
  out.push(body(pg([clipped(rows, (x, y, z) => Math.max(hem + hemAt(x, z, amp) - y, y - 0.5, Math.min(z, w(y) - Math.abs(x)), sleeveless ? 0.1 - Math.hypot(Math.abs(x) - 0.238, y - 0.43, (z - 0.03) * 1.2) : -1), m)], 0.009)));
  const edge = []; for (let y = 0.46; y >= hem + 0.01; y -= 0.03) edge.push(y);
  for (const s of [1, -1]) {
    const path = edge.map((y) => [s * Math.atan2(w(y) + 0.004, 0.2), y]);
    out.push(dec(strip(F, C0, path, 0.026, 0.026, 0.0026), trim, 0.8));
    out.push(body(piece(tube(path.map(([th, y]) => onF(F, C0, th, y, 0.0042)), 0.0042), darker(trim, 0.7), darker(trim, 0.4), { line: 0.9 })));
  }
  out.push(body(piece(ring(F, hem + 0.004, 0.0085, 0.004, C0, 96, amp), k.hemCol ?? trim, darker(trim, 0.5), { line: 1 })));
  const top = k.collar === "round" ? 0.5 : k.collar === "high" ? 0.55 : 0.52;
  if (k.collar === "stand" || k.collar === "high") {
    out.push(...collar(F, 0.41, top, { out: 0.012, flare: 0.02, thick: 0.009, gap: k.collar === "high" ? 0.62 : 0.4, rise: 0.05, dip: 0.03 }, o.col, shadeC, trim));
    out.push(shadowRing(F, 0.4, 0.016, darker(shadeC, 0.75)));
  } else if (k.collar === "fold") {
    out.push(body(piece(stand(F, 0.43, 0.5, { out: 0.012, flare: 0.015, thick: 0.008, gap: 0.55, lean: 0.01 }), trim, darker(trim, 0.5), { line: 1 })));
  } else out.push(body(piece(ring(F, 0.47, 0.011, 0.005), trim, darker(trim, 0.6), { line: 0.9 })));
  out.push(...folds(F, hem, hem + 0.3, [0.8, 1.45, 2.15, 2.8, -0.8, -1.45, -2.15, -2.8], darker(shadeC, 0.85), { w: 0.02, pull: 0.35, base: o.col }));
  if (k.motif === "clouds") out.push(...clouds(F, o.cloud ?? "#b8141c", o.cloudEdge ?? "#f2efe6"));
  if (k.motif === "flame") out.push(...flames(F, hem, o.flame ?? "#e0502a", o.flameTip ?? "#f4c04a"));
  if (k.motif === "hearts") out.push(...hearts(F, o.heart ?? "#f6efe4"));
  st.g = g;
  st.sleeve = sleeveless ? null : { m, trim: k.cuffTrim ? P(k.cuffTrim) : null, wide: k.sleeves === "wide" || k.sleeves === "short", endAt: k.sleeves === "short" ? armJoints(1).E[1] - 0.05 : undefined, rim: o.cuffTrim ?? trim };
  return out;
}

// red cloud print: a pale outline patch under a red lobed patch, scattered round the coat
function clouds(F, red, edge) {
  const out = [], cs = (r) => [[0, 0, r], [-0.5 * r, -0.12 * r, 0.62 * r], [0.52 * r, -0.08 * r, 0.66 * r], [0.12 * r, 0.3 * r, 0.55 * r]];
  for (const [th, y, r] of [[0.62, 0.2, 0.034], [-0.6, 0.12, 0.03], [1.5, 0.27, 0.036], [-1.5, 0.17, 0.034], [2.35, 0.1, 0.03], [-2.4, 0.26, 0.032], [0.95, 0.09, 0.026], [3.05, 0.17, 0.034]]) {
    out.push(dec(patch(F, C0, th, y, lobes(cs(r * 1.28)), { lift: 0.0034, sx: 1.1 }), edge, 0.3), dec(patch(F, C0, th, y, lobes(cs(r)), { lift: 0.0046, sx: 1.1 }), red, 0.3));
  }
  return out;
}
function flames(F, hem, col, tip) {
  const out = [], n = 13;
  for (let i = 0; i < n; i++) {
    const th = 0.28 + (i / n) * (TAU - 0.56), d = (TAU - 0.56) / n / 2, h = 0.075 + 0.03 * Math.sin(i * 2.3);
    out.push(dec(poly(F, C0, [[th - d, hem + 0.012], [th - d * 0.4, hem + h * 0.5], [th + d * 0.25, hem + h], [th + d * 0.5, hem + h * 0.45], [th + d, hem + 0.012]], 0.003), col, 0.7));
    out.push(dec(poly(F, C0, [[th - d * 0.5, hem + 0.012], [th + d * 0.05, hem + h * 0.55], [th + d * 0.5, hem + 0.012]], 0.0042), tip, 0.4));
  }
  return out;
}
function hearts(F, col) {
  const out = [];
  for (const th of [-0.55, 0, 0.55]) { const lobe = [[-0.4, 0.3, 0.6], [0.4, 0.3, 0.6], [0, -0.2, 0.7]]; out.push(dec(patch(F, C0, th, 0.17, lobes(lobe.map(([a, b, r]) => [a * 0.03, b * 0.03, r * 0.03])), { lift: 0.0034 }), col, 0.4)); }
  return out;
}

// ---- cape, scarves, sash, belt ----------------------------------------------------------------------------------
function cape(o, st) {
  const m = P(o.col, o.shade), shadeC = o.shade ?? darker(o.col, 0.5), e = ell([0, 0.25, 0.03], [0.37, 0.45, 0.35], m, 0), F0 = grown(st.g), out = [];
  const sheet = { f: (x, y, z) => Math.max(Math.abs(e.f(x, y, z, e)) - 0.011, z + 0.05, y - 0.47, 0.03 - y), m, k: 0, lo: e.lo, hi: e.hi };
  out.push(body(pg([sheet], 0.007)));
  const Fe = (x, y, z) => e.f(x, y, z, e) - 0.011, ce = [0, 0, 0.03], gold = o.trim ?? "#d6b04a";
  out.push(...Array.from({ length: 5 }, (_, i) => dec(strip(Fe, ce, [[Math.PI + (i - 2) * 0.42 + 0.02, 0.4], [Math.PI + (i - 2) * 0.5, 0.25], [Math.PI + (i - 2) * 0.58, 0.07]], 0.017, 0.003, 0.0018), darker(shadeC, 1.1), 0.3)));
  const hemPts = Array.from({ length: 36 }, (_, i) => onF(Fe, ce, Math.PI * (0.45 + (i / 35) * 1.1), 0.045, 0.004));
  out.push(body(piece(tube(hemPts, 0.007), gold, darker(gold, 0.5), { line: 0.9 })));
  if (o.fur) {
    const fc = o.fur === true ? "#efe6d4" : o.fur, parts = [];
    for (let i = 0; i < 44; i++) { const th = (i / 44) * TAU, p = onF(F0, C0, th, 0.455 + 0.006 * Math.sin(i * 2.7), 0.026); parts.push(new SphereGeometry(0.026, 9, 6).scale(1, 0.8, 1).translate(p.x, p.y, p.z)); }
    out.push(body(piece(mergeGeometries(parts), fc, darker(fc, 0.72), { line: 0.9 })));
  }
  if (o.clasp !== false) {
    const cl = o.clasp ?? "#b0763a", a = onF(F0, C0, 0.62, 0.44, 0.012), b = onF(F0, C0, -0.62, 0.44, 0.012);
    for (const p of [a, b]) out.push(body(piece(stud(F0, p, 0.021, 0.6), cl, darker(cl, 0.5), { line: 1 })), body(piece(ringAt(F0, p, 0.027, 0.004), darker(cl, 1.25), darker(cl, 0.5), { line: 0.9 })));
    const mid = a.clone().lerp(b, 0.5).add(new Vector3(0, -0.04, 0.045));
    out.push(body(piece(tube([a, mid, b], 0.0032), cl, darker(cl, 0.5), { line: 0.8 })));
  }
  return out;
}
function ringAt(F, p, R, r) {
  const n = new Vector3(F(p.x + 0.002, p.y, p.z) - F(p.x - 0.002, p.y, p.z), F(p.x, p.y + 0.002, p.z) - F(p.x, p.y - 0.002, p.z), F(p.x, p.y, p.z + 0.002) - F(p.x, p.y, p.z - 0.002)).normalize();
  const g = new TorusGeometry(R, r, 8, 22);
  g.lookAt(n);
  return g.translate(p.x + n.x * 0.006, p.y + n.y * 0.006, p.z + n.z * 0.006);
}

// two scarves crossed in an X over the chest, with tails; `neck` adds the loop round the neck
function scarfX(o, st) {
  const F = grown(st.g), out = [], col = o.col, shadeC = o.shade ?? darker(col, 0.5), w = o.w ?? 0.056;
  const diag = (s) => { const path = Array.from({ length: 12 }, (_, i) => { const t = i / 11; return [s * (0.98 - 1.9 * t), 0.455 - 0.3 * t + 0.015 * Math.sin(t * 3.14)]; }); return path; };
  for (const [s, lift] of [[1, 0.011], [-1, 0.016]]) {
    const path = diag(s);
    out.push(body(piece(strip(F, C0, path, w, w * 0.9, lift), col, shadeC, { line: 1 })));
    out.push(dec(strip(F, C0, path.slice(1, 10), 0.004, 0.004, lift + 0.0012), darker(shadeC, 0.8), 0.3));
    out.push(dec(strip(F, C0, path.slice(2, 10).map(([t, y]) => [t, y + 0.016]), 0.003, 0.003, lift + 0.0012), darker(shadeC, 0.9), 0.3));
    const e = onF(F, C0, path[11][0], path[11][1], lift + 0.004);
    out.push(body(piece(taper([e, e.clone().add(new Vector3(s * 0.012, -0.05, 0.025)), e.clone().add(new Vector3(s * 0.02, -0.12, 0.03))], 0.027, 0.006, 16, 8), col, shadeC, { line: 1 })));
  }
  if (o.neck !== false) { out.push(body(piece(ring(F, 0.45, 0.021, 0.014), col, shadeC, { line: 1 }))); out.push(shadowRing(F, 0.425, 0.012, darker(shadeC, 0.75))); }
  return out;
}
function scarf(o, st) {
  const F = grown(st.g), out = [body(piece(band(F, C0, 0.415, 0.5, 0.03, { ref: 0.46 }), o.col, o.shade, { line: 1 })), shadowRing(F, 0.405, 0.012, darker(o.shade ?? darker(o.col, 0.5), 0.75))];
  for (const [th, k] of [[0.35, 1], [0.5, 0.8]]) { const a = onF(F, C0, th, 0.43, 0.03); out.push(body(piece(taper([a, a.clone().add(new Vector3(0.02, -0.09 * k, 0.03)), a.clone().add(new Vector3(0.035, -0.2 * k, 0.045))], 0.022, 0.008, 16, 8), o.col, o.shade))); }
  return out;
}
function sash(o, st) {
  const F = grown(st.g), out = [body(piece(band(F, C0, 0.155, 0.25, 0.015), o.col, o.shade, { line: 1 })), shadowRing(F, 0.147, 0.012, darker(o.shade ?? darker(o.col, 0.5), 0.8))], k = onF(F, C0, -0.4, 0.205, 0.02);
  out.push(body(piece(new SphereGeometry(0.03, 14, 10).scale(1.1, 0.9, 0.7).translate(k.x, k.y, k.z), o.col, o.shade, { line: 1 })));
  for (const dx of [-0.02, 0.026]) out.push(body(piece(taper([k, k.clone().add(new Vector3(dx * 0.6, -0.06, 0.012)), k.clone().add(new Vector3(dx, -0.14, 0.008))], 0.016, 0.01, 14, 8), o.col, o.shade, { line: 1 })));
  out.push(dec(strip(F, C0, [[-0.1, 0.2], [0.9, 0.2], [1.7, 0.2]], 0.004, 0.004, 0.0165), darker(o.shade ?? darker(o.col, 0.5), 0.85), 0.3));
  return out;
}
function belt(o, st) {
  const F = grown(st.g), y = o.at ?? 0.185, col = o.col ?? "#5a3c22", out = [body(piece(band(F, C0, y - 0.021, y + 0.021, 0.011), col, darker(col, 0.5), { line: 1 })), shadowRing(F, y - 0.03, 0.011, darker(col, 0.6))];
  const bk = onF(F, C0, 0, y, 0.012);
  out.push(body(piece(plateAt(0.044, 0.038, 0.012, bk), o.buckle ?? "#d9b34a", "#7a5612", { line: 0.9 })));
  if (o.beads) out.push(body(piece(beadChain(F, y + 0.03, 0.0075, 64), o.beads, darker(o.beads, 0.5))));
  return out;
}
function choker(o, st) {
  const F = grown(st.g), col = o.col ?? "#16121a", out = [body(piece(band(F, C0, o.y0 ?? 0.452, o.y1 ?? 0.49, 0.012, { ref: 0.47 }), col, darker(col, 0.5), { line: 1 }))];
  if (o.ring) { const p = onF(F, C0, 0, 0.46, 0.012); out.push(body(piece(ringAt(F, p, 0.013, 0.0032), o.ringCol ?? "#d9b34a", "#7a5612"))); }
  return out;
}
function necklace(o, st) {
  const F = grown(st.g), parts = [], n = o.n ?? 96, y = (th) => 0.45 - 0.13 * Math.max(0, Math.cos(th)) ** 2;
  for (let i = 0; i < n; i++) { const th = (i / n) * TAU, p = onF(F, C0, th, y(th), 0.006); parts.push(new SphereGeometry(o.r ?? 0.0062, 8, 5).translate(p.x, p.y, p.z)); }
  const out = [body(piece(mergeGeometries(parts), o.col ?? "#d9b34a", o.shade, { line: 0.8 }))];
  if (o.pendant) { const p = onF(F, C0, 0, y(0) - 0.03, 0.012); out.push(body(piece(new TorusGeometry(0.036, 0.009, 8, 28).translate(p.x, p.y - 0.006, p.z), o.col ?? "#d9b34a", o.shade, { line: 0.9 }))); }
  return out;
}

// ---- armour ------------------------------------------------------------------------------------------------------
function armour(o, st) {
  const m = P(o.col, o.shade), trimC = o.trim ?? "#d6b04a", trim = P(trimC), out = [], { S } = armJoints(1);
  const plates = [0, 1, 2].map((i) => ell([S[0] + 0.012 + 0.012 * i, S[1] + 0.036 - 0.03 * i, S[2]], [0.1 - 0.006 * i, 0.024, 0.094 - 0.005 * i], i === 2 ? trim : m, 0.004, [0, 0, -0.5 - 0.12 * i]));
  const pr = withBone(pg(plates, 0.005), BONE.upperR);
  out.push({ geo: pr, bone: null }, { geo: withBone(mirrorX(pr), BONE.upperL), bone: null });
  if (o.plate) out.push(...cuirass({ ...o, studs: o.studs ?? 0 }, st));
  if (o.collar) out.push(...goldCollar({ col: trimC, shade: darker(trimC, 0.5) }, st));
  return out;
}
export function goldCollar(o, st) {
  const F = grown(st.g), col = o.col ?? "#d9b34a", sh = o.shade ?? darker(col, 0.5);
  return [...collar(F, 0.43, 0.52, { out: 0.012, flare: 0.014, thick: 0.01, lean: 0.03, dip: 0.03 }, col, sh, darker(col, 1.2)), shadowRing(F, 0.4, 0.014, darker(sh, 0.8))];
}
// chest plate or leather cuirass: a shell with a rim, a centre ridge, a scalloped hem and studs
function cuirass(o, st) {
  const m = P(o.col, o.shade), g = st.g + (o.grow ?? 0.02), F = grown(g), shadeC = o.shade ?? darker(o.col, 0.5), trimC = o.trim ?? "#d6b04a", out = [];
  const lo = o.lo ?? 0.12;
  out.push(shell(m, g, (x, y, z) => Math.max(0.04 - z, y - 0.465, lo - y, Math.abs(x) - 0.27)));
  out.push(body(piece(ring(F, lo + 0.004, 0.007, 0.003), trimC, darker(trimC, 0.5), { line: 1 })));
  out.push(dec(strip(F, C0, [[0, 0.46], [0, (0.46 + lo) / 2], [0, lo + 0.01]], 0.01, 0.01, 0.0025), darker(shadeC, 0.8), 0.5));
  for (const s of [1, -1]) out.push(dec(strip(F, C0, [[s * 0.9, 0.46], [s * 0.7, 0.38], [s * 0.55, 0.28], [s * 0.5, lo + 0.01]], 0.014, 0.004, 0.0024), darker(shadeC, 0.85), 0.4));
  for (let i = 0; i < (o.studs ?? 3); i++) for (const s of [-1, 1]) out.push(button(F, 0.4 - i * 0.07, s * 0.55, 0.0145, trimC, darker(trimC, 0.5)));
  out.push(...folds(F, lo, lo + 0.1, [0.4, -0.4], darker(shadeC, 0.85), { w: 0.013 }));
  return out;
}
function bracers(o) {
  const { W } = armJoints(1), c = o.col ?? "#d9b34a", sh = o.shade ?? darker(c, 0.5);
  const ringG = (y, r, R) => new TorusGeometry(R, r, 8, 28).rotateX(Math.PI / 2).translate(W[0], y, W[2]);
  const bandG = pg([{ ...cylinderPrim(W, W[1] + 0.085, W[1] + 0.02, 0.0505, 0.047, P(c, sh)) }], 0.004);
  const make = (bone) => withBone(mergeGeometries([bandG.clone(), piece(ringG(W[1] + 0.088, 0.0046, 0.051), darker(c, 1.15), sh), piece(ringG(W[1] + 0.02, 0.0046, 0.0475), darker(c, 1.15), sh), ...(o.studs ? [0.05, 0.07].map((y) => piece(new SphereGeometry(0.008, 10, 6).scale(1, 1, 0.5).translate(W[0], W[1] + y, W[2] + 0.052), darker(c, 1.25), sh)) : [])]), bone);
  const r = make(BONE.foreR);
  return [{ geo: r, bone: null }, { geo: withBone(mirrorX(r), BONE.foreL), bone: null }];
}
function cylinderPrim(W, y1, y0, r1, r2, m) {
  return { f: (x, y, z) => Math.max(Math.hypot(x - W[0], z - W[2]) - lerp(r2, r1, (y - y0) / (y1 - y0)), y0 - y, y - y1) , m, k: 0, lo: [W[0] - r1 - 0.01, y0 - 0.01, W[2] - r1 - 0.01], hi: [W[0] + r1 + 0.01, y1 + 0.01, W[2] + r1 + 0.01] };
}
function bands(o) {
  const { W } = armJoints(1), m = P(o.col ?? "#1a120c", o.shade);
  const r = withBone(pg([{ ...cylinderPrim(W, W[1] + 0.05, W[1] + 0.016, 0.049, 0.046, m) }], 0.004), BONE.foreR);
  const rim = withBone(piece(new TorusGeometry(0.048, 0.004, 6, 26).rotateX(Math.PI / 2).translate(W[0], W[1] + 0.05, W[2]), darker(o.col ?? "#1a120c", 1.5)), BONE.foreR);
  const g = mergeGeometries([r, rim]);
  return [{ geo: g, bone: null }, { geo: withBone(mirrorX(g), BONE.foreL), bone: null }];
}

export const LAYERS = {
  uniform: (o, st) => tailored(o, st, "uniform"),
  jacket: (o, st) => tailored(o, st, "jacket"),
  blazer: (o, st) => tailored(o, st, "blazer"),
  vest: (o, st) => tailored(o, st, "vest"),
  tabard: (o, st) => tailored(o, st, "tabard"),
  gi: (o, st) => tailored(o, st, "gi"),
  tunic: (o, st) => tailored(o, st, "tunic"),
  coat: (o, st) => longcoat(o, st, "coat"),
  haori: (o, st) => longcoat({ motif: "flame", ...o }, st, "haori"),
  cloak: (o, st) => longcoat({ motif: "clouds", ...o }, st, "cloak"),
  mantle: (o, st) => longcoat(o, st, "mantle"),
  armour, cuirass, bracers, cape, scarf, scarfX, sash, belt, choker, necklace, bands,
  collar: (o, st) => goldCollar(o, st),
  plate: (o, st) => cuirass({ lo: 0.15, ...o, studs: 0 }, st),
  bare: () => [],
};

// wrap robe: the left panel over the right, a collar band along the V, wide sleeves, hem rim and folds
function kimono(o, st, robe = false) {
  const shadeC = shadeOf(o), m = P(o.col, shadeC), g = st.g + 0.012, F = grown(g), amp = o.hemWave ?? 0.015, trim = o.trim ?? "#efe9dc", out = [];
  const rows = ALL_ROWS.map((n) => torsoRow(n, m, g + (robe && n === "base" ? 0.03 : 0))), hem = robe ? 0.005 : 0.03;
  out.push(body(pg([clipped(rows, (x, y, z) => Math.max(hem + hemAt(x, z, amp) - y, y - 0.5), m)], 0.009)));
  const path = [[2.9, 0.47], [1.6, 0.47], [0.75, 0.4], [0.2, 0.31], [-0.35, 0.2], [-0.55, 0.09]];
  for (const s of [1, -1]) {
    const pts = (s > 0 ? path : path.slice(0, 4)).map(([th, y]) => [s * th, y]);
    out.push(dec(strip(F, C0, pts, 0.03, 0.026, 0.004), trim, 0.8));
    out.push(body(piece(tube(pts.map(([t, y]) => onF(F, C0, t, y, 0.0075)), 0.0045), darker(trim, 0.75), darker(trim, 0.5), { line: 0.9 })));
  }
  out.push(body(piece(ring(F, hem + 0.006, 0.008, 0.005, C0, 96, amp), trim, darker(trim, 0.55), { line: 1 })));
  out.push(shadowRing(F, 0.455, 0.012, darker(shadeC, 0.8)));
  out.push(...folds(F, hem, hem + 0.22, [0.45, 0.9, 1.6, 2.4, -0.45, -0.9, -1.6, -2.4], darker(shadeC, 0.85), { w: 0.02, pull: 0.35 }));
  st.g = g;
  st.sleeve = { m, trim: null, wide: true, rim: o.cuffTrim ?? trim };
  return out;
}
LAYERS.kimono = (o, st) => kimono(o, st);
LAYERS.robe = (o, st) => kimono(o, st, true);

// a held prop as an outfit layer: built in the wrist frame, then riding that forearm bone (it follows the arm, not the
// wrist turn). { kind: "prop", prop: "coin" | "notebook" | ..., hand: "R" | "L", at: [dx, dy, dz], ...prop options }
function prop(o) {
  const { W } = armJoints(1), g = propGeometry(o.prop, o);
  if (!g) return [];
  g.translate(W[0] + (o.at?.[0] ?? 0), W[1] + (o.at?.[1] ?? 0), W[2] + (o.at?.[2] ?? 0));
  g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
  const R = withBone(g, BONE.foreR);
  return (o.hand ?? "R") === "L" ? [{ geo: withBone(mirrorX(R), BONE.foreL), bone: null }] : [{ geo: R, bone: null }];
}
LAYERS.prop = (o) => prop(o);
export { TORSO };
