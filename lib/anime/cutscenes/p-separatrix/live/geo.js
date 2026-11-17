
import { BufferAttribute, CylinderGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { srgb } from "./fresco.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const ease = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export function paint(g, hex, kind = 0) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  n.computeVertexNormals();
  const c = srgb(hex);
  const cnt = n.attributes.position.count;
  const col = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) col.set(c, i * 3);
  n.setAttribute("color", new BufferAttribute(col, 3));
  n.setAttribute("aKind", new BufferAttribute(new Float32Array(cnt).fill(kind), 1));
  return n;
}
export function paintBy(g, fn, kind = 0) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  n.computeVertexNormals();
  const p = n.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let t = 0; t < p.count; t += 3) {
    const x = (p.getX(t) + p.getX(t + 1) + p.getX(t + 2)) / 3;
    const y = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3;
    const z = (p.getZ(t) + p.getZ(t + 1) + p.getZ(t + 2)) / 3;
    const c = srgb(fn(x, y, z, t));
    for (let k = 0; k < 3; k++) col.set(c, (t + k) * 3);
  }
  n.setAttribute("color", new BufferAttribute(col, 3));
  n.setAttribute("aKind", new BufferAttribute(new Float32Array(p.count).fill(kind), 1));
  return n;
}
export const merge = (parts) => mergeGeometries(parts);

export function smooth(g) {
  const n = g.clone();
  n.deleteAttribute("uv");
  return n;
}

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
export function limb(a, b, r1, r2, seg = 8) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}

export function layout(aspect) {
  const lay = clamp01((aspect - 0.62) / 0.9);
  const Cx = 1.5 + 0.9 * lay;
  const Cz = -6;
  return {
    lay,
    aspect,
    Cx,
    Cz,
    A: 15.5 + 10.5 * lay,
    B: 22,
    aF: 9.4 + 6.2 * lay,
    bF: 11.4,
    poolX: 3.9 + 3.9 * lay,
    poolV: 0.7,
    phi: -1.3 + 0.36 * lay,
    ridgeEnd: 9.3,
  };
}
