// live port of moves/p-nerve/roof.js; its notes live with the original
// deviation from the live roof.js: the glow applies instanceMatrix (the live draws the four hidden glows as discs on the origin)

import { AdditiveBlending, CircleGeometry, DoubleSide, Group, InstancedMesh, Mesh, Object3D, RingGeometry, ShaderMaterial, TorusGeometry, Vector3 } from "three";
import { ball, box, cyl, flat, limb, merge, tene, U } from "./look.js";
import { KEY_AT, KEY_AIM } from "./look.js";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";

await loadPack("madhouse");
await loadPack("phys");
const MH = glslFor(["mhKit"]);
const PUDDLE_FRESNEL = glslFor(["puddleFresnel"]);

export const PARAPET_Z = -2.55;
export const CURB_H = 0.55;
export const GAP = [-4.2, -2.9];
export const HUT = { x: 5.8, z: -1.4, w: 2.8, d: 2.6, h: 3.4 };
export const MAST_AT = [3.05, CURB_H, -2.5];
export const MAST_H = 4.9;
export const GAUGE = { z: -2.1, r: 0.2, h: 2.6, floor: CURB_H, x: [-2.2, -1.3, -0.4, 0.5], bead: [0.5, 0.78, 1.06, 2.15] };
export const PUDDLES = [
  { x: -1.4, z: -0.5, rx: 1.7, rz: 0.8 },
  { x: 1.5, z: 1.1, rx: 1.3, rz: 0.8 },
  { x: -0.3, z: 3.4, rx: 2.4, rz: 1.0 },
];
export const HELI = { x: 0.2, z: 0.3, r: 2.3 };

function concrete() {
  const p = [];
  p.push(box(34, 0.6, 26.7, 0, -0.3, 10.65));
  p.push(box(16 + GAP[0], CURB_H, 0.35, (-16 + GAP[0]) / 2, CURB_H / 2, PARAPET_Z));
  p.push(box(16 - GAP[1], CURB_H, 0.35, (GAP[1] + 16) / 2, CURB_H / 2, PARAPET_Z));
  p.push(new RingGeometry(HELI.r - 0.1, HELI.r + 0.1, 48).rotateX(-Math.PI / 2).translate(HELI.x, 0.012, HELI.z));
  p.push(new RingGeometry(HELI.r - 0.45, HELI.r - 0.36, 48).rotateX(-Math.PI / 2).translate(HELI.x, 0.012, HELI.z));
  const H = HUT;
  p.push(box(H.w, H.h, H.d, H.x, H.h / 2, H.z));
  p.push(box(H.w + 0.6, 0.22, H.d + 1.1, H.x, H.h + 0.11, H.z + 0.45));
  p.push(box(1.3, 0.14, 0.5, H.x - 0.55, 0.07, H.z + H.d / 2 + 0.25)); // the step
  p.push(box(0.9, 0.5, 0.9, H.x + 0.9, H.h + 0.47, H.z - 0.4));
  p.push(box(0.5, 0.25, 0.5, MAST_AT[0], CURB_H + 0.125, MAST_AT[2]));
  p.push(box(1.6, 0.5, 0.7, -8.6, 0.25, -1.9));
  p.push(box(2.2, 0.8, 1.1, 9.4, 0.4, -1.8));
  p.push(box(3.9, 0.12, 0.7, (GAUGE.x[0] + GAUGE.x[3]) / 2, CURB_H + 0.06, GAUGE.z));
  for (const x of GAUGE.x) p.push(cyl(0.27, 0.3, 0.14, x, CURB_H + 0.19, GAUGE.z, 14));
  return merge(p);
}

function steel() {
  const p = [];
  const post = (x) => p.push(cyl(0.035, 0.035, 1.1, x, CURB_H + 0.55, PARAPET_Z, 5));
  const rail = (x0, x1, y) => p.push(cyl(0.03, 0.03, x1 - x0, (x0 + x1) / 2, CURB_H + y, PARAPET_Z, 5, 0, Math.PI / 2));
  for (let x = -16; x <= GAP[0] + 0.01; x += 1.4) post(x);
  post(GAP[0]);
  for (let x = GAP[1]; x <= 16; x += 1.4) post(x);
  for (const y of [0.55, 1.1]) {
    rail(-16, GAP[0], y);
    rail(GAP[1], 16, y);
  }
  const [mx, my, mz] = MAST_AT;
  p.push(cyl(0.05, 0.085, MAST_H, mx, my + MAST_H / 2, mz, 8));
  p.push(cyl(0.025, 0.025, 1.2, mx, my + MAST_H - 0.55, mz, 5, 0, Math.PI / 2));
  p.push(cyl(0.025, 0.025, 0.8, mx, my + MAST_H - 1.4, mz, 5, Math.PI / 2, 0));
  p.push(box(0.42, 0.34, 0.3, mx - 0.5, my + 1.9, mz + 0.18));
  for (let i = 0; i < 4; i++) p.push(box(0.46, 0.025, 0.04, mx - 0.5, my + 1.78 + i * 0.08, mz + 0.34));
  p.push(limb([mx, my + MAST_H - 0.5, mz], [mx + 1.7, my, mz + 0.9], 0.012, 0.012, 4));
  p.push(limb([mx, my + MAST_H, mz], [mx, my + MAST_H + 0.55, mz], 0.02, 0.01, 4));
  p.push(box(0.55, 0.02, 0.02, mx + 0.1, my + MAST_H + 0.5, mz));
  p.push(box(0.14, 0.14, 0.02, mx + 0.42, my + MAST_H + 0.5, mz));
  GAUGE.x.forEach((x, i) => {
    const fy = GAUGE.floor + 0.26;
    p.push(new TorusGeometry(GAUGE.r + 0.015, 0.018, 5, 18).rotateX(Math.PI / 2).translate(x, fy + GAUGE.h, GAUGE.z));
    for (let k = 1; k < 10; k++) p.push(box(k % 2 ? 0.1 : 0.16, 0.012, 0.012, x + (k % 2 ? 0.05 : 0.02), fy + k * 0.25, GAUGE.z + GAUGE.r + 0.012));
    p.push(cyl(0.011, 0.011, GAUGE.bead[i], x, fy + GAUGE.bead[i] / 2, GAUGE.z, 5));
    p.push(cyl(0.05, 0.05, 0.06, x, fy + 0.03, GAUGE.z, 8));
  });
  const H = HUT;
  const dx = H.x - 0.55;
  const fz = H.z + H.d / 2;
  p.push(box(0.1, 2.25, 0.12, dx - 0.5, 1.12, fz + 0.02), box(0.1, 2.25, 0.12, dx + 0.5, 1.12, fz + 0.02), box(1.1, 0.1, 0.12, dx, 2.25, fz + 0.02));
  p.push(cyl(0.06, 0.06, 3.4, H.x + 1.35, 1.7, fz + 0.06, 6));
  p.push(box(0.2, 0.14, 0.5, dx + 0.1, 2.75, fz + 0.3), cyl(0.07, 0.07, 0.3, dx + 0.1, 2.75, fz + 0.55, 8, Math.PI / 2, 0)); // the CCTV: body and lens
  p.push(limb([dx + 0.1, 2.9, fz + 0.05], [dx + 0.1, 2.75, fz + 0.3], 0.03, 0.03, 4));
  for (const [ax, az, ah] of [[H.x + 0.6, H.z - 0.7, 4.6], [H.x - 0.8, H.z - 0.9, 3.6], [H.x + 1.1, H.z + 0.3, 3.0]]) {
    p.push(cyl(0.025, 0.04, ah, ax, H.h + 0.22 + ah / 2, az, 5));
    p.push(box(0.9, 0.025, 0.025, ax, H.h + 0.22 + ah * 0.8, az), box(0.6, 0.025, 0.025, ax, H.h + 0.22 + ah * 0.55, az));
  }
  p.push(cyl(0.34, 0.06, 0.1, H.x - 0.2, H.h + 1.0, H.z - 0.2, 14, 0.6, 0.0));
  p.push(cyl(0.05, 0.06, 2.3, 4.7, H.h + 0.22 + 1.15, -0.45, 6));
  p.push(limb([4.7, 5.8, -0.45], [4.7, 5.9, -0.7], 0.04, 0.04, 5));
  return merge(p);
}

function lamp() {
  const g = merge([box(0.5, 0.36, 0.5, 0, 0, 0), cyl(0.3, 0.12, 0.28, 0, -0.3, 0, 12)]);
  return g;
}

function puddleMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U, uSize: { value: new Vector3(1, 1, 0) }, uMhSeed: { value: 0 } },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform vec3 uOrigin;
      varying vec3 vP;
      varying vec2 vUv;
      uniform float uBreak;
      vec3 rot(vec3 v, vec3 k, float a) { return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a)); }
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vec3 pos = w.xyz;
        if (uBreak > 0.0) { pos.y -= 4.0 * uBreak * uBreak; }
        vP = pos - uOrigin;
        gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uKey, uAxis, uOrigin;
      uniform vec2 uCone;
      uniform float uKeyOn, uScreenGlow, uToll, uBreak, uBoost;
      varying vec3 vP;
      varying vec2 vUv;
      ${MH}
      ${PUDDLE_FRESNEL}
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float pud = mhAA(mhFbm(vUv * vec2(9.0, 22.0) + 3.0), 0.62);
        float edge = (1.0 - smoothstep(0.82, 1.0, r)) * mix(1.0, 0.94 + 0.06 * pud, uBoost);
        vec3 toL = uKey - vP;
        float d = length(toL);
        vec3 L = toL / d;
        float spot = smoothstep(uCone.x, uCone.y, dot(-L, uAxis)) * uKeyOn;
        vec3 V = normalize(cameraPosition - uOrigin - vP);
        vec3 H = normalize(L + V);
        float nh = max(H.y, 0.0);
        vec3 base = vec3(0.012, 0.030, 0.036);
        float streak = pow(nh, 160.0) * 2.4 + pow(nh, 26.0) * 0.28;
        vec3 sky = vec3(0.30, 0.17, 0.07) * pow(1.0 - max(V.y, 0.0), 3.0) * 0.55;
        vec3 col = base + sky * 0.5 + vec3(1.0, 0.80, 0.55) * streak * spot + vec3(0.04, 0.14, 0.16) * uScreenGlow * 0.25 * (1.0 + uToll);
        float smear = spot * exp(-pow((vUv.x - 0.5) * 6.0, 2.0)) * (0.6 + 0.4 * mhVn(vec2(vUv.x * 30.0, vUv.y * 4.0)));
        col += vec3(1.0, 0.12, 0.18) * 0.35 * smear * uBoost;
        if (uBoost > 0.5) {
          float gz = dot(puddleFresnel(vec3(0.0, 1.0, 0.0), L, V, vec3(0.22, 0.20, 0.18)), vec3(0.2126, 0.7152, 0.0722));
          for (int k = 0; k < 6; k++) {
            float fk = float(k);
            float sx = 0.12 + 0.76 * fract(sin(fk * 12.9898 + 4.1) * 43758.5453);
            float top = 0.15 + 0.6 * fract(sin(fk * 78.233 + 9.0) * 43758.5453);
            float inX = exp(-pow((vUv.x - sx) / 0.05, 2.0));
            float inY = step(0.15, vUv.y) * step(vUv.y, top);
            col += vec3(0.851, 0.604, 0.271) * 0.5 * (1.0 - vUv.y) * inX * inY * (0.5 + gz);
          }
          col += vec3(1.0, 0.12, 0.18) * 0.18 * exp(-pow((vUv.x - 0.5) * 3.0, 2.0)) * gz;
        }
        float pa = max(0.84, (1.0 - V.y) * uBoost) * edge;
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)) * pa, pa);
      }`,
  });
}

function doorMaterial() {
  return new ShaderMaterial({
    uniforms: { uBreak: U.uBreak, uOrigin: U.uOrigin },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    vertexShader: /* glsl */ `
      uniform vec3 uOrigin;
      uniform float uBreak;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        if (uBreak > 0.0) w.y -= 4.0 * uBreak * uBreak;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        float g = (1.0 - vUv.y * 0.55) * smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
        gl_FragColor = vec4(pow(vec3(1.0, 0.62, 0.26) * g * 0.95, vec3(2.2)), 0.0);
      }`,
  });
}


const D = new Object3D();
export function buildRoof() {
  const g = new Group();
  const mats = {
    concrete: tene({ albedo: "#a39a89", wet: 0.9, grunge: true }),
    steel: tene({ albedo: "#9aa3a2", wet: 0.85 }),
    glass: tene({ glass: true, wet: 1 }),
    lampBody: tene({ albedo: "#58534a", wet: 0.6 }),
    puddle: puddleMaterial(),
    door: doorMaterial(),
    lens: flat("#fff1cf"),
    bead: tene({ albedo: "#4f86ff", wet: 1, emit: 0.7 }),
    ring: flat("#ff6b5a", 2),
    glow: new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float a = pow(max(1.0 - r, 0.0), 2.4); gl_FragColor = vec4(vec3(0.30, 0.50, 1.0) * a * 0.9, 0.0); }",
    }),
  };
  const mk = (geo, mat, order = 0) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = true;
    m.userData.cull = true;
    m.renderOrder = order;
    if (mat.transparent) m.userData.layer = 1;
    g.add(m);
    return m;
  };
  const geos = [];
  const own = (x) => (geos.push(x), x);
  mk(own(concrete()), mats.concrete);
  mk(own(steel()), mats.steel);
  mk(own(merge(GAUGE.x.map((x) => cyl(GAUGE.r, GAUGE.r, GAUGE.h, x, GAUGE.floor + 0.26 + GAUGE.h / 2, GAUGE.z, 14)))), mats.glass, 4);
  for (const q of PUDDLES) mk(own(new CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(q.rx, 1, q.rz).translate(q.x, 0.02, q.z)), mats.puddle, 2);
  const dx = HUT.x - 0.55;
  const fz = HUT.z + HUT.d / 2;
  const doorGeo = own(box(0.88, 2.12, 0.03, dx, 1.14, fz + 0.03));
  mk(doorGeo, mats.door, 3);
  const lampG = own(lamp());
  const lampM = mk(lampG, mats.lampBody);
  lampM.position.copy(KEY_AT).addScaledVector(KEY_AIM.clone().sub(KEY_AT).normalize(), -0.1);
  lampM.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), KEY_AIM.clone().sub(KEY_AT).normalize());
  const lensM = mk(own(new CircleGeometry(0.28, 14).rotateX(Math.PI / 2)), mats.lens);
  lensM.position.copy(KEY_AT);
  lensM.quaternion.copy(lampM.quaternion);
  const mkInst = (geo, mat, order) => {
    const m = new InstancedMesh(own(geo), mat, 4);
    m.frustumCulled = false;
    m.renderOrder = order;
    if (mat.transparent) m.userData.layer = 1;
    g.add(m);
    return m;
  };
  const beads = mkInst(ball(0.105, 0, 0, 0, 1, 1, 1, 12, 8), mats.bead, 1);
  const rings = mkInst(new TorusGeometry(GAUGE.r + 0.07, 0.022, 6, 24).rotateX(Math.PI / 2), mats.ring, 5);
  const glows = mkInst(new CircleGeometry(1, 20), mats.glow, 6);
  const cups = mk(
    own(
      merge(
        [0, 1, 2].flatMap((k) => {
          const a = (k * Math.PI * 2) / 3;
          const x = Math.cos(a) * 0.42;
          const z = Math.sin(a) * 0.42;
          return [limb([0, 0, 0], [x, 0, z], 0.018, 0.018, 4), ball(0.1, x, 0.02, z, 1, 0.8, 1, 8, 5)];
        }),
      ),
    ),
    mats.steel,
  );
  cups.position.set(MAST_AT[0], MAST_AT[1] + MAST_H + 0.06, MAST_AT[2]);
  const fy = GAUGE.floor + 0.26;
  const hide = () => {
    D.position.set(0, -50, 0);
    D.scale.setScalar(0.0001);
    D.rotation.set(0, 0, 0);
    D.updateMatrix();
  };
  return {
    group: g,
    tick(t, gauges) {
      cups.rotation.y = t * 7.5;
      for (let i = 0; i < 4; i++) {
        const s = gauges[i];
        const x = GAUGE.x[i];
        if (s.show) {
          D.position.set(x, fy + s.y, GAUGE.z);
          D.scale.setScalar(1 + 0.25 * s.flare);
          D.rotation.set(0, 0, 0);
          D.updateMatrix();
        } else hide();
        beads.setMatrixAt(i, D.matrix);
        if (s.ring > 0.001) {
          D.position.set(x, fy + GAUGE.bead[i], GAUGE.z);
          D.scale.setScalar(s.ring);
          D.rotation.set(0, 0, 0);
          D.updateMatrix();
        } else hide();
        rings.setMatrixAt(i, D.matrix);
        if (s.flare > 0.01) {
          D.position.set(x, fy + s.y, GAUGE.z + 0.12);
          D.scale.setScalar(0.45 + 0.9 * s.flare);
          D.rotation.set(0, 0, 0);
          D.updateMatrix();
        } else hide();
        glows.setMatrixAt(i, D.matrix);
      }
      beads.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = glows.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const x of geos) x.dispose();
      for (const m of Object.values(mats)) m.dispose();
      for (const m of [beads, rings, glows]) m.dispose();
    },
  };
}
