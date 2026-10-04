// THE LIGHT AND THE WEATHER: the floodlight's solid shaft (a modelled additive cone), the rain (instanced streaks,
// drawn ONLY inside that cone and in the screens' glow), the splash rings on the puddles, and the control's
// grains (pooled, instanced) that heap up in the gauges. Rig frame; nothing here allocates per frame.

import { AdditiveBlending, ConeGeometry, DoubleSide, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { KEY_AIM, KEY_AT, CONE, U, hash, prep, tene } from "./look";
import { GRAINS_TOTAL, GRAIN, grainAt } from "./timeline";
import { PUDDLES } from "./roof";

const D = new Object3D();
const AXIS = KEY_AIM.clone().sub(KEY_AT).normalize();

// ---- the shaft --------------------------------------------------------------------------------------------------
export function buildBeam() {
  const L = 14;
  const R = L * Math.tan(Math.acos(CONE[0]));
  const geo = new ConeGeometry(R, L, 40, 1, true).translate(0, -L / 2, 0);
  const mat = new ShaderMaterial({
    uniforms: { ...U, uShaft: { value: 1 }, uLen: { value: L } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform vec3 uOrigin;
      uniform float uBreak;
      varying vec3 vW;
      varying vec3 vL;
      void main() {
        vL = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz - uOrigin;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uOrigin, uAxis;
      uniform float uShaft, uLen, uKeyOn, uBreak, uToll;
      varying vec3 vW;
      varying vec3 vL;
      void main() {
        if (vW.y < 0.02) discard; // the shaft ends on the deck
        vec3 V = normalize(cameraPosition - uOrigin - vW);
        // seen through its own thickness: bright toward the middle of the cone, soft at its skin
        float along = clamp(-vL.y / uLen, 0.0, 1.0);
        float rimv = length(vL.xz) / max(0.001, along * ${(Math.tan(Math.acos(CONE[0]))).toFixed(4)} * uLen);
        float body = smoothstep(1.0, 0.25, rimv);
        float k = body * (1.0 - along * 0.55) * smoothstep(0.0, 0.05, along) * uKeyOn * uShaft * (1.0 - smoothstep(0.0, 0.35, uBreak));
        vec3 col = vec3(1.0, 0.78, 0.46) * k * 0.115;
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  mesh.position.copy(KEY_AT);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), AXIS);
  return { mesh, dispose: () => (geo.dispose(), mat.dispose()) };
}

// ---- the rain ---------------------------------------------------------------------------------------------------
function rainMaterial(mode) {
  return new ShaderMaterial({
    uniforms: { ...U, uMode: { value: mode }, uRainOn: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform vec3 uKey, uAxis, uOrigin;
      uniform vec2 uCone;
      uniform float uTime, uMode, uRainOn, uBreak, uKeyOn;
      varying float vA;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        float ph = instanceMatrix[3].y;
        float sp = instanceColor.r;
        float lk = instanceColor.g;
        float H = uMode < 0.5 ? 9.0 : 26.0;
        float fv = 11.0 + 5.0 * sp;
        float y = H * (1.0 - fract(ph + uTime * fv / H));
        vec3 P = vec3(instanceMatrix[3].x + 0.16 * (H - y), y, instanceMatrix[3].z);
        vec3 axis = normalize(vec3(0.16, -1.0, 0.0));
        float a;
        if (uMode < 0.5) {
          float c = dot(normalize(P - uKey), uAxis);
          a = smoothstep(uCone.x, uCone.y, c) * smoothstep(0.0, 0.25, y) * (0.4 + 0.6 * sp) * uKeyOn;
        } else {
          a = (0.25 + 0.5 * sp) * smoothstep(0.0, 4.0, y);
        }
        a *= uRainOn * (1.0 - smoothstep(0.0, 0.3, uBreak));
        vA = a;
        vec3 W = (modelMatrix * vec4(P, 1.0)).xyz;
        vec3 right = normalize(cross(axis, cameraPosition - W));
        float wid = uMode < 0.5 ? 0.016 : 0.07;
        float len = (uMode < 0.5 ? 0.55 : 2.2) * (0.6 + 0.8 * lk);
        W += right * position.x * wid + axis * position.y * len;
        gl_Position = projectionMatrix * viewMatrix * vec4(W, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uMode;
      varying float vA;
      varying vec2 vUv;
      void main() {
        if (vA < 0.01) discard;
        float k = (1.0 - abs(vUv.x * 2.0 - 1.0)) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
        vec3 col = uMode < 0.5 ? vec3(1.0, 0.86, 0.62) : vec3(0.42, 0.78, 0.85);
        gl_FragColor = vec4(pow(col * k * vA * (uMode < 0.5 ? 1.25 : 0.9), vec3(2.2)), 1.0);
      }`,
  });
}
function rainMesh(n, mode, area) {
  const m = new InstancedMesh(new PlaneGeometry(1, 1), rainMaterial(mode), n);
  m.frustumCulled = false;
  m.renderOrder = 8;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x0, x1, z0, z1] = area;
    D.position.set(x0 + (x1 - x0) * hash(i, 1), hash(i, 2), z0 + (z1 - z0) * hash(i, 3));
    D.scale.setScalar(1);
    D.rotation.set(0, 0, 0);
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
    col[i * 3] = hash(i, 4);
    col[i * 3 + 1] = hash(i, 5);
  }
  m.instanceColor = new InstancedBufferAttribute(col, 3);
  return m;
}
export function buildRain() {
  const g = new Group();
  const near = rainMesh(900, 0, [-8, 9, -7, 5]);
  const far = rainMesh(260, 1, [-18, 16, -70, -28]);
  g.add(near, far);
  return {
    group: g,
    set(on) {
      near.material.uniforms.uRainOn.value = far.material.uniforms.uRainOn.value = on;
    },
    dispose() {
      for (const m of [near, far]) (m.geometry.dispose(), m.material.dispose(), m.dispose());
    },
  };
}

// ---- the splash rings on the puddles ----------------------------------------------------------------------------
const SPLASH = 44;
export function buildSplashes() {
  const geo = new RingGeometry(0.82, 1, 20).rotateX(-Math.PI / 2);
  const mat = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false, transparent: true, blending: AdditiveBlending, depthWrite: false });
  const m = new InstancedMesh(geo, mat, SPLASH);
  m.frustumCulled = false;
  m.renderOrder = 5;
  m.instanceColor = new InstancedBufferAttribute(new Float32Array(SPLASH * 3), 3);
  const P = new Vector3();
  return {
    mesh: m,
    tick(t, on, keyOn) {
      for (let i = 0; i < SPLASH; i++) {
        const life = 0.9 + 0.5 * hash(i, 1);
        const cyc = t / life + hash(i, 2) * 7;
        const n = Math.floor(cyc);
        const ph = cyc - n;
        const q = PUDDLES[Math.floor(hash(i + n * 13, 3) * PUDDLES.length) % PUDDLES.length];
        const a = hash(i + n * 13, 4) * Math.PI * 2;
        const r = Math.sqrt(hash(i + n * 13, 5)) * 0.92;
        const x = q.x + Math.cos(a) * q.rx * r;
        const z = q.z + Math.sin(a) * q.rz * r;
        // lit only where the key reaches (the rings are drawn by that light)
        P.set(x, 0.02, z).sub(KEY_AT);
        const c = P.normalize().dot(AXIS);
        const lit = Math.min(1, Math.max(0, (c - CONE[0]) / (CONE[1] - CONE[0]))) * keyOn;
        const b = (1 - ph) * (1 - ph) * (0.25 + 0.75 * lit) * on * 0.6 + (1 - ph) * 0.05 * on;
        D.position.set(x, 0.026, z);
        D.rotation.set(0, 0, 0);
        D.scale.set(0.04 + 0.34 * ph, 1, (0.04 + 0.34 * ph) * 0.8);
        D.updateMatrix();
        m.setMatrixAt(i, D.matrix);
        m.instanceColor.setXYZ(i, b * 1.0, b * 0.92, b * 0.78);
      }
      m.instanceMatrix.needsUpdate = m.instanceColor.needsUpdate = true;
    },
    dispose: () => (geo.dispose(), mat.dispose(), m.dispose()),
  };
}

// ---- the control's grains ---------------------------------------------------------------------------------------
export function buildGrains() {
  const geo = prep(new IcosahedronGeometry(GRAIN.r, 0));
  const mat = tene({ albedo: "#6a4d38", wet: 0.35 });
  const m = new InstancedMesh(geo, mat, GRAINS_TOTAL);
  m.frustumCulled = false;
  m.renderOrder = 3;
  let base = 0;
  const idx = GRAIN.n.map((n) => {
    const b = base;
    base += n;
    return b;
  });
  return {
    mesh: m,
    tick(t) {
      for (let i = 0; i < 4; i++) {
        for (let k = 0; k < GRAIN.n[i]; k++) {
          const gr = grainAt(i, k, t);
          if (!gr.s) {
            D.position.set(0, -50, 0);
            D.scale.setScalar(0.0001);
          } else {
            D.position.set(gr.x, gr.y, gr.z);
            D.scale.setScalar(1);
          }
          D.rotation.set(gr.spin * 0.7, gr.spin, 0);
          D.updateMatrix();
          m.setMatrixAt(idx[i] + k, D.matrix);
        }
      }
      m.instanceMatrix.needsUpdate = true;
    },
    dispose: () => (geo.dispose(), mat.dispose(), m.dispose()),
  };
}
