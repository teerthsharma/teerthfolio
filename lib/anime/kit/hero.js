// THE HERO: the owner's chubby seal as a data-driven anime character (spec in HERO_DEFAULTS), rigid and
// deterministic. Torso and head are plain figures (their cream belly and muzzle are the material's decals);
// arms, hands and the outfit are ONE skinned figure each: every vertex carries a bone index into a small
// matrix array (a prefix on the anime program), so a dressed hero stays near 15 draws.
// Rig: group (placement) > pose (body channels) > body > head | shoulder > elbow > wrist, R = +x.
// Entrance moves (hero/moves.js) play under the poses through h.move(); the tail flippers, whiskers and catchlights
// are small shader hooks owned here, so the part files stay as they are.
import { BufferAttribute, Color, Euler, Group, Matrix4, Mesh, Quaternion, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { setEyeExpression } from "./anime-eye-decal.js";
import { BONE, DOME, V2, HAND_SHAPES, HEAD_AT, SHOULDER, UPPER, FORE, armJoints, headGeometry, headPrims, limbsGeometry, torsoGeometry } from "./hero/body.js";
import { FACE, MOUTHS, eyeMesh, faceChannels, faceMaterial, headSurface, whiskers } from "./hero/face.js";
import { HERO_EXPRESSIONS, HERO_POSES, channelsAt, secondary } from "./hero/motion.js";
import { HERO_MOVES, MOVE_NAMES, moveChannels } from "./hero/moves.js";
import { propGeometries } from "./hero/props.js";
import { faceMaterial as faceMaterialB } from "./hero2/b/drawn.js";
import { hairGeometry as hairGeometryB, headPrims as headPrimsB } from "./hero2/b/form.js";
import { paint } from "../sdf.js";
import { adaptLook, faceChannelsB, hairLook } from "./hero2/rig/adapt.js";
import { cached as cachedGeo, tierK } from "./hero/body.js";
import { polygonize } from "../sdf.js";
import { dressHero, OUTFITS, ACCESSORIES, HAIR_STYLES } from "./hero/dress.js";

export { HAND_SHAPES, HERO_POSES, HERO_EXPRESSIONS, HERO_MOVES, MOVE_NAMES, MOUTHS, OUTFITS, ACCESSORIES, HAIR_STYLES };

export const HERO_DEFAULTS = {
  fur: { coat: "#8e8c91", shade: "#6d6b7d", belly: "#f4e7cc", bellyShade: "#cdbfb4", nose: "#3a3338", ink: "#4a3f3c", blush: "#f39a86" },
  eyes: { style: "round", iris: "#3a2a24", iris2: null, pupil: null, glow: 0, count: 2, size: 1, lash: "#1d1620" },
  brows: { col: null, thick: 1 },
  mouth: { rest: "w", fangs: false, sharp: 0.6 },
  hair: null, marks: [], acc: [], outfit: [], props: [],
  hands: { kind: "flipper", skin: "#b3a595" },
  scale: 1, blinkEvery: 4.3,
};
const PUPILS = { round: 0, slit: 1, ring: 2, tomoe: 3, none: 4 };

// The seal's fur stays in the grey family in every look (the owner's references): a look sets how light or dark the
// coat is, the scene's grade supplies any tint. fur.free: true lifts the cap for a creature whose hide is not fur.
const greyFamily = (hex, maxS) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(...c), mn = Math.min(...c);
  if (mx <= 0 || (mx - mn) / mx <= maxS) return hex;
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], k = (maxS * L) / (mx - mn - maxS * (mx - L)); // keeps the luma
  return "#" + c.map((v) => Math.round(Math.min(1, Math.max(0, L + (v - L) * k)) * 255).toString(16).padStart(2, "0")).join("");
};

export function heroSpec(s = {}) {
  const d = HERO_DEFAULTS, m = (k) => ({ ...d[k], ...(s[k] ?? {}) });
  const fur = m("fur");
  if (!fur.free) { fur.coat = greyFamily(fur.coat, 0.1); fur.shade = greyFamily(fur.shade, 0.24); if (fur.poreCol) fur.poreCol = greyFamily(fur.poreCol, 0.14); }
  return { ...d, ...s, fur, eyes: m("eyes"), brows: m("brows"), mouth: m("mouth"), hands: V2 ? { ...m("hands"), kind: "human" } : m("hands"), hair: s.hair ?? null, marks: s.marks ?? [], acc: s.acc ?? [], outfit: s.outfit ?? [], props: s.props ?? [] };
}

let SURF = null, SURFB = null;
const headSurf = () => (SURF ??= headSurface(headPrims({ coat: "#888888", shade: "#444444" })));

// the pivots, no meshes (also usable on its own for forward kinematics)
export function heroRig() {
  const pose = new Group(), body = new Group(), head = new Group();
  pose.add(body); body.add(head);
  head.position.fromArray(HEAD_AT); head.rotation.order = "YXZ";
  const arm = (s) => {
    const sh = new Group(), el = new Group(), wr = new Group();
    sh.position.set(SHOULDER[0] * s, SHOULDER[1], SHOULDER[2]); sh.rotation.order = "XZY";
    el.position.set(0, -UPPER, 0); wr.position.set(0, -FORE, 0);
    body.add(sh); sh.add(el); el.add(wr);
    return { sh, el, wr };
  };
  const R = arm(1), L = arm(-1);
  // bone slot -> [pivot, rest joint]; every hand shape of a side rides that side's wrist
  const slots = [[body, [0, 0, 0]], [R.sh, armJoints(1).S], [R.el, armJoints(1).E], [L.sh, armJoints(-1).S], [L.el, armJoints(-1).E]];
  for (const [P, s] of [[R, 1], [L, -1]]) for (let i = 0; i < HAND_SHAPES.length; i++) slots.push([P.wr, armJoints(s).W]);
  return { pose, body, head, R, L, slots };
}

const HAND_S = new Matrix4().makeScale(1.3, 1.45, 1.35), EU = new Euler(), QY = new Quaternion(), UP = new Vector3(0, 1, 0);
export function poseRig(r, ch) {
  r.pose.position.set(ch.x, ch.y, ch.z); r.pose.quaternion.setFromEuler(EU.set(ch.rx, ch.ry, ch.rz));
  if (ch.yaw) r.pose.quaternion.premultiply(QY.setFromAxisAngle(UP, ch.yaw));
  r.pose.scale.set(ch.sxz * (ch.sx ?? 1), ch.sy, ch.sxz * (ch.sz ?? 1));
  r.head.rotation.set(ch.head.rx, ch.head.ry, ch.head.rz);
  for (const [P, A, W, s] of [[r.R, ch.armR, ch.wristR, 1], [r.L, ch.armL, ch.wristL, -1]]) {
    P.sh.rotation.set(-A.sx, s * A.sy, s * (A.sz - (V2 ? 0.42 * Math.min(1, Math.max(0, A.sx / 0.9)) : 0)));
    P.el.rotation.set(-A.elbow, 0, 0);
    P.wr.rotation.set(W.rx, s * W.ry, s * W.rz);
  }
}

const SKIN = /* glsl */ `
  attribute float aBone; uniform mat4 uBones[${BONE.count}];
  vec3 heroP() { return (uBones[int(aBone + 0.5)] * vec4(position, 1.0)).xyz; }
  vec3 heroN() { return mat3(uBones[int(aBone + 0.5)]) * normal; }
  #define position heroP()
  #define normal heroN()
`;
// a wider, stronger rim on the character materials while the `rim` channel is up (the hero shot); the engine's own rim is a hairline
const RIM_FROM = "smoothstep(0.86 - rw, 0.86 + rw, nv)";
function rimmable(mat, uHeroRim) {
  const f = mat.fragmentShader;
  if (!f.includes(RIM_FROM) || !f.includes("rim * 0.6)")) return;
  mat.fragmentShader = "uniform float uHeroRim;" + f.replace(RIM_FROM, "smoothstep(mix(0.86, 0.5, uHeroRim) - rw, mix(0.86, 0.5, uHeroRim) + rw, nv)").replace("rim * 0.6)", "rim * mix(0.6, 1.0, uHeroRim))");
  mat.uniforms.uHeroRim = uHeroRim;
}
function skinned(engine, geo, bones, o) {
  const fig = engine.figure(geo, o);
  for (const m of [fig.userData.mat, fig.userData.hull]) { m.vertexShader = SKIN + m.vertexShader; m.uniforms.uBones = bones; }
  return fig;
}
const constPx = (fig) => { fig.userData.hull.uniforms.uConst.value = 1; return fig; };

// the tail flippers bend about a hinge behind the base: uTail = (lift, wag) radians, weighted by aTail (added once to the shared torso)
const TAIL_AT = "vec3(0.0, 0.06, -0.24)";
const TAIL = /* glsl */ `
  attribute float aTail; uniform vec2 uTail;
  vec3 tailR(vec3 v) { float a = uTail.x * aTail, b = uTail.y * aTail, ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
    v = vec3(v.x, v.y * ca - v.z * sa, v.y * sa + v.z * ca); return vec3(v.x * cb + v.z * sb, v.y, -v.x * sb + v.z * cb); }
  vec3 tailP() { return tailR(position - ${TAIL_AT}) + ${TAIL_AT}; }
  vec3 tailN() { return tailR(normal); }
  #define position tailP()
  #define normal tailN()
`;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function tailed(fig, uTail) {
  const g = fig.userData.mesh.geometry, P = g.attributes.position;
  if (!g.attributes.aTail) {
    const w = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) w[i] = sstep(-0.22, -0.36, P.getZ(i)) * (1 - sstep(0.12, 0.18, P.getY(i)));
    g.setAttribute("aTail", new BufferAttribute(w, 1));
  }
  for (const m of [fig.userData.mat, fig.userData.hull]) { m.vertexShader = TAIL + m.vertexShader; m.uniforms.uTail = uTail; }
}

// whisker lift: each side's ribbons swing about their roots (uWhisk radians, tips up). A no-op if pup.js changes its line shader.
const WHISK = V2 ? "uniform float uWhisk; vec3 whLift(vec3 p) { float s = p.x < 0.0 ? -1.0 : 1.0, c = cos(uWhisk), n = sin(uWhisk); vec2 r = vec2(abs(p.x) - 0.058, p.y + 0.062); return vec3(s * (0.058 + r.x * c - r.y * n), -0.062 + r.x * n + r.y * c, p.z); }\n      void main()" : "uniform float uWhisk; vec3 whLift(vec3 p) { float s = p.x < 0.0 ? -1.0 : 1.0, c = cos(uWhisk), n = sin(uWhisk); vec2 r = vec2(abs(p.x) - 0.07, p.y - 0.106); return vec3(s * (0.07 + r.x * c - r.y * n), 0.106 + r.x * n + r.y * c, p.z); }\n      void main()";
function liftable(mat, uWhisk) {
  const v = mat.vertexShader, w = v.replace("vec4(position, 1.0)", "vec4(whLift(position), 1.0)").replace("vec4(aNext, 1.0)", "vec4(whLift(aNext), 1.0)").replace("void main()", WHISK);
  if (w.split("whLift(").length === 4) { mat.vertexShader = w; mat.uniforms.uWhisk = uWhisk; }
}

// the catchlight card: the eye's own bent quad drawn again with only the highlights, in any colour and above 1 so it alone blooms
const CATCH_FRAG = /* glsl */ `
  varying vec2 vP;
  uniform float uSide; uniform float uOpen; uniform float uLidAmt; uniform vec4 uShape; uniform vec2 uIrisS; uniform vec2 uLook;
  uniform vec4 uCatch; uniform vec4 uCatchCol; uniform vec4 uLid2;
  float disc(vec2 p, vec2 c, float r, float aa) { return 1.0 - smoothstep(-aa, aa, length(p - c) - r); }
  void main() {
    vec2 p = vec2(vP.x * uSide, vP.y); float aa = fwidth(p.y) * 1.2 + 1e-4, k = max(1.0 - min(p.x * p.x, 1.0), 0.0);
    float yU = mix(uOpen * uShape.x * pow(k, 0.6) + uShape.z * p.x * 0.25, 0.0, uLidAmt), yL = -uOpen * uShape.y * pow(k, 0.8) * (1.0 - 0.78 * uLid2.z);
    if (uLid2.x > 0.0) yU = min(yU, 0.85 - uLid2.x + uLid2.y * p.x);
    vec2 c = vec2(uLook.x * uSide, uLook.y) * vec2(0.28, 0.22), rad = vec2(0.52, 0.72) * uIrisS;
    float a = disc(p, c + rad * uCatch.xy, uCatch.z * rad.y, aa);
    if (uCatch.w > 1.5) a = max(a, disc(p, c - rad * uCatch.xy * vec2(1.13, 1.06), 0.42 * uCatch.z * rad.y, aa));
    a *= smoothstep(-aa, aa, yU - 0.03 - p.y) * smoothstep(-aa, aa, p.y - yL) * (1.0 - smoothstep(1.0 - aa, 1.0 + aa, length((p - c) / rad)));
    if (a < 0.01) discard;
    gl_FragColor = vec4(uCatchCol.rgb * uCatchCol.a, a);
  }`;
function catchCard(eye) {
  const u = eye.material.uniforms, m = new ShaderMaterial({
    vertexShader: eye.material.vertexShader, fragmentShader: CATCH_FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { uSide: u.uSide, uOpen: u.uOpen, uLidAmt: u.uLidAmt, uShape: u.uShape, uIrisS: u.uIrisS, uLook: u.uLook, uLid2: u.uLid2, uCatch: { value: new Vector4(-0.3, 0.34, 0.24, 2) }, uCatchCol: { value: new Vector4(1, 1, 1, 1) } },
  });
  const card = new Mesh(eye.geometry, m);
  card.renderOrder = 3; card.visible = false;
  return card;
}

// a cross-dissolve between two built variants: an ordered dither, one variant keeps the pixels the other drops (uDis = amount, role)
const DIS = "uniform vec2 uDis; float heroB2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }\n";
const DIS_MAIN = "\nvoid main() { if (uDis.y > 0.5 && ((heroB2(0.5 * gl_FragCoord.xy) * 0.25 + heroB2(gl_FragCoord.xy) < uDis.x) == (uDis.y < 1.5))) discard; heroMain(); }\n";
function dissolvable(mat, uDis) {
  if (mat.fragmentShader.split(/void\s+main\s*\(\s*\)/).length !== 2) return;
  mat.fragmentShader = DIS + mat.fragmentShader.replace(/void\s+main\s*\(\s*\)/, "void heroMain()") + DIS_MAIN;
  mat.uniforms.uDis = uDis;
}

function buildOne(engine, spec0 = {}, uDis = null) {
  const spec = heroSpec(spec0), f = spec.fur;
  const rig = heroRig(), { pose, body, head } = rig;
  const group = new Group();
  group.name = "hero"; group.add(pose); group.scale.setScalar(spec.scale);
  const mats = [], figs = [], disposables = [];
  const uHeroRim = { value: 0 };
  const fig = (g, o, skin) => { const x = skin ? skinned(engine, g, skin, o) : engine.figure(g, o); constPx(x); rimmable(x.userData.mat, uHeroRim); figs.push(x); mats.push(x.userData.mat); return x; };

  const torso = fig(torsoGeometry(f, engine.tier), { ink: f.ink, lineMul: 1.5 });
  const tu = torso.userData.mat.uniforms;
  tu.uDecA.value.set(0, 0.23, 0.2, 0.2); tu.uDecCol.value.set(f.belly); tu.uDecShade.value.set(f.bellyShade);
  const uTail = { value: new Vector2() }, uWhisk = { value: 0 };
  tailed(torso, uTail);
  body.add(torso);

  const dress = dressHero(spec, engine.tier);
  const B = V2 ? adaptLook(spec) : null, tk = tierK(engine.tier);
  let headFig, hu, face, fm, eyes = [], cards = [], wh, hw = null;
  if (V2) {
    const skull = new Group(); skull.position.fromArray(DOME.c); head.add(skull);
    headFig = fig(cachedGeo(`headB|${f.coat}|${tk}`, () => polygonize(headPrimsB(paint(f.coat, f.shade, { id: 0 })), 0.0045 * tk)), { ink: f.ink, lineMul: 0.75 });
    fm = faceMaterialB(engine.shared, { ...B, hair: { ...B.hair } });
    fm.userData.hot = B.eyes.hot; fm.uniforms.uHair.value.x = spec.hair ? 1 : 0; fm.uniforms.uBrowCol.value.set(spec.brows?.col ?? f.ink);
    headFig.userData.mesh.material.dispose(); headFig.userData.mesh.material = fm; disposables.push(fm);
    const e0 = fm.uniforms.uEye.value, e1 = B.eyes;
    e0[0].set(...e1.main); e0[1].set(...e1.low); fm.uniforms.uEyeT.value[0].set(e1.tilt[0], 1); fm.uniforms.uEyeT.value[1].set(e1.tilt[1], 0.9);
    skull.add(headFig); face = headFig;
    const surf = (SURFB ??= headSurface(headPrimsB(paint("#888888", "#444444", { id: 0 }))));
    wh = whiskers(engine, surf, f.ink, 0.8, [0.058, -0.06]);
    skull.add(wh);
    const hl = hairLook(spec.hair);
    if (hl) {
      hw = fig(cachedGeo(`hairB|${JSON.stringify(hl)}`, () => { const g = hairGeometryB({ hair: hl }); g.translate(...DOME.c); g.userData.hullGeo.translate(...DOME.c); return g; }), { lineMul: 0.9 });
      hw.userData.hullMesh.geometry = hw.userData.mesh.geometry.userData.hullGeo; head.add(hw);
    }
    if (dress.headwear) { const a = fig(dress.headwear, { lineMul: 0.8 }); (hw ?? head).add(a); hw ??= a; }
  } else {
    headFig = fig(headGeometry(f, engine.tier), { ink: f.ink, lineMul: 0.7, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] } });
    hu = headFig.userData.mat.uniforms;
    hu.uDecB.value.set(...FACE.muzzle); hu.uDecCol.value.set(f.belly); hu.uDecShade.value.set(f.bellyShade);
    if (f.blush) { hu.uBlush.value.set(0.118, 0.138, 0.03, 0.016); hu.uBlushCol.value.set(...new Color(f.blush).toArray(), 0.6); }
    head.add(headFig);
    face = new Mesh(headGeometry(f, engine.tier), faceMaterial(engine.shared, spec));
    face.renderOrder = 1;
    head.add(face);
    disposables.push(face.material);
    const surf = headSurf(), E = spec.eyes, es = E.size ?? 1;
    if (!dress.hideEyes) {
      const at = [[FACE.eye[0], FACE.eye[1], 1, 0]];
      if (E.count === 4) at.push([0.106, 0.142, 0.66, -0.1]);
      for (const [x, y, k, tilt] of at) for (const side of [1, -1]) {
        const e = eyeMesh(surf, { x: side * x, y, w: 0.092 * es * k, h: 0.1 * es * k, tilt: side * tilt, side, style: E.style, iris: E.iris, irisLo: E.iris2 ?? undefined, lash: E.lash, sclera: E.sclera });
        if (E.pupil && PUPILS[E.pupil] !== undefined) e.material.uniforms.uPupilKind.value = PUPILS[E.pupil];
        head.add(e); eyes.push(e); disposables.push(e.geometry, e.material);
      }
    }
    cards = eyes.map(catchCard);
    for (const c of cards) { head.add(c); disposables.push(c.material); }
    wh = whiskers(engine, surf, f.ink, 0.8);
    head.add(wh);
  }
  liftable(wh.material, uWhisk); disposables.push(wh.geometry, wh.material);

  const bones = { value: rig.slots.map(() => new Matrix4()) };
  const restInv = rig.slots.map(([, j]) => new Matrix4().makeTranslation(-j[0], -j[1], -j[2]));
  const limbs = fig(limbsGeometry(f, spec.hands, engine.tier), { ink: f.ink, lineMul: 1.2 }, bones);
  pose.add(limbs);
  if (dress.outfit) pose.add(fig(dress.outfit, { ink: dress.outfitInk ?? f.ink, lineMul: 1.3 }, bones));
  if (!V2 && dress.headwear) head.add(hw = fig(dress.headwear, { lineMul: 0.8, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 } }));
  const held = { R: false, L: false };
  for (const o of spec.props) {
    const side = o.hand === "L" ? "L" : "R";
    for (const g of propGeometries(o, side === "R" ? 1 : -1)) rig[side].wr.add(fig(g, { ink: o.ink ?? f.ink, lineMul: 1.1 }));
    held[side] = true;
  }

  // hidden hand shapes collapse to a point far under the ground, past the far plane (a smear or the ink hull would draw them anywhere nearer)
  const hide = new Matrix4().makeScale(1e-4, 1e-4, 1e-4).setPosition(0, -1e5, 0), inv = new Matrix4();
  const shapes = { R: "flat", L: "flat" };
  const refreshBones = () => {
    inv.copy(pose.matrixWorld).invert();
    rig.slots.forEach(([P], i) => {
      const B = bones.value[i].multiplyMatrices(inv, P.matrixWorld);
      if (V2 && i >= BONE.handR) B.multiply(HAND_S);
      B.multiply(restInv[i]);
      if (i >= BONE.handR) { const side = i < BONE.handL ? "R" : "L", k = i - (side === "R" ? BONE.handR : BONE.handL); if (HAND_SHAPES[k] !== shapes[side]) B.copy(hide); }
    });
  };
  for (const x of figs) if (x.userData.mat.uniforms.uBones) for (const m of [x.userData.mesh, x.userData.hullMesh]) { m.frustumCulled = false; m.onBeforeRender = refreshBones; }

  if (uDis) for (const m of [...figs.flatMap((x) => [x.userData.mat, x.userData.hull]), ...(V2 ? [fm] : [face.material]), wh.material, ...eyes.map((e) => e.material)]) dissolvable(m, uDis);

  const poses = {}, exprs = {}, catchCol = new Color();
  let over = {}, drive = {}, mv = null;
  const moveAt = (ts) => (mv && ts >= mv.t - (mv.pre ?? 0) && ts < mv.t + mv.dur ? moveChannels(mv.name, (ts - mv.t) / mv.dur, mv) : null);
  const flipper = !V2 && spec.hands.kind === "flipper";
  const h = {
    group, spec, rig, eyes, face, figs,
    parts: { body, head, armR: rig.R.sh, armL: rig.L.sh, foreR: rig.R.el, foreL: rig.L.el, handR: rig.R.wr, handL: rig.L.wr, pose, torso, limbs },
    head: { pos: [0, HEAD_AT[1] + DOME.c[1], DOME.c[2]], fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] },
    ch: null,
    set(ch) { over = ch === null ? {} : { ...over, ...ch }; return h; },
    pose(name, k = 1) { if (k <= 0) delete poses[name]; else poses[name] = k; return h; },
    express(name, k = 1) { if (k <= 0) delete exprs[name]; else exprs[name] = k; return h; },
    hands(left, right) { over = { ...over, handL: left ?? over.handL, handR: right ?? over.handR }; return h; },
    move(name, o = {}) { mv = name && HERO_MOVES[name] ? { ...o, name, t: o.t ?? 0, dur: o.dur ?? HERO_MOVES[name].dur } : null; return h; },
    drive(ch) { drive = ch ?? {}; return h; },
    clear() { for (const n in poses) delete poses[n]; for (const n in exprs) delete exprs[n]; mv = null; drive = {}; return h; },
    update(ts = 0) {
      const ex = V2 && spec.cool?.expr && !Object.keys(exprs).length ? { [spec.cool.expr]: 0.6 } : exprs, overs = [drive, over], ch = channelsAt(spec, poses, ex, overs, ts, moveAt);
      poseRig(rig, ch);
      uHeroRim.value = ch.rim ?? 0;
      uTail.value.set(ch.tail.rx, ch.tail.ry); uWhisk.value = 0.5 * ch.whisker;
      shapes.R = flipper ? "flipper" : held.R ? "fist" : ch.handR; shapes.L = flipper ? "flipper" : held.L ? "fist" : ch.handL;
      h.sway = secondary(spec, poses, ex, overs, ts, moveAt);
      if (hw) { // hair lag, a pure function of the stepped time; rotated about the scalp centre
        const q = h.sway.hair, c = new Vector3(...DOME.c);
        hw.rotation.set(q[0], q[1], q[2]); hw.position.copy(c).sub(c.clone().applyEuler(hw.rotation));
      }
      if (V2) faceChannelsB(fm, ch, spec);
      else {
        faceChannels(face.material, ch);
        for (const e of eyes) {
          setEyeExpression(e.material, ch.eyes, ch.eyesAmt, { look: ch.look });
          const u = e.material.uniforms, a = ch.eyeAdj;
          u.uOpen.value += a.open; u.uLidAmt.value += a.lid; u.uShape.value.z += a.slant; u.uPupilS.value *= (1 + a.pupil) * (1 - 0.82 * ch.pinpoint);
          u.uIrisS.value.setScalar(e.material.userData.style.irisScale * (1 + 0.16 * u.uLid2.value.x) * (1 - 0.14 * ch.pinpoint));
          u.uOpen.value *= 1 - 0.95 * Math.min(1, ch.blink);
          if (ch.catch) u.uHL.value = 0;
        }
        const ct = ch.catch;
        for (const c of cards) {
          c.visible = !!ct && (ct.k ?? 1) > 0.01;
          if (!c.visible) continue;
          const at = ct.at ?? [-0.3, 0.34], g = (ct.glow ?? 1) * (ct.k ?? 1);
          c.material.uniforms.uCatch.value.set(at[0], at[1], ct.size ?? 0.24, ct.n ?? 2);
          c.material.uniforms.uCatchCol.value.set(...catchCol.set(ct.col ?? "#fbf7ee").toArray(), g);
        }
      }
      for (const m of mats) m.uniforms.uSmear.value.set(...ch.smearDir, ch.smear);
      group.updateMatrixWorld(true);
      refreshBones();
      engine.syncFaces(head);
      (V2 ? fm : face.material).uniforms.uLightL.value.copy(engine.shared.uLightDir.value).transformDirection(inv.copy(head.matrixWorld).invert());
      if (V2) fm.uniforms.uRimK.value = ch.rim ?? 0; else hu.uHeadR.value = DOME.r[0] * head.matrixWorld.getMaxScaleOnAxis();
      h.ch = ch;
      return h;
    },
    // world-space points fx and the overlay read
    anchors() {
      group.updateMatrixWorld(true);
      const w = (o, p) => o.localToWorld(new Vector3(...p));
      return {
        head: w(head, DOME.c), brow: w(head, [0, 0.27, 0.17]), mouth: w(head, [0, FACE.mouth[0], 0.16]), eyeR: w(head, [FACE.eye[0], FACE.eye[1], 0.17]), eyeL: w(head, [-FACE.eye[0], FACE.eye[1], 0.17]),
        chest: w(body, [0, 0.34, 0.2]), base: w(pose, [0, 0, 0]), top: w(head, [0, DOME.c[1] + DOME.r[1], 0]),
        handR: w(rig.R.wr, [0, -0.05, 0]), handL: w(rig.L.wr, [0, -0.05, 0]),
      };
    },
    // an attached piece takes the layer of the part it rides, or it would be baked into the shot's plate
    attach(obj, part = "body") {
      const to = part === "hair" ? hw ?? head : h.parts[part] ?? body; // "hair": rides the hair lag (and the variant blend's group)
      to.add(obj);
      if (obj.userData.layer === undefined) obj.traverse((o) => { o.layers.mask = to.layers.mask; });
      return obj;
    },
    dispose() {
      group.removeFromParent();
      for (const x of figs) { x.userData.mat.dispose(); x.userData.hull.dispose(); }
      for (const d of disposables) d.dispose();
      dress.dispose?.();
    },
  };
  h.use = () => h;
  h.blend = () => h;
  h.update(0);
  return h;
}

// buildHero(engine, spec): one hero; or, when spec.variants = { name: fullSpec } (the named exports of a look file),
// the base and every variant built up front (materials and geometry ready, nothing compiles later) with h.use(name)
// flipping which one shows ("base" returns to the first). The handle forwards to all of them and reads the active one.
export function buildHero(engine, spec0 = {}) {
  const { variants, ...base } = spec0;
  if (!variants || !Object.keys(variants).length) return buildOne(engine, base);
  const dis = {}, one = (n, s) => buildOne(engine, s, dis[n] = { value: new Vector2() });
  const subs = { base: one("base", base) };
  for (const [n, v] of Object.entries(variants)) subs[n] = one(n, { ...v, variants: undefined });
  const group = new Group();
  group.name = "hero-variants";
  let name = "base";
  const all = Object.values(subs);
  for (const x of all) { group.add(x.group); x.group.visible = x === subs.base; }
  const on = () => subs[name];
  const w = { group, subs, get active() { return name; },
    use(n) { if (subs[n]) { name = n; for (const [k, x] of Object.entries(subs)) { x.group.visible = k === n; dis[k].value.set(0, 0); } } return w; },
    blend(a, b, k) {
      if (!subs[a] || !subs[b] || a === b || k <= 0 || k >= 1) return w.use(k >= 1 || !subs[a] ? b : a);
      w.use(k < 0.5 ? a : b); subs[a].group.visible = subs[b].group.visible = true;
      dis[a].value.set(k, 1); dis[b].value.set(k, 2);
      return w;
    } };
  for (const k of ["spec", "rig", "eyes", "face", "figs", "parts", "head", "ch", "sway"]) Object.defineProperty(w, k, { get: () => on()[k] });
  for (const k of ["set", "pose", "express", "hands", "clear", "update", "move", "drive"]) w[k] = (...a) => { for (const x of all) x[k](...a); return w; };
  w.anchors = () => on().anchors();
  w.attach = (obj, part) => on().attach(obj, part);
  w.dispose = () => { group.removeFromParent(); for (const x of all) x.dispose(); };
  return w;
}
