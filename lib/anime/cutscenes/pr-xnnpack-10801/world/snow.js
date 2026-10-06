// WORLD / the island snow: the real world behind the picture. Shot 1 (the island recedes) and shot 6 (the credit, "seal upright
// on snow") stand on it, and it shows through the holes in the glass. Static art: layer 0, baked into the plate.
//   bump     b(p) = 0.6 vn(0.05 p) + 0.25 vn(0.13 p + 4) + 0.08 vn(0.5 p)          (metres of swell)
//   normal   n = normalize(b(p - ex) - b(p + ex), 2e, ...) with e = 0.9 and a 7x vertical gain so the swell reads
//   shading  two flat bands, light L = normalize(-0.5, 0.8, 0.35): lit snow #f4f4f0, shadow #aab1bf mixed 12 % toward the cold
//            blue #3d7fc4 (hue shift: shadows go cold, never warm); the band edge is hard, fwidth AA
//   streaks  wind lines on iso-b every 0.18: 1 px #aab1bf at 35 %, thinned out with distance
//   grain    1 % paper grain.  Lit luma stays under the 0.92-0.95 cap so the seal (cap 0.92) never merges with the ground.
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { PAL, V } from "./common.js";

export function buildSnow(ctx, U) {
  const sd = ctx.scene.seal ?? {};
  const at = sd.at ?? [0, 0, 0];
  const mat = new ShaderMaterial({
    uniforms: { uGround: U.uGround },
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${ctx.tools.glslFor(["noise"])}
      varying vec3 vW;
      const vec3 LIT = ${V(PAL.snow)}; const vec3 SHD = mix(${V(PAL.snowShade)}, ${V(PAL.blue)}, 0.12); const vec3 STR = ${V(PAL.snowShade)};
      float bump(vec2 p) { return 0.6 * vn(p * 0.05) + 0.25 * vn(p * 0.13 + 4.0) + 0.08 * vn(p * 0.5); }
      void main() {
        vec2 p = vW.xz; float e = 0.9, g = 7.0;
        vec3 n = normalize(vec3(g * (bump(p - vec2(e, 0.0)) - bump(p + vec2(e, 0.0))), 2.0 * e, g * (bump(p - vec2(0.0, e)) - bump(p + vec2(0.0, e)))));
        float l = dot(n, normalize(vec3(-0.5, 0.8, 0.35))); float w = fwidth(l) * 0.75 + 1e-4;
        vec3 col = mix(SHD, LIT, smoothstep(0.62 - w, 0.62 + w, l));
        float hs = bump(p) / 0.18; float cf = abs(fract(hs - 0.5) - 0.5); float cw = fwidth(hs);
        float cl = (1.0 - smoothstep(0.0, cw * 1.2 + 1e-4, cf)) * (1.0 - smoothstep(0.3, 0.6, cw));
        col = mix(col, STR, cl * 0.35);
        col *= 1.0 - 0.01 * h21(gl_FragCoord.xy);
        gl_FragColor = vec4(min(col, vec3(0.95)), 0.5);
      }`,
  });
  const m = new Mesh(new PlaneGeometry(1800, 1800).rotateX(-Math.PI / 2), mat);
  m.position.set(at[0], at[1] - 0.06, at[2]); m.frustumCulled = false; m.userData.layer = 0;
  return { obj: m, update() {}, dispose() { m.geometry.dispose(); mat.dispose(); } };
}
