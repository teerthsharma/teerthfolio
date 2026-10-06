// SHOT 1: the hand-seal glow (bible FX 1) and the blindfold glints (bible 3.14, 3.15, easter egg 1).
//
// Hand glow  a white pinpoint r 0.04 m on a cyan #7fdfff halo r 0.18 m, additive, flat cel bands (no gradient), plus a 4-point
//            sparkle and thin 8-spike flare. Quad half-size 0.45 m, so in vP (-1..1): pinpoint .09, halo .40, inner band .27.
//            K(t): rises over the 0.28 s before the cross (f20, 0.83 s), holds 20 frames, fades into the bloom.
//            On twos the radius breathes 0.04 m: size = 0.9 (1 + 0.05 (-1)^step).
// Glints     4-point star, horizontal flare, light only. Cyan #7fdfff rim, white centre, a 2-frame hold on the strike (f158-170,
//            6.6 s) then a slow throb to 8.6 s. Two of them, at the ends of the free blindfold band (the relic itself is the cast's prop).
import { billboard, hexLin, sealW, sstep, clamp01 } from "./lib.js";

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-handseal";
  const CY = new THREE.Vector3(...hexLin("#7fdfff"));

  const glow = billboard(THREE, {
    u: { uCyan: CY }, order: 8,
    fs: /* glsl */ `
    uniform float uK; uniform vec3 uCyan;
    void main() {
      if (uK < 0.004) discard;
      float r = length(vP);
      float halo = step(r, 0.40) * 0.26 + step(r, 0.27) * 0.30;          // two flat cel bands
      float pin = 1. - smoothstep(0.085, 0.10, r);                        // the white pinpoint
      float sp = star4(vP, 0.95) * 0.75;
      float fl = flare8(vP * 1.15, 0.2) * 0.55;
      vec3 c = uCyan * (halo + sp + fl) + vec3(1.) * pin * 1.2;
      gl_FragColor = vec4(min(c, vec3(1.4)), uK);
    }`,
  });
  glow.userData.u.uSize.value.set(0.9, 0.9);
  group.add(glow);

  const gl = [];
  const GF = /* glsl */ `
    uniform float uK; uniform vec3 uCyan;
    void main() {
      if (uK < 0.004) discard;
      float st = star4(vP, 0.95);
      float core = star4(vP, 0.34);
      float hz = exp(-abs(vP.y) * 34.) * exp(-abs(vP.x) * 2.4) * 0.85;   // the horizontal flare
      vec3 c = uCyan * (st * 0.95 + hz) + vec3(1.) * core * 1.15;
      gl_FragColor = vec4(min(c, vec3(1.4)), uK);
    }`;
  for (let i = 0; i < 2; i++) { const g = billboard(THREE, { u: { uCyan: CY }, fs: GF, order: 9 }); g.userData.u.uSize.value.set(0.55, 0.55); group.add(g); gl.push(g); }

  const hs = L.T("handseal", 0.83, 0.62), gt = L.T("glints", 6.6, 2.0);
  const hand = new THREE.Vector3();
  return {
    group,
    update(t) {
      // hand glow: flipper cross at the seal's front, chest height (seal-local 0.12, 0.40, 0.36)
      const t0 = hs.t, k = sstep(t0 - 0.28, t0, t) * (1 - sstep(t0 + 0.62, t0 + 0.95, t));
      const u = glow.userData.u;
      sealW(ctx.seal, 0.12, 0.40, 0.36, hand);
      u.uPos.value.copy(hand); u.uK.value = k * 0.95;
      const br = 0.9 * (1 + 0.05 * (Math.floor(t * 12) % 2 ? 1 : -1)) * (0.7 + 0.3 * sstep(t0 - 0.28, t0, t));
      u.uSize.value.set(br, br); u.uRot.value = 0.2;
      // glints at the free blindfold's ends
      const e = t - gt.t, on = e >= 0 && e <= gt.dur + 0.2;
      for (let i = 0; i < 2; i++) {
        const gu = gl[i].userData.u;
        const hold = e < 2 / 24 ? 1 : 0.62 + 0.3 * Math.sin((e - 2 / 24) * 5.2 + i * 1.7);
        gu.uK.value = on ? clamp01(hold) * sstep(gt.t + gt.dur + 0.2, gt.t + gt.dur - 0.1, t + 0) : 0;
        gu.uPos.value.set(L.relic.x + (i ? 0.24 : -0.24), L.relic.y + 0.02 * i, L.relic.z);
        const sz = 0.55 * (e < 2 / 24 ? 1.25 : 1) * (1 + 0.1 * Math.sin(e * 6 + i));
        gu.uSize.value.set(sz, sz); gu.uRot.value = 0;
      }
    },
    dispose() {},
  };
}
