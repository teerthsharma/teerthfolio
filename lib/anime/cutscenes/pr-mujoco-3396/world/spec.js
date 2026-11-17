// Numbers and geometry helpers shared by the BOOST modules of this cutscene. Pure: imports three and the shared inks only.
import { BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { INK, U } from "../ink.js";

export const WP = { H: 20, T: 6, STEP: 6, NEAR: 54, FLANK: 420 }; // the live Wall (live/world.js WALL, NEAR)
export const ORDER = { sky: 1000, far: 1000.5, ground: 1001, set: 1002, dress: 1003, haze: 1008, smoke: 1010 };
export const BUDGET = { calls: 12, tris: 160000 }; // what every BOOST module adds together
export const SUN = [0.22, 0.16, -0.96]; // the live uSun: toward the low sun behind the Wall
export const FAR = { z: -845, sun: 840 };
export const TARGET = {
  cobbles: "#513204", wallShadow: "#552B01", wallLit: "#8C6D41", roof: "#96360E", gap: "#EBA880", gapBand: "#DBBF8F",
  snow: "#F3EEF1", gilt: "#624102", lit: "#E6A833",
};

// every part of a merged mesh: non-indexed, no uv, facet normals, a tone in the vertex colour
export function part(g, tone = 1) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.computeVertexNormals();
  const c = new Float32Array(n.attributes.position.count * 3).fill(tone);
  n.setAttribute("color", new BufferAttribute(c, 3));
  return n;
}
export function place(g, x, y, z, ry = 0) {
  if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
}
export const merge = (list) => mergeGeometries(list);

const MAIN = /void\s+main\s*\(\s*\)/;
// a card already toned by tone(): it takes the painting's burn (discard in the hole, charred band, ember edge)
export function burnable(m) {
  const f = m.fragmentShader;
  if (f.split(MAIN).length !== 2 || f.includes("uBurnC")) return m;
  m.fragmentShader = f.replace(MAIN, "void cardMain()") + INK + "\nvoid main() { cardMain(); vec3 b = burn(pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2))); gl_FragColor.rgb = pow(max(b, vec3(0.0)), vec3(2.2)); }\n";
  Object.assign(m.uniforms, U);
  m.needsUpdate = true;
  return m;
}
export const SHORE = { x: 40, z0: 1.4, z1: 4.6, y: -0.05, water: "#1C4A62", foam: "#9CC9DC" };
export const BLAZE = { fromScene: 10.35, toScene: 11.5, near: 1.5, far: 15.0, keep: [1.0, 0.84, 0.45] };
export const GILT = { core: [2.6, 0.8], plates: [2.6, 0.8], faces: [2.0, 0.6], titans: [0.9, 0.28] }; // gold-leaf rim [strength, cap] per mesh (T9)
export const FLOOR2 = { gold: [1.0, 0.78, 0.38], mortar: 0.3, streakW: 1.5, streakK: 0.12, sett: [2.0, 2.8] }; // the flex floor (T12)
export const SUNCARD = { at: [0, 30, -835], size: 260, core: "#FFF2BF", halo: "#FFCC4D", a: 0.9 }; // the sun glow in the gap (T13)
export const MIST2 = [{ z: -140, a: 0.10, size: [700, 30] }, { z: -330, a: 0.14, size: [900, 34] }]; // depth haze (T14)
export const HOME = { rock: "#9A8A86", snow: "#FFF6F6", sunC: [0.72, 0.64, 0.52] }; // home grade starting values (T15)
export const SEA = { bands: ["#3F86A6", "#4A92B2", "#5A98B8"], foam: "#EAF3F6", foamW: 0.3 }; // the return's sea (T16)
