// CAST for pr-openxla-46539 (All Might). The pale playable seal (pup.js) opens the cutscene and is what it returns to: from the impact the
// approved All Might seal stands in its place, printed in the page's inks with the cape and the V of light; at BACK the paper star (fx/draw.js)
// turns it back into the pale pup on screen. The rig is not touched: its materials are wrapped once, here, at build.
import { BackSide, Group, Vector3 } from "three";
import { sitePup } from "./pup.js";
import { BACK, LAW, SEAL } from "../clock.js";
import { PRINT, SH } from "../live/print.js";
import { cape, vAura } from "../live/hero.js";
import { TONE } from "../tone.js";

// PRINT declares uTime, which the rig's material declares already; the print block keeps uCell only
const PRINT_FN = PRINT.replace("uniform float uCell, uTime;", "uniform float uCell;").replace("uniform vec4 uPal[24];", "");
const OX = /* glsl */ `
  vec3 oxInk(vec3 lin, vec3 n, vec3 v) {
    vec4 t = cmykOf(pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2)));
    float nl = dot(n, normalize(vec3(-0.45, 0.75, 0.5))), shade = 1.0 - smoothstep(-0.1, 0.25, nl);
    t.w += (1.0 - t.w) * shade * 0.32; t.w += (1.0 - t.w) * (1.0 - smoothstep(-0.6, -0.3, nl)) * 0.2;
    float rim = 1.0 - max(dot(n, v), 0.0), ink = smoothstep(0.8, 0.88, rim);
    vec3 col = mix(inkPrint(t), INK_K, ink);
    col = mix(col, mix(vec3(0.16, 0.45, 1.0), vec3(1.0, 0.8, 0.1), smoothstep(-0.2, 0.4, nl)), smoothstep(0.55, 0.82, rim) * (1.0 - ink) * 0.85);
    return siteTone(pow(max(col, vec3(0.0)), vec3(2.2)));
  }`;
const PRINTED = /* glsl */ `
  ${TONE}
  ${PRINT_FN}
  ${OX}
  void main() { skMain(); if (gl_FragColor.a > 0.75) gl_FragColor.rgb = oxInk(gl_FragColor.rgb, normalize(OX_NRM), normalize(cameraPosition - vWP)); }`;
const HULL = /* glsl */ `
  ${TONE}
  ${PRINT_FN}
  void main() { skMain(); gl_FragColor.rgb = siteTone(pow(INK_K, vec3(2.2))); }`;
const MAIN = /void\s+main\s*\(\s*\)/;
const PUP_HEAD = new Vector3(0, 0.3, 0.45);
const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), seen = new Set(), S = SEAL.scale;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    if (m.side === BackSide) m.fragmentShader = f.replace(MAIN, "void skMain()") + HULL;
    else {
      const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
      if (!n) return;
      m.fragmentShader = f.replace(MAIN, "void skMain()") + PRINTED.replace("OX_NRM", n);
    }
    m.uniforms.uCell = SH.uCell;
    m.needsUpdate = true;
  });
  const torso = ctx.seal.parts.torso;
  const cp = cape({ geometry: torso.userData.mesh.geometry, matrix: torso.matrix });
  const aura = vAura();
  aura.mesh.position.set(0, 0.4, 0.3);
  ctx.seal.attach(cp.mesh, 1, "body");
  ctx.seal.attach(aura.mesh, 1, "head");
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.1, 0.1], blink: [19.9, 23.4] } });
  const group = new Group();
  group.add(pup.group);
  const say = (ctx.seal.group.userData.say = new Vector3());
  return {
    group,
    update(t) {
      const on = t >= LAW.impact && t < BACK + 2 / 24, into = Math.floor((t - LAW.impact - 0.12) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
      ctx.seal.group.visible = on;
      pup.group.visible = !on;
      pup.update(t);
      if (on) squash(ctx.seal.group, [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1), S);
      else squash(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, 1);
      const ox = ctx.set?.ox ?? {}, live = on && t < BACK;
      cp.mesh.visible = live && Boolean(ox.capeOn);
      cp.m.uniforms.uWind.value = ox.wind ?? 0.2;
      cp.m.uniforms.uBillow.value = ox.billow ?? 0;
      aura.mesh.visible = live && Boolean(ox.auraOn);
      aura.m.uniforms.uK.value = ox.auraK ?? 0;
      sh.uLine.value.set(on ? 2.7 : line0.x, line0.y, on ? 1 : line0.z, line0.w);
      if (on) say.copy(ctx.seal.named().mouth);
      else {
        pup.group.updateWorldMatrix(true, false);
        say.copy(PUP_HEAD).applyMatrix4(pup.group.matrixWorld);
      }
    },
    dispose() {
      sh.uLine.value.copy(line0);
      ctx.seal.group.visible = true;
      pup.dispose();
      for (const x of [cp, aura]) {
        x.mesh.removeFromParent();
        x.g.dispose();
        x.m.dispose();
      }
    },
  };
}
