// THE FIELDS AND THE SHOT, as instanced geometry. Pale-cyan electric arcs leap between the two bushings; lilac
// magnetic rings circle each. At first they are WRONG (arcs scattered and tilted, rings off-centre and askew,
// crossing at bad angles). State after state, on twos, a contraction pulls every one toward the one fixed
// target (a state's error is 0.62 of the last), each earlier state left behind as a faded construction line,
// until every arc crosses every ring at a right angle; as each crossing locks a draftsman's right-angle mark
// pops in. Only then does amber rise in the glass and climb the bushings, the coin is flicked, and the beam
// tears down the bridge. Nothing allocates per frame: every temporary is module-level.

import { AdditiveBlending, BoxGeometry, CircleGeometry, Color, Mesh, DoubleSide, InstancedMesh, MeshBasicMaterial, Matrix4, Object3D, OctahedronGeometry, ShaderMaterial, TorusGeometry, Vector3, CylinderGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AMBER, BEAM, COMMON, CREAM, CYAN, LILAC, U, rgb } from "./blue";
import { BUSH_H, BUSH_X, WATER_Y, hashN as hash } from "./scenery";

export const LEVELS = [1.15, 2.35, 3.55]; // the height of each ring/arc layer on the bushings
const BOWS = [-0.52, 0, 0.52]; // each layer's three arcs
export const NARC = LEVELS.length * BOWS.length; // 9
export const NRING = LEVELS.length * 2; // 6
const K = 12; // segments an arc
const RHO = 0.95; // a ring's radius
const GHOSTS = 3;
const DT = 1 / 3; // a state lasts four drawings
export const S_LOCK = 10; // the state by which everything is locked
export const FIELD_T0 = 1.9; // the clock the states start on

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const O = new Object3D();
const M = new Matrix4();
const P = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
const Q = new Vector3();
const T = new Vector3();
const X = new Vector3();
const Y = new Vector3();
const Z = new Vector3();
const C = new Color();

// ---- the target and the wrong start --------------------------------------------------------------------------
const ARCS = [];
for (const [j, y] of LEVELS.entries()) for (const [b, th] of BOWS.entries()) ARCS.push({ y, th, c: 2.1 + 0.2 * Math.abs(th), r: Array.from({ length: 8 }, (_, n) => (hash(j * 3 + b, n + 1) - 0.5) * 2) });
const RINGS = [];
for (const s of [-1, 1]) for (const [j, y] of LEVELS.entries()) RINGS.push({ s, y, r: Array.from({ length: 8 }, (_, n) => (hash(j + (s > 0 ? 7 : 0), n + 21) - 0.5) * 2) });

// where an arc's control points are in state s (s < 0 is off; the wrong start is amplitude 1)
function arcPoints(a, s) {
  const k = 0.62 ** s;
  const thA = a.th + k * a.r[0];
  const eA = k * a.r[1] * 0.9;
  const thB = a.th + k * a.r[2];
  const eB = k * a.r[3] * 0.9;
  const c = a.c * (1 + k * a.r[4] * 0.5);
  const yA = a.y + k * a.r[5] * 0.5;
  const yB = a.y + k * a.r[6] * 0.5;
  P[0].set(-BUSH_X, yA, 0);
  P[3].set(BUSH_X, yB, 0);
  P[1].set(-BUSH_X + c * Math.cos(thA) * Math.cos(eA), yA + c * Math.sin(eA), c * Math.sin(thA) * Math.cos(eA));
  P[2].set(BUSH_X - c * Math.cos(thB) * Math.cos(eB), yB + c * Math.sin(eB), c * Math.sin(thB) * Math.cos(eB));
}
const bez = (u, out) => {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return out.set(a * P[0].x + b * P[1].x + c * P[2].x + d * P[3].x, a * P[0].y + b * P[1].y + c * P[2].y + d * P[3].y, a * P[0].z + b * P[1].z + c * P[2].z + d * P[3].z);
};

// the crossings: arc a at the bushing side s: where it meets that bushing's ring of its layer, locked
const MARKS = [];
for (const [ai, a] of ARCS.entries()) for (const s of [-1, 1]) MARKS.push({ a, s, lock: 6 + ((ai * 2 + (s > 0 ? 1 : 0)) % 5) });
export const NMARK = MARKS.length; // 18

// ---- the meshes ------------------------------------------------------------------------------------------------
export function makeFields() {
  const segG = new BoxGeometry(1, 1, 1);
  const arcMat = new MeshBasicMaterial({ toneMapped: false, fog: false });
  const arcs = new InstancedMesh(segG, arcMat, NARC * K * (1 + GHOSTS));
  arcs.frustumCulled = false;
  arcs.count = 0;

  const torus = new TorusGeometry(1, 0.022, 4, 56);
  const ringMat = new ShaderMaterial({
    uniforms: { uCyan: { value: rgb(CYAN) }, uLilac: { value: rgb(LILAC) }, uCream: { value: rgb(CREAM) } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vI;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vI = instanceColor;
        #else
          vI = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    // vI: x the compass stroke's reveal, y how far it is lit (solid lilac), z its fade (a ghost is faint)
    fragmentShader: /* glsl */ `
      uniform vec3 uLilac, uCream;
      varying vec2 vUv;
      varying vec3 vI;
      void main() {
        if (vUv.x > vI.x) discard;
        float dash = mix(step(0.5, fract(vUv.x * 28.0)), 1.0, vI.y);
        if (dash < 0.5) discard;
        vec3 c = mix(uCream, uLilac, vI.y);
        gl_FragColor = vec4(c, vI.z);
      }`,
  });
  const rings = new InstancedMesh(torus, ringMat, NRING * (1 + GHOSTS));
  rings.frustumCulled = false;
  rings.count = 0;
  rings.setColorAt(0, C.set("#ffffff"));
  arcs.setColorAt(0, C.set("#ffffff"));

  // the right-angle mark: two short cream strokes meeting at a corner (in the x-y plane, facing the lens)
  const markG = mergeGeometries([new BoxGeometry(0.34, 0.035, 0.035).translate(0.17, 0, 0), new BoxGeometry(0.035, 0.34, 0.035).translate(0, 0.17, 0)]);
  const marks = new InstancedMesh(markG, new MeshBasicMaterial({ color: CREAM, toneMapped: false, fog: false }), NMARK);
  marks.frustumCulled = false;
  marks.count = 0;

  // the amber core up each bushing and the glow in the glass
  const coreG = mergeGeometries([
    ...[-1, 1].map((s) => new CylinderGeometry(0.3, 0.3, BUSH_H, 10, 1, true).translate(s * BUSH_X, BUSH_H / 2, 0)),
  ]);
  const coreMat = new ShaderMaterial({
    uniforms: { uAmber: U.uAmber, uTime: U.uTime, uC: { value: rgb(AMBER) } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: "varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uAmber, uTime;
      uniform vec3 uC;
      varying vec3 vP;
      void main() {
        float h = vP.y / ${BUSH_H.toFixed(2)};
        if (h > uAmber) discard;
        float front = smoothstep(uAmber - 0.18, uAmber, h);
        gl_FragColor = vec4(uC * (0.55 + 0.35 * sin(uTime * 7.0 + vP.y * 3.0)) * (1.0 - front * 0.5), 1.0);
      }`,
  });
  const core = new InstancedMesh(coreG, coreMat, 1);
  core.setMatrixAt(0, M.identity());
  core.frustumCulled = false;
  core.renderOrder = 4;
  // the pool of amber on the glass, where both fields are strong (a flat disc, soft, additive)
  const poolG = new CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(3.1, 1, 1.7).translate(0, 0.03, 0);
  const pool = new Mesh(
    poolG,
    new ShaderMaterial({
      uniforms: { uAmber: U.uAmber, uC: { value: rgb(AMBER) } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: "varying vec2 vP; void main() { vP = position.xz / vec2(3.1, 1.7); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uAmber; uniform vec3 uC; varying vec2 vP; void main() { float r = length(vP); float k = (1.0 - smoothstep(0.0, 1.0, r)) * uAmber; gl_FragColor = vec4(uC * k * 0.8, 1.0); }",
    }),
  );
  pool.frustumCulled = false;
  pool.renderOrder = 3;

  // sparks and bits: one pool (frozen sparks, arc crackle, spray, dust, embers)
  const bits = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ toneMapped: false, fog: false }), BITS);
  bits.frustumCulled = false;
  for (let i = 0; i < BITS; i++) bits.setColorAt(i, C.set(i < 10 ? AMBER : i < 34 ? (i % 2 ? CREAM : CYAN) : i < 114 ? (i % 3 ? CREAM : CYAN) : i < 154 ? CREAM : AMBER));

  // the coin
  const coin = {
    geo: new CylinderGeometry(0.17, 0.17, 0.045, 18).rotateX(Math.PI / 2),
    mat: new MeshBasicMaterial({ color: "#ffc34a", toneMapped: false, fog: false }),
  };

  // the beam: a core and a sheath along +x (unit length, scaled)
  const beamG = new CylinderGeometry(1, 1, 1, 14, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
  const beamMat = (hex, power, op) =>
    new ShaderMaterial({
      uniforms: { uC: { value: rgb(hex) }, uAway: U.uAway },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: "varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * vec3(0.0, position.y, position.z)); gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main() { float f = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uC * pow(f, ${power}) * ${op}, 1.0); }`,
    });
  const sheath = new InstancedMesh(beamG, beamMat("#ff8f12", "1.6", "0.9"), 1);
  const beamCore = new InstancedMesh(beamG, beamMat("#ffd689", "2.4", "1.0"), 1);
  for (const b of [sheath, beamCore]) {
    b.frustumCulled = false;
    b.visible = false;
    b.setMatrixAt(0, M.identity());
    b.renderOrder = 6;
  }

  const dispose = () => {
    for (const g of [segG, torus, markG, coreG, poolG, bits.geometry, coin.geo, beamG]) g.dispose();
    for (const m of [arcMat, ringMat, marks.material, coreMat, pool.material, bits.material, coin.mat, sheath.material, beamCore.material]) m.dispose();
    for (const i of [arcs, rings, marks, core, bits, sheath, beamCore]) i.dispose();
  };
  return { arcs, rings, marks, core, pool, bits, coin, sheath, beamCore, dispose };
}
export const BITS = 170;

// ---- per-frame ---------------------------------------------------------------------------------------------------
const seg = (mesh, i, a, b, w, color, fade) => {
  O.position.copy(a).add(b).multiplyScalar(0.5);
  Q.subVectors(b, a);
  const len = Q.length();
  O.quaternion.setFromUnitVectors(X.set(1, 0, 0), Q.divideScalar(len || 1));
  O.scale.set(len * 1.18, w, w);
  O.updateMatrix();
  mesh.setMatrixAt(i, O.matrix);
  mesh.setColorAt(i, C.set(color).multiplyScalar(fade));
};

// the arcs and rings of state s and its ghosts; t the clock; returns nothing, fills the meshes
export function updateFields(f, t, camQuat) {
  const s = Math.floor((t - FIELD_T0) / DT);
  const show = s >= 0;
  let n = 0;
  let r = 0;
  if (show) {
    for (let g = 0; g <= GHOSTS; g++) {
      const st = s - g;
      if (st < 0) break;
      const live = g === 0;
      const fade = live ? 1 : [0, 0.34, 0.2, 0.11][g];
      for (let ai = 0; ai < NARC; ai++) {
        const a = ARCS[ai];
        // the live arc's locked state is the same curve; ghosts are drawn thinner, in cream, as construction lines
        arcPoints(a, Math.min(st, 14));
        bez(0, Y);
        for (let k = 1; k <= K; k++) {
          bez(k / K, Z);
          if (live) seg(f.arcs, n++, Y, Z, 0.07 + 0.015 * Math.sin(t * 40 + k + ai), CYAN, 1);
          else seg(f.arcs, n++, Y, Z, 0.032, CREAM, fade);
          Y.copy(Z);
        }
      }
      for (let ri = 0; ri < NRING; ri++) {
        const q = RINGS[ri];
        const k = 0.62 ** Math.min(st, 14);
        O.position.set(q.s * BUSH_X + k * q.r[0] * 0.45, q.y + k * q.r[1] * 0.45, k * q.r[2] * 0.35);
        O.rotation.set(k * q.r[3] * 0.8 + Math.PI / 2, 0, k * q.r[4] * 0.8); // a ring lies flat about the bushing
        O.scale.setScalar(RHO * (1 + k * q.r[5] * 0.3));
        O.updateMatrix();
        f.rings.setMatrixAt(r, O.matrix);
        // the compass stroke traces first (cream, dashed), then the ring lights (lilac, solid)
        const trace = smooth(FIELD_T0 - 0.3 + ri * 0.22, FIELD_T0 + 0.5 + ri * 0.22, t);
        const lit = smooth(FIELD_T0 + 0.7 + ri * 0.25, FIELD_T0 + 1.0 + ri * 0.25, t);
        C.setRGB(live ? trace : 1, live ? lit : 0, live ? 1 : fade * 0.9);
        f.rings.setColorAt(r, C);
        r++;
      }
    }
  }
  f.arcs.count = n;
  f.rings.count = r;
  if (f.arcs.instanceMatrix) f.arcs.instanceMatrix.needsUpdate = true;
  if (f.arcs.instanceColor) f.arcs.instanceColor.needsUpdate = true;
  f.rings.instanceMatrix.needsUpdate = true;
  if (f.rings.instanceColor) f.rings.instanceColor.needsUpdate = true;

  // the right-angle marks: pop in as each crossing locks, facing the lens
  let m = 0;
  for (const mk of MARKS) {
    const at = FIELD_T0 + mk.lock * DT;
    const k = (t - at) / 0.22;
    if (k <= 0) continue;
    const pop = Math.min(1, k) * (1 + 0.3 * Math.max(0, 1 - k * 1.4));
    const th = mk.a.th;
    O.position.set(mk.s * BUSH_X - mk.s * RHO * Math.cos(th), mk.a.y, RHO * Math.sin(th));
    O.quaternion.copy(camQuat);
    O.scale.setScalar(0.8 * pop);
    O.updateMatrix();
    f.marks.setMatrixAt(m++, O.matrix);
  }
  f.marks.count = m;
  f.marks.instanceMatrix.needsUpdate = true;
}

// B. the coupling's rise: amber in the glass, climbing both bushings
export const amberAt = (t) => smooth(5.4, 6.8, t);

// the shot's hit-stopped clock: the scene holds still for 0.14 s on the shot
export const SHOT = 12.0;
export const STOP = 0.14;
export const stopped = (t) => (t < SHOT ? t : t < SHOT + STOP ? SHOT : t - STOP);

// ---- the bits ------------------------------------------------------------------------------------------------------
const FROZEN = [
  [-2.1, 4.9, 0.3], [-2.4, 4.6, -0.2], [-1.8, 5.0, 0.1], [2.1, 5.0, 0.2], [2.45, 4.7, -0.3], [1.8, 4.85, 0.0], [-2.3, 1.7, 0.5], [2.3, 1.9, -0.5], [-1.7, 3.1, -0.4], [1.7, 2.7, 0.4],
];
export function updateBits(f, t, ts, seen) {
  const b = f.bits;
  const shot = ts - SHOT;
  const wind = shot > 0;
  for (let i = 0; i < BITS; i++) {
    let x = 0;
    let y = -60;
    let z = 0;
    let sc = 0;
    if (i < 10) {
      // frozen sparks: caught mid-crackle, never falling (they flinch a size on twos)
      if (t > FIELD_T0) {
        const f10 = FROZEN[i];
        x = f10[0];
        y = f10[1];
        z = f10[2];
        sc = 0.07 + 0.03 * ((Math.floor(t * 12) + i) % 3 === 0 ? 1 : 0);
      }
    } else if (i < 34) {
      // arc crackle, on twos: a spark jumps along the arcs while they settle
      const live = t > FIELD_T0 + 0.2 && t < SHOT + 0.1;
      const step = Math.floor(t * 12);
      if (live && (step + i) % 3 !== 0) {
        const a = ARCS[(i * 5 + step) % NARC];
        arcPoints(a, Math.min(Math.max(0, Math.floor((t - FIELD_T0) / DT)), 14));
        bez(0.08 + 0.84 * hash(i + step, 2), Z);
        x = Z.x + (hash(i, step) - 0.5) * 0.3;
        y = Z.y + (hash(i, step + 3) - 0.5) * 0.3;
        z = Z.z;
        sc = 0.05 + 0.07 * hash(i, step + 9);
      }
    } else if (i < 114) {
      // the twin wake's spray: leaps from the river along both sides as the shot passes, falls back as glints
      const j = i - 34;
      const bx = 2 + 26 * hash(j, 1);
      const side = j % 2 ? 1 : -1;
      const born = SHOT + (bx - 0.8) / BEAM.speed;
      const age = ts - born;
      if (age > 0 && age < 1.7) {
        const vy = 5 + 5 * hash(j, 3);
        const yy = Math.max(0, vy * age - 7 * age * age);
        x = bx + 1.2 * age * (hash(j, 4) - 0.3);
        z = BEAM.z + side * (6 + 0.9 * (hash(j, 5) - 0.5) + 1.2 * age * side * hash(j, 6));
        y = WATER_Y + yy;
        // it falls back as a glint on the water, then goes
        sc = (yy > 0 ? 0.13 : 0.1 * (1 - smooth(1.1, 1.7, age))) * (0.6 + hash(j, 7));
      }
    } else if (i < 154) {
      // girder dust: shed from the truss as the shot passes its post
      const j = i - 114;
      const px = 2 + 3 * Math.floor(hash(j, 1) * 9);
      const side = j % 2 ? 1 : -1;
      const born = SHOT + (px - 0.8) / BEAM.speed;
      const age = ts - born;
      if (age > 0 && age < 2.2) {
        x = px + 0.3 * Math.sin(age * 3 + j);
        z = side * 3.3;
        y = -0.1 - 1.4 * age * (0.4 + hash(j, 2)) + 0.25 * Math.sin(age * 5 + j);
        sc = 0.05 * (1 - smooth(1.4, 2.2, age));
      }
    } else if (seen) {
      // embers: rise off the burning sheet
      const j = i - 154;
      const age = (t - seen) * (0.7 + 0.5 * hash(j, 1)) + hash(j, 2) * 0.5;
      if (age > 0 && age < 2.4) {
        x = -6 + 20 * hash(j, 3);
        z = -6 + 12 * hash(j, 4);
        y = -2 + 4 * hash(j, 5) + age * (1.4 + hash(j, 6));
        sc = 0.07 * (1 - smooth(1.2, 2.4, age));
      }
    }
    O.position.set(x, y, z);
    O.rotation.set(i, i * 2.1, 0);
    O.scale.setScalar(Math.max(sc, 0.0001));
    O.updateMatrix();
    b.setMatrixAt(i, O.matrix);
  }
  void wind;
  b.instanceMatrix.needsUpdate = true;
}

// the beam: head and tail along +x
export function updateBeam(f, ts) {
  const shot = ts - SHOT;
  const on = shot > 0 && shot < 1.45;
  f.sheath.visible = f.beamCore.visible = on;
  if (!on) return;
  const head = Math.min(0.8 + BEAM.speed * shot, 46);
  const tail = Math.min(head - 0.5, Math.max(0.8, 0.8 + BEAM.speed * (shot - 0.62)));
  const grow = 1 - smooth(1.1, 1.45, shot);
  const rs = (0.5 + 0.12 * Math.sin(ts * 60)) * grow;
  const rc = 0.2 * grow;
  for (const [m, r] of [[f.sheath, rs], [f.beamCore, rc]]) {
    O.position.set(tail, BEAM.y, BEAM.z);
    O.quaternion.identity();
    O.scale.set(Math.max(head - tail, 0.01), Math.max(r, 0.001), Math.max(r, 0.001));
    O.updateMatrix();
    m.setMatrixAt(0, O.matrix);
    m.instanceMatrix.needsUpdate = true;
  }
  U.uHead.value = head;
}
