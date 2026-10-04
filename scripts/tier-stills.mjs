// The five HUD-off control stills at every pinned quality tier, through the
// still gate, plus the pup's value structure (key, fill, rim) on the spawn
// still compared with the top tier. A perf fix that buys frames by flattening
// the picture fails here.
//
//   node scripts/tier-stills.mjs [--url http://localhost:3403] [--param look] [--tiers 0,1,2]
//                                [--out verification/tiers] [--against verification/tiers-base]
//
// --against compares each still with the same file in another set (mean
// absolute difference per channel, 0-255) and fails above 6: a fix that
// should not change the look must not.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);
const base = (args.url || "http://localhost:3403").replace(/\/$/, "");
const param = args.param || "look";
const tiers = String(args.tiers ?? "0,1,2").split(",");
const out = args.out || "verification/tiers";
const CONTROLS = ["spawn", "pr-mujoco-3396", "pr-triton-kernels-22", "pr-tensorflow-124410", "pr-pyrefly-4180"];
const failures = [];
const rows = [];

// Luminance percentiles round the pup: on the spawn still at 1440x900 it
// stands low in the middle (about x 690-750, y 785-840 after 2.5 s).
async function pup(file) {
  const { width, height } = await sharp(file).metadata();
  const { data } = await sharp(file)
    .extract({ left: Math.round(width * 0.465), top: Math.round(height * 0.86), width: Math.round(width * 0.07), height: Math.round(height * 0.08) })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = [];
  for (let i = 0; i < data.length; i += 3) lum.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  lum.sort((a, b) => a - b);
  const at = (p) => +lum[Math.floor(lum.length * p)].toFixed(1);
  return { p5: at(0.05), p50: at(0.5), p98: at(0.98), spread: +(at(0.98) - at(0.05)).toFixed(1) };
}

async function diff(a, b) {
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).removeAlpha().raw().toBuffer()));
  if (x.length !== y.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  return +(sum / x.length).toFixed(2);
}

for (const tier of tiers) {
  for (const id of CONTROLS) {
    const file = path.join(out, `${id}-${param}${tier}.png`);
    const url = `${base}/?play&hud=off&${param}=${tier}${id === "spawn" ? "" : `&spawn=${id}`}`;
    const row = { tier, id };
    try {
      execFileSync("node", ["scripts/shot.mjs", "--url", url, "--out", file, "--w", "1440", "--h", "900", "--wait", "2500"], { stdio: "pipe" });
      execFileSync("node", ["scripts/still-gate.mjs", "--in", file], { stdio: "pipe" });
      row.gate = "pass";
    } catch (e) {
      row.gate = "fail";
      failures.push(`${id} at ${param}=${tier}: ${String(e.stdout || e.message).trim().slice(0, 200)}`);
    }
    if (id === "spawn" && existsSync(file)) row.pup = await pup(file);
    if (args.against && existsSync(file) && existsSync(path.join(args.against, path.basename(file)))) {
      row.diff = await diff(file, path.join(args.against, path.basename(file)));
      if (row.diff > 6) failures.push(`${id} at ${param}=${tier} differs from ${args.against} by ${row.diff} / 255`);
    }
    rows.push(row);
  }
}

// Key, fill and rim survive every tier: the pup's highlight-to-shade spread
// keeps 85% of the top tier's, and its highlight stays within 12 levels.
const top = rows.find((r) => r.id === "spawn" && r.tier === tiers.at(-1))?.pup;
for (const r of rows.filter((x) => x.id === "spawn" && x.pup && top)) {
  if (r.pup.spread < 0.85 * top.spread || Math.abs(r.pup.p98 - top.p98) > 12) {
    failures.push(`pup at ${param}=${r.tier}: spread ${r.pup.spread} vs ${top.spread}, highlight ${r.pup.p98} vs ${top.p98}`);
  }
}
console.log(JSON.stringify({ base, param, tiers, rows, pass: !failures.length, failures }, null, 1));
process.exit(failures.length ? 1 : 0);
