import {
  OAUTH_COOKIE, SESSION_COOKIE, SESSION_TTL_S, clearCookie, cookie, isAllowed, readCookie, safeEqual, signSession, verifyValue,
} from "../../../../../lib/tech/auth.js";
import { redirect } from "../../../../../lib/tech/http.js";

export const dynamic = "force-dynamic";

async function githubLogin(code, verifier, request) {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AUTH_GITHUB_ID,
      client_secret: process.env.AUTH_GITHUB_SECRET,
      code,
      redirect_uri: new URL("/tech/login/github/callback", request.url).href,
      code_verifier: verifier,
    }),
  });
  const { access_token: token } = await tokenRes.json();
  if (!tokenRes.ok || !token) throw new Error("no access token");
  const userRes = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${token}`, "user-agent": "evilseal-tech-gate", accept: "application/vnd.github+json" },
  });
  const { login } = await userRes.json();
  if (!userRes.ok || typeof login !== "string") throw new Error("no login");
  return login.toLowerCase();
}

export async function GET(request) {
  const cleared = [clearCookie(OAUTH_COOKIE)];
  const fail = (error) => redirect(request, `/tech/login?error=${error}`, { cookies: cleared });

  const q = new URL(request.url).searchParams;
  const oauth = verifyValue(readCookie(request, OAUTH_COOKIE));
  const code = q.get("code");
  if (!oauth || !code || !safeEqual(q.get("state") ?? "", oauth.state)) return fail("github");

  try {
    const login = await githubLogin(code, oauth.verifier, request);
    if (!isAllowed(`github:${login}`)) return fail("denied");
    return redirect(request, oauth.next, {
      cookies: [cookie(SESSION_COOKIE, signSession(`github:${login}`), SESSION_TTL_S), ...cleared],
    });
  } catch (e) {
    console.error("tech github sign-in failed:", e.message);
    return fail("github");
  }
}
