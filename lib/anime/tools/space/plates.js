// Anime sky plates — 10 cel / ink / poster operators (JoJo, GER, night school).
import { T } from "./kit.glsl.js";

export const PLATES = [
  T("jojo-bullseye", "JoJo concentric value rings, slight shear, hard fwidth edges",
    `vec3 jojoBullseye(vec2 p) {
      vec2 q = p + vec2(p.y * 0.16, -p.x * 0.05);
      vec2 pol = spPolar(q, vec2(0.70, 0.64));
      float rr = pol.x / 0.07, f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.45);
      float band = floor(rr);
      vec3 pal0 = vec3(0.10, 0.07, 0.22), pal1 = vec3(0.18, 0.08, 0.28);
      vec3 pal2 = vec3(0.28, 0.10, 0.20), pal3 = vec3(0.08, 0.12, 0.26), pal4 = vec3(0.22, 0.16, 0.08);
      float ia = mod(max(band - 1.0, 0.0), 5.0), ib = mod(band, 5.0);
      vec3 a = band >= 8.0 ? SP_VOID : (ia < 1.0 ? pal0 : ia < 2.0 ? pal1 : ia < 3.0 ? pal2 : ia < 4.0 ? pal3 : pal4);
      vec3 b = band >= 8.0 ? SP_VOID : (ib < 1.0 ? pal0 : ib < 2.0 ? pal1 : ib < 3.0 ? pal2 : ib < 4.0 ? pal3 : pal4);
      return mix(a, b, smoothstep(0.0, w * 1.2, f));
    }`, "jojoBullseye(p)"),

  T("jojo-storm-sky", "sheared JoJo storm over bullseye rings, ink iso-edge",
    `vec3 jojoStormSky(vec2 p) {
      vec2 q = p + vec2(p.y * 0.14, 0.0);
      float rr = length(q - vec2(0.7, 0.62)) / 0.075;
      float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      vec3 ring = mix(vec3(0.12, 0.08, 0.24), vec3(0.22, 0.10, 0.18), smoothstep(0.0, w, f));
      vec2 s = vec2(p.x * 2.6 + p.y * 3.4, p.y * 8.0 - p.x * 1.2);
      float n = spFbm(s), aa = fwidth(n) + 1e-4;
      float cl = smoothstep(0.58 - aa, 0.58 + aa, n);
      float edge = 1.0 - smoothstep(0.0, aa * 2.2 + 0.004, abs(n - 0.58));
      vec3 c = mix(ring, ring * 0.42 + SP_INK * 0.38, cl * 0.85);
      return mix(c, SP_INK, edge * 0.8);
    }`, "jojoStormSky(p)"),

  T("ger-cosmos", "GER cosmos: gold requiem rings in a purple void",
    `vec3 gerCosmos(vec2 p) {
      vec2 pol = spPolar(p, vec2(0.72, 0.55));
      float rr = log(pol.x * 6.0 + 1.0) * 2.8, f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      vec3 voidc = vec3(0.06, 0.02, 0.12);
      vec3 gold = SP_GOLD * (0.35 + 0.25 * sin(floor(rr) * 1.4));
      vec3 ring = mix(voidc, gold, smoothstep(0.0, w, f) * step(mod(floor(rr), 2.0), 0.5));
      float clock = spRing(pol.x, 0.22, 0.004) + spRing(pol.x, 0.34, 0.003);
      return mix(ring, SP_GOLD * 0.55, clock);
    }`, "gerCosmos(p)"),

  T("night-school", "night school sky: sodium horizon, one moon, sparse stars",
    `vec3 nightSchool(vec2 p) {
      vec3 sky = mix(vec3(0.10, 0.06, 0.04), SP_VOID, smoothstep(0.12, 0.55, p.y));
      sky += vec3(0.42, 0.22, 0.06) * exp(-abs(p.y - 0.16) * 14.0) * 0.45;
      vec2 m = p - vec2(1.05, 0.72); float r = length(m);
      float mu = sqrt(max(0.0, 1.0 - (r / 0.07) * (r / 0.07)));
      sky = mix(sky, SP_MOON * (0.28 + 0.5 * pow(mu, 0.55)), spDisc(r, 0.07));
      vec2 gv = floor(p * 20.0), f = fract(p * 20.0) - 0.5;
      sky += SP_COLD * pow(spH21(gv), 8.0) * spAA(length(f) - 0.03) * 0.55;
      return sky;
    }`, "nightSchool(p)"),

  T("araki-field", "Araki outer field: flat far colour beyond the last ring",
    `vec3 arakiField(vec2 p) {
      float rr = length(p - vec2(0.68, 0.66)) / 0.08;
      float inside = 1.0 - step(8.0, rr);
      float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
      vec3 ring = mix(vec3(0.14, 0.08, 0.22), vec3(0.24, 0.12, 0.16), smoothstep(0.0, w, f));
      vec3 field = vec3(0.05, 0.04, 0.10);
      return mix(field, ring, inside);
    }`, "arakiField(p)"),

  T("manga-tone-sky", "screentone night: hashed dots over a 3-stop grade",
    `vec3 mangaToneSky(vec2 p) {
      vec3 g = spMix3(clamp(p.y, 0.0, 1.0), SP_INK, SP_VOID, SP_TEAL * 0.25);
      vec2 gv = floor(p * 48.0);
      float tone = step(spH21(gv), 0.18 + 0.35 * (1.0 - p.y));
      return mix(g, SP_INK * 1.4, tone * 0.55);
    }`, "mangaToneSky(p)"),

  T("cel-horizon", "cel-banded horizon: 4 flat elevation steps, fwidth",
    `vec3 celHorizon(vec2 p) {
      float x = clamp(p.y, 0.0, 1.0) * 4.0, f = fract(x), w = fwidth(x) + 1e-4;
      vec3 a = spMix3(floor(x) / 4.0, SP_EMBER * 0.3, SP_ORCH * 0.22, SP_VOID);
      vec3 b = spMix3(ceil(x) / 4.0, SP_EMBER * 0.3, SP_ORCH * 0.22, SP_VOID);
      return mix(a, b, smoothstep(0.0, w, f));
    }`, "celHorizon(p)"),

  T("ink-cloud-sky", "ink-edged cloud masses on a dark dome",
    `vec3 inkCloudSky(vec2 p) {
      vec3 sky = mix(SP_INK, SP_VOID, clamp(p.y, 0.0, 1.0));
      float n = spFbm(vec2(p.x * 2.4 + p.y * 1.8, p.y * 5.0));
      float aa = fwidth(n) + 1e-4;
      float cl = smoothstep(0.55 - aa, 0.55 + aa, n) * smoothstep(0.2, 0.45, p.y);
      float edge = 1.0 - smoothstep(0.0, aa * 2.0 + 0.005, abs(n - 0.55));
      vec3 c = mix(sky, sky * 0.5 + SP_INK, cl);
      return mix(c, SP_INK, edge * cl);
    }`, "inkCloudSky(p)"),

  T("poster-void", "posterised void: 4 flat density bands, orchid near core",
    `vec3 posterVoid(vec2 p) {
      float th = length(p - vec2(0.72, 0.55));
      float n = spFbm(p * 2.2);
      float dens = clamp(smoothstep(0.3, 0.8, n) + 0.45 * exp(-2.0 * th), 0.0, 1.0);
      float x = dens * 4.0, b = min(floor(x), 3.0);
      vec3 col = b < 0.5 ? SP_VOID : (b < 1.5 ? SP_TEAL * 0.4 : (b < 2.5 ? SP_ORCH * 0.55 : SP_ORCH * 0.75));
      float de = abs(x - floor(x + 0.5)), ink = (1.0 - smoothstep(0.7, 1.6, de / (fwidth(x) + 1e-4))) * step(0.5, x);
      return mix(col, SP_INK, ink * 0.85);
    }`, "posterVoid(p)"),

  T("cutscene-plate", "generic night plate: indigo dome, ecliptic wash, sparse catalog",
    `vec3 cutscenePlate(vec2 p) {
      vec3 sky = mix(SP_INK, SP_VOID * 1.2, clamp(p.y, 0.0, 1.0));
      float ecl = exp(-pow((p.y - (0.42 + 0.12 * p.x)) / 0.07, 2.0));
      sky += SP_GOLD * 0.08 * ecl;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 s = vec2(0.18 + 1.1 * spH21(vec2(fi, 4.0)), 0.3 + 0.55 * spH21(vec2(fi, 5.0)));
        sky += SP_HOT * 0.4 * spDisc(length(p - s), 0.006);
      }
      return sky;
    }`, "cutscenePlate(p)"),
];
