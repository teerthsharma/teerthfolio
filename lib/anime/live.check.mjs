// node lib/anime/live.check.mjs : the engine mount switch (engine-design.md section 2) and the registries it reads.
// Checks the current truth: ENGINE_LIVE docks are engine docks, approved cutscenes and registry loaders; the-loop
// stays on the live awakening; the engine routing switch; the EngineCut host contract as it is at HEAD.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { PLACE_BY_ID } from "../world/places.js";
import { APPROVED } from "../world/cutscene/timeline.js";
import { hasCut } from "./cutscenes/index.js";
import { ENGINE_DOCKS, ENGINE_LIVE, engineActive, engineOwns } from "./live.js";

const CUTS = new URL("./cutscenes/", import.meta.url);
const EC = new URL("../../components/anime/EngineCut.jsx", import.meta.url);

const folders = readdirSync(CUTS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && existsSync(new URL(`${d.name}/scene.js`, CUTS)))
  .map((d) => d.name)
  .sort();
assert.deepEqual([...ENGINE_DOCKS].sort(), folders, "ENGINE_DOCKS lists every cutscenes/<id>/scene.js");

for (const id of ENGINE_LIVE) {
  assert.ok(ENGINE_DOCKS.includes(id), `${id}: a live dock is an engine dock`);
  assert.ok(APPROVED.has(id), `${id}: a live dock is an approved cutscene`);
  assert.ok(hasCut(id), `${id}: a live dock has a registry loader`);
}
assert.ok(!ENGINE_LIVE.has("the-loop"), "the-loop stays out: the live awakening plays until the engine version is approved");
if (ENGINE_LIVE.has("p-asmodeus")) assert.ok(PLACE_BY_ID["p-asmodeus"], "p-asmodeus goes live only once it has a place");

for (const id of ENGINE_DOCKS) {
  if (ENGINE_LIVE.has(id)) {
    assert.equal(engineOwns(id, ""), id, `${id}: a live dock routes to the engine with no flag`);
  } else {
    assert.equal(engineOwns(id, ""), null, `${id}: flag off, no dock routes to the engine`);
    assert.equal(engineOwns(id, `?engine=${id}`), id);
    ENGINE_LIVE.add(id);
    assert.equal(engineOwns(id, ""), id, `${id}: adding it to ENGINE_LIVE is all it takes`);
    assert.equal(engineOwns(id, "?engine=none"), null, "none beats ENGINE_LIVE");
    ENGINE_LIVE.delete(id);
  }
  assert.equal(engineOwns(id, "?engine=all"), id);
  assert.equal(engineOwns(id, "?engine=none"), null, "none forces the R3F move");
}
assert.equal(engineOwns("p-faraday", "?engine=p-caustic,p-faraday"), "p-faraday");
assert.equal(engineOwns("p-aether-lang", "?engine=p-caustic,p-faraday"), null, "a list routes only its ids");
assert.equal(engineOwns("the-loop", "?engine=the-loop"), "the-loop", "the-loop previews with its own id");
assert.equal(engineOwns("loop-awakening", "?engine=all"), null, "the awakening has no engine cut");
assert.equal(engineOwns("loop-awakening", "?engine=loop-awakening"), null);
assert.equal(engineOwns(null, "?engine=all"), null);

assert.equal(engineActive("p-nerve", undefined, "?engine=all"), true);
assert.equal(engineActive("p-nerve", {}, "?engine=all"), true);
assert.equal(engineActive("p-nerve", { "p-nerve": true }, "?engine=all"), false, "a failed engine hands the dock back");
assert.equal(engineActive("p-nerve", { "p-caustic": true }, "?engine=all"), true);
assert.equal(engineActive("p-nerve", undefined, ""), true, "a live dock plays on the engine with no flag");
assert.equal(engineActive("p-faraday", undefined, ""), false, "a dock that is not live keeps its R3F move");
assert.equal(engineActive(null, undefined, "?engine=all"), false);

assert.ok(existsSync(EC), "components/anime/EngineCut.jsx exists");
const src = readFileSync(EC, "utf8");
assert.match(src, /export default function EngineCut/);
assert.match(src, /engineOwns/);
assert.match(src, /onEnd/, "the player owns the end of the arrival");
assert.match(src, /compileAsync/, "programs compile behind the closed iris");
assert.match(src, /forceContextLoss/, "HEAD frees the WebGL context per arrival; the resident engine (WP2) replaces this with release()");
assert.doesNotMatch(src, /mountedAt/, "the cut starts at its first frame, never seeked by the load delay");

console.log("live.check: ok");
