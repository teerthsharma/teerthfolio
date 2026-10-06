// overcast: Academy City sky pulled to JC Staff 2000s Index. Horizon #c8d4e4, not dopamine cobalt.
// Maths: h = clamp(el / 1.15, 0, 1); base = mix(HOR, MID, h^0.7); cloud = smoothstep(0.52, 0.56, fbm)
//   luma cap 0.92; ink #2a3a8a
import { V } from "../../../paint.js";

export const meta = { params: { overcast: { default: "#c8d4e4" } } };

export const GLSL = /* glsl */ `
  const vec3 OC_HOR = ${V("#c8d4e4")};
  const vec3 OC_MID = ${V("#9aafc8")};
  const vec3 OC_ZEN = ${V("#6a82a4")};
  const vec3 OC_INK = ${V("#2a3a8a")};
  vec3 overcastSky(float az, float el) {
    float h = clamp(el / 1.15, 0.0, 1.0);
    vec3 c = mix(OC_HOR, OC_MID, pow(h, 0.7));
    c = mix(c, OC_ZEN, smoothstep(0.45, 1.0, h));
    vec2 q = vec2(az * 1.4, el * 3.2);
    float f = fbm(q);
    float cloud = smoothstep(0.52, 0.56, f);
    c = mix(c, mix(OC_HOR, OC_INK, 0.18), cloud * 0.55);
    float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * min(1.0, 0.92 / max(Y, 1e-4));
  }`;
