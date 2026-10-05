// STATIC MERGE: the island is hundreds of small meshes that never move, one
// draw call each. Once the world has stood still for a moment, every plain
// static mesh is baked into a few chunks: same material class (type,
// roughness, metalness, flat shading, side, shadow flags), same 32 m cell,
// colour baked into vertex colours (the palette trick), one draw call per
// chunk. The originals stay in the scene, hidden, so clicks, hover and every
// system that holds a ref keep working.
//
// Self-healing, because "static" is only observed: each frame every source's
// world matrix, geometry version and material colour is compared with its
// snapshot, and a chunk with a source that changed turns back into its
// originals for good. Any cutscene, arrival or hidden top-level object shows
// the originals too (Stage.jsx and LoopAwakening.jsx hide the world by its
// top-level children and decide what stays, by the originals).
// Pure three; the driver is components/world/StaticMerge.jsx.

import { BufferAttribute, BufferGeometry, Group, Mesh, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const CELL = 32;
const MIN_CHUNK = 2; // a class with one lonely mesh in a cell is not worth a new geometry

function eligible(mesh) {
  if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh || mesh.userData?.noMerge) return null;
  if (mesh.frustumCulled === false || mesh.renderOrder !== 0 || mesh.layers.mask !== 1 || mesh.matrixWorld.determinant() <= 0) return null;
  const m = mesh.material;
  if (Array.isArray(m) || !(m.type === "MeshStandardMaterial" || m.type === "MeshBasicMaterial")) return null;
  if (m.transparent || m.opacity !== 1 || m.alphaTest || m.depthWrite === false || m.depthTest === false || m.map || m.normalMap || m.emissiveMap || m.roughnessMap || m.metalnessMap || m.aoMap || m.alphaMap || m.envMap || m.bumpMap || m.lightMap) return null;
  if (m.onBeforeCompile !== Object.getPrototypeOf(m).onBeforeCompile || m.wireframe) return null;
  const g = mesh.geometry;
  const p = g.attributes.position;
  if (!p || !g.attributes.normal || !(p.array instanceof Float32Array) || g.morphAttributes?.position) return null;
  return m;
}

const classKey = (mesh, m) =>
  [m.type, m.roughness, m.metalness, m.flatShading ? 1 : 0, m.side, m.envMapIntensity, mesh.castShadow ? 1 : 0, mesh.receiveShadow ? 1 : 0, mesh.geometry.index ? 1 : 0, m.fog === false ? 0 : 1, m.emissive ? m.emissive.getHex() : 0, m.emissive ? m.emissiveIntensity : 0].join("|");

const MATS = new Map();
function classMaterial(key, m) {
  let c = MATS.get(key);
  if (!c) {
    c = m.clone();
    c.color.setRGB(1, 1, 1);
    c.vertexColors = true;
    MATS.set(key, c);
  }
  return c;
}

function bake(mesh, m) {
  const g = mesh.geometry;
  const out = new BufferGeometry();
  const pos = g.attributes.position;
  out.setAttribute("position", pos.clone());
  out.setAttribute("normal", g.attributes.normal.clone());
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const src = m.vertexColors ? g.attributes.color : null;
  for (let i = 0; i < n; i++) {
    col[i * 3] = m.color.r * (src ? src.getX(i) : 1);
    col[i * 3 + 1] = m.color.g * (src ? src.getY(i) : 1);
    col[i * 3 + 2] = m.color.b * (src ? src.getZ(i) : 1);
  }
  out.setAttribute("color", new BufferAttribute(col, 3));
  if (g.index) out.setIndex(g.index.clone());
  out.applyMatrix4(mesh.matrixWorld);
  return out;
}

const snap = (mesh, m) => ({ mesh, mw: Float64Array.from(mesh.matrixWorld.elements), ver: mesh.geometry.attributes.position.version, mat: m, c: [m.color.r, m.color.g, m.color.b, m.roughness, m.metalness, m.opacity, m.emissive ? m.emissive.getHex() : 0, m.emissiveIntensity] });

// Meshes visible in the tree, not under `skip` (the cutscene, the seal, our own group).
export function candidates(scene, skip) {
  const list = [];
  scene.updateMatrixWorld(true);
  const walk = (o) => {
    if (!o.visible || skip(o)) return;
    if (o.isMesh) {
      const m = eligible(o);
      if (m) list.push(snap(o, m));
    }
    for (const c of o.children) walk(c);
  };
  for (const c of scene.children) walk(c);
  return list;
}

const same = (a, b) => {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false;
  return true;
};
export const moved = (s) =>
  !same(s.mesh.matrixWorld.elements, s.mw) ||
  s.mesh.geometry.attributes.position.version !== s.ver ||
  s.mat.color.r !== s.c[0] ||
  s.mat.color.g !== s.c[1] ||
  s.mat.color.b !== s.c[2] ||
  s.mat.roughness !== s.c[3] ||
  s.mat.metalness !== s.c[4] ||
  s.mat.opacity !== s.c[5] ||
  (s.mat.emissive ? s.mat.emissive.getHex() : 0) !== s.c[6] ||
  s.mat.emissiveIntensity !== s.c[7];

// The sources that held still between two snapshots, built into chunks.
export function buildChunks(first, second) {
  const before = new Map(first.map((s) => [s.mesh, s]));
  const still = second.filter((s) => before.has(s.mesh) && same(before.get(s.mesh).mw, s.mw));
  const groups = new Map();
  const c = new Vector3();
  for (const s of still) {
    const g = s.mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    g.boundingBox.getCenter(c).applyMatrix4(s.mesh.matrixWorld);
    const key = `${classKey(s.mesh, s.mat)}#${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const group = new Group();
  group.name = "static-merge";
  const chunks = [];
  for (const [key, list] of groups) {
    if (list.length < MIN_CHUNK) continue;
    const geo = mergeGeometries(list.map((s) => bake(s.mesh, s.mat)), false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    const head = list[0];
    const mesh = new Mesh(geo, classMaterial(key.split("#")[0], head.mat));
    mesh.castShadow = head.mesh.castShadow;
    mesh.receiveShadow = head.mesh.receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.userData.noMerge = true;
    mesh.raycast = () => {}; // clicks go to the hidden originals, which keep their handlers
    group.add(mesh);
    chunks.push({ mesh, sources: list, dead: false });
  }
  return { group, chunks, sources: chunks.reduce((n, k) => n + k.sources.length, 0) };
}
