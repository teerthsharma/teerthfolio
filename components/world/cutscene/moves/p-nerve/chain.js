// THE CHAIN (the witness): the pup and L are joined at the wrist by a long handcuff chain, the show's own. It sags
// across the wet deck between them, shaded blue to violet along its length, and writhes as they move, crossing over
// itself ONCE; that one crossing is ringed in amber, the topological witness. The control's chains, the chain's
// reflections in the puddles, writhe and cross themselves too, with no amber ring on them: a crossing alone proves
// nothing. One instanced link mesh along a spline for all of it. Rig frame.

import { Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Quaternion, TorusGeometry, Vector3 } from "three";
import { PUDDLES } from "./roof";
import { prep, sm, tene } from "./look";

const LINKS = 56;
const CTRL = 3;
const CTRL_LINKS = 30;
const D = new Object3D();
const Q = new Quaternion();
const QR = new Quaternion();
const X = new Vector3(1, 0, 0);
const P0 = new Vector3();
const P1 = new Vector3();
const TG = new Vector3();
const A_ = new Vector3();
const B_ = new Vector3();
const E1 = new Vector3();
const E2 = new Vector3();
const CA = [new Vector3(), new Vector3(), new Vector3()];
const CB = [new Vector3(), new Vector3(), new Vector3()];

// the writhing curve in its own plane: u in [-1, 1], x along the chord, y lateral (even), so it is symmetric
// and crosses itself on the chord's midline exactly once, at u0 where x(u0) = 0
const env = (u) => Math.sqrt(Math.max(1 - u * u, 0));
const cx = (u, h, r, w) => h * u - r * env(u) * Math.sin(w * u);
const cy = (u, r, w) => r * env(u) * (1 - Math.cos(w * u));
export function crossing(h, r, w) {
  let u = 0.55;
  for (let i = 0; i < 12; i++) {
    const f = cx(u, h, r, w);
    const d = (cx(u + 1e-3, h, r, w) - f) / 1e-3;
    u -= f / (Math.abs(d) < 0.05 ? 0.05 : d);
    u = Math.min(0.95, Math.max(0.12, u));
  }
  return u;
}

const SAMPLES = 220;
const ARC = new Float32Array(SAMPLES + 1);
const PTS = new Float32Array((SAMPLES + 1) * 3);
// sample the curve once (rig frame) and lay `n` equally spaced links on it
function layLinks(mesh, first, n, A, B, r, w, lat, lift, scale, tint, t) {
  A_.copy(A);
  B_.copy(B);
  E1.set(B.x - A.x, 0, B.z - A.z);
  const chord = E1.length();
  E1.multiplyScalar(1 / chord);
  E2.set(-E1.z, 0, E1.x).multiplyScalar(lat); // bulges toward the camera side (lat sign)
  const h = chord / 2;
  for (let i = 0; i <= SAMPLES; i++) {
    const u = -1 + (2 * i) / SAMPLES;
    const x = cx(u, h, r, w);
    const y = cy(u, r, w);
    const k = 0.035 + (A.y - 0.035) * (1 - sm(-1, -0.6, u)) + (B.y - 0.035) * sm(0.6, 1, u) + lift * sm(0.02, 0.32, u) * (1 - sm(0.55, 0.85, u));
    const o = i * 3;
    PTS[o] = (A.x + B.x) / 2 + E1.x * x + E2.x * y;
    PTS[o + 1] = k;
    PTS[o + 2] = (A.z + B.z) / 2 + E1.z * x + E2.z * y;
    if (i) ARC[i] = ARC[i - 1] + Math.hypot(PTS[o] - PTS[o - 3], PTS[o + 1] - PTS[o - 2], PTS[o + 2] - PTS[o - 1]);
    else ARC[0] = 0;
  }
  const total = ARC[SAMPLES];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = ((i + 0.5) / n) * total;
    while (j < SAMPLES - 1 && ARC[j + 1] < s) j++;
    const f = (s - ARC[j]) / Math.max(1e-6, ARC[j + 1] - ARC[j]);
    P0.set(PTS[j * 3], PTS[j * 3 + 1], PTS[j * 3 + 2]);
    P1.set(PTS[j * 3 + 3], PTS[j * 3 + 4], PTS[j * 3 + 5]);
    TG.copy(P1).sub(P0).normalize();
    P0.lerp(P1, f);
    Q.setFromUnitVectors(X, TG);
    if (i % 2) Q.multiply(QR.setFromAxisAngle(X, Math.PI / 2));
    D.position.copy(P0);
    D.quaternion.copy(Q);
    D.scale.setScalar(scale);
    D.updateMatrix();
    mesh.setMatrixAt(first + i, D.matrix);
    if (tint) tint(first + i, i / (n - 1), t);
  }
}

export function buildChain() {
  const g = new Group();
  const geo = prep(new TorusGeometry(0.036, 0.0115, 5, 10).scale(1.55, 1, 1));
  const mat = tene({ albedo: "#ffffff", wet: 1, emit: 0.22 });
  const total = LINKS + CTRL * CTRL_LINKS;
  const links = new InstancedMesh(geo, mat, total);
  links.frustumCulled = false;
  links.renderOrder = 4;
  links.instanceColor = new InstancedBufferAttribute(new Float32Array(total * 3), 3);
  g.add(links);
  const blue = new Color("#3f86ff");
  const violet = new Color("#9a5cf5");
  const c = new Color();
  const dim = new Color("#5d7894");
  for (let i = 0; i < CTRL * CTRL_LINKS; i++) links.setColorAt(LINKS + i, c.copy(dim).multiplyScalar(0.55 + 0.2 * ((i * 7) % 3)));
  // the amber ring: the topological witness, billboarded to the lens
  const ringG = new TorusGeometry(0.27, 0.024, 6, 28);
  const ringM = new MeshBasicMaterial({ color: "#ffb000", toneMapped: false, fog: false, side: DoubleSide });
  const ring = new Mesh(ringG, ringM);
  ring.frustumCulled = false;
  ring.renderOrder = 6;
  g.add(ring);
  const tint = (i, k) => links.setColorAt(i, c.copy(blue).lerp(violet, k));
  const out = {
    group: g,
    ring,
    // A: the pup's cuff, B: L's wrist (rig frame); cam: the lens
    tick(t, A, B, cam, wiggle) {
      const chord = Math.hypot(B.x - A.x, B.z - A.z);
      const h = chord / 2;
      const w = 2.75 + 0.18 * Math.sin(t * 1.3); // under pi: the curve crosses itself exactly once
      const r = (h + 0.55 + 0.25 * Math.sin(t * 0.9) + 0.08 * wiggle) / w;
      layLinks(links, 0, LINKS, A, B, r, w, -1, 0.09, 1, tint, t);
      links.instanceColor.needsUpdate = true;
      // the crossing, ringed in amber (a little ahead of the chord's middle in height)
      const u0 = crossing(h, r, w);
      const y0 = cy(u0, r, w);
      E1.set(B.x - A.x, 0, B.z - A.z).normalize();
      E2.set(-E1.z, 0, E1.x).multiplyScalar(-1);
      ring.position.set((A.x + B.x) / 2 + E2.x * y0, 0.11, (A.z + B.z) / 2 + E2.z * y0);
      ring.quaternion.copy(cam.quaternion);
      ring.scale.setScalar(1 + 0.05 * Math.sin(t * 3.1));
      // the control's chains: the chain's reflections, flat in the puddles, each its own writhe, each crossing too
      for (let k = 0; k < CTRL; k++) {
        const q = PUDDLES[k];
        CA[k].set(q.x - q.rx * 0.78, 0.03, q.z + q.rz * (0.22 * Math.sin(k + 1)));
        CB[k].set(q.x + q.rx * 0.78, 0.03, q.z + q.rz * (0.22 * Math.cos(k + 2)));
        const ch = Math.hypot(CB[k].x - CA[k].x, CB[k].z - CA[k].z);
        const ww = 2.55 + 0.12 * k + 0.12 * Math.sin(t * 1.1 + k);
        const rr = (ch / 2 + 0.4 + 0.12 * Math.sin(t * (0.8 + 0.2 * k) + k)) / ww;
        layLinks(links, LINKS + k * CTRL_LINKS, CTRL_LINKS, CA[k], CB[k], rr, ww, k % 2 ? 1 : -1, 0, 0.8, null, t);
      }
      links.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      links.dispose();
      ringG.dispose();
      ringM.dispose();
    },
  };
  return out;
}
