// THE FAR RIDGES (layer 0): painted cards, a ring of seven around the back hemisphere at 330 m, each baked ONCE into a
// half-float texture by ctx.bake.card (coverage in alpha). Three overlapping ranges, back to front. The maths, per range i:
//   h_i(x) = base_i + amp_i * (0.65 tri(x f1_i + s_i) + 0.35 tri(x f2_i + 3.3 s_i)),   tri(u) = |fract(u) - 0.5| * 2
//   (a piecewise-linear skyline = faceted peaks); the lit side is where dh/dx > 0 (finite difference), the other side takes the
//   shadow colour; diagonal hatch on the shadow side; cream snow above y = h - 0.07 on summits > 0.56; ink line at |y - h| < 0.004.
// Variant 0 is the dam's violet range (#4a3a6a), variant 1 the island's snow range (white + cyan-violet shadow).
import { Group } from "three";

const body = (variant) => /* glsl */ `
  float mTri(float u) { return abs(fract(u) - 0.5) * 2.0; }
  float mH(float x, float i) {
    float f1 = 3.0 + i * 2.3, f2 = 7.0 + i * 3.1;
    return 0.30 + i * 0.09 + (0.36 - i * 0.06) * (0.65 * mTri(x * f1 + i * 1.7) + 0.35 * mTri(x * f2 + i * 5.6));
  }
  vec4 paint(vec2 p) {
    float x = p.x / uAsp;
    vec3 col = vec3(0.0); float cov = 0.0;
    const vec3 INK = vec3(0.0015, 0.0006, 0.003);
    for (int k = 0; k < 3; k++) {
      float i = float(k);
      float h = mH(x, i), e = 0.004;
      if (p.y > h + 0.006) continue;
      float slope = mH(x + e, i) - mH(x - e, i);
      ${variant === 0
        ? "vec3 litC = mix(vec3(0.150, 0.100, 0.330), vec3(0.070, 0.040, 0.170), i / 2.0); vec3 shC = litC * 0.45 + vec3(0.02, 0.0, 0.06); vec3 snowC = vec3(0.80, 0.74, 0.88);"
        : "vec3 litC = mix(vec3(0.62, 0.66, 0.78), vec3(0.50, 0.52, 0.72), i / 2.0); vec3 shC = litC * 0.55 + vec3(0.04, 0.03, 0.12); vec3 snowC = vec3(0.90, 0.90, 0.90);"}
      vec3 c = slope > 0.0 ? litC : shC;
      float hatch = step(0.82, abs(fract(p.x * uAsp * 64.0 - p.y * 64.0) - 0.5) * 2.0);
      if (slope <= 0.0) c *= 1.0 - 0.28 * hatch;
      if (p.y > h - 0.07 && h > 0.56) c = slope > 0.0 ? snowC : snowC * 0.62;
      if (abs(p.y - h) < 0.004) c = INK;
      col = c; cov = 1.0;
    }
    return vec4(col, cov);
  }`;

export function buildMountains(ctx, variant = 0) {
  const g = new Group();
  const card = ctx.bake.card(body(variant), { w: 1600, h: 448, size: [200, 56] });
  const R = 330;
  for (let k = 0; k < 7; k++) {
    const a = ((k - 3) * 30 * Math.PI) / 180;
    const m = k === 0 ? card : card.clone();
    m.position.set(Math.sin(a) * R, 6, -Math.cos(a) * R);
    m.rotation.y = -a;
    m.scale.set(k % 2 ? -1.15 : 1.15, 1.15, 1);
    m.frustumCulled = false;
    g.add(m);
  }
  g.userData.dispose = card.userData.dispose;
  return g;
}
