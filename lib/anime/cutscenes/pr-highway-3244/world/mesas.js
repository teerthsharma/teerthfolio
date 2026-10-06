// pr-highway-3244 WORLD / E4: the far mesas, painted cards in a ring at 380..470 m (layer 0, baked once each).
// Card GLSL `vec4 paint(vec2 p)`, p.x in [0, asp], p.y in [0, 1], alpha = coverage.
// SILHOUETTE: u = p.x * 1.4 (about 7 cells across a card); for the 3 nearest cells j: centre cj = j + 0.3 + 0.4 h1, half width hw = 0.35 + 0.35 h2,
//   height H = 0.22 + 0.62 h3 (one cell in four is a low butte, H * 0.4), flank slope s = 0.10 + 0.10 h4
//   top_j(u) = H clamp((hw - |u - cj|) / (s H * 6), 0, 1)          a flat-topped trapezoid
//   plus a step block on the shoulder: top2_j = 0.62 H clamp((0.55 hw - |u - cj - 0.2 hw|) / (s H * 4), 0, 1)
//   h(u) = max(low ridge 0.06 + 0.03 vn, max_j top_j, top2_j);  coverage = p.y < h(u)   (AA by fwidth)
// FACES (bible: flat 2-tone with a hard vertical shadow edge, 1 px rim on the sun side)
//   shadow side: (u - cj) * uSide > 0.15 hw,  uSide = +1 when the sun is on the card's left as the camera sees it
//   lit #c95a44  shadow #6a2a44; strata: value x (0.94 + 0.06 step(0.5, fract(p.y 46)))
//   rim: #ffb878 within 0.012 below the top edge on the sun-facing flank (hard, 1 px)
//   backlight uBack (sun behind the mesa): both faces pull 75% to shadow, rim brightens (x 1.15)
//   haze: toward #fa9480 by 0.25 + 0.35 (1 - p.y / h): warm desaturated far air, thickest at the foot.
import { PAL, V, SUN } from "./common.js";

const BODY = () => /* glsl */ `
  uniform float uSide; uniform float uBack; uniform float uSeed;
  float mh(float j, float k) { return h21(vec2(j * 1.37 + uSeed, k * 7.13 + uSeed * 0.31)); }
  vec4 paint(vec2 p) {
    float u = p.x * 1.4;
    float j0 = floor(u);
    float top = 0.06 + 0.03 * vn(vec2(u * 3.0, uSeed));
    float face = 0.0, owner = -1.0, hwO = 0.5, cO = 0.0, sideTop = 0.0;
    for (int i = -1; i <= 1; i++) {
      float j = j0 + float(i);
      float cj = j + 0.3 + 0.4 * mh(j, 1.0);
      float hw = 0.35 + 0.35 * mh(j, 2.0);
      float H = 0.22 + 0.62 * mh(j, 3.0);
      if (mh(j, 5.0) < 0.25) H *= 0.4;
      float s = 0.10 + 0.10 * mh(j, 4.0);
      float t1 = H * clamp((hw - abs(u - cj)) / (s * H * 6.0), 0.0, 1.0);
      float t2 = 0.62 * H * clamp((0.55 * hw - abs(u - cj - 0.2 * hw)) / (s * H * 4.0), 0.0, 1.0);
      float t = max(t1, t2);
      if (t > top) { top = t; owner = j; hwO = hw; cO = cj; }
    }
    float w = fwidth(p.y) * 0.8 + 1e-5;
    float cov = 1.0 - smoothstep(top - w, top + w, p.y);
    if (cov < 0.01) return vec4(0.0);
    float shadowFace = step(0.15 * hwO, (u - cO) * uSide);
    if (owner < 0.0) shadowFace = 0.0;
    vec3 lit = ${V(PAL.mesaLit)}, shd = ${V(PAL.mesaShadow)};
    vec3 col = mix(lit, shd, shadowFace);
    col *= 0.94 + 0.06 * step(0.5, fract(p.y * 46.0 + owner * 0.37));
    col = mix(col, shd * 0.8, uBack * 0.75);
    float rim = (1.0 - smoothstep(0.012 - w, 0.012 + w, top - p.y)) * (1.0 - shadowFace);
    col = mix(col, ${V(PAL.mesaRim)} * (1.0 + 0.15 * uBack), rim);
    float hz = 0.25 + 0.35 * (1.0 - clamp(p.y / max(top, 0.05), 0.0, 1.0));
    col = mix(col, ${V(PAL.haze)}, hz);
    return vec4(col, cov);
  }`;

export function buildMesas(ctx) {
  const { THREE, bake } = ctx;
  const group = new THREE.Group();
  const rng = ctx.rng("mesas");
  const N = 9, cards = [];
  const sh = [SUN[0], SUN[2]], shl = Math.hypot(...sh);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rng() * 0.2, r = 380 + rng() * 90;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const th = Math.atan2(-x, -z); // plane normal (+z) turned toward the origin
    const right = [Math.cos(th), -Math.sin(th)];
    const sunRight = (sh[0] * right[0] + sh[1] * right[1]) / shl;
    const back = (sh[0] * x + sh[1] * z) / (shl * r); // 1 when the sun hides behind this mesa
    const W = 420 + rng() * 120, H = 78 + rng() * 26;
    const card = bake.card(BODY(), {
      w: 1024, h: Math.round(1024 * H / W), size: [W, H], id: 0.5,
      tools: ["noise"],
      uniforms: { uSide: { value: sunRight < 0 ? 1 : -1 }, uBack: { value: Math.min(1, Math.max(0, (back - 0.15) / 0.6)) }, uSeed: { value: 3.1 + i * 5.7 } },
    });
    card.position.set(x, H / 2 - 7, z);
    card.rotation.y = th;
    card.userData.layer = 0;
    group.add(card);
    cards.push(card);
  }
  return { group, dispose() { for (const c of cards) c.userData.dispose?.(); } };
}
