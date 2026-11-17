// HERO DRESS: the outfit as one skinned geometry (shells on the body bone, sleeves, cuffs and pauldrons on the
// arm bones) and the headwear (hair plus accessories, head-local, one geometry). The garment builders live in
// wear/garments.js, the accessories in wear/acc.js, held props in wear/props.js, shared geometry in wear/geo.js.
import { CatmullRomCurve3, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cone, ell } from "../../sdf.js";
import { HAIR_PRESETS, hairGeometry } from "./hair.js";
import { BONE, DOME, V2, armJoints, cached, darker, mirrorX, piece, withBone } from "./body.js";
import { VOX, clipped, pg, taper } from "./wear/geo.js";
import { LAYERS } from "./wear/garments.js";
import { ACC } from "./wear/acc.js";

export { propGeometry, propFigure, PROPS } from "./wear/props.js";
export const OUTFITS = ["uniform", "jacket", "blazer", "vest", "tabard", "gi", "tunic", "coat", "haori", "cloak", "mantle", "kimono", "robe", "armour", "cuirass", "plate", "collar", "bracers", "cape", "scarf", "scarfX", "sash", "belt", "choker", "necklace", "bands", "bare", "prop"];
export const ACCESSORIES = ["horns", "blindfold", "earrings", "studs", "crown", "circlet", "headband", "protector", "clip", "glasses", "hood"];
export const HAIR_STYLES = [...Object.keys(HAIR_PRESETS), "none"];


const sleeveEnd = (o) => o.endAt ?? armJoints(1).W[1] + (o.wide ? -0.012 : o.cuffAt ?? 0.006);
function sleevePrims(o, m, trim) {
  const { S, E, W } = armJoints(1), up = [ell(S, [0.075, 0.075, 0.075], m, 0.02), cone(S, E, 0.069, 0.063, m, 0.02)];
  const end = sleeveEnd(o), cut = (x, y) => end - y;
  if (o.wide) { // a flared sleeve, hollow at the mouth so the hand comes out of it
    const outer = cone(E, [W[0], end - 0.02, W[2]], 0.068, 0.108, m, 0.02), inner = cone([E[0], E[1] - 0.04, E[2]], [W[0], end - 0.06, W[2]], 0.046, 0.094, m, 0.0);
    return { upper: up, fore: [clipped([ell(E, [0.066, 0.066, 0.066], m, 0.02), outer], (x, y, z) => Math.max(cut(x, y), -inner.f(x, y, z, inner)), m)] };
  }
  const inner = cone([W[0], end + 0.05, W[2]], [W[0], end - 0.03, W[2]], 0.046, 0.047, m, 0), mouth = (x, y, z) => Math.max(cut(x, y), -inner.f(x, y, z, inner));
  const fore = [clipped([ell(E, [0.064, 0.064, 0.064], m, 0.02), cone(E, W, 0.062, 0.058, m, 0.02)], mouth, m)];
  if (trim) fore.push(clipped([cone([W[0], end + 0.024, W[2]], [W[0], end, W[2]], 0.061, 0.061, trim, 0.004)], mouth, trim));
  return { upper: up, fore };
}

// the cuff rim and the elbow creases: small exact pieces on the forearm bone, mirrored for the left arm
function sleeveExtras(s) {
  const { E, W } = armJoints(1), end = sleeveEnd(s), parts = [];
  if (s.rim) parts.push(piece(new TorusGeometry(s.wide ? 0.105 : 0.0615, s.wide ? 0.0065 : 0.0052, 6, 36).rotateX(Math.PI / 2).translate(W[0], end, W[2]), s.rim, darker(s.rim, 0.55), { line: 1 }));
  const sh = darker(s.m.shade.getHexString ? `#${s.m.shade.getHexString()}` : "#222222", 0.8), rr = s.wide ? 0.072 : 0.066;
  for (const dy of [0.024, 0.046]) {
    const pts = []; for (let a = -0.95; a <= 0.95; a += 0.19) pts.push(new Vector3(E[0] + Math.sin(a) * rr, E[1] - dy + 0.01 * Math.cos(a * 2), E[2] + Math.cos(a) * rr));
    parts.push(piece(new TubeGeometry(new CatmullRomCurve3(pts), 14, 0.0024, 5, false), sh, darker(sh, 0.7), { line: 0.4 }));
  }
  for (const a of [-0.5, 0, 0.5]) { // three crease wedges fanning out of the inner elbow
    const pts = []; for (let t = 0; t <= 1; t += 0.25) pts.push(new Vector3(E[0] + Math.sin(a * 1.3) * rr * 0.98, E[1] - 0.012 - t * 0.075, E[2] + Math.cos(a * 1.3) * rr * 0.98 + 0.0015));
    parts.push(piece(taper(pts, 0.0042, 0.0006, 8, 4), sh, darker(sh, 0.7), { line: 0.3 }));
  }
  const g = mergeGeometries(parts);
  return { r: withBone(g, BONE.foreR), l: withBone(mirrorX(g), BONE.foreL) };
}

function outfitGeometry(list) {
  const st = { g: 0, sleeve: null }, parts = [];
  for (const o of list) for (const p of (LAYERS[o.kind] ?? LAYERS.bare)(o, st)) parts.push(p.bone === null ? p.geo : withBone(p.geo, p.bone));
  if (st.sleeve) {
    const s = sleevePrims(st.sleeve, st.sleeve.m, st.sleeve.trim);
    const up = withBone(pg(s.upper, 0.006), BONE.upperR), fo = withBone(pg(s.fore, 0.0045), BONE.foreR), x = sleeveExtras(st.sleeve);
    parts.push(up, fo, withBone(mirrorX(up), BONE.upperL), withBone(mirrorX(fo), BONE.foreL), x.r, x.l);
  }
  return parts.length ? mergeGeometries(parts) : null;
}


function headwearGeometry(spec, tier) {
  const parts = [];
  const hair = V2 ? null : hairGeometry(spec.hair, { tier });
  if (hair) parts.push(hair);
  for (const a of spec.acc) for (const g of ACC[a.kind]?.(a) ?? []) parts.push(g.index ? g.toNonIndexed() : g);
  return parts.length ? mergeGeometries(parts) : null;
}

// cloth voxel size by engine tier: 3 = full, 2 about a third of the triangles, 0 and 1 about a tenth
const TIER_VOX = [3.4, 3.4, 1.8, 1];
export function dressHero(spec, tier = 3) {
  const outfit = cached(`outfit|${tier}|${JSON.stringify(spec.outfit)}`, () => {
    VOX.k = TIER_VOX[Math.max(0, Math.min(3, tier | 0))];
    try { return outfitGeometry(spec.outfit); } finally { VOX.k = 1; }
  });
  const headwear = cached(`head|${V2}|${tier}|${JSON.stringify([spec.hair, spec.acc])}`, () => headwearGeometry(spec, Math.max(0, Math.min(3, tier | 0))));
  return { outfit, headwear, hideEyes: spec.acc.some((a) => a.kind === "blindfold" && !a.up), outfitInk: spec.outfit[0]?.ink };
}
