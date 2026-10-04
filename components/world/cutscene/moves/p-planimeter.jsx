"use client";

// Planimeter: Classroom of the Elite, Ayanokoji's exact fifty, on the Advanced Nurturing High School campus, in the
// SWISS-GRID dimension: a clinical poster of flat fields on a chessboard grid. The island becomes the walled campus on
// Tokyo Bay on exam day (a long low concrete block with a glass third floor, a plaza laid as a giant chessboard, a cherry
// avenue to the bridge gate, mall, dormitories, track, sea wall, suspension bridge, the Tokyo skyline). The pup is
// Ayanokoji in the back-row window seat, in a crimson blazer, half-lidded, gazing out at the sea. At the bell the
// midterm sheets blow out of 1-D's windows and drift over the campus. Sudo slams his basketball: every sheet snaps shut,
// filled, nothing blank. Chabashira's red pen sweeps a checking line from the building to the sea wall: wrong answers turn
// coral and tumble away on the wind (the guess, shapely). The pup taps its desk once: the exact sheets snap amber and
// the gatehouse stamps EXACT on each; over the near-miss the flipper hovers (HMM.) and the bridge gate drops, the open
// sheets held amber. The camera drops to the plaza: one white piece moves one square and clicks; Sakayanagi lays her
// king down: CHECKMATE. The game is over, so the board is cleared square by square and the real island is underneath:
// that is why we come home. Shape, colour and pose only. Card: lib/world/cutscene/cards/p-planimeter.js.
// Cost: about 45 draws, about 40k triangles, no post pass. Parts: ./p-planimeter/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, Object3D, SphereGeometry, Vector3, WebGLRenderTarget } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { HORIKITA } from "../../../../lib/world/cutscene/cards/p-planimeter.js";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { flipperTip, sealRig, useLineSwitch } from "./g5/fx";
import { GATE_AT, HORIKITA_AT, PODIUM, SEAT, SHOTS, SQUARE, STAND, T, TABLE_AT } from "./p-planimeter/layout";
import { SW, Mesher, makeLook, piece, swatchAttr } from "./p-planimeter/swiss";
import { ISLAND, benchGeometry, campusGeometry, chessGeometry, cloudGeometry, glassGeometry, hash, lampGeometry, petalGeometry, seaGeometry, skyMaterial, skylineGeometry, treeGeometry, windowGeometry } from "./p-planimeter/campus";
import { blazer, chabashira, colonyFlipper, colonyPup, horikita, pupSoft, ryuuen, sakayanagi, seatedLegs, standingLegs, sudo } from "./p-planimeter/cast";
import { boom, chessTable, gantry, gantryPost, gateGlass, gateKiosk, lampBulb, lampBulbCoral, stampArm } from "./p-planimeter/props";
import { disposePlane, holdBanner, holdOnScreen, poster, titleBanner } from "./p-planimeter/poster";
import { makeSheets } from "./p-planimeter/sheets";

const S = SW;
const CORE_Y = 0.9;
const V = new Vector3();
const W = new Vector3();
const O = new Object3D();
const MB = new Matrix4();
const MF = new Matrix4();
const lerp = (a, b, k) => a + (b - a) * k;

// the chess set on the plaza's squares (i, j): [kind, white, i, j, role]
const PIECES = [
  ["pawn", true, 6, 2, "mover"],
  ["pawn", true, 4, 1],
  ["king", false, 3, 2],
  ["queen", false, 7, 3],
  ["knight", true, 2, 4],
  ["bishop", true, 4, 5],
  ["rook", false, 1, 6],
  ["pawn", false, 5, 5],
];
const COLONY = 16;
const WAVES = 44;
const PETALS = 130;
const TREES = [];
for (const x of [36, 40, 44]) TREES.push([x, -11.6], [x, -0.4]); // the avenue's first leg
for (let z = -10; z >= -54; z -= 4) TREES.push([43, z], [53, z]); // round the east end to the gate
for (const [x, z] of [[-2, -10], [-2, -2], [-2, 6], [-2, 14], [34, 8], [34, 14], [-14, -8], [-14, 4], [-24, -10], [-24, 2], [-30, 12], [-10, 16], [10, 22.8]]) TREES.push([x, z]);

// The scene's meshes are built a slice at a time (one `yield` between slices, about 16 ms each): no frame stalls on the mount.
function* build() {
    const look = makeLook();
    const wm = look.make({}); // the campus: grid and clear
    const cm = look.make({ grid: false, clear: false }); // the cast and props: their own frame
    const gm = look.make({ transparent: true, alpha: 0.3, grid: false, clear: true });
    const gl = look.make({ transparent: true, alpha: 0.3, grid: false, clear: false }); // glass that stands in its own frame
    const mesh = (g, mat = wm, ro = 0) => {
      const o = new Mesh(g, mat);
      o.frustumCulled = false;
      o.renderOrder = ro;
      return o;
    };
    const inst = (g, mat, n) => {
      const o = new InstancedMesh(g, mat, n);
      o.frustumCulled = false;
      return o;
    };
    const place = (i, im, x, y, z, ry = 0, sc = 1) => {
      O.position.set(x, y, z);
      O.rotation.set(0, ry, 0);
      O.scale.setScalar(sc);
      O.updateMatrix();
      im.setMatrixAt(i, O.matrix);
    };
    const campus = mesh(campusGeometry());
    const glass = mesh(glassGeometry(), gm, 6);
    const sea = mesh(seaGeometry());
    yield;
    const trees = inst(treeGeometry(), wm, TREES.length);
    TREES.forEach(([x, z], i) => place(i, trees, x, 0, z, hash(i, 3) * 6.28, 0.9 + 0.25 * hash(i, 4)));
    const benchAt = [];
    for (let z = -16; z >= -52; z -= 12) benchAt.push([44.7, z, Math.PI / 2], [51.3, z, -Math.PI / 2]);
    benchAt.push([20, -10.6, 0], [26, -10.6, 0], [34.6, -8.6, 0]);
    const benches = inst(benchGeometry(), wm, benchAt.length);
    benchAt.forEach(([x, z, r], i) => place(i, benches, x, 0, z, r));
    const lampAt = [];
    for (let z = -8; z >= -54; z -= 8) lampAt.push([45.6, z], [50.4, z]);
    for (let x = 36; x <= 44; x += 4) lampAt.push([x, -4.4], [x, -7.8]);
    for (let x = 4; x <= 28; x += 8) lampAt.push([x, -12.6]);
    const lamps = inst(lampGeometry(), wm, lampAt.length);
    lampAt.forEach(([x, z], i) => place(i, lamps, x, 0, z));
    yield;
    // the Tokyo skyline across the water, a bank of pale towers
    const SK = 110;
    const skyline = inst(skylineGeometry(), wm, SK);
    const skA = swatchAttr(skyline, SK, S.PALEBLUE);
    for (let i = 0; i < SK; i++) {
      const u = i / SK;
      const h = 14 + 78 * hash(i, 2) ** 1.7 * (1 - Math.abs(u - 0.5) * 0.9);
      O.position.set((u - 0.5) * 420 + (hash(i, 1) - 0.5) * 6, 1.0, -226 + hash(i, 3) * 14);
      O.rotation.set(0, 0, 0);
      O.scale.set(7 + 9 * hash(i, 4), h, 7 + 8 * hash(i, 5));
      O.updateMatrix();
      skyline.setMatrixAt(i, O.matrix);
      skA.array[i] = hash(i, 6) < 0.25 ? S.SLATE : hash(i, 6) < 0.5 ? S.GLACIER : S.PALEBLUE;
    }
    yield;
    const clouds = inst(cloudGeometry(), wm, 7);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      place(i, clouds, Math.cos(a) * (70 + 30 * hash(i, 1)) + 20, 62 + 22 * hash(i, 2), Math.sin(a) * (70 + 25 * hash(i, 3)) - 30, hash(i, 4) * 3, 0.8 + 0.7 * hash(i, 5));
    }
    // the dormitory windows catch the low sun
    const WIN = [];
    for (const [x, z, , rows] of [[30, -48.5, 38, 11], [40, -50.5, 32, 9]]) for (let r = 0; r < rows; r++) for (let c = -1; c <= 1; c++) WIN.push([x + c * 2.1, 2.6 + r * 3.2, z + 0.03]);
    const dorm = inst(windowGeometry(), wm, WIN.length);
    const dormA = swatchAttr(dorm, WIN.length, S.GLACIER);
    WIN.forEach(([x, y, z], i) => place(i, dorm, x, y, z));
    const petals = inst(petalGeometry(), wm, PETALS);
    const waves = inst(piece(new BoxGeometry(1, 0.1, 0.3), S.PALEBLUE), wm, WAVES);
    yield;
    // the ferry
    const fg = new Mesher();
    fg.slab(-8, 0, -1.8, 8, 1.3, 1.8, S.DEEP);
    fg.slab(-8, 1.3, -1.8, 8, 1.45, 1.8, S.CONCRETE);
    fg.slab(-3, 1.45, -1.4, 4, 3.4, 1.4, S.CONCRETE);
    fg.slab(-2.4, 2.1, -1.45, 3.4, 2.7, 1.45, S.GLACIER);
    fg.slab(-5, 1.45, -0.5, -4, 3.9, 0.5, S.CRIMSON);
    const ferry = mesh(fg.build(), cm);
    yield;
    // the gatehouse
    const kiosk = mesh(gateKiosk(), cm);
    const kioskGlass = mesh(gateGlass(), gl, 6);
    const arm = mesh(stampArm(), cm);
    const bar = mesh(boom(), cm);
    const lampA = mesh(lampBulb(), cm);
    const lampC = mesh(lampBulbCoral(), cm);
    yield;
    // the chess table, the pieces, the checking gantry
    const table = mesh(chessTable(), cm);
    const pieces = PIECES.map(([kind, white]) => mesh(piece(chessGeometry(kind), white ? S.CONCRETE : S.DEEP), cm));
    const gantryBar = mesh(gantry(), cm);
    const post = gantryPost();
    const postA = mesh(post, cm);
    const postB = mesh(post.clone(), cm);
    const kingSmall = mesh(piece(chessGeometry("king"), S.DEEP), cm);
    yield;
    // the cast
    const hori = horikita();
    const chab = chabashira();
    const ry = ryuuen();
    const mk = {
      horiUpper: mesh(hori.geo, cm),
      horiBraid: mesh(hori.braid, cm),
      horiSit: mesh(seatedLegs(), cm),
      horiStand: mesh(standingLegs(), cm),
      chabBody: mesh(chab.geo, cm),
      chabPony: mesh(chab.pony, cm),
      chabPen: mesh(chab.pen, cm),
      chabArmDown: mesh(chab.armDown, cm),
      chabArmUp: mesh(chab.armUp, cm),
      sudoBody: mesh(sudo(), cm),
      ball: mesh(piece(new SphereGeometry(0.24, 12, 8), S.AMBER), cm),
      saka: mesh(sakayanagi(), cm),
      ryBody: mesh(ry.geo, cm),
      ryCoat: mesh(ry.coat, cm),
    };
    yield;
    const colonyBody = inst(colonyPup(), cm, COLONY);
    const colonyL = inst(colonyFlipper(), cm, COLONY);
    const colonyR = inst(colonyFlipper(), cm, COLONY);
    yield;
    const sheets = makeSheets(look, { cluster: [5.5, -10], desk: [18.15, 7.3, -16.0], horikita: HORIKITA_AT });
    yield;
    const sky = new Mesh(new SphereGeometry(1, 28, 16), skyMaterial(look));
    sky.frustumCulled = false;
    yield;
    const banner = titleBanner();
    const hmm = poster("HMM.", "#a8222f", 800, 300);
    const mate = poster("CHECKMATE.", "#a8222f", 1600, 340);
    const all = [campus, glass, sea, trees, benches, lamps, skyline, clouds, dorm, petals, waves, ferry, kiosk, kioskGlass, arm, bar, lampA, lampC, table, ...pieces, gantryBar, postA, postB, kingSmall, ...Object.values(mk), colonyBody, colonyL, colonyR, ...sheets.objects];
    return { look, wm, cm, gm, gl, campus, dormA, WIN, petals, waves, ferry, kiosk, kioskGlass, arm, bar, lampA, lampC, table, pieces, gantryBar, postA, postB, kingSmall, ...mk, colonyBody, colonyL, colonyR, sheets, sky, banner, hmm, mate, all };
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const world = useRef();
  const shell = useRef();
  const pup = useRef(null);
  const island = useRef([]);
  const shot = useRef({ P: new Vector3(), psi: 0, off: new Vector3(), yaw: 0, turn: 0 });
  useLineSwitch(card, tl, HORIKITA); // Chabashira's line A gives way to Horikita's at the move beat
  const st = useRef({ revealed: false });
  const attach = useRef({ blazer: null, soft: null, flips: null });

  // built in slices, then warmed (compiled and uploaded off screen) before the world first shows
  const [m, setM] = useState(null);
  useEffect(() => {
    const it = build();
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      let r = it.next();
      while (!r.done && performance.now() - t0 < 16) r = it.next();
      if (r.done) setM(r.value);
      else raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!m) return undefined;
    island.current = scene.children.filter((o) => o.visible && !o.isLight && o.name !== "cutscene" && o.name !== "seal");
    const root = scene.getObjectByName("seal");
    const a = attach.current;
    if (root) {
      let head = null;
      let n = -1;
      root.traverse((o) => {
        if (o.type === "Group" && o.children.length > n) {
          n = o.children.length;
          head = o;
        }
      });
      const rear = head?.parent?.parent ?? null;
      pup.current = { root, head, rear };
      if (rear) {
        a.blazer = blazer({ rear, head });
        rear.add(a.blazer.g);
        const groups = rear.children.filter((o) => o.isGroup); // the left flipper, the mirrored right one, the tail, the neck
        a.flips = [groups[0], groups[1]];
      }
      a.soft = pupSoft(root);
    }
    return () => {
      a.flips?.forEach((f) => f && (f.visible = true));
      a.blazer?.dispose();
      a.soft?.dispose();
      a.blazer = a.soft = a.flips = null;
      pup.current = null;
      m.sheets.dispose();
      for (const o of m.all) {
        if (m.sheets.objects.includes(o)) continue;
        o.geometry?.dispose();
        o.dispose?.();
      }
      m.sky.geometry.dispose();
      for (const x of [m.wm, m.cm, m.gm, m.gl, m.sky.material]) x.dispose();
      disposePlane(m.banner.mesh);
      disposePlane(m.hmm);
      disposePlane(m.mate);
    };
  }, [scene, m]);

  // the pup, after Seal.jsx places it: brought toward the lens in the plaza shot, turned to its shot's yaw; a skip clears all
  useFrame(() => {
    if (!m) return;
    const p = pup.current;
    const a = attach.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      if (a.blazer) a.blazer.g.visible = false;
      a.soft?.set(false);
      a.flips?.forEach((f) => f && (f.visible = true));
      m.banner.mesh.visible = m.hmm.visible = m.mate.visible = false;
      return;
    }
    if (p?.root && mode === "full") {
      const sh = shot.current;
      const c = Math.cos(sh.turn);
      const n = Math.sin(sh.turn);
      p.root.position.x += sh.off.x * c + sh.off.z * n;
      p.root.position.z += sh.off.z * c - sh.off.x * n;
      p.root.rotation.y = sh.yaw + sh.turn;
    }
  }, -0.5);

  // WARM: while the scene opens on the pup, every mesh and material is drawn once into an 8 px target a slice per frame
  // (compiled, uploaded), so the first real draw of the world stalls nothing
  const warm = useRef({ k: 0, rt: null });
  useEffect(() => () => warm.current.rt?.dispose(), []);
  useFrame((state) => {
    const w = warm.current;
    if (!m || w.k < 0 || !live.arrival.id) return;
    const gl = state.gl;
    const a = attach.current;
    // phase 0: submit every program to the driver at once (KHR_parallel_shader_compile: no stall), then wait for them
    if (w.ready === undefined) {
      w.ready = false;
      const all = [m.all, [m.banner.mesh, m.hmm, m.mate]].flat().map((o) => [o, o.visible]);
      const gv0 = [rig.current, world.current, shell.current].map((o) => [o, o.visible]);
      for (const [o] of all) o.visible = true;
      for (const [o] of gv0) o.visible = true;
      const bz0 = a.blazer?.g.visible;
      if (a.blazer) a.blazer.g.visible = true;
      a.soft?.set(true);
      const done = () => (w.ready = true);
      gl.compileAsync(state.scene, state.camera).then(done, done);
      if (a.blazer) a.blazer.g.visible = bz0;
      a.soft?.set(false);
      for (const [o, v] of all) o.visible = v;
      for (const [o, v] of gv0) o.visible = v;
      return;
    }
    if (!w.ready) return;
    const CH = 9;
    const chunks = [];
    for (let i = 0; i < m.all.length; i += CH) chunks.push(m.all.slice(i, i + CH));
    chunks.push([m.banner.mesh, m.hmm, m.mate]);
    if (w.k >= chunks.length) {
      w.k = -1;
      w.rt?.dispose();
      w.rt = null;
      return;
    }
    const keep = [m.all, [m.banner.mesh, m.hmm, m.mate]].flat().map((o) => [o, o.visible]);
    const gv = [rig.current, world.current, shell.current].map((o) => [o, o.visible]);
    const last = w.k === chunks.length - 1;
    const pick = new Set(chunks[w.k]);
    for (const [o] of keep) o.visible = pick.has(o);
    for (const [o] of gv) o.visible = true;
    const bz = a.blazer?.g.visible;
    if (last) {
      if (a.blazer) a.blazer.g.visible = true;
      a.soft?.set(true);
    }
    // the composer's own input buffer: the same formats and samples as the real draw, so the driver's states are made now
    const into = window.__world?.composer?.inputBuffer ?? (w.rt ??= new WebGLRenderTarget(8, 8));
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(into);
    gl.render(state.scene, state.camera);
    gl.setRenderTarget(prev);
    if (last) {
      if (a.blazer) a.blazer.g.visible = bz;
      a.soft?.set(false);
    }
    for (const [o, v] of keep) o.visible = v;
    for (const [o, v] of gv) o.visible = v;
    w.k++;
  }, -0.45);

  useCutFrame((t, state) => {
    if (!m) return;
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    const cam = state.camera;
    const a = attach.current;
    const b = m.banner;

    // THE TITLE BANNER (element 1): drops in across the upper third the instant the scene starts, one overshoot, holds, rolls up
    {
      const W0 = innerWidth;
      const H0 = innerHeight;
      const wf = b.narrow ? (W0 - 32) / W0 : 0.8;
      const hf = Math.max(0.126, (wf * W0) / b.aspect / H0);
      const top = 0.112; // under the 9vh cinema bar
      let drop = 1;
      let roll = 0;
      if (full) {
        const [in1, hold, outT] = T.banner;
        const k = Math.min(1, t / in1);
        drop = smooth(0, 1, k) + 0.07 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - in1 * 0.7) / (in1 * 0.8))));
        roll = smooth(hold, outT, t);
        b.mesh.visible = t < outT;
      } else b.mesh.visible = true;
      const ny = 1 - 2 * (top + hf / 2) + (1 - drop) * 2 * (hf + top + 0.02) + roll * 2 * (hf + top + 0.04);
      if (b.mesh.visible) holdBanner(cam, b.mesh, ny, wf, hf);
    }
    g.visible = full;
    if (!full) {
      if (a.blazer) a.blazer.g.visible = false;
      a.soft?.set(false);
      m.hmm.visible = m.mate.visible = false;
      return;
    }
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);

    // ---- the lens: the campus is moved about the pup (layout.js); the stepped camera drop to the plaza at T.cut
    const sh = shot.current;
    const e = 1 - (1 - Math.min(1, Math.max(0, (tt - T.cut) / 0.34))) ** 3;
    const A = SHOTS.A;
    const B = SHOTS.B;
    sh.P.set(lerp(A.P[0], B.P[0], e), lerp(A.P[1], B.P[1], e), lerp(A.P[2], B.P[2], e));
    sh.psi = lerp(A.psi, B.psi, e);
    sh.off.set(lerp(A.off[0], B.off[0], e), lerp(A.off[1], B.off[1], e), lerp(A.off[2], B.off[2], e));
    sh.yaw = lerp(A.yaw, B.yaw, e);
    sh.turn = turnFor(card, place, s.x, s.z); // the rig turns about the pup so the card's view and tails line up
    g.position.set(s.x, 0, s.z);
    g.rotation.y = sh.turn;
    const cs = Math.cos(sh.psi);
    const sn = Math.sin(sh.psi);
    world.current.rotation.y = sh.psi;
    world.current.position.set(sh.off.x - (sh.P.x * cs + sh.P.z * sn), sh.off.y - sh.P.y, sh.off.z - (-sh.P.x * sn + sh.P.z * cs));

    // ---- the sky bubble swells out of the pup, then is the sky; the board is cleared from T.fold
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const brk = tt >= T.fold ? tt - T.fold : -1;
    const done = brk > 3.4;
    shell.current.visible = r > 0.02 && !done;
    shell.current.scale.setScalar(inside ? 150 : Math.max(r, 0.02));
    shell.current.position.set(0, CORE_Y, 0);
    world.current.visible = inside && !done;
    const U = m.look.u;
    U.uBreak.value = brk;
    U.uTime.value = t;
    // the island the stage hid comes back under the clearing squares
    if (brk > 1.3 && !st.current.revealed) {
      st.current.revealed = true;
      for (const o of island.current) o.visible = true;
    }

    // ---- THE PUP: soft three-value shading and the blazer while the dimension stands, the real pup after
    const dim = inside && brk < 2.4;
    a.soft?.set(dim);
    if (a.blazer) a.blazer.g.visible = dim && t > 0.5;
    const inA = tt < T.cut;
    const tapK = tt >= T.tap && tt < T.tap + 0.5;
    const hov = tt >= T.hmm && tt < T.hmm + 0.8;
    const signOn = t < 1.7;
    if (a.flips) {
      // the flippers are tucked in the blazer's pockets, but for the sign, the tap and the hover
      a.flips[0].visible = signOn;
      a.flips[1].visible = signOn || tapK || hov;
    }
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.4, 1.7, t));
    live.pose.blink = smooth(1.5, 2.0, t) * 0.4 * out; // half-lidded, looking at nothing in particular
    live.pose.crouch = smooth(1.6, 2.0, t) * (inA ? 0.55 : 0.12) * out; // a slight slouch
    live.pose.fist = Math.max(tapK ? Math.sin(Math.PI * Math.min(1, (tt - T.tap) / 0.4)) * 0.9 : 0, hov ? 0.8 : 0);

    // ---- cast and props (campus frame)
    // Chabashira at the podium: the red pen lifts on the sweep
    const pen = smooth(T.sweep[0] - 0.4, T.sweep[0] - 0.1, tt) * (1 - smooth(T.sweep[1] + 0.4, T.sweep[1] + 0.6, tt));
    m.chabBody.position.set(PODIUM[0], PODIUM[1], PODIUM[2]);
    m.chabBody.rotation.y = -Math.PI / 2 - 0.3; // facing the room
    for (const o of [m.chabPony, m.chabPen, m.chabArmDown, m.chabArmUp]) {
      o.position.copy(m.chabBody.position);
      o.rotation.copy(m.chabBody.rotation);
    }
    m.chabArmDown.visible = pen < 0.5;
    m.chabArmUp.visible = pen >= 0.5;
    m.chabPony.position.add(V.set(0.03, 1.66, -0.1).applyEuler(m.chabBody.rotation));
    m.chabPony.rotation.set(0.35 + 0.08 * Math.sin(tt * 3), m.chabBody.rotation.y, 0.1 * Math.sin(tt * 2.2));
    m.chabPen.position.add(V.set(0.3, pen > 0.5 ? 2.0 : 1.0, pen > 0.5 ? 0.12 : 0.28).applyEuler(m.chabBody.rotation));
    m.chabPen.rotation.set(pen > 0.5 ? -1.35 : 0, m.chabBody.rotation.y, 0);

    // Horikita: seated in the next seat, arms folded, braid in the wind; at the tap she stands and takes the pup's sheet
    const seated = smooth(T.tap, T.tap + 0.25, tt) < 0.5;
    const hFloor = SEAT[1] - 0.45;
    m.horiUpper.position.set(HORIKITA_AT[0], hFloor + (seated ? -0.35 : 0), HORIKITA_AT[2]);
    m.horiUpper.rotation.set(0, seated ? Math.PI / 2 : 0.2, 0);
    for (const o of [m.horiSit, m.horiStand]) {
      o.position.set(HORIKITA_AT[0], hFloor, HORIKITA_AT[2]);
      o.rotation.copy(m.horiUpper.rotation);
    }
    m.horiSit.visible = seated;
    m.horiStand.visible = !seated;
    m.horiBraid.position.copy(m.horiUpper.position).add(V.set(0.2, 1.32, 0.0).applyEuler(m.horiUpper.rotation));
    m.horiBraid.rotation.set(0, m.horiUpper.rotation.y, 0.18 + 0.2 * Math.sin(tt * 2.6));

    // Sudo on the plaza: the ball up, the slam, the bounces away across the squares
    const SUDO = SQUARE(3, 1);
    m.sudoBody.position.set(SUDO[0], 0.06, SUDO[1] - 0.5);
    m.sudoBody.rotation.y = 0.5;
    const lift = smooth(T.slam - 0.55, T.slam - 0.15, tt) * (1 - smooth(T.slam - 0.02, T.slam + 0.02, tt));
    let bx = SUDO[0] + 0.5;
    let by = 1.15 + 0.9 * lift;
    let bz = SUDO[1] - 0.1;
    if (tt >= T.slam) {
      const BOUNCE = [0, 0.5, 0.9, 1.25, 1.55];
      const d = tt - T.slam;
      let k = 0;
      for (let i = 0; i < BOUNCE.length; i++) if (d >= BOUNCE[i]) k = i;
      const t0 = BOUNCE[k];
      const t1 = BOUNCE[k + 1] ?? t0 + 0.28;
      const u = Math.min(1, (d - t0) / (t1 - t0));
      by = 0.24 + [2.2, 1.5, 0.8, 0.35, 0.1][k] * 4 * u * (1 - u);
      bx = SUDO[0] + 0.5 + 4 * k + 4 * u;
      bz = SUDO[1] - 0.1 + 0.4 * k;
      if (k >= 4) bx += Math.max(0, d - t1) * 5;
    }
    m.ball.position.set(bx, by, bz);
    m.ball.visible = bx < 40;

    // Sakayanagi seated at the little table, the king on its board, laid down at T.king
    m.table.position.set(TABLE_AT[0], 0, TABLE_AT[1]);
    m.saka.position.set(TABLE_AT[0] + 1.05, 0, TABLE_AT[1]);
    m.saka.rotation.y = -Math.PI / 2;
    m.kingSmall.scale.setScalar(0.26);
    const laid = tt >= T.king;
    m.kingSmall.position.set(TABLE_AT[0] + 0.1, laid ? 0.86 : 0.83, TABLE_AT[1] + 0.1);
    m.kingSmall.rotation.set(0, 0, laid ? Math.PI / 2 : 0);

    // Ryuuen leaning on the sea wall by the gate, the coat lifting in the wind
    m.ryBody.position.set(ISLAND.x1 - 1.1, 0, -30);
    m.ryBody.rotation.set(0, -Math.PI / 2 - 0.15, 0);
    m.ryCoat.position.copy(m.ryBody.position).add(V.set(0, 0.95, -0.2).applyEuler(m.ryBody.rotation));
    m.ryCoat.rotation.set(0.25 + 0.2 * Math.sin(tt * 2.4), m.ryBody.rotation.y, 0);

    // the chess set: the white pawn lifts, goes one square, sets down with a hard click
    m.pieces.forEach((o, i) => {
      const [, , ci, cj, role] = PIECES[i];
      const [x, z] = SQUARE(ci, cj);
      let pz = z;
      let py = 0.08;
      if (role === "mover") {
        const go = Math.min(1, Math.max(0, (tt - (T.move[0] + 0.1)) / (T.move[1] - T.move[0] - 0.1)));
        pz = z - 4 * (go >= 1 ? 1 : go > 0 ? 0.5 : 0);
        py = tt >= T.move[0] && tt < T.click ? 1.2 : 0.08;
      }
      o.position.set(x, py, pz);
      o.scale.setScalar(1.15);
    });

    // THE CHECKING GANTRY sweeps north to south
    const sweepT = Math.min(1, Math.max(0, (tt - T.sweep[0]) / (T.sweep[1] - T.sweep[0])));
    const gz = -14.5 + 38 * sweepT;
    const gOn = tt >= T.sweep[0] - 0.05 && tt < T.sweep[1] + 0.5;
    m.gantryBar.visible = m.postA.visible = m.postB.visible = gOn;
    m.gantryBar.position.set(-14, 0, gz);
    m.gantryBar.scale.set(74, 1, 1);
    m.postA.position.set(-14, 0, gz);
    m.postB.position.set(60, 0, gz);

    // THE GATE: the stamp arm punches EXACT through the rain, then rests; the boom drops on the refusal and stays down
    const GX = GATE_AT[0];
    const GZ = GATE_AT[1];
    for (const o of [m.kiosk, m.kioskGlass]) o.position.set(GX, 0, GZ);
    const inRain = (tt >= T.rain[0] && tt < T.rain[1] + 0.3) || (tt >= T.gateLens[1] - 0.2 && tt < T.cut); // the last prints land while the gate shuts
    m.arm.position.set(GX - 2.6, 2.95, GZ - 0.5);
    m.arm.rotation.z = -0.5 + 0.9 * (inRain ? Math.max(0, Math.sin(tt * 38)) : 0);
    const down = smooth(T.gate, T.gate + 0.17, tt);
    m.bar.position.set(GX - 4.25, 1.6, GZ + 3.1);
    m.bar.rotation.z = 1.25 * (1 - Math.floor(down * 3) / 3);
    const blinkOn = Math.floor(tt * 4) % 2 === 0;
    m.lampA.position.set(GX - 4.25, 1.95, GZ + 3.1);
    m.lampC.position.copy(m.lampA.position);
    m.lampA.visible = tt >= T.gate && blinkOn;
    m.lampC.visible = tt >= T.gate && !blinkOn;

    // THE SHEETS
    m.sheets.update(t, {
      sweepZ: tt < T.sweep[0] ? -99 : gz,
      passAt: (z) => T.sweep[0] + ((z + 14.5) / 38) * (T.sweep[1] - T.sweep[0]),
      horikitaLift: smooth(T.tap + 0.1, T.tap + 0.6, tt),
    });

    // cherry petals on the wind, dorm windows catching the sun, waves along the wall, the ferry crossing
    for (let i = 0; i < PETALS; i++) {
      O.position.set(-20 + ((hash(i, 1) * 90 + tt * (2.2 + 1.8 * hash(i, 2)) * 3.2) % 90), 0.3 + 3.2 * hash(i, 4) + 0.5 * Math.sin(tt * 2 + i * 0.7), -14 + hash(i, 3) * 40 + Math.sin(tt * 1.3 + i) * 0.8);
      O.rotation.set(tt * 2 + i, tt * 3, tt * 1.4);
      O.scale.setScalar(1);
      O.updateMatrix();
      m.petals.setMatrixAt(i, O.matrix);
    }
    m.petals.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < m.WIN.length; i++) m.dormA.array[i] = hash(i, Math.floor(tt * 0.9)) > 0.72 ? S.AMBER : S.GLACIER;
    m.dormA.needsUpdate = true;
    for (let i = 0; i < WAVES; i++) {
      const side = i < 30 ? 0 : 1;
      O.position.set(side === 0 ? ISLAND.x0 + (i / 30) * (ISLAND.x1 - ISLAND.x0) : ISLAND.x1 + 2.6, -1.5, side === 0 ? ISLAND.z0 - 2.4 : -52 + (i - 30) * 6);
      O.rotation.set(0, side ? Math.PI / 2 : 0, 0);
      O.scale.set(1.6 + 1.5 * (Math.floor(tt * 3 + hash(i, 1) * 6) % 3), 1, 1);
      O.updateMatrix();
      m.waves.setMatrixAt(i, O.matrix);
    }
    m.waves.instanceMatrix.needsUpdate = true;
    m.ferry.position.set(-70 + 4 * Math.floor(tt * 1.6), -1.0, -96);

    // the colony pups along the north wall, leaning in, then covering their eyes as the coral sheets crumple
    const lean = smooth(T.slam, T.slam + 0.4, tt) * (1 - smooth(T.sweep[1] + 0.4, T.sweep[1] + 0.7, tt));
    const cover = smooth(T.sweep[0] + 0.6, T.sweep[0] + 0.8, tt) * (1 - smooth(T.wind[1], T.wind[1] + 0.3, tt));
    for (let i = 0; i < COLONY; i++) {
      O.position.set(8 + (i / COLONY) * 38, 1.06, ISLAND.z0 + 0.4);
      O.rotation.set(0.25 * lean, 0, 0);
      O.scale.setScalar(1);
      O.updateMatrix();
      m.colonyBody.setMatrixAt(i, O.matrix);
      MB.copy(O.matrix);
      for (const [mesh, sd] of [[m.colonyL, -1], [m.colonyR, 1]]) {
        O.position.set(sd * 0.36, 0.42, 0.18);
        O.rotation.set(-cover * 2.2 + 0.2 * Math.sin(tt * 3 + i), 0, sd * (0.2 + cover * 0.9));
        O.scale.setScalar(1);
        O.updateMatrix();
        mesh.setMatrixAt(i, MF.copy(MB).multiply(O.matrix));
      }
    }
    m.colonyBody.instanceMatrix.needsUpdate = m.colonyL.instanceMatrix.needsUpdate = m.colonyR.instanceMatrix.needsUpdate = true;

    // the dynamic figures leave with the board: each goes as its square is cleared
    if (brk >= 0) {
      const gone = (x, z) => brk > Math.min(Math.hypot(x - STAND[0], z - STAND[1]), 95) * 0.026 + 0.2;
      for (const o of [m.chabBody, m.chabPony, m.chabPen, m.chabArmDown, m.chabArmUp, m.horiUpper, m.horiBraid, m.horiSit, m.horiStand, m.sudoBody, m.saka, m.kingSmall, m.table, m.ryBody, m.ryCoat, m.kiosk, m.kioskGlass, m.arm, m.bar, m.lampA, m.lampC, ...m.pieces]) if (gone(o.position.x, o.position.z)) o.visible = false;
      if (gone(30, -52)) m.ferry.visible = false;
      m.colonyBody.visible = m.colonyL.visible = m.colonyR.visible = !gone(30, ISLAND.z0);
      for (const o of m.sheets.objects) o.visible = brk < 0.15;
    }

    // ---- THE LETTERING: HMM. at the hovering flipper; CHECKMATE. when the king goes down (a flat crimson poster word)
    const rg = sealRig(state.scene);
    const tip = rg ? flipperTip(rg) : null;
    if (hov && tip) {
      W.copy(tip).project(cam);
      holdOnScreen(cam, m.hmm, Math.min(0.7, W.x + 0.14), Math.min(0.55, W.y + 0.2), 0.1, tt < T.hmm + 0.17 ? 0.7 : 1, -0.05, 800 / 300);
    } else m.hmm.visible = false;
    const mp = tt >= T.mate && brk < 2.2 ? (tt < T.mate + 0.17 ? 0.7 : tt < T.mate + 0.33 ? 1.12 : 1) : 0;
    holdOnScreen(cam, m.mate, 0, 0.38, 0.2, mp, 0, 1600 / 340);
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      {m ? (
        <>
          <primitive object={m.banner.mesh} />
          <primitive object={m.hmm} />
          <primitive object={m.mate} />
          <group ref={rig} visible={false}>
            <mesh ref={shell} geometry={m.sky.geometry} material={m.sky.material} renderOrder={-3} frustumCulled={false} />
            <group ref={world}>
              {m.all.map((o) => (
                <primitive key={o.uuid} object={o} />
              ))}
            </group>
          </group>
        </>
      ) : null}
    </>
  );
}
