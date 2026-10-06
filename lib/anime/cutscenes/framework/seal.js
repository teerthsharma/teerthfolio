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
import { Group, Vector3 } from "three";
import { buildPup, groundShadow } from "../../pup.js";

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

// o: { at:[x,y,z], yaw, scale, outfit(handle) -> void, shadow:true, tint? }
export function placeSeal(engine, o = {}) {
  const fig = buildPup(engine, { v2: true });
  const u = fig.userData.mat.uniforms;
  u.uEmit.value.set(0, 0, 0); // the seal never glows (bloom reads only values above 1)
  const eye0 = u.uFace.value.w;
  const group = new Group();
  group.name = "hero-seal";
  const body = new Group(); // the pose acts on this; `group` is the scene's placement
  body.add(fig);
  group.add(body);
  let shadow = null;
  if (o.shadow !== false) { shadow = groundShadow(0.5, 0.4, o.shadowTint ?? "#4a4f6e", o.shadowK ?? 0.4); shadow.position.y = 0.004; group.add(shadow); }
  const h = {
    group, fig, body, shadow,
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
      u.uFace.value.w = eye0 * s.eye;
      u.uSmear.value.set(0, 0, -1, s.smear); // object-space smear along -z (the trailing side)
      fig.userData.hull.uniforms.uSmear.value.copy(u.uSmear.value);
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

// layer helper: layer 0 = the plate (static, baked once per shot), layer 1 = characters and fx (redrawn each step).
// A subtree whose root has userData.layer set keeps its own layer.
export function setLayer(root, layer) {
  const L = root.userData?.layer ?? layer;
  root.layers.set(L);
  for (const c of root.children) setLayer(c, L);
  return root;
}
