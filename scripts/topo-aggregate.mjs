// topo-aggregate.mjs: E0 table from raw cut-load, perf-frames and topo-audit runs.
// node scripts/topo-aggregate.mjs --raw <dir> [--meta <file>] --out <dir> [--allow-short]
// Writes E0.md and E0.json. Exit 0 ok, 1 bad input or adapter guard, 2 a group has fewer than 3 runs.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const GUARD = { intel: /Intel/i, nvidia: /NVIDIA/i };
const GROUPS = ["boot-default", "boot-hudoff", "walk", "audit-default", "audit-hudoff"];
const URL_LABEL = { default: "default", hudoff: "?hud=off" };
const CLASSES = ["static-only", "live-only", "dock-only", "mixed", "derived", "unattributed"];
const OWNER_ORDER = ["island-static", "buildings", "movers", "water+sea", "seal", "sky+fx", "post", "docks"];
const MIN_RUNS = 3;
const PRIOR_ART = "E0c prior art: 5.40 s / 112 programs at beff5e24 (docs/ARCHITECTURE.md:103-110).";
const LIMITS = `The audit runs on a tag-patched build, so its program totals are compared with the clean build's \`progs\` (boot table): a difference > 0 on the same adapter and URL is reported under the Q3 block, not hidden. Attribution follows the last program a material linked (\`currentProgram\`), so older variants of one material appear as \`unattributed\`; the anime engine's own context, renderer-internal PMREM and background programs are outside \`gl.info.programs\`. Owner grouping is by component, and several STATIC owners animate (land/Moat, MeltLake, Fountain, Highway, Triton, Rookery and others call \`useFrame\`), so \`moved\` and \`custom\` flags are printed beside the owner verdict and the verdict token uses owner classes only. "Time to first frame" is \`fcp\` (document paint) plus \`canvasMs\` from the audit, not a GPU frame stamp. Frame times come from \`--phase memory --secs 20\` (key cycle W D S A, 2 s each) at 1440x900 DPR 2, one machine, 3 runs, Intel UHD and RTX 4060 Laptop never compared. The tagged build is audit-only (Stage.jsx:245 and LoopAwakening.jsx:509 hide top-level scene children during an arrival).`;

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function quad(row) {
  if (typeof row[0] !== "string" || row[0].trim() === "") throw new Error("table row without an adapter string");
  return `| ${row.join(" | ")} |`;
}

const uniq = (xs) => [...new Set(xs.filter((x) => x !== undefined && x !== null))];

function parseName(name) {
  const m = /^(boot|audit|walk)-(intel|nvidia)-(?:(default|hudoff)-)?r(\d+)\.json$/.exec(name);
  if (!m || (m[1] === "walk") !== (m[3] === undefined)) return null;
  return { kind: m[1], flag: m[2], url: m[3], group: m[1] === "walk" ? "walk" : `${m[1]}-${m[3]}`, run: Number(m[4]) };
}

function flat(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "number") out[key] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out);
  }
  return out;
}

function readRun(name, meta, json) {
  if (meta.kind === "boot") {
    const r = json.phases?.boot?.runs?.[0];
    if (!r) throw new Error(`${name}: no phases.boot.runs[0]`);
    return { adapter: r.adapter, tier: null, names: [], values: flat({ readyMs: r.readyMs, progs: r.progs, fcp: r.fcp, pupMs: r.pupMs }) };
  }
  if (meta.kind === "walk") {
    const m = json.memory ?? {};
    return {
      adapter: json.gpu,
      tier: json.tier ?? null,
      names: [],
      values: flat({ frames: m.frames, p50: m.p50, p95: m.p95, p99: m.p99, max: m.max, over50: m.over50, tierChanges: m.tierChanges, linkedDuringWalk: json.walk?.linkedDuringWalk, loadMax: json.load?.max }),
    };
  }
  const programs = Array.isArray(json.programs) ? json.programs : [];
  return {
    adapter: json.adapter,
    tier: null,
    names: programs.filter((p) => p.class === "unattributed").map((p) => p.name),
    values: flat({ total: json.total?.atReady, classes: json.classes, owners: json.owners, mixedPairs: json.mixedPairs }),
  };
}

function loadRaw(dir) {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const meta = parseName(name);
    if (!meta) continue;
    const json = JSON.parse(readFileSync(join(dir, name), "utf8"));
    const run = readRun(name, meta, json);
    if (typeof run.adapter !== "string" || !GUARD[meta.flag].test(run.adapter)) {
      throw new Error(`${name}: adapter "${run.adapter}" does not match ${GUARD[meta.flag]} (failed LUID pin or software GL?)`);
    }
    files.push({ name, ...meta, ...run, kind: meta.kind, build: json.build ?? null, commit: json.commit ?? null });
  }
  return files;
}

function summarize(runs, fillZero) {
  const keys = new Set(runs.flatMap((r) => Object.keys(r.values)));
  const out = {};
  for (const k of [...keys].sort()) {
    const xs = runs.map((r) => r.values[k] ?? (fillZero ? 0 : undefined)).filter((x) => typeof x === "number");
    if (xs.length) out[k] = { median: median(xs), min: Math.min(...xs), max: Math.max(...xs), runs: xs };
  }
  return out;
}

function buildGroups(files) {
  const groups = {};
  for (const flag of Object.keys(GUARD)) {
    for (const group of GROUPS) {
      const runs = files.filter((f) => f.flag === flag && f.group === group).sort((x, y) => x.run - y.run);
      groups[`${flag}/${group}`] = { flag, group, runs, summary: summarize(runs, group.startsWith("audit")) };
    }
  }
  return groups;
}

const fmt = (x, d = 0) => (x === null || x === undefined ? "n/a" : x.toFixed(d));
const med = (s, d = 0) => (s ? fmt(s.median, d) : "n/a");
const spread = (s, d = 0) => (s ? `${fmt(s.median, d)} (${fmt(s.min, d)}-${fmt(s.max, d)})` : "n/a");
const pct = (x) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const signed = (x, unit) => (x === null ? "n/a" : `${x >= 0 ? "+" : ""}${x.toFixed(0)}${unit}`);
const label = (g) => (g.runs.length ? uniq(g.runs.map((r) => r.adapter)).join(" / ") : `MISSING ${g.flag}/${g.group}`);

function table(cols, rows) {
  return [quad(cols), `| ${cols.map(() => "---").join(" | ")} |`, ...rows].join("\n");
}

function e0cRow(d, h) {
  if (!d.runs.length || !h.runs.length) return quad([label(d), "E0c delta: default minus ?hud=off", "-", "n/a", "n/a", "-", "-"]);
  const diff = (k) => (d.summary[k] && h.summary[k] ? d.summary[k].median - h.summary[k].median : null);
  return quad([label(d), "E0c delta: default minus ?hud=off", "-", signed(diff("readyMs"), " ms"), signed(diff("progs"), " programs"), "-", "-"]);
}

function bootSection(groups) {
  const rows = [];
  for (const flag of Object.keys(GUARD)) {
    const d = groups[`${flag}/boot-default`];
    const h = groups[`${flag}/boot-hudoff`];
    for (const [url, g] of [["default", d], ["hudoff", h]]) {
      if (!g.runs.length) {
        rows.push(quad([label(g), URL_LABEL[url], 0, "n/a", "n/a", "n/a", "n/a"]));
        continue;
      }
      const s = g.summary;
      rows.push(quad([label(g), URL_LABEL[url], g.runs.length, spread(s.readyMs), spread(s.progs), med(s.fcp), med(s.pupMs)]));
    }
    rows.push(e0cRow(d, h));
  }
  return `${table(["adapter string", "URL", "n", "readyMs med (min-max)", "programs med (min-max)", "fcp med", "pupMs med"], rows)}\n\n${PRIOR_ART}`;
}

function walkSection(groups) {
  const rows = Object.keys(GUARD).map((flag) => {
    const g = groups[`${flag}/walk`];
    if (!g.runs.length) return quad([label(g), "-", 0, "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a"]);
    const s = g.summary;
    const tiers = uniq(g.runs.map((r) => r.tier)).join(" / ") || "n/a";
    return quad([label(g), tiers, med(s.frames), med(s.p50, 1), spread(s.p95, 1), med(s.p99, 1), med(s.max, 1), med(s.over50), med(s.tierChanges), med(s.linkedDuringWalk), med(s.loadMax, 1)]);
  });
  return table(["adapter string", "tier", "frames", "p50", "p95 med (min-max)", "p99", "max", "over50", "tierChanges", "linkedDuringWalk", "load.max"], rows);
}

function ownerIds(s) {
  const ids = new Set();
  for (const k of Object.keys(s)) {
    const m = /^owners\.(.+)\.exclusive$/.exec(k);
    if (m) ids.add(m[1]);
  }
  const rank = (id) => (OWNER_ORDER.includes(id) ? OWNER_ORDER.indexOf(id) : OWNER_ORDER.length);
  return [...ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function namesText(runs) {
  const counts = new Map();
  for (const r of runs) for (const n of r.names) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n, c]) => `${n} x ${c}`);
  return parts.length ? `${parts.join(", ")} (summed over runs)` : "none";
}

function ownershipSection(groups) {
  const rows = [];
  for (const flag of Object.keys(GUARD)) {
    for (const url of ["default", "hudoff"]) {
      const g = groups[`${flag}/audit-${url}`];
      if (!g.runs.length) {
        rows.push(quad([label(g), URL_LABEL[url], "-", "n/a", "n/a", "n/a", ""]));
        continue;
      }
      const s = g.summary;
      for (const id of ownerIds(s)) {
        rows.push(quad([label(g), URL_LABEL[url], id, med(s[`owners.${id}.exclusive`]), med(s[`owners.${id}.shared`]), med(s[`owners.${id}.meshes`]), ""]));
      }
      rows.push(quad([label(g), URL_LABEL[url], "shadow-depth", med(s["classes.derived"]), "-", "-", "derived class: renderer-internal depth programs with no material owner"]));
      rows.push(quad([label(g), URL_LABEL[url], "unattributed", med(s["classes.unattributed"]), "-", "-", namesText(g.runs)]));
    }
  }
  return table(["adapter string", "URL", "owner", "exclusive med", "shared med", "meshes med", "note"], rows);
}

function topPairs(s) {
  const pairs = Object.keys(s).filter((k) => k.startsWith("mixedPairs."));
  return pairs
    .map((k) => [k.slice("mixedPairs.".length), s[k].median])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([p, m]) => `${p} ${m}`)
    .join(", ") || "none";
}

function q3Section(groups) {
  const rows = [];
  const notes = [];
  for (const flag of Object.keys(GUARD)) {
    for (const url of ["default", "hudoff"]) {
      const g = groups[`${flag}/audit-${url}`];
      const c = Object.fromEntries(CLASSES.map((k) => [k, g.summary[`classes.${k}`]?.median ?? null]));
      const total = g.summary.total?.median ?? null;
      if (!g.runs.length || !total || CLASSES.some((k) => c[k] === null)) {
        rows.push(quad([label(g), URL_LABEL[url], ...Array(9).fill("n/a"), "MISSING"]));
        continue;
      }
      const cells = CLASSES.map((k) => `${c[k]} (${pct(c[k] / total)})`);
      const lower = (c["live-only"] + c["dock-only"]) / total;
      const upper = lower + (c.mixed + c.derived + c.unattributed) / total;
      const verdict = lower >= 0.8 ? ">=80% LIVE/POST/DOCK: TRIGGERED" : upper < 0.8 ? "NOT TRIGGERED" : "UNRESOLVED";
      rows.push(quad([label(g), URL_LABEL[url], fmt(total), ...cells, pct(lower), pct(upper), verdict]));
      notes.push(`- mixedPairs top 5, ${label(g)}, ${URL_LABEL[url]}: ${topPairs(g.summary)}`);
      notes.push(`- unattributed program names, ${label(g)}, ${URL_LABEL[url]}: ${namesText(g.runs)}`);
    }
  }
  const cols = ["adapter string", "URL", "total.atReady med", ...CLASSES, "lower", "upper", "verdict"];
  return `${table(cols, rows)}\n\n${notes.join("\n")}`;
}

function render(groups, files, meta) {
  const clean = uniq(files.filter((f) => f.kind !== "audit").map((f) => f.build));
  const tagged = uniq(files.filter((f) => f.kind === "audit").map((f) => f.build));
  const commits = uniq(files.map((f) => f.commit));
  const ram = meta.freeRamKbAtStart ? `${(meta.freeRamKbAtStart / 1048576).toFixed(2)} GB free at start` : "not recorded";
  return [
    "# E0 baseline: aggregate",
    "",
    `- date: ${meta.date ?? "not recorded"}`,
    `- commit: ${meta.commit ?? (commits.join(", ") || "n/a")}`,
    `- build clean: ${clean.join(", ") || "n/a"}`,
    `- build tagged: ${tagged.join(", ") || "n/a"}`,
    `- RAM: ${ram}`,
    `- node: ${meta.node ?? process.version}`,
    "",
    "## Boot (cut-load --phase boot, one run per browser launch)",
    "",
    bootSection(groups),
    "",
    "## Walk (perf-frames --phase memory --secs 20)",
    "",
    walkSection(groups),
    "",
    "## Ownership (topo-audit, tagged build)",
    "",
    ownershipSection(groups),
    "",
    "## Q3 (program classes, medians over runs)",
    "",
    q3Section(groups),
    "",
    "## Limits",
    "",
    LIMITS,
    "",
  ].join("\n");
}

function toJson(groups, files, meta) {
  return {
    schema: "topo-e0/1",
    date: meta.date ?? null,
    commit: meta.commit ?? (uniq(files.map((f) => f.commit)).join(", ") || null),
    groups: Object.fromEntries(
      Object.entries(groups).map(([key, g]) => [
        key,
        {
          flag: g.flag,
          group: g.group,
          n: g.runs.length,
          adapters: uniq(g.runs.map((r) => r.adapter)),
          files: g.runs.map((r) => r.name),
          runs: g.runs.map((r) => ({ run: r.run, adapter: r.adapter, tier: r.tier, values: r.values, names: r.names })),
          summary: g.summary,
        },
      ]),
    ),
  };
}

function parseArgs(argv) {
  const out = { allowShort: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allow-short") out.allowShort = true;
    else if (a === "--raw" || a === "--meta" || a === "--out") {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      out[a.slice(2)] = argv[++i];
    } else throw new Error(`unknown argument ${a}`);
  }
  if (!out.raw || !out.out) throw new Error("usage: node scripts/topo-aggregate.mjs --raw <dir> [--meta <file>] --out <dir> [--allow-short]");
  return out;
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`topo-aggregate: ${e.message}`);
    return 1;
  }
  try {
    const meta = args.meta ? JSON.parse(readFileSync(args.meta, "utf8")) : {};
    const files = loadRaw(args.raw);
    const groups = buildGroups(files);
    mkdirSync(args.out, { recursive: true });
    writeFileSync(join(args.out, "E0.md"), render(groups, files, meta));
    writeFileSync(join(args.out, "E0.json"), JSON.stringify(toJson(groups, files, meta), null, 1));
    for (const [key, g] of Object.entries(groups)) {
      if (!g.runs.length) console.log(`MISSING ${key}`);
      else if (g.runs.length < MIN_RUNS) console.log(`SHORT ${key} n=${g.runs.length}`);
    }
    console.log(`wrote ${join(args.out, "E0.md")}`);
    const thin = Object.values(groups).some((g) => g.runs.length < MIN_RUNS);
    return thin && !args.allowShort ? 2 : 0;
  } catch (e) {
    console.error(`topo-aggregate: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && basename(process.argv[1]) === "topo-aggregate.mjs") process.exitCode = main(process.argv.slice(2));
