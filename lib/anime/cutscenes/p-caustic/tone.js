// The site's last stage for a page printed in flat tones: every material's colour passes the neutral map the live site ends on (copied from the Sukuna cutscene).
// paper and full red come out where they went in (measured on the capture: paper 236 228 212, black 15 3 3 with its grain).
import { Color } from "three";

export const BLACK = "#0a0303"; // the site's printed black with its grain: the frame's ink floor and the line ink
export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c *= 1.055;
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : 0.04;
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;
// the same map for a colour written in JS (linear rgb out, as kit/fx/cel.js takes it)
export function toned(hex) {
  let c = new Color(hex).toArray().map((v) => v * 1.055);
  const x = Math.min(...c);
  c = c.map((v) => v - (x < 0.08 ? x - 6.25 * x * x : 0.04));
  const peak = Math.max(...c);
  if (peak > 0.76) { const np = 1 - 0.0576 / (peak - 0.52), g = 1 - 1 / (0.15 * (peak - np) + 1); c = c.map((v) => (v * np) / peak).map((v) => v + (np - v) * g); }
  return c;
}
// wrap a material's main() so its colour passes the map (the live shader files stay as the site has them)
const MAIN = /void\s+main\s*\(\s*\)/;
export function tone(material) {
  const f = material.fragmentShader;
  if (f.split(MAIN).length === 2) { material.fragmentShader = f.replace(MAIN, "void pageMain()") + TONE + "\n  void main() { pageMain(); gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }\n"; material.needsUpdate = true; }
  return material;
}
