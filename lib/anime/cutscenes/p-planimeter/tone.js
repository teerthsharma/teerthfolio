// The page's last stage. The live room writes pow(col, 2.2) with the tone map bypassed (LIVE.md section 1), so GAIN and LIFT
// start at identity; tune them only if a probe misses its tolerance.
import { Color } from "three";

export const GAIN = 1.0;
export const LIFT = 0.0;
export const TONE = /* glsl */ `
  const float GAIN = ${GAIN.toFixed(4)}, LIFT = ${LIFT.toFixed(4)};
  vec3 siteTone(vec3 c) { return c * GAIN + LIFT; }`;

export function toned(hex) {
  return new Color(hex).toArray().map((v) => v * GAIN + LIFT);
}

const MAIN = /void\s+main\s*\(\s*\)/;
export function tone(material) {
  const f = material.fragmentShader;
  if (f.split(MAIN).length === 2) {
    material.fragmentShader = f.replace(MAIN, "void pageMain()") + TONE + "\n  void main() { pageMain(); gl_FragColor.rgb = siteTone(gl_FragColor.rgb); }\n";
    material.needsUpdate = true;
  }
  return material;
}
