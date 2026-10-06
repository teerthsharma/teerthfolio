// Nebula pigments / inverse void / dust lanes — 20 density operators.
import { T } from "./kit.glsl.js";

export const NEBULAE = [
  T("nebula-fbm", "2–3 pigment fbm dust, luma-clamped, never milky",
    `vec3 nebulaFbm(vec2 p) {
      vec2 q = spWarp(p * 2.4, 0.55);
      float d = spFbm(q), r = spRidge(q * 1.4 + 3.0);
      vec3 pig = SP_ORCH * d + SP_TEAL * (1.0 - d) * 0.65 + SP_EMBER * r * 0.35;
      return SP_VOID + pig * smoothstep(0.28, 0.72, d) * 0.55;
    }`, "nebulaFbm(p)"),

  T("nebula-ridged", "ridged pigment only — folded noise, sharp spines",
    `vec3 nebulaRidged(vec2 p) {
      float r = spRidge(spWarp(p * 2.8, 0.4));
      float m = smoothstep(0.45, 0.85, r);
      return SP_VOID + mix(SP_TEAL, SP_ORCH, r) * m * 0.5;
    }`, "nebulaRidged(p)"),

  T("nebula-orchid", "orchid/violet MAPPA-ish bands, posterised 3 flats",
    `vec3 nebulaOrchid(vec2 p) {
      float n = spFbm(spWarp(p * 2.2, 0.7));
      float x = n * 3.0, b = floor(x), f = fract(x), w = fwidth(x) + 1e-4;
      vec3 c0 = SP_VOID, c1 = SP_TEAL * 0.45, c2 = SP_ORCH * 0.7;
      vec3 a = b < 0.5 ? c0 : (b < 1.5 ? c1 : c2);
      vec3 c = b < 0.5 ? c1 : (b < 1.5 ? c2 : SP_ORCH);
      return mix(a, c, smoothstep(0.0, w, f));
    }`, "nebulaOrchid(p)"),

  T("nebula-teal", "teal/copper pigment mix, cooler than orchid",
    `vec3 nebulaTeal(vec2 p) {
      float d = spFbm(p * 2.6 + 4.0), e = spFbm(p * 3.1 + 9.0);
      vec3 pig = SP_TEAL * d + SP_EMBER * e * 0.4;
      return SP_VOID + pig * smoothstep(0.32, 0.7, d) * 0.5;
    }`, "nebulaTeal(p)"),

  T("nebula-ember", "rust/ember pigment, warm knots in a cold field",
    `vec3 nebulaEmber(vec2 p) {
      float d = spRidge(p * 2.3);
      float knot = smoothstep(0.62, 0.88, d);
      return SP_VOID + SP_EMBER * knot * 0.65 + SP_HOT * knot * knot * 0.12;
    }`, "nebulaEmber(p)"),

  T("cosmic-void", "inverse nebula: density carves a cold well, not a glow",
    `vec3 cosmicVoid(vec2 p) {
      float d = spFbm(spWarp(p * 2.0, 0.5));
      float well = 1.0 - smoothstep(0.25, 0.7, d);
      vec3 cold = mix(SP_VOID, SP_INK, well);
      return mix(cold, SP_TEAL * 0.18, (1.0 - well) * 0.35);
    }`, "cosmicVoid(p)"),

  T("void-well", "deeper radial well — falloff from a hashed centre",
    `vec3 voidWell(vec2 p) {
      vec2 c = vec2(0.68, 0.55);
      float r = length(p - c);
      float n = spFbm(p * 3.0);
      float well = exp(-r * (2.4 + n));
      return mix(SP_VOID * 1.2 + SP_TEAL * 0.06, SP_INK, well);
    }`, "voidWell(p)"),

  T("dust-lane", "extinction lane: multiply-dark filament across the field",
    `vec3 dustLane(vec2 p) {
      vec3 field = SP_VOID + SP_ORCH * 0.12 * spFbm(p * 2.0);
      float lane = abs(p.y - 0.48 - 0.12 * sin(p.x * 3.2) - 0.04 * spFbm(p * 5.0));
      float ext = exp(-pow(lane / 0.05, 2.0));
      return field * (1.0 - 0.82 * ext);
    }`, "dustLane(p)"),

  T("dust-filament", "thin Voronoi-edge extinction threads",
    `vec3 dustFilament(vec2 p) {
      vec2 q = spWarp(p * 3.4, 0.45);
      vec2 i = floor(q), f = fract(q);
      float d1 = 8.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        d1 = min(d1, length(g + spH22(i + g) - f));
      }
      float thread = 1.0 - smoothstep(0.0, 0.06, abs(d1 - 0.22));
      return (SP_VOID + SP_TEAL * 0.1) * (1.0 - 0.75 * thread);
    }`, "dustFilament(p)"),

  T("dust-rift", "wide rift: a fat extinction band with noisy walls",
    `vec3 dustRift(vec2 p) {
      float n = 0.08 * spFbm(p * 6.0);
      float d = abs(p.y - 0.5 - 0.1 * p.x) - 0.09 - n;
      float rift = 1.0 - smoothstep(-0.02, 0.04, d);
      vec3 field = SP_VOID + SP_COLD * 0.1 * p.y;
      return mix(field, SP_INK, rift * 0.9);
    }`, "dustRift(p)"),

  T("pillar-dust", "pillars of creation: vertical extinction towers",
    `vec3 pillarDust(vec2 p) {
      float id = floor(p.x * 5.0);
      float cx = (id + 0.5) / 5.0;
      float w = 0.04 + 0.03 * spH21(vec2(id, 2.0));
      float h = 0.25 + 0.45 * spH21(vec2(id, 5.0));
      float col = exp(-pow((p.x - cx) / w, 2.0)) * (1.0 - smoothstep(0.15, 0.15 + h, p.y));
      col *= 0.7 + 0.3 * spFbm(p * 8.0 + id);
      return (SP_VOID + SP_EMBER * 0.08) * (1.0 - 0.8 * col);
    }`, "pillarDust(p)"),

  T("dark-globule", "Bok globule: compact round extinction blob",
    `vec3 darkGlobule(vec2 p) {
      vec2 c = vec2(0.7, 0.52);
      float r = length((p - c) / vec2(0.16, 0.11));
      float n = 0.15 * (spFbm(p * 7.0) - 0.5);
      float g = 1.0 - smoothstep(0.7, 1.05, r + n);
      return mix(SP_VOID + SP_ORCH * 0.1, SP_INK, g);
    }`, "darkGlobule(p)"),

  T("emission-knot", "bright emission knots sitting in dust, emit-split",
    `vec4 emissionKnot(vec2 p) {
      float n = spFbm(p * 4.2);
      float knot = smoothstep(0.72, 0.9, n);
      vec3 alb = SP_VOID + SP_EMBER * 0.2 * smoothstep(0.4, 0.7, n) + SP_HOT * knot * 0.25;
      return vec4(alb, spEmit(knot * 0.8));
    }`, "emissionKnot(p).rgb"),

  T("reflection-nebula", "blue scatter: albedo * (1 - dust) * forward lobe",
    `vec3 reflectionNebula(vec2 p) {
      float dust = smoothstep(0.35, 0.75, spFbm(p * 2.5));
      vec2 L = normalize(vec2(-0.3, 0.6));
      float lobe = pow(max(dot(normalize(p - vec2(0.5, 0.3)), L), 0.0), 3.0);
      return SP_VOID + SP_COLD * dust * (0.15 + 0.4 * lobe);
    }`, "reflectionNebula(p)"),

  T("molecular-ridge", "dense ridge: ridged noise as a molecular cloud spine",
    `vec3 molecularRidge(vec2 p) {
      vec2 q = vec2(p.x * 1.2, p.y * 3.4);
      float r = spRidge(q + 2.0);
      float spine = smoothstep(0.55, 0.9, r);
      return mix(SP_VOID, SP_INK + SP_ORCH * 0.12, spine);
    }`, "molecularRidge(p)"),

  T("cavity-bubble", "blown bubble: inverse disc with a bright rim",
    `vec3 cavityBubble(vec2 p) {
      float r = length(p - vec2(0.7, 0.55));
      float inside = spDisc(r, 0.22);
      float rim = spRing(r, 0.22, 0.012);
      vec3 field = SP_VOID + SP_ORCH * 0.14 * spFbm(p * 2.0);
      vec3 cav = mix(field, SP_INK * 1.2, 0.75);
      return mix(mix(field, cav, inside), field + SP_HOT * 0.15, rim);
    }`, "cavityBubble(p)"),

  T("ionization-front", "hard ionization front: step with fwidth, pigment flips",
    `vec3 ionizationFront(vec2 p) {
      float s = p.x * 1.3 + 0.25 * spFbm(p * 3.0) - 0.7;
      float aa = fwidth(s) + 1e-4;
      float front = smoothstep(-aa, aa, s);
      vec3 hi = SP_VOID + SP_TEAL * 0.22;
      vec3 lo = SP_VOID + SP_EMBER * 0.2;
      float lip = exp(-pow(s / 0.03, 2.0));
      return mix(lo, hi, front) + SP_HOT * lip * 0.12;
    }`, "ionizationFront(p)"),

  T("filament-web", "web of ridged filaments, additive faint glow in crossings",
    `vec3 filamentWeb(vec2 p) {
      float a = spRidge(p * 3.0), b = spRidge(p * 3.0 + vec2(4.1, 1.7));
      float web = smoothstep(0.62, 0.85, a) + smoothstep(0.62, 0.85, b);
      float x = smoothstep(0.7, 0.9, min(a, b));
      return SP_VOID + SP_TEAL * 0.18 * web + SP_COLD * 0.12 * x;
    }`, "filamentWeb(p)"),

  T("pigment-mix", "explicit 3-way pigment blend from two fbm channels",
    `vec3 pigmentMix(vec2 p) {
      float u = spFbm(p * 2.2), v = spFbm(p * 2.2 + 5.3);
      vec3 pig = u * SP_ORCH + v * SP_TEAL + (1.0 - u) * v * SP_EMBER;
      return SP_VOID + pig * 0.42 * smoothstep(0.25, 0.7, u + v);
    }`, "pigmentMix(p)"),

  T("inverse-dust", "inverse extinction: lanes glow, field stays dark",
    `vec3 inverseDust(vec2 p) {
      float lane = abs(p.y - 0.5 - 0.1 * sin(p.x * 2.5));
      float g = exp(-pow(lane / 0.04, 2.0)) * (0.5 + 0.5 * spFbm(p * 5.0));
      return SP_VOID + SP_ORCH * 0.35 * g;
    }`, "inverseDust(p)"),
];
