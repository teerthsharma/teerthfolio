// Painted contact shadows for home: cool lilac glaze blobs under the pup, Thors, the jetty posts, the igloo, the longship,
// the penguins and the orca (one instanced draw), and the set's reflection smears on the water (one more). Premultiplied, layer 1,
// fading with the wash run like the rest of the set.
import { Color, Group, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { NOISE, U } from "../live/paper.js";
import { H, WATER_Y, shoreL } from "../live/land.js";
import { IGLOO, JETTY, SHIP } from "../live/farm.js";
import { LINE, T, THORS_AT, orcaAt, smooth } from "../clock.js";

const BASE = 0.38, N = 19, ORCA = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const Y = new Vector3(0, 1, 0), P = new Vector3(), S = new Vector3(), Q = new Quaternion(), M = new Matrix4(), C = new Color();
const SMEAR = [
  { x: IGLOO.x, z: IGLOO.z, w: 4, col: "#f6f1e8" },
  { x: SHIP.x, z: SHIP.z, w: 9, col: "#a5453a" },
  { x: THORS_AT[0], z: THORS_AT[2], w: 0.9, col: "#7a2e1c" },
  { x: 0, z: 0, w: 0.6, col: "#e9e8f4" },
  { x: (JETTY.x0 + JETTY.x1) / 2, z: 0, w: 8, col: "#957a5a" },
];
const SRGB = (hex) => new Color(hex).convertLinearToSRGB();

export function buildShadows() {
  const geo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new ShaderMaterial({
    uniforms: { uRun: U.uRun },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vA;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vA = instanceColor.r;
        #else
          vA = 1.0;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uRun;
      varying vec2 vUv;
      varying float vA;
      ${NOISE}
      void main() {
        vec2 q = vUv * 2.0 - 1.0;
        float r = length(q) + (fbm(vUv * 4.0 + 3.0) - 0.5) * 0.35;
        float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA * (1.0 - uRun);
        gl_FragColor = vec4(vec3(0.486, 0.533, 0.784) * a, a);
      }`,
  });
  const mesh = new InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  const put = (i, x, y, z, sx, sz, yaw, a) => {
    P.set(x, y, z);
    S.set(Math.max(sx, 0.0001), 1, Math.max(sz, 0.0001));
    Q.setFromAxisAngle(Y, yaw);
    M.compose(P, Q, S);
    mesh.setMatrixAt(i, M);
    mesh.setColorAt(i, C.setRGB(a, a, a));
  };

  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    put(2 + i * 2 + (s > 0 ? 1 : 0), JETTY.x0 + 0.6 + i * 1.5, 0.02, s * 0.68, 0.25, 0.18, 0, BASE);
  }
  put(14, IGLOO.x, H(IGLOO.x, IGLOO.z) + 0.03, IGLOO.z, 9, 6, IGLOO.ry, BASE);
  put(15, SHIP.x, H(SHIP.x, SHIP.z) + 0.03, SHIP.z, 10, 3, SHIP.ry, BASE);

  const pen = (i, t, z) => {
    const u = (t - 2.4) / 6.8, on = u >= 0 && u <= 1;
    const x = -5.4 + 8.6 * Math.min(1, Math.max(0, u));
    put(i, x, H(x, z) + 0.02, z, 0.3, 0.3, 0, on ? BASE : 0);
  };

  const smearGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const smearMat = new ShaderMaterial({
    uniforms: { uRun: U.uRun },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vC;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vC = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uRun;
      varying vec2 vUv;
      varying vec3 vC;
      varying vec3 vW;
      ${NOISE}
      void main() {
        float across = abs(vUv.x * 2.0 - 1.0);
        float wob = fbm(vec2(vW.x * 3.0 + vW.z, vW.z * 3.0));
        float edge = 1.0 - smoothstep(0.7, 1.0, across + (wob - 0.5) * 0.4);
        float along = smoothstep(0.0, 1.0, vUv.y);
        float st = 0.0;
        for (int i = 0; i < 3; i++) {
          float yc = 0.3 + 0.2 * float(i);
          st += (1.0 - smoothstep(0.0, 0.02, abs(vUv.y - yc))) * (1.0 - smoothstep(0.5, 0.8, across));
        }
        st = clamp(st, 0.0, 1.0);
        float a = (0.2 * along * edge + 0.08 * st * edge) * (1.0 - uRun);
        vec3 col = mix(vC, vec3(1.0, 0.976, 0.922), st * 0.6);
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const smear = new InstancedMesh(smearGeo, smearMat, SMEAR.length);
  smear.frustumCulled = false;
  SMEAR.forEach((s, i) => {
    const zs = s.z, xc = Math.max(s.x, shoreL(zs) + s.w / 2);
    const wet = H(xc, zs + 1.25) < WATER_Y;
    P.set(xc, WATER_Y + 0.03, zs + 1.25);
    S.set(wet ? s.w : 0.0001, 1, wet ? 2.5 : 0.0001);
    Q.identity();
    M.compose(P, Q, S);
    smear.setMatrixAt(i, M);
    smear.setColorAt(i, SRGB(s.col));
  });

  const group = new Group();
  group.add(mesh, smear);
  group.userData.layer = 1;
  group.userData.plateDepth = true;
  return {
    group,
    update(t) {
      const tau = t - T.plop, e = tau >= 0 && tau < 1.4 ? Math.exp(-5 * tau) * Math.cos(16 * tau) : 0;
      put(0, 0, 0.02, 0, 0.55 * (1 + 0.12 * e), 0.4 * (1 + 0.12 * e), 0, BASE);
      const k = smooth(LINE.enter, LINE.enter + 0.5, t);
      put(1, THORS_AT[0], 0.02, THORS_AT[2], 0.9 * k, 0.5 * k, 0, k > 0 ? BASE : 0);
      pen(16, t, -3.75);
      pen(17, t, -4.1);
      const o = orcaAt(t, ORCA);
      put(18, o.x, WATER_Y + 0.03, o.z, 5.2, 1.8, o.yaw, BASE * o.surf);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      smear.visible = t >= 2.5 && t < 24.4;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      smearGeo.dispose();
      smearMat.dispose();
    },
  };
}

export default buildShadows;
