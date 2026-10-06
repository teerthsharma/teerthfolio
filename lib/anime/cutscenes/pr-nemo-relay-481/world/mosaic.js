// MOSAIC TRIANGLE-TILE DISC (bible: "Tournament of Power arena", `mosaic-tile-disc`) and its seam-break (`stage-crumble`).
// Reusable: build a floating mosaic disc as rim-to-core CHUNKS (one Mesh each) that fall apart along tile seams.
//
// GEOMETRY MATHS
//   rings k = 0..7, outer first:  r_k = R - (R - rIn) k / 8.   Ring k holds n_k "pairs" (n = 23,23,23,23,23,18,14,10), dth = 2PI/n.
//   up triangle    s: inner(th_s), inner(th_s+dth), outer(th_s+dth/2)          (apex out)
//   down triangle  s: outer(th_s-dth/2), outer(th_s+dth/2), inner(th_s)        (apex in)
//   Ring 0 therefore carries exactly 23 terracotta up-triangles (the PR's 23 files, easter egg 5).
//   each tile is shrunk 7% to its centroid and sits 0.02 m over a dark grout triangle (#3a3a4a): the 1 px tile edges.
//   core fan (r < rIn): 10 wedges, the seal's dais.   rim band: grey-blue annulus [R-1, R] closes the 23-gon.
//   underside: a cone, y_b(r) = -(1.4 + (R - r) * 0.275)  (1.4 m slab at the rim tapering to the axis, -8.0 there)
//   chunk = 2 pairs of one ring: top tiles + grout, arc walls at both radii, the cone underside. Built about its centroid.
//
// BREAK MATHS (stage-crumble) for chunk c of ring k, with tau = t - T0 - start_c
//   start_c = 0.30 k + 0.35 j_c          (outside-in; the core goes last; j_c a fixed jitter in [0,1))
//   before:  rumble amp a = S(T0-1, T0, t): jitter (sin(47 t + j), cos(41 t + j)) * 0.03 a,  seam gap 0.05 a outward
//   after:   y = 0.15 sin(min(tau, .25)/.25 PI) - 2 tau^2           (pop, then a slow-motion fall: g/2 = 2 m/s^2 at x0.5 time)
//            out = (0.5 + 0.2 k) tau                                  (drifts outward along the radial)
//            rot = (ax, ay, az) tau, a* in +-[0.3, 1.1]
//   hidden once y < -90.
import { BufferGeometry, BufferAttribute, Color, DoubleSide, Group, Mesh, Vector3 } from "three";
import { paint, painted } from "../../../sdf.js";

export const R = 24, R_IN = 2.5, NP = [23, 23, 23, 23, 23, 18, 14, 10], PAIRS_PER_CHUNK = 2;
export const COL = { cream: "#e8d8c0", terra: "#a86a48", blue: "#6a7a8a", edge: "#3a3a4a" };
const UP = [COL.terra, COL.cream, COL.blue, COL.terra, COL.cream, COL.blue, COL.terra, COL.cream];
const DN = [COL.cream, COL.blue, COL.terra, COL.cream, COL.blue, COL.terra, COL.cream, COL.blue];
export const underY = (r) => -(1.4 + (R - r) * 0.275);
const ringR = (k) => R - ((R - R_IN) * k) / 8;
const pol = (r, th, y) => new Vector3(r * Math.cos(th), y, r * Math.sin(th));
const col = (h) => new Color(h);
// hard-shadow tone drifts cool toward #2a2a3e; a little wear per tile
const worn = (hex, h) => { const c = col(hex), s = c.clone().lerp(col("#2a2a3e"), 0.5); return [c.lerp(s, 0.14 * h), s]; };

class Builder {
  constructor() { this.P = []; this.C = []; this.S = []; }
  tri(a, b, c, cc, ss, dir) {
    if (dir && new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).dot(dir) < 0) [b, c] = [c, b];
    for (const v of [a, b, c]) { this.P.push(v.x, v.y, v.z); this.C.push(cc.r, cc.g, cc.b); this.S.push(ss.r, ss.g, ss.b); }
  }
  // a painted geometry (flat normals) whose aCol/aShade are the per-triangle colours; origin moved to the centroid
  build() {
    const n = this.P.length / 3, cen = new Vector3();
    for (let i = 0; i < n; i++) cen.x += this.P[3 * i], cen.y += this.P[3 * i + 1], cen.z += this.P[3 * i + 2];
    cen.multiplyScalar(1 / n);
    const pos = new Float32Array(this.P);
    for (let i = 0; i < n; i++) { pos[3 * i] -= cen.x; pos[3 * i + 1] -= cen.y; pos[3 * i + 2] -= cen.z; }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.computeVertexNormals();
    painted(g, paint("#ffffff", "#000000", { id: 0.55 }));
    g.attributes.aCol.array.set(this.C); g.attributes.aShade.array.set(this.S);
    return { geo: g, centroid: cen };
  }
}

function walls(B, th0, th1, segs, r, dirSign) {
  const yb = underY(r), [c, s] = worn("#8a5a40", 0.3);
  for (let i = 0; i < segs; i++) {
    const a = th0 + ((th1 - th0) * i) / segs, b = th0 + ((th1 - th0) * (i + 1)) / segs, mid = (a + b) / 2;
    const dir = new Vector3(Math.cos(mid) * dirSign, 0, Math.sin(mid) * dirSign);
    B.tri(pol(r, a, 0), pol(r, b, 0), pol(r, a, yb), c, s, dir);
    B.tri(pol(r, b, 0), pol(r, b, yb), pol(r, a, yb), c, s, dir);
  }
}
function underside(B, th0, th1, segs, r0, r1) {
  const [c, s] = worn(COL.blue, 0.2);
  for (let i = 0; i < segs; i++) {
    const a = th0 + ((th1 - th0) * i) / segs, b = th0 + ((th1 - th0) * (i + 1)) / segs, mid = (a + b) / 2;
    const dir = new Vector3(Math.cos(mid) * 0.5, -1, Math.sin(mid) * 0.5);
    B.tri(pol(r1, a, underY(r1)), pol(r1, b, underY(r1)), pol(r0, a, underY(r0)), c, s, dir);
    B.tri(pol(r1, b, underY(r1)), pol(r0, b, underY(r0)), pol(r0, a, underY(r0)), c, s, dir);
  }
}
function tile(B, a, b, c, hex, h, y) {
  const cen = new Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3), sh = (v) => v.clone().sub(cen).multiplyScalar(0.93).add(cen);
  const [fc, fs] = worn(hex, h), up = new Vector3(0, 1, 0);
  B.tri(a.clone().setY(0), b.clone().setY(0), c.clone().setY(0), col(COL.edge), col("#1a1a2a"), up); // grout
  B.tri(sh(a).setY(y), sh(b).setY(y), sh(c).setY(y), fc, fs, up);                                    // tile
}

// the ring chunks, the rim bands and the core dais; `rand` is a deterministic 0..1 generator
export function buildChunks(engine, rand) {
  const group = new Group(), chunks = [];
  let proto = null;
  const add = (B, ring) => {
    const { geo, centroid } = B.build();
    let m;
    if (!proto) {
      m = proto = engine.prop(geo, 0.55);
      m.material.uniforms.uStone.value.set(3, 0.9, 0.22, 0.1); // tools/grunge: a slightly worn stone
      m.material.side = DoubleSide;                            // chunks tumble: both faces show
    } else m = new Mesh(geo, proto.material);
    m.position.copy(centroid);
    m.frustumCulled = false;
    const th = Math.atan2(centroid.z, centroid.x), sg = () => (rand() < 0.5 ? -1 : 1);
    chunks.push({ m, base: centroid.clone(), ring, j: rand(), rad: new Vector3(Math.cos(th), 0, Math.sin(th)), ax: (0.3 + 0.8 * rand()) * sg(), ay: (0.3 + 0.8 * rand()) * sg(), az: (0.3 + 0.8 * rand()) * sg() });
    group.add(m);
  };
  for (let k = 0; k < 8; k++) {
    const n = NP[k], dth = (Math.PI * 2) / n, rOut = k === 0 ? R - 0.8 : ringR(k), rIn = ringR(k + 1);
    for (let s0 = 0; s0 < n; s0 += PAIRS_PER_CHUNK) {
      const s1 = Math.min(n, s0 + PAIRS_PER_CHUNK), B = new Builder();
      for (let s = s0; s < s1; s++) {
        const h1 = ((s * 7919 + k * 104729) % 97) / 97, h2 = ((s * 6151 + k * 7727) % 89) / 89, ta = s * dth;
        tile(B, pol(rIn, ta, 0), pol(rIn, ta + dth, 0), pol(rOut, ta + dth / 2, 0), UP[k], h1, 0.02);
        tile(B, pol(rOut, ta - dth / 2, 0), pol(rOut, ta + dth / 2, 0), pol(rIn, ta, 0), DN[k], h2, 0.02);
      }
      const t0 = s0 * dth, t1 = s1 * dth, segs = (s1 - s0) * 3;
      if (k === 0) { // the rim band closing the 23-gon, and the outer wall
        const [rc, rs] = worn(COL.blue, 0.1), top = new Vector3(0, 1, 0);
        for (let i = 0; i < segs; i++) {
          const a = t0 + ((t1 - t0) * i) / segs, b = t0 + ((t1 - t0) * (i + 1)) / segs;
          B.tri(pol(R - 1, a, 0.03), pol(R, a, 0.03), pol(R - 1, b, 0.03), rc, rs, top);
          B.tri(pol(R, a, 0.03), pol(R, b, 0.03), pol(R - 1, b, 0.03), rc, rs, top);
        }
        walls(B, t0, t1, segs, R, 1);
      }
      walls(B, t0, t1, segs, rIn, -1);
      underside(B, t0, t1, segs, rIn, k === 0 ? R : ringR(k));
      add(B, k);
    }
  }
  { // the core dais: 10 wedges, terracotta and cream; the seal stands here
    const B = new Builder(), n = 10, top = new Vector3(0, 1, 0);
    for (let s = 0; s < n; s++) {
      const a = (s / n) * Math.PI * 2, b = ((s + 1) / n) * Math.PI * 2, [fc, fs] = worn(s % 2 ? COL.cream : COL.terra, 0.4);
      B.tri(new Vector3(0, 0, 0), pol(R_IN, a, 0), pol(R_IN, b, 0), col(COL.edge), col("#1a1a2a"), top);
      B.tri(new Vector3(0, 0.02, 0), pol(R_IN * 0.93, a, 0.02), pol(R_IN * 0.93, b, 0.02), fc, fs, top);
    }
    walls(B, 0, Math.PI * 2, 24, R_IN, 1);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, b = ((i + 1) / 24) * Math.PI * 2;
      B.tri(new Vector3(0, underY(0), 0), pol(R_IN, a, underY(R_IN)), pol(R_IN, b, underY(R_IN)), col(COL.blue), col("#2a2a3e"), new Vector3(0, -1, 0));
    }
    add(B, 8);
  }
  return { group, chunks, material: proto.material };
}

// pose every chunk at stepped time t; T0 = the crumble start. Mutates the meshes.
export function crumble(chunks, t, T0) {
  for (const c of chunks) {
    const { m, base, ring, j, rad } = c, tau = t - T0 - (0.3 * ring + 0.35 * j);
    const a = Math.min(1, Math.max(0, t - (T0 - 1))), amp = a * a * (3 - 2 * a);
    m.visible = true;
    if (tau <= 0) {
      m.position.set(base.x + rad.x * 0.05 * amp + Math.sin(47 * t + j * 9) * 0.03 * amp, base.y + Math.cos(41 * t + j * 7) * 0.03 * amp, base.z + rad.z * 0.05 * amp);
      m.rotation.set(0, 0, 0);
      continue;
    }
    const y = 0.15 * Math.sin((Math.min(tau, 0.25) / 0.25) * Math.PI) - 2 * tau * tau, out = (0.5 + 0.2 * ring) * tau + 0.05;
    m.position.set(base.x + rad.x * out, base.y + y, base.z + rad.z * out);
    m.rotation.set(c.ax * tau, c.ay * tau, c.az * tau);
    if (y < -90) m.visible = false;
  }
}
