// Comets / meteors / ion tails — 10 streak operators.
import { T } from "./kit.glsl.js";

export const COMETS = [
  T("meteor-streaks", "few hashed meteor streaks, fwidth lines",
    `vec3 meteorStreaks(vec2 p) {
      vec3 c = SP_VOID;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 a = vec2(spH21(vec2(fi, 1.0)) * 1.3, 0.4 + 0.5 * spH21(vec2(fi, 2.0)));
        vec2 dir = normalize(vec2(0.55, -0.45) + (spH22(vec2(fi, 3.0)) - 0.5) * 0.3);
        vec2 b = a + dir * (0.18 + 0.16 * spH21(vec2(fi, 4.0)));
        vec2 ab = b - a;
        float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
        float d = length(p - a - ab * u);
        float head = exp(-u * 4.0);
        c += SP_COLD * 0.55 * spAA(d - 0.0012) * head;
        c += SP_HOT * 0.4 * spDisc(length(p - a), 0.006) * step(spH21(vec2(fi, 5.0)), 0.7);
      }
      return c;
    }`, "meteorStreaks(p)"),

  T("meteor-radiant", "shower from a radiant: streaks share a vanishing point",
    `vec3 meteorRadiant(vec2 p) {
      vec2 R = vec2(0.95, 0.82);
      vec3 c = SP_VOID;
      for (int i = 0; i < 6; i++) {
        float fi = float(i), ang = 0.4 + fi * 0.35;
        vec2 dir = normalize(vec2(cos(ang), sin(ang) - 0.8));
        vec2 a = R + dir * (0.12 + 0.08 * spH21(vec2(fi, 2.0)));
        vec2 b = a + dir * 0.28;
        vec2 ab = b - a;
        float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
        c += SP_COLD * 0.4 * spAA(length(p - a - ab * u) - 0.001) * (1.0 - u);
      }
      return c;
    }`, "meteorRadiant(p)"),

  T("ion-tail", "straight ion tail from a hashed nucleus, blue",
    `vec3 ionTail(vec2 p) {
      vec2 n = vec2(0.95, 0.68), dir = normalize(vec2(-0.85, -0.2));
      vec2 ab = dir * 0.7;
      float u = clamp(dot(p - n, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float d = length(p - n - ab * u);
      float w = 0.006 + 0.03 * u;
      float tail = exp(-pow(d / w, 2.0)) * (1.0 - u);
      float coma = exp(-length(p - n) * 18.0);
      return SP_VOID + SP_COLD * 0.45 * tail + SP_MOON * 0.4 * coma;
    }`, "ionTail(p)"),

  T("dust-tail", "curved dust tail: quadratic sweep, gold",
    `vec3 dustTail(vec2 p) {
      vec2 n = vec2(0.98, 0.66);
      vec3 c = SP_VOID + SP_MOON * 0.3 * exp(-length(p - n) * 16.0);
      for (int i = 0; i < 10; i++) {
        float t = float(i) / 9.0;
        vec2 q = n + vec2(-0.55 * t - 0.15 * t * t, -0.08 * t - 0.18 * t * t);
        float w = 0.008 + 0.04 * t;
        c += SP_GOLD * 0.12 * exp(-length(p - q) / w) * (1.0 - t);
      }
      return c;
    }`, "dustTail(p)"),

  T("comet-coma", "coma + nucleus: isotropic falloff plus a hard core",
    `vec4 cometComa(vec2 p) {
      vec2 n = vec2(0.8, 0.6);
      float coma = exp(-length(p - n) * 10.0);
      float core = spDisc(length(p - n), 0.012);
      vec3 col = SP_VOID + SP_COLD * 0.35 * coma + SP_MOON * 0.5 * core;
      return vec4(col, spEmit(core));
    }`, "cometComa(p).rgb"),

  T("split-tail", "ion + dust split: two tails from one nucleus",
    `vec3 splitTail(vec2 p) {
      vec2 n = vec2(0.96, 0.70);
      vec2 ion = normalize(vec2(-0.9, -0.15)), dust = normalize(vec2(-0.7, -0.45));
      float ti = clamp(dot(p - n, ion * 0.65) / 0.42, 0.0, 1.0);
      float td = clamp(dot(p - n, dust * 0.55) / 0.30, 0.0, 1.0);
      float di = length(p - n - ion * 0.65 * ti), dd = length(p - n - dust * 0.55 * td);
      float ionT = exp(-pow(di / (0.008 + 0.03 * ti), 2.0)) * (1.0 - ti);
      float dustT = exp(-pow(dd / (0.012 + 0.05 * td), 2.0)) * (1.0 - td);
      return SP_VOID + SP_COLD * 0.4 * ionT + SP_GOLD * 0.28 * dustT + SP_MOON * 0.35 * exp(-length(p - n) * 20.0);
    }`, "splitTail(p)"),

  T("fireball-train", "persistent train: a fading thick streak",
    `vec3 fireballTrain(vec2 p) {
      vec2 a = vec2(0.3, 0.8), b = vec2(0.85, 0.35);
      vec2 ab = b - a;
      float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float d = length(p - a - ab * u);
      float train = exp(-pow(d / (0.01 + 0.02 * u), 2.0)) * (0.3 + 0.7 * (1.0 - u));
      float head = exp(-length(p - a) * 22.0);
      return SP_VOID + vec3(0.22, 0.40, 0.32) * train * 0.5 + SP_HOT * 0.45 * head;
    }`, "fireballTrain(p)"),

  T("sporadic-meteor", "single sporadic: one hashed bolt",
    `vec3 sporadicMeteor(vec2 p) {
      vec2 a = vec2(0.4, 0.78), b = vec2(0.62, 0.52);
      vec2 ab = b - a;
      float u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
      float d = length(p - a - ab * u);
      return SP_VOID + SP_COLD * 0.6 * spAA(d - 0.0014) * exp(-u * 3.0) + SP_HOT * 0.5 * spDisc(length(p - a), 0.007);
    }`, "sporadicMeteor(p)"),

  T("sungrazer", "near-sun comet: tail plus a bright solar disc",
    `vec4 sungrazer(vec2 p) {
      vec2 sun = vec2(0.55, 0.42), n = vec2(0.62, 0.48);
      float disc = spDisc(length(p - sun), 0.09);
      vec2 dir = normalize(n - sun);
      vec2 tail = dir * 0.45;
      float u = clamp(dot(p - n, tail) / 0.20, 0.0, 1.0);
      float d = length(p - n - tail * u);
      float t = exp(-pow(d / (0.01 + 0.03 * u), 2.0)) * (1.0 - u);
      vec3 col = mix(SP_VOID + SP_GOLD * 0.3 * t, SP_HOT * 0.55, disc);
      return vec4(col, spEmit(disc * 0.45));
    }`, "sungrazer(p).rgb"),

  T("antitail", "antitail geometry: apparent tail toward the sun",
    `vec3 antitail(vec2 p) {
      vec2 n = vec2(0.7, 0.58), sun = vec2(0.4, 0.4);
      vec2 toward = normalize(sun - n);
      vec2 away = -toward;
      float ua = clamp(dot(p - n, away * 0.5) / 0.25, 0.0, 1.0);
      float ut = clamp(dot(p - n, toward * 0.22) / 0.05, 0.0, 1.0);
      float dust = exp(-length(p - n - away * 0.5 * ua) / (0.015 + 0.04 * ua)) * (1.0 - ua);
      float anti = exp(-length(p - n - toward * 0.22 * ut) / 0.012) * (1.0 - ut);
      return SP_VOID + SP_GOLD * 0.28 * dust + SP_MOON * 0.35 * anti + SP_COLD * 0.25 * exp(-length(p - n) * 16.0);
    }`, "antitail(p)"),
];
