// Pure geometry and phase-portrait physics for the separatrix pavilion
// (certify / p-separatrix). No React, no mutation -- Certify.jsx turns
// these into meshes, instances and per-frame poses.
//
// The figure (data/showcase.json's p-separatrix, fig.js's "certify --"):
// a flow with two attractors and a saddle between them. The ridge of a
// hyperbolic-paraboloid roof, built to this same saddle, IS the stable
// manifold every start rolls toward; the eaves are where the unstable
// direction throws it clear to one attractor or the other. A start with
// |x0| < REFUSE_EPS never clears the saddle before the story calls it: its
// rounding disc lies on the separatrix, so it stalls and tears instead.

import { BufferGeometry, Float32BufferAttribute, PlaneGeometry } from "three";

export const ROOF_APEX = 3.6; // the saddle point, y
export const ROOF_HALF_X = 2.1; // eaves, x = +-2.1 -> y 2.28 (the unstable direction)
export const ROOF_HALF_Z = 1.4; // ridge ends, z = +-1.4 -> y 4.48 (the stable manifold)

// y = 3.6 + 0.45z^2 - 0.30x^2: rolling toward x=0 falls toward the saddle;
// rolling away from z=0 falls away from it. The phase portrait, built.
export function roofY(x, z) {
  return ROOF_APEX + 0.45 * z * z - 0.3 * x * x;
}

// PlaneGeometry(4.2, 2.8, 14, 10).rotateX(-PI/2) puts x in [-2.1, 2.1] and
// z in [-1.4, 1.4] flat at y=0; each vertex is then pushed to roof height.
export function buildRoofGeo() {
  const geo = new PlaneGeometry(ROOF_HALF_X * 2, ROOF_HALF_Z * 2, 14, 10).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, roofY(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// A 0.18 m fascia hanging from the roof's rectangular perimeter, following
// the saddle height all the way round -- the eave line read as one edge.
export function buildFasciaGeo(depth = 0.18, seg = 8) {
  const pts = [];
  const edge = (x0, z0, x1, z1) => {
    for (let i = 0; i < seg; i++) {
      const t = i / seg;
      pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
    }
  };
  edge(-ROOF_HALF_X, -ROOF_HALF_Z, ROOF_HALF_X, -ROOF_HALF_Z);
  edge(ROOF_HALF_X, -ROOF_HALF_Z, ROOF_HALF_X, ROOF_HALF_Z);
  edge(ROOF_HALF_X, ROOF_HALF_Z, -ROOF_HALF_X, ROOF_HALF_Z);
  edge(-ROOF_HALF_X, ROOF_HALF_Z, -ROOF_HALF_X, -ROOF_HALF_Z);
  pts.push(pts[0]);
  const position = [];
  for (const [x, z] of pts) {
    const y = roofY(x, z);
    position.push(x, y, z, x, y - depth, z);
  }
  const index = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    index.push(a, c, b, b, c, d);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(position, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// The separatrix itself: a raised ridge cap along x=0, riding 0.02 m proud
// of the roof at its base edges and cresting `height` above that at the
// centre -- a flat top plus two outward-facing side walls, so the key
// light (front-left) catches a real face instead of a strip lying flush
// with the roof (which foreshortens to nothing from the dock-facing
// camera, since the ridge runs along z, near the camera's own sightline).
// Row layout (4 verts/row): 0 left-base, 1 left-top, 2 right-top, 3 right-base.
export function buildRibbonGeo(width = 0.3, height = 0.07, seg = 20) {
  const half = width / 2;
  const position = [];
  for (let i = 0; i <= seg; i++) {
    const z = -ROOF_HALF_Z + (ROOF_HALF_Z * 2 * i) / seg;
    const base = ROOF_APEX + 0.02 + 0.45 * z * z; // roofY(0,z), flush with the roof
    const top = base + height;
    position.push(-half, base, z, -half, top, z, half, top, z, half, base, z);
  }
  const index = [];
  for (let i = 0; i < seg; i++) {
    const r0 = i * 4, r1 = r0 + 4;
    // top face (left-top -> right-top, +y normal)
    index.push(r0 + 1, r1 + 1, r0 + 2, r0 + 2, r1 + 1, r1 + 2);
    // left wall (base -> top at x=-half, -x normal, outward)
    index.push(r0 + 0, r1 + 0, r0 + 1, r0 + 1, r1 + 0, r1 + 1);
    // right wall (top -> base at x=+half, +x normal, outward)
    index.push(r0 + 2, r1 + 2, r0 + 3, r0 + 3, r1 + 2, r1 + 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(position, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// The fixed drop sequence: six starts along the unstable (x) direction.
// |x0| < REFUSE_EPS sits within the separatrix's rounding band: refused.
// The rest are certified to whichever side they started on.
export const START_X = [0.55, -0.4, 0.05, -0.65, 0.32, -0.03];
export const REFUSE_EPS = 0.12;
export const isRefused = (x0) => Math.abs(x0) < REFUSE_EPS;

// The flow itself: falls toward the saddle along z, spreads away from it
// along x -- the two attractors pull harder the further a start began.
export const marbleZ = (t) => 1.3 * Math.exp(-1.4 * t);
export const marbleX = (x0, t) => x0 * Math.cosh(1.8 * t);

// Time for a certified start to clear the eave (|x|=ROOF_HALF_X), solved
// from marbleX: cosh(1.8t) = ROOF_HALF_X/|x0| -> t = arccosh(.)/1.8.
export function exitTime(x0) {
  const y = ROOF_HALF_X / Math.abs(x0);
  return Math.log(y + Math.sqrt(y * y - 1)) / 1.8;
}

// Time for ANY start to reach the saddle plane (z inside SADDLE_EPS) --
// depends only on the z flow, so it is the same for every start. A refused
// start stalls here instead of continuing to spread.
export const SADDLE_EPS = 0.1;
export const SADDLE_T = Math.log(1.3 / SADDLE_EPS) / 1.4; // ~1.83 s

export const DROP_INTERVAL = 1.6; // s of phase-time between hopper drops
export const CYCLE = DROP_INTERVAL * START_X.length; // every start once per lap

export const POOL_DUR = 0.35; // s: rolling off the eave into the pool
export const POOL_SETTLE_DUR = 0.6; // s: the pool's own glow, ringing down after
export const STALL_DUR = 1.2; // s: refused, stalled on the separatrix
export const TEAR_DUR = 0.5; // s: torn toward both eaves at once

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

// One marble's pose, purely as a function of time since its own drop --
// no stored state, so the whole cycle can run forever from a bare clock.
// stage: 'roll' | 'drop' | 'stall' | 'tear' | 'gone'. Writes into `out`
// (a caller-owned, per-marble object reused every frame) instead of
// returning a fresh literal, so calling this MARBLE_COUNT times a frame
// inside useFrame allocates nothing; fields not relevant to the current
// stage are left stale from a prior call, which is fine since callers only
// read the fields that match pose.stage.
export function marblePose(x0, localT, out) {
  if (!isRefused(x0)) {
    const exitT = exitTime(x0);
    if (localT < exitT) {
      out.stage = "roll";
      out.x = marbleX(x0, localT);
      out.z = marbleZ(localT);
      return out;
    }
    const dropT = localT - exitT;
    if (dropT < POOL_DUR) {
      const ex = marbleX(x0, exitT), ez = marbleZ(exitT);
      const side = ex >= 0 ? 1 : -1;
      const k = clamp01(dropT / POOL_DUR);
      out.stage = "drop";
      out.side = side;
      out.k = k;
      out.x = lerp(ex, side * 2.25, k);
      out.z = lerp(ez, 0, k);
      out.y = lerp(roofY(ex, ez) + 0.22, 0.3, k);
      out.scale = 1 - 0.4 * k;
      return out;
    }
    out.stage = "gone";
    return out;
  }

  if (localT < SADDLE_T) {
    out.stage = "roll";
    out.x = marbleX(x0, localT);
    out.z = marbleZ(localT);
    return out;
  }
  const fx = marbleX(x0, SADDLE_T), fz = marbleZ(SADDLE_T);
  const stallT = localT - SADDLE_T;
  if (stallT < STALL_DUR) {
    out.stage = "stall";
    out.x = fx;
    out.z = fz;
    out.t = stallT;
    return out;
  }
  const tearT = stallT - STALL_DUR;
  if (tearT < TEAR_DUR) {
    out.stage = "tear";
    out.x = fx;
    out.z = fz;
    out.k = clamp01(tearT / TEAR_DUR);
    return out;
  }
  out.stage = "gone";
  return out;
}

// Where marble index i (0..START_X.length-1) sits in its own loop right
// now, given the shared accumulated phase clock.
export function localTimeFor(i, phase) {
  const raw = phase - i * DROP_INTERVAL;
  return ((raw % CYCLE) + CYCLE) % CYCLE;
}

// Which side's pool is mid-settle right now, and how bright ('rings' from
// 3.0 down to 0.4), or null. Independent of marblePose so the pool keeps
// glowing after the marble that earned it has already gone. Writes into
// `out` and returns it (or null) instead of a fresh literal -- see
// marblePose for why.
export function poolSettle(x0, localT, out) {
  if (isRefused(x0)) return null;
  const t = localT - exitTime(x0) - POOL_DUR;
  if (t < 0 || t >= POOL_SETTLE_DUR) return null;
  out.side = x0 >= 0 ? 1 : -1;
  out.intensity = 3.0 - 2.6 * (t / POOL_SETTLE_DUR);
  return out;
}
