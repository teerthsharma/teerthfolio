// Motion in a strip of captures: node lib/anime/tools/cuts/pr-pyrefly-4180/strip.mjs <png> <png> ...
// Prints the mean absolute RGB level difference over the whole frame for each consecutive pair, and the count of pairs at 4 levels or more.
import sharp from "sharp";

const files = process.argv.slice(2);
if (files.length < 2) {
  console.error("usage: strip.mjs <png> <png> ...");
  process.exit(2);
}
const MIN = 4;

const load = async (f) => {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
};

const ims = [];
for (const f of files) ims.push(await load(f));
let hits = 0;
for (let i = 1; i < ims.length; i++) {
  const a = ims[i - 1];
  const b = ims[i];
  if (a.W !== b.W || a.H !== b.H) {
    console.log(`FAIL size ${files[i - 1]} vs ${files[i]}`);
    process.exit(1);
  }
  let sum = 0;
  for (let k = 0; k < a.data.length; k++) sum += Math.abs(a.data[k] - b.data[k]);
  const lv = sum / a.data.length;
  if (lv >= MIN) hits++;
  console.log(`${i}-${i + 1} ${lv.toFixed(2)} levels`);
}
console.log(`${hits} of ${files.length - 1} pairs at ${MIN} levels or more`);
