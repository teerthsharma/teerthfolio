import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "__Host-tech_session";
export const OAUTH_COOKIE = "__Host-tech_oauth";
export const OTP_COOKIE = "__Host-tech_otp";
export const SESSION_TTL_S = 7 * 24 * 3600;

// Read at call time so a missing secret fails closed per request, never at import.
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET missing or shorter than 32 characters");
  return s;
}

export const hmac = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signValue(obj) {
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

// Returns the payload only for an intact, unexpired value (exp is epoch ms).
export function verifyValue(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !safeEqual(parts[1], hmac(parts[0]))) return null;
  try {
    const obj = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return obj && typeof obj === "object" && obj.exp > Date.now() ? obj : null;
  } catch {
    return null;
  }
}

export const signSession = (sub) => signValue({ sub, exp: Date.now() + SESSION_TTL_S * 1000 });

function allowlist() {
  return new Set((process.env.TECH_ALLOWLIST ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

export const isAllowed = (sub) => allowlist().has(String(sub).toLowerCase());

export function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// The allowlist is re-read on every call, so removing an entry ends access immediately.
export function getSession(request) {
  try {
    const s = verifyValue(readCookie(request, SESSION_COOKIE));
    return s && typeof s.sub === "string" && isAllowed(s.sub) ? s.sub : null;
  } catch (e) {
    console.error("tech session check failed:", e.message);
    return null;
  }
}

export const cookie = (name, value, maxAge) =>
  `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export const clearCookie = (name) => cookie(name, "", 0);

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
      request.headers.get("host") ??
      new URL(request.url).host;
    return new URL(origin).host === expected;
  } catch {
    return false;
  }
}

export function safeNext(raw, request) {
  if (typeof raw !== "string" || raw.startsWith("//")) return "/tech";
  try {
    const base = new URL(request.url);
    const u = new URL(raw, base);
    if (u.origin !== base.origin) return "/tech";
    if (u.pathname !== "/tech" && !u.pathname.startsWith("/tech/")) return "/tech";
    return u.pathname + u.search;
  } catch {
    return "/tech";
  }
}

export const clientIp = (request) =>
  request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
