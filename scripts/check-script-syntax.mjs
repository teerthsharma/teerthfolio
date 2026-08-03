// Every script in scripts/ parses.
//
// Written after a probe was committed with an unterminated string literal. The
// build passed, because nothing in the build chain imports a probe — the check:*
// scripts run, next build compiles the app, and a broken file under scripts/ is
// invisible to both. eslint did report it, in the same output as the passing
// build, and it was read as noise.
//
// So the parse is now part of the build rather than a habit. This is deliberately
// only a syntax check: it costs a few hundred milliseconds for the whole
// directory and it catches the one class of failure that ships silently. Running
// the probes themselves is not possible here, since they drive a browser against
// a server that the build has no business starting.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = join(process.cwd(), "scripts");
const files = (await readdir(root)).filter((name) => name.endsWith(".mjs")).sort();

if (files.length === 0) {
  console.error("script syntax check found no scripts to parse, which cannot be right");
  process.exit(1);
}

const failures = [];
await Promise.all(
  files.map(async (name) => {
    try {
      await run(process.execPath, ["--check", join(root, name)]);
    } catch (error) {
      const detail = String(error.stderr || error.message)
        .split("\n")
        .find((line) => /Error/.test(line));
      failures.push(`${name}: ${detail || "did not parse"}`);
    }
  }),
);

if (failures.length) {
  for (const failure of failures.sort()) console.error(`script syntax check failed: ${failure}`);
  process.exit(1);
}

console.log(`script syntax contract passed: ${files.length} scripts parse`);
