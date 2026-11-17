// The Microsoft Clarity gate: ID set, Do Not Track and Global Privacy Control off.
// Run: node scripts/trace.check.mjs
import assert from "node:assert/strict";
import { clarityEvent, clarityId, clarityLoader, shouldLoadClarity } from "../lib/clarity.js";

// The ID comes from the environment; anything that is not a Clarity ID is no ID.
assert.equal(clarityId(undefined), null);
assert.equal(clarityId(""), null);
assert.equal(clarityId("abc\");alert(1);//"), null);
assert.equal(clarityId("k3x9q2abcd"), "k3x9q2abcd");

// Loads only with an ID and without an opt-out signal.
assert.equal(shouldLoadClarity("k3x9q2abcd", {}, {}), true);
assert.equal(shouldLoadClarity("k3x9q2abcd", { doNotTrack: "0" }, {}), true);
assert.equal(shouldLoadClarity(undefined, {}, {}), false);
assert.equal(shouldLoadClarity("k3x9q2abcd", { doNotTrack: "1" }, {}), false);
assert.equal(shouldLoadClarity("k3x9q2abcd", {}, { doNotTrack: "yes" }), false);
assert.equal(shouldLoadClarity("k3x9q2abcd", { msDoNotTrack: "1" }, {}), false);
assert.equal(shouldLoadClarity("k3x9q2abcd", { globalPrivacyControl: true }, {}), false);

// The loader snippet points at the tag for that ID and nothing else.
assert.ok(clarityLoader("k3x9q2abcd").includes('"k3x9q2abcd"'));

// Custom events reach window.clarity when it exists and are a no-op when it does not.
const calls = [];
globalThis.window = {};
clarityEvent("dock-arrival");
globalThis.window.clarity = (...a) => calls.push(a);
clarityEvent("dock-arrival");
clarityEvent(42);
assert.deepEqual(calls, [["event", "dock-arrival"]]);
delete globalThis.window;

console.log("trace.check: ok");
