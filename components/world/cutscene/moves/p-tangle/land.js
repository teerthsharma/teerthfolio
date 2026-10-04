// ITOMORI: the crater lake and everything round it, as meshes. One polar terrain mesh (the lake bed, the
// shore the pup stands on, the spit and wooded hill the shrine crowns, the crater rim and the far ranges),
// the lake (a mirror of the painted sky with ripples, glitter and the loops' reflections), cedars, reeds,
// boulders, and the town's lights on the far shore. Rig frame: the pup at the origin, the lens out on +z.

import { BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DataTexture, DoubleSide, IcosahedronGeometry, InstancedMesh, LinearFilter, Object3D, PlaneGeometry, RepeatWrapping, ShaderMaterial, Vector3, Vector4, RedFormat, UnsignedByteType } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISSOLVE, LIGHT, NOISE, OUT, SKY, VERT, g3, hash, lerp, ss } from "./gl";

export const WATER_Y = -0.35;
export const LAKE = { cx: 0, cz: -70, ax: 80, az: 66.5 };
export const GIRL_AT = [4.6, -27]; // the rocky islet she stands on
const SPIT_A = [-4, 2];
const SPIT_B = [-11, -50];
export const HILL = [-11.5, -52];
const SUN_TH = 0.35; // the notch in the crater rim where the sun goes down (rad about the lake centre)

const vn = (x, z) => {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const h = (a, b) => hash(a * 57.1 + b * 13.7, 3);
  return lerp(lerp(h(ix, iz), h(ix + 1, iz), u), lerp(h(ix, iz + 1), h(ix + 1, iz + 1), u), v);
};
const fbm = (x, z) => 0.5 * vn(x, z) + 0.25 * vn(x * 2.03 + 11.7, z * 2.03 + 11.7) + 0.125 * vn(x * 4.1 + 5.3, z * 4.1 + 5.3) + 0.0625 * vn(x * 8.3 + 1.1, z * 8.3 + 1.1);

function rim(th) {
  const base = 13 + 8 * Math.sin(th * 3.1 + 0.7) + 5 * Math.sin(th * 7.3 + 2.0) + 2.5 * Math.sin(th * 13 + 1);
  const notch = 11 * Math.exp(-(((th - SUN_TH) / 0.2) ** 2));
  return Math.max(2.5, base - notch);
}

// the height of the land at (x, z) in the rig frame
export function H(x, z) {
  const dx = (x - LAKE.cx) / LAKE.ax;
  const dz = (z - LAKE.cz) / LAKE.az;
  const d = Math.hypot(dx, dz);
  const th = Math.atan2(dx, -dz);
  let y;
  if (d < 1) y = -5 + 4.8 * ss(0.78, 1.0, d);
  else {
    y = -0.2 + 0.3 * ss(1.0, 1.04, d) + 0.5 * (fbm(x * 0.05, z * 0.05) - 0.3);
    y += rim(th) * Math.pow(ss(1.0, 1.75, d), 1.3) * (0.75 + 0.5 * fbm(x * 0.03 + 3, z * 0.03 + 8));
    y += 18 * ss(1.7, 2.5, d) * (0.6 + fbm(x * 0.02, z * 0.02));
  }
  // the spit: a wooded tongue of land running out from the pup's bank, ending in the shrine hill
  const ex = SPIT_B[0] - SPIT_A[0];
  const ez = SPIT_B[1] - SPIT_A[1];
  const k = Math.min(1, Math.max(0, ((x - SPIT_A[0]) * ex + (z - SPIT_A[1]) * ez) / (ex * ex + ez * ez)));
  const dP = Math.hypot(x - (SPIT_A[0] + ex * k), z - (SPIT_A[1] + ez * k));
  const pn = 1 - ss(4.2, 9.5, dP);
  const pTop = 0.12 + 0.5 * fbm(x * 0.12, z * 0.12) + 1.2 * ss(0.5, 1, k);
  if (pTop > y) y += (pTop - y) * pn;
  const hx = x - HILL[0];
  const hz = z - HILL[1];
  y += 15 * Math.exp(-(hx * hx + hz * hz) / 235) + 6 * Math.exp(-(((x + 20) ** 2 + (z + 44) ** 2) / 110)) + 4 * Math.exp(-(((x + 4) ** 2 + (z + 58) ** 2) / 60));
  // the girl's islet
  const gx = x - GIRL_AT[0];
  const gz = z - GIRL_AT[1];
  const gb = -4 + 4.6 * Math.exp(-(gx * gx + gz * gz) / 9);
  if (gb > y) y = gb;
  // the pup's bank is level
  const dp = Math.hypot(x, z - 1);
  if (y > -1) y = lerp(0.0 + 0.04 * Math.sin(x * 2 + z), y, ss(5, 14, dp));
  return y;
}

export const STAIR_A = [-8.0, -31.5];
export const STAIR_B = [-11.2, -47.4];
export const stairDist = (x, z) => {
  const ex = STAIR_B[0] - STAIR_A[0];
  const ez = STAIR_B[1] - STAIR_A[1];
  const k = Math.min(1, Math.max(0, ((x - STAIR_A[0]) * ex + (z - STAIR_A[1]) * ez) / (ex * ex + ez * ez)));
  return Math.hypot(x - (STAIR_A[0] + ex * k), z - (STAIR_A[1] + ez * k));
};

const warp = (a, b, k) => a * Math.pow(b / a, k);

// THE TERRAIN: a polar mesh round a point behind the pup, dense at the lens and sparse at the far ranges
export function terrainGeometry() {
  const NR = 70;
  const NA = 120;
  const C = [0, 8];
  const pos = new Float32Array((NR + 1) * (NA + 1) * 3);
  let o = 0;
  for (let i = 0; i <= NR; i++) {
    const r = warp(0.8, 236, i / NR);
    for (let j = 0; j <= NA; j++) {
      const a = (-100 + (200 * j) / NA) * (Math.PI / 180);
      const x = C[0] + r * Math.sin(a);
      const z = C[1] - r * Math.cos(a);
      pos[o++] = x;
      pos[o++] = H(x, z);
      pos[o++] = z;
    }
  }
  const idx = [];
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j;
      const b = a + NA + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// the silhouette of the land seen from the lens, by azimuth: what the lake reflects along the horizon
export function horizonTexture() {
  const N = 512;
  const data = new Uint8Array(N);
  const eye = [0.3, 0.7, 9.6];
  for (let i = 0; i < N; i++) {
    const az = (i / N - 0.5) * Math.PI * 2;
    const sx = Math.sin(az);
    const sz = -Math.cos(az);
    let best = 0;
    for (let t = 12; t < 240; t += 3) {
      const x = eye[0] + sx * t;
      const z = eye[2] + sz * t;
      const y = H(x, z) + (H(x, z) > 1 ? 7 : 0); // the cedars add to a wooded slope
      best = Math.max(best, (y - eye[1]) / t);
    }
    data[i] = Math.min(255, Math.round(Math.sin(Math.atan(best)) * 2 * 255));
  }
  const t = new DataTexture(data, N, 1, RedFormat, UnsignedByteType);
  t.wrapS = RepeatWrapping;
  t.magFilter = t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

const sh = (vs, fs, uniforms, opts = {}) => new ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, ...opts });

export function terrainMaterial(U) {
  return sh(
    VERT,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN;
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec3 n = normalize(vN);
      float h = vL.y;
      float slope = 1.0 - n.y;
      float nz = fbm3(vL.xz * 0.06);
      float nz2 = fbm3(vL.xz * 0.45);
      vec3 grass = mix(${g3("#587f2c")}, ${g3("#93ad3e")}, nz2);
      vec3 forest = mix(${g3("#0e2e3a")}, ${g3("#215a44")}, nz);
      vec3 rock = mix(${g3("#46466c")}, ${g3("#6c5c82")}, nz2);
      vec3 base = mix(grass, forest, smoothstep(0.5, 4.5, h));
      base = mix(base, rock, smoothstep(0.3, 0.52, slope) * 0.85);
      base = mix(base, rock * 1.15, smoothstep(26.0, 44.0, h) * 0.55);
      base = mix(base, ${g3("#8a7660")}, (1.0 - smoothstep(-0.32, 0.1, h)) * 0.75);
      base *= 0.8 + 0.4 * nz2;
      vec3 col = lightLand(base, n, V, dist, 1.0);
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95 + 0.2 * h21(floor(vL.xz * 0.8)));
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    U,
  );
}

// THE LAKE: a mirror of the painted sky. Mountains from the horizon texture, ripples that spread from the
// loops and from the comet's fall, glitter on the sun's path, the loops and the comet as reflected lights.
export function lakeMaterial(U, hor) {
  const uni = { ...U, uHor: { value: hor }, uTurn: { value: 0 }, uRip: { value: [0, 1, 2, 3].map(() => new Vector4(0, 0, -99, 0)) }, uSrc: { value: [0, 1, 2, 3].map(() => new Vector4(0, 0, 0, 0)) }, uSrcCol: { value: [0, 1, 2, 3].map(() => new Vector3(1, 1, 1)) } };
  return sh(
    VERT,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN;
    uniform sampler2D uHor;
    uniform float uTurn;
    uniform vec4 uRip[4];
    uniform vec4 uSrc[4];
    uniform vec3 uSrcCol[4];
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec2 p = vL.xz;
      float att = 1.0 / (1.0 + dist * 0.03);
      vec2 g = vec2(cos(p.x * 1.7 + p.y * 0.6 + uTime * 0.9), cos(p.y * 2.1 - p.x * 0.5 + uTime * 1.1)) * 0.022;
      g += vec2(cos(p.x * 4.3 - p.y * 3.1 - uTime * 1.7), cos(p.y * 5.2 + p.x * 2.2 + uTime * 1.4)) * 0.011;
      g += (vec2(vnoise(p * 0.9 + uTime * 0.2), vnoise(p * 0.9 + 7.0 - uTime * 0.15)) - 0.5) * 0.06;
      g *= att;
      for (int i = 0; i < 4; i++) {
        vec4 r = uRip[i];
        float age = uTime - r.z;
        if (r.w > 0.0 && age > 0.0) {
          vec2 dv = p - r.xy;
          float d = length(dv) + 0.001;
          float w = d - age * 5.5;
          float env = exp(-w * w * 0.35) * exp(-age * 0.4) * r.w;
          g += (dv / d) * cos(w * 4.2) * env * 0.3;
        }
      }
      vec3 n = normalize(vec3(-g.x * 0.9, 1.0, -g.y * 1.7));
      vec3 R = reflect(V, n);
      R.y = max(R.y, 0.004);
      vec3 col = sky(R);
      float ct = cos(uTurn), st = sin(uTurn);
      vec3 Rl = vec3(R.x * ct - R.z * st, R.y, R.x * st + R.z * ct); // the reflection in the rig's frame
      float az = atan(Rl.x, -Rl.z);
      float elev = texture2D(uHor, vec2(az * 0.15915 + 0.5, 0.5)).r * 0.5;
      float m = 1.0 - smoothstep(elev - 0.005, elev + 0.002, R.y);
      vec3 mount = mix(${g3("#12163a")}, hazeAt(R), 0.5 + 0.3 * clamp(elev * 9.0, 0.0, 1.0));
      mount += ${g3("#ffa56a")} * exp(-max(elev - R.y, 0.0) * 90.0) * 0.45 * (1.0 - uTw) * smoothstep(0.5, 1.0, dot(normalize(vec3(R.x, 0.0, R.z)), normalize(vec3(uSun.x, 0.0, uSun.z))));
      col = mix(col, mount, m);
      // the loops and the comet, mirrored
      vec3 p3 = vec3(p.x, ${WATER_Y.toFixed(2)}, p.y);
      for (int i = 0; i < 4; i++) {
        float sz = uSrc[i].w;
        if (sz > 0.0) {
          vec3 to = normalize(uSrc[i].xyz - p3);
          float a = 1.0 - dot(Rl, to);
          col += uSrcCol[i] * sz * (exp(-a * 500.0 / (0.6 + sz)) * 1.4 + exp(-a * 60.0) * 0.12);
        }
      }
      float cosT = clamp(dot(-V, n), 0.0, 1.0);
      float F = clamp((0.04 + 0.96 * pow(1.0 - cosT, 5.0)) * 1.1 + 0.14, 0.0, 1.0);
      vec3 deep = mix(${g3("#08203e")}, ${g3("#1a4a6c")}, 0.4 + 0.3 * vnoise(p * 0.3)) * (1.0 - uTw * 0.55);
      deep += ${g3("#ff9a80")} * 0.05 * (1.0 - uTw);
      col = mix(deep, col, F);
      // glitter on the sun's path and the odd cold star
      float tw = 1.0 - uTw;
      float hh = h21(floor(p * 1.5) + floor(uTime * 5.0 + h21(floor(p * 1.5)) * 20.0));
      float gl = step(0.989, hh) * smoothstep(0.0, 0.6, dot(R, normalize(uSun + vec3(0.0, 0.3, 0.0))));
      col += ${g3("#ffe2b0")} * gl * 1.3 * tw * (1.0 - smoothstep(70.0, 170.0, dist));
      col += vec3(0.8, 0.9, 1.0) * step(0.9985, h21(floor(p * 1.1) + floor(uTime * 3.0))) * 0.7 * att;
      // lights on the far shore: the town, in broken streaks
      float townAz = smoothstep(-0.95, -0.4, Rl.x / -Rl.z * 1.0 + 0.0) * (1.0 - smoothstep(0.1, 0.45, Rl.x / -Rl.z));
      float tl = step(0.82, h21(vec2(floor(az * 520.0), 3.0))) * (1.0 - smoothstep(0.0, 0.02, R.y)) * townAz;
      col += ${g3("#ffc060")} * tl * 0.55 * (0.7 + 0.3 * sin(uTime * 2.0 + az * 90.0));
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95 + 0.15 * h21(floor(p * 0.7)));
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    uni,
  );
}

export function lakeGeometry() {
  return new CircleGeometry(228, 64).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0);
}

// CEDARS: stacked cones with a trunk, hundreds of them on instances; deep teal against the glow
export function forest(U) {
  const parts = [];
  parts.push(new CylinderGeometry(0.16, 0.24, 1.6, 5).translate(0, 0.8, 0));
  for (const [r, h, y] of [[1.5, 3.4, 1.3], [1.15, 3.0, 3.0], [0.8, 2.7, 4.7]]) parts.push(new ConeGeometry(r, h, 7).translate(0, y + h / 2, 0));
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  g.computeVertexNormals();
  const N = 520;
  const m = new InstancedMesh(g, forestMaterial(U), N);
  m.frustumCulled = false;
  const D = new Object3D();
  const col = new Color();
  let n = 0;
  for (let t = 0; t < 4200 && n < N; t++) {
    const x = (hash(t, 1) - 0.5) * 300;
    const z = 20 - hash(t, 2) * 235;
    const y = H(x, z);
    if (y < 0.6) continue;
    if (Math.hypot(x, z - 1) < 11) continue;
    if (fbm(x * 0.03 + 4, z * 0.03) < 0.36 && y < 12) continue;
    if (Math.hypot(x - HILL[0], z - HILL[1]) < 6.5) continue; // the shrine's clearing
    if (stairDist(x, z) < 3.6 && z < -22) continue; // the stair's way
    const s = 0.8 + hash(t, 3) * 0.9 + (z < -90 ? 1.2 : 0);
    D.position.set(x, y - 0.3, z);
    D.rotation.set(0, hash(t, 4) * 6.28, 0);
    D.scale.set(s, s * (0.9 + 0.5 * hash(t, 5)), s);
    D.updateMatrix();
    m.setMatrixAt(n, D.matrix);
    col.setRGB(0.55 + 0.45 * hash(t, 6), 0.6 + 0.4 * hash(t, 7), 0.6 + 0.4 * hash(t, 8));
    m.setColorAt(n, col);
    n++;
  }
  m.count = n;
  return m;
}
function forestMaterial(U) {
  return sh(
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec3 vC;
    void main() {
      vec4 p = instanceMatrix * vec4(position, 1.0);
      vC = vec3(1.0);
      #ifdef USE_INSTANCING_COLOR
        vC = instanceColor;
      #endif
      vL = p.xyz;
      vec4 w = modelMatrix * p;
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec3 vC;
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec3 n = normalize(vN);
      vec3 base = mix(${g3("#0c2c36")}, ${g3("#2a6a4c")}, vC.x * 0.8 + 0.1 * vnoise(vL.xz * 3.0 + vL.y));
      base = mix(base, ${g3("#3a4a2a")}, vC.y * 0.2);
      vec3 col = lightLand(base, n, V, dist, 1.0);
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95 + 0.2 * h21(floor(vL.xz * 0.8)));
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    U,
  );
}

// BOULDERS round the islet and the pup's bank
export function boulders(U) {
  const g = new IcosahedronGeometry(1, 1).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 9) * 3.1 + Math.round(p.getY(i) * 9) * 5.3 + Math.round(p.getZ(i) * 9) * 1.7;
    const f = 0.78 + 0.4 * hash(k, 9);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.8, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  const spots = [];
  for (let i = 0; i < 9; i++) spots.push([GIRL_AT[0] + Math.cos(i * 0.9) * (2.4 + hash(i, 1)), GIRL_AT[1] + Math.sin(i * 0.9) * (2.2 + hash(i, 2)), 0.5 + hash(i, 3) * 0.6]);
  for (let i = 0; i < 16; i++) spots.push([-9 + hash(i, 4) * 17, -3.5 + hash(i, 5) * 1.0 - (i % 3) * 0.5, 0.18 + hash(i, 6) * 0.35]);
  for (let i = 0; i < 14; i++) spots.push([HILL[0] + 4 + (hash(i, 7) - 0.5) * 18, HILL[1] + 16 + hash(i, 8) * 8, 0.8 + hash(i, 9)]);
  const m = new InstancedMesh(g, boulderMaterial(U), spots.length);
  m.frustumCulled = false;
  const D = new Object3D();
  spots.forEach(([x, z, s], i) => {
    D.position.set(x, Math.max(H(x, z), WATER_Y - 0.1) + s * 0.25, z);
    D.rotation.set(hash(i, 1) * 3, hash(i, 2) * 6, 0);
    D.scale.set(s * 1.2, s, s);
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
  });
  return m;
}
function boulderMaterial(U) {
  return sh(
    VERT,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN;
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
      vec3 base = mix(${g3("#44446a")}, ${g3("#7a6a8a")}, vnoise(vL.xz * 2.0 + vL.y));
      vec3 col = lightLand(base, n, V, dist, 1.3);
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95);
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    U,
  );
}

// REEDS and tall grass on the pup's bank, swaying; tips catch the low sun
export function reeds(U) {
  const blade = new BufferGeometry();
  const w = 0.035;
  const verts = [-w, 0, 0, w, 0, 0, 0, 1, 0];
  blade.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  blade.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
  blade.setAttribute("normal", new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  const N = 900;
  const m = new InstancedMesh(blade, reedMaterial(U), N);
  m.frustumCulled = false;
  const D = new Object3D();
  const col = new Color();
  for (let i = 0; i < N; i++) {
    const near = i % 5 !== 0;
    const x = near ? -10 + hash(i, 1) * 22 : -14 + hash(i, 1) * 28;
    const z = near ? -5.0 + hash(i, 2) * 12.5 : -6.5 + hash(i, 2) * 4;
    const y = Math.max(H(x, z), WATER_Y - 0.05);
    if (y < WATER_Y || Math.hypot(x, z) < 4.6) {
      m.setMatrixAt(i, D.matrix.makeScale(0, 0, 0)); // an identity left here would be a 1 m blade at the origin
      continue;
    }
    if (false) continue; // the pup stands in a clearing: no grass round it, none across the lens' line
    const reed = z < -2.6 || hash(i, 3) > 0.8;
    D.position.set(x, y, z);
    D.rotation.set(0, hash(i, 4) * 6.28, 0);
    const s = reed ? 0.8 + hash(i, 5) * 0.5 : 0.35 + hash(i, 5) * 0.55;
    D.scale.set(1, s, 1);
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
    col.setRGB(hash(i, 6), hash(i, 7), reed ? 1 : 0);
    m.setColorAt(i, col);
  }
  return m;
}
function reedMaterial(U) {
  return sh(
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
    uniform float uTime;
    void main() {
      vC = vec3(0.5);
      #ifdef USE_INSTANCING_COLOR
        vC = instanceColor;
      #endif
      vec4 p = vec4(position, 1.0);
      p.x *= 1.0 + 0.6 * vC.x;
      vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      p = instanceMatrix * p;
      float bend = uv.y * uv.y * (0.22 + 0.12 * vC.y) * sin(uTime * (0.9 + vC.y) + base.x * 0.7 + base.z * 0.5);
      p.x += bend * (1.0 + vC.z);
      p.z += bend * 0.4;
      vUv = uv;
      vL = p.xyz;
      vec4 w = modelMatrix * p;
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.6, 0.8));
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec3 base = mix(${g3("#2f5a22")}, ${g3("#a9b64a")}, vUv.y * (0.5 + 0.5 * vC.y));
      base = mix(base, ${g3("#e8c070")}, vUv.y * vUv.y * vC.z * 0.5);
      vec3 col = lightLand(base, normalize(vN), V, dist, 1.0);
      col += ${g3("#ffc88a")} * vUv.y * vUv.y * 0.35 * (1.0 - uTw) * smoothstep(-0.2, 0.9, dot(V, uSun));
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.9);
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    U,
    { side: DoubleSide },
  );
}

// THE TOWN on the far shore: low gabled houses in blue silhouette, their windows lit
export function town(U) {
  const house = mergeGeometries([new BoxGeometry(1, 0.8, 1).translate(0, 0.4, 0).toNonIndexed(), new ConeGeometry(0.85, 0.55, 4).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, 1.07, 0).toNonIndexed()]);
  house.computeVertexNormals();
  const N = 90;
  const hm = new InstancedMesh(house, townMaterial(U), N);
  hm.frustumCulled = false;
  const win = new InstancedMesh(new PlaneGeometry(1, 1), lightsMaterial(U), N * 2);
  win.frustumCulled = false;
  const D = new Object3D();
  let k = 0;
  for (let i = 0; i < N; i++) {
    const x = -70 + 92 * (i / N) + (hash(i, 1) - 0.5) * 4;
    const zEdge = LAKE.cz - LAKE.az * Math.sqrt(Math.max(0.0, 1.08 * 1.08 - (x / LAKE.ax) ** 2));
    const z = zEdge - hash(i, 2) * 10;
    const w = 5 + hash(i, 3) * 6;
    const hgt = 5 + hash(i, 4) * 5;
    D.position.set(x, H(x, z) - 0.2, z);
    D.rotation.set(0, (hash(i, 5) - 0.5) * 0.6, 0);
    D.scale.set(w, hgt, w * 0.8);
    D.updateMatrix();
    hm.setMatrixAt(i, D.matrix);
    for (let j = 0; j < 2; j++) {
      D.position.set(x + (j ? 1 : -1) * w * 0.18, H(x, z) + hgt * 0.38, z + w * 0.4 + 0.2);
      D.rotation.set(0, 0, 0);
      D.scale.set(w * 0.14, hgt * 0.16, 1);
      D.updateMatrix();
      win.setMatrixAt(k++, D.matrix);
    }
  }
  return { hm, win };
}
function townMaterial(U) {
  return sh(
    VERT,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN;
    ${NOISE}
    ${SKY}
    ${LIGHT}
    ${DISSOLVE}
    void main() {
      vec3 V = normalize(vW - cameraPosition);
      float dist = length(vW - cameraPosition);
      vec3 base = mix(${g3("#2a2a58")}, ${g3("#5a4a78")}, h21(floor(vL.xz * 0.3)));
      vec3 col = lightLand(base, normalize(vN), V, dist, 0.8);
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95);
      col += e * ${g3("#ffd6a0")} * 1.5;
      ${OUT}
    }`,
    U,
  );
}
function lightsMaterial(U) {
  return sh(
    VERT,
    /* glsl */ `
    varying vec3 vW; varying vec3 vL; varying vec3 vN;
    ${NOISE}
    ${DISSOLVE}
    uniform float uTime, uTw;
    void main() {
      float dist = length(vW - cameraPosition);
      float on = step(0.35, h21(floor(vL.xz * 2.0))) * (0.7 + 0.3 * sin(uTime * 1.3 + h21(floor(vL.xz * 2.0)) * 30.0));
      vec3 col = ${g3("#ffc864")} * (0.75 + 0.5 * uTw) * on;
      float e = dissolveEdge(clamp(dist / 230.0, 0.0, 1.0) * 0.95);
      col += e * ${g3("#ffd6a0")} * 1.5;
      if (on < 0.05) discard;
      ${OUT}
    }`,
    U,
  );
}
