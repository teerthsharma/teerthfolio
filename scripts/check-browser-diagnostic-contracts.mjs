import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const verifiers = [
  ["particle", "scripts/verify-polar-semantic-particles.mjs"],
  ["station", "scripts/verify-polar-station-mechanisms.mjs"],
];

for (const [label, file] of verifiers) {
  const source = readFileSync(file, "utf8");
  const body = source.match(
    /function fatalBrowserLog\(entry\) \{([\s\S]*?)\r?\n\}/,
  )?.[1];
  assert.ok(body, `${label} verifier must expose a statically inspectable fatalBrowserLog predicate`);
  const fatalBrowserLog = new Function("entry", body);

  assert.equal(
    fatalBrowserLog({ type: "error", text: "Arbitrary browser console failure" }),
    true,
    `${label}: every console error must be fatal`,
  );
  assert.equal(
    fatalBrowserLog({ type: "pageerror", text: "Arbitrary page exception" }),
    true,
    `${label}: every page error must be fatal`,
  );
  assert.equal(
    fatalBrowserLog({
      type: "warning",
      text: "GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    }),
    false,
    `${label}: the known Chromium ReadPixels warning must remain benign`,
  );
  assert.equal(
    fatalBrowserLog({
      type: "error",
      text: "GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    }),
    true,
    `${label}: a console error must remain fatal even when its text matches the known ReadPixels warning`,
  );
  assert.equal(
    fatalBrowserLog({
      type: "pageerror",
      text: "GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    }),
    true,
    `${label}: a page error must remain fatal even when its text matches the known ReadPixels warning`,
  );
  assert.equal(
    fatalBrowserLog({ type: "warning", text: "WebGL context lost during render" }),
    true,
    `${label}: warning text with a fatal signature must be fatal`,
  );
}

const particleSource = readFileSync("scripts/verify-polar-semantic-particles.mjs", "utf8");
assert.match(
  particleSource,
  /diagnostics\.push\(\{ text: message\.text\(\), type: message\.type\(\) \}\)/,
  "particle console diagnostics must retain the event type",
);
assert.match(
  particleSource,
  /diagnostics\.push\(\{ text: error\.message, type: "pageerror" \}\)/,
  "particle page errors must retain the event type",
);

console.log("Browser diagnostic contracts passed: arbitrary errors fail and known ReadPixels noise is benign.");
