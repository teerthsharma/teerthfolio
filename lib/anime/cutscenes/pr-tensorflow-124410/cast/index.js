// CAST for pr-tensorflow-124410: the DIO seal in the dimension's ink, swapped with the pale playable pup at the impact. The tear splits them: the seal keeps the dimension side of the live's tear edge, the pup the island side, so the seal becomes the pup along the edge.
// The rig is not touched: each material's main() is wrapped once, here, at build.
import { BackSide, Group, Vector3, Vector4 } from "three";
import { PUP_YAW, sitePup, splitWrap } from "./pup.js";
import { FREEZE, HIT, LINE, SEAL, SWAP, T, TEAR_DIR, negAt } from "../clock.js";
import { TONE } from "../tone.js";
import { araki } from "../live/shared.js";
import { headband, mane } from "../../../kit/hero/looks/pr-tensorflow-124410.parts.js";

// the dimension's ink on the rig: the live's three-step cel, hatching in the shade, the cream rim and the diagonal band; the seal keeps its colour in the stop (uAk.y)
const INK = /* glsl */ `
  ${TONE}
  uniform vec4 uAk; uniform vec3 uAkPal[16]; uniform float uAkInv, uAkShift, uAkCell, uAkShadow; uniform vec2 uAkRes;
  float akH(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  vec3 akInk(vec3 lin, vec3 n, vec3 v) {
    vec3 b = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    float d = dot(n, normalize(vec3(-0.5, 0.7, 0.55))) * 0.5 + 0.5, band = d < 0.4 ? 0.0 : (d < 0.7 ? 1.0 : 2.0);
    if (n.y < -0.2) band = 1.0; // the underside (base, belly) takes the mid band, not a dark ellipse
    vec3 c = band < 0.5 ? mix(uAkPal[5], b, 0.42) : (band < 1.5 ? b : mix(b, uAkPal[15], 0.3));
    float h = fract((gl_FragCoord.x + gl_FragCoord.y) / (uAkCell * 0.9));
    c = mix(c, uAkPal[5], (band < 0.5 ? step(0.58, h) * 0.85 : band < 1.5 ? step(0.9, h) * 0.5 * step(d, 0.5) : 0.0));
    c = mix(c, uAkPal[15], step(0.55, pow(1.0 - max(dot(n, v), 0.0), 3.0)) * 0.7);
    return c;
  }
  float akBand() {
    vec2 p = gl_FragCoord.xy / uAkRes;
    float jag = (akH(floor(gl_FragCoord.y / 18.0) + uAkShift * 3.0) - 0.5) * 0.03;
    float w = fract((p.x * 0.84 + p.y * 0.54 + jag) * 1.25 + uAkShift * 0.19);
    return step(0.55, w) * step(w, 0.8) * uAkShadow;
  }
  void main() {
    akMain();
    if (uAk.x > 0.5 && gl_FragColor.a > 0.75) {
      vec3 lin = gl_FragColor.rgb, gam = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
      float lum = dot(gam, vec3(0.299, 0.587, 0.114));
      if (lum > 0.06 && gam.r - max(gam.g, gam.b) < 0.3) {
        vec3 c = akInk(lin, normalize(AK_NRM), normalize(cameraPosition - vWP));
        c = mix(c, uAkPal[5] * 0.8 + vec3(0.02, 0.0, 0.08), 0.62 * akBand());
        c = mix(c, vec3(1.0) - c, uAkInv * (1.0 - uAk.y));
        gl_FragColor.rgb = siteTone(pow(max(c, vec3(0.0)), vec3(2.2)));
      }
    }
  }
`;
const HALO = /* glsl */ `
  ${TONE}
  uniform vec4 uAk; uniform vec3 uAkPal[16];
  void main() { akMain(); if (uAk.x > 0.5) gl_FragColor.rgb = siteTone(pow(uAkPal[5], vec3(2.2))); }
`;
// shonen/shoGradePoster (pull name shoGradePoster), written inline: luma to three flat steps, the red iris and the dark line kept; the drawn face is not inked
const FACE = /* glsl */ `
  void main() {
    faceMain();
    vec3 gam = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
    float y = dot(gam, vec3(0.2126, 0.7152, 0.0722)), yq = (floor(clamp(y, 0.0, 0.999) * 3.0) + 0.5) / 3.0;
    float mask = step(gam.r - max(gam.g, gam.b), 0.3) * step(0.28, y);
    gam = mix(gam, gam * (yq / max(y, 1e-3)), 0.85 * mask);
    gl_FragColor.rgb = pow(gam, vec3(2.2));
  }
`;
const MAIN = /void\s+main\s*\(\s*\)/;
const ENTRY = [0.5, 1.16, 0.97], BACK = [0.6, 1.14, 1.14, 0.96, 0.96], PUP_RET = 3.6; // the pale pup's scale after the tear: 1.9 gave a 0.106 box at 9.0 under the ticket 7 lens (target 0.20 to 0.23)

export default function build(ctx) {
  const U = araki(ctx).U, uAk = { value: new Vector4() }, seen = new Set(), sh = ctx.engine.shared;
  const figs = ctx.seal.hero.figs, wear = figs[figs.indexOf(ctx.seal.parts.limbs) + 1]?.userData;
  const bind = (m) => { Object.assign(m.uniforms, { uAk, uAkPal: U.uPal, uAkInv: U.uInvert, uAkShift: U.uShift, uAkCell: U.uCell, uAkRes: U.uRes, uAkShadow: U.uShadow }); m.needsUpdate = true; };
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) return;
    if ("uFace" in (m.uniforms ?? {})) { m.fragmentShader = f.replace(MAIN, "void faceMain()") + FACE; return; }
    if (m.side === BackSide) { if (m === wear?.hull) { m.fragmentShader = f.replace(MAIN, "void akMain()") + HALO; bind(m); } return; }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n) return;
    m.fragmentShader = f.replace(MAIN, "void akMain()") + INK.replace("AK_NRM", n);
    bind(m);
  });
  // the mane and the green band are the look's own parts; they ride the head after the wrap, so they keep their native gold and green
  ctx.seal.hero.attach(mane(ctx.engine), "head");
  ctx.seal.hero.attach(headband(ctx.engine), "head");
  const split = new Set();
  let skipped = 0;
  ctx.seal.group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || split.has(m)) return;
    split.add(m);
    if (!splitWrap(m, 1, U)) skipped++;
  });
  console.warn(`cast: ${skipped} seal materials without one main() left unsplit`);
  const line0 = sh.uLine.value.clone(), group = new Group(), S = SEAL.scale;
  const pup = sitePup({ yaw: PUP_YAW.open, U, track: { sign: [0.45, 0.6, 0.3], jojo: [8.5, 0.35], yaw2: [SWAP, PUP_YAW.end] } });
  const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));
  const head = new Vector3(), chest = new Vector3(), UP = new Vector3(0, 0.3, 0);
  let crossed = null;
  // the first scene time the tear edge passes the pale pup's chest (0.5 m up its body, scaled): the same q as the live's tearCut
  const crossCheck = (t) => {
    pup.group.updateWorldMatrix(true, false);
    const p = pup.group.localToWorld(chest.set(0, 0.5, 0)).project(ctx.player.camera);
    const q = TEAR_DIR[0] * (p.x * 0.5 + 0.5) + TEAR_DIR[1] * (p.y * 0.5 + 0.5);
    if (q < U.uTear.value) crossed = t;
  };
  group.add(pup.group);
  ctx.cutCast = { pupHead: () => (pup.group.visible ? pup.head.getWorldPosition(head).add(UP).toArray() : null), crossedAt: () => crossed };
  return {
    group,
    update(t, dt, cue) {
      const on = t >= LINE.impact && t < T.tear[1], into = Math.floor((t - LINE.impact - 0.12) * 12 + 1e-6);
      ctx.seal.group.visible = on; pup.group.visible = t < LINE.impact || t >= SWAP;
      pup.update(t);
      if (crossed === null && t >= SWAP) crossCheck(t);
      const pop = crossed === null ? -1 : Math.floor((t - crossed) * 24 + 1e-6);
      const k = t >= HIT.tick && crossed === null ? 0.86 : into >= 0 && into < 3 ? ENTRY[into] : 1;
      if (on) squash(ctx.seal.group, k, S);
      squash(pup.group, pop >= 0 && pop < 5 ? BACK[pop] : 1, t >= SWAP ? PUP_RET : 1);
      let flash = 0;
      for (const b of cue?.active ?? []) if (b.name === "panel") flash = 1;
      uAk.value.set(on ? 1 : 0, (t >= FREEZE[0] && t < FREEZE[1]) || negAt(t) ? 1 : 0, ctx.engine.renderer.getPixelRatio(), flash);
      sh.uLine.value.set(on ? 3.2 : line0.x, line0.y, line0.z, line0.w);
    },
    dispose() { sh.uLine.value.copy(line0); ctx.seal.group.visible = true; pup.dispose(); },
  };
}
