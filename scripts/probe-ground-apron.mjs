/* Ground-form energy in the near apron, scored at the octave the form lives at.
 *
 * Three earlier attempts at this measurement each failed for a reason worth
 * keeping: a regional MEAN is blind to local relief (the dome pass moved every
 * mean by under 0.01 while the picture changed completely); a whole-crop edge
 * sum DOUBLE-COUNTS a subject's silhouette against the background, so a real
 * improvement can score negative; and pixel-scale gradient is unmeasurable here
 * (a null control of two captures of the same build ran +/-9%).
 *
 * What survives is a mean absolute luma gradient over the near ground apron
 * after an 8x box downsample. That octave is where ground form actually
 * lives — a dune crest, a drift bank, a contact skirt under a boulder are all
 * tens of pixels across — and it averages away the dither and the sparkle the
 * pixel octave was measuring. Null control at this octave is +/-0.5%.
 *
 * The crop is the bottom-left apron of the docked 1440x900 frame: ground only,
 * no building, no sky.
 *
 * usage: node scripts/probe-ground-apron.mjs <beforeDir> <afterDir>
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CROP = { height: 250, left: 0, top: 640, width: 620 };
const OCTAVE = 8;

async function apron(file) {
  const { data: full } = await sharp(file)
    .extract(CROP)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Box pool by hand rather than sharp's resize: the available kernels are all
  // windowed sincs, and which one a given sharp version defaults to is exactly
  // the kind of thing that would silently move a before/after pair measured
  // weeks apart.
  const width = Math.floor(CROP.width / OCTAVE);
  const height = Math.floor(CROP.height / OCTAVE);
  const data = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      for (let dy = 0; dy < OCTAVE; dy += 1) {
        for (let dx = 0; dx < OCTAVE; dx += 1) {
          total += full[(y * OCTAVE + dy) * CROP.width + (x * OCTAVE + dx)];
        }
      }
      data[y * width + x] = total / (OCTAVE * OCTAVE);
    }
  }
  let sum = 0;
  let samples = 0;
  let luma = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      luma += data[index];
      sum += Math.abs(data[index + 1] - data[index]) + Math.abs(data[index + width] - data[index]);
      samples += 1;
    }
  }
  return { energy: (sum / samples / 255) * 1000, luma: luma / samples };
}

/**
 * The skirt, isolated from the silhouette.
 *
 * Whole-crop energy above cannot answer whether a contact skirt landed, because
 * a skirt darkens the snow NEXT to a prop, which raises the ground's own
 * gradient and lowers the prop's contrast against it at the same time. The two
 * very nearly cancel: at the two stations whose props did not otherwise change,
 * the whole-crop delta came out +0.7% and +0.3% against a +/-0.6% null.
 *
 * So the skirt is measured where it lives. The prop mask is derived ONCE from
 * the before capture — props are the dark bodies in an apron of snow — and
 * dilated; the annulus is the dilated mask minus the props themselves, which is
 * exactly the band a skirt occupies, and the far field is everything the
 * dilation did not reach. Both regions are fixed by the before capture, so
 * neither can move with the thing being measured, and the far field is the
 * control: a change that darkens the whole apron shows up in both and reports
 * nothing.
 */
const PROP_LUMA_CUT = 118;
const SKIRT_BAND = 14;

function propMask(data, width, height) {
  const mask = new Uint8Array(data.length);
  for (let index = 0; index < data.length; index += 1) mask[index] = data[index] < PROP_LUMA_CUT ? 1 : 0;
  let dilated = mask;
  for (let pass = 0; pass < SKIRT_BAND; pass += 1) {
    const next = Uint8Array.from(dilated);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (dilated[index]) continue;
        if (
          dilated[index - 1] ||
          dilated[index + 1] ||
          dilated[index - width] ||
          dilated[index + width]
        ) {
          next[index] = 1;
        }
      }
    }
    dilated = next;
  }
  return { dilated, mask };
}

function regionMeans(data, mask, dilated) {
  let annulus = 0;
  let annulusCount = 0;
  let far = 0;
  let farCount = 0;
  for (let index = 0; index < data.length; index += 1) {
    if (mask[index]) continue;
    if (dilated[index]) {
      annulus += data[index];
      annulusCount += 1;
    } else {
      far += data[index];
      farCount += 1;
    }
  }
  return { annulus: annulus / annulusCount, annulusCount, far: far / farCount, farCount };
}

async function rawCrop(file) {
  const { data } = await sharp(file).extract(CROP).greyscale().raw().toBuffer({
    resolveWithObject: true,
  });
  return data;
}

const [beforeDir, afterDir] = process.argv.slice(2);
const ids = readdirSync(beforeDir)
  .filter((name) => name.endsWith(".png") && !name.startsWith("crop-"))
  .map((name) => name.replace(/\.png$/, ""))
  .filter((id) => readdirSync(afterDir).includes(`${id}.png`));

console.log("station                   before    after     delta     luma before/after");
for (const id of ids) {
  const before = await apron(path.join(beforeDir, `${id}.png`));
  const after = await apron(path.join(afterDir, `${id}.png`));
  const delta = ((after.energy - before.energy) / before.energy) * 100;
  console.log(
    `${id.padEnd(24)} ${before.energy.toFixed(2).padStart(6)}   ${after.energy
      .toFixed(2)
      .padStart(6)}   ${(delta >= 0 ? "+" : "") + delta.toFixed(1)}%`.padEnd(62) +
      `${before.luma.toFixed(1)} / ${after.luma.toFixed(1)}`,
  );
}

console.log(
  `\nsnow within ${SKIRT_BAND}px of a prop, against the snow beyond it ` +
    `(mask frozen from the before capture)\n` +
    "station                   annulus b/a      far b/a          skirt depth",
);
for (const id of ids) {
  const beforeData = await rawCrop(path.join(beforeDir, `${id}.png`));
  const afterData = await rawCrop(path.join(afterDir, `${id}.png`));
  const { dilated, mask } = propMask(beforeData, CROP.width, CROP.height);
  const before = regionMeans(beforeData, mask, dilated);
  const after = regionMeans(afterData, mask, dilated);
  // What the annulus lost that the far field did not. A whole-apron darkening
  // cancels; only a darkening that hugs the props survives.
  const depth = after.annulus - before.annulus - (after.far - before.far);
  console.log(
    `${id.padEnd(24)} ${before.annulus.toFixed(1)} / ${after.annulus.toFixed(1)}   ` +
      `${before.far.toFixed(1)} / ${after.far.toFixed(1)}   ` +
      `${depth >= 0 ? "+" : ""}${depth.toFixed(2)} luma`,
  );
}
