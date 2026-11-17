/* global process */
// node lib/anime/tools/cuts/p-caustic/pair.mjs <captureDir> <tag> <R> [<R> ...] [--page=<n>]
// Writes <captureDir>/pair-<R>.jpg: the live gif page (left) beside the capture at R (right), both 640 wide.
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LIVE = path.join(ROOT, "verification/live/p-caustic/live.gif");
const args = process.argv.slice(2);
const forced = args.find((a) => a.startsWith("--page="));
const [dir, tag, ...rest] = args.filter((a) => !a.startsWith("--"));
if (!dir || !tag || !rest.length) { console.log("usage: pair.mjs <captureDir> <tag> <R> [<R> ...] [--page=<n>]"); process.exit(1); }

for (const R of rest) {
  const page = forced ? Number(forced.split("=")[1]) : Math.min(134, Math.round(3.9 * Number(R)));
  const live = await sharp(LIVE, { page }).resize({ width: 640 }).png().toBuffer();
  const cap = await sharp(path.join(dir, `${tag}-p-caustic-${R}.png`)).resize({ width: 640 }).png().toBuffer();
  const h = Math.max((await sharp(live).metadata()).height, (await sharp(cap).metadata()).height);
  await sharp({ create: { width: 1292, height: h, channels: 3, background: "#202020" } })
    .composite([{ input: live, left: 0, top: 0 }, { input: cap, left: 652, top: 0 }])
    .jpeg({ quality: 88 }).toFile(path.join(dir, `pair-${R}.jpg`));
  console.log(`pair-${R}.jpg  (live page ${page} | ${tag} @${R})`);
}
