// node lib/anime/post-view.check.mjs : the final pass has the lab views (uView 2 notan, 3 ids) and adds no #define.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(fileURLToPath(new URL("./post.js", import.meta.url)), "utf8");
const DEFINES_BEFORE = 0; // count of #define in post.js before the view change

assert.match(src, /uniform float uView;/, "uView is declared as a float uniform");
assert.match(src, /uniform vec2 uNotan;/, "uNotan is declared as a vec2 uniform");
assert.match(src, /if \(uView > 1\.5 && uView < 2\.5\)/, "notan branch is gated on uView 2");
assert.match(src, /0\.08 : y < uNotan\.y \? 0\.45 : 0\.90/, "notan emits the three grey levels 0.08, 0.45, 0.90");
assert.match(src, /if \(uView > 2\.5 && uView < 3\.5\) gl_FragColor = vec4\(vec3\(c0\.a\), 1\.0\);/, "ids branch writes the scene alpha id, bypassing the grade");
assert.match(src, /float y = dot\(gradeCap\(o\), LUMA\);/, "notan luma is taken after gradeCap");
assert.match(src, /else gl_FragColor = vec4\(gradeCap\(o\), 1\.0\);/, "uView 0 keeps the router's gradeCap write");
assert.equal((src.match(/#define/g) ?? []).length, DEFINES_BEFORE, "no new #define in post.js");

console.log("post-view.check: ok");
