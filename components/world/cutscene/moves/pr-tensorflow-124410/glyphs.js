// "ゴゴゴゴ", the menacing glyphs, hand-lettered as mesh strokes (no CJK font is loaded, nothing is rasterised):
// katakana KO (a top-and-side stroke, a base stroke) with its two dakuten ticks, each stroke a tapered ribbon with
// a ragged chisel edge, leaning like brush lettering. Two layers (a fat black outline, a colour fill on it),
// each ONE instanced mesh the move scatters round the pup and pulses on twos.

import { BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh, ShaderMaterial } from "three";
import { hash } from "./ink";

// strokes in a unit box, y down: KO, then the two ticks
const STROKES = [
  [[0.04, 0.2], [0.34, 0.17], [0.7, 0.18], [0.66, 0.5], [0.64, 0.86]],
  [[0.03, 0.9], [0.36, 0.88], [0.74, 0.9]],
  [[0.8, 0.02], [0.86, 0.15], [0.93, 0.3]],
  [[0.98, 0.0], [1.05, 0.14], [1.13, 0.29]],
];

function ribbon(width, grow, seed) {
  const pos = [];
  STROKES.forEach((pts, s) => {
    const left = [];
    const right = [];
    pts.forEach((pt, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0];
      let dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const u = i / (pts.length - 1);
      const w = (width * (s > 1 ? 0.78 : 1) * (0.55 + 0.9 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.85))) + grow) / 2; // heaviest in the middle, chiselled at the ends
      const j = (hash(s * 9 + i, seed) - 0.5) * 0.018;
      left.push([pt[0] - dy * w + j, pt[1] + dx * w]);
      right.push([pt[0] + dy * w - j, pt[1] - dx * w]);
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const A = left[i];
      const B = right[i];
      const C = left[i + 1];
      const D = right[i + 1];
      for (const q of [A, B, C, B, D, C]) pos.push((q[0] - 0.55) * 1.1, -(q[1] - 0.5) * 1.1, 0); // centred, lettered upright
    }
  });
  // lean the whole glyph like fast brush lettering
  for (let i = 0; i < pos.length; i += 3) pos[i] += pos[i + 1] * 0.2;
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  return g;
}

const mat = (U, role) =>
  new ShaderMaterial({
    uniforms: { ...U, uRole: { value: role } },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uPal[16];
      uniform float uInvert, uRole;
      void main() {
        vec3 c = uPal[int(uRole + 0.5)];
        c = mix(c, vec3(1.0) - c, uInvert);
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });

export function glyphs(U, n, fillRole) {
  const ink = new InstancedMesh(ribbon(0.2, 0.1, 1), mat(U, 5), n);
  const fill = new InstancedMesh(ribbon(0.2, 0.0, 1), mat(U, fillRole), n);
  for (const m of [ink, fill]) {
    m.frustumCulled = false;
    m.renderOrder = 6;
  }
  ink.renderOrder = 5;
  return { ink, fill };
}
