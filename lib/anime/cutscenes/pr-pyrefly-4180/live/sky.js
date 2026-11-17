// ported from components/world/cutscene/moves/pr-pyrefly-4180.jsx (skyShell, lines 76 to 102); its notes live with the original
import { DoubleSide, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { U } from "./paper.js";

export function skyShell() {
  const g = new SphereGeometry(1, 40, 20);
  const m = new ShaderMaterial({
    uniforms: { uCore: { value: new Vector3() }, uInside: { value: 0 }, uFade: U.uFade },
    side: DoubleSide,
    depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uCore;
      uniform float uInside, uFade;
      varying vec3 vW;
      float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vW - (uInside > 0.5 ? cameraPosition : uCore));
        float up = clamp(d.y * 1.8 + 0.1, 0.0, 1.0);
        vec3 c = mix(vec3(0.115, 0.045, 0.2), vec3(0.03, 0.02, 0.1), up);
        c += vec3(0.5, 0.17, 0.08) * exp(-abs(d.y) * 9.0) * 0.55;
        vec3 q = floor(d * 140.0);
        float s = step(0.9965, h(q)) * step(0.0, d.y);
        c += vec3(0.9, 0.9, 1.0) * s;
        float a = 1.0;
        if (uInside < 0.5 && gl_FrontFacing) a = 0.88;
        gl_FragColor = vec4(c * uFade, a);
      }`,
  });
  return { g, m };
}
