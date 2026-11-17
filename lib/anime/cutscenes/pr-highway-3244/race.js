// The race per frame as pure functions of the card clock: the live move's maths in the rig frame (guest, rivals, king, seal).
import { Matrix4 } from "three";
import { HIGHWAY } from "../../../world/land.js";
import { ROAD_Y } from "../../../world/highwayCars.js";
import { NECK, SEAT, poseArm } from "./live/iskandar.js";
import { PASS, START, T, heroDist, heroSpeed, heroZ, rivalX, rivalZ, sm } from "./live/path.js";
import { DOCK, TURN, W, rotY, smooth, warp } from "./clock.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const spring = (t, t0, a, w = 20, z = 5) => (t > t0 ? a * Math.exp(-z * (t - t0)) * Math.sin(w * (t - t0)) : 0);

export const BETA = 0.36;
export const CB = Math.cos(BETA);
export const SB = Math.sin(BETA);
export const P0 = [1.0, -1.9];
export const CAR_S = 1.55;
export { SEAT };
const STOP_AHEAD = 2.5;
const ARRIVE = 6.25;
const RING = HIGHWAY.roundabout;
const ringRig = rotY(-TURN, [RING.x - DOCK[0], 0, RING.z - DOCK[2]]);
export const RING_RIG = { x: ringRig[0], y: ringRig[1], z: ringRig[2] };

function raceAt(t) {
  const vz = (heroZ(t + 0.03) - heroZ(t - 0.03)) / 0.06;
  const v = heroSpeed(t);
  return { lx: START[0] - heroDist(t), lz: heroZ(t), d: v > 1 ? clamp(2.8 * Math.atan2(vz, v + 4), -0.85, 0.85) : 0 };
}

export function heroState(tc, out = {}) {
  const t = warp(tc);
  const d = heroDist(t);
  const ax = START[0] - 0.985 * d;
  const az = START[1] + 0.55 * (heroZ(t) - START[1]);
  const speedK = clamp(heroSpeed(t) / 44) * (1 - sm(T.cover[0], T.cover[1], t));
  const R = raceAt(t);
  const back = t >= T.swap;
  const rattle = back ? 0.004 : ramp(t, T.go - 1.0, T.go) * (1 - ramp(t, T.go, T.go + 0.25)) * 0.012 + 0.006 * speedK;
  let x, y, z, yaw, pitch = 0, roll = 0, wheelDist = d;
  if (!back) {
    x = (R.lx - ax) * CB + (R.lz - az) * SB + P0[0];
    y = 0;
    z = -(R.lx - ax) * SB + (R.lz - az) * CB + P0[1];
    yaw = Math.PI + BETA + R.d;
    const a = (heroSpeed(t + 0.03) - heroSpeed(t - 0.03)) / 0.06;
    const zz = (heroZ(t + 0.06) - 2 * heroZ(t) + heroZ(t - 0.06)) / 0.0036;
    pitch = clamp(0.0035 * a, -0.1, 0.12);
    roll = clamp(-0.05 * zz, -0.16, 0.16);
  } else {
    const rr = clamp(Math.hypot(DOCK[0] - RING.x, DOCK[2] - RING.z), RING.radius - RING.width / 2 + 0.3, RING.radius + RING.width / 2 - 0.3);
    const phi = Math.atan2(DOCK[2] - RING.z, DOCK[0] - RING.x);
    const q = ramp(t, ARRIVE, T.stop);
    const arrive = 19 * Math.pow(1 - q, 2.4);
    const away = 10 * Math.pow(Math.max(0, t - T.leave), 2);
    const th = phi + (STOP_AHEAD - arrive + away) / rr;
    const wx = RING.x + rr * Math.cos(th) - DOCK[0];
    const wz = RING.z + rr * Math.sin(th) - DOCK[2];
    const ct = Math.cos(TURN);
    const st = Math.sin(TURN);
    x = wx * ct - wz * st;
    z = wx * st + wz * ct;
    y = ROAD_Y;
    const slide = 0.3 * Math.sin(Math.PI * ramp(t, 6.95, T.stop)) * (t < T.stop ? 1 : 0);
    yaw = Math.atan2(-Math.cos(th), -Math.sin(th)) - TURN + slide;
    wheelDist = d + 19 - arrive + away;
    pitch = -0.1 * smooth(ARRIVE + 0.2, ARRIVE + 0.6, t) * (1 - smooth(T.stop - 0.4, T.stop, t)) + 0.1 * ramp(t, T.leave, T.leave + 0.3);
    roll = -0.1 * Math.sin(Math.PI * ramp(t, 6.95, T.stop)) * (t < T.stop ? 1 : 0);
  }
  const bob = spring(t, T.go - 0.04, -0.05, 19, 5) + spring(t, 4.4, 0.035) + spring(t, 4.85, 0.035) + spring(t, 5.45, 0.03) + spring(t, T.cross, -0.04) + spring(t, T.stop, -0.05, 16, 4.5) + rattle * Math.sin(t * 83);
  const bodyPitch = pitch + 2 * spring(t, T.go - 0.04, -0.05, 19, 5) + 0.6 * spring(t, T.stop, -0.08, 16, 4.5);
  const dx = ax - START[0];
  return Object.assign(out, {
    x, y, z, yaw, roll, pitch: bodyPitch, bob, wheelDist, drift: R.d, lx: R.lx, lz: R.lz, speedK, back, rattle,
    trackX: P0[0] - (ax * CB + az * SB), trackY: speedK > 0.1 ? (Math.floor(t * 30) % 2 ? 1 : -1) * 0.012 * speedK : 0, trackZ: P0[1] - (-ax * SB + az * CB),
    mesaX: -0.1 * dx * CB, mesaZ: 0.1 * dx * SB, anchorX: ax, anchorZ: az,
  });
}

export function rivalState(i, tc, out = {}) {
  const t = warp(tc);
  const x = rivalX(i, t);
  const lane = rivalZ(i, t);
  const wake = PASS[i] > 0 ? Math.exp(-(((t - PASS[i]) / 0.3) ** 2)) : 0;
  const sgn = lane >= heroZ(t) ? 1 : -1;
  const zz = lane + sgn * 0.45 * wake;
  const fl = PASS[i] > 0 ? Math.max(0, t - PASS[i]) : 0;
  const fs = 1 - Math.exp(-fl * 1.6);
  const air = fl > 0 ? 3.2 * Math.abs(Math.sin(fl * 4.2)) * Math.exp(-fl * 1.1) : 0;
  const spin = fl > 0 ? 7 * fs : 0;
  return Object.assign(out, {
    x: x + 4 * fs,
    y: air + 0.015 * Math.sin(t * 9 + i) * (t < T.go + 0.3 ? 1 : 0.3),
    z: zz + sgn * 9 * fs,
    rx: 0.02 * Math.sin(t * 5 + i * 2) + 0.05 * wake * sgn + spin * 0.6 * sgn,
    ry: Math.PI + sgn * 0.5 * wake + 0.04 * Math.sin(t * 2 + i) + spin,
    rz: spin * 0.35 * sgn,
    shadowX: x + 0.5,
    shadowZ: zz - 0.4,
  });
}

export function sealRig(tc, out = [0, 0, 0]) {
  const t = warp(tc);
  const o = 1 - smooth(25.0, 25.4, tc);
  let x = 0, y = 0, z = 0;
  if (t >= T.hop[0]) {
    const h = heroState(tc);
    const c = Math.cos(h.yaw);
    const sn = Math.sin(h.yaw);
    const roof = [h.x + (SEAT[0] * c + SEAT[2] * sn) * CAR_S, h.y + SEAT[1] * CAR_S + h.bob, h.z + (-SEAT[0] * sn + SEAT[2] * c) * CAR_S];
    const kOn = smooth(T.hop[0], T.hop[1], t);
    y = 1.1 * Math.sin(Math.PI * ramp(t, T.hop[0], T.hop[1]));
    x = roof[0] * kOn;
    y += roof[1] * kOn;
    z = roof[2] * kOn;
  }
  out[0] = x * o;
  out[1] = y * o + 0.9 * Math.sin(Math.PI * (1 - o));
  out[2] = z * o;
  return out;
}

export function seatFacing(tc) {
  const t = warp(tc);
  const o = 1 - smooth(25.0, 25.4, tc);
  return ramp(t, T.hop[1], T.hop[1] + 0.2) * o > 0.5 ? heroState(tc).yaw + Math.PI / 2 : null;
}

function bodyPoint(tc, p, out) {
  const h = heroState(tc);
  const q = rotY(h.yaw, [p[0] * CAR_S, (p[1] + h.bob + 0.02) * CAR_S, p[2] * CAR_S]);
  out[0] = h.x + q[0];
  out[1] = h.y + q[1];
  out[2] = h.z + q[2];
  return out;
}

export function kingHead(tc, out = [0, 0, 0]) {
  return bodyPoint(tc, NECK, out);
}

export function swordTip(tc, out = [0, 0, 0]) {
  const t = warp(tc);
  const lift = smooth(T.cry - 0.35, T.cry - 0.05, t) * (1 - smooth(T.cover[0] - 0.4, T.cover[0], t)) * (t >= T.swap ? 0 : 1);
  const tip = poseArm(new Matrix4(), lift);
  return bodyPoint(tc, [tip.x, tip.y, tip.z], out);
}

export function sealMoves() {
  const yawAt = (tc) => { const f = seatFacing(tc); return f === null ? TURN : TURN + f; };
  const moves = [];
  for (let k = 0; k < 286; k++) {
    const a = 1.6 + k / 12;
    const b = a + 1 / 12;
    moves.push({ t: [a, b], to: W(sealRig(b)), yaw: yawAt(b) });
  }
  moves.push({ t: [1.6, 2.05], to: W(sealRig(1.85)), yaw: TURN });
  return moves;
}
