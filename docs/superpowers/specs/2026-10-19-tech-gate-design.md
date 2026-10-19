# /tech: a sign-in gated section of evilseal.si

## Intent

evilseal.si (this repo, deployed by Vercel project `teerthfolio`) is the public
island. `/tech` is a hidden entrance next to it: pages there are shown only to
people on an allowlist the owner controls. The first page is the Asmodeus
investor page. The repo is public, so gated pages never enter git: their files
sit in a gitignored folder and reach Vercel only through `vercel deploy` from
the owner's machine (the CLI uploads gitignored files; only `.vercelignore`
patterns are skipped).

## Goals

- `/tech` and everything under it requires a signed-in, allowlisted visitor,
  checked server-side on every request.
- Sign-in by GitHub OAuth or by a one-time code sent to an email address.
- Allowlist in one env var, `TECH_ALLOWLIST`, entries `github:<login>` and
  `email:<address>`, comma separated, case-insensitive. Removing an entry locks
  that person out on their next request, because the session is re-checked
  against the list each time, not trusted from sign-in.
- Gated page files are served only by the gated route handler, never from
  `public/`.
- Adding a gated page is one folder plus one line.

## Non-goals

- No link to `/tech` from the public site, no sitemap entry. Not secret in
  the cryptographic sense (the route is in a public repo); the gate is the
  security, the absence of links is only discretion.
- No user database, no roles, no admin UI. The env var is the admin UI.
- No change to the island's routes, layout or trailing-slash behaviour.

## Anti-goals

- A gated file reachable without a session through any path (`public/`, a
  cached static render, a matcher gap, path traversal).
- Telling a stranger whether an email is on the allowlist.
- Investor files committed to the public repo.

## Decisions

- **Hand-rolled on Next route handlers and `proxy.js`, no auth library.**
  Auth.js email sign-in needs a database adapter and is magic-link, not OTP;
  its v5 line is beta and peers with Next 14/15 while this repo runs Next
  16.2.9. The pieces needed here (HMAC-signed cookies, OAuth code flow, a
  hashed code with a TTL) are small with `node:crypto` and `fetch`, add no
  dependency, and are testable with `node --test`.
- **Session:** stateless cookie `__Host-tech_session`, value
  `base64url(json).base64url(HMAC-SHA256(AUTH_SECRET))`, payload
  `{ sub: "github:<login>" | "email:<addr>", exp }`, 7-day lifetime.
  `HttpOnly; Secure; SameSite=Lax; Path=/`. Lax, not Strict: the GitHub
  callback is a cross-site redirect chain and Strict would drop the cookie on
  the hop to `/tech`.
- **Hidden door (owner, 2026-10-19):** evilseal.si is the seal's playground;
  `/tech` must look like nothing is there. Any request without a valid
  allowlisted session is answered by `proxy.js` (matcher `/tech/:path*`) with
  the island's own 404 page, fetched from `/__tech-gate-404` (a path no route
  matches) and returned as-is, not a redirect. A proxy rewrite was rejected:
  Next sends `x-middleware-rewrite: /__tech-gate-404` to the client, which
  names the gate (next.js discussion #58366). Only `/tech/login`, which has to
  be known, shows a sign-in page. The content route handler repeats the check
  and answers the same 404, so a matcher mistake or proxy bypass still serves
  nothing. Cost: an investor
  whose session expired sees a 404 at the page URL and needs the
  `/tech/login` link again.
- **CSRF:** every POST must carry an `Origin` whose host equals the request
  host, otherwise 403. Cookies are SameSite=Lax. OAuth uses a random `state`
  plus PKCE (S256), both in a short-lived signed cookie.
- **Email OTP:** 6 digits from `crypto.randomInt`, 10-minute expiry, stored
  only as an HMAC in KV under a random challenge id; the id rides in a signed
  `__Host-tech_otp` cookie. Verify reads the record with `GETDEL`, so a code
  is consumed by its first correct use; a wrong guess writes the record back
  with `attempts + 1` until 5, then the challenge is dead. A non-allowlisted
  address gets the same response and cookie as an allowlisted one, but no
  email and no record, so verify can only fail.
- **Rate limits (fixed windows in KV):** send: 3 per email and 10 per IP per
  15 minutes; verify: 20 per IP per 15 minutes.
- **KV:** Upstash Redis REST via `fetch` (`KV_REST_API_URL`,
  `KV_REST_API_TOKEN`, which the Vercel Marketplace Upstash integration
  injects). Without them it falls back to an in-memory map, for local dev and
  tests only; on Vercel (`VERCEL` set) without KV the OTP endpoints fail
  closed with 503. GitHub sign-in does not need KV.
- **Email provider:** Resend REST API (`RESEND_API_KEY`, `TECH_EMAIL_FROM`).
  Outside Vercel with no key, the code is printed to the server console for
  local testing; on Vercel with no key, sending fails closed.
- **Content:** files under `private/tech/<slug>/` (gitignored), bundled into
  the route's serverless function with `outputFileTracingIncludes`.
  `/tech/<slug>` redirects to `/tech/<slug>/index.html` so a page built with
  relative paths resolves its assets without touching the site-wide
  trailing-slash redirect. A slug listed in `TECH_PAGES` whose folder is absent
  gets a placeholder page, which is what a git-triggered deploy shows.
  Responses carry `Cache-Control: private, no-store`,
  `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`.
- **Paths:** login page `/tech/login`, GitHub `/tech/login/github` and
  `/tech/login/github/callback`, OTP `/tech/login/otp` (send) and
  `/tech/login/verify`, sign out `/tech/logout`. Only `/tech/login*` is
  exempt from the gate. `next` is honoured only when it starts with `/tech/`
  and not `//`.

## Left to the builder

Markup and styling of the login and placeholder pages (plain HTML returned by
route handlers, no client JS, matching the site's fonts loosely is enough).
