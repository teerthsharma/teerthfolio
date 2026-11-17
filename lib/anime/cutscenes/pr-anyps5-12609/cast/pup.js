// THE ORIGINAL SEAL: the site's playable pup (read-only builder), toned to the captured frames (lit head 241 231 232, shade 155 135 132).
// Metres at scale 1; the origin is on the snow under the body, the nose toward +z.
import { BackSide, Color, Group, Mesh, ShaderMaterial } from "three";
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
const HULL_VERT = /* glsl */ `
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.014, 1.0); }`;
const HULL = /* glsl */ `
  void main() { gl_FragColor = vec4(pow(vec3(0.043, 0.039, 0.063), vec3(2.2)), 0.99); }`;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };

export function sitePup(o) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
  const coat = mat(COAT), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const hull = new ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL, side: BackSide }); made.push(hull);
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw = o.yaw ?? 0, T = o.track ?? {};
  group.add(body); body.add(rear);
  rear.position.set(...PIVOT.rear);
  rear.add(new Mesh(P.body, coat), new Mesh(P.body, hull), flipL, mirror, tail, neck);
  flipL.position.set(...shoulder); flipL.add(new Mesh(P.flipper, coat), new Mesh(P.flipper, hull));
  mirror.scale.set(-1, 1, 1); mirror.add(flipR); flipR.add(new Mesh(P.flipper, coat), new Mesh(P.flipper, hull));
  tail.position.set(...rel(PIVOT.tail, PIVOT.rear)); tail.add(new Mesh(P.tail, coat), new Mesh(P.tail, hull));
  neck.position.set(...rel(PIVOT.neck, PIVOT.rear)); neck.add(head);
  head.position.set(...rel(PIVOT.head, PIVOT.neck)); head.add(new Mesh(P.head, coat), new Mesh(P.head, hull), eyes);
  eyes.position.set(...P.eyePivot); eyes.add(new Mesh(P.lenses, eye), new Mesh(P.glints, glint));
  return {
    group,
    update(t) {
      const sign = T.sign ? env(t, ...T.sign) : 0, air = T.hop === undefined ? 0 : Math.min(1, Math.max(0, (t - T.hop) / 0.5)), hop = Math.sin(Math.PI * air);
      group.rotation.y = yaw + ((T.turn ?? yaw) - yaw) * air * air * (3 - 2 * air);
      body.position.y = 0.22 * hop;
      body.scale.set(1, 1 + 0.015 * Math.sin(t * 2.4) + 0.06 * hop, 1);
      rear.rotation.set(-0.22 * sign - 0.12 * hop, 0, 0);
      head.rotation.set(-0.38 + 0.3 * sign - 0.1 * hop, 0, (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
      const r = [0, FLIPPER_REST.back - 0.35 * hop, -FLIPPER_REST.down + 1.2 * hop];
      flipL.rotation.set(r[0], r[1], r[2], "YZX");
      flipR.rotation.set(r[0] + (SIGN.to[0] - r[0]) * sign, r[1] + (SIGN.to[1] - r[1]) * sign, r[2] + (SIGN.to[2] - r[2]) * sign, "YZX");
      flipR.position.set(...shoulder.map((v, i) => v + SIGN.reach[i] * sign)); flipR.scale.setScalar(1 - 0.22 * sign);
      eyes.scale.y = (T.blink ?? []).some((b) => t >= b && t < b + 0.13) || (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
    },
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}
