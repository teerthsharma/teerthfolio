"use client";

// FRAMEGUARD: the one place that guarantees the pup is on screen in every
// cutscene, whatever a move's hand-authored camera does. It runs after every
// camera write (moves and CameraRig run at <= 0.5, the composer at 1) and:
//   1. measures the pup's screen box (its bounding box, hair and costume
//      included) from the camera the move left;
//   2. computes the smallest camera translation that puts the box in the safe
//      zone: dolly along the view ray for size (16-55% of the viewport height),
//      then pan so it clears the 4% margin and the bubbles' rectangles; if a
//      bubble still covers it, the bubbles flip to the other lower side
//      (live.frame.flip, read by ui/Bubbles.jsx place());
//   3. eases the camera to that offset (critically damped, 0.25 s). The offset
//      is recomputed each frame from the move's own camera, which is restored
//      first (priority -3), so a move that lerps or aims never sees the guard;
//   4. fades whatever sits between the camera and the pup (5 rays, one per
//      frame): a plain mesh to 0.15 opacity on a cached clone of its material,
//      a grass or prop instance (InstancedMesh) shrinks away; both restore.
// A camera jump over CUT_M in a frame is a cut: the smoothing resets.
// A card opts out per beat: card.frame = { off: true | [beats], allowSmall: [beats] }
// (beats by BEAT name or number). ?debug=frame exposes window.__frame for
// scripts/frame-audit.mjs; ?debug=frame&guard=off turns the correction off
// (for before/after captures).

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Box3, Matrix4, Raycaster, Vector3 } from "three";
import { BEAT, cutFor, cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { getUi, live } from "../../../lib/world/store";

// the safe zone the audit enforces ...
export const SAFE = { margin: 0.04, minH: 0.16, maxH: 0.55 };
// ... and the tighter band the guard steers to, so it acts before the edge
const G = { m: 0.1, minH: 0.18, maxH: 0.5, bubble: 0.03 };
const SMOOTH = 0.25;
const CUT_M = 6;
const FADE = 0.15;

const box = new Box3();
const C = new Vector3();
const D = new Vector3();
const R = new Vector3();
const U = new Vector3();
const TGT = new Vector3();
const CUR = new Vector3();
const VEL = new Vector3();
const APPLIED = new Vector3();
const LAST = new Vector3();
const P = new Vector3();
const M = new Matrix4();
const ray = new Raycaster();
const hits = [];
const M_OUT = { f: 0, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, hw: 0, hh: 0, depth: 0, ok: false };

const inBeat = (list, beat) => Array.isArray(list) && list.some((b) => (typeof b === "string" ? BEAT[b] : b) === beat);

// the pup's screen box in NDC (cx, cy, half-width hw, half-height hh); f = height / viewport height
function measure(camera, root, out) {
  box.setFromObject(root);
  if (box.isEmpty()) return (out.ok = false);
  box.getCenter(C);
  const sy = box.max.y - box.min.y;
  const half = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  M.copy(camera.matrixWorldInverse);
  P.copy(C).applyMatrix4(M);
  out.depth = -P.z;
  if (out.depth < 0.3) return (out.ok = false);
  const e = camera.projectionMatrix.elements;
  out.cx = (P.x * e[0]) / out.depth;
  out.cy = (P.y * e[5]) / out.depth;
  out.hw = (half * e[0]) / out.depth;
  out.hh = (sy * 0.5 * e[5]) / out.depth;
  out.f = out.hh;
  out.x0 = (out.cx - out.hw + 1) / 2;
  out.x1 = (out.cx + out.hw + 1) / 2;
  out.y0 = (1 - out.cy - out.hh) / 2; // top, 0 = top of the viewport
  out.y1 = (1 - out.cy + out.hh) / 2;
  return (out.ok = true);
}

// occluder bookkeeping: plain meshes swap to a cached faded clone; instances shrink
const fades = []; // { mesh, orig, clone, a, seen }
const inst = []; // { mesh, id, m (original matrix), a, seen }
const MAT = new Matrix4();

function underneath(o, root, stop) {
  for (let p = o; p; p = p.parent) {
    if (p === root || p.name === stop || p.userData.noFade || !p.visible) return true;
  }
  return false;
}

function fadeHit(h, frame) {
  const o = h.object;
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

function smoothDamp(cur, vel, tgt, dt) {
  const w = 2 / SMOOTH;
  const x = w * dt;
  const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (const a of ["x", "y", "z"]) {
    const ch = cur[a] - tgt[a];
    const t = (vel[a] + w * ch) * dt;
    vel[a] = (vel[a] - w * t) * ex;
    cur[a] = tgt[a] + (ch + t) * ex;
  }
}

export default function FrameGuard() {
  const st = useRef({ root: null, flipAt: -9, ray: 0, frame: 0, lastId: null, M: { ...M_OUT }, raw: { ...M_OUT } });
  const debug = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const dbg = debug?.get("debug") === "frame";
  const off = dbg && debug.get("guard") === "off";

  // first: take last frame's offset back off, so the moves and the rig see their own camera
  useFrame(({ camera }) => {
    if (APPLIED.lengthSq() > 0) {
      camera.position.sub(APPLIED);
      APPLIED.set(0, 0, 0);
    }
  }, -3);

  useFrame(({ camera, scene, clock }, dt0) => {
    const s = st.current;
    const dt = Math.min(dt0, 0.1);
    const now = clock.elapsedTime;
    const active = Boolean(live.arrival.id) && cutsceneMode(live.arrival.id) !== null && !off;
    const cut = active ? cutFor(live.arrival.id) : null;
    const opt = cut?.card.frame;
    const beat = getUi().beat;
    const guarding = active && opt?.off !== true && !inBeat(opt?.off, beat);
    s.frame++;
    if (live.arrival.id !== s.lastId) {
      s.lastId = live.arrival.id;
      CUR.set(0, 0, 0);
      VEL.set(0, 0, 0);
      live.frame.flip = 0;
    }
    if (!s.root || !s.root.parent) s.root = scene.getObjectByName("seal");
    const root = s.root;
    if (!root) return;
    camera.updateMatrixWorld(true);
    if (LAST.distanceTo(camera.position) > CUT_M) {
      CUR.set(0, 0, 0);
      VEL.set(0, 0, 0);
    }
    LAST.copy(camera.position);

    TGT.set(0, 0, 0);
    const raw = s.raw;
    const have = measure(camera, root, raw);
    if (guarding && have) {
      const W = innerWidth;
      const H = innerHeight;
      const allowSmall = inBeat(opt?.allowSmall, beat);
      let { cx, cy, hw, hh } = raw;
      const depth = raw.depth;
      // size: the smallest dolly that brings the height back inside the band
      const f = raw.f;
      let f2 = Math.min(Math.max(f, allowSmall ? 0 : G.minH), G.maxH);
      let dolly = 0;
      if (f2 !== f) {
        const d2 = Math.min(Math.max((depth * f) / f2, 1.2), 60);
        dolly = depth - d2;
        const k = depth / d2;
        cx *= k;
        cy *= k;
        hw *= k;
        hh *= k;
        f2 = hh;
      }
      const d2 = depth - dolly;
      // edges: clear the margin
      let sx = Math.max(0, -1 + G.m - (cx - hw)) - Math.max(0, cx + hw - (1 - G.m));
      let sy = Math.max(0, -1 + G.m - (cy - hh)) - Math.max(0, cy + hh - (1 - G.m));
      // bubbles: lift the pup over them, or flip them to the other side
      const t = performance.now();
      let lift = 0;
      for (let i = 0; i < 4; i++) {
        if (t - live.frame.at[i] > 250) continue;
        const r = live.frame.r;
        const bx0 = (r[i * 4] / W) * 2 - 1;
        const bx1 = (r[i * 4 + 2] / W) * 2 - 1;
        const btop = 1 - (r[i * 4 + 1] / H) * 2;
        if (cx + sx + hw < bx0 - 0.02 || cx + sx - hw > bx1 + 0.02) continue;
        lift = Math.max(lift, btop + G.bubble - (cy + sy - hh));
      }
      if (lift > 0) {
        if (cy + sy + hh + lift <= 1 - G.m) sy += lift;
        else if (now - s.flipAt > 1.5) {
          live.frame.flip ^= 1;
          s.flipAt = now;
        }
      }
      R.setFromMatrixColumn(camera.matrixWorld, 0);
      U.setFromMatrixColumn(camera.matrixWorld, 1);
      D.copy(C).sub(camera.position).normalize();
      TGT.copy(D).multiplyScalar(dolly);
      TGT.addScaledVector(R, (-sx * d2) / camera.projectionMatrix.elements[0]);
      TGT.addScaledVector(U, (-sy * d2) / camera.projectionMatrix.elements[5]);
    }
    if (guarding || CUR.lengthSq() > 1e-8) {
      smoothDamp(CUR, VEL, TGT, dt);
      camera.position.add(CUR);
      APPLIED.copy(CUR);
      camera.updateMatrixWorld(true);
    }

    // occluders: one of five rays a frame (centre, top, bottom, left, right)
    if (guarding && have) {
      const k = s.ray++ % 5;
      box.getCenter(C);
      const hy = (box.max.y - box.min.y) / 2;
      R.setFromMatrixColumn(camera.matrixWorld, 0);
      P.copy(C);
      if (k === 1) P.y += hy * 0.9;
      else if (k === 2) P.y -= hy * 0.9;
      else if (k === 3) P.addScaledVector(R, -(box.max.x - box.min.x) / 2);
      else if (k === 4) P.addScaledVector(R, (box.max.x - box.min.x) / 2);
      D.copy(P).sub(camera.position);
      const dist = D.length();
      ray.set(camera.position, D.normalize());
      ray.near = 0.2;
      ray.far = dist - 0.25;
      hits.length = 0;
      ray.intersectObject(scene, true, hits);
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        const o = h.object;
        if (!o.isMesh || underneath(o, root, "cutscene")) continue;
        const mat = o.material;
        if (mat && !Array.isArray(mat) && (mat.depthWrite === false || (mat.transparent && mat.opacity < 0.6))) continue;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 40 && !o.isInstancedMesh) continue; // terrain, sea, sky
        fadeHit(h, s.frame);
      }
    }
    stepFades(dt, s.frame, !guarding);

    if (dbg) {
      const post = s.M;
      measure(camera, root, post);
      window.__frame = {
        on: guarding,
        active,
        beat,
        raw: { ok: raw.ok, f: raw.f, x0: raw.x0, x1: raw.x1, y0: raw.y0, y1: raw.y1 },
        post: { ok: post.ok, f: post.f, x0: post.x0, x1: post.x1, y0: post.y0, y1: post.y1 },
        flip: live.frame.flip,
        allowSmall: inBeat(opt?.allowSmall, beat),
        fading: fades.length + inst.length,
        offset: CUR.length(),
      };
    }
  }, 0.9);

  return null;
}
