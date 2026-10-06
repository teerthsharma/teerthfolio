import { defineModule } from "./define.js";

export const CHARIOT = [
  defineModule({
    name: "chariot-rig",
    family: "cast",
    doc: "Iskandar Gordius Wheel: two spoke wheels, axle, red body, yoke pole — low-poly rig, painted plates",
    glsl: /* glsl */ `
  float ixWheel(vec2 p, vec2 c, float r) {
    float tire = abs(length(p - c) - r) - 0.018;
    float hub = length(p - c) - r * 0.18;
    float spokes = 1.0;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 0.5235988;
      vec2 d = vec2(cos(a), sin(a));
      spokes = min(spokes, ixSeg(p, c - d * r * 0.85, c + d * r * 0.85, 0.010));
    }
    return min(tire, min(hub, spokes));
  }
  vec3 chariotRig(vec2 p, float t) {
    vec3 col = mix(vec3(0.16, 0.12, 0.18), vec3(0.46, 0.32, 0.22), clamp(p.y * 0.8, 0.0, 1.0));
    col = mix(col, vec3(0.28, 0.22, 0.18), ixFill(0.30 - p.y));
    float roll = t * 1.4;
    vec2 cL = vec2(0.48, 0.32);
    vec2 cR = vec2(0.98, 0.32);
    float r = 0.16;
    vec2 qL = p - cL;
    float ca = cos(roll), sa = sin(roll);
    vec2 rL = vec2(ca * qL.x - sa * qL.y, sa * qL.x + ca * qL.y) + cL;
    vec2 qR = p - cR;
    vec2 rR = vec2(ca * qR.x - sa * qR.y, sa * qR.x + ca * qR.y) + cR;
    float wL = ixWheel(rL, cL, r);
    float wR = ixWheel(rR, cR, r);
    float axle = ixSeg(p, cL, cR, 0.016);
    float bed = ixBox(p, vec2(0.72, 0.44), vec2(0.30, 0.08));
    float rail = ixBox(p, vec2(0.72, 0.52), vec2(0.28, 0.018));
    float yoke = ixSeg(p, vec2(0.40, 0.46), vec2(0.12, 0.50), 0.014);
    float pole = ixSeg(p, vec2(0.12, 0.50), vec2(-0.02, 0.52), 0.012);
    float body = min(bed, min(rail, min(axle, min(yoke, pole))));

    vec3 red = ixCel3(0.5 + 0.3 * (p.y - 0.4), IX_WHEEL * 0.6, IX_WHEEL, vec3(0.68, 0.22, 0.18));
    vec3 wood = ixCel3(0.45, vec3(0.22, 0.14, 0.10), vec3(0.42, 0.26, 0.14), IX_GOLD * 0.7);
    col = mix(col, wood, ixFill(min(wL, wR)));
    col = mix(col, red, ixFill(body));
    col = mix(col, IX_GOLD, ixFill(axle) * 0.65);
    col = mix(col, IX_INK, ixLine(min(min(wL, wR), body), 1.5) * 0.8);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return chariotRig(p, t); }`,
  }),

  defineModule({
    name: "divine-bull",
    family: "cast",
    doc: "Gordius bulls: two massive cream bodies, gold horns, muscle cel, wide chests — printed, not anatomy mesh",
    glsl: /* glsl */ `
  float ixBull(vec2 q) {
    float chest = ixEllipse(q, vec2(0.06, 0.02), vec2(0.42, 0.32));
    float rump = ixEllipse(q, vec2(-0.28, -0.02), vec2(0.30, 0.26));
    float head = ixEllipse(q, vec2(0.40, 0.16), vec2(0.18, 0.16));
    float muzzle = ixEllipse(q, vec2(0.54, 0.10), vec2(0.12, 0.08));
    float leg0 = ixBox(q, vec2(0.18, -0.32), vec2(0.06, 0.20));
    float leg1 = ixBox(q, vec2(0.02, -0.34), vec2(0.055, 0.18));
    float leg2 = ixBox(q, vec2(-0.22, -0.32), vec2(0.06, 0.20));
    float leg3 = ixBox(q, vec2(-0.36, -0.34), vec2(0.05, 0.18));
    float horn0 = ixSeg(q, vec2(0.34, 0.26), vec2(0.22, 0.42), 0.016);
    float horn1 = ixSeg(q, vec2(0.44, 0.26), vec2(0.52, 0.44), 0.016);
    return min(chest, min(rump, min(head, min(muzzle, min(leg0, min(leg1, min(leg2, min(leg3, min(horn0, horn1)))))))));
  }
  vec3 ixBullPaint(vec2 p, vec2 c, float s, float hBias, vec3 under) {
    vec2 q = (p - c) / max(s, 1e-4);
    float d = ixBull(q);
    float nd = clamp(0.48 + 0.35 * q.x + 0.2 * q.y + hBias, 0.0, 1.0);
    vec3 hide = ixCel3(nd, vec3(0.32, 0.24, 0.20), vec3(0.70, 0.62, 0.50), IX_CREAM * 0.90);
    float muscle = ixLine(q.y - 0.02 + 0.15 * sin(q.x * 6.0), 1.3) * ixFill(d);
    hide = mix(hide, IX_FUR_S, muscle * 0.35);
    float horn = max(ixFill(ixSeg(q, vec2(0.34, 0.26), vec2(0.22, 0.42), 0.016)),
                     ixFill(ixSeg(q, vec2(0.44, 0.26), vec2(0.52, 0.44), 0.016)));
    hide = mix(hide, ixCel3(nd, IX_GOLD * 0.5, IX_GOLD, IX_BEAM * 0.7), horn);
    float eye = ixFill(ixDisc(q, vec2(0.44, 0.18), 0.025));
    hide = mix(hide, IX_INK, eye);
    float cover = ixFill(d);
    hide = mix(hide, IX_INK, ixLine(d * s, 1.5) * 0.8 * cover);
    return mix(under, hide, cover);
  }
  vec3 divineBull(vec2 p, float t) {
    vec3 plate = mix(vec3(0.18, 0.16, 0.22), vec3(0.48, 0.36, 0.24), clamp(p.y * 0.75, 0.0, 1.0));
    plate = mix(plate, vec3(0.30, 0.24, 0.18), ixFill(0.28 - p.y));
    vec3 col = ixBullPaint(p, vec2(0.42, 0.42), 0.38, 0.05 * sin(t), plate);
    col = ixBullPaint(p, vec2(0.92, 0.40), 0.36, 0.04 * cos(t * 0.8), col);
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return divineBull(p, t); }`,
  }),
];
