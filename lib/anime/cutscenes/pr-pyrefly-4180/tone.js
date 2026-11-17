// The site's last stage, as the page's inks come out of it (components/world/Look.jsx): a neutral tone map, copied from the Sukuna cutscene.
import { Color } from "three";

export const BLACK = "#0a0303";
export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c *= 1.055;
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : 0.04;
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;
export function toned(hex) {
  let c = new Color(hex).toArray().map((v) => v * 1.055);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : 0.04));
  const peak = Math.max(...c);
  if (peak > 0.76) { const np = 1 - 0.0576 / (peak - 0.52), g = 1 - 1 / (0.15 * (peak - np) + 1); c = c.map((v) => (v * np) / peak).map((v) => v + (np - v) * g); }
  return c;
}
const MAIN = /void\s+main\s*\(\s*\)/;
export function tone(material) {
  const f = material.fragmentShader;
  if (!f || f.includes("vec3 siteTone") || f.split(MAIN).length !== 2) return material;
  material.fragmentShader = f.replace(MAIN, "void pageMain()") + TONE + "\n  void main() { pageMain(); gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }\n";
  material.needsUpdate = true;
  return material;
}
export function toneAll(mats) {
  for (const m of Object.values(mats)) tone(m);
  return mats;
}
