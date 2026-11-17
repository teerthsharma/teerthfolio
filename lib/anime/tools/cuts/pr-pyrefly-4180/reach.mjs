// Where a frame box meets a flat card: node lib/anime/tools/cuts/pr-pyrefly-4180/reach.mjs <a|b|c|d|home|site> <z> <x0> <y0> <x1> <y1>
// Box is frame fractions (y down) of a 16:9 frame. Prints the rig-frame x and y range where the box's four corner rays meet plane z.
import { LENS, FOV, FOV_SITE } from "../../../cutscenes/pr-pyrefly-4180/clock.js";

const usage = () => {
  console.error("usage: reach.mjs <a|b|c|d|home|site> <z> <x0> <y0> <x1> <y1>");
  process.exit(2);
};
const [name, zs, ...rest] = process.argv.slice(2);
const box = rest.map(Number);
const LENSES = ["a", "b", "c", "d", "home", "site"];
if (!LENSES.includes(name) || !Number.isFinite(Number(zs)) || box.length !== 4 || box.some(Number.isNaN)) usage();
const z = Number(zs);

const [eye, fwd0] = LENS[name];
const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const f = norm(fwd0);
const r = norm(cross(f, [0, 1, 0]));
const u = cross(r, f);
const v = Math.tan(((name === "site" ? FOV_SITE : FOV) * Math.PI) / 360);
const h = v * (16 / 9);

const xs = [];
const ys = [];
for (const fx of [box[0], box[2]]) {
  for (const fy of [box[1], box[3]]) {
    const nx = 2 * fx - 1;
    const ny = 1 - 2 * fy;
    const d = [0, 1, 2].map((k) => f[k] + h * nx * r[k] + v * ny * u[k]);
    if (d[2] >= 0) {
      console.error(`corner (${fx}, ${fy}) does not reach z ${z}`);
      process.exit(1);
    }
    const t = (z - eye[2]) / d[2];
    xs.push(eye[0] + t * d[0]);
    ys.push(eye[1] + t * d[1]);
  }
}
console.log(`x ${Math.min(...xs).toFixed(1)} ${Math.max(...xs).toFixed(1)}`);
console.log(`y ${Math.min(...ys).toFixed(1)} ${Math.max(...ys).toFixed(1)}`);
