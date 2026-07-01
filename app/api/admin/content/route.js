import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "../../../../lib/admin-auth";
import { readPortfolioContent, writePortfolioContent } from "../../../../lib/portfolio-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, content: await readPortfolioContent() });
}

export async function PUT(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  try {
    const content = await writePortfolioContent(body?.content || body);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Could not save portfolio content" },
      { status: 500 },
    );
  }
}
