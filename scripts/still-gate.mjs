// Fails a HUD-off still that is mostly empty snow or badly exposed.
//   node scripts/still-gate.mjs --in verification/graphic/dam.png
// Fail if > 82% of pixels are within 10 of snow #faf6f0, or mean luminance
// is > 250 or < 40.
import sharp from "sharp";

const file = process.argv[process.argv.indexOf("--in") + 1];
if (!file || file.startsWith("--")) {
  console.error("usage: node scripts/still-gate.mjs --in <png>");
  process.exit(2);
}
const SNOW = [0xfa, 0xf6, 0xf0];
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let snow = 0;
let lum = 0;
const n = info.width * info.height;
for (let i = 0; i < n; i++) {
  const r = data[3 * i], g = data[3 * i + 1], b = data[3 * i + 2];
  if (Math.abs(r - SNOW[0]) <= 10 && Math.abs(g - SNOW[1]) <= 10 && Math.abs(b - SNOW[2]) <= 10) snow++;
  lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const snowShare = snow / n;
const mean = lum / n;
const reasons = [];
if (snowShare > 0.82) reasons.push(`snow-fill ${(snowShare * 100).toFixed(1)}% > 82%`);
if (mean > 250) reasons.push(`mean luminance ${mean.toFixed(1)} > 250`);
if (mean < 40) reasons.push(`mean luminance ${mean.toFixed(1)} < 40`);
console.log(JSON.stringify({ file, snowFill: +(snowShare * 100).toFixed(1), meanLuminance: +mean.toFixed(1), pass: !reasons.length, reasons }));
process.exit(reasons.length ? 1 : 0);
