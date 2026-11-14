import { SESSION_COOKIE, clearCookie, sameOrigin } from "../../../lib/tech/auth.js";
import { redirect, textResponse } from "../../../lib/tech/http.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!sameOrigin(request)) return textResponse(403, "Forbidden");
  return redirect(request, "/tech/login", { cookies: [clearCookie(SESSION_COOKIE)] });
}
