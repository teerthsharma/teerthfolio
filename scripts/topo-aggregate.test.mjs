import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { median, quad } from "./topo-aggregate.mjs";

const SCRIPT = fileURLToPath(new URL("./topo-aggregate.mjs", import.meta.url));
const FIXTURE = fileURLToPath(new URL("./fixtures/topo-e0/raw", import.meta.url));
const INTEL = "ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11)";

function aggregate(raw, extra = []) {
  const out = mkdtempSync(join(tmpdir(), "topo-agg-out-"));
  const res = spawnSync(process.execPath, [SCRIPT, "--raw", raw, "--out", out, ...extra], { encoding: "utf8" });
  return { res, out };
}

function copyFixture() {
  const dir = mkdtempSync(join(tmpdir(), "topo-agg-raw-"));
  for (const name of ["boot-intel-default-r1.json", "boot-intel-default-r2.json", "boot-intel-default-r3.json",
    "boot-intel-hudoff-r1.json", "boot-intel-hudoff-r2.json", "boot-intel-hudoff-r3.json",
    "walk-intel-r1.json", "walk-intel-r2.json", "walk-intel-r3.json",
    "audit-intel-default-r1.json", "audit-intel-default-r2.json", "audit-intel-default-r3.json"]) {
    copyFileSync(join(FIXTURE, name), join(dir, name));
  }
  return dir;
}

function replaceIn(dir, name, from, to) {
  const path = join(dir, name);
  writeFileSync(path, readFileSync(path, "utf8").replaceAll(from, to));
}

test("median takes the middle value, or the mean of the two middles for even n", () => {
  assert.equal(median([5000, 5400, 5200]), 5200);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test("quad refuses a table row without an adapter string first", () => {
  assert.equal(quad([INTEL, "default", 3]), `| ${INTEL} | default | 3 |`);
  assert.throws(() => quad(["", "default", 3]), /adapter/);
});

test("fixture medians, deltas, walk p95 and Q3 verdict appear verbatim in E0.md", () => {
  const { res, out } = aggregate(FIXTURE, ["--allow-short"]);
  assert.equal(res.status, 0, res.stderr);
  const md = readFileSync(join(out, "E0.md"), "utf8");
  for (const s of ["5200 (5000-5400)", "112 (112-114)", "+1100 ms", "+22", "20.0 (19.0-21.5)",
    "44.6%", "64.3%", "NOT TRIGGERED"]) {
    assert.ok(md.includes(s), `E0.md missing ${s}`);
  }
  assert.doesNotThrow(() => JSON.parse(readFileSync(join(out, "E0.json"), "utf8")));
});

test("a missing group prints MISSING and exits 2 without --allow-short", () => {
  const { res } = aggregate(FIXTURE, []);
  assert.equal(res.status, 2);
  assert.ok(res.stdout.includes("MISSING"));
});

test("a non-Intel adapter string in an intel file exits 1 and names the file", () => {
  const dir = copyFixture();
  replaceIn(dir, "boot-intel-default-r2.json", INTEL, "Microsoft Basic Render Driver");
  const { res } = aggregate(dir, ["--allow-short"]);
  assert.equal(res.status, 1);
  assert.ok(res.stderr.includes("boot-intel-default-r2.json"));
});

test("the nvidia guard rejects a non-NVIDIA string and accepts an NVIDIA one", () => {
  const dir = copyFixture();
  copyFileSync(join(dir, "boot-intel-default-r1.json"), join(dir, "boot-nvidia-default-r1.json"));
  const bad = aggregate(dir, ["--allow-short"]);
  assert.equal(bad.res.status, 1);
  assert.ok(bad.res.stderr.includes("boot-nvidia-default-r1.json"));

  replaceIn(dir, "boot-nvidia-default-r1.json", INTEL, "NVIDIA GeForce RTX 4060 Laptop GPU");
  const good = aggregate(dir, ["--allow-short"]);
  assert.equal(good.res.status, 0, good.res.stderr);
});

test("no --raw or --out is a usage error", () => {
  const res = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(res.status, 1);
});
