// The far ridges and the grove beyond the walls: the live's own cel solids (the tree is the live statics() recipe), one draw.
import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh } from "three";
import { fbm } from "../../../../world/terrain.js";
import { celMaterial, hash, join, limb, part } from "../live/toon.js";
import { groundY } from "../live/world.js";
import { tone } from "../tone.js";

const LEAF = ["#b84a22", "#e08a2e", "#f0b840", "#9e2f26", "#d8702a", "#c89a30"];
const RIDGES = [
  { z: -95, w: 420, h0: 7, h1: 7, hex: "#b57a5a", k: 0.6 },
  { z: -150, w: 520, h0: 22, h1: 18, hex: "#886880", k: 1.1 },
  { z: -215, w: 640, h0: 30, h1: 25, hex: "#6f7280", k: 2.3 },
  { z: -300, w: 760, h0: 40, h1: 30, hex: "#41505c", k: 3.7 },
];
const GROVE = Array.from({ length: 28 }, (_, i) => {
  const x = i % 2 ? 26 + 64 * hash(i, 1) : -90 + 64 * hash(i, 1);
  return [x, -24 - 68 * hash(i, 2), 6 + 5 * hash(i, 3)];
});
export const FAR_CASTERS = GROVE.map(([x, z, h]) => [x, z, h * 0.55, h * 0.95, 0, 0.45]);

function ridge({ z, w, h0, h1, hex, k }) {
  const N = 60, P = [];
  const x = (i) => -w / 2 + (w * i) / N;
  const top = (i) => h0 + h1 * (fbm(x(i) / 38, k) + 0.5 * Math.sin(x(i) / 11));
  for (let i = 0; i < N; i++) {
    const a = [x(i), -2, z], b = [x(i), top(i), z], c = [x(i + 1), top(i + 1), z], d = [x(i + 1), -2, z];
    P.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(P, 3));
  return part(g, hex, { flat: true });
}

function tree(x, z, h, seed) {
  const s = h / 8, y0 = groundY(x, z), P = [];
  P.push(part(new CylinderGeometry(0.2 * s, 0.4 * s, h * 0.55, 8), "#5a3a2c", { flat: true }).translate(x, y0 + h * 0.275, z));
  for (const sd of [-1, 1]) P.push(part(limb([x, y0 + h * 0.4, z], [x + sd * h * 0.22, y0 + h * 0.7, z + 0.2 * sd], 0.12 * s, 0.07 * s, 6), "#5a3a2c", { flat: true }));
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * 6.283 + seed, r = h * 0.2 * (0.6 + 0.6 * hash(seed + b, 1));
    const by = y0 + h * (0.62 + 0.17 * hash(seed + b, 2) + (b === 0 ? 0.12 : 0)), rad = h * (0.2 + 0.07 * hash(seed + b, 3));
    P.push(part(new IcosahedronGeometry(rad, 1), LEAF[(seed + b) % LEAF.length], { sway: 0.28, flat: true }).translate(x + Math.cos(a) * r, by, z + Math.sin(a) * r * 0.8));
  }
  P.push(part(new IcosahedronGeometry(h * 0.18, 1), LEAF[(seed + 2) % LEAF.length], { sway: 0.3, flat: true }).translate(x, y0 + h * 0.98, z));
  return P;
}

export function buildFar() {
  const geo = join([...RIDGES.map(ridge), ...GROVE.flatMap(([x, z, h], i) => tree(x, z, h, i * 3))]);
  const mat = tone(celMaterial());
  const group = new Group();
  group.add(new Mesh(geo, mat));
  return { group, casters: FAR_CASTERS, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}
