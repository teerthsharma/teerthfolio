// node lib/anime/live.check.mjs : the engine mount switch (engine-design.md section 2).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ENGINE_DOCKS, ENGINE_LIVE, engineActive, engineOwns } from "./live.js";

const CUTS = new URL("./cutscenes/", import.meta.url);
const EC = new URL("../../components/anime/EngineCut.jsx", import.meta.url);

const folders = readdirSync(CUTS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && existsSync(new URL(`${d.name}/scene.js`, CUTS)))
  .map((d) => d.name)
  .sort();
assert.deepEqual([...ENGINE_DOCKS].sort(), folders, "ENGINE_DOCKS lists every cutscenes/<id>/scene.js");

assert.equal(ENGINE_LIVE.size, 0, "ENGINE_LIVE starts empty: the owner approves each dock by eye");
for (const id of ENGINE_DOCKS) {
  assert.equal(engineOwns(id, ""), null, `${id}: flag off, no dock routes to the engine`);
  assert.equal(engineOwns(id, `?engine=${id}`), id);
  assert.equal(engineOwns(id, "?engine=all"), id);
  assert.equal(engineOwns(id, "?engine=none"), null, "none forces the R3F move");
  ENGINE_LIVE.add(id);
  assert.equal(engineOwns(id, ""), id, `${id}: adding it to ENGINE_LIVE is all it takes`);
  assert.equal(engineOwns(id, "?engine=none"), null, "none beats ENGINE_LIVE");
  ENGINE_LIVE.delete(id);
}
assert.equal(engineOwns("p-faraday", "?engine=p-caustic,p-faraday"), "p-faraday");
assert.equal(engineOwns("p-aether-lang", "?engine=p-caustic,p-faraday"), null, "a list routes only its ids");
assert.equal(engineOwns("loop-awakening", "?engine=all"), null, "the awakening has no engine cut");
assert.equal(engineOwns("loop-awakening", "?engine=loop-awakening"), null);
assert.equal(engineOwns(null, "?engine=all"), null);

assert.equal(engineActive("p-nerve", undefined, "?engine=all"), true);
assert.equal(engineActive("p-nerve", {}, "?engine=all"), true);
assert.equal(engineActive("p-nerve", { "p-nerve": true }, "?engine=all"), false, "a failed engine hands the dock back");
assert.equal(engineActive("p-nerve", { "p-caustic": true }, "?engine=all"), true);
assert.equal(engineActive("p-nerve", undefined, ""), false);
assert.equal(engineActive(null, undefined, "?engine=all"), false);

assert.ok(existsSync(EC), "components/anime/EngineCut.jsx exists");
const src = readFileSync(EC, "utf8");
assert.match(src, /export default function EngineCut/);
assert.match(src, /engineOwns/);
assert.match(src, /onEnd/, "the player owns the end of the arrival");
assert.match(src, /compileAsync/, "programs compile behind the closed iris");
assert.match(src, /forceContextLoss/, "each arrival frees its WebGL context");
assert.doesNotMatch(src, /mountedAt/, "the cut starts at its first frame, never seeked by the load delay");

console.log("live.check: ok");
