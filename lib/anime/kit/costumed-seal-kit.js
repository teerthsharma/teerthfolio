// COSTUMED SEAL KIT (shared kit, canonical name from scripts/INDEX.md: `costumed-seal-kit`, which is one module with
// costume-seal-kit, costumed-seal-cast, victim-seal-costume-kit and cel-seal-costume).
//
// Owner law L6b: there are NO small silhouettes. Every victim, extra and background figure is a SMALL SEAL with the locked
// pup's proportions, dressed in the VILLAIN'S or OPPONENT'S signature costume (cloak, hat, haori, uniform, armour, cape,
// hair, weapon), full 3D cel-shaded, and it REACTS to the power: recoil, kneel, blown back, terror, petrified.
//
//   costumedSeal(engine, spec)   -> handle { group, body, fig, shell, hair, eyes, props, height,
//                                            setPose(name, k), expression(name, k), react(kind, k), tint(col, amt),
//                                            place(x, y, z, yaw), update(t, dt), dispose() }
//   COSTUMES                     example presets: school, shinigami, haoriWhite, survey, armour, wizard, akatsuki, royal, extra
//   COSTUME_LAYERS               the data-driven cloth layer types (SDF shell): cloak, cape, coat, uniform, armour, scarf, sash
//   HATS, ACCESSORIES, WEAPONS   the rigid-prop libraries (named builders)
//   REACTIONS                    recoil, kneel, blown, terror, petrified, cower, bow, fallen, stagger: pose + expression + tint
//   VICTIM_POSES                 stand, recoil, kneel, blown, terror, petrified, cower, bow, salute, fallen, stagger
//   defineCostume(base, overrides)
//
// spec (every field optional; data only, so a cast agent writes costumes as objects in its own folder):
//   {
//     scale: 0.55,                          // the locked pup is 0.8 m tall at scale 1; victims are 0.45 to 0.7
//     coat: "#8e8c91", shade: "#6d6b7d",    // the fur tints (default: the locked grey); flippers derive a step darker
//     layers: [ { type:"cloak", col, shade, trim, len, collar }, ... ],     // SDF shell layers, see COSTUME_LAYERS
//     hat: { kind:"straw"|"kasa"|"top"|"pointed"|"headband"|"crown"|"horns"|"helmet", col, trim, shade },
//     hair: <preset name> | hair-clump-kit spec,                            // hair-clump-kit: clumps + the highlight cut
//     accessories: [ { kind:"glasses"|"eyepatch"|"mask", col } ],
//     weapon: { kind:"sword"|"broadsword"|"staff"|"spear"|"scythe"|"wand"|"pistol"|"book"|"shield"|"lantern", hand:"r"|"l", col, tilt },
//     eyes: { style, iris, irisLo, ... },   // anime-eye-decal over the painted pup eyes; omit to keep the locked painted eyes
//     h: 0.014,                             // SDF voxel (m) for the shell; the body uses the pup's own 0.011 (cached per tint)
//   }
// Geometry is CACHED per (tint, layers): a crowd of 40 seals in one costume polygonizes once and shares the mesh.
//
// The pup body here is the locked v2 design (pup.js pupPrims2, the same face uniforms as buildPup2): proportions never change,
// only the fur tint, so a victim is unmistakably a seal. Luma law (L8): all fills are capped by the shared lit-luma 0.92 (uS0.w)
// and emission is zero, so no costume or seal here can reach the bloom threshold.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { cone, ell, paint, painted, polygonize } from "../sdf.js";
import { pupPrims2, PUP_HEAD2, PUP_INK, lineGeometry, lineMaterial, groundShadow } from "../pup.js";
import { horn } from "../kit3d.js";
import { hairMesh, defineHair, HAIR_PRESETS } from "./hair-clump-kit.js";
import { eyePair } from "./anime-eye-decal.js";

const D2 = Math.PI / 180;
// layer 1 = the character layer (post.js layered()); a subtree whose root has userData.layer keeps its own
const setLayer = (o, l) => { const L = o.userData?.layer ?? l; o.layers.set(L); for (const c of o.children) setLayer(c, L); };
const HEAD = { c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] };

// ------------------------------------------------------------------ body
// pupPrims2() order: 0 body, 1 base, 2 belly, 3 head, 4 back, 5 muzzle, 6-8 tuft, 9-10 fore flippers, 11 tail, 12-13 rear flippers
const COAT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11], FLIP_IDX = [9, 10, 12, 13];
const darker = (hex, k) => `#${new Color(hex).multiplyScalar(k).getHexString()}`;
const BODY_CACHE = new Map();
function bodyGeometry(coat, shade, h) {
  const key = `${coat}|${shade}|${h}`;
  let g = BODY_CACHE.get(key);
  if (g) return g;
  const prims = pupPrims2();
  if (prims.length !== 14) throw new Error("costumed-seal-kit: pupPrims2() changed shape; update COAT_IDX / FLIP_IDX");
  const cm = paint(coat, shade), fm = paint(darker(coat, 0.97), darker(shade, 0.96), { line: 1 });
  for (const i of COAT_IDX) prims[i].m = cm;
  for (const i of FLIP_IDX) prims[i].m = fm;
  g = polygonize(prims, h);
  BODY_CACHE.set(key, g);
  return g;
}

function makeBody(engine, spec, h) {
  const geo = bodyGeometry(spec.coat ?? "#8e8c91", spec.shade ?? "#6d6b7d", h);
  const fig = engine.figure(geo, { head: PUP_HEAD2, ink: PUP_INK, lineMul: 1.5, constant: true });
  fig.userData.geo = geo;
  const u = fig.userData.mat.uniforms;
  // the locked face, exactly as pup.js buildPup2 sets it
  u.uDecA.value.set(0, 0.215, 0.235, 0.255); u.uDecB.value.set(0, 0.497, 0.09, 0.06);
  u.uDecCol.value.set("#f4e7cc"); u.uDecShade.value.set("#cdbfb4");
  u.uBlush.value.set(0.178, 0.535, 0.045, 0.024); u.uBlushCol.value.set(0.953, 0.604, 0.525, 0.75);
  u.uFace.value.set(1, 0.122, 0.572, 0.047); u.uEyeCol.value.set("#2e211d");
  u.uEmit.value.set(0, 0, 0);
  const curves = [];
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
    const a = new Vector3(s * 0.07, 0.505 - k * 0.016, 0.255 - 0.01 * k), pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(a.clone().add(new Vector3(s * (0.03 + 0.2 * t), (0.016 - 0.016 * k) * t - 0.03 * t * t * (k * 0.5 + 0.3), -0.05 * t - 0.05 * t * t))); }
    curves.push(pts);
  }
  const wh = new Mesh(lineGeometry(curves), lineMaterial(engine.shared, PUP_INK, 0.75));
  wh.frustumCulled = false;
  fig.add(wh);
  return fig;
}

// ------------------------------------------------------------------ cloth layers (SDF prims merged into ONE shell mesh)
// All coordinates in the pup's own frame (m, +y up, faces +z). A layer is { type, col, shade, trim, ... }.
const P = (col, shade, line = 1.1) => paint(col, shade ?? darker(col, 0.55), { line });
export const COSTUME_LAYERS = {
  // a cloak hanging from the shoulders down the back, lined, with an optional high collar and a front clasp
  cloak: (o) => {
    const len = o.len ?? 1, m = P(o.col, o.shade, 1.2), lin = P(o.lining ?? o.trim ?? darker(o.col, 0.6), null, 1);
    const out = [cone([0, 0.5, -0.09], [0, 0.03 + (1 - len) * 0.2, -0.17], 0.27, 0.4 * (o.spread ?? 1), m, 0.05),
      cone([0, 0.49, -0.06], [0, 0.04 + (1 - len) * 0.2, -0.12], 0.25, 0.36 * (o.spread ?? 1), lin, 0.0)];
    if (o.collar) out.push(ell([0, 0.5, -0.1], [0.3, o.collar === "high" ? 0.2 : 0.1, 0.2], m, 0.04));
    if (o.clasp) out.push(ell([0, 0.4, 0.23], [0.035, 0.035, 0.02], P(o.clasp, null, 1), 0.01));
    if (o.trim) out.push(cone([0, 0.04, -0.17], [0, 0.0, -0.17], 0.4 * (o.spread ?? 1), 0.42 * (o.spread ?? 1), P(o.trim, null, 1), 0.0));
    return out;
  },
  // a short cape pinned at the shoulders, flaring behind
  cape: (o) => [cone([0, 0.5, -0.08], [0, 0.16, -0.22], 0.27, 0.36, P(o.col, o.shade, 1.2), 0.05), ell([0.2, 0.46, 0.02], [0.07, 0.05, 0.06], P(o.trim ?? "#f0bf3c"), 0.02), ell([-0.2, 0.46, 0.02], [0.07, 0.05, 0.06], P(o.trim ?? "#f0bf3c"), 0.02)],
  // an open-front long coat / haori: two front panels with a V of belly between, sleeves over the flippers, a hem skirt
  coat: (o) => {
    const m = P(o.col, o.shade, 1.15), g = 0.2 + (o.open ?? 0.04), out = [];
    for (const s of [1, -1]) {
      out.push(ell([s * g, 0.22, 0.03], [0.2, 0.27, 0.31], m, 0.04), cone([s * 0.25, 0.4, 0.13], [s * 0.285, 0.18, 0.2], 0.085, 0.12, m, 0.03));
    }
    out.push(ell([0, 0.2, -0.1], [0.37, 0.25, 0.25], m, 0.04), cone([0, 0.14, 0], [0, 0.02, 0], 0.36, 0.43, m, 0.03));
    if (o.collar) out.push(ell([0, 0.44, -0.02], [0.28, 0.07, 0.24], P(o.collar === true ? o.col : o.collar, null, 1.1), 0.03));
    if (o.trim) out.push(cone([0, 0.04, 0], [0, 0.0, 0], 0.42, 0.44, P(o.trim, null, 1), 0.0));
    return out;
  },
  // a closed uniform jacket (gakuran / officer): body wrap, a stand collar, a column of buttons
  uniform: (o) => {
    const m = P(o.col, o.shade, 1.1), out = [ell([0, 0.24, 0.0], [0.355, 0.28, 0.31], m, 0.04), ell([0, 0.1, 0.0], [0.375, 0.1, 0.33], m, 0.05),
      cone([0.25, 0.4, 0.13], [0.285, 0.2, 0.2], 0.085, 0.12, m, 0.03), cone([-0.25, 0.4, 0.13], [-0.285, 0.2, 0.2], 0.085, 0.12, m, 0.03)];
    if (o.collar !== false) out.push(ell([0, 0.45, 0.02], [0.2, 0.05, 0.19], P(o.collar ?? o.col, null, 1.1), 0.02));
    for (let i = 0; i < (o.buttons ? 4 : 0); i++) out.push(ell([0, 0.4 - i * 0.075, 0.305 - i * 0.012], [0.017, 0.017, 0.012], P(o.buttons, null, 1), 0.005));
    if (o.stripe) out.push(cone([0.18, 0.4, 0.2], [0.21, 0.2, 0.26], 0.025, 0.025, P(o.stripe, null, 1), 0.0));
    return out;
  },
  // plate armour: breastplate, pauldrons, a tasset skirt
  armour: (o) => {
    const m = P(o.col ?? "#c4cad6", o.shade ?? "#6a7088", 1.2), tr = P(o.trim ?? "#d6a840", null, 1.1);
    return [ell([0, 0.3, 0.07], [0.31, 0.22, 0.25], m, 0.03), ell([0.3, 0.46, 0.0], [0.13, 0.075, 0.12], m, 0.03), ell([-0.3, 0.46, 0.0], [0.13, 0.075, 0.12], m, 0.03),
      cone([0, 0.14, 0.02], [0, 0.03, 0.02], 0.34, 0.4, m, 0.03), ell([0, 0.32, 0.31], [0.05, 0.05, 0.02], tr, 0.01), cone([0, 0.14, 0.02], [0, 0.12, 0.02], 0.345, 0.35, tr, 0.0)];
  },
  // a scarf: a wrap about the neck and a tail trailing back
  scarf: (o) => [ell([0, 0.44, 0.02], [0.27, 0.07, 0.25], P(o.col, o.shade, 1.1), 0.03), cone([0.12, 0.42, -0.2], [0.18, 0.1, -0.28], 0.05, 0.07, P(o.col, o.shade, 1.1), 0.02)],
  // a sash / belt about the waist
  sash: (o) => [ell([0, 0.18, 0.0], [0.365, 0.04, 0.325], P(o.col, o.shade, 1.1), 0.02), ell([0.1, 0.17, 0.32], [0.05, 0.05, 0.02], P(o.knot ?? o.col, null, 1), 0.01)],
};
const SHELL_CACHE = new Map();
function shellGeometry(layers, h) {
  if (!layers?.length) return null;
  const key = JSON.stringify([layers, h]);
  let g = SHELL_CACHE.get(key);
  if (g) return g;
  const prims = [];
  for (const L of layers) { const f = COSTUME_LAYERS[L.type]; if (!f) throw new Error(`costumed-seal-kit: no cloth layer "${L.type}" (have ${Object.keys(COSTUME_LAYERS).join(", ")})`); prims.push(...f(L)); }
  g = polygonize(prims, h);
  SHELL_CACHE.set(key, g);
  return g;
}

// ------------------------------------------------------------------ rigid props
const fig = (engine, geo, col, shade, o = {}) => {
  const f = engine.figure(painted(geo, paint(col, shade ?? darker(col, 0.55), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
  if (o.pos) f.position.set(...o.pos);
  if (o.rot) f.rotation.set(...o.rot);
  return f;
};
const cyl = (r0, r1, h, seg = 14) => new CylinderGeometry(r0, r1, h, seg);
export const HATS = {
  straw: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.36, 0.36, 0.022, 28), o.col ?? "#e8c56a", o.shade, { pos: [0, 0.77, 0.04], rot: [-0.08, 0, 0] }),
    fig(e, new SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), o.col ?? "#e8c56a", o.shade, { pos: [0, 0.775, 0.03] }),
    fig(e, new TorusGeometry(0.2, 0.02, 8, 24).rotateX(Math.PI / 2), o.trim ?? "#c4302b", null, { pos: [0, 0.8, 0.03] })); return g; },
  kasa: (e, o) => { const g = new Group(); g.add(fig(e, new ConeGeometry(0.42, 0.22, 28, 1, true), o.col ?? "#d8c08a", o.shade, { pos: [0, 0.9, 0.03], rot: [-0.1, 0, 0] })); return g; },
  top: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.15, 0.16, 0.3), o.col ?? "#1a1a24", o.shade, { pos: [0, 0.95, 0.03] }), fig(e, cyl(0.27, 0.27, 0.02, 24), o.col ?? "#1a1a24", o.shade, { pos: [0, 0.8, 0.03] }), fig(e, cyl(0.162, 0.162, 0.04), o.trim ?? "#c0302c", null, { pos: [0, 0.84, 0.03] })); return g; },
  pointed: (e, o) => { const g = new Group(); g.add(fig(e, new ConeGeometry(0.19, 0.55, 20), o.col ?? "#3a2a6a", o.shade, { pos: [0, 1.04, -0.02], rot: [-0.25, 0, 0] }), fig(e, cyl(0.32, 0.32, 0.02, 28), o.col ?? "#3a2a6a", o.shade, { pos: [0, 0.79, 0.03], rot: [-0.08, 0, 0] })); return g; },
  headband: (e, o) => { const g = new Group(); g.add(fig(e, new TorusGeometry(0.262, 0.018, 8, 32).rotateX(Math.PI / 2), o.col ?? "#1d2a52", o.shade, { pos: [0, 0.66, 0.03], rot: [0.12, 0, 0] }),
    fig(e, new BoxGeometry(0.15, 0.075, 0.014), o.trim ?? "#c9ced8", null, { pos: [0, 0.665, 0.277] })); return g; },
  crown: (e, o) => { const g = new Group(), c = o.col ?? "#f0bf3c"; g.add(fig(e, new CylinderGeometry(0.19, 0.17, 0.07, 18, 1, true), c, o.shade, { pos: [0, 0.82, 0.03] }));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(fig(e, new ConeGeometry(0.03, 0.12, 6), c, o.shade, { pos: [Math.sin(a) * 0.18, 0.9, 0.03 + Math.cos(a) * 0.18] })); } return g; },
  horns: (e, o) => { const g = new Group(); for (const s of [1, -1]) { const h = fig(e, horn(0.04, 0.2, 0.06 * s, 10, 1), o.col ?? "#e8e0d0", o.shade, { pos: [s * 0.13, 0.76, 0.1], rot: [0.2, 0, -s * 0.35] }); g.add(h); } return g; },
  helmet: (e, o) => { const g = new Group(); g.add(fig(e, new SphereGeometry(0.29, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), o.col ?? "#b8bfcc", o.shade, { pos: [0, 0.6, 0.03] }),
    fig(e, new BoxGeometry(0.03, 0.14, 0.34), o.trim ?? "#b02828", null, { pos: [0, 0.9, 0.0] })); return g; },
};
export const ACCESSORIES = {
  glasses: (e, o) => { const g = new Group(), c = o.col ?? "#2a2a34"; for (const s of [1, -1]) g.add(fig(e, new TorusGeometry(0.052, 0.008, 6, 20), c, null, { pos: [s * 0.122, 0.575, 0.282], lineMul: 0.5 }));
    g.add(fig(e, cyl(0.006, 0.006, 0.07, 6).rotateZ(Math.PI / 2), c, null, { pos: [0, 0.585, 0.284], lineMul: 0.5 })); return g; },
  eyepatch: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.06, 0.06, 0.012, 16).rotateX(Math.PI / 2), o.col ?? "#15131a", null, { pos: [0.122, 0.572, 0.285] })); return g; },
  mask: (e, o) => { const g = new Group(); g.add(fig(e, new SphereGeometry(0.13, 16, 10).scale(1.15, 0.75, 0.7), o.col ?? "#2a3a52", o.shade, { pos: [0, 0.47, 0.22] })); return g; },
};
const grip = (hand) => (hand === "l" ? [-0.27, 0.28, 0.25] : [0.27, 0.28, 0.25]);
export const WEAPONS = {
  sword: (e, o) => { const g = new Group(); g.add(fig(e, new BoxGeometry(0.022, 0.62, 0.008), o.col ?? "#cdd4e0", null, { pos: [0, 0.42, 0] }), fig(e, cyl(0.045, 0.045, 0.01, 12).rotateX(Math.PI / 2), o.trim ?? "#c9a24a", null, { pos: [0, 0.1, 0] }), fig(e, cyl(0.015, 0.015, 0.16, 8), o.hilt ?? "#1d1822", null, { pos: [0, 0.02, 0] })); return g; },
  broadsword: (e, o) => { const g = new Group(); g.add(fig(e, new BoxGeometry(0.07, 0.7, 0.012), o.col ?? "#cdd4e0", null, { pos: [0, 0.46, 0] }), fig(e, new BoxGeometry(0.2, 0.025, 0.03), o.trim ?? "#c9a24a", null, { pos: [0, 0.1, 0] }), fig(e, cyl(0.02, 0.02, 0.18, 8), o.hilt ?? "#3a2218", null, { pos: [0, 0.01, 0] })); return g; },
  staff: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.016, 0.02, 1.0, 8), o.col ?? "#6a4a2a", null, { pos: [0, 0.4, 0] }), fig(e, new TorusGeometry(0.08, 0.014, 8, 20), o.trim ?? "#d6a840", null, { pos: [0, 0.95, 0] }), fig(e, new SphereGeometry(0.04, 12, 10), o.gem ?? "#7a3ad8", null, { pos: [0, 0.95, 0] })); return g; },
  spear: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.014, 0.016, 1.1, 8), o.col ?? "#6a4a2a", null, { pos: [0, 0.4, 0] }), fig(e, new ConeGeometry(0.035, 0.22, 8), o.trim ?? "#cdd4e0", null, { pos: [0, 1.05, 0] })); return g; },
  scythe: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.014, 0.016, 1.0, 8), o.col ?? "#3a2a2a", null, { pos: [0, 0.4, 0] }), fig(e, new TorusGeometry(0.2, 0.014, 6, 20, 2.2).rotateZ(1.0), o.trim ?? "#cdd4e0", null, { pos: [0.18, 0.95, 0] })); return g; },
  wand: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.008, 0.012, 0.3, 6), o.col ?? "#4a3322", null, { pos: [0, 0.13, 0] }), fig(e, new SphereGeometry(0.02, 8, 6), o.gem ?? "#e8c04a", null, { pos: [0, 0.3, 0] })); return g; },
  pistol: (e, o) => { const g = new Group(); g.add(fig(e, new BoxGeometry(0.03, 0.05, 0.16), o.col ?? "#2a2a34", null, { pos: [0, 0.07, 0.04] }), fig(e, new BoxGeometry(0.028, 0.09, 0.035), o.col ?? "#2a2a34", null, { pos: [0, 0.02, -0.02], rot: [0.25, 0, 0] })); return g; },
  book: (e, o) => { const g = new Group(); g.add(fig(e, new BoxGeometry(0.16, 0.2, 0.04), o.col ?? "#6a2a30", null, { pos: [0, 0.1, 0] }), fig(e, new BoxGeometry(0.14, 0.18, 0.045), "#e8dcc0", null, { pos: [0.006, 0.1, 0] })); return g; },
  shield: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.17, 0.17, 0.03, 20).rotateX(Math.PI / 2), o.col ?? "#7a8aa8", null, { pos: [0, 0.18, 0] }), fig(e, new SphereGeometry(0.05, 10, 8), o.trim ?? "#d6a840", null, { pos: [0, 0.18, 0.02] })); return g; },
  lantern: (e, o) => { const g = new Group(); g.add(fig(e, cyl(0.004, 0.004, 0.22, 4), "#222", null, { pos: [0, 0.2, 0] }), fig(e, new SphereGeometry(0.06, 12, 10).scale(1, 1.2, 1), o.col ?? "#d84a3a", null, { pos: [0, 0.04, 0] })); return g; },
};

// ------------------------------------------------------------------ poses (whole-body transforms, seal-local) and reactions
// each returns channel deltas: x y z (m), rx ry rz (rad), sy sxz (scale), eye (x the painted/decal eye size), smear
const jit = (t, a, f) => a * Math.sin(t * f) * Math.cos(t * f * 1.7);
export const VICTIM_POSES = {
  stand: () => ({}),
  recoil: (k) => ({ z: -0.14 * k, y: 0.02 * k, rx: -22 * D2 * k * 1.7, sy: 1 + 0.03 * k }),
  kneel: (k) => ({ y: -0.1 * k, sy: 1 - 0.34 * k, sxz: 1 + 0.12 * k, rx: 8 * D2 * k, z: 0.05 * k }),
  blown: (k) => ({ y: 0.3 * Math.sin(Math.PI * Math.min(1, k * 1.1)) + 0.06 * k, z: -1.1 * k, rx: -72 * D2 * k, smear: 0.4 * Math.sin(Math.PI * Math.min(1, k)) }),
  terror: (k, t) => ({ x: jit(t, 0.012 * k, 83), y: 0.01 * k + jit(t, 0.006 * k, 71), sy: 1 + 0.05 * k, sxz: 1 - 0.025 * k, rx: -6 * D2 * k }),
  petrified: (k) => ({ rx: -8 * D2 * k, y: 0.0, sy: 1 + 0.02 * k }),
  cower: (k, t) => ({ y: -0.07 * k, sy: 1 - 0.26 * k, sxz: 1 + 0.1 * k, rx: 24 * D2 * k, ry: 0.5 * k, x: jit(t, 0.008 * k, 77) }),
  bow: (k) => ({ rx: 32 * D2 * k, z: 0.05 * k, y: -0.02 * k }),
  salute: (k) => ({ sy: 1 + 0.04 * k, rx: -4 * D2 * k }),
  fallen: (k) => ({ rz: 85 * D2 * k, y: 0.22 * k, x: -0.12 * k }),
  stagger: (k, t) => ({ rz: Math.sin(t * 9) * 0.22 * k, x: Math.sin(t * 9) * 0.05 * k, rx: -10 * D2 * k }),
};
const EYE_SIZE = { terror: 1.32, sad: 1.12, rage: 0.85, calm: 0.8, petrified: 0.82, shut: 0.08, awe: 1.2, smug: 0.75, neutral: 1 };
export const REACTIONS = {
  recoil: { pose: "recoil", expr: "terror", tint: null },
  kneel: { pose: "kneel", expr: "sad", tint: null },
  blown: { pose: "blown", expr: "terror", tint: null },
  terror: { pose: "terror", expr: "terror", tint: null },
  petrified: { pose: "petrified", expr: "petrified", tint: "#8d8d96" }, // stone grey, to full by k
  cower: { pose: "cower", expr: "terror", tint: null },
  bow: { pose: "bow", expr: "calm", tint: null },
  fallen: { pose: "fallen", expr: "shut", tint: null },
  stagger: { pose: "stagger", expr: "terror", tint: null },
};

// ------------------------------------------------------------------ the seal
export function costumedSeal(engine, spec = {}) {
  const sc = spec.scale ?? 0.55;
  const group = new Group(), pose = new Group();
  group.name = spec.name ?? "costumed-seal";
  group.add(pose);
  const body = makeBody(engine, spec, 0.011);
  pose.add(body);
  const u = body.userData.mat.uniforms, hu = body.userData.hull.uniforms, eye0 = u.uFace.value.w;
  const mats = [u], tintable = [u];
  // cloth shell (one mesh; no pup decals, so the belly never prints through a coat)
  let shell = null;
  const sg = shellGeometry(spec.layers, spec.h ?? 0.014);
  if (sg) { shell = engine.figure(sg, { head: PUP_HEAD2, ink: spec.ink ?? "#1a1420", lineMul: 1.2, constant: true }); shell.userData.geo = sg; pose.add(shell); mats.push(shell.userData.mat.uniforms); tintable.push(shell.userData.mat.uniforms); }
  // hair (clumps + the highlight cut)
  let hair = null;
  if (spec.hair) {
    const hs = typeof spec.hair === "string" ? defineHair(spec.hair) : spec.hair.preset ? defineHair(spec.hair.preset, spec.hair) : spec.hair;
    if (hs.count !== 0 || hs.tail || hs.fringe || hs.ridge) { hair = hairMesh(engine, hs, { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 }, { ink: spec.ink }); pose.add(hair); tintable.push(hair.userData.mat.uniforms); }
  }
  // anime eyes over the painted ones
  let eyes = null;
  if (spec.eyes) { eyes = eyePair(HEAD, spec.eyes); pose.add(eyes); u.uFace.value.x = 1; /* painted nose/mouth stay; the decal covers the painted eyes */ }
  // rigid props
  const props = new Group();
  if (spec.hat) props.add(HATS[spec.hat.kind]?.(engine, spec.hat) ?? new Group());
  for (const a of spec.accessories ?? []) props.add(ACCESSORIES[a.kind]?.(engine, a) ?? new Group());
  if (spec.weapon) {
    const w = WEAPONS[spec.weapon.kind]?.(engine, spec.weapon);
    if (w) { w.position.set(...grip(spec.weapon.hand)); w.rotation.set(spec.weapon.tilt?.[0] ?? 0, 0, spec.weapon.tilt?.[1] ?? 0); props.add(w); }
  }
  pose.add(props);
  for (const c of props.children) c.traverse((o) => { if (o.userData?.mat) tintable.push(o.userData.mat.uniforms); });
  const shadow = spec.shadow === false ? null : groundShadow(0.5, 0.4, spec.shadowTint ?? "#4a4f6e", 0.4);
  if (shadow) { shadow.position.y = 0.004; group.add(shadow); }
  group.scale.setScalar(sc);
  setLayer(group, 1);

  const stone = new Color("#8d8d96");
  const h = {
    group, body: pose, fig: body, shell, hair, eyes, props, shadow, height: 0.8 * sc, scale: sc,
    state: { poses: {}, expr: "neutral", exprK: 0, tintK: 0, tintCol: stone },
    // pose channels by name; setPose("kneel", 0.8) eases the whole body
    setPose(name, k = 1) { if (k <= 0) delete h.state.poses[name]; else h.state.poses[name] = k; return h; },
    expression(name, k = 1) { h.state.expr = name; h.state.exprK = k; return h; },
    tint(col, k = 1) { h.state.tintCol = new Color(col); h.state.tintK = k; return h; },
    // one call for a victim's reaction to the power: pose + expression + tint at strength k (0 = standing, 1 = fully reacted)
    react(kind, k = 1) {
      for (const n of Object.keys(h.state.poses)) delete h.state.poses[n];
      const R = REACTIONS[kind];
      if (!R || k <= 0) { h.state.exprK = 0; h.state.tintK = 0; return h; }
      h.setPose(R.pose, k).expression(R.expr, k);
      if (R.tint) h.tint(R.tint, k); else h.state.tintK = 0;
      return h;
    },
    place(x, y, z, yaw = 0) { group.position.set(x, y, z); group.rotation.y = yaw; return h; },
    lookAtPoint(x, z) { group.rotation.y = Math.atan2(x - group.position.x, z - group.position.z); return h; },
    // call each frame with the STEPPED time ts (twos/threes): the tremble and the stagger are frame-locked to it
    update(t) {
      const s = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sy: 1, sxz: 1, smear: 0 };
      for (const [n, k] of Object.entries(h.state.poses)) {
        const d = VICTIM_POSES[n]?.(k, t) ?? {};
        for (const c of ["x", "y", "z", "rx", "ry", "rz", "smear"]) s[c] += d[c] ?? 0;
        s.sy *= d.sy ?? 1; s.sxz *= d.sxz ?? 1;
      }
      pose.position.set(s.x, s.y, s.z); pose.rotation.set(s.rx, s.ry, s.rz); pose.scale.set(s.sxz, s.sy, s.sxz);
      // expression on the painted eyes (radius) or the decals
      const k = h.state.exprK;
      u.uFace.value.w = eye0 * (1 + ((EYE_SIZE[h.state.expr] ?? 1) - 1) * k);
      eyes?.userData.set(h.state.expr, k);
      // petrify and any other tint: shared uniforms on every part
      for (const m of tintable) { m.uTint.value.copy(h.state.tintCol); m.uTintAmt.value = h.state.tintK * 0.88; }
      u.uSmear.value.set(0, 0, -1, s.smear); hu.uSmear.value.copy(u.uSmear.value);
      engine.syncFaces(group);
    },
    dispose() { eyes?.userData.dispose?.(); group.traverse((o) => { if (o.isMesh && !o.userData.shared) { o.material?.dispose?.(); } }); },
  };
  h.update(0);
  return h;
}

// ------------------------------------------------------------------ example costume presets (data; cast agents add their own)
export const defineCostume = (base, o = {}) => ({ ...(COSTUMES[base] ?? base), ...o });
export const COSTUMES = {
  extra: { layers: [] },
  school: { layers: [{ type: "uniform", col: "#232f52", shade: "#0e1428", buttons: "#d8bd50" }], hair: "bob" },
  shinigami: { layers: [{ type: "coat", col: "#19171f", shade: "#08070c", open: 0.05 }, { type: "sash", col: "#e8e4d8" }], weapon: { kind: "sword", hand: "r" }, hair: "spiky" },
  haoriWhite: { layers: [{ type: "coat", col: "#eceae2", shade: "#9aa0c0", open: 0.07, trim: "#c8c4b8", collar: true }, { type: "sash", col: "#2a2833" }], hair: defineHair("forelock", { color: { base: "#4a3224", shade: "#241812", hi: "#8a6a50" } }), accessories: [{ kind: "glasses" }] },
  survey: { layers: [{ type: "cloak", col: "#3f5c3c", shade: "#1e3020", len: 0.9, collar: true, clasp: "#d6c070" }, { type: "uniform", col: "#8a6a44", shade: "#4a3822", buttons: "#cfcfcf" }], hair: "swept", weapon: { kind: "sword", hand: "r", tilt: [0, -0.5] } },
  armour: { layers: [{ type: "armour" }], hat: { kind: "helmet" }, weapon: { kind: "spear", hand: "r" } },
  wizard: { layers: [{ type: "cloak", col: "#3a2a6a", shade: "#150c32", len: 1, collar: "high", trim: "#d6a840" }], hat: { kind: "pointed" }, weapon: { kind: "staff", hand: "r" } },
  akatsuki: { layers: [{ type: "cloak", col: "#16141c", shade: "#07060a", len: 1, collar: "high", trim: "#c02828", spread: 1.1 }], hat: { kind: "kasa" } },
  royal: { layers: [{ type: "cape", col: "#b02838", shade: "#601018", trim: "#f0d070" }], hat: { kind: "crown" }, weapon: { kind: "broadsword", hand: "r" } },
};
export { defineHair, HAIR_PRESETS, groundShadow };
