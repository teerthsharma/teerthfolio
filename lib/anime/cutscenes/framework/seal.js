// THE HERO SEAL (owner law: ONE constant locked kawaii design, never restyled).
// placeSeal() builds the locked pup from lib/anime/pup.js (the v2 design as drawn, matching
// engine-ref/locked-seal.png) and returns a handle every layer can read:
//
//   { group, fig, at, yaw, scale, height, chest(out), pose(name, k), setPose(name, k), update(t, dt, track) }
//
// What this file does NOT do: it never edits the pup's geometry, face, colours or outline. A scene
// may move, turn, scale, squash and stretch the whole body (poses), blink it, and put it on the
// character layer. Costume belongs to the seal's costume layer, never the pup: a scene that needs
// a hat, a cloak or hair adds it as a CHILD group of `seal.group` (the "attach" API), so the locked
// mesh is untouched and the cast agent can swap the costume without touching the pup.
//
// L1/L2 by construction:
//   - uEmit = 0 on the pup, and the shared lit-luma cap uS0.w = 0.92 stays on (material.js): the pup
//     can never exceed luma 0.92, so it can never cross the bloom threshold (bloom reads max(c-1,0)).
//     That is "the seal is excluded from bloom": nothing the pup draws is above 1.
//   - the pup is layer 1 (the character layer), id 1 (hulled, set lines skip it), so a plate is
//     never drawn over it and the set-line pass never darkens it.
//
// Poses are whole-body transforms on top of the base placement (metres, radians, seal-local):
//   idle     slow breathing bob (0.6 Hz, 1.2% squash)
//   sign     tilts toward +x, a flipper-raise read from the lean (the card's opening gesture)
//   fist     a short lunge forward and a 6 degree nod
//   raise    hop up 0.25 m, lean back 12 degrees (both flippers up)
//   crouch   squash to 0.84 y, stretch to 1.08 xz, sink
//   sit      lean back 18 degrees, lowered 0.06 m (the throne pose)
//   point    lean forward 10 degrees and yaw 15 degrees
//   spin     a full yaw turn over k
//   blown    thrown back on the spot: 40 degrees back, lifted, a smear along -z (uSmear)
//   blink    the eye radius closes by k (uFace.w) and reopens: a blink in one number
//   awe      a slow rise on the toes (0.08 m) with the eyes wide: uFace.w x1.12
// A pose is `setPose(name, k)` with k in 0..1 (the eased amount); blends are additive per channel.
// With `scene.seal.hero` (a kit/hero.js spec) the seal is the articulated hero instead: the same handle plus
// hero, parts, set(channels), express(name, k), hands(l, r), named() and rebuild(spec). Its track also takes `expr`,
// `move` (an entrance move from kit/hero/moves.js), `set`, `blink`, `noBlink` and `form`; castHero() places a second hero.
// The syntax is in .oneshot/hero/API.md.
import { Group, Vector3 } from "three";
import { buildPup, groundShadow } from "../../pup.js";
import { cone, ell, paint, polygonize } from "../../sdf.js";
import { buildSkin, SKINS } from "../../kit/seal-skins.js";
import { buildHero, HERO_MOVES } from "../../kit/hero.js";

const D2 = Math.PI / 180;
const POSES = {
  idle: (k, t) => ({ y: 0.006 * Math.sin(t * 3.8), sy: 1 + 0.012 * Math.sin(t * 3.8 + 1.2), sxz: 1 - 0.006 * Math.sin(t * 3.8 + 1.2) }),
  sign: (k) => ({ rz: -6 * D2 * k, rx: -4 * D2 * k, y: 0.01 * k }),
  fist: (k) => ({ z: 0.12 * k, rx: 6 * D2 * k, sy: 1 - 0.03 * k, sxz: 1 + 0.03 * k }),
  raise: (k) => ({ y: 0.25 * Math.sin(Math.PI * Math.min(1, k * 1.0)) + 0.05 * k, rx: -12 * D2 * k, sy: 1 + 0.06 * k, sxz: 1 - 0.03 * k }),
  crouch: (k) => ({ y: -0.02 * k, sy: 1 - 0.16 * k, sxz: 1 + 0.08 * k }),
  sit: (k) => ({ y: -0.06 * k, rx: -18 * D2 * k, sy: 1 - 0.04 * k, sxz: 1 + 0.02 * k }),
  point: (k) => ({ rx: 10 * D2 * k, ry: 15 * D2 * k, z: 0.05 * k }),
  spin: (k) => ({ ry: Math.PI * 2 * k }),
  blown: (k) => ({ y: 0.18 * Math.sin(Math.PI * k) + 0.04 * k, z: -0.5 * k, rx: -40 * D2 * k, smear: 0.35 * Math.sin(Math.PI * k) }),
  blink: (k) => ({ eye: 1 - 0.95 * Math.sin(Math.PI * Math.min(1, k)) }),
  awe: (k) => ({ y: 0.08 * k, eye: 1 + 0.12 * k }),
};
export const POSE_NAMES = Object.keys(POSES);

// o: { at:[x,y,z], yaw, scale, outfit(handle) -> void, shadow:true, tint?, skin? (a registered id in kit/seal-skins.js) }
// A skin replaces the locked pup with that cutscene's drawing; the island and the classic pup never pass one.
export function placeSeal(engine, o = {}) {
  if (o.hero) return placeHero(engine, o);
  const fig = o.skin ? skinFigure(engine, o.skin) : buildPup(engine, { v2: true });
  const group = new Group();
  group.name = "hero-seal";
  const body = new Group(); // the pose acts on this; `group` is the scene's placement
  body.add(fig);
  group.add(body);
  let shadow = null;
  if (o.shadow !== false) { shadow = groundShadow(0.5, 0.4, o.shadowTint ?? "#4a4f6e", o.shadowK ?? 0.4); shadow.position.y = 0.004; group.add(shadow); }
  const h = {
    engine, group, fig, body, shadow, pupFig: o.skin ? null : fig, eye0: adopt(fig),
    at: o.at ? [...o.at] : [0, 0, 0], yaw: o.yaw ?? 0, scale: o.scale ?? 1,
    height: 0.8,
    track: [], pose: {}, // pose: name -> k
    attach(obj, layer = 1) { body.add(obj); setLayer(obj, layer); return obj; }, // costumes ride the body, never the mesh
    chest(out = new Vector3()) { return out.set(h.at[0], h.at[1] + 0.4 * h.scale, h.at[2]); },
    // the screen-space test point list the overlay uses to keep bubbles off the seal: head and base
    anchors() { return [[h.at[0], h.at[1] + 0.05 * h.scale, h.at[2]], [h.at[0], h.at[1] + 0.8 * h.scale, h.at[2]]]; },
    setPose(name, k = 1) { if (k <= 0) delete h.pose[name]; else h.pose[name] = k; },
    // evaluate: base placement + all poses
    apply(t) {
      const s = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sy: 1, sxz: 1, eye: 1, smear: 0 };
      const add = (d) => { for (const k of ["x", "y", "z", "rx", "ry", "rz"]) s[k] += d[k] ?? 0; s.sy *= d.sy ?? 1; s.sxz *= d.sxz ?? 1; s.eye *= d.eye ?? 1; s.smear += d.smear ?? 0; };
      add(POSES.idle(1, t));
      for (const [n, k] of Object.entries(h.pose)) if (POSES[n]) add(POSES[n](k, t));
      group.position.set(h.at[0], h.at[1], h.at[2]);
      group.rotation.set(0, h.yaw, 0);
      group.scale.setScalar(h.scale);
      body.position.set(s.x, s.y, s.z);
      body.rotation.set(s.rx, s.ry, s.rz);
      body.scale.set(s.sxz, s.sy, s.sxz);
      const fu = h.fig.userData.mat.uniforms;
      fu.uFace.value.w = h.eye0 * s.eye;
      fu.uSmear.value.set(0, 0, -1, s.smear); // object-space smear along -z (the trailing side)
      h.fig.userData.hull.uniforms.uSmear.value.copy(fu.uSmear.value);
      engine.syncFaces(group);
    },
    // follow the scene's `seal.track`: [{ t, pose, dur?, k? }]; each entry eases in over dur (default 0.35 s) and holds
    // until the next entry that names the same pose with k 0, or for `hold` seconds (default: until dur * 2)
    update(t, dt, track = h.track) {
      h.pose = {};
      for (const e of track) {
        const dur = e.dur ?? 0.35, hold = e.hold ?? dur * 2;
        if (t < e.t || t > e.t + dur + hold + (e.out ?? 0.3)) continue;
        const a = Math.min(1, (t - e.t) / dur), b = t > e.t + dur + hold ? 1 - (t - e.t - dur - hold) / (e.out ?? 0.3) : 1;
        const k = (a * a * (3 - 2 * a)) * Math.max(0, b) * (e.k ?? 1);
        h.pose[e.pose] = Math.max(h.pose[e.pose] ?? 0, k);
      }
      h.apply(t);
    },
  };
  setLayer(group, 1);
  h.apply(0);
  return h;
}

// swap the seal's figure: a registered skin id, or null for the locked pup. A mesh toggle, so build skins at scene load.
export function applySkin(seal, skinId) {
  const next = skinId ? skinFigure(seal.engine, skinId) : (seal.pupFig ??= buildPup(seal.engine, { v2: true }));
  if (next === seal.fig) return seal;
  seal.body.remove(seal.fig);
  seal.body.add(next);
  setLayer(next, 1);
  seal.eye0 = adopt(next);
  seal.fig = next;
  return seal;
}

// the skin's built mesh: body and wear prims through buildSkin, on the existing animeMaterial program
function skinFigure(engine, id) {
  if (!SKINS[id]) throw new Error(`seal: no skin "${id}" is registered`);
  return buildSkin(engine, SKINS[id], { ell, cone, paint, polygonize });
}

// the seal never glows (bloom reads only values above 1); returns the resting eye radius
function adopt(fig) {
  const u = fig.userData.mat.uniforms;
  u.uEmit.value.set(0, 0, 0);
  return u.uFace.value.w;
}

function envelope(t, e) {
  const dur = e.dur ?? 0.35, hold = e.hold ?? dur * 2;
  if (t < e.t || t > e.t + dur + hold + (e.out ?? 0.3)) return 0;
  const a = Math.min(1, (t - e.t) / dur), b = t > e.t + dur + hold ? 1 - (t - e.t - dur - hold) / (e.out ?? 0.3) : 1;
  return (a * a * (3 - 2 * a)) * Math.max(0, b) * (e.k ?? 1);
}
// the eased weight of each track entry at t, by its `pose` or `expr` name (the same envelope for both)
function trackWeights(t, track, key) {
  const out = {};
  for (const e of track) if (e[key]) { const k = envelope(t, e); if (k > 0) out[e[key]] = Math.max(out[e[key]] ?? 0, k); }
  return out;
}

// `set` entries: numbers, look, head, tail, brow and eyeAdj scale with the envelope, the catchlight fades, the rest switches on
const SCALED = ["head", "tail", "brow", "eyeAdj"];
function mergeSet(frame, set, k) {
  for (const [c, v] of Object.entries(set)) {
    if (typeof v === "number") frame[c] = (frame[c] ?? 0) + v * k;
    else if (c === "look") frame.look = [(frame.look?.[0] ?? 0) + v[0] * k, (frame.look?.[1] ?? 0) + v[1] * k];
    else if (c === "catch") frame.catch = { ...v, k: (v.k ?? 1) * k, glow: 1 + ((v.glow ?? 1) - 1) * k };
    else if (SCALED.includes(c)) frame[c] = { ...frame[c], ...Object.fromEntries(Object.entries(v).map(([a, x]) => [a, x * k])) };
    else if (k >= 0.5 || typeof v === "object") frame[c] = v;
  }
}

// what the hero's track asks for at t beyond poses: the entrance move in play (its `from` turned from world into the frame of the
// final facing), the facing, the pose it turns into, the frame channels and the look variant
function readTrack(h, t, track) {
  const moves = track.filter((e) => e.move && HERO_MOVES[e.move]).sort((a, b) => a.t - b.t), extra = [], frame = {};
  for (const e of track) if (e.move && !HERO_MOVES[e.move] && !e.warned) { e.warned = true; console.warn(`seal track: no move "${e.move}" (${Object.keys(HERO_MOVES).join(", ")})`); }
  let facing = h.yaw, mv = null;
  for (const e of moves) {
    const dur = e.dur ?? HERO_MOVES[e.move].dur, land = e.t + 0.8 * dur;
    const next = Math.min(1e9, ...track.filter((x) => (x.pose || x.move) && x !== e && x.t >= e.t + dur * 0.99).map((x) => x.t)), into = Math.max(0.12, 0.3 * dur);
    for (const key of ["pose", "expr"]) if (e.to?.[key]) extra.push({ t: land, [key]: e.to[key], dur: into, hold: e.to.hold ?? Math.max(0, next - land - into), out: 0.25 });
    if (t < e.t - (e.pre ?? 0)) continue;
    const before = facing, a = facing = e.to?.yaw ?? h.yaw, d = e.from ? [0, 1, 2].map((i) => (e.from[i] - h.at[i]) / h.scale) : null;
    mv = t < e.t + dur ? { ...e, dur, turn: before - facing, from: d ? [d[0] * Math.cos(a) - d[2] * Math.sin(a), d[1], d[0] * Math.sin(a) + d[2] * Math.cos(a)] : undefined } : null;
  }
  for (const e of track) {
    if (e.set) { const k = envelope(t, e); if (k > 0) mergeSet(frame, e.set, k); }
    if (e.blink && t >= e.t && t < e.t + (e.blink === true ? 0.1 : e.blink)) frame.blink = 1;
    if (e.noBlink && t >= e.t && t < e.t + (e.noBlink === true ? e.hold ?? 1e9 : e.noBlink)) frame.noBlink = true;
  }
  const forms = track.filter((e) => e.form !== undefined).sort((a, b) => a.t - b.t);
  let form = forms.length ? ["base", "base", 1] : null;
  for (const e of forms) if (t >= e.t) form = [form[1], e.form, e.dur ? Math.min(1, (t - e.t) / e.dur) : 1];
  return { mv, facing, frame, form, extra };
}

function placeHero(engine, o) {
  const group = new Group();
  group.name = "hero-seal";
  let shadow = null, hero = null;
  if (o.shadow !== false) { shadow = groundShadow(0.46, 0.4, o.shadowTint ?? "#4a4f6e", o.shadowK ?? 0.4); shadow.position.y = 0.004; group.add(shadow); }
  const h = {
    group, shadow, hero: null, fig: null, body: null, parts: null,
    at: o.at ? [...o.at] : [0, 0, 0], yaw: o.yaw ?? 0, scale: o.scale ?? 1,
    height: 0.85, track: o.track ?? [], pose: {}, expr: {}, t: 0, facing: null, mv: null, frame: {},
    rebuild(spec) {
      hero?.dispose();
      hero = buildHero(engine, spec);
      Object.assign(h, { hero, fig: hero.figs[0], body: hero.parts.body, parts: hero.parts });
      group.add(hero.group);
      setLayer(hero.group, 1);
      h.apply(h.t);
      return h;
    },
    attach(obj, layer = 1, part = "body") { hero.attach(obj, part); setLayer(obj, layer); return obj; },
    // the chest follows the body through a move, so the cast-shadow map stays fitted round a hero that slides in from afar
    chest(out = new Vector3()) {
      const c = hero.ch, a = h.facing ?? h.yaw, s = h.scale, ca = Math.cos(a), sa = Math.sin(a);
      return out.set(h.at[0] + (c.x * ca + c.z * sa) * s, h.at[1] + (0.4 + Math.max(0, c.y)) * s, h.at[2] + (c.z * ca - c.x * sa) * s);
    },
    anchors() { return [[h.at[0], h.at[1] + 0.05 * h.scale, h.at[2]], [h.at[0], h.at[1] + 0.85 * h.scale, h.at[2]]]; },
    named() { return hero.anchors(); },
    setPose(name, k = 1) { if (k <= 0) delete h.pose[name]; else h.pose[name] = k; },
    express(name, k = 1) { if (k <= 0) delete h.expr[name]; else h.expr[name] = k; },
    set(ch) { hero.set(ch); return h; },
    hands(l, r) { hero.hands(l, r); return h; },
    apply(t) {
      h.t = t;
      group.position.set(h.at[0], h.at[1], h.at[2]);
      group.rotation.set(0, h.facing ?? h.yaw, 0);
      group.scale.setScalar(h.scale);
      hero.clear();
      for (const [n, k] of Object.entries(h.pose)) hero.pose(n, k);
      for (const [n, k] of Object.entries(h.expr)) hero.express(n, k);
      if (h.mv) hero.move(h.mv.move, h.mv);
      hero.drive(h.frame).update(t);
      if (shadow) {
        const c = hero.ch, k = c.y < -0.05 ? 0 : 1 / (1 + 1.5 * Math.max(0, c.y));
        shadow.visible = k > 0; shadow.position.set(c.x, 0.004, c.z); shadow.scale.setScalar(k);
      }
    },
    // yaw is the scene's facing (the camera rigs on it); a move's to.yaw turns the hero itself, read back as h.facing
    update(t, dt, track = h.track) {
      const r = readTrack(h, t, track), all = r.extra.length ? [...track, ...r.extra] : track;
      Object.assign(h, { mv: r.mv, facing: r.facing, frame: r.frame });
      h.pose = trackWeights(t, all, "pose");
      h.expr = trackWeights(t, all, "expr");
      if (r.form) hero.blend(...r.form);
      h.apply(t);
    },
    dispose() { hero.dispose(); if (shadow) { shadow.geometry.dispose(); shadow.material.dispose(); } group.removeFromParent(); },
  };
  setLayer(group, 1);
  return h.rebuild(o.hero);
}

// A second (third, ...) hero for a cast layer: the same handle as ctx.seal, o: { at, yaw, scale, track, shadow }. Recipe in API.md section 6.
export function castHero(engine, look, o = {}) {
  const h = placeHero(engine, { ...o, hero: look });
  look.extras?.(engine, h.hero);
  setLayer(h.group, 1);
  return h;
}

// layer helper: layer 0 = the plate (static, baked once per shot), layer 1 = characters and fx (redrawn each step).
// A subtree whose root has userData.layer set keeps its own layer.
export function setLayer(root, layer) {
  const L = root.userData?.layer ?? layer;
  root.layers.set(L);
  for (const c of root.children) setLayer(c, L);
  return root;
}
