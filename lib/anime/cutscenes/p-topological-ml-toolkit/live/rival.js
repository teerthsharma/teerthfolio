// THE RIVAL: a faceless ink silhouette (a Level-5 figure in a short jacket, flared skirt and long hair) with one raygun.
// Two meshes: the body, and the arm with the gun (it swings up from the hip to fire).

import { BackSide, BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, Mesh, Quaternion, SphereGeometry, Vector3 } from "three";
import { INK, celMaterial, flat, merge, part } from "./shade.js";

export const RIVAL_AT = [3.3, 0, -5.2];
export const RIVAL_YAW = Math.atan2(0 - RIVAL_AT[0], 0 - RIVAL_AT[2]);
const SHOULDER = [0.2, 1.52, 0];
const GUN_MUZZLE = [0.3, 1.54, 1.55];

export const MUZZLE = (() => {
  const c = Math.cos(RIVAL_YAW);
  const s = Math.sin(RIVAL_YAW);
  return [RIVAL_AT[0] + GUN_MUZZLE[0] * c + GUN_MUZZLE[2] * s, GUN_MUZZLE[1], RIVAL_AT[2] - GUN_MUZZLE[0] * s + GUN_MUZZLE[2] * c];
})();

const UPV = new Vector3(0, 1, 0);
const Q = new Quaternion();
function limb(a, b, r1, r2, color, seg = 7) {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  g.applyQuaternion(Q.setFromUnitVectors(UPV, B.clone().sub(A).normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return part(g, color, 0);
}

const INKC = "#1a2340";
const INKL = "#26335a";

function bodyGeometry() {
  const L = [];
  for (const s of [-1, 1]) L.push(limb([s * 0.11, 0.0, 0], [s * 0.12, 0.85, 0], 0.075, 0.1, INKC));
  L.push(part(new CylinderGeometry(0.2, 0.42, 0.52, 10).translate(0, 0.95, 0), INKL, 0));
  L.push(part(new CylinderGeometry(0.17, 0.21, 0.55, 8).translate(0, 1.4, 0), INKC, 0));
  L.push(part(new CylinderGeometry(0.2, 0.2, 0.06, 10).translate(0, 1.18, 0), "#4d6fc9", 0));
  L.push(limb([-0.2, 1.52, 0], [-0.3, 1.0, 0.08], 0.06, 0.05, INKC));
  L.push(part(new SphereGeometry(0.17, 12, 9).translate(0, 1.84, 0), INKC, 0));
  L.push(part(new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).rotateX(-0.4).translate(0, 1.86, -0.03), INKL, 0));
  L.push(part(new BoxGeometry(0.4, 0.95, 0.07).translate(0, 1.36, -0.2), INKL, 0));
  L.push(part(new ConeGeometry(0.22, 0.4, 8).rotateX(Math.PI).translate(0, 0.78, -0.22), INKL, 0));
  for (const s of [-1, 1]) L.push(part(new BoxGeometry(0.06, 0.7, 0.07).translate(s * 0.19, 1.62, -0.05), INKL, 0));
  return merge(L);
}

function armGeometry() {
  const L = [limb(SHOULDER, [0.32, 1.46, 0.36], 0.06, 0.05, INKC), limb([0.32, 1.46, 0.36], [0.3, 1.5, 0.75], 0.05, 0.045, INKC), part(new SphereGeometry(0.06, 8, 6).translate(0.3, 1.5, 0.78), INKC, 0)];
  L.push(part(new BoxGeometry(0.14, 0.2, 0.5).translate(0.3, 1.53, 0.95), "#f1f5fa", 0));
  L.push(part(new BoxGeometry(0.146, 0.05, 0.5).translate(0.3, 1.58, 0.95), "#3b74d9", 0));
  L.push(part(new BoxGeometry(0.1, 0.22, 0.12).translate(0.3, 1.36, 0.82), "#a9bad0", 4));
  L.push(part(new CylinderGeometry(0.05, 0.06, 0.5, 8).rotateX(Math.PI / 2).translate(0.3, 1.54, 1.3), "#8fa3bd", 4));
  L.push(part(new CylinderGeometry(0.085, 0.085, 0.07, 10).rotateX(Math.PI / 2).translate(0.3, 1.54, 1.52), "#7fe0ff", 3));
  L.push(part(new BoxGeometry(0.03, 0.12, 0.34).translate(0.3, 1.68, 1.0), "#3b74d9", 0));
  return merge(L);
}

export function rival(U) {
  const mat = celMaterial(U, { side: DoubleSide });
  const body = new Mesh(bodyGeometry(), mat);
  const arm = new Mesh(armGeometry(), mat);
  arm.position.set(...SHOULDER);
  arm.geometry.translate(-SHOULDER[0], -SHOULDER[1], -SHOULDER[2]);
  const ballG = new IcosahedronGeometry(0.2, 1);
  const ball = new Mesh(ballG, flat("#f6fcff"));
  const hull = new Mesh(ballG, flat(INK, { side: BackSide }));
  hull.scale.setScalar(1.28);
  ball.position.set(GUN_MUZZLE[0] - SHOULDER[0], GUN_MUZZLE[1] - SHOULDER[1], GUN_MUZZLE[2] + 0.08 - SHOULDER[2]);
  hull.position.copy(ball.position);
  arm.add(ball, hull);
  for (const m of [body, arm, ball, hull]) m.frustumCulled = false;
  return {
    body,
    arm,
    ball,
    hull,
    dispose() {
      body.geometry.dispose();
      arm.geometry.dispose();
      ballG.dispose();
      mat.dispose();
      ball.material.dispose();
      hull.material.dispose();
    },
  };
}
