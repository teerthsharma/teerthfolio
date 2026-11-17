// PARTS for the pr-triton-kernels-22 look: the tall flared Sukuna collar (a swept double shell, low at the throat, high at the
// cheeks and nape, with a rolled rim) and the gold button on its right side, as one figure on the body pivot.
import { BufferAttribute, BufferGeometry, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, headPrims, piece } from "../body.js";
import { eyeMesh, headSurface } from "../face.js";

const COL = "#26242c", SH = "#100f14", RIM = "#3a3742", GOLD = "#c9a227";
const SEG = 64, ROWS = 6;

// collar profile at azimuth th (0 = front, + toward +x): top height, radius at the base and flare at the top
const topAt = (th) => 0.5 + 0.12 * Math.sin(Math.abs(th) / 2) ** 1.4;
const radAt = (y, th) => 0.205 + 0.06 * Math.max(0, y - 0.43) / 0.2 + 0.012 * Math.sin(th) ** 2;

function shell(grow, flip) {
  const pos = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const th = -Math.PI + (i / SEG) * Math.PI * 2, top = topAt(th);
    for (let j = 0; j <= ROWS; j++) {
      const y = 0.39 + (top - 0.39) * (j / ROWS), r = radAt(y, th) + grow;
      pos.push(Math.sin(th) * r * 1.0, y, -0.02 + Math.cos(th) * r * 0.95);
    }
  }
  for (let i = 0; i < SEG; i++) for (let j = 0; j < ROWS; j++) {
    const a = i * (ROWS + 1) + j, b = (i + 1) * (ROWS + 1) + j;
    idx.push(...(flip ? [a, b, a + 1, b, b + 1, a + 1] : [a, a + 1, b, b, a + 1, b + 1]));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function rim() {
  const pts = [];
  for (let i = 0; i < SEG; i++) {
    const th = -Math.PI + (i / SEG) * Math.PI * 2, y = topAt(th), a = radAt(y, th), b = a + 0.018;
    pts.push([th, y, a, b]);
  }
  const g = new BufferGeometry(), pos = [], idx = [];
  pts.forEach(([th, y, a, b]) => { for (const [r, dy] of [[a, 0], [b, 0]]) pos.push(Math.sin(th) * r, y + dy, -0.02 + Math.cos(th) * r * 0.95); });
  for (let i = 0; i < SEG; i++) { const k = (i + 1) % SEG; idx.push(i * 2, k * 2, i * 2 + 1, k * 2, k * 2 + 1, i * 2 + 1); }
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function collarShell(engine) {
  const geo = cached("pr-triton-kernels-22|collar", () => {
    const parts = [piece(shell(0.012, false), COL, SH), piece(shell(0, true), darker(COL, 0.8), SH), piece(rim(), RIM, darker(RIM, 0.5))];
    const th = 0.78, y = 0.455, r = radAt(y, th) + 0.02;
    const p = new Vector3(Math.sin(th) * r, y, -0.02 + Math.cos(th) * r * 0.95);
    parts.push(piece(new SphereGeometry(0.0145, 14, 8).scale(1, 1, 0.45).translate(p.x, p.y, p.z), GOLD, darker(GOLD, 0.55)));
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  const fig = engine.figure(geo, { ink: "#0e0b0d", lineMul: 1.2 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// the smaller lower pair of red eyes, set under each upper eye and canted outward; pushed onto h.eyes so the
// handle drives their expression and blink with the upper pair
export function lowerEyes(h, o = {}) {
  const surf = headSurface(headPrims({ coat: "#888888", shade: "#444444" })), E = h.spec.eyes, out = [];
  for (const side of [1, -1]) {
    const e = eyeMesh(surf, { x: side * (o.x ?? 0.115), y: o.y ?? 0.152, w: 0.074 * E.size * 0.7, h: 0.086 * E.size * 0.7, tilt: side * (o.tilt ?? 0.2), side, style: "tsurime", iris: E.iris, irisLo: E.iris2 ?? undefined, lash: E.lash });
    h.parts.head.add(e); h.eyes.push(e); out.push(e);
  }
  return out;
}
