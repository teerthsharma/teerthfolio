// The live room as the world: buildRoom from live/room.js built whole, its west windows opened onto the painted outside (glass.js),
// the petals as flat instanced sheets, Chabashira and her hair moved as the live move moves them, and the room's paint and decals.
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { BACK_Z, buildRoom, CEIL, FRONT_Z, K, makeShared, Mesher, WALL_X, WIN_Z } from "../live/room.js";
import { FLOOR, TEACHER_AT } from "../live/layout.js";
import { concat, flatDecal, paintRoom } from "./paint.js";
import { SECOND_ROW } from "./dress.js";

const PETALS = 110;
const O = new Object3D();
const V = new Vector3();
const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const westWall = (pos, v) => {
  for (let j = 0; j < 3; j++) {
    const i = (v + j) * 3;
    if (pos[i] > WALL_X[0] + 0.01 || pos[i + 2] < BACK_Z - 0.01) return false;
  }
  return true;
};

function openWindows(geo) {
  const pos = geo.attributes.position.array;
  const kind = geo.attributes.aK.array;
  const keep = [];
  for (let v = 0; v < geo.attributes.position.count; v += 3) {
    const k = Math.round(kind[v]);
    if ((k === K.GLASS && pos[v * 3] < 0) || (k === K.WALL && westWall(pos, v))) continue;
    keep.push(v);
  }
  const out = new BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const n = attr.itemSize;
    const arr = new Float32Array(keep.length * 3 * n);
    keep.forEach((v, t) => {
      for (let j = 0; j < 3; j++) for (let c = 0; c < n; c++) arr[(t * 3 + j) * n + c] = attr.array[(v + j) * n + c];
    });
    out.setAttribute(name, new BufferAttribute(arr, n));
  }
  geo.dispose();
  return out;
}

function windowWall() {
  const m = new Mesher();
  let a = BACK_Z;
  for (const z of WIN_Z) {
    const h0 = z - 1.4;
    const h1 = z + 1.4;
    m.slab(WALL_X[0] - 0.2, FLOOR, a, WALL_X[0], CEIL, h0, "#f6e7cf", K.WALL);
    m.slab(WALL_X[0] - 0.2, FLOOR, h0, WALL_X[0], 0.8, h1, "#f6e7cf", K.WALL);
    m.slab(WALL_X[0] - 0.2, 4.5, h0, WALL_X[0], CEIL, h1, "#f6e7cf", K.WALL);
    a = h1;
  }
  m.slab(WALL_X[0] - 0.2, FLOOR, a, WALL_X[0], CEIL, FRONT_Z, "#f6e7cf", K.WALL);
  return m.build();
}

const petalMaterial = () =>
  new ShaderMaterial({
    side: DoubleSide,
    vertexShader: "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(pow(vC, vec3(2.2)), 0.99); }",
  });

const SEATS = [-3.5, 3.5].flatMap((x) => [-2.2, 2.6, 6.0].map((z) => [x - 1.0, z - 1.75, x + 1.0, z + 0.7]));

export function buildSet(ctx, { openGlass = true } = {}) {
  const shared = makeShared();
  const it = buildRoom(shared);
  let parts;
  for (;;) {
    const n = it.next();
    if (n.done) {
      parts = n.value;
      break;
    }
  }
  const cm = paintRoom(parts.room.material);
  const group = new Group();
  const { room, board, paper, teacher, hair, rays, patches } = parts;
  room.frustumCulled = false;
  if (openGlass) room.geometry = concat([openWindows(room.geometry), windowWall()]);
  const petals = parts.petals;
  const petalMat = petalMaterial();
  petals.material.dispose();
  petals.material = petalMat;
  const decal = flatDecal([[-1.4, -1.3, 1.4, 2.45], ...SEATS, ...SECOND_ROW.map(([x, z]) => [x - 1.0, z - 1.75, x + 1.0, z + 0.7])]);
  group.add(room, board, paper, teacher, hair, rays, patches, petals, decal);

  let gust = 0;
  const step = (S, camLocal) => {
    const tt = Math.floor(S * 12) / 12;
    shared.uTime.value = S;
    shared.uCam.value.copy(camLocal);
    teacher.position.set(...TEACHER_AT);
    teacher.rotation.y = -0.55;
    hair.position.copy(V.set(0, 2.0, -0.05).multiplyScalar(1.95).applyEuler(teacher.rotation).add(teacher.position));
    hair.rotation.set(0.04 * Math.sin(tt * 1.7), teacher.rotation.y, 0.07 * Math.sin(tt * 1.3 + 1));
    const drift = 1 + 2.5 * gust;
    for (let i = 0; i < PETALS; i++) {
      const u = (hash(i, 1) * 14 + tt * (0.8 + 0.9 * hash(i, 2)) * drift) % 14;
      O.position.set(-6 + u, 1.0 + 3.6 * hash(i, 4) - 0.18 * u * (0.3 + hash(i, 5)) + 0.25 * Math.sin(tt * 1.6 + i), -4.5 + 14 * hash(i, 3) + 0.5 * Math.sin(tt * 0.9 + i));
      O.rotation.set(tt * 1.7 + i, tt * 2.3, tt * 1.1 + i * 0.5);
      O.scale.setScalar(0.8 + 0.5 * hash(i, 6));
      if (O.position.distanceTo(camLocal) < 1.4) O.scale.setScalar(0.0001);
      O.updateMatrix();
      petals.setMatrixAt(i, O.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
  };

  const mats = [cm, rays.material, petalMat, decal.material];
  const dispose = () => {
    group.traverse((o) => o.geometry?.dispose());
    for (const m of mats) m.dispose();
  };
  return {
    group,
    shared,
    parts: { room, board, paper, teacher, hair, rays, patches, petals },
    mats,
    step,
    setGust: (k) => {
      gust = clamp01(k);
    },
    dispose,
  };
}
