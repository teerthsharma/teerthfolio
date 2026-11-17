// Ground regions of the outer ring: one weight function that the terrain colours, gloss, sparkle and air haze read.

import { DISTRICTS, ISLAND_RADIUS, SPAWN, ZONES, ZONE_ANCHORS } from "./places.js";
import { riseHeight } from "./rise.js";
import { fbm, heightAt } from "./terrain.js";

export const WIND = [0.8, 0.6];

export const ELLIPSES = [ // id, x, z, a (along rot), b, rot (rad), feather
  ["blue", -88, -34, 19, 11.5, 0.6435, 0.28],
  ["bend", -88, -52, 15, 6, 0.08, 0.4],
  ["sast", -73, 66, 23, 12, 0.6435, 0.35],
  ["sast", -72, -16, 13, 5, 0.6435, 0.35],
  ["delta", 2, 92, 17, 8.5, 0, 0.3],
  ["lake", 90, -4, 9.5, 8, 0.3, 0.12],
  ["guano", -62, 85, 9, 7.5, -0.6, 0.45],
];

const REGIONS = ["blue", "bend", "sast", "delta", "lake", "guano"];
const HEADLANDS = [[0.32, 0.15], [1.02, 0.13], [2.2, 0.16], [3.02, 0.12]]; // terrain.js HEADLANDS: angle, half-width
const TAU = Math.PI * 2;
const TRIG = ELLIPSES.map(([, , , , , rot]) => [Math.cos(rot), Math.sin(rot)]);

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const clampTo = (t, lo, hi) => (t < lo ? lo : t > hi ? hi : t);
function smooth(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function angleGap(a, b) {
  const d = a - b;
  return d - Math.round(d / TAU) * TAU;
}

export function regionWeights(x, z, o) {
  o.blue = o.bend = o.sast = o.delta = o.lake = o.lakeCore = o.guano = o.rock = 0;
  const guard = smooth(34, 46, Math.hypot(x - SPAWN.x, z - SPAWN.z));
  if (guard <= 0) return o;

  let wobble;
  for (let i = 0; i < ELLIPSES.length; i++) {
    const [id, cx, cz, a, b, , feather] = ELLIPSES[i];
    const dx = x - cx;
    const dz = z - cz;
    const reach = a + b + feather;
    if (dx > reach || dx < -reach || dz > reach || dz < -reach) continue;
    if (wobble === undefined) wobble = fbm(x / 7, z / 7);
    const [c, s] = TRIG[i];
    const u = c * dx + s * dz;
    const v = c * dz - s * dx;
    const d = Math.hypot(u / a, v / b) + 0.22 * (wobble - 0.5);
    const w = smooth(1, 1 - feather, d);
    if (w > o[id]) o[id] = w;
    if (id === "lake") o.lakeCore = Math.max(o.lakeCore, clamp01(1 - d));
  }

  const r = Math.hypot(x, z);
  if (r > 98 && r < ISLAND_RADIUS) {
    const theta = Math.atan2(z, x);
    let headland = 0;
    for (const [a, w] of HEADLANDS) {
      const d = angleGap(theta, a);
      if (Math.abs(d) < 3 * w) headland += Math.exp(-(d / w) * (d / w));
    }
    const rock = clamp01(headland * smooth(98, 113, r) * (1 - smooth(ISLAND_RADIUS - 2, ISLAND_RADIUS, r)));
    o.rock = rock > 0 ? rock * (1 - smooth(0.2, 0.3, Math.abs(heightAt(x, z)))) : 0;
  }

  if (o.blue + o.bend + o.sast + o.delta + o.lake + o.guano + o.rock <= 0) return o;
  let cover = 0;
  for (const d of DISTRICTS) cover = Math.max(cover, smooth(d.radius + 4, d.radius, Math.hypot(x - d.x, z - d.z)));
  const f = guard * (1 - cover) * (1 - smooth(0.05, 0.3, riseHeight(x, z)));
  o.blue *= f;
  o.bend *= f;
  o.sast *= f;
  o.delta *= f;
  o.lake *= f;
  o.lakeCore *= f;
  o.guano *= f;
  o.rock *= f;
  return o;
}

const scratch = { blue: 0, bend: 0, sast: 0, delta: 0, lake: 0, lakeCore: 0, guano: 0, rock: 0 };
export function regionAt(x, z) {
  regionWeights(x, z, scratch);
  let best = "snow";
  let top = -1;
  for (const id of REGIONS) {
    if (scratch[id] > top) {
      top = scratch[id];
      best = id;
    }
  }
  if (top >= 0.25) return best;
  return riseHeight(x, z) > 0.05 ? "rise" : "snow";
}

export const AIR = {
  snow: ["#a4d0ee", 0],
  blue: ["#cfe8fa", 0.28],
  bend: ["#cfe8fa", 0.30],
  sast: ["#f1f4fb", 0.30],
  delta: ["#dfe8f2", 0.18],
  lake: ["#d9ecf6", 0.20],
  guano: ["#f6e6e2", 0.12],
  rise: ["#fff1c8", 0.08],
};

// aRegion for one vertex as 0..1 floats at out[at..at+3]; w is 1 where any region touches it.
export function regionChannels(o, out, at = 0) {
  const touched = o.blue + o.bend + o.sast + o.delta + o.lake + o.guano + o.rock > 0;
  out[at] = clamp01(0.9 * o.blue + o.lake + 0.35 * o.bend);
  out[at + 1] = clampTo(1 + 0.8 * o.sast - 0.9 * (o.blue + o.lake) - 0.5 * o.delta - 0.6 * o.guano, 0, 2) / 2;
  out[at + 2] = clamp01(o.blue + 0.6 * o.lake + 0.5 * o.delta + 0.3 * o.bend);
  out[at + 3] = touched ? 1 : 0;
  return out;
}

// The zone wash: each zone's weight (0 to 1, in ZONES order) at (x, z), follows its members' footprints, not a coarse circle; returns the total, 0 to 1, pale in the town.
const ZONE_AT = Object.fromEntries(ZONES.map((z, i) => [z.id, i]));
const MEMBERS = [...DISTRICTS.filter((d) => d.zone).map((d) => [ZONE_AT[d.zone], d.x, d.z, d.radius]), ...ZONE_ANCHORS.map(([id, x, z, r]) => [ZONE_AT[id], x, z, r])];
export const WASH = { full: 4, reach: 26, town: [16, 26], townAt: [0, 2] };
export function zoneWeights(x, z, w) {
  w.fill(0);
  const town = smooth(WASH.town[0], WASH.town[1], Math.hypot(x - WASH.townAt[0], z - WASH.townAt[1]));
  if (town <= 0) return 0;
  for (const [i, mx, mz, mr] of MEMBERS) {
    const k = 1 - smooth(WASH.full, WASH.reach, Math.hypot(x - mx, z - mz) - mr);
    if (k > w[i]) w[i] = k;
  }
  let sum = 0;
  for (let i = 0; i < w.length; i++) sum += w[i];
  return Math.min(1, sum) * town;
}
