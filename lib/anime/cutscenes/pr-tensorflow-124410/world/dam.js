// THE DAM SET (layer 0, instanced-by-merge, ink hulled): built only where the lens can see it (facades, not buildings).
// Frame (layout.js): the crest top is y = 0, 40 m long (x -20..20) and 4 m wide (z -2..2), the seal stands at the origin, the
// reservoir lies behind it at -z (water y = -4), the valley drops away at +z.
//   crest        slab with 5 m expansion joints and a faded cream centre dash; NO railing on the lens side (the seal is never
//                covered): a see-through railing of posts and two rails along the upstream edge only
//   upstream     a battered wall z -3.6..-2 down into the water, with a ledge; downstream: 7 stepped spillway slabs (depth
//                1.6 m a step) dropping to the valley floor, which the cel shader scores with 4 m panel lines
//   lamps        6 posts with a curved arm and a glowing cream globe (emission 0.85, under the bloom threshold)
//   abutments    two stub control towers at the crest ends with a ribbon window and a flat roof
//   valve tower  12 m of octagonal concrete out of the water at (5.5, -16): collars, a gallery slab at y 8.5 (the Jotaro
//                seal stands on it), ten sparse balusters, a stub mast
//   pylons       the control-edge gantry's two fluted pylons, 14 m above the water, with collars where each edge seats
//   road roller  DIO's road roller parked on the crest at x -8, a yellow cab, two iron drums, an exhaust stack
import { Group } from "three";
import { L } from "./layout.js";
import { Parts, inked } from "./geo.js";

const CON = "#c8c0d0", CON_D = "#a89cc0", CON_DD = "#8a7eaa", CREAM = "#f6e8b0", INKC = "#2a1a4a", GOLD = "#ffe27a", YEL = "#ffd24a", IRON = "#7a8a7a";

function crest() {
  const p = new Parts();
  p.box(40, 1.4, 4, CON, { y: -0.7 });                                                    // the slab
  for (let x = -17.5; x <= 17.5; x += 5) p.box(0.14, 0.03, 4, CON_DD, { x, y: 0.014 });   // expansion joints
  for (let x = -19; x < 19; x += 2.6) p.box(1.3, 0.03, 0.14, CREAM, { x, y: 0.016, z: 0.3 }); // the faded centre dash
  // upstream: the battered wall and its ledge
  p.box(40, 6, 1.6, CON_D, { y: -3, z: -2.8 });
  p.box(40, 0.3, 1.1, CON, { y: -0.45, z: -2.55 });
  // downstream: 7 spillway steps
  for (let k = 0; k < 7; k++) {
    const d = 1.6 * (k + 1);
    p.box(40, 2, d, k % 2 ? CON_D : CON, { y: -1 - 2 * k, z: 2 + d / 2 });
  }
  // the see-through railing along the upstream edge: posts every 2 m and two thin rails
  for (let x = -19.5; x <= 19.5; x += 2) p.box(0.14, 1.1, 0.14, CON_DD, { x, y: 0.55, z: -1.85 });
  for (const y of [0.52, 1.02]) p.box(40, 0.07, 0.07, CON_DD, { y, z: -1.85 });
  p.box(40, 0.16, 0.3, CON, { y: 1.12, z: -1.85 });                                        // the coping
  // lamp posts: pole, collar, a curved arm
  for (const x of [-18, -12, -5.5, 5.5, 12, 18]) {
    p.cyl(0.14, 0.24, 6.4, 8, CON_DD, { x, y: 3.2, z: -1.7 });
    p.cyl(0.34, 0.34, 0.5, 8, CON, { x, y: 0.25, z: -1.7 });
    p.box(0.16, 0.16, 1.3, CON_DD, { x, y: 6.35, z: -1.1 });
  }
  // abutment control towers: block, ribbon window, door, flat roof with a hard overhang
  for (const s of [-1, 1]) {
    p.box(4.4, 5, 3.6, CON, { x: s * 21.4, y: 2.5, z: 0 });
    p.box(5.0, 0.4, 4.2, CON_DD, { x: s * 21.4, y: 5.2, z: 0 });
    p.box(3.2, 0.5, 0.12, INKC, { x: s * 21.4, y: 3.5, z: 1.82 });
    p.box(0.9, 2.0, 0.12, INKC, { x: s * 21.4 - s * 1.2, y: 1.0, z: 1.82 });
    p.box(0.4, 3.2, 0.4, CON_DD, { x: s * 21.4 + s * 1.4, y: 6.9, z: -0.8 });
  }
  return p.build();
}

function lamps() {
  const p = new Parts();
  for (const x of [-18, -12, -5.5, 5.5, 12, 18]) p.ball(0.5, CREAM, { x, y: 6.15, z: -0.5 });
  return p.build();
}

function tower() {
  const T = L.TOWER, p = new Parts();
  const base = L.WATER_Y - 2, h = T.top - base;
  p.cyl(T.r, T.r + 0.6, h, 8, CON, { x: T.x, z: T.z, y: base + h / 2 });
  for (let k = 0; k < 4; k++) p.cyl(T.r + 0.12, T.r + 0.12, 0.26, 8, CON_DD, { x: T.x, z: T.z, y: L.WATER_Y + 0.8 + k * 2.9 });
  p.cyl(T.r + 1.0, T.r + 1.0, 0.5, 8, CON_D, { x: T.x, z: T.z, y: T.top - 0.25 });        // the gallery slab, top at y 8.5
  p.cyl(T.r + 0.5, T.r + 0.1, 0.9, 8, CON_DD, { x: T.x, z: T.z, y: T.top - 0.95 });        // its corbel
  for (let k = 0; k < 10; k++) {                                                            // sparse balusters (the seal stays seen)
    const a = (k / 10) * Math.PI * 2;
    p.box(0.12, 0.8, 0.12, CON_DD, { x: T.x + Math.cos(a) * (T.r + 0.85), z: T.z + Math.sin(a) * (T.r + 0.85), y: T.top + 0.4 });
  }
  p.box(0.8, 5, 0.8, CON, { x: T.x - 1.2, z: T.z - 1.2, y: T.top + 2.5 });                  // a stub mast behind the figure
  p.box(1.3, 0.3, 1.3, CON_DD, { x: T.x - 1.2, z: T.z - 1.2, y: T.top + 5.1 });
  return p.build();
}

// one pylon centred on (0, y, 0), 14 m above the water: fluted shaft, collars at the edge seats, a cap and a pyramid
function pylon() {
  const p = new Parts(), top = L.PYL.top, base = L.WATER_Y - 3, h = top - base;
  p.box(3.4, 3.2, 3.4, CON_DD, { y: L.WATER_Y - 1.4 });                                    // the footing in the water
  p.box(1.7, h, 1.7, CON, { y: base + h / 2 + 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.3, h - 0.6, 0.3, CON_D, { x: sx * 0.8, z: sz * 0.8, y: base + h / 2 + 0.4 }); // the flutes
  for (const y of [...L.MINT_Y, L.CORAL_Y]) p.box(2.1, 0.42, 2.1, CON_DD, { y });
  p.box(2.5, 0.5, 2.5, CON_DD, { y: top + 0.25 });
  p.cone(1.5, 1.7, 4, CON, { y: top + 1.35, ry: Math.PI / 4 });
  p.cyl(0.06, 0.06, 1.4, 5, INKC, { y: top + 2.9 });
  return p.build();
}

// DIO's road roller: parked on the crest, facing +x. Cab, two iron drums, exhaust stack, a gold-edged hood.
function roller() {
  const p = new Parts();
  p.box(2.4, 0.9, 1.5, YEL, { x: 0.4, y: 1.1 });                                           // the body
  p.box(1.3, 0.6, 1.3, YEL, { x: -0.7, y: 1.9 });                                          // the cab block
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.08, 1.1, 0.08, CON_DD, { x: -0.7 + sx * 0.6, y: 2.7, z: sz * 0.6 }); // cab posts
  p.box(1.5, 0.1, 1.5, CON_DD, { x: -0.7, y: 3.3 });                                      // roof
  p.cyl(0.8, 0.8, 1.7, 14, IRON, { x: 1.9, y: 0.8, rx: Math.PI / 2 });                    // the front drum
  p.cyl(0.65, 0.65, 0.35, 12, IRON, { x: -0.9, y: 0.65, z: 0.9, rx: Math.PI / 2 });       // rear wheels
  p.cyl(0.65, 0.65, 0.35, 12, IRON, { x: -0.9, y: 0.65, z: -0.9, rx: Math.PI / 2 });
  p.cyl(0.1, 0.1, 1.2, 6, CON_DD, { x: 1.0, y: 2.1 });                                     // exhaust
  p.box(0.3, 0.3, 0.05, GOLD, { x: 2.0, y: 1.3, z: 0.77 });                                // a plate
  return p.build();
}

// the dam set, one inked mesh each, as a Group (layer 0 by the caller)
export function buildDam(U) {
  const g = new Group();
  g.name = "dam";
  const put = (geo, o, pos) => { const m = inked(geo, U, o); if (pos) m.position.set(...pos); g.add(m); return m; };
  put(crest(), { panel: 1 });
  put(lamps(), { emit: [0.03, 0.025, 0.0], tint: 0, hatch: 0 });
  put(tower(), { panel: 1 });
  const pg = pylon();
  put(pg, { panel: 1 }, [-L.PYL.x, 0, L.PYL.z]);
  put(pg.clone(), { panel: 1 }, [L.PYL.x, 0, L.PYL.z]);
  put(roller(), { tint: 0.1 }, [L.ROLLER.x, 0, L.ROLLER.z]);
  return g;
}
