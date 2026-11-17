// Pixel probes for a capture: node lib/anime/tools/cuts/pr-pyrefly-4180/probe.mjs <mean|share|diff> <png> [<png2>] x0 y0 x1 y1 ...
// Boxes are fractions of the frame, y down. mean: box mean within tol of RGB. share: percent of pixels within tol of RGB, >= minPercent.
// diff: mean absolute level difference of two images over the box, >= minLevels. Prints PASS or FAIL; exit 0 PASS, 1 FAIL, 2 usage.
import sharp from "sharp";

const [kind, ...args] = process.argv.slice(2);
const usage = () => {
  console.error("usage: probe.mjs mean <png> x0 y0 x1 y1 R G B tol | share <png> x0 y0 x1 y1 R G B tol minPercent | diff <png> <png2> x0 y0 x1 y1 minLevels");
  process.exit(2);
};
const load = async (f) => {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
};
const box = (im, [x0, y0, x1, y1]) => {
  const xs = Math.floor(x0 * im.W), xe = Math.min(im.W, Math.ceil(x1 * im.W));
  const ys = Math.floor(y0 * im.H), ye = Math.min(im.H, Math.ceil(y1 * im.H));
  const out = [];
  for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) out.push((y * im.W + x) * 3);
  return out;
};
const num = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) usage();
  return n;
};

if (kind === "mean") {
  if (args.length !== 9) usage();
  const im = await load(args[0]);
  const b = args.slice(1, 5).map(num);
  const want = args.slice(5, 8).map(num);
  const tol = num(args[8]);
  const px = box(im, b);
  const got = [0, 1, 2].map((c) => px.reduce((s, i) => s + im.data[i + c], 0) / px.length);
  const ok = got.every((g, c) => Math.abs(g - want[c]) <= tol);
  console.log(`${ok ? "PASS" : "FAIL"} mean got ${got.map((g) => g.toFixed(1)).join(" ")} want ${want.join(" ")} tol ${tol}`);
  process.exit(ok ? 0 : 1);
}

if (kind === "share") {
  if (args.length !== 10) usage();
  const im = await load(args[0]);
  const b = args.slice(1, 5).map(num);
  const want = args.slice(5, 8).map(num);
  const tol = num(args[8]);
  const minPct = num(args[9]);
  const px = box(im, b);
  let hit = 0;
  for (const i of px) if ([0, 1, 2].every((c) => Math.abs(im.data[i + c] - want[c]) <= tol)) hit++;
  const pct = (100 * hit) / px.length;
  const ok = pct >= minPct;
  console.log(`${ok ? "PASS" : "FAIL"} share ${pct.toFixed(2)}% want ${want.join(" ")} tol ${tol} min ${minPct}%`);
  process.exit(ok ? 0 : 1);
}

if (kind === "diff") {
  if (args.length !== 7) usage();
  const a = await load(args[0]);
  const c = await load(args[1]);
  if (a.W !== c.W || a.H !== c.H) {
    console.log(`FAIL diff size ${a.W}x${a.H} vs ${c.W}x${c.H}`);
    process.exit(1);
  }
  const b = args.slice(2, 6).map(num);
  const min = num(args[6]);
  const px = box(a, b);
  let sum = 0;
  for (const i of px) for (let k = 0; k < 3; k++) sum += Math.abs(a.data[i + k] - c.data[i + k]);
  const lv = sum / (px.length * 3);
  const ok = lv >= min;
  console.log(`${ok ? "PASS" : "FAIL"} diff ${lv.toFixed(2)} levels min ${min}`);
  process.exit(ok ? 0 : 1);
}

usage();
