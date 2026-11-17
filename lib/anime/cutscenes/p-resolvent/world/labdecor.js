// The lab annex, sign, lamps, bench and crates of components/world/LabDecor.jsx as pure geometry in the place frame (origin at the place centre).
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// The five colours of components/world/palette.js C that LabDecor uses (copied: that file needs the bundler to resolve its imports).
const C = { charcoal: "#43434c", wood: "#c08a5e", woodDark: "#8a5a3c", metal: "#aab3c0", lamp: "#ffc46b" };

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const paint = (g, hex) => {
  const c = new Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  return g.setAttribute("color", new Float32BufferAttribute(a, 3));
};
const box = (w, h, d, x, y, z, hex) => paint(new BoxGeometry(w, h, d).translate(x, y + h / 2, z), hex);
const cyl = (r, h, x, y, z, hex, seg = 8) => paint(new CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z), hex);
const solid = (list) => {
  const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)));
  g.deleteAttribute("uv");
  return g;
};

export function tint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const c = new Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

export function lift(g, k) {
  const a = g.attributes.color.array;
  for (let i = 0; i < a.length; i++) a[i] = Math.min(1, a[i] * k);
  return g;
}

const shape = (place) => {
  const h = hash(place.id);
  const side = place.id === "p-tangle" ? -1 : h & 1 ? 1 : -1;
  const tall = 6.5 + (h % 4);
  return { R: place.radius, h, side, tall, tx: side * (place.radius - 1.2), tz: -place.radius + 0.9 };
};

export const annexOf = (place) => {
  const s = shape(place);
  return [s.tx, s.tz, 2.6, s.tall];
};

export function labDecor(place) {
  const { R, h, side, tall, tx, tz } = shape(place);
  const A = place.color;
  const body = `#${new Color("#f4ead8").lerp(new Color(A), 0.35).getHexString()}`;
  const capCol = `#${new Color(A).multiplyScalar(0.6).getHexString()}`;
  const L = [], G = [], M = [];
  L.push(box(2.6, 0.5, 2.6, tx, 0, tz, C.charcoal));
  L.push(box(2.2, tall, 2.2, tx, 0.5, tz, body));
  L.push(box(2.4, 0.3, 2.4, tx, 0.5 + tall * 0.5, tz, A));
  L.push(box(2.5, 0.35, 2.5, tx, 0.5 + tall, tz, A));
  const top = 0.85 + tall;
  if (h % 3 === 0) {
    L.push(paint(new ConeGeometry(1.9, 1.8, 4).rotateY(Math.PI / 4).translate(tx, top + 0.9, tz), capCol));
  } else if (h % 3 === 1) {
    L.push(paint(new SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(tx, top, tz), capCol));
    L.push(cyl(0.06, 0.6, tx, top + 1.5, tz, capCol, 5));
  } else {
    L.push(box(2.5, 0.3, 2.5, tx, top, tz, capCol));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      L.push(box(0.4, 0.4, 0.4, tx + Math.cos(a) * 1.05, top + 0.3, tz + Math.sin(a) * 1.05, capCol));
    }
  }
  const course = `#${new Color(body).multiplyScalar(0.82).getHexString()}`;
  for (let y = 1.3; y < tall - 0.2; y += 1.3) L.push(box(2.26, 0.07, 2.26, tx, 0.5 + y, tz, course));
  for (const [cx_, cz_] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.push(box(0.22, tall, 0.22, tx + cx_ * 1.1, 0.5, tz + cz_ * 1.1, C.charcoal));
  L.push(box(2.9, 0.2, 2.9, tx, top - 0.06, tz, capCol));
  L.push(box(2.6, 0.12, 2.6, tx, top - 0.22, tz, C.charcoal));
  M.push(cyl(0.05, 2.2, tx, 0.85 + tall + 1.7, tz, C.metal, 5));
  M.push(paint(new SphereGeometry(0.16, 8, 6).translate(tx, 0.85 + tall + 3.95, tz), C.metal));
  L.push(box(0.9, 0.5, 0.05, tx + 0.45, 0.85 + tall + 3.1, tz, A));
  for (const y of [1.4, 1.4 + tall * 0.42, 1.4 + tall * 0.8].filter((y) => y < tall - 0.6)) {
    G.push(box(0.7, 1, 0.1, tx - 0.5, y, tz + 1.12, A));
    G.push(box(0.7, 1, 0.1, tx + 0.5, y, tz + 1.12, A));
    G.push(box(0.1, 1, 0.7, tx - side * 1.12, y, tz, A));
    L.push(box(0.9, 0.12, 0.14, tx - 0.5, y - 0.12, tz + 1.14, C.charcoal));
    L.push(box(0.9, 0.12, 0.14, tx + 0.5, y - 0.12, tz + 1.14, C.charcoal));
    for (const wx of [tx - 0.5, tx + 0.5]) {
      L.push(box(0.96, 1.2, 0.06, wx, y - 0.1, tz + 1.1, C.charcoal));
      L.push(box(0.07, 1.0, 0.14, wx, y, tz + 1.15, C.charcoal));
      L.push(box(0.96, 0.1, 0.16, wx, y + 1.02, tz + 1.13, A));
    }
    L.push(box(0.06, 1.2, 0.96, tx - side * 1.1, y - 0.1, tz, C.charcoal));
  }
  L.push(box(2.8, 0.22, 1.1, 0, 0, R - 0.1, C.charcoal));
  L.push(box(2.2, 0.14, 0.8, 0, 0.22, R - 0.2, A));
  const sx = -side * 3.6;
  L.push(cyl(0.08, 2.4, sx - 0.9, 0, R + 0.9, C.woodDark));
  L.push(cyl(0.08, 2.4, sx + 0.9, 0, R + 0.9, C.woodDark));
  L.push(box(2.2, 0.9, 0.1, sx, 1.5, R + 0.9, A));
  G.push(box(1.7, 0.12, 0.12, sx, 1.62, R + 0.97, C.lamp));
  for (const lx of [-2.2, 2.2]) {
    L.push(cyl(0.07, 2.4, lx, 0, R + 0.4, C.charcoal, 6));
    G.push(paint(new SphereGeometry(0.22, 8, 6).translate(lx, 2.55, R + 0.4), C.lamp));
  }
  const bx = side * 3.9;
  L.push(box(1.6, 0.12, 0.5, bx, 0.45, R - 0.3, C.wood));
  L.push(box(0.12, 0.45, 0.5, bx - 0.65, 0, R - 0.3, C.woodDark));
  L.push(box(0.12, 0.45, 0.5, bx + 0.65, 0, R - 0.3, C.woodDark));
  L.push(box(1.6, 0.5, 0.1, bx, 0.6, R - 0.52, C.wood));
  const cx = -side * 4.1;
  L.push(box(0.9, 0.9, 0.9, cx, 0, R - 1.2, C.wood));
  L.push(box(0.9, 0.9, 0.9, cx + 0.95, 0, R - 1.1, C.woodDark));
  L.push(box(0.75, 0.75, 0.75, cx + 0.4, 0.9, R - 1.2, C.wood));
  L.push(box(0.7, 2.2, 0.7, tx - side * 0.5, 0.5 + tall * 0.5, tz - 0.6, "#8a5a4c"));
  return {
    lit: solid(L),
    glow: solid(G),
    metal: solid(M),
    chim: [tx - side * 0.5, 0.5 + tall * 0.5 + 2.2, tz - 0.6],
    annex: annexOf(place),
  };
}
