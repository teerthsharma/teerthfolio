// E06 THE RUMBLING RANK: an impostor field of colossal titans marching to the horizon (frame 06: hundreds of tiny titans repeating
// across the sunset, steam-lit and blended into the clouds). ONE draw call: 960 instanced quads (2 triangles each) whose fragment
// shader paints the silhouette analytically (no atlas texture needed): backlit core #3a1f16, a rim of #e9a252 from the sun side,
// haze lerped toward #c77744 by distance (value compression, never a hue shift). Layer 1 (it steps on threes and rises over the crest).
//
// MATHS
//  rows r = 0..17: z_r = -260 - 1240 (r / 17)^1.25, 54 titans per row, x spread +-(0.8 |z| + 60), jitter +-30%, height 80 m +-10%.
//  billboard: right = normalize(cross(up, camera - base)); corner = base + right * (q.x * 0.52 H) + up * q.y * H.
//  step cycle (on threes): c = fract(t / 0.9 + seed);  bob = 0.4 (H / 80) |sin(pi c)|;  leg swing = .045 sin(2 pi c), quantised to 3 pose frames.
//  rise: y offset = -H (1 - rise) over 4.0-6.0 s;  sink after the gap: -H .9 smoothstep(10.35, 12, t);  advance 4 m/s toward the camera from 4.0 s.
//  silhouette: 2D SDF in (x in [0,1], y in [0,1]) = smooth-min of capsules (legs, torso, arms) and ellipses (head 9% of H, hunched shoulders);
//      sd > 0 is discarded.  rim = smoothstep(-.035, 0, sd) * (.45 + .55 smoothstep(.3, .9, x));  feet fade into steam #b5a8b1 below y = .08.
//  haze: h = 1 - e^{-dist/700};  col = mix(col, haze, .85 h)  (far rows contrast 0.35).
import { V } from "../../../paint.js";
import { C, T, smooth, timing } from "./pal.js";

const ROWS = 18, PER = 54;

const VERT = /* glsl */ `
  attribute vec4 aInst; uniform float uT; uniform float uRise; uniform float uSink; uniform float uAdv;
  varying vec2 vQ; varying float vDist; varying float vSeed; varying float vCyc;
  void main() {
    float H = aInst.z, seed = aInst.w;
    float cyc = fract(uT / 0.9 + seed);
    float bob = 0.4 * (H / 80.0) * abs(sin(3.14159 * cyc));
    vec3 base = vec3(aInst.x, 0.0, aInst.y + uAdv);
    base.y -= H * (1.0 - uRise) + H * 0.9 * uSink;
    vec3 toCam = cameraPosition - base; toCam.y = 0.0;
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam) + vec3(1e-5));
    vec3 P = base + right * (position.x * 0.52 * H) + vec3(0.0, position.y * H + bob, 0.0);
    vQ = vec2(position.x + 0.5, position.y); vDist = length(cameraPosition - base); vSeed = seed; vCyc = cyc;
    gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
  }`;

const FRAG = /* glsl */ `
  const vec3 CORE = ${V(C.rankCore)}; const vec3 RIM = ${V(C.rankRim)}; const vec3 HAZE = ${V(C.haze)}; const vec3 STEAM = ${V(C.steamShade)};
  varying vec2 vQ; varying float vDist; varying float vSeed; varying float vCyc; uniform float uDark;
  float sdCap(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r; }
  float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
  void main() {
    vec2 q = vQ;
    float ph = floor(vCyc * 3.0) / 3.0;                                  // three pose frames
    float sw = 0.045 * sin(6.2832 * ph);
    float lean = 0.02 + 0.015 * fract(vSeed * 7.0);                      // the hunch, a little different each
    float d = sdCap(q, vec2(0.43, 0.50), vec2(0.41 + sw, 0.02), 0.075);   // legs
    d = smin(d, sdCap(q, vec2(0.57, 0.50), vec2(0.59 - sw, 0.02), 0.075), 0.03);
    d = smin(d, sdCap(q, vec2(0.50 + lean, 0.80), vec2(0.50, 0.50), 0.115), 0.05);          // torso
    d = smin(d, (length((q - vec2(0.50 + lean, 0.80)) / vec2(0.19, 0.07)) - 1.0) * 0.07, 0.04);   // hunched shoulders
    d = smin(d, sdCap(q, vec2(0.33 + lean, 0.78), vec2(0.30 - sw * 0.6, 0.50), 0.045), 0.03);    // arms
    d = smin(d, sdCap(q, vec2(0.67 + lean, 0.78), vec2(0.70 + sw * 0.6, 0.50), 0.045), 0.03);
    d = smin(d, (length((q - vec2(0.51 + lean * 1.6, 0.935)) / vec2(0.04, 0.045)) - 1.0) * 0.04, 0.02);   // the small bald head
    if (d > 0.0) discard;
    vec3 col = CORE * (0.85 + 0.3 * fract(vSeed * 13.0)) * mix(0.8, 1.15, smoothstep(0.1, 0.8, q.y));
    float rim = smoothstep(-0.035, 0.0, d) * (0.45 + 0.55 * smoothstep(0.3, 0.9, q.x));
    col = mix(col, RIM * 1.1, rim);
    col = mix(col, STEAM, (1.0 - smoothstep(0.0, 0.08, q.y)) * 0.8);
    float hz = 1.0 - exp(-vDist / 700.0);
    col = mix(col, HAZE, 0.85 * hz);
    col = mix(col, col * vec3(0.5, 0.54, 0.78), uDark);
    gl_FragColor = vec4(col, vDist < 520.0 ? 0.54 : 0.5);                // near rows get a set line, the far ones paint flat into the haze
  }`;

export function buildRank(ctx) {
  const { THREE } = ctx;
  const R = ctx.rng("rank"), H = timing(ctx);
  const N = ROWS * PER, inst = new Float32Array(N * 4);
  for (let r = 0; r < ROWS; r++) {
    const z = -260 - 1240 * Math.pow(r / (ROWS - 1), 1.25), half = 0.8 * Math.abs(z) + 60;
    for (let k = 0; k < PER; k++) {
      const i = (r * PER + k) * 4, u = (k + 0.5 + (R() - 0.5) * 0.6) / PER;
      inst[i] = (u * 2 - 1) * half; inst[i + 1] = z + (R() - 0.5) * 20; inst[i + 2] = 80 * (0.9 + 0.2 * R()); inst[i + 3] = (r * 0.37 + R() * 0.2) % 1;
    }
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute("aInst", new THREE.InstancedBufferAttribute(inst, 4));
  geo.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uT: { value: 0 }, uRise: { value: 0 }, uSink: { value: 0 }, uAdv: { value: 0 }, uDark: { value: 0 } },
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.userData.layer = 1;
  const group = new THREE.Group(); group.add(mesh);
  return {
    group,
    update(t, dt, cue) {
      const u = mat.uniforms;
      u.uT.value = Math.floor(t * 8) / 8;                                         // on threes
      u.uRise.value = H.prog("rise", T.rise[0], T.rise[1], t, cue);
      u.uSink.value = smooth(T.gap[0], 12.0, t);
      u.uAdv.value = 4 * Math.max(0, Math.min(t, T.gap[0]) - 4.0);
      u.uDark.value = 0.55 * (t >= T.dark[0] ? 1 : 0) * (1 - smooth(7.1, 8.0, t));
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
