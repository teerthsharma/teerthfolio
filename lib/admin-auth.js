import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "portfolio_admin";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export function getAdminPasscode() {
  if (process.env.NODE_ENV === "production") {
    return process.env.ADMIN_PASSCODE || "";
  }

  return process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload) {
  const passcode = getAdminPasscode();
  if (!passcode) return "";
  return createHmac("sha256", passcode).update(payload).digest("hex");
}

export function verifyAdminPasscode(passcode) {
  const expected = getAdminPasscode();
  return Boolean(expected) && typeof passcode === "string" && safeEqual(passcode, expected);
}

export function createAdminSession() {
  const payload = `admin:${Date.now()}`;
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifyAdminSession(value) {
  if (!value || typeof value !== "string") return false;

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) return false;

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const [, timestamp] = payload.split(":");
  const issuedAt = Number(timestamp);

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
    return false;
  }

  const expected = signPayload(payload);
  return Boolean(expected) && safeEqual(signature, expected);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
