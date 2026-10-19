import { getSession } from "./lib/tech/auth.js";
import { islandNotFound } from "./lib/tech/http.js";

export async function proxy(request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/tech/login" || pathname.startsWith("/tech/login/")) return undefined;
  if (getSession(request)) return undefined;
  return islandNotFound(request);
}

export const config = { matcher: ["/tech", "/tech/:path*"] };
