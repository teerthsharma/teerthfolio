// THE AWAKENING: the secret scene for three clean loops in a row
// (lib/world/loop.js AWAKENING, raised by Controller.jsx). The pup stops at
// the loop's exit, the world hushes, and a black-and-violet torrent of power
// erupts round it: magic circles wheel, the ground and the sky crack, debris
// lifts. Then it flies, high over the island with the aura trailing like a
// comet, says the line in a comic bubble, and the credit card for the whole
// body of work lands before it floats back down. Shape, colour and pose only.
//
// One clock: seconds since live.arrival.start. Pure, so scripts/check-world.mjs
// runs it; the 3D half is components/world/LoopAwakening.jsx, the page layer
// components/world/ui/AwakeningLayer.jsx, the pose seal/variants/D.jsx and
// Seal.jsx, the camera CameraRig.jsx.

import showcase from "../../data/showcase.json" with { type: "json" };
import { AWAKENING } from "./loop.js";

export const AWAKE = {
  id: AWAKENING.id,
  duration: AWAKENING.duration,
  settle: 0.9, // the camera is on the calm close-up
  impact: 1.5, // the first impact frame: the eruption starts on it
  erupt: [1.5, 2.3], // the aura's swell
  circles: [2.6, 2.85, 3.1, 3.35], // the magic circles pop in, one a beat
  impactB: 4.4, // the peak: the second (inverted) impact frame
  dip: [4.45, 4.85], // the crouch before take-off
  rise: [4.85, 7.0],
  line: [7.3, 10.1],
  card: [10.1, 12.5],
  descend: [11.4, 13.0],
  alt: 60, // m above the water at the top of the flight: the island is small below
  fov: 64, // degrees: the flight's wide lens takes in the pup, the dark sky and the island below
  frame: 1 / 6, // s an impact frame holds: two drawings on twos
};

export const LINE = {
  text: "Throughout heaven and earth, I alone am the honoured one.",
  bold: ["heaven and earth", "alone", "honoured one"],
};
export const SFX = "DOOOM"; // the one hand-lettered sound, in the loop's colour

let rm = null; // read once, like CameraRig
const reduced = () => (rm ??= typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
const hudOff = () => typeof document !== "undefined" && document.documentElement.dataset.hud === "off";

// "full": the scene plays; "still": reduced motion, the bubble and the card
// stand still over the plain world; null: not this scene (or ?hud=off).
export function awakeMode(id) {
  if (id !== AWAKENING.id || hudOff()) return null;
  return reduced() ? "still" : "full";
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ui.beat: 0 off, 1 calm, 2 impact, 3 eruption (the lettering), 4 the
// circles, 5 the peak's impact, 6 the crouch, 7 the take-off's impact, 8 the
// rise, 9 the line, 10 the card, 11 back.
export function awakeBeat(t) {
  const A = AWAKE;
  if (t < 0 || t >= A.duration) return 0;
  if (t < A.impact) return 1;
  if (t < A.impact + A.frame) return 2;
  if (t < A.circles[0]) return 3;
  if (t < A.impactB) return 4;
  if (t < A.impactB + A.frame) return 5;
  if (t < A.rise[0]) return 6;
  if (t < A.rise[0] + A.frame) return 7;
  if (t < A.line[0]) return 8;
  if (t < A.card[0]) return 9;
  if (t < A.card[1]) return 10;
  return 11;
}

// The aura's strength (0..1, a surge past 1 on the peak), the cracks' reach
// and the sky's darkness, each out again on the return.
export const auraAt = (t) => smooth(AWAKE.erupt[0], AWAKE.erupt[1], t) * (1 - smooth(11.4, 12.8, t)) + 0.4 * Math.exp(-((t - AWAKE.impactB) ** 2) / 0.02);
export const crackAt = (t) => smooth(AWAKE.impact, 3.2, t) * (1 - smooth(12.0, 13.2, t));
export const skyAt = (t) => smooth(1.0, AWAKE.impact, t) * (1 - smooth(12.2, 13.4, t));
// The eruption plays on a stage of its own: from the first impact frame to
// the take-off's the island is hidden and the pup floats over a cracked dark
// floor under the fractured sky; it flies out over the real island.
export const onStage = (t) => t >= AWAKE.impact && t < AWAKE.rise[0];
// The lens: the flight opens it wide, the descent closes it again.
export const awakeFov = (t, base) => base + (AWAKE.fov - base) * smooth(5.6, 7.2, t) * (1 - smooth(AWAKE.descend[0], 12.6, t));

// A magic circle's pop-in on twos (scale) and its fade; the ground circle
// (0) stays behind as the launch pad; all of them are gone by the flight.
const POP = [0.35, 1.18, 0.94, 1];
export function circleAt(t, i) {
  const f = Math.floor((t - AWAKE.circles[i]) * 12);
  if (f < 0) return 0;
  const out = 1 - smooth(11.2, 12.2, t);
  // the pad stays on the ground; the stack rides the take-off, then lets go
  const pad = i === 0 ? 1 - smooth(5.6, 6.6, t) : 1 - smooth(5.8, 6.5, t);
  return (POP[f] ?? 1) * out * pad;
}

// How high the pup is drawn above where it floats (m): a hover in the
// eruption, a crouch, an explosive take-off that eases into the hover up
// high, a slow bob there, and the float back down.
export function liftAt(t) {
  const A = AWAKE;
  const hover = 0.55 * smooth(A.impact - 0.05, A.impact + 0.4, t);
  const dip = -0.3 * smooth(A.dip[0], A.dip[0] + 0.3, t) * (1 - smooth(A.dip[1] - 0.1, A.dip[1] + 0.05, t));
  const u = clamp01((t - A.rise[0]) / (A.rise[1] - A.rise[0]));
  const rise = A.alt * (1 - (1 - u) ** 3);
  const bob = 0.35 * Math.sin(t * 1.7) * smooth(6.5, 7.5, t);
  return (hover + dip + rise + bob) * (1 - smooth(A.descend[0], A.descend[1], t));
}

// The pose's two amounts (0..1): `power`, the flippers flung out as the aura
// erupts; `fly`, swept back while it flies.
export const powerAt = (t) => smooth(AWAKE.impact - 0.1, AWAKE.impact + 0.15, t) * (1 - smooth(12.6, 13.4, t));
export const flyAt = (t) => smooth(AWAKE.rise[0], AWAKE.rise[0] + 0.4, t) * (1 - smooth(AWAKE.descend[1] - 0.4, AWAKE.descend[1] + 0.2, t));

// The island's middle: the flight looks across the pup at it.
const ISLAND = [0, 0, -10];
const AZ0 = 0.3; // the calm close-up stands a little east of the pup's front

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// The flight's azimuth (from the pup to the camera): the far side of the pup
// from the island's middle, so the island lies below, beyond it.
const flyAz = (x, z) => Math.atan2(x - ISLAND[0], z - ISLAND[2]);

// The camera for the scene, given where the pup floats (x, y the water or
// snow under it, z) and the screen's aspect: writes eye and look and returns
// the weight it takes over the follow camera with (0..1).
export function awakeView(t, x, y, z, aspect, eye, look) {
  const tall = aspect < 1 ? 1.35 : 1;
  const lift = liftAt(t);
  // the ground shot: a calm close-up, pulling back and down into a low
  // heroic angle as the aura and the circles build; at the take-off it
  // rides up after the pup, the look first, the lens a beat behind
  const a = smooth(AWAKE.impact, AWAKE.dip[0], t);
  const az = AZ0 + 0.35 * a;
  const d = (6.6 + 4.6 * a) * tall;
  const ride = lift * smooth(AWAKE.rise[0] + 0.1, AWAKE.rise[0] + 0.7, t);
  const gx = x + Math.sin(az) * d;
  const gy = y + 1.3 - 0.95 * a + ride;
  const gz = z + Math.cos(az) * d;
  const lgy = y + 0.8 + 1.5 * a + lift * smooth(AWAKE.rise[0], AWAKE.rise[0] + 0.35, t);
  // the flight shot: just above and beyond the pup, looking down past it at
  // the island, the dark sky across the top of the wide lens
  const fz = flyAz(x, z) + 0.04 * (t - AWAKE.rise[1]);
  const qy = y + lift;
  const fx = x + Math.sin(fz) * 5.2 * tall;
  const fy = qy + 0.7;
  const fzz = z + Math.cos(fz) * 5.2 * tall;
  const pitch = 0.3; // rad down
  const flx = fx - Math.sin(fz) * Math.cos(pitch) * 10;
  const fly = fy - Math.sin(pitch) * 10;
  const flz = fzz - Math.cos(fz) * Math.cos(pitch) * 10;
  // then it swings round onto the flight shot
  const e = smooth(5.6, 7.2, t);
  eye.set(gx + (fx - gx) * e, gy + (fy - gy) * e, gz + (fzz - gz) * e);
  look.set(x + (flx - x) * e, lgy + (fly - lgy) * e, z + (flz - z) * e);
  return smooth(0, AWAKE.settle, t) * (1 - smooth(11.6, 13.4, t));
}

// Where the pup faces (yaw about +y, 0 = +z) and how firmly the scene holds
// it there (0..1): three-quarters to the lens all the way.
export function awakeYaw(t, x, z) {
  const a = smooth(AWAKE.impact, AWAKE.dip[0], t);
  const e = smooth(5.6, 7.2, t);
  const ground = AZ0 + 0.35 * a - 0.45;
  const fly = flyAz(x, z) - 0.45;
  return { yaw: ground + wrap(fly - ground) * e, k: smooth(0, 0.6, t) * (1 - smooth(12.6, 13.4, t)) };
}

// THE CREDIT: the whole body of work, counted from data/showcase.json and
// three headline results quoted from it verbatim.
const PICKS = [
  ["pr-mujoco-3396", "1,281.6x less."],
  ["pr-highway-3244", "894,081,141 comparisons to 13,643,737 at one million keys."],
  ["pr-mujoco-3450", "15,361x fewer probes at V=40,962."],
];
export function awakeCredit() {
  const up = showcase.upstream;
  const results = PICKS.map(([id, quote]) => {
    const u = up.find((p) => p.id === id);
    if (!u || !u.result.includes(quote)) throw new Error(`awakening credit: ${id} no longer says "${quote}"`);
    return { id, repo: `${u.repo} #${u.pr}`, quote };
  });
  return {
    upstream: up.length,
    merged: up.filter((p) => p.verb === "merged into").length,
    orgs: new Set(up.map((p) => p.org)).size,
    lab: showcase.lab.length,
    results,
  };
}
