import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { portfolioContent } from "./portfolio-data";

const DATA_FILE = path.join(process.cwd(), "data", "portfolio-content.json");
const BLOB_CONTENT_PATH = "portfolio/content.json";
const oldContactCornerLines = ["Build first", "Make it move", "Ship the odd idea", "Bring the brief"];
const whimsyContactCornerLines = [
  "catified",
  "fuwafuwa",
  "bring the PRD",
  "whism of whiff with a touch of whimsy",
  "ship the odd idea",
];

function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

async function readBlobText(stream) {
  if (typeof stream?.text === "function") {
    return stream.text();
  }

  return new Response(stream).text();
}

function withArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function findDefaultItem(items, predicate, index) {
  return items.find(predicate) || items[index] || {};
}

function hasSameLines(value, reference) {
  return Array.isArray(value) && value.length === reference.length && value.every((line, index) => line === reference[index]);
}

const defaultTypography = {
  heroTitle: 12.5,
  heroSubtitle: 1.45,
  sectionTitle: 8,
  storyTitle: 3.2,
  body: 1,
  projectTitle: 3.4,
  skillTitle: 3.2,
  skillItem: 1,
  certificateTitle: 3.2,
};

function normalizeNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function normalizeTypography(typography) {
  const source = typography && typeof typography === "object" ? typography : {};

  return Object.fromEntries(
    Object.entries(defaultTypography).map(([key, fallback]) => [
      key,
      normalizeNumber(source[key], fallback, 0.65, 16),
    ]),
  );
}

export function normalizeCrop(crop) {
  return {
    x: Number.isFinite(Number(crop?.x)) ? Number(crop.x) : 50,
    y: Number.isFinite(Number(crop?.y)) ? Number(crop.y) : 50,
    zoom: Number.isFinite(Number(crop?.zoom)) ? Number(crop.zoom) : 1,
  };
}

export function normalizePortfolioContent(content) {
  const next = {
    ...portfolioContent,
    ...(content && typeof content === "object" ? content : {}),
  };

  next.contactCornerLines = hasSameLines(next.contactCornerLines, oldContactCornerLines)
    ? whimsyContactCornerLines
    : withArray(next.contactCornerLines, portfolioContent.contactCornerLines);
  next.projects = withArray(next.projects, portfolioContent.projects).map((project) => ({
    ...project,
    tags: withArray(project.tags),
    imageCrop: normalizeCrop(project.imageCrop),
  }));
  next.experience = withArray(next.experience, portfolioContent.experience).map((item, index) => {
    const fallback = findDefaultItem(
      portfolioContent.experience,
      (entry) => entry.role === item.role && entry.org === item.org,
      index,
    );

    return {
      ...fallback,
      ...item,
      companyHref: item.companyHref ?? fallback.companyHref ?? "",
      tech: withArray(item.tech, fallback.tech ?? []),
      certificate: item.certificate ?? fallback.certificate ?? "",
      certificateTitle: item.certificateTitle ?? fallback.certificateTitle ?? "",
      certificateNote: item.certificateNote ?? fallback.certificateNote ?? "",
      certificateImageCrop: normalizeCrop(item.certificateImageCrop ?? fallback.certificateImageCrop),
    };
  });
  next.certificates = withArray(next.certificates, portfolioContent.certificates).map((certificate, index) => {
    const fallback = findDefaultItem(
      portfolioContent.certificates,
      (entry) => entry.title === certificate.title,
      index,
    );

    return {
      ...fallback,
      ...certificate,
      subtitle: certificate.subtitle ?? fallback.subtitle ?? "",
      rank: certificate.rank ?? fallback.rank ?? "",
      details: certificate.details ?? fallback.details ?? "",
      imageCrop: normalizeCrop(certificate.imageCrop ?? fallback.imageCrop),
    };
  });
  next.skillStacks = withArray(next.skillStacks, portfolioContent.skillStacks).map((stack) => ({
    title: stack.title || "Stack",
    subtitle: stack.subtitle || "",
    items: withArray(stack.items, Array.isArray(stack) ? stack : []),
  }));
  next.chapters = withArray(next.chapters, portfolioContent.chapters).map((chapter) => ({
    ...chapter,
    title: chapter.title === "Sebastian Lague energy" ? "Sebastian Lague Legacy" : chapter.title,
  }));
  next.typography = normalizeTypography(next.typography);

  return next;
}

export async function readPortfolioContent() {
  if (hasBlobStorage()) {
    try {
      const result = await get(BLOB_CONTENT_PATH, { access: "public" });

      if (result.statusCode === 200) {
        return normalizePortfolioContent(JSON.parse(await readBlobText(result.stream)));
      }
    } catch {
      // Fall through to the bundled seed content. The first admin save will create the blob.
    }
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizePortfolioContent(JSON.parse(raw));
  } catch {
    return normalizePortfolioContent(portfolioContent);
  }
}

export async function writePortfolioContent(content) {
  const normalized = normalizePortfolioContent(content);

  if (hasBlobStorage()) {
    await put(BLOB_CONTENT_PATH, `${JSON.stringify(normalized, null, 2)}\n`, {
      access: "public",
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      contentType: "application/json",
    });
    return normalized;
  }

  if (isVercelRuntime()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to save portfolio content on Vercel.");
  }

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await rename(tempFile, DATA_FILE);
  return normalized;
}
