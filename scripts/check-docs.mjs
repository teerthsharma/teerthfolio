// Doc link check: every relative markdown link resolves, and every repo path written in backticks in a living doc exists.
// Dated records (docs/design, docs/research, docs/thesis) describe the tree as it was; only their links are checked.
//   node scripts/check-docs.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "*.md"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
const dated = (f) => /^docs\/(design|research|thesis)\//.test(f);
const ignored = (f) => f.startsWith(".oneshot/") || f.startsWith("node_modules/");
// repo path tokens in backticks start at one of the top-level directories
const pathToken = /^(?:app|components|lib|scripts|docs|experiments|lean|public|data)\/[\w./@[\]-]+$/;

// paths a document names as planned or optional, not present in the tree
const PLANNED = ["public/plates", "lib/anime/bake", "lib/anime/catalog.js", "lib/world/heat"];
const planned = (t) => PLANNED.some((p) => t === p || t.startsWith(p + "/"));

let bad = 0;
const fail = (f, line, what) => { bad++; console.log(`${f}:${line}: ${what}`); };

for (const f of files) {
  if (ignored(f)) continue;
  const text = readFileSync(path.join(root, f), "utf8").split("\n");
  text.forEach((ln, i) => {
    for (const m of ln.matchAll(/\]\(([^)\s]+)\)/g)) {
      const t = m[1].split("#")[0];
      if (!t || /^(https?:|mailto:)/.test(t)) continue;
      if (!existsSync(path.resolve(root, path.dirname(f), t))) fail(f, i + 1, `broken link (${m[1]})`);
    }
    if (dated(f)) return;
    for (const m of ln.matchAll(/`([^`\s]+)`/g)) {
      const t = m[1].replace(/[:#]\d+(-\d+)?$/, "").replace(/[.,;]$/, "");
      if (!pathToken.test(t) || /[<>*]|\.\.\./.test(t)) continue;
      if (!planned(t) && !existsSync(path.join(root, t))) fail(f, i + 1, `missing path \`${t}\``);
    }
  });
}
console.log(bad ? `docs check: ${bad} problem(s)` : "docs check: ok");
process.exit(bad ? 1 : 0);
