// Every signal a seal body animates from, derived once per frame from
// live.seal and the place it is at. Seal.jsx owns one drive and steps it; the
// variant only reads it, so A, B and C move on exactly the same timing and
// differ only in how they look.
//
// Pure numbers, no three.js: drive.check.mjs steps it in node.
//
// Frame: the body's rotation.y is heading + bodyYaw, so local +z is the nose
// and local +x is the seal's own LEFT. A positive yaw turns the nose toward
// its left; a positive pitch lifts the nose.

import { MOTION } from "../../../lib/world/motion.js";
import { PLACE_BY_ID } from "../../../lib/world/places.js";

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Deterministic 0..1 sequence: a capture shows the same blinks every run.
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const REST_SPEED = 0.35; // m/s, below this the seal is standing still
const LOOK_AT_PLACE = 1.8; // s after arriving that it stares at the building
const WAVE_SECONDS = 1.4;
const BLINK_SECONDS = 0.16;
// Idle glances, as [yaw, pitch] away from "looking at the visitor".
const GLANCES = [
  [0.9, 0.05],
  [-0.9, 0.05],
  [0.35, 0.45],
  [-0.5, -0.15],
  [0, 0],
];

export function createDrive() {
  return {
    t: 0,
    speed: 0, // m/s
    gait: 0, // 0 at rest .. 1 at walking top speed
    boost: 0, // 0..1, how far past walking speed (shift)
    stride: 0, // galumph phase in cycles; one hump per cycle
    stepping: 0, // 0..1, how much the body is galumphing (travel or turning on the spot)
    hump: 0, // 0..1, chest lift of the current stride: Seal.jsx fades the contact shadow with it
    turn: 0, // rad/s heading rate, + = turning left
    lean: 0, // rad, roll into the turn: apply as rotation.z of the body
    squash: 0, // bump spring, + = flattened, bounces through - (stretched)
    idle: 0, // s since the seal came to rest, 0 while moving
    bodyYaw: 0, // rad added to heading: at rest the seal turns to face the visitor
    lookYaw: 0, // rad, head relative to body
    lookPitch: 0,
    blink: 0, // 0 open .. 1 shut
    happy: 0, // 1 on arriving at a place, fades over 1.4 s: wiggle, ^^ eyes, open smile
    wave: 0, // 0..1 flipper-wave envelope
    waveSide: 1, // +1 the left flipper (+x), -1 the right
    near: null,
    nearTime: 0,
    // bookkeeping
    heading: null,
    impact: 0,
    squashV: 0,
    blinkAt: 1.2,
    blinks: 0,
    glanceAt: 3,
    glanceEnd: 0,
    glances: 0,
    waveAt: -9,
    waves: 0,
  };
}

// seal: live.seal. near: place id or null. t, dt: seconds.
export function stepDrive(d, seal, near, t, dt) {
  dt = Math.min(dt, 0.1);
  d.t = t;
  const heading = seal.heading;
  if (d.heading === null) d.heading = heading;

  // Travel.
  d.speed = seal.speed;
  const walk = MOTION.maxSpeed;
  d.gait += (clamp(d.speed / walk, 0, 1) - d.gait) * damp(10, dt);
  d.boost += (clamp((d.speed - walk * 1.05) / (walk * (MOTION.boost - 1) * 0.8), 0, 1) - d.boost) * damp(6, dt);
  const rate = clamp(wrap(heading - d.heading) / Math.max(dt, 1e-4), -6, 6);
  d.heading = heading;
  d.turn += (rate - d.turn) * damp(8, dt);
  d.lean = clamp(-d.turn * Math.min(d.speed / 4, 1) * 0.12, -0.35, 0.35);

  // Bump: a spring kicked by each rise of live.seal.impact.
  if (seal.impact > d.impact + 0.02) d.squashV += (0.3 + seal.impact) * 10;
  d.impact = seal.impact;
  d.squashV += (-140 * d.squash - 9 * d.squashV) * dt;
  d.squash = clamp(d.squash + d.squashV * dt, -0.6, 1);

  // Arriving somewhere.
  if (near !== d.near) {
    d.near = near;
    d.nearTime = 0;
    if (near) {
      d.happy = 1;
      d.waveAt = t + LOOK_AT_PLACE + 0.4;
      d.waveSide = 1;
    }
  } else d.nearTime += dt;
  d.happy = Math.max(0, d.happy - dt / 1.4);

  const resting = d.speed < REST_SPEED;
  d.idle = resting ? d.idle + dt : 0;

  // At rest the body turns most of the way round to the visitor (the camera
  // sits toward world +z, which is yaw -heading); the head does the rest.
  // Near a place it first keeps facing the building for LOOK_AT_PLACE.
  const place = near ? PLACE_BY_ID[near] : null;
  const studying = place && d.nearTime < LOOK_AT_PLACE;
  let toVisitor = wrap(-heading);
  // Straight behind is +-PI: keep turning the way it already is, so the head
  // and body never pick opposite sides.
  if (Math.abs(toVisitor) > 2.6) toVisitor = Math.abs(toVisitor) * (d.bodyYaw < -0.05 ? -1 : 1);
  const yawTarget = resting && d.idle > 0.9 && !studying ? toVisitor * 0.8 : 0;
  const yawBefore = d.bodyYaw;
  d.bodyYaw += (yawTarget - d.bodyYaw) * damp(resting ? 2.2 : 9, dt);
  const shuffle = resting ? clamp(Math.abs(d.bodyYaw - yawBefore) / Math.max(dt, 1e-4) / 1.5, 0, 1) : 0;

  // Galumph: phase advances with speed, capped so it never buzzes; turning on
  // the spot shuffles with small humps too.
  d.stepping = Math.max(Math.min(1, d.gait * 2.5), shuffle * 0.6);
  const hz = d.speed < REST_SPEED ? 0 : Math.min(0.8 + d.speed * 0.28, 3) + d.boost * 0.8;
  d.stride = (d.stride + (hz + shuffle * 2.2) * dt) % 1024;
  d.hump = Math.max(0, Math.sin(TAU * d.stride)) * d.stepping;

  // Where the head looks.
  let yaw;
  let pitch;
  if (!resting) {
    yaw = clamp(d.turn * 0.22, -0.5, 0.5); // into the turn, ahead of the body
    pitch = -0.06 * d.gait - 0.1 * d.boost; // head down, streamlined
  } else if (studying) {
    const at = Math.atan2(place.x - seal.x, place.z - seal.z);
    yaw = clamp(wrap(at - heading - d.bodyYaw), -1.3, 1.3);
    pitch = 0.3; // buildings are tall
  } else {
    // Default: look at the visitor, a little up toward the lens.
    yaw = clamp(toVisitor - d.bodyYaw, -1.3, 1.3);
    pitch = 0.3;
    if (d.idle > 1.5 && t >= d.glanceAt) {
      d.glances += 1;
      d.glanceEnd = t + 0.8 + hash(d.glances) * 1.4;
      d.glanceAt = d.glanceEnd + 2.5 + hash(d.glances + 50) * 3.5;
    }
    if (t < d.glanceEnd) {
      const g = GLANCES[d.glances % GLANCES.length];
      if (place && d.glances % 3 === 0) {
        yaw = clamp(wrap(Math.atan2(place.x - seal.x, place.z - seal.z) - heading - d.bodyYaw), -1.3, 1.3);
      } else {
        yaw = clamp(yaw + g[0], -1.3, 1.3);
        pitch += g[1];
      }
    }
  }
  const k = damp(resting ? 7 : 5, dt);
  d.lookYaw += (yaw - d.lookYaw) * k;
  d.lookPitch += (pitch - d.lookPitch) * k;

  // Blink every 2.2-5.4 s, sometimes twice.
  if (t > d.blinkAt + BLINK_SECONDS) {
    d.blinks += 1;
    d.blinkAt = t + (hash(d.blinks) < 0.25 ? 0.12 : 2.2 + hash(d.blinks + 100) * 3.2);
  }
  const b = (t - d.blinkAt) / BLINK_SECONDS;
  d.blink = b >= 0 && b <= 1 ? 1 - Math.abs(b * 2 - 1) : 0;

  // Flipper wave: once after arriving somewhere, and now and then when idle.
  if (resting && d.idle > 4 && t > d.waveAt + WAVE_SECONDS + 5) {
    d.waves += 1;
    d.waveAt = t + 2 + hash(d.waves + 200) * 6;
    d.waveSide = hash(d.waves + 300) < 0.5 ? 1 : -1;
  }
  const w = (t - d.waveAt) / WAVE_SECONDS;
  d.wave = resting && w >= 0 && w <= 1 ? Math.sin(Math.PI * w) : 0;
  return d;
}
