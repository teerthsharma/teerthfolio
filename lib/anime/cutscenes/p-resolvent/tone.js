// The site's last stage for this page's inks (components/world/Look.jsx: every frame ends in the neutral tone map). The toe takes the
// pedestal off a dark colour and the shoulder rolls off the peak; GAIN and LIFT are the two tunables fitted to the captured frames.
import { Color } from "three";

export const INK = "#4a2e2e";
export const GAIN = 1.055;
export const LIFT = 0.0;

export const TONE = /* glsl */ `
  vec3 siteTone(vec3 c) {
    c = c * ${GAIN.toFixed(4)} + ${LIFT.toFixed(4)};
    float x = min(c.r, min(c.g, c.b));
    c -= x < 0.08 ? x - 6.25 * x * x : 0.04;
    float peak = max(c.r, max(c.g, c.b));
    if (peak > 0.76) { float np = 1.0 - 0.0576 / (peak - 0.52); c *= np / peak; c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (peak - np) + 1.0)); }
    return c;
  }`;

// the same map for a colour written in JS (linear rgb out, as kit/fx/cel.js takes it)
export function toned(hex) {
  let c = new Color(hex).toArray().map((v) => v * GAIN + LIFT);
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
