// THE ORIGINAL SEAL: the site's playable pup (its pure builder, read only), posed as the site poses it at rest.
// It opens the cutscene and is what the character turns back into. Metres, the site's size; origin on the snow, nose toward +z.
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
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
// the site's sign for the near (right) flipper, Euler YZX (twist, back, up), and how far its root reaches; the fist closes it (D.jsx)
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] }, FIST = { to: [1.5, -1.4, 0.9], reach: [0.2, 0.05, 0.6] };

export function sitePup(o) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
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
    group,
    update(t) {
      const sign = T.sign ? env(t, ...T.sign) : 0, crouch = T.crouch ? env(t, ...T.crouch) : 0, fist = T.fist ? env(t, ...T.fist) : 0;
      const air = T.hop === undefined ? 0 : Math.min(1, Math.max(0, (t - T.hop) / 0.5)), hop = Math.sin(Math.PI * air);
      group.rotation.y = yaw + ((T.turn ?? yaw) - yaw) * air * air * (3 - 2 * air);
      body.position.y = 0.22 * hop - 0.06 * crouch;
      body.scale.set(1, (1 + 0.015 * Math.sin(t * 2.4) + 0.06 * hop) * (1 - 0.12 * crouch), 1);
      rear.rotation.set(-0.22 * sign - 0.12 * hop + 0.08 * fist, 0, 0);
      head.rotation.set(-0.38 + 0.3 * sign - 0.1 * hop, 0, (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
      const r = [0, FLIPPER_REST.back - 0.35 * hop, -FLIPPER_REST.down + 1.2 * hop];
      flipL.rotation.set(r[0], r[1], r[2], "YZX");
      const near = (i) => { const s = r[i] + (SIGN.to[i] - r[i]) * sign; return s + (FIST.to[i] - s) * fist; };
      flipR.rotation.set(near(0), near(1), near(2), "YZX");
      flipR.position.set(...shoulder.map((v, i) => { const s = SIGN.reach[i] * sign; return v + s + (FIST.reach[i] - s) * fist; }));
      flipR.scale.setScalar(1 - 0.22 * sign);
      eyes.scale.y = (T.blink ?? []).some((b) => t >= b && t < b + 0.13) || (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
    },
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}
