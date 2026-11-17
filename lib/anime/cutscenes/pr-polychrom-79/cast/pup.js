// THE ORIGINAL SEAL: the site's pale playable pup (copied from pr-triton-kernels-22/cast/pup.js), posed as the site poses it at rest.
// `drop` lowers it from h metres to the snow over dur seconds, a pure function of the clock (0 before t0 and after t0 + dur).
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
    c = mix(c * mix(vec3(0.72, 0.74, 0.84), vec3(0.6, 0.66, 0.74), blue), min(c * mix(vec3(1.085, 1.02, 1.005), vec3(1.0), blue), vec3(0.98)), lit);
    gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
  }`;
const FLAT = /* glsl */ `
  varying vec3 vC; uniform vec3 uCol; uniform float uOwn;
  void main() { gl_FragColor = vec4(mix(uCol, vC, uOwn), 0.99); }`;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };

// o: { yaw, track: { sign: [t0, dur, hold], hop, turn, blink: [t...] }, drop: { t0, dur, h }, stand: [{ t, p, yaw }] (rig frame, last entry with t <= clock wins) }
export function sitePup(o) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
  const coat = mat(COAT), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw0 = o.yaw ?? 0, T = o.track ?? {}, D = o.drop, stand = o.stand ?? [];
  const at = (t) => { let s = stand[0]; for (const e of stand) if (e.t <= t) s = e; return s; };
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
    head,
    update(t) {
      const sign = T.sign ? env(t, ...T.sign) : 0, air = T.hop === undefined ? 0 : Math.min(1, Math.max(0, (t - T.hop) / 0.5)), hop = Math.sin(Math.PI * air);
      const st = at(t), yaw = st?.yaw ?? yaw0, drop = D && t >= D.t0 && t < D.t0 + D.dur ? D.h * (1 - smooth(D.t0, D.t0 + D.dur, t)) : 0;
      group.position.set(st?.p[0] ?? 0, (st?.p[1] ?? 0) + drop, st?.p[2] ?? 0);
      group.scale.setScalar(st?.s ?? 1);
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
