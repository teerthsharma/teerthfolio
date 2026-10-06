// INK-SMOKE-TENDRIL SKY (bible: Night sky and red smoke; module name `ink-smoke-tendril-sky`, needs promotion).
//
// BAKED ONCE (ctx.bake.sky, full 2 pi azimuth, seam blended so it wraps):
//   y     = |el|                                  the lower half mirrors the upper (the lake reflects the sky), dimmed x0.35
//   v1    = veins(p, 2.3, 1.15, 3.0)              two twice-warped Voronoi-edge networks (tools/veins.js):
//   v2    = veins(1.6 p + 5, 2.3, 1.0, 9.0)         .x = vein intensity (core + fine + halo) * smoke body, .y = body
//   reach = 0.25 + 0.75 smoothstep(0.05, 0.45, |az|)   black and EMPTY behind the shrine (az 0), veins gather at the edges
//   fade  = 0.55 + 0.45 smoothstep(0.02, 0.12, y)      the smoke thins into the horizon
//   col   = #050206 + [#6a0610 v1.x 0.6 + #b3081c v2.x 0.35 + #e5142e (v1.x v2.x)^2 hot junction] fade reach
//         + #3a0a14 exp(-y/0.03) (fbm-modulated)   horizon haze
//         * (1 + 0.6 exp(-(az^2 + (el - 0.47)^2)/0.09))   veins brighten toward the horn tips (el 0.47 over the shrine)
//   seam: |az| in (pi - 0.6, pi): col = mix(F(az), F(az -+ 2 pi), 0.5 smoothstep(pi - 0.6, pi, |az|)), continuous across +-pi.
//
// LIVE (layer 1, one texture fetch per pixel):
//   uv.x = (az - az0)/(az1 - az0) + drift, drift = 0.005 t / 6.28   0.5% of the frame width per second, tendrils crawl on twos
//   bleed: col = mix(col, flood, uBleed), flood = (0.30, 0.012, 0.05) (0.55 + 0.45 sat(1.5 el + 0.4)) + col (1.6, 0.5, 0.6)
//   drain: h = (el + 0.4)/1.7, front f = 1.25 uDrain, w = 1 - smoothstep(f - 0.2, f, h)   drains to paper from the horizon up
//          col = mix(col, mix(paperLo, paperHi, h), w)           #ece5d2 low, #9fb0c0 high (island sky, luma < 0.92)
import { Color, Mesh, ShaderMaterial, SphereGeometry, Vector2 } from "three";
import { V } from "../../../paint.js";

const FIELD = /* glsl */ `
  vec3 F(float az, float el) {
    float y = abs(el);
    vec2 p = vec2(az, y);
    vec2 v1 = veins(p, 2.3, 1.15, 3.0), v2 = veins(p * 1.6 + 5.0, 2.3, 1.0, 9.0);
    float fade = 0.55 + 0.45 * smoothstep(0.02, 0.12, y);
    float reach = 0.25 + 0.75 * smoothstep(0.05, 0.45, abs(az));
    float hot = v1.x * v2.x;
    vec3 c = ${V("#050206")} + (${V("#6a0610")} * v1.x * 0.6 + ${V("#b3081c")} * v2.x * 0.35 + ${V("#e5142e")} * hot * hot * 0.5) * fade * reach;
    c += ${V("#3a0a14")} * exp(-y / 0.03) * (0.4 + 0.9 * fbm(p * vec2(6.0, 30.0)));
    c *= 1.0 + 0.6 * exp(-(az * az + (y - 0.47) * (y - 0.47)) / 0.09);
    return el < 0.0 ? c * 0.35 : c;
  }
  vec3 sky(float az, float el) {
    float w = 0.5 * smoothstep(3.14159 - 0.6, 3.14159, abs(az));
    vec3 c = F(az, el);
    if (w > 0.0) c = mix(c, F(az - sign(az) * 6.28318, el), w);
    return c;
  }`;

export function buildSky(ctx, T) {
  const AZ = [-Math.PI, Math.PI], EL = [-0.4, 1.3];
  const baked = ctx.bake.sky(FIELD, { tools: ["veins"], az: AZ, el: EL, pxPerRad: 640 });
  const tex = baked.userData.target.texture;
  const mat = new ShaderMaterial({
    side: 1, depthWrite: false,        // BackSide
    uniforms: {
      tSky: { value: tex }, uAz: { value: new Vector2(...AZ) }, uEl: { value: new Vector2(...EL) },
      uDrift: { value: 0 }, uBleed: { value: 0 }, uDrain: { value: 0 },
      uPaperLo: { value: new Color("#ece5d2") }, uPaperHi: { value: new Color("#9fb0c0") },
    },
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: /* glsl */ `uniform sampler2D tSky; uniform vec2 uAz; uniform vec2 uEl; uniform float uDrift; uniform float uBleed; uniform float uDrain;
      uniform vec3 uPaperLo; uniform vec3 uPaperHi; varying vec3 vD;
      void main() {
        vec3 d = normalize(vD);
        float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
        vec2 uv = vec2(fract((az - uAz.x) / (uAz.y - uAz.x) + uDrift), clamp((el - uEl.x) / (uEl.y - uEl.x), 0.0, 1.0));
        vec3 col = texture2D(tSky, uv).rgb;
        vec3 flood = vec3(0.30, 0.012, 0.05) * (0.55 + 0.45 * clamp(1.5 * el + 0.4, 0.0, 1.0)) + col * vec3(1.6, 0.5, 0.6);
        col = mix(col, flood, uBleed);
        float h = clamp((el + 0.4) / 1.7, 0.0, 1.0), f = 1.25 * uDrain;
        float w = 1.0 - smoothstep(f - 0.2, f, h);
        col = mix(col, mix(uPaperLo, uPaperHi, h), w * step(0.0001, uDrain));
        gl_FragColor = vec4(col, 0.0);
      }`,
  });
  const dome = new Mesh(new SphereGeometry(400, 48, 24), mat);
  dome.frustumCulled = false; dome.renderOrder = -10;
  baked.material.dispose();
  const sm = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  return {
    object: dome,
    update(t) {
      const u = mat.uniforms;
      u.uDrift.value = (0.005 * t) / (2 * Math.PI) * 6.2832;       // 0.5% of the frame per second (az span 2 pi)
      // bleed: 0 -> .55 over shot 2; the barrage pushes it to .85; the Cleave floods it to 1.0
      let b = 0.55 * sm(T.bleed, T.bleed + T.bleedDur, t);
      b += 0.30 * sm(T.slash[0], T.cleave, t) + 0.15 * sm(T.cleave, T.cleave + 0.6, t);
      u.uBleed.value = b;
      u.uDrain.value = sm(T.drain, T.drain + T.drainDur, t);
    },
    dispose() { mat.dispose(); dome.geometry.dispose(); baked.userData.target?.dispose(); },
  };
}
