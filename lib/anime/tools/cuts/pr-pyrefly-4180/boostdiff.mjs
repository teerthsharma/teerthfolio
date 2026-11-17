// How much the background boost changes a frame: node lib/anime/tools/cuts/pr-pyrefly-4180/boostdiff.mjs <on.png> <off.png> <L|A>
// <on> is the capture with the boost, <off> the same shot with ?boost=off. L reads the right-hand boxes (lenses b, c, d, home),
// A the left-hand boxes (lens a). For SKY, HORIZON and GROUND it prints the mean absolute level difference and PASS or FAIL
// against the cumulative minimums of SHEET-2 (T14, after the whole BOOST group). Exit 0 only when all three pass, 1 otherwise, 2 usage.
import sharp from "sharp";

const BOX = {
  L: { sky: [0.7, 0.04, 1.0, 0.46], horizon: [0.6, 0.4, 1.0, 0.62] },
  A: { sky: [0.0, 0.04, 0.3, 0.46], horizon: [0.0, 0.4, 0.4, 0.62] },
};
const GROUND = [0.0, 0.64, 1.0, 0.96];
const MIN = { sky: 14, horizon: 14, ground: 12 };

const [onFile, offFile, lens] = process.argv.slice(2);
if (!onFile || !offFile || !BOX[lens]) {
  console.error("usage: boostdiff.mjs <on.png> <off.png> <L|A>");
  process.exit(2);
}

const load = async (f) => {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
};

const indices = (im, [x0, y0, x1, y1]) => {
  const xs = Math.floor(x0 * im.W), xe = Math.min(im.W, Math.ceil(x1 * im.W));
  const ys = Math.floor(y0 * im.H), ye = Math.min(im.H, Math.ceil(y1 * im.H));
  const out = [];
  for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) out.push((y * im.W + x) * 3);
  return out;
};

const level = (a, b, box) => {
  const px = indices(a, box);
  let sum = 0;
  for (const i of px) for (let k = 0; k < 3; k++) sum += Math.abs(a.data[i + k] - b.data[i + k]);
  return sum / (px.length * 3);
};

const on = await load(onFile);
const off = await load(offFile);
if (on.W !== off.W || on.H !== off.H) {
  console.log(`FAIL boostdiff size ${on.W}x${on.H} vs ${off.W}x${off.H}`);
  process.exit(1);
}

const got = { sky: level(on, off, BOX[lens].sky), horizon: level(on, off, BOX[lens].horizon), ground: level(on, off, GROUND) };
let allPass = true;
for (const k of ["sky", "horizon", "ground"]) {
  const ok = got[k] >= MIN[k];
  allPass &&= ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${k.padEnd(7)} ${got[k].toFixed(2)} levels min ${MIN[k]} (lens ${lens})`);
}
console.log(`${allPass ? "PASS" : "FAIL"} boostdiff sky ${got.sky.toFixed(2)} horizon ${got.horizon.toFixed(2)} ground ${got.ground.toFixed(2)}`);
process.exit(allPass ? 0 : 1);
