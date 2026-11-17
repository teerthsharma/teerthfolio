// BUILD for _key (lab only): a stand-in shrine and a red lightning sky behind the hero; the photography does the rest.
import { CircleGeometry, ConeGeometry, Group } from "three";
import { composeLayers } from "../framework.js";

const SKY = /* glsl */ `
  float kh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float kn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(kh(i), kh(i + vec2(1, 0)), f.x), mix(kh(i + vec2(0, 1)), kh(i + vec2(1, 1)), f.x), f.y); }
  float kfbm(vec2 p) { return 0.5 * kn(p) + 0.27 * kn(p * 2.03 + 4.0) + 0.14 * kn(p * 4.1 + 9.0) + 0.09 * kn(p * 8.3); }
  float eave(vec2 p, float cx, float y, float w, float h, float up) {
    float dx = abs(p.x - cx) / w, lift = up * h * dx * dx * dx, lo = y + lift, hi = y + h * (1.0 - 0.75 * dx) + lift;
    return step(dx, 1.0) * step(lo, p.y) * step(p.y, hi);
  }
  float hall(vec2 p, float cx, float y0, float w, float body, float h) {
    float b = step(abs(p.x - cx), w * 0.8) * step(y0, p.y) * step(p.y, y0 + body);
    return max(b, eave(p, cx, y0 + body, w, h, 0.9));
  }
  float shrine(vec2 p) {
    float c = 0.889, m = 0.0;
    m = max(m, hall(p, c, 0.2, 0.74, 0.14, 0.085));
    m = max(m, hall(p, c, 0.455, 0.5, 0.1, 0.075));
    m = max(m, hall(p, c, 0.63, 0.3, 0.075, 0.065));
    m = max(m, step(abs(p.x - c), 0.006 * (1.0 - (p.y - 0.77) * 4.0)) * step(0.77, p.y) * step(p.y, 0.93));
    for (float s = -1.0; s < 1.5; s += 2.0) { m = max(m, hall(p, c + s * 0.78, 0.2, 0.3, 0.1, 0.06)); m = max(m, step(abs(p.x - (c + s * 1.02)), 0.012) * step(0.2, p.y) * step(p.y, 0.5)); }
    return m;
  }
  vec3 paint(vec2 p) {
    float asp = 1.7778, side = smoothstep(0.02, 0.5, abs(p.x - 0.5 * asp) / (0.5 * asp));
    vec3 c = mix(vec3(0.008, 0.001, 0.004), vec3(0.04, 0.004, 0.012), smoothstep(0.0, 0.8, p.y));
    vec2 q = p * vec2(2.2, 1.5); q += vec2(kfbm(q * 1.3 + 3.0), kfbm(q * 1.3 + 11.0)) * 1.5;
    float r = 1.0 - abs(2.0 * kfbm(q * vec2(1.0, 0.55)) - 1.0);
    c += vec3(0.07, 0.006, 0.014) * smoothstep(0.35, 0.8, kfbm(p * vec2(3.0, 2.0) + 2.0)) * (0.3 + 0.7 * side);
    float r2 = 1.0 - abs(2.0 * kfbm(q * vec2(0.8, 1.6) + 20.0) - 1.0); r = max(r, r2 * 0.985);
    float vein = pow(r, 380.0), core = pow(r, 1400.0), soft = pow(r, 6.0);
    c += vec3(0.2, 0.01, 0.022) * soft * side * 0.1 * (0.4 + kfbm(p * 6.0));
    c += vec3(1.3, 0.05, 0.07) * vein * side * 2.6 + vec3(3.2, 0.5, 0.25) * core * side * 1.5;
    c += vec3(1.0, 0.05, 0.1) * smoothstep(0.4, 0.0, abs(p.y - 0.62)) * (0.5 + 0.5 * kfbm(p * 3.0));
    float sm = shrine(p), edge = sm * (1.0 - shrine(p + vec2(0.0, 0.006)));
    c = mix(c, vec3(0.004, 0.0008, 0.002), sm * 0.97) + vec3(1.5, 0.12, 0.08) * edge * 0.55;
    return c;
  }`;

function world(ctx) {
  const { engine, sdf, palette: P } = ctx, group = new Group();
  const prop = (geo, col, shade, id = 0.5) => { const m = engine.prop(sdf.painted(geo, sdf.paint(col, shade)), id); group.add(m); return m; };
  group.add(ctx.bake.plateLayer(SKY));
  prop(new CircleGeometry(60, 64).rotateX(-Math.PI / 2), P.ground, P.groundShade);
  for (let i = 0; i < 11; i++) prop(new ConeGeometry(0.11, 0.38, 4).translate(-3 + i * 0.6, 0.15, -6.7), P.tooth, P.toothShade, 0.6);
  return { group, update() {}, dispose() {} };
}

const empty = () => ({ group: new Group(), update() {}, dispose() {} });
export default function build(ctx) {
  return composeLayers(ctx, { world, cast: empty });
}
