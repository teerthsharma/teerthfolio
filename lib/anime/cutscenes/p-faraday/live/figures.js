// Copied from components/world/cutscene/moves/p-faraday/figures.js (comments stripped; its notes live with the original).


import { Box3, BoxGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hullOf, silMaterial } from "./blue.js";
import { faceMesh } from "../../../../../components/world/cutscene/cel.js";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();

const limb = (a, b, r1, r2, seg = 6) => {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const h = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, h, seg, 1).translate(0, h / 2, 0);
  g.applyQuaternion(Q.setFromUnitVectors(UP, B.sub(A).normalize()));
  return g.translate(a[0], a[1], a[2]);
};
const ball = (c, r, sx = 1, sy = 1, sz = 1) => new SphereGeometry(r, 8, 6).scale(sx, sy, sz).translate(c[0], c[1], c[2]);

function sil(g, w = 0, c = 0) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  const p = n.attributes.position;
  let lo = 1e9;
  let hi = -1e9;
  for (let i = 0; i < p.count; i++) (lo = Math.min(lo, p.getY(i)), (hi = Math.max(hi, p.getY(i))));
  const aw = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) aw[i] = typeof w === "function" ? w(p.getY(i), lo, hi, p.getZ(i), p.getX(i)) : w;
  n.setAttribute("aW", new Float32BufferAttribute(aw, 1));
  n.setAttribute("aC", new Float32BufferAttribute(new Float32Array(p.count).fill(c), 1));
  return n;
}
const tip = (y, lo, hi) => Math.max(0, (y - lo) / Math.max(hi - lo, 1e-3));

export function toumaGeometry() {
  const p = [];
  for (const s of [-1, 1]) p.push(sil(limb([s * 0.12, 0, 0], [s * 0.14, 0.92, 0], 0.085, 0.1)));
  p.push(sil(limb([0, 0.86, 0], [0, 1.5, 0], 0.2, 0.23, 7), (y) => (y < 0.95 ? 0.35 : 0)));
  p.push(sil(limb([0, 1.45, 0], [0, 1.58, 0], 0.06, 0.06)));
  p.push(sil(ball([0, 1.74, 0], 0.15)));

  const spikes = [[0, 1, 0.1, 0.34], [0.12, 0.95, 0, 0.3], [-0.12, 0.95, 0, 0.3], [0.05, 0.8, 0.45, 0.28], [-0.07, 0.8, -0.45, 0.28], [0.3, 0.6, 0.15, 0.24], [-0.3, 0.6, 0.15, 0.24], [0.1, 0.55, -0.4, 0.22], [-0.2, 0.5, 0.3, 0.2]];
  for (const [dx, dy, dz, len] of spikes) {
    const d = new Vector3(dx, dy, dz).normalize();
    const g = new ConeGeometry(0.062, len, 5).translate(0, len / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, d));
    g.translate(d.x * 0.1, 1.74 + d.y * 0.1, d.z * 0.1);
    p.push(sil(g, tip));
  }

  p.push(sil(limb([-0.23, 1.44, 0], [-0.3, 1.0, 0.05], 0.065, 0.06)));
  p.push(sil(limb([-0.3, 1.0, 0.05], [-0.15, 0.88, 0.14], 0.06, 0.055)));

  p.push(sil(limb([0.23, 1.44, 0], [0.42, 1.4, 0.2], 0.065, 0.06)));
  p.push(sil(limb([0.42, 1.4, 0.2], [0.46, 1.78, 0.5], 0.06, 0.05)));
  p.push(sil(new BoxGeometry(0.15, 0.17, 0.045).translate(0.46, 1.93, 0.52)));
  for (let k = -2; k <= 2; k++) p.push(sil(limb([0.46 + k * 0.034, 2.0, 0.52], [0.46 + k * 0.058, 2.2 - Math.abs(k) * 0.02, 0.53], 0.017, 0.012, 4)));
  return mergeGeometries(p);
}

export function kurokoGeometry() {
  const p = [];
  for (const s of [-1, 1]) {
    p.push(sil(limb([s * 0.1, 0.2, 0.0], [s * 0.12, 0.34, 0.26], 0.07, 0.06)));
    p.push(sil(limb([s * 0.12, 0.34, 0.26], [s * 0.12, 0.02, 0.3], 0.06, 0.05)));
  }
  p.push(sil(limb([0, 0.3, 0.05], [0, 0.78, 0.17], 0.17, 0.15, 7), (y) => (y < 0.4 ? 0.3 : 0)));
  p.push(sil(ball([0, 0.93, 0.2], 0.13)));

  p.push(sil(limb([0.15, 0.76, 0.16], [0.26, 0.62, 0.3], 0.052, 0.045)));
  p.push(sil(limb([0.26, 0.62, 0.3], [0.1, 0.88, 0.32], 0.045, 0.04)));
  p.push(sil(ball([0.09, 0.9, 0.33], 0.04)));

  p.push(sil(limb([-0.15, 0.76, 0.16], [-0.24, 0.55, 0.2], 0.05, 0.045)));
  p.push(sil(new CylinderGeometry(0.062, 0.062, 0.07, 8).rotateZ(0.5).translate(-0.2, 0.66, 0.18), 0, 1));

  for (const s of [-1, 1]) {
    let prev = [s * 0.12, 1.0, 0.12];
    for (let i = 1; i <= 6; i++) {
      const u = i / 6;
      const next = [s * (0.12 + 0.34 * u), 1.0 - 0.52 * u * u - 0.1 * u, 0.12 - 0.62 * u];
      p.push(sil(limb(prev, next, 0.06 * (1 - u * 0.55), 0.06 * (1 - (u + 0.17) * 0.55), 5), () => u));
      prev = next;
    }
  }
  return mergeGeometries(p);
}

export function colonyGeometry() {
  return mergeGeometries([sil(new IcosahedronGeometry(0.2, 1).scale(1, 0.78, 1.45).translate(0, 0.17, 0)), sil(ball([0, 0.3, 0.27], 0.12)), sil(limb([0.17, 0.12, 0.08], [0.3, 0.05, 0.22], 0.05, 0.03, 4)), sil(limb([-0.17, 0.12, 0.08], [-0.3, 0.05, 0.22], 0.05, 0.03, 4))]);
}

export function figure(geo, hullW = 0.028, face = null) {
  const body = new Mesh(geo, silMaterial(false));
  const hull = new Mesh(hullOf(geo, hullW), silMaterial(true));
  for (const m of [body, hull]) m.frustumCulled = false;
  const g = new Group();
  g.add(hull, body);
  const fm = face ? faceMesh(face.spec, face.head, face.r, 0.9) : null;
  if (fm) g.add(fm);
  return {
    group: g,
    dispose() {
      geo.dispose();
      hull.geometry.dispose();
      body.material.dispose();
      hull.material.dispose();
      if (fm) (fm.geometry.dispose(), fm.material.dispose());
    },
  };
}
