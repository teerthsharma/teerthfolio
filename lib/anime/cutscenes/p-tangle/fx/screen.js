// SCREEN FX (bible 6): the gold-rim dimension bubble (0-2.8 s), the near-first dissolve edge (25.0-27.8 s), the one short wipe (27.8 s),
// and the slow warp rings registered on the compositor (impact and pull). Your Name has no impact frames or flashes ("impact is a hold
// plus slow light change"), so none is fired: sakuga.shock only, long and low (amp .02).
// All passes are full-frame quads BEHIND the seal's depth: the seal is never covered, never lit by them.
//
// Bubble. d = |p| in height units, p = ndc * (aspect, 1). Rim radius R(t) = mix(.55, 1.9, e) (e = smoothstep(.15, 1, t/2.8)^1.4), wobbled by
//   (vn(angle 3 + t .6) - .5) .06. rim = exp(-((d - R)/.035)^2); fresnel = (1 - smoothstep(R - .35, R, d)) inverted inside:
//   fres = smoothstep(R - .35, R, d) step(d, R). colour #ffc880 with an iridescent drift to #ff7a8a and #8da6ff by angle.
//   alpha .35 -> 1 over the shot (bible), out as the rim leaves the frame.
// Dissolve. ring radius Rd(k) = mix(.14, 2.3, k^.9) + (fbm(angle 4 + k 3) - .5) .12 ; edge = exp(-((d - Rd)/.03)^2) in #ffd6a0 hdr 1.5,
//   the dissolved side (d < Rd) gets a faint gold dust (cell hash on 40 x 40, twinkle on threes), the near region goes first (near-first).
// Wipe. x(k) = mix(-asp - .35, asp + .35, k^1.3); band exp(-((p.x - x)/.05)^2) gold plus a cream tail .3 exp(-(x - p.x) 3) for p.x < x.
import { billboard, sstep, clamp01 } from "./lib.js";

export default function makeScreen(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "screen";
  const C = (h) => new THREE.Color(h);

  const bubbleFs = /* glsl */ `
    uniform float uR; uniform float uA;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.);
      float d = length(p), ang = atan(p.y, p.x);
      float R = uR + (vn(vec2(ang * 3. + uT * .6, uT * .3)) - .5) * .06;
      float rim = exp(-pow((d - R) / .035, 2.));
      float fres = smoothstep(R - .35, R, d) * step(d, R);
      float hueT = .5 + .5 * sin(ang * 2. + uT * .8);
      vec3 base = vec3(1., .784, .502);
      vec3 col = mix(mix(base, vec3(1., .478, .541), hueT), vec3(.553, .651, 1.), smoothstep(.6, 1., hueT) * .5);
      gl_FragColor = vec4(col * (rim * 1.5 + fres * .45), clamp(rim + fres * .35, 0., 1.) * uA);
    }`;
  const bubble = billboard(THREE, sh, bubbleFs, { uR: { value: 1 }, uA: { value: 0 } }, { full: true, push: 1.0, order: 2 });

  const dissolveFs = /* glsl */ `
    uniform float uD; uniform float uA; uniform vec3 uCol;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.);
      float d = length(p), ang = atan(p.y, p.x);
      float Rd = mix(.14, 2.3, pow(uD, .9)) + (fbm(vec2(ang * 4., uD * 3.)) - .5) * .12;
      float edge = exp(-pow((d - Rd) / .03, 2.));
      float halo = exp(-pow((d - Rd) / .16, 2.)) * .22;
      vec2 cell = floor((p + 3.) * 40.);
      float dust = step(.965, h21(cell + floor(uStep * .5))) * step(d, Rd) * (1. - smoothstep(0., .6, Rd - d)) * (1. - smoothstep(.12, .3, abs(d - Rd)) * 0.);
      gl_FragColor = vec4(uCol * (edge * 1.5 + halo + dust * .8), clamp(edge + halo + dust, 0., 1.) * uA);
    }`;
  const dissolve = billboard(THREE, sh, dissolveFs, { uD: { value: 0 }, uA: { value: 0 }, uCol: { value: C("#ffd6a0") } }, { full: true, push: 1.0, order: 5 });

  const wipeFs = /* glsl */ `
    uniform float uX; uniform float uA; uniform vec3 uCol;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.);
      float x = mix(-vAsp - .35, vAsp + .35, pow(uX, 1.3));
      float band = exp(-pow((p.x - x) / .05, 2.));
      float tail = p.x < x ? .3 * exp(-(x - p.x) * 3.) : 0.;
      float grain = .85 + .15 * vn(vec2(p.y * 30., uT * 4.));
      gl_FragColor = vec4(uCol * (band * 1.6 + tail) * grain, clamp(band + tail, 0., 1.) * uA);
    }`;
  const wipe = billboard(THREE, sh, wipeFs, { uX: { value: 0 }, uA: { value: 0 }, uCol: { value: C("#ffd6a0") } }, { full: true, push: 1.0, order: 9 });
  group.add(bubble, dissolve, wipe);

  // slow warp rings on the compositor: pure functions of the clock, safe to scrub
  try {
    ctx.sakuga?.shock?.({ t: T.cometImpact, dur: 1.4, at: [0.5, 0.42], amp: 0.02, r1: 0.9 });
    ctx.sakuga?.shock?.({ t: T.pull, dur: 0.9, at: [0.5, 0.5], amp: 0.014, r1: 0.7 });
  } catch { /* the compositor warp is optional */ }

  return {
    group,
    update(t) {
      // bubble: 0 -> 2.8 s
      const k = clamp01(t / Math.max(0.5, T.dimensionD));
      const e = Math.pow(sstep(0.15, 1, k), 1.4);
      const bu = bubble.userData.u;
      bu.uR.value = 0.55 + (1.9 - 0.55) * e; bu.uT.value = t;
      bu.uA.value = (0.35 + 0.65 * k) * (1 - sstep(0.88, 1, k)); bubble.visible = t < T.dimensionD + 0.05 && bu.uA.value > 0.01;
      // dissolve: 25.0 -> 27.8 s (the cord stays tied; only the dimension thins)
      const kd = clamp01((t - T.dissolve) / Math.max(0.5, T.dissolveD));
      const du = dissolve.userData.u; du.uD.value = kd;
      du.uA.value = sstep(0, 0.08, kd) * (1 - sstep(0.92, 1, kd)); dissolve.visible = t >= T.dissolve && t < T.dissolve + T.dissolveD + 0.05;
      // wipe
      const kw = clamp01((t - T.wipe) / Math.max(0.2, T.wipeD));
      const wu = wipe.userData.u; wu.uX.value = kw; wu.uT.value = t;
      wu.uA.value = t >= T.wipe ? 1 - sstep(0.9, 1, kw) : 0; wipe.visible = t >= T.wipe && kw < 1;
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
