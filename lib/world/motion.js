// Seal movement on the XZ plane. Plain numbers in, plain numbers out, so it
// runs the same in the render loop and in scripts/check-world.mjs.
//
// The camera never rotates, so input is already a world direction:
// up = -z, right = +x. The seal accelerates toward that direction and its
// body leads the turn before the path catches up, which is what makes it
// read as sliding on ice rather than a cursor.
//
// The river (lib/world/river.js) is the island's fast travel: inside it the
// wanted velocity is measured against the water, so an idle seal takes on
// the current and a paddling one adds to it.

import { onHighway } from "./land.js";
import { RIVER, riverAt } from "./river.js";

export const MOTION = {
  // A lazy seal (the owner: "a ping pong ball... make it a little slower,
  // a little lazier; seals don't jump across the map 3x a minute"): it
  // takes its time getting going and stops soon after you let go.
  maxSpeed: 10, // the island is 168 m across: about 17 s at a slide, 11 s dashing
  boost: 1.5, // 15 m/s dashing
  swimSpeed: 15, // m/s: in the water a seal is anything but lazy (and must beat the current to a bank)
  accel: 2.6, // 1/s toward the wanted velocity: 90% of top speed in 0.89 s
  brake: 3.4, // 1/s with no input: glides 2.9 m from top speed, 90% stopped in 0.68 s
  reverse: 4.5, // 1/s when the input opposes the velocity: digs in, then accelerates back
  turn: 14, // 1/s: how fast the body turns toward its heading target
  maxYaw: 10.5, // rad/s: a 180 degree reversal takes about 0.3 s, readable, not a flip
  lead: 1.0, // how far the body leads its velocity toward the input: the drift you can read
  arrive: 7.1, // m, click-to-move slows inside this distance (scaled with maxSpeed: same damping, no overshoot)
  approach: 9, // m from a place's edge where the seal slows to take it in (world.places)
  approachSpeed: 0.5, // share of top speed at a place's edge: slow enough to see it play
  sealRadius: 0.9,
  sealMass: 4,
  propFriction: 1.4,
  restitution: 0.12, // a seal thuds, it does not bounce
  rimRestitution: 0.1,
  swimSteer: 0.3, // share of the seal's own push the water takes away at the centre line
  bankPush: 0.9, // extra push, as a share, while paddling straight across the current toward a bank
  waterDrag: 6, // 1/s: how fast an idle seal takes on the current (90% in 0.4 s), so it follows the bends at speed
  centring: 3, // 1/s: an idle rider drifts back toward the centre line, so a bend never beaches it
  rimEase: 8, // m: over this last stretch before the rim the current's outward push fades out
  shoreSweep: 3, // m/s: at the rim, the current carries an idle rider sideways to the nearer bank
  road: 1.3, // on the highway's asphalt the slide tops out 30% faster: google/highway, shown
  ride: 2.1, // the river's current (RIVER.speed) scaled for the seal: source to the outflow at about 20 m/s, well past a slide
};

// riverAt writes into these, so the physics substeps allocate nothing.
const HERE = {};
const SIDE = {};

export function createSeal(x, z, heading = Math.PI) {
  return { x, z, vx: 0, vz: 0, heading, speed: 0, impact: 0, throttle: 0, skid: 0, water: 0, air: 0, airHeight: 0, flight: 0, flightTime: 1, whirled: 0, atVent: 0, bursts: 0 };
}

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// input: { x, z } direction (any length, clamped to 1), or null
// target: { x, z } point for click/tap-to-move, or null. Input wins.
export function stepSeal(seal, { input, target, boost }, dt, world) {
  // THROWN (by the whirlpool or the geyser): the seal flies ballistic with a
  // spin, `air` rising and falling 0..1 (times `airHeight` metres, for the
  // renderer), and lands with a thump that takes most of its speed.
  if (seal.flight > 0) {
    seal.flight = Math.max(0, seal.flight - dt);
    seal.air = Math.sin(Math.PI * (1 - seal.flight / seal.flightTime));
    seal.x += seal.vx * dt;
    seal.z += seal.vz * dt;
    seal.heading = wrapAngle(seal.heading + 9 * dt);
    seal.water = 0;
    seal.throttle = 0;
    if (seal.flight === 0) {
      seal.air = 0;
      seal.vx *= 0.35;
      seal.vz *= 0.35;
      seal.impact = Math.max(seal.impact, 0.6);
    }
    seal.speed = Math.hypot(seal.vx, seal.vz);
    return;
  }

  // THE GEYSER (world.geyser, lib/world/land.js GEYSER): at the vent's rim for
  // `hold` seconds, or there when the scheduled eruption goes off (world.time
  // crossing a multiple of `period`), the seal is thrown to the landing spot
  // most in line with where it stood; `bursts` counts it for the eruption.
  const geyser = world.geyser;
  if (geyser && !(seal.water > 0)) {
    const gx = seal.x - geyser.x;
    const gz = seal.z - geyser.z;
    const d = Math.hypot(gx, gz);
    const beat = world.time === undefined ? 0 : Math.floor(world.time / geyser.period);
    const erupted = seal.geyserBeat !== undefined && beat > seal.geyserBeat;
    seal.geyserBeat = beat;
    seal.atVent = d < geyser.reach ? seal.atVent + dt : 0;
    if (d < geyser.reach && (seal.atVent >= geyser.hold || erupted)) {
      let best = geyser.landings[0];
      let bestDot = -Infinity;
      for (const l of geyser.landings) {
        const lx = l[0] - geyser.x;
        const lz = l[1] - geyser.z;
        const dot = (lx * gx + lz * gz) / (Math.hypot(lx, lz) * (d || 1));
        if (dot > bestDot) {
          bestDot = dot;
          best = l;
        }
      }
      seal.vx = (best[0] - seal.x) / geyser.flight;
      seal.vz = (best[1] - seal.z) / geyser.flight;
      seal.flight = seal.flightTime = geyser.flight;
      seal.airHeight = geyser.height;
      seal.atVent = 0;
      seal.bursts += 1;
      seal.speed = Math.hypot(seal.vx, seal.vz);
      return;
    }
  }

  // THE WHIRLPOOL (world.whirlpool, lib/world/river.js WHIRLPOOL): in the
  // water under pyrefly's funnel the seal is caught and carried round the
  // pin, tighter and faster, then thrown back onto the island.
  const whirl = world.whirlpool;
  if (whirl && seal.water > 0 && Math.hypot(seal.x - whirl.x, seal.z - whirl.z) < whirl.radius) {
    const dx = seal.x - whirl.x;
    const dz = seal.z - whirl.z;
    const r = Math.max(Math.hypot(dx, dz), 0.2);
    seal.whirled += dt;
    const u = Math.min(1, seal.whirled / whirl.hold);
    const orbit = whirl.radius * 0.75 * (1 - 0.6 * u); // tighter each turn
    const spin = 7 + 9 * u; // m/s round the pin, faster as it tightens
    seal.vx = (dz / r) * spin - (dx / r) * (r - orbit) * 3;
    seal.vz = (-dx / r) * spin - (dz / r) * (r - orbit) * 3;
    seal.x += seal.vx * dt;
    seal.z += seal.vz * dt;
    seal.heading = Math.atan2(seal.vx, seal.vz);
    seal.speed = Math.hypot(seal.vx, seal.vz);
    seal.throttle = 0;
    if (u >= 1) {
      seal.vx = (whirl.throwTo[0] - seal.x) / whirl.flight;
      seal.vz = (whirl.throwTo[1] - seal.z) / whirl.flight;
      seal.flight = seal.flightTime = whirl.flight;
      seal.airHeight = 3.2;
      seal.whirled = 0;
    }
    return;
  }
  seal.whirled = 0;

  let wantX = 0;
  let wantZ = 0;
  let throttle = 0;
  let settling = false;

  if (input && (input.x || input.z)) {
    const len = Math.hypot(input.x, input.z);
    const scale = Math.min(1, len) / len;
    wantX = input.x * scale;
    wantZ = input.z * scale;
    throttle = 1;
  } else if (target) {
    const dx = target.x - seal.x;
    const dz = target.z - seal.z;
    const dist = Math.hypot(dx, dz);
    // Close enough that the arrival overshoot-and-correct would otherwise
    // spin the body round to face it: hold the heading instead.
    settling = dist < 1.2;
    if (dist > 0.25) {
      const slow = Math.min(1, dist / MOTION.arrive);
      const [sx, sz] = steerAround(seal, dx / dist, dz / dist, dist, world.colliders);
      wantX = sx * slow;
      wantZ = sz * slow;
      throttle = 1;
    }
  }
  seal.throttle = throttle;

  // The water: its velocity here, plus (for an idle rider) a drift back
  // toward the centre line, found by probing half a metre across the flow.
  const river = riverAt(seal.x, seal.z, HERE);
  // A seal that walks onto a bridge deck stays dry on it; a swimmer passes
  // under. "Walks on" means it was not already swimming properly: coming off
  // a bank it can be ankle-deep in the edge of the water for a frame or two,
  // and requiring bone-dry there left it swimming on top of the planks.
  const water = river.inside && !(seal.water < 0.35 && onBridge(seal.x, seal.z, river)) ? river.depth : 0;
  let flowX = 0;
  let flowZ = 0;
  if (water > 0) {
    flowX = river.flowX * MOTION.ride;
    flowZ = river.flowZ * MOTION.ride;
    // Where the water runs on past the rim, its outward push fades over the
    // last few metres (shore: 1 inland, 0 at the rim), so it never pins a
    // rider against the rim.
    const r = Math.hypot(seal.x, seal.z) || 1e-6;
    const shore = clamp((world.radius - MOTION.sealRadius - r) / MOTION.rimEase, 0, 1);
    const out = (flowX * seal.x + flowZ * seal.z) / r;
    if (out > 0 && shore < 1) {
      flowX -= ((1 - shore) * out * seal.x) / r;
      flowZ -= ((1 - shore) * out * seal.z) / r;
    }
    const flow = Math.hypot(river.flowX, river.flowZ);
    if (!throttle && flow > 1e-3) {
      const px = -river.flowZ / flow;
      const pz = river.flowX / flow;
      const side = riverAt(seal.x + px * 0.5, seal.z + pz * 0.5, SIDE).depth > water ? 1 : -1;
      // Toward the centre line (the lake is wider than the channel), so a
      // bend never beaches a rider; at the rim, away from it, so the current
      // leaves the rider on the nearer bank.
      const drift = shore * (1 - water) * river.half * MOTION.centring - (1 - shore) * MOTION.shoreSweep;
      flowX += px * side * drift;
      flowZ += pz * side * drift;
    }
  }
  seal.water = water;

  const speed0 = Math.hypot(seal.vx - flowX, seal.vz - flowZ);
  const opposing = speed0 > 1 && (wantX * (seal.vx - flowX) + wantZ * (seal.vz - flowZ)) / speed0 < -0.2;

  // Paddling across the current, toward a bank, gets extra push and a
  // quicker response: the current is fast enough that a plain slide across
  // was swept into the lake before it reached the bank. Riding is unchanged.
  let across = 0;
  if (water > 0 && throttle) {
    const flow = Math.hypot(flowX, flowZ);
    if (flow > 1e-3) across = Math.abs(wantX * (-flowZ / flow) + wantZ * (flowX / flow));
  }
  const road = water === 0 && onHighway(seal.x, seal.z) ? MOTION.road : 1;
  // Near a place the seal slows to take it in (world.places), down to
  // approachSpeed at its edge.
  let near = 1;
  if (world.places) {
    for (const p of world.places) {
      const gap = Math.hypot(seal.x - p.x, seal.z - p.z) - p.radius;
      if (gap < MOTION.approach) near = Math.min(near, MOTION.approachSpeed + ((1 - MOTION.approachSpeed) * Math.max(0, gap)) / MOTION.approach);
    }
  }
  const top = (water > 0 ? MOTION.swimSpeed : MOTION.maxSpeed * road * near) * (boost ? MOTION.boost : 1) * (1 - MOTION.swimSteer * water) * (1 + MOTION.bankPush * across);
  const idle = water > 0 ? MOTION.waterDrag : MOTION.brake;
  const k = damp(throttle ? (opposing ? MOTION.reverse : across > 0.5 ? MOTION.reverse : MOTION.accel) : idle, dt);
  seal.vx += (wantX * top + flowX - seal.vx) * k;
  seal.vz += (wantZ * top + flowZ - seal.vz) * k;
  seal.x += seal.vx * dt;
  seal.z += seal.vz * dt;

  seal.impact = Math.max(0, seal.impact - dt * 3);
  collide(seal, MOTION.sealRadius, world);
  // Props before speed, heading and skid, so a shove lands in this substep.
  if (world.props) stepProps(seal, world, dt);

  seal.speed = Math.hypot(seal.vx, seal.vz);
  if ((seal.speed > 0.2 || throttle) && !settling) {
    let targetHeading;
    if (throttle) {
      targetHeading = Math.atan2(seal.vx + wantX * top * MOTION.lead, seal.vz + wantZ * top * MOTION.lead);
    } else {
      // Coasting: a knock-back leaves velocity pointed away from where the
      // seal was headed. Keep facing that way (the wall) instead of turning
      // round to face the new velocity.
      const back = seal.vx * Math.sin(seal.heading) + seal.vz * Math.cos(seal.heading) < 0;
      targetHeading = back ? Math.atan2(-seal.vx, -seal.vz) : Math.atan2(seal.vx, seal.vz);
    }
    const dh = wrapAngle(targetHeading - seal.heading) * damp(MOTION.turn, dt);
    seal.heading = wrapAngle(seal.heading + clamp(dh, -MOTION.maxYaw * dt, MOTION.maxYaw * dt));
  }

  // How much the body is sliding sideways of where it faces: the read on ice.
  const side = Math.abs(seal.vx * Math.cos(seal.heading) - seal.vz * Math.sin(seal.heading));
  let skidTarget = clamp((side - 1.2) / 5, 0, 1);
  if (opposing) skidTarget += clamp(seal.speed / MOTION.maxSpeed, 0, 1);
  // Swimming is not skidding.
  skidTarget = water > 0 ? 0 : Math.min(1, skidTarget);
  seal.skid += (skidTarget - seal.skid) * damp(8, dt);

  return seal;
}

// A deck across the water (RIVER.bridges): a seal that comes onto it from a
// bank slides over dry and the current never sweeps it off. The deck spans
// the water bank to bank, square to the flow, `width` metres along it.
function onBridge(x, z, river) {
  const flow = Math.hypot(river.flowX, river.flowZ);
  if (flow < 1e-6) return false;
  const fx = river.flowX / flow;
  const fz = river.flowZ / flow;
  for (const b of RIVER.bridges) {
    const dx = x - b.x;
    const dz = z - b.z;
    if (Math.abs(dx * fx + dz * fz) < b.width / 2 + MOTION.sealRadius && Math.abs(dz * fx - dx * fz) < river.half + MOTION.sealRadius) return true;
  }
  return false;
}

// Click-to-move heads straight for the target, so anything standing in the
// corridor between would pin the seal against it. Every collider ahead and
// within reach of the line bends the heading sideways, harder the closer it
// is; the sum is renormalised. A collider dead on the line always turns the
// seal the same way, so it never dithers between both sides.
function steerAround(seal, dirX, dirZ, dist, colliders) {
  let x = dirX;
  let z = dirZ;
  const perpX = -dirZ;
  const perpZ = dirX;
  for (const c of colliders) {
    const ox = c.x - seal.x;
    const oz = c.z - seal.z;
    const along = ox * dirX + oz * dirZ;
    if (along <= 0 || along > dist) continue;
    const side = ox * perpX + oz * perpZ;
    const clear = c.radius + MOTION.sealRadius + 1.5;
    if (Math.abs(side) >= clear) continue;
    const push = ((clear - Math.abs(side)) / clear) * Math.min(1.5, 8 / Math.max(along, 1));
    const away = side > 0 ? -1 : 1;
    x += perpX * away * push * 1.4;
    z += perpZ * away * push * 1.4;
  }
  const len = Math.hypot(x, z) || 1;
  return [x / len, z / len];
}

// Push a moving circle out of every static collider and the island rim, and
// strip the velocity that pointed into the wall.
function collide(body, radius, world) {
  for (const c of world.colliders) {
    const dx = body.x - c.x;
    const dz = body.z - c.z;
    const dist = Math.hypot(dx, dz) || 1e-6;
    const min = c.radius + radius;
    if (dist < min) {
      const nx = dx / dist;
      const nz = dz / dist;
      body.x = c.x + nx * min;
      body.z = c.z + nz * min;
      const into = body.vx * nx + body.vz * nz;
      if (into < 0) {
        body.vx -= into * nx * (1 + MOTION.restitution);
        body.vz -= into * nz * (1 + MOTION.restitution);
        if (body.impact !== undefined) body.impact = Math.max(body.impact, Math.min(1, -into / MOTION.maxSpeed));
      }
    }
  }
  const r = Math.hypot(body.x, body.z);
  const rim = world.radius - radius;
  if (r > rim) {
    const nx = body.x / r;
    const nz = body.z / r;
    body.x = nx * rim;
    body.z = nz * rim;
    const out = body.vx * nx + body.vz * nz;
    if (out > 0) {
      // A bounce, not a wall: sliding along the rim (small out) stays quiet.
      body.vx -= out * nx * (1 + MOTION.rimRestitution);
      body.vz -= out * nz * (1 + MOTION.rimRestitution);
      if (body.impact !== undefined && out > 2) {
        body.impact = Math.max(body.impact, Math.min(1, out / MOTION.maxSpeed));
      }
    }
  }
}

// Loose things on the ice: the seal shoves them, they shove each other, they
// slide to a stop. Each prop is { x, z, vx, vz, radius, mass, spin, hit }.
// motion.js never reads p.kind: a penguin is an ordinary prop here, steered
// by Penguins.jsx before the physics step.
function stepProps(seal, world, dt) {
  const props = world.props;
  for (const p of props) {
    const dx = p.x - seal.x;
    const dz = p.z - seal.z;
    const dist = Math.hypot(dx, dz) || 1e-6;
    const min = p.radius + MOTION.sealRadius;
    if (dist < min) {
      const nx = dx / dist;
      const nz = dz / dist;
      p.x = seal.x + nx * min;
      p.z = seal.z + nz * min;
      const rel = (seal.vx - p.vx) * nx + (seal.vz - p.vz) * nz;
      if (rel > 0) {
        // Two-body impulse: a crate (heavy) stops the seal hard, a snowball
        // barely slows it, a penguin goes flying.
        const j = (rel * (1 + MOTION.restitution)) / (1 / MOTION.sealMass + 1 / p.mass);
        p.spin += (seal.vx * nz - seal.vz * nx) * 0.4;
        p.vx += (nx * j) / p.mass;
        p.vz += (nz * j) / p.mass;
        seal.vx -= (nx * j) / MOTION.sealMass;
        seal.vz -= (nz * j) / MOTION.sealMass;
        if (p.mass >= 2) {
          seal.impact = Math.max(seal.impact, Math.min(1, ((j / MOTION.sealMass) / MOTION.maxSpeed) * 1.5));
        }
        p.hit = Math.max(p.hit ?? 0, Math.min(1, (rel / MOTION.maxSpeed) * 1.5));
      }
    }
  }
  for (let i = 0; i < props.length; i++) {
    for (let j = i + 1; j < props.length; j++) {
      const a = props[i];
      const b = props[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz) || 1e-6;
      const min = a.radius + b.radius;
      if (dist < min) {
        const nx = dx / dist;
        const nz = dz / dist;
        const push = (min - dist) / 2;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel > 0) {
          const total = a.mass + b.mass;
          const j2 = (rel * (1 + MOTION.restitution)) / total;
          a.vx -= nx * j2 * b.mass;
          a.vz -= nz * j2 * b.mass;
          b.vx += nx * j2 * a.mass;
          b.vz += nz * j2 * a.mass;
          const hit = Math.min(1, rel / MOTION.maxSpeed);
          a.hit = Math.max(a.hit ?? 0, hit);
          b.hit = Math.max(b.hit ?? 0, hit);
        }
      }
    }
  }
  const f = Math.exp(-MOTION.propFriction * dt);
  for (const p of props) {
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.vx *= f;
    p.vz *= f;
    p.spin *= f;
    p.hit = Math.max(0, (p.hit ?? 0) - 3 * dt);
    collide(p, p.radius, world);
  }
}

// The building the seal is standing at, if any: within `reach` metres of its
// footprint edge.
export function nearestPlace(seal, places, reach = 3.2) {
  let best = null;
  let bestGap = reach;
  for (const place of places) {
    const gap = Math.hypot(seal.x - place.x, seal.z - place.z) - place.radius - MOTION.sealRadius;
    if (gap < bestGap) {
      bestGap = gap;
      best = place;
    }
  }
  return best;
}
