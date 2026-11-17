// J.C.Staff seal surfaces: cel ramp, hard rim band, variable-width line, mascot eye, muzzle pads.
import { defineModule } from "./define.js";

const D = (name, o) => defineModule({ name, ...o, demo: `vec3 demo(vec2 p, float t) { return ${name}(p, t); }` });

export const SURFACE = [
  D("jcsCelRamp", {
    doc: "two-tone cel on the locked seal: back coat over a belly, shade hue-shifted cool, hard step",
    draws: "A seal-blue ball with a cream belly, each in one lit tone and one cooler shade tone with a hard edge between them.",
    use: "surface", params: "uJcsTau moves the shade edge (-0.18 Railgun, 0.11 Index); uJcsW is its width.",
    glsl: /* glsl */ `
    vec3 jcsCelRamp(vec2 p, float t) {
      vec2 q = (p - vec2(0.89, 0.5)) / 0.34;
      float v = dot(jcsNormal(q), JCS_KEY);
      vec3 coat = jcsCel(v, uJcsTau, uJcsW, JCS_COAT);
      vec3 belly = jcsCel(v, uJcsTau, uJcsW, JCS_BELLY);
      vec3 body = mix(coat, belly, jcsAA(-q.y - 0.3 - 0.2 * q.x * q.x, 0.0));
      return jcsOut(mix(JCS_SKY_B1, body, jcsFill(length(q) - 1.0)));
    }`,
  }),

  D("jcsRimBand", {
    doc: "hard pale rim band on the lit edge of a limb, from N.V and N.L, never a glow",
    draws: "A blue flipper in two flat tones with a crisp pale band hugging the edge that faces the light, swinging with the light on twos.",
    use: "surface", params: "uJcsRimK is the rim power (2.5, bigger is thinner); uJcsRimSide is +1 for the lit side or -1 for the far side; uJcsLightAz is the light azimuth in radians.",
    uniforms: { uJcsRimK: 2.5, uJcsRimSide: 1, uJcsLightAz: 1.0 },
    glsl: /* glsl */ `
    uniform float uJcsRimK;
    uniform float uJcsRimSide;
    uniform float uJcsLightAz;
    vec3 jcsRimBand(vec2 p, float t) {
      vec2 a = vec2(0.55, 0.5), b = vec2(1.25, 0.5);
      float R = 0.17;
      vec2 pa = p - a, ba = b - a;
      vec2 d2 = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      float dist = length(d2);
      vec3 n = jcsNormal(d2 / R);
      float az = uJcsLightAz + 0.5 * sin(jcsHold(t, 12.0) * 0.8);
      float ndl = dot(n, normalize(vec3(cos(az) * 0.8, sin(az) * 0.8, 0.45)));
      vec3 col = jcsCel(ndl, uJcsTau, uJcsW, JCS_TIP);
      float rim = jcsAA(pow(1.0 - n.z, uJcsRimK), 0.5) * jcsAA(ndl * uJcsRimSide + 0.3, 0.0);
      col = mix(col, JCS_RIM, rim);
      return jcsOut(mix(JCS_SKY_B1, col, jcsFill(dist - R)));
    }`,
  }),

  D("jcsLineVar", {
    doc: "warm contour line whose width runs from thin on the lit side to thick on the shadow side, with tapered cheek tufts",
    draws: "A seal head with four pointed cheek tufts, outlined in brown that is hairline toward the light and heavy away from it.",
    use: "line", params: "uJcsLineLit and uJcsLineShade are the line widths in pixels on the lit and shadow sides (1.0 and 2.4).",
    uniforms: { uJcsLineLit: 1.0, uJcsLineShade: 2.4 },
    glsl: /* glsl */ `
    uniform float uJcsLineLit;
    uniform float uJcsLineShade;
    vec3 jcsLineVar(vec2 p, float t) {
      vec2 c = vec2(0.89, 0.5);
      float d = length(p - c) - 0.30;
      d = min(d, jcsTaper(p, c + vec2(-0.27, -0.08), c + vec2(-0.40, -0.17), 0.05, 0.0));
      d = min(d, jcsTaper(p, c + vec2(-0.25, -0.16), c + vec2(-0.37, -0.27), 0.05, 0.0));
      d = min(d, jcsTaper(p, c + vec2(0.27, -0.08), c + vec2(0.40, -0.17), 0.05, 0.0));
      d = min(d, jcsTaper(p, c + vec2(0.25, -0.16), c + vec2(0.37, -0.27), 0.05, 0.0));
      vec2 g = vec2(dFdx(d), dFdy(d));
      float px = length(g) + 1e-6;
      float shadow = 0.5 - 0.5 * dot(g / px, normalize(JCS_KEY.xy));
      float wd = mix(uJcsLineLit, uJcsLineShade, shadow) * px;
      vec3 body = jcsCel(dot(jcsNormal((p - c) / 0.3), JCS_KEY), uJcsTau, uJcsW, JCS_COAT);
      float ring = 1.0 - smoothstep(wd - 0.5 * px, wd + 0.5 * px, -d);
      vec3 col = mix(body, JCS_LINE, ring);
      return jcsOut(mix(JCS_SKY_B1, col, jcsFill(d)));
    }`,
  }),

  D("jcsMascotEye", {
    doc: "J.C.Staff mascot eyes: big lens, dark iris with a lid shadow band, pupil, big and small catchlight, thick upper lash, lid drop",
    draws: "Two large glossy brown eyes on the seal's blue face, each with a big white glint upper left, a small one lower right, and a heavy upper lash.",
    use: "surface", params: "uJcsLid is how far the upper lid has dropped (0 open, 0.3 narrowed); uJcsGaze moves both irises sideways (-1 to 1); a blink fires on twos every few seconds.",
    uniforms: { uJcsLid: 0.0, uJcsGaze: 0.0 },
    glsl: /* glsl */ `
    uniform float uJcsLid;
    uniform float uJcsGaze;
    vec4 jcsMascotEyeAt(vec2 p, vec2 c, float lid) {
      vec2 r = vec2(0.125, 0.18);
      float dl = jcsEll(p - c, r);
      float lens = jcsFill(dl);
      vec2 ic = c + vec2(uJcsGaze * 0.03, -0.012);
      vec3 col = JCS_SCLERA;
      vec3 iris = mix(JCS_IRIS, JCS_IRIS_S, jcsAA(p.y - ic.y, 0.04));
      col = mix(col, iris, jcsFill(jcsEll(p - ic, vec2(0.082, 0.115))));
      col = mix(col, JCS_PUPIL, jcsFill(jcsEll(p - ic, vec2(0.034, 0.05))));
      col = mix(col, JCS_CATCH, jcsFill(jcsEll(p - (ic + vec2(-0.028, 0.04)), vec2(0.026, 0.03))));
      col = mix(col, JCS_CATCH, jcsFill(jcsEll(p - (ic + vec2(0.03, -0.05)), vec2(0.012, 0.012))));
      float lidY = c.y + r.y * (1.0 - 2.0 * lid);
      col = mix(col, JCS_COAT, jcsAA(p.y - lidY, 0.0));
      float thick = mix(0.005, 0.017, jcsAA(p.y, c.y));
      float ring = 1.0 - jcsAA(-dl, thick);
      float lash = max(ring, jcsLine(p.y - lidY, 2.2) * lens);
      return vec4(mix(col, JCS_LINE, lash), lens);
    }
    vec3 jcsMascotEye(vec2 p, float t) {
      float lid = max(uJcsLid, step(0.92, fract(jcsHold(t, 12.0) * 0.4)));
      vec4 e0 = jcsMascotEyeAt(p, vec2(0.60, 0.5), lid);
      vec4 e1 = jcsMascotEyeAt(p, vec2(1.18, 0.5), lid);
      vec3 col = mix(JCS_COAT, e0.rgb, e0.a);
      col = mix(col, e1.rgb, e1.a);
      return jcsOut(col);
    }`,
  }),

  D("jcsMuzzlePads", {
    doc: "seal muzzle: two cream pads with three freckles each, a small dark nose, and three whiskers a side that lift on a beat",
    draws: "Two soft cream cheek pads on a pale blue face, each dotted with three brown freckles, a small dark nose between them and fine whiskers fanning out.",
    use: "surface", params: "uJcsWhisk lifts the whiskers (0 relaxed, 1 raised about 14 degrees).",
    uniforms: { uJcsWhisk: 0.0 },
    glsl: /* glsl */ `
    uniform float uJcsWhisk;
    vec3 jcsMuzzlePads(vec2 p, float t) {
      vec2 c = vec2(0.89, 0.42);
      vec3 col = JCS_FLANK;
      for (int k = 0; k < 2; k++) {
        float s = k == 0 ? -1.0 : 1.0;
        vec2 pc = c + vec2(s * 0.075, 0.0);
        float pad = jcsEll(p - pc, vec2(0.11, 0.08));
        vec3 pcol = mix(JCS_PAD, JCS_PAD * JCS_SHADE, jcsAA(-(p.y - pc.y) - 0.35 * s * (p.x - pc.x) - 0.03, 0.0));
        col = mix(col, pcol, jcsFill(pad));
        for (int i = 0; i < 3; i++) {
          float fi = float(i) + 3.0 * float(k);
          vec2 fp = pc + vec2((jcsH21(vec2(fi, 3.1)) - 0.5) * 0.12, (jcsH21(vec2(fi, 7.7)) - 0.5) * 0.06);
          col = mix(col, JCS_FRECKLE, jcsFill(length(p - fp) - 0.0075));
        }
        for (int i = 0; i < 3; i++) {
          float a = (float(i) - 1.0) * 0.28 + uJcsWhisk * 0.25;
          vec2 o = pc + vec2(s * 0.07, -0.01 + (float(i) - 1.0) * 0.012);
          vec2 e = o + vec2(s * cos(a), sin(a)) * 0.36;
          col = mix(col, JCS_LINE, jcsFill(jcsTaper(p, o, e, 0.0035, 0.0008)));
        }
      }
      col = mix(col, JCS_NOSE, jcsFill(jcsEll(p - (c + vec2(0.0, 0.075)), vec2(0.035, 0.025))));
      return jcsOut(col);
    }`,
  }),
];
