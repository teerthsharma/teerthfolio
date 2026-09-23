// Seal A's skin: one glossy MeshPhysicalMaterial that paints the pup from the
// canonical attribute (countershading, flippers, cream freckled pads, blush,
// the smile crease) and skins the body in the vertex shader (head turn about
// the neck, flipper paddle and wave about the shoulders, tail sway, the
// travelling galumph hump, the turn bend). The shadow pass runs the same
// vertex code through customDepthMaterial, so the sun shadow moves with it.
//
// A.jsx writes the uniforms once per frame and mirrors the head transform on
// the CPU (lift -> bend -> neck rotation) so the eyes stay glued to the face.

import { FLIPPER_AT } from "./A-body";
import { Color, MeshDepthMaterial, MeshPhysicalMaterial, RGBADepthPacking, ShaderChunk, Vector2, Vector4 } from "three";

export const PALETTE = {
  dorsal: "#a9c3db",
  flank: "#dce8f2",
  belly: "#f6efe4",
  flipper: "#7f9cb8",
  flipperTip: "#62809f",
  pad: "#ecd6b3",
  freckle: "#7a6a5e",
  blush: "#f3a7b0",
  ink: "#2d3140",
};

const v3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(", ")})`;

// Shared by the colour pass and the shadow pass.
function vertexCommon(a) {
  return /* glsl */ `
attribute vec3 canonical;
uniform vec2 uLook;      // head yaw, pitch (+ lifts the nose)
uniform vec4 uFlip;      // left lift, left sweep, right lift, right sweep
uniform float uBend;     // turn: chest yaws +, tail yaws -
uniform float uPhase;    // galumph phase, radians
uniform float uLift;     // galumph hump height, m
uniform vec2 uTail;      // tail sway (x), tail lift (y), m
const vec3 NECK = ${v3(a.neck)};
const vec3 SHOULDER = ${v3(a.shoulder)};

mat3 sRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 sRotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 sRotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

float sealFore(vec3 c) {
  float rad = length(c.xy);
  float lat = abs(c.x) / max(rad, 1e-5);
  float g = (c.z - ${FLIPPER_AT.toFixed(3)}) / 0.24;
  return exp(-g * g) * pow(lat, 6.0) * smoothstep(0.2, 0.82, rad);
}

void sealDeform(inout vec3 p, inout vec3 n) {
  vec3 c = canonical;
  // Fore-flippers bend about the shoulder, more toward the tip.
  float side = c.x >= 0.0 ? 1.0 : -1.0;
  float fw = smoothstep(0.03, 0.45, sealFore(c));
  vec2 f = side > 0.0 ? uFlip.xy : uFlip.zw;
  vec3 piv = vec3(SHOULDER.x * side, SHOULDER.yz);
  mat3 rf = sRotZ(side * f.x * fw) * sRotY(side * f.y * fw);
  p = piv + rf * (p - piv);
  n = rf * n;
  // Tail: sway and flick, stronger toward the fork.
  float tz = smoothstep(0.35, 1.0, -c.z);
  p.x += uTail.x * tz * tz;
  p.y += uTail.y * tz * tz;
  // Head: turns about the neck; weight 1 over the whole face.
  float hw = smoothstep(0.30, 0.62, c.z);
  mat3 rh = sRotY(uLook.x * hw) * sRotX(-uLook.y * hw);
  p = NECK + rh * (p - NECK);
  n = rh * n;
  // Turn: the front half yaws into the turn, the back half away.
  mat3 rb = sRotY(uBend * clamp(c.z / 0.5, -1.0, 1.0));
  p = rb * p;
  n = rb * n;
  // Galumph: a hump runs nose to tail; the head rides it rigidly, and the
  // flipper tips stay planted (they are what pushes).
  float lag = (0.6 - min(c.z, 0.6)) * 1.6;
  p.y += uLift * max(0.0, sin(uPhase - lag)) * (1.0 - 0.85 * fw);
}
`;
}

function fragmentCommon(a) {
  const [padL, padR] = a.pads.map((p) => p.at);
  const [blushL, blushR] = a.blush.map((p) => p.at);
  return /* glsl */ `
uniform vec3 uDorsal, uFlank, uBelly, uFlipper, uFlipperTip, uPad, uFreckle, uBlush, uInk;
uniform float uSmile;
varying vec3 vCan;
varying vec3 vRest;
const vec3 SKULL = ${v3(a.skull)};
const vec3 PAD_L = ${v3(padL)};
const vec3 PAD_R = ${v3(padR)};
const vec3 BLUSH_L = ${v3(blushL)};
const vec3 BLUSH_R = ${v3(blushR)};
const vec3 MOUTH = ${v3(a.mouth.at)};

float sealFore(vec3 c) {
  float rad = length(c.xy);
  float lat = abs(c.x) / max(rad, 1e-5);
  float g = (c.z - ${FLIPPER_AT.toFixed(3)}) / 0.24;
  return exp(-g * g) * pow(lat, 6.0) * smoothstep(0.2, 0.82, rad);
}

// Freckles: seven dots per pad, laid out on the pad's face (x across, y up).
float sealFreckles(vec3 p, vec3 pad, float side) {
  vec2 q = vec2((p.x - pad.x) * side, p.y - pad.y);
  float d = 1.0;
  d = min(d, length(q - vec2(0.025, 0.035)));
  d = min(d, length(q - vec2(0.072, 0.018)));
  d = min(d, length(q - vec2(0.018, -0.018)));
  d = min(d, length(q - vec2(0.062, -0.036)));
  d = min(d, length(q - vec2(-0.022, 0.006)));
  d = min(d, length(q - vec2(0.100, -0.012)));
  d = min(d, length(q - vec2(-0.012, -0.050)));
  return 1.0 - smoothstep(0.013, 0.021, d);
}

vec3 sealAlbedo() {
  vec3 c = vCan;
  vec3 p = vRest;
  float rad = length(c.xy);
  float cphi = c.y / max(rad, 1e-5);
  // Countershading: ivory belly, pale flanks, an ice-blue saddle down the back
  // that runs on over the crown like a hood, leaving a pale face disc around
  // the eyes and muzzle (so the darks of the face sit on the lightest field).
  vec3 h = p - SKULL;
  float faceDir = dot(h, vec3(0.0, -0.1, 1.0)) / max(length(h), 1e-4);
  float faceDisc = smoothstep(0.52, 0.72, faceDir);
  vec3 col = mix(uBelly, uFlank, smoothstep(-0.7, -0.1, cphi));
  float saddle = smoothstep(0.05, 0.75, cphi) * (1.0 - faceDisc);
  col = mix(col, uDorsal, saddle * mix(1.0, 0.8, smoothstep(0.3, 0.6, c.z)));
  // Face: the lower face and chin go ivory like the belly.
  float face = faceDisc * (1.0 - smoothstep(-0.02, 0.12, h.y));
  col = mix(col, uBelly, face * 0.85);
  // Blush under the eyes.
  float blush = max(1.0 - smoothstep(0.0, 0.075, length(p - BLUSH_L)), 1.0 - smoothstep(0.0, 0.075, length(p - BLUSH_R)));
  col = mix(col, uBlush, blush * 0.4);
  // Muzzle pads with freckles.
  float padL = 1.0 - smoothstep(0.1, 0.13, length(p - PAD_L));
  float padR = 1.0 - smoothstep(0.1, 0.13, length(p - PAD_R));
  col = mix(col, uPad, max(padL, padR));
  float fr = max(sealFreckles(p, PAD_L, 1.0) * padL, sealFreckles(p, PAD_R, -1.0) * padR);
  col = mix(col, uFreckle, fr);
  // Smile crease: a small w under the pads, the shared charcoal.
  vec2 m = vec2(p.x - MOUTH.x, p.y - MOUTH.y);
  float ax = abs(m.x);
  float curve = 0.013 * cos(ax * 3.14159 / 0.045) * uSmile;
  float line = 1.0 - smoothstep(0.011, 0.018, abs(m.y - curve));
  line *= (1.0 - smoothstep(0.075, 0.09, ax)) * step(0.0, p.z - MOUTH.z + 0.08);
  col = mix(col, uInk, line);
  // Fore-flippers darken toward the tips; the tail fork the same.
  float fore = sealFore(c);
  vec3 flip = mix(uFlipper, uFlipperTip, smoothstep(0.45, 0.95, fore));
  col = mix(col, flip, smoothstep(0.1, 0.3, fore));
  float fork = smoothstep(0.62, 0.95, -c.z);
  col = mix(col, mix(uFlipper, uFlipperTip, smoothstep(0.8, 1.0, -c.z)), fork);
  return col;
}
`;
}

// A soft three-step on the direct light only: the old pup's gentle bands
// (and its cream crown band), with 0.08-wide edges and half the smooth term
// left in, so it reads as form rather than posterized.
const BANDED_LIGHTS = ShaderChunk.lights_physical_pars_fragment.replace(
  "vec3 irradiance = dotNL * directLight.color;",
  `float band = 0.42 * smoothstep(0.02, 0.1, dotNL) + 0.58 * smoothstep(0.42, 0.5, dotNL);
	vec3 irradiance = mix(dotNL, band, 0.45) * directLight.color;`,
);

export function makeSkin(a) {
  const uniforms = {
    uLook: { value: new Vector2() },
    uFlip: { value: new Vector4() },
    uBend: { value: 0 },
    uPhase: { value: 0 },
    uLift: { value: 0 },
    uTail: { value: new Vector2() },
    uSmile: { value: 1 },
    uDorsal: { value: new Color(PALETTE.dorsal) },
    uFlank: { value: new Color(PALETTE.flank) },
    uBelly: { value: new Color(PALETTE.belly) },
    uFlipper: { value: new Color(PALETTE.flipper) },
    uFlipperTip: { value: new Color(PALETTE.flipperTip) },
    uPad: { value: new Color(PALETTE.pad) },
    uFreckle: { value: new Color(PALETTE.freckle) },
    uBlush: { value: new Color(PALETTE.blush) },
    uInk: { value: new Color(PALETTE.ink) },
  };
  const vCommon = vertexCommon(a);

  const skin = new MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.42,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
  });
  skin.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${vCommon}\nvarying vec3 vCan;\nvarying vec3 vRest;`)
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvec3 sealP = position;\nsealDeform(sealP, objectNormal);")
      .replace("#include <begin_vertex>", "vec3 transformed = sealP;\nvCan = canonical;\nvRest = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${fragmentCommon(a)}`)
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = sealAlbedo();")
      .replace("#include <lights_physical_pars_fragment>", BANDED_LIGHTS);
  };
  skin.customProgramCacheKey = () => "seal-A-skin-v1";

  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${vCommon}`)
      .replace("#include <begin_vertex>", "vec3 transformed = position;\nvec3 sealN = vec3(0.0, 1.0, 0.0);\nsealDeform(transformed, sealN);");
  };
  depth.customProgramCacheKey = () => "seal-A-depth-v1";

  return { skin, depth, uniforms };
}
