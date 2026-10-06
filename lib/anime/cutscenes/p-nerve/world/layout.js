// p-nerve WORLD: layout constants and the cue timeline. World frame: the seal stands at the origin facing +z, deck top y = 0.
// The camera sits in front (+z) and looks back over the seal at the parapet (z -2.55), the bell tower, the city and the sky.
// Times are the bible's SCENE clock (timeline.js KNOTS); a beat in scene.beats with the same name overrides them (cue names below).
//   "toll"   x3  bell strikes          (7.0, 8.1, 9.2)      -> yoke swing, amber rim pulse, one gauge dies per toll, pigeons flee on the first
//   "bead"   x4  gauge beads drop      (4.05, 4.45, 4.85, 5.25) -> bead falls, red ring pops at the foot of its tube
//   "flare"      the fourth bead flares (9.95)               -> the surviving bead goes hot
//   "realm"      the sky gap opens, hangs, closes (3.0, dur 1.6)
//   "screens"    three screens cut to the page (12.5)
//   "crack"      the white crack web grows (12.9, dur 0.7)
//   "shatter"    the world breaks into flat falling shards (13.6)
export const KEY_AT = [4.7, 5.9, -0.7];      // the floodlight (look.js)
export const KEY_AIM = [-0.5, 0.5, -1.6];
export const REALM_AT = [8.5, 21.5, -104];
export const DECK = { x0: -9, x1: 9, z0: -2.55, z1: 9.45 };
export const CURB = { z: -2.55, w: 0.6, h: 0.55 };
export const HUT = { x: 5.8, z: -1.4, w: 2.8, d: 2.6, h: 3.4 };
export const MAST_X = -7.2;
export const HELI = { x: -5.4, z: 5.6, r: 2.3 };
export const GAUGE = { xs: [-2.2, -1.3, -0.4, 0.5], z: -1.3, r: 0.2, h: 2.6 };
export const GRAINS = [32, 48, 64, 16];
export const TOWER = { x: -8.2, z: -5.2, w: 3.6, belfry: 4.7, bellY: 7.15, bellH: 1.8, top: 20, yoke: 8.45 };
export const SCREENS = [
  { at: [12, 31, -74], size: [10.4, 6.0], kind: 0 },
  { at: [-18, 20, -58], size: [9.0, 5.6], kind: 0 },
  { at: [-9, 12.5, -36], size: [9.0, 5.6], kind: 1 }, // nearest: Misa
];
export const PUDDLES = [[2.2, 3.4, 1.5, 0.8], [-3.6, 2.4, 1.1, 0.7], [0.4, 6.4, 1.8, 1.0], [-7, 7.8, 1.2, 0.7], [6.5, 6.8, 1.4, 0.9], [-2.3, -1.4, 0.7, 0.4]]; // x, z, rx, rz
export const GROUND_Y = -38; // the street far below the roof

export function timeline(scene) {
  const bs = scene?.beats ?? [];
  const all = (name, def) => { const v = bs.filter((b) => b.name === name).map((b) => b.t).sort((a, b) => a - b); return v.length ? v : def; };
  const one = (name, t, dur) => { const b = bs.find((x) => x.name === name); return { t: b?.t ?? t, dur: b?.dur ?? dur }; };
  return {
    tolls: all("toll", [7.0, 8.1, 9.2]),
    beads: all("bead", [4.05, 4.45, 4.85, 5.25]),
    flare: one("flare", 9.95, 0.5).t,
    realm: one("realm", 3.0, 1.6),
    screens: one("screens", 12.5, 0.1).t,
    crack: one("crack", 12.9, 0.7),
    shatter: one("shatter", 13.6, 1).t,
  };
}
