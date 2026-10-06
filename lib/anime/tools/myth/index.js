// Occult / myth shader library. Parent wires:
//   import { MYTH_TOOLS } from "./myth/index.js";
//   export const TOOLS = [/* existing */, ...MYTH_TOOLS];
import { mythKit } from "./kit.glsl.js";
import mangekyo from "./mangekyo.js";
import amaterasu from "./amaterasu.js";
import tsukuyomi from "./tsukuyomi.js";
import izanami from "./izanami.js";
import akatsuki from "./akatsuki.js";
import sharingan from "./sharingan.js";
import ofuda from "./ofuda.js";
import hollow from "./hollow.js";
import crows from "./crows.js";

export { defineModule } from "./define.js";
export { mythKit, KIT_GLSL } from "./kit.glsl.js";

export const MYTH_SHADERS = [
  ...mangekyo,
  ...amaterasu,
  ...tsukuyomi,
  ...izanami,
  ...akatsuki,
  ...sharingan,
  ...ofuda,
  ...hollow,
  ...crows,
];

export const MYTH_SHADER_COUNT = 50;
if (MYTH_SHADERS.length !== MYTH_SHADER_COUNT) {
  throw new Error(`myth shader count ${MYTH_SHADERS.length} != ${MYTH_SHADER_COUNT}`);
}

export const MYTH_TOOLS = [mythKit, ...MYTH_SHADERS];

export const tool = (name) => {
  const t = MYTH_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime myth tool not found: ${name}`);
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

export const MYTH_FAMILY_COUNTS = {
  mangekyo: mangekyo.length,
  amaterasu: amaterasu.length,
  tsukuyomi: tsukuyomi.length,
  izanami: izanami.length,
  akatsuki: akatsuki.length,
  sharingan: sharingan.length,
  ofuda: ofuda.length,
  hollow: hollow.length,
  crows: crows.length,
};
