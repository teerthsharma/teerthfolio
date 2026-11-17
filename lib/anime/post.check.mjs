// node lib/anime/post.check.mjs : the final pass never writes pure black; bars and the grade floor are studio ink.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./post.js", import.meta.url), "utf8");
const start = src.indexOf("const FINAL = /* glsl */ `");
assert.ok(start > 0, "FINAL shader present");
const fin = src.slice(start, src.indexOf("`;", start));
const at = (s) => { const i = fin.indexOf(s); assert.ok(i >= 0, `found: ${s}`); return i; };

const impact = at("if (uImpact.x > 0.5)");
const bars = fin.split("\n").find((l) => l.includes("letterbox"));
assert.ok(bars, "letterbox line present");
assert.doesNotMatch(bars, /vec3\(\s*0(\.0)?\s*\)/, "letterbox is not pure black");
assert.match(bars, /= uInkFloor;/, "letterbox is the studio ink");
assert.ok(impact < at("letterbox"), "impact frames run before the letterbox");

assert.match(fin, /uniform vec3 uInkFloor;/, "ink floor uniform declared");
const cap = fin.slice(at("vec3 gradeCap(vec3 c)"), at("void main()"));
assert.match(cap, /0\.92/, "luma capped at 0.92");
assert.match(cap, /smoothstep\(0\.035, 0\.08, Y\)/, "ink lift toward uInkFloor");
assert.match(cap, /mix\(uInkFloor, c,/, "lift mixes to the ink floor");
assert.match(fin, /gl_FragColor = vec4\(gradeCap\(o\), 1\.0\);\s*\}\s*$/, "cap is the last write to gl_FragColor");
assert.ok(at("gl_FragColor = vec4(gradeCap(o), 1.0);") > at("letterbox"), "cap runs after the letterbox");

assert.match(src, /uInkFloor: \{ value: new Color\(14 \/ 255, 12 \/ 255, 22 \/ 255\) \}/, "composer default ink floor is #0e0c16 in sRGB (the final pass runs after toSRGB)");

console.log("post.check: ok");
