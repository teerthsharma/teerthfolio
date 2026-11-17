// HERO2/A: the seal as a sculpted anthropomorphic character. buildSeal2(engine, look, { expr }) -> { group, update, dispose, stats }.
// The neutral seal (head.js, body.js, hands.js) is fixed; `look` (look.js) supplies colours, eye colour and count, hair tones, face marks
// and outfit colours. Expressions (grin calm glare shut) are baked into the head field and the eye decals, so only the requested one is built.
import { Color, Group, Mesh, ShaderMaterial } from "three";
import { setEyeExpression } from "../../anime-eye-decal.js";
import { eyeMesh, headSurface } from "../../hero/face.js";
import { lineGeometry, lineMaterial } from "../../../pup.js";
import { Vector3 } from "three";
import { headGeometry, teethGeometry } from "./head.js";
import { bodyGeometry, HEAD_AT, WRIST } from "./body.js";
import { handGeometry } from "./hands.js";
import { capGeometry, locksGeometry } from "./hair.js";
import { strokeMesh, dot } from "./decal.js";
import { EXPR, SUKUNA } from "./look.js";
import { mix as mixHex } from "./sculpt.js";

// the wide hot rim of the rig's hero shot: widens the engine's hairline rim while uHeroRim is up
const RIM_FROM = "smoothstep(0.86 - rw, 0.86 + rw, nv)";
function rimmable(mat, u) {
  const f = mat.fragmentShader;
  if (!f.includes(RIM_FROM) || !f.includes("rim * 0.6)")) return;
  mat.fragmentShader = "uniform float uHeroRim;" + f.replace(RIM_FROM, "smoothstep(mix(0.86, 0.5, uHeroRim) - rw, mix(0.86, 0.5, uHeroRim) + rw, nv)").replace("rim * 0.6)", "rim * mix(0.6, 1.0, uHeroRim))");
  mat.uniforms.uHeroRim = u;
}
// a red haze round an eye: a premultiplied overlay above 1 so only the glow blooms
const halo = (col, k) => new ShaderMaterial({
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, uniforms: { uCol: { value: new Color(col) }, uK: { value: k } },
  vertexShader: "varying vec2 vP; void main() { vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "varying vec2 vP; uniform vec3 uCol; uniform float uK; void main() { float a = pow(max(0.0, 1.0 - length(vP)), 2.0) * uK; gl_FragColor = vec4(uCol * a * 1.7, a * 0.45); }",
});
const POSE = { // the two-hand sign: fingers up, tips meeting, backs of the hands turned toward the lens
  tilt: 0.52, fwd: 0.1, yaw: 1.0, at: 0.085,
};

export function buildSeal2(engine, look = SUKUNA, { expr = "grin" } = {}) {
  const ex = EXPR[expr] ?? EXPR.grin, group = new Group(), disposables = [];
  const fig = (geo, ink, mul = 1) => { const f = engine.figure(geo, { ink, lineMul: mul }); f.userData.hull.uniforms.uConst.value = 1; rimmable(f.userData.mat, uRim); disposables.push(f.userData.mat, f.userData.hull, geo); return f; };
  const ink = look.skin.ink, uRim = { value: 1 };

  const body = new Group(); group.add(body);
  body.add(fig(bodyGeometry(look), look.outfit.shade, 1.4));

  const head = new Group(); head.position.set(...HEAD_AT); body.add(head);
  const { geo, H } = headGeometry(look, { smile: ex.smile, open: ex.open, brow: ex.brow, drop: 0.012 * ex.open });
  head.add(fig(geo, ink, 0.9));
  if (H.h > 0.012) head.add(fig(teethGeometry(H, null, { col: look.mouth.tooth, shade: look.mouth.toothShade }), "#3a2a3a", 0.5));
  const surf = headSurface([{ f: (x, y, z) => H.full(x, y, z), k: 0 }]);

  const eyes = [], E = look.eyes, lo = E.count === 4;
  for (const [x, y, w, h, tilt, k] of [[0.069, 0.06, 0.088, 0.07, 0.12, 1], ...(lo ? [[0.095, 0.02, 0.056, 0.044, -0.1, 0.7]] : [])]) {
    for (const side of [1, -1]) {
      const e = eyeMesh(surf, { x: side * x, y, w, h, tilt: side * tilt, side, style: E.style, iris: E.iris, irisLo: E.iris2, lash: E.lash, sclera: E.sclera, lift: 0.002 });
      setEyeExpression(e.material, ex.eyes, ex.eyesAmt);
      head.add(e); eyes.push(e); disposables.push(e.geometry, e.material);
      if (k === 1 && ex.eyes !== "shut") { const hm = new Mesh(e.geometry, halo(E.iris, ex.glow)); hm.renderOrder = 3; head.add(hm); disposables.push(hm.material); }
    }
  }

  const strokes = [...look.marks];
  for (const s of [1, -1]) for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) strokes.push(dot(s * (0.034 + 0.014 * i + 0.006 * r), -0.04 - 0.011 * r, 0.0012, look.skin.ink));
  const fur = mixHex(look.skin.coat, look.skin.shade, 0.42);
  for (const s of [1, -1]) for (let i = 0; i < 9; i++) strokes.push({ pts: [[s * (0.128 + 0.004 * (i % 2)), 0.06 - i * 0.0125], [s * (0.139 + 0.004 * (i % 2)), 0.052 - i * 0.0125 - 0.006], [s * (0.15 + 0.004 * (i % 2)), 0.04 - i * 0.0125 - 0.016]], w0: 0.006, w1: 0.0006, col: fur, per: 3 });
  if (0) for (let i = 0; i < 7; i++) strokes.push({ pts: [[-0.04 + i * 0.0133, -0.098 - 0.006 * Math.abs(i - 3) / 3], [-0.04 + i * 0.0133 + (i - 3) * 0.002, -0.109 - 0.004 * (i % 2)]], w0: 0.006, w1: 0.0006, col: fur, per: 2 });
  const sm = strokeMesh(surf, strokes); head.add(sm); disposables.push(sm.geometry, sm.material);

  const curves = [];
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
    const a = surf.at(s * 0.078, -0.047 - k * 0.012), pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(a.p.clone().addScaledVector(a.n, 0.002).add(new Vector3(s * (0.01 + 0.2 * t), (0.016 - 0.012 * k) * t - 0.03 * t * t, -0.035 * t - 0.07 * t * t))); }
    curves.push(pts);
  }
  const wh = new Mesh(lineGeometry(curves), lineMaterial(engine.shared, look.skin.ink, 0.8)); wh.frustumCulled = false; head.add(wh);
  disposables.push(wh.geometry, wh.material);

  if (look.hair) {
    head.add(fig(capGeometry(look.hair), look.hair.tones[2], 0.9));
    const { lit, hull } = locksGeometry(look.hair), lf = fig(lit, look.hair.tones[2], 0.9);
    lf.userData.hullMesh.geometry = hull; disposables.push(hull);
    head.add(lf);
  }

  const hands = [];
  for (const s of [1, -1]) {
    const hg = new Group(), hf = fig(handGeometry(look), look.hands.shade, 0.9);
    hg.add(hf); hf.scale.set(s * 1.05, 1.05, 1.05);
    const El = [0.52, 0.13, 0.02], d = [WRIST[0] - El[0], WRIST[1] - El[1], WRIST[2] - El[2]], L = Math.hypot(...d);
    hg.position.set(s * (WRIST[0] + (d[0] / L) * POSE.at), WRIST[1] + (d[1] / L) * POSE.at, WRIST[2] + (d[2] / L) * POSE.at);
    hg.rotation.set(POSE.fwd, -s * POSE.yaw, s * POSE.tilt, "YXZ");
    body.add(hg); hands.push(hg);
  }

  const draws = () => { let n = 0; group.traverse((o) => { if (o.isMesh) n += 1; }); return n; };
  return {
    group, body, head, eyes, hands, surf,
    update(ts = 0) { body.position.y = 0.004 * Math.sin(ts * 3.8); head.rotation.x = 0.012 * Math.sin(ts * 3.8 + 1); group.updateMatrixWorld(true); return this; },
    stats() { let tri = 0; group.traverse((o) => { if (o.isMesh && o.geometry.index) tri += o.geometry.index.count / 3 * (o.material.side === 1 ? 1 : 1); }); return { meshes: draws(), triangles: tri }; },
    dispose() { group.removeFromParent(); for (const d of disposables) d.dispose?.(); },
  };
}
export { SUKUNA, EXPR };
