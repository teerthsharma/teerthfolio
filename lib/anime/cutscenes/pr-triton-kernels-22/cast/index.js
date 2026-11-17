// CAST for pr-triton-kernels-22: the seal printed in the page's ink from the impact to the rub-out, as the site's pup.js twin is (its tone laid
// in dots, hatching, cross-hatching and black; its red kept). The rig is not touched: each material's main() is wrapped once, here, at build.
import { BackSide, Group, Vector3, Vector4 } from "three";
import { sitePup } from "./pup.js";
import { BACK, LINE, SEAL, warp } from "../clock.js";
import { TONE } from "../tone.js";

// uSkPart: 0 fur, face and hair; 1 the uniform (its lit side cross-hatched, its shade black, its folds and rim left as paper lines);
// 2 the hands (paper, their creases inked)
const INK = /* glsl */ `
  ${TONE}
  uniform vec4 uSk; uniform vec3 uSkTone; uniform float uSkPart;
  const vec3 SK_PAPER = vec3(0.925, 0.9, 0.835), SK_INK = vec3(0.055, 0.045, 0.05), SK_RED = vec3(0.80, 0.04, 0.09), SK_KEY = vec3(-0.4975, 0.6169, 0.597);
  float skH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float skN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(skH(i), skH(i + vec2(1, 0)), f.x), mix(skH(i + vec2(0, 1)), skH(i + vec2(1, 1)), f.x), f.y); }
  float skL(float u, float w, float aa) { float d = abs(fract(u + 0.5) - 0.5); return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d); }
  vec2 skCov(float cov, vec2 f, float ang) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * f / 9.0;
    float d = length(fract(p) - 0.5), rad = 0.64 * sqrt(clamp((cov - 0.06) / 0.5, 0.0, 1.0)), aaD = 0.5 / (9.0 * uSk.z) * 1.4 + 0.02;
    float dots = (1.0 - smoothstep(rad - aaD, rad + aaD, d)) * (1.0 - smoothstep(0.5, 0.64, cov));
    float c = cos(ang), s = sin(ang), aa = 0.5 / (8.0 * uSk.z) * 1.4 + 0.02;
    float hatch = skL(dot(f, vec2(c, s)) / 8.0, clamp((cov - 0.4) * 1.5, 0.0, 0.6), aa) * smoothstep(0.4, 0.46, cov);
    float cross_ = skL(dot(f, vec2(-s, c)) / 8.0, clamp((cov - 0.6) * 1.7, 0.0, 0.55), aa) * smoothstep(0.6, 0.66, cov);
    return vec2(max(max(dots, hatch), cross_), smoothstep(0.85, 0.95, cov));
  }
  vec3 skInk(vec3 lin, vec3 n, vec3 v, float fold) {
    vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    float lum = dot(c, vec3(0.299, 0.587, 0.114)), cloth = step(0.5, uSkPart) * step(uSkPart, 1.5), hand = step(1.5, uSkPart), dk = smoothstep(0.3, 0.16, lum);
    float red = smoothstep(0.4, 0.6, (c.r - max(c.g, c.b)) / max(c.r, 1e-3)) * smoothstep(0.16, 0.34, c.r);
    float key = dot(n, SK_KEY), black = mix(1.0, mix(0.84, 0.7, smoothstep(0.84, 0.88, key)), cloth * smoothstep(0.52, 0.56, key) * (1.0 - uSk.w));
    float cov = mix(clamp((uSkTone.x - 0.22 * hand - lum) * uSkTone.y, 0.0, 1.0), black, dk) * (1.0 - uSk.w * step(0.2, lum));
    vec2 fc = gl_FragCoord.xy / uSk.z;
    vec2 ic = skCov(cov, fc, mix(0.5 + 0.8 * n.x, 0.62, cloth));
    vec3 paper = SK_PAPER * (0.97 + 0.06 * skN(fc * 0.5));
    vec3 col = mix(mix(paper, SK_INK, ic.x), SK_INK, ic.y);
    float rim = smoothstep(uSkTone.z, uSkTone.z + 0.12, 1.0 - abs(dot(n, v)));
    col = mix(col, paper, max(rim, fold * cloth) * dk);
    col = mix(col, SK_INK, fold * hand * (1.0 - dk));
    col = mix(col, mix(mix(SK_INK, SK_RED * 1.08, smoothstep(0.1, 0.34, lum)), paper, smoothstep(0.62, 0.86, lum)), red);
    col += (skH(floor(gl_FragCoord.xy) + fract(uSk.y * 7.13) * 113.0) - 0.5) * 0.04;
    return pow(max(col, vec3(0.0)), vec3(2.2));
  }
  void main() {
    skMain();
    if (uSk.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 n = normalize(SK_NRM);
      gl_FragColor.rgb = siteTone(skInk(gl_FragColor.rgb, n, normalize(cameraPosition - vWP), smoothstep(0.2, 0.42, length(fwidth(n)))));
    }
  }
`;
// the uniform's own outline is a paper keyline: on the black pool a black line is no line
const HALO = /* glsl */ `
  ${TONE}
  uniform vec4 uSk;
  void main() { skMain(); if (uSk.x > 0.5) gl_FragColor.rgb = siteTone(pow(vec3(0.925, 0.9, 0.835), vec3(2.2))); }
`;
const MAIN = /void\s+main\s*\(\s*\)/;

export default function build(ctx) {
  const uSk = { value: new Vector4(0, 0, 1, 0) }, uSkTone = { value: new Vector3(0.74, 1.385, 0.74) }, seen = new Set(), sh = ctx.engine.shared;
  const figs = ctx.seal.hero.figs, limbs = ctx.seal.parts.limbs?.userData, wear = figs[figs.indexOf(ctx.seal.parts.limbs) + 1]?.userData;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    if (m.side === BackSide) { if (m === wear?.hull) { m.fragmentShader = f.replace(MAIN, "void skMain()") + HALO; m.uniforms.uSk = uSk; m.needsUpdate = true; } return; }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void skMain()") + INK.replace("SK_NRM", n);
    m.uniforms.uSk = uSk; m.uniforms.uSkTone = uSkTone; m.uniforms.uSkPart = { value: m === wear?.mat ? 1 : m === limbs?.mat ? 2 : 0 }; m.needsUpdate = true;
  });
  const line0 = sh.uLine.value.clone(), group = new Group(), S = SEAL.scale;
  // the island's own pup (the seal a visitor plays on the site) opens and closes the cutscene; the character is what the page makes of it
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], hop: 20.5, turn: 0.22, blink: [24.6] } });
  const squash = (g, k, s = S) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
  group.add(pup.group);
  return {
    group,
    update(t, dt, cue) {
      // the swaps: under the impact frame the pup becomes the character (it pops in with SHING); at BACK a paper burst (fx) and the pup pops out of it
      const on = t >= LINE.impact && t < BACK + 2 / 24, into = Math.floor((t - LINE.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      let flash = 0;
      for (const b of cue?.active ?? []) if (b.name === "panel") flash = 1;
      uSk.value.set(on ? 1 : 0, warp(t), ctx.engine.renderer.getPixelRatio(), flash);
      const box = ctx.player?.box, far = box ? Math.min(1, Math.max(0, (0.4 - (box[3] - box[1])) / 0.14)) : 0;
      uSkTone.value.set(0.74 - 0.2 * far, 1.385 + 0.6 * far, 0.8 - 0.2 * far);
      sh.uLine.value.set(on ? 2.7 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
    },
    dispose() { sh.uLine.value.copy(line0); ctx.seal.group.visible = true; pup.dispose(); },
  };
}
