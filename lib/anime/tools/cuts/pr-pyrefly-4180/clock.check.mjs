// Checks the clock against the live move's own numbers (run: node lib/anime/tools/cuts/pr-pyrefly-4180/clock.check.mjs). Prints CLOCK OK, or FAIL with the mismatches (exit 1).
import { T, remap, unmap, REAL, TURN, BACK, HOOP_AT, HIT, FTG, LEN, DOCK, LINE, SIGN, ENTER, SHELL, LENS, FOV_SITE } from "../../../cutscenes/pr-pyrefly-4180/clock.js";

const close = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const fails = [];
const expect = (name, got, want, eps) => {
  const ok = Array.isArray(want) ? want.every((w, i) => close(got[i], w, eps)) : close(got, want, eps);
  if (!ok) fails.push(`${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

for (let x = 0; x <= LEN + 1e-9; x += 0.4) {
  const r = unmap(remap(x));
  if (!close(r, x, 1e-6)) fails.push(`unmap(remap(${x.toFixed(1)})) = ${r}`);
}

expect("REAL.hop", REAL.hop, [7.9, 9.05, 10.2, 12.316], 0.01);
expect("REAL.burst", REAL.burst, 14.98, 0.01);
expect("REAL.pin", REAL.pin, [18.72, 19.315], 0.01);
expect("REAL.clack", REAL.clack, [19.315, 19.825], 0.01);
expect("REAL.plaque", REAL.plaque, 23.03, 0.01);
expect("REAL.fold", REAL.fold, 26.0, 0.01);
expect("REAL.cheer", REAL.cheer, 19.57, 0.01);
expect("REAL.surge", REAL.surge, [12.89, 14.98], 0.01);
expect("REAL.rose", REAL.rose, [15.405, 16.595], 0.01);
expect("REAL.throw", REAL.throw, [3.175, 3.7], 0.02);
expect("HOOP_AT play", HOOP_AT, 7.918, 0.002);
expect("HIT.hoop", HIT.hoop, 11.0, 0.01);
expect("HIT.pin", HIT.pin, 19.333, 0.01);
expect("FTG", FTG, [7.917, 9.042, 10.208], 0.01);
expect("BACK", BACK, 22.75, 1e-9);
expect("TURN in band", TURN, 0.111, 0.002);
expect("T.hop play", T.hop, [5.5, 6.4, 7.3, 8.95], 0);
expect("DOCK", DOCK, [74, 0, -20.4], 0);

const AREA = { duration: 28.4, sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, lineA: 2.3, lineB: 7.9, lineC: 14.3, credit: 22.8, collapse: [27.6, 28] };
expect("AREA duration", LEN, AREA.duration, 0);
expect("AREA sign", SIGN, AREA.sign, 0);
expect("AREA impact", LINE.impact, AREA.impact, 0);
expect("AREA bloom", SHELL.bloom, AREA.bloom, 0);
expect("AREA enter", ENTER, AREA.enter, 0);
expect("AREA lineA", LINE.A, AREA.lineA, 0);
expect("AREA lineB", LINE.B, AREA.lineB, 0);
expect("AREA lineC", LINE.C, AREA.lineC, 0);
expect("AREA credit", LINE.credit, AREA.credit, 0);
expect("AREA collapse", LINE.collapse, AREA.collapse, 0);

const pitch = (fwd) => (Math.asin(fwd[1]) * 180) / Math.PI;
const sitePitch = pitch(LENS.site[1]);
if (sitePitch > -25 || sitePitch < -45) fails.push(`LENS.site pitch ${sitePitch.toFixed(1)} outside -25..-45`);
expect("FOV_SITE", FOV_SITE, 28, 0.5);

console.log(fails.length ? `FAIL clock.check ${fails.length} mismatches\n  ${fails.join("\n  ")}` : "CLOCK OK");
process.exit(fails.length ? 1 : 0);
