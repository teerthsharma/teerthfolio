// Family — impact smear. Discrete sakuga plates, not CGI motion blur.
import { T } from "./define.js";

const F = "smear";

export const SMEAR = [
  T("smearImpactSheet", F, "chromatic punch sheets on twos: R/G/B sampled along the hit, held plates not blur",
    `vec3 smearImpactSheet(vec2 p, float t) {
      float hold = skTwos(t);
      float punch = 0.55 + 0.45 * step(0.5, fract(hold * 0.35));
      vec3 a = skFigure(skPunch(p, hold, 0.055 * punch), hold);
      vec3 b = skFigure(skPunch(p, hold + 0.02, 0.028 * punch), hold);
      vec3 c = skFigure(skPunch(p, hold + 0.05, 0.070 * punch), hold);
      vec3 sheet = vec3(a.r, b.g, c.b);
      float plate = skBand(fract(p.x * 7.0 + p.y * 1.2 + hold), 0.35, 0.62);
      return mix(skFigure(p, hold), sheet, plate * punch * 0.85);
    }`, "smearImpactSheet(p, t)"),

  T("smearSpeedRib", F, "painted speed ribs from the hit: tapering ink strokes, one drawing, not hatch noise",
    `vec3 smearSpeedRib(vec2 p, float t) {
      float hold = skTwos(t);
      vec3 col = skFigure(p, hold);
      vec2 o = vec2(0.72, 0.50);
      float ribs = 0.0;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        float ang = -0.35 + fi * 0.09 + (skH21(vec2(fi, hold)) - 0.5) * 0.04;
        vec2 d = vec2(cos(ang), sin(ang));
        float along = dot(p - o, d);
        float across = abs(dot(p - o, vec2(-d.y, d.x)));
        float taper = smoothstep(0.04, 0.42, along) * (1.0 - smoothstep(0.42, 0.62, along));
        float w = mix(0.018, 0.003, clamp(along * 1.6, 0.0, 1.0));
        ribs = max(ribs, skFill(across - w) * taper);
      }
      return mix(col, mix(SK_INK, SK_KEY, 0.15), ribs * 0.82);
    }`, "smearSpeedRib(p, t)"),

  T("smearAfterimage", F, "three ghost cels offset on the punch, decaying value, each locked to the hold",
    `vec3 smearAfterimage(vec2 p, float t) {
      float hold = skTwos(t);
      vec2 dir = vec2(0.07, -0.012);
      vec3 paper = skPaper(p);
      vec3 col = mix(paper, skFigure(p - dir * 2.1, hold), skCover(p - dir * 2.1) * 0.28);
      col = mix(col, skFigure(p - dir, hold), skCover(p - dir) * 0.50);
      return mix(col, skFigure(p, hold), skCover(p));
    }`, "smearAfterimage(p, t)"),

  T("smearImpactStill", F, "impact frame: one frozen radial crush, mid ring lifted, then the hold resumes",
    `vec3 smearImpactStill(vec2 p, float t) {
      float hold = skTwos(t);
      float hit = step(0.72, fract(hold * 0.22));
      vec2 c = p - vec2(0.72, 0.50);
      float r = length(c);
      vec3 col = skFigure(p, hold);
      float ring = skBand(r, 0.18, 0.34);
      float crush = 1.0 - smoothstep(0.0, 0.55, r);
      vec3 flash = mix(SK_FILL * 1.15, SK_KEY, skAA(crush, 0.4));
      col = mix(col, flash, crush * hit * 0.72);
      col = mix(col, mix(col, SK_PAPER, 0.55), ring * hit * 0.80);
      float spokes = abs(sin(atan(c.y, c.x) * 7.0));
      float spoke = (1.0 - smoothstep(0.12 - fwidth(spokes), 0.12 + fwidth(spokes), spokes)) * crush * hit;
      return mix(col, SK_INK * 1.8, spoke * 0.45);
    }`, "smearImpactStill(p, t)"),
];
