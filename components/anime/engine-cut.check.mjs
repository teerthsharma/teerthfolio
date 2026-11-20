// node components/anime/engine-cut.check.mjs : the engine host's contract (ARCHITECTURE-PLAN WP2, section 3.4), checked on its source.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./EngineCut.jsx", import.meta.url), "utf8");

assert.match(src, /^"use client";/m, "the host is a client component");
assert.match(src, /export default function EngineCut\(\)/, "the export is unchanged");
assert.match(src, /export const ENGINE_START_MS = 8000;/, "a dock with no first frame in 8 s falls back");
assert.match(src, /clearTimeout\(guard\)/, "the guard is cleared on the first frame and on every exit");
assert.match(src, /engine start timeout/);

assert.match(src, /markEngineFail\(place\)/, "a failure is recorded under the place, through one function");
assert.match(src, /\[place\]: true/, "engineFail is keyed by the place");
assert.doesNotMatch(src, /\[dock\]: true/, "engineFail is never keyed by the registry id");

assert.match(src, /prep\.prefetch\(dock\)/, "the arrival awaits the prefetched dock");
assert.match(src, /prep\.take\(dock\)/, "the arrival takes a prepared player when one is ready");
const hotAt = src.indexOf("if (hot) {"), releaseAt = src.indexOf("prep.release(dock)"), coldAt = src.indexOf("else {", hotAt), lossAt = src.indexOf("forceContextLoss()");
assert.ok(hotAt > 0 && hotAt < releaseAt && releaseAt < coldAt && coldAt < lossAt, "a taken engine is released; only the cold engine loses its context");

assert.match(src, /live\.engineCover = r >= IRIS_MAX/, "the cover flag is raised while the iris is fully open");
assert.match(src, /live\.engineCover = false/, "the cover flag is cleared on the exit paths");

assert.match(src, /engine-fault/, "the fault injection is in the host");
assert.match(src, /"hang"/);
assert.match(src, /prep\.configure\(\{/, "the host supplies the prep's loaders and factories");
assert.match(src, /modeOf: \(engine\) => modeForTier\(engine\.tier\)/, "the mode comes from lib/quality/modes.js");
assert.match(src, /off: new URLSearchParams\(location\.search\)\.get\("hot"\) === "off" \|\| modeForTier\(classify\(window\.__world\?\.gpu\)\) === "low"/, "a low-mode GPU never spins the resident engine");

assert.match(src, /registerEngineProvider\(\{/, "the engine's jobs are registered with the shared prewarm");
assert.match(src, /critical: \(\) => true/, "the shared modules load before ready");
assert.match(src, /prep\.preload\(\)/);
assert.match(src, /prep\.prepare\(dock\)/, "a dock is prepared once the seal is within the horizon");
assert.match(src, /for \(const mesh of meshes\) \{\s*gl\.setRenderTarget\(rt\);\s*await gl\.compileAsync\(mesh, player\.camera, player\.root\);\s*gl\.setRenderTarget\(null\);\s*await new Promise\(\(r\) => setTimeout\(r, 16\)\);\s*\}/, "the player links one mesh per task, with a frame between links");
assert.match(src, /const compiled = gl\.compileAsync\(player\.root, player\.camera\);/, "the cold arrival path keeps a single compileAsync");
assert.match(src, /markEngineFail\(place\); \}\);/, "a failed prepare marks the place at once");
assert.match(src, /drop\(place\) \{ prep\.drop/, "a dock the seal leaves is dropped");
assert.doesNotMatch(src, /^import .*lib\/anime\/engine\.js"/m, "the engine is loaded on demand, not in the Scene chunk");
assert.doesNotMatch(src, /^import .*cutscenes\/framework\.js"/m, "the player is loaded on demand, not in the Scene chunk");

console.log("engine-cut.check: ok");
