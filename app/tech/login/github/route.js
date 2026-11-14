import { createHash, randomBytes } from "node:crypto";
import { OAUTH_COOKIE, cookie, safeNext, signValue } from "../../../../lib/tech/auth.js";
import { redirect } from "../../../../lib/tech/http.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const next = safeNext(new URL(request.url).searchParams.get("next"), request);
  const oauth = signValue({ state, verifier, next, exp: Date.now() + 600_000 });

  const auth = new URL("https://github.com/login/oauth/authorize");
  auth.search = new URLSearchParams({
    client_id: process.env.AUTH_GITHUB_ID ?? "",
    redirect_uri: new URL("/tech/login/github/callback", request.url).href,
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    allow_signup: "false",
  }).toString();
  return redirect(request, auth.href, { status: 307, cookies: [cookie(OAUTH_COOKIE, oauth, 600)] });
}
