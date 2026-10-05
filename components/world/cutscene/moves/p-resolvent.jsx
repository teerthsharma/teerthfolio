"use client";

// The Resolvent: Frieren, Aura the Guillotine and the Scale of Obedience. A
// FRIEREN KEY-ART dimension: crisp modern anime key-art, soft cel shading, a
// golden-hour autumn palette (ambers, rusts, a soft teal sky), mana as tiny
// glowing motes. The island becomes the ruined castle courtyard outside Graz:
// a flagstone court gone to autumn grass, a broken keep and tower and curtain
// wall, crumbling walls, a cracked fountain, autumn trees, long violet shadows
// and shafts of light (world.js). Aura stands on her dais, long pale hair,
// small horns, a cape, the golden scale held up; her headless soldiers stand
// in ranks behind her; Fern (staff) and Stark (axe) watch from the walls
// (cast.js). The pup is weighed: its soul-light is a small faint glow on one
// pan, Aura's mana a towering violet flame on the other, and the scale tips to
// her. "Okay. Let me pull away my limiters too." The pup's suppressed mana
// erupts as a vast silver-and-gold column; the castle's stones lift, the
// autumn leaves are blown sky-high, dust rises off the flagstones, Aura's hair
// and cape whip; the scale swings to the pup's side and SHATTERS (the beam in
// two, the pans spinning to the ground, a spray of gold), and her soldiers
// kneel. THE RETURN: the scale was the judgement; broken, the judgement is
// void, gold cracks run out from it through the ground, the walls and the sky
// (kintsugi), and the whole picture unmakes itself into light, leaving the real
// island under the same pup, who says the flex line (toon.js "unmake").
// No post pass; ~30 draw calls; everything built once, pooled and disposed.
// Card: lib/world/cutscene/cards/p-resolvent.js. Parts: ./p-resolvent/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Mesh, Object3D, Quaternion, SphereGeometry, Vector3, WebGLRenderTarget } from "three";
import { radiusAt, cutsceneMode } from "../../../../lib/world/cutscene/timeline";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { islandList, lettering, pupParts } from "./p-caustic/parts";
import { AURA, BEAM, CHAIN, FERN_AT, FULCRUM, HAND, SCALE_K, STARK_AT, aura, auraFace, fern, frierenKit, scalePieces, soldier, stark } from "./p-resolvent/cast";
import { column, flame, flashQuad, leaves, shards, sprites, stones } from "./p-resolvent/fx";
import { U, celMaterial, hash, inst, pupCel } from "./p-resolvent/toon";
import { CASTERS, ground, groundY, shadows, shafts, skyMaterial, statics } from "./p-resolvent/world";

const CORE_Y = 0.9;
const UP = new Vector3(0, 1, 0);
// the clock (s from the arrival; the card puts line A at 2.6, the reply at 7.0, the flex at 11.0, the credit at 16.6, the end at 19.6)
// the reply is up for 0.7 s before the release; the shatter is held (and the lens pushes in on it) for 1.4 s; the column is gone
// before the soldiers kneel, so the ranks read in plain light; the flex is said over the kneeling court, which then unmakes
// itself under the line and is gone well before the credit
const T = {
  aura: 1.75, scaleIn: 2.4, tip: 3.0, ignite: [3.1, 4.2], gather: 6.2, release: 7.7, swing: [7.85, 8.45], brk: 8.5,
  kneel: 10.3, crack: [11.4, 13.2], dis: [13.0, 15.4], colFade: [9.3, 10.3], word: [10.6, 12.0], flex: 10.9, dolly: [7.8, 8.7, 9.9, 10.9],
};
// the scale's palm in the rig frame
const HW = new Vector3(...HAND).multiplyScalar(AURA.scale).applyAxisAngle(UP, AURA.yaw).add(new Vector3(...AURA.at));

const LEAVES = 260;
const STONES = 70;
const MOTES = 200;
const DUST = 36;
const SHARDS = 40;

// soldiers: three ranks behind Aura
const RANKS = [[-7.6, 8, -2.0], [-9.0, 9, -2.7], [-10.4, 10, -3.4]];
const FOOT = RANKS.flatMap(([z, n, x0], r) => Array.from({ length: n }, (_, i) => ({ x: x0 + i * 1.28 + 0.2 * (hash(r * 20 + i, 1) - 0.5), z: z + 0.3 * (hash(r * 20 + i, 2) - 0.5), r, k: i })));

const clamp01 = (v) => Math.min(1, Math.max(0, v));
// the scale's tilt (radians, + is toward Aura's pan): it tips to her, trembles as the pup gathers, then swings to the pup
function tilt(tt) {
  let th = 0;
  const d = tt - T.tip;
  if (d > 0) th = 0.34 * (1 - Math.exp(-6 * d) * Math.cos(9 * d));
  th += 0.012 * Math.sin(tt * 1.7) * smooth(T.tip + 1, T.tip + 1.5, tt);
  th += 0.05 * smooth(T.gather, T.release, tt) + 0.012 * Math.sin(tt * 70) * smooth(T.gather + 0.5, T.release, tt);
  const k = smooth(T.swing[0], T.swing[1], tt);
  return th * (1 - k) + -0.95 * k * (0.35 + 0.65 * k);
}
// one bounce of a thrown piece: the height after d seconds
function arc(y0, vy, d) {
  let y = y0;
  let v = vy;
  let t = d;
  for (let k = 0; k < 3; k++) {
    const disc = Math.max(v * v + 19.6 * (y - 0.14), 0);
    const tl = (v + Math.sqrt(disc)) / 9.8;
    if (t <= tl) return y + v * t - 4.9 * t * t;
    t -= tl;
    y = 0.14;
    v = Math.sqrt(disc) * 0.34;
  }
  return 0.14;
}
// the five pieces of the scale and how each is thrown: velocity, spin, and the way it lies once it has landed (rx, rz).
// They are thrown toward the lens, so they come down in the court close to the pup.
const PIECES = [
  { v: [-2.6, 3.8, 3.8], w: [3.5, 2.0, 5.0], rest: [0, 0.08] }, // the beam, the pup's half
  { v: [1.9, 4.4, 2.4], w: [-2.0, 1.2, -6.0], rest: [0, -0.1] }, // the beam, Aura's half
  { v: [-3.6, 3.4, 5.2], w: [1.0, 9.0, 0.5], rest: [0, 0] }, // the pup's pan, spinning like a coin
  { v: [1.7, 3.2, 3.8], w: [0.6, -8.0, 1.0], rest: [0, 0] }, // Aura's pan
  { v: [0.4, 2.2, 2.2], w: [2.0, 0.5, 3.0], rest: [0, Math.PI / 2] }, // the stem
];

const O = new Object3D();
const V = new Vector3();
const AIM = new Vector3();
const LOOK = new Vector3();
const Q = new Quaternion();
const COL = new Color();
function setM(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  O.position.set(x, y, z);
  O.rotation.set(rx, ry, rz);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}
// where a thing resting at (x, y, z) goes once the pup's mana lifts it, d seconds in: it swirls round the pup, out and up
function lift(x, y, z, d, up, swirl, out, o) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x) + swirl * d;
  const rr = r + out * d;
  o.x = Math.cos(a) * rr;
  o.z = Math.sin(a) * rr;
  o.y = y + up * d * (1 + 0.35 * d);
}

// everything the scene draws, built once (geometry, materials, pools); disposeCourt gives it all back
function buildCourt() {
  const mat = celMaterial();
  const sol = soldier();
  const stoneAt = Array.from({ length: STONES }, (_, i) => {
    let x = -12 + 27 * hash(i, 1);
    const z = -24 + 27 * hash(i, 2);
    if (Math.hypot(x, z) < 2) x += 3;
    return { x, z, y: groundY(x, z), s: 0.12 + 0.5 * hash(i, 3) ** 2, h: hash(i, 4), at: T.release + 0.05 + 0.035 * Math.hypot(x, z), a: hash(i, 5) * 6, b: hash(i, 6) * 6 };
  });
  const leafAt = Array.from({ length: LEAVES }, (_, i) => ({ x: -18 + 40 * hash(i, 1), y: 0.25 + 9 * hash(i, 2), z: -30 + 37 * hash(i, 3), s: 0.2 + 0.16 * hash(i, 4), h: hash(i, 5), a: hash(i, 6) * 6 }));
  const moteAt = Array.from({ length: MOTES }, (_, i) => ({ x: -14 + 30 * hash(i, 1), y: 8 * hash(i, 2), z: -26 + 32 * hash(i, 3), s: 0.05 + 0.08 * hash(i, 4), sp: 0.25 + 0.5 * hash(i, 5), h: hash(i, 6) }));
  const casters = [...CASTERS, [AURA.at[0], AURA.at[2], 1.0, 2.5, 0, 0.5], [FERN_AT[0], FERN_AT[2], 0.7, 1.6, 0, 0.5], [STARK_AT[0], STARK_AT[2], 0.8, 1.9, 0, 0.5], ...FOOT.map((f) => [f.x, f.z, 0.7, 2.3, 0, 0.32])];
  const flash = flashQuad();
  const flashMesh = new Mesh(flash.g, flash.m);
  flashMesh.renderOrder = 40;
  flashMesh.frustumCulled = false;
  flashMesh.visible = false;
  const legs = inst(sol.legs, mat, FOOT.length);
  const up = inst(sol.up, mat, FOOT.length);
  for (let i = 0; i < FOOT.length; i++) {
    const k = 0.88 + 0.22 * hash(i, 9);
    up.setColorAt(i, COL.setRGB(k, k, k * 1.03));
    legs.setColorAt(i, COL.setRGB(k, k, k * 1.03));
  }
  return {
    glow: { value: 0 },
    cel: null,
    mat,
    sky: { g: new SphereGeometry(1, 32, 18), m: skyMaterial() },
    ground: ground(),
    statics: statics(),
    shadows: shadows(casters),
    shafts: shafts(),
    aura: aura(),
    auraFace: auraFace(),
    fern: fern(),
    stark: stark(),
    legs,
    up,
    sol,
    sc: scalePieces(),
    flame: flame(),
    soul: sprites(1, { shape: 1, colors: ["#fff2cf"] }),
    col: column(),
    glows: sprites(6, { colors: ["#cfe9ff", "#f6e2ab", "#8a4dff", "#ffd27a", "#9b6bff", "#ffe9b8"] }),
    motes: sprites(MOTES, { shape: 1, colors: ["#ffe3a0", "#fff6df", "#bfeede", "#ffd27a"] }),
    dust: sprites(DUST, { additive: false, colors: ["#e6c796", "#d8b07c", "#eed3a6"] }),
    rings: sprites(6, { shape: 2, colors: ["#ffe9b8", "#dfeaff", "#ffd27a"] }),
    leaves: leaves(LEAVES, mat),
    stones: stones(STONES, mat),
    shards: shards(SHARDS, mat),
    flash,
    flashMesh,
    stoneAt,
    leafAt,
    moteAt,
    word: [lettering("PAKIIN!", "#f2b630", -0.1), lettering("VERDICT VOID", "#c98a1a", 0.05)],
  };
}

function disposeCourt(m) {
  m.cel?.dispose();
  m.cel = null;
  for (const g of [m.sky.g, m.ground.g, m.statics, m.shadows.g, m.shafts.g, m.aura, m.fern, m.stark, m.sol.legs, m.sol.up, m.sc.stem, m.sc.left, m.sc.right, m.sc.pan, m.sc.mote, m.soul.geometry, m.flame.g, m.col.g, m.glows.geometry, m.motes.geometry, m.dust.geometry, m.rings.geometry, m.leaves.geometry, m.stones.geometry, m.shards.geometry, m.flash.g, m.word[0].geometry, m.word[1].geometry]) g.dispose();
  for (const x of [m.mat, m.sky.m, m.ground.m, m.shadows.m, m.shafts.m, m.flame.m, m.col.outer, m.col.inner, m.glows.material, m.soul.material, m.motes.material, m.dust.material, m.rings.material, m.flash.m, m.word[0].material, m.word[1].material]) x.dispose();
  m.word[0].material.map?.dispose();
  m.word[1].material.map?.dispose();
  for (const x of [m.legs, m.up, m.glows, m.soul, m.motes, m.dust, m.rings, m.leaves, m.stones, m.shards]) x.dispose();
}

// THE PRELOAD: the arrival mounts the move only when the dock is reached, and a first draw of this court costs a few
// hundred ms of program compiles and buffer uploads. So while the seal walks up (inside 60 m of the dock, the scene
// still unseen) the court is built here and each piece is drawn once, alone, into a 16 px target, one per frame; the
// pup's cel twins likewise. The move then takes the warmed court, and a seal that walks away gives it back.
const ID = "p-resolvent";
const DOCK = PLACE_BY_ID[ID];
let held = null;

function warmCourt() {
  const w = window.__world;
  if (!w?.gl || !w.scene || !w.camera || !w.ready) return null;
  const m = buildCourt();
  const h = { m, taken: false };
  // the programs are keyed by the scene's lights, so each piece is drawn inside the real scene, alone on layer 5
  // (with the lights on it too), by a clone of the camera that sees only layer 5
  const items = [];
  const lights = [];
  const add = (o, own) => {
    o.frustumCulled = false;
    items.push([o, o.visible, own]);
    o.layers.set(5);
    w.scene.add(o);
  };
  for (const [g, mat] of [[m.sky.g, m.sky.m], [m.ground.g, m.ground.m], [m.shadows.g, m.shadows.m], [m.statics, m.mat], [m.shafts.g, m.shafts.m], [m.aura, m.mat], [m.fern, m.mat], [m.stark, m.mat], [m.sc.stem, m.mat], [m.sc.left, m.mat], [m.sc.right, m.mat], [m.sc.pan, m.mat], [m.sc.mote, m.mat], [m.flame.g, m.flame.m], [m.col.g, m.col.outer], [m.col.g, m.col.inner]]) add(new Mesh(g, mat), true);
  for (const o of [m.legs, m.up, m.leaves, m.stones, m.shards, m.dust, m.glows, m.soul, m.rings, m.motes, m.word[0], m.word[1], m.flashMesh]) add(o, false);
  w.scene.traverse((o) => { if (o.isLight) { lights.push(o); o.layers.enable(5); } });
  const rt = new WebGLRenderTarget(16, 16);
  const wcam = w.camera.clone();
  wcam.layers.set(5);
  // the pup's cel twins: one mesh a frame, so no single frame pays for all of its programs
  let pupMeshes = null;
  const pupSeen = [];
  const finish = () => {
    for (const [o, v, own] of items) {
      o.visible = v;
      o.layers.set(0);
      if (own) w.scene.remove(o);
      else if (o.parent === w.scene) w.scene.remove(o);
    }
    for (const l of lights) l.layers.disable(5);
    for (const [o, v, f] of pupSeen) { o.visible = v; o.frustumCulled = f; o.layers.disable(5); }
    pupSeen.length = 0;
    m.cel?.set(false);
    rt.dispose();
  };
  let at = 0;
  const step = () => {
    if (held !== h || (pupMeshes && at >= items.length + pupMeshes.length)) {
      finish();
      return;
    }
    const keep = w.gl.getRenderTarget();
    try {
      if (at === items.length && !pupMeshes) {
        const p = pupParts(w.scene);
        pupMeshes = [];
        if (p?.root) {
          m.cel = pupCel(p.root, m.glow);
          p.root.traverse((o) => { pupSeen.push([o, o.visible, o.frustumCulled]); o.frustumCulled = false; o.layers.enable(5); if (o.isMesh) pupMeshes.push(o); });
        }
        if (!pupMeshes.length) { finish(); return; }
      }
      w.gl.setRenderTarget(rt);
      if (at < items.length) {
        for (const [o] of items) o.visible = o === items[at][0];
        w.gl.render(w.scene, wcam);
      } else {
        // swap in the cel twins and show the one mesh for this render only: the pup is on screen between frames
        const k = at - items.length;
        m.cel.set(true);
        for (const [o] of pupSeen) o.visible = o === pupMeshes[k] || !o.isMesh;
        w.gl.render(w.scene, wcam);
        for (const [o, v] of pupSeen) o.visible = v;
        m.cel.set(false);
      }
      at++;
    } catch {
      at = items.length + (pupMeshes?.length ?? 1); // a failed warm-up only means the first draw pays for it
    }
    w.gl.setRenderTarget(keep);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return h;
}

function takeCourt() {
  const h = held;
  held = null;
  if (h) h.taken = true;
  return h?.m ?? null;
}

if (typeof window !== "undefined") {
  window.setInterval(() => {
    const s = live.seal;
    const d = Math.hypot(s.x - DOCK.x, s.z - DOCK.z);
    if (!held && d < 60 && !live.seen.has(ID) && !live.arrival.id && cutsceneMode(ID) === "full") held = warmCourt();
    else if (held && d > 80) {
      disposeCourt(held.m);
      held = null;
    }
  }, 500);
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const sky = useRef();
  const world = useRef();
  const auraG = useRef();
  const fernG = useRef();
  const starkG = useRef();
  const stem = useRef();
  const beamL = useRef();
  const beamR = useRef();
  const panL = useRef();
  const panR = useRef();
  const moteG = useRef();
  const flameG = useRef();
  const colO = useRef();
  const colI = useRef();
  const word = [useRef(), useRef()];
  const pup = useRef(null);
  const cel = useRef(null);
  const island = useRef([]);
  const shake = useRef(new Vector3());
  const lifted = useRef(0);
  const capRef = useRef(null);
  const last = useRef(-1);

  const m = useMemo(() => takeCourt() ?? buildCourt(), []);

  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    m.cel = m.cel ?? (p?.root ? pupCel(p.root, m.glow) : null);
    cel.current = m.cel;
    // Frieren's twin tails, earrings and staff, from t = 0
    const kit = p?.root && p.head ? frierenKit() : null;
    if (kit) (p.head.add(kit.head), p.root.add(kit.staff));
    // the return, said on screen: why the court unmakes itself and we are home
    const cap = document.createElement("p");
    cap.textContent = "The scale broke, so Aura's judgement is void. The court unmakes itself, and this is home.";
    cap.style.cssText = "position:fixed;left:50%;top:13vh;transform:translateX(-50%);z-index:24;pointer-events:none;margin:0;padding:8px 18px;border-radius:999px;background:#fff4d6;color:#4a2a08;border:2px solid #e0a043;font:700 clamp(13px,2vh,18px) system-ui,sans-serif;text-align:center;max-width:calc(100vw - 32px);display:none";
    document.body.appendChild(cap);
    capRef.current = cap;
    return () => {
      if (kit) (kit.head.removeFromParent(), kit.staff.removeFromParent(), kit.dispose());
      cap.remove();
      capRef.current = null;
      cel.current = null;
      pup.current = null;
      disposeCourt(m);
    };
  }, [scene, m]);

  // the shake and the lift ride the pup after Seal.jsx has placed it; a skip clears the arrival and nothing draws a frame more
  useFrame((state) => {
    const p = pup.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      cel.current?.set(false);
      m.flashMesh.visible = false;
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(shake.current);
      p.root.position.y += lifted.current;
      p.root.rotation.y += 1.7 * smooth(1.0, 2.2, state.clock.elapsedTime - live.arrival.start) * (1 - smooth(tl.collapse[0] - 0.4, tl.collapse[0], state.clock.elapsedTime - live.arrival.start)); // face Aura (profile to the lens)
    }
  }, -0.5);

  // THE PUSH-IN: the lens leans in on the scale as it swings and breaks, holds on the shatter, and eases back. It runs after
  // CameraRig (the same priority, mounted later) so it only nudges the camera the rig has just placed for this frame.
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || mode !== "full") return;
    const tt = onTwos(state.clock.elapsedTime - a.start);
    const k = smooth(T.dolly[0], T.dolly[1], tt) * (1 - smooth(T.dolly[2], T.dolly[3], tt));
    if (k <= 0.001) return;
    const cam = state.camera;
    const s = live.seal;
    AIM.set(s.x + HW.x - 0.2, HW.y + 0.7, s.z + HW.z);
    const d = cam.position.distanceTo(AIM);
    cam.getWorldDirection(LOOK).multiplyScalar(d).add(cam.position).lerp(AIM, 0.4 * k);
    cam.position.lerp(AIM, 0.18 * k);
    cam.lookAt(LOOK);
  });

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flashMesh.visible = false;
    if (!full) {
      cel.current?.set(false);
      shake.current.set(0, 0, 0);
      lifted.current = 0;
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const dis = smooth(T.dis[0], T.dis[1], tt) * 1.2;
    const gone = dis >= 1.18;
    // the mana: the wind lasts while the court unmakes itself; the pup's glow and the column are gone by the kneel
    const grow = smooth(T.release, T.release + 0.55, tt);
    const colK = 1 - smooth(T.colFade[0], T.colFade[1], tt);
    const mana = grow * (1 - 0.8 * smooth(T.dis[0], T.dis[1], tt));
    const glowK = grow * (1 - smooth(T.colFade[0] + 0.3, T.colFade[1] + 0.8, tt));
    const brk = tt - T.brk;
    const broken = brk >= 0;

    // the shake: the release, and the break, two drawings each
    const hit = (h, k) => (tt >= h && tt < h + 0.34 ? k : 0);
    const amp = hit(T.release, 0.07) + hit(T.brk, 0.1);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    shake.current.set(amp * odd, -amp * 0.5 * odd, 0);
    lifted.current = 0.42 * smooth(T.release, T.release + 0.6, tt) * (1 - smooth(T.colFade[0], T.colFade[1] + 0.6, tt));
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.set(0, 0, 0);

    // the world: a sky bubble swells with the stage, then the court stands inside it
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    sky.current.visible = r > 0.02 && !gone;
    sky.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    world.current.visible = inside && !gone;
    U.uTime.value = tt;
    U.uDis.value = dis;
    U.uCrack.value = smooth(T.crack[0], T.crack[1], tt);
    U.uWind.value = 0.05 + 0.95 * mana * (1 - 0.5 * smooth(10.5, 13.5, tt));
    U.uDim.value = 0.8 * smooth(T.release - 0.15, T.release + 0.45, tt) * colK;
    U.uAxis.value.set(s.x, 0, s.z);
    U.uOrigin.value.set(s.x + HW.x, HW.y + FULCRUM * 0.6, s.z + HW.z);
    U.uOriginDir.value.copy(U.uOrigin.value).sub(cam.position).normalize();
    m.glow.value = glowK * 0.8 * out;
    if (capRef.current) capRef.current.style.display = tt >= T.dis[0] + 0.4 && tt < T.dis[1] + 3.2 ? "block" : "none";
    cel.current?.set(inside && tt > tl.bloom[1] && dis < 0.2);
    const wideNow = state.size.width / state.size.height >= 1;

    // the pup: the sign, braced under the scale, gathering, the arms up for the release, a fist for the flex
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.sit = smooth(0.4, 1.0, tt) * 1.2 * out; // upright on its tail, never lying flat
    live.pose.fist = (smooth(2.7, 3.0, tt) * (1 - smooth(T.gather - 0.1, T.gather + 0.1, tt)) + smooth(T.flex, T.flex + 0.3, tt)) * out;
    live.pose.crouch = smooth(T.gather, T.gather + 0.5, tt) * (1 - smooth(T.release - 0.1, T.release + 0.1, tt)) * 0.8;
    live.pose.raise = smooth(T.release, T.release + 0.3, tt) * (1 - smooth(T.colFade[0] + 0.3, T.colFade[1], tt));

    // AURA steps in with a pop, staggers back at the release, and stands stunned
    const ap = smooth(T.aura, T.aura + 0.5, tt);
    const pop = ap * (1 + 0.2 * Math.sin(Math.PI * clamp01((tt - T.aura) / 0.5)));
    const stag = smooth(T.release + 0.1, T.release + 0.45, tt) * (1 - smooth(8.4, 9.6, tt));
    auraG.current.position.set(AURA.at[0] + 0.22 * stag, AURA.at[1], AURA.at[2] - 0.4 * stag);
    auraG.current.rotation.set(-0.1 * stag, AURA.yaw + 0.05 * stag, 0);
    auraG.current.scale.setScalar(Math.max(0.001, AURA.scale * pop));
    const wallPop = (k) => Math.max(0.001, smooth(1.9 + k, 2.3 + k, tt));
    fernG.current.position.set(...FERN_AT);
    fernG.current.rotation.set(0, 0.25, 0.02 * Math.sin(tt * 1.3));
    fernG.current.scale.setScalar(wallPop(0.1) * 1.05);
    starkG.current.position.set(...STARK_AT);
    starkG.current.rotation.set(0, -0.3, 0.015 * Math.sin(tt * 1.1));
    starkG.current.scale.setScalar(wallPop(0.3) * 1.1);

    // THE SCALE: held up from the palm (drawn oversize); the beam tips; at the break each piece is thrown and falls.
    // A pan's origin is the middle of its dish; the chains rise from it to the beam's end.
    const K = SCALE_K;
    const sk = Math.max(0.001, smooth(T.scaleIn, T.scaleIn + 0.4, tt) * (1 + 0.18 * Math.sin(Math.PI * clamp01((tt - T.scaleIn) / 0.4))));
    const th = tilt(tt);
    const place = (ref, i, x, y, z, rz, d) => {
      const o = ref.current;
      if (!broken) {
        o.position.set(x, y, z);
        o.rotation.set(0, 0, rz);
        o.scale.setScalar(sk * K);
        return;
      }
      const P = PIECES[i];
      const e = (1 - Math.exp(-1.6 * d)) / 1.6;
      const f = (1 - Math.exp(-1.1 * d)) / 1.1;
      // tumbling in the air, then lying where it fell
      const settle = smooth(1.0, 1.9, d);
      o.position.set(x + P.v[0] * f, arc(y, P.v[1], d), z + P.v[2] * f);
      o.rotation.set(P.w[0] * e * (1 - settle) + P.rest[0] * settle, P.w[1] * e, (rz + P.w[2] * e) * (1 - settle) + P.rest[1] * settle);
      o.scale.setScalar(K);
    };
    // the pose at the break comes from the same function, so each piece starts where the scale was
    const tb = broken ? tilt(T.brk) : th;
    const pv = HW.y + FULCRUM * K * (broken ? 1 : sk);
    const hang = broken ? 1 : sk;
    const cb = Math.cos(tb);
    const sb = Math.sin(tb);
    const bk = Math.max(0, brk);
    const swing = broken ? 0 : 0.05 * Math.sin(tt * 3.2) * (1 - Math.exp(-Math.max(0, tt - T.tip) * 0.8));
    const drop = CHAIN * K * hang; // the chain's length: the dish hangs this far under the beam's end
    stem.current.visible = beamL.current.visible = beamR.current.visible = panL.current.visible = panR.current.visible = tt >= T.scaleIn && !gone;
    place(stem, 4, HW.x, HW.y, HW.z, 0, bk);
    place(beamL, 0, HW.x, pv, HW.z, -tb, bk);
    place(beamR, 1, HW.x, pv, HW.z, -tb, bk);
    {
      const lx = HW.x - BEAM * K * cb * hang;
      const ly = pv + BEAM * K * sb * hang;
      const rx = HW.x + BEAM * K * cb * hang;
      const ry = pv - BEAM * K * sb * hang;
      place(panL, 2, lx + Math.sin(swing) * drop, ly - Math.cos(swing) * drop, HW.z, swing, bk);
      place(panR, 3, rx + Math.sin(-swing) * drop, ry - Math.cos(swing) * drop, HW.z, -swing, bk);
    }

    // the soul-light: a small, distinct, glowing mote on the pup's pan (a halo and a glint round it), Aura's flame on the other
    // pan, the pup's own glow behind it, the flare at the break
    const gl = m.glows;
    const ga = gl.geometry.attributes.aAlpha;
    const gather = smooth(T.gather, T.release, tt);
    const soulOn = smooth(2.7, 3.1, tt) * (1 - smooth(T.brk, T.brk + 0.15, tt));
    const flick = 0.88 + 0.12 * Math.sin(tt * 17);
    const swell = smooth(T.release, T.release + 0.5, tt);
    const pl = panL.current.position;
    const pr = panR.current.position;
    const mt = moteG.current;
    mt.visible = soulOn > 0.01 && !gone;
    mt.position.set(pl.x, pl.y + 0.15 * K * sk, pl.z);
    mt.scale.setScalar(Math.max(0.001, sk * K * (1 + 0.25 * gather + 1.4 * swell)) * flick);
    setM(gl, 0, pl.x, pl.y + 0.16 * K * sk, pl.z + 0.05, Math.max((1.15 + 0.5 * gather + 3.2 * swell) * soulOn * flick, 0.001));
    ga.array[0] = 0.85;
    setM(m.soul, 0, pl.x, pl.y + 0.16 * K * sk, pl.z + 0.1, Math.max((1.0 + 0.5 * gather + 1.2 * swell) * soulOn, 0.001));
    m.soul.geometry.attributes.aAlpha.array[0] = 0.9 * flick;
    m.soul.geometry.attributes.aAlpha.needsUpdate = true;
    m.soul.instanceMatrix.needsUpdate = true;
    const fk = smooth(T.ignite[0], T.ignite[1], tt) * (1 - smooth(T.brk, T.brk + 0.2, tt));
    flameG.current.visible = fk > 0.01 && !gone;
    flameG.current.position.set(pr.x, pr.y + 0.1, pr.z);
    m.flame.m.uniforms.uK.value = fk * (0.94 + 0.06 * Math.sin(tt * 13));
    setM(gl, 2, pr.x, pr.y + 1.7, pr.z, 6.0 * fk + 0.001);
    ga.array[2] = 0.3 * fk;
    setM(gl, 1, 0, 1.0, -1.6, (0.01 + 3.6 * grow) * (1 + 0.04 * Math.sin(tt * 15)) * glowK);
    ga.array[1] = 0.4 * glowK;
    const fl = clamp01(brk / 0.5);
    setM(gl, 3, HW.x, HW.y + 1.0, HW.z + 0.2, broken ? (0.3 + 5.5 * fl) * (1 - fl * 0.2) : 0.001);
    ga.array[3] = broken ? 0.9 * (1 - fl) ** 1.5 : 0;
    setM(gl, 4, 0, 0, 0, 0.001);
    setM(gl, 5, 0, 0, 0, 0.001);
    ga.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;

    // THE COLUMN: a narrow cylinder of silver and gold behind the pup, soft to nothing at its edge; it is gone before the kneel
    const pulse = 0.92 + 0.08 * Math.sin(tt * 13);
    colO.current.visible = colI.current.visible = grow > 0.01 && colK > 0.005 && !gone;
    // rise from the pup itself, wide enough to wrap it
    if (pup.current?.root) {
      pup.current.root.getWorldPosition(V);
      g.worldToLocal(V);
      colO.current.position.set(V.x, 0, V.z);
      colI.current.position.set(V.x, 0, V.z);
    }
    colO.current.scale.set(2.72 * grow + 0.16, 46, 2.72 * grow + 0.16);
    colI.current.scale.set(1.12 * grow + 0.08, 46, 1.12 * grow + 0.08);
    m.col.outer.uniforms.uA.value = 0.8 * grow * colK * pulse;
    m.col.inner.uniforms.uA.value = 0.95 * grow * colK * pulse;

    // the island comes back under the picture as it unmakes itself
    if (dis > 0.12 && tt < tl.collapse[0]) for (const o of island.current) o.visible = true;

    // the lettering: the break, then the verdict
    const lw = (k, a0, a1, x, y, size) => {
      const mesh = word[k].current;
      const age = tt - a0;
      mesh.visible = age >= 0 && tt < a1 && !gone;
      if (!mesh.visible) return;
      const pp = Math.min(1, age / 0.08) * (1 + 0.25 * Math.max(0, 1 - age / 0.2));
      mesh.position.set(x + 0.04 * odd, y, 0.4);
      mesh.scale.set(size * pp, size * pp, 1);
      g.updateWorldMatrix(true, false);
      mesh.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(cam.quaternion));
    };
    lw(0, T.brk, T.brk + 1.2, wideNow ? -1.6 : 0.2, wideNow ? 5.0 : 5.9, wideNow ? 3.6 : 2.5);
    lw(1, T.word[0], T.word[1], wideNow ? -1.0 : 0.3, wideNow ? 5.1 : 6.1, wideNow ? 4.2 : 2.9);

    // the flash: gold, never white: the release, the break
    const fa = Math.max(0, 1 - Math.abs(tt - T.release - 0.05) / 0.16) * 0.12 + Math.max(0, 1 - Math.abs(tt - T.brk - 0.04) / 0.16) * 0.2;
    m.flashMesh.visible = fa > 0.004;
    if (m.flashMesh.visible) {
      m.flash.m.uniforms.uO.value = fa;
      cam.getWorldDirection(V);
      m.flashMesh.position.copy(V).multiplyScalar(1.2).add(cam.position);
      m.flashMesh.quaternion.copy(cam.quaternion);
      const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.2;
      m.flashMesh.scale.set(h * cam.aspect, h, 1);
    }

    // everything below moves in twos: twelve drawings a second
    const step = Math.floor(t * 12);
    if (step === last.current) return;
    last.current = step;

    // soldiers: they step in by ranks, then kneel (the upper body drops and bows, the legs fold), rank by rank
    for (let i = 0; i < FOOT.length; i++) {
      const f = FOOT[i];
      const a0 = 2.0 + f.r * 0.15 + f.k * 0.015;
      const sc = Math.max(0.001, smooth(a0, a0 + 0.3, tt));
      const k0 = T.kneel + f.r * 0.12 + f.k * 0.03;
      const k = smooth(k0, k0 + 0.5, tt);
      const yaw = Math.atan2(-f.x * 0.5, -f.z) * 0.8;
      setM(m.legs, i, f.x, 0, f.z, sc, sc * (1 - 0.52 * k), sc, 0, yaw, 0);
      setM(m.up, i, f.x, -0.46 * k * sc, f.z, sc, sc, sc, 0.38 * k, yaw, 0);
    }
    m.legs.instanceMatrix.needsUpdate = m.up.instanceMatrix.needsUpdate = true;

    // the stones that lift
    const pop0 = smooth(1.8, 2.2, tt);
    for (let i = 0; i < STONES; i++) {
      const o = m.stoneAt[i];
      const d = tt - o.at;
      if (d < 0) setM(m.stones, i, o.x, o.y + o.s * 0.3, o.z, o.s * pop0 + 0.001, o.s * 0.8 * pop0 + 0.001, o.s * pop0 + 0.001, o.a, o.b, 0);
      else {
        lift(o.x, o.y + o.s * 0.3, o.z, d, 2.4 + 3.5 * o.h, 1.0 + 0.6 * o.h, 0.8, V);
        setM(m.stones, i, V.x, V.y, V.z, o.s, o.s * 0.8, o.s, o.a + d * (1.5 + o.h * 2), o.b + d * 1.2, d * 0.9);
      }
    }
    m.stones.instanceMatrix.needsUpdate = true;

    // the dust that rises off the flagstones with them, and a ring of it rolling out from the pup
    const da = m.dust.geometry.attributes.aAlpha;
    for (let i = 0; i < DUST; i++) {
      const ring = i >= 18;
      const o = ring ? null : m.stoneAt[i];
      const d = tt - (ring ? T.release + 0.05 + 0.06 * (i - 18) : o.at);
      const life = clamp01(d / 2.2);
      if (d < 0 || life >= 1) {
        setM(m.dust, i, 0, -50, 0, 0.001);
        da.array[i] = 0;
        continue;
      }
      const a = (i - 18) * 0.52 + hash(i, 3);
      const rr = 1.6 + 8.5 * life ** 0.7;
      setM(m.dust, i, ring ? Math.cos(a) * rr : o.x, 0.35 + 1.4 * life + (ring ? 0 : 0.3 * d), ring ? Math.sin(a) * rr : o.z, (ring ? 1.0 : 0.7) + 2.0 * life);
      da.array[i] = 0.3 * (1 - life) ** 1.4 * smooth(0, 0.12, life) * (1 - smooth(T.dis[0], T.dis[1], tt));
    }
    da.needsUpdate = true;
    m.dust.instanceMatrix.needsUpdate = true;

    // the leaves: drifting down the court in the breeze, then blown sky-high
    for (let i = 0; i < LEAVES; i++) {
      const L = m.leafAt[i];
      const y = ((L.y - 0.4 * tt * (0.6 + L.h) + 90) % 9) + 0.15;
      const x = ((L.x + 0.55 * tt * (0.5 + L.h) + 400) % 40) - 18;
      const z = L.z + 0.5 * Math.sin(tt * 0.8 + L.a);
      const d = tt - (T.release + 0.05 + 0.025 * Math.hypot(x, z));
      const sc = L.s * smooth(1.6, 2.2, tt) + 0.0005;
      if (d < 0) setM(m.leaves, i, x, y, z, sc, sc, sc, L.a + tt * (1 + L.h), L.a * 2 + tt * 0.7, Math.sin(tt * 2 + L.a) * 0.8);
      else {
        lift(x, y, z, d, 4.5 + 7 * L.h, 1.7 + 0.8 * L.h, 3.2, V);
        setM(m.leaves, i, V.x, V.y, V.z, sc * 1.3, sc * 1.3, sc * 1.3, L.a + d * 5 * (0.5 + L.h), L.a * 2 + d * 3.1, d * 4.2);
      }
    }
    m.leaves.instanceMatrix.needsUpdate = true;

    // the motes: a few gold ones drift up the court; at the release they spiral into the column's light
    const ma = m.motes.geometry.attributes.aAlpha;
    for (let i = 0; i < MOTES; i++) {
      const o = m.moteAt[i];
      const calm = i < 70;
      const y = (o.y + o.sp * tt) % 9;
      const x = o.x + 0.4 * Math.sin(tt * 0.9 + o.h * 9);
      const d = tt - (T.release + 0.1 + 0.02 * Math.hypot(x, o.z));
      const vis = calm ? smooth(2.0, 2.6, tt) : smooth(T.release, T.release + 0.4, tt);
      const tw = 0.6 + 0.4 * Math.sin(tt * 6 + o.h * 40);
      if (d < 0) {
        setM(m.motes, i, x, y + 0.2, o.z, calm ? o.s : 0.0005);
        ma.array[i] = calm ? 0.8 * tw * vis : 0;
      } else {
        lift(x, y, o.z, d, 3 + 5 * o.h, 2.2 + o.h, 1.0, V);
        setM(m.motes, i, V.x, V.y, V.z, o.s * 1.4);
        ma.array[i] = 0.9 * tw * vis;
      }
      ma.array[i] *= 1 - smooth(T.colFade[0] + 0.5, T.colFade[1] + 0.6, tt);
    }
    ma.needsUpdate = true;
    m.motes.instanceMatrix.needsUpdate = true;

    // rings of force on the ground from the pup, and two from the break
    const ra = m.rings.geometry.attributes.aAlpha;
    for (let i = 0; i < 6; i++) {
      const d = tt - (i < 4 ? T.release + 0.22 * i : T.brk + 0.25 * (i - 4));
      const life = clamp01(d / 1.7);
      if (d < 0 || life >= 1) {
        setM(m.rings, i, 0, 0.07, 0, 0.001);
        ra.array[i] = 0;
        continue;
      }
      setM(m.rings, i, i >= 4 ? HW.x : 0, 0.08, i >= 4 ? HW.z : 0, 2 * (0.6 + 26 * (1 - (1 - life) ** 2)));
      ra.array[i] = 0.55 * (1 - life) ** 1.2;
    }
    ra.needsUpdate = true;
    m.rings.instanceMatrix.needsUpdate = true;

    // the golden shards of the scale
    for (let i = 0; i < SHARDS; i++) {
      if (!broken) {
        setM(m.shards, i, 0, -50, 0, 0.001);
        continue;
      }
      const a = hash(i, 1) * 6.283;
      const sp = 1.4 + 3.2 * hash(i, 2);
      const e = (1 - Math.exp(-1.2 * brk)) / 1.2;
      const k = (1 - smooth(2.2, 3.4, brk)) * (0.2 + 0.3 * hash(i, 4)) + 0.0005;
      setM(m.shards, i, HW.x + Math.cos(a) * sp * e, arc(HW.y + 0.3, 1.5 + 5 * hash(i, 3), brk), HW.z + Math.abs(Math.sin(a)) * sp * e * 1.1, k, k * 1.2, k, brk * (3 + 5 * hash(i, 5)), brk * 4 * hash(i, 6), brk * 6 * hash(i, 7));
    }
    m.shards.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flashMesh} />
      <group ref={rig} visible={false}>
        <mesh ref={sky} geometry={m.sky.g} material={m.sky.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh geometry={m.ground.g} material={m.ground.m} renderOrder={-1} frustumCulled={false} />
          <mesh geometry={m.shadows.g} material={m.shadows.m} renderOrder={0} frustumCulled={false} />
          <mesh geometry={m.statics} material={m.mat} frustumCulled={false} />
          <mesh geometry={m.shafts.g} material={m.shafts.m} renderOrder={4} frustumCulled={false} />
          <mesh ref={auraG} geometry={m.aura} material={m.mat} frustumCulled={false}>
            <primitive object={m.auraFace} />
          </mesh>
          <mesh ref={fernG} geometry={m.fern} material={m.mat} frustumCulled={false} />
          <mesh ref={starkG} geometry={m.stark} material={m.mat} frustumCulled={false} />
          <primitive object={m.legs} />
          <primitive object={m.up} />
          <mesh ref={stem} geometry={m.sc.stem} material={m.mat} frustumCulled={false} />
          <mesh ref={beamL} geometry={m.sc.left} material={m.mat} frustumCulled={false} />
          <mesh ref={beamR} geometry={m.sc.right} material={m.mat} frustumCulled={false} />
          <mesh ref={panL} geometry={m.sc.pan} material={m.mat} frustumCulled={false} />
          <mesh ref={panR} geometry={m.sc.pan} material={m.mat} frustumCulled={false} />
          <mesh ref={moteG} geometry={m.sc.mote} material={m.mat} frustumCulled={false} visible={false} />
          <primitive object={m.soul} />
          <mesh ref={flameG} geometry={m.flame.g} material={m.flame.m} scale={[2.8, 5.2, 2.8]} renderOrder={7} frustumCulled={false} visible={false} />
          <mesh ref={colO} geometry={m.col.g} material={m.col.outer} position={[0, 0, -1.6]} renderOrder={3} frustumCulled={false} visible={false} />
          <mesh ref={colI} geometry={m.col.g} material={m.col.inner} position={[0, 0, -1.6]} renderOrder={3} frustumCulled={false} visible={false} />
          <primitive object={m.stones} />
          <primitive object={m.leaves} />
          <primitive object={m.shards} />
          <primitive object={m.dust} />
          <primitive object={m.glows} />
          <primitive object={m.rings} />
          <primitive object={m.motes} />
        </group>
        <primitive ref={word[0]} object={m.word[0]} />
        <primitive ref={word[1]} object={m.word[1]} />
      </group>
    </>
  );
}
