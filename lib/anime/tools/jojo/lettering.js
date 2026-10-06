import { defineModule as M } from "./kit.glsl.js";

const F = "lettering";

export const LETTERING = [
  M("goRise", F, "GOGOGO rise: stacked blocks, citrus + ink",
    `vec3 goRise(vec2 p, float t){
      float col = step(0.5, p.x), row = floor((p.y + 0.05) * 6.0);
      vec2 q = vec2(fract(p.x * 2.0) - 0.5, fract(p.y * 6.0) - 0.5);
      q.x += (jH21(vec2(row, col)) - 0.5) * 0.15;
      float d = max(abs(q.x) - 0.22, abs(q.y) - 0.28);
      vec3 c = mix(mix(JOJO_MAG, JOJO_CITRUS * 0.78, 0.65), JOJO_INK, jLine(d, 2.0));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(d) * step(0.42, abs(p.x - 0.72)));
    }`, "goRise(p, t)"),
  M("tbcArrow", F, "To Be Continued: pointed gold arrow",
    `vec3 tbcArrow(vec2 p, float t){
      vec2 q = p - vec2(0.62, 0.5);
      float body = max(abs(q.y) - 0.10, abs(q.x + 0.08) - 0.28);
      vec2 tip = q - vec2(0.28, 0.0);
      float d = min(body, max(abs(tip.x) + abs(tip.y) * 1.4 - 0.18, -tip.x));
      vec3 c = mix(jGold(vec3(0.58, 0.40, 0.10)), vec3(0.92, 0.88, 0.62), jFill(abs(q.y + 0.07) - 0.012) * jFill(body + 0.02));
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jLine(d, 2.2)), jFill(d));
    }`, "tbcArrow(p, t)"),
  M("mudaWord", F, "MUDA brush: wide italic, magenta drop",
    `vec3 mudaWord(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * vec2(1.8, 2.4); q.x -= q.y * 0.15;
      float d = max(abs(q.x) - 0.62, abs(q.y) - 0.22);
      vec2 sh = q - vec2(0.08, -0.07);
      float ds = max(abs(sh.x) - 0.62, abs(sh.y) - 0.22);
      vec3 c = mix(JOJO_MAG, mix(JOJO_CITRUS * 0.78, JOJO_INK, jLine(d, 2.4)), jFill(d));
      return mix(vec3(0.227, 0.102, 0.227), c, max(jFill(d), jFill(ds) * 0.7));
    }`, "mudaWord(p, t)"),
  M("donPop", F, "DON! pop: overshoot disc, gold fill",
    `vec3 donPop(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float d = length(q / vec2(0.22, 0.16)) - 1.0;
      vec3 c = mix(JOJO_MAG, jGold(vec3(0.6, 0.42, 0.12)), jFill(d + 0.04));
      c = mix(c, JOJO_INK, jLine(d, 2.6) + jFill(length(q - vec2(0.20, 0.12)) - 0.03));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(d + 0.06));
    }`, "donPop(p, t)"),
  M("tickTock", F, "TICK/TOCK: citrus words, alternating lean",
    `vec3 tickTock(vec2 p, float t){
      float side = step(0.72, p.x);
      vec2 q = vec2(fract(p.x * 2.0) - 0.5, p.y - 0.5);
      q.x += q.y * mix(-0.12, 0.12, side);
      float d = max(abs(q.x) - 0.18, abs(q.y) - 0.08);
      vec3 c = mix(mix(vec3(0.92, 0.90, 0.82), JOJO_CITRUS * 0.75, side), JOJO_INK, jLine(d, 1.6));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(d));
    }`, "tickTock(p, t)"),
  M("zaWarudo", F, "ZA WARUDO: cream bar on invert hold",
    `vec3 zaWarudo(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.62); float d = max(abs(q.x) - 0.38, abs(q.y) - 0.07);
      return mix(jInvert(vec3(0.353, 0.165, 0.541)), mix(vec3(0.92, 0.90, 0.82), JOJO_INK, jLine(d, 2.0)), jFill(d));
    }`, "zaWarudo(p, t)"),
  M("gildedMesh", F, "Gilded mesh lettering: gradient + bevel",
    `vec3 gildedMesh(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float d = max(abs(q.x) - 0.32, abs(q.y) - 0.14), g = clamp(q.y * 2.0 + 0.5, 0.0, 1.0);
      vec3 c = mix(vec3(0.92, 0.88, 0.62), mix(jGold(vec3(0.58, 0.40, 0.10)), vec3(0.725, 0.502, 0.227), g), 0.7);
      c = mix(c, vec3(0.416, 0.227, 0.063), jAA(q.x + q.y, 0.1) * 0.35);
      return mix(vec3(0.227, 0.102, 0.227), mix(c, JOJO_INK, jLine(d, 2.2)), jFill(d));
    }`, "gildedMesh(p, t)"),
  M("sfxBoil", F, "Brush boil: jittered cells on twos",
    `vec3 sfxBoil(vec2 p, float t){
      vec2 id = floor(p * 6.0), f = fract(p * 6.0) - 0.5 + (jH22(id) - 0.5) * 0.2;
      float d = max(abs(f.x) - 0.28, abs(f.y) - 0.32);
      vec3 c = mix(mix(JOJO_CITRUS * 0.75, JOJO_MAG, jH21(id)), JOJO_INK, jLine(d, 1.8));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(d) * step(0.4, jH21(id + 2.0)));
    }`, "sfxBoil(p, t)"),
];
