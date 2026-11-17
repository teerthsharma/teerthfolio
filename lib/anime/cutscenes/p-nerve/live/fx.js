// live port of moves/p-nerve/fx.js; its notes live with the original

import { AdditiveBlending, ConeGeometry, DoubleSide, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Mesh, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { KEY_AIM, KEY_AT, CONE, U, hash, prep, tene } from "./look.js";
import { GRAINS_TOTAL, GRAIN, grainAt } from "./timeline.js";
import { PUDDLES } from "./roof.js";

const D = new Object3D();
const AXIS = KEY_AIM.clone().sub(KEY_AT).normalize();

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
    premultipliedAlpha: true,
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
      uniform float uShaft, uLen, uKeyOn, uBreak, uToll, uBoost;
      varying vec3 vW;
      varying vec3 vL;
      void main() {
        if (vW.y < 0.02) discard;
        vec3 V = normalize(cameraPosition - uOrigin - vW);
        float along = clamp(-vL.y / uLen, 0.0, 1.0);
        float rimv = length(vL.xz) / max(0.001, along * ${(Math.tan(Math.acos(CONE[0]))).toFixed(4)} * uLen);
        float body = (1.0 - smoothstep(0.25, 1.0, rimv)) * mix(1.0, 1.0 - smoothstep(0.96, 1.0, rimv), uBoost);
        float k = body * (1.0 - along * 0.55) * smoothstep(0.0, 0.05, along) * uKeyOn * uShaft * (1.0 - smoothstep(0.0, 0.35, uBreak));
        vec3 col = vec3(1.0, 0.78, 0.46) * k * 0.115;
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 0.0);
      }`,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  mesh.userData.layer = 1;
  mesh.position.copy(KEY_AT);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), AXIS);
  return { mesh, dispose: () => (geo.dispose(), mat.dispose()) };
}

function rainMaterial(mode) {
  return new ShaderMaterial({
    uniforms: { ...U, uMode: { value: mode }, uRainOn: { value: 0 }, uWid: { value: 1 }, uSpd: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    vertexShader: /* glsl */ `
      uniform vec3 uKey, uAxis, uOrigin;
      uniform vec2 uCone;
      uniform float uTime, uMode, uRainOn, uBreak, uKeyOn, uWid, uSpd;
      varying float vA;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        float ph = instanceMatrix[3].y;
        float sp = instanceColor.r;
        float lk = instanceColor.g;
        float H = uMode < 0.5 ? 9.0 : 26.0;
        float fv = (11.0 + 5.0 * sp) * uSpd;
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
        float wid = (uMode < 0.5 ? 0.016 : 0.07) * uWid;
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
        float k = (1.0 - abs(vUv.x * 2.0 - 1.0)) * smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
        vec3 col = uMode < 0.5 ? vec3(1.0, 0.86, 0.62) : vec3(0.42, 0.78, 0.85);
        gl_FragColor = vec4(pow(max(col * k * vA * (uMode < 0.5 ? 1.25 : 0.9), 0.0), vec3(2.2)), 0.0);
      }`,
  });
}
function rainMesh(n, mode, area, thin = false) {
  const mat = rainMaterial(mode);
  if (thin) {
    mat.uniforms.uWid.value = 0.6;
    mat.uniforms.uSpd.value = 1.15;
  }
  const m = new InstancedMesh(new PlaneGeometry(1, 1), mat, n);
  m.frustumCulled = false;
  m.renderOrder = 8;
  m.userData.layer = 1;
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
  const near = rainMesh(1440, 0, [-8, 9, -7, 5]);
  const far = rainMesh(416, 1, [-18, 16, -70, -28]);
  const thin = rainMesh(1440, 0, [-8, 9, -7, 5], true);
  g.add(near, far, thin);
  return {
    group: g,
    set(on) {
      near.material.uniforms.uRainOn.value = far.material.uniforms.uRainOn.value = thin.material.uniforms.uRainOn.value = on;
    },
    dispose() {
      for (const m of [near, far, thin]) (m.geometry.dispose(), m.material.dispose(), m.dispose());
    },
  };
}


const MOTES = 90;
export function buildMotes() {
  const geo = new PlaneGeometry(1, 1);
  const mat = new ShaderMaterial({
    uniforms: { uBoost: U.uBoost },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vIC;
      void main() {
        vUv = uv;
        vIC = instanceColor;
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        c.xy += position.xy * 0.024;
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uBoost;
      varying vec2 vUv;
      varying vec3 vIC;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float a = pow(max(1.0 - r, 0.0), 2.0) * vIC.x * uBoost;
        gl_FragColor = vec4(vec3(1.0, 0.945, 0.812) * a, 0.0);
      }`,
  });
  const m = new InstancedMesh(geo, mat, MOTES);
  m.frustumCulled = false;
  m.renderOrder = 9;
  m.userData.layer = 1;
  m.instanceColor = new InstancedBufferAttribute(new Float32Array(MOTES * 3), 3);
  const u = new Vector3().crossVectors(AXIS, new Vector3(0, 0, 1)).normalize();
  const v = new Vector3().crossVectors(AXIS, u);
  const P = new Vector3();
  const reach = Math.tan(Math.acos(CONE[0]));
  return {
    mesh: m,
    tick(tt) {
      for (let i = 0; i < MOTES; i++) {
        const d = 2 + 6 * hash(i, 1);
        const r = 0.6 * d * reach * Math.sqrt(hash(i, 2));
        const a = hash(i, 3) * Math.PI * 2;
        P.copy(KEY_AT).addScaledVector(AXIS, d).addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a));
        P.x += 0.12 * Math.sin(tt * 0.21 + i * 1.7);
        P.y += 0.1 * Math.cos(tt * 0.17 + i * 2.3);
        P.z += 0.12 * Math.sin(tt * 0.13 + i * 0.9);
        D.position.copy(P);
        D.scale.set(1, 1, 1);
        D.rotation.set(0, 0, 0);
        D.updateMatrix();
        m.setMatrixAt(i, D.matrix);
        const flick = 0.55 + 0.45 * Math.sin(tt * (1.5 + 2 * hash(i, 4)) + i);
        m.instanceColor.setX(i, (0.3 + 0.7 * hash(i, 5)) * flick * U.uKeyOn.value);
      }
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    },
    dispose: () => (geo.dispose(), mat.dispose(), m.dispose()),
  };
}

const SPLASH = 44;
export function buildSplashes() {
  const geo = new RingGeometry(0.82, 1, 20).rotateX(-Math.PI / 2);
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    vertexShader: /* glsl */ `
      varying vec3 vIC;
      void main() {
        vIC = instanceColor;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vIC;
      void main() {
        gl_FragColor = vec4(vIC, 0.0);
      }`,
  });
  const m = new InstancedMesh(geo, mat, SPLASH);
  m.frustumCulled = false;
  m.renderOrder = 5;
  m.userData.layer = 1;
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
