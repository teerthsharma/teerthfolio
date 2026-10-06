import { defineModule } from "./define.js";

export const SHOCKWAVE_DOME = defineModule({
  name: "shockwave-dome",
  doc: "expanding refractive shock dome: sphere shell, cel Fresnel rim, inner flash, ground dust ring",
  glsl: /* glsl */ `
  vec3 shockwaveDome(vec2 p, float t) {
    float life = 1.15;
    float u = fract(t / life);
    float R = 0.40 * (1.0 - pow(1.0 - u, 2.5));
    vec2 c = vec2(0.70, 0.38);
    vec2 q = p - c;
    float r = length(q);
    vec3 bg = mix(vec3(0.38, 0.50, 0.70), vec3(0.16, 0.24, 0.42), imAA(p.y, 0.48));
    bg = mix(bg, vec3(0.28, 0.24, 0.20), 1.0 - imAA(p.y, 0.30));
    float city = step(abs(fract(p.x * 7.0) - 0.5), 0.045) * imBand(p.y, 0.30, 0.52);
    bg = mix(bg, IM_INK * 2.2, city * 0.55);
    if (r < R && R > 1e-4) {
      float z = sqrt(max(0.0, R * R - r * r));
      float cosT = z / R;
      vec2 warp = -(q / R) * 0.014 * (1.0 - cosT) * (1.0 - u);
      vec2 s = p + warp;
      bg = mix(vec3(0.38, 0.50, 0.70), vec3(0.16, 0.24, 0.42), imAA(s.y, 0.48));
      bg = mix(bg, vec3(0.28, 0.24, 0.20), 1.0 - imAA(s.y, 0.30));
      float fres = 1.0 - imAA(cosT, 0.42);
      vec3 rim = mix(IM_KEY, vec3(0.86, 0.82, 0.70), fres);
      float flash = exp(-u * 8.0) * cosT;
      bg = mix(bg, rim, fres * 0.72 * (1.0 - u));
      bg = mix(bg, vec3(0.88, 0.84, 0.72), flash * 0.55);
    }
    float sil = imLine(r - R, 1.7) * (1.0 - u);
    bg = mix(bg, IM_INK, sil * 0.70);
    vec2 gq = (p - c) / vec2(1.0, 0.32);
    float gr = length(gq);
    float dust = imFill(imRing(gr, R * 1.15, 0.06)) * (1.0 - imAA(p.y, c.y + 0.02));
    dust *= smoothstep(0.40, 0.72, imFbm(gq * 8.0 + vec2(0.0, -u))) * (1.0 - u);
    return mix(bg, vec3(0.58, 0.50, 0.40), dust * 0.70);
  }`,
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { return imOut(shockwaveDome(p, t)); }`,
});
