// node lib/anime/cutscenes/framework/seal-skin.check.mjs : S0.2 gates (spec seal-skins.md s2, s4).
// Reads seal.js as text: this file cannot import three, so the wiring is checked on the source.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./seal.js", import.meta.url), "utf8");

assert.ok(/\bo\.skin\b/.test(src), "gate: placeSeal reads an optional skin id from its options (o.skin)");
assert.ok(/export function applySkin\(seal, skinId\)/.test(src), "gate: applySkin(seal, skinId) is exported");

assert.ok(
  /o\.skin\s*\?[^;]*:\s*buildPup\(engine,\s*\{\s*v2:\s*true\s*\}\)/.test(src),
  "gate: with no skin, placeSeal still builds the locked pup via buildPup(engine, { v2: true })",
);

assert.ok(/o\.skin\s*\?\s*skinFigure\(/.test(src), "gate: a skin id routes to skinFigure");
assert.ok(
  /function skinFigure\([^)]*\)\s*\{[\s\S]*?buildSkin\(engine,\s*SKINS\[id\],\s*\{\s*ell,\s*cone,\s*paint,\s*polygonize\s*\}\)/.test(src),
  "gate: skinFigure builds the figure with buildSkin(engine, SKINS[id], { ell, cone, paint, polygonize })",
);

assert.ok(!/ShaderMaterial/.test(src), "gate: seal.js creates no ShaderMaterial (the skin uses the existing animeMaterial program)");
assert.ok(!/createProgram|compileShader|new\s+Program\b/.test(src), "gate: seal.js creates no new GL program");

console.log("seal-skin.check ok");
