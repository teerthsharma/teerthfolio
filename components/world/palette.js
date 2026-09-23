// The island's one material language. Island.jsx and every building draw
// their colours from C and their materials from mat() / lamp() / glow(), so
// nine files read as one crafted place instead of nine guesses.
//
// Every hex below is calibrated against LIGHT under NeutralToneMapping, using
// three's own shading maths checked against a real-Chrome capture (predicted
// and captured pixels agreed to within 1 level). Rendered values:
//   snow      sun rgb(246,237,237) L239 / shadow rgb(186,192,219) L193
//   warmWhite front wall L225 / shadow side L186
//   charcoal  lit top L50 / front L37 / shadow side L23 (the one dark)
//   sea       rgb(0,128,163) teal-blue
// Change LIGHT or the tone mapping and every one of these numbers moves.

import { AdditiveBlending, MeshBasicMaterial, MeshStandardMaterial, NeutralToneMapping } from "three";

export const C = {
  snow: "#faf6f0", // ground, snow caps, igloo blocks
  path: "#e4e8f0", // packed-snow paths between neighbourhoods: a cool step below snow, never grey
  warmWhite: "#f3ede4", // painted walls, plaster, ceramic
  ice: "#dbeaf5", // pale ice: cliff face, boulders, glassy blocks
  deepIce: "#8fc3e0", // ice in depth: lower cliff, seams, floes' sides
  sea: "#0c7490", // open water
  shallows: "#27a6b8", // water over the submerged shelf, near the cliff
  foam: "#ffffff",
  charcoal: "#43434c", // frames, roofs, rails, hatches: renders slate, not navy
  wood: "#c08a5e",
  woodDark: "#8a5a3c",
  metal: "#aab3c0", // brushed aluminium
  lamp: "#ffc46b", // warm window and door light (albedo)
  lampGlow: "#ffb347", // its emissive
  sky: "#cfe6f4", // background and fog
};

// The rig the colours above were solved for. Island.jsx applies the lights;
// Look.jsx the environment and, when post-processing runs, the tone map.
// The environment is the same sky-above / snow-below split as the hemisphere
// light (plus a sun disc and a band of sea for glossy reflections), and
// environment intensity k lights a matte surface like a hemisphere of
// intensity PI * k. So the hemisphere gave up PI * env of its old 2.7: matte
// colours land where they did, glossy ones now reflect a sky.
export const LIGHT = {
  toneMapping: NeutralToneMapping,
  hemiSky: "#d2dcff",
  hemiGround: "#eadfce",
  hemiIntensity: 2.7 - Math.PI * 0.5,
  env: 0.5, // scene.environmentIntensity
  envSun: 8, // radiance of the sun disc in the environment (highlights only)
  ao: "#98a2d6", // what full occlusion multiplies by: about the sun-to-shade ratio of snow, so creases go lavender, never grey
  sun: "#ffecd0",
  sunIntensity: 3,
};

const cache = new Map();
const cached = (key, make) => {
  let m = cache.get(key);
  if (!m) cache.set(key, (m = make()));
  return m;
};

// One shared MeshStandardMaterial per look. Never mutate the result: every
// mesh with the same arguments holds it. To animate a material, take
// useMemo(() => mat(...).clone(), []) once and mutate the clone.
export function mat(color, { flat = true, roughness = 0.75, metalness = 0, emissive = null, emissiveIntensity = 1, opacity = 1, vertexColors = false, side } = {}) {
  const key = `m|${color}|${flat}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}|${opacity}|${vertexColors}|${side}`;
  return cached(key, () => new MeshStandardMaterial({
    color, flatShading: flat, roughness, metalness,
    emissive: emissive || "#000000", emissiveIntensity,
    transparent: opacity < 1, opacity, vertexColors,
    ...(side === undefined ? null : { side }),
  }));
}

// A lit window, doorway or lamp lens: warm by default, or pass an accent.
export const lamp = (color = C.lamp, intensity = 1) => mat(color, { emissive: color === C.lamp ? C.lampGlow : color, emissiveIntensity: intensity, roughness: 0.5 });

// A soft halo shell around a lamp or core (no post-processing, so glow is
// geometry): additive, unlit, never casts or receives shadow.
export const glow = (color, opacity = 0.22) => cached(`g|${color}|${opacity}`, () => new MeshBasicMaterial({
  color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
}));
