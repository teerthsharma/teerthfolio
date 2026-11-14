import { randomBytes, randomInt } from "node:crypto";
import { OTP_COOKIE, clientIp, cookie, hmac, isAllowed, safeNext, sameOrigin, signValue } from "../../../../lib/tech/auth.js";
import { htmlResponse, redirect, shell, textResponse } from "../../../../lib/tech/http.js";
import { kv } from "../../../../lib/tech/kv.js";

export const dynamic = "force-dynamic";

const WINDOW_S = 15 * 60;
const CODE_TTL_MS = 10 * 60 * 1000;

async function deliver(email, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[tech] sign-in code for ${email}: ${code}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.TECH_EMAIL_FROM,
      to: [email],
      subject: "Your sign-in code",
      text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

async function send(request) {
  kv.ready();
  if (process.env.VERCEL && !process.env.RESEND_API_KEY) return textResponse(503, "Sign-in by email is unavailable");

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const next = safeNext(String(form.get("next") ?? ""), request);

  // Counted before the allowlist is consulted, so limits cannot tell listed from unlisted.
  const byEmail = await kv.incr(`rl:otp:email:${email}`, WINDOW_S);
  const byIp = await kv.incr(`rl:otp:ip:${clientIp(request)}`, WINDOW_S);
  if (byEmail > 3 || byIp > 10) {
    return htmlResponse(shell("Too many requests", "<h1>Too many requests</h1><p>Try again in a few minutes.</p>"), {
      status: 429,
      headers: { "retry-after": String(WINDOW_S) },
    });
  }

  const id = randomBytes(16).toString("base64url");
  if (isAllowed(`email:${email}`)) {
    const code = String(randomInt(0, 1e6)).padStart(6, "0");
    await kv.set(
      `otp:${id}`,
      { email, codeHash: hmac(`${id}:${code}`), attempts: 0, exp: Date.now() + CODE_TTL_MS },
      CODE_TTL_MS / 1000,
    );
    try {
      await deliver(email, code);
    } catch (e) {
      // Same response as an unlisted address: a send failure must not reveal the allowlist.
      console.error("tech otp delivery failed:", e.message);
    }
  }
  const challenge = signValue({ id, next, exp: Date.now() + CODE_TTL_MS });
  return redirect(request, "/tech/login?step=code", { cookies: [cookie(OTP_COOKIE, challenge, CODE_TTL_MS / 1000)] });
}

export async function POST(request) {
  if (!sameOrigin(request)) return textResponse(403, "Forbidden");
  try {
    return await send(request);
  } catch (e) {
    console.error("tech otp unavailable:", e.message);
    return textResponse(503, "Sign-in by email is unavailable");
  }
}
