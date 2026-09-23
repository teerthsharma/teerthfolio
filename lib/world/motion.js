// Seal movement on the XZ plane. Plain numbers in, plain numbers out, so it
// runs the same in the render loop and in scripts/check-world.mjs.
//
// The camera never rotates, so input is already a world direction:
// up = -z, right = +x. The seal accelerates toward that direction and its
// body leads the turn before the path catches up, which is what makes it
// read as sliding on ice rather than a cursor.

export const MOTION = {
  maxSpeed: 8.5,
  boost: 1.55, // 13.2 m/s boosted
  accel: 3.0, // 1/s toward the wanted velocity: 90% of top speed in 0.77 s
  brake: 1.7, // 1/s with no input: glides 5.0 m from top speed, 90% stopped in 1.35 s. This is the ice.
  reverse: 4.5, // 1/s when the input opposes the velocity: digs in, then accelerates back
  turn: 14, // 1/s: how fast the body turns toward its heading target
  maxYaw: 10.5, // rad/s: a 180 degree reversal takes about 0.3 s, readable, not a flip
  lead: 1.0, // how far the body leads its velocity toward the input: the drift you can read
  arrive: 6.0, // m, click-to-move slows inside this distance
  sealRadius: 0.9,
  sealMass: 4,
  propFriction: 1.4,
  restitution: 0.35,
  rimRestitution: 0.25,
};

export function createSeal(x, z, heading = Math.PI) {
  return { x, z, vx: 0, vz: 0, heading, speed: 0, impact: 0, throttle: 0, skid: 0 };
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
      wantX = (dx / dist) * slow;
      wantZ = (dz / dist) * slow;
      throttle = 1;
    }
  }
  seal.throttle = throttle;

  const speed0 = Math.hypot(seal.vx, seal.vz);
  const opposing = speed0 > 1 && (wantX * seal.vx + wantZ * seal.vz) / speed0 < -0.2;

  const top = MOTION.maxSpeed * (boost ? MOTION.boost : 1);
  const k = damp(throttle ? (opposing ? MOTION.reverse : MOTION.accel) : MOTION.brake, dt);
  seal.vx += (wantX * top - seal.vx) * k;
  seal.vz += (wantZ * top - seal.vz) * k;
  seal.x += seal.vx * dt;
  seal.z += seal.vz * dt;

  seal.impact = Math.max(0, seal.impact - dt * 3);
  collide(seal, MOTION.sealRadius, world);

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
  skidTarget = Math.min(1, skidTarget);
  seal.skid += (skidTarget - seal.skid) * damp(8, dt);

  if (world.props) stepProps(seal, world, dt);
  return seal;
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
