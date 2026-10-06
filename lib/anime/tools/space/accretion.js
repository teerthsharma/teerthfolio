// Accretion / Doppler / Kepler / jets — 15 disc-flow operators.
import { T } from "./kit.glsl.js";

export const ACCRETION = [
  T("accretion-kepler", "Kepler shear + Doppler grade: blue approach, red recede",
    `vec4 accretionKepler(vec2 p) {
      vec2 c = vec2(0.72, 0.50), q = (p - c) / vec2(1.0, 0.36);
      float r = length(q), th = atan(q.y, q.x);
      float hole = spDisc(r, 0.10);
      float disc = smoothstep(0.10, 0.13, r) * (1.0 - smoothstep(0.42, 0.52, r));
      float omega = pow(max(r, 0.12), -1.5);
      float shear = fract(th / 6.28318 + omega * 0.08);
      float arms = 0.55 + 0.45 * sin(th * 2.0 + 8.0 * log(r + 0.08));
      float los = sin(th);
      vec3 grade = mix(vec3(0.62, 0.16, 0.12), vec3(0.28, 0.42, 0.72), 0.5 + 0.5 * los);
      vec3 col = grade * disc * (0.35 + 0.4 * arms) * (0.7 + 0.3 * shear);
      return vec4(mix(SP_VOID + col, SP_INK, hole), spEmit(disc * 0.45 * (0.4 + 0.6 * arms)));
    }`, "accretionKepler(p).rgb"),

  T("accretion-thin", "thin disc: tight vertical scale height, Kepler rings",
    `vec3 accretionThin(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.18);
      float r = length(q);
      float disc = smoothstep(0.12, 0.14, r) * (1.0 - smoothstep(0.48, 0.55, r));
      float rings = 0.5 + 0.5 * sin(r * 40.0);
      return mix(SP_VOID, SP_EMBER * 0.45 + SP_HOT * 0.1, disc * (0.4 + 0.35 * rings));
    }`, "accretionThin(p)"),

  T("accretion-thick", "thick torus: fat doughnut, inner hole, soft walls",
    `vec3 accretionThick(vec2 p) {
      vec2 c = vec2(0.72, 0.50);
      float R = 0.22, a = 0.10;
      float d = abs(length(p - c) - R) / a;
      float torus = 1.0 - smoothstep(0.7, 1.1, d);
      float hole = spDisc(length((p - c) / vec2(1.0, 0.7)), 0.08);
      vec3 col = mix(SP_VOID, SP_EMBER * 0.4 + SP_ORCH * 0.15, torus);
      return mix(col, SP_INK, hole);
    }`, "accretionThick(p)"),

  T("doppler-grade", "Doppler grade alone: left blue, right red, no shear",
    `vec3 dopplerGrade(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.34);
      float r = length(q), th = atan(q.y, q.x);
      float disc = smoothstep(0.12, 0.16, r) * (1.0 - smoothstep(0.4, 0.5, r));
      vec3 g = mix(vec3(0.58, 0.14, 0.12), vec3(0.22, 0.40, 0.70), 0.5 + 0.5 * sin(th));
      return SP_VOID + g * disc * 0.55;
    }`, "dopplerGrade(p)"),

  T("kepler-spiral", "log-spiral arms in a Kepler disc",
    `vec3 keplerSpiral(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.36);
      float r = length(q), th = atan(q.y, q.x);
      float arm = pow(0.5 + 0.5 * cos(2.0 * (th - 1.8 * log(r + 0.06))), 2.4);
      float disc = smoothstep(0.11, 0.14, r) * (1.0 - smoothstep(0.45, 0.54, r));
      return SP_VOID + SP_HOT * 0.18 * disc + SP_EMBER * 0.4 * arm * disc;
    }`, "keplerSpiral(p)"),

  T("jet-bipolar", "bipolar jets: two opposite cones, fwidth edges",
    `vec4 jetBipolar(vec2 p) {
      vec2 q = p - vec2(0.72, 0.50);
      float axis = abs(q.x) - 0.018 * (0.2 + abs(q.y) * 1.4);
      float cone = spAA(axis) * smoothstep(0.04, 0.10, abs(q.y));
      float hole = spDisc(length(q / vec2(1.0, 0.4)), 0.08);
      vec3 col = SP_VOID + SP_COLD * 0.45 * cone;
      return vec4(mix(col, SP_INK, hole), spEmit(cone * 0.5));
    }`, "jetBipolar(p).rgb"),

  T("jet-knot", "knotty jet: hashed bright knots along the axis",
    `vec4 jetKnot(vec2 p) {
      vec2 q = p - vec2(0.72, 0.50);
      float spine = exp(-pow(q.x / 0.02, 2.0)) * smoothstep(0.06, 0.12, abs(q.y));
      float knot = 0.0;
      for (int i = 0; i < 5; i++) {
        float y = -0.35 + 0.14 * float(i);
        knot += exp(-length(q - vec2(0.0, y)) * 28.0);
      }
      vec3 col = SP_VOID + SP_COLD * 0.25 * spine + SP_HOT * 0.4 * knot * spine;
      return vec4(col, spEmit(knot * 0.6));
    }`, "jetKnot(p).rgb"),

  T("disc-hotspot", "orbiting hotspot: a compact blob on the Kepler ring",
    `vec4 discHotspot(vec2 p, float t) {
      vec2 c = vec2(0.72, 0.50), q = (p - c) / vec2(1.0, 0.36);
      float r = length(q);
      float disc = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.4, 0.48, r));
      float ph = t * 1.3;
      vec2 hs = vec2(cos(ph), sin(ph)) * 0.22;
      float spot = exp(-length(q - hs) * 22.0);
      vec3 col = SP_VOID + SP_EMBER * 0.3 * disc + SP_HOT * 0.5 * spot;
      return vec4(col, spEmit(spot));
    }`, "discHotspot(p, t).rgb"),

  T("disc-warp", "warped disc: elevation of the midplane is a sinusoid",
    `vec3 discWarp(vec2 p) {
      vec2 c = vec2(0.72, 0.50);
      float th = atan(p.y - c.y, p.x - c.x);
      float y0 = c.y + 0.05 * sin(th * 2.0);
      vec2 q = (p - vec2(c.x, y0)) / vec2(1.0, 0.28);
      float r = length(q);
      float disc = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.42, 0.5, r));
      return SP_VOID + SP_EMBER * 0.4 * disc;
    }`, "discWarp(p)"),

  T("funnel-inflow", "inflow funnels: two polar funnels feeding the hole",
    `vec3 funnelInflow(vec2 p) {
      vec2 q = p - vec2(0.72, 0.50);
      float funnel = exp(-pow(abs(q.x) / (0.03 + 0.35 * abs(q.y)), 2.0)) * (1.0 - smoothstep(0.28, 0.4, abs(q.y)));
      float hole = spDisc(length(q / vec2(1.0, 0.45)), 0.07);
      vec3 col = SP_VOID + SP_ORCH * 0.35 * funnel;
      return mix(col, SP_INK, hole);
    }`, "funnelInflow(p)"),

  T("corona-disc", "compact X-ray corona above a thin disc",
    `vec4 coronaDisc(vec2 p) {
      vec2 c = vec2(0.72, 0.50), q = (p - c) / vec2(1.0, 0.34);
      float r = length(q);
      float disc = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.4, 0.5, r));
      float cor = exp(-length(p - (c + vec2(0.0, 0.04))) * 18.0);
      vec3 col = SP_VOID + SP_EMBER * 0.3 * disc + SP_COLD * 0.35 * cor;
      return vec4(col, spEmit(cor * 0.7));
    }`, "coronaDisc(p).rgb"),

  T("qpo-ripple", "QPO ripples: concentric waves on the disc",
    `vec3 qpoRipple(vec2 p, float t) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.36);
      float r = length(q);
      float disc = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.45, 0.52, r));
      float rip = 0.5 + 0.5 * sin(r * 48.0 - t * 6.0);
      return SP_VOID + SP_EMBER * 0.38 * disc * (0.55 + 0.45 * rip);
    }`, "qpoRipple(p, t)"),

  T("disc-wind", "launched wind: vertical spray from the disc face",
    `vec3 discWind(vec2 p) {
      vec2 c = vec2(0.72, 0.50), q = (p - c) / vec2(1.0, 0.36);
      float r = length(q);
      float disc = smoothstep(0.14, 0.18, r) * (1.0 - smoothstep(0.38, 0.46, r));
      float wind = smoothstep(0.0, 0.12, p.y - c.y) * exp(-abs(p.x - c.x) / (0.18 + (p.y - c.y))) * (1.0 - disc);
      return SP_VOID + SP_EMBER * 0.3 * disc + SP_TEAL * 0.22 * wind * spFbm(p * 6.0);
    }`, "discWind(p)"),

  T("retrograde-disc", "opposite Kepler shear — arms wind the other way",
    `vec3 retrogradeDisc(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.36);
      float r = length(q), th = atan(q.y, q.x);
      float arm = pow(0.5 + 0.5 * cos(2.0 * (th + 1.8 * log(r + 0.06))), 2.4);
      float disc = smoothstep(0.11, 0.14, r) * (1.0 - smoothstep(0.45, 0.54, r));
      float los = sin(th);
      vec3 g = mix(vec3(0.22, 0.40, 0.70), vec3(0.58, 0.14, 0.12), 0.5 + 0.5 * los);
      return SP_VOID + g * disc * (0.3 + 0.5 * arm);
    }`, "retrogradeDisc(p)"),

  T("beaming-cone", "relativistic beaming cone: approaching side boosted",
    `vec4 beamingCone(vec2 p) {
      vec2 q = (p - vec2(0.72, 0.50)) / vec2(1.0, 0.36);
      float r = length(q), th = atan(q.y, q.x);
      float disc = smoothstep(0.12, 0.15, r) * (1.0 - smoothstep(0.42, 0.5, r));
      float beta = 0.45, mu = sin(th);
      float beam = (1.0 - beta) / pow(max(1.0 - beta * mu, 0.15), 3.0);
      vec3 col = SP_VOID + mix(SP_EMBER, SP_COLD, 0.5 + 0.5 * mu) * disc * clamp(beam * 0.35, 0.0, 0.85);
      return vec4(col, spEmit(disc * beam * 0.2));
    }`, "beamingCone(p).rgb"),
];
