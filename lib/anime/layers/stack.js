// Compose graphic passes over shader kits.
// shader → poly silhouette → graphic pass → stash blend → luma 0.92.
// Routes into the five stashes. Does not invent a sixth.

import { STASHES, BLENDS, lumaCap, inkLift, LUMA_MAX } from "./protocol.js";
import { PASSES, PASS_LIST, BLEND_INDEX } from "./graphics.js";
import { mayAddTris } from "./poly.js";

export const PIPE = Object.freeze(["shader", "poly", "graphic", "stash", "luma"]);

function mix3(a, b, t) {
  const u = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export function blendRgb(mode, dst, src, cov = 1) {
  if (!BLENDS.includes(mode)) throw new Error(`stack blend ${mode}`);
  const c = Math.max(0, Math.min(1, cov));
  let out;
  if (mode === "multiply") {
    out = [dst[0] * src[0], dst[1] * src[1], dst[2] * src[2]];
  } else if (mode === "screen") {
    out = [1 - (1 - dst[0]) * (1 - src[0]), 1 - (1 - dst[1]) * (1 - src[1]), 1 - (1 - dst[2]) * (1 - src[2])];
  } else if (mode === "add-clamped") {
    out = lumaCap([dst[0] + src[0] * c, dst[1] + src[1] * c, dst[2] + src[2] * c]);
  } else {
    out = src;
  }
  return lumaCap(inkLift(mix3(dst, out, c)));
}

export function routePass(pass) {
  const stash = STASHES[pass.stash];
  if (!stash) throw new Error(`stack: pass ${pass.id} stash ${pass.stash} outside 0-4`);
  return stash;
}

export function stackPasses(passes) {
  const list = Array.from(passes == null ? PASS_LIST : passes);
  for (const p of list) routePass(p);
  return Object.freeze(
    list.slice().sort((a, b) => a.stash - b.stash || a.id.localeCompare(b.id)),
  );
}

/** shader → poly floor → graphic over → stash blend → luma 0.92. */
export function composeStack({ shaderRgb, graphicRgb, pass, cov = 1 }) {
  if (!pass) throw new Error("composeStack: pass");
  routePass(pass);
  const sil = inkLift(shaderRgb);
  const over = blendRgb(pass.blend, sil, graphicRgb, cov);
  return lumaCap(over);
}

export function explainStack(pass) {
  const stash = routePass(pass);
  return Object.freeze({
    pipe: PIPE,
    shader: "light",
    poly: "silhouette",
    graphic: pass.id,
    stash: stash.id,
    blend: pass.blend,
    blendIndex: BLEND_INDEX[pass.blend],
    when: pass.when,
    luma: LUMA_MAX,
  });
}

export const STACK_GLSL = /* glsl */ `
#ifndef LY_STACK_KIT
#define LY_STACK_KIT
// shader → poly silhouette → graphic → stash blend → luma 0.92
uniform float uStackCov;
uniform float uBlendMode;

vec3 lyShade(vec2 p) {
  float h = lyNdL(p);
  return mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
}

vec3 lyPolySil(vec3 shaderCol, float d) {
  return mix(shaderCol, LY_INK, lyLine(d, 1.8) * 0.88);
}

vec3 lyGStack(vec3 shaderCol, float silD, vec3 graphicCol, int mode, float cov) {
  return lyBlend(mode, lyPolySil(shaderCol, silD), graphicCol, cov);
}

vec3 lyShadePlate(vec2 p) {
  return mix(lyPaper(p) * 0.5, lyShade(p), lyCover(p));
}
#endif
`;

export const stackKit = {
  name: "stackKit",
  doc: "compose graphic over shader: shader → poly silhouette → graphic pass → stash blend → luma 0.92",
  deps: ["layerKit", "graphicKit", "polyKit"],
  uniforms: () => ({
    uStackCov: { value: 1 },
    uBlendMode: { value: 0 },
  }),
  glsl: STACK_GLSL,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaint(lit, p, uPaintWet, uPaintChip);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAINT_BLEND, uStackCov);
  }`,
};

export const stack = {
  PIPE,
  PASSES,
  blendRgb,
  routePass,
  stackPasses,
  composeStack,
  explainStack,
  mayAddTris,
  stackKit,
};
