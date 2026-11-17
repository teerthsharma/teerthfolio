// node scripts/seal-gates.check.mjs : the markings gates on a synthetic seal still, then one break at a time.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { REGION, scoreSeal, srgbToLab } from "./seal-gates.mjs";

const W = 96;
const H = 96;
const BACK = "#848e9d";
const BELLY = "#d5d2cd";
const PAD = "#c7bfb5";
const FRECKLE = "#544c46";
const EYE = "#0e0f13";
const WORN = "#ecebe8";
const BG = "#5a6470";
const GATES = ["G-C1", "G-C2", "G-C3", "G-C4", "G-32", "G-P"];
const PROGRAMS_OK = { withSkin: 5, withoutSkin: 5, heroDraws: 3 };

const hex = (s) => [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16));
const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const inDisc = (x, y, cx, cy, r) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
const close = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg}: got ${got}, want ${want} +- ${tol}`);

function seal({ back = BACK, belly = BELLY, eye = EYE, worn = true, bellyId = REGION.belly, noPad = false } = {}) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  const mask = new Uint8Array(W * H);
  const paint = (x, y, col, id) => {
    const i = y * W + x;
    rgba.set([...hex(col), 255], i * 4);
    mask[i] = id;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inEllipse(x, y, 48, 58, 30, 22)) {
        if (y < 50) paint(x, y, back, REGION.back);
        else paint(x, y, belly, bellyId);
      } else paint(x, y, BG, REGION.none);
    }
  }
  if (!noPad) {
    for (const cx of [22, 74]) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (inEllipse(x, y, cx, 74, 5, 5)) paint(x, y, PAD, REGION.pad);
      }
      for (const [dx, dy] of [[-2, -2], [2, -1], [0, 2]]) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (inDisc(x, y, cx + dx, 74 + dy, 1.3)) paint(x, y, FRECKLE, REGION.freckle);
        }
      }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inDisc(x, y, 40, 46, 4)) paint(x, y, eye, REGION.eye);
    if (worn && inEllipse(x, y, 48, 30, 14, 7)) paint(x, y, WORN, REGION.worn);
  }
  return { rgba, mask };
}

const score = (img, programs = PROGRAMS_OK) => {
  const out = scoreSeal({ ...img, w: W, h: H, programs });
  assert.deepEqual(out.map((g) => g.id), GATES, "gates come back in spec order");
  for (const g of out) {
    assert.ok(["pass", "fail", "not_run"].includes(g.status), `${g.id} status ${g.status}`);
    assert.ok("measured" in g && "expected" in g, `${g.id} has measured and expected`);
  }
  return Object.fromEntries(out.map((g) => [g.id, g]));
};
const failing = (res) => GATES.filter((id) => res[id].status === "fail");

// 1. CIELAB anchors (D65): white, black, pure red
const white = srgbToLab(255, 255, 255);
close(white.L, 100, 0.01, "L* white");
close(white.a, 0, 0.01, "a* white");
close(white.b, 0, 0.01, "b* white");
assert.equal(srgbToLab(0, 0, 0).L, 0, "L* black");
const red = srgbToLab(255, 0, 0);
close(red.L, 53.24, 0.05, "L* red");
close(red.a, 80.09, 0.05, "a* red");
close(red.b, 67.2, 0.05, "b* red");
close(red.C, Math.hypot(red.a, red.b), 1e-9, "C* is the chroma of a*, b*");

// 2. the synthetic seal passes every gate
const good = score(seal());
assert.deepEqual(failing(good), [], `synthetic seal fails: ${JSON.stringify(good)}`);
for (const id of GATES) assert.equal(good[id].status, "pass", id);

// 3. one break at a time
const warm = score(seal({ back: "#8f8677" }));
assert.deepEqual(failing(warm), ["G-C2"], "warm grey back fails only G-C2");
assert.ok(warm["G-C2"].measured.hueAb > 40 && warm["G-C2"].measured.hueAb < 120, "warm back hue sits in the yellow-grey range");

const flat = score(seal({ belly: BACK }));
assert.equal(flat["G-C1"].status, "fail", "belly as dark as the back fails G-C1");
close(flat["G-C1"].measured.yRatio, 1, 1e-9, "equal tones give a Y ratio of 1");

const bare = score(seal({ worn: false }));
assert.deepEqual(failing(bare), ["G-32"], "no worn feature fails only G-32");
assert.equal(bare["G-32"].measured.wornCells, 0, "no worn cells at 32 px");

const irisEye = score(seal({ eye: "#7ec8ff" }));
assert.equal(irisEye["G-C4"].status, "fail", "a light iris fails G-C4");

const badPrograms = score(seal(), { withSkin: 6, withoutSkin: 5, heroDraws: 3 });
assert.equal(badPrograms["G-P"].status, "fail", "a program count change fails G-P");
const badDraws = score(seal(), { withSkin: 5, withoutSkin: 5, heroDraws: 4 });
assert.equal(badDraws["G-P"].status, "fail", "4 hero draws fail G-P");

// 4. a gate it cannot compute is not_run, never pass
const noPad = score(seal({ noPad: true }));
assert.equal(noPad["G-C3"].status, "not_run", "no pad region is not_run for G-C3");
const noBelly = score(seal({ bellyId: REGION.back }));
assert.equal(noBelly["G-C1"].status, "not_run", "no belly region is not_run for G-C1");
assert.equal(noBelly["G-C2"].status, "not_run", "no belly region is not_run for G-C2");
const noPrograms = score(seal(), {});
assert.equal(noPrograms["G-P"].status, "not_run", "no program counts is not_run for G-P");

// 5. malformed input is an error, not a verdict
const img = seal();
assert.throws(() => scoreSeal({ rgba: img.rgba, mask: new Uint8Array(3), w: W, h: H, programs: PROGRAMS_OK }), /mask/);

// 6. the script runs as a stub until the driver exists
const script = fileURLToPath(new URL("./seal-gates.mjs", import.meta.url));
const stub = spawnSync(process.execPath, [script], { encoding: "utf8" });
assert.match(stub.stdout, /driver not implemented/, "script stub message");

console.log("seal-gates.check ok");
