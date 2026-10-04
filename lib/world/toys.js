// TNT crates and Bruno-style toys. Plain numbers, no React, no Three: the
// render loop (components/world/Toys.jsx) and scripts/check-world.mjs call the
// same tickToys. Every toy is an ordinary prop in live.props, so the seal
// shoves it with lib/world/motion.js stepProps like a snowball; this file only
// adds what happens after the shove (the fuse, the blast, the topple, the
// reset). Nothing here fires in an arrival hold (world.hold) or while an
// arrival plays (world.arriving).

import { MOTION } from "./motion.js";
import { waterGap } from "./river.js";

export const TOYS = {
  fuse: 1.2, // s from the bump to the BOOM
  chainFuse: 0.3, // s a crate caught in a blast burns before it goes
  blastRadius: 7.5, // m: props, penguins and the seal inside it are flung
  respawn: 20, // s before a blown crate may return
  respawnFar: 14, // m from the seal it must come back
  resetAfter: 12, // s a toppled stack, struck pins or a tipped cone lie before they stand again
  resetFar: 10, // m the seal must be from them to reset
  hop: 0.85, // s of the seal's tumble
};

const frozen = (world) => Boolean(world.hold || world.arriving);
const far = (seal, x, z, d) => Math.hypot(seal.x - x, seal.z - z) >= d;
const POP = 0.45; // s of the spring-in after a respawn or a reset

function prop(kind, x, z, radius, mass, extra) {
  return { kind, x, z, vx: 0, vz: 0, radius, mass, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0, pop: 1, ...extra };
}

export const makeTnt = (x, z) => prop("tnt", x, z, 0.62, 3, { bumps: 0, fuse: -1, gone: false, wait: 0 });
export const makeCone = (x, z) => prop("cone", x, z, 0.28, 0.5, { down: false, lie: 0, fallDir: 0, t: 0 });

// Three cubes along the base, two on top, one on the peak. Only the base is
// solid; the riders are loose in the air until the base is disturbed.
const CUBE = 0.52;
export function makeStack(cx, cz) {
  const cube = (x, z, y) => prop("cube", x, z, 0.3, 0.7, { y, layer: y, vy: 0, tilt: 0 });
  const base = [-0.62, 0, 0.62].map((dx) => cube(cx + dx, cz, 0));
  const riders = [cube(cx - 0.31, cz, CUBE), cube(cx + 0.31, cz, CUBE), cube(cx, cz, CUBE * 2)];
  return { kind: "stack", cx, cz, base, riders, down: false, t: 0 };
}

// Six pins, apex toward the ball, and a ball 3.2 m up the lane.
export function makeBowling(cx, cz) {
  const at = [[0, 0], [-0.25, 0.5], [0.25, 0.5], [-0.5, 1], [0, 1], [0.5, 1]];
  const pins = at.map(([dx, dz]) => prop("pin", cx + dx, cz + dz, 0.2, 0.45, { down: false, lie: 0, fallDir: 0 }));
  const ball = prop("bowlball", cx, cz - 3.2, 0.5, 1.4, {});
  return { kind: "bowling", cx, cz, pins, ball, struck: false, t: 0 };
}

// ---- the seal's hop --------------------------------------------------------

function landable(x, z, world) {
  if (Math.hypot(x, z) > world.radius - MOTION.sealRadius - 1.5) return false;
  if (waterGap(x, z) < 1.2) return false;
  for (const c of world.colliders) if (Math.hypot(x - c.x, z - c.z) < c.radius + MOTION.sealRadius + 0.4) return false;
  return true;
}

const FAN = [0, 0.5, -0.5, 1, -1, 1.6, -1.6];

// Thrown clear of the blast, ballistic like the geyser's throw (stepSeal's
// `flight`): it lands on the farthest spot on land that its fan of directions
// offers, or hops on the spot if there is none.
function launchSeal(seal, bx, bz, k, world) {
  let dx = seal.x - bx;
  let dz = seal.z - bz;
  let d = Math.hypot(dx, dz);
  if (d < 0.2) {
    dx = -Math.sin(seal.heading);
    dz = -Math.cos(seal.heading);
    d = 1;
  }
  const base = Math.atan2(dx, dz);
  let lx = seal.x;
  let lz = seal.z;
  search: for (let s = 4 + 3.5 * k; s > 0.9; s -= 0.5) {
    for (const turn of FAN) {
      const x = seal.x + Math.sin(base + turn) * s;
      const z = seal.z + Math.cos(base + turn) * s;
      if (landable(x, z, world)) {
        lx = x;
        lz = z;
        break search;
      }
    }
  }
  seal.vx = (lx - seal.x) / TOYS.hop;
  seal.vz = (lz - seal.z) / TOYS.hop;
  seal.flight = seal.flightTime = TOYS.hop;
  seal.airHeight = 2.4;
  seal.speed = Math.hypot(seal.vx, seal.vz);
}

// A cartoon blast at (x, z): everything inside the radius is flung outward, a
// crate in reach lights its fuse, the seal hops clear. `L` is the store's live.
export function blastAt(x, z, world, L, self) {
  const R = TOYS.blastRadius;
  L.boom.n += 1;
  L.boom.x = x;
  L.boom.z = z;
  L.boom.q.push({ x, z });
  for (const q of world.props) {
    if (q === self) continue;
    const dx = q.x - x;
    const dz = q.z - z;
    const d = Math.hypot(dx, dz);
    if (d >= R) continue;
    const k = 1 - d / R;
    const n = d < 1e-3 ? [1, 0] : [dx / d, dz / d];
    const v = Math.min(16, (5 + 13 * k) / Math.sqrt(q.mass));
    q.vx += n[0] * v;
    q.vz += n[1] * v;
    q.spin += (n[0] - n[1]) * 4 * k;
    q.hit = 1;
    if (q.kind === "tnt" && !q.gone && q.fuse < 0) light(q, TOYS.chainFuse, L, false);
  }
  const sd = Math.hypot(L.seal.x - x, L.seal.z - z);
  if (sd < R) launchSeal(L.seal, x, z, 1 - sd / R, world);
}

// ---- TNT -------------------------------------------------------------------

function light(p, fuse, L, chirp = true) {
  p.fuse = fuse;
  if (chirp) L.fizz += 1;
}

function tickTnt(p, dt, world, L) {
  const hold = frozen(world);
  if (p.gone) {
    p.wait -= dt;
    if (p.wait <= 0 && !hold && far(L.seal, p.seedX, p.seedZ, TOYS.respawnFar)) {
      Object.assign(p, { x: p.seedX, z: p.seedZ, vx: 0, vz: 0, spin: 0, hit: 0, bumps: 0, fuse: -1, gone: false, pop: 0 });
      world.props.push(p);
    }
    return;
  }
  p.pop = Math.min(1, p.pop + dt / POP);
  if (hold) return;
  if (p.fuse < 0 && p.bumps > 0) light(p, TOYS.fuse, L);
  if (p.fuse < 0) return;
  p.fuse -= dt;
  if (p.fuse > 0) return;
  const i = world.props.indexOf(p);
  if (i !== -1) world.props.splice(i, 1);
  Object.assign(p, { gone: true, wait: TOYS.respawn, fuse: -1, bumps: 0 });
  blastAt(p.x, p.z, world, L, p);
}

// ---- the stack, the pins, the cones -----------------------------------------

const moved = (p) => Math.hypot(p.x - p.seedX, p.z - p.seedZ);

function stand(p) {
  Object.assign(p, { x: p.seedX, z: p.seedZ, vx: 0, vz: 0, spin: 0, hit: 0, pop: 0, down: false, lie: 0, y: p.layer ?? 0, vy: 0 });
}

function tickStack(st, dt, world, L) {
  for (const p of [...st.base, ...st.riders]) p.pop = Math.min(1, p.pop + dt / POP);
  if (!st.down) {
    if (!st.base.some((b) => moved(b) > 0.1 || b.hit > 0.1)) return;
    st.down = true;
    st.t = 0;
    const vx = st.base.reduce((s, b) => s + b.vx, 0) / 3;
    const vz = st.base.reduce((s, b) => s + b.vz, 0) / 3;
    st.riders.forEach((r, i) => {
      const dx = r.seedX - st.cx || (i - 1) * 0.3;
      const dz = r.seedZ - st.cz + (i - 1) * 0.15;
      r.vx = vx + dx * 3;
      r.vz = vz + dz * 3;
      r.vy = 1.2;
      r.spin = (i - 1) * 4 + 2;
      world.props.push(r);
    });
    return;
  }
  for (const r of st.riders) {
    if (r.y > 0 || r.vy > 0) {
      r.vy -= 20 * dt;
      r.y += r.vy * dt;
      if (r.y <= 0) {
        r.y = 0;
        r.vy = r.vy < -2 ? -r.vy * 0.3 : 0;
      }
    }
    r.tilt = Math.min(1, r.y / CUBE);
  }
  st.t += dt;
  if (st.t >= TOYS.resetAfter && !frozen(world) && far(L.seal, st.cx, st.cz, TOYS.resetFar)) {
    for (const r of st.riders) {
      const i = world.props.indexOf(r);
      if (i !== -1) world.props.splice(i, 1);
      stand(r);
    }
    for (const b of st.base) stand(b);
    st.down = false;
  }
}

function tip(p) {
  p.down = true;
  p.fallDir = Math.hypot(p.vx, p.vz) > 0.3 ? Math.atan2(p.vx, p.vz) : Math.atan2(p.x - p.seedX, p.z - p.seedZ);
}

function tickBowling(bw, dt, world, L) {
  const all = [bw.ball, ...bw.pins];
  for (const p of all) p.pop = Math.min(1, p.pop + dt / POP);
  for (const p of bw.pins) {
    if (!p.down && (moved(p) > 0.28 || p.hit > 0.25)) tip(p);
    if (p.down) p.lie = Math.min(1, p.lie + 5 * dt);
  }
  const active = bw.pins.some((p) => p.down) || moved(bw.ball) > 0.5;
  if (!active) return;
  bw.t += dt;
  if (!bw.struck && bw.pins.every((p) => p.down) && !frozen(world)) {
    bw.struck = true;
    L.cheer.n += 1;
    L.cheer.x = bw.cx;
    L.cheer.z = bw.cz + 0.5;
  }
  if (bw.t >= TOYS.resetAfter && !frozen(world) && far(L.seal, bw.cx, bw.cz, TOYS.resetFar) && far(L.seal, bw.ball.x, bw.ball.z, TOYS.resetFar)) {
    for (const p of all) stand(p);
    bw.struck = false;
    bw.t = 0;
  }
}

function tickCone(p, dt, world, L) {
  p.pop = Math.min(1, p.pop + dt / POP);
  if (!p.down) {
    if (p.hit > 0.3 || moved(p) > 0.4) {
      tip(p);
      p.t = 0;
    }
    return;
  }
  p.lie = Math.min(1, p.lie + 5 * dt);
  p.t += dt;
  if (p.t >= TOYS.resetAfter && !frozen(world) && far(L.seal, p.seedX, p.seedZ, TOYS.resetFar)) stand(p);
}

// toys = { tnt: [], stacks: [], bowling, cones: [] } (components/world/life/toys-seed.js)
export function tickToys(toys, dt, world, L) {
  for (const p of toys.tnt ?? []) tickTnt(p, dt, world, L);
  for (const s of toys.stacks ?? []) tickStack(s, dt, world, L);
  if (toys.bowling) tickBowling(toys.bowling, dt, world, L);
  for (const c of toys.cones ?? []) tickCone(c, dt, world, L);
}
