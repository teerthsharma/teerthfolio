// Pierrot cast shading: cel ramp, contour ink, seal fur, eye, hair clumps.
import { Color } from "three";
import { defineModule } from "./define.js";

export const CEL = [
  defineModule({
    name: "pierrotCelRamp",
    doc: "three flat tones (key, hue-shifted shade, deep core) with a hard pale rim band on one edge",
    draws: "A round form in three flat printed tones, lit key, a cooler one-step shade and a deeper core, with a hard pale rim on the right edge.",
    use: "surface",
    params: "uPrrKey is the lit colour; uPrrRim is the rim band colour; the shade is key x (0.67, 0.71, 0.75) and the deep tone is shade x (0.80, 0.82, 0.90)",
    uniforms: () => ({ uPrrKey: { value: new Color(0.525, 0.667, 0.839) }, uPrrRim: { value: new Color(0.847, 0.925, 1.0) } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrKey;
    uniform vec3 uPrrRim;
    vec4 pierrotCelRamp(vec2 q) {
      vec3 n = prrSphereN(q);
      vec3 c = prrCel(uPrrKey, prrNdL(n), -0.15, 0.35);
      float rim = prrAA(pow(1.0 - n.z, 2.0), 0.55) * prrAA(n.x, 0.2);
      return vec4(mix(c, uPrrRim, rim), prrFill(length(q) - 1.0));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec4 s = pierrotCelRamp((p - vec2(0.8, 0.5)) * 2.4); return prrOut(mix(vec3(0.10, 0.09, 0.12), s.rgb, s.a)); }`,
  }),

  defineModule({
    name: "pierrotContour",
    doc: "thick confident outline whose width swells from 1.2 px on the lit side to 2.4 px on the shadow side",
    draws: "A flat disc with an ink outline that is thin on its upper-left lit edge and thick on its lower-right shadow edge.",
    use: "line",
    params: "uPrrPxLit and uPrrPxShade are the outline widths in pixels on the lit and shadow side; the line colour is the kit ink",
    uniforms: () => ({ uPrrPxLit: { value: 1.2 }, uPrrPxShade: { value: 2.4 } }),
    glsl: /* glsl */ `
    uniform float uPrrPxLit;
    uniform float uPrrPxShade;
    float pierrotContour(float d) {
      vec2 g = vec2(dFdx(d), dFdy(d));
      float side = clamp(0.5 - 0.5 * dot(normalize(g + vec2(1e-6)), normalize(vec2(-0.5, 0.8))), 0.0, 1.0);
      return prrLine(d, mix(uPrrPxLit, uPrrPxShade, side));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) {
      vec2 q = p - vec2(0.8, 0.5);
      float d = length(q * vec2(1.0, 1.15)) - 0.26 - 0.015 * sin(atan(q.y, q.x) * 5.0);
      vec3 c = mix(vec3(0.84, 0.80, 0.70), vec3(0.62, 0.60, 0.58), step(0.0, q.x - q.y * 0.6));
      c = mix(vec3(0.30, 0.27, 0.30), c, prrFill(d));
      return prrOut(mix(c, PRR_INK, pierrotContour(d)));
    }`,
  }),

  defineModule({
    name: "pierrotFur",
    doc: "seal head in flat fur: cheek tufts notching the contour, one clean muzzle wedge, pale pads and freckles",
    draws: "A round pale-blue seal head with notched fur clumps on each cheek, a cream muzzle wedge with a hard lower edge and a few brown freckles.",
    use: "surface",
    params: "uPrrFurBack is the back colour (flank, belly, muzzle and freckles are the locked seal key); uPrrTufts is the clump count per cheek, 3 or 4",
    uniforms: () => ({ uPrrFurBack: { value: new Color(0.525, 0.667, 0.839) }, uPrrTufts: { value: 3 } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrFurBack;
    uniform float uPrrTufts;
    vec4 pierrotFur(vec2 q) {
      float a = atan(q.y, abs(q.x));
      float cheek = prrAA(abs(q.x), 0.45) * (1.0 - prrAA(q.y, 0.05)) * prrAA(q.y, -0.55);
      float tooth = abs(fract((a + 3.1416) * uPrrTufts * 0.9) - 0.5) * 2.0;
      float edge = length(q) - 1.0 - cheek * 0.10 * tooth;
      vec3 c = prrCel(uPrrFurBack, prrNdL(prrSphereN(q)), -0.15, 0.20);
      c = mix(c, vec3(0.827, 0.886, 0.945), prrAA(-q.y, 0.30));
      c = mix(c, vec3(0.973, 0.933, 0.878), prrAA(-q.y, 0.52));
      float wedge = max(abs(q.x) * 1.25 + q.y * 0.9 + 0.30, -(q.y + 0.50));
      c = mix(c, vec3(0.941, 0.851, 0.741), prrFill(wedge) * prrAA(-q.y, 0.08));
      vec2 g = q * 22.0;
      float fr = step(0.82, prrH(floor(g))) * prrFill(length(fract(g) - 0.5) - 0.18) * prrFill(wedge + 0.06);
      c = mix(c, vec3(0.463, 0.380, 0.310), fr);
      c = mix(c, PRR_INK, prrLine(edge, 2.6));
      return vec4(c, prrFill(edge));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec4 s = pierrotFur((p - vec2(0.8, 0.5)) * 2.4); return prrOut(mix(vec3(0.12, 0.11, 0.14), s.rgb, s.a)); }`,
  }),

  defineModule({
    name: "pierrotEye",
    doc: "heavy-lidded Pierrot eye: iris fills the eye, one hard catchlight, thick lid line, optional lower rim light",
    draws: "A wide almond eye with a solid coloured iris, a dark pupil, one hard white catchlight and a thick ink upper lid that drops as the lid closes.",
    use: "card",
    params: "uPrrIris is the iris colour; uPrrLid is how far the upper lid is closed (0 open, 1 shut); uPrrRimLight is the lower rim light strength (0 none, 1 full)",
    uniforms: () => ({ uPrrIris: { value: new Color(0.690, 0.0, 0.0) }, uPrrLid: { value: 0.4 }, uPrrRimLight: { value: 0.0 } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrIris;
    uniform float uPrrLid;
    uniform float uPrrRimLight;
    vec4 pierrotEye(vec2 q) {
      float eye = length(vec2(q.x * 0.62, q.y)) - 0.5;
      float lid = q.y - (0.5 - uPrrLid * 0.9 - 0.12 * q.x * q.x);
      vec2 ic = vec2(q.x * 0.95, q.y + 0.02);
      vec3 c = vec3(0.96, 0.94, 0.90);
      c = mix(c, uPrrIris, prrFill(length(ic) - 0.30));
      c = mix(c, uPrrIris * 1.4 + 0.2, uPrrRimLight * prrLine(length(ic) - 0.30, 3.0) * prrAA(-q.y, 0.1));
      c = mix(c, PRR_INK, prrFill(length(vec2(q.x, q.y + 0.02)) - 0.11));
      c = mix(c, vec3(0.973, 0.933, 0.878), prrFill(length(q - vec2(-0.12, 0.10)) - 0.045));
      c = mix(c, vec3(0.80, 0.68, 0.60), prrFill(-lid));
      c = mix(c, PRR_INK, prrLine(lid, 3.2) * prrFill(eye));
      c = mix(c, PRR_INK, prrLine(eye, 3.2));
      return vec4(c, prrFill(eye));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec4 s = pierrotEye((p - vec2(0.8, 0.5)) * 2.0); return prrOut(mix(vec3(0.62, 0.50, 0.44), s.rgb, s.a)); }`,
  }),

  defineModule({
    name: "pierrotHair",
    doc: "spiky hair as hard-edged clumps, each cut into key and shade halves with one highlight stripe, swaying on twos",
    draws: "A fan of seven sharp hair clumps around a crown, each half in shade with a pale stripe cut into the key half; the fan steps sideways twelve times a second.",
    use: "surface",
    params: "uPrrHairKey, uPrrHairShade and uPrrHairHigh are the clump, shade and stripe colours; uPrrClumps is the clump count; uPrrSway is the sway angle in radians",
    uniforms: () => ({ uPrrHairKey: { value: new Color(0.957, 0.835, 0.282) }, uPrrHairShade: { value: new Color(0.784, 0.627, 0.125) }, uPrrHairHigh: { value: new Color(1.0, 0.957, 0.627) }, uPrrClumps: { value: 7 }, uPrrSway: { value: 0.06 } }),
    glsl: /* glsl */ `
    uniform vec3 uPrrHairKey;
    uniform vec3 uPrrHairShade;
    uniform vec3 uPrrHairHigh;
    uniform float uPrrClumps;
    uniform float uPrrSway;
    vec4 pierrotHair(vec2 q, float t) {
      float a = atan(q.y, q.x) + uPrrSway * sin(prrHold(t, 12.0) * 3.0);
      float u = a / 6.2832 * uPrrClumps + 0.5;
      float k = floor(u);
      float f = fract(u);
      float len = 0.42 + 0.30 * prrH(vec2(mod(k, uPrrClumps), 3.0));
      float edge = length(q) - (0.26 + len * pow(1.0 - abs(2.0 * f - 1.0), 0.8));
      vec3 c = mix(uPrrHairShade, uPrrHairKey, prrAA(f, 0.5));
      c = mix(c, uPrrHairHigh, prrAA(0.06 - abs(f - 0.68), 0.0) * prrAA(length(q), 0.40));
      c = mix(c, PRR_INK, prrLine(edge, 2.4) * 0.9);
      return vec4(c, prrFill(edge));
    }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { vec4 h = pierrotHair((p - vec2(0.8, 0.5)) * 1.8, t); return prrOut(mix(vec3(0.14, 0.12, 0.16), h.rgb, h.a)); }`,
  }),
];
