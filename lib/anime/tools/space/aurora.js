// Aurora / corona / zodiacal / galactic plane — 15 sheet-and-wash operators.
import { T } from "./kit.glsl.js";

export const AURORA = [
  T("aurora-curtains", "vertical aurora sheets, warped in x, green/violet",
    `vec3 auroraCurtains(vec2 p) {
      float x = p.x + 0.12 * spFbm(vec2(p.x * 2.0, p.y * 4.0));
      float sheet = exp(-pow(sin(x * 9.0) / 0.35, 2.0)) * smoothstep(0.15, 0.45, p.y) * (1.0 - smoothstep(0.75, 0.95, p.y));
      float fold = 0.6 + 0.4 * spFbm(vec2(x * 6.0, p.y * 3.0));
      vec3 pig = mix(vec3(0.10, 0.42, 0.22), SP_ORCH, smoothstep(0.55, 0.85, p.y));
      return SP_VOID + pig * sheet * fold * 0.55;
    }`, "auroraCurtains(p)"),

  T("aurora-fold", "folded curtains: two interfering sheet frequencies",
    `vec3 auroraFold(vec2 p) {
      float s1 = exp(-pow(sin(p.x * 7.0 + 0.4 * spFbm(p * 3.0)) / 0.4, 2.0));
      float s2 = exp(-pow(sin(p.x * 11.0 - p.y * 2.0) / 0.45, 2.0));
      float h = smoothstep(0.2, 0.5, p.y) * (1.0 - smoothstep(0.8, 0.98, p.y));
      return SP_VOID + vec3(0.12, 0.38, 0.28) * s1 * h * 0.45 + SP_ORCH * s2 * h * 0.25;
    }`, "auroraFold(p)"),

  T("aurora-corona", "coronal aurora: rays from a polar point",
    `vec3 auroraCorona(vec2 p) {
      vec2 q = p - vec2(0.72, 0.92);
      float th = atan(q.x, -q.y), r = length(q);
      float ray = pow(0.5 + 0.5 * cos(th * 9.0 + 1.5 * spFbm(vec2(th * 3.0, r * 4.0))), 3.0);
      float fall = exp(-r * 2.2);
      return SP_VOID + vec3(0.14, 0.40, 0.30) * ray * fall * 0.55;
    }`, "auroraCorona(p)"),

  T("solar-corona", "solar corona streamers from a disc, emit-split",
    `vec4 solarCorona(vec2 p) {
      vec2 c = vec2(0.72, 0.50), q = p - c;
      float r = length(q), th = atan(q.y, q.x);
      float disc = spDisc(r, 0.11);
      float stream = pow(0.5 + 0.5 * cos(th * 7.0 + 0.8 * spRidge(vec2(th * 2.0, r * 3.0))), 2.8);
      float fall = smoothstep(0.11, 0.14, r) * exp(-(r - 0.11) * 6.0);
      vec3 col = mix(SP_VOID + SP_HOT * 0.35 * stream * fall, SP_HOT * 0.55, disc);
      return vec4(col, spEmit(disc * 0.4 + stream * fall * 0.5));
    }`, "solarCorona(p).rgb"),

  T("corona-helmet", "helmet streamers: wide equatorial fans, polar holes",
    `vec4 coronaHelmet(vec2 p) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q), th = atan(q.y, q.x);
      float eq = pow(abs(cos(th)), 2.4);
      float stream = eq * exp(-(r - 0.12) * 5.0) * smoothstep(0.12, 0.15, r);
      float disc = spDisc(r, 0.12);
      vec3 col = mix(SP_VOID + SP_GOLD * 0.4 * stream, SP_HOT * 0.5, disc);
      return vec4(col, spEmit(stream + disc * 0.3));
    }`, "coronaHelmet(p).rgb"),

  T("zodiacal-wedge", "zodiacal light: a wedge along the ecliptic",
    `vec3 zodiacalWedge(vec2 p) {
      vec2 a = vec2(0.15, 0.18), b = vec2(1.2, 0.42);
      vec2 ab = b - a;
      float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float d = length(p - a - ab * u);
      float w = 0.03 + 0.12 * u;
      float wedge = exp(-pow(d / w, 2.0)) * (1.0 - u);
      return SP_VOID + SP_GOLD * 0.28 * wedge + SP_HOT * 0.08 * wedge;
    }`, "zodiacalWedge(p)"),

  T("gegenschein", "anti-solar glow: faint oval opposite the sun",
    `vec3 gegenschein(vec2 p) {
      float g = exp(-length((p - vec2(0.95, 0.55)) / vec2(0.22, 0.12)) * 2.4);
      return SP_VOID + SP_MOON * 0.16 * g;
    }`, "gegenschein(p)"),

  T("galactic-wash", "galactic plane wash: thick dusty band",
    `vec3 galacticWash(vec2 p) {
      float d = abs(p.y - (0.48 + 0.08 * p.x));
      float band = exp(-pow(d / 0.11, 2.0));
      float dust = 0.6 + 0.4 * spFbm(p * 4.0);
      return SP_VOID + mix(SP_EMBER, SP_ORCH, p.x) * 0.22 * band * dust;
    }`, "galacticWash(p)"),

  T("galactic-bulge", "central bulge: radial falloff on the plane",
    `vec3 galacticBulge(vec2 p) {
      vec2 c = vec2(0.72, 0.50);
      float plane = exp(-pow((p.y - c.y) / 0.08, 2.0));
      float bulge = exp(-length((p - c) / vec2(0.22, 0.12)) * 2.0);
      return SP_VOID + SP_GOLD * 0.2 * plane + SP_EMBER * 0.35 * bulge;
    }`, "galacticBulge(p)"),

  T("galactic-dust", "plane plus dark dust lanes cutting the wash",
    `vec3 galacticDust(vec2 p) {
      float d = abs(p.y - 0.5);
      float band = exp(-pow(d / 0.12, 2.0));
      float lane = exp(-pow(abs(p.y - 0.5 - 0.03 * sin(p.x * 8.0)) / 0.02, 2.0));
      vec3 wash = SP_VOID + SP_ORCH * 0.2 * band * (0.5 + 0.5 * spFbm(p * 3.5));
      return wash * (1.0 - 0.75 * lane);
    }`, "galacticDust(p)"),

  T("airglow-bands", "stacked airglow layers at two elevations",
    `vec3 airglowBands(vec2 p) {
      float a = exp(-pow((p.y - 0.28) / 0.02, 2.0));
      float b = exp(-pow((p.y - 0.36) / 0.018, 2.0));
      return SP_VOID + vec3(0.10, 0.36, 0.22) * a * 0.45 + vec3(0.16, 0.22, 0.40) * b * 0.35;
    }`, "airglowBands(p)"),

  T("fcorona-dust", "F-corona: dust-scattered sunlight, elongated",
    `vec3 fcoronaDust(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.3, 0.7);
      float r = length(q);
      float disc = spDisc(length(p - vec2(0.72, 0.50)), 0.09);
      float f = exp(-r * 3.2) * (1.0 - disc);
      return mix(SP_VOID + SP_GOLD * 0.3 * f, SP_HOT * 0.45, disc);
    }`, "fcoronaDust(p)"),

  T("kcorona-electron", "K-corona: electron scatter, more spherical, streamer-modulated",
    `vec3 kcoronaElectron(vec2 p) {
      vec2 q = p - vec2(0.72, 0.50);
      float r = length(q), th = atan(q.y, q.x);
      float disc = spDisc(r, 0.1);
      float k = exp(-(r - 0.1) * 8.0) * (0.5 + 0.5 * pow(abs(cos(th * 2.0)), 1.5)) * (1.0 - disc);
      return mix(SP_VOID + SP_MOON * 0.35 * k, SP_HOT * 0.5, disc);
    }`, "kcoronaElectron(p)"),

  T("plane-warp", "warped galactic plane: midplane is a sinusoid",
    `vec3 planeWarp(vec2 p) {
      float y0 = 0.48 + 0.07 * sin(p.x * 3.5);
      float band = exp(-pow((p.y - y0) / 0.09, 2.0));
      return SP_VOID + SP_EMBER * 0.22 * band * (0.5 + 0.5 * spFbm(p * 4.0));
    }`, "planeWarp(p)"),

  T("ecliptic-dust", "ecliptic dust band, thinner and gold-er than the galaxy",
    `vec3 eclipticDust(vec2 p) {
      float d = abs(p.y - (0.40 + 0.16 * p.x));
      float band = exp(-pow(d / 0.045, 2.0));
      return SP_VOID + SP_GOLD * 0.2 * band;
    }`, "eclipticDust(p)"),
];
