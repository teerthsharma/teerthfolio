// FX 8: THE DAWN GRADE: warm lights +6% (#ffc98a), cool shadows (#8a8fd6), nothing lifted.
//
// Rides the composer's own uniforms (post.js): col = pow(max((col + uSplit L (1 - L)) * uGain, 0), 1 / uGamma)
//     gain  = base * (1 + w * (tintWarm - 1)),  tintWarm = (1.060, 1.012, 0.944)    +6% warm in the lights, a touch down in blue
//     split = base + c * (0.004, 0.008, 0.024)                                      a cool nudge in the midtones: L(1-L) peaks .25, so
//                                                                                   at most +0.006 and it is zero at black and white (nothing lifted)
//   w and c are time curves: the gold of Vinland (12.8 s) leans warmer, the rain (24.4 s) cooler. Both are pure functions of the clock.
// The base values are read at build, after the dock's style is applied, and put back on dispose. Writes only this dock's own composer.
export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const u = ctx.engine?.composer?.u;
  if (!u || !u.uGain || !u.uSplit) return { group, update() {}, dispose() {} };
  const baseGain = u.uGain.value.clone(), baseSplit = u.uSplit.value.clone();
  const warm = new THREE.Color(1.06, 1.012, 0.944);
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  return {
    group,
    update(t) {
      const gold = sm(12.8, 14.0, t) * (1 - sm(16.4, 18.8, t));       // Vinland rises
      const flames = sm(18.8, 20.0, t);                               // the beacons keep it warm
      const rain = sm(24.4, 25.8, t);
      const w = Math.max(0, 1 + 0.6 * gold + 0.3 * flames - 0.5 * rain);
      const c = 1 + 0.5 * rain;
      u.uGain.value.setRGB(
        baseGain.r * (1 + w * (warm.r - 1)),
        baseGain.g * (1 + w * (warm.g - 1)),
        baseGain.b * (1 + w * (warm.b - 1)),
      );
      u.uSplit.value.setRGB(baseSplit.r + c * 0.004, baseSplit.g + c * 0.008, baseSplit.b + c * 0.024);
    },
    dispose() { u.uGain.value.copy(baseGain); u.uSplit.value.copy(baseSplit); },
  };
}
