// pr-highway-3244 WORLD / atmosphere: 160 gold dust motes in the sunset air round the chariot (layer 1), plus a low warm haze card on the horizon.
// MOTES: base position b_i in a 36 x 7 x 60 m box about the origin (hash-seeded, the rng keeps scrubbing exact).
//   drift  = b + (0.4 sin(0.6 t + 7 s), 0.25 sin(0.9 t + 3 s), 0.5 cos(0.5 t + 5 s))
//   wind   : z wraps with the treadmill, z = mod(b.z - 0.55 D + 30, 60) - 30, so they stream past while the chariot runs
//   disc   : gl_PointSize = k / -mv.z (the card gets bigger toward the lens), soft round alpha 1 - smoothstep(0.35, 0.5, r)
//   colour : #ffdc8c x 0.7 (below 1: a warm sparkle, not a bloom bomb), additive with the target alpha (set id) untouched.
// HAZE: a mist card (tools/mist) in rose #fa9480 low on the horizon behind the mesas, alpha 0.35: warm air, never milky on the seal.
import { PAL, V } from "./common.js";
import { mistCard } from "../../../paint.js";

const VERT = /* glsl */ `
  attribute vec4 aB; uniform float uTime; uniform float uD; uniform float uK;
  varying float vA;
  void main() {
    float s = aB.w;
    vec3 p = aB.xyz + vec3(0.4 * sin(0.6 * uTime + 7.0 * s), 0.25 * sin(0.9 * uTime + 3.0 * s), 0.5 * cos(0.5 * uTime + 5.0 * s));
    p.z = mod(p.z - 0.55 * uD + 30.0, 60.0) - 30.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uK / max(-mv.z, 0.5) * (0.6 + 0.8 * fract(s * 13.0)), 1.0, 24.0);
    vA = 0.45 + 0.55 * fract(s * 7.0 + uTime * 0.5);
  }`;
const FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.35, 0.5, r)) * vA;
    gl_FragColor = vec4(${V(PAL.sunGlow2)} * 0.7 * a, a);
  }`;

export function buildMotes(ctx) {
  const { THREE } = ctx;
  const rng = ctx.rng("motes");
  const N = 160, B = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) B.set([(rng() - 0.5) * 36, 0.4 + rng() * 6.6, (rng() - 0.5) * 60, rng()], i * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aB", new THREE.BufferAttribute(B, 4));
  const uniforms = { uTime: { value: 0 }, uD: { value: 0 }, uK: { value: 120 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, // add the colour, leave the target alpha (the set id)
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.userData.layer = 1;

  const haze = mistCard(900, 60, PAL.haze, 0.35, 4);
  haze.position.set(0, 0, 330); haze.rotation.y = Math.PI; haze.userData.layer = 0;
  const group = new THREE.Group(); group.add(pts, haze);
  return { group, uniforms, dispose() { geo.dispose(); mat.dispose(); haze.geometry.dispose(); haze.material.dispose(); } };
}
