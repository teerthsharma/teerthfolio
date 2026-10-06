// School / Classroom of the Elite tool library. Parent wires:
//   import { SCHOOL_TOOLS } from "./school/index.js";
//   export const TOOLS = [/* existing */, ...SCHOOL_TOOLS];
// Pretty core is exported as exactly `classroom-kit`.
import { classroomKit, schoolKit, KIT_GLSL } from "./kit.glsl.js";
import { FLUORO } from "./fluoro.js";
import { DESK } from "./desk.js";
import { BLAZER } from "./blazer.js";
import { FACE } from "./face.js";
import { WINDOW } from "./window.js";
import { WATCH } from "./watch.js";
import { INK } from "./ink.js";
import { GRADE } from "./grade.js";

export { defineModule, T, classroomKit, schoolKit, KIT_GLSL } from "./kit.glsl.js";

export const SCHOOL_SHADERS = [
  ...FLUORO,
  ...DESK,
  ...BLAZER,
  ...FACE,
  ...WINDOW,
  ...WATCH,
  ...INK,
  ...GRADE,
];

export const SCHOOL_SHADER_COUNT = 50;
if (SCHOOL_SHADERS.length !== SCHOOL_SHADER_COUNT) {
  throw new Error(`school shader count ${SCHOOL_SHADERS.length} != ${SCHOOL_SHADER_COUNT}`);
}

export const SCHOOL_TOOLS = [classroomKit, ...SCHOOL_SHADERS];

if (!SCHOOL_TOOLS.some((x) => x.name === "classroom-kit")) {
  throw new Error("school tools missing exported name classroom-kit");
}

export const tool = (name) => {
  const t = SCHOOL_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`anime school tool not found: ${name}`);
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

export const SCHOOL_FAMILY_COUNTS = {
  fluoro: FLUORO.length,
  desk: DESK.length,
  blazer: BLAZER.length,
  face: FACE.length,
  window: WINDOW.length,
  watch: WATCH.length,
  ink: INK.length,
  grade: GRADE.length,
};
