// THE PALE PLAYABLE SEAL: the site's own pup (its pure builder, read only), toned to the captured frames. Metres at the site's size; origin on the snow, nose toward +z.
// On the tear it keeps the island side of the live's tear edge (splitWrap); the DIO seal keeps the other side (cast/index.js).
import { Color, Group, Mesh, ShaderMaterial } from "three";
import { buildSealD, FLIPPER_REST, PIVOT } from "../../../../../components/world/seal/variants/D-parts.js";

// the yaws (rad) of the dock pose and the pose after the return; start values, fit by the captures recorded in proof/pup/PUP0.txt
export const PUP_YAW = { open: 0.3, end: -0.1 };

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  void main() { vC = color; vN = normalMatrix * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// madhouse/mhCel2 (pull name mhCel2), written inline: one hard terminator, the shade slid cool; the pup is built at frame 0 and loadPack is async
const COAT = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  void main() {
    vec3 c = pow(max(vC, vec3(0.0)), vec3(1.0 / 2.2));
    float k = dot(normalize(vN), normalize(vec3(0.0, 0.95, 0.3))), lit = step(0.1, k), blue = clamp((c.b - c.r) * 3.0, 0.0, 1.0);
    vec3 body = mix(c, vec3(dot(c, vec3(0.333))) + vec3(0.02, 0.0, 0.04), 0.55 * (1.0 - blue));
    c = mix(body * vec3(0.83, 0.82, 0.90), min(body * vec3(1.06, 1.02, 1.0), vec3(0.97)), lit);
    c = mix(c, mix(vec3(0.24, 0.33, 0.45), vec3(0.34, 0.43, 0.58), lit), blue * 0.9);
    gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
  }`;
const FLAT = /* glsl */ `
  varying vec3 vC; uniform vec3 uCol; uniform float uOwn;
  void main() { gl_FragColor = vec4(mix(uCol, vC, uOwn), 0.99); }`;
// the live's tear edge (COMMON.tearCut in live/ink.js): a per-fragment cut on the same q, mode 1 keeps the dimension side, mode 2 the island side
const SPLIT = /* glsl */ `
  uniform float uSpTear, uSpMode; uniform vec2 uSpDir, uSpRes;
  float spH(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  float spH2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float spN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(spH2(i), spH2(i + vec2(1, 0)), f.x), mix(spH2(i + vec2(0, 1)), spH2(i + vec2(1, 1)), f.x), f.y); }
  bool spCut() {
    if (uSpTear < -0.5) return false;
    vec2 p = gl_FragCoord.xy / uSpRes;
    float q = dot(p, uSpDir) + (spH(floor(gl_FragCoord.y / 14.0) + 3.0) - 0.5) * 0.07 + (spN(p * 9.0) - 0.5) * 0.05;
    return uSpMode < 1.5 ? q < uSpTear : q >= uSpTear;
  }`;
const MAIN = /void\s+main\s*\(\s*\)/;
// one main() per material: it becomes spMain() and a main() that discards the far side first; false when the shader has no single main()
export function splitWrap(m, mode, U) {
  const f = m.fragmentShader;
  if (f.split(MAIN).length !== 2) return false;
  m.fragmentShader = f.replace(MAIN, "void spMain()") + SPLIT + "void main() { if (spCut()) discard; spMain(); }";
  Object.assign(m.uniforms, { uSpTear: U.uTear, uSpDir: U.uTearDir, uSpRes: U.uRes, uSpMode: { value: mode } });
  m.needsUpdate = true;
  return true;
}
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
// the site's sign for the near (right) flipper, Euler YZX, and how far its root reaches; the JoJo twist uses the same target on its own envelope
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };

// o: { yaw, U?, track: { sign: [t0, dur, hold], jojo: [t0, dur], yaw2: [t, yaw], blink: [t...] } }; U = the shared uniforms (araki(ctx).U) for the tear split; the pup stands still (no walk)
export function sitePup(o) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => {
    const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true });
    if (o.U) splitWrap(m, 2, o.U);
    made.push(m); return m;
  };
  const coat = mat(COAT), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw = o.yaw ?? 0, T = o.track ?? {};
  group.add(body); body.add(rear);
  rear.position.set(...PIVOT.rear);
  rear.add(new Mesh(P.body, coat), flipL, mirror, tail, neck);
  flipL.position.set(...shoulder); flipL.add(new Mesh(P.flipper, coat));
  mirror.scale.set(-1, 1, 1); mirror.add(flipR); flipR.add(new Mesh(P.flipper, coat));
  tail.position.set(...rel(PIVOT.tail, PIVOT.rear)); tail.add(new Mesh(P.tail, coat));
  neck.position.set(...rel(PIVOT.neck, PIVOT.rear)); neck.add(head);
  head.position.set(...rel(PIVOT.head, PIVOT.neck)); head.add(new Mesh(P.head, coat), eyes);
  eyes.position.set(...P.eyePivot); eyes.add(new Mesh(P.lenses, eye), new Mesh(P.glints, glint));
  return {
    group, head,
    update(t) {
      const sign = T.sign ? env(t, ...T.sign) : 0, jo = T.jojo ? env(t, T.jojo[0], T.jojo[1], Infinity) : 0, f = Math.max(sign, jo);
      group.rotation.y = (T.yaw2 && t >= T.yaw2[0] ? T.yaw2[1] : yaw) - 0.55 * jo;
      body.position.y = 0.07 * jo;
      body.rotation.set(-0.08 * jo, 0, -0.14 * jo);
      body.scale.set(1, 1 + 0.015 * Math.sin(t * 2.4), 1);
      rear.rotation.set(-0.22 * sign, 0, 0);
      head.rotation.set(-0.38 + 0.3 * sign, 0, (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
      const r = [0, FLIPPER_REST.back, -FLIPPER_REST.down];
      flipL.rotation.set(r[0], r[1], r[2], "YZX");
      flipR.rotation.set(r[0] + (SIGN.to[0] - r[0]) * f, r[1] + (SIGN.to[1] - r[1]) * f, r[2] + (SIGN.to[2] - r[2]) * f, "YZX");
      flipR.position.set(...shoulder.map((v, i) => v + SIGN.reach[i] * f)); flipR.scale.setScalar(1 - 0.22 * f);
      eyes.scale.y = (T.blink ?? []).some((b) => t >= b && t < b + 0.13) || (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
    },
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}
