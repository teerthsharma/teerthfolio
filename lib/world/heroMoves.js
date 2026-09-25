// THE HERO MOVES: in a place's first-arrival showcase (moments.js ARRIVAL)
// the seal performs an anime-homage move round the building (the owner:
// "the cutscene should make the seal do an anime / hero move around the
// building; red is Hulk, NVIDIA is Gojo, but think"). Four moves, in shape
// and colour only, never a copied logo or character:
//   smash   a Hulk-style leap and slam with a shockwave
//   purple  a Gojo-style hollow purple: a red orb and a blue orb collide
//           into a purple sphere that fires through toward the building
//   beam    a charged beam fired at the building
//   orbit   a ninja sprint all the way round the building
// Pure: heroPose() is what the renderer and the effects both read.

import { LAND_COLLIDERS } from "./land.js";

// What a move aims at: the landform's bulk nearest the place (the dam wall,
// a peak, the cliff) when one lies within 16 m, else the place itself.
const AIMS = new Map();
export function aimFor(place) {
  if (!AIMS.has(place.id)) {
    let best = null;
    let bd = 16;
    for (const c of LAND_COLLIDERS) {
      const d = Math.hypot(c.x - place.x, c.z - place.z);
      if (c.land !== "mapboard" && d < bd) {
        bd = d;
        best = c;
      }
    }
    AIMS.set(place.id, best ? { x: best.x, z: best.z, r: best.radius } : { x: place.x, z: place.z, r: place.radius });
  }
  return AIMS.get(place.id);
}

const BY_ID = {
  "pr-nemo-relay-481": "purple", // the NVIDIA moat
  "pr-topograph-432": "purple",
  "pr-triton-kernels-22": "purple",
  "pr-mujoco-3396": "purple",
  "pr-mujoco-warp-1541": "smash",
  "pr-mujoco-3450": "beam",
  "pr-highway-3244": "smash",
  "pr-tensorflow-124410": "beam",
  "pr-xnnpack-10801": "beam",
  "pr-openxla-46539": "orbit",
  "pr-pyrefly-4180": "orbit",
  home: "orbit",
};

function hue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function heroMoveFor(place) {
  if (BY_ID[place.id]) return BY_ID[place.id];
  const h = hue(place.radiation ?? place.color ?? "#ffffff");
  if (h < 20 || h >= 330) return "smash"; // reds
  if (h < 60) return "beam"; // oranges and golds
  if (h < 200) return "orbit"; // greens and teals
  return "purple"; // blues and purples
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Where the seal is drawn at showcase progress u (0..1), given its real
// (physics) position: writes out.{x, z, y, yaw, k}; k is how far the move
// has taken over (0 = drawn where it really is). yaw is null to keep its own.
export function heroPose(move, u, place, sx, sz, out) {
  out.x = sx;
  out.z = sz;
  out.y = 0;
  out.yaw = null;
  out.k = 0;
  if (u < 0 || u >= 1) return out;
  const toPlace = Math.atan2(place.x - sx, place.z - sz);
  if (move === "orbit") {
    const k = smooth(0.1, 0.2, u) * (1 - smooth(0.8, 0.9, u));
    const a0 = Math.atan2(sx - place.x, sz - place.z);
    const a = a0 + Math.PI * 2 * smooth(0.15, 0.85, u);
    const r = place.radius + 2.6;
    const ox = place.x + Math.sin(a) * r;
    const oz = place.z + Math.cos(a) * r;
    out.x = sx + (ox - sx) * k;
    out.z = sz + (oz - sz) * k;
    out.y = 0.45 * Math.abs(Math.sin(u * Math.PI * 9)) * k;
    out.yaw = k > 0.01 ? a + Math.PI / 2 : null;
    out.k = k;
  } else if (move === "smash") {
    const s = Math.min(1, Math.max(0, (u - 0.28) / 0.32)); // the leap, 0.28..0.6
    const lunge = 1.6 * smooth(0.28, 0.6, u) * (1 - smooth(0.8, 0.95, u));
    out.x = sx + Math.sin(toPlace) * lunge;
    out.z = sz + Math.cos(toPlace) * lunge;
    out.y = s > 0 && s < 1 ? 5 * Math.sin(Math.PI * s) : 0;
    out.yaw = 0; // it faces the viewer: the follow camera looks north, so the seal faces south (+z)
    out.k = u > 0.2 && u < 0.9 ? 1 : 0;
  } else if (move === "purple") {
    const k = smooth(0.15, 0.3, u) * (1 - smooth(0.85, 0.97, u));
    out.y = 0.9 * k; // it rises a little and faces the viewer for the shot
    out.yaw = 0;
    out.k = k;
  } else if (move === "beam") {
    out.yaw = 0; // it fires at the viewer (the owner: "the seal should shoot to the camera")
    out.k = u > 0.2 && u < 0.9 ? 1 : 0;
    const recoil = 0.5 * smooth(0.45, 0.5, u) * (1 - smooth(0.5, 0.8, u));
    out.z = sz - recoil;
  }
  return out;
}
