/* global console, process */
// node components/world/cutscene/moves/pr-xnnpack-10801.build.check.mjs: buildWorld builds in yielding steps (F5, the prewarm slice bar) and returns the same world. Exit 0 when every law holds.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "pr-xnnpack-10801.jsx"), "utf8").replace(/\r\n/g, "\n");
const fails = [];
const law = (name, ok, detail = "") => {
  if (!ok) fails.push(`${name}${detail === "" ? "" : ` (${detail})`}`);
};

const KEYS = ["shared", "shell", "ground", "tsuki", "paperG", "paperP", "paper", "sil", "hullInk", "hullPaper", "pal", "tr", "th", "thInk", "az", "ic", "gi", "ur", "cpBody", "cpArms", "inkBasic", "bodies", "bodiesLine", "arms", "armsLine", "detail", "gap", "gapG", "slashM", "slashG", "letA", "letB", "flash"];

const start = src.indexOf("function* buildWorld() {");
law("buildWorld is a generator function", start >= 0);
const end = start < 0 ? -1 : src.indexOf("\n}\n", start);
law("buildWorld body closes at column 0", end > start);
const body = start < 0 || end < 0 ? "" : src.slice(start, end);

const yields = body.match(/\byield\b/g) ?? [];
law("buildWorld yields between steps (at least 8)", yields.length >= 8, String(yields.length));

const returns = body.match(/\breturn\s*\{/g) ?? [];
law("buildWorld has a single return {", returns.length === 1, String(returns.length));
const at = body.search(/\breturn\s*\{/);
const lit = at < 0 ? "" : body.slice(at);
const close = lit.indexOf("};");
law("the return literal closes and nothing follows it", close > 0 && lit.slice(close + 2).trim() === "");
const inner = close > 0 ? lit.slice("return {".length, close) : "";
const keys = inner.split(",").map((k) => k.trim().split(":")[0].trim()).filter((k) => k !== "");
law("return keys equal the original key list", JSON.stringify(keys) === JSON.stringify(KEYS), keys.join(" "));

law("registerWarm line is unchanged", src.includes('registerWarm("pr-xnnpack-10801", buildWorld);'));

if (fails.length) {
  console.error(`FAIL ${fails.length}:\n  - ${fails.join("\n  - ")}`);
  process.exit(1);
}
console.log("buildWorld builds in yielding steps and returns the original world keys");
