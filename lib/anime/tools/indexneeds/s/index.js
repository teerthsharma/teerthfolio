// INDEX S shared modules (21). Parent wires:
//   import { INDEX_S_TOOLS } from "./indexneeds/s/index.js";
// Do not edit catalog.js from this folder.
import { indexSKit } from "./kit.glsl.js";
import smearFrame from "./smear-frame.js";
import timeStopInvert from "./time-stop-invert.js";
import sealScriptGlow from "./seal-script-glow.js";
import mosaicTileDisc from "./mosaic-tile-disc.js";
import lightWrap from "./light-wrap.js";
import rainStreak from "./rain-streak.js";
import heatShimmer from "./heat-shimmer.js";
import coinStreak from "./coin-streak.js";
import sonicRing from "./sonic-ring.js";
import dustPlumeRing from "./dust-plume-ring.js";
import threadRibbon from "./thread-ribbon.js";
import tomoeMoon from "./tomoe-moon.js";
import petrifyGradient from "./petrify-gradient.js";
import crowBoid from "./crow-boid.js";
import fireflyPetalPool from "./firefly-petal-pool.js";
import brushLettering from "./brush-lettering.js";
import comicLetteringSfx from "./comic-lettering-sfx.js";
import sparkleDust from "./sparkle-dust.js";
import haloRingFringe from "./halo-ring-fringe.js";
import goldLeafMatcap from "./gold-leaf-matcap.js";
import tbcArrowCard from "./tbc-arrow-card.js";

export { defineModule } from "./define.js";
export { indexSKit, KIT_GLSL } from "./kit.glsl.js";

export const INDEX_S = [
  smearFrame,
  timeStopInvert,
  sealScriptGlow,
  mosaicTileDisc,
  lightWrap,
  rainStreak,
  heatShimmer,
  coinStreak,
  sonicRing,
  dustPlumeRing,
  threadRibbon,
  tomoeMoon,
  petrifyGradient,
  crowBoid,
  fireflyPetalPool,
  brushLettering,
  comicLetteringSfx,
  sparkleDust,
  haloRingFringe,
  goldLeafMatcap,
  tbcArrowCard,
];

export const INDEX_S_COUNT = 21;
if (INDEX_S.length !== INDEX_S_COUNT) {
  throw new Error(`index-s shader count ${INDEX_S.length} != ${INDEX_S_COUNT}`);
}

export const INDEX_S_TOOLS = [indexSKit, ...INDEX_S];
export const INDEX_S_NAMES = INDEX_S.map((m) => m.name);

export const tool = (name) => {
  const t = INDEX_S_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime index-s tool not found: ${name}`);
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
