// THE ORIGINAL SEAL: the pale playable pup from the site's own builder (read only), posed as the site poses it. It opens the cutscene and is
// what the character turns back into. Metres, the site's size; the origin is on the planks under the body, the nose toward +z.
import { DoubleSide, Group, Mesh, RingGeometry, ShaderMaterial, Color } from "three";
import { buildSealD, FLIPPER_REST, PIVOT } from "../../../../../components/world/seal/variants/D-parts.js";
import { WASH, WASH_U } from "./wash.js";
import { TONE, toned } from "../tone.js";

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vC; varying vec3 vWP;
  void main() { vC = color; vN = mat3(modelMatrix) * normal; vWP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const COAT = /* glsl */ `
  ${TONE}
  ${WASH}
  varying vec3 vN; varying vec3 vC; varying vec3 vWP;
  void main() {
    vec3 c = pow(max(vC, vec3(0.0)), vec3(1.0 / 2.2));
    float blue = clamp((c.b - c.r) * 3.0, 0.0, 1.0);
    vec3 base = mix(c, vec3(0.408, 0.561, 0.761), blue);
    gl_FragColor = vec4(siteTone(pow(wpPrint(base, normalize(vN), normalize(cameraPosition - vWP), vWP), vec3(2.2))), 0.99);
  }`;
const FLAT = /* glsl */ `
  ${TONE}
  varying vec3 vC; uniform vec3 uCol; uniform float uOwn;
  void main() { gl_FragColor = vec4(siteTone(mix(uCol, vC, uOwn)), 0.99); }`;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
// the site's sign for the near (right) flipper, Euler YZX (twist, back, up), and how far its root reaches
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };
const HALO_AT = [0, 0.66, -0.06], HALO_TILT = [-Math.PI / 2 + 0.3, 0, 0];

// o: { yaw, track: { sign: [t0, dur, hold], hop, turn, blink: [t...] } }; update(t, sit) takes the sit pose 0..1
export function sitePup(o) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
  const coat = mat(COAT, { ...WASH_U }), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw = o.yaw ?? 0, Tr = o.track ?? {};
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
    update(t, sit = 0) {
      const sign = Tr.sign ? env(t, ...Tr.sign) : 0, air = Tr.hop === undefined ? 0 : Math.min(1, Math.max(0, (t - Tr.hop) / 0.5)), hop = Math.sin(Math.PI * air);
      group.rotation.y = yaw + ((Tr.turn ?? yaw) - yaw) * air * air * (3 - 2 * air);
      body.position.y = 0.22 * hop - 0.05 * sit;
      body.scale.set(1, 1 + 0.015 * Math.sin(t * 2.4) + 0.06 * hop, 1);
      rear.rotation.set(-0.22 * sign - 0.12 * hop - 0.55 * sit, 0, 0);
      head.rotation.set(-0.38 + 0.3 * sign - 0.1 * hop + 0.4 * sit, 0, (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
      // both flippers: rest, flung up on the hop and folded in the sit; the near one takes the site's sign (raised before the cheek)
      const r = [0, FLIPPER_REST.back - 0.35 * hop, -FLIPPER_REST.down + 1.2 * hop], z = 0.35 * sit;
      flipL.rotation.set(r[0], r[1], r[2] + z, "YZX");
      flipR.rotation.set(r[0] + (SIGN.to[0] - r[0]) * sign, r[1] + (SIGN.to[1] - r[1]) * sign, r[2] + (SIGN.to[2] - r[2]) * sign + z, "YZX");
      flipR.position.set(...shoulder.map((v, i) => v + SIGN.reach[i] * sign)); flipR.scale.setScalar(1 - 0.22 * sign);
      eyes.scale.y = (Tr.blink ?? []).some((b) => t >= b && t < b + 0.13) || (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
    },
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}

// The meditation halo: two rings above the crown (the site's D.jsx sizes), premultiplied, washed off by the run like the pup.
const ringMat = (a) => {
  const c = toned("#ffd66b").map((v) => v.toFixed(4)).join(", ");
  return new ShaderMaterial({
    uniforms: { ...WASH_U },
    transparent: true, premultipliedAlpha: true, depthWrite: false, side: DoubleSide,
    vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${WASH}
      void main() {
        float k = (1.0 - (uWashRun <= 0.0 ? 0.0 : smoothstep(0.0, 0.2, wpFront()))) * ${a.toFixed(3)};
        gl_FragColor = vec4(vec3(${c}) * k, k);
      }`,
  });
};
export function halo() {
  const g = new Group();
  g.position.set(...HALO_AT); g.rotation.set(...HALO_TILT);
  g.add(new Mesh(new RingGeometry(0.24, 0.32, 40), ringMat(0.85)), new Mesh(new RingGeometry(0.18, 0.42, 40), ringMat(0.35)));
  g.userData.plateDepth = true;
  return g;
}
