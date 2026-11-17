// THE ORIGINAL SEAL: the site's pup (read-only builder) toned to the captured frames, posed with D.jsx's hooks; metres, nose toward +z.
import { Color, Group, Mesh, ShaderMaterial } from "three";
import { buildSealD, FLIPPER_REST, PIVOT } from "../../../../../components/world/seal/variants/D-parts.js";

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  void main() { vC = color; vN = normalMatrix * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const COAT = /* glsl */ `
  varying vec3 vN; varying vec3 vC;
  void main() {
    vec3 c = pow(max(vC, vec3(0.0)), vec3(1.0 / 2.2));
    float k = dot(normalize(vN), normalize(vec3(0.0, 0.95, 0.3))), e = fwidth(k) + 0.07, lit = smoothstep(0.1 - e, 0.1 + e, k), blue = clamp((c.b - c.r) * 3.0, 0.0, 1.0);
    c = mix(c * mix(vec3(0.66, 0.58, 0.58), vec3(0.6, 0.66, 0.74), blue), min(c * mix(vec3(1.085, 1.02, 1.005), vec3(1.0), blue), vec3(0.98)), lit);
    gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
  }`;
const FLAT = /* glsl */ `
  varying vec3 vC; uniform vec3 uCol; uniform float uOwn;
  void main() { gl_FragColor = vec4(mix(uCol, vC, uOwn), 0.99); }`;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const blend = (r, to, w) => r.map((v, i) => v + (to[i] - v) * w);
// Euler YZX (twist, back, up) targets: the hand sign on the near flipper, the fist (near), the raise (both)
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };
const FIST = { to: [1.5, -1.4, 0.9], reach: [0.2, 0.05, 0.6] };
const RAISE = [0, -0.4, 1.0];

export function sitePup(o = {}) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
  const coat = mat(COAT), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw0 = o.yaw ?? 0;
  group.add(body); body.add(rear);
  rear.position.set(...PIVOT.rear);
  rear.add(new Mesh(P.body, coat), flipL, mirror, tail, neck);
  flipL.position.set(...shoulder); flipL.add(new Mesh(P.flipper, coat));
  mirror.scale.set(-1, 1, 1); mirror.add(flipR); flipR.position.set(...shoulder); flipR.add(new Mesh(P.flipper, coat));
  tail.position.set(...rel(PIVOT.tail, PIVOT.rear)); tail.add(new Mesh(P.tail, coat));
  neck.position.set(...rel(PIVOT.neck, PIVOT.rear)); neck.add(head);
  head.position.set(...rel(PIVOT.head, PIVOT.neck)); head.add(new Mesh(P.head, coat), eyes);
  eyes.position.set(...P.eyePivot); eyes.add(new Mesh(P.lenses, eye), new Mesh(P.glints, glint));
  const pose = (t, k = {}) => {
    const { sit = 0, raise = 0, fist = 0, spin = 0, crouch = 0, sign = 0 } = k;
    group.rotation.y = (k.yaw ?? yaw0) + spin * 2 * Math.PI;
    const breathe = (0.015 + 0.02 * sit) * Math.sin(t * (2.4 - 1.3 * sit));
    body.scale.set(1 + 0.1 * crouch, (1 - 0.2 * crouch) * (1 + breathe), 1 + 0.1 * crouch);
    rear.position.y = PIVOT.rear[1] + 0.05 * sit;
    rear.rotation.set(-0.22 * sign - 0.6 * sit - 0.2 * raise + 0.08 * fist, 0, 0);
    neck.rotation.set(0.25 * sit + 0.3 * crouch, 0, 0);
    head.rotation.set(-0.38 + 0.1 * sit + 0.3 * sign, 0, (1 - sit) * (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
    const back = FLIPPER_REST.back - 0.55 * sit, down = FLIPPER_REST.down + 0.35 * sit, rest = [0, back, -down];
    const far = blend(rest, RAISE, raise), near = blend(blend(blend(rest, SIGN.to, sign), FIST.to, fist), RAISE, raise);
    flipL.rotation.set(far[0], far[1], far[2], "YZX");
    flipR.rotation.set(near[0], near[1], near[2], "YZX");
    flipR.position.set(...shoulder.map((v, i) => v + SIGN.reach[i] * sign + FIST.reach[i] * fist));
    flipR.scale.setScalar(1 - 0.22 * sign);
    eyes.scale.y = (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
  };
  pose(0);
  return {
    group,
    update: pose,
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}
