// aura: the Ultra Instinct aura as flat additive cones, sparks and a ground ring (port of the live fx.js buildAura; cones are overlays).
import { AdditiveBlending, ConeGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { PAL, T } from "../clock.js";
import { toned } from "../tone.js";
import { hash, inst, put } from "../util.js";

const TOP = 0.03, FLAMES = 44, CROWN = 7;
const UP = new Vector3(0, 1, 0), P = new Vector3(), S = new Vector3(), DIR = new Vector3(), Q = new Quaternion(), M = new Matrix4();
const VERT = /* glsl */ `
  void main() {
    mat4 m = modelViewMatrix;
  #ifdef USE_INSTANCING
    m = m * instanceMatrix;
  #endif
    gl_Position = projectionMatrix * m * vec4(position, 1.0);
  }`;
const FRAG = /* glsl */ `uniform vec3 uCol; uniform float uA; void main() { gl_FragColor = vec4(uCol * uA, 0.0); }`;
const layer = (hex, a) => new ShaderMaterial({
  uniforms: { uCol: { value: new Vector3(...toned(hex)) }, uA: { value: a } }, vertexShader: VERT, fragmentShader: FRAG,
  transparent: true, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true,
});

// the gutter: the form stutters for the spend (tt 9.2 to the tap), a third of the steps lit
export const stutter = (tt) => (tt >= T.gut[0] && tt < T.tap ? (Math.floor(tt * 12 + 1e-6) % 3 === 0 ? 1 : 0.5) : 1);

export function buildAura(ctx) {
  const cone = new ConeGeometry(0.2, 1, 5).translate(0, 0.5, 0);
  const layers = [["#6a2fd0", 0.8], ["#a58cf0", 0.7], ["#e6ecff", 0.75]].map(([c, a]) => inst(cone, layer(c, a), FLAMES));
  layers.forEach((l, i) => { l.renderOrder = 4 + i; });
  const sparks = inst(new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5), layer(PAL.spark, 0.9), 40);
  sparks.userData.tier = 2;
  const ring = new Mesh(new RingGeometry(0.86, 1, 44).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: PAL.ring, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, fog: false }));
  ring.position.y = 0.05; ring.visible = false; ring.frustumCulled = false;
  const group = new Group();
  group.userData.layer = 1;
  group.add(...layers, sparks, ring);
  const flame = Array.from({ length: FLAMES }, (_, i) => {
    if (i < CROWN) {
      const k = i - (CROWN - 1) / 2;
      return { x: k * 0.1, y: 1.0, z: -0.2, dx: k * 0.2, dy: 1, dz: -0.28, len: 1.95 - Math.abs(k) * 0.3, w: 0.9 };
    }
    const a = hash(i, 1) * Math.PI * 2, r0 = 0.25 + 0.55 * hash(i, 2), front = Math.sin(a) > 0.45;
    return { x: Math.cos(a) * r0, y: 0.15 + 0.7 * hash(i, 3), z: Math.sin(a) * r0 * 0.8 - 0.3, dx: Math.cos(a) * 0.6, dy: 1, dz: Math.sin(a) * 0.35 - 0.25, len: (0.9 + 1.4 * hash(i, 4)) * (front ? 0.4 : 1), w: 0.8 + 0.5 * hash(i, 5) };
  });
  return {
    group, layers, sparks, ring, stutter,
    update(tt, k, pulse, ringAge, at) {
      if (at) group.position.set(at[0], TOP, at[1]);
      const step = Math.floor(tt * 12);
      for (let i = 0; i < FLAMES; i++) {
        const f = flame[i], fl = 0.72 + 0.55 * hash(i, 20 + (step % 17)) + 0.15 * pulse, L = f.len * k * fl;
        DIR.set(f.dx, f.dy, f.dz).normalize();
        Q.setFromUnitVectors(UP, DIR);
        for (let l = 0; l < 3; l++) {
          const sc = [1, 0.68, 0.38][l], lk = Math.max(0, k * 1.6 - 0.6 * l), len = Math.max(0.0001, L * [1, 0.8, 0.58][l] * Math.min(1, lk));
          P.set(f.x, f.y, f.z);
          S.set(f.w * sc * (0.7 + 0.5 * len), len, f.w * sc * (0.7 + 0.5 * len));
          M.compose(P, Q, S);
          layers[l].setMatrixAt(i, M);
        }
      }
      for (const l of layers) l.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 40; i++) {
        const life = (tt * (0.5 + 0.4 * hash(i, 2)) + hash(i, 3)) % 1;
        const a = hash(i, 1) * 6.28 + tt * 0.8 * (hash(i, 4) > 0.5 ? 1 : -1);
        const r = 0.5 + 1.1 * hash(i, 5);
        const s = 0.05 * (0.5 + hash(i, 6)) * k * Math.sin(life * Math.PI);
        put(sparks, i, Math.cos(a) * r, 0.1 + life * 3.2, Math.sin(a) * r * 0.8 - 0.3, Math.max(s, 0.0001), Math.max(s * 1.8, 0.0001), Math.max(s, 0.0001), 0, a, 0.4 * Math.sin(i));
      }
      sparks.instanceMatrix.needsUpdate = true;
      ring.visible = ringAge >= 0 && ringAge < 0.55;
      if (ring.visible) {
        ring.scale.setScalar(0.8 + 9 * (ringAge / 0.55) ** 0.6);
        ring.material.opacity = 0.9 * (1 - ringAge / 0.55);
      }
    },
    dispose() {
      for (const m of [...layers, sparks]) { m.geometry.dispose(); m.material.dispose(); m.dispose(); }
      ring.geometry.dispose();
      ring.material.dispose();
    },
  };
}
