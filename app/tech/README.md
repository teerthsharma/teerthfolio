# /tech: the back door

The island is public; `/tech` is not. Every request under `/tech` passes two
checks, `proxy.js` and the route handler that serves the files, and both ask
the same question: does this visitor carry a signed session whose GitHub login
or email is on `TECH_ALLOWLIST` *right now*? Anyone else gets the island's
ordinary 404, as if `/tech` did not exist; the only way in is
`/tech/login`, which you have to be told. Take a name off the list and that
person's next request is a 404 too.

Pages behind the gate never enter git. This repo is public, so their files
live in `private/tech/<slug>/`, which is gitignored, and reach Vercel only
through `vercel deploy` from a machine that has the folder. The Vercel CLI
uploads gitignored files (it skips only `.vercelignore` patterns); a deploy
triggered by a git push has no `private/` folder and shows each page's
placeholder instead.

## Add a gated page

1. Build the page as a static folder with **relative** paths
   (`index.html`, `style.css`, `app.js`, images...).
2. Copy it to `private/tech/<slug>/`:

   ```bash
   cp -r /path/to/site/. private/tech/<slug>/
   ```

   For Asmodeus:

   ```bash
   cp -r C:/Users/seal/.uriel/run-r3/site/investor/. private/tech/asmodeus/
   ```

3. Add one line to `TECH_PAGES` in [`lib/tech/content.js`](../../lib/tech/content.js)
   (`{ slug: "<slug>", title: "<Title>" }`) so `/tech` lists it and a deploy
   without the files shows a placeholder rather than a 404.
4. Deploy from this checkout: `vercel deploy` for a preview, `vercel deploy --prod`
   for evilseal.si. Check the page at `/tech/<slug>/`, which redirects to
   `/tech/<slug>/index.html` so that relative asset paths resolve.

The link to give someone on the list is the login page with the page as
`next`, for example
`https://www.evilseal.si/tech/login?next=/tech/asmodeus/index.html`. The page
URL alone is a 404 until they have signed in.

A later git-triggered production deploy replaces that deployment and brings back
the placeholder, so after any push to `main` that deploys, run
`vercel deploy --prod` again from a checkout that has `private/`, or keep
pushes to `main` on `[vercel skip]`.

## Sign-in

- **GitHub:** OAuth code flow with `state` and PKCE in a signed, 10-minute
  cookie. No scope is requested; only the public login is read.
- **Email code:** 6 digits, valid 10 minutes, stored only as an HMAC, consumed
  by its first correct use, dead after 5 wrong guesses. Sending is limited to
  3 per address and 10 per IP per 15 minutes. An address that is not on the
  list gets the same answer and no email.
- **Session:** `__Host-tech_session`, HttpOnly, Secure, SameSite=Lax, 7 days,
  HMAC-signed with `AUTH_SECRET`. Every POST must come from this origin.
- Gate responses are `Cache-Control: private, no-store` and
  `X-Robots-Tag: noindex, nofollow`.

## Going live: what the owner sets up

| What | Where | Value |
|---|---|---|
| GitHub OAuth app | github.com → Settings → Developer settings → OAuth Apps → New | Homepage `https://www.evilseal.si`, callback `https://www.evilseal.si/tech/login/github/callback` |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Vercel → teerthfolio → Settings → Environment Variables | that app's Client ID and a generated client secret |
| `AUTH_SECRET` | same | 32+ random bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `TECH_ALLOWLIST` | same | `github:<login>,email:<address>,...` |
| Upstash Redis | Vercel → Storage / Marketplace → Upstash Redis → connect to teerthfolio | injects `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Resend | resend.com account → API key; add domain `evilseal.si` and its DNS records | `RESEND_API_KEY` |
| `TECH_EMAIL_FROM` | same as the env vars above | e.g. `Evil Seal <tech@evilseal.si>` (must be on the verified domain) |

GitHub OAuth apps accept one callback host, so previews and `localhost` need
their own OAuth app (callback `http://localhost:3000/tech/login/github/callback`
for local work). On Vercel, the email endpoints answer 503 until KV and Resend
are set; GitHub sign-in works with only the first four rows. Locally, with no
`RESEND_API_KEY`, the code is printed to the dev server's console.

Other email providers (Postmark, AWS SES, SendGrid) would need only the one
`fetch` in `app/tech/login/otp/route.js` changed.

## Tests

`npm test` runs `test/tech.test.js`: anonymous requests to `/tech`, pages and
assets get a 404 and no hint of a login page; tampered, expired and de-listed sessions are refused;
non-allowlisted GitHub users and emails are refused; a code is single-use,
expires, and dies after five wrong guesses; sends are rate limited; cross-site
POSTs get 403; `next` cannot leave `/tech`; path traversal is 404.
