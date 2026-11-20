// node components/world/sound-ensure.check.mjs : the audio graph is built at idle after ready, and only a gesture resumes it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(import.meta.dirname, "Sound.jsx"), "utf8");

const ctorRe = /new (?:Ctx|(?:window\.)?(?:webkit)?AudioContext)\s*\(/g;
const ensureAt = src.indexOf("function ensure()");
assert.ok(ensureAt > 0, "ensure is declared");
const ensureBody = src.slice(ensureAt, src.indexOf("\n  function ", ensureAt + 1));

assert.equal((src.match(ctorRe) || []).length, 1, "exactly one AudioContext is constructed");
assert.equal((ensureBody.match(ctorRe) || []).length, 1, "the one AudioContext is constructed inside ensure");

assert.match(src, /const ready = useUi\(\(s\) => s\.ready\);/, "the effect reads ui.ready");
assert.match(src, /requestIdleCallback\(engine\.ensure, \{ timeout: 4000 \}\)/, "the graph is built at idle after ready");
assert.match(src, /setTimeout\(engine\.ensure, 1500\)/, "the fallback builds the graph after 1500 ms");
assert.match(src, /cancelIdleCallback\(idle\)/, "the idle callback is cancelled on cleanup");
assert.match(src, /clearTimeout\(timer\)/, "the fallback timer is cancelled on cleanup");
assert.match(src, /return \{ ensure, unlock,/, "ensure is exported to the Sound effect");
assert.match(src, /\}, \[ready\]\);/, "the idle build is keyed on ready");

assert.match(src, /function unlock\(\) \{\s*gestured = true;\s*ensure\(\);/, "only unlock (a gesture listener) marks the gesture and builds through ensure");
assert.match(src, /else if \(gestured && wantSound && ctx\.state === "suspended"\)/, "visibility resumes only after a gesture");
