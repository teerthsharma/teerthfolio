import { defineModule as M } from "./kit.glsl.js";

const F = "giorno";

export const GIORNO = [
  M("giornoHair", F, "Life-cel curls: spiral SDF, 3-step gold",
    `vec3 giornoHair(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.62); float a = atan(q.y, q.x), r = length(q);
      vec3 c = jCel3(0.5 + 0.3 * q.y - 0.2 * jCut(q, 0.2), 0.38, 0.66, vec3(0.725, 0.502, 0.094), vec3(0.914, 0.753, 0.094), vec3(0.973, 0.878, 0.541));
      c = mix(c, JOJO_INK, jLine(abs(r - 0.06 * (a + 3.2)) - 0.025, 1.3) * 0.65);
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(min(abs(r - 0.06 * (a + 3.2)) - 0.025, r - 0.22)));
    }`, "giornoHair(p, t)"),
  M("giornoLadybug", F, "Ladybug gold flake spots on pink field",
    `vec3 giornoLadybug(vec2 p, float t){
      vec2 id = floor(p * 9.0), f = fract(p * 9.0) - 0.5; float h = jH21(id);
      return mix(vec3(0.851, 0.522, 0.741), jGold(vec3(0.58, 0.40, 0.10)), jFill(length(f) - 0.16 * step(0.62, h)) * step(0.62, h));
    }`, "giornoLadybug(p, t)"),
  M("giornoGoldLife", F, "Wavelength gold life grade, plant-vein modulate",
    `vec3 giornoGoldLife(vec2 p, float t){
      float vein = abs(jFbm(p * 7.0) - 0.5);
      return mix(jGold(vec3(0.55, 0.38, 0.10) + vec3(0.12, 0.05, 0.0) * (1.0 - vein * 3.0)), vec3(0.227, 0.141, 0.063), jAA(vein, 0.08) * 0.25);
    }`, "giornoGoldLife(p, t)"),
  M("giornoJacket", F, "Pink jacket: 3-step, gold hem",
    `vec3 giornoJacket(vec2 p, float t){
      vec3 c = jCel3(0.48 + 0.28 * p.y - 0.25 * jCut(p, 0.15), 0.38, 0.64, vec3(0.722, 0.333, 0.604), vec3(0.851, 0.522, 0.741), vec3(0.925, 0.690, 0.816));
      return mix(c, jGold(vec3(0.6, 0.42, 0.12)), jFill(abs(p.y - 0.28) - 0.02));
    }`, "giornoJacket(p, t)"),
  M("giornoIris", F, "Green spoke iris: radial 12-saw",
    `vec3 giornoIris(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.55); float r = length(q), spoke = jSaw(atan(q.y, q.x), 12.0);
      vec3 c = mix(vec3(0.122, 0.478, 0.353), vec3(0.247, 0.749, 0.541), jAA(1.0 - r * 4.0, 0.4));
      c = mix(c, vec3(0.122, 0.478, 0.353) * 0.55, 1.0 - smoothstep(0.04, 0.08, spoke));
      c = mix(c, JOJO_INK, jFill(r - 0.025));
      return mix(vec3(0.227, 0.141, 0.165), c, jFill(r - 0.12));
    }`, "giornoIris(p, t)"),
  M("giornoRibbon", F, "Hair ribbon: heart-pink band, gold clasp",
    `vec3 giornoRibbon(vec2 p, float t){
      vec3 c = mix(vec3(0.914, 0.753, 0.094), vec3(0.890, 0.463, 0.624), jFill(abs(p.y - 0.70) - 0.03));
      return mix(c, jGold(vec3(0.6, 0.4, 0.12)), jFill(length(p - vec2(0.72, 0.70)) - 0.035));
    }`, "giornoRibbon(p, t)"),
  M("giornoCurl", F, "Single spiral curl SDF, 3-step blonde",
    `vec3 giornoCurl(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.5); float a = atan(q.y, q.x), r = length(q);
      vec3 c = jCel3(0.55 - 0.2 * a / 6.0, 0.38, 0.66, vec3(0.725, 0.502, 0.094), vec3(0.914, 0.753, 0.094), vec3(0.973, 0.878, 0.541));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(abs(r - 0.05 * a) - 0.02));
    }`, "giornoCurl(p, t)"),
  M("giornoLifeVein", F, "Plant vein: branching fbm iso, gold sap",
    `vec3 giornoLifeVein(vec2 p, float t){
      return mix(vec3(0.290, 0.353, 0.165), jGold(vec3(0.55, 0.38, 0.10)), jFill(abs(jFbm(p * 6.0 + vec2(0.0, p.x * 2.0)) - 0.5) - 0.025));
    }`, "giornoLifeVein(p, t)"),
  M("giornoBrooch", F, "Ladybug brooch: ellipse + 7 gold dots + split",
    `vec3 giornoBrooch(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.48); float body = length(q / vec2(0.10, 0.08)) - 1.0;
      vec3 c = mix(vec3(0.851, 0.522, 0.741), JOJO_INK, jLine(q.x, 1.4) * jFill(body));
      for (int i = 0; i < 7; i++) {
        float a = float(i) * 0.9 - 0.3;
        c = mix(c, jGold(vec3(0.58, 0.40, 0.10)), jFill(length(q - 0.045 * vec2(cos(a), sin(a) * 0.8)) - 0.012) * jFill(body));
      }
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(body));
    }`, "giornoBrooch(p, t)"),
  M("giornoSkin", F, "Warm flesh 3-step, no milk highlight",
    `vec3 giornoSkin(vec2 p, float t){
      return jCel3(0.52 + 0.35 * p.y - 0.22 * jCut(p, 0.1), 0.40, 0.68, vec3(0.690, 0.439, 0.353), vec3(0.910, 0.722, 0.565), vec3(0.965, 0.847, 0.722));
    }`, "giornoSkin(p, t)"),
  M("giornoSign", F, "Hand-sign shade: finger capsules, gold ring",
    `vec3 giornoSign(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.45); float d = length(q) - 0.08;
      for (int i = 0; i < 4; i++) {
        vec2 a = vec2(-0.04 + 0.03 * float(i), 0.06), b = a + vec2(0.0, 0.16), pa = q - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        d = min(d, length(pa - ba * h) - 0.018);
      }
      vec3 c = jCel3(0.55 + 0.2 * q.y, 0.40, 0.68, vec3(0.690, 0.439, 0.353), vec3(0.910, 0.722, 0.565), vec3(0.965, 0.847, 0.722));
      c = mix(c, jGold(vec3(0.55, 0.38, 0.10)), jFill(abs(length(q) - 0.07) - 0.008));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(d));
    }`, "giornoSign(p, t)"),
  M("giornoAura", F, "Gold life aura: radial emit, wavelength grade",
    `vec3 giornoAura(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.5));
      return vec3(0.227, 0.102, 0.227) + jGold(vec3(0.55, 0.38, 0.10)) * exp(-r * r * 8.0) * jEmit(0.85);
    }`, "giornoAura(p, t)"),
];
