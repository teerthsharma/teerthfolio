// THE TOOL REGISTRY: every effect is a detachable unit any world or cutscene can import and combine.
// A tool is { name, doc, deps?, glsl, uniforms?(opts), demo? } where demo is GLSL `vec3 demo(vec2 p, float t)`
// (p in frame height units, linear colour out); demoTex: true gives the demo `uniform sampler2D tSrc` (a test image). glslFor(names) returns the GLSL of the named tools
// with their dependencies first and each tool once; uniformsFor(names, opts) merges their uniforms.
// See one alone: /lab/anime?tool=<name>; all of them: /lab/anime?tool=all.
import noise from "./noise.js";
import blend from "./blend.js";
import storm from "./storm.js";
import lightning from "./lightning.js";
import puffs from "./puffs.js";
import grunge from "./grunge.js";
import glow from "./glow.js";
import mist from "./mist.js";
import grade from "./grade.js";
import kuwahara from "./kuwahara.js";
import flare from "./flare.js";
import cel from "./cel.js";
import ink from "./ink.js";
import huegrade from "./huegrade.js";

export const TOOLS = [noise, blend, storm, lightning, puffs, grunge, glow, mist, grade, kuwahara, flare, cel, ink, huegrade];
export const tool = (name) => { const t = TOOLS.find((x) => x.name === name); if (!t) throw new Error(`anime tool not found: ${name}`); return t; };

export function glslFor(names) {
  const seen = new Set(), out = [];
  const add = (n) => { if (seen.has(n)) return; seen.add(n); const t = tool(n); for (const d of t.deps ?? []) add(d); out.push(`// tool: ${n}\n${t.glsl}`); };
  for (const n of names) add(n);
  return out.join("\n");
}
export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const add = (n) => { if (seen.has(n)) return; seen.add(n); const t = tool(n); for (const d of t.deps ?? []) add(d); Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {}); };
  for (const n of names) add(n);
  return u;
}
