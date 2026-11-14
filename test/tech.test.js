// The /tech gate's security contract. Run with `npm test` (node --test).
import { test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGIN = "https://www.evilseal.si";
const tmp = mkdtempSync(join(tmpdir(), "tech-gate-"));
const content = join(tmp, "content");
mkdirSync(join(content, "demo"), { recursive: true });
writeFileSync(join(content, "demo", "index.html"), "<!doctype html><title>demo</title><link rel=stylesheet href=style.css>");
writeFileSync(join(content, "demo", "style.css"), "body{color:red}");
writeFileSync(join(content, "demo", ".env"), "TOKEN=dotfiles are never served");
writeFileSync(join(tmp, "secret.txt"), "outside the content root");

Object.assign(process.env, {
  AUTH_SECRET: "test-secret-test-secret-test-secret-0123456789",
  TECH_ALLOWLIST: "github:Allowed-User, email:Allowed@Example.com",
  TECH_CONTENT_DIR: content,
  AUTH_GITHUB_ID: "gh-id",
  AUTH_GITHUB_SECRET: "gh-secret",
  RESEND_API_KEY: "re_test",
  TECH_EMAIL_FROM: "Tech <tech@example.com>",
});
delete process.env.VERCEL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const { proxy, config } = await import("../proxy.js");
const content_ = await import("../app/tech/[[...path]]/route.js");
const login = await import("../app/tech/login/route.js");
const github = await import("../app/tech/login/github/route.js");
const callback = await import("../app/tech/login/github/callback/route.js");
const otp = await import("../app/tech/login/otp/route.js");
const verify = await import("../app/tech/login/verify/route.js");
const logout = await import("../app/tech/logout/route.js");
const { signSession } = await import("../lib/tech/auth.js");
const { resetMemoryKv } = await import("../lib/tech/kv.js");

// --- helpers -------------------------------------------------------------

const cookiesOf = (res) =>
  Object.fromEntries(res.headers.getSetCookie().map((c) => {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    return [pair.slice(0, i), pair.slice(i + 1)];
  }));
const rawCookie = (res, name) => res.headers.getSetCookie().find((c) => c.startsWith(name + "="));
const jar = (obj) => Object.entries(obj).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("; ");
const get = (path, cookie = "") => new Request(ORIGIN + path, { headers: cookie ? { cookie } : {} });
const post = (path, fields, { cookie = "", origin = ORIGIN } = {}) =>
  new Request(ORIGIN + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(fields),
  });
const location = (res) => new URL(res.headers.get("location"), ORIGIN);
const session = (sub) => `__Host-tech_session=${signSession(sub)}`;
const isRedirect = (res) => res.status >= 300 && res.status < 400;
// /tech is a hidden door: to anyone without a session it looks exactly like a
// path the island does not have, the island's own 404 page, with no redirect
// and no x-middleware-rewrite header (Next leaks the rewrite target in it).
const assertHidden = (res) => {
  assert.ok(res, "proxy must not pass an anonymous request through");
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("location"), null, "no redirect may reveal a login page");
  assert.equal(res.headers.get("x-middleware-rewrite"), null, "a rewrite header would name the gate");
};
const noSession = (res) => {
  const c = cookiesOf(res)["__Host-tech_session"];
  assert.ok(!c, "no session cookie may be issued");
};

let sent; // emails captured from the Resend mock
let githubLogin; // login the GitHub mock reports
const realFetch = globalThis.fetch;
beforeEach(() => {
  resetMemoryKv();
  sent = [];
  githubLogin = "allowed-user";
  globalThis.fetch = mock.fn(async (url, init = {}) => {
    const u = String(url);
    if (u === "https://api.resend.com/emails") {
      sent.push(JSON.parse(init.body));
      return Response.json({ id: "email-1" });
    }
    if (u === "https://github.com/login/oauth/access_token") return Response.json({ access_token: "gho_test" });
    if (u === "https://api.github.com/user") return Response.json({ login: githubLogin, id: 1 });
    throw new Error("unexpected fetch " + u);
  });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  mock.timers.reset();
});
const codeFrom = (email) => email.text.match(/\b(\d{6})\b/)[1];

// --- the gate ------------------------------------------------------------

test("proxy matches /tech and everything under it", () => {
  const m = [].concat(config.matcher);
  assert.ok(m.some((p) => p.startsWith("/tech")));
});

test("unauthenticated /tech, page and asset requests see the island 404, not a login page", async () => {
  for (const path of ["/tech", "/tech/asmodeus", "/tech/asmodeus/index.html", "/tech/demo/style.css", "/tech/loginx"]) {
    assertHidden(await proxy(get(path)));
    assertHidden(await content_.GET(get(path))); // the route repeats the check
  }
});

test("the hidden 404 is the island's own 404 page, byte for byte", async () => {
  const island = "<!doctype html><title>404: This page could not be found.</title>";
  globalThis.fetch = mock.fn(async (url) => {
    assert.equal(String(url), ORIGIN + "/__tech-gate-404");
    return new Response(island, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "x-nextjs-cache": "HIT" } });
  });
  for (const res of [await proxy(get("/tech/asmodeus/index.html")), await content_.GET(get("/tech"))]) {
    assertHidden(res);
    assert.equal(await res.text(), island);
    assert.equal(res.headers.get("x-nextjs-cache"), "HIT");
  }
});

test("login pages are exempt from the gate", async () => {
  assert.equal(await proxy(get("/tech/login")), undefined);
  assert.equal(await proxy(get("/tech/login/github/callback?code=x")), undefined);
  const res = await login.GET(get("/tech/login"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
});

test("a tampered, expired or no-longer-allowlisted session is refused", async () => {
  const good = signSession("github:allowed-user");
  const [payload, sig] = good.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "github:allowed-user", exp: Date.now() + 1e9 })).toString("base64url");
  assertHidden(await proxy(get("/tech", `__Host-tech_session=${forged}.${sig}`)));
  assertHidden(await proxy(get("/tech", `__Host-tech_session=${payload}.${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`)));
  assertHidden(await proxy(get("/tech", session("github:removed-user"))));
  assertHidden(await content_.GET(get("/tech/demo/index.html", session("email:stranger@example.com"))));

  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const cookie = session("github:allowed-user");
  mock.timers.tick(8 * 24 * 3600 * 1000);
  assertHidden(await proxy(get("/tech", cookie)));
});

test("an allowlisted session gets the page and its assets, never cached", async () => {
  const cookie = session("github:allowed-user");
  assert.equal(await proxy(get("/tech/demo/index.html", cookie)), undefined);

  const page = await content_.GET(get("/tech/demo/index.html", cookie));
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /<title>demo<\/title>/);
  assert.match(page.headers.get("cache-control"), /no-store/);
  assert.match(page.headers.get("x-robots-tag"), /noindex/);

  const css = await content_.GET(get("/tech/demo/style.css", cookie));
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);
  assert.equal(await css.text(), "body{color:red}");

  // allowlist entries are case-insensitive
  assert.equal((await content_.GET(get("/tech/demo/style.css", session("email:allowed@example.com")))).status, 200);
});

test("a folder URL redirects to its index.html so relative assets resolve", async () => {
  const res = await content_.GET(get("/tech/demo", session("github:allowed-user")));
  assert.ok(isRedirect(res));
  assert.equal(location(res).pathname, "/tech/demo/index.html");
});

test("/tech lists the pages, and a listed page without files shows a placeholder", async () => {
  const cookie = session("github:allowed-user");
  const index = await content_.GET(get("/tech", cookie));
  assert.equal(index.status, 200);
  assert.match(await index.text(), /\/tech\/asmodeus\//);
  const placeholder = await content_.GET(get("/tech/asmodeus/index.html", cookie));
  assert.equal(placeholder.status, 200);
  assert.match(await placeholder.text(), /Asmodeus/);
});

test("path traversal and unknown files are 404", async () => {
  const cookie = session("github:allowed-user");
  for (const path of ["/tech/demo/..%2f..%2fsecret.txt", "/tech/demo/%2e%2e/%2e%2e/secret.txt", "/tech/demo/..%5c..%5csecret.txt", "/tech/demo/.env", "/tech/demo/nope.js", "/tech/nope/index.html"]) {
    const res = await content_.GET(get(path, cookie));
    assert.equal(res.status, 404, path);
  }
});

// --- GitHub --------------------------------------------------------------

async function githubFlow({ tamperState = false } = {}) {
  const start = await github.GET(get("/tech/login/github?next=/tech/demo/index.html"));
  assert.ok(isRedirect(start));
  const auth = location(start);
  assert.equal(auth.origin + auth.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(auth.searchParams.get("client_id"), "gh-id");
  assert.equal(auth.searchParams.get("code_challenge_method"), "S256");
  assert.equal(auth.searchParams.get("redirect_uri"), ORIGIN + "/tech/login/github/callback");
  const oauthCookie = rawCookie(start, "__Host-tech_oauth");
  assert.match(oauthCookie, /HttpOnly/i);
  assert.match(oauthCookie, /Secure/i);
  const state = tamperState ? "wrong" : auth.searchParams.get("state");
  return callback.GET(get(`/tech/login/github/callback?code=abc&state=${state}`, jar(cookiesOf(start))));
}

test("an allowlisted GitHub user is signed in with a hardened cookie", async () => {
  const res = await githubFlow();
  assert.ok(isRedirect(res));
  assert.equal(location(res).pathname, "/tech/demo/index.html");
  const c = rawCookie(res, "__Host-tech_session");
  assert.ok(c);
  for (const attr of [/HttpOnly/i, /Secure/i, /SameSite=Lax/i, /Path=\//i]) assert.match(c, attr);
  assert.equal(await proxy(get("/tech", jar(cookiesOf(res)))), undefined);
});

test("a GitHub user not on the allowlist is refused", async () => {
  githubLogin = "someone-else";
  const res = await githubFlow();
  noSession(res);
  assert.equal(location(res).pathname, "/tech/login");
  assert.ok(location(res).searchParams.get("error"));
});

test("a GitHub callback with the wrong state is refused before any token exchange", async () => {
  const res = await githubFlow({ tamperState: true });
  noSession(res);
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

// --- email one-time code -------------------------------------------------

const sendCode = (email, opts) => otp.POST(post("/tech/login/otp", { email, next: "/tech/demo/index.html" }, opts));
const enterCode = (code, otpRes, opts = {}) =>
  verify.POST(post("/tech/login/verify", { code }, { cookie: jar(cookiesOf(otpRes)), ...opts }));

test("an allowlisted email gets a code that signs in once", async () => {
  const sentRes = await sendCode("allowed@example.com");
  assert.ok(isRedirect(sentRes));
  assert.equal(sent.length, 1);
  assert.deepEqual([].concat(sent[0].to), ["allowed@example.com"]);
  const code = codeFrom(sent[0]);

  const ok = await enterCode(code, sentRes);
  assert.ok(isRedirect(ok));
  assert.equal(location(ok).pathname, "/tech/demo/index.html");
  assert.ok(cookiesOf(ok)["__Host-tech_session"]);

  const replay = await enterCode(code, sentRes);
  noSession(replay);
});

test("a non-allowlisted email gets the same answer but no email and no way in", async () => {
  const allowed = await sendCode("allowed@example.com");
  const stranger = await sendCode("stranger@example.com");
  assert.equal(sent.length, 1, "no email to a stranger");
  assert.equal(stranger.status, allowed.status);
  assert.equal(location(stranger).href, location(allowed).href);
  assert.ok(cookiesOf(stranger)["__Host-tech_otp"], "same cookie shape as an allowlisted send");
  for (const guess of ["000000", "123456"]) noSession(await enterCode(guess, stranger));
});

test("an expired code is refused", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const sentRes = await sendCode("allowed@example.com");
  const code = codeFrom(sent[0]);
  mock.timers.tick(11 * 60 * 1000);
  noSession(await enterCode(code, sentRes));
});

test("five wrong guesses kill the code", async () => {
  const sentRes = await sendCode("allowed@example.com");
  const code = codeFrom(sent[0]);
  const wrong = code === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) noSession(await enterCode(wrong, sentRes));
  noSession(await enterCode(code, sentRes));
});

test("sending is rate limited per email", async () => {
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await sendCode("allowed@example.com"));
  assert.equal(sent.length, 3);
  assert.equal(results[3].status, 429);
});

test("cross-site or origin-less POSTs are refused", async () => {
  assert.equal((await sendCode("allowed@example.com", { origin: "https://evil.example" })).status, 403);
  assert.equal((await sendCode("allowed@example.com", { origin: "" })).status, 403);
  assert.equal(sent.length, 0);
  const sentRes = await sendCode("allowed@example.com");
  const res = await enterCode(codeFrom(sent[0]), sentRes, { origin: "https://evil.example" });
  assert.equal(res.status, 403);
  const out = await logout.POST(post("/tech/logout", {}, { cookie: session("github:allowed-user"), origin: "https://evil.example" }));
  assert.equal(out.status, 403);
});

test("next only ever points inside /tech", async () => {
  for (const next of ["//evil.example/x", "https://evil.example/", "/elsewhere", "/tech/../x"]) {
    resetMemoryKv();
    sent = [];
    const sentRes = await otp.POST(post("/tech/login/otp", { email: "allowed@example.com", next }));
    const ok = await enterCode(codeFrom(sent[0]), sentRes);
    assert.equal(location(ok).origin, ORIGIN, next);
    assert.equal(location(ok).pathname, "/tech", next);
  }
});

test("sign out clears the session", async () => {
  const res = await logout.POST(post("/tech/logout", {}, { cookie: session("github:allowed-user") }));
  assert.ok(isRedirect(res));
  assert.match(rawCookie(res, "__Host-tech_session"), /Max-Age=0/i);
});

test("on Vercel without KV the code endpoints fail closed", async () => {
  process.env.VERCEL = "1";
  try {
    const res = await sendCode("allowed@example.com");
    assert.equal(res.status, 503);
    assert.equal(sent.length, 0);
  } finally {
    delete process.env.VERCEL;
  }
});
