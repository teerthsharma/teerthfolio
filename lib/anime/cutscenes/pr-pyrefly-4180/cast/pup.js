// THE PALE PLAYABLE PUP: the site's own pup from its pure builder (read only), toned to the captured frames (lit head 241 231 232, shade 155 135 132,
// slate flippers). It opens the cutscene and is what the character turns back into. `hull`: true, or a [from, to] window, shows the cream die-cut edge.
import { BackSide, Color, Group, Mesh, ShaderMaterial } from "three";
import { buildSealD, FLIPPER_REST, PIVOT } from "../../../../../components/world/seal/variants/D-parts.js";
import { PAL } from "../palette.js";

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
const HULL_V = /* glsl */ `
  uniform float uW;
  void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.0); }`;
const HULL_F = /* glsl */ `
  void main() { gl_FragColor = vec4(pow(vec3(${PAL.hull.join(", ")}), vec3(2.2)), 0.99); }`;
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const env = (t, t0, dur, hold, out = 0.3) => { if (t < t0 || t > t0 + dur + hold + out) return 0; const a = Math.min(1, (t - t0) / dur), b = t > t0 + dur + hold ? 1 - (t - t0 - dur - hold) / out : 1; return a * a * (3 - 2 * a) * Math.max(0, b); };
const SIGN = { to: [1.5, -1.8, 0.52], reach: [0.2, 0.02, 0.72] };

export function sitePup(o = {}) {
  const P = buildSealD(), made = Object.values(P).filter((g) => g?.dispose);
  const mat = (frag, u = {}) => { const m = new ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, vertexColors: true }); made.push(m); return m; };
  const coat = mat(COAT), eye = mat(FLAT, { uCol: { value: new Color() }, uOwn: { value: 1 } }), glint = mat(FLAT, { uCol: { value: new Color("#ffffff") }, uOwn: { value: 0 } });
  const hullMat = new ShaderMaterial({ uniforms: { uW: { value: 0.05 } }, vertexShader: HULL_V, fragmentShader: HULL_F, side: BackSide });
  made.push(hullMat);
  const hulls = [];
  const skin = (geo) => {
    const m = new Mesh(geo, coat);
    if (geo.attributes.normal) { const h = new Mesh(geo, hullMat); h.visible = false; h.frustumCulled = false; m.add(h); hulls.push(h); }
    return m;
  };
  const group = new Group(), body = new Group(), rear = new Group(), neck = new Group(), head = new Group(), eyes = new Group(), flipL = new Group(), flipR = new Group(), mirror = new Group(), tail = new Group();
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear), yaw = o.yaw ?? 0, T = o.track ?? {};
  group.add(body); body.add(rear);
  rear.position.set(...PIVOT.rear);
  rear.add(skin(P.body), flipL, mirror, tail, neck);
  flipL.position.set(...shoulder); flipL.add(skin(P.flipper));
  mirror.scale.set(-1, 1, 1); mirror.add(flipR); flipR.add(skin(P.flipper));
  tail.position.set(...rel(PIVOT.tail, PIVOT.rear)); tail.add(skin(P.tail));
  neck.position.set(...rel(PIVOT.neck, PIVOT.rear)); neck.add(head);
  head.position.set(...rel(PIVOT.head, PIVOT.neck)); head.add(skin(P.head), eyes);
  eyes.position.set(...P.eyePivot); eyes.add(new Mesh(P.lenses, eye), new Mesh(P.glints, glint));
  return {
    group,
    update(t) {
      const sign = T.sign ? env(t, ...T.sign) : 0;
      group.rotation.y = yaw;
      body.position.y = 0;
      body.scale.set(1, 1 + 0.015 * Math.sin(t * 2.4), 1);
      rear.rotation.set(-0.22 * sign, 0, 0);
      head.rotation.set(-0.38 + 0.3 * sign, 0, (1 - sign) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.12 * sign, "YXZ");
      const r = [0, FLIPPER_REST.back, -FLIPPER_REST.down];
      flipL.rotation.set(r[0], r[1], r[2], "YZX");
      flipR.rotation.set(r[0] + (SIGN.to[0] - r[0]) * sign, r[1] + (SIGN.to[1] - r[1]) * sign, r[2] + (SIGN.to[2] - r[2]) * sign, "YZX");
      flipR.position.set(...shoulder.map((v, i) => v + SIGN.reach[i] * sign));
      flipR.scale.setScalar(1 - 0.22 * sign);
      eyes.scale.y = (T.blink ?? []).some((b) => t >= b && t < b + 0.13) || (t + 1.3) % 4.3 < 0.12 ? 0.12 : 1;
      const on = o.hull === true || (Array.isArray(o.hull) && t >= o.hull[0] && t < o.hull[1]);
      for (const h of hulls) h.visible = on;
    },
    dispose() { for (const x of made) x.dispose(); group.removeFromParent(); },
  };
}
