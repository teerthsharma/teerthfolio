export const GATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function build(body, status, contentType, cookies = [], extra = {}) {
  const headers = new Headers({ ...GATE_HEADERS, ...extra });
  if (contentType) headers.set("content-type", contentType);
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(body, { status, headers });
}

export const fileResponse = (bytes, contentType) => build(bytes, 200, contentType);

export const htmlResponse = (html, { status = 200, cookies = [], headers } = {}) =>
  build(html, status, "text/html; charset=utf-8", cookies, headers);

export const textResponse = (status, message) => build(message, status, "text/plain; charset=utf-8");

export const notFound = () => textResponse(404, "Not found");

// What an anonymous visitor sees: the island's own 404, fetched and returned
// as-is. A proxy rewrite would leak an x-middleware-rewrite header naming the
// gate (next.js discussion #58366), so the door would show.
// ponytail: fetches from the request's own origin, fine on Vercel where the
// host is the matched domain; a self-hosted server should pin that origin.
export async function islandNotFound(request) {
  try {
    const res = await fetch(new URL("/__tech-gate-404", request.url), { redirect: "manual" });
    if (res.status === 404) {
      const headers = new Headers(res.headers);
      for (const h of ["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]) headers.delete(h);
      const body = await res.arrayBuffer();
      headers.set("content-length", String(body.byteLength));
      return new Response(body, { status: 404, headers });
    }
  } catch (e) {
    console.error("tech island 404 unavailable:", e.message);
  }
  return notFound();
}

export function redirect(request, path, { status = 303, cookies = [] } = {}) {
  return build(null, status, null, cookies, { location: new URL(path, request.url).href });
}

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;background:#0b0b0d;color:#e8e8ea;margin:0;display:grid;place-items:center;min-height:100vh}
main{width:min(26rem,90vw)}h1{font-size:1.4rem;font-weight:600}a,button{color:inherit}
input,button,.btn{display:block;box-sizing:border-box;width:100%;padding:.7rem .8rem;margin:.6rem 0;font:inherit;border:1px solid #444;border-radius:6px;background:#17171a;text-align:center;text-decoration:none;cursor:pointer}
.err{color:#ff9d9d}ul{padding-left:1.2rem}`;

export const shell = (title, inner) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${inner}</main></body></html>`;
