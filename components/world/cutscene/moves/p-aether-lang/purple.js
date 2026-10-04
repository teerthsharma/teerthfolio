// HOLLOW PURPLE, the finale: Lapse Blue and Reversal Red (crackling spheres), the violet sphere with a white core and a
// swirl of distortion they make, and the purple tunnel it tears through the view. Everything is built once (prewarm);
// the move only writes uniforms and positions. Every pow/normalize in the shaders is on a clamped, non-zero input.

import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CylinderGeometry, LineSegments, Mesh, LineBasicMaterial, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { hash } from "./world";

const VERT = `varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz + vec3(0.0, 0.0, 1e-4)); vP = position; gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform float uT; uniform float uK; uniform vec3 uA; uniform vec3 uB; uniform float uSwirl;
varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){
  float c = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
  float rim = 1.0 - c;
  float ang = atan(vP.y, vP.x + 1e-4);
  float r = length(vP.xy);
  float arm = 0.5 + 0.5 * sin(5.0 * ang + 9.0 * r - uT * (6.0 + uSwirl * 6.0));
  float spark = 0.5 + 0.5 * sin(40.0 * vP.x + 33.0 * vP.y + 27.0 * vP.z + uT * 31.0);
  float core = pow(c, 2.5 + 2.0 * uSwirl);
  vec3 col = mix(uA, uB, core);
  col += uA * (0.45 * arm * rim * uSwirl + 0.5 * spark * rim * (1.0 - uSwirl));
  col = mix(col, vec3(1.0), core * core);
  float a = clamp((0.35 + 0.65 * core + 0.5 * rim) * uK, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`;
const orb = (a, b, swirl) => {
  const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uT: { value: 0 }, uK: { value: 1 }, uA: { value: new Vector3(...a) }, uB: { value: new Vector3(...b) }, uSwirl: { value: swirl } } });
  const mesh = new Mesh(new SphereGeometry(1, 32, 20), m);
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 16;
  return mesh;
};

// a cylinder round the camera's axis, seen from inside: streaks of violet rushing past, an eye of white at the far end
const TUNNEL_FRAG = `uniform float uT; uniform float uK; varying vec2 vUv;
void main(){
  float a = vUv.x * 6.2831853;
  float streak = 0.5 + 0.5 * sin(26.0 * a + 7.0 * sin(vUv.y * 9.0 - uT * 3.0));
  float rush = 0.5 + 0.5 * sin(vUv.y * 40.0 - uT * 38.0 + 6.0 * sin(a * 3.0));
  float depth = clamp(vUv.y, 0.0, 1.0);
  vec3 col = mix(vec3(0.32, 0.05, 0.85), vec3(0.78, 0.5, 1.0), streak * rush);
  col = mix(col, vec3(1.0), depth * depth * depth);
  gl_FragColor = vec4(col, clamp(uK * (0.55 + 0.45 * streak), 0.0, 1.0));
}`;
const TUNNEL_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// 12 line segments of crackling energy round an orb of radius 1, re-jittered every frame
function bolts(hex) {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(12 * 6), 3));
  const m = new LineBasicMaterial({ color: hex, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  const l = new LineSegments(g, m);
  l.visible = false;
  l.frustumCulled = false;
  l.renderOrder = 17;
  return l;
}
export function jitterBolts(l, step) {
  const p = l.geometry.attributes.position;
  for (let i = 0; i < 12; i++) {
    const th = hash(i, step) * 6.2832;
    const ph = Math.acos(2 * hash(i + 40, step) - 1);
    const d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
    const r0 = 0.85 + 0.2 * hash(i + 80, step);
    const r1 = 1.25 + 0.8 * hash(i + 120, step);
    p.setXYZ(i * 2, d[0] * r0, d[1] * r0, d[2] * r0);
    p.setXYZ(i * 2 + 1, d[0] * r1 + 0.3 * (hash(i + 7, step) - 0.5), d[1] * r1 + 0.3 * (hash(i + 9, step) - 0.5), d[2] * r1);
  }
  p.needsUpdate = true;
}

export function purpleParts() {
  const blue = orb([0.15, 0.4, 1.0], [0.35, 0.6, 1.0], 0);
  const red = orb([1.0, 0.1, 0.2], [1.0, 0.4, 0.4], 0);
  const purple = orb([0.55, 0.15, 1.0], [1.0, 1.0, 1.0], 1);
  const tg = new CylinderGeometry(3.2, 3.2, 40, 48, 1, true).rotateX(-Math.PI / 2);
  const tm = new ShaderMaterial({ vertexShader: TUNNEL_VERT, fragmentShader: TUNNEL_FRAG, side: BackSide, transparent: true, depthTest: false, depthWrite: false, uniforms: { uT: { value: 0 }, uK: { value: 0 } } });
  const tunnel = new Mesh(tg, tm);
  tunnel.visible = false;
  tunnel.frustumCulled = false;
  tunnel.renderOrder = 38;
  return { blue, red, purple, tunnel, bb: bolts("#7fb2ff"), rb: bolts("#ff5a6e") };
}
