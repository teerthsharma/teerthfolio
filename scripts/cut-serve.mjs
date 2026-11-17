// The lab page of ONE cutscene (or one hero look), bundled by esbuild and served from this process. A capture run that uses
// it depends on nothing but its own cutscene: another cutscene that fails to compile, or the dev server being down or busy,
// cannot touch it. A build error comes back as a thrown Error naming the file and line.   const url = await cutUrl("p-nerve", "t=3&paused")
// esbuild is looked for in the project and in .oneshot/tools; without it cutUrl falls back to the dev server's lab page.
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { labUrl } from "./lab-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const abs = (p) => JSON.stringify(path.join(root, p).replace(/\\/g, "/"));

function findEsbuild() {
  for (const base of [root, path.join(root, ".oneshot/tools")]) {
    try { return createRequire(path.join(base, "package.json"))("esbuild"); } catch { /* next */ }
  }
  return null;
}

function entry(dock, looks) {
  const hero = dock === "_hero";
  const map = looks.map((id) => `${JSON.stringify(id)}: () => import(${abs(`lib/anime/kit/hero/looks/${id}.js`)})`).join(", ");
  return `import { createElement } from "react";
import { createRoot } from "react-dom/client";
import CutCore from ${abs("components/anime/CutCore.jsx")};
const LOOKS = { ${map} };
const load = async () => {
  const out = { id: ${JSON.stringify(dock)}, scene: null, build: null, error: null };
  ${hero ? `globalThis.__heroLookId = ${JSON.stringify(looks[0])}; globalThis.__heroLoadLook = (id) => (LOOKS[id] ? LOOKS[id]() : Promise.reject(new Error("look " + id + " is not in this bundle")));` : ""}
  try { out.scene = (await import(${abs(`lib/anime/cutscenes/${dock}/scene.js`)})).default; } catch (e) { out.error = { file: "${dock}/scene.js", message: String(e?.stack ?? e) }; console.error(e); }
  try { out.build = (await import(${abs(`lib/anime/cutscenes/${dock}/build.js`)})).default; } catch (e) { out.error ??= { file: "${dock}/build.js", message: String(e?.stack ?? e) }; console.error(e); }
  return out;
};
createRoot(document.getElementById("root")).render(createElement(CutCore, { id: ${JSON.stringify(dock)}, load }));
`;
}

const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>cut</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>`;
const bundles = new Map();
let server = null, port = 0;

async function bundle(esbuild, dock, looks) {
  const res = await esbuild.build({
    stdin: { contents: entry(dock, looks), resolveDir: root, loader: "jsx", sourcefile: `lab-${dock}.jsx` },
    bundle: true, format: "esm", target: "es2022", platform: "browser", write: false, jsx: "automatic", logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_VERCEL_ENV": '""', "process.env.VERCEL_ENV": '""' },
    banner: { js: "globalThis.process ??= { env: {} };" },
  }).catch((e) => {
    const lines = (e.errors ?? []).slice(0, 6).map((x) => `${x.location ? `${path.relative(root, x.location.file).replace(/\\/g, "/")}:${x.location.line}: ` : ""}${x.text}`);
    throw new Error(`build of ${dock} failed: ${lines.join(" | ") || String(e.message ?? e).slice(0, 400)}`);
  });
  return res.outputFiles[0].text;
}

function listen() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const m = /^\/p\/([^/]+)\/(app\.js)?(?:\?.*)?$/.exec(req.url ?? "");
      const js = m && bundles.get(decodeURIComponent(m[1]));
      if (!js) { res.writeHead(404).end("no such bundle"); return; }
      if (m[2]) res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }).end(js);
      else res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(HTML);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { port = server.address().port; server.unref(); resolve(); });
  });
}

// dock: a cutscene id; query: "t=3&paused&look=gojo"; devPort: the dev server to fall back to when esbuild is missing
export async function cutUrl(dock, query = "", devPort = 3811) {
  const q = query.replace(/^[?&]+/, "");
  const esbuild = process.env.CUT_DEV_SERVER ? null : findEsbuild();
  if (!esbuild || !fs.existsSync(path.join(root, "lib/anime/cutscenes", dock, "scene.js"))) return labUrl(`http://localhost:${devPort}`, dock, q);
  const looks = dock === "_hero" ? [/(?:^|&)look=([\w-]+)/.exec(q)?.[1] ?? "gojo", /(?:^|&)second=([\w-]+)/.exec(q)?.[1]].filter(Boolean) : [];
  const key = [dock, ...looks].join("~");
  if (!bundles.has(key)) bundles.set(key, await bundle(esbuild, dock, [...new Set(looks)]));
  if (!server) await listen();
  return `http://127.0.0.1:${port}/p/${encodeURIComponent(key)}/?${q}`;
}

export function closeServe() { server?.close(); server = null; bundles.clear(); }
