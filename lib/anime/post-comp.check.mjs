// node lib/anime/post-comp.check.mjs : the composite shows layer-1 pixels that never wrote depth (additive, depthWrite false) as an overlay.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const here = new URL(".", import.meta.url);
const src = readFileSync(new URL("./post.js", import.meta.url), "utf8");

const cStart = src.indexOf("const COMP = /* glsl */ `");
assert.ok(cStart > 0, "COMP shader present");
const comp = src.slice(cStart, src.indexOf("`;", cStart));

assert.match(comp, /c\.a > 0\.5 && cd < texture2D\(tPlateD, vUv\)\.r\)\s*gl_FragColor = c;/, "depth-written rule kept: c.a > 0.5 and char depth < plate depth gives c");
assert.match(comp, /cd\s*>=\s*0\.9999/, "unwritten depth test: char depth >= 0.9999");
assert.match(comp, /c\.a > 0\.001/, "overlay needs char alpha > 0.001");
assert.match(comp, /max\(c\.rgb\)|max\(max\(c\.r, c\.g\), c\.b\)|max\(c\.r, max\(c\.g, c\.b\)\)/, "overlay also accepts rgb-only content (additive, alpha 0)");
assert.match(comp, /p\.rgb \* \(1\.0 - c\.a\) \+ c\.rgb/, "overlay formula p.rgb * (1.0 - c.a) + c.rgb");
assert.match(comp, /vec4\(p\.rgb \* \(1\.0 - c\.a\) \+ c\.rgb, p\.a\)/, "overlay keeps plate alpha");

const depthWritten = comp.indexOf("c.a > 0.5");
const unwritten = comp.indexOf("0.9999");
assert.ok(depthWritten > 0 && unwritten > depthWritten, "depth-written test runs before the overlay");
assert.match(comp, /else gl_FragColor = p;/, "other pixels stay the plate");

const finStart = src.indexOf("const FINAL = /* glsl */ `");
assert.ok(finStart > 0, "FINAL shader present");
const fin = src.slice(finStart, src.indexOf("`;", finStart));
for (const s of ["gradeCap", "uView", "uInkFloor"]) assert.ok(fin.includes(s), `final pass still has ${s}`);

const defines = (s) => (s.match(/^\s*#define\b/gm) || []).length;
const head = execFileSync("git", ["show", "HEAD:lib/anime/post.js"], { cwd: here, encoding: "utf8" });
assert.equal(defines(src), defines(head), "#define count unchanged against git HEAD");

console.log("post-comp.check: ok");
