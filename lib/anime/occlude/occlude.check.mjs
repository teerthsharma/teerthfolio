// node lib/anime/occlude/occlude.check.mjs : the OCCLUDE pass is neutral by default and never reaches the hero seal.
import assert from "node:assert/strict";
import { alivePixel, occlusionFactor, omega, OCCLUDE_FRAG } from "./occlude.js";

// neutral arm: a = 0 leaves the plate untouched at every life, Lambda and time
for (const life of [0, 0.5, 1]) for (const Lambda of [0, 0.4, 1]) for (const tq of [0, 3.7]) {
  assert.equal(occlusionFactor({ a: 0, life, Lambda, tq, kappa: 1.3, delta: 2 }), 1, "a = 0 is the identity");
}

// the pre-registered constants are unset: any non-neutral a refuses to run
assert.throws(() => omega(0.5), /pre-registered/, "omega needs omega0 from T6");
assert.throws(() => occlusionFactor({ a: 0.2, Lambda: 0.5 }), /pre-registered/, "a needs a_max from T6");

// the contract with the constants supplied as test values (never a registered bar)
const OM0 = 2, AMAX = 1;
const f = (o) => occlusionFactor({ omega0: OM0, aMax: AMAX, a: 0.5, ...o });
assert.equal(f({ hero: 1, life: 0, Lambda: 1 }), 1, "hero seal is never multiplied");
assert.equal(f({ life: 1, Lambda: 1 }), 1, "a live plate is not darkened by the baked term");
for (let i = 0; i < 2000; i++) {
  const o = { life: Math.random(), Lambda: Math.random(), kappa: Math.random() * 9, delta: 0.5 + Math.random() * 4, tq: Math.random() * 50, hero: Math.random() < 0.3 ? 1 : 0 };
  const A = f(o);
  assert.ok(A >= 0 && A <= 1, `A in [0,1], got ${A}`);
}
assert.ok(omega(3, OM0) < omega(0.5, OM0), "large Lambda moves slower");

// a pixel: the luma cap holds, and the hero pixel keeps the plate exactly through the cap
const px = alivePixel([0.9, 0.9, 0.9], [0.9, 0.9, 0.9], { life: 0, omega0: OM0, aMax: AMAX, a: 0.5, hero: 0, Lambda: 1 });
const L = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
assert.ok(L <= 0.92 + 1e-6, `lumaCap holds, got ${L}`);

// the GLSL carries the same terms and the hero mask
for (const term of ["hero", "uOmega0", "clamp", "lumaCap"]) assert.ok(OCCLUDE_FRAG.includes(term), `shader has ${term}`);

console.log("occlude.check: ok");
