/* global console, URL */
// node lib/world/cutscene/prewarm-engine.check.mjs : the engine jobs of the shared prewarm skip a seen dock and run one prepare at a time, checked on its source.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../../../components/world/cutscene/prewarm.js", import.meta.url), "utf8");

const engineLoop = src.slice(src.indexOf("for (const q of ENGINE)"), src.indexOf("cands.sort("));
assert.ok(engineLoop.length > 0, "the engine loop is found in warmStep");

assert.match(
  engineLoop,
  /if \(q\.done\.has\(j\.id\) \|\| !engineActive\(j\.id, ui\.engineFail\) \|\| live\.seen\.has\(j\.id\)\) continue;/,
  "an engine job for a seen dock is skipped, as the world and loader paths are",
);

assert.match(engineLoop, /const dueNow = new Set\(/, "the jobs due this tick are collected before the candidates");
assert.match(engineLoop, /!live\.seen\.has\(j\.id\) &&/, "a seen dock does not count as in flight");
assert.match(engineLoop, /s <= DROP_S &&/, "a job past the drop distance does not count as in flight");
assert.doesNotMatch(engineLoop, /\[\.\.\.q\.started\]\.some\(\(id\) => id !== j\.id && !q\.done\.has\(id\)\)/, "a started job out of its window does not block the others");
const inFlight = engineLoop.search(/\[\.\.\.q\.started\]\.some\(\(id\) => id !== j\.id && dueNow\.has\(id\) && !q\.done\.has\(id\)\)/);
const pushAt = engineLoop.indexOf('kind: "engine"');
assert.ok(inFlight >= 0, "an engine candidate checks whether another job due this tick is in flight");
assert.ok(pushAt > inFlight, "the in-flight check runs before the engine candidate is pushed");

assert.match(src, /if \(!dock \|\| live\.seen\.has\(id\) \|\| !cutsceneMode\(id\)/, "the loader path still skips a seen dock");
assert.match(src, /live\.seen\.has\(p\.id\) \|\| !cutsceneMode\(p\.id\)/, "the world path still skips a seen dock");

console.log("prewarm-engine.check: ok");
