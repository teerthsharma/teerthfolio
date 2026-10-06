import { defineModule as M } from "./kit.glsl.js";

const F = "shonen";

export const SHONEN = [
  M("shonenKiAura", F, "Silver-white ki tongues: radial flame SDF, Toei 2010s, not JoJo invert",
    `vec3 shonenKiAura(vec2 p, float t){
      vec2 c = vec2(0.72, 0.42), q = p - c;
      float ang = atan(q.y, q.x), r = length(q);
      float tongue = 0.0;
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float a0 = fi * 0.785 + t * 1.4;
        float da = abs(mod(ang - a0 + 3.14159, 6.28318) - 3.14159);
        float len = 0.18 + 0.12 * oVn(vec2(fi, floor(t * 12.0)));
        tongue = max(tongue, exp(-da * da * 28.0) * exp(-pow((r - len) * 6.0, 2.0)));
      }
      vec3 arena = vec3(0.78, 0.74, 0.66);
      vec3 aura = vec3(0.78, 0.86, 0.90);
      vec3 core = vec3(0.86, 0.88, 0.82);
      vec3 col = mix(arena * 0.45, aura, oAA(tongue, 0.18));
      return mix(col, core, oFill(r - 0.07));
    }`, "shonenKiAura(p, t)"),

  M("shonenSpeedAura", F, "Parallel speed aura: sheared fwidth streaks, body-hold gate",
    `vec3 shonenSpeedAura(vec2 p, float t){
      float hold = floor(t * 12.0);
      vec2 q = vec2(p.x - 0.15 * hold * 0.02, p.y);
      float streak = 0.0;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float y0 = 0.12 + fi * 0.09 + 0.02 * oH21(vec2(fi, hold));
        streak = max(streak, oLine(q.y - y0, 1.3) * step(0.18, q.x) * (1.0 - smoothstep(0.2, 1.2, q.x)));
      }
      vec3 fill = vec3(0.18, 0.20, 0.32);
      vec3 line = vec3(0.82, 0.86, 0.88);
      return mix(fill, line, streak * 0.8);
    }`, "shonenSpeedAura(p, t)"),

  M("shonenImpactKanji", F, "Impact kanji plate: rect card + 4-stroke mark, fwidth edges",
    `vec3 shonenImpactKanji(vec2 p, float t){
      vec2 c = vec2(0.72, 0.55);
      float plate = oBox(p, c - vec2(0.22, 0.18), c + vec2(0.22, 0.18));
      vec3 card = vec3(0.86, 0.80, 0.68);
      vec3 ink = vec3(0.12, 0.10, 0.18);
      vec3 c0 = mix(vec3(0.16, 0.18, 0.28), card, plate);
      float s1 = oSeg(p, c + vec2(-0.12, 0.08), c + vec2(0.12, 0.10), 0.012);
      float s2 = oSeg(p, c + vec2(-0.02, 0.12), c + vec2(-0.01, -0.10), 0.014);
      float s3 = oSeg(p, c + vec2(-0.10, -0.02), c + vec2(0.12, -0.04), 0.011);
      float s4 = oSeg(p, c + vec2(0.08, 0.06), c + vec2(0.14, -0.08), 0.010);
      float mark = max(max(s1, s2), max(s3, s4));
      return mix(c0, ink, mark * plate);
    }`, "shonenImpactKanji(p, t)"),

  M("shonenAfterimage", F, "Ultra Instinct afterimages: 3 offset silhouettes on twos",
    `vec3 shonenAfterimage(vec2 p, float t){
      float beat = floor(t * 12.0);
      vec3 arena = vec3(0.82, 0.78, 0.70);
      vec3 ghost = vec3(0.70, 0.80, 0.88);
      vec3 body = vec3(0.22, 0.20, 0.30);
      float acc = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 c = vec2(0.58 + fi * 0.10 + 0.02 * sin(beat + fi), 0.48);
        float d = length((p - c) * vec2(1.15, 1.55)) - 0.11;
        acc = max(acc, oFill(d) * (1.0 - fi * 0.28));
      }
      vec3 c = mix(arena * 0.5, ghost, acc * 0.55);
      return mix(c, body, oFill(length((p - vec2(0.72, 0.48)) * vec2(1.15, 1.55)) - 0.10));
    }`, "shonenAfterimage(p, t)"),

  M("shonenSmashBurst", F, "Golden-Age smash burst: 10-point starburst + Ben-Day grain, not manga tone",
    `vec3 shonenSmashBurst(vec2 p, float t){
      vec2 q = p - vec2(0.70, 0.52);
      float a = atan(q.y, q.x), r = length(q);
      float star = abs(fract(a / 6.28318 * 10.0) * 2.0 - 1.0);
      float burst = oFill(r - (0.08 + 0.22 * (1.0 - star)));
      float grain = oH21(floor(p * 48.0));
      vec3 street = vec3(0.16, 0.18, 0.28);
      vec3 cyan = vec3(0.22, 0.62, 0.78);
      vec3 yel = vec3(0.84, 0.74, 0.28);
      vec3 c = mix(street, mix(cyan, yel, oAA(r, 0.16)), burst);
      return mix(c, c * 0.78, step(0.55, grain) * burst * 0.35);
    }`, "shonenSmashBurst(p, t)"),

  M("shonenRailCyan", F, "Railgun cyanotype streak: taper SDF + travelling head",
    `vec3 shonenRailCyan(vec2 p, float t){
      float head = fract(t * 0.55);
      vec2 a = vec2(-0.05, 0.38), b = vec2(1.35, 0.62);
      vec2 ba = b - a;
      float u = clamp(dot(p - a, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      float d = length(p - a - ba * u) - mix(0.034, 0.006, u);
      float beam = oFill(d);
      float tip = oFill(length(p - mix(a, b, head)) - 0.03);
      vec3 prussian = vec3(0.04, 0.22, 0.42);
      vec3 cyan = vec3(0.35, 0.72, 0.84);
      vec3 c = mix(prussian, cyan, beam * 0.85);
      return mix(c, vec3(0.80, 0.86, 0.88), tip * 0.7);
    }`, "shonenRailCyan(p, t)"),

  M("shonenIndexArrows", F, "Accelerator index arrows: chevron field, overcast wash, one red plate",
    `vec3 shonenIndexArrows(vec2 p, float t){
      vec3 over = vec3(0.72, 0.76, 0.82);
      vec3 shade = vec3(0.28, 0.32, 0.40);
      float v = oFbm(p * 2.4);
      vec3 c = mix(shade, over, v);
      float acc = 0.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 o = vec2(0.22 + fi * 0.18, 0.28 + 0.08 * sin(fi * 1.7 + t * 0.3));
        vec2 q = p - o;
        float chev = max(abs(q.x) * 1.4 + q.y * 0.9 - 0.06, -q.y - 0.02);
        acc = max(acc, oFill(chev));
      }
      return mix(c, vec3(0.78, 0.10, 0.16), acc * 0.8);
    }`, "shonenIndexArrows(p, t)"),

  M("shonenPalatialRing", F, "Magi palatial vortex ring: teal well + gold vessel, not GER leaf",
    `vec3 shonenPalatialRing(vec2 p, float t){
      vec2 c = vec2(0.72, 0.52), q = p - c;
      float r = length(q), th = atan(q.y, q.x) + t * 0.4;
      float well = oFill(r - 0.28);
      float ring = oLine(r - 0.22, 2.2);
      float spoke = oLine(abs(fract(th / 6.28318 * 8.0) - 0.5) - 0.46, 1.4) * oFill(r - 0.26);
      vec3 teal = vec3(0.10, 0.36, 0.40);
      vec3 gold = vec3(0.78, 0.60, 0.26);
      vec3 c0 = mix(vec3(0.12, 0.16, 0.24), teal, well);
      c0 = mix(c0, gold, ring * 0.85);
      return mix(c0, gold * 0.7, spoke * 0.45);
    }`, "shonenPalatialRing(p, t)"),
];
