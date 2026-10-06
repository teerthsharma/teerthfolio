// SCREEN-SPACE-ISH FX, all pushed BEHIND the seal's depth so the hero is never covered: the ZAP burst (shot 1), the gold
// afterglow rim (shots 7-10), the scorch wipe (shot 11), the moon halo (layer 0), and the impact / speed-line / shock
// registrations that the direction layer may have left out of scene.js.
//
// ZAP burst (1.15-1.6 s): about the seal's screen position c, p = (uv - c) * (asp, 1), r = |p|, a = atan(p).
//   rays        N = 22 wedges, length L_i = .35 + .65 vn(i); ink fill #ffd23a where r in [.12 R, R L_i], R = 2.1 easeOut(k)
//   halftone    cell 6 px (rotated 45 deg): dot radius .5 (1 - r/R) -> gold #ffa927 dots fading outward
//   bloom       a bright additive disc 2.0 HDR, f28-38 (1.15-1.55 s), fades by 1.6
// Gold rim (afterglow): the pup's silhouette ellipse E(p) = (p.x/.42)^2 + (p.y/.44)^2 (billboard half-size 1.1 m).
//   rim = inside(E shifted left by .075 and enlarged 1.14) and not inside(E)  -> a hard-cut crescent on the face's left,
//   #ffd23a HDR 1.6; behind it a soft #ffb347 halo at 35 percent. Intensity ramps with the afterglow, max in shot 9.
// Scorch wipe (20.0-20.8 s): d = |uv.y - lineY| + .22 fbm(uv * (5, 3) + seed); the front f = 1.25 smoothstep(0, 1, k);
//   char (#14080a) where d < f, rim #ffb347 for f - .035 < d < f, fall #ffd23a for f < d < f + .02, ember specks on twos.
// Moon halo: a cyan 2 px ring (#7fe4ff 60 percent) + #b6ecff 25 percent glow, on layer 0 at the bible's MOON direction.
import { billboard, NZ, sstep, clamp01 } from "./lib.js";

export default function makeScreen(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "screen";
  const C = (h) => new THREE.Color(h);

  // ---- ZAP burst ----
  const zapFs = /* glsl */ `
    uniform float uK; uniform float uSeed; uniform float uHs; varying vec2 vUv; varying vec2 vSealNdc; varying float vAsp;
    void main() {
      vec2 p = (vUv - vSealNdc) * vec2(vAsp, 1.); float r = length(p), a = atan(p.y, p.x);
      float R = 2.1 * (1. - pow(1. - clamp(uK * 1.4, 0., 1.), 3.));
      float wedge = floor((a + 3.14159) / 6.28318 * 22.);
      float Li = .35 + .65 * h21(vec2(wedge, uSeed));
      float inRay = step(.12 * R, r) * step(r, R * Li) * step(.28, fract((a + 3.14159) / 6.28318 * 22.)) * step(fract((a + 3.14159) / 6.28318 * 22.), .86);
      // halftone dots, 6 px cells rotated 45 degrees
      vec2 fc = gl_FragCoord.xy; float cell = 6. * uHs;
      vec2 q = mat2(.7071, -.7071, .7071, .7071) * fc / cell; vec2 g = fract(q) - .5;
      float dotR = .5 * clamp(1. - r / max(R, .01), 0., 1.) * 1.3;
      float dots = step(length(g), dotR) * step(r, R * 1.05) * step(.12 * R, r);
      vec3 gold = pow(vec3(1., .824, .227), vec3(2.2)), gold2 = pow(vec3(1., .663, .153), vec3(2.2));
      float fade = 1. - smoothstep(.7, 1., uK);
      float bloomD = (1. - smoothstep(0., 1.1, r)) * smoothstep(.0, .15, uK) * (1. - smoothstep(.2, .55, uK)) * 2.;
      vec3 col = vec3(0.); float al = 0.;
      if (dots > .5) { col = gold2 * 1.2; al = .85; }
      if (inRay > .5) { col = gold * 1.3; al = 1.; }
      col += gold * bloomD; al = max(al, clamp(bloomD * .6, 0., 1.));
      al *= fade; if (al < .01) discard;
      gl_FragColor = vec4(col, al);
    }`;
  const zap = billboard(THREE, sh, zapFs, { uK: { value: 0 }, uSeed: { value: 3 } }, { full: true, push: 0.45, order: 1 });
  group.add(zap);

  // ---- gold rim behind the pup ----
  const rimFs = /* glsl */ `
    uniform float uK; varying vec2 vUv;
    void main() {
      vec2 p = vUv * 1.1;                       // metres from the chest, billboard half-size 1.1
      float e0 = length(vec2(p.x / .42, p.y / .44));
      float e1 = length(vec2((p.x + .075) / (.42 * 1.14), p.y / (.44 * 1.14)));
      float crescent = step(e0, 1.) * 0.; crescent = step(1., e0) * step(e1, 1.);
      // keep it to the left half of the face: x < .1
      crescent *= step(p.x, .12);
      float halo = (1. - smoothstep(.4, 1.1, length(p))) * .35 * (1. - step(e0, 1.));
      vec3 gold = pow(vec3(1., .824, .227), vec3(2.2)), amb = pow(vec3(1., .702, .278), vec3(2.2));
      float a = max(crescent, halo) * uK; if (a < .01) discard;
      gl_FragColor = vec4(crescent > .5 ? gold * 1.6 : amb * .9, crescent > .5 ? 1. * uK : a);
    }`;
  const rim = billboard(THREE, sh, rimFs, { uK: { value: 0 } }, { push: 0.3, order: 2 });
  rim.userData.u.uSize.value.set(1.1, 1.1);
  group.add(rim);

  // ---- scorch wipe ----
  const wipeFs = /* glsl */ `
    uniform float uK; uniform float uSeed; uniform float uTime; varying vec2 vUv; varying vec2 vSealNdc;
    void main() {
      if (uK < .001) discard;
      float lineY = vSealNdc.y;
      float d = abs(vUv.y - lineY) + .22 * fbm(vec2(vUv.x * 5., vUv.y * 3.) + uSeed * 3.1) + .02 * vn(vec2(vUv.x * 40., uTime * 12.));
      float f = 1.3 * smoothstep(0., 1., uK);
      float cover = step(d, f);
      float rimB = step(f - .05, d) * step(d, f);
      float fall = step(f, d) * step(d, f + .03);
      float ember = step(.93, vn(vec2(vUv * 40.) + floor(uTime * 12.) * 3.7)) * cover;
      vec3 ch = pow(vec3(.078, .031, .039), vec3(2.2));
      vec3 col = ch; float al = 0.;
      if (cover > .5) { col = ch + ember * pow(vec3(1., .702, .278), vec3(2.2)) * 1.5; al = 1.; }
      if (rimB > .5) { col = pow(vec3(1., .702, .278), vec3(2.2)) * 1.8; al = 1.; }
      if (fall > .5) { col = pow(vec3(1., .824, .227), vec3(2.2)) * 1.4; al = .9; }
      // the beam line itself glows as the front opens: a thin hot row at the start
      float row = (1. - smoothstep(0., .02, abs(vUv.y - lineY))) * (1. - smoothstep(.0, .25, uK));
      col += pow(vec3(1., .824, .227), vec3(2.2)) * row * 2.; al = max(al, row);
      if (al < .01) discard;
      gl_FragColor = vec4(col, al);
    }`;
  const wipe = billboard(THREE, sh, wipeFs, { uK: { value: 0 }, uSeed: { value: 5 }, uTime: { value: 0 } }, { full: true, push: 0.25, order: 20 });
  group.add(wipe);

  // ---- moon halo (layer 0: a static far card) ----
  const moonFs = /* glsl */ `
    varying vec2 vUv;
    void main() {
      float r = length(vUv);
      float ring = 1. - smoothstep(0., .012, abs(r - .72));
      float glow = (1. - smoothstep(.3, 1., r)) * .25 * step(.62, r);
      float a = max(ring * .6, glow); if (a < .01) discard;
      vec3 ringC = pow(vec3(.498, .894, 1.), vec3(2.2)), glowC = pow(vec3(.714, .925, 1.), vec3(2.2));
      gl_FragColor = vec4(ring > .3 ? ringC * 1.3 : glowC, a);
    }`;
  const moon = billboard(THREE, sh, moonFs, {}, { order: 0, depthTest: false });
  {
    const m = new THREE.Vector3(...L.moon).normalize().multiplyScalar(120);
    const at = ctx.scene.seal?.at ?? [0, 0, 0];
    moon.userData.u.uCenter.value.set(at[0] + m.x, at[1] + m.y, at[2] + m.z);
    moon.userData.u.uSize.value.set(3.9, 3.9);
    moon.visible = true; ctx.setLayer(moon, 0);
  }
  group.add(moon);

  // ---- registrations the direction layer may not have made (pure functions of the clock; once) ----
  if (!T.hasBeatNear("impact", 6.8 + 4 / 24, 0.4)) ctx.sakuga.impact(6.8 + 4 / 24, [[2, 1], [3, 1]]); // f167-169: inverted #ffd23a/#1a0a00, then #fff/#e8470a
  if (!T.hasBeatNear("impact", T.zap, 0.3)) ctx.sakuga.impact(T.zap, [[1, 1], [2, 1]]);               // f28 flash
  if (!T.hasBeatNear("speedlines", T.coinToss, 0.4)) ctx.sakuga.speedLines({ t: T.coinToss, dur: 0.42, kind: "radial", at: [0.5, 0.5], strength: 0.75, col: "#fff8e0" });
  if (!T.hasBeatNear("shock", 6.8, 0.3)) ctx.sakuga.shock({ t: T.shot, dur: 0.5, at: [0.5, 0.5], amp: 0.035, r1: 0.9 });

  function update(t, dt, cue) {
    const ts = cue.ts;
    // ZAP
    const zk = (ts - T.zap) / 0.45;
    zap.visible = zk >= 0 && zk < 1;
    if (zap.visible) zap.userData.u.uK.value = zk;
    // gold rim: grows with the afterglow, full for the face and credit, slightly down for the wipe
    const rk = sstep(T.afterglow, T.face, ts) * 0.6 + sstep(T.face - 0.3, T.face + 0.6, ts) * 0.4;
    rim.visible = rk > 0.01 && ts < T.wipe + 0.8;
    if (rim.visible) { const u = rim.userData.u; ctx.seal.chest(u.uCenter.value); u.uK.value = rk * (ts >= T.credit ? 0.75 : 1); }
    // wipe
    const wk = clamp01((ts - T.wipe) / 0.8);
    wipe.visible = wk > 0;
    if (wipe.visible) { const u = wipe.userData.u; u.uK.value = wk; u.uTime.value = ts; }
    void dt;
  }
  function dispose() { for (const o of [zap, rim, wipe, moon]) { o.geometry.dispose(); o.material.dispose(); } }
  return { group, update, dispose };
}
