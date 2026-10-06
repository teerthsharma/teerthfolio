// Shader improvement protocols. String kits + JS appliers. Not a runtime compile.
// apply(frag, flags) prepends each selected kit once (guarded by LY_P*).
// Depends on ly* from stash.glsl.js — that kit is prepended first, once.

import { STASH_GLSL } from "./stash.glsl.js";

function once(frag, marker, kit) {
  const src = String(frag ?? "");
  if (src.includes(marker)) return src;
  return `${kit}\n${src}`;
}

function prependStash(frag) {
  return once(frag, "LY_STASH_KIT", STASH_GLSL);
}

function makeApply(marker, glsl) {
  return function apply(frag, flags) {
    if (flags === false) return String(frag ?? "");
    return once(prependStash(frag), marker, glsl);
  };
}

const P0_GLSL = /* glsl */ `
#ifndef LY_P0
#define LY_P0
// P0 silhouette lock: poly edges stay. Shader colour cannot dissolve the rim.
float lySil(float d) { return lyLine(d, 1.8); }
vec3 lyLockSil(vec3 col, float d, float k) {
  float rim = lySil(d);
  vec3 inked = mix(col, LY_INK, rim * k);
  return mix(inked, LY_INK, rim * rim * 0.35);
}
#endif
`;

const P1_GLSL = /* glsl */ `
#ifndef LY_P1
#define LY_P1
// P1 cel quantize: 2 / 3 / 5 hard plates, fwidth at each cut.
vec3 lyCel(float h, float steps) {
  float n = max(floor(steps + 0.5), 2.0);
  float t = clamp(h, 0.0, 1.0) * (n - 1.0);
  float f = fract(t);
  float w = fwidth(t) * 0.75 + 1e-5;
  float u = (floor(t) + smoothstep(0.5 - w, 0.5 + w, f)) / (n - 1.0);
  vec3 a = mix(LY_FILL, LY_MID, clamp(u * 2.0, 0.0, 1.0));
  return lyCap(mix(a, LY_KEY, clamp(u * 2.0 - 1.0, 0.0, 1.0)));
}
#endif
`;

const P2_GLSL = /* glsl */ `
#ifndef LY_P2
#define LY_P2
// P2 ink weight: fwidth hairline, concave thicken where N bends in.
float lyConcave(vec2 p) {
  vec3 N = lyFigN(p);
  return length(vec2(dFdx(N.x) + dFdy(N.x), dFdx(N.y) + dFdy(N.y)));
}
float lyInkW(float d, float concave, float px) {
  float w = fwidth(d) * px * mix(0.65, 2.7, clamp(concave * 8.0, 0.0, 1.0)) + 1e-5;
  return 1.0 - smoothstep(0.0, w, abs(d));
}
#endif
`;

const P3_GLSL = /* glsl */ `
#ifndef LY_P3
#define LY_P3
// P3 hatch in shadow only. Lit plates stay clean.
vec3 lyHatchSh(vec3 col, vec2 fc, float shadow, float pitch) {
  float g = abs(fract((fc.x + fc.y) / max(pitch, 1.0)) - 0.5) * 2.0;
  float stroke = 1.0 - smoothstep(0.42, 0.58, g);
  float sh = lyAA(shadow, 0.34);
  return mix(col, LY_INK, stroke * sh * 0.72);
}
#endif
`;

const P4_GLSL = /* glsl */ `
#ifndef LY_P4
#define LY_P4
// P4 luma police: floor off #000, cap 0.92.
vec3 lyLumaPolice(vec3 c) { return lyPolice(c); }
#endif
`;

const P5_GLSL = /* glsl */ `
#ifndef LY_P5
#define LY_P5
// P5 emit isolate: glow only via uEmit. Albedo never blooms itself.
vec3 lyEmitOnly(vec3 albedo, vec3 glow) { return lyEmit(albedo, glow); }
#endif
`;

const P6_GLSL = /* glsl */ `
#ifndef LY_P6
#define LY_P6
// P6 paper / print grade. Magenta fill, green key, tooth of the page.
vec3 lyPrint(vec3 col, vec2 p) {
  float L = lyLuma(col);
  vec3 split = mix(col * vec3(1.06, 0.94, 1.04), col * vec3(0.94, 1.05, 0.96), smoothstep(0.28, 0.72, L));
  return lyCap(mix(split, lyPaper(p), 0.10));
}
vec3 lyNight(vec3 col) {
  float L = lyLuma(col);
  vec3 lifted = mix(LY_INK * 1.6, col, smoothstep(0.02, 0.22, L));
  return lyCap(mix(lifted, lifted * vec3(0.82, 0.86, 0.95), smoothstep(0.55, 0.92, L)) * vec3(0.78, 0.82, 1.02));
}
vec3 lyGold(vec3 col) {
  return lyCap(mix(col, mix(vec3(0.28, 0.18, 0.16), vec3(0.90, 0.68, 0.36), smoothstep(0.3, 0.78, lyLuma(col))), 0.6));
}
#endif
`;

const P7_GLSL = /* glsl */ `
#ifndef LY_P7
#define LY_P7
// P7 screen-space ellipse seal. Hero hole; glued plate around it.
vec3 lyMaskSeal(vec3 plate, vec3 glue, vec2 p, vec2 c, vec2 rad) {
  return mix(glue, plate, lyFill(lyEllipse(p, c, rad)));
}
#endif
`;

const P8_GLSL = /* glsl */ `
#ifndef LY_P8
#define LY_P8
// P8 stepped-time hold. 12 / 24 fps. Same law as engine floor(t*fps)/fps.
float lyStep(float t, float fps) { return lyHold(t, fps); }
#endif
`;

const P9_GLSL = /* glsl */ `
#ifndef LY_P9
#define LY_P9
// P9 layer stash: sample previous stash via uPlate, else fallback colour.
vec3 lyPrev(vec2 uv, vec3 fallback) { return lyPlate(uv, fallback); }
#endif
`;

export const PROTOCOLS = Object.freeze({
  P0: Object.freeze({
    id: "P0",
    name: "silhouette-lock",
    marker: "LY_P0",
    glsl: P0_GLSL,
    apply: makeApply("LY_P0", P0_GLSL),
  }),
  P1: Object.freeze({
    id: "P1",
    name: "cel-quantize",
    marker: "LY_P1",
    glsl: P1_GLSL,
    apply: makeApply("LY_P1", P1_GLSL),
  }),
  P2: Object.freeze({
    id: "P2",
    name: "ink-weight",
    marker: "LY_P2",
    glsl: P2_GLSL,
    apply: makeApply("LY_P2", P2_GLSL),
  }),
  P3: Object.freeze({
    id: "P3",
    name: "hatch-shadow",
    marker: "LY_P3",
    glsl: P3_GLSL,
    apply: makeApply("LY_P3", P3_GLSL),
  }),
  P4: Object.freeze({
    id: "P4",
    name: "luma-police",
    marker: "LY_P4",
    glsl: P4_GLSL,
    apply: makeApply("LY_P4", P4_GLSL),
  }),
  P5: Object.freeze({
    id: "P5",
    name: "emit-isolate",
    marker: "LY_P5",
    glsl: P5_GLSL,
    apply: makeApply("LY_P5", P5_GLSL),
  }),
  P6: Object.freeze({
    id: "P6",
    name: "paper-print",
    marker: "LY_P6",
    glsl: P6_GLSL,
    apply: makeApply("LY_P6", P6_GLSL),
  }),
  P7: Object.freeze({
    id: "P7",
    name: "screen-mask",
    marker: "LY_P7",
    glsl: P7_GLSL,
    apply: makeApply("LY_P7", P7_GLSL),
  }),
  P8: Object.freeze({
    id: "P8",
    name: "stepped-hold",
    marker: "LY_P8",
    glsl: P8_GLSL,
    apply: makeApply("LY_P8", P8_GLSL),
  }),
  P9: Object.freeze({
    id: "P9",
    name: "layer-stash",
    marker: "LY_P9",
    glsl: P9_GLSL,
    apply: makeApply("LY_P9", P9_GLSL),
  }),
});

export const PROTOCOL_ORDER = Object.freeze([
  "P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9",
]);

function selected(flags, proto) {
  if (flags == null || flags === true || flags.all) return true;
  if (flags === false) return false;
  if (flags[proto.id] === false || flags[proto.name] === false) return false;
  if (flags[proto.id] || flags[proto.name]) return true;
  const keys = Object.keys(flags);
  if (keys.length === 0) return true;
  return false;
}

/** Prepend stash kit + each flagged protocol kit, each at most once. */
export function apply(frag, flags) {
  let out = prependStash(frag);
  for (const id of PROTOCOL_ORDER) {
    const proto = PROTOCOLS[id];
    if (!selected(flags, proto)) continue;
    out = once(out, proto.marker, proto.glsl);
  }
  return out;
}

export const improve = {
  PROTOCOLS,
  PROTOCOL_ORDER,
  apply,
};
