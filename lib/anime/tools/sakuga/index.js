import { defineModule, T } from "./define.js";
import { sakugaKit } from "./kit.glsl.js";
import { SMEAR } from "./smear.js";
import { HOLD } from "./hold.js";
import { BOOK } from "./book.js";
import { BOIL } from "./boil.js";
import { GATE } from "./gate.js";
import { MAPPA } from "./mappa.js";
import { UFOTABLE } from "./ufotable.js";
import { LERCHE } from "./lerche.js";
import { GHIBLI } from "./ghibli.js";
import { ARAKI } from "./araki.js";
import { MANHWA } from "./manhwa.js";
import { FRESCO } from "./fresco.js";
import { SHINKAI } from "./shinkai.js";

export { defineModule, T, sakugaKit };

export const SAKUGA_TOOLS = [
  sakugaKit,
  ...SMEAR, ...HOLD, ...BOOK, ...BOIL, ...GATE,
  ...MAPPA, ...UFOTABLE, ...LERCHE, ...GHIBLI, ...ARAKI,
  ...MANHWA, ...FRESCO, ...SHINKAI,
];

export const SAKUGA_SHADERS = SAKUGA_TOOLS.filter((t) => t.name !== "sakugaKit");
export const SAKUGA_SHADER_COUNT = 40;
if (SAKUGA_SHADERS.length !== SAKUGA_SHADER_COUNT) {
  throw new Error(`sakuga shader count ${SAKUGA_SHADERS.length} != ${SAKUGA_SHADER_COUNT}`);
}

export function glslFor(names) {
  const seen = new Set(), out = [];
  const map = new Map(SAKUGA_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`sakuga tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    out.push(`// tool: ${n}\n${t.glsl}`);
  };
  for (const n of names) add(n);
  return out.join("\n");
}

export function uniformsFor(names, opts = {}) {
  const seen = new Set(), u = {};
  const map = new Map(SAKUGA_TOOLS.map((t) => [t.name, t]));
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const t = map.get(n);
    if (!t) throw new Error(`sakuga tool not found: ${n}`);
    for (const d of t.deps ?? []) add(d);
    Object.assign(u, t.uniforms?.(opts[n] ?? {}) ?? {});
  };
  for (const n of names) add(n);
  return u;
}

export const tool = (name) => {
  const t = SAKUGA_TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`sakuga tool not found: ${name}`);
  return t;
};

export const SAKUGA_FAMILY_COUNTS = {
  smear: SMEAR.length,
  hold: HOLD.length,
  book: BOOK.length,
  boil: BOIL.length,
  gate: GATE.length,
  mappa: MAPPA.length,
  ufotable: UFOTABLE.length,
  lerche: LERCHE.length,
  ghibli: GHIBLI.length,
  araki: ARAKI.length,
  manhwa: MANHWA.length,
  fresco: FRESCO.length,
  shinkai: SHINKAI.length,
};

export default SAKUGA_TOOLS;
