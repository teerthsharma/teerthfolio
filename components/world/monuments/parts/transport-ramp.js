// Pure ramp math for the "transport" sculpture (monodromy, place id
// p-monodromy). No React, no three.js: just the two-turn spiral a real
// ramp can be built from, and the raw vertex data for one climbable sheet
// of it.
//
// Mirrors the landing figure's own construction (fig.js, "transport —
// monodromy", see its long comment): the rim of the sqrt(w) surface, at
// r=1, is height = H*cos(theta/2) with theta running over two full laps
// (0..4*PI) — one continuous edge that is at the top at theta=0, at the
// BOTTOM at theta=2*PI (one lap round, directly below where it started),
// and back at the top only at theta=4*PI (a second lap). Read as a real
// ramp instead of a flat illustration, that is exactly a two-turn spiral
// staircase: a climber tracing it needs two full trips round the tower to
// get home. RAMP_Y here climbs linearly with the lap fraction (a real ramp
// has to be walkable, not a wall), so the "closes only every second lap"
// fact lives entirely in the angle each height is reached at — same as the
// figure, where going round and looking is the whole method.

export const RAMP_INNER = 0.7; // flush against the tower
export const RAMP_OUTER = 1.65;
export const RAMP_THICK = 0.18;
export const RAMP_Y0 = 0.46; // top-surface height at the foot (lap fraction 0)
export const RAMP_Y1 = 3.65; // top-surface height at the top (lap fraction 1, two laps round)
export const RAMP_TURNS = 2;
export const RAMP_ANGLE_TOTAL = RAMP_TURNS * Math.PI * 2;
export const RAMP_SEGMENTS = 96;
export const SHEET_SEGMENTS = RAMP_SEGMENTS / 2; // one lap per sheet

// t: 0 at the foot, 1 at the top (two laps round). angle(t) covers both
// laps; topY(t) is the ramp's own climb, linear in t.
export function rampAngle(t) {
  return t * RAMP_ANGLE_TOTAL;
}
export function rampTopY(t) {
  return RAMP_Y0 + t * (RAMP_Y1 - RAMP_Y0);
}

// The outer rail, traced once along the whole two-turn spiral: plain
// [x, y, z] triples, ready for a CatmullRomCurve3 in the component.
export function outerLipPoints(segments = RAMP_SEGMENTS) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = rampAngle(t);
    pts.push([Math.sin(angle) * RAMP_OUTER, rampTopY(t), Math.cos(angle) * RAMP_OUTER]);
  }
  return pts;
}

// One slab of the ramp between t0 and t1: a ruled surface with inner/outer
// rails and a real thickness, capped only where the ramp truly ends — the
// seam between the two laps needs none, each covering the other's open
// end. Returns plain position/index arrays (no BufferGeometry: that is the
// component's job, same split as hull-geometry.js).
export function buildRampSheetData(t0, t1, segments, capStart, capEnd) {
  const positions = [];
  const indices = [];
  const pushV = (x, y, z) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);

  let prev = null;
  for (let i = 0; i <= segments; i++) {
    const t = t0 + (t1 - t0) * (i / segments);
    const angle = rampAngle(t);
    const y = rampTopY(t);
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const cur = {
      iT: pushV(s * RAMP_INNER, y, c * RAMP_INNER),
      oT: pushV(s * RAMP_OUTER, y, c * RAMP_OUTER),
      iB: pushV(s * RAMP_INNER, y - RAMP_THICK, c * RAMP_INNER),
      oB: pushV(s * RAMP_OUTER, y - RAMP_THICK, c * RAMP_OUTER),
    };
    if (prev) {
      quad(prev.iT, prev.oT, cur.oT, cur.iT); // top (upward normal)
      quad(prev.iB, cur.iB, cur.oB, prev.oB); // bottom
      quad(prev.oB, cur.oB, cur.oT, prev.oT); // outer rail (outward normal)
      quad(prev.iB, prev.iT, cur.iT, cur.iB); // inner rail (inward normal)
    } else if (capStart) {
      quad(cur.iB, cur.oB, cur.oT, cur.iT);
    }
    prev = cur;
  }
  if (capEnd) quad(prev.iB, prev.iT, prev.oT, prev.oB);

  return { positions: new Float32Array(positions), indices };
}
