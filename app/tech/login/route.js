import { safeNext } from "../../../lib/tech/auth.js";
import { escapeHtml, htmlResponse, shell } from "../../../lib/tech/http.js";

export const dynamic = "force-dynamic";

const ERRORS = {
  denied: "That account is not on the access list.",
  github: "GitHub sign-in did not complete. Try again.",
  expired: "That code has expired. Request a new one.",
  code: "That code is not right.",
};

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const next = safeNext(q.get("next"), request);
  const error = ERRORS[q.get("error")];
  const msg = error ? `<p class="err">${escapeHtml(error)}</p>` : "";

  const inner =
    q.get("step") === "code"
      ? `<h1>Enter your code</h1>${msg}<form method="post" action="/tech/login/verify">
<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit code" required autofocus>
<button>Sign in</button></form><a href="/tech/login">Start over</a>`
      : `<h1>Sign in</h1>${msg}<a class="btn" href="/tech/login/github?next=${encodeURIComponent(next)}">Sign in with GitHub</a>
<form method="post" action="/tech/login/otp"><input type="hidden" name="next" value="${escapeHtml(next)}">
<input name="email" type="email" autocomplete="email" placeholder="Email address" required>
<button>Email me a code</button></form>`;

  return htmlResponse(shell("Sign in", inner));
}
