// THE ENMA-TEN MUDRA (Sukuna's Domain Expansion sign), as two stylised demon hands held up to the lens.
// Palm to palm, one hand mirrored: the middle and ring fingers fold down and interlock in an X at the knuckles,
// the index fingers rise and lean in until their tips touch (the roof), the little fingers arch outside them
// and in until their tips touch (the second, lower roof: the demon face), the thumbs press together and point up.
// Claws on every tip. Ink-shaded like the demon pup (pup.js pupMaterial) with a black hull for the outline.
// Built once; the hand group is 2.4 high (the wrists at -0.9, the index apex at 1.5), 2.0 wide, centred on x.

import { BackSide, CapsuleGeometry, Color, ConeGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pupMaterial } from "./pup";

const UP = new Vector3(0, 1, 0);

// a capsule from a to b, radius r grown by `pad` (the hull)
function limb(a, b, r, pad) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const d = B.clone().sub(A);
  const g = new CapsuleGeometry(r + pad, d.length(), 4, 10);
  g.applyMatrix4(new Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(UP, d.normalize()), new Vector3(1, 1, 1)));
  return g;
}
function claw(tip, dir, len, r) {
  const g = new ConeGeometry(r, len, 6);
  const D = new Vector3(...dir).normalize();
  g.applyMatrix4(new Matrix4().compose(new Vector3(...tip).addScaledVector(D, len * 0.4), new Quaternion().setFromUnitVectors(UP, D), new Vector3(1, 1, 1)));
  return g;
}

// the left hand (x < 0, the inner edge at x = -0.06); the right one is this, mirrored
const PALM = [-0.46, -0.28, 0];
const FINGERS = [
  // [base, knee?, tip, radius], bent in plane, z: depth toward the lens
  { name: "index", pts: [[-0.2, 0.05, 0.1], [-0.15, 0.7, 0.1], [-0.01, 1.5, 0.1]], r: 0.095 },
  { name: "pinky", pts: [[-0.78, 0.0, -0.1], [-0.84, 0.55, -0.1], [-0.4, 1.0, -0.1], [-0.02, 0.92, -0.1]], r: 0.075 },
  { name: "thumb", pts: [[-0.1, -0.35, 0.3], [-0.05, 0.1, 0.3], [-0.04, 0.62, 0.3]], r: 0.1 },
  // folded middle and ring: hooked down across the centre in an X, one hand's pair in front of the other's
  { name: "middle", pts: [[-0.4, 0.05, 0.19], [-0.32, 0.22, 0.2], [0.04, -0.12, 0.22]], r: 0.092 },
  { name: "ring", pts: [[-0.6, 0.05, 0.12], [-0.52, 0.22, 0.13], [0.0, -0.3, 0.14]], r: 0.082 },
];

function handGeometry(pad, mirror) {
  const parts = [];
  const palm = new SphereGeometry(1, 16, 12);
  palm.applyMatrix4(new Matrix4().compose(new Vector3(...PALM), new Quaternion(), new Vector3(0.44 + pad, 0.46 + pad, 0.2 + pad)));
  parts.push(palm);
  const wrist = limb([-0.46, -0.6, 0], [-0.46, -0.95, 0], 0.26, pad);
  parts.push(wrist);
  const claws = [];
  for (const f of FINGERS) {
    const z = mirror ? -0.04 : 0; // the mirrored hand sits a hair behind, so the folded fingers weave
    for (let i = 0; i + 1 < f.pts.length; i++) parts.push(limb(f.pts[i], f.pts[i + 1], f.r * (1 - 0.12 * i), pad));
    const n = f.pts.length;
    const a = f.pts[n - 2];
    const b = f.pts[n - 1];
    claws.push(claw(b, [b[0] - a[0], b[1] - a[1], b[2] - a[2]], 0.2 + pad * 2, f.r * 0.8 + pad));
    void z;
  }
  return { body: mergeGeometries(parts), claws: mergeGeometries(claws) };
}

export function enmaHands(U) {
  const group = new Group();
  group.name = "enma-hands";
  const body = pupMaterial(U, { color: new Color("#efe6d2"), vertexColors: false, transparent: false, opacity: 1 });
  const nail = new MeshBasicMaterial({ color: "#07030a", toneMapped: false });
  const hullM = new MeshBasicMaterial({ color: "#07030a", side: BackSide, toneMapped: false });
  const red = new MeshBasicMaterial({ color: "#d1081f", toneMapped: false });
  const geos = [];
  const hand = (sign) => {
    const h = handGeometry(0, sign < 0);
    const hull = handGeometry(0.035, sign < 0).body;
    geos.push(h.body, h.claws, hull);
    const g = new Group();
    g.add(new Mesh(h.body, body), new Mesh(h.claws, nail), new Mesh(hull, hullM));
    // the demon mark across the back of each hand, a red stroke at the knuckles
    const mark = new Mesh(limb([-0.62, -0.12, 0.2], [-0.3, -0.12, 0.2], 0.03, 0).applyMatrix4(new Matrix4()), red);
    geos.push(mark.geometry);
    g.add(mark);
    g.scale.x = sign;
    if (sign < 0) g.position.z = -0.02;
    return g;
  };
  group.add(hand(1), hand(-1));
  group.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
  });
  group.visible = false;
  return { group, dispose: () => (geos.forEach((g) => g.dispose()), [body, nail, hullM, red].forEach((m) => m.dispose())) };
}
