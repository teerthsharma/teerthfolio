// SKY: the overcast-cel sky (a baked calm dome on the plate), the live storm/erase dome on layer 1, and the far painted skylines.
//
// skyAt(az, el, tc, storm, wave) MATHS
//   gradient   base = ramp3(h^0.65, horizon #9fc9f2, mid #5a9cf5, zenith #2f6fe0),  h = el / 1.25      (saturated: law L8)
//   clouds     planar projection cp = d.xz / (d.y + 0.32), warped fbm f;  cover = smoothstep(0.50, 0.535, f)   (hard cel edge)
//              shade side: f sampled one step TOWARD the sun; if still inside the cloud (f_s > 0.545) the pixel is on the underside #6f94dc
//              second band: another fbm octave, threshold 0.55-0.575; drift 0.012 / s, tc is STEPPED so it drifts on twos
//   sun        small hard disc + halo capped at +0.3 (bible CHANGE: cap sun glow at 0.3)
//   storm      far wall:  col = mix(col, #2a3a8a, storm * (1 - smoothstep(0, 0.55, el)) * (0.6 + 0.4 fbm))   (2.0-5.5 s)
//   wave       theta = angle from the pop direction P = normalize(0.3, 6, -1);  erased where theta < wave -> flat gradient (no clouds)
//              bright front: exp(-((theta - wave) / 0.06)^2) mixed 85% to #f4fbff   (bible: sky erased from the pop outward with a bright front)
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { KIT, V } from "../../../paint.js";
import { GLSL as OVERCAST } from "./overcast.js";

export const SKY_FN = /* glsl */ `
  ${OVERCAST}
  const vec3 HOR = ${V("#c8d4e4")}, MID = ${V("#9aafc8")}, ZEN = ${V("#6a82a4")}, UNDER = ${V("#6f94dc")}, WALL = ${V("#2a3a8a")}, HAZEC = ${V("#5a8ae0")};
  const vec3 SUND = vec3(-0.4, 0.55, -0.73), POPD = vec3(0.0498, 0.9877, -0.1646);
  vec3 skyAt(float az, float el, float tc, float storm, float wave) {
    vec3 d = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
    float hgt = clamp(el / 1.25, 0.0, 1.0);
    vec3 base = mix(overcastSky(az, el), ramp3(pow(hgt, 0.65), HOR, MID, ZEN), 0.35);
    base = mix(base, HAZEC, smoothstep(0.0, -0.35, el));
    vec3 flatSky = base;
    vec2 cp = d.xz / (max(d.y, 0.0) + 0.32) * 1.15 + vec2(tc * 0.012, 0.0);
    vec2 q = warp(cp * 0.9, 0.55) * 1.4, sd = vec2(-0.075, 0.056);
    float f1 = fbm(q), f1s = fbm(q + sd);
    float c1 = smoothstep(0.50, 0.535, f1), s1 = smoothstep(0.535, 0.552, f1s);
    vec2 q2 = q * 1.7 + 7.0;
    float f2 = fbm(q2), f2s = fbm(q2 + sd * 1.3);
    float c2 = smoothstep(0.55, 0.575, f2) * 0.85, s2 = smoothstep(0.575, 0.592, f2s);
    vec3 cc1 = mix(vec3(0.92, 0.92, 0.90), UNDER, s1), cc2 = mix(vec3(0.90, 0.93, 0.92), UNDER, s2);
    cc1 = mix(cc1, UNDER * 0.85, storm * 0.4); cc2 = mix(cc2, UNDER * 0.85, storm * 0.4);
    float cm = smoothstep(0.03, 0.22, el);
    vec3 col = mix(base, cc2, c2 * cm);
    col = mix(col, cc1, c1 * cm);
    float sdot = dot(d, normalize(SUND)), up = step(0.0, el);
    col += min(0.3, 0.3 * exp(-(1.0 - sdot) * 60.0)) * vec3(0.92, 0.90, 0.82) * up * (1.0 - storm * 0.6);
    col = mix(col, vec3(0.92, 0.90, 0.84), smoothstep(0.9988, 0.9992, sdot) * up * (1.0 - storm * 0.8));
    float wall = (1.0 - smoothstep(0.0, 0.55, el)) * (0.6 + 0.4 * fbm(vec2(az * 4.0, el * 10.0 + tc * 0.05)));
    col = mix(col, WALL, clamp(storm * wall * 1.2, 0.0, 1.0));
    col *= mix(1.0, 0.82, storm * 0.5 * smoothstep(0.2, 1.0, hgt));
    float theta = acos(clamp(dot(d, POPD), -1.0, 1.0)), on = step(0.001, wave);
    col = mix(col, flatSky, (1.0 - smoothstep(wave - 0.05, wave + 0.01, theta)) * on);
    float fb = exp(-pow((theta - wave) / 0.06, 2.0)) * on;
    col = mix(col, vec3(0.88, 0.91, 0.92), fb * 0.85);
    float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return col * min(1.0, 0.92 / max(Y, 1e-4));
  }
  vec3 sky(float az, float el) { return skyAt(az, el, 0.0, 0.0, 0.0); }`;

// the calm sky, baked once on the plate (layer 0)
export function bakedSky(ctx) {
  return ctx.bake.sky(SKY_FN, { az: [-Math.PI, Math.PI], el: [-0.6, 1.58], pxPerRad: 640 });
}

// the live dome (layer 1): drawn only while the storm wall or the erase wave changes the sky. alpha .62 keeps it in the layer-1 composite;
// z = 0.9998 w puts it just in front of the plate dome, behind every piece of the city.
export function liveSky() {
  const m = new ShaderMaterial({
    side: BackSide, depthWrite: true, uniforms: { uTc: { value: 0 }, uStorm: { value: 0 }, uWave: { value: 0 } },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.9998, p.w); }",
    fragmentShader: `uniform float uTc; uniform float uStorm; uniform float uWave; varying vec3 vD; ${KIT} ${SKY_FN}
      void main() { vec3 d = normalize(vD); gl_FragColor = vec4(skyAt(atan(d.x, -d.z), asin(clamp(d.y, -1.0, 1.0)), uTc, uStorm, uWave), 0.62); }`,
  });
  const s = new Mesh(new SphereGeometry(390, 48, 24), m);
  s.frustumCulled = false; s.renderOrder = -10; s.userData.layer = 1; s.visible = false;
  return s;
}

// far skyline painted cards (4 around, layer 1 so they fold away with the city). paint(p): p.x in [0, 8], y in [0, 1].
//   column id = floor(14 x); height h = 0.18 + 0.55 r^1.6; a stepped crown above; ribbon windows 60 bands; hard edge line #4a5668
//   colour: glass #8db8e2 / #6f9fd6 mixed per column, hazed toward #5a8ae0 at the base (aerial perspective that stays saturated)
function skylineBody(seed, haze) {
  return /* glsl */ `
  vec4 paint(vec2 p) {
    float x = p.x * 14.0, id = floor(x), fx = fract(x);
    float r = h21(vec2(id, ${seed.toFixed(1)}));
    float hg = 0.16 + 0.55 * pow(r, 1.6), crown = hg + 0.05 + 0.05 * h21(vec2(id, 9.0 + ${seed.toFixed(1)}));
    float body = step(fx, 0.9) * step(p.y, hg), top = step(0.2, fx) * step(fx, 0.7) * step(p.y, crown);
    float mast = step(abs(fx - 0.45), 0.02) * step(p.y, crown + 0.1 * h21(vec2(id, 3.0)));
    float cov = max(max(body, top), mast);
    if (cov < 0.5) return vec4(0.0);
    vec3 g = mix(${V("#8db8e2")}, ${V("#6f9fd6")}, h21(vec2(id, 5.0)));
    g = mix(g, ${V("#eef3fa")}, step(0.8, h21(vec2(id, 11.0))) * 0.7);                    // some towers are pale concrete
    float band = step(fract(p.y * 62.0), 0.55) * step(0.04, fx) * step(fx, 0.86);
    g *= 1.0 - 0.14 * band;
    g = mix(g, g * vec3(0.78, 0.84, 1.0), step(0.55, fx) * 0.5);                           // shadow side
    g = mix(g, ${V("#5a8ae0")}, ${haze.toFixed(2)} * (1.0 - smoothstep(0.0, 0.6, p.y)));
    float edge = 1.0 - smoothstep(0.0, 0.012, min(min(fx, 0.9 - fx), min(abs(p.y - hg), 1.0)));
    g = mix(g, ${V("#4a5668")}, 0.35 * edge * step(fx, 0.9));
    return vec4(g, 1.0);
  }`;
}
export function skylines(ctx, group) {
  const cards = [];
  const mk = (seed, haze, r, rotY, y) => {
    const c = ctx.bake.card(skylineBody(seed, haze), { w: 2048, h: 256, size: [r * 2.3, r * 0.29], id: 0.62, layer: 1 });
    c.position.set(Math.sin(rotY) * -r, y, -Math.cos(rotY) * r); // rotY = azimuth of the card seen from the origin
    c.rotation.y = -rotY; c.userData.layer = 1; c.userData.baseY = y; group.add(c); cards.push(c);
  };
  // far wall behind the city (-z), the two flanks and the rear
  mk(1.0, 0.55, 300, 0, 40); mk(7.0, 0.6, 300, Math.PI / 2, 40); mk(13.0, 0.6, 300, -Math.PI / 2, 40); mk(21.0, 0.6, 300, Math.PI, 40);
  return cards;
}
