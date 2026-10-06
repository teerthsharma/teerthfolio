// THE HERO PUP (the owner's locked design): a chubby pear sitting upright, the
// round head merged into the body with no neck, a three-strand tuft on the
// crown, short rounded fore-flippers hugging forward, rear flippers fanned at
// the base. Warm grey coat, cream belly + muzzle oval (analytic decals, crisp),
// soft pink blush, huge dark-brown eyes with two highlights, a small nose over
// a "w" mouth, fine whiskers at constant pixel width, and a thick warm
// brown-grey outline of constant pixel width (3 px at 1280x800).
// Metres, +y up, faces +z; 0.8 m tall.
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { cone, ell, paint, painted, polygonize } from "./sdf.js";

const COAT = paint("#8e8c91", "#5f6278");
const TOP = paint("#7f7d84", "#555870");
const FLIP = paint("#85838a", "#585b72", { line: 1 });
export const PUP_INK = "#4a3f3c";
const HEAD = { c: [0, 0.6, 0.02], r: [0.255, 0.235, 0.24] };

// a point on the head ellipsoid toward (x, y) on the face, plus its normal
function onHead(x, y, lift = 0) {
  const [cx, cy, cz] = HEAD.c, [rx, ry, rz] = HEAD.r;
  const u = (x - cx) / rx, v = (y - cy) / ry;
  const z = cz + rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));
  const n = new Vector3((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)).normalize();
  return { p: new Vector3(x, y, z).addScaledVector(n, lift), n };
}

export function pupPrims() {
  return [
    ell([0, 0.27, 0], [0.34, 0.29, 0.29], COAT, 0.04),
    ell([0, 0.12, 0.02], [0.37, 0.13, 0.31], COAT, 0.1),
    ell(HEAD.c, HEAD.r, COAT, 0.2),
    ell([0, 0.66, -0.06], [0.22, 0.17, 0.18], TOP, 0.06), // the darker crown and back of the head
    ell([0, 0.42, -0.14], [0.27, 0.24, 0.17], TOP, 0.12),
    ell([0, 0.525, 0.21], [0.1, 0.07, 0.07], COAT, 0.06), // muzzle
    // tuft: three small strands on the crown, curling forward
    cone([0, 0.82, 0.0], [0.0, 0.885, 0.05], 0.022, 0.006, TOP, 0.02),
    cone([0.03, 0.815, 0.0], [0.07, 0.865, 0.03], 0.018, 0.005, TOP, 0.02),
    cone([-0.03, 0.815, 0.0], [-0.07, 0.865, 0.03], 0.018, 0.005, TOP, 0.02),
    // fore-flippers: short, rounded, hugging forward over the belly
    ell([0.22, 0.32, 0.17], [0.065, 0.13, 0.07], FLIP, 0.04, [0.3, -0.5, 0.55]),
    ell([-0.22, 0.32, 0.17], [0.065, 0.13, 0.07], FLIP, 0.04, [0.3, 0.5, -0.55]),
    // rear flippers fanned at the base: two lobes a side
    ell([0.3, 0.025, -0.08], [0.15, 0.025, 0.065], FLIP, 0.03, [0, 0.55, 0]),
    ell([0.27, 0.025, -0.18], [0.13, 0.025, 0.055], FLIP, 0.03, [0, 1.0, 0]),
    ell([-0.3, 0.025, -0.08], [0.15, 0.025, 0.065], FLIP, 0.03, [0, -0.55, 0]),
    ell([-0.27, 0.025, -0.18], [0.13, 0.025, 0.055], FLIP, 0.03, [0, -1.0, 0]),
  ];
}
export const PUP_HEAD = { pos: HEAD.c, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.25 };

// v2, the locked design as drawn: a chubby pear (base wider than the round head,
// no neck), one flat warm grey with almost no shading, a short tail stub ending
// in two fanned rear flippers behind, short rounded fore-flippers hugging the
// belly, three soft tuft strands. The face is painted in the material (uFace).
const COAT2 = paint("#8e8c91", "#6d6b7d");
const FLIP2 = paint("#87858b", "#66657a", { line: 1 });
const HEAD2 = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] };
export function pupPrims2() {
  return [
    ell([0, 0.25, 0], [0.34, 0.265, 0.3], COAT2, 0.04),
    ell([0, 0.1, 0], [0.36, 0.11, 0.31], COAT2, 0.08),
    ell([0, 0.27, 0.07], [0.29, 0.2, 0.27], COAT2, 0.1), // the belly bulging forward
    ell(HEAD2.c, HEAD2.r, COAT2, 0.16),
    ell([0, 0.42, -0.12], [0.27, 0.25, 0.18], COAT2, 0.12), // back
    ell([0, 0.5, 0.215], [0.085, 0.055, 0.06], COAT2, 0.06), // muzzle
    // tuft: three short soft strands curling forward on the crown
    cone([0, 0.775, 0.0], [0.0, 0.835, 0.045], 0.026, 0.011, COAT2, 0.03),
    cone([0.035, 0.77, -0.005], [0.068, 0.818, 0.025], 0.02, 0.009, COAT2, 0.03),
    cone([-0.035, 0.77, -0.005], [-0.068, 0.818, 0.025], 0.02, 0.009, COAT2, 0.03),
    // fore-flippers: short, rounded, hugging forward over the belly
    ell([0.245, 0.3, 0.16], [0.06, 0.12, 0.075], FLIP2, 0.035, [0.35, -0.55, 0.5]),
    ell([-0.245, 0.3, 0.16], [0.06, 0.12, 0.075], FLIP2, 0.035, [0.35, 0.55, -0.5]),
    // tail stub and two fanned rear flippers trailing behind
    ell([0, 0.07, -0.3], [0.15, 0.07, 0.14], COAT2, 0.08),
    ell([0.1, 0.03, -0.45], [0.065, 0.022, 0.12], FLIP2, 0.03, [0, 0.55, 0]),
    ell([-0.1, 0.03, -0.45], [0.065, 0.022, 0.12], FLIP2, 0.03, [0, -0.55, 0]),
  ];
}
export const PUP_HEAD2 = { pos: HEAD2.c, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

// fine lines at constant pixel width: a ribbon expanded in clip space
export function lineMaterial(shared, col = PUP_INK, px = 1.1) {
  return new ShaderMaterial({
    uniforms: { uRes: shared.uRes, uPx: { value: px }, uCol: { value: new Color(col) }, uInk: shared.uInk, uLine: shared.uLine },
    vertexShader: `attribute vec3 aNext; attribute float aSide; uniform vec2 uRes; uniform float uPx;
      void main() { vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vec4 b = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
        vec2 d = normalize((b.xy / b.w - a.xy / a.w) * uRes + 1e-6); vec2 n = vec2(-d.y, d.x);
        a.xy += n * aSide * uPx * (uRes.y / 800.0) / uRes * a.w; gl_Position = a; }`,
    fragmentShader: "uniform vec3 uCol; uniform vec3 uInk; uniform vec4 uLine; void main() { gl_FragColor = vec4(mix(uCol, uInk, uLine.z), 1.0); }",
  });
}
export function lineGeometry(curves) {
  const pos = [], nxt = [], side = [], idx = [];
  for (const pts of curves) {
    const base = pos.length / 3;
    pts.forEach((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      const ahead = i < pts.length - 1 ? q : p.clone().multiplyScalar(2).sub(r);
      for (const s of [1, -1]) { pos.push(p.x, p.y, p.z); nxt.push(ahead.x, ahead.y, ahead.z); side.push(s * (1 - 0.6 * (i / (pts.length - 1)))); }
      if (i < pts.length - 1) { const k = base + 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aNext", new BufferAttribute(new Float32Array(nxt), 3));
  g.setAttribute("aSide", new BufferAttribute(new Float32Array(side), 1));
  g.setIndex(idx);
  return g;
}

export function buildPup(engine, o = {}) {
  if (o.v2) return buildPup2(engine, o);
  const geo = polygonize([...pupPrims(), ...(o.extra ?? [])], o.h ?? 0.011, o.blob);
  const fig = engine.figure(geo, { head: PUP_HEAD, ink: PUP_INK, lineMul: 1.5, constant: true });
  fig.userData.geo = geo;
  const u = fig.userData.mat.uniforms;
  u.uDecA.value.set(0, 0.25, 0.235, 0.27); // belly oval, chin to base
  u.uDecB.value.set(0, 0.515, 0.115, 0.075); // muzzle
  u.uDecCol.value.set("#f4e7cc"); u.uDecShade.value.set("#c4bccb");
  u.uBlush.value.set(0.16, 0.555, 0.05, 0.028); u.uBlushCol.value.set(...new Color("#f3a08c").toArray(), 0.7);
  const face = new Group();
  const flat = (col, sx, sy, at, n, z = 0.01) => {
    const m = engine.prop(painted(new SphereGeometry(1, 28, 12), paint(col, col, { id: 3 })), 1);
    m.scale.set(sx, sy, z);
    m.position.copy(at);
    m.lookAt(at.clone().add(n));
    face.add(m);
    return m;
  };
  for (const s of [1, -1]) {
    const e = onHead(s * 0.105, 0.6, 0.004);
    const eye = flat(o.eyeCol ?? "#3a2a24", 0.058, 0.064, e.p, e.n, 0.02);
    if (o.eyeEmit) eye.material.uniforms.uEmit.value.set(...o.eyeEmit);
    // highlights in the eye's own unit frame: one large upper-left, one small lower-right
    for (const [r, x, y] of [[0.36, -0.3, 0.32], [0.16, 0.36, -0.36]]) {
      const h = engine.prop(painted(new SphereGeometry(1, 16, 8), paint("#ffffff", "#ffffff", { id: 3 })), 1);
      h.scale.set(r, r, 0.3); h.position.set(x, y, 0.9);
      eye.add(h);
    }
  }
  flat(PUP_INK, 0.03, 0.02, new Vector3(0, 0.55, 0.279), new Vector3(0, 0.25, 1), 0.015);
  // the "w" mouth: two small arcs under the nose
  const mouth = new Group();
  for (const s of [1, -1]) {
    const arc = engine.prop(painted(new TorusGeometry(0.022, 0.0042, 6, 12, Math.PI * 0.85), paint(PUP_INK, PUP_INK, { id: 3 })), 1);
    arc.rotation.z = Math.PI + Math.PI * 0.075;
    arc.position.set(s * 0.021, 0.515, 0.0);
    mouth.add(arc);
  }
  mouth.position.z = 0.279;
  mouth.rotation.x = -0.25;
  face.add(mouth);
  // whiskers: three a side from the muzzle, curving outward and down; two brow whiskers
  const curves = [];
  for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const a = onHead(s * 0.085, 0.53 - k * 0.018, 0.06).p;
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(a.clone().add(new Vector3(s * (0.03 + 0.17 * t), 0.012 * (1 - k) * t - 0.03 * t * t * (k * 0.6 + 0.4), 0.02 * t - 0.06 * t * t))); }
      curves.push(pts);
    }
    const b = onHead(s * 0.12, 0.69, 0.004).p;
    curves.push([0, 1, 2, 3, 4].map((i) => b.clone().add(new Vector3(s * 0.012 * i, 0.012 * i - 0.0014 * i * i, -0.004 * i))));
  }
  const wh = new Mesh(lineGeometry(curves), lineMaterial(engine.shared, PUP_INK, 0.9));
  wh.frustumCulled = false;
  face.add(wh);
  fig.add(face);
  fig.userData.eyes = face;
  return fig;
}

// the v2 pup: body from pupPrims2, the face painted analytically (eyes, highlights,
// brow spots, nose, the w mouth, whisker pores) in object space on the front, so
// it stays crisp and conformal at any angle; whiskers stay constant-pixel ribbons.
function buildPup2(engine, o) {
  const geo = polygonize(pupPrims2(), o.h ?? 0.011);
  const fig = engine.figure(geo, { head: PUP_HEAD2, ink: PUP_INK, lineMul: 1.5, constant: true });
  fig.userData.geo = geo;
  const u = fig.userData.mat.uniforms;
  u.uDecA.value.set(0, 0.215, 0.235, 0.255); // belly oval, chin to base
  u.uDecB.value.set(0, 0.497, 0.09, 0.06); // muzzle
  u.uDecCol.value.set("#f4e7cc"); u.uDecShade.value.set("#cdbfb4");
  u.uBlush.value.set(0.178, 0.535, 0.045, 0.024); u.uBlushCol.value.set(...new Color("#f39a86").toArray(), 0.75);
  u.uFace.value.set(1, 0.122, 0.572, 0.047); // on, eye x, eye y, eye radius
  u.uEyeCol.value.set("#2e211d");
  const curves = [];
  for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const a = new Vector3(s * 0.07, 0.505 - k * 0.016, 0.255 - 0.01 * k);
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(a.clone().add(new Vector3(s * (0.03 + 0.2 * t), (0.016 - 0.016 * k) * t - 0.03 * t * t * (k * 0.5 + 0.3), -0.05 * t - 0.05 * t * t))); }
      curves.push(pts);
    }
  }
  const wh = new Mesh(lineGeometry(curves), lineMaterial(engine.shared, PUP_INK, 0.75));
  wh.frustumCulled = false;
  const face = new Group();
  face.add(wh);
  fig.add(face);
  fig.userData.eyes = face;
  return fig;
}

// soft ellipse ground shadow: multiplies the colour, leaves the id alpha alone
export function groundShadow(rx = 0.45, rz = 0.35, tint = "#5d6a88", strength = 0.45) {
  const m = new ShaderMaterial({
    uniforms: { uTint: { value: new Color(tint) }, uK: { value: strength } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uTint; uniform float uK; varying vec2 vUv; void main() { float a = (1.0 - smoothstep(0.3, 1.0, length(vUv))) * uK; gl_FragColor = vec4(mix(vec3(1.0), uTint, a), 1.0); }",
    transparent: true, depthWrite: false,
    // CustomBlending: colour = dst x src, alpha (the set-line id) kept
    blending: 5, blendSrc: 208, blendDst: 200, blendSrcAlpha: 200, blendDstAlpha: 201,
  });
  const g = new Mesh(new PlaneGeometry(rx * 2, rz * 2).rotateX(-Math.PI / 2), m);
  g.renderOrder = 1;
  return g;
}
