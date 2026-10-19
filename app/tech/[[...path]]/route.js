import { readFile } from "node:fs/promises";
import { getSession } from "../../../lib/tech/auth.js";
import { TECH_PAGES, contentType, decodeSegments, indexHtml, locate, placeholderHtml } from "../../../lib/tech/content.js";
import { fileResponse, htmlResponse, islandNotFound, notFound, redirect } from "../../../lib/tech/http.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!getSession(request)) return islandNotFound(request);

  const { pathname } = new URL(request.url);
  const segs = decodeSegments(pathname);
  if (!segs) return notFound();
  if (segs.length === 0) return htmlResponse(indexHtml());

  const page = TECH_PAGES.find((p) => p.slug === segs[0]);
  const hit = await locate(segs);
  if (hit?.dir || (page && segs.length === 1 && !hit)) {
    return redirect(request, pathname.replace(/\/+$/, "") + "/index.html", { status: 307 });
  }
  if (hit?.file) return fileResponse(await readFile(hit.file), contentType(hit.file));
  if (page && segs.length === 2 && segs[1] === "index.html") return htmlResponse(placeholderHtml(page));
  return notFound();
}
