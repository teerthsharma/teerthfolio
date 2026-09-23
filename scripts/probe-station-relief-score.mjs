/* Building-only edge energy, scored over two already-captured sweeps.
 *
 * The crop metric in probe-station-relief.mjs sums gradients over the whole
 * tight crop, which conflates two different things: relief INSIDE the building,
 * and the building's silhouette contrast against the snow field behind it. They
 * move in opposite directions here. Lighting a roof deck is exactly the change
 * that was wanted, and it also raises the roof toward the pale sky it is drawn
 * against, so the silhouette edge weakens while the relief strengthens — which
 * is why the cryo lab and the radio mast, the two subjects whose crop is mostly
 * snow and sky, scored down on a pass that visibly improved them.
 *
 * The mask is derived once from the BASELINE capture (pixels below that crop's
 * own 62nd luma percentile — the buildings are darker than the drift) and then
 * applied unchanged to both sweeps, so it cannot move with the thing being
 * measured. Only gradients with both endpoints inside the mask are counted, so
 * the silhouette itself contributes nothing either way.
 *
 * usage: node scripts/probe-station-relief-score.mjs <beforeDir> <afterDir>
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CROP = { height: 520, left: 430, top: 210, width: 600 };
const MASK_PERCENTILE = 0.62;

async function crop(file) {
  const { data, info } = await sharp(file)
    .extract(CROP)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, height: info.height, width: info.width };
}

function buildMask({ data }) {
  const histogram = new Uint32Array(256);
  for (const value of data) histogram[value] += 1;
  let seen = 0;
  let cut = 255;
  for (let value = 0; value < 256; value += 1) {
    seen += histogram[value];
    if (seen >= data.length * MASK_PERCENTILE) {
      cut = value;
      break;
    }
  }
  const mask = new Uint8Array(data.length);
  for (let index = 0; index < data.length; index += 1) mask[index] = data[index] <= cut ? 1 : 0;
  return mask;
}

function maskedEdge({ data, height, width }, mask) {
  let sum = 0;
  let samples = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      if (mask[index + 1]) {
        sum += Math.abs(data[index + 1] - data[index]);
        samples += 1;
      }
      if (mask[index + width]) {
        sum += Math.abs(data[index + width] - data[index]);
        samples += 1;
      }
    }
  }
  return samples ? sum / samples / 255 : 0;
}

const [beforeDir, afterDir] = process.argv.slice(2);
const ids = readdirSync(beforeDir)
  .filter((name) => name.endsWith(".png") && !name.startsWith("crop-"))
  .map((name) => name.replace(/\.png$/, ""));

console.log("station                    before    after     delta");
for (const id of ids) {
  const beforeFile = path.join(beforeDir, `${id}.png`);
  const afterFile = path.join(afterDir, `${id}.png`);
  const beforeCrop = await crop(beforeFile);
  const mask = buildMask(beforeCrop);
  const before = maskedEdge(beforeCrop, mask);
  const after = maskedEdge(await crop(afterFile), mask);
  const delta = ((after - before) / before) * 100;
  console.log(
    `${id.padEnd(24)} ${before.toFixed(4)}   ${after.toFixed(4)}   ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
  );
}
