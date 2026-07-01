import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSession,
  verifyAdminPasscode,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  if (!verifyAdminPasscode(body.passcode)) {
    return NextResponse.json({ ok: false, error: "Invalid passcode" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSession(), {
    ...adminCookieOptions(),
    httpOnly: true,
  });
  return response;
}
