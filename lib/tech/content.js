import { realpath, stat } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { escapeHtml, shell } from "./http.js";

// One entry per gated page; files live in private/tech/<slug>/.
export const TECH_PAGES = [{ slug: "asmodeus", title: "Asmodeus" }];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

export const contentType = (file) => TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";

const contentRoot = () => process.env.TECH_CONTENT_DIR ?? join(process.cwd(), "private", "tech");

// Decodes each raw path segment itself, so %2f, %5c and %2e%2e are seen as what they decode to.
export function decodeSegments(pathname) {
  if (pathname !== "/tech" && !pathname.startsWith("/tech/")) return null;
  const raw = pathname.split("/").slice(2);
  if (raw[raw.length - 1] === "") raw.pop();
  const out = [];
  for (const r of raw) {
    let s;
    try {
      s = decodeURIComponent(r);
    } catch {
      return null;
    }
    if (!s || s.startsWith(".") || /[/\\\0]/.test(s)) return null;
    out.push(s);
  }
  return out;
}

// Resolves to a real file or directory strictly inside the content root, else null.
export async function locate(segs) {
  try {
    const root = await realpath(contentRoot());
    const real = await realpath(join(root, ...segs));
    if (!real.startsWith(root + sep)) return null;
    const s = await stat(real);
    if (s.isDirectory()) return { dir: true };
    return s.isFile() ? { file: real } : null;
  } catch {
    return null;
  }
}

export const indexHtml = () =>
  shell(
    "Tech",
    `<h1>Tech</h1><ul>${TECH_PAGES.map((p) => `<li><a href="/tech/${p.slug}/index.html">${escapeHtml(p.title)}</a></li>`).join("")}</ul>` +
      `<form method="post" action="/tech/logout"><button>Sign out</button></form>`,
  );

export const placeholderHtml = (page) =>
  shell(page.title, `<h1>${escapeHtml(page.title)}</h1><p>This page has not been deployed to this environment.</p>`);
