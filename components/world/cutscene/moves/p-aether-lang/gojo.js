// THE SILHOUETTE, larger and more iconic: a tall figure in a dark high-collared jacket,
// hands in pockets, a head of tall spiky white hair swept up (every spike sways on its
// own phase in the vertex shader), a black blindfold band across the eyes, and no face.
// On line B two glints of light flare on the band where his eyes would be. Shape, colour
// and pose only. Same proportions as the kit's tall speaker (feet at the origin, head
// centre 1.9 m, mouth 1.78 m) so the bubbles' tails land on his mouth.

import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cosmicMaterial } from "./cosmic";
import { hash } from "./world";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
const prep = (g, keepN = false) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  if (!keepN) n.deleteAttribute("normal");
  return n;
};
function limb(a, b, r1, r2, sx = 1, sz = 1, seg = 14, keepN = true) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, seg, 1).scale(sx, 1, sz);
  g.applyQuaternion(Q.setFromUnitVectors(UP, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return prep(g, keepN);
}

const HEAD = [0, 1.9, 0.02];
const HR = 0.155;

// one hair spike: a cone from the head surface along `dir`, with aW (0 root, 1 tip) and a sway phase
function spike(dir, h, r, at, i) {
  const g = new ConeGeometry(r, h, 5, 2);
  g.translate(0, h / 2, 0);
  const n = prep(g);
  const w = new Float32Array(n.attributes.position.count);
  const ph = new Float32Array(n.attributes.position.count).fill(hash(i, 7));
  for (let k = 0; k < w.length; k++) w[k] = Math.min(1, Math.max(0, n.attributes.position.getY(k) / h));
  n.setAttribute("aW", new BufferAttribute(w, 1));
  n.setAttribute("aPh", new BufferAttribute(ph, 1));
  n.applyQuaternion(Q.setFromUnitVectors(UP, dir.clone().normalize()));
  n.translate(HEAD[0] + at.x, HEAD[1] + at.y, HEAD[2] + at.z);
  return n;
}

function hairGeometry() {
  const parts = [];
  let i = 0;
  // the crown: three tiers of tall spikes, flung up and back
  for (const [count, elev, len] of [[9, 0.55, 0.36], [8, 0.95, 0.5], [5, 1.3, 0.58]]) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + elev * 1.3 + (hash(i, 3) - 0.5) * 0.35;
      const c = Math.cos(elev);
      const dir = new Vector3(Math.sin(a) * c * 0.9, Math.sin(elev) + 0.35, Math.cos(a) * c * 0.8 - 0.42);
      const at = dir.clone().normalize().multiplyScalar(HR * 0.8);
      parts.push(spike(dir, len * (0.8 + 0.4 * hash(i, 5)), 0.062 + 0.02 * hash(i, 6), at, i));
      i++;
    }
  }
  // the back of the head: a few long spikes sweeping out behind
  for (let k = 0; k < 5; k++) {
    const a = (k / 4 - 0.5) * 1.6;
    const dir = new Vector3(Math.sin(a), 0.2, -1);
    parts.push(spike(dir, 0.3 + 0.08 * hash(i, 5), 0.07, dir.clone().normalize().multiplyScalar(HR * 0.8), i));
    i++;
  }
  // the fringe: short spikes over the brow, above the band
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * 1.5;
    const dir = new Vector3(Math.sin(a) * 0.6, 0.15 - 0.25 * Math.abs(Math.sin(a)), 1);
    const at = new Vector3(Math.sin(a) * 0.12, 0.085, 0.1 + 0.03 * Math.cos(a));
    parts.push(spike(dir, 0.16 + 0.06 * hash(i, 5), 0.045, at, i));
    i++;
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}

// the dark jacket, trousers, high collar and arms with the hands in the pockets
function bodyGeometry() {
  const p = [];
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.11, 0, 0.03], [s * 0.13, 1.0, 0], 0.085, 0.115));
    p.push(limb([s * 0.3, 1.58, 0], [s * 0.42, 1.22, -0.04], 0.095, 0.08));
    p.push(limb([s * 0.42, 1.22, -0.04], [s * 0.21, 1.0, 0.08], 0.08, 0.07));
  }
  p.push(limb([0, 0.88, 0], [0, 1.6, 0], 0.2, 0.25, 1.3, 0.8));
  p.push(limb([0, 0.62, 0], [0, 1.0, 0], 0.27, 0.21, 1.15, 0.85)); // the long hem
  p.push(limb([-0.31, 1.6, 0], [0.31, 1.6, 0], 0.08, 0.08));
  p.push(limb([0, 1.6, 0], [0, 1.78, 0.01], 0.15, 0.13, 1, 1, 8)); // the high collar
  const g = mergeGeometries(p);
  for (const q of p) q.dispose();
  return g;
}

export function gojo() {
  const body = bodyGeometry();
  const skin = prep(new IcosahedronGeometry(HR, 2).scale(0.94, 1.12, 1).translate(...HEAD), true);
  const neck = limb([0, 1.62, 0.01], [0, 1.82, 0.02], 0.065, 0.06);
  const skinAll = mergeGeometries([skin, neck]);
  skin.dispose();
  neck.dispose();
  const hair = hairGeometry();
  const band = prep(new CylinderGeometry(HR + 0.011, HR + 0.011, 0.066, 16, 1, true).scale(0.96, 1, 1.04).translate(HEAD[0], HEAD[1] + 0.022, HEAD[2]));
  const mats = {
    body: cosmicMaterial({ color: new Color("#2a2560"), flat: true, smooth: true, dots: 0, edge: 1.0, keep: 0.14, rim: 1.4 }),
    skin: cosmicMaterial({ color: new Color("#cfc8ea"), flat: true, smooth: true, dots: 0, edge: 1.2, keep: 0.2, rim: 1.0 }),
    hair: cosmicMaterial({ color: new Color("#f1f2ff"), flat: true, sway: true, keep: 0.3, glow: 1, rim: 1.1 }),
    band: cosmicMaterial({ color: new Color("#0b0a1c"), flat: true, keep: 0.05, rim: 1.0 }),
  };
  mats.band.side = 2; // the band is an open tube
  return { geo: { body, skin: skinAll, hair, band }, mats };
}

// THE GLINT: a four-point star with a long horizontal flare, in light only
export function glintSprite() {
  const g = new PlaneGeometry(1, 1);
  const m = new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float core = exp(-r * 9.0);
        float h = exp(-abs(vP.y) * 26.0) * exp(-abs(vP.x) * 2.4);
        float v = exp(-abs(vP.x) * 26.0) * exp(-abs(vP.y) * 3.4);
        float a = clamp((core * 1.6 + h * 1.1 + v * 0.8) * uK, 0.0, 1.0);
        gl_FragColor = vec4(pow(vec3(0.95, 0.92, 1.0), vec3(2.2)), a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  return { g, m };
}
