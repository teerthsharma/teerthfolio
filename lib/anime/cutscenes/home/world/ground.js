// Near ground for home: pebbles and snow slabs (one instanced set), turf tufts on the shelf, reeds at the right wall's foot and shingle
// fingers reaching into the water (one instanced set each). Opaque painted wash placed by hash on the live height field: four draw calls.
import { BufferAttribute, Color, ConeGeometry, Group, IcosahedronGeometry, InstancedMesh, Object3D } from "three";
import { wash } from "../live/paper.js";
import { H, WATER_Y, shoreL, shoreR } from "../live/land.js";
import { JETTY } from "../live/farm.js";
import { OC, hash } from "../clock.js";

const STONE = 420, DRIFT = 64, TUFT = 900, REED = 600, FINGER = 8;
const WHITE = (n) => new BufferAttribute(new Float32Array(n * 3).fill(1), 3);
const SRGB = (hex) => new Color(hex).convertLinearToSRGB();
const O = new Object3D(), C = new Color();

function slope(x, z) {
  const e = 0.2;
  const dx = (H(x + e, z) - H(x - e, z)) / (2 * e), dz = (H(x, z + e) - H(x, z - e)) / (2 * e);
  return [-dx, 1, -dz];
}

function park(mesh, i) {
  O.position.set(0, -50, 0);
  O.rotation.set(0, 0, 0);
  O.scale.set(0.0001, 0.0001, 0.0001);
  O.updateMatrix();
  mesh.setMatrixAt(i, O.matrix);
}

const clear = (x, z) => {
  const nearJetty = x > JETTY.x0 - 1.6 && x < JETTY.x1 + 1.6 && Math.abs(z) < 0.78 + 1.6;
  const onRing = Math.hypot((x - OC.cx) / (OC.rx + 0.8), (z - OC.cz) / (OC.rz + 0.8)) < 1;
  return !nearJetty && !onRing && Math.hypot(x, z) > 1;
};

function slabAt(k) {
  const low = k < 40;
  for (let tries = 0; tries < 8; tries++) {
    const j = k + tries * 97;
    const x = low ? -3 + 12 * hash(j, 21) : 2 + 9 * hash(j, 26);
    const z = low ? 0.5 + 10.5 * hash(j, 22) : -14 + 13 * hash(j, 27);
    if (clear(x, z)) return { j, x, z };
  }
  return null;
}

function stoneSet() {
  const g = new IcosahedronGeometry(1, 0);
  g.setAttribute("color", WHITE(g.attributes.position.count));
  const mesh = new InstancedMesh(g, wash({ paper: 0.7, edge: 0.3, rim: 0.3, albedo: "return vc;" }), STONE + DRIFT);
  for (let i = 0; i < STONE; i++) {
    const x = -9 + 6 * hash(i, 1), z = -6 + 12 * hash(i, 2), y = H(x, z);
    const r = y > 0.7 || y < WATER_Y + 0.1 ? 0.0001 : 0.03 + 0.06 * hash(i, 3);
    O.position.set(x, y + r * 0.3, z);
    O.rotation.set(hash(i, 4) * 3, hash(i, 5) * 3, 0);
    O.scale.set(r, r * 0.7, r);
    O.updateMatrix();
    mesh.setMatrixAt(i, O.matrix);
    C.set(hash(i, 6) < 0.5 ? "#d1ba99" : "#949ea3").multiplyScalar(0.92 + 0.16 * hash(i, 7));
    mesh.setColorAt(i, C);
  }
  for (let k = 0; k < DRIFT; k++) {
    const s = slabAt(k);
    if (!s) {
      park(mesh, STONE + k);
      continue;
    }
    const { j, x, z } = s, w = 0.5 + 1.1 * hash(j, 23), h = 0.04 + 0.06 * hash(j, 25);
    O.position.set(x, Math.max(WATER_Y + 0.08, H(x, z)) + 0.02, z);
    O.rotation.set(0, hash(j, 24) * 3, 0);
    O.scale.set(w, h * 0.5, w);
    O.updateMatrix();
    mesh.setMatrixAt(STONE + k, O.matrix);
    mesh.setColorAt(STONE + k, SRGB("#f9f4ed"));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function tuftSet() {
  const g = new ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0);
  g.setAttribute("color", WHITE(g.attributes.position.count));
  const mesh = new InstancedMesh(g, wash({ paper: 0.6, edge: 0.25, rim: 0.2, albedo: "return vc;" }), TUFT);
  let n = 0;
  for (let k = 0; n < TUFT && k < 24000; k++) {
    const x = -16 + 12 * hash(k, 31), z = -30 + 40 * hash(k, 32);
    if (x > -4.2) continue;
    const y = H(x, z);
    if (y < 0.6 || y > 6.5) continue;
    const s = slope(x, z);
    if (s[1] / Math.hypot(...s) < 0.62) continue;
    const h = 0.1 + 0.12 * hash(k, 33);
    O.position.set(x, y, z);
    O.rotation.set(0, hash(k, 34) * 6.28, 0);
    O.scale.set(0.05, h, 0.05);
    O.updateMatrix();
    mesh.setMatrixAt(n, O.matrix);
    C.set("#5fbf4a").lerp(new Color("#80c74d"), hash(k, 35));
    mesh.setColorAt(n, C);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

const REED_COLS = ["#d8a64b", "#c4934a", "#e2b865"].map(SRGB);

function reedSet() {
  const g = new ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0);
  g.setAttribute("color", WHITE(g.attributes.position.count));
  const mesh = new InstancedMesh(g, wash({ paper: 0.6, edge: 0.25, rim: 0.2, albedo: "return vc;" }), REED);
  let n = 0;
  for (let k = 0; n < REED && k < 24000; k++) {
    const z = -60 + 66 * hash(k, 42), x = shoreR(z) + 0.1 + 1.4 * hash(k, 41);
    const y = H(x, z);
    if (y < WATER_Y + 0.05) continue;
    const s = slope(x, z);
    if (s[1] / Math.hypot(...s) < 0.5) continue;
    O.position.set(x, y, z);
    O.rotation.set(0, hash(k, 44) * 6.28, 0);
    O.scale.set(0.025, 0.12 + 0.18 * hash(k, 43), 0.025);
    O.updateMatrix();
    mesh.setMatrixAt(n, O.matrix);
    C.copy(REED_COLS[Math.floor(hash(k, 45) * 3) % 3]).multiplyScalar(0.92 + 0.16 * hash(k, 46));
    mesh.setColorAt(n, C);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function fingerSet() {
  const g = new IcosahedronGeometry(1, 1);
  g.setAttribute("color", WHITE(g.attributes.position.count));
  const mesh = new InstancedMesh(g, wash({ paper: 0.6, edge: 0.3, rim: 0.3, albedo: "return vc;" }), FINGER);
  for (let k = 0; k < FINGER; k++) {
    const len = 1.2 + 1.8 * hash(k, 51), x = -6 - 0.6 * k, z = -8 + 3.2 * k;
    const y = Math.max(H(x + len / 2, z), WATER_Y + 0.05);
    O.position.set(x + len / 2, y + 0.01, z);
    O.rotation.set(0, 0, 0);
    O.scale.set(len / 2, 0.025, 0.35);
    O.updateMatrix();
    mesh.setMatrixAt(k, O.matrix);
    mesh.setColorAt(k, SRGB(k % 2 ? "#949ea3" : "#cdbfb5"));
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function buildGround() {
  const group = new Group();
  const parts = [stoneSet(), tuftSet(), reedSet(), fingerSet()];
  group.add(...parts);
  return {
    group,
    dispose() {
      for (const m of parts) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}

export default buildGround;
