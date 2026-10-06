import { CUTS_A, CUTS_A_COUNT, CUTS_A_DOCKS } from "./indexA.js";
import { CUTS_D, CUTS_D_COUNT, CUTS_D_DOCKS } from "./indexD.js";
import { cutKit } from "./kit.glsl.js";
import { jjkKit } from "../jjk/kit.glsl.js";

export { cutKit } from "./kit.glsl.js";
export { CUTS_A, CUTS_A_COUNT, CUTS_A_DOCKS } from "./indexA.js";
export { CUTS_D, CUTS_D_COUNT, CUTS_D_DOCKS } from "./indexD.js";

const KITS = { cutKit, jjkKit };

export function cutGlslFor(mod) {
  const seen = new Set();
  const out = [];
  for (const d of mod.deps ?? ["cutKit"]) {
    if (seen.has(d)) continue;
    seen.add(d);
    const kit = KITS[d];
    if (kit) out.push(kit.glsl);
  }
  out.push(mod.glsl);
  return out.join("\n");
}

export const CUTS = [...CUTS_A, ...CUTS_D];
export const CUTS_COUNT = CUTS_A_COUNT + CUTS_D_COUNT;
export const CUTS_DOCKS = [...CUTS_A_DOCKS, ...CUTS_D_DOCKS];

if (CUTS.length !== CUTS_COUNT) {
  throw new Error(`cuts: expected ${CUTS_COUNT}, got ${CUTS.length}`);
}

export default CUTS;
