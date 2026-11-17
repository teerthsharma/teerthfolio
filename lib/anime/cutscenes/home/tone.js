// The site's last stage (components/world/Look.jsx tone map). Copied from lib/anime/cutscenes/pr-triton-kernels-22/tone.js, plus the home palette.
import { Color } from "three";

export const EXPO = 1.055;
export const BLACK = "#0a0303";
export const PAPER = "#f6eddc";
export const HAZE = "#ffb98a";
export const INK = "#1c1b19";
export const CREAM = "#fbfaf7";
export const INDIGO = "#1b2638";
export const LILAC = "#c9c3ea";
export const ORANGE = "#f29e61";
export const GOLD = "#ffd990";
export const SUN = [0.3, 0.2, -0.93];
export const ACCENT = "#7fc8f8";

export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c *= ${EXPO.toFixed(3)};
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : 0.04;
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;

export function toned(hex) {
  let c = new Color(hex).toArray().map((v) => v * EXPO);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : 0.04));
  const peak = Math.max(...c);
  if (peak > 0.76) { const np = 1 - 0.0576 / (peak - 0.52), g = 1 - 1 / (0.15 * (peak - np) + 1); c = c.map((v) => (v * np) / peak).map((v) => v + (np - v) * g); }
  return c;
}

const MAIN = /void\s+main\s*\(\s*\)/;
export function tone(material) {
  const f = material.fragmentShader;
  if (f.split(MAIN).length === 2) { material.fragmentShader = f.replace(MAIN, "void pageMain()") + TONE + "\n  void main() { pageMain(); gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }\n"; material.needsUpdate = true; }
  return material;
}
