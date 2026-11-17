// The site's last stage for this cutscene: a gain and a toe fitted to the five live colours in PAIRS.
import { Color } from "three";

// Fit: grid G 1.0-1.2 and T0 0-0.1 (step 0.005), mean abs error 7 of 255 over the 15 channels (Sukuna's 1.055 and 0.04 give 7.2).
export const G = 1.05, T0 = 0.035;
export const PAIRS = [
  ["#3d1788", [69, 7, 154]],
  ["#a46bff", [154, 110, 233]],
  ["#38d4f0", [46, 220, 236]],
  ["#e04099", [221, 43, 149]],
  ["#e1d6bd", [220, 208, 183]],
];
export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c *= ${G.toFixed(4)};
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : ${T0.toFixed(4)};
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;
export function toned(hex) {
  let c = new Color(hex).toArray().map((v) => v * G);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : T0));
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
