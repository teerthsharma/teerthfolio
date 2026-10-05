// THE CAST, as silhouettes in the key-art's cel light (faces never drawn): Aura the
// Guillotine (long pale hair, small horns, a cape, the golden SCALE OF OBEDIENCE
// held up), her headless armoured soldiers (one instanced mesh each for legs and
// upper body, so they can kneel), Fern with her staff and Stark with his axe on the
// broken walls. Local frames face +z, feet at the origin, metres.

import { faceMesh } from "../../cel";
import { BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, Group, Mesh, MeshBasicMaterial, CylinderGeometry, DoubleSide, IcosahedronGeometry, LatheGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { join, limb, part, put } from "./toon";

const lathe = (pts, seg = 14) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const GOLD = "#e9b84a";

// ------------------------------------------------------------------ Aura
export const AURA = { at: [2.3, 0.9, -5.0], yaw: -0.25, scale: 1.4 };
// Fern and Stark on their walls, drawn in close to Aura so the pair reads in a portrait frame too
export const FERN_AT = [-0.2, 2.3, -13.4];
export const STARK_AT = [5.6, 1.9, -14.2];
export const HAND = [1.2, 1.95, 0.12]; // the raised hand, in her local frame
export const MOUTH = [0, 1.7, 0.12];

export const auraFace = () => faceMesh({ eyes: { shape: "sharp", iris: "#e8b81a", sclera: "#fffaf0" }, brow: { tilt: 0.3, color: "#8f80b8" }, mouth: { kind: "smirk" } }, [0, 1.7, 0.02], 0.118, 0.95);

export function aura() {
  const P = [];
  const dark = "#2a1d3d";
  const plum = "#352449";
  const skin = "#ecd4cf";
  // legs and boots
  for (const s of [-1, 1]) {
    P.push(part(limb([s * 0.1, 0.12, 0], [s * 0.11, 0.98, 0], 0.052, 0.075), "#1c1426"));
    P.push(part(new BoxGeometry(0.14, 0.1, 0.3), "#150f1d", { flat: true }).translate(s * 0.11, 0.05, 0.06));
  }
  // dress: an A-line skirt that lifts in the wind, a fitted bodice, a gold belt
  P.push(part(lathe([[0.17, 1.08], [0.21, 0.96], [0.31, 0.72], [0.43, 0.46], [0.5, 0.3]]), dark, { swayFn: (x, y) => clamp01((1.0 - y) / 0.75) * 0.5 }));
  P.push(part(lathe([[0.15, 1.05], [0.165, 1.2], [0.2, 1.42], [0.17, 1.53], [0.09, 1.57], [0.06, 1.63]]), plum));
  P.push(put(part(new TorusGeometry(0.175, 0.02, 5, 14), GOLD, { kind: 3 }), 0, 1.08, 0, Math.PI / 2));
  P.push(put(part(new TorusGeometry(0.1, 0.017, 5, 12), GOLD, { kind: 3 }), 0, 1.55, 0, Math.PI / 2));
  for (const s of [-1, 1]) P.push(part(new IcosahedronGeometry(0.075, 0).scale(1.3, 0.8, 1), GOLD, { kind: 3, flat: true }).translate(s * 0.2, 1.5, 0));
  // head: a pale oval (the face plate is cel.js faceMesh, mounted by the move); pale hair over the crown and down the back; two small horns
  P.push(part(new SphereGeometry(0.118, 12, 10).scale(0.92, 1.1, 1), skin).translate(0, 1.7, 0.02));
  P.push(put(part(new SphereGeometry(0.15, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.64).scale(1, 1.08, 1.04), "#d4c7ea", { sway: 0.04 }), 0, 1.71, -0.025));
  for (const s of [-1, 1]) {
    P.push(put(part(new TorusGeometry(0.1, 0.026, 5, 10, Math.PI * 1.05), "#e6d6ae", { flat: true }), s * 0.1, 1.8, -0.02, 0, 0, s > 0 ? -0.15 : Math.PI - 0.1 + 0.15));
    P.push(part(new ConeGeometry(0.03, 0.12, 5), "#e6d6ae", { flat: true }).translate(s * 0.21, 1.9, -0.02));
  }
  // the long hair: ribbons from the crown to the thighs, and two locks framing the face; they whip in the wind
  const hairSway = (y) => clamp01((1.7 - y) / 0.95) * 1.0;
  const strand = (x0, z0, w, len, hex, bow) => {
    const g = new PlaneGeometry(w, len, 2, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = (len / 2 - p.getY(i)) / len; // 0 top .. 1 tip
      p.setX(i, p.getX(i) * (1 - 0.55 * k * k) + bow * Math.sin(k * 3.1) * 0.5);
      p.setZ(i, -k * k * 0.16 - 0.04 * Math.sin(k * 6.0 + x0 * 9));
    }
    g.translate(x0, 1.68 - len / 2, z0);
    return part(g, hex, { swayFn: (x, y) => hairSway(y) });
  };
  [[-0.1, -0.1, 0.17, 1.28, "#cdbfe6", -0.1], [0.0, -0.13, 0.2, 1.4, "#e5dcf2", 0.05], [0.1, -0.1, 0.17, 1.25, "#c5b6e0", 0.1], [-0.17, -0.06, 0.12, 1.0, "#d7cbec", -0.12], [0.17, -0.06, 0.12, 1.05, "#d7cbec", 0.12]].forEach((a) => P.push(strand(...a)));
  for (const s of [-1, 1]) P.push(part(new PlaneGeometry(0.05, 0.5, 1, 4), "#e5dcf2", { swayFn: (x, y) => clamp01((0.2 - y) / 0.5) * 0.45 }).rotateZ(s * 0.04).translate(s * 0.115, 1.5, 0.1));
  // the cape: a burgundy sheet from the shoulders that flares behind her and streams in the mana wind
  const cape = new PlaneGeometry(0.66, 1.6, 4, 10);
  {
    const p = cape.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, (0.8 - p.getY(i)) / 1.6);
      p.setX(i, p.getX(i) * (1 + 0.85 * k));
      p.setZ(i, -0.15 - 0.3 * k ** 1.3 + 0.03 * Math.sin(p.getX(i) * 9 + k * 5));
    }
    cape.translate(0, 1.54 - 0.8, 0);
  }
  P.push(part(cape, "#722448", { swayFn: (x, y) => clamp01((1.5 - y) / 1.1) * 1.15 }));
  // arms: the left raised to hold the scale up, the right low at her side
  P.push(part(limb([0.2, 1.46, 0], [0.62, 1.64, 0.08], 0.05, 0.043), plum), part(limb([0.62, 1.64, 0.08], HAND, 0.043, 0.036), plum));
  P.push(part(new IcosahedronGeometry(0.052, 1), skin).translate(...HAND));
  P.push(part(limb([-0.2, 1.46, 0], [-0.3, 1.18, 0.04], 0.05, 0.043), plum), part(limb([-0.3, 1.18, 0.04], [-0.27, 0.93, 0.1], 0.043, 0.036), plum));
  P.push(part(new IcosahedronGeometry(0.052, 1), skin).translate(-0.27, 0.92, 0.1));
  return join(P);
}

// ------------------------------------------------------------------ the soldiers: headless, in ranks
export function soldier() {
  const legs = [];
  const up = [];
  const steel = "#3d3858";
  const lite = "#5c5680";
  const dark = "#1d182c";
  for (const s of [-1, 1]) {
    legs.push(part(limb([s * 0.11, 0.06, 0.02], [s * 0.12, 0.92, 0], 0.07, 0.092), steel));
    legs.push(part(new BoxGeometry(0.17, 0.12, 0.32), dark, { flat: true }).translate(s * 0.11, 0.06, 0.07));
    legs.push(part(new IcosahedronGeometry(0.1, 0).translate(s * 0.12, 0.56, 0.05), lite, { flat: true })); // knee guards
  }
  up.push(part(lathe([[0.34, 0.62], [0.28, 0.85], [0.22, 1.0]], 10), steel)); // tassets
  up.push(part(lathe([[0.22, 0.98], [0.27, 1.2], [0.28, 1.42], [0.2, 1.56], [0.13, 1.62]], 10), steel));
  up.push(put(part(new TorusGeometry(0.27, 0.025, 4, 12), GOLD, { kind: 3 }), 0, 1.22, 0, Math.PI / 2));
  up.push(put(part(new TorusGeometry(0.26, 0.022, 4, 12), GOLD, { kind: 3 }), 0, 0.99, 0, Math.PI / 2));
  for (const s of [-1, 1]) up.push(part(new IcosahedronGeometry(0.17, 1).scale(1.1, 0.75, 1), lite).translate(s * 0.32, 1.53, 0));
  up.push(part(new CylinderGeometry(0.13, 0.15, 0.13, 10, 1, true), steel).translate(0, 1.66, 0)); // the gorget: nothing above it
  up.push(part(new CircleGeometry(0.13, 10).rotateX(-Math.PI / 2), dark).translate(0, 1.64, 0));
  up.push(part(limb([0.32, 1.5, 0], [0.4, 1.1, 0.14], 0.065, 0.055), steel), part(limb([-0.32, 1.5, 0], [-0.34, 1.1, 0.1], 0.065, 0.055), steel));
  up.push(part(limb([0.4, 0.05, 0.16], [0.4, 2.35, 0.16], 0.025, 0.02, 5), "#6b5a4a")); // the halberd
  up.push(part(new BoxGeometry(0.26, 0.2, 0.025), lite, { flat: true, kind: 3 }).translate(0.5, 2.2, 0.16), part(new ConeGeometry(0.04, 0.2, 5), lite, { flat: true, kind: 3 }).translate(0.4, 2.45, 0.16));
  return { legs: join(legs), up: join(up) };
}

// ------------------------------------------------------------------ Fern and Stark (silhouettes on the walls)
export function fern() {
  const P = [];
  const robe = "#3a3a5e";
  P.push(part(lathe([[0.12, 0.85], [0.2, 0.55], [0.3, 0.1], [0.32, 0.0]], 10), robe, { swayFn: (x, y) => clamp01((0.8 - y) / 0.8) * 0.18 }));
  P.push(part(lathe([[0.12, 0.84], [0.125, 1.0], [0.15, 1.22], [0.12, 1.3], [0.06, 1.34]], 10), "#44446a"));
  P.push(put(part(new TorusGeometry(0.13, 0.025, 4, 10), "#efe4d2"), 0, 1.3, 0, Math.PI / 2)); // the white collar
  P.push(part(new SphereGeometry(0.1, 10, 8).scale(0.95, 1.1, 1), "#3c2e44").translate(0, 1.45, 0.01));
  const hair = new PlaneGeometry(0.3, 0.95, 2, 6);
  hair.translate(0, -0.47, -0.07).translate(0, 1.52, 0);
  P.push(part(hair, "#2b2442", { swayFn: (x, y) => clamp01((1.45 - y) / 0.85) * 0.9 }));
  P.push(part(new SphereGeometry(0.115, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), "#2b2442").translate(0, 1.47, -0.01));
  P.push(part(limb([0.12, 1.22, 0], [0.22, 0.95, 0.2], 0.04, 0.035), robe), part(limb([-0.12, 1.22, 0], [-0.18, 0.98, 0.18], 0.04, 0.035), robe));
  P.push(part(limb([0.22, 0.0, 0.22], [0.22, 1.8, 0.22], 0.022, 0.02, 5), "#7a5a3a")); // the staff
  P.push(part(new IcosahedronGeometry(0.1, 1), GOLD, { kind: 3 }).translate(0.22, 1.86, 0.22));
  P.push(put(part(new TorusGeometry(0.12, 0.014, 4, 12), GOLD, { kind: 3 }), 0.22, 1.86, 0.22, 0.4, 0.3));
  return join(P);
}

export function stark() {
  const P = [];
  const cloth = "#4a3029";
  const lite = "#6e4a38";
  for (const s of [-1, 1]) P.push(part(limb([s * 0.14, 0.05, 0], [s * 0.15, 0.92, 0], 0.085, 0.105), "#2c2020"));
  P.push(part(lathe([[0.3, 0.7], [0.27, 0.95], [0.3, 1.2], [0.36, 1.46], [0.24, 1.62], [0.13, 1.68]], 10), cloth));
  P.push(put(part(new TorusGeometry(0.29, 0.03, 4, 10), "#2c2020"), 0, 1.0, 0, Math.PI / 2));
  for (const s of [-1, 1]) P.push(part(new IcosahedronGeometry(0.2, 1).scale(1.1, 0.8, 1), lite).translate(s * 0.4, 1.58, 0));
  P.push(part(new SphereGeometry(0.115, 10, 8), "#3c2e2c").translate(0, 1.78, 0.01));
  for (const [x, a, h] of [[-0.09, -0.4, 0.2], [-0.03, -0.1, 0.24], [0.04, 0.12, 0.23], [0.1, 0.4, 0.19], [0.0, 0, 0.17]]) P.push(part(new ConeGeometry(0.045, h, 4), "#5a2f28", { flat: true }).rotateZ(-a).translate(x, 1.9, -0.02));
  P.push(part(limb([0.4, 1.5, 0], [0.5, 1.15, 0.2], 0.075, 0.065), cloth), part(limb([-0.4, 1.5, 0], [-0.1, 1.25, 0.25], 0.075, 0.065), cloth));
  // the axe: a long haft slung over the shoulder, a broad double blade
  P.push(part(limb([0.5, 0.95, 0.2], [-0.15, 2.0, -0.05], 0.03, 0.027, 5), "#6b5a4a"));
  P.push(put(part(new BoxGeometry(0.46, 0.4, 0.04), "#bfc3d4", { flat: true, kind: 3 }), -0.2, 2.03, -0.05, 0, 0, 0.55));
  return join(P);
}

// ------------------------------------------------------------------ the Scale of Obedience
// Origin at the palm. The stem rises to the fulcrum (FULCRUM above the palm); the
// beam's two halves, the two pans (with their chains) and the stem are separate
// pieces so the scale can break. Beam half length BEAM; chains hang CHAIN below it.
export const FULCRUM = 0.78;
export const BEAM = 0.9;
export const CHAIN = 0.78;
export const SCALE_K = 1.75; // the scale is drawn oversize, as key-art draws a prop that carries the story
export function scalePieces() {
  const stem = join([
    part(new ConeGeometry(0.1, 0.14, 8), GOLD, { kind: 3 }).rotateX(Math.PI).translate(0, 0.07, 0),
    part(limb([0, 0.12, 0], [0, FULCRUM - 0.05, 0], 0.032, 0.026, 8), GOLD, { kind: 3 }),
    part(new IcosahedronGeometry(0.075, 1), GOLD, { kind: 3 }).translate(0, FULCRUM, 0),
    part(new ConeGeometry(0.045, 0.2, 6), GOLD, { kind: 3 }).translate(0, FULCRUM + 0.17, 0),
    put(part(new TorusGeometry(0.1, 0.014, 5, 14), GOLD, { kind: 3 }), 0, 0.34, 0, Math.PI / 2),
  ]);
  const half = (s) =>
    join([
      part(limb([0, 0, 0], [s * BEAM, 0, 0], 0.03, 0.022, 6), GOLD, { kind: 3 }),
      part(new IcosahedronGeometry(0.052, 1), GOLD, { kind: 3 }).translate(s * BEAM, 0, 0),
      part(new TorusGeometry(0.05, 0.011, 4, 10), GOLD, { kind: 3 }).translate(s * BEAM * 0.55, 0.06, 0),
    ]);
  // a pan's origin is the middle of its dish (it is thrown and spins about that); the chains rise to CHAIN above it
  const pan = () => {
    const P = [part(new CylinderGeometry(0.46, 0.2, 0.1, 16), GOLD, { kind: 3 }).translate(0, -0.05, 0)];
    P.push(put(part(new TorusGeometry(0.46, 0.017, 5, 18), "#fff0b8", { kind: 3 }), 0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      P.push(part(limb([0, CHAIN, 0], [Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44], 0.009, 0.009, 4), GOLD, { kind: 3 }));
    }
    return join(P);
  };
  const mote = part(new IcosahedronGeometry(0.075, 1), "#fff4d6", { kind: 4 });
  return { stem, left: half(-1), right: half(1), pan: pan(), mote };
}


// ------------------------------------------------------------------ Frieren's kit on the pup
// Two white twin tails and red drop earrings on the head, a staff with a red gem and a gold crescent cap at the
// right flipper. `head` and `root` are pupParts(scene); the kit is two groups the caller adds and removes.
export function frierenKit() {
  const mk = (hex) => new MeshBasicMaterial({ color: hex, toneMapped: false, fog: false });
  const hair = mk("#f4f1ea");
  const red = mk("#c8202c");
  const head = new Group();
  for (const sd of [-1, 1]) {
    const tail = new Mesh(new CapsuleGeometry(0.08, 0.7), hair);
    tail.position.set(0.42 * sd, 0.15 - 0.35, -0.1);
    tail.rotation.z = -0.25 * sd;
    const ear = new Mesh(new SphereGeometry(0.05), red);
    ear.position.set(0.44 * sd, -0.02, 0.1);
    head.add(tail, ear);
  }
  const staff = new Group();
  const rod = new Mesh(new CylinderGeometry(0.03, 0.03, 1.6), mk("#f2efe6"));
  const gem = new Mesh(new SphereGeometry(0.07), mk("#d42a3a"));
  gem.position.y = 0.86;
  const cap = new Mesh(new TorusGeometry(0.1, 0.02, 6, 14, Math.PI * 1.5), mk("#e6b84a"));
  cap.position.y = 0.9;
  staff.add(rod, gem, cap);
  staff.position.set(0.6, 0.8, 0.25);
  const dispose = () => {
    for (const g of [head, staff]) g.traverse((o) => o.isMesh && (o.geometry.dispose(), o.material.dispose()));
  };
  return { head, staff, dispose };
}
