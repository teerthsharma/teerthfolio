import {
  OTP_COOKIE, SESSION_COOKIE, SESSION_TTL_S, clearCookie, clientIp, cookie, hmac, isAllowed, readCookie, safeEqual, safeNext, sameOrigin, signSession, verifyValue,
} from "../../../../lib/tech/auth.js";
import { redirect, textResponse } from "../../../../lib/tech/http.js";
import { kv } from "../../../../lib/tech/kv.js";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

async function check(request) {
  kv.ready();
  if ((await kv.incr(`rl:verify:ip:${clientIp(request)}`, 15 * 60)) > 20) {
    return textResponse(429, "Too many attempts");
  }

  const expired = redirect(request, "/tech/login?error=expired", { cookies: [clearCookie(OTP_COOKIE)] });
  const challenge = verifyValue(readCookie(request, OTP_COOKIE));
  if (!challenge) return expired;

  // GETDEL consumes the record, so one correct guess can never be replayed.
  const key = `otp:${challenge.id}`;
  const rec = await kv.getdel(key);
  if (!rec || rec.exp <= Date.now()) return expired;

  const code = String((await request.formData()).get("code") ?? "").trim();
  if (!safeEqual(hmac(`${challenge.id}:${code}`), rec.codeHash)) {
    if (rec.attempts + 1 < MAX_ATTEMPTS) {
      await kv.set(key, { ...rec, attempts: rec.attempts + 1 }, (rec.exp - Date.now()) / 1000);
    }
    return redirect(request, "/tech/login?step=code&error=code");
  }

  if (!isAllowed(`email:${rec.email}`)) return expired;
  return redirect(request, safeNext(challenge.next, request), {
    cookies: [cookie(SESSION_COOKIE, signSession(`email:${rec.email}`), SESSION_TTL_S), clearCookie(OTP_COOKIE)],
  });
}

export async function POST(request) {
  if (!sameOrigin(request)) return textResponse(403, "Forbidden");
  try {
    return await check(request);
  } catch (e) {
    console.error("tech verify unavailable:", e.message);
    return textResponse(503, "Sign-in by email is unavailable");
  }
}
