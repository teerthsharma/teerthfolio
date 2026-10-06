import { defineModule as M } from "./kit.glsl.js";

const F = "blood";

export const BLOOD = [
  M("bloodSpray", F, "Blood-spray beads: teardrop SDF + gravity streak, not timestop circles",
    `vec3 bloodSpray(vec2 p, float t){
      vec2 id = floor(p * 12.0), f = fract(p * 12.0) - 0.5; float h = jH21(id);
      f.y += 0.15 * h;
      float drop = length(f * vec2(1.4, 0.7 + 1.8 * max(-f.y, 0.0))) - 0.16 * step(0.5, h);
      vec3 c = jCel3(0.5 + f.y, 0.4, 0.65, vec3(0.353, 0.039, 0.078), vec3(0.690, 0.102, 0.165), vec3(0.815, 0.227, 0.282));
      return mix(vec3(0.165, 0.078, 0.125), c, jFill(drop) * step(0.5, h));
    }`, "bloodSpray(p, t)"),
  M("impactStar", F, "Impact star: astroid + core, citrus/magenta",
    `vec3 impactStar(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.0;
      return mix(vec3(0.227, 0.102, 0.227), mix(JOJO_MAG, JOJO_CITRUS * 0.75, jFill(length(q) - 0.15)), jStar4(q, 1.0) + exp(-dot(q, q) * 14.0));
    }`, "impactStar(p, t)"),
  M("posterTear", F, "Poster tear: ragged diagonal, paper lip, ink hairline",
    `vec3 posterTear(vec2 p, float t){
      vec2 d = vec2(cos(-0.62), sin(-0.62)), n = vec2(-d.y, d.x), q = (p - 0.5) * vec2(1.6, 1.0);
      float s = dot(q, d), r = (jVn(vec2(s * 9.0, 3.0)) - 0.5) * 0.10 + (jVn(vec2(s * 38.0, 7.0)) - 0.5) * 0.025;
      float e = dot(q, n) - r;
      vec3 c = vec3(0.227, 0.102, 0.227);
      if (e < 0.0 && e > -0.055) c = vec3(0.957, 0.957, 0.941) * 0.9;
      return mix(mix(c, JOJO_INK, jLine(e, 1.3)), JOJO_INK, jFill(-e) * jFill(e + 0.02) * 0.35);
    }`, "posterTear(p, t)"),
  M("posterLip", F, "Paper lip only: cream fibres on inner edge",
    `vec3 posterLip(vec2 p, float t){
      float e = p.x - 0.72 + 0.04 * sin(p.y * 22.0), fib = jVn(vec2(p.y * 40.0, e * 80.0));
      return mix(vec3(0.227, 0.102, 0.227), vec3(0.957, 0.957, 0.941) * (0.94 + 0.06 * fib), jFill(-e) * jFill(e + 0.05));
    }`, "posterLip(p, t)"),
  M("posterFlake", F, "Falling flakes: hashed rects, cream + ink edge",
    `vec3 posterFlake(vec2 p, float t){
      vec2 cell = floor(p * 9.0); float hc = jH21(cell + 5.1);
      vec2 l = fract(p * 9.0) - 0.5; float cs = cos(hc * 6.28), sn = sin(hc * 6.28);
      l = vec2(cs * l.x - sn * l.y, sn * l.x + cs * l.y);
      float box = max(abs(l.x) - 0.18, abs(l.y) - 0.12);
      return mix(vec3(0.227, 0.102, 0.227), mix(JOJO_INK, vec3(0.957, 0.957, 0.941) * 0.9, jFill(box + 0.03)), jFill(box) * step(0.6, hc));
    }`, "posterFlake(p, t)"),
  M("bloodArc", F, "Blood arc: tapered crescent, 3-step red",
    `vec3 bloodArc(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.48); float a = atan(q.y, q.x), r = length(q);
      float d = abs(r - 0.22) - 0.03 * (0.4 + 0.6 * sin(a * 2.0 + 1.2)) + step(0.4, abs(a));
      vec3 c = jCel3(0.5 + 0.3 * q.y, 0.4, 0.65, vec3(0.353, 0.039, 0.078), vec3(0.690, 0.102, 0.165), vec3(0.815, 0.227, 0.282));
      return mix(vec3(0.165, 0.078, 0.125), c, jFill(d));
    }`, "bloodArc(p, t)"),
  M("impactShock", F, "Shockwave: 3 hard rings",
    `vec3 impactShock(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.5)), s = 0.0;
      for (int i = 0; i < 3; i++) s = max(s, jLine(r - 0.10 - 0.08 * float(i), 1.5));
      return mix(vec3(0.227, 0.102, 0.227), vec3(0.92, 0.88, 0.72) * 0.7, s);
    }`, "impactShock(p, t)"),
  M("traumaShake", F, "Trauma: sheared value, complementary flash",
    `vec3 traumaShake(vec2 p, float t){
      vec2 q = p + vec2((jH21(vec2(floor(p.y * 40.0), 1.0)) - 0.5) * 0.04, 0.0);
      vec3 c = mix(vec3(0.227, 0.102, 0.227), JOJO_MAG, q.x);
      return mix(c, jInvert(c), 0.18);
    }`, "traumaShake(p, t)"),
  M("tearRagged", F, "Ragged tear field: 2-octave edge, no paper fill",
    `vec3 tearRagged(vec2 p, float t){
      vec2 q = (p - 0.5) * vec2(1.5, 1.0);
      float e = q.x * 0.83 + q.y * 0.56 + (jFbm(q * 9.0) - 0.5) * 0.12;
      return mix(vec3(0.165, 0.094, 0.141), JOJO_INK, jLine(e, 1.8));
    }`, "tearRagged(p, t)"),
  M("inkHairline", F, "Hairline cracks: 3 offsets + hash gate",
    `vec3 inkHairline(vec2 p, float t){
      float zig = 0.04 * sin(p.y * 21.0 + p.x * 13.0);
      float d = min(min(abs(p.x - 0.55 + zig), abs(p.x - 0.72 - zig * 1.3)), abs(p.x - 0.90 + zig));
      float hair = jLine(d, 1.1) * step(0.35, jH21(vec2(floor(p.y * 8.0), floor(p.x * 4.0))));
      return mix(vec3(0.541, 0.502, 0.627), JOJO_INK, hair);
    }`, "inkHairline(p, t)"),
  M("coralBleed", F, "Coral fissure bleed: #ff6a5a core leaking down",
    `vec3 coralBleed(vec2 p, float t){
      float crack = abs(p.x - 0.72 + 0.03 * sin(p.y * 18.0)) - 0.012;
      float drip = abs(p.x - 0.72) - 0.008 + 0.3 * step(0.45, p.y);
      vec3 c = mix(vec3(0.227, 0.102, 0.227), vec3(1.0, 0.416, 0.353), jFill(min(crack, drip)));
      return mix(c, JOJO_INK, jLine(crack, 1.3));
    }`, "coralBleed(p, t)"),
  M("lastBlow", F, "Last blow: heavy star + 10 radial spikes",
    `vec3 lastBlow(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 1.6;
      float spike = (1.0 - smoothstep(0.03, 0.08, jSaw(atan(q.y, q.x), 10.0))) * smoothstep(0.9, 0.2, length(q));
      vec3 c = mix(jGold(vec3(0.58, 0.40, 0.10)), JOJO_MAG, spike);
      return mix(vec3(0.227, 0.102, 0.227), c, max(jStar4(q, 1.2), spike));
    }`, "lastBlow(p, t)"),
  M("wipeBar", F, "Wipe bar: gold slab, ink head edge",
    `vec3 wipeBar(vec2 p, float t){
      float u = (p.x - 0.33) / 0.22, inb = step(0.0, u) * step(u, 1.0);
      vec3 c = mix(jGold(vec3(0.58, 0.40, 0.10)), vec3(0.92, 0.88, 0.62), jAA(u, 0.7));
      c = mix(c, JOJO_INK, jAA(u, 0.93) * (1.0 - jAA(u, 0.985)));
      return mix(vec3(0.227, 0.102, 0.227), c, inb);
    }`, "wipeBar(p, t)"),
];
