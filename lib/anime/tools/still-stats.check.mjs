// node lib/anime/tools/still-stats.check.mjs : colour maths and stills statistics on known answers.
import assert from "node:assert/strict";
import { lumaY, hueOf, notan, hueShare, hueMedian, satMean, lumaStd, maxY, darkFrac } from "./still-stats.js";

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const rgba = (px) => {
  const a = new Uint8ClampedArray(px.length * 4);
  px.forEach((p, i) => a.set([p[0], p[1], p[2], 255], i * 4));
  return a;
};
const circDist = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const close = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg}: got ${got}, want ${want} +- ${tol}`);

const dark = hex("#0e0c16");
const red = hex("#e5142e");
const orange = [255, 42, 0];
const yellowish = [255, 43, 0];
const cyan = [0, 200, 200];
const grey = [128, 128, 128];

// 1. named sRGB points
close(lumaY(...dark), 0.052, 0.001, "lumaY #0e0c16");
close(lumaY(255, 255, 255), 1, 1e-9, "lumaY white");
const hr = hueOf(...red);
close(hr.h, 352.5, 0.5, "hue #e5142e");
close(hr.s, 0.91, 0.01, "sat #e5142e");
close(hueOf(...orange).h, 60 * 42 / 255, 1e-9, "hue of (255,42,0)");
assert.equal(hueOf(...grey).s, 0, "grey has no saturation");

// 2. notan: 53% Y 0.05, 33% Y 0.2, 14% Y 0.6 at thresholds 0.12 and 0.40
const tone = [];
for (let i = 0; i < 53; i++) tone.push([13, 13, 13]);
for (let i = 0; i < 33; i++) tone.push([51, 51, 51]);
for (let i = 0; i < 14; i++) tone.push([153, 153, 153]);
const [s0, s1, s2] = notan(rgba(tone), tone.length, 1, 0.12, 0.4);
close(s0, 53, 1, "notan low");
close(s1, 33, 1, "notan mid");
close(s2, 14, 1, "notan high");

// 3. hueShare: wrapping window and plain window; grey never qualifies
const wrap =hueShare(rgba([red, yellowish, cyan, grey]), 4, 1, { lo: 330, hi: 20 });
assert.equal(wrap.n, 3, "hueShare qualifying count");
close(wrap.share, 2 / 3, 1e-9, "wrapping window share (352.5 and 10 in, 180 out)");
close(hueShare(rgba([red, yellowish, cyan, grey]), 4, 1, { lo: 170, hi: 190 }).share, 1 / 3, 1e-9, "plain window share");
assert.deepEqual(hueShare(rgba([grey, grey]), 2, 1, { lo: 0, hi: 90 }), { share: 0, n: 0 }, "no qualifying pixels");

// 4. hueMedian: circular, across 0 degrees; null when nothing qualifies
close(circDist(hueMedian(rgba([red, orange, yellowish]), 3, 1, {}), 60 * 42 / 255), 0, 0.5, "circular median near 9.9");
assert.equal(hueMedian(rgba([grey]), 1, 1, {}), null, "hueMedian null on grey");

// 5. scalar stills statistics
close(satMean(rgba([red]), 1, 1), hr.s, 1e-9, "satMean single colour");
close(lumaStd(rgba([[0, 0, 0], [255, 255, 255]]), 2, 1), 0.5, 1e-9, "lumaStd half black half white");
assert.equal(maxY(rgba([[0, 0, 0]]), 1, 1), 0, "maxY black");
close(maxY(rgba([[255, 255, 255]]), 1, 1), 1, 1e-9, "maxY white");

// 6. darkFrac on a 64x40 grid
const W = 64, H = 40;
const fill = (f) => {
  const px = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px.push(f(x, y));
  return rgba(px);
};
assert.equal(darkFrac(fill(() => dark), W, H), 0, "darkFrac all #0e0c16");
assert.equal(darkFrac(fill(() => [0, 0, 0]), W, H), 1, "darkFrac all black");
close(darkFrac(fill((x) => (x < 32 ? [0, 0, 0] : dark)), W, H), 0.5, 1e-9, "darkFrac left half black");

console.log("still-stats.check: ok");
