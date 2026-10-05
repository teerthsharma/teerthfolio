"use client";

// THE COMPOSER (phase4/CAMERA.md): the one place that guarantees the pup reads
// in every cutscene frame. The law (cutscene/camera.js via CameraRig) and the
// moves author the camera; this runs after every camera write (priority 0.9)
// and, when the authored shot breaks a rule, SOLVES the shot from screen-space
// constraints (Gleicher & Witkin's through-the-lens idea, in closed form):
//   1. measure the pup's BODY (userData.core meshes: the coat of body, head,
//      flippers, tail; never a costume, halo or a move's prop) from its 8 box
//      corners: the screen box and its height share f;
//   2. the rules: f >= the beat's floor (the establishing wide is free, the
//      arc's floor grows 0 -> 28% with it, the hero beats hold 28%), f <= 55%, inside the
//      margin, over the bubbles, not occluded for 0.25 s. Inside them the
//      authored camera is left alone (Cinemachine's dead zone);
//   3. outside, the TORIC solve (Lino & Christie 2015): pup A at a third above
//      the bubbles, the hero B (the speaker's mouth or the landmark) at the
//      other third; the two screen points fix the angle alpha the camera
//      subtends, the pup's wanted size fixes |AC|, the law of sines fixes the
//      angle at A, and the one free angle phi about AB comes from the authored
//      camera (the director keeps the viewpoint). No hero, or no solution: the
//      one-target solve along the authored view (a Position Composer). The
//      orientation is a no-roll aim that puts A exactly on its point;
//   4. occlusion: one ray a frame over five body points. An opaque hit held
//      0.25 s swings phi (and rises) to the next candidate (Haigh-Hutchinson's
//      amortised probes; Burg, Lino & Christie 2020: move on the toric surface,
//      never pull through). Island props still between are faded; inside a
//      pocket nothing is (its figures keep their look: the camera moves instead);
//   5. ease to the solve with a critically damped spring (0.35 s; position and
//      rotation offsets from the authored camera), let go once the authored
//      shot has been good for 1 s. A jump over CUT_M is a cut: the spring resets.
// The authored camera is put back first (priority -3), so a move that lerps or
// aims never sees the composer.
// A card opts out per beat: card.frame = { off: true | [beats], allowSmall: [beats] }.
// ?debug=frame exposes window.__frame (scripts/frame-audit.mjs, scripts/pup-visibility.mjs);
// ?debug=frame&guard=off turns the correction off (for before/after captures).

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, Box3, Euler, Matrix4, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from "three";
import { sceneT } from "../../../lib/world/cutscene/clock";
import { beats, grammarFor } from "../../../lib/world/cutscene/camera";
import { BEAT, anchorFor, cutFor, cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { getUi, live } from "../../../lib/world/store";

// the safe zone frame-audit enforces
export const SAFE = { margin: 0.04, minH: 0.16, maxH: 0.55 };
// the composer's floors: f is the pup's share of the frame height
export const FLOOR = { wide: 0, arc: 0.12, hero: 0.28, aim: 0.32, max: 0.5 };
const MARGIN = 0.06; // NDC: the box keeps this far off the edge
const DEAD = 0.1; // NDC: how far past the margin the authored shot may drift before the solve takes over
const SMOOTH = 0.35;
const SNAP = 0.1; // s: the spring when the authored pup is a speck (under half the floor) or the eye is inside it
const CUT_M = 6;
const FADE = 0.15;
const OCC_HOLD = 0.25; // s an occlusion must last before the camera moves for it
const GOOD_HOLD = 1.0; // s the authored shot must be good before the composer lets go
const SWING = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05]; // rad of phi tried in turn
const RISE = [0, 0.3, 0.6]; // rad of rise tried with each
const VANTAGE = 0.9; // rad: the toric two-shot may swing this far round the pup from the authored eye

const box = new Box3();
const part = new Box3();
const C = new Vector3();
const A = new Vector3();
const B = new Vector3();
const D = new Vector3();
const R = new Vector3();
const P = new Vector3();
const Q = new Vector3();
const N = new Vector3();
const W = new Vector3();
const E0 = new Vector3();
const SOL = new Vector3();
const TGT = new Vector3();
const CUR = new Vector3();
const VEL = new Vector3();
const LAST = new Vector3();
const Q0 = new Quaternion();
const QS = new Quaternion();
const QOFF = new Quaternion();
const QCUR = new Quaternion();
const QINV = new Quaternion();
const EUL = new Euler(0, 0, 0, "YXZ");
const M = new Matrix4();
const ray = new Raycaster();
const hits = [];
const corner = new Vector3();
const SCR = new PerspectiveCamera();
const M_OUT = { f: 0, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, hw: 0, hh: 0, depth: 0, ok: false };
const TMP = { ...M_OUT };

const inBeat = (list, beat) => Array.isArray(list) && list.some((b) => (typeof b === "string" ? BEAT[b] : b) === beat);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// the pup's body box: the coat meshes (userData.core) when the variant tags them, else every visible solid mesh
function grow(o, coreOnly) {
  if (!o.visible) return;
  if (o.isMesh && o.geometry && (!coreOnly || o.userData.core)) {
    const m = o.material;
    if (coreOnly || !(m && !Array.isArray(m) && (m.depthWrite === false || (m.transparent && m.opacity < 0.5)))) {
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      part.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(part);
    }
  }
  for (let i = 0; i < o.children.length; i++) grow(o.children[i], coreOnly);
}
let hasCore = null;
function bodyBox(root) {
  root.updateWorldMatrix(true, true);
  if (!hasCore) {
    hasCore = false;
    root.traverse((o) => (hasCore ||= Boolean(o.userData.core)));
  }
  box.makeEmpty();
  grow(root, hasCore);
  return !box.isEmpty();
}

// the body box's screen rect from its 8 corners (cx..hh in NDC; x0..y1 in 0..1 with 0 = top); f = height share
function measure(camera, out) {
  if (box.isEmpty()) return (out.ok = false);
  box.getCenter(C);
  P.copy(C).applyMatrix4(camera.matrixWorldInverse);
  out.depth = -P.z;
  if (out.depth < 0.3) return (out.ok = false);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const v = corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    x0 = Math.min(x0, v.x);
    x1 = Math.max(x1, v.x);
    y0 = Math.min(y0, v.y);
    y1 = Math.max(y1, v.y);
  }
  out.cx = (x0 + x1) / 2;
  out.cy = (y0 + y1) / 2;
  out.hw = (x1 - x0) / 2;
  out.hh = (y1 - y0) / 2;
  out.f = out.hh;
  out.x0 = (x0 + 1) / 2;
  out.x1 = (x1 + 1) / 2;
  out.y0 = (1 - y1) / 2;
  out.y1 = (1 - y0) / 2;
  return (out.ok = true);
}

// a no-roll orientation at eye `e` that puts world point `a` on NDC (sx, sy): the pitch from the ray's elevation, then the yaw
function aim(e, a, sx, sy, cam, q) {
  const rx = sx / cam.projectionMatrix.elements[0];
  const ry = sy / cam.projectionMatrix.elements[5];
  const rz = -1;
  D.copy(a).sub(e).normalize();
  const r0 = Math.hypot(ry, rz);
  const delta = Math.atan2(rz, ry);
  const c = Math.acos(clamp(D.y / r0, -1, 1));
  let p = c - delta;
  if (Math.abs(p) > Math.PI / 2) p = -c - delta;
  const z1 = ry * Math.sin(p) + rz * Math.cos(p);
  const yaw = Math.atan2(D.x, D.z) - Math.atan2(rx, z1);
  return q.setFromEuler(EUL.set(p, yaw, 0, "YXZ"));
}

// lift an eye about `a` by `rise` rad of elevation
function lift(a, out, rise) {
  if (!rise) return out;
  D.copy(out).sub(a);
  const d = D.length();
  const h = Math.hypot(D.x, D.z) || 1e-6;
  const el = clamp(Math.atan2(D.y, h) + rise, -0.1, 1.25);
  return out.set(a.x + (D.x / h) * Math.cos(el) * d, a.y + Math.sin(el) * d, a.z + (D.z / h) * Math.cos(el) * d);
}

// THE TORIC SOLVE: eye `out` with pup A on (ax, ay) and hero B on (bx, by), the pup `dist` m away; phi from the
// authored eye `e`, swung by `swing`. false when the triangle has no solution or the eye would sink under the pup.
function toric(cam, a, b, ax, ay, bx, by, dist, e, swing, rise, out) {
  P.set(ax / cam.projectionMatrix.elements[0], ay / cam.projectionMatrix.elements[5], -1).normalize();
  Q.set(bx / cam.projectionMatrix.elements[0], by / cam.projectionMatrix.elements[5], -1).normalize();
  const alpha = Math.acos(clamp(P.dot(Q), -1, 1)); // the angle the eye subtends between A and B
  N.copy(b).sub(a);
  const ab = N.length();
  if (ab < 0.5 || alpha < 0.05) return false;
  N.divideScalar(ab);
  const sb = (dist * Math.sin(alpha)) / ab; // law of sines: |AC| / sin(beta) = |AB| / sin(alpha)
  if (sb >= 1) return false;
  const thA = Math.PI - alpha - Math.asin(sb); // the angle at A: the acute beta, the eye beyond the pup
  if (thA <= 0) return false;
  R.set(0, 1, 0).cross(N);
  if (R.lengthSq() < 1e-6) R.set(1, 0, 0);
  R.normalize();
  W.copy(N).cross(R).normalize();
  D.copy(e).sub(a);
  const phi = Math.atan2(D.dot(W), D.dot(R)) + swing;
  out.copy(N).multiplyScalar(Math.cos(thA));
  out.addScaledVector(R, Math.sin(thA) * Math.cos(phi)).addScaledVector(W, Math.sin(thA) * Math.sin(phi));
  out.multiplyScalar(dist).add(a);
  lift(a, out, rise);
  return out.y > a.y - 0.2;
}

// the one-target solve: the pup `dist` m along the authored view direction, swung about the vertical
function single(a, dist, e, swing, rise, out) {
  D.copy(e).sub(a);
  const h = Math.hypot(D.x, D.z) || 1;
  const el = clamp(Math.atan2(D.y, h), 0.02, 1.2);
  const az = Math.atan2(D.x, D.z) + swing;
  out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(a);
  return lift(a, out, rise);
}

// occluder bookkeeping: plain meshes swap to a cached faded clone; instances shrink
const fades = []; // { mesh, orig, clone, a, seen }
const inst = []; // { mesh, id, m (original matrix), a, seen }
const MAT = new Matrix4();

function under(o, root) {
  for (let p = o; p; p = p.parent) if (p === root || p.userData.noFade || !p.visible) return true;
  return false;
}

function fadeHit(h, frame) {
  const o = h.object;
  if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
  if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 40 && !o.isInstancedMesh) return; // terrain: the camera moves instead
  if (h.instanceId !== undefined && o.isInstancedMesh) {
    let e = inst.find((x) => x.mesh === o && x.id === h.instanceId);
    if (!e) {
      e = { mesh: o, id: h.instanceId, m: new Matrix4(), a: 1, seen: frame };
      o.getMatrixAt(h.instanceId, e.m);
      inst.push(e);
    }
    e.seen = frame;
    return;
  }
  let e = fades.find((x) => x.mesh === o);
  if (!e) {
    const orig = o.material;
    if (Array.isArray(orig) || orig.isShaderMaterial) return; // cannot fade safely
    const clone = orig.clone();
    clone.transparent = true;
    clone.depthWrite = false;
    e = { mesh: o, orig, clone, a: 1, seen: frame };
    fades.push(e);
    o.material = clone;
  }
  e.seen = frame;
}

function stepFades(dt, frame, all) {
  const k = 1 - Math.exp(-dt / 0.08);
  for (let i = fades.length - 1; i >= 0; i--) {
    const e = fades[i];
    const want = !all && frame - e.seen < 14 ? FADE : 1;
    e.a += (want - e.a) * k;
    e.clone.opacity = e.a;
    if (want === 1 && e.a > 0.98) {
      e.mesh.material = e.orig;
      e.clone.dispose();
      fades.splice(i, 1);
    }
  }
  for (let i = inst.length - 1; i >= 0; i--) {
    const e = inst[i];
    const want = !all && frame - e.seen < 14 ? 0 : 1;
    e.a += (want - e.a) * k;
    if (want === 1 && e.a > 0.98) e.mesh.setMatrixAt(e.id, e.m);
    else {
      MAT.copy(e.m);
      const a = Math.max(0.001, e.a);
      for (const j of [0, 1, 2, 4, 5, 6, 8, 9, 10]) MAT.elements[j] *= a;
      e.mesh.setMatrixAt(e.id, MAT);
    }
    e.mesh.instanceMatrix.needsUpdate = true;
    if (want === 1 && e.a > 0.98) inst.splice(i, 1);
  }
}

function smoothDamp(cur, vel, tgt, dt, time) {
  const w = 2 / time;
  const x = w * dt;
  const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (const a of ["x", "y", "z"]) {
    const ch = cur[a] - tgt[a];
    const t = (vel[a] + w * ch) * dt;
    vel[a] = (vel[a] - w * t) * ex;
    cur[a] = tgt[a] + (ch + t) * ex;
  }
}

// one ray from the eye to world point `p`: the first opaque hit that is not the pup, or null. A merged pocket set
// (a tower in a 200 m mesh) counts like anything else; only domes (BackSide) never do.
export function blocker(scene, eye, p, root) {
  D.copy(p).sub(eye);
  const dist = D.length();
  ray.set(eye, D.normalize());
  ray.near = 0.2;
  ray.far = Math.max(0.3, dist - 0.35);
  hits.length = 0;
  ray.intersectObject(scene, true, hits);
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const o = h.object;
    if (!o.isMesh || under(o, root)) continue;
    const mat = o.material;
    if (mat && !Array.isArray(mat) && (mat.depthWrite === false || (mat.transparent && mat.opacity < 0.6) || mat.visible === false)) continue;
    if (mat?.side === BackSide) continue; // a dome or a sky: it holds the eye and the pup, it hides neither
    return h;
  }
  return null;
}

// the body's ray targets as fractions of its box: centre, head, low centre, both flanks
const PROBE = [[0, 0.1], [0, 0.35], [0, -0.2], [-0.3, 0], [0.3, 0]];
function probe(k, cam, out) {
  box.getCenter(out);
  R.setFromMatrixColumn(cam.matrixWorld, 0);
  out.y += PROBE[k][1] * (box.max.y - box.min.y);
  return out.addScaledVector(R, PROBE[k][0] * Math.max(box.max.x - box.min.x, box.max.z - box.min.z));
}

export default function FrameGuard() {
  const st = useRef(null);
  st.current ??= { root: null, flipAt: -9, frame: 0, lastId: null, M: { ...M_OUT }, raw: { ...M_OUT }, occ: [0, 0, 0, 0, 0], goodSince: -1, pickedAt: -9, d: 0, on: false, swing: 0, rise: 0, phase: "" };
  const debug = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const dbg = debug?.get("debug") === "frame";
  const off = dbg && debug.get("guard") === "off";

  // first: put the authored camera back, so the moves and the rig see their own camera
  useFrame(({ camera }) => {
    if (CUR.lengthSq() > 0 || Math.abs(QCUR.w) < 1) {
      camera.position.copy(E0);
      camera.quaternion.copy(Q0);
    }
  }, -3);

  useFrame(({ camera, scene, clock }, dt0) => {
    const s = st.current;
    const dt = Math.min(dt0, 0.1);
    const now = clock.elapsedTime;
    const id = live.arrival.id;
    const active = Boolean(id) && cutsceneMode(id) !== null && !off;
    const cut = active ? cutFor(id) : null;
    const opt = cut?.card.frame && typeof cut.card.frame === "object" ? cut.card.frame : null;
    const beat = getUi().beat;
    const guarding = active && opt?.off !== true && !inBeat(opt?.off, beat);
    s.frame++;
    const reset = () => {
      CUR.set(0, 0, 0);
      VEL.set(0, 0, 0);
      QCUR.identity();
      s.on = false;
      s.swing = 0;
      s.rise = 0;
      s.occ.fill(0);
    };
    if (id !== s.lastId) {
      s.lastId = id;
      reset();
      live.frame.flip = 0;
    }
    if (!s.root || !s.root.parent) {
      s.root = scene.getObjectByName("seal");
      hasCore = null;
    }
    E0.copy(camera.position);
    Q0.copy(camera.quaternion);
    const root = s.root;
    if (!root) return;
    camera.updateMatrixWorld(true);
    const have = bodyBox(root);
    const raw = s.raw;
    measure(camera, raw);

    // the beat's floor, from the law's phase on the scene clock
    let floor = FLOOR.hero;
    s.phase = "hero";
    if (cut) {
      const t = sceneT(id, now - live.arrival.start);
      const g = grammarFor(cut.card, cut.place);
      const b = g ? beats(cut.tl, g.pull.at) : null;
      if (b ? t < b.in0 : t < cut.tl.frame) {
        floor = FLOOR.wide;
        s.phase = "wide";
      } else if (b && t < b.in1) {
        const u = clamp((t - b.in0) / (b.in1 - b.in0), 0, 1);
        floor = FLOOR.hero * u * u * (3 - 2 * u); // the arc leaves the establishing wide: its floor grows from 0 to the hero's
        s.phase = "arc";
      }
      if (t >= cut.tl.collapse[1]) {
        floor = FLOOR.wide; // home: the follow takes the pup back
        s.phase = "home";
      }
      if (inBeat(opt?.allowSmall, beat)) floor = Math.min(floor, FLOOR.arc);
    }

    // a cut in the authored camera (a jump over CUT_M in a frame, not the law's fast arc): the spring starts over
    if (s.phase === "hero" && LAST.distanceTo(camera.position) > CUT_M) reset();
    LAST.copy(camera.position);

    // occlusion of the authored (or held) shot: one probe a frame, each with its own hold clock
    if (guarding && have) {
      const k = s.frame % 5;
      const h = blocker(scene, camera.position, probe(k, camera, P), root);
      s.occ[k] = h ? s.occ[k] || now : 0;
      if (h && !live.inStage) fadeHit(h, s.frame);
    }
    // occluded: the centre or the head held blocked, or three of the five
    const held = (i) => (s.occ[i] ? now - s.occ[i] : 0);
    const many = s.occ.filter(Boolean).length >= 3;
    const blockedFor = many ? Math.max(...s.occ.map((_, i) => held(i))) : Math.max(held(0), held(1));

    // the bubbles over the pup's column: the pup lives in the room above them
    let low = -1 + MARGIN;
    if (raw.ok) {
      const tnow = performance.now();
      const r = live.frame.r;
      for (let i = 0; i < 4; i++) {
        if (tnow - live.frame.at[i] > 250) continue;
        const bx0 = (r[i * 4] / innerWidth) * 2 - 1;
        const bx1 = (r[i * 4 + 2] / innerWidth) * 2 - 1;
        if (raw.cx + raw.hw * 1.15 < bx0 || raw.cx - raw.hw * 1.15 > bx1) continue;
        low = Math.max(low, 1 - (r[i * 4 + 1] / innerHeight) * 2 + 0.03);
      }
    }

    // the dead zone: is the authored shot good?
    const sized = raw.ok && raw.f >= floor && raw.f <= SAFE.maxH;
    const framed = raw.ok && raw.cx - raw.hw > -1 + MARGIN - DEAD && raw.cx + raw.hw < 1 - MARGIN + DEAD && raw.cy + raw.hh < 1 - MARGIN + DEAD && raw.cy - raw.hh > low - DEAD;
    const clear = blockedFor < OCC_HOLD;
    const good = !have || (sized && framed && clear);
    if (!guarding || s.phase === "wide" || s.phase === "home") s.on = false;
    else if (!good) {
      s.on = true;
      s.goodSince = -1;
    } else if (s.on) {
      if (s.goodSince < 0) s.goodSince = now;
      if (now - s.goodSince > GOOD_HOLD) s.on = false;
    }

    TGT.set(0, 0, 0);
    QOFF.identity();
    if (s.on && have) {
      box.getCenter(A);
      const sy = box.max.y - box.min.y;
      const room = (1 - MARGIN - low) / 2;
      const f = clamp(Math.min(Math.max(FLOOR.aim, floor + 0.04), Math.max(room, floor)), 0.06, FLOOR.max);
      if (room < floor && now - s.flipAt > 1.5) {
        live.frame.flip ^= 1; // no room over the bubbles: they take the other lower side
        s.flipAt = now;
      }
      const dist = (sy * camera.projectionMatrix.elements[5]) / (2 * f);
      // the hero: the speaker's mouth, or the landmark
      let heroOk = false;
      if (cut) {
        anchorFor(cut.card.speaker === "land" ? "land" : "sil", cut.card, cut.place, live.seal.x, live.seal.z, B);
        heroOk = Number.isFinite(B.x + B.y + B.z);
      }
      P.copy(B).applyMatrix4(camera.matrixWorldInverse);
      const heroRight = heroOk ? P.x >= 0 : raw.cx < 0;
      // the composition: the pup at the third away from the hero, above the bubbles; the hero at the other third
      const ax = heroRight ? -0.3 : 0.3;
      const ay = clamp(0.1, low + f + 0.02, 1 - MARGIN - f);
      // the solve at distance d for a candidate (swing, rise): the toric two-shot when it keeps the authored vantage
      // (within VANTAGE of the director's side of the pup), else the one-target composer
      const solve = (swing, rise, d) => {
        let ok = heroOk && toric(camera, A, B, ax, ay, -ax * 1.3, 0.35, d, E0, swing, rise, SOL);
        if (ok) {
          D.copy(SOL).sub(A).setY(0).normalize();
          W.copy(E0).sub(A).setY(0).normalize();
          ok = D.dot(W) > Math.cos(VANTAGE + Math.abs(swing));
        }
        if (!ok) single(A, d, E0, swing, rise, SOL);
        aim(SOL, A, ax, ay, camera, QS);
        return ok;
      };
      // the size, measured: the box's projection is not the formula's, so rescale the distance twice
      let d = dist;
      for (let i = 0; i < 2; i++) {
        solve(s.swing, s.rise, d);
        SCR.copy(camera);
        SCR.position.copy(SOL);
        SCR.quaternion.copy(QS);
        SCR.updateMatrixWorld(true);
        if (measure(SCR, TMP) && TMP.f > 0.01) d = clamp((d * TMP.f) / f, 0.8, 80);
      }
      // occluded: test the candidates on the toric surface from their own eyes, keep the first clear one
      if (blockedFor >= OCC_HOLD && now - s.pickedAt > 1) {
        s.pickedAt = now;
        s.occ.fill(0);
        for (let c = 0; c < SWING.length * RISE.length; c++) {
          const sw = SWING[c % SWING.length];
          const ri = RISE[Math.floor(c / SWING.length)];
          solve(sw, ri, d);
          if (!blocker(scene, SOL, probe(0, camera, Q), root) && !blocker(scene, SOL, probe(1, camera, Q), root)) {
            s.swing = sw;
            s.rise = ri;
            break;
          }
        }
      }
      const ok = solve(s.swing, s.rise, d);
      s.d = d;
      TGT.copy(SOL).sub(E0);
      QOFF.copy(QS).multiply(QINV.copy(Q0).invert());
      s.dbg = { f: +f.toFixed(2), floor: +floor.toFixed(2), low: +low.toFixed(2), dist: +d.toFixed(2), toric: ok, swing: s.swing, rise: s.rise, ay: +ay.toFixed(2) };
    }
    if (s.on || CUR.lengthSq() > 1e-8 || Math.abs(QCUR.w) < 0.99999) {
      const time = s.on && raw.ok && (raw.f < 0.5 * floor || raw.f > 1) ? SNAP : SMOOTH;
      smoothDamp(CUR, VEL, TGT, dt, time);
      QCUR.slerp(QOFF, 1 - Math.exp((-dt * 2.5) / time));
      camera.position.copy(E0).add(CUR);
      camera.quaternion.copy(QCUR).multiply(Q0);
      // in transit the eye never passes through the pup: at least 60% of the solved distance from it
      if (s.on && have) {
        box.getCenter(A);
        D.copy(camera.position).sub(A);
        const near = 0.6 * (s.d || 0);
        if (D.length() < near) camera.position.copy(A).addScaledVector(D.normalize(), near);
      }
      camera.updateMatrixWorld(true);
    }
    // an island prop still between the composed eye and the pup: fade it
    if (guarding && have && s.on) {
      const h = blocker(scene, camera.position, probe(s.frame % 2, camera, P), root);
      if (h && !live.inStage) fadeHit(h, s.frame);
    }
    stepFades(dt, s.frame, !guarding);

    if (dbg) {
      const post = s.M;
      measure(camera, post);
      const occ = have ? blocker(scene, camera.position, probe(0, camera, Q), root) : null;
      window.__frame = {
        on: guarding,
        active,
        beat,
        phase: s.phase,
        composing: s.on,
        hidden: !have,
        floor,
        occ: occ ? occ.object.name || occ.object.type : null,
        raw: { ok: raw.ok, f: raw.f, x0: raw.x0, x1: raw.x1, y0: raw.y0, y1: raw.y1 },
        post: { ok: post.ok, f: post.f, x0: post.x0, x1: post.x1, y0: post.y0, y1: post.y1 },
        flip: live.frame.flip,
        allowSmall: inBeat(opt?.allowSmall, beat),
        fading: fades.length + inst.length,
        offset: CUR.length(),
        dbg: s.dbg,
      };
    }
  }, 0.9);

  return null;
}
