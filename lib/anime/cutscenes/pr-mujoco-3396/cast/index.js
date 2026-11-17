// CAST for pr-mujoco-3396: the Eren seal in the live painted ramp (ink.js drawn()); head and hair untouched, the pale pup (pup.js) swaps in and out.
import { BackSide, Group } from "three";
import { CUT, DOCK, R, SEAL, STAND, pupScale, warp } from "../clock.js";
import { INK, U } from "../ink.js";
import { TONE } from "../tone.js";
import { buildFriend } from "./friend.js";
import { sitePup } from "./pup.js";

const MAIN = /void\s+main\s*\(\s*\)/;
// surface already declares uRes and uTime; the ink copy must not redeclare them
const FNS = INK.replace(/uniform float uPx, uTime, uBurn;\s*uniform vec2 uRes, uBurnC;/, "uniform float uPx, uBurn;\n  uniform vec2 uBurnC;");
const RAMP = /* glsl */ `
  ${TONE}
  uniform float uSkOn, uSkKeep;
  void main() {
    skMain();
    if (uSkOn > 0.5 && gl_FragColor.a > 0.75) {
      vec3 n = normalize(vN), v = normalize(cameraPosition - vWP);
      vec3 base = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
      float lum = dot(base, vec3(0.299, 0.587, 0.114));
      float light = 0.45 + 0.55 * max(dot(n, normalize(vec3(-0.5, 0.7, 0.55))), 0.0);
      float tone = lum * 0.4 + light * 0.62 - 0.12 + pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.25;
      vec3 c = drawn(tone, 0.1, mix(vec3(lum), base, 0.5), uSkKeep);
      c = mix(c, vec3(0.1, 0.09, 0.085), (1.0 - smoothstep(0.1, 0.26, dot(n, v))) * step(0.3, iNoise(gl_FragCoord.xy / uPx * 0.08)));
      gl_FragColor.rgb = siteTone(pow(max(c, vec3(0.0)), vec3(2.2)));
    }
  }`;

function paint(m, keep, uSkOn) {
  const f = m.fragmentShader;
  if (m.side === BackSide || f.split(MAIN).length !== 2 || !f.includes("varying vec3 vN;")) return;
  m.fragmentShader = f.replace(MAIN, "void skMain()") + FNS + RAMP;
  Object.assign(m.uniforms, { uSkOn, uSkKeep: { value: keep }, uPx: U.uPx, uBurn: U.uBurn, uBurnC: U.uBurnC, uSun: U.uSun });
  m.needsUpdate = true;
}

export default function build(ctx) {
  const uSkOn = { value: 0 }, group = new Group();
  const figs = ctx.seal.hero.figs, wear = figs[figs.indexOf(ctx.seal.parts.limbs) + 1]?.userData?.mat;
  const head = new Set(), seen = new Set();
  ctx.seal.parts.head.traverse((o) => { if (o.material) head.add(o.material); });
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    if (!head.has(m)) paint(m, m === wear ? 0.5 : 0.72, uSkOn);
  });
  const pup = sitePup({ yaw: STAND.island[1], tint: [1.16, 1.12, 1.1], track: { sign: [0.45, 0.6, 0.9], hop: R.turnBack + 3 / 24, turn: 0.22, blink: [2.2] } });
  const friend = buildFriend();
  group.add(pup.group, friend.group);
  const grow = (g, k, sq = 1) => g.scale.set(k * (1 + 0.5 * (1 - sq)), k * sq, k * (1 + 0.5 * (1 - sq)));
  return {
    group,
    update(t) {
      const a = ctx.seal.at;
      pup.group.position.set(a[0] - DOCK[0], a[1], a[2] - DOCK[2]);
      const on = t >= CUT && t < R.turnBack + 2 / 24, into = Math.floor((t - CUT) * 12 + 1e-6), out = Math.floor((t - R.turnBack) * 24 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = !on; uSkOn.value = on ? 1 : 0;
      friend.group.visible = t < CUT || t >= R.turnBack;
      pup.update(t); friend.update(t);
      if (on) grow(ctx.seal.group, SEAL.scale * pupScale(warp(Math.floor(t * 12 + 1e-6) / 12)), [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1));
      grow(pup.group, 1, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1);
    },
    dispose() { uSkOn.value = 0; ctx.seal.group.visible = true; pup.dispose(); friend.dispose(); group.removeFromParent(); },
  };
}
