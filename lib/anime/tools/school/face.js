// Family 4 — skin / fringe / half-lid / 6.9s glint (6).
// The money frame is the still eye. Observational, not a shonen spark.
import { T } from "./kit.glsl.js";

const F = "face";

export const FACE = [
  T("halfLid", F, "half-lidded calm eye: heavy lid plate, quiet iris, no wide-awake cut",
    `vec3 halfLid(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      float h = scNdL(p);
      vec3 skin = scSkin(h);
      vec2 eye = vec2(0.78, 0.54);
      float ball = scFill(scEllipse(p, eye, vec2(0.055, 0.028)));
      float lid = scFill(scEllipse(p, eye + vec2(0.0, 0.012), vec2(0.058, 0.018)));
      float iris = scFill(scEllipse(p, eye + vec2(0.004, -0.004), vec2(0.018, 0.016)));
      skin = mix(skin, SC_SCLERA, ball);
      skin = mix(skin, SC_IRIS, iris);
      skin = mix(skin, scSkin(h * 0.7), lid * 0.92);
      return mix(c, skin, scCover(p));
    }`, "halfLid(p, t)"),

  T("glintPlane", F, "eye-glint plane at 6.9s: one hard catch, held, the money frame",
    `vec3 glintPlane(vec2 p, float t) {
      float hold = scHold(t, 8.0);
      vec3 c = halfLid(p, hold);
      vec2 g = vec2(0.790, 0.548);
      float glint = scFill(scEllipse(p, g, vec2(0.007, 0.004)));
      float plane = scFill(scBox(p, g + vec2(0.004, 0.002), vec2(0.010, 0.0022)));
      vec3 catchCol = SC_FLUORO * 0.78;
      return mix(c, catchCol, max(glint, plane) * 0.88);
    }`, "glintPlane(p, t)", ["halfLid"]),

  T("fringeFall", F, "messy dark-brown fringe: broken strands over the brow, one quiet highlight",
    `vec3 fringeFall(vec2 p, float t) {
      vec3 c = halfLid(p, t);
      float cov = scCover(p);
      float fringe = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        vec2 a = vec2(0.56 + fi * 0.045, 0.72);
        vec2 b = vec2(0.58 + fi * 0.048 + (scH21(vec2(fi, 2.0)) - 0.5) * 0.06, 0.50);
        fringe = max(fringe, scFill(scSeg(p, a, b, 0.016)));
      }
      float mass = scFill(scEllipse(p, vec2(0.70, 0.70), vec2(0.22, 0.12))) * scAA(p.y, 0.58);
      float h = scNdL(p);
      vec3 hair = mix(SC_FRINGE, SC_FRINGE_HI, scAA(h, 0.78) * 0.45);
      return mix(c, hair, max(fringe, mass) * cov);
    }`, "fringeFall(p, t)", ["halfLid"]),

  T("skinFluoro", F, "cool fluorescent skin cel: SSS mid, cool terminator, never a grey shadow",
    `vec3 skinFluoro(vec2 p, float t) {
      vec3 c = scRoom(p, t);
      vec3 skin = scSkin(scNdL(p));
      float win = 0.5 + 0.5 * dot(scSphereN(p), scWdir());
      skin = mix(skin, mix(skin, SC_WINTER * 0.55, 0.18), scAA(win, 0.62) * 0.35);
      return mix(c, skin, scCover(p));
    }`, "skinFluoro(p, t)"),

  T("irisStill", F, "still iris: dark brown plate, one ring, observational, no spin",
    `vec3 irisStill(vec2 p, float t) {
      vec3 c = halfLid(p, t);
      vec2 eye = vec2(0.784, 0.536);
      float iris = scFill(scEllipse(p, eye, vec2(0.020, 0.017)));
      float pupil = scFill(length(p - eye) - 0.007);
      float ring = scLine(length((p - eye) / vec2(0.020, 0.017)) - 1.0, 1.2);
      vec3 col = mix(SC_IRIS, vec3(0.32, 0.20, 0.14), scAA(scNdL(p), 0.60));
      c = mix(c, col, iris);
      c = mix(c, SC_INK * 2.2, pupil);
      return mix(c, SC_FRINGE_HI * 0.7, ring * 0.40);
    }`, "irisStill(p, t)", ["halfLid"]),

  T("scleraQuiet", F, "quiet sclera: paper-warm, no shonen spark, a hint of fluoro only",
    `vec3 scleraQuiet(vec2 p, float t) {
      vec3 c = halfLid(p, t);
      vec2 eye = vec2(0.78, 0.54);
      float ball = scFill(scEllipse(p, eye, vec2(0.055, 0.028)));
      float lid = scFill(scEllipse(p, eye + vec2(0.0, 0.012), vec2(0.058, 0.018)));
      vec3 scl = mix(SC_SCLERA * 0.88, SC_SCLERA, scAA(scNdL(p), 0.55));
      scl = mix(scl, SC_FLUORO * 0.55, 0.06);
      return mix(c, mix(scl, scSkin(scNdL(p)), lid * 0.9), ball * scCover(p));
    }`, "scleraQuiet(p, t)", ["halfLid"]),
];
