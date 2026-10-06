// Reusable Gojo CAST: Six Eyes, black high-collar, pear-seal still a seal.
import { defineModule } from "./define.js";

const D = (name, doc, glsl) => defineModule({
  name, doc, family: "sixeyes", glsl,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return ${name}(p, t); }`,
});

export const SIXEYES = [
  D("jjkCastSkin", "pear fur: jjkSkin(jjkNdL) under cover — chubby disc, no muzzle",
    /* glsl */ `
    vec3 jjkCastSkin(vec2 p, float t) {
      vec3 plate = mix(JJK_INK, JJK_CLOTH, 0.40);
      return jjkOut(mix(plate, jjkSkin(jjkNdL(p)), jjkCover(p)));
    }`),

  D("jjkCastCloth", "gakuran body: jjkCloth plus cyan Limitless hull rim",
    /* glsl */ `
    vec3 jjkCastCloth(vec2 p, float t) {
      vec2 q = jjkN(p);
      float d = length(q) - sqrt(0.13);
      vec3 c = jjkCloth(jjkNdL(p));
      c = mix(c, JJK_CYAN, jjkLine(d, 1.8) * 0.62);
      return jjkOut(mix(JJK_INK, c, jjkCover(p)));
    }`),

  D("jjkCastInk", "indigo pear hull 2.2px — never #000",
    /* glsl */ `
    vec3 jjkCastInk(vec2 p, float t) {
      vec2 q = jjkN(p);
      float d = length(q) - sqrt(0.13);
      vec3 c = mix(JJK_CLOTH, JJK_INK, 0.55);
      c = mix(c, JJK_INK, jjkCover(p) * 0.18);
      return jjkOut(mix(c, JJK_INK, jjkLine(d, 2.2)));
    }`),

  D("jjkCastSix", "two cyan Six Eyes ticks on the pup at (0.66,0.54) (0.78,0.54)",
    /* glsl */ `
    vec3 jjkCastSix(vec2 p, float t) {
      vec3 c = mix(JJK_INK, jjkSkin(jjkNdL(p)), jjkCover(p));
      return jjkSix(c, p, JJK_C + vec2(-0.06, 0.04), JJK_C + vec2(0.06, 0.04));
    }`),

  D("jjkCastGojo", "composed hero still without the halt shell — kit jjkHero minus aura",
    /* glsl */ `
    vec3 jjkCastGojo(vec2 p, float t) {
      return jjkHero(p, t);
    }`),

  D("jjkCastAuraSeal", "Infinity on the pear — kit jjkHero",
    /* glsl */ `
    vec3 jjkCastAuraSeal(vec2 p, float t) {
      return jjkHero(p, t);
    }`),

  D("jjkCastWhiteHair", "white hair-row ticks on the upper disc — cool white, never yellow",
    /* glsl */ `
    vec3 jjkCastWhiteHair(vec2 p, float t) {
      vec2 q = jjkN(p);
      float cover = jjkCover(p);
      float ndl = jjkNdL(p);
      float head = jjkAA(q.y, -0.02);
      vec3 col = jjkDomain(p, t);
      col = mix(col, jjkCloth(ndl), cover);
      col = mix(col, jjkSkin(ndl), cover * head);
      col = jjkSix(col, p, JJK_C + vec2(-0.06, 0.04), JJK_C + vec2(0.06, 0.04));
      float band = cover * jjkAA(q.y, 0.11) * jjkAA(0.26 - q.y, 0.0);
      float spikes = jjkLine(q.x + 0.14, 1.2) + jjkLine(q.x + 0.07, 1.2)
                   + jjkLine(q.x, 1.2) + jjkLine(q.x - 0.07, 1.2)
                   + jjkLine(q.x - 0.14, 1.2);
      vec3 white = vec3(0.84, 0.86, 0.90);
      col = mix(col, white, band * clamp(spikes, 0.0, 1.0) * 0.90);
      col = mix(col, vec3(0.88, 0.90, 0.92), band * jjkLine(q.y - 0.18, 1.6) * 0.65);
      col = mix(col, JJK_INK, jjkLine(length(q) - sqrt(0.13), 2.0));
      return jjkOut(col);
    }`),

  D("jjkCastHighCollar", "Gojo gakuran: extra dark cloth band under the pear head",
    /* glsl */ `
    vec3 jjkCastHighCollar(vec2 p, float t) {
      vec2 q = jjkN(p);
      float cover = jjkCover(p);
      float ndl = jjkNdL(p);
      float head = jjkAA(q.y, -0.02);
      vec3 col = jjkDomain(p, t);
      col = mix(col, jjkCloth(ndl), cover);
      col = mix(col, jjkSkin(ndl), cover * head);
      col = jjkSix(col, p, JJK_C + vec2(-0.06, 0.04), JJK_C + vec2(0.06, 0.04));
      float collar = cover * jjkAA(0.05 - q.y, 0.0) * jjkAA(q.y + 0.12, 0.0);
      col = mix(col, mix(JJK_CLOTH * 0.55, JJK_INK, 0.40), collar);
      col = mix(col, JJK_INK, collar * jjkLine(q.y - 0.02, 1.4) * 0.70);
      col = mix(col, JJK_CYAN, collar * jjkLine(q.y + 0.08, 1.2) * 0.22);
      col = mix(col, JJK_INK, jjkLine(length(q) - sqrt(0.13), 2.0));
      return jjkOut(col);
    }`),
];

if (SIXEYES.length !== 8) throw new Error(`sixeyes count ${SIXEYES.length} != 8`);
