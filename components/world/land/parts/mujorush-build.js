// Mount MujoRush's stone, as geometry: pure, built once, no React.
//
// ONE piece of granite, the same granite lib/world/terrain.js gives the rest
// of the massif. The south cliff is a single heightfield sheet (buildStone)
// and the three seal pups are carved INTO it, not stood in front of it: at
// every point of the face the surface is the smooth union of the jointed
// rock and each pup's round head flowing straight into its plump body (no
// neck, no ears), with its whisker pads raised and its eye sockets, whisker
// dots, smile and harbour-seal spots chiselled in. Hollows are darkened by
// their own depth (vertex cavity), so they hold shadow like real carving.
// Above the heads the rock climbs in snowy ledges to the dome; at the foot
// the rubble the carvers blasted off lies in talus fans between the pups.
//
// Three ways to seal, the way Rushmore's four men differ, west to east in
// the landing site's order: the ROYAL seal in a crown (mujoco #3396), the
// EVIL seal with little horns and angry brows (mujoco_warp #1541) and the
// PATROL seal in a cap (mujoco #3450), accessories carved from the same
// granite and merged into the same mesh. Eyes and noses are dark polished
// inlays (big and cute). Each PR number is ENGRAVED in its pup's throat:
// V-walled grooves cut into a fine patch of the same surface, with the
// radiation glowing faintly at their bottoms (MujoRush.jsx lights them).
//
// Local layout, world metres: each pup stands on its place's x; its belly
// fills its reading point's collision circle (z = -50, r = 2.5) at the
// snow line; the follow camera sees the cliff up to about y = 8 when the
// seal stands at a dock, and to about y = 21 at the overview's zoom.

import { BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../../lib/world/land.js";
import { PLACE_BY_ID } from "../../../../lib/world/places.js";

export const FACES = [
  { id: "pr-mujoco-3396", number: "#3396", look: "royal" },
  { id: "pr-mujoco-warp-1541", number: "#1541", look: "evil" },
  { id: "pr-mujoco-3450", number: "#3450", look: "patrol" },
].map((f) => ({ ...f, x: PLACE_BY_ID[f.id].x, place: PLACE_BY_ID[f.id] }));
const RAD = new Color(FACES[0].place.radiation);

const s01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (i, k) => {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
// Smooth union of two heightfield fronts (the larger z wins, with a fillet
// k wide where they meet), so carved forms flow into the rock.
function smax(a, b, k) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
// The front (largest z) of an ellipsoid at (x, y): centre, radii a (x),
// b (up its axis), c (depth), its axis leaning back by tilt radians.
function ellZ(cx, cy, cz, a, b, c, tilt, x, y) {
  const X = x - cx;
  const Y = y - cy;
  const s = Math.sin(tilt);
  const co = Math.cos(tilt);
  const A = (s * s) / (b * b) + (co * co) / (c * c);
  const B = 2 * Y * s * co * (1 / (c * c) - 1 / (b * b));
  const C = (X * X) / (a * a) + Y * Y * ((co * co) / (b * b) + (s * s) / (c * c)) - 1;
  const disc = B * B - 4 * A * C;
  return disc < 0 ? -Infinity : cz + (-B + Math.sqrt(disc)) / (2 * A);
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

// ---- the rock -------------------------------------------------------------------

// Rough-hewn granite: a jittered grid of blocks w x h m, each one flat,
// tilted face standing out of the cliff by 0..1 (times the caller's
// amplitude), meeting its neighbours in a short crisp step. rockTone is
// left holding the nearest block's own shade (0..1), so each block reads as
// one facet, like the terrain's.
let rockTone = 0;
function rock(x, y, w, h) {
  const gx = x / w;
  const gy = y / h;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gy);
  let f1 = Infinity;
  let f2 = Infinity;
  let p1 = 0;
  let p2 = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      const cx = i + 0.2 + 0.6 * hash(i, j * 7.3);
      const cy = j + 0.2 + 0.6 * hash(j * 3.1, i);
      const dd = Math.hypot(gx - cx, gy - cy);
      if (dd >= f2) continue;
      const plane = 0.25 + 0.6 * hash(i * 1.7, j * 2.9) + 1.4 * (hash(i, j + 4.4) - 0.5) * (gx - cx) + 1.2 * (hash(i + 8.1, j) - 0.5) * (gy - cy);
      if (dd < f1) {
        f2 = f1;
        p2 = p1;
        f1 = dd;
        p1 = plane;
      } else {
        f2 = dd;
        p2 = plane;
      }
    }
  }
  const e = f2 - f1; // 0 on a joint
  rockTone = (p1 * 7.31) % 1;
  return p1 + (p2 - p1) * 0.5 * (1 - s01(0, 0.06, e));
}

// ---- the cliff ------------------------------------------------------------------

// The massif's foot: the southmost edge of its three big circles (the fourth,
// the west shoulder at z = -58, stays rough rock).
const RIDGE = LAND_COLLIDERS.filter((c) => c.land === "mujorush" && c.z < -62);
export function zFront(x) {
  let z = -62;
  for (const c of RIDGE) {
    const dx = x - c.x;
    if (Math.abs(dx) < c.radius) z = Math.max(z, c.z + Math.sqrt(c.radius * c.radius - dx * dx));
  }
  return z;
}

// lib/world/terrain.js's MUJO cone (not exported there): the smooth form of
// the massif. The sheet follows it LID m up, which is above the terrain's
// ridged relief everywhere (at most +2.9 m), with the ridge line rounded.
const MUJO = { ax: -52, az: -65, bx: -24, bz: -66, h: 32, r: 23 };
const LID = 3.2;
function dome(x, z) {
  const sx = MUJO.bx - MUJO.ax;
  const sz = MUJO.bz - MUJO.az;
  const t = Math.min(1, Math.max(0, ((x - MUJO.ax) * sx + (z - MUJO.az) * sz) / (sx * sx + sz * sz)));
  const d = Math.hypot(x - MUJO.ax - sx * t, z - MUJO.az - sz * t);
  const u = (Math.sqrt(d * d + 9) - 3) / MUJO.r;
  return LID + (u < 1 ? MUJO.h * Math.pow(1 - u, 0.75) : -(u - 1) * MUJO.h * 0.6);
}

export const CLIFF_X = [-54.6, -17.4];
const TAPER = 3.2; // m over which each end rounds down into the rough rock
const SHEER = 16; // m of rise per m back: the carved band stands near vertical
const DX = 0.16; // m between columns, and between rows up the carved band
const CARVED_TOP = 11.3; // m: above this the rock climbs in ledges to the dome
const D_TOP = CARVED_TOP / SHEER - 0.3;
// Rows, in metres back from the foot: every DX of height up the carved band,
// every 5 cm back up the ledges, then sparser over the dome.
const D = [];
for (let y = -1.3; y <= CARVED_TOP + 1e-6; y += y > 5.4 && y < 8 ? DX / 2 : DX) D.push(y / SHEER - 0.3);
for (let d = D_TOP + 0.05; d < 4.2; d += 0.05) D.push(d);
D.push(4.6, 5.1, 5.7, 6.4, 7.2, 8.2, 9.4, 10.8, 12.4, 14.2, 16.2, 18.2, 20.2);

function taper(x) {
  const [x0, x1] = CLIFF_X;
  const u = Math.max(0, (x0 + TAPER - x) / TAPER, (x - (x1 - TAPER)) / TAPER);
  return Math.sqrt(Math.max(0, 1 - u * u));
}

// The face's height d m back from the foot: sheer up the carved band, then
// leaning back a little up to where the dome rounds it over.
const LEAN = 4.2; // m of rise per m back above the carved band
const rise = (d) => (d <= D_TOP ? SHEER * (d + 0.3) : CARVED_TOP + LEAN * (d - D_TOP));

// The uncarved rock the pups are cut from: it stands forward of the cliff
// from the talus up to a ledge above their heads, jointed into blocks.
function bandZ(x, y, zb) {
  const up = s01(-1.5, 0.5, y) * (1 - s01(8.2, 11, y));
  return smax(zb, -57.2 + up * 2.6, 0.8) + 0.8 * rock(x, y, 2.6, 3.4) * s01(-1, 1, y);
}

// ---- the pups -------------------------------------------------------------------

const REF_Z = -55.3; // the plane the pups are cut back to
const LIFT = 0.25; // every feature this much higher than the old draft's
// Relief, not busts: each form is broad and shallow, so the face (eyes,
// pads, cheeks, whiskers) turns to the viewer, and the chest sits back
// under the chin so the mouth is never lost in its crease.
const BODY = { y: 0.1, z: REF_Z, a: 5.4, b: 3.4, c: 4.2 }; // plump, spreading into the talus
const HEAD = { y: 3.85 + LIFT, z: REF_Z + 1.0, a: 4.4, b: 3.1, c: 3.4, tilt: 0.3 }; // round, looking up at you
const KA = HEAD.a / 4; // the accessories were drawn for a 4 x 4.5 m head
const KC = HEAD.c / 4.5;
const PAD = { x: 0.8, y: 2.62 + LIFT, a: 1.0, b: 0.78, c: 0.95 }; // the two whisker pads
const EYE = { x: 1.72, y: 4.2 + LIFT, a: 0.74, b: 0.84, c: 0.42, socket: 0.5 };
const NOSE = { y: 3.3 + LIFT, a: 0.56, b: 0.38, c: 0.34 };
export const NUM_Y = 0.98; // the engraved number's centre height on the throat

const shellZ = (fx, x, y) => smax(ellZ(fx, BODY.y, BODY.z, BODY.a, BODY.b, BODY.c, 0, x, y), ellZ(fx, HEAD.y, HEAD.z, HEAD.a, HEAD.b, HEAD.c, HEAD.tilt, x, y), 2.4);

// Harbour-seal spots, per pup (x relative to its centre, y, radius): on the
// crown, the cheeks' outer sides and the flanks, clear of the face and the
// number.
const SPOTS = [[-3.0, 5.35, 0.4], [-2.4, 6.4, 0.3], [2.9, 5.75, 0.36], [2.3, 6.55, 0.27], [-3.4, 3.3, 0.44], [3.5, 3.75, 0.38], [-4.45, 1.5, 0.46], [4.5, 1.2, 0.42], [-3.3, 0.3, 0.34], [3.25, 0.2, 0.36], [-1.1, 6.75, 0.28], [0.95, 6.9, 0.25], [5.0, 2.6, 0.3]];

// Smile grooves, per look: polylines under the pads (x relative, y).
const MOUTH = {
  royal: [[-1.5, 2.05], [-0.95, 1.62], [-0.33, 1.46], [0.33, 1.46], [0.95, 1.62], [1.5, 2.05]].map(([x, y]) => [x, y + LIFT]),
  evil: [[-1.3, 1.82], [-0.6, 1.56], [0.25, 1.52], [0.95, 1.7], [1.55, 2.25]].map(([x, y]) => [x, y + LIFT]), // the smug one-sided smirk
  patrol: null, // an open grin (a hollow, below)
};

// Everything a pup carves, precomputed once per face.
const PUPS = FACES.map((f) => {
  const fx = f.x;
  const pads = [-1, 1].map((sg) => {
    const px = fx + sg * PAD.x;
    return { x: px, y: PAD.y, z: shellZ(fx, px, PAD.y) - PAD.c * 0.36 };
  });
  const mouth = MOUTH[f.look]?.map(([x, y]) => [fx + x, y]) ?? null;
  // whiskers: three bold chiselled lines a side fanning out over the cheeks
  const whiskers = [];
  for (const pad of pads) {
    const sg = Math.sign(pad.x - fx);
    for (const [a, len] of [[0.3, 1.4], [0.02, 1.6], [-0.27, 1.35]]) {
      const x0 = pad.x + sg * 0.88;
      const y0 = pad.y + 0.05 + a * 0.5;
      whiskers.push([x0, y0, x0 + sg * len * Math.cos(a), y0 + len * Math.sin(a)]);
    }
  }
  const spots = SPOTS.map(([x, y, r], k) => [fx + (f.look === "evil" ? -x : x) + (hash(k, fx) - 0.5) * 0.4, y + (hash(fx, k) - 0.5) * 0.3, r]);
  // the evil pup's angry brows: raised ridges slanting down to the snout
  const brows = f.look === "evil" ? [-1, 1].map((sg) => [fx + sg * 0.75, EYE.y + 0.78, fx + sg * 2.35, EYE.y + 1.3]) : [];
  return { f, fx, pads, mouth, whiskers, brows, spots };
});

// The pup's raised form (head, body, pads) at (x, y), before any chiselling.
function pupForm(p, x, y) {
  let z = shellZ(p.fx, x, y);
  if (z === -Infinity) return z;
  for (const pad of p.pads) z = smax(z, ellZ(pad.x, pad.y, pad.z, PAD.a, PAD.b, PAD.c, HEAD.tilt * 0.5, x, y), 0.42);
  return z;
}

// What the chisel took out at (x, y): eye sockets, the smile, spots.
// Returns [depth, spot weight].
function chisel(p, x, y) {
  let depth = 0;
  let spot = 0;
  for (const sg of [-1, 1]) {
    const r2 = ((x - p.fx - sg * EYE.x) / (EYE.a + 0.1)) ** 2 + ((y - EYE.y) / (EYE.b + 0.1)) ** 2;
    if (r2 < 1) depth += EYE.socket * s01(0, 0.3, 1 - r2);
  }
  if (p.mouth) {
    let d = Infinity;
    for (let i = 1; i < p.mouth.length; i++) d = Math.min(d, segDist(x, y, ...p.mouth[i - 1], ...p.mouth[i]));
    depth += 0.42 * s01(0, 1, 1 - (d / 0.22) ** 2);
  } else {
    // the patrol pup's open grin: a D under the pads
    const my = 1.95 + LIFT;
    const r2 = ((x - p.fx) / 0.62) ** 2 + (Math.max(0, y - my) / 0.3) ** 2 + (Math.min(0, y - my) / 0.42) ** 2;
    if (r2 < 1) depth += 0.42 * s01(0, 0.35, 1 - r2);
  }
  for (const b of p.brows) depth -= 0.34 * s01(0.3, 0.06, segDist(x, y, ...b));
  if (Math.abs(y - PAD.y) < 1.4) {
    let d = Infinity;
    for (const w of p.whiskers) d = Math.min(d, segDist(x, y, ...w));
    depth += 0.17 * s01(0.17, 0.05, d);
  }
  for (const [sx, sy, r] of p.spots) {
    const r2 = ((x - sx) ** 2 + (y - sy) ** 2) / (r * r);
    if (r2 < 1) {
      const w = s01(0, 0.4, 1 - r2);
      depth += 0.16 * w;
      spot = Math.max(spot, w);
    }
  }
  return [depth, spot];
}

// ---- the talus ------------------------------------------------------------------

// Where two pups' bodies meet at the foot, and outside the end ones.
const GAPS = [-51.9, -40.5, -29.5, -18.9];
// A fan of blasted rubble heaped against the foot in each gap: a cone of
// scree at its angle of repose, apex FAN_TOP m up the rock.
const FAN_TOP = 3.4;
const FAN_SLOPE = 1.35; // m out per m down
const fanApex = (gx) => zFront(gx) + 0.6;
function fanZ(x, y) {
  let z = -Infinity;
  for (const gx of GAPS) {
    const r = (FAN_TOP - y) * FAN_SLOPE;
    const dx = x - gx;
    if (r > Math.abs(dx)) z = Math.max(z, fanApex(gx) + Math.sqrt(r * r - dx * dx) + 0.3 * rock(x, y, 0.8, 0.5));
  }
  return z;
}

// ---- the numbers ----------------------------------------------------------------

// Stroke digits in a box one unit high, grooves NUM_W m either side of the
// strokes, NUM_DEPTH m deep with a flat glowing bottom.
const NUM_H = 0.95;
const NUM_W = 0.1;
const NUM_DEPTH = 0.1;
const arc = (cx, cy, rx, ry, a0, a1, n = 14) =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
const SIX = [arc(0.31, 0.28, 0.26, 0.26, 0, 360, 22), [[0.05, 0.28], ...arc(0.31, 0.5, 0.26, 0.46, 180, 55, 12)]];
const GLYPHS = {
  "#": { w: 0.74, strokes: [[[0.2, 0.02], [0.32, 0.98]], [[0.44, 0.02], [0.56, 0.98]], [[0.04, 0.34], [0.7, 0.34]], [[0.08, 0.66], [0.74, 0.66]]] },
  0: { w: 0.62, strokes: [arc(0.31, 0.5, 0.27, 0.47, 0, 360, 30)] },
  1: { w: 0.42, strokes: [[[0.04, 0.74], [0.3, 0.98], [0.3, 0.02]]] },
  3: { w: 0.6, strokes: [arc(0.3, 0.74, 0.25, 0.23, 155, -90), arc(0.3, 0.27, 0.28, 0.26, 90, -155)] },
  4: { w: 0.66, strokes: [[[0.48, 0.02], [0.48, 0.98], [0.02, 0.3], [0.66, 0.3]]] },
  5: { w: 0.6, strokes: [[[0.56, 0.98], [0.12, 0.98], [0.08, 0.58]], arc(0.3, 0.31, 0.28, 0.28, 128, -150)] },
  6: { w: 0.62, strokes: SIX },
  9: { w: 0.62, strokes: SIX.map((line) => line.map(([x, y]) => [0.62 - x, 1 - y])) },
};
const GAP = 0.2;
// Each number's grooves as world segments [ax, ay, bx, by] and its box.
const NUMBERS = PUPS.map((p) => {
  const chars = [...p.f.number];
  const width = chars.reduce((s, ch) => s + GLYPHS[ch].w, 0) + GAP * (chars.length - 1);
  let u = -width / 2;
  const segs = [];
  for (const ch of chars) {
    for (const line of GLYPHS[ch].strokes) {
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1];
        const [bx, by] = line[i];
        segs.push([p.fx + (u + ax) * NUM_H, NUM_Y + (ay - 0.5) * NUM_H, p.fx + (u + bx) * NUM_H, NUM_Y + (by - 0.5) * NUM_H]);
      }
    }
    u += GLYPHS[ch].w + GAP;
  }
  return { segs, x0: p.fx - (width / 2) * NUM_H, x1: p.fx + (width / 2) * NUM_H, y0: NUM_Y - NUM_H / 2, y1: NUM_Y + NUM_H / 2 };
});
// How far outside a number's box (x, y) is (0 inside).
const boxOut = (n, x, y) => Math.hypot(Math.max(0, n.x0 - x, x - n.x1), Math.max(0, n.y0 - y, y - n.y1));
function strokeDist(n, x, y) {
  let d = Infinity;
  for (const [ax, ay, bx, by] of n.segs) d = Math.min(d, segDist(x, y, ax, ay, bx, by));
  return d;
}
// The sheet steps back out of the way under each number's fine patch (see
// buildNumbers), which lies over it and carries the grooves.
const POCKET = [0.06, 0.2]; // m outside the box: full depth, none
const PATCH = 0.45; // m outside the box the patch reaches

// ---- the carved surface ---------------------------------------------------------

// The carved surface at (x, y) in front of the cliff base zb, and how much
// of it is pup (0..1) and spot (0..1), for colour.
const out = { z: 0, pup: 0, spot: 0, tone: 0 };
function carve(x, y, zb, pocket = true) {
  let z = bandZ(x, y, zb);
  out.tone = rockTone;
  out.pup = 0;
  out.spot = 0;
  for (let i = 0; i < PUPS.length; i++) {
    const p = PUPS[i];
    if (Math.abs(x - p.fx) > 6.4) continue;
    // The dressed stone: the head and the throat that carries the number,
    // smooth and never snowed on or weathered. The rest of the body is left
    // rough-hewn, as Rushmore's busts are, rising out of the rock.
    const X = x - p.fx;
    const inHead = Math.hypot(X / HEAD.a, (y - HEAD.y) / (HEAD.b + 0.4));
    const inThroat = Math.hypot(X / 3.4, (y - 1.35) / 1.9);
    const dressed = s01(1.28, 1.0, Math.min(inHead, inThroat));
    out.pup = Math.max(out.pup, dressed);
    let form = pupForm(p, x, y);
    if (form === -Infinity) continue;
    if (dressed < 1) {
      form += 0.55 * rock(x, y, 1.5, 1.2) * (1 - dressed);
      out.tone = rockTone;
    }
    z = smax(z, form, 1.7);
    const [depth, spot] = chisel(p, x, y);
    z -= depth;
    out.spot = Math.max(out.spot, spot);
    if (pocket) z -= 0.3 * s01(POCKET[1], POCKET[0], boxOut(NUMBERS[i], x, y));
  }
  const fan = fanZ(x, y);
  if (fan > z - 1) {
    const w = s01(-0.25, 0.25, fan - z);
    z = smax(z, fan, 0.5);
    if (w > 0.5) out.tone = rockTone;
    out.pup *= 1 - w;
    out.spot *= 1 - w;
  }
  out.z = z;
  return out;
}

// The sheet at column x, d m back from the foot: its height and its z.
export function sheetAt(x, d) {
  const t = taper(x);
  let y = smin(rise(d), dome(x, zFront(x) - d), 4.5);
  if (d >= D[D.length - 1]) y -= 9; // the back edge tucks under the rock
  y = y * t - (1 - t) * 1.2;
  const zb = zFront(x) - d;
  if (d > D_TOP + 0.02) {
    // above: the same jointed rock in bigger blocks, fading out over the dome
    const z = zb + 1.6 * rock(x, y, 3.6, 3.1) * (1 - s01(22, 28, y));
    return { y, z: zb + (z - zb) * t, pup: 0, spot: 0, tone: rockTone };
  }
  const c = carve(x, y, zb);
  return { y, z: zb + (c.z - zb) * t, pup: c.pup * t, spot: c.spot * t, tone: c.tone };
}

// The surface point of the carved face at (x, y), for placing things on it.
export function faceZ(x, y) {
  return carve(x, y, zFront(x) - (y / SHEER - 0.3), false).z;
}

// ---- colour ---------------------------------------------------------------------

const GRANITE = new Color("#b9aea8"); // lib/world/terrain.js's granite (and its dark): one massif
const GRANITE_DARK = new Color("#978a84");
const CARVED = new Color("#9e928d"); // the same granite, dressed (it faces the sun square on, so a shade darker)
const DEEP = new Color("#5e5568"); // what a chiselled hollow darkens toward
const SNOW = new Color("#faf6f0");
const tmp = new Color();
// cav: 0..1 how sunk the point is; spot: a seal spot; pup: 0 rough rock ..
// 1 carved seal (weathering streaks and snow only on the rough rock).
function stone(c, x, y, ny, cav, spot, pup, tone = 0.5) {
  // the rough rock: each block its own shade, like the terrain's facets,
  // and weathering streaks down the face; the carved pups the dressed mean
  const streak = s01(0.5, 1, Math.sin(x * 1.9 + 2.2 * Math.sin(x * 0.41)) * 0.5 + 0.5) * s01(-1, 3, y);
  c.copy(GRANITE).lerp(GRANITE_DARK, 0.6 * tone + 0.3 * streak);
  c.lerp(CARVED, pup);
  c.lerp(GRANITE_DARK, 0.4 * s01(2.2, -0.5, y));
  c.lerp(DEEP, Math.min(0.85, cav + spot * 0.3));
  c.lerp(SNOW, (1 - pup) * s01(0.7, 0.8, ny) * s01(2, 3.5, y) * (1 - Math.min(1, cav * 2)));
  return c;
}

function setColors(g, colorOf) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const c = new Float32Array(p.count * 3);
  for (let k = 0; k < p.count; k++) {
    colorOf(tmp, p.getX(k), p.getY(k), p.getZ(k), n.getY(k), k);
    c[k * 3] = tmp.r;
    c[k * 3 + 1] = tmp.g;
    c[k * 3 + 2] = tmp.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
}

// A grid geometry (nx columns by ny rows, column-major) from a position
// array, indexed, with smooth normals (taken from normalPos if given). Each
// quad is split along its shorter diagonal, so steep stretches of the
// heightfield shade smoothly instead of in sawtooth streaks.
const d2 = (pos, a, b) => (pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2;
function grid(pos, nx, ny, keep = null, normalPos = null) {
  const index = [];
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < ny - 1; j++) {
      const a = i * ny + j;
      const b = a + ny;
      const tris = d2(pos, a, b + 1) < d2(pos, b, a + 1) ? [[a, b, b + 1], [a, b + 1, a + 1]] : [[a, b, a + 1], [b, b + 1, a + 1]];
      for (const tri of tris) if (!keep || keep(tri)) index.push(...tri);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(normalPos ?? pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  if (normalPos) g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}

// Concavity of each grid point: how far its neighbours' mean (near, then
// wide) sits in front of it along its normal. Hollows hold shadow.
function cavity(pos, nrm, nx, ny, i, j, near, wide) {
  let cav = 0;
  for (const [r, k] of [[near, 2.4], [wide, 0.5]]) {
    let s = 0;
    for (const [di, dj] of [[-r, 0], [r, 0], [0, -r], [0, r]]) {
      const q = (Math.min(nx - 1, Math.max(0, i + di)) * ny + Math.min(ny - 1, Math.max(0, j + dj))) * 3;
      const p = (i * ny + j) * 3;
      s += (pos[q] - pos[p]) * nrm.getX(i * ny + j) + (pos[q + 1] - pos[p + 1]) * nrm.getY(i * ny + j) + (pos[q + 2] - pos[p + 2]) * nrm.getZ(i * ny + j);
    }
    cav += (s / 4) * k;
  }
  return Math.min(0.8, Math.max(0, cav));
}

// ---- the stone ------------------------------------------------------------------

const m4 = new Matrix4();
const q = new Quaternion();
const eul = new Euler();
const v = new Vector3();
const sc = new Vector3();
function place(list, geo, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const g = geo.clone();
  eul.set(rx, ry, rz);
  q.setFromEuler(eul);
  g.applyMatrix4(m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
  list.push(g);
  return g;
}
// The head's own frame: local (x, up its axis, forward) to world.
const headFrame = (fx, extra = null) => {
  const f = new Matrix4().compose(v.set(fx, HEAD.y, HEAD.z), q.setFromEuler(eul.set(-HEAD.tilt, 0, 0)), sc.set(1, 1, 1));
  return extra ? f.multiply(extra) : f;
};
function inFrame(list, geo, frame, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  const g = geo.clone();
  eul.set(rx, ry, rz);
  q.setFromEuler(eul);
  g.applyMatrix4(m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz)));
  g.applyMatrix4(frame);
  list.push(g);
}
// mergeGeometries needs one attribute set: position, normal (and colour).
const bare = (g) => {
  g.deleteAttribute("uv");
  return g;
};

// A little devil horn: a cone bent outward along its length, base at the
// origin, tip at +y.
function horn(sg) {
  const g = new ConeGeometry(1, 1, 10, 6);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const t = p.getY(k);
    p.setX(k, p.getX(k) + sg * 0.55 * t * t);
  }
  g.computeVertexNormals();
  return g;
}

// Eyes: dark polished-stone inlays set in their sockets, one carved
// catchlight each (the evil pup's pupils radiation-magenta instead).
// Instanced in MujoRush.jsx, so they blink and follow the seal.
export const EYES = []; // { face, x, y, z, sx, sy, sz, rx }
export const SPARKS = []; // { dx, dy, dz, r, evil } relative to its eye
PUPS.forEach((p, fi) => {
  for (const sg of [-1, 1]) {
    const ex = p.fx + sg * EYE.x;
    const zs = pupForm(p, ex, EYE.y);
    const slope = (pupForm(p, ex, EYE.y + 0.2) - pupForm(p, ex, EYE.y - 0.2)) / 0.4;
    const rx = Math.atan(slope);
    EYES.push({ face: fi, x: ex, y: EYE.y, z: zs - EYE.c + 0.02, sx: EYE.a, sy: EYE.b, sz: EYE.c, rx });
    const evil = p.f.look === "evil";
    const [lx, ly, lz] = evil ? [0, -0.06, EYE.c * 0.96] : [-0.24, 0.3, EYE.c * 0.8];
    SPARKS.push({ dx: lx, dy: ly * Math.cos(rx) - lz * Math.sin(rx), dz: ly * Math.sin(rx) + lz * Math.cos(rx), r: evil ? 0.25 : 0.17, evil });
  }
});

// The engraved numbers: per face a fine patch of the same carved surface
// (3 cm grid) lying over the sheet's pocket, with the grooves cut in; the
// grooves' flat bottoms are split off as that face's glow geometry.
const FINE = 0.03;
function buildNumbers() {
  const stoneParts = [];
  const glows = [];
  NUMBERS.forEach((n) => {
    const xs = n.x0 - PATCH;
    const ys = n.y0 - PATCH;
    const nx = Math.round((n.x1 - n.x0 + 2 * PATCH) / FINE) + 1;
    const ny = Math.round((n.y1 - n.y0 + 2 * PATCH) / FINE) + 1;
    const pos = new Float32Array(nx * ny * 3);
    const flat = new Float32Array(nx * ny * 3); // the same, unlifted: its normals
    const dist = new Float32Array(nx * ny);
    for (let i = 0; i < nx; i++) {
      const x = xs + i * FINE;
      for (let j = 0; j < ny; j++) {
        const y = ys + j * FINE;
        const k = i * ny + j;
        const d = boxOut(n, x, y) < 0.2 ? strokeDist(n, x, y) : Infinity;
        dist[k] = d;
        // in front of the sheet over the pocket, tucked just under it at the
        // patch's own edge so no seam shows
        const lift = 0.015 - 0.025 * s01(PATCH - 0.12, PATCH, boxOut(n, x, y));
        const z = faceZ(x, y) - NUM_DEPTH * s01(NUM_W, NUM_W * 0.5, d);
        flat[k * 3] = pos[k * 3] = x;
        flat[k * 3 + 1] = pos[k * 3 + 1] = y;
        flat[k * 3 + 2] = z;
        pos[k * 3 + 2] = z + lift;
      }
    }
    const glowAt = (k) => dist[k] < NUM_W * 0.56;
    const isGlow = (tri) => tri.every(glowAt);
    const cut = grid(pos, nx, ny, (tri) => !isGlow(tri), flat);
    const nrm = cut.attributes.normal;
    setColors(cut, (c, x, y, z, nY, k) => {
      const i = Math.floor(k / ny);
      const j = k % ny;
      const wall = s01(NUM_W * 1.05, NUM_W * 0.5, dist[k]);
      stone(c, x, y, nY, Math.min(0.8, cavity(flat, nrm, nx, ny, i, j, 11, 32) + wall * 0.35), 0, 1);
      c.lerp(RAD, wall * 0.3);
    });
    stoneParts.push(cut);
    const glow = grid(pos, nx, ny, isGlow);
    glows.push(glow);
  });
  return { stoneParts, glows };
}

export function buildStone() {
  // the sheet
  const NX = Math.round((CLIFF_X[1] - CLIFF_X[0]) / DX) + 1;
  const rows = D.length;
  const pos = new Float32Array(NX * rows * 3);
  const pup = new Float32Array(NX * rows);
  const spot = new Float32Array(NX * rows);
  const tone = new Float32Array(NX * rows);
  for (let i = 0; i < NX; i++) {
    const x = CLIFF_X[0] + ((CLIFF_X[1] - CLIFF_X[0]) * i) / (NX - 1);
    for (let j = 0; j < rows; j++) {
      const k = i * rows + j;
      const s = sheetAt(x, D[j]);
      pos[k * 3] = x;
      pos[k * 3 + 1] = s.y;
      pos[k * 3 + 2] = s.z;
      pup[k] = s.pup;
      spot[k] = s.spot;
      tone[k] = s.tone;
    }
  }
  const sheet = grid(pos, NX, rows);
  const nrm = sheet.attributes.normal;
  setColors(sheet, (c, x, y, z, ny, k) => {
    const i = Math.floor(k / rows);
    const j = k % rows;
    stone(c, x, y, ny, cavity(pos, nrm, NX, rows, i, j, 2, 6), spot[k], pup[k], tone[k]);
  });

  // the carved accessories and brows, same granite
  const BALL = new SphereGeometry(1, 16, 12);
  const CONE = new ConeGeometry(1, 1, 8, 1);
  const BAND = new CylinderGeometry(1, 1, 1, 30, 1, true);
  const DOME = new SphereGeometry(1, 30, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const BILL = new CylinderGeometry(1, 1, 1, 22, 1, false, -Math.PI / 2, Math.PI);
  const DISC = new CylinderGeometry(1, 1, 1, 18, 1);
  const carved = [];
  const inlay = []; // dark polished stone: noses, whisker dots
  const gems = []; // radiation-lit: the crown's jewels, the patrol badge

  for (const p of PUPS) {
    const { fx } = p;
    const look = p.f.look;

    // nose: a small dark polished inlay on top of the pads' join
    place(inlay, BALL, fx, NOSE.y, pupForm(p, fx, NOSE.y) - NOSE.c * 0.45, NOSE.a, NOSE.b, NOSE.c, -0.25);
    // the drilled whisker dots, three a pad
    for (const pad of p.pads) {
      const sg = Math.sign(pad.x - fx);
      for (const [dx, dy] of [[0.12, 0.2], [0.45, 0.02], [0.28, -0.3]]) {
        const x = pad.x + sg * dx;
        const y = pad.y + dy;
        place(inlay, BALL, x, y, pupForm(p, x, y) - 0.04, 0.12, 0.12, 0.08);
      }
    }

    if (look === "royal") {
      // the crown: a band on the crown of the head, five points with balls,
      // jewels lit by the radiation
      const fr = headFrame(fx, new Matrix4().makeRotationZ(-0.1));
      inFrame(carved, BAND, fr, 0, 2.78, 0, 2.2 * KA, 0.82, 2.42 * KC);
      for (let k = -2; k <= 2; k++) {
        const a = k * 0.62;
        const px = 2.2 * KA * Math.sin(a);
        const pz = 2.42 * KC * Math.cos(a);
        const h = k === 0 ? 1.05 : Math.abs(k) === 1 ? 0.9 : 0.75;
        inFrame(carved, CONE, fr, px, 3.19 + h / 2, pz, 0.36, h, 0.36);
        inFrame(carved, BALL, fr, px, 3.19 + h + 0.1, pz, 0.2);
        if (Math.abs(k) < 2) inFrame(gems, BALL, fr, 2.2 * KA * Math.sin(a + 0.31), 2.78, 2.42 * KC * Math.cos(a + 0.31), 0.17, 0.17, 0.1);
      }
      inFrame(gems, BALL, fr, 0, 2.78, 2.42 * KC + 0.04, 0.24, 0.24, 0.12);
    }

    if (look === "evil") {
      // little devil horns curling up out of the crown of the head (its
      // angry brows are carved into the sheet, see chisel)
      const fr = headFrame(fx);
      for (const sg of [-1, 1]) inFrame(carved, horn(sg), fr, sg * 1.55, 2.45, 1.05, 0.52, 1.75, 0.52, 0.3, 0, -sg * 0.28);
    }

    if (look === "patrol") {
      // a patrol cap, a touch jaunty: dome, bill, button, and a badge lit by
      // the radiation
      const fr = headFrame(fx, new Matrix4().makeRotationZ(0.09));
      inFrame(carved, DOME, fr, 0, 1.92, 0, 3.55 * KA, 1.75, 3.95 * KC);
      inFrame(carved, BILL, fr, 0, 1.98, 3.0 * KC, 2.35 * KA, 0.2, 2.15 * KC, 0.14);
      inFrame(carved, BALL, fr, 0, 3.62, 0, 0.34, 0.24, 0.34);
      inFrame(gems, DISC, fr, 0, 2.55, 3.62 * KC, 0.36, 0.12, 0.36, Math.PI / 2 - 0.55);
    }
  }

  // colour the carved pieces like the rock they are cut from
  for (const g of carved) setColors(bare(g), (c, x, y, z, ny) => stone(c, x, y, ny, 0, 0, 1));
  for (const g of [...inlay, ...gems]) bare(g);

  const numbers = buildNumbers();
  return {
    stone: mergeGeometries([sheet, ...carved, ...numbers.stoneParts], false),
    inlay: mergeGeometries(inlay, false),
    gems: mergeGeometries(gems, false),
    glows: numbers.glows, // one per face, in FACES order
  };
}

// ---- the talus blocks, the radioactive crystals, the floating boulders ----------

// Blocks of the blasted granite lying on each fan and at the foot of each
// belly's flanks; nothing in front of a face.
export const TALUS = [];
// Crystals: chunky prisms of the district's radiation poking out of the fans.
export const CRYSTALS = [];
// On a fan: dx across it, r m out from its apex, block size.
const onFan = (gx, dx, r) => [gx + dx, Math.max(0, FAN_TOP - r / FAN_SLOPE), fanApex(gx) + Math.sqrt(Math.max(0, r * r - dx * dx))];
GAPS.forEach((gx, gi) => {
  [[0.2, 1.6, 0.5], [-0.7, 2.6, 0.62], [0.9, 3.0, 0.55], [-0.1, 3.9, 0.7], [-1.9, 4.2, 0.45], [1.9, 4.3, 0.5], [-0.9, 4.6, 0.95], [1.0, 4.7, 0.8], [2.9, 4.4, 0.36], [-3.0, 4.5, 0.4]].forEach(([dx, r, size], k) => {
    const [x, y, z] = onFan(gx, dx, r);
    TALUS.push({ x, y: y + size * 0.2, z, r: size, ry: hash(gi, k) * 6.3, rx: hash(k, gi) * 0.8 });
  });
  const [cx, cy, cz] = onFan(gx, 0.6, 2.2);
  CRYSTALS.push({ x: cx, y: cy - 0.3, z: cz, h: 1.4, r: 0.36, tilt: 0.3, ry: 1.1 + gi });
  const [dx2, dy2, dz2] = onFan(gx, -1.2, 3.6);
  CRYSTALS.push({ x: dx2, y: dy2 - 0.2, z: dz2, h: 0.95, r: 0.3, tilt: -0.35, ry: 2.3 + gi });
});
FACES.forEach((f, fi) => {
  for (const sg of [-1, 1]) {
    [[4.4, -51.2, 0.5], [3.8, -50.4, 0.34]].forEach(([dx, z, r], k) => {
      TALUS.push({ x: f.x + sg * dx, y: r * 0.3, z, r, ry: hash(fi + sg, k) * 6.3, rx: hash(k, fi) * 0.8 });
    });
  }
});

// The anomaly: granite blocks that broke off the cliff and never came down.
// They hang off the ledges above the notches between the heads, bobbing on
// their own slow beat, each speared by a glowing crystal.
export const FLOATERS = [];
GAPS.forEach((gx, gi) => {
  [[4.6, 0.62], [8.2, 0.75], [12.4, 0.55]].forEach(([y0, r], k) => {
    const x = gx + (hash(gi, k) - 0.5) * 1.2;
    const y = y0 + (hash(k, gi) - 0.5) * 0.6;
    FLOATERS.push({
      x,
      y,
      z: Math.max(faceZ(x, Math.min(y, CARVED_TOP)), zFront(x) - 0.3) + r + 0.9 + hash(gi + 5, k) * 0.5, // just off the rock it broke from
      r,
      phase: hash(gi * 3 + k, 9) * 6.28,
      speed: 0.55 + hash(k, gi + 7) * 0.35,
    });
  });
});
