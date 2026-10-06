import { defineModule as M } from "./kit.glsl.js";

const F = "theworld";

export const THEWORLD = [
  M("worldPlate", F, "The World plates: cream metallic 3-step",
    `vec3 worldPlate(vec2 p, float t){
      float ndl = 0.5 + 0.35 * p.y - 0.25 * jCut(p, 0.2);
      vec3 c = jCel3(ndl, 0.40, 0.68, vec3(0.722, 0.455, 0.165), vec3(0.910, 0.831, 0.604), vec3(0.965, 0.910, 0.690));
      return c + vec3(0.85, 0.72, 0.35) * pow(clamp(ndl, 0.0, 1.0), 12.0) * jEmit(0.4);
    }`, "worldPlate(p, t)"),
  M("worldLimb", F, "Grey-green limb cel, brown seam",
    `vec3 worldLimb(vec2 p, float t){
      vec3 c = jCel3(0.45 + 0.3 * p.y - 0.2 * jCut(p, 0.1), 0.38, 0.64, vec3(0.290, 0.353, 0.353), vec3(0.478, 0.541, 0.478), vec3(0.561, 0.635, 0.561));
      return mix(vec3(0.125, 0.094, 0.125), c, jFill(abs(p.x - 0.72) - 0.08 + 0.02 * sin(p.y * 18.0)));
    }`, "worldLimb(p, t)"),
  M("worldFist", F, "Knuckle box + 4 circles, stripe shade",
    `vec3 worldFist(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      float kn = 8.0; for (int i = 0; i < 4; i++) kn = min(kn, length(q - vec2(0.12, -0.09 + 0.06 * float(i))) - 0.035);
      float d = min(max(abs(q.x + 0.04) - 0.14, abs(q.y) - 0.10), kn);
      vec3 c = jCel3(0.55 - 0.2 * jCut(q, 0.0) + 0.15 * q.y, 0.40, 0.66, vec3(0.722, 0.455, 0.165), vec3(0.910, 0.831, 0.604), vec3(0.965, 0.910, 0.690));
      c *= 0.75 + 0.35 * jAA(q.y, 0.0) - 0.2 * step(0.5, fract((q.x + q.y) * 8.0));
      return mix(vec3(0.125, 0.078, 0.125), c, jFill(d));
    }`, "worldFist(p, t)"),
  M("worldAfterimage", F, "Ghost afterimage lean to panel violet",
    `vec3 worldAfterimage(vec2 p, float t){
      float d = length((p - vec2(0.72, 0.5)) / vec2(0.12, 0.22)) - 1.0;
      return mix(vec3(0.125, 0.063, 0.188), mix(vec3(0.910, 0.831, 0.604), vec3(0.353, 0.165, 0.541), 0.55), jFill(d) * 0.7);
    }`, "worldAfterimage(p, t)"),
  M("worldSeam", F, "Gold band seam, wavelength grade",
    `vec3 worldSeam(vec2 p, float t){
      return mix(vec3(0.910, 0.831, 0.604), jGold(vec3(0.6, 0.4, 0.12)), jFill(abs(p.y - 0.52) - 0.025));
    }`, "worldSeam(p, t)"),
  M("worldHood", F, "Hood shade: umber cave, hard lip",
    `vec3 worldHood(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.68);
      vec3 c = jCel3(0.35 - 0.2 * jCut(q, 0.3), 0.34, 0.58, vec3(0.125, 0.125, 0.141), vec3(0.290, 0.290, 0.314), vec3(0.420, 0.420, 0.455));
      c = mix(c, JOJO_UMBER, jFill(length((q - vec2(0.0, -0.02)) / vec2(0.10, 0.08)) - 1.0) * 0.85);
      return mix(vec3(0.165, 0.102, 0.141), c, jFill(length(q / vec2(0.16, 0.12)) - 1.0));
    }`, "worldHood(p, t)"),
  M("worldMetal", F, "Anisotropic metallic: stretched spec",
    `vec3 worldMetal(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5);
      vec3 c = jCel3(0.5 + 0.3 * q.y, 0.42, 0.70, vec3(0.455, 0.282, 0.102), vec3(0.831, 0.722, 0.439), vec3(0.941, 0.878, 0.627));
      return c + vec3(0.85, 0.70, 0.28) * pow(abs(sin(q.x * 28.0 + q.y * 2.0)), 8.0) * jEmit(0.5);
    }`, "worldMetal(p, t)"),
  M("worldSpark", F, "4-point astroid spark + ink ring",
    `vec3 worldSpark(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.4;
      vec3 c = mix(vec3(0.165, 0.078, 0.165), JOJO_CITRUS * 0.75, max(jStar4(q, 1.0), jLine(length(q) - 0.62, 1.5)));
      return mix(c, vec3(1.0, 0.98, 0.85) * 0.85, jFill(length(q) - 0.12));
    }`, "worldSpark(p, t)"),
  M("worldReach", F, "Forearm trail: taper cylinder behind fist",
    `vec3 worldReach(vec2 p, float t){
      vec2 a = vec2(0.40, 0.48), b = vec2(0.88, 0.55), pa = p - a, ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      vec3 c = jCel3(0.5 - 0.2 * h, 0.38, 0.64, vec3(0.290, 0.353, 0.353), vec3(0.478, 0.541, 0.478), vec3(0.561, 0.635, 0.561));
      return mix(vec3(0.165, 0.094, 0.165), c, jFill(length(pa - ba * h) - mix(0.07, 0.035, h)));
    }`, "worldReach(p, t)"),
  M("worldHold", F, "Time-stop hold light: locked key",
    `vec3 worldHold(vec2 p, float t){
      vec3 c = jCel3(0.62 - 0.3 * jCut(p, 0.0), 0.40, 0.68, vec3(0.722, 0.455, 0.165), vec3(0.910, 0.831, 0.604), vec3(0.965, 0.910, 0.690));
      return mix(c, jInvert(c), 0.22);
    }`, "worldHold(p, t)"),
  M("worldBelt", F, "Gold belt + panel studs",
    `vec3 worldBelt(vec2 p, float t){
      float belt = abs(p.y - 0.40) - 0.035;
      float stud = length(vec2(fract(p.x * 10.0) - 0.5, (p.y - 0.40) * 8.0)) - 0.12;
      vec3 c = mix(vec3(0.478, 0.541, 0.478), jGold(vec3(0.58, 0.40, 0.10)), jFill(belt));
      return mix(c, jGold(vec3(0.7, 0.5, 0.15)), jFill(stud) * jFill(belt + 0.01));
    }`, "worldBelt(p, t)"),
  M("worldEye", F, "Stand eye: gold iris, umber lid",
    `vec3 worldEye(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.62);
      vec3 c = mix(vec3(0.314, 0.251, 0.188), jGold(vec3(0.55, 0.38, 0.10)), jFill(length(q) - 0.035));
      c = mix(c, JOJO_INK, jFill(length(q) - 0.012));
      return mix(vec3(0.290, 0.290, 0.314), c, jFill(length(q / vec2(0.10, 0.05)) - 1.0));
    }`, "worldEye(p, t)"),
];
