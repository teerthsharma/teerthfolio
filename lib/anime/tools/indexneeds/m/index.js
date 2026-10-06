import { defineModule } from "./define.js";
import { indexMKit } from "./kit.glsl.js";
import { PORTAL_RING } from "./portal-ring.js";
import { SHOCKWAVE_DOME } from "./shockwave-dome.js";
import { STAGE_CRUMBLE } from "./stage-crumble.js";
import { FIRE_SHEET } from "./fire-sheet.js";
import { GLASS_SHATTER_WIPE } from "./glass-shatter-wipe.js";
import { SHARD_SHATTER } from "./shard-shatter.js";
import { PANEL_BORDER_TEAR } from "./panel-border-tear.js";
import { MAGIC_CIRCLE } from "./magic-circle.js";
import { SIGIL_RING } from "./sigil-ring.js";
import { CARTOON_BG_PAINTER } from "./cartoon-bg-painter.js";
import { RUBBER_HOSE_LIMBS } from "./rubber-hose-limbs.js";
import { STAND_BODY } from "./stand-body.js";
import { STAND_AURA_EDGE } from "./stand-aura-edge.js";
import { JOJO_HATCH_INK } from "./jojo-hatch-ink.js";
import { INK_SMOKE_TENDRIL_SKY } from "./ink-smoke-tendril-sky.js";
import { MIRROR_WATER_PLANE } from "./mirror-water-plane.js";
import { NEBULA_SKY } from "./nebula-sky.js";
import { STORM_SKY_CITY_LIT } from "./storm-sky-city-lit.js";
import { NIGHT_SKY_PLATE } from "./night-sky-plate.js";
import { SKYLINE_PLATE } from "./skyline-plate.js";
import { FIELD_LINES } from "./field-lines.js";
import { TRUSS_BRIDGE_KIT } from "./truss-bridge-kit.js";
import { CLASSROOM_KIT } from "./classroom-kit.js";
import { RUIN_KIT } from "./ruin-kit.js";
import { CONIFER_TUFT_KIT } from "./conifer-tuft-kit.js";
import { SOUL_FLAME } from "./soul-flame.js";
import { SCRIBBLE_HATCH_MASS } from "./scribble-hatch-mass.js";
import { COMET_RAINBOW_TAIL } from "./comet-rainbow-tail.js";
import { CLOUD_SEA_PLATE } from "./cloud-sea-plate.js";
import { CHESS_OVERLAY } from "./chess-overlay.js";
import { REVIEW_CARD_UI } from "./review-card-ui.js";
import { CAMERA_LAW_DIRECTOR } from "./camera-law-director.js";

export { defineModule, indexMKit };

export const INDEX_M_TOOLS = [
  indexMKit,
  PORTAL_RING,
  SHOCKWAVE_DOME,
  STAGE_CRUMBLE,
  FIRE_SHEET,
  GLASS_SHATTER_WIPE,
  SHARD_SHATTER,
  PANEL_BORDER_TEAR,
  MAGIC_CIRCLE,
  SIGIL_RING,
  CARTOON_BG_PAINTER,
  RUBBER_HOSE_LIMBS,
  STAND_BODY,
  STAND_AURA_EDGE,
  JOJO_HATCH_INK,
  INK_SMOKE_TENDRIL_SKY,
  MIRROR_WATER_PLANE,
  NEBULA_SKY,
  STORM_SKY_CITY_LIT,
  NIGHT_SKY_PLATE,
  SKYLINE_PLATE,
  FIELD_LINES,
  TRUSS_BRIDGE_KIT,
  CLASSROOM_KIT,
  RUIN_KIT,
  CONIFER_TUFT_KIT,
  SOUL_FLAME,
  SCRIBBLE_HATCH_MASS,
  COMET_RAINBOW_TAIL,
  CLOUD_SEA_PLATE,
  CHESS_OVERLAY,
  REVIEW_CARD_UI,
  CAMERA_LAW_DIRECTOR,
];

export const INDEX_M_SHADERS = INDEX_M_TOOLS.filter((t) => t.name !== "indexMKit");
export const INDEX_M_COUNT = 32;
if (INDEX_M_SHADERS.length !== INDEX_M_COUNT) {
  throw new Error(`index M shader count ${INDEX_M_SHADERS.length} != ${INDEX_M_COUNT}`);
}

export function glslFor(names) {
  const seen = new Set(), out = [];
  const map = new Map(INDEX_M_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`index M tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    out.push(`// tool: ${n}\n${t.glsl}`);
  };
  for (const n of names) add(n);
  return out.join("\n");
}

export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const map = new Map(INDEX_M_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`index M tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {});
  };
  for (const n of names) add(n);
  return u;
}

export const tool = (name) => {
  const t = INDEX_M_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`index M tool not found: ${name}`);
  return t;
};

export default INDEX_M_TOOLS;
