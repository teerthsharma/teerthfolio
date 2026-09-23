// Seal movement on the XZ plane. Plain numbers in, plain numbers out, so it
// runs the same in the render loop and in scripts/check-world.mjs.
//
// The camera never rotates, so input is already a world direction:
// up = -z, right = +x. The seal accelerates toward that direction and its
// body turns to face where it is actually going, which is what makes it read
// as sliding on ice rather than a cursor.

export const MOTION = {
  maxSpeed: 8,
  boost: 1.65,
  accel: 3.2, // 1/s, how fast velocity closes on the wanted velocity
  brake: 2.2, // 1/s, same but with no input: the glide after release
  turn: 9, // 1/s, how fast the body faces its velocity
  arrive: 2.5, // m, click-to-move slows inside this distance
  sealRadius: 0.9,
  propFriction: 1.6,
  restitution: 0.35,
};

export function createSeal(x, z, heading = Math.PI) {
  return { x, z, vx: 0, vz: 0, heading, speed: 0, impact: 0 };
}

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

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
    if (dist > 0.25) {
      const slow = Math.min(1, dist / MOTION.arrive);
      wantX = (dx / dist) * slow;
      wantZ = (dz / dist) * slow;
      throttle = 1;
    }
  }

  const top = MOTION.maxSpeed * (boost ? MOTION.boost : 1);
  const k = damp(throttle ? MOTION.accel : MOTION.brake, dt);
  seal.vx += (wantX * top - seal.vx) * k;
  seal.vz += (wantZ * top - seal.vz) * k;
  seal.x += seal.vx * dt;
  seal.z += seal.vz * dt;

  seal.impact = Math.max(0, seal.impact - dt * 3);
  collide(seal, MOTION.sealRadius, world);

  seal.speed = Math.hypot(seal.vx, seal.vz);
  if (seal.speed > 0.2) {
    const face = Math.atan2(seal.vx, seal.vz);
    seal.heading = wrapAngle(seal.heading + wrapAngle(face - seal.heading) * damp(MOTION.turn, dt));
  }

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
      body.vx -= out * nx;
      body.vz -= out * nz;
    }
  }
}

// Loose things on the ice: the seal shoves them, they shove each other, they
// slide to a stop. Each prop is { x, z, vx, vz, radius, mass, spin }.
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
        const kick = (rel * (1 + MOTION.restitution)) / (1 + p.mass * 0.25);
        p.vx += nx * kick;
        p.vz += nz * kick;
        p.spin += (seal.vx * nz - seal.vz * nx) * 0.4;
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
