// THE SITE'S LAST STAGE, as the page's inks come out of it (components/world/Look.jsx: every frame ends in the neutral tone map). Its toe takes
// the pedestal off a dark colour, so on the site the ink prints black (2, 0, 0, not 14, 11, 13) and a weak red over the pool is a pure dark red;
// paper and full red come out where they went in (measured on the capture: paper 236 228 212, black 15 3 3 with its grain).
import { Color } from "three";

export const INK = "#140f3a"; // the ink of this cutscene: the frame's ink floor, the line ink and the negative of a hit panel
export const PAL = {
  marble: "#f6ead2", gold: "#e9b23a", goldDeep: "#c98a1b", teal: "#0f8f8a", stage: "#1fbdb4", sand: "#dfae70", coral: "#e4566a", crimson: "#b3123a",
  violet: "#2a1f6b", ink: "#140f3a", cream: "#fff3d6", bolt: "#cfe6ff", cyan: "#7fd8ff", navy: "#14305a", field: "#1a4a46", fieldDot: "#2a7f78", ring: "#e6fffb",
};
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
