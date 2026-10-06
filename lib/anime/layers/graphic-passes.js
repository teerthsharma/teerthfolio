// Modular graphic passes that sit ON TOP of a compiled shader kit.
// Shader paints light. Poly locks silhouette. These passes print the still.
// Stash ids stay WORLD/CAST/FX/OCCLUDE/GRADE. This file never adds a sixth.

import { STASH, BLENDS, WHENS, composeStashes } from "./protocol.js";

function freezePass(p) {
  if (!p?.id || !p.stash) throw new Error(`graphic pass incomplete: ${p?.id ?? "?"}`);
  if (!BLENDS.includes(p.blend)) throw new Error(`pass ${p.id}: blend ${p.blend}`);
  if (!WHENS.includes(p.when)) throw new Error(`pass ${p.id}: when ${p.when}`);
  return Object.freeze({
    id: p.id,
    stash: p.stash,
    blend: p.blend,
    when: p.when,
    uniforms: Object.freeze({ ...(p.uniforms ?? {}) }),
    shader: p.shader ?? null,
  });
}

const P = (id, stash, blend, when, uniforms, shader) =>
  freezePass({ id, stash, blend, when, uniforms, shader });

export const PASSES = Object.freeze([
  P("paintWash", STASH.WORLD.id, "multiply", "shot", { tooth: 0.22, wet: 0.18 }, "gPaintWash"),
  P("printDot", STASH.GRADE.id, "multiply", "frame", { dpi: 42, angle: 0.26 }, "gPrintDot"),
  P("sakugaHold", STASH.CAST.id, "replace", "frame", { fps: 12, boil: 0.008 }, "gSakugaHold"),
  P("paperTooth", STASH.WORLD.id, "multiply", "shot", { fiber: 18, flake: 0.08 }, "gPaperTooth"),
  P("filmGate", STASH.GRADE.id, "replace", "frame", { weave: 0.003, dirt: 0.04 }, "gFilmGate"),
  P("multiplane", STASH.WORLD.id, "replace", "shot", { near: 0.12, far: 0.03 }, "gMultiplane"),
  P("holdTwos", STASH.CAST.id, "replace", "frame", { fps: 12 }, "gHoldTwos"),
  P("bookIn", STASH.OCCLUDE.id, "multiply", "shot", { hinge: 0.18 }, "gBookIn"),
  P("bookOut", STASH.OCCLUDE.id, "multiply", "shot", { hinge: 0.82 }, "gBookOut"),
  P("celBoil", STASH.CAST.id, "replace", "frame", { fps: 8, amp: 0.01 }, "gCelBoil"),
  P("shaftUfo", STASH.FX.id, "add-clamped", "frame", { beams: 5, dust: 0.35 }, "gShaftUfo"),
  P("fluoroLerche", STASH.WORLD.id, "replace", "shot", { tube: 0.78 }, "gFluoroLerche"),
  P("washGhibli", STASH.WORLD.id, "multiply", "shot", { pigment: 0.28 }, "gWashGhibli"),
  P("hatchAraki", STASH.CAST.id, "multiply", "frame", { dens: 7.0 }, "gHatchAraki"),
  P("greyManhwa", STASH.GRADE.id, "replace", "frame", { toner: 0.42 }, "gGreyManhwa"),
  P("plasterFresco", STASH.WORLD.id, "multiply", "shot", { grit: 0.16 }, "gPlasterFresco"),
  P("duskShinkai", STASH.GRADE.id, "replace", "frame", { split: 0.55 }, "gDuskShinkai"),
  P("smearImpact", STASH.FX.id, "add-clamped", "frame", { len: 0.22 }, "gSmearImpact"),
  P("analogWeave", STASH.GRADE.id, "replace", "frame", { px: 1.4 }, "gAnalogWeave"),
  P("mappaDiff", STASH.GRADE.id, "replace", "frame", { soft: 0.12 }, "gMappaDiff"),
]);

export const PASS_BY_ID = Object.freeze(Object.fromEntries(PASSES.map((p) => [p.id, p])));
export const GRAPHIC_PASS_COUNT = 20;
if (PASSES.length !== GRAPHIC_PASS_COUNT) {
  throw new Error(`graphic pass count ${PASSES.length} != ${GRAPHIC_PASS_COUNT}`);
}

export function passesFor(ids) {
  return Object.freeze(ids.map((id) => {
    const p = PASS_BY_ID[id];
    if (!p) throw new Error(`graphic pass not found: ${id}`);
    return p;
  }));
}

export function stashOf(passId) {
  return PASS_BY_ID[passId]?.stash ?? null;
}

export function validateStack(ids) {
  const list = passesFor(ids);
  composeStashes();
  return list;
}

export const HOUSE_STACK = Object.freeze([
  "paintWash",
  "paperTooth",
  "sakugaHold",
  "hatchAraki",
  "printDot",
  "filmGate",
]);
