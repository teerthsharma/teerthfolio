import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");
const BLOB_UPLOAD_PREFIX = "portfolio/uploads";

const extensionByType = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

function getSafeExtension(file) {
  const typedExtension = extensionByType[file.type];
  if (typedExtension) return typedExtension;

  const sourceExtension = path.extname(file.name || "").toLowerCase();
  return [".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(sourceExtension) ? sourceExtension : ".png";
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Upload an image file" }, { status: 400 });
  }

  if (!String(file.type || "").startsWith("image/") || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "Image must be smaller than 6MB" }, { status: 400 });
  }

  const extension = getSafeExtension(file);
  const filename = `${Date.now()}-${randomUUID()}${extension}`;

  if (hasBlobStorage()) {
    const blob = await put(`${BLOB_UPLOAD_PREFIX}/${filename}`, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "image/png",
      maximumSizeInBytes: MAX_UPLOAD_BYTES,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  }

  if (isVercelRuntime()) {
    return NextResponse.json(
      { ok: false, error: "BLOB_READ_WRITE_TOKEN is required for image uploads on Vercel" },
      { status: 500 },
    );
  }

  const destination = path.join(UPLOAD_DIR, filename);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}
