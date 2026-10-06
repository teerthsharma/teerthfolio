import { defineModule as M } from "./kit.glsl.js";

const F = "cairo";

export const CAIRO = [
  M("cairoStone", F, "Cairo stone: 3-step cel, diagonal cut-shadow, screen hatch, 1.5px panel",
    `vec3 cairoStone(vec2 p, float t){
      float ndl = 0.55 + 0.45 * (p.y - 0.2) - 0.42 * jCut(p, 0.0);
      vec3 c = jCel3(ndl, 0.42, 0.70, vec3(0.125, 0.063, 0.227), vec3(0.541, 0.502, 0.627), vec3(0.784, 0.753, 0.816));
      c = mix(c, c * 0.55, jHatch(gl_FragCoord.xy, 5.0) * (1.0 - jAA(ndl, 0.42)) * 0.7);
      c = mix(c, c * 0.72, jPanel(p * 3.2, 1.5) * 0.5);
      return c;
    }`, "cairoStone(p, t)"),
  M("cairoStreet", F, "Vanishing hatch road: perspective u=x/(y+eps)",
    `vec3 cairoStreet(vec2 p, float t){
      float y = max(p.y, 0.02), u = (p.x - 0.72) / y, v = 1.0 / y;
      float lane = jLine(abs(u) - 0.18, 1.4);
      float hatch = jHatch(vec2(u * 80.0, v * 40.0), 4.0) * smoothstep(0.08, 0.35, y);
      vec3 c = jCel3(0.35 + 0.4 * y - 0.2 * hatch, 0.38, 0.62, vec3(0.086, 0.047, 0.141), vec3(0.251, 0.188, 0.282), vec3(0.420, 0.345, 0.400));
      return mix(c, JOJO_CITRUS * 0.55, lane * 0.65);
    }`, "cairoStreet(p, t)"),
  M("cairoBullseye", F, "Bullseye dome: 8 rings, 6-degree period, fwidth edges",
    `vec3 cairoBullseye(vec2 p, float t){
      vec2 q = p - vec2(0.72, 0.62); float rr = length(q) * 1.25 / 0.10472, f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      int i = int(floor(rr));
      vec3 a = i < 1 ? vec3(0.353, 0.165, 0.541) : (i < 3 ? JOJO_MAG : (i < 5 ? vec3(1.0, 0.604, 0.165) : vec3(0.098, 0.827, 1.0)));
      vec3 b = i < 2 ? JOJO_MAG : (i < 4 ? vec3(1.0, 0.604, 0.165) : vec3(0.227, 0.102, 0.227));
      return mix(a, b, smoothstep(0.0, w * 1.2, f));
    }`, "cairoBullseye(p, t)"),
  M("cairoStorm", F, "Sheared storm: hard iso + ink lip",
    `vec3 cairoStorm(vec2 p, float t){
      float n = jFbm(vec2(p.x * 2.6 + p.y * 3.4, p.y * 8.0 - p.x * 1.2)), aa = fwidth(n) + 1e-4;
      vec3 c = mix(vec3(0.353, 0.165, 0.541), vec3(0.227, 0.102, 0.227), 0.4);
      c = mix(c, c * 0.42 + vec3(0.125, 0.063, 0.227) * 0.38, smoothstep(0.58 - aa, 0.58 + aa, n) * 0.85);
      c = mix(c, JOJO_INK, (1.0 - smoothstep(0.0, aa * 2.2, abs(n - 0.58))) * 0.85);
      return c;
    }`, "cairoStorm(p, t)"),
  M("cairoHaze", F, "Flat horizon haze, apricot never white",
    `vec3 cairoHaze(vec2 p, float t){
      float el = p.y - 0.38, w = fwidth(el) + 1e-4;
      vec3 sky = mix(vec3(0.353, 0.165, 0.541), vec3(0.541, 0.102, 0.549), clamp(p.y, 0.0, 1.0));
      return mix(sky, vec3(0.541, 0.290, 0.667), 0.7 * (1.0 - smoothstep(0.03, 0.03 + w, el)));
    }`, "cairoHaze(p, t)"),
  M("cairoCrack", F, "Jagged 6-ray fissure, coral core, ink outline",
    `vec3 cairoCrack(vec2 p, float t){
      vec2 q = (p - vec2(0.72, 0.5)) * 2.2; float best = 1.0;
      for (int i = 0; i < 6; i++) {
        float fi = float(i), a = fi * 1.047; vec2 d = vec2(cos(a), sin(a));
        float tt = dot(q, d), n = dot(q, vec2(-d.y, d.x));
        float jag = (jVn(vec2(tt * 9.0, fi)) - 0.5) * 0.22 * (0.3 + tt);
        best = min(best, abs(n - jag) - 0.035 * (1.0 - clamp(tt / 0.95, 0.0, 1.0)));
      }
      vec3 col = mix(JOJO_INK, vec3(1.0, 0.416, 0.353), jFill(best));
      return mix(vec3(0.227, 0.102, 0.227), col, jFill(best + 0.02));
    }`, "cairoCrack(p, t)"),
  M("cairoLamp", F, "Sodium lamp disc + uEmit falloff",
    `vec3 cairoLamp(vec2 p, float t){
      float r = length(p - vec2(0.72, 0.78));
      vec3 c = vec3(0.125, 0.078, 0.196);
      c = mix(c, vec3(1.0, 0.722, 0.282) * (0.55 + jEmit(0.7)), 1.0 - jAA(r, 0.045));
      return c + vec3(1.0, 0.604, 0.165) * exp(-r * r * 28.0) * jEmit(0.8);
    }`, "cairoLamp(p, t)"),
  M("cairoValley", F, "Faceted valley: voronoi planes, complementary shade",
    `vec3 cairoValley(vec2 p, float t){
      vec2 v = jVor(p * 4.4); float facet = floor(v.x * 6.0) / 6.0;
      vec3 c = mix(vec3(0.078, 0.251, 0.227), vec3(0.227, 0.541, 0.353), facet);
      return mix(c, JOJO_INK, (1.0 - smoothstep(0.0, fwidth(v.y) * 0.8 + 1e-4, v.y)) * 0.55);
    }`, "cairoValley(p, t)"),
  M("cairoWater", F, "Reservoir two-tone cyan + cream strokes",
    `vec3 cairoWater(vec2 p, float t){
      float L = 0.3 + 0.5 * jFbm(p * 3.0);
      vec3 wc = mix(vec3(0.122, 0.373, 0.878), vec3(0.098, 0.827, 1.0), jAA(L, 0.45));
      float rv = p.y * 8.0, on = step(0.62, jVn(vec2(floor(p.x * 7.0), floor(rv))));
      return mix(wc, vec3(0.90, 0.85, 0.66), on * jLine(fract(rv) - 0.5, 1.3) * 0.85);
    }`, "cairoWater(p, t)"),
  M("cairoCrest", F, "Dam crest strip + railing polar saw ticks",
    `vec3 cairoCrest(vec2 p, float t){
      float band = abs(p.y - 0.42) - 0.07, rail = jSaw(p.x * 6.2831853 * 9.0, 1.0);
      vec3 c = jCel3(0.6 - 0.3 * jCut(p, 0.2), 0.42, 0.70, vec3(0.125, 0.094, 0.227), vec3(0.541, 0.502, 0.627), vec3(0.784, 0.753, 0.816));
      c = mix(c, JOJO_INK, (1.0 - smoothstep(0.04, 0.08, rail)) * jFill(abs(p.y - 0.50) - 0.012));
      return mix(vec3(0.227, 0.102, 0.227), c, jFill(band));
    }`, "cairoCrest(p, t)"),
  M("cairoNightViolet", F, "Violet-magenta dusk, complementary shadow hue",
    `vec3 cairoNightViolet(vec2 p, float t){
      float v = clamp(p.y * 0.85 + jFbm(p * 2.2) * 0.2, 0.0, 1.0);
      vec3 c = mix(vec3(0.125, 0.039, 0.227), vec3(0.815, 0.165, 0.604), jAA(v, 0.45));
      return mix(c, c * vec3(0.55, 0.45, 0.85), jCut(p, 0.4) * 0.4);
    }`, "cairoNightViolet(p, t)"),
  M("cairoPanelLine", F, "1.5px lattice only, fades under 4px",
    `vec3 cairoPanelLine(vec2 p, float t){
      return mix(vec3(0.502, 0.439, 0.565), vec3(0.125, 0.094, 0.188) * 0.8, jPanel(p * vec2(4.0, 2.5), 1.5) * 0.55);
    }`, "cairoPanelLine(p, t)"),
];
