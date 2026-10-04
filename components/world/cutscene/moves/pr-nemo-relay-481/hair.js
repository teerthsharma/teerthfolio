// THE ULTRA INSTINCT CROWN: thirteen thick silver-white spikes over the top and back of the round skull,
// swept up and slightly back (tallest ~0.95 = the head's height), plus forehead tufts and two brow bangs.
// Head frame (as p-caustic's hair): skull centre, +z the nose, +y up, radii ~ (0.52, 0.47, 0.5). Eyes sit below y~0.1.
import { AdditiveBlending, BackSide, BufferAttribute, ConeGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat, srgb } from "./util";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
// [nx, ny, nz (where it roots on the skull), length, base radius, tilt back]; mirrored in x when nx > 0
const CROWN = [
  [0.0, 1.0, 0.05, 1.47, 0.263, 0.35], [0.45, 0.9, -0.05, 1.32, 0.25, 0.3], [0.8, 0.7, 0.1, 1.11, 0.225, 0.2],
  [0.95, 0.35, 0.05, 0.9, 0.188, 0.1], [0.0, 0.45, -0.6, 1.2, 0.25, 0.4], [0.55, 0.55, -0.35, 1.08, 0.225, 0.3],
  [0.0, 1.0, 0.47, 0.9, 0.188, 0.1], [0.4, 0.88, 0.75, 0.63, 0.138, 0.0],
];
const BANGS = [[0.2, 0.62, 0.74, 0.3, 0.09, 0]]; // hang forward-down over the brow, above the eyes
// cel bands base to tip: silver-white (Goku UI hair)
const BANDS = ["#e9eeff", "#f6f9ff", "#ffffff", "#ffffff"].map(srgb);

function spike([nx, ny, nz, len, r, back], sx, bang) {
  const n = new Vector3(nx * sx, ny, nz).normalize();
  const dir = bang
    ? new Vector3(nx * sx * 0.5, -0.45, 1).normalize()
    : n.clone().multiplyScalar(0.55).add(new Vector3(0, 1, -back)).normalize();
  const g = new ConeGeometry(r, len, 6).translate(0, len / 2 - 0.06, 0);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 0.06) / len;
    col.set(BANDS[t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.78 ? 2 : 3], i * 3);
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.applyQuaternion(Q.setFromUnitVectors(UP, dir));
  g.translate(n.x * 0.48, n.y * 0.43, n.z * 0.46);
  return flat(g);
}

export function buildHair() {
  const parts = [];
  for (const s of CROWN) for (const sx of s[0] === 0 ? [1] : [-1, 1]) parts.push(spike(s, sx, false));
  for (const s of BANGS) for (const sx of [-1, 1]) parts.push(spike(s, sx, true));
  const geometry = mergeGeometries(parts);
  const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const outlineMat = new MeshBasicMaterial({ color: "#1a1440", side: BackSide, toneMapped: false, fog: false });
  const outline = new Mesh(geometry, outlineMat);
  outline.scale.setScalar(1.06);
  outline.frustumCulled = false;
  const glowMat = new MeshBasicMaterial({ color: "#a9b8ff", transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  const glow = new Mesh(geometry, glowMat);
  glow.scale.setScalar(1.14);
  glow.frustumCulled = false;
  const group = new Group();
  group.add(outline, mesh, glow);
  group.visible = false;
  return {
    group,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowMat.dispose();
      outlineMat.dispose();
    },
  };
}
