// INDEX L shared modules. Parent wires later:
//   import { INDEX_L } from "./indexneeds/index.js";
// Do not edit catalog from this folder.
import { defineModule } from "./define.js";
import { indexKit, KIT_GLSL } from "./kit.glsl.js";
import { SEAL } from "./seal.js";
import { FACE } from "./face.js";
import { PUNCH } from "./punch.js";
import { TITAN } from "./titan.js";
import { SUSANOO } from "./susanoo.js";
import { AURA } from "./aura.js";
import { VOLLEY } from "./volley.js";
import { RAILGUN } from "./railgun.js";
import { METEOR } from "./meteor.js";
import { CHARIOT } from "./chariot.js";
import { CROWD } from "./crowd.js";
import { MOUNTAIN } from "./mountain.js";

export { defineModule, indexKit, KIT_GLSL };

export const INDEX_L = [
  ...SEAL,
  ...FACE,
  ...PUNCH,
  ...TITAN,
  ...SUSANOO,
  ...AURA,
  ...VOLLEY,
  ...RAILGUN,
  ...METEOR,
  ...CHARIOT,
  ...CROWD,
  ...MOUNTAIN,
];

export const INDEX_L_COUNT = 15;
if (INDEX_L.length !== INDEX_L_COUNT) {
  throw new Error(`INDEX_L count ${INDEX_L.length} != ${INDEX_L_COUNT}`);
}

export const INDEX_L_TOOLS = [indexKit, ...INDEX_L];

export const tool = (name) => {
  const t = INDEX_L_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`indexneeds tool not found: ${name}`);
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

export default INDEX_L;
