import * as THREE from "three";

const SPEED_REFERENCE = 5.8;

export const TRAVEL_DEBRIS_BUDGET = Object.freeze({
  low: Object.freeze({ instances: 8 }),
  medium: Object.freeze({ instances: 12 }),
  high: Object.freeze({ instances: 18 }),
});

export const POLAR_TRAVEL_DEBRIS_CONTRACT = Object.freeze({
  drawCalls: 1,
  palette: Object.freeze(["#F7FFF8", "#DDFBF8", "#D8F2FF", "#FFF4D8"]),
  programs: 1,
  profile:
    "one deterministic Three.js instanced frost-wake with mass-weighted velocity-frame arcs",
  reducedMotionInstances: 0,
  textures: 0,
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function randomUnit(seed) {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967296;
}

export function buildTravelDebrisSeeds(quality = "medium", seed = 0x51ea1) {
  const budget = TRAVEL_DEBRIS_BUDGET[quality] || TRAVEL_DEBRIS_BUDGET.medium;
  return Array.from({ length: budget.instances }, (_, index) => {
    const itemSeed = (seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    return Object.freeze({
      drift: randomUnit(itemSeed + 1) * 2 - 1,
      height: randomUnit(itemSeed + 2),
      longitudinal: randomUnit(itemSeed + 3),
      mass: 0.32 + randomUnit(itemSeed + 4) * 0.68,
      paletteIndex: index % POLAR_TRAVEL_DEBRIS_CONTRACT.palette.length,
      phase: (index + randomUnit(itemSeed + 5) * 0.72) / budget.instances,
      scale: 0.045 + randomUnit(itemSeed + 6) * 0.075,
      spin: (randomUnit(itemSeed + 7) * 2 - 1) * (2.2 + randomUnit(itemSeed + 8) * 2.8),
    });
  });
}

/**
 * Resolve one flake in the seal's instantaneous velocity frame. Mass changes
 * both the upward impulse and gravity term, so pale flakes float while the
 * denser shards stay low and settle quickly. `target` is mutable by design so
 * the render loop can reuse one object for the whole instance pool.
 */
export function sampleWeightedDebrisArc(seed, pose, elapsedSeconds, target = {}) {
  const velocityX = finite(pose?.vx);
  const velocityZ = finite(pose?.vz);
  const speed = Math.hypot(velocityX, velocityZ);
  const originX = finite(pose?.x);
  const originZ = finite(pose?.z);
  if (speed < 0.08) {
    target.visible = false;
    target.scale = 0;
    target.x = originX;
    target.y = 0.04;
    target.z = originZ;
    target.rotationX = 0;
    target.rotationY = 0;
    target.rotationZ = 0;
    return target;
  }

  const motion = clamp(speed / SPEED_REFERENCE, 0, 1);
  const directionX = velocityX / speed;
  const directionZ = velocityZ / speed;
  const sideX = -directionZ;
  const sideZ = directionX;
  const time = Math.max(0, finite(elapsedSeconds));
  const cycleRate = 0.34 + motion * 0.30 + (1 - seed.mass) * 0.06;
  const cycle = (time * cycleRate + seed.phase) % 1;
  const ballistic = Math.sin(cycle * Math.PI);
  const wakeLength = 0.46 + cycle * (1.18 + motion * 0.92) + seed.longitudinal * 0.34;
  const lateral =
    seed.drift * (0.24 + seed.mass * 0.18) +
    Math.sin(time * 1.7 + seed.phase * Math.PI * 2) * (0.025 + motion * 0.045);
  const lift = ballistic * (0.19 + (1 - seed.mass) * 0.28) * (0.58 + motion * 0.42);
  const gravity = seed.mass * cycle * cycle * 0.17;
  const fade = clamp(ballistic * 1.9, 0, 1);

  target.visible = true;
  target.x = originX - directionX * wakeLength + sideX * lateral;
  target.y = Math.max(0.045, 0.105 + seed.height * 0.055 + lift - gravity);
  target.z = originZ - directionZ * wakeLength + sideZ * lateral;
  target.rotationX = seed.spin * time * (0.3 + seed.mass * 0.22) + seed.phase * Math.PI;
  target.rotationY =
    Math.atan2(directionX, directionZ) + seed.drift * 0.48 + seed.spin * time * 0.12;
  target.rotationZ = seed.spin * time * 0.36 + ballistic * seed.drift * 0.45;
  target.scale = seed.scale * (0.58 + fade * 0.42) * (0.72 + motion * 0.28);
  return target;
}

export function createWindCutFlakeGeometry() {
  const points = [
    [0, 0.015, 0.86],
    [0, -0.01, -0.86],
    [-0.27, 0, -0.04],
    [0.27, 0, 0.04],
    [0.015, 0.105, 0],
    [-0.015, -0.075, 0],
  ];
  const faces = [
    [0, 2, 4],
    [0, 4, 3],
    [0, 3, 5],
    [0, 5, 2],
    [1, 4, 2],
    [1, 3, 4],
    [1, 5, 3],
    [1, 2, 5],
  ];
  const vertices = [];
  for (const face of faces) {
    for (const pointIndex of face) vertices.push(...points[pointIndex]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.form = "faceted wind-cut frost flake";
  return geometry;
}
