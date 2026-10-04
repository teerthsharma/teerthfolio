// THE PUP AS AYANOKOJI: the school's red blazer over a white shirt with a red collar, a messy dark-brown fringe on the
// round head, half-lidded calm eyes, flat brows; all in one cel shade (three tones, warm key from the window, gold rim).
// Everything hangs on the real pup's own bones (g5/fx.jsx sealRig) and goes when the move unmounts.

import { BoxGeometry, Box3, Color, ConeGeometry, DoubleSide, Group, Mesh, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";

const rgb = (h) => new Color().setRGB(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const CEL_V = "varying vec3 vN; varying vec3 vCol; void main(){ vCol = vec3(1.0);\n#ifdef USE_COLOR\n vCol = color.rgb;\n#endif\n vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const CEL_F = /* glsl */ `
  uniform vec3 uBase; varying vec3 vN; varying vec3 vCol;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float d = dot(n, normalize(vec3(-0.75, 0.45, 0.5)));
    float lit = smoothstep(0.1, 0.16, d);
    float mid = smoothstep(-0.5, -0.44, d);
    float band = 0.6 + 0.18 * mid + 0.22 * lit;
    vec3 c = uBase * vCol * band * mix(vec3(0.72, 0.68, 0.95), vec3(1.1, 1.0, 0.86), clamp(lit * 0.85 + mid * 0.15, 0.0, 1.0));
    float fr = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.6);
    c += vec3(1.0, 0.78, 0.42) * fr * 0.4 * (0.3 + 0.7 * smoothstep(-0.2, 0.4, d));
    gl_FragColor = vec4(c, 1.0);
  }`;
const cel = (hex, side = DoubleSide) => new ShaderMaterial({ uniforms: { uBase: { value: rgb(hex).convertSRGBToLinear() } }, side, vertexShader: CEL_V, fragmentShader: CEL_F });

// the blazer on the body: a red shell over the back and flanks, the white shirt in a V, a red collar, pocket flaps and hem
export function blazer(parts) {
  const bodyMesh = parts.rear.children.find((o) => o.isMesh);
  bodyMesh.geometry.computeBoundingBox();
  const bb = new Box3().copy(bodyMesh.geometry.boundingBox).applyMatrix4(bodyMesh.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const crim = cel("#c0232f");
  const dark = cel("#8c1822");
  const pale = cel("#efe9d8");
  const white = cel("#fbf9f2");
  const g = new Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  add(new SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.8).scale((s.x / 2) * 1.12, (s.y / 2) * 1.14, (s.z / 2) * 1.04), crim, c.x, c.y + s.y * 0.02, c.z);
  add(new SphereGeometry(1, 14, 8).scale((s.x / 2) * 0.62, (s.y / 2) * 0.9, (s.z / 2) * 0.3), white, c.x, c.y, c.z + s.z * 0.4);
  for (const sd of [-1, 1]) {
    add(new BoxGeometry(0.05, s.y * 0.95, 0.07).rotateZ(sd * 0.32).rotateX(-0.1), dark, c.x + sd * s.x * 0.2, c.y + s.y * 0.02, c.z + s.z * 0.45);
    add(new BoxGeometry(0.2, 0.09, 0.1), dark, c.x + sd * (s.x / 2) * 1.04, c.y - s.y * 0.05, c.z + s.z * 0.18);
    add(new BoxGeometry(0.2, 0.025, 0.11), pale, c.x + sd * (s.x / 2) * 1.04, c.y - s.y * 0.05 - 0.05, c.z + s.z * 0.18);
  }
  add(new TorusGeometry(1, 0.025, 6, 28).scale((s.x / 2) * 0.98, (s.z / 2) * 0.95, 1).rotateX(Math.PI / 2), pale, c.x, bb.min.y + s.y * 0.2, c.z);
  add(new TorusGeometry(0.2, 0.06, 6, 16).rotateX(Math.PI / 2 - 0.5), white, c.x, c.y + s.y * 0.42, c.z + s.z * 0.46); // the shirt collar
  add(new TorusGeometry(0.22, 0.045, 6, 16).rotateX(Math.PI / 2 - 0.5), crim, c.x, c.y + s.y * 0.4, c.z + s.z * 0.47); // the red collar over it
  g.visible = false;
  const mats = [crim, dark, pale, white];
  return {
    g,
    dispose() {
      g.removeFromParent();
      g.traverse((o) => o.isMesh && o.geometry.dispose());
      for (const x of mats) x.dispose();
    },
  };
}

// the head's extras, in the head frame (skull centre at the origin, radii 0.52 / 0.47 / 0.5; `eye` is the right eye's centre)
const SK = [0.52, 0.47, 0.5];
const UPV = new Vector3(0, 1, 0);
export function ayanokojiHead(head, eye) {
  const hairM = [cel("#3a2a22"), cel("#4a3329"), cel("#6b4a38")];
  const lidM = cel("#d6e0ee");
  const lashM = cel("#2a1f22");
  const g = new Group();
  const q = new Quaternion();
  const add = (geo, mat, pos, quat) => {
    const m = new Mesh(geo, mat);
    m.position.copy(pos);
    if (quat) m.quaternion.copy(quat);
    g.add(m);
    return m;
  };
  // the hair cap over the crown, then the fringe: locks falling over the forehead, tufts standing on top
  add(new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, 1.26).scale(0.565, 0.53, 0.56), hairM[0], new Vector3(0, 0.025, -0.035));
  const lock = (th, ph, len, w, mi, up) => {
    const out = new Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
    const p = new Vector3(out.x * 0.57, out.y * 0.535 + 0.025, out.z * 0.565 - 0.035);
    const dir = up ? out.clone().multiplyScalar(0.9).add(new Vector3(0, 0.55, 0)).normalize() : out.clone().multiplyScalar(0.45).add(new Vector3(0, -0.85, 0.15 * Math.cos(ph))).normalize();
    q.setFromUnitVectors(UPV, dir); // the cone's tip (+y) is the lock's end: it leads away from the root along dir
    add(new ConeGeometry(w, len, 5), hairM[mi], p.clone().addScaledVector(dir, len * 0.28).addScaledVector(out, -0.04), q.clone());
  };
  [[1.08, -0.95, 0.3, 0.085, 0], [1.1, -0.65, 0.34, 0.09, 1], [1.12, -0.35, 0.28, 0.08, 0], [1.12, -0.08, 0.36, 0.095, 1], [1.12, 0.2, 0.3, 0.085, 0], [1.1, 0.5, 0.34, 0.09, 2], [1.08, 0.78, 0.27, 0.08, 0], [1.02, 1.05, 0.24, 0.075, 1], [1.0, -1.2, 0.22, 0.07, 0]].forEach(([th, ph, len, w, mi]) => lock(th, ph, len, w, mi, false));
  [[0.45, -0.6, 0.2, 0.08, 1], [0.35, 0.3, 0.24, 0.085, 0], [0.5, 1.4, 0.18, 0.07, 2], [0.5, 3.4, 0.22, 0.08, 0]].forEach(([th, ph, len, w, mi]) => lock(th, ph, len, w, mi, true));
  // the eyes: a half-lid over each (a dome with its lash line), a flat brow above
  const n0 = new Vector3(eye.x / (SK[0] * SK[0]), eye.y / (SK[1] * SK[1]), eye.z / (SK[2] * SK[2])).normalize();
  for (const sd of [1, -1]) {
    const E = new Vector3(eye.x * sd, eye.y, eye.z);
    const n = new Vector3(n0.x * sd, n0.y, n0.z);
    q.setFromUnitVectors(new Vector3(0, 0, 1), n);
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const dome = new SphereGeometry(0.147, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 0.55);
    add(dome, lidM, E.clone().addScaledVector(up, -0.015), q.clone());
    add(new TorusGeometry(0.146, 0.011, 6, 22).rotateX(Math.PI / 2).scale(1, 1, 0.55), lashM, E.clone().addScaledVector(up, -0.015), q.clone());
    const B = E.clone().addScaledVector(up, 0.2);
    B.multiplyScalar(1 / Math.sqrt((B.x / SK[0]) ** 2 + (B.y / SK[1]) ** 2 + (B.z / SK[2]) ** 2)).addScaledVector(n, 0.012);
    const bq = q.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -sd * 0.09));
    add(new BoxGeometry(0.2, 0.026, 0.03), hairM[0], B, bq);
  }
  g.visible = false;
  head.add(g);
  return {
    g,
    dispose() {
      g.removeFromParent();
      g.traverse((o) => o.isMesh && o.geometry.dispose());
      for (const m of [...hairM, lidM, lashM]) m.dispose();
    },
  };
}

// the pup's own coat in the same cel shade (its materials swapped for a twin), warm key, gold rim
export function pupCel(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = new ShaderMaterial({
        uniforms: { uBase: { value: new Color().copy(m.color ?? new Color(1, 1, 1)) } },
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        vertexShader: CEL_V,
        fragmentShader: CEL_F,
      });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}
