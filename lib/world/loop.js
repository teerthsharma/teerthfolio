// THE LOOP: the blue loop-the-loop ribbon by the spill (drawn by
// components/world/sea/build.js buildLoopRibbon, ridden by stepSeal through
// stepLoop below). Plain numbers, no three.js, so scripts/check-world.mjs
// runs the real ride.
//
// Meltwater peels off the surface, runs uphill into the air, loops over
// itself and plunges back in downstream. A seal swimming east into the
// ribbon's lead-in lane is caught and carried round on rails, momentum
// doing the work: a small boost at the bottom, then it climbs, goes over the
// top inverted, and is thrown out the far side onto the water, still moving.
//
// THE HIDDEN CHALLENGE (never hinted in the UI): a loop is CLEAN when the
// seal went in inside a narrow speed window, held the line to within CLEAN.off
// of the ribbon's centre the whole way round, and left it straight. Three
// clean loops in a row, each entered within CLEAN.gap seconds of the last
// exit, is a win (seal.wins). A messy loop resets the streak.

import { WATER_Y } from "./terrain.js";

export const LOOP = {
  x: 24.2, // where the ribbon peels off the surface (it rejoins 2 PI c downstream)
  z: -42,
  radius: 3.3, // the loop's height is twice this
  c: 0.72, // metres of advance per radian: the loop's lean
  shift: 3.8, // lateral shift from entry (north) to exit (south), so it never crosses itself
  width: 2.5,
  thick: 0.34,
  color: "#1ec8f0", // Triton's Cherenkov blue: the water's radiation, carried down from the glacier
  lead: 2.2, // m of ribbon lying on the surface before it lifts and after it lands
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The loop's centre line at parameter u (0..1 over lead-in, loop, lead-out):
// a trochoid, x = c theta + R sin theta, y = R (1 - cos theta), so it lifts
// off the surface and lands on it tangentially. `out` needs .set(x, y, z).
export function loopPoint(u, out) {
  const { x, z, radius: R, c, shift, lead } = LOOP;
  const loopLen = 2 * Math.PI;
  const total = lead / (c + R) + loopLen + lead / (c + R); // theta-equivalent span
  let th = u * total - lead / (c + R);
  let y = 0;
  let px;
  if (th < 0) {
    px = x + th * (c + R);
  } else if (th > loopLen) {
    px = x + c * loopLen + (th - loopLen) * (c + R);
  } else {
    px = x + c * th + R * Math.sin(th);
    y = R * (1 - Math.cos(th));
  }
  th = Math.min(loopLen, Math.max(0, th));
  out.set(px, WATER_Y + 0.04 + y, z - shift / 2 + shift * smooth(0.35, loopLen - 0.35, th));
  return out;
}

export const RIDE = {
  gravity: 9.8, // m/s^2: the climb costs speed, the drop gives it back
  minIn: 12, // m/s: a slower seal is carried in at this speed (momentum, never stuck)
  maxIn: 24, // m/s
  boost: 2.5, // m/s added at the bottom, where the ribbon lifts off
  floor: 6.5, // m/s: the slowest the ride ever goes, over the top
  catchHalf: 1.25, // m either side of the entry lane's centre line that the ribbon catches
  held: 1.15, // m: how far off the ribbon's centre the rider can drift (the ribbon is 2.5 m wide)
  steer: 3, // m/s of sideways speed per unit of input across the ribbon
  hover: 0.2, // m the seal rides above the ribbon's inner face
};

// A clean loop, every term inside its window (the owner: "tough").
export const CLEAN = {
  vMin: 13.5, // m/s at the entry: not too slow
  vMax: 21, // m/s: not boosting wildly
  off: 0.4, // m: the largest drift off the ribbon's centre line, anywhere on the ride
  angle: 0.105, // rad (6 degrees): the exit heading off due east
  gap: 8, // s: re-enter within this of the previous exit to keep the streak
  need: 3, // clean loops in a row that win
};

// THE WIN'S CUTSCENE HOOK. Controller.jsx watches seal.wins; on the first win
// of a session (sessionStorage "seal:loopwin"; never on ?play, ?spawn or
// ?hud=off stills, never during or under an arrival or an open panel) it
// plays like a place arrival: live.loopWin = { at: clock }, live.arrival
// {id, start} and setUi({ cutscene: AWAKENING.id }). Input is held for `hold`
// seconds, the HUD Skip chip or any fresh key skips (never a tap), and the
// moment ends at `duration`. The scene for it (components/world/LoopAwakening.jsx)
// times itself from live.arrival.start; today it is a stub.
export const AWAKENING = { id: "loop-awakening", hold: 5.0, duration: 5.4 };

export const ENTRY = { x0: LOOP.x - LOOP.lead, x1: LOOP.x + 0.3, z: LOOP.z - LOOP.shift / 2 };

// The ride's table: arc length s and the centre line (x, y, z) and unwrapped
// pitch (0 at the entry, PI over the top, 2 PI at the exit) at 480 samples.
const N = 480;
const TS = new Float64Array(N + 1);
const TX = new Float64Array(N + 1);
const TY = new Float64Array(N + 1);
const TZ = new Float64Array(N + 1);
const TP = new Float64Array(N + 1);
{
  const p = {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    },
  };
  for (let i = 0; i <= N; i++) {
    loopPoint(i / N, p);
    TX[i] = p.x;
    TY[i] = p.y;
    TZ[i] = p.z;
    TS[i] = i ? TS[i - 1] + Math.hypot(TX[i] - TX[i - 1], TY[i] - TY[i - 1], TZ[i] - TZ[i - 1]) : 0;
  }
  let prev = 0;
  for (let i = 0; i <= N; i++) {
    const a = Math.atan2(TY[Math.min(N, i + 1)] - TY[Math.max(0, i - 1)], TX[Math.min(N, i + 1)] - TX[Math.max(0, i - 1)]);
    let d = a - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    prev += d;
    TP[i] = prev;
  }
}
export const RIDE_LENGTH = TS[N];
const BOTTOM = WATER_Y + 0.04; // the ribbon's lowest point
const LEAD_S = LOOP.lead; // arc length at which the ribbon lifts off: the bottom

const WORK = { x: 0, y: 0, z: 0, pitch: 0 };
function sample(s) {
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (TS[mid] <= s) lo = mid;
    else hi = mid;
  }
  const f = Math.min(1, Math.max(0, (s - TS[lo]) / (TS[hi] - TS[lo] || 1)));
  WORK.x = TX[lo] + (TX[hi] - TX[lo]) * f;
  WORK.y = TY[lo] + (TY[hi] - TY[lo]) * f;
  WORK.z = TZ[lo] + (TZ[hi] - TZ[lo]) * f;
  WORK.pitch = TP[lo] + (TP[hi] - TP[lo]) * f;
  return WORK;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// The ride's fields on a seal (motion.js createSeal spreads these in).
export const loopFields = () => ({
  ride: 0, // 1 while on the ribbon
  rideS: 0,
  rideV: 0,
  rideV0: 0,
  rideOff: 0,
  rideVoff: 0,
  rideY: 0, // world y of the seal's origin while riding (Seal.jsx)
  ridePitch: 0, // 0 at the entry, PI over the top, 2 PI at the exit (Seal.jsx rolls the body round it)
  rideMaxOff: 0,
  rideEntryV: 0,
  rideEntryAt: 0,
  rideBoosted: 0,
  loops: 0, // loops completed
  loopStreak: 0, // clean loops in a row so far (the hidden cue reads it)
  loopClean: 0, // the last loop was clean
  loopExitAt: -1e9, // seal.clock at the last exit
  wins: 0, // wins so far: Controller.jsx raises the cutscene when it changes
  clock: 0, // seconds this seal has been stepped
});

// One substep of the ride. Returns true while the seal is on the ribbon (the
// caller then skips the free-swimming step), catching a seal first if it has
// just swum into the lane. `input` is { x, z } or null.
export function stepLoop(seal, input, dt) {
  if (!seal.ride) {
    if (seal.water > 0 && seal.vx > 4 && seal.x >= ENTRY.x0 && seal.x <= ENTRY.x1 && Math.abs(seal.z - ENTRY.z) <= RIDE.catchHalf) {
      seal.ride = 1;
      seal.rideS = seal.x - ENTRY.x0;
      seal.rideEntryV = seal.vx;
      seal.rideEntryAt = seal.clock;
      seal.rideV = clamp(Math.hypot(seal.vx, seal.vz), RIDE.minIn, RIDE.maxIn);
      seal.rideOff = clamp(seal.z - ENTRY.z, -RIDE.held, RIDE.held);
      seal.rideVoff = clamp(seal.vz * 0.5, -RIDE.steer, RIDE.steer);
      seal.rideMaxOff = Math.abs(seal.rideOff);
      seal.rideBoosted = 0;
      seal.impact = Math.max(seal.impact, 0.4); // the camera takes the catch
    } else {
      return false;
    }
  }

  seal.impact = Math.max(0, seal.impact - dt * 3);

  // sideways: input steers across the ribbon, hands off holds the line
  const side = input ? input.z || 0 : 0;
  if (side) seal.rideVoff += (clamp(side, -1, 1) * RIDE.steer - seal.rideVoff) * (1 - Math.exp(-5 * dt));
  else seal.rideVoff *= Math.exp(-3 * dt);
  seal.rideOff += seal.rideVoff * dt;
  if (Math.abs(seal.rideOff) > RIDE.held) {
    seal.rideOff = Math.sign(seal.rideOff) * RIDE.held;
    seal.rideVoff = 0;
  }
  seal.rideMaxOff = Math.max(seal.rideMaxOff, Math.abs(seal.rideOff));

  // along: the boost at the bottom, then energy: the climb costs speed
  if (!seal.rideBoosted && seal.rideS >= LEAD_S) {
    seal.rideBoosted = 1;
    seal.rideV += RIDE.boost;
    seal.rideV0 = seal.rideV;
  }
  const here = sample(seal.rideS);
  if (seal.rideBoosted) {
    seal.rideV = Math.sqrt(Math.max(RIDE.floor * RIDE.floor, seal.rideV0 * seal.rideV0 - 2 * RIDE.gravity * (here.y - BOTTOM)));
  }
  seal.rideS += seal.rideV * dt;

  if (seal.rideS >= RIDE_LENGTH) {
    // thrown out the far side, moving, level, onto the water
    const end = sample(RIDE_LENGTH);
    seal.x = end.x;
    seal.z = end.z + seal.rideOff;
    seal.vx = seal.rideV;
    seal.vz = seal.rideVoff;
    seal.heading = Math.atan2(seal.vx, seal.vz);
    seal.speed = Math.hypot(seal.vx, seal.vz);
    seal.ride = 0;
    seal.rideY = 0;
    seal.ridePitch = 0;
    seal.impact = Math.max(seal.impact, 0.5);
    seal.loops += 1;
    const clean =
      seal.rideEntryV >= CLEAN.vMin &&
      seal.rideEntryV <= CLEAN.vMax &&
      seal.rideMaxOff <= CLEAN.off &&
      Math.abs(Math.atan2(seal.vz, seal.vx)) <= CLEAN.angle;
    seal.loopClean = clean ? 1 : 0;
    if (!clean) {
      seal.loopStreak = 0;
    } else {
      // the streak lives only if this entry came soon after the last exit
      seal.loopStreak = seal.loopStreak > 0 && seal.rideEntryAt - seal.loopExitAt <= CLEAN.gap ? seal.loopStreak + 1 : 1;
      if (seal.loopStreak >= CLEAN.need) {
        seal.wins += 1;
        seal.loopStreak = 0;
      }
    }
    seal.loopExitAt = seal.clock;
    return false;
  }

  // on the ribbon: its inner face is the surface, the seal a hand above it
  const lift = LOOP.thick / 2 + RIDE.hover;
  seal.x = here.x - Math.sin(here.pitch) * lift;
  seal.z = here.z + seal.rideOff;
  seal.rideY = here.y + Math.cos(here.pitch) * lift;
  seal.ridePitch = here.pitch;
  seal.vx = seal.rideV;
  seal.vz = seal.rideVoff;
  seal.heading = Math.atan2(seal.vx, seal.vz);
  seal.speed = seal.rideV;
  seal.water = 0;
  seal.throttle = 0;
  seal.skid = 0;
  return true;
}
