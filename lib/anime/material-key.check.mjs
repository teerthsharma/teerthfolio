// node lib/anime/material-key.check.mjs : the key/cut/mul/band/flat/ink-gain uniforms exist in JS and GLSL with their
// defaults, the programs add no #define, the id still reaches alpha, and the hull ink reads the style.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const mat = readFileSync(join(dir, "material.js"), "utf8");
const eng = readFileSync(join(dir, "engine.js"), "utf8");

const jsDefaults = [
  ["uKeyV", /uKeyV:\s*\{\s*value:\s*new Vector3\(\)\s*\}/],
  ["uCut", /uCut:\s*\{\s*value:\s*-1\s*\}/],
  ["uMul", /uMul:\s*\{\s*value:\s*new Vector3\(-1,\s*-1,\s*-1\)\s*\}/],
  ["uBand", /uBand:\s*\{\s*value:\s*0\s*\}/],
  ["uFlat", /uFlat:\s*\{\s*value:\s*0\s*\}/],
  ["uInkGain", /uInkGain:\s*\{\s*value:\s*0\s*\}/],
];
for (const [name, re] of jsDefaults) assert.match(mat, re, `JS uniform ${name} with its default`);

const glsl = [
  ["uKeyV", /uniform vec3 uKeyV;/],
  ["uCut", /uniform float uCut;/],
  ["uMul", /uniform vec3 uMul;/],
  ["uBand", /uniform float uBand;/],
  ["uFlat", /uniform float uFlat;/],
  ["uInkGain", /uniform float uInkGain;/],
];
for (const [name, re] of glsl) assert.match(mat, re, `GLSL uniform ${name} declared`);

assert.equal((mat + eng).match(/^\s*#define/gm)?.length ?? 0, 0, "no #define (program count unchanged)");
assert.match(mat, /gl_FragColor = vec4\(col \+ uEmit[^;]*, uId\);/, "surface still writes the id to alpha");
assert.match(eng, /style\.lines\?\.ink/, "hull ink reads the style when it provides one");
assert.match(eng, /\?\?\s*"#000000"/, "hull ink keeps #000000 as the fallback");

console.log("material-key.check: ok");
