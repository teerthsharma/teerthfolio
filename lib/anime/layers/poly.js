// Extra triangles go here only. Face, costume fold, hand, hair clump, set-edge.
// Eye-land holds the density. Far plates stay cards. Polygons = silhouette.

import { STASHES } from "./protocol.js";

export const EXTRA_TRIS = Object.freeze([
  "face",
  "costume-fold",
  "hand",
  "hair-clump",
  "set-edge",
]);

function freezeLand(l) {
  if (!l || typeof l.id !== "string") throw new Error("poly land missing id");
  if (!Number.isInteger(l.stash) || l.stash < 0 || l.stash > 4) {
    throw new Error(`poly land ${l.id}: stash ${l.stash}`);
  }
  if (!STASHES[l.stash]) throw new Error(`poly land ${l.id}: no stash ${l.stash}`);
  return Object.freeze({
    id: l.id,
    stash: l.stash,
    density: l.density,
    far: "card",
    tris: l.tris,
  });
}

export const LAND = Object.freeze({
  FACE: freezeLand({
    id: "face",
    stash: 1,
    density: "eye-land",
    tris: "eyes",
  }),
  FOLD: freezeLand({
    id: "costume-fold",
    stash: 1,
    density: "crease",
    tris: "one-plane",
  }),
  HAND: freezeLand({
    id: "hand",
    stash: 1,
    density: "silhouette",
    tris: "mitten",
  }),
  HAIR: freezeLand({
    id: "hair-clump",
    stash: 1,
    density: "mass",
    tris: "clump",
  }),
  EDGE: freezeLand({
    id: "set-edge",
    stash: 0,
    density: "contour",
    tris: "outline",
  }),
});

export const LANDS = Object.freeze([
  LAND.FACE,
  LAND.FOLD,
  LAND.HAND,
  LAND.HAIR,
  LAND.EDGE,
]);

export const FAR_PLATE = Object.freeze({
  id: "far-plate",
  stash: 0,
  density: 0,
  far: "card",
  tris: 0,
});

export function mayAddTris(kind) {
  if (kind === "far-plate") return false;
  return EXTRA_TRIS.includes(kind);
}

export function landById(id) {
  if (id === FAR_PLATE.id) return FAR_PLATE;
  const l = LANDS.find((x) => x.id === id);
  if (!l) throw new Error(`poly land not found: ${id}`);
  return l;
}

export const POLY_GLSL = /* glsl */ `
#ifndef LY_POLY_KIT
#define LY_POLY_KIT
// Lands where extra triangles are legal. Eye-land is the density. Far is a card.
uniform float uEyeLand;
uniform float uFarCard;

vec2 lyEyeL() { return lyFigC() + vec2(-0.11, 0.16); }
vec2 lyEyeR() { return lyFigC() + vec2(0.11, 0.16); }

float lyLandEye(vec2 p) {
  float a = lyEllipse(p, lyEyeL(), vec2(0.055, 0.036));
  float b = lyEllipse(p, lyEyeR(), vec2(0.055, 0.036));
  return max(lyFill(a), lyFill(b));
}

float lyLandFace(vec2 p) {
  float face = lyEllipse(p, lyFigC() + vec2(0.0, 0.12), vec2(0.22, 0.20));
  return lyFill(face) * lyCover(p);
}

float lyLandFold(vec2 p) {
  vec2 q = p - lyFigC();
  float crease = abs(q.x * 0.55 + q.y * 0.82 + 0.05);
  return lyLine(crease, 1.55) * lyCover(p) * step(0.0, -q.y + 0.04);
}

float lyLandHand(vec2 p) {
  return lyFill(length(p - (lyFigC() + vec2(0.38, -0.22))) - 0.068);
}

float lyLandHair(vec2 p) {
  float c0 = lyFill(length(p - (lyFigC() + vec2(-0.16, 0.34))) - 0.10);
  float c1 = lyFill(length(p - (lyFigC() + vec2(0.18, 0.36))) - 0.09);
  float c2 = lyFill(length(p - (lyFigC() + vec2(0.02, 0.42))) - 0.08);
  return max(c0, max(c1, c2));
}

float lyLandEdge(vec2 p) {
  float sil = lyLine(lyFigD(p), 2.15);
  float hz = lyLine(p.y - 0.28, 1.35);
  return max(sil, hz * (1.0 - lyCover(p)));
}

float lyLandFar(vec2 p) {
  vec2 d = abs(p - vec2(0.28, 0.62)) - vec2(0.22, 0.16);
  return lyFill(max(d.x, d.y));
}

// Density mask: eyes take the loops. Everything else is a card or a crease.
float lyEyeDensity(vec2 p) {
  return lyLandEye(p) * max(uEyeLand, 0.0);
}

vec3 lyMarkLand(vec3 shaderCol, vec2 p, float land, vec3 mark) {
  return lyPolice(mix(shaderCol, mark, land * 0.55));
}
#endif
`;

export const polyKit = {
  name: "polyKit",
  doc: "extra triangles: face / costume-fold / hand / hair-clump / set-edge only — eye-land density, far plates stay cards",
  deps: ["layerKit"],
  uniforms: () => ({
    uEyeLand: { value: 1 },
    uFarCard: { value: 1 },
  }),
  glsl: POLY_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec3 lit = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    vec3 plate = mix(lyPaper(p) * 0.5, lit, lyCover(p));
    plate = mix(plate, vec3(0.72, 0.42, 0.32), lyLandEye(p) * 0.55);
    plate = mix(plate, vec3(0.40, 0.36, 0.50), lyLandFar(p) * 0.35 * uFarCard);
    return lyPolice(mix(plate, LY_INK, lyLandEdge(p) * 0.7));
  }`,
};

export const poly = {
  LAND,
  LANDS,
  FAR_PLATE,
  EXTRA_TRIS,
  mayAddTris,
  landById,
  polyKit,
};
