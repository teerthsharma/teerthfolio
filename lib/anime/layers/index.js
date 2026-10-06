// Architectural protocol for the five-stash compositor.
// Parent wires: import { LAYER_TOOLS } from "./layers/index.js";
// Do not edit engine.js / material.js / catalog.js / cutscenes / tools from here.

import { layerKit, STASH_GLSL, snippets } from "./stash.glsl.js";
import {
  STASH,
  STASHES,
  COMPOSE,
  composeStashes,
  lumaCap,
  inkLift,
  emitGate,
  protocol,
} from "./protocol.js";
import { PROTOCOLS, PROTOCOL_ORDER, apply, improve } from "./improve.js";
import { GRAPHIC_PASSES, GRAPHIC_PASS_SHADER_COUNT } from "./graphic-preview.js";
import {
  PASSES,
  PASS_LIST,
  PASS_NAMES,
  BLEND_INDEX,
  passById,
  graphicKit,
  GRAPHIC_GLSL,
  graphics,
} from "./graphics.js";
import {
  LAND,
  LANDS,
  FAR_PLATE,
  EXTRA_TRIS,
  mayAddTris,
  landById,
  polyKit,
  POLY_GLSL,
  poly,
} from "./poly.js";
import {
  PIPE,
  blendRgb,
  routePass,
  stackPasses,
  composeStack,
  explainStack,
  stackKit,
  STACK_GLSL,
  stack,
} from "./stack.js";
import {
  genshinKit,
  STACK_KITS,
  STACK_KIT_COUNT,
  planDock,
  loadCached,
  stackForDock,
} from "../stack/index.js";
import { jjkKit } from "../tools/jjk/kit.glsl.js";

export function defineModule({ name, doc, deps = ["layerKit"], glsl, demo, uniforms }) {
  if (!name || !doc || !glsl || !demo) throw new Error(`layer module incomplete: ${name ?? "?"}`);
  return { name, doc, deps, glsl, demo, uniforms };
}

export {
  layerKit,
  STASH_GLSL,
  snippets,
  STASH,
  STASHES,
  COMPOSE,
  composeStashes,
  lumaCap,
  inkLift,
  emitGate,
  protocol,
  PROTOCOLS,
  PROTOCOL_ORDER,
  apply,
  improve,
  PASSES,
  PASS_LIST,
  PASS_NAMES,
  BLEND_INDEX,
  passById,
  graphicKit,
  GRAPHIC_GLSL,
  graphics,
  LAND,
  LANDS,
  FAR_PLATE,
  EXTRA_TRIS,
  mayAddTris,
  landById,
  polyKit,
  POLY_GLSL,
  poly,
  PIPE,
  blendRgb,
  routePass,
  stackPasses,
  composeStack,
  explainStack,
  stackKit,
  STACK_GLSL,
  stack,
  genshinKit,
  STACK_KITS,
  STACK_KIT_COUNT,
  planDock,
  loadCached,
  stackForDock,
};

const D = (name, doc, deps, glsl, demo) => defineModule({ name, doc, deps, glsl, demo });

export const PROTOCOL_KITS = PROTOCOL_ORDER.map((id) => {
  const p = PROTOCOLS[id];
  return defineModule({
    name: p.name,
    doc: `${id} ${p.name} kit`,
    deps: ["layerKit"],
    glsl: p.glsl,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return lyPolice(lyPaper(p) * 0.5); }`,
  });
});

export const LAYER_SHADERS = [
  D("silLockRim", "P0: locked silhouette rim — poly edge stays, shader cannot eat the outline",
    ["layerKit", "silhouette-lock"],
    /* glsl */ `
  vec3 silLockRim(vec2 p) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    vec3 plate = mix(lyPaper(p) * 0.52, body, lyCover(p));
    return lyLockSil(plate, lyFigD(p), 0.9);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return silLockRim(p); }`),

  D("silLockFacet", "P0: facet lock — hard poly chord stays drawn when lighting washes the interior",
    ["layerKit", "silhouette-lock"],
    /* glsl */ `
  vec3 silLockFacet(vec2 p) {
    vec2 q = p - lyFigC();
    float ang = atan(q.y, q.x);
    float chord = abs(fract(ang / 1.0471976) - 0.5) * 2.0;
    float d = lyFigD(p);
    vec3 body = mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.55));
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyCover(p));
    float seam = lyLine(chord - 0.86, 1.2) * lyCover(p);
    plate = mix(plate, LY_INK, seam * 0.55);
    return lyLockSil(plate, d, 1.0);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return silLockFacet(p); }`),

  D("celQuant2", "P1: 2-step cel — one fwidth cut, fill vs key",
    ["layerKit", "cel-quantize"],
    /* glsl */ `
  vec3 celQuant2(vec2 p) {
    return mix(lyPaper(p) * 0.5, lyCel(lyNdL(p), 2.0), lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return celQuant2(p); }`),

  D("celQuant3", "P1: 3-step house cel — fill, mid, key",
    ["layerKit", "cel-quantize"],
    /* glsl */ `
  vec3 celQuant3(vec2 p) {
    return mix(lyPaper(p) * 0.5, lyCel(lyNdL(p), 3.0), lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return celQuant3(p); }`),

  D("celQuant5", "P1: 5-step cel — four printed plates",
    ["layerKit", "cel-quantize"],
    /* glsl */ `
  vec3 celQuant5(vec2 p) {
    return mix(lyPaper(p) * 0.5, lyCel(lyNdL(p), 5.0), lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return celQuant5(p); }`),

  D("inkWeightPx", "P2: constant-pixel ink, fwidth hairline, indigo not #000",
    ["layerKit", "ink-weight"],
    /* glsl */ `
  vec3 inkWeightPx(vec2 p) {
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyCover(p));
    return mix(plate, LY_INK, lyInkW(lyFigD(p), 0.0, 2.1));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return inkWeightPx(p); }`),

  D("inkWeightConcave", "P2: concave thicken — weight grows where the normal bends in",
    ["layerKit", "ink-weight"],
    /* glsl */ `
  vec3 inkWeightConcave(vec2 p) {
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyCover(p));
    return mix(plate, LY_INK, lyInkW(lyFigD(p), lyConcave(p), 1.7));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return inkWeightConcave(p); }`),

  D("hatchShadowOnly", "P3: diagonal hatch gated to shadow — key plates stay clean",
    ["layerKit", "hatch-shadow"],
    /* glsl */ `
  vec3 hatchShadowOnly(vec2 p) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    body = lyHatchSh(body, gl_FragCoord.xy, 1.0 - h, 7.0);
    return mix(lyPaper(p) * 0.55, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return hatchShadowOnly(p); }`),

  D("hatchCoreOnly", "P3: core-shadow hatch — mid stays, only the deep well takes toner",
    ["layerKit", "hatch-shadow"],
    /* glsl */ `
  vec3 hatchCoreOnly(vec2 p) {
    float h = lyNdL(p);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    float core = 1.0 - lyAA(h, 0.22);
    body = lyHatchSh(body, gl_FragCoord.xy, core, 5.5);
    return mix(lyPaper(p) * 0.55, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return hatchCoreOnly(p); }`),

  D("lumaPoliceCap", "P4: luma police cap — a blown key is pulled back to 0.92",
    ["layerKit", "luma-police"],
    /* glsl */ `
  vec3 lumaPoliceCap(vec2 p) {
    vec3 blown = vec3(1.15, 1.08, 0.95) * (0.7 + 0.5 * lyNdL(p));
    vec3 body = lyLumaPolice(blown);
    return mix(lyPaper(p) * 0.5, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return lumaPoliceCap(p); }`),

  D("lumaPoliceFloor", "P4: luma police floor — crushed #000 lifts to indigo ink",
    ["layerKit", "luma-police"],
    /* glsl */ `
  vec3 lumaPoliceFloor(vec2 p) {
    vec3 crushed = vec3(0.0) + LY_FILL * lyNdL(p) * 0.15;
    vec3 body = lyLumaPolice(crushed);
    return mix(lyPaper(p) * 0.48, body, lyCover(p));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return lumaPoliceFloor(p); }`),

  D("emitIsolateGlow", "P5: emit isolate — lamp disc glow rides uEmit, albedo stays a plate",
    ["layerKit", "emit-isolate"],
    /* glsl */ `
  vec3 emitIsolateGlow(vec2 p) {
    float r = length(p - vec2(0.72, 0.62));
    vec3 albedo = mix(LY_FILL * 0.7, LY_MID, lyCover(p) * 0.4);
    vec3 glow = vec3(0.90, 0.62, 0.28) * exp(-r * r * 22.0);
    return lyEmitOnly(albedo, glow);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return emitIsolateGlow(p); }`),

  D("emitIsolateBody", "P5: emit isolate body — figure albedo with no self-bloom; rim uses uEmit",
    ["layerKit", "emit-isolate"],
    /* glsl */ `
  vec3 emitIsolateBody(vec2 p) {
    float h = lyNdL(p);
    vec3 albedo = mix(lyPaper(p) * 0.5, mix(LY_FILL, LY_KEY, lyAA(h, 0.5)), lyCover(p));
    float rim = lyLine(lyFigD(p), 2.4);
    vec3 glow = LY_KEY * rim * 0.65;
    return lyEmitOnly(albedo, glow);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return emitIsolateBody(p); }`),

  D("gradePrintPlate", "P6: print grade — magenta fill, green key, paper tooth",
    ["layerKit", "paper-print"],
    /* glsl */ `
  vec3 gradePrintPlate(vec2 p) {
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    return lyPrint(mix(lyPaper(p) * 0.52, body, lyCover(p)), p);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gradePrintPlate(p); }`),

  D("gradeNightPlate", "P6: night grade — lifted indigo blacks, compressed highlights",
    ["layerKit", "paper-print"],
    /* glsl */ `
  vec3 gradeNightPlate(vec2 p) {
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    return lyNight(mix(lyPaper(p) * 0.45, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gradeNightPlate(p); }`),

  D("gradeGoldPlate", "P6: gold grade — honey key, earth fill, luma capped",
    ["layerKit", "paper-print"],
    /* glsl */ `
  vec3 gradeGoldPlate(vec2 p) {
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(lyNdL(p), 0.38)), LY_KEY, lyAA(lyNdL(p), 0.72));
    return lyGold(mix(lyPaper(p) * 0.5, body, lyCover(p)));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return gradeGoldPlate(p); }`),

  D("sealEllipseMask", "P7: ellipse seal — screen-glued plate with an AA hero hole",
    ["layerKit", "screen-mask"],
    /* glsl */ `
  vec3 sealEllipseMask(vec2 p, float t) {
    vec3 plate = mix(vec3(0.18, 0.28, 0.48), vec3(0.72, 0.42, 0.28), clamp(p.x / 1.44, 0.0, 1.0));
    plate = mix(plate, LY_MID, step(0.55, p.y) * 0.28);
    vec3 glue = vec3(0.16, 0.10, 0.22);
    vec2 rad = vec2(0.20 + 0.02 * sin(t), 0.26);
    return lyPolice(lyMaskSeal(plate, glue, p, vec2(0.72, 0.40), rad));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return sealEllipseMask(p, t); }`),

  D("holdStep12", "P8: 12 fps hold — boil phase steps, never interpolates",
    ["layerKit", "stepped-hold"],
    /* glsl */ `
  vec3 holdStep12(vec2 p, float t) {
    float ht = lyStep(t, 12.0);
    vec2 q = p + (vec2(lyHash(vec2(ht, 4.7)), lyHash(vec2(ht + 1.3, 9.1))) - 0.5) * 0.012;
    float h = lyNdL(q);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    vec3 plate = mix(lyPaper(p) * 0.5, body, lyFill(length(q - lyFigC()) - lyFigR()));
    return mix(plate, LY_INK, lyLine(length(q - lyFigC()) - lyFigR(), 2.0) * 0.85);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return holdStep12(p, t); }`),

  D("holdStep24", "P8: 24 fps hold — same lock, twice the drawings",
    ["layerKit", "stepped-hold"],
    /* glsl */ `
  vec3 holdStep24(vec2 p, float t) {
    float ht = lyStep(t, 24.0);
    float spin = fract(ht * 0.35);
    vec2 q = p - lyFigC();
    float a = spin * 0.4;
    vec2 r = vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a)) + lyFigC();
    float h = lyNdL(r);
    vec3 body = mix(mix(LY_FILL, LY_MID, lyAA(h, 0.38)), LY_KEY, lyAA(h, 0.72));
    return mix(lyPaper(p) * 0.5, body, lyCover(r));
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return holdStep24(p, t); }`),

  D("plateStashSample", "P9: previous stash via uPlate, else authored fallback colour",
    ["layerKit", "layer-stash"],
    /* glsl */ `
  vec3 plateStashSample(vec2 p) {
    vec3 fallback = mix(vec3(0.22, 0.18, 0.28), mix(LY_FILL, LY_KEY, lyAA(lyNdL(p), 0.5)), lyCover(p));
    vec3 prev = lyPrev(lyUV(), fallback);
    return mix(prev, LY_INK, lyLine(lyFigD(p), 1.8) * 0.7);
  }`,
    /* glsl */ `vec3 demo(vec2 p, float t) { return plateStashSample(p); }`),
];

export const LAYER_SHADER_COUNT = 20;
if (LAYER_SHADERS.length !== LAYER_SHADER_COUNT) {
  throw new Error(`layer shader count ${LAYER_SHADERS.length} != ${LAYER_SHADER_COUNT}`);
}

const G = (name, doc, glsl) => defineModule({
  name,
  doc,
  deps: ["layerKit", "graphicKit", "polyKit", "stackKit"],
  glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const GRAPHIC_LAYERS = [
  G("paintCelFill", "paint: wet cel chips over the shader body — hue cut, not a wash",
    /* glsl */ `
  vec3 paintCelFill(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaint(lit, p, uPaintWet, uPaintChip);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAINT_BLEND, lyCover(p) * 0.9 + 0.1);
  }`),

  G("paintShadowChip", "paint: shadow plate is a painted hue — never albedo * 0.2",
    /* glsl */ `
  vec3 paintShadowChip(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaintShadow(lit, p, uPaintShadow);
    gfx = mix(gfx, vec3(0.72, 0.42, 0.32), lyLandEye(p) * 0.28);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAINT_BLEND, 0.95);
  }`),

  G("paintHighlightChip", "paint: key chip only — painted highlight, fill stays the shader",
    /* glsl */ `
  vec3 paintHighlightChip(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaintKey(lit, p);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAINT_BLEND, lyCover(p) * 0.88 + 0.12);
  }`),

  G("printRegisterOff", "print: cyan/magenta register offset on the lit plate",
    /* glsl */ `
  vec3 printRegisterOff(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPrint(lit, p, uPrintOff);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PRINT_BLEND, 0.82);
  }`),

  G("printHalftoneDot", "print: Ben-Day dots gated to shadow — key plates stay clean",
    /* glsl */ `
  vec3 printHalftoneDot(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPrintDot(lit, p, uPrintDot);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PRINT_BLEND, 0.78);
  }`),

  G("printKeyOverprint", "print: indigo key plate overprints the silhouette",
    /* glsl */ `
  vec3 printKeyOverprint(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPrintKey(lit, p, uPrintKey);
    gfx = mix(gfx, LY_INK, lyLandEdge(p) * 0.45);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PRINT_BLEND, 0.88);
  }`),

  G("sakugaSmearOnes", "sakuga: smear shapes on ones — not a blur, add-clamped FX",
    /* glsl */ `
  vec3 sakugaSmearOnes(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGSakuga(lit, p, t, uSmear, 0.0);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_SAKUGA_BLEND, uSakuga);
  }`),

  G("sakugaImpactFlash", "sakuga: impact flash rides uEmit — albedo stays the shader plate",
    /* glsl */ `
  vec3 sakugaImpactFlash(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGSakuga(lit, p, t, uSmear * 0.35, uImpact);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_SAKUGA_BLEND, 0.7);
  }`),

  G("sakugaInbetween", "sakuga: left holds on twos, right draws on ones",
    /* glsl */ `
  vec3 sakugaInbetween(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGSakugaSplit(lit, p, t);
    float split = lyLine(p.x - 0.72, 1.6);
    gfx = mix(gfx, LY_INK * 1.6, split * 0.35);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAINT_BLEND, 0.92);
  }`),

  G("paperToothFiber", "paper: laid fiber tooth multiply — compiled at build",
    /* glsl */ `
  vec3 paperToothFiber(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaper(lit, p, uPaperTooth, uPaperLaid);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAPER_BLEND, 0.86);
  }`),

  G("paperDeckledEdge", "paper: deckled page edge — indigo margin, not #000",
    /* glsl */ `
  vec3 paperDeckledEdge(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaperDeckle(lit, p);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAPER_BLEND, 0.9);
  }`),

  G("paperLaidGrain", "paper: directional laid grain — animation paper, not wove speckle",
    /* glsl */ `
  vec3 paperLaidGrain(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPaperLaid(lit, p, uPaperLaid);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PAPER_BLEND, 0.8);
  }`),

  G("filmGateSprocket", "film-gate: sprocket holes on the occlude stash — indigo wells",
    /* glsl */ `
  vec3 filmGateSprocket(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGGate(lit, p, 0.0, uSprocket, 0.15);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_GATE_BLEND, 0.88);
  }`),

  G("filmGateWeave", "film-gate: gate weave on held frames — frame, not interpolate",
    /* glsl */ `
  vec3 filmGateWeave(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    float ht = lyHold(t, 24.0);
    vec3 gfx = lyGGate(lit, p, uGateWeave + lyHash(vec2(ht, 1.4)) * 0.2, 0.35, 0.4);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_GATE_BLEND, 0.84);
  }`),

  G("filmGateSafe", "film-gate: academy action-safe bars",
    /* glsl */ `
  vec3 filmGateSafe(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGGate(lit, p, 0.08, 0.0, uSafe);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_GATE_BLEND, 0.9);
  }`),

  G("multiplaneNear", "multiplane: near plate is the shader figure — extra tris stay here",
    /* glsl */ `
  vec3 multiplaneNear(vec2 p, float t) {
    vec3 lit = lyShade(p);
    vec3 gfx = lyGPlane(lit, p, t, uNear, 0.25, uParallax * 0.4);
    gfx = mix(gfx, vec3(0.78, 0.48, 0.36), lyLandEye(p) * 0.32);
    return lyGStack(lyShadePlate(p), lyFigD(p), gfx, LY_G_PLANE_BLEND, 0.94);
  }`),

  G("multiplaneFarCard", "multiplane: far plate stays a card — zero extra triangles",
    /* glsl */ `
  vec3 multiplaneFarCard(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGPlane(lit, p, t, 0.55, uFar, uParallax * 0.25);
    vec3 card = mix(vec3(0.40, 0.36, 0.50), vec3(0.62, 0.48, 0.38), lyAA(p.y, 0.58));
    gfx = mix(gfx, card, lyLandFar(p) * uFarCard * 0.7);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_PLANE_BLEND, 0.92);
  }`),

  G("multiplaneParallax", "multiplane: three plates — far card, mid wash, near figure",
    /* glsl */ `
  vec3 multiplaneParallax(vec2 p, float t) {
    vec3 lit = lyShade(p);
    vec3 gfx = lyGPlane(lit, p, t, uNear, uFar, uParallax);
    gfx = mix(gfx, LY_INK, lyLandEdge(p) * 0.4);
    return lyGStack(lyShadePlate(p), lyFigD(p), gfx, LY_G_PLANE_BLEND, 0.95);
  }`),

  G("holdOnTwos12", "hold-on-twos: 12 fps stepped time — same law as floor(t*fps)/fps",
    /* glsl */ `
  vec3 holdOnTwos12(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGTwos(lit, p, t, uHoldFps, 0.15);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_TWOS_BLEND, 0.94);
  }`),

  G("holdOnTwosBoil", "hold-on-twos: tracing boil on the held drawing — not interpolated noise",
    /* glsl */ `
  vec3 holdOnTwosBoil(vec2 p, float t) {
    vec3 lit = lyShadePlate(p);
    vec3 gfx = lyGTwos(lit, p, t, uHoldFps, uBoil);
    gfx = mix(gfx, LY_INK, lyLandFold(p) * 0.35);
    return lyGStack(lit, lyFigD(p), gfx, LY_G_TWOS_BLEND, 0.94);
  }`),
];

export const GRAPHIC_LAYER_COUNT = 20;
if (GRAPHIC_LAYERS.length !== GRAPHIC_LAYER_COUNT) {
  throw new Error(`graphic layer count ${GRAPHIC_LAYERS.length} != ${GRAPHIC_LAYER_COUNT}`);
}

export { PASSES as HOUSE_PASSES, PASS_BY_ID, GRAPHIC_PASS_COUNT, HOUSE_STACK, passesFor, validateStack } from "./graphic-passes.js";
export { stackGraphic, holdTime, applyGraphic, orderByStash } from "./graphic-stack.js";
export { GRAPHIC_PASSES, GRAPHIC_PASS_SHADER_COUNT };

export const LAYER_TOOLS = [
  layerKit,
  jjkKit,
  graphicKit,
  polyKit,
  stackKit,
  ...PROTOCOL_KITS,
  ...STACK_KITS,
  ...LAYER_SHADERS,
  ...GRAPHIC_LAYERS,
  ...GRAPHIC_PASSES,
];

export const tool = (name) => {
  const t = LAYER_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime layer tool not found: ${name}`);
  return t;
};

export function glslFor(names) {
  const seen = new Set(), out = [];
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = tool(n);
    for (const d of t.deps ?? []) add(d);
    out.push(`// tool: ${n}\n${t.glsl}`);
  };
  for (const n of names) add(n);
  return out.join("\n");
}

export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = tool(n);
    for (const d of t.deps ?? []) add(d);
    Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {});
  };
  for (const n of names) add(n);
  return u;
}
