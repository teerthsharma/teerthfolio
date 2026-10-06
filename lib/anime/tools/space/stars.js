// Starfields / glints / constellations / clusters — 20 point operators.
import { T } from "./kit.glsl.js";

export const STARS = [
  T("starfield-hash", "hash starfield with magnitude power-law (bright rare)",
    `vec4 starfieldHash(vec2 p) {
      vec2 gv = floor(p * 28.0), f = fract(p * 28.0) - 0.5;
      float h = spH21(gv);
      float mag = pow(h, 6.0);
      float d = length(f - (spH22(gv + 3.0) - 0.5) * 0.35);
      float disc = spAA(d - (0.006 + 0.05 * mag));
      vec3 tint = mix(SP_COLD, SP_HOT, step(0.7, spH21(gv + 8.0)));
      vec3 alb = SP_VOID + tint * mag * disc * 0.85;
      return vec4(alb, spEmit(mag * disc));
    }`, "starfieldHash(p).rgb"),

  T("starfield-dense", "denser hash field, shallower power so more mid stars",
    `vec3 starfieldDense(vec2 p) {
      vec2 gv = floor(p * 40.0), f = fract(p * 40.0) - 0.5;
      float h = spH21(gv), mag = pow(h, 3.5);
      float d = length(f);
      return SP_VOID + SP_COLD * mag * spAA(d - 0.012) * 0.7;
    }`, "starfieldDense(p)"),

  T("star-glint4", "4-point astroid glints on bright stars only (mag gate)",
    `vec4 starGlint4(vec2 p) {
      vec2 gv = floor(p * 18.0), f = fract(p * 18.0) - 0.5;
      float h = spH21(gv), mag = pow(h, 7.0);
      float bright = step(0.35, mag);
      float d = bright > 0.5 ? (spSpike4(f * 2.4) - (0.35 + mag)) : (length(f) - 0.03);
      float cov = spAA(d);
      vec3 alb = SP_VOID + SP_HOT * cov * mag * 0.7;
      return vec4(alb, spEmit(cov * mag * bright));
    }`, "starGlint4(p).rgb"),

  T("star-spike6", "6-point diffraction spikes, bright stars only",
    `vec4 starSpike6(vec2 p) {
      vec2 gv = floor(p * 16.0), f = fract(p * 16.0) - 0.5;
      float h = spH21(gv), mag = pow(h, 7.5);
      float d = step(0.4, mag) > 0.5 ? spSpike6(f * 1.8) : (length(f) - 0.02);
      float cov = spAA(d);
      return vec4(SP_VOID + SP_COLD * cov * 0.65, spEmit(cov * mag));
    }`, "starSpike6(p).rgb"),

  T("constellation-hair", "sparse hairline asterism: hashed node pairs, fwidth lines",
    `vec3 constellationHair(vec2 p) {
      vec3 c = SP_VOID;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 a = vec2(0.15 + 1.15 * spH21(vec2(fi, 1.0)), 0.25 + 0.6 * spH21(vec2(fi, 2.0)));
        vec2 b = vec2(0.15 + 1.15 * spH21(vec2(fi, 3.0)), 0.25 + 0.6 * spH21(vec2(fi, 4.0)));
        vec2 ab = b - a; float l2 = max(dot(ab, ab), 1e-5);
        float u = clamp(dot(p - a, ab) / l2, 0.0, 1.0);
        float d = length(p - a - ab * u);
        c += SP_COLD * 0.45 * spAA(d - 0.0012);
        c += SP_HOT * 0.35 * spDisc(length(p - a), 0.007);
      }
      return c;
    }`, "constellationHair(p)"),

  T("constellation-arc", "curved asterism: quadratic hairline through three hashes",
    `vec3 constellationArc(vec2 p) {
      vec2 a = vec2(0.25, 0.35), b = vec2(0.72, 0.78), c = vec2(1.15, 0.40);
      vec3 col = SP_VOID;
      float acc = 0.0;
      for (int i = 0; i < 12; i++) {
        float t = float(i) / 11.0;
        vec2 q = mix(mix(a, b, t), mix(b, c, t), t);
        acc += spDisc(length(p - q), 0.004);
        col += SP_HOT * 0.4 * spDisc(length(p - q), 0.008) * step(mod(float(i), 3.0), 0.5);
      }
      return col + SP_COLD * 0.25 * acc;
    }`, "constellationArc(p)"),

  T("cluster-globular", "packed globular: radial density falloff, power-law mags",
    `vec3 clusterGlobular(vec2 p) {
      vec2 c = vec2(0.72, 0.55), q = (p - c) * 14.0;
      vec2 gv = floor(q), f = fract(q) - 0.5;
      float rad = length(gv) / 8.0;
      float keep = step(spH21(gv), exp(-rad * 2.2));
      float mag = pow(spH21(gv + 2.0), 4.0);
      float d = length(f);
      return SP_VOID + SP_HOT * keep * mag * spAA(d - 0.08) * 0.75;
    }`, "clusterGlobular(p)"),

  T("cluster-open", "loose open cluster: few hashed members, shared proper motion tilt",
    `vec3 clusterOpen(vec2 p) {
      vec3 c = SP_VOID;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        vec2 s = vec2(0.55, 0.5) + vec2(spH21(vec2(fi, 1.2)) - 0.5, spH21(vec2(fi, 2.2)) - 0.5) * vec2(0.35, 0.18);
        c += SP_COLD * 0.7 * pow(spH21(vec2(fi, 3.0)), 2.0) * spDisc(length(p - s), 0.008);
      }
      return c;
    }`, "clusterOpen(p)"),

  T("star-color-temp", "temperature-tinted field: O/B blue to K/M ember by hash",
    `vec3 starColorTemp(vec2 p) {
      vec2 gv = floor(p * 26.0), f = fract(p * 26.0) - 0.5;
      float teff = spH21(gv);
      vec3 tint = teff < 0.35 ? SP_COLD : (teff < 0.7 ? SP_MOON : SP_EMBER);
      float mag = pow(spH21(gv + 4.0), 5.5);
      return SP_VOID + tint * mag * spAA(length(f) - 0.03) * 0.8;
    }`, "starColorTemp(p)"),

  T("milky-grain", "unresolved grain: cheap fbm as faint stellar continuum",
    `vec3 milkyGrain(vec2 p) {
      float g = spFbm(p * 18.0);
      float band = exp(-pow((p.y - 0.5) / 0.18, 2.0));
      return SP_VOID + SP_MOON * 0.12 * g * band;
    }`, "milkyGrain(p)"),

  T("binary-pair", "hashed close pairs: two discs with a shared barycentre",
    `vec3 binaryPair(vec2 p) {
      vec2 gv = floor(p * 10.0), f = fract(p * 10.0) - 0.5;
      float pair = step(0.82, spH21(gv));
      float ang = spH21(gv + 1.0) * 6.28318;
      vec2 off = vec2(cos(ang), sin(ang)) * 0.12;
      float a = spAA(length(f - off) - 0.04), b = spAA(length(f + off) - 0.03);
      return SP_VOID + pair * (SP_HOT * a * 0.55 + SP_COLD * b * 0.45);
    }`, "binaryPair(p)"),

  T("variable-twinkle", "stepped twinkle: magnitude gated by floor(t*12)",
    `vec3 variableTwinkle(vec2 p, float t) {
      vec2 gv = floor(p * 22.0), f = fract(p * 22.0) - 0.5;
      float tw = 0.55 + 0.45 * sin(floor(t * 12.0 + spH21(gv) * 40.0));
      float mag = pow(spH21(gv), 5.0) * tw;
      return SP_VOID + SP_COLD * mag * spAA(length(f) - 0.035);
    }`, "variableTwinkle(p, t)"),

  T("star-trail-arc", "circular star trails about a pole — long-exposure operator",
    `vec3 starTrailArc(vec2 p) {
      vec2 c = vec2(0.72, 0.62); vec2 q = p - c;
      float r = length(q), th = atan(q.y, q.x);
      float id = floor(r * 16.0);
      float keep = step(0.78, spH21(vec2(id, 2.0)));
      float a0 = spH21(vec2(id, 3.0)) * 6.2832, span = 0.7 + 1.4 * spH21(vec2(id, 4.0));
      float ang = mod(th - a0 + 3.14159, 6.28318) - 3.14159;
      float on = keep * step(0.0, ang) * step(ang, span) * spRing(r, (id + 0.5) / 16.0, 0.004);
      return SP_VOID + SP_COLD * 0.4 * on;
    }`, "starTrailArc(p)"),

  T("magnitude-ladder", "explicit power-law ladder: five bins, rare bright",
    `vec3 magnitudeLadder(vec2 p) {
      float x = p.x / 1.4, bin = floor(x * 5.0);
      float mag = pow(0.45, bin);
      vec2 gv = floor(vec2(p.x, p.y) * vec2(8.0, 20.0)), f = fract(vec2(p.x, p.y) * vec2(8.0, 20.0)) - 0.5;
      float keep = step(spH21(gv), 0.15 + 0.2 * (4.0 - bin) / 4.0);
      return SP_VOID + SP_MOON * mag * keep * spAA(length(f) - 0.08);
    }`, "magnitudeLadder(p)"),

  T("asterism-box", "box asterism: four nodes + hairlines",
    `vec3 asterismBox(vec2 p) {
      vec2 n0 = vec2(0.45, 0.38), n1 = vec2(0.95, 0.40), n2 = vec2(0.92, 0.72), n3 = vec2(0.48, 0.70);
      vec3 c = SP_VOID;
      vec2 pts[4]; pts[0]=n0; pts[1]=n1; pts[2]=n2; pts[3]=n3;
      for (int i = 0; i < 4; i++) {
        int j = i == 3 ? 0 : i + 1;
        vec2 a = pts[i], b = pts[j];
        vec2 ab = b - a; float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
        c += SP_COLD * 0.4 * spAA(length(p - a - ab * u) - 0.001);
        c += SP_HOT * 0.45 * spDisc(length(p - a), 0.008);
      }
      return c;
    }`, "asterismBox(p)"),

  T("south-cross", "cross asterism: two intersecting hairlines + 5 discs",
    `vec3 southCross(vec2 p) {
      vec2 c = vec2(0.78, 0.58);
      float d1 = abs((p.x - c.x) * 0.6 + (p.y - c.y) * 1.0);
      float d2 = abs((p.x - c.x) * 1.0 - (p.y - c.y) * 0.35);
      float arm = max(spAA(d1 - 0.0015) * step(abs(p.y - c.y), 0.16), spAA(d2 - 0.0015) * step(abs(p.x - c.x), 0.12));
      vec3 col = SP_VOID + SP_COLD * 0.35 * arm;
      col += SP_HOT * 0.5 * spDisc(length(p - c), 0.01);
      col += SP_COLD * 0.4 * spDisc(length(p - (c + vec2(0.08, 0.12))), 0.007);
      return col;
    }`, "southCross(p)"),

  T("stray-nova", "one hashed bright transient against a faint field",
    `vec4 strayNova(vec2 p, float t) {
      vec2 nv = vec2(0.82, 0.64);
      float pulse = 0.5 + 0.5 * sin(t * 1.7);
      float nova = spDisc(length(p - nv), 0.018) + 0.45 * spAA(spSpike4((p - nv) * 8.0) - 0.5);
      vec3 field = SP_VOID;
      vec2 gv = floor(p * 32.0), f = fract(p * 32.0) - 0.5;
      field += SP_COLD * pow(spH21(gv), 6.0) * spAA(length(f) - 0.02) * 0.4;
      return vec4(field + SP_HOT * nova * pulse * 0.55, spEmit(nova * pulse));
    }`, "strayNova(p, t).rgb"),

  T("faint-field", "dim-only field: power 10, no glints",
    `vec3 faintField(vec2 p) {
      vec2 gv = floor(p * 36.0), f = fract(p * 36.0) - 0.5;
      float mag = pow(spH21(gv), 10.0);
      return SP_VOID + SP_COLD * mag * spAA(length(f) - 0.025) * 0.9;
    }`, "faintField(p)"),

  T("bright-catalog", "few catalog-bright stars, no dust of faint ones",
    `vec4 brightCatalog(vec2 p) {
      vec3 c = SP_VOID; float e = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        vec2 s = vec2(0.2 + 1.05 * spH21(vec2(fi, 8.0)), 0.22 + 0.62 * spH21(vec2(fi, 9.0)));
        float d = length(p - s);
        float disc = spDisc(d, 0.01), spike = spAA(spSpike4((p - s) * 14.0) - 0.45);
        c += SP_HOT * 0.5 * max(disc, spike * 0.6);
        e += disc;
      }
      return vec4(c, spEmit(e));
    }`, "brightCatalog(p).rgb"),

  T("halo-cluster", "cluster plus a spherical halo of fainter members",
    `vec3 haloCluster(vec2 p) {
      vec2 c = vec2(0.7, 0.56), q = (p - c) * 12.0;
      vec2 gv = floor(q), f = fract(q) - 0.5;
      float rad = length(q);
      float core = step(spH21(gv), exp(-rad * 3.0));
      float halo = step(spH21(gv + 7.0), 0.08 * exp(-rad * 0.55));
      float mag = pow(spH21(gv + 2.0), 3.0);
      return SP_VOID + SP_HOT * core * mag * spAA(length(f) - 0.1) + SP_COLD * halo * 0.35 * spAA(length(f) - 0.06);
    }`, "haloCluster(p)"),
];
