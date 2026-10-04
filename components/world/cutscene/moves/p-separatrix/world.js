// THE COLOSSEUM AT GOLDEN DUSK, as meshes, all in the fresco material (fresco.js): the ruined ring of three
// tiers of instanced arches and an attic, its high outer wall broken away on one side so Rome shows through;
// the stepped, half-fallen stands; the hypogeum's stone corridors exposed round the arena's edge, their
// shadows deep violet; the saddle floor (promoted from the dock pavilion's hyperbolic-paraboloid roof,
// components/world/monuments/parts/certify-roof.js); and Rome beyond: umbrella pines, cypresses, terracotta
// roofs and a distant dome. Frame: the rig (the pup at the origin, the lens out along +z), the arena's
// centre at (L.Cx, 0, L.Cz). Instancing everywhere; nothing allocates after the build.

import { CylinderGeometry, DodecahedronGeometry, BoxGeometry, ConeGeometry, ExtrudeGeometry, IcosahedronGeometry, InstancedMesh, Object3D, Shape, SphereGeometry, BufferGeometry, Float32BufferAttribute, Color } from "three";
import { BREAK, TIER_H } from "./fresco";
import { hash, merge, paint, paintBy, ease, lerp } from "./geo";

const D = new Object3D();
const wrap = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const GROUND_Y = -1.8;
export const TRENCH_Y = -0.9;

// ---- the saddle floor: y = K (v^2 - u^2), zero under the pup, with a bowl at each pool ----------------------
const K = 0.011;
const saddle = (L, u, v) => K * (v * v - u * u - (36 - L.Cx * L.Cx));
// the water's level in the pool at side s (-1 left, +1 right): a little under the saddle's height there
export const poolLevel = (L, s) => saddle(L, s * L.poolX, L.poolV) - 0.08;
export const POOL_R = 2.3;
export const floorY = (L, u, v) => {
  let y = saddle(L, u, v);
  for (const s of [-1, 1]) {
    const r = Math.hypot(u - s * L.poolX, v - L.poolV);
    if (r < 4.4) {
      const yp = poolLevel(L, s);
      const bowl = r < POOL_R ? -0.34 * (1 - (r / POOL_R) ** 2) : 0;
      y = lerp(yp + bowl, y, ease(POOL_R + 0.1, 4.4, r));
    }
  }
  return y;
};
// arena-local (u, v) to the rig frame
export const toRig = (L, u, v, out) => out.set(L.Cx + u, 0, L.Cz + v);

// ---- tiers still standing at an eccentric angle phi (a ragged staircase through the break) ---------------------
export function tiersAt(L, phi, k) {
  const d = Math.abs(wrap(phi - L.phi)) / BREAK.half;
  let t = d < 0.34 ? 0 : d < 0.58 ? 1 : d < 0.8 ? 2 : d < 1 ? 3 : 4;
  if (d >= 0.34 && d < 1.12) t += hash(k, 7) < 0.3 ? -1 : hash(k, 8) > 0.82 ? 1 : 0;
  return Math.max(0, Math.min(4, t));
}

// ---- the arch bay: a pier-arch-pier panel with half-columns and a cornice, and the attic with its windows ----
const BAY_W = 3.2;
export function archBay() {
  const w = BAY_W / 2;
  const r = 0.85;
  const spring = 1.85;
  const H = TIER_H - 0.05;
  const s = new Shape();
  s.moveTo(-w, 0);
  s.lineTo(-r, 0);
  s.lineTo(-r, spring);
  s.absarc(0, spring, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(w, 0);
  s.lineTo(w, H);
  s.lineTo(-w, H);
  s.lineTo(-w, 0);
  const wall = new ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.65);
  const parts = [paint(wall, "#dcc48a")];
  for (const sx of [-1, 1]) parts.push(paint(new CylinderGeometry(0.22, 0.26, H - 0.5, 7).translate(sx * (r + 0.42), (H - 0.5) / 2 + 0.1, 0.8), "#e8d29a"));
  parts.push(paint(new BoxGeometry(BAY_W + 0.1, 0.3, 1.7).translate(0, H + 0.1, 0.12), "#cfb078"));
  return merge(parts);
}
function atticBay() {
  const w = BAY_W / 2;
  const H = TIER_H - 0.05;
  const s = new Shape();
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, H);
  s.lineTo(-w, H);
  s.lineTo(-w, 0);
  const win = new Shape();
  win.moveTo(-0.38, 0.9);
  win.lineTo(0.38, 0.9);
  win.lineTo(0.38, 2.5);
  win.lineTo(-0.38, 2.5);
  win.lineTo(-0.38, 0.9);
  s.holes.push(win);
  const wall = new ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.6);
  return merge([paint(wall, "#d5b87c"), paint(new BoxGeometry(BAY_W + 0.1, 0.3, 1.6).translate(0, H + 0.1, 0.12), "#cfb078")]);
}

// The ring: bays on the ellipse (A, B) about the arena's centre, equal steps of the eccentric angle, the
// ones behind the lens left out. Returns the two instanced meshes (arch bays and attic bays) and the ring's N.
export function ring(L, mat) {
  const N = Math.round((2 * Math.PI * Math.sqrt((L.A * L.A + L.B * L.B) / 2)) / (BAY_W + 0.25));
  const archG = archBay();
  const atticG = atticBay();
  const arch = [];
  const attic = [];
  const tint = [];
  const atticTint = [];
  for (let k = 0; k < N; k++) {
    const phi = (2 * Math.PI * k) / N;
    const px = L.Cx + L.A * Math.cos(phi);
    const pz = L.Cz + L.B * Math.sin(phi);
    if (pz > 7) continue; // behind the lens
    const nx = Math.cos(phi) / L.A;
    const nz = Math.sin(phi) / L.B;
    const nl = Math.hypot(nx, nz);
    const yaw = Math.atan2(-nx / nl, -nz / nl);
    const arc = (Math.hypot(L.A * Math.sin(phi), L.B * Math.cos(phi)) * 2 * Math.PI) / N;
    const sx = Math.min(1.4, Math.max(0.78, arc / BAY_W));
    const T = tiersAt(L, phi, k);
    for (let i = 0; i < Math.min(T, 3); i++) {
      arch.push([px, GROUND_Y + i * TIER_H, pz, yaw, sx, 1]);
      tint.push([0.94 + 0.1 * hash(k, i), 0.9 + 0.12 * hash(k, i + 3), 0.88 + 0.1 * hash(k + 9, i)]);
    }
    if (T === 4) {
      attic.push([px, GROUND_Y + 3 * TIER_H, pz, yaw, sx, 1]);
      atticTint.push([0.95 + 0.08 * hash(k, 11), 0.92, 0.88]);
    }
  }
  // the hypogeum: a ring of low arcaded corridor walls round the floor's edge, and the cross walls between
  const hyp = [];
  const ra = L.aF + 1.7;
  const rb = L.bF + 1.6;
  const M = 30;
  for (let k = 0; k < M; k++) {
    const phi = (2 * Math.PI * (k + 0.5)) / M;
    const px = L.Cx + ra * Math.cos(phi);
    const pz = L.Cz + rb * Math.sin(phi);
    if (pz > 2.5) continue; // clear of the lens
    const nx = Math.cos(phi) / ra;
    const nz = Math.sin(phi) / rb;
    const nl = Math.hypot(nx, nz);
    const yaw = Math.atan2(-nx / nl, -nz / nl);
    const arc = (Math.hypot(ra * Math.sin(phi), rb * Math.cos(phi)) * 2 * Math.PI) / M;
    hyp.push([px, TRENCH_Y, pz, yaw, Math.min(1.3, arc / BAY_W), 0.66]);
    if (hash(k, 4) > 0.22) {
      // a cross wall, its plane radial, standing across the corridor
      const mx = L.Cx + (L.aF + 1.7) * Math.cos(phi + 0.5 * ((2 * Math.PI) / M)) * 1;
      const mz = L.Cz + (L.bF + 1.6) * Math.sin(phi + 0.5 * ((2 * Math.PI) / M)) * 1;
      if (mz < 2.5) hyp.push([mx, TRENCH_Y, mz, yaw + Math.PI / 2, 0.78, 0.62]);
    }
  }
  const a = new InstancedMesh(archG, mat, arch.length + hyp.length);
  const b = new InstancedMesh(atticG, mat, Math.max(1, attic.length));
  const c = new Color();
  const put = (mesh, i, [x, y, z, yaw, sx, sy], t) => {
    D.position.set(x, y, z);
    D.rotation.set(0, yaw, 0);
    D.scale.set(sx, sy, 1);
    D.updateMatrix();
    mesh.setMatrixAt(i, D.matrix);
    mesh.setColorAt(i, c.setRGB(t[0], t[1], t[2]));
  };
  arch.forEach((e, i) => put(a, i, e, tint[i]));
  hyp.forEach((e, i) => put(a, arch.length + i, e, [0.8 + 0.1 * hash(i, 2), 0.7 + 0.1 * hash(i, 3), 0.86]));
  attic.forEach((e, i) => put(b, i, e, atticTint[i]));
  if (!attic.length) {
    D.position.set(0, -80, 0);
    D.scale.setScalar(0.001);
    D.updateMatrix();
    b.setMatrixAt(0, D.matrix);
    b.setColorAt(0, c.setRGB(1, 1, 1));
  }
  for (const m of [a, b]) m.frustumCulled = false;
  return { arch: a, attic: b, N, geometries: [archG, atticG] };
}

// ---- a strip of quads between two rows of points (shared helper for the floor, stands, trench) -------------------
function build(positions) {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return g;
}

// THE FLOOR: a polar grid on the ellipse (aF, bF), the saddle's height, a skirt down to the trench.
export function floor(L) {
  const NR = 16;
  const NS = 72;
  const pos = [];
  const pt = (s, j, out) => {
    const th = (2 * Math.PI * j) / NS;
    const u = s * L.aF * Math.cos(th);
    const v = s * L.bF * Math.sin(th);
    out.push(L.Cx + u, floorY(L, u, v), L.Cz + v);
  };
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const P = (s, j) => {
    const o = [];
    pt(s, j, o);
    return o;
  };
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NS; j++) {
      const a = P(i / NR, j);
      const b = P(i / NR, j + 1);
      const c = P((i + 1) / NR, j);
      const d = P((i + 1) / NR, j + 1);
      tri(a, c, b);
      tri(b, c, d);
    }
  }
  const floorG = paintBy(build(pos), (x, y, z, t) => (hash(t, 5) < 0.18 ? "#e0b784" : hash(t, 6) < 0.4 ? "#dcc088" : "#e4cb94"), 2);
  // the skirt: the floor's edge dropping to the trench
  const skirt = [];
  for (let j = 0; j < NS; j++) {
    const a = P(1, j);
    const b = P(1, j + 1);
    skirt.push(...a, ...b, a[0], TRENCH_Y, a[2], ...b, b[0], TRENCH_Y, b[2], a[0], TRENCH_Y, a[2]);
  }
  const skirtG = paint(build(skirt), "#c9a56e", 0);
  // the trench floor: an annulus at TRENCH_Y between the floor's edge and the stands
  const tr = [];
  const R1 = { a: (L.aF + 3.4) / L.aF, b: (L.bF + 3.2) / L.bF };
  for (let j = 0; j < NS; j++) {
    const th0 = (2 * Math.PI * j) / NS;
    const th1 = (2 * Math.PI * (j + 1)) / NS;
    const q = (th, k) => [L.Cx + (k === 0 ? 1 : R1.a) * L.aF * Math.cos(th), TRENCH_Y, L.Cz + (k === 0 ? 1 : R1.b) * L.bF * Math.sin(th)];
    tr.push(...q(th0, 0), ...q(th0, 1), ...q(th1, 0), ...q(th1, 0), ...q(th0, 1), ...q(th1, 1));
  }
  const trenchG = paint(build(tr), "#9a7ea4", 0);
  return { floor: floorG, edge: merge([skirtG, trenchG]) };
}

// THE STANDS: rows of tread and riser round the ellipse, collapsed into a rubble slope through the break.
export function stands(L) {
  const ROWS = 9;
  const NS = 96;
  const a0 = L.aF + 3.4;
  const b0 = L.bF + 3.2;
  const a1 = L.A - 1.9;
  const b1 = L.B - 1.9;
  const yAt = (r, j) => {
    const th = (2 * Math.PI * j) / NS;
    const d = Math.abs(wrap(th - L.phi)) / BREAK.half;
    const f = lerp(0.12, 1, ease(0.34, 1.05, d)) * (0.78 + 0.44 * hash(j * 13 + r, 5));
    return Math.max(0, r) * 0.78 * (d < 1.1 ? f : 1);
  };
  const P = (r, j) => {
    const th = (2 * Math.PI * (j % NS)) / NS;
    const s = r / ROWS;
    return [L.Cx + lerp(a0, a1, s) * Math.cos(th), 0, L.Cz + lerp(b0, b1, s) * Math.sin(th)];
  };
  const pos = [];
  const col = [];
  for (let r = 0; r < ROWS; r++) {
    for (let j = 0; j < NS; j++) {
      const m = P(r + 0.5, j);
      if (m[2] > 7) continue;
      const skip = hash(j * 7 + r, 9) < 0.07;
      const A = P(r, j);
      const B = P(r, j + 1);
      const C = P(r + 1, j);
      const E = P(r + 1, j + 1);
      A[1] = yAt(r + 1, j);
      B[1] = yAt(r + 1, j + 1);
      C[1] = yAt(r + 2, j);
      E[1] = yAt(r + 2, j + 1);
      // the tread
      if (!skip) pos.push(...A, ...C, ...B, ...B, ...C, ...E);
      // the riser under it, from the row below
      const A0 = [A[0], yAt(r, j), A[2]];
      const B0 = [B[0], yAt(r, j + 1), B[2]];
      pos.push(...A0, ...A, ...B0, ...B0, ...A, ...B);
      void col;
    }
  }
  return paintBy(build(pos), (x, y, z, t) => (hash(t, 3) < 0.5 ? "#d8bb82" : "#cba873"), 0);
}

// ---- the ground beyond the wall: a ring from the footprint out to the horizon, olive and terracotta ---------------
export function groundRing(L) {
  const NS = 72;
  const radii = [1.0, 1.35, 1.9, 2.8, 4.5, 8, 14];
  const pos = [];
  const P = (r, j) => {
    const th = (2 * Math.PI * (j % NS)) / NS;
    return [L.Cx + (L.A + 1.2) * r * Math.cos(th), GROUND_Y, L.Cz + (L.B + 1.2) * r * Math.sin(th)];
  };
  for (let i = 0; i < radii.length - 1; i++) {
    for (let j = 0; j < NS; j++) {
      const a = P(radii[i], j);
      const b = P(radii[i], j + 1);
      const c = P(radii[i + 1], j);
      const d = P(radii[i + 1], j + 1);
      pos.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  }
  return paintBy(build(pos), (x, y, z) => {
    const d = Math.hypot(x - L.Cx, z - L.Cz);
    const n = hash(Math.floor(x / 6) * 17 + Math.floor(z / 6), 4);
    return d < 38 ? (n < 0.4 ? "#c9a266" : "#bf9a5e") : n < 0.3 ? "#a4783f" : n < 0.6 ? "#9a8c4e" : "#b58a52";
  }, 3);
}

// ---- Rome beyond: terracotta roofs, umbrella pines, cypresses and a distant dome -----------------------------------
function house(w, h, d, wall, roof) {
  const body = paint(new BoxGeometry(w, h, d).translate(0, h / 2, 0), wall);
  const cap = paint(new ConeGeometry(Math.hypot(w, d) / 2 + 0.2, h * 0.5, 4).rotateY(Math.PI / 4).scale(w / Math.hypot(w, d) * 1.42, 1, d / Math.hypot(w, d) * 1.42).translate(0, h + h * 0.25, 0), roof);
  return merge([body, cap]);
}
export function rome(L, mat) {
  const out = [];
  const place = (geo, n, fn, tints) => {
    const m = new InstancedMesh(geo, mat, n);
    const c = new Color();
    for (let i = 0; i < n; i++) {
      const [x, y, z, yaw, sx, sy, sz] = fn(i);
      D.position.set(x, y, z);
      D.rotation.set(0, yaw, 0);
      D.scale.set(sx, sy, sz);
      D.updateMatrix();
      m.setMatrixAt(i, D.matrix);
      const t = tints(i);
      m.setColorAt(i, c.setRGB(t[0], t[1], t[2]));
    }
    m.frustumCulled = false;
    out.push(m);
    return m;
  };
  // where the wall is broken, the city: a wedge of ground out from the arena (angles round L.phi)
  const city = (i, near, far, spread) => {
    const th = L.phi + (hash(i, 1) - 0.5) * 2 * spread;
    const r = near + (far - near) * hash(i, 2) ** 0.8;
    return [L.Cx + (L.A + 6 + r) * Math.cos(th), L.Cz + (L.B + 6 + r) * Math.sin(th)];
  };
  const houseG = house(1, 1, 1, "#e2b48a", "#b9573a");
  place(
    houseG,
    130,
    (i) => {
      const [x, z] = city(i, 4, 105, 0.62);
      const w = 2.4 + 3.2 * hash(i, 3);
      const h = 2.2 + 3.6 * hash(i, 4);
      return [x, GROUND_Y - 0.02, z, hash(i, 5) * 3.14, w, h, 2.4 + 3 * hash(i, 6)];
    },
    (i) => [0.9 + 0.12 * hash(i, 7), 0.82 + 0.16 * hash(i, 8), 0.78 + 0.18 * hash(i, 9)],
  );
  // umbrella pines: a bare trunk and a flat canopy
  const pineG = merge([paint(new CylinderGeometry(0.22, 0.34, 1, 6).translate(0, 0.5, 0), "#5a4030"), paint(new SphereGeometry(1, 8, 5).scale(1.9, 0.5, 1.9).translate(0, 1.1, 0), "#566237"), paint(new SphereGeometry(1, 7, 4).scale(1.2, 0.4, 1.2).translate(0.5, 1.45, 0.2), "#657043")]);
  place(
    pineG,
    42,
    (i) => {
      const [x, z] = city(i + 200, 2, 70, 0.7);
      const s = 4.2 + 3.4 * hash(i, 12);
      return [x, GROUND_Y, z, hash(i, 13) * 6, s, s * 1.05, s];
    },
    (i) => [0.92 + 0.12 * hash(i, 14), 0.95, 0.9],
  );
  // cypresses: tall dark flames
  const cypG = merge([paint(new CylinderGeometry(0.1, 0.16, 0.6, 5).translate(0, 0.3, 0), "#4a3a2a"), paint(new ConeGeometry(0.62, 4.6, 6).translate(0, 2.8, 0), "#3e4a31")]);
  place(
    cypG,
    36,
    (i) => {
      const [x, z] = city(i + 400, 2, 80, 0.8);
      const s = 1.8 + 1.7 * hash(i, 15);
      return [x, GROUND_Y, z, 0, s, s, s];
    },
    (i) => [0.9 + 0.14 * hash(i, 16), 0.95, 0.9],
  );
  // the dome beyond the broken wall: a drum, a coffered cap, a lantern, and a portico
  const dome = merge([
    paint(new CylinderGeometry(15, 15.5, 11, 20).translate(0, 5.5, 0), "#dcae86"),
    paint(new SphereGeometry(15, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 11, 0), "#c98c68"),
    paint(new CylinderGeometry(2.1, 2.5, 3, 8).translate(0, 26.5, 0), "#e6c18f"),
    paint(new BoxGeometry(18, 8, 8).translate(0, 4, 18), "#e0b78c"),
    paint(new ConeGeometry(11, 3, 4).rotateY(Math.PI / 4).scale(1.2, 1, 0.5).translate(0, 9.6, 18), "#b9573a"),
  ]);
  const dm = new InstancedMesh(dome, mat, 1);
  const th = L.phi + 0.12;
  D.position.set(L.Cx + (L.A + 98) * Math.cos(th), GROUND_Y, L.Cz + (L.B + 98) * Math.sin(th));
  D.rotation.set(0, -th + Math.PI * 0.5, 0);
  D.scale.setScalar(1);
  D.updateMatrix();
  dm.setMatrixAt(0, D.matrix);
  dm.setColorAt(0, new Color(1, 1, 1));
  dm.frustumCulled = false;
  out.push(dm);
  // fallen blocks round the break
  const blockG = paint(new DodecahedronGeometry(1, 0), "#d4b67c");
  place(
    blockG,
    46,
    (i) => {
      const th2 = L.phi + (hash(i, 1) - 0.5) * 1.5;
      const rr = 0.86 + 0.28 * hash(i, 2);
      const s = 0.6 + 1.7 * hash(i, 3) ** 2;
      return [L.Cx + L.A * rr * Math.cos(th2), GROUND_Y + s * 0.4, L.Cz + L.B * rr * Math.sin(th2), hash(i, 4) * 6, s * 1.3, s, s];
    },
    (i) => [0.85 + 0.15 * hash(i, 5), 0.8 + 0.12 * hash(i, 6), 0.78],
  );
  return out;
}

// The sky shell: a unit sphere (the shader paints by the view ray).
export const skyGeometry = () => paint(new IcosahedronGeometry(1, 2), "#ffffff", 1);


