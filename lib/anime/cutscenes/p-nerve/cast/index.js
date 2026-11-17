// CAST for p-nerve: the pale playable seal (pup.js) at both ends, the approved character in the dimension's one key (the oil ramp, no
// outline), the seal's props, and the rooftop figures (Ryuk, L, the colony, the apples, the chain) from live/figures.js. Rig frame:
// the cast group sits in the rig at DOCK; ctx.nerve is world space.
import { BackSide, Group, Vector3 } from "three";
import { sitePup } from "./pup.js";
import { buildProps } from "./props.js";
import { BACK, DOCK, LINE, SEAL, unwarp } from "../clock.js";
import { LIGHT, U, sm } from "../live/look.js";
import { buildApples, buildColony, buildL, buildRyuk, figureMaterials } from "../live/figures.js";
import { buildChain } from "../live/chain.js";
import { tickFigures } from "../live/tick.js";
import { TONE, tone } from "../tone.js";
import look from "../../../kit/hero/looks/p-nerve.js";

// the character is painted by the set's own key: the rig's world normal leans half way to the key (the key stands behind the face), a floor
// keeps the eyes and muzzle printing; the ramp, the page's siteTone and no outline are the live's
const OIL = (light) => /* glsl */ `
  ${light}
  ${TONE}
  uniform float uOil;
  uniform float uPage;
  void main() {
    skMain();
    if (uOil > 0.5 && gl_FragColor.a > 0.75) {
      if (vWP.y < 0.0) discard;
      vec3 P = vWP - uOrigin, Lk = normalize(uKey - P);
      vec3 n = normalize(mix(normalize(OIL_NRM), Lk, 0.5)), a = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
      a = mix(vec3(dot(a, vec3(0.299, 0.587, 0.114))), a, 0.25);
      vec3 c = shade(a * 1.05, n, P, 0.35, 0.0);
      c = max(c, a * vec3(0.30, 0.22, 0.21));
      vec3 a0 = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)), hair = a0 * (0.28 + 0.9 * clamp(dot(n, Lk), 0.0, 1.0));
      float warm = smoothstep(0.14, 0.24, a0.r - a0.b);
      c = mix(c, hair, warm * 0.65);
      c += vec3(1.0, 0.93, 0.78) * 0.10 * uPage * clamp(-normalize(OIL_NRM).y, 0.0, 1.0) * (0.4 + 0.6 * a.r);
      gl_FragColor.rgb = siteTone(pow(max(c, vec3(0.0)), vec3(2.2)));
    }
  }`;
// a rig material with no normal (the whisker lines, uCol): the site's last stage only
const TONE_ONLY = /* glsl */ `
  ${TONE}
  uniform float uOil;
  void main() { skMain(); if (uOil > 0.5 && gl_FragColor.a > 0.75) gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }`;
const SHARED = ["uOrigin", "uKey", "uAxis", "uCone", "uKeyOn", "uScreenAt", "uScreenGlow", "uDoor", "uDoorK", "uTime", "uCrack", "uToll", "uBoost"];
const MAIN = /void\s+main\s*\(\s*\)/;
const HOME = new Vector3(...DOCK);
const TIP = new Vector3(), CUFF = new Vector3();

// which body is on screen at real t, and the squash of each (the pale pup from BACK; the character until BACK)
export function swapState(t) {
  const character = t >= LINE.cut && t < BACK;
  const into = Math.floor((t - LINE.cut) * 12 + 1e-6), out = Math.floor((t - BACK) * 24 + 1e-6);
  const charSquash = character ? [0.5, 1.16, 0.97][into] ?? (out >= -4 && out < 0 ? 0.86 : 1) : 1;
  const pupSquash = !character && out >= 0 ? [0.6, 1.14, 1.14, 0.96, 0.96][out] ?? 1 : 1;
  return { character, charSquash, pupSquash };
}
const crouch = (t) => sm(BACK, BACK + 0.1, t) * (1 - sm(BACK + 0.35, BACK + 0.7, t));
const squash = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

// wraps each rig material's main() once; every outline hull is hidden (no outline in this style); returns the counts
export function oilWrap(group, uOil, uPage = { value: 0 }) {
  const seen = new Set();
  let wrapped = 0, hidden = 0, skipped = 0;
  group.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.isShaderMaterial || seen.has(m)) return;
    seen.add(m);
    if (m.side === BackSide) { o.visible = false; hidden++; return; }
    const f = m.fragmentShader;
    if (f.split(MAIN).length !== 2) { skipped++; return; }
    const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("vXrd") && f.includes("varying vec3 vN") ? "vN" : null;
    if (!n || !f.includes("varying vec3 vWP")) {
      m.fragmentShader = f.replace(MAIN, "void skMain()") + TONE_ONLY;
      m.uniforms = { ...m.uniforms, uOil };
      m.needsUpdate = true;
      wrapped++;
      return;
    }
    const have = new Set([...f.matchAll(/uniform\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+([^;]+);/g)].flatMap((g) => g[1].split(",").map((s) => s.trim().replace(/\[.*$/, ""))));
    const light = LIGHT.replace(/uniform\s+(\w+)\s+([^;]+);/g, (_, type, names) => {
      const keep = names.split(",").map((s) => s.trim()).filter((s) => !have.has(s.replace(/\[.*$/, "")));
      return keep.length ? `uniform ${type} ${keep.join(", ")};` : "";
    });
    m.fragmentShader = f.replace(MAIN, "void skMain()") + OIL(light).replace(/OIL_NRM/g, n);
    m.uniforms = { ...m.uniforms, ...Object.fromEntries(SHARED.map((k) => [k, U[k]])), uOil, uPage };
    m.needsUpdate = true;
    wrapped++;
  });
  return { wrapped, hidden, skipped };
}

export default function build(ctx) {
  const sh = ctx.engine.shared, line0 = sh.uLine.value.clone(), uOil = { value: 0 }, uPage = { value: 0 };
  // the framework runs a look's extras only for a second hero: the notebook, the tie and the poses are registered here, once, before the wrap
  look.extras?.(ctx.engine, ctx.seal.hero);
  const wrap = oilWrap(ctx.seal.group, uOil, uPage);
  const pup = sitePup({ yaw: SEAL.yaw, track: { sign: [0.45, 0.6, 0.3], blink: [24.6] } });
  const props = buildProps(ctx);
  const mats = figureMaterials();
  const ryuk = buildRyuk(mats), L = buildL(mats), colony = buildColony(mats), apples = buildApples(mats, 9), chain = buildChain();
  const fig = { ryuk, L, colony, apples, chain };
  const figs = new Group();
  figs.add(ryuk.group, L.group, colony.mesh, apples.mesh, chain.group);
  const toned = new Set();
  figs.traverse((o) => { const m = o.material; if (m?.isShaderMaterial && !toned.has(m)) { toned.add(m); tone(m); } });
  const group = new Group();
  group.add(pup.group, props.group, figs);
  return {
    group,
    wrap,
    update(t) {
      const s = swapState(t);
      ctx.seal.group.visible = s.character;
      pup.group.visible = !s.character;
      figs.visible = t >= LINE.cut && t < BACK + 1.7; // the rooftop's figures stand in the dimension only
      squash(ctx.seal.group, s.charSquash, SEAL.scale);
      squash(pup.group, s.pupSquash, 1);
      pup.group.scale.y *= 1 - 0.22 * crouch(t);
      pup.update(t);
      uOil.value = s.character ? 1 : 0;
      uPage.value = sm(17.55, 17.8, t) * (1 - sm(21.0, 21.4, t));
      sh.uLine.value.x = s.character ? 0 : line0.x;
      const tt = unwarp(t), cam = ctx.player?.camera;
      props.update(tt, ctx.seal.named(), cam);
      TIP.copy(ctx.nerve.tip).sub(HOME);
      CUFF.copy(ctx.nerve.cuff).sub(HOME);
      tickFigures(fig, tt, TIP, CUFF, cam);
    },
    dispose() {
      sh.uLine.value.copy(line0);
      ctx.seal.group.visible = true;
      pup.dispose();
      props.dispose();
      for (const f of [ryuk, L, colony, apples, chain]) f.dispose?.();
      for (const m of Object.values(mats)) m.dispose?.();
      figs.removeFromParent();
    },
  };
}
