// J.C.Staff blue-sky city plates: flat-band sky with a cloud bank, and the glass skybridge.
import { defineModule } from "./define.js";

const D = (name, o) => defineModule({ name, ...o, demo: `vec3 demo(vec2 p, float t) { return ${name}(p, t); }` });

export const PLATE = [
  D("jcsBlueSky", {
    doc: "clear-day sky in four flat blue bands with one hard-edged cloud bank drifting on twos",
    draws: "A bright blue day sky in four crisp bands, pale at the horizon and deeper above, with a bank of white clouds that have flat blue-grey undersides.",
    use: "plate", params: "uJcsCloud is the height of the cloud bank (0.45); uJcsSeed reshuffles the cloud shapes.",
    uniforms: { uJcsCloud: 0.45 },
    glsl: /* glsl */ `
    uniform float uJcsCloud;
    vec3 jcsBlueSky(vec2 p, float t) {
      vec3 c = mix(JCS_SKY_B0, JCS_SKY_B1, jcsAA(p.y, 0.25));
      c = mix(c, JCS_SKY_B2, jcsAA(p.y, 0.5));
      c = mix(c, JCS_SKY_B3, jcsAA(p.y, 0.75));
      float drift = jcsHold(t, 12.0) * 0.01;
      float d = 9.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float h = jcsH21(vec2(fi, 2.3 + uJcsSeed));
        float h2 = jcsH21(vec2(fi, 6.1 + uJcsSeed));
        vec2 ctr = vec2(0.2 + 0.25 * fi + (h - 0.5) * 0.12 + drift, uJcsCloud + 0.05 * h2);
        d = min(d, length((p - ctr) * vec2(1.0, 1.4)) - (0.07 + 0.05 * h2));
      }
      d = max(d, uJcsCloud - 0.03 - p.y);
      vec3 cloud = mix(JCS_CLOUD, JCS_CLOUD_S, jcsAA(-(p.y - uJcsCloud - 0.02), 0.0));
      return jcsOut(mix(c, cloud, jcsFill(d)));
    }`,
  }),

  D("jcsSkybridge", {
    doc: "glass skybridge across the top third: roof strip, mullioned glass band, hull, zigzag truss and two tapered pylons",
    draws: "A long glass walkway across a blue sky, with a pale roof, a band of glass panes divided by dark mullions, a zigzag truss underneath and two pylons going down.",
    use: "plate", params: "uJcsBridgeY is the height of the glass band (0.75); uJcsMullion is the pane spacing in frame units (0.06).",
    uniforms: { uJcsBridgeY: 0.75, uJcsMullion: 0.06 },
    deps: ["jcsKit", "jcsBlueSky"],
    glsl: /* glsl */ `
    uniform float uJcsBridgeY;
    uniform float uJcsMullion;
    vec3 jcsSkybridge(vec2 p, float t) {
      vec3 c = jcsBlueSky(p, t);
      float y0 = uJcsBridgeY - 0.05, y1 = uJcsBridgeY + 0.05;
      float tri = abs(fract(p.x * 10.0) - 0.5) * 2.0;
      float truss = jcsLine(p.y - (y0 - 0.07 * tri), 2.0) * jcsFill(max(y0 - 0.075 - p.y, p.y - y0));
      float pyl = 1.0;
      for (int i = 0; i < 2; i++) {
        float px = 0.55 + 0.8 * float(i);
        pyl = min(pyl, jcsTaper(p, vec2(px, y0), vec2(px, 0.0), 0.012, 0.03));
      }
      c = mix(c, JCS_GL_MID, jcsFill(pyl));
      c = mix(c, JCS_GL_SHADE, truss);
      float body = jcsFill(max(y0 - p.y, p.y - y1));
      vec3 deck = mix(JCS_GL_MID, JCS_GL_LIT, jcsAA(p.y, y0 + 0.02));
      deck = mix(deck, JCS_BR_ROOF, jcsAA(p.y, y1 - 0.012));
      float mull = jcsLine((abs(fract(p.x / uJcsMullion) - 0.5) - 0.48) * uJcsMullion, 1.5) * jcsAA(p.y, y0 + 0.02) * (1.0 - jcsAA(p.y, y1 - 0.012));
      deck = mix(deck, JCS_GL_SHADE, mull);
      return jcsOut(mix(c, deck, body));
    }`,
  }),
];
