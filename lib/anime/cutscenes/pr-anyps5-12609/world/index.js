// WORLD for pr-anyps5-12609: one screen-space painted plate that knits the ka* shader table (beach, seawall, neon flood, skyline surge) with the HUD, grade and road.
// The tide is data, so the plate runs live from tier 0 (packet 12.7 item 1); rain, halftone, flare and shimmer are tier 2 and 3.
import { Color } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, tool, uniformsFor } from "../../../tools/index.js";
import { desat, floodY, frame, shim, sub, water } from "../clock.js";
import { layout, zoomOf } from "../layout.js";
import { shotAt } from "../cams.js";

await loadPack("cuts");
const NAMES = ["kaPhoneInset", "kaSeawallSurge", "kaRainStreaks", "kaNeonFlood", "kaKelvinWake", "kaWantedStars", "kaSkylineSurge", "kaSunFlare", "kaPersistHud", "kaHalftoneShadow"];
const hx = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// the bow wave is the kit's wake again, renamed so its own origin and length can differ in the same pass
const wakeB = tool("kaKelvinWake").glsl.replace(/uKaWake/g, "uKaWb").replace(/kaKelvinWake/g, "kaKelvinWakeB");

const BODY = `
uniform float uT; uniform float uTp; uniform float uMode; uniform float uHud; uniform float uStorm; uniform float uRain; uniform float uHalf; uniform float uShim; uniform float uRoad; uniform float uRoadX; uniform float uSat; uniform float uCon; uniform float uGlow; uniform float uZoom;
${wakeB}
vec3 kaPunch(vec3 c) { float y = cLuma(c); c = mix(vec3(y), c, uSat); return max((c - 0.22) * uCon + 0.22, 0.0); }
vec3 kaNeonGlow(vec3 c, vec2 b, float t) {
  vec3 g = vec3(0.0);
  for (int i = 0; i < 8; i++) { float a = 0.785398 * float(i); vec2 d = vec2(cos(a) / KA_AR, sin(a)); g += kaSigns(b + d * 0.02, t).rgb; }
  return c + g * 0.07 * uGlow;
}
vec3 kaBeachBlur(vec2 b, float t) {
  vec2 r = vec2(4.0 / uRes.x, 4.0 / (uRes.y * 0.67));
  vec3 s = kaBeachDayPlate(b, t);
  for (int i = 0; i < 8; i++) { float a = 0.785398 * float(i); s += kaBeachDayPlate(b + vec2(cos(a), sin(a)) * r, t); }
  return s / 9.0;
}
vec3 kaCauseway(vec3 c, vec2 b) {
  float yd = 1.0 - b.y;
  float ry = yd - 0.80;
  vec3 road = mix(${hx("#5a3e5e")}, ${hx("#2a1c34")}, smoothstep(0.0, 0.2, ry));
  float kerb = cFill(abs(ry - 0.010) - 0.009);
  road = mix(road, ${hx("#ffb070")}, kerb * 0.9);
  float dash = step(0.5, fract((b.x - uRoadX) * 8.0)) * cFill(abs(yd - 0.935) - 0.006);
  road = mix(road, ${hx("#f2c14e")}, dash);
  road = mix(road, KA_INK, cLine(ry, 2.0));
  return mix(c, road, step(0.80, yd));
}
vec3 paint(vec2 p) {
  float asp = uRes.x / uRes.y;
  float bar = max(0.0, (1.0 - asp / KA_AR) * 0.5);
  vec2 b = clamp(vec2(p.x / asp, (p.y - bar) / (1.0 - 2.0 * bar)), 0.0, 1.0);
  float t = uT;
  vec3 c;
  if (uMode < 0.5) {
    vec2 w = kaPhoneWobble(t);
    c = kaPunch(kaPhoneInset(kaBeachDayPlate(b + w, t), kaBeachBlur(b, t), b, t));
  } else if (uMode < 1.5) {
    c = kaPunch(kaSeawallSurge(b, t));
    c *= mix(1.0, 0.82, uStorm);
    if (uRain > 0.5) c = kaRainStreaks(c, b, t);
    if (uHalf > 0.5) c = kaHalftoneShadow(c, b);
  } else if (uMode < 2.5) {
    c = kaNeonFlood(b, uTp);
    c = kaKelvinWake(c, b, t);
    c = kaKelvinWakeB(c, b, t);
    if (uGlow > 0.0) c = kaNeonGlow(c, b, uTp);
    c = kaPunch(c);
    c *= mix(1.0, 0.82, uStorm);
    if (uRain > 0.5) c = kaRainStreaks(c, b, t);
    if (uHalf > 0.5) c = kaHalftoneShadow(c, b);
    c = kaWantedStars(c, b, t);
    if (uHud > 0.5) c = kaPersistHud(c, b, t);
  } else {
    float yd = 1.0 - b.y;
    float wyD = kaMsY(uKaWaterMs);
    vec2 bb = b;
    vec2 bz = vec2((b.x - 0.5) / uZoom + 0.5, (b.y - 0.2) / uZoom + 0.2);
    bb = bz;
    bb.x += uShim * 0.0006 * sin(60.0 * bz.y - 7.0 * kaTwos(t)) * smoothstep(wyD, wyD - 0.15, yd);
    c = kaPunch(kaSkylineSurge(bb, t));
    if (uRoad > 0.5) c = kaCauseway(c, bz);
    if (uHalf > 0.5) c = kaHalftoneShadow(c, b);
    c = kaSunFlare(c, bz, t);
    if (t < 8.0) c = kaWantedStars(c, b, t);
    c = kaPersistHud(c, b, t);
  }
  vec2 d = b - 0.5;
  c *= 1.0 - 0.15 * uKaDesat * clamp(dot(d, d) * 3.2, 0.0, 1.0);
  return cCap(c);
}`;

export default function build(ctx) {
  const { THREE, engine } = ctx, sh = engine.shared, group = new THREE.Group();
  const mine = Object.fromEntries(["uT", "uTp", "uMode", "uHud", "uStorm", "uRain", "uHalf", "uShim", "uRoad", "uRoadX", "uSat", "uCon", "uGlow", "uZoom", "uKaWbX", "uKaWbY", "uKaWbLen", "uKaWbDir"].map((k) => [k, { value: 0 }]));
  const U = { ...uniformsFor(NAMES), ...mine };
  const quad = ctx.bake.plateLayer(BODY, { tools: NAMES, uniforms: U, id: 0.5 });
  // layer 0, re-baked every drawing: every shot is flagged `moving` in cams.js, because the tide, the clock and the HUD move
  group.add(quad);

  const prev = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone(), rimDir: sh.uRimDir.value.clone(), rimCol: sh.uRimCol.value.clone() };
  const v = (o, k) => { U[k].value = o; };
  let lastShot = -1;

  return {
    group,
    update(t) {
      const f = frame(t), L = layout(t), s = shotAt(t);
      const mode = t < 1 - 1e-6 ? 0 : t < 2 - 1e-6 ? 1 : t < 5.5 - 1e-6 ? 2 : 3;
      v(t, "uT"); v(mode, "uMode");
      v(ctx.atTier(2) ? t : 3.0, "uTp"); // below tier 2 the street plate stands still (neon on, palms upright)
      v(sh.uRes.value.y / 800, "uKaPx");
      v(water(t), "uKaWaterMs"); v(desat(t), "uKaDesat");
      v(clamp((f - 12) / 5, 0, 1), "uKaDark");
      v(s.n === 4 ? (ctx.atTier(2) ? clamp((Math.floor(t * 12 + 0.02) / 12 - 3.5) / 2, 0, 1) : 0.5) : 0, "uKaScroll");
      v(t >= 2 ? 1 : 0, "uHud"); v(mode === 1 || mode === 2 ? 1 : 0, "uStorm");
      v(ctx.atTier(2) ? 1 : 0, "uRain"); v(ctx.atTier(2) ? 1 : 0, "uHalf"); v(ctx.atTier(3) ? shim(t) : 0, "uShim");
      v([1.1, 1.5, 1.55, 1.3][mode] * (mode === 3 ? 1 - 0.6 * desat(t) : 1), "uSat"); v([1.05, 1.25, 1.3, 1.12][mode], "uCon"); v(ctx.atTier(2) ? 1 : 0, "uGlow"); v(zoomOf(t), "uZoom");
      v(t >= 5.5 ? 1 : 0, "uRoad"); v(Math.floor(t * 12 + 0.02) / 12 * 0.35, "uRoadX");
      v(floodY(t), "uKaFloodY"); v(clamp((f - 126) / 5, 0, 1), "uKaRank");
      v(L.cruiser ? 1 : 0, "uKaLightBar"); v(L.cruiser ? L.cruiser.u : 0.6, "uKaBarX");
      if (L.wake) { v(L.wake.x, "uKaWakeX"); v(L.wake.y, "uKaWakeY"); v(0.25, "uKaWakeLen"); v(-1, "uKaWakeDir"); v(L.wake2.x, "uKaWbX"); v(L.wake2.y, "uKaWbY"); v(0.18, "uKaWbLen"); v(-1, "uKaWbDir"); }
      else { v(-5, "uKaWakeX"); v(-5, "uKaWbX"); v(0.0001, "uKaWakeLen"); v(0.0001, "uKaWbLen"); v(-1, "uKaWakeDir"); v(-1, "uKaWbDir"); }
      const u3 = clamp((t - 11.167) / 0.833, 0, 1);
      v(ctx.atTier(2) ? (t >= 5.5 && t < 8 ? 1 : t >= 10.5 ? 1 - u3 * u3 * (3 - 2 * u3) : 0) : 0, "uKaFlare");
      // the key light per shot: warm low sun at the right for the skyline, the neon at the left for the night street
      if (s.n !== lastShot) {
        lastShot = s.n;
        if (s.n === 1) { sh.uLightDir.value.set(0.35, 0.6, 0.7).normalize(); sh.uLightCol.value.set(1, 0.9, 0.78); sh.uRimDir.value.set(-0.6, 0.3, -0.5); sh.uRimCol.value.set("#8ac8e8"); }
        else if (s.n <= 4) { sh.uLightDir.value.set(-0.6, 0.35, 0.65).normalize(); sh.uLightCol.value.set(0.95, 0.72, 0.9); sh.uRimDir.value.set(0.8, 0.25, -0.3); sh.uRimCol.value.set(s.n === 4 ? "#2ae6ff" : "#ff3ea0"); }
        else { sh.uLightDir.value.set(0.7, 0.3, 0.55).normalize(); sh.uLightCol.value.set(1, 0.84, 0.66); sh.uRimDir.value.set(0.9, 0.2, -0.4); sh.uRimCol.value.set("#ff9a4a"); }
      }
    },
    dispose() {
      sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); sh.uRimDir.value.copy(prev.rimDir); sh.uRimCol.value.copy(prev.rimCol);
      quad.geometry.dispose(); quad.material.dispose();
    },
  };
}
