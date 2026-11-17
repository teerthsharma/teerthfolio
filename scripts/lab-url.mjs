// The lab URL of a cutscene for the capture tools. Prefers the isolated per-cutscene and per-look pages written by
// scripts/lab-routes.mjs (one broken cutscene cannot take them down); falls back to the shared registry page.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const has = (...p) => fs.existsSync(path.join(root, "app/lab", ...p, "page.jsx"));

// dock: a cutscene id; query: "t=3&paused&look=gojo" (no leading ? or &)
export function labUrl(base, dock, query = "") {
  const q = query.replace(/^[?&]+/, "");
  if (dock === "_hero") {
    const look = /(?:^|&)look=([\w-]+)/.exec(q)?.[1] ?? "gojo";
    const multi = /(?:^|&)second=/.test(q); // a second hero needs every look: only the registry page has them
    if (!multi && has("hero", look)) return `${base}/lab/hero/${look}?${q}`;
  } else {
    const name = dock.startsWith("_") ? `x-${dock.slice(1)}` : dock;
    if (has("cut", name)) return `${base}/lab/cut/${name}?${q}`;
  }
  return `${base}/lab/anime?cut=${encodeURIComponent(dock)}&${q}`;
}
