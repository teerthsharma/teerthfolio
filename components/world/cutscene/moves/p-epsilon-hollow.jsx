// epsilon-hollow: Fullmetal Alchemist: Brotherhood, the Promised Day, as a
// Victorian pop-up alchemy book. The island becomes a book of Central City:
// the page is the ground, the plaza a raised disc of 400+ cobble cards in a
// moat that shows the strata (the page, Father's crimson layer, the bedrock
// with its gold-foil veins), Central Command a folded box with a colonnade
// and a clock tower, rooftops and ridges standing in layers on their own
// folds under an eclipse sky of indigo card. Father (a black-card
// silhouette on the steps) raises his hand and every circle in the land
// runs dark: three soldiers' chalk circles sputter out, Edward's clap
// fizzles, only May Chang's gold circle (drawn from the earth) stays lit.
// The pup claps anyway (hit-stop, the Gate, no circle ever drawn) and slams
// both flippers on the stone: gold-foil veins rise from the bedrock BELOW
// Father's layer, blue-white lightning runs straight through his crimson
// lines, the cobbles hinge up into columns, crease into struts and
// triangulate into the Epsilon-Hollow geodesic sphere on its lift shaft.
// Father pushes, three joints fold onto their neighbours and the sphere stays
// perfectly round; then the hollow comes alive and the payload dives through
// it and comes up whole (Alphonse's helm glow answers). The flex line, the
// credit card, and the return home: the day ends, the pop-up folds flat and
// the book SLAMS SHUT on the Promised Day; it opens again on the island.
// One material (paper.js), merged layers, instancing, no post pass, nothing
// allocated per frame; everything is disposed on exit.
// Card: lib/world/cutscene/cards/p-epsilon-hollow.js. Parts: ./p-epsilon-hollow/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { cutsceneMode } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { alphonse, chalkGeometry, colonyPupGeometry, edward, father, may, soldier } from "./p-epsilon-hollow/cast";
import { bolts, coat, covers, gate, particles, pupPaper } from "./p-epsilon-hollow/fx";
import { KIND, circlePts, cutShape, disposeTexture, layer, paperMaterial, ringShape } from "./p-epsilon-hollow/paper";
import { OUTER_WORLD_R, SPHERE_AT, T as ST, buildSphere } from "./p-epsilon-hollow/sphere";
import { COB_H, DS, FATHER_AT, HQ_Z, STEP_TOP, buildWorld, hash } from "./p-epsilon-hollow/world";

// the hit-stops (real seconds): the banner slam, the clap, the slam, the book's slam
const STOPS = [[0, 0.08], [3.0, 0.12], [3.6, 0.08]]; // on the warped clock; the book's slam is added at the close
const SHAKES = [[0.0, 0.06, 0.1], [3.0, 0.14, 0.12], [3.6, 0.3, 0.36]]; // [start, length, amplitude]
const ED = [-3.0, COB_H, -2.0];
const AL = [-6.4, COB_H, -5.6];
const MAY = [5.6, STEP_TOP, -16.2];
const SOLDIERS = [[6.8, -3.4], [4.4, -6.8], [-9.6, -9.0]];
const BANNER_ACCENT = "#c8352b";
const SHAFT_BOTTOM = SPHERE_AT[1] - OUTER_WORLD_R;

const HOLD = 1.5; // s the clap is pushed back so line A can be read
const warp = (t) => (t < 1.2 ? t : t < 4.5 ? 1.2 + (t - 1.2) * ((3.0 - 1.2) / (4.5 - 1.2)) : t - HOLD);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const D = new Object3D();

// May's fan of kunai stuck in the stone beside her (static card)
function kunai() {
  const L = layer();
  for (let k = 0; k < 5; k++) {
    const a = (k - 2) * 0.3;
    L.add(cutShape([[-0.05, 0], [0.05, 0], [0.0, 1.5]], 0.04), "#9aa3b8", {}, MAY[0] - 1.6 + (k - 2) * 0.22, STEP_TOP, MAY[2] + 0.6, 0, 0, a);
    L.add(ringShape(0.05, 0.1, 0.04, 8), "#c8a04a", {}, MAY[0] - 1.6 + (k - 2) * 0.22 + Math.sin(a) * 1.5, STEP_TOP + Math.cos(a) * 1.5, MAY[2] + 0.6);
  }
  return L.build();
}
// a soldier's chalk circle: a hinged card at his feet, tipped toward the lens
const chalkAt = (i) => [SOLDIERS[i][0] + (SOLDIERS[i][0] < 0 ? 1.7 : -1.7), 0.18 + COB_H, SOLDIERS[i][1] + 1.0];

// every part of the scene, built once. The seal's approach builds them early (prewarm below) so the arrival's first frame does not stall.
function build() {
  const mat = paperMaterial();
  const glowMat = paperMaterial();
  const world = buildWorld(mat);
  const sphere = buildSphere(mat, world.tiles);
  const fd = father(mat);
  const ed = edward(mat);
  const al = alphonse(mat, glowMat);
  const my = may(mat);
  const sol = SOLDIERS.map(() => soldier(mat));
  const chalk = chalkGeometry();
  const chalkDisc = SOLDIERS.map(() => new Mesh(chalk.disc, mat));
  const chalkLine = SOLDIERS.map(() => new Mesh(chalk.lines, new MeshBasicMaterial({ color: "#bfe0ff", toneMapped: false })));
  const may2 = (() => {
    const L = layer();
    L.add(cutShape(circlePts(0.9, 28), 0.04), "#3a2a12", {});
    L.add(ringShape(0.7, 0.8, 0.02, 28), "#ffd36a", { kind: KIND.foil, emit: 0.9, noEdge: true }, 0, 0, 0.05);
    L.add(ringShape(0.3, 0.36, 0.02, 20), "#ffd36a", { kind: KIND.foil, emit: 0.9, noEdge: true }, 0, 0, 0.05);
    for (let k = 0; k < 6; k++) L.add(cutShape([[-0.03, 0], [0.03, 0], [0.03, 0.74], [-0.03, 0.74]], 0.02), "#ffd36a", { kind: KIND.foil, emit: 0.9, noEdge: true }, 0, 0, 0.05, 0, 0, (k / 6) * Math.PI);
    return new Mesh(L.build(), mat);
  })();
  const stat = new Mesh(kunai(), mat);
  stat.frustumCulled = false;
  const colony = new InstancedMesh(colonyPupGeometry(), mat, 6);
  colony.frustumCulled = false;
  // the steps rise toward the building: step k tops out at (k + 1) * 0.3 m, its centre (4.9 - 0.9 k) m in front of the facade
  const cp = [[-2.6, 3], [2.4, 3], [-4.4, 2], [4.0, 2], [-6.5, 1], [6.5, 1]].map(([x, k], i) => ({ x, y: (k + 1) * 0.3, z: HQ_Z + 4.9 - 0.9 * k, p: hash(i, 4) }));
  const bl = bolts(mat);
  const spark = particles(mat, [
    { n: 30, at: [0, 1.05, 0.7], t0: 3.04, speed: 7, up: 0.3, life: 0.6, g: 3, size: 0.12, colors: ["#e6f4ff", "#9fd2ff", "#ffffff"], seed: 1 },
    { n: 28, at: [0, 0.25, 0.4], t0: 3.62, speed: 9, up: 0.15, vy: 0.7, life: 0.8, g: 7, size: 0.13, colors: ["#ffd36a", "#9fd2ff", "#ffffff"], seed: 2 },
    ...SOLDIERS.map((_, i) => ({ n: 8, at: chalkAt(i), t0: 2.0 + i * 0.1, speed: 3, up: 0.6, life: 0.5, g: 5, size: 0.07, colors: ["#cfe6ff", "#ffffff"], seed: 3 + i })),
    { n: 16, at: [ED[0], 1.5, ED[2] + 0.3], t0: 1.95, spread: 0.6, speed: 0.7, up: 0.1, upVar: 0.2, life: 1.5, g: 0.7, size: 0.07, colors: ["#8b7f94", "#6b6070"], seed: 9 },
    { n: 10, at: [ED[0], 1.5, ED[2] + 0.3], t0: 1.95, speed: 2.4, up: 0.5, life: 0.3, g: 6, size: 0.06, colors: ["#bfe0ff", "#ffffff"], seed: 11 },
    { n: 56, at: [0, 0.3, -2], r: 9, t0: 3.7, spread: 1.5, speed: 3, up: 1.4, vy: 1.4, life: 1.3, g: 8, size: 0.14, colors: ["#e8dcc0", "#b9583b", "#4b5675", "#cf9d55"], seed: 13 },
  ]);
  const gt = gate(mat);
  const cv = covers(mat);
  const flash = flashQuad("#cfe6ff");
  return { mat, glowMat, world, sphere, fd, ed, al, my, sol, chalk, chalkDisc, chalkLine, may2, stat, colony, cp, bl, spark, gt, cv, flash };
}

// ---- PREWARM: within 48 m of the dock the parts are built and every program is compiled in the live pipeline: all of it drawn at
// scale ~0 for three frames, then taken away. The arrival then finds them ready; nothing is built or compiled on its first frame.
let PRE = null;
let PAINT = null;
function takeParts() {
  const p = PRE;
  PRE = null;
  return p?.m ?? build();
}
function warmUp(w) {
  const m = build();
  PRE = { m };
  const root = new Group();
  root.scale.setScalar(0.0001);
  root.position.set(live.seal.x, -400, live.seal.z);
  const kept = [];
  const mine = [m.world.group, m.sphere.group, m.fd.root, m.ed.root, m.al.root, m.my.root, ...m.sol.map((x) => x.root), ...m.chalkDisc, ...m.chalkLine, m.may2, m.stat, m.colony, m.bl.mesh, m.spark.mesh, m.gt.root, m.cv.root, m.flash];
  for (const o of mine) {
    o.traverse((x) => kept.push([x, x.visible]));
    root.add(o);
  }
  for (const [x] of kept) x.visible = true;
  // the pup's cut-out look: its own twin programs, drawn through stand-in meshes
  const p = pupParts(w.scene);
  const paint = p?.root ? pupPaper(p.root) : null;
  PAINT = paint;
  const stand = paint ? paint.stand() : [];
  for (const x of stand) root.add(x);
  w.scene.add(root);
  let n = 0;
  const done = () => {
    if (++n < 4) return requestAnimationFrame(done);
    for (const o of mine) o.removeFromParent();
    for (const [x, v] of kept) x.visible = v;
    for (const x of stand) x.removeFromParent();
    root.removeFromParent();
  };
  requestAnimationFrame(done);
}
if (typeof window !== "undefined" && cutsceneMode("p-epsilon-hollow") === "full") {
  const dock = PLACE_BY_ID["p-epsilon-hollow"];
  const poll = setInterval(() => {
    const w = window.__world;
    if (!w?.scene || !live.seal) return;
    if (Math.hypot(live.seal.x - dock.x, live.seal.z - dock.z) > 48) return;
    clearInterval(poll);
    warmUp(w);
  }, 400);
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const shake = useRef(new Vector3());
  const pup = useRef(null);
  const paint = useRef(null);
  const cloak = useRef(null);
  const island = useRef([]);
  const flaps = useRef(null);
  const banner = useRef(null);
  const last = useRef({ frame: -1, clap: 0 });

  const m = useMemo(takeParts, []);

  // the island list is taken before the stage hides it; the pup is cut from card and takes a red coat
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    paint.current = PAINT ?? (p?.root ? pupPaper(p.root) : null);
    PAINT = null;
    cloak.current = p?.rear ? coat(p.rear, m.mat) : null;
    // the pup's flippers (in the body group): the left one, and the mirrored right one
    const kids = p?.rear?.children ?? [];
    flaps.current = { l: kids[1] ?? null, r: kids[2]?.children?.[0] ?? null };
    return () => {
      paint.current?.dispose();
      paint.current = null;
      cloak.current?.dispose();
      cloak.current = null;
      pup.current = null;
      m.world.dispose();
      m.sphere.dispose();
      m.bl.dispose();
      m.spark.dispose();
      m.gt.dispose();
      m.cv.dispose();
      for (const x of [m.chalk.disc, m.chalk.lines, m.stat.geometry, m.may2.geometry, m.colony.geometry, m.flash.geometry]) x.dispose();
      for (const f of [m.fd, m.ed, m.al, m.my, ...m.sol]) f.root.traverse((o) => o.isMesh && o.geometry.dispose());
      for (const l of m.chalkLine) l.material.dispose();
      m.colony.dispose();
      for (const x of [m.mat, m.glowMat, m.flash.material]) x.dispose();
      disposeTexture();
    };
  }, [scene, m]);

  // THE BANNER: the island's own area banner, reused (.hud-banner): the cream plate, the accent band, the name big; it slams in
  // at 0 s with a blue-white spark and shrinks up into the top cinema bar at 1.6 s. Reduced motion draws none.
  useEffect(() => {
    if (mode !== "full") return undefined;
    const el = document.createElement("div");
    el.className = "hud-banner";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;z-index:45;width:min(1100px,calc(100vw - 48px));pointer-events:none;--accent:${BANNER_ACCENT};opacity:0;transform-origin:50% 0;`;
    el.innerHTML =
      '<span class="hud-banner-band"></span><h2 class="hud-banner-name">THE PROMISED DAY</h2>' +
      '<p class="hud-banner-lab"><strong>Epsilon-Hollow</strong> &middot; lab</p><p class="hud-banner-lab" style="margin-top:6px;font-size:15px">Memory, files and scheduler, on one sphere.</p>' +
      '<i class="spark" style="position:absolute;left:50%;top:44%;width:34vmin;height:34vmin;margin:-17vmin 0 0 -17vmin;border-radius:50%;background:radial-gradient(circle,#fff 0%,#cfe9ff 18%,rgba(120,180,255,0.55) 38%,rgba(120,180,255,0) 66%);z-index:-1;opacity:0"></i>';
    document.body.appendChild(el);
    banner.current = { el, spark: el.querySelector(".spark") };
    return () => {
      el.remove();
      banner.current = null;
    };
  }, [mode]);

  // impacts shake the whole frame two drawings each: the book and the pup together (after Seal.jsx places it)
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      paint.current?.set(false);
      if (cloak.current) cloak.current.group.visible = false;
      if (banner.current) banner.current.el.style.opacity = 0;
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(shake.current);
      p.root.position.y += COB_H * 0.9;
    }
  }, -0.5);

  // the flippers, after the pup's own pose (same priority, mounted later): the clap
  useFrame(() => {
    const f = flaps.current;
    if (!f || !live.arrival.id || mode !== "full") return;
    const k = last.current.clap;
    if (k > 0.001 && f.l && f.r) {
      f.l.rotation.set(0.1, -1.25 * k + (1 - k) * f.l.rotation.y, 0.35 * k + (1 - k) * f.l.rotation.z, "YZX");
      f.r.rotation.set(0.1, -1.25 * k + (1 - k) * f.r.rotation.y, 0.35 * k + (1 - k) * f.r.rotation.z, "YZX");
    }
  }, 0);

  useCutFrame((t, state) => {
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) {
      paint.current?.set(false);
      if (cloak.current) cloak.current.group.visible = false;
      shake.current.set(0, 0, 0);
      return;
    }
    const s = live.seal;
    const cam = state.camera;
    // the hit-stops: the whole book holds one drawing
    // the clock: A is read over a slow hold of the alchemy (1.2 -> 4.5 s plays 1.2 -> 3.0 of the choreography), then the clap lands
    // at 4.5 s with B on screen; the book's own slam freezes one drawing at the close
    const w = warp(t);
    const E = tl.collapse[0] - HOLD; // the choreography's clock at the collapse
    const q = (c) => E + c - 9.3; // the closing beats, authored against a 9.3 s collapse
    let v = w;
    for (const [a, d] of STOPS) if (w >= a && w < a + d) v = a;
    if (w >= q(9.3) && w < q(9.4)) v = q(9.3);
    const tt = onTwos(v);
    const frame = Math.floor(tt * 12);
    const u = m.mat.uniforms;
    const gu = m.glowMat.uniforms;

    // the shake: two drawings each, the book and the pup together
    let amp = 0;
    for (const [a, d, k] of SHAKES) if (w >= a && w < a + d) amp = k * (1 - (w - a) / d);
    if (w >= q(9.3) && w < q(9.64)) amp = 0.4 * (1 - (w - q(9.3)) / 0.34);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    shake.current.set(amp * odd, -amp * 0.5 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);

    // the book is open for the scene, and gone once its covers are shut
    const gone = w >= q(9.45);
    m.world.group.visible = !gone;
    m.sphere.group.visible = !gone && tt >= ST.build0 && w < q(9.1);
    // the covers hang before the lens and fill it: a leaf of 12 m, fitted to the frustum 7 m out
    const fovH = 2 * 7 * Math.tan((cam.fov * Math.PI) / 360);
    m.cv.root.quaternion.copy(cam.quaternion);
    m.cv.root.position.set(0, 0, -7).applyQuaternion(cam.quaternion).add(cam.position).sub(g.position);
    m.cv.root.scale.setScalar((fovH * 1.1) / 12);
    m.cv.title.scale.setScalar(Math.min(1, (0.88 * cam.aspect * 12) / 14));
    // the covers: swing shut 9.0 -> 9.3, hold, spring open 9.75 -> 10.0
    m.cv.set(smooth(q(9.0), q(9.3), w) * (1 - smooth(q(9.75), q(10.0), w)));

    // ---- THE PAGE: each layer pops up off the page on its fold (0 -> 0.55), and folds flat again as the book closes (8.7 -> 9.1)
    for (const f of m.world.folds) {
      const pop = smooth(0.04 * f.order, 0.5 + 0.05 * f.order, tt);
      const shut = smooth(q(8.7) + 0.05 * f.order, q(9.05) + 0.05 * f.order, tt);
      const amt = 1 - pop * (1 - shut);
      const over = 1 + 0.06 * Math.sin(Math.PI * clamp(pop * 1.4, 0, 1)); // a little overshoot as it clicks into place
      if (f.axis === "x") f.g.rotation.x = f.sign * (Math.PI / 2) * amt * over;
      else f.g.rotation.z = f.sign * (Math.PI / 2) * amt;
    }
    // the day ends: the black sun slides off the corona and the card sky warms toward dawn
    const dawn = smooth(q(7.2), q(8.6), tt);
    m.world.sunDisc.position.x = 20 * dawn;
    m.mat.uniforms.uDawn.value = m.glowMat.uniforms.uDawn.value = dawn;
    // the eclipse: the corona foil turns slowly, shimmering
    m.world.cA.rotation.z = tt * 0.03;
    m.world.cB.rotation.z = -tt * 0.045;

    // ---- the alchemy's uniforms
    const push = smooth(4.9, 5.1, tt) * (1 - smooth(5.5, 5.7, tt)); // Father pushes at the shell
    for (const x of [u, gu]) {
      x.uTime.value = tt;
      x.uFather.value.set(FATHER_AT[0], FATHER_AT[1], FATHER_AT[2]);
      x.uFlood.value = smooth(0.8, 1.9, tt) * 120;
      x.uWave.value = tt > 1.2 && tt < 2.5 ? (tt - 1.2) * 20 : -50;
      x.uCrack.value = tt > 3.8 ? 3 + (tt - 3.8) * 26 : 0;
      x.uPulse.value = Math.max(0, (tt - 3.6) * 26);
      x.uPulseK.value = smooth(3.6, 3.78, tt) * (1 - 0.35 * smooth(q(8.8), q(9.2), tt));
      x.uDim.value = 1 - 0.06 * push * (0.5 + 0.5 * Math.sin(tt * 40));
    }
    gu.uGlow.value = 0.2 + 1.9 * bump(tt, 7.75, 0.4); // Alphonse's helm glow answers the landing, once

    // ---- FATHER on the steps: the hand rises (0.6 -> 1.5), sinks a little after the slam, pushes at 4.9
    const fd = m.fd;
    fd.root.position.set(FATHER_AT[0], FATHER_AT[1], FATHER_AT[2]);
    fd.root.scale.setScalar(5.4);
    const rise = smooth(0.6, 1.5, tt);
    const sink = 0.2 * smooth(3.8, 5.0, tt);
    fd.arm.rotation.z = -Math.PI + 0.12 + rise * (Math.PI - 0.12 - 0.34) - sink + push * 0.25;
    fd.root.rotation.z = -0.03 * push;
    fd.root.rotation.x = -(Math.PI / 2) * smooth(q(8.8), q(9.1), tt);
    fd.eyes.visible = tt > 0.72;

    // ---- the witnesses
    const gust = 0.05 + bump(tt, 4.3, 1.6) + 0.5 * bump(tt, 3.1, 0.3);
    const wob = Math.sin(tt * 9);
    const ed = m.ed;
    ed.root.position.set(ED[0], ED[1], ED[2]);
    ed.root.scale.setScalar(2.2);
    // Edward claps (1.7 -> 1.95), gets a fizzle, and stares at his hands
    const clapE = smooth(1.7, 1.95, tt);
    ed.armL.rotation.z = clapE * 1.25 + 0.04 * Math.sin(tt * 2);
    ed.armR.rotation.z = -(clapE * 1.25 + 0.04 * Math.sin(tt * 2));
    ed.tails.rotation.z = 0.08 * Math.sin(tt * 2.3) + gust * 0.38 * wob;
    ed.braid.rotation.z = 0.05 * Math.sin(tt * 2.6) + gust * 0.3 * Math.sin(tt * 11 + 1);
    ed.root.rotation.x = -(Math.PI / 2) * smooth(q(8.85), q(9.15), tt);
    const al = m.al;
    al.root.position.set(AL[0], AL[1], AL[2]);
    al.root.scale.setScalar(4.4);
    al.plume.rotation.z = -0.12 + 0.1 * Math.sin(tt * 2.1) - gust * 0.4 * Math.sin(tt * 10 + 2);
    al.root.rotation.x = -(Math.PI / 2) * smooth(q(8.9), q(9.2), tt);
    const my = m.my;
    my.root.position.set(MAY[0], MAY[1], MAY[2]);
    my.root.scale.setScalar(1.8);
    my.panda.position.set(0.13 - 0.1 * smooth(3.6, 3.75, tt), 0.54 - 0.06 * smooth(3.6, 3.75, tt), 0);
    my.panda.scale.setScalar(1 - 0.35 * smooth(3.6, 3.75, tt) + 0.35 * smooth(4.6, 4.9, tt));
    my.root.rotation.x = -(Math.PI / 2) * smooth(q(8.95), q(9.25), tt);
    m.may2.position.set(MAY[0] + 0.4, MAY[1] + 1.2, MAY[2] + 1.3);
    m.may2.rotation.x = -0.45;
    m.stat.rotation.x = -(Math.PI / 2) * smooth(q(8.95), q(9.25), tt);
    // the soldiers and their chalk circles: lit, then sputtering, dead, each with a last spark
    SOLDIERS.forEach(([x, z], i) => {
      const sd = m.sol[i];
      sd.root.position.set(x, COB_H, z);
      sd.root.scale.setScalar(3.0);
      sd.root.rotation.y = x < 0 ? 0.3 : -0.3;
      sd.root.rotation.x = -(Math.PI / 2) * smooth(q(8.8) + i * 0.05, q(9.1) + i * 0.05, tt);
      const c = chalkAt(i);
      m.chalkDisc[i].position.set(c[0], c[1], c[2]);
      m.chalkDisc[i].rotation.x = -1.3;
      m.chalkDisc[i].scale.setScalar(1.25);
      m.chalkLine[i].position.copy(m.chalkDisc[i].position);
      m.chalkLine[i].rotation.copy(m.chalkDisc[i].rotation);
      m.chalkLine[i].scale.setScalar(1.25);
      const die = 1.65 + i * 0.12;
      const lit = tt < die ? 1 : tt < die + 0.45 ? (hash(frame, i + 3) > 0.45 + 0.4 * ((tt - die) / 0.45) ? 1 : 0) : 0;
      m.chalkLine[i].visible = lit > 0;
      m.chalkLine[i].material.color.set(tt < die ? "#bfe0ff" : "#ffeab0");
    });
    // the colony pups on the steps: they duck at the slam and cheer on twos as the sphere locks shut
    m.cp.forEach((c, i) => {
      const duck = bump(tt, 3.75, 0.35);
      const cheer = tt > 5.45 && tt < q(8.7) ? Math.abs(Math.sin(frame * 1.6 + c.p * 9)) * 0.42 * (frame % 2 ? 1 : 0.4) : 0;
      D.position.set(c.x, c.y + cheer, c.z);
      D.rotation.set(-(Math.PI / 2) * smooth(q(9.0), q(9.3), tt), 0, 0);
      D.scale.set(1.9, 1.9 * (1 - 0.4 * duck), 1.9);
      D.updateMatrix();
      m.colony.setMatrixAt(i, D.matrix);
    });
    m.colony.instanceMatrix.needsUpdate = true;

    // ---- THE COBBLES: each on its own far-edge hinge; the wave rattles them, the slam stands the chosen ones into columns
    if (frame !== last.current.frame) {
      last.current.frame = frame;
      const tiles = m.world.tiles;
      const cob = m.world.cobbles;
      for (let i = 0; i < tiles.length; i++) {
        const c = tiles[i];
        const j = m.sphere.chosen[i];
        let ang = bump(tt, 1.2 + c.d / 20, 0.32) * (0.18 + 0.38 * c.h) * (frame % 2 ? 1 : 0.35); // the pressure wave rattles each one on its hinge
        let hide = false;
        if (j >= 0) {
          const t0 = m.sphere.src[j].t0;
          ang += smooth(t0 - 0.4, t0 - 0.05, tt) * 1.5;
          hide = tt >= t0 + 0.1;
        } else {
          ang += (0.35 + 0.5 * c.h) * bump(tt, 3.72 + c.d / 24, 0.25) * (frame % 2 ? 1 : 0.6);
        }
        D.position.set(c.x, hide ? -9 : 0.0, c.z - 0.43);
        D.rotation.set(-ang, 0, 0);
        D.scale.setScalar(hide ? 0.0001 : 1);
        D.updateMatrix();
        cob.setMatrixAt(i, D.matrix);
      }
      cob.instanceMatrix.needsUpdate = true;
      // the pennants snap
      for (let i = 0; i < 9; i++) {
        D.position.set(-14.4 + i * 3.6, 11.2, -0.4);
        D.rotation.set(0, 0.5 + 0.7 * Math.sin(frame * 1.9 + i * 1.7), 0.1 * Math.sin(frame * 2.3 + i));
        D.scale.setScalar(1);
        D.updateMatrix();
        m.world.pen.setMatrixAt(i, D.matrix);
      }
      m.world.pen.instanceMatrix.needsUpdate = true;
    }

    // the dock's shaft: a short mast at first, rising with the sphere
    const top = 1.6 + (SHAFT_BOTTOM - 1.6) * smooth(ST.lift[0], ST.lift[1], tt);
    m.world.shaft.scale.set(1, Math.max(0.1, (top - 0.875) / DS), 1);
    m.world.shaft.position.y = 0.7;
    m.world.dock.visible = !gone && w < q(9.1);

    // ---- THE SPHERE, the lightning, the sparks, the Gate
    m.sphere.update(tt);
    m.bl.update(tt, tt > 3.6 ? (tt - 3.6) * 24 : -1, COB_H + 0.12, frame);
    m.bl.mesh.visible = tt > 3.6 && tt < 5.6;
    m.spark.update(tt);
    m.gt.root.position.set(0, 0.2, -12.5);
    m.gt.root.scale.setScalar(1.3);
    m.gt.set(w);

    // ---- THE PUP: a cut-out figure in a red coat; a clap (hit-stop, the Gate), a slam on the stone; no circle is ever drawn
    last.current.clap = smooth(2.95, 3.0, w) * (1 - smooth(3.4, 3.55, w));
    const wind = smooth(2.5, 2.95, w) * (1 - smooth(3.0, 3.06, w));
    const slam = smooth(3.4, 3.58, w) * (1 - smooth(3.64, 3.95, w));
    const hold = 0.55 * smooth(3.9, 4.2, w) * (1 - smooth(q(8.6), q(9.0), w));
    live.pose.crouch = Math.max(wind * 0.7, slam, hold);
    paint.current?.set(tt > 0.1 && !gone);
    const c = cloak.current;
    if (c) {
      c.group.visible = tt > 0.1 && !gone;
      c.group.rotation.x = -0.1 * Math.sin(tt * 6) * (0.4 + gust) - 0.08 - 0.12 * bump(tt, 3.7, 0.5);
      c.group.rotation.z = 0.05 * Math.sin(tt * 4.4) * gust;
    }

    // ---- THE BANNER, drawn by hand at 12 a second
    const b = banner.current;
    if (b) {
      const inK = clamp(t / 0.12, 0, 1);
      const out = smooth(1.6, 1.95, t);
      b.el.style.opacity = t < 2.0 ? (1 - out).toFixed(2) : 0;
      b.el.style.transform = `translateY(${(-24 * (1 - inK) - out * 21).toFixed(1)}vh) scale(${((0.96 + 0.04 * inK) * (1 - 0.7 * out)).toFixed(3)})`;
      b.spark.style.opacity = (bump(t, 0.12, 0.28) * 0.95).toFixed(2);
      b.spark.style.transform = `scale(${(0.5 + 1.5 * clamp(t / 0.4, 0, 1)).toFixed(2)})`;
    }

    // ---- the flashes: a cool spark at the clap, gold at the slam (tinted, never a white-out)
    m.flash.material.color.set(w > 3.3 ? "#ffe2a0" : "#cfe6ff");
    holdFlash(m.flash, cam, bump(w, 3.04, 0.07) * 0.2 + bump(w, 3.64, 0.09) * 0.22);

    // the island the stage hid comes back while the covers are shut
    if (w > q(9.5) && t < tl.collapse[1] + 0.4) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <primitive object={m.world.group} />
        <primitive object={m.sphere.group} />
        <primitive object={m.fd.root} />
        <primitive object={m.ed.root} />
        <primitive object={m.al.root} />
        <primitive object={m.my.root} />
        {m.sol.map((x, i) => (
          <primitive key={i} object={x.root} />
        ))}
        {m.chalkDisc.map((x, i) => (
          <group key={i}>
            <primitive object={x} />
            <primitive object={m.chalkLine[i]} />
          </group>
        ))}
        <primitive object={m.may2} />
        <primitive object={m.stat} />
        <primitive object={m.colony} />
        <primitive object={m.bl.mesh} />
        <primitive object={m.spark.mesh} />
        <primitive object={m.gt.root} />
        <primitive object={m.cv.root} />
      </group>
    </>
  );
}
