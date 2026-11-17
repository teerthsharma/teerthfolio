// CAST for pr-xnnpack-10801: the seal in its two faces. The site's pup (pup.js) opens and closes the cutscene; the approved look is the
// character from the turn, printed in the live pupInk style (ink.js) from INK_ON to BACK. The rig is not touched: each main() is wrapped once.
import { BackSide, Group, Vector2, Vector3, Vector4 } from "three";
import look from "../../../kit/hero/looks/pr-xnnpack-10801.js";
import { sitePup } from "./pup.js";
import { BACK, F, INK_ON, MOON_TALL, MOON_WIDE, SEAL, TURN_T, W, liftAt, warp } from "../clock.js";
import { TONE } from "../tone.js";

const XN_PALETTE = /* glsl */ `
  const vec3 XC_PAPER = vec3(0.957, 0.957, 0.941), XC_SHADE = vec3(0.667, 0.694, 0.749), XC_INK = vec3(0.031, 0.039, 0.059), XC_BLUE = vec3(0.373, 0.714, 1.0);
  float xnHatch(float gap, float dir) { float v = (gl_FragCoord.x + dir * gl_FragCoord.y) / gap; float d = abs(fract(v) - 0.5) / max(fwidth(v), 1e-5); return 1.0 - min(d, 1.0); }`;
// uXn: x the print on, y scene time, z the pixel ratio, w the panel flash. uXnPart: 1 the uniform (cloth), 2 the hands, 0 the fur (no blue there)
const XN_INK = /* glsl */ `
  ${TONE}
  ${XN_PALETTE}
  uniform vec4 uXn; uniform vec3 uXnMoon; uniform float uXnPart;
  vec3 xnInk(vec3 lin, vec3 n, vec3 v, vec3 wp) {
    vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2)); float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float l = dot(n, normalize(normalize(uXnMoon - wp) + 0.5 * v)) * 0.5 + 0.5; l = l * 0.85 + 0.15;
    float body = smoothstep(0.1, 0.4, lum);
    vec3 o = mix(XC_INK, XC_PAPER, body);
    o = mix(o, XC_SHADE, smoothstep(0.58, 0.44, l) * body);
    o = mix(o, XC_INK, xnHatch(4.0, 1.0) * smoothstep(0.46, 0.34, l) * body * 0.85);
    o = mix(o, XC_INK, xnHatch(4.0, -1.0) * smoothstep(0.26, 0.14, l) * body * 0.85);
    o = mix(o, XC_BLUE, pow(1.0 - max(dot(n, v), 0.0), 3.5) * smoothstep(0.35, 0.7, l) * 0.75 * step(0.5, uXnPart));
    return pow(o, vec3(2.2));
  }
  void main() {
    skMain();
    if (uXn.x > 0.5 && gl_FragColor.a > 0.75) gl_FragColor.rgb = siteTone(xnInk(gl_FragColor.rgb, normalize(XN_NRM), normalize(cameraPosition - vWP), vWP));
  }`;
const HALO = /* glsl */ `
  ${TONE}
  ${XN_PALETTE}
  uniform vec4 uXn;
  void main() { skMain(); if (uXn.x > 0.5) gl_FragColor.rgb = siteTone(pow(XC_PAPER, vec3(2.2))); }`;
const MAIN = /void\s+main\s*\(\s*\)/;

export default function build(ctx) {
  look.extras?.(ctx.engine, ctx.seal.hero); // poses, expressions, kyoka and forelock; placeHero never calls extras for the main seal
  const uXn = { value: new Vector4(0, 0, 1, 0) }, uXnMoon = { value: new Vector3() }, seen = new Set(), sh = ctx.engine.shared, renderer = ctx.engine.renderer;
  const figs = ctx.seal.hero.figs, limbs = ctx.seal.parts.limbs?.userData, wear = figs[figs.indexOf(ctx.seal.parts.limbs) + 1]?.userData;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    if (m.side === BackSide) { if (m === wear?.hull) { m.fragmentShader = f.replace(MAIN, "void skMain()") + HALO; m.uniforms.uXn = uXn; m.needsUpdate = true; } return; }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void skMain()") + XN_INK.replace("XN_NRM", n);
    Object.assign(m.uniforms, { uXn, uXnMoon, uXnPart: { value: m === wear?.mat ? 1 : m === limbs?.mat ? 2 : 0 } });
    m.needsUpdate = true;
  });
  const line0 = sh.uLine.value.clone(), group = new Group(), size = new Vector2();
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.35, 1.13], crouch: [17.55, 0.1, 0.7], fist: [18.43, 0.08, 0.41], blink: [20.2, 24.6] } });
  const squash = (g, k, s = SEAL.scale) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
  group.add(pup.group);
  return {
    group,
    update(t, dt, cue) {
      const char = t >= TURN_T && t < BACK + F(2), inked = t >= INK_ON && t < BACK;
      const into = Math.floor((t - TURN_T) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = char; pup.group.visible = !char;
      pup.group.position.y = liftAt(t);
      pup.update(t);
      if (char) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      let flash = 0;
      for (const b of cue?.active ?? []) if (b.name === "panel") flash = 1;
      renderer.getSize(size);
      uXn.value.set(inked ? 1 : 0, warp(t), renderer.getPixelRatio(), flash);
      uXnMoon.value.set(...W(size.x >= size.y ? MOON_WIDE : MOON_TALL));
      sh.uLine.value.set(inked ? 1.6 : line0.x, line0.y, line0.z, line0.w);
    },
    dispose() { sh.uLine.value.copy(line0); ctx.seal.group.visible = true; pup.dispose(); },
  };
}
