import { defineModule } from "./define.js";

export const SUSANOO = [
  defineModule({
    name: "susanoo-spirit",
    family: "cast",
    doc: "Madara blue Susanoo: ribcage giant, flame crown, skeletal arms, chakra fire — XL spirit plate",
    glsl: /* glsl */ `
  vec3 susanooSpirit(vec2 p, float t) {
    vec2 c = vec2(0.70, 0.38);
    vec2 q = (p - c) * vec2(1.15, 1.0);
    vec3 col = mix(vec3(0.08, 0.08, 0.16), vec3(0.12, 0.16, 0.32), clamp(p.y, 0.0, 1.0));
    float fire = ixRidge(vec2(q.x * 3.2, q.y * 2.4 - t * 0.55));
    float aura = ixFill(ixEllipse(q, vec2(0.0, 0.22), vec2(0.62, 0.82))) * (0.35 + 0.45 * fire);
    col = mix(col, mix(IX_SU * 0.45, IX_SU_H, fire), aura * 0.7);

    float spine = ixSeg(q, vec2(0.0, -0.18), vec2(0.0, 0.48), 0.018);
    float torso = spine;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float y = -0.08 + fi * 0.09;
      float w = mix(0.28, 0.16, fi / 5.0);
      float rib = abs(ixEllipse(q, vec2(0.0, y), vec2(w, 0.055))) - 0.012;
      torso = min(torso, rib);
    }
    float skull = ixEllipse(q, vec2(0.02, 0.58), vec2(0.14, 0.12));
    float jaw = ixEllipse(q, vec2(0.02, 0.48), vec2(0.10, 0.06));
    float socket = min(ixDisc(q, vec2(-0.04, 0.60), 0.028), ixDisc(q, vec2(0.08, 0.61), 0.026));
    float armL = ixSeg(q, vec2(-0.22, 0.28), vec2(-0.48, -0.02), 0.028);
    float armR = ixSeg(q, vec2(0.22, 0.30), vec2(0.52, 0.06), 0.028);
    float hand = min(ixDisc(q, vec2(-0.50, -0.04), 0.05), ixDisc(q, vec2(0.54, 0.04), 0.048));
    float pauldron = min(ixEllipse(q, vec2(-0.20, 0.34), vec2(0.14, 0.08)), ixEllipse(q, vec2(0.20, 0.36), vec2(0.14, 0.08)));
    float body = min(torso, min(skull, min(jaw, min(armL, min(armR, min(hand, pauldron))))));

    float nd = clamp(0.42 + 0.4 * q.x + 0.25 * q.y, 0.0, 1.0);
    vec3 bone = ixCel3(nd, IX_SU * 0.4, IX_SU, IX_SU_H);
    bone = mix(bone, IX_INK, ixFill(socket));
    float crown = ixRidge(vec2(q.x * 6.0, q.y * 3.0 - t * 0.8));
    float flame = ixFill(ixEllipse(q, vec2(0.02, 0.78), vec2(0.28, 0.22))) * (0.4 + 0.6 * crown);
    col = mix(col, bone, ixFill(body));
    col = mix(col, mix(IX_SU_H, IX_BEAM * 0.7, crown), flame * 0.75);
    col = mix(col, IX_INK, ixLine(body, 1.5) * 0.7);
    float hold = ixHold(t, 10.0);
    col += (ixH21(floor(p * 70.0 + hold)) - 0.5) * 0.02 * IX_SU_H;
    return ixOut(col);
  }`,
    demo: /* glsl */ `vec3 demo(vec2 p, float t) { return susanooSpirit(p, t); }`,
  }),
];
