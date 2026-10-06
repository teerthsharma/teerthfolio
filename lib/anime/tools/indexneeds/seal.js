import { defineModule } from "./define.js";

export const SEAL = [
  defineModule({
    name: "costumed-seal-kit",
    family: "cast",
    doc: "chubby-pear seal in a printed tunic: wide hips, stub muzzle, cream fur capped at 0.92, indigo ink, costume vest",
    glsl: /* glsl */ `
  vec3 costumedSealKit(vec2 p, float t) {
    vec2 c = IX_C;
    float s = 0.36;
    vec2 q = (p - c) / s;
    float d = ixPear(p, c, s);
    float h = ixNdL(q);
    vec3 plate = mix(ixSky(p), ixPaper(p) * 0.62, ixFill(p.y - 0.30));
    float contact = exp(-pow((p.y - 0.22) / 0.04, 2.0)) * ixFill(abs(p.x - c.x) - 0.28);
    plate = mix(plate, IX_INK * 1.8, contact * 0.35);

    vec3 fur = ixFur(h);
    float belly = ixFill(ixEllipse(q, vec2(0.06, -0.10), vec2(0.42, 0.28)));
    fur = mix(fur, ixCel3(h, IX_FUR_S * 1.05, vec3(0.70, 0.62, 0.54), IX_CREAM * 0.92), belly * 0.55);

    float vest = ixVest(p, c, s);
    vec3 dye = ixCel3(h, vec3(0.22, 0.10, 0.16), vec3(0.48, 0.16, 0.20), vec3(0.68, 0.28, 0.26));
    float fold = ixLine(q.x - 0.04, 1.4) * ixFill(abs(q.y) - 0.22);
    dye = mix(dye, IX_INK, fold * 0.45);
    float collar = ixFill(ixEllipse(q, vec2(0.08, 0.28), vec2(0.22, 0.08))) * ixAA(0.34 - q.y, 0.0);
    dye = mix(dye, ixCel3(h, vec3(0.62, 0.58, 0.54), IX_CREAM, IX_CREAM * 0.95), collar);

    vec3 body = mix(fur, dye, ixFill(vest) * ixFill(d));
    float nose = ixFill(ixEllipse(q, vec2(0.38, 0.50), vec2(0.055, 0.040)));
    body = mix(body, IX_NOSE, nose);
    float whisk = ixLine(ixSeg(q, vec2(0.36, 0.46), vec2(0.52, 0.42), 0.0), 1.1)
                + ixLine(ixSeg(q, vec2(0.36, 0.50), vec2(0.54, 0.52), 0.0), 1.1);
    body = mix(body, IX_INK, whisk * 0.55 * ixFill(d));

    float eyeL = ixFill(ixEllipse(q, vec2(0.16, 0.58), vec2(0.055, 0.048)));
    float eyeR = ixFill(ixEllipse(q, vec2(0.30, 0.60), vec2(0.050, 0.044)));
    body = mix(body, vec3(0.82, 0.78, 0.72), max(eyeL, eyeR));
    float irisL = ixFill(ixEllipse(q, vec2(0.175, 0.572), vec2(0.028, 0.026)));
    float irisR = ixFill(ixEllipse(q, vec2(0.312, 0.592), vec2(0.026, 0.024)));
    body = mix(body, vec3(0.22, 0.18, 0.16), max(irisL, irisR));
    float pup = ixFill(ixDisc(q, vec2(0.180, 0.568), 0.012)) + ixFill(ixDisc(q, vec2(0.316, 0.588), 0.011));
    body = mix(body, IX_INK, pup);
    float chip = ixFill(ixDisc(q, vec2(0.192, 0.586), 0.007)) + ixFill(ixDisc(q, vec2(0.326, 0.606), 0.006));
    body = mix(body, IX_CREAM * 0.92, chip);

    vec3 col = mix(plate, body, ixFill(d));
    col = mix(col, IX_INK, ixLine(d, 1.7) * 0.88);
    float hold = ixHold(t, 8.0);
    col += (ixH21(floor(p * 90.0 + hold)) - 0.5) * 0.012;
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return costumedSealKit(p, t); }`,
  }),
];
