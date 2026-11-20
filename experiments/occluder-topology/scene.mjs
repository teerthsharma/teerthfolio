// Occluder-topology scene (E3 L1): island follow camera, pup body box, 32x32 occlusion mask, occluder inventory.
//
// Provenance. Every number below was re-read at its path:line in this worktree; test/scene.test.mjs checks each token.
// Camera law, components/world/CameraRig.jsx: ELEVATION 27 deg, FOLLOW 21, LOOK_AHEAD 3 at components/world/CameraRig.jsx:34-36;
//   BLOCK_H 12, BLOCK_MARGIN 1.8, LIFT_MAX 46 deg, BLOCK_MIN 0.3 at components/world/CameraRig.jsx:38-41;
//   LEAD_TIME 0.7, LEAD_Z 0.5, LEAD_MAX 7 at components/world/CameraRig.jsx:42-44; LEAD_SMOOTH_DAMP 4, FOCUS_DAMP 3.5, SPEED_ZOOM_DAMP 1.5 at components/world/CameraRig.jsx:46-48;
//   LOOK_DAMP 2.5 at components/world/CameraRig.jsx:72; SPAWN_ZOOM 0.5, STATUE (0,8), SPAWN_RADIUS 4 at components/world/CameraRig.jsx:82-84;
//   BLOCKERS at components/world/CameraRig.jsx:91; damp at components/world/CameraRig.jsx:101; focus init at components/world/CameraRig.jsx:107;
//   zoom 1 at components/world/CameraRig.jsx:130; speedZoom init at components/world/CameraRig.jsx:141; spawnK init at components/world/CameraRig.jsx:146;
//   lift init at components/world/CameraRig.jsx:150; clearS init at components/world/CameraRig.jsx:151; aspect at components/world/CameraRig.jsx:183;
//   pull at components/world/CameraRig.jsx:187; speed zoom target at components/world/CameraRig.jsx:208-209; spawnK at components/world/CameraRig.jsx:237-238;
//   dNow at components/world/CameraRig.jsx:239; lead at components/world/CameraRig.jsx:242-248; wanted at components/world/CameraRig.jsx:306,315;
//   focus lerp at components/world/CameraRig.jsx:317-318; lift at components/world/CameraRig.jsx:353-370; eye and look at components/world/CameraRig.jsx:372-374;
//   pull-back at components/world/CameraRig.jsx:454-484 (gate at components/world/CameraRig.jsx:456).
//   Lens fov 28, near 0.5, far 320 at components/world/Scene.jsx:209. Jump-in duration 1.7 s at lib/world/moments.js:18. maxSpeed 10 at lib/world/motion.js:21.
// Pup box, world AABB of the body (components/world/cutscene/FrameGuard.jsx:108-120), measure at components/world/cutscene/FrameGuard.jsx:134-158,
//   front test at components/world/cutscene/FrameGuard.jsx:269-290; pup root at components/world/Seal.jsx:83,86;
//   head and tail pivots at components/world/seal/variants/D-parts.js:20,22,26; flipper span 1.64 m at components/world/seal/variants/D.check.mjs:5,61.
// Walk and motion: experiments/topo-field/path.mjs:53,70,80 (makePath, boost, tourFrames); experiments/topo-field/field.mjs:12,66-73 (makeField, update);
//   climb from the peak floor at lib/world/motion.js:307; rise at lib/world/rise.js:6; peak at lib/world/peak.js:27-29; sealRadius at lib/world/motion.js:33.
// Occluders:
//   landform heightfield, heightAt at lib/world/terrain.js:426-429, contract at lib/world/terrain.js:9-13, DAMS at lib/world/terrain.js:354;
//   ice dam cylinders at lib/world/land.js:79-85; 13 m wall from the comment at lib/world/places.js:263;
//   igloo courses at components/world/buildings/Home.jsx:38-47; home place at lib/world/places.js:231-240;
//   lab towers at components/world/LabDecor.jsx:18,38,39,48-49 and boxes at components/world/LabDecor.jsx:51-54,73-74; LAB_RADIUS at lib/world/places.js:155, lab radius at lib/world/places.js:208;
//   lab figures at components/world/monuments/index.js:27-49; LabDecor placed at components/world/Scene.jsx:89;
//   spawn plinth at lib/world/plinth.js:4-5 and components/world/monuments/SpawnStatue.jsx:104,108,111; SPAWN at lib/world/places.js:30;
//   hoodoos at lib/world/hoodoos.js:9-17; nunatak rock at lib/world/nunatak.js:7,12; field camp mast at lib/world/hut.js:1,6,19;
//   snowballs and beachballs at components/world/life/props-seed.js:38,61,69; crates at components/world/life/props-seed.js:81 and components/world/Props.jsx:109-119;
//   toys at components/world/life/toys-seed.js:16,39-41 and lib/world/toys.js:31,32,36,40,47,48;
//   PHYSICS_COLLIDERS at lib/world/wild.js:22 (used at components/world/Controller.jsx:22);
//   walkers replace real penguins: components/world/life/penguins-seed.js:76 and components/world/Penguins.jsx:226-265.
// Deviations from the spec, each one a code fact (the code wins):
//   camera focus starts at (seal.x,0,seal.z) and lerps every frame (components/world/CameraRig.jsx:107,318), not focus = wanted on the first call;
//   pull-back is gated by since >= JUMP_IN.duration with since = t + 1 (no swoop: components/world/CameraRig.jsx:119,326,456), so it is off for the first 42 frames (0.7 s);
//   heading is the velocity direction, with no body turn lag (lib/world/motion.js:27 turn rate not modelled); components/world/Seal.jsx:86 adds drive.bodyYaw, taken 0 in the walk;
//   body half-width 0.82 and z range -0.9..0.95 are estimates: components/world/seal/variants/D.check.mjs:61 asserts only the flipper span;
//   plinth is a frustum, radius 2.6 at the top and 3.2 at the base (components/world/monuments/SpawnStatue.jsx:108 cylinderGeometry(r0, r1, top));
//   lab tower = base, body, band, cap, cornice and cap plate (components/world/LabDecor.jsx:51-54,73-74);
//   crate upper box yaw 22 deg (components/world/Props.jsx:117-118) is ignored; rock base 3.9 (lib/world/nunatak.js:7) is unused, rock is y 0..11;
//   heightfield is 541 x 541 nodes at 0.5 m over [-135,135]: 292,681 calls, not 271k.
// Assumptions with no data: toy and crate sizes use height 2 x radius; the dam height 13 comes from a comment.
// Limits, for the L3 report: nunatak erratics (lib/world/nunatak.js:13-14) and hut dome, tent and sledge (lib/world/hut.js:17-18,20) have no height and are not modelled;
//   lab roofs, pilasters and courses (components/world/LabDecor.jsx:56-72) and the lab mast (components/world/LabDecor.jsx:75) are not modelled;
//   upstream sculptures and lab sculptures have no height in the data; the cutaway, car traffic and the real penguin flock are not modelled.

import { heightAt } from "../../lib/world/terrain.js";
import { PLACES, SPAWN } from "../../lib/world/places.js";
import { riseHeight } from "../../lib/world/rise.js";
import { PLINTH, plinthLift } from "../../lib/world/plinth.js";
import { LAND_COLLIDERS } from "../../lib/world/land.js";
import { PHYSICS_COLLIDERS } from "../../lib/world/wild.js";
import { MOTION } from "../../lib/world/motion.js";
import { SPIRES } from "../../lib/world/hoodoos.js";
import { ROCK, COLLIDERS as NUNATAK } from "../../lib/world/nunatak.js";
import { MAST, COLLIDERS as HUT } from "../../lib/world/hut.js";
import { buildGroups } from "../../components/world/life/props-seed.js";
import { buildToys } from "../../components/world/life/toys-seed.js";
import { makeField } from "../topo-field/field.mjs";

export const W = 32;
export const N = 1024;

const DT = 1 / 60;
const ASPECT = 1.6;
const TAN_H = Math.tan((14 * Math.PI) / 180);
const ELEVATION = (27 * Math.PI) / 180;
const FOLLOW = 21;
const LOOK_AHEAD = 3;
const BLOCK_H = 12;
const BLOCK_MARGIN = 1.8;
const LIFT_MAX = (46 * Math.PI) / 180;
const BLOCK_MIN = 0.3;
const LEAD_TIME = 0.7;
const LEAD_Z = 0.5;
const LEAD_MAX = 7;
const LEAD_SMOOTH_DAMP = 4;
const FOCUS_DAMP = 3.5;
const SPEED_ZOOM_DAMP = 1.5;
const LOOK_DAMP = 2.5;
const SPAWN_ZOOM = 0.5;
const SPAWN_RADIUS = 4;
const STATUE = { x: 0, z: 8 };
const JUMP_IN_DURATION = 1.7;
const BLOCKERS = PLACES.filter((p) => p.section === "lab" || p.section === "home");
const RANGE = 45;
const STEP = 0.5;
const TILE_NODES = 16;
const TILE_SKIP_H = 0.3;
const HF = { x0: -135, step: 0.5, n: 541 };

const damp = (rate) => 1 - Math.exp(-rate * DT);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function sealStream(path) {
  const out = new Array(path.frames);
  let heading = SPAWN.heading;
  for (let f = 0; f < path.frames; f++) {
    const x = path.x[f];
    const z = path.z[f];
    const vx = f > 0 ? (x - path.x[f - 1]) * 60 : 0;
    const vz = f > 0 ? (z - path.z[f - 1]) * 60 : 0;
    const speed = path.v[f];
    if (speed > 0.3) heading = Math.atan2(vx, vz);
    const climb = riseHeight(x, z);
    out[f] = {
      x, z, vx, vz, speed, heading,
      throttle: f > 0 ? 1 : 0,
      boost: f < path.tourFrames ? 1 : 0,
      climb,
      pupY: climb + plinthLift(x, z),
    };
  }
  return { frames: path.frames, at: (f) => out[f] };
}

export function makeFollowCamera() {
  let k = 0;
  let focus = null;
  const lead = [0, 0];
  let lift = ELEVATION;
  let clearS = 1;
  let speedZoom = 1;
  let spawnK = 1;
  return {
    step(seal) {
      const t = k / 60;
      k += 1;
      if (!focus) focus = [seal.x, 0, seal.z];
      const speedTarget = 1 + 0.1 * clamp(seal.speed / MOTION.maxSpeed, 0, 1) + 0.06 * (seal.boost && seal.throttle ? 1 : 0);
      speedZoom += (speedTarget - speedZoom) * damp(SPEED_ZOOM_DAMP);
      const atSpawn = Math.hypot(seal.x - STATUE.x, seal.z - STATUE.z) < SPAWN_RADIUS;
      spawnK += ((atSpawn ? 1 : 0) - spawnK) * damp(LOOK_DAMP);
      const dNow = (1 + SPAWN_ZOOM * spawnK) * speedZoom;

      let lx = seal.vx * LEAD_TIME;
      let lz = seal.vz * LEAD_TIME * (seal.vz > 0 ? LEAD_Z : 1);
      const len = Math.hypot(lx, lz);
      if (len > LEAD_MAX) {
        lx *= LEAD_MAX / len;
        lz *= LEAD_MAX / len;
      }
      lead[0] += (lx - lead[0]) * damp(LEAD_SMOOTH_DAMP);
      lead[1] += (lz - lead[1]) * damp(LEAD_SMOOTH_DAMP);
      const wanted = [seal.x + lead[0], seal.climb || 0, seal.z + lead[1]];
      for (let a = 0; a < 3; a++) focus[a] += (wanted[a] - focus[a]) * damp(FOCUS_DAMP);

      let liftTo = ELEVATION;
      for (const p of BLOCKERS) {
        const ox = focus[0] - p.x;
        const oz = focus[2] - p.z;
        const c = ox * ox + oz * oz - p.radius * p.radius;
        const disc = 4 * oz * oz - 4 * c;
        if (c <= 0 || disc <= 0) continue;
        const tIn = (-2 * oz - Math.sqrt(disc)) / 2;
        if (tIn > 0 && tIn < FOLLOW * Math.cos(ELEVATION)) liftTo = Math.max(liftTo, Math.min(LIFT_MAX, Math.atan2(BLOCK_H - 1, tIn)));
      }
      lift += (liftTo - lift) * damp(liftTo > lift ? 3 : 1.5);

      const orbit = [0, Math.sin(lift) * FOLLOW, Math.cos(lift) * FOLLOW];
      const eye = [focus[0] + orbit[0] * dNow, focus[1] + orbit[1] * dNow, focus[2] + orbit[2] * dNow];
      const look = [focus[0], focus[1] + 0.6, focus[2] - LOOK_AHEAD];

      if (t + 1 >= JUMP_IN_DURATION) {
        const fx = focus[0];
        const fz = focus[2];
        const dx = eye[0] - fx;
        const dz = eye[2] - fz;
        let s = 1;
        for (const p of BLOCKERS) {
          const R = p.radius + BLOCK_MARGIN;
          const ox = fx - p.x;
          const oz = fz - p.z;
          if (ox * ox + oz * oz < R * R || eye[1] > BLOCK_H) continue;
          const a = dx * dx + dz * dz;
          const b = 2 * (ox * dx + oz * dz);
          const c = ox * ox + oz * oz - R * R;
          const disc = b * b - 4 * a * c;
          if (a < 1e-6 || disc < 0) continue;
          const e = (-b - Math.sqrt(disc)) / (2 * a);
          const x = (-b + Math.sqrt(disc)) / (2 * a);
          if (e < 1 && x > 1) s = Math.min(s, Math.max(BLOCK_MIN, e));
        }
        clearS = s < clearS ? s : clearS + (s - clearS) * damp(2.5);
        if (clearS < 0.999) {
          eye[0] = fx + dx * clearS;
          eye[2] = fz + dz * clearS;
          eye[1] = focus[1] + (eye[1] - focus[1]) * clearS;
        }
      } else {
        clearS = 1;
      }

      const fwd = norm(sub(look, eye));
      const right = norm(cross(fwd, [0, 1, 0]));
      const up = cross(right, fwd);
      return { eye, look, fwd, right, up, tanH: TAN_H, aspect: ASPECT, elevation: lift, t };
    },
  };
}

const BODY = { x: 0.82, y0: 0, y1: 1.07, z0: -0.9, z1: 0.95 };

export function pupBox(seal) {
  const c = Math.cos(seal.heading);
  const s = Math.sin(seal.heading);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const bx of [-BODY.x, BODY.x]) for (const by of [BODY.y0, BODY.y1]) for (const bz of [BODY.z0, BODY.z1]) {
    const p = [seal.x + bx * c + bz * s, seal.pupY + by, seal.z - bx * s + bz * c];
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], p[a]);
      hi[a] = Math.max(hi[a], p[a]);
    }
  }
  const corners = new Float64Array(24);
  for (let i = 0; i < 8; i++) {
    corners[3 * i] = i & 1 ? hi[0] : lo[0];
    corners[3 * i + 1] = i & 2 ? hi[1] : lo[1];
    corners[3 * i + 2] = i & 4 ? hi[2] : lo[2];
  }
  return { corners, ground: seal.pupY };
}

export function projectBox(cam, box) {
  const { eye, fwd, right, up, tanH, aspect } = cam;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  let inFront = true;
  for (let i = 0; i < 8; i++) {
    const v = [box.corners[3 * i] - eye[0], box.corners[3 * i + 1] - eye[1], box.corners[3 * i + 2] - eye[2]];
    const zc = dot(v, fwd);
    if (zc <= 0.1) inFront = false;
    const d = Math.max(zc, 1e-9);
    const sx = dot(v, right) / (d * tanH * aspect);
    const sy = dot(v, up) / (d * tanH);
    x0 = Math.min(x0, sx);
    x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy);
    y1 = Math.max(y1, sy);
  }
  const centre = [0, 1, 2].map((a) => (box.corners[a] + box.corners[21 + a]) / 2);
  const depth = dot(sub(centre, eye), fwd);
  return { ok: depth >= 0.3 && inFront, x0, x1, y0, y1, depth };
}

export function bakeHeightfield(fn, { x0 = HF.x0, z0 = HF.x0, step = HF.step, n = HF.n } = {}) {
  const h = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = fn(x0 + i * step, z0 + j * step);
  const tiles = Math.ceil((n - 1) / TILE_NODES);
  const tileMax = new Float64Array(tiles * tiles).fill(-Infinity);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const t = Math.floor(j / TILE_NODES) * tiles + Math.floor(i / TILE_NODES);
    tileMax[t] = Math.max(tileMax[t], h[j * n + i]);
  }
  return { x0, z0, step, n, h, tiles, tileMax };
}

export function heightfieldAt(hf, x, z) {
  const gx = (x - hf.x0) / hf.step;
  const gz = (z - hf.x0) / hf.step;
  if (gx < 0 || gz < 0 || gx > hf.n - 1 || gz > hf.n - 1) return 0;
  const i = Math.min(Math.floor(gx), hf.n - 2);
  const j = Math.min(Math.floor(gz), hf.n - 2);
  const fx = gx - i;
  const fz = gz - j;
  const H = hf.h;
  const n = hf.n;
  return (1 - fx) * (1 - fz) * H[j * n + i] + fx * (1 - fz) * H[j * n + i + 1]
    + (1 - fx) * fz * H[(j + 1) * n + i] + fx * fz * H[(j + 1) * n + i + 1];
}

const hfWall = (hf, x, z) => Math.max(0, heightfieldAt(hf, x, z));

let HF_BAKE = null;
const CACHE = {};

function labTowers(out) {
  for (const p of PLACES) {
    if (p.section !== "lab" || p.id === "p-epsilon-hollow") continue;
    const R = p.radius;
    let h = 7;
    for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const side = p.id === "p-tangle" ? -1 : h & 1 ? 1 : -1;
    const tall = 6.5 + (h % 4);
    const tx = p.x + side * (R - 1.2);
    const tz = p.z - R + 0.9;
    const top = 0.85 + tall;
    const boxes = [
      [1.3, 0, 0.5],
      [1.1, 0.5, 0.5 + tall],
      [1.2, 0.5 + tall * 0.5, 0.8 + tall * 0.5],
      [1.25, 0.5 + tall, 0.85 + tall],
      [1.45, top - 0.06, top + 0.14],
      [1.3, top - 0.22, top - 0.1],
    ];
    for (const [hw, y0, y1] of boxes) out.push({ type: "box", x0: tx - hw, x1: tx + hw, z0: tz - hw, z1: tz + hw, y0, y1, kind: "lab", src: p.id });
  }
}

function labEnvelopes(out) {
  for (const p of PLACES) {
    if (p.section !== "lab" || p.id === "p-epsilon-hollow") continue;
    out.push({ type: "cone", x: p.x, z: p.z, y0: 0, y1: BLOCK_H, rb: p.radius, rt: p.radius, kind: "labEnvelope", src: p.id });
  }
}

function cylinder(list, kind, src, x, z, y0, y1, r) {
  list.push({ type: "cone", x, z, y0, y1, rb: r, rt: r, kind, src });
}

function buildAll(variant) {
  const cyl = [];
  const box = [];
  const sph = [];
  const dams = LAND_COLLIDERS.filter((c) => c.land === "dam");
  dams.forEach((c, i) => cylinder(cyl, "dam", `dam${i}`, c.x, c.z, 0, 13, c.radius));

  const home = PLACES.find((p) => p.id === "home");
  const PROFILE = [[2.7, 0], [2.68, 0.75], [2.58, 1.5], [2.38, 2.25], [2.06, 2.95], [1.62, 3.6], [1.05, 4.15], [0.45, 4.5], [0, 4.6]];
  for (let k = 0; k < PROFILE.length - 1; k++) {
    cylinder(cyl, "igloo", "home", home.x, home.z, PROFILE[k][1], PROFILE[k + 1][1], (PROFILE[k][0] + PROFILE[k + 1][0]) / 2);
  }

  labTowers(box);
  if (variant === "envelope") labEnvelopes(cyl);

  cyl.push({ type: "cone", x: PLINTH.x, z: PLINTH.z, y0: 0, y1: PLINTH.top, rb: PLINTH.r1, rt: PLINTH.r0, kind: "plinth", src: "spawn" });
  cylinder(cyl, "statue", "spawn", 0, SPAWN.z - 3, PLINTH.top, PLINTH.top + 2.8, 0.9);

  for (const s of SPIRES) cylinder(cyl, "hoodoo", "hoodoo", s.x, s.z, 0, s.h, s.r);
  const rock = NUNATAK.find((c) => c.x === ROCK.x && c.z === ROCK.z);
  cylinder(cyl, "rock", "nunatak", ROCK.x, ROCK.z, 0, ROCK.height, rock.radius);
  const mast = HUT.find((c) => c.x === MAST.x && c.z === MAST.z);
  cylinder(cyl, "mast", "hut", MAST.x, MAST.z, 0, 4.2, mast.radius);

  const groups = buildGroups();
  for (const b of groups.snowball) sph.push({ type: "sph", x: b.x, y: b.radius, z: b.z, r: b.radius, kind: "snowball", src: "props" });
  for (const b of groups.beachball) sph.push({ type: "sph", x: b.x, y: b.radius, z: b.z, r: b.radius, kind: "beachball", src: "props" });
  for (const c of groups.crate) box.push({ type: "box", x0: c.x - 0.4, x1: c.x + 0.4, z0: c.z - 0.4, z1: c.z + 0.4, y0: 0, y1: 1.1, kind: "crate", src: "props" });

  const toys = buildToys();
  for (const t of toys.tnt) cylinder(cyl, "tnt", "toys", t.x, t.z, 0, 2 * t.radius, t.radius);
  for (const s of toys.stacks) {
    for (const c of s.base) cylinder(cyl, "stack", "toys", c.x, c.z, c.y, c.y + 2 * c.radius, c.radius);
    for (const c of s.riders) cylinder(cyl, "stack", "toys", c.x, c.z, c.y, c.y + 2 * c.radius, c.radius);
  }
  for (const p of toys.bowling.pins) cylinder(cyl, "pin", "toys", p.x, p.z, 0, 2 * p.radius, p.radius);
  const ball = toys.bowling.ball;
  cylinder(cyl, "ball", "toys", ball.x, ball.z, 0, 2 * ball.radius, ball.radius);
  for (const c of toys.cones) cylinder(cyl, "cone", "toys", c.x, c.z, 0, 2 * c.radius, c.radius);

  return { cyl, box, sph, hf: HF_BAKE };
}

export function buildOccluders({ variant = "nominal" } = {}) {
  if (variant !== "nominal" && variant !== "envelope") throw new Error(`unknown variant ${variant}`);
  HF_BAKE ||= bakeHeightfield(heightAt);
  CACHE[variant] ||= buildAll(variant);
  return CACHE[variant];
}

export function makeWalkers(seed, { N: count = 20, shuffle = false } = {}) {
  const f = makeField({ n: 0, x: new Float64Array(0), z: new Float64Array(0) }, { N: count, seed, shuffle, water: false });
  return { step: (sx, sz) => f.update(sx, sz), x: f.movers.x, z: f.movers.z };
}

function coneHit(p, e, d) {
  const k = (p.rt - p.rb) / (p.y1 - p.y0);
  const ox = e[0] - p.x;
  const oz = e[2] - p.z;
  const Ra = p.rb + k * (e[1] - p.y0);
  const Rb = k * d[1];
  const A = d[0] * d[0] + d[2] * d[2] - Rb * Rb;
  const B = 2 * (ox * d[0] + oz * d[2] - Ra * Rb);
  const C = ox * ox + oz * oz - Ra * Ra;
  let best = null;
  if (C > 0) {
    let tS = Infinity;
    if (Math.abs(A) < 1e-12) {
      if (Math.abs(B) > 1e-12 && -C / B > 0) tS = -C / B;
    } else {
      const disc = B * B - 4 * A * C;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        for (const t of [(-B - s) / (2 * A), (-B + s) / (2 * A)]) if (t > 0 && t < tS) tS = t;
      }
    }
    if (tS < Infinity) {
      const y = e[1] + d[1] * tS;
      if (y >= p.y0 && y <= p.y1) {
        const hx = ox + d[0] * tS;
        const hz = oz + d[2] * tS;
        const r = p.rb + k * (y - p.y0);
        best = { t: tS, y, normalY: -r * k / Math.hypot(hx, r * k, hz) };
      }
    }
  }
  if (d[1] < 0 && e[1] > p.y1) {
    const tc = (p.y1 - e[1]) / d[1];
    const hx = ox + d[0] * tc;
    const hz = oz + d[2] * tc;
    if (tc > 0 && hx * hx + hz * hz <= p.rt * p.rt && (!best || tc < best.t)) best = { t: tc, y: p.y1, normalY: 1 };
  }
  return best;
}

function boxHit(p, e, d) {
  const lo = [p.x0, p.y0, p.z0];
  const hi = [p.x1, p.y1, p.z1];
  let tn = -Infinity;
  let tf = Infinity;
  let axis = -1;
  let sign = 0;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) {
      if (e[a] < lo[a] || e[a] > hi[a]) return null;
      continue;
    }
    const t1 = (lo[a] - e[a]) / d[a];
    const t2 = (hi[a] - e[a]) / d[a];
    const near = Math.min(t1, t2);
    if (near > tn) {
      tn = near;
      axis = a;
      sign = d[a] > 0 ? -1 : 1;
    }
    tf = Math.min(tf, Math.max(t1, t2));
  }
  if (tn > tf || tn <= 0) return null;
  return { t: tn, y: e[1] + d[1] * tn, normalY: axis === 1 ? sign : 0 };
}

function sphHit(p, e, d) {
  const ox = e[0] - p.x;
  const oy = e[1] - p.y;
  const oz = e[2] - p.z;
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const c = ox * ox + oy * oy + oz * oz - p.r * p.r;
  const disc = b * b - c;
  if (c <= 0 || disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t <= 0) return null;
  const y = e[1] + d[1] * t;
  return { t, y, normalY: (y - p.y) / p.r };
}

function hfHit(hf, e, d, tmax) {
  const inside = (t) => e[1] + d[1] * t < hfWall(hf, e[0] + d[0] * t, e[2] + d[2] * t);
  if (inside(0)) return null;
  let tPrev = 0;
  for (let t = STEP; t <= tmax + STEP; t += STEP) {
    if (inside(t)) {
      let lo = tPrev;
      let hi = t;
      for (let it = 0; it < 4; it++) {
        const m = (lo + hi) / 2;
        if (inside(m)) hi = m;
        else lo = m;
      }
      const px = e[0] + d[0] * hi;
      const pz = e[2] + d[2] * hi;
      const gx = (hfWall(hf, px + hf.step, pz) - hfWall(hf, px - hf.step, pz)) / (2 * hf.step);
      const gz = (hfWall(hf, px, pz + hf.step) - hfWall(hf, px, pz - hf.step)) / (2 * hf.step);
      return { t: hi, y: e[1] + d[1] * hi, normalY: 1 / Math.hypot(gx, 1, gz) };
    }
    tPrev = t;
  }
  return null;
}

const HIT = { cone: coneHit, box: boxHit, sph: sphHit };
const counts = (y, normalY, ground) => y > ground + 0.4 || normalY < 0.7;

function containsCentre(p, c) {
  if (p.type === "cone") {
    if (c[1] < p.y0 || c[1] > p.y1) return false;
    const r = p.rb + ((p.rt - p.rb) * (c[1] - p.y0)) / (p.y1 - p.y0);
    return Math.hypot(c[0] - p.x, c[2] - p.z) < r;
  }
  if (p.type === "box") return c[0] > p.x0 && c[0] < p.x1 && c[1] > p.y0 && c[1] < p.y1 && c[2] > p.z0 && c[2] < p.z1;
  return Math.hypot(c[0] - p.x, c[1] - p.y, c[2] - p.z) < p.r;
}

function distXZ(p, c) {
  if (p.type === "box") return Math.hypot(clamp(c[0], p.x0, p.x1) - c[0], clamp(c[2], p.z0, p.z1) - c[2]);
  return Math.hypot(c[0] - p.x, c[2] - p.z);
}

function heightfieldNeeded(hf, e, c) {
  const xa = Math.min(e[0], c[0]) - 4;
  const xb = Math.max(e[0], c[0]) + 4;
  const za = Math.min(e[2], c[2]) - 4;
  const zb = Math.max(e[2], c[2]) + 4;
  const idx = (v) => clamp(Math.floor((v - hf.x0) / hf.step), 0, hf.n - 1);
  const ti0 = Math.floor(idx(xa) / TILE_NODES);
  const ti1 = Math.floor(idx(xb) / TILE_NODES);
  const tj0 = Math.floor(idx(za) / TILE_NODES);
  const tj1 = Math.floor(idx(zb) / TILE_NODES);
  for (let tj = tj0; tj <= tj1; tj++) for (let ti = ti0; ti <= ti1; ti++) {
    if (hf.tileMax[tj * hf.tiles + ti] > TILE_SKIP_H) return true;
  }
  return false;
}

export function castMask(cam, proj, box, occ, walkers, mask, opts = {}) {
  mask.fill(0);
  const { eye, fwd, right, up, tanH, aspect } = cam;
  const c = [0, 1, 2].map((a) => (box.corners[a] + box.corners[21 + a]) / 2);
  const ground = box.ground;
  const lim = proj.depth - 0.5;

  const prims = [];
  const consider = (p) => {
    if (distXZ(p, c) > RANGE || containsCentre(p, c)) return;
    prims.push(p);
  };
  for (const p of occ.cyl) consider(p);
  for (const p of occ.box) consider(p);
  for (const p of occ.sph) consider(p);
  if (walkers) {
    for (let i = 0; i < walkers.x.length; i++) {
      consider({ type: "cone", x: walkers.x[i], z: walkers.z[i], y0: 0, y1: 1.07, rb: 0.4, rt: 0.4, kind: "walker", src: "walker" });
    }
  }
  const hf = occ.hf && (opts.tileSkip === false || heightfieldNeeded(occ.hf, eye, c)) && !(occ.hf && heightfieldAt(occ.hf, c[0], c[2]) > c[1]) ? occ.hf : null;

  let count = 0;
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const sx = proj.x0 + ((i + 0.5) / W) * (proj.x1 - proj.x0);
      const sy = proj.y1 - ((j + 0.5) / W) * (proj.y1 - proj.y0);
      const d = norm([0, 1, 2].map((a) => fwd[a] + sx * tanH * aspect * right[a] + sy * tanH * up[a]));
      const dfw = dot(d, fwd);
      let hit = false;
      for (const p of prims) {
        const r = HIT[p.type](p, eye, d);
        if (r && r.t * dfw < lim && counts(r.y, r.normalY, ground)) {
          hit = true;
          break;
        }
      }
      if (!hit && hf) {
        const r = hfHit(hf, eye, d, lim / dfw);
        if (r && r.t * dfw < lim && counts(r.y, r.normalY, ground)) hit = true;
      }
      mask[j * W + i] = hit ? 1 : 0;
      count += hit ? 1 : 0;
    }
  }
  return count;
}

let PHYS = null;
export function frameValid(seal) {
  PHYS ||= [...PLACES, ...PHYSICS_COLLIDERS].map((o) => ({ x: o.x, z: o.z, r: o.radius }));
  for (const o of PHYS) if (Math.hypot(seal.x - o.x, seal.z - o.z) < o.r + MOTION.sealRadius) return false;
  return heightAt(seal.x, seal.z) <= seal.climb + 0.3;
}
