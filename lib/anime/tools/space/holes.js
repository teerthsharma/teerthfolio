// Black holes / lens / Einstein / photon ring / eyed hole — 20 relativity operators.
import { T } from "./kit.glsl.js";

export const HOLES = [
  T("schwarzschild-lens", "clamped 1/r UV warp — Schwarzschild-ish deflection",
    `vec2 schwarzschildLens(vec2 uv, vec2 c, float rs) {
      vec2 d = uv - c; float r = length(d);
      float k = rs / max(r, rs * 0.38);
      return uv + normalize(d + 1e-5) * k * 0.22;
    }
    vec3 schwarzschildLensDemo(vec2 p) {
      vec2 u = schwarzschildLens(p, vec2(0.72, 0.52), 0.12);
      float grid = abs(sin(u.x * 28.0)) * abs(sin(u.y * 28.0));
      float hole = spDisc(length(p - vec2(0.72, 0.52)), 0.06);
      vec3 plate = mix(SP_VOID, SP_TEAL * 0.35, smoothstep(0.7, 1.0, grid));
      return mix(plate, SP_INK, hole);
    }`, "schwarzschildLensDemo(p)"),

  T("einstein-ring", "Einstein ring: on-axis source mapped to a thin annulus",
    `vec3 einsteinRing(vec2 p) {
      vec2 c = vec2(0.72, 0.54); float r = length(p - c);
      vec2 u = p - c; float defl = 0.14 / max(r, 0.05);
      vec2 src = u * (1.0 - defl);
      float plate = 0.55 * exp(-length(src) * 14.0) + 0.12 * spFbm(src * 8.0);
      float ring = spRing(r, 0.16, 0.012);
      float hole = spDisc(r, 0.05);
      vec3 col = SP_VOID + SP_COLD * plate * 0.45 + SP_HOT * ring * 0.4;
      return mix(col, SP_INK, hole);
    }`, "einsteinRing(p)"),

  T("eyed-hole", "eyed black hole: dark interior, bright annulus, photon ring",
    `vec4 eyedHole(vec2 p) {
      vec2 c = vec2(0.72, 0.52); float r = length(p - c);
      float hole = spDisc(r, 0.09);
      float eye = spRing(r, 0.118, 0.022);
      float photon = spRing(r, 0.148, 0.006);
      vec3 col = SP_VOID;
      col = mix(col, SP_EMBER * 0.55 + SP_HOT * 0.2, eye);
      col = mix(col, SP_MOON * 0.7, photon);
      col = mix(col, SP_INK, hole);
      return vec4(col, spEmit(photon + eye * 0.35));
    }`, "eyedHole(p).rgb"),

  T("photon-ring", "photon ring only — thin critical orbit, fwidth",
    `vec4 photonRing(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      float ring = spRing(r, 0.15, 0.0045);
      float hole = spDisc(r, 0.10);
      vec3 col = mix(SP_VOID, SP_INK, hole);
      return vec4(mix(col, SP_MOON * 0.75, ring), spEmit(ring));
    }`, "photonRing(p).rgb"),

  T("event-horizon", "event-horizon disc, fwidth edge, no glow",
    `vec3 eventHorizon(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      return mix(SP_VOID * 1.15, SP_INK, spDisc(r, 0.11));
    }`, "eventHorizon(p)"),

  T("kerr-shear", "frame-drag shear: angular offset ~ a/r^2",
    `vec3 kerrShear(vec2 p) {
      vec2 c = vec2(0.72, 0.52), q = p - c;
      float r = length(q), th = atan(q.y, q.x);
      float a = 0.7, shear = a / max(r * r, 0.02);
      float th2 = th + shear;
      vec2 u = vec2(cos(th2), sin(th2)) * r;
      float grid = abs(sin((u.x + c.x) * 24.0) * sin((u.y + c.y) * 24.0));
      float hole = spDisc(r, 0.07);
      vec3 plate = mix(SP_VOID, SP_ORCH * 0.3, smoothstep(0.65, 1.0, grid));
      return mix(plate, SP_INK, hole);
    }`, "kerrShear(p)"),

  T("lens-caustic", "diamond caustic from a 1/r lens on a bright plate",
    `vec3 lensCaustic(vec2 p) {
      vec2 c = vec2(0.7, 0.5), d = p - c; float r = length(d);
      float k = 0.16 / max(r, 0.06);
      vec2 u = p + normalize(d + 1e-5) * k;
      float dia = abs(u.x - c.x) + abs(u.y - c.y);
      float cau = 1.0 - smoothstep(0.10, 0.16, dia);
      float hole = spDisc(r, 0.05);
      vec3 col = SP_VOID + SP_HOT * cau * 0.35;
      return mix(col, SP_INK, hole);
    }`, "lensCaustic(p)"),

  T("multi-einstein", "nested Einstein rings from two source distances",
    `vec3 multiEinstein(vec2 p) {
      float r = length(p - vec2(0.72, 0.54));
      float r1 = spRing(r, 0.13, 0.008), r2 = spRing(r, 0.21, 0.007);
      float hole = spDisc(r, 0.05);
      vec3 col = SP_VOID + SP_COLD * r1 * 0.45 + SP_ORCH * r2 * 0.35;
      return mix(col, SP_INK, hole);
    }`, "multiEinstein(p)"),

  T("void-lens", "lens of an empty field — warp visible only as a dim grid",
    `vec3 voidLens(vec2 p) {
      vec2 c = vec2(0.72, 0.52), d = p - c; float r = length(d);
      float k = 0.18 / max(r, 0.07);
      vec2 u = p + normalize(d + 1e-5) * k;
      float g = step(0.92, abs(sin(u.x * 40.0))) + step(0.92, abs(sin(u.y * 40.0)));
      return SP_VOID + SP_TEAL * 0.18 * g * (1.0 - spDisc(r, 0.05));
    }`, "voidLens(p)"),

  T("hole-silhouette", "pure shadow silhouette on a faint plate",
    `vec3 holeSilhouette(vec2 p) {
      vec3 plate = SP_VOID + SP_TEAL * 0.08 * spFbm(p * 3.0);
      return mix(plate, SP_INK, spDisc(length(p - vec2(0.72, 0.52)), 0.13));
    }`, "holeSilhouette(p)"),

  T("photon-bundle", "stacked photon rings — 3 close critical orbits",
    `vec4 photonBundle(vec2 p) {
      float r = length(p - vec2(0.72, 0.52));
      float b = spRing(r, 0.142, 0.0035) + 0.6 * spRing(r, 0.155, 0.0028) + 0.35 * spRing(r, 0.166, 0.0022);
      float hole = spDisc(r, 0.11);
      vec3 col = mix(SP_VOID, SP_INK, hole);
      return vec4(mix(col, SP_MOON * 0.65, clamp(b, 0.0, 1.0)), spEmit(b));
    }`, "photonBundle(p).rgb"),

  T("grav-arc", "giant gravitational arc — partial Einstein ring",
    `vec3 gravArc(vec2 p) {
      vec2 q = p - vec2(0.62, 0.50);
      float r = length(q), th = atan(q.y, q.x);
      float arc = spRing(r, 0.28, 0.014) * smoothstep(0.4, 0.1, abs(th - 0.6));
      float hole = spDisc(length(p - vec2(0.72, 0.52)), 0.06);
      vec3 col = SP_VOID + SP_ORCH * 0.4 * arc;
      return mix(col, SP_INK, hole);
    }`, "gravArc(p)"),

  T("micro-lens", "stellar microlens: small 1/r bump on a background star",
    `vec3 microLens(vec2 p) {
      vec2 c = vec2(0.7, 0.55), d = p - c; float r = length(d);
      float k = 0.03 / max(r, 0.02);
      vec2 u = p + normalize(d + 1e-5) * k;
      float star = exp(-length(u - vec2(0.74, 0.57)) * 40.0);
      return SP_VOID + SP_HOT * star * 0.7;
    }`, "microLens(p)"),

  T("warp-well", "deep 1/r well — stronger clamp, more deflection",
    `vec3 warpWell(vec2 p) {
      vec2 c = vec2(0.72, 0.52), d = p - c; float r = length(d);
      float k = 0.32 / max(r, 0.05);
      vec2 u = p + normalize(d + 1e-5) * k;
      float n = spFbm(u * 4.0);
      float hole = spDisc(r, 0.055);
      vec3 col = SP_VOID + SP_TEAL * 0.25 * n;
      return mix(col, SP_INK, hole);
    }`, "warpWell(p)"),

  T("isco-edge", "ISCO bright edge — innermost stable orbit as a hard ring",
    `vec4 iscoEdge(vec2 p) {
      float r = length((p - vec2(0.72, 0.52)) / vec2(1.0, 0.38));
      float isco = spRing(r, 0.20, 0.01);
      float hole = spDisc(r, 0.09);
      vec3 col = mix(SP_VOID, SP_INK, hole);
      return vec4(mix(col, SP_HOT * 0.65, isco), spEmit(isco));
    }`, "iscoEdge(p).rgb"),

  T("shadow-crescent", "crescent shadow from an offset bright disc",
    `vec3 shadowCrescent(vec2 p) {
      vec2 c = vec2(0.72, 0.52);
      float hole = spDisc(length(p - c), 0.12);
      float lit = spDisc(length(p - (c + vec2(0.05, 0.02))), 0.14);
      float cres = lit * (1.0 - hole);
      return SP_VOID + SP_EMBER * 0.45 * cres;
    }`, "shadowCrescent(p)"),

  T("dual-hole", "two shadows with overlapping 1/r wells",
    `vec3 dualHole(vec2 p) {
      vec2 a = vec2(0.58, 0.52), b = vec2(0.90, 0.54);
      vec2 da = p - a, db = p - b;
      float ka = 0.1 / max(length(da), 0.05), kb = 0.08 / max(length(db), 0.05);
      vec2 u = p + normalize(da + 1e-5) * ka + normalize(db + 1e-5) * kb;
      float g = abs(sin(u.x * 22.0) * sin(u.y * 22.0));
      float holes = max(spDisc(length(da), 0.05), spDisc(length(db), 0.04));
      return mix(SP_VOID + SP_ORCH * 0.22 * smoothstep(0.6, 1.0, g), SP_INK, holes);
    }`, "dualHole(p)"),

  T("lens-grid", "warped background plate — cartesian grid through 1/r",
    `vec3 lensGrid(vec2 p) {
      vec2 c = vec2(0.72, 0.52), d = p - c; float r = length(d);
      vec2 u = p + normalize(d + 1e-5) * (0.2 / max(r, 0.06));
      float gx = abs(fract(u.x * 12.0) - 0.5), gy = abs(fract(u.y * 12.0) - 0.5);
      float line = spAA(min(gx, gy) - 0.012);
      return mix(SP_VOID, SP_TEAL * 0.35, line * (1.0 - spDisc(r, 0.05)));
    }`, "lensGrid(p)"),

  T("critical-curve", "critical curve: locus of infinite magnification, fwidth",
    `vec3 criticalCurve(vec2 p) {
      vec2 c = vec2(0.72, 0.52); float r = length(p - c);
      float crit = spRing(r, 0.19, 0.005);
      float hole = spDisc(r, 0.07);
      vec3 col = SP_VOID + SP_GOLD * 0.4 * crit;
      return mix(col, SP_INK, hole);
    }`, "criticalCurve(p)"),

  T("eyed-kerr", "eyed hole plus Kerr shear on the annulus",
    `vec4 eyedKerr(vec2 p) {
      vec2 c = vec2(0.72, 0.52), q = p - c;
      float r = length(q), th = atan(q.y, q.x) + 0.55 / max(r * r, 0.03);
      float hole = spDisc(r, 0.09);
      float eye = spRing(r, 0.12, 0.02) * (0.65 + 0.35 * sin(th * 2.0));
      float photon = spRing(r, 0.15, 0.005);
      vec3 col = mix(SP_VOID, SP_EMBER * 0.5, eye);
      col = mix(col, SP_MOON * 0.7, photon);
      col = mix(col, SP_INK, hole);
      return vec4(col, spEmit(photon + eye * 0.3));
    }`, "eyedKerr(p).rgb"),
];
