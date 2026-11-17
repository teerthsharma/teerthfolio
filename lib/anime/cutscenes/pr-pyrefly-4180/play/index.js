// ported from components/world/cutscene/moves/pr-pyrefly-4180.jsx: addLayer (lines 137 to 148), useCutFrame (lines 374 to 704)
// rig frame: root holds the stage shell, the theatre (th, dollied) and the kunai, which the live hangs on the rig, not the theatre
import { Color, Group, InstancedMesh, Mesh, Object3D, Vector3 } from "three";
import { DOOR, FOX, HOOP_AT, KUNAI, LEN, N, SHELL, T, bump, onTwos, remap, smooth } from "../clock.js";
import { CTRL, buildChain, buildFtg, buildFx, buildPlaque, buildSplitPin, poseChain, splayPin } from "../live/chain.js";
import { U, card, hash, merge } from "../live/paper.js";
import { FLOOR, groundY } from "../live/world.js";
import { SHINOBI, buildColony, buildHokage, buildKurama, buildKushina, buildShinobi, poseColony, poseKurama, poseKushina } from "../live/puppets.js";
import { CENTRE, buildShell } from "./shell.js";

const FOX_DRAWN_X = 2.2;
const HOPS = [[0, 0, 0], ...KUNAI, [0, 0, 0]];
const STEP = 1 / 240;
const PHASE = (() => {
  const a = new Float64Array(Math.ceil(LEN / STEP) + 2);
  for (let i = 1; i < a.length; i++) a[i] = a[i - 1] + (1 - 0.75 * smooth(T.taut[0], T.taut[1], (i - 1) * STEP)) * STEP;
  return a;
})();
const phaseAt = (t) => {
  const x = Math.min(PHASE.length - 2, Math.max(0, t / STEP));
  const k = Math.floor(x);
  return PHASE[k] + (PHASE[k + 1] - PHASE[k]) * (x - k);
};
const axOf = (aspect) => Math.min(1, Math.max(0.5, aspect / 1.4));
const fsOf = (aspect) => (aspect < 1 ? 0.58 : 0.9);

const V = new Vector3();
const FLIP = new Vector3();
const CAMW = new Vector3();
const CENTREW = new Vector3();
const O = new Object3D();
const LEAF_COLS = ["#7a2b1c", "#a2461f", "#5b2318", "#3c1d2a"];

export function buildPlay({ mats, layers, aspect = 16 / 9 }) {
  const root = new Group();
  const th = new Group();
  const shell = buildShell();
  root.add(shell.mesh, th);

  const items = [];
  for (const d of layers) {
    const mesh = new Mesh(d.g, mats[d.m] ?? mats.solid);
    mesh.frustumCulled = false;
    mesh.renderOrder = d.m === "cloud" || d.m === "smoke" ? 3 : 0;
    const g = new Group();
    g.add(mesh);
    g.position.set(d.px, d.y, d.z);
    g.visible = false;
    th.add(g);
    items.push({ d, g, mesh });
  }

  const fox = new Group();
  const kur = buildKurama(mats);
  fox.add(kur.root);
  th.add(fox);
  const chain = buildChain(mats);
  const chainRoot = new Group();
  chainRoot.add(chain.links);
  th.add(chainRoot);

  const ftg = buildFtg(mats);
  root.add(ftg.root);
  const ftgVis = [...ftg.flashes, ...ftg.cores, ...ftg.streaks, ...ftg.streaks2];
  const fx = buildFx(mats);
  th.add(fx.root);
  const pin1 = buildSplitPin(mats, 0.42);
  const pin2 = buildSplitPin(mats, 0.62);
  th.add(pin1, pin2);
  splayPin(pin1, 1);
  pin2.visible = false;
  const plaque = buildPlaque();
  th.add(plaque);

  const kush = buildKushina(mats);
  th.add(kush.root);
  const hoke = buildHokage(mats);
  th.add(hoke.root);

  const shin = buildShinobi(mats);
  const branch = new Group();
  branch.add(
    new Mesh(
      merge([
        card([[-1.2, -8], [-0.4, -8], [-0.5, 3.0], [-1.1, 3.0]], { color: "#150d26", depth: 0.7 }),
        card([[-0.9, 0.3], [9.5, 0.1], [9.6, 0.5], [-0.9, 0.8]], { color: "#1b1130", depth: 0.5 }),
        card([[3, 0.35], [4.6, 1.6], [4.9, 1.45], [3.6, 0.3]], { color: "#1b1130", depth: 0.3 }),
      ]),
      mats.solid
    ),
    shin
  );
  th.add(branch);
  const colony = buildColony(mats);
  th.add(colony.root);

  const leaves = new InstancedMesh(
    merge([
      card([[-0.14, 0], [0, 0.07], [0.16, 0], [0, -0.07]], { color: "#ffffff", depth: 0.012 }),
      card([[-0.02, 0], [0.18, 0.005], [0.18, -0.005]], { color: "#ffffff", depth: 0.014, z: 0.01 }),
    ]),
    mats.solid,
    90
  );
  const embers = new InstancedMesh(
    card([[0, -0.05], [0.12, 0], [0.2, 0.08], [0.1, 0.14], [0.0, 0.08], [0.06, 0.02]], { color: "#ff8a3a", depth: 0.01 }),
    mats.glow,
    60
  );
  for (const m of [leaves, embers]) m.frustumCulled = false;
  const C = new Color();
  for (let i = 0; i < 90; i++) leaves.setColorAt(i, C.set(LEAF_COLS[i % 4]));
  for (let i = 0; i < 60; i++) embers.setColorAt(i, C.set(i % 3 ? "#ff8a3a" : "#ffc060"));
  th.add(leaves, embers);

  const state = { t: 0, inside: false, built: true, islandOn: 0, pillarX: -2.9 * axOf(aspect), pinAt: [0, 0, 0], hoopAt: [0, 0, 0], jaw: [0, 0, 0], kush: [0, 0, 0], off: [0, 0, 0], gone: false, catchK: 0, shake: [0, 0] };
  let fsChain = 1;

  const update = (tr, env) => {
    const asp = env.aspect ?? aspect;
    const ax = axOf(asp);
    const fs = fsOf(asp);
    const t = remap(tr);

    root.updateWorldMatrix(true, false);
    const inside = shell.update(tr, env.cam.getWorldPosition(CAMW), root.localToWorld(CENTREW.copy(CENTRE)));
    state.inside = inside;
    th.visible = (inside || tr > SHELL.bloom[1]) && tr <= SHELL.collapse[1];

    U.uFade.value = 1 - 0.78 * smooth(T.plaque + 0.5, T.fold + 0.6, t);
    U.uTime.value = t;
    th.rotation.y = 0.14 * Math.sin((t - 1.5) * 0.33);
    th.position.set(0, 0, -1.2 + 2.4 * smooth(1.5, 17, t));

    for (let i = 0; i < items.length; i++) {
      const { d, g, mesh } = items[i];
      const o = d.order ?? 0;
      const rise = smooth(T.rise[0] + o * 0.05, T.rise[0] + o * 0.05 + 0.7, t);
      const sink = 60 * smooth(T.fold + o * 0.06, T.fold + o * 0.06 + 0.75, t);
      g.visible = rise > 0.003 && sink < 59;
      g.position.x = d.px * (d.fg ? ax : 1);
      g.position.y = d.y - sink - (d.sink ? 5 * (1 - rise) : 0);
      g.rotation.x = d.sink ? 0 : -(Math.PI / 2) * (1 - rise);
      g.rotation.z = (d.sway ?? 0) * Math.sin(t * 0.9 + i * 1.3);
      if (d.flame) mesh.scale.set(1, 1 + 0.18 * Math.sin(onTwos(t) * 13), 1);
    }

    const HT = T.hop;
    let at = 0;
    for (let i = 0; i < 4; i++) if (t >= HT[i]) at = i + 1;
    const cur = HOPS[at];
    state.catchK = 0;
    for (const h of HT) state.catchK = Math.max(state.catchK, smooth(h, h + 0.1, t) * (1 - smooth(h + 0.4, h + 0.5, t)));
    state.gone = at > 0 && HT.some((h) => t >= h && t < h + 0.14);
    state.off = [cur[0], 0, cur[2]];
    const fold = t < T.fold;
    for (const m of ftgVis) m.visible = false;
    for (let k = 0; k < 3; k++) {
      const g = ftg.kunai[k];
      const thr = smooth(T.throw[0] + 0.1 * k, T.throw[1] + 0.35 + 0.1 * k, t);
      g.visible = thr > 0.01 && fold;
      const arc = 1 - (1 - thr) * (1 - thr);
      g.position.set(KUNAI[k][0] * arc, 0.9 + 1.6 * Math.sin(Math.PI * thr) * (1 - thr * 0.3) - 0.5 * thr, KUNAI[k][2] * arc + 0.3 * (1 - arc));
      g.rotation.z = thr < 1 ? -t * 18 : -1.15;
      g.scale.setScalar(2.4);
    }
    for (let i = 0; i < 4; i++) {
      const dt = t - HT[i] + 0.07;
      if (dt < 0 || dt > 0.45 || !fold) continue;
      const k = 1 - dt / 0.45;
      const a = HOPS[i];
      const b = HOPS[i + 1];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (const m of [ftg.streaks[i], ftg.streaks2[i]]) {
        m.visible = true;
        m.position.set(a[0], 1.0, a[2] + 0.2);
        m.rotation.set(0, Math.atan2(-(b[2] - a[2]), b[0] - a[0]), 0);
        m.scale.set(len, 1.1 * k + 0.1, 1);
      }
      for (const [pt, j] of [[a, 0], [b, 1]]) {
        const fl = ftg.flashes[(i % 2) * 2 + j];
        const co = ftg.cores[(i % 2) * 2 + j];
        fl.visible = co.visible = true;
        fl.position.set(pt[0], 1.0, pt[2] + 0.4);
        co.position.copy(fl.position);
        fl.scale.setScalar(0.3 + 2.1 * Math.sin(Math.PI * Math.min(1, dt / 0.45 + 0.1)));
        co.scale.setScalar(0.3 + 2.4 * k);
        fl.rotation.z = co.rotation.z = dt * 6 + i;
      }
    }

    const sinkF = 60 * smooth(T.fold + 0.3, T.fold + 1.05, t);
    const stir = smooth(T.rise[0] + 0.3, T.rise[0] + 1.2, t);
    const bite = smooth(T.taut[0], T.taut[1], t);
    const roar = Math.max(bump(...T.roarA, t), bump(...T.roarB, t));
    const lurch = bump(...T.lurch, t);
    const orb = 0.95 * smooth(T.orb[0], T.orb[1], t) * (1 - smooth(T.orb[2], T.orb[3], t));
    fox.visible = stir > 0.01 && sinkF < 59;
    fox.position.set(FOX[0] - 0.6 * lurch, FOX[1] - sinkF - 3 * (1 - stir), FOX[2]);
    fox.scale.setScalar(Math.max(0.01, fs * (0.3 + 0.7 * stir)));
    poseKurama(kur, onTwos(phaseAt(t)), { roar, lift: bump(2.2, 2.6, 3.5, 4.0, t) + lurch, thrash: 0.95 - 0.75 * bite, orb, sway: 0 });
    root.updateMatrixWorld(true);
    U.uEmberAt.value.set(FOX[0] - 1.5, FOX[1] + 3.5, FOX[2]).applyMatrix4(th.matrixWorld);
    U.uEmberK.value = 0.55 + 0.35 * roar + 0.5 * bump(T.burst - 0.1, T.burst + 0.1, T.burst + 0.4, T.burst + 1.0, t);

    const pillarX = -2.9 * ax;
    const pinTh = [pillarX + 0.3, 1.25, -1.15];
    const sinkR = 60 * smooth(T.fold + 0.1, T.fold + 0.85, t);
    const showChain = t >= T.grow[0] - 0.05 && sinkF < 59;
    chainRoot.visible = showChain;
    chainRoot.position.y = -sinkF;
    fx.root.position.y = -sinkR;
    for (const m of [fx.hoop, fx.hoopFlash, fx.bolt, fx.boltCore, fx.burst, fx.burstCore]) m.visible = false;
    const flipTh = env.tip ? th.worldToLocal(FLIP.copy(env.tip)) : th.worldToLocal(root.localToWorld(FLIP.set(0.66, 0.06, 0)));
    if (showChain) {
      if (fsChain !== fs) {
        fsChain = fs;
        for (let i = 1; i < chain.pts.length - 1; i++) {
          const src = CTRL[i];
          chain.pts[i].set(FOX[0] + fs * (src[0] - FOX_DRAWN_X), FOX[1] + fs * (src[1] - FOX[1]), FOX[2] + fs * (src[2] - FOX[2]));
        }
      }
      V.set(KUNAI[2][0], 0.8, KUNAI[2][2]);
      root.localToWorld(V);
      th.worldToLocal(V);
      const info = poseChain(chain, t, { grow: T.grow, taut: bite, surge: t >= T.surge[0] ? T.surge : null }, V, CENTREW.set(pinTh[0], pinTh[1], pinTh[2]));
      root.worldToLocal(V.set(info.door[0], info.door[1], info.door[2]).applyMatrix4(th.matrixWorld));
      state.hoopAt = V.toArray();
      const dh = t - HOOP_AT;
      if (dh > 0 && dh < 4) {
        fx.hoop.visible = true;
        const close = smooth(0, 0.35, dh);
        fx.hoop.position.set(info.door[0], info.door[1], info.door[2] + 0.06);
        fx.hoop.scale.setScalar(Math.max(0.01, (1.9 - 0.95 * close) * fs));
        fx.hoopFlash.visible = dh < 0.45;
        fx.hoopFlash.position.copy(fx.hoop.position);
        fx.hoopFlash.scale.setScalar(Math.max(0.01, (2.2 - 1.2 * smooth(0, 0.45, dh)) * fs));
      }
      const fb = (t - (T.grow[0] - 0.05)) / 0.45;
      if (fb > 0 && fb < 1) {
        fx.boltCore.visible = true;
        fx.boltCore.position.set(flipTh.x, flipTh.y, flipTh.z + 0.25);
        fx.boltCore.scale.setScalar(1.3 * (1 - fb) * (0.5 + 0.5 * Math.sin(onTwos(t) * 40)) + 0.3);
        fx.boltCore.rotation.z = t * 5;
      }
      const bk = smooth(T.bolt[0], T.bolt[1], t);
      if (bk > 0 && t < T.surge[0]) {
        fx.bolt.visible = fx.boltCore.visible = true;
        V.set(-6.6, 3.0, 0.3).applyMatrix4(fox.matrixWorld);
        th.worldToLocal(V);
        const j = Math.min(N - 1, DOOR + 2);
        const P = chain.P;
        fx.bolt.position.set(V.x + (P[j * 3] - V.x) * bk, V.y + (P[j * 3 + 1] - V.y) * bk, V.z + (P[j * 3 + 2] - V.z) * bk + 0.2);
        fx.bolt.scale.setScalar(0.55 * fs);
        fx.boltCore.position.copy(fx.bolt.position);
        fx.boltCore.scale.setScalar(0.5 * fs);
        fx.bolt.rotation.z = fx.boltCore.rotation.z = t * 6;
      }
      if (t >= T.surge[0] && t < T.burst) {
        fx.bolt.visible = fx.boltCore.visible = true;
        fx.bolt.position.set(info.surge[0], info.surge[1], info.surge[2] + 0.2);
        fx.boltCore.position.copy(fx.bolt.position);
        fx.bolt.scale.setScalar(0.62 * fs);
        fx.boltCore.scale.setScalar(0.5 * fs);
        fx.bolt.rotation.z = fx.boltCore.rotation.z = t * 8;
      }
    }

    const bt = t - T.burst;
    const roseUp = smooth(T.rose[0], T.rose[1], t);
    if (bt > 0 && sinkR < 59) {
      const pop = bt < 0.18 ? 0.5 + 3.4 * (bt / 0.18) : 1.0 + 2.0 * Math.exp(-(bt - 0.18) * 5);
      const size = (roseUp > 0.5 ? 0.78 + 0.1 * Math.sin(onTwos(t) * 22) : pop) * fs;
      fx.burst.visible = fx.burstCore.visible = true;
      fx.burst.position.set(pinTh[0], pinTh[1], pinTh[2] + 0.1);
      fx.burstCore.position.copy(fx.burst.position);
      fx.burst.scale.setScalar(Math.max(0.01, size * 1.2));
      fx.burstCore.scale.setScalar(Math.max(0.01, size * 0.9));
      fx.burst.rotation.z = onTwos(t) * 1.5;
    }
    const rv = t > T.rose[0] - 0.02 && sinkR < 59;
    fx.roseA.visible = fx.roseB.visible = rv;
    if (rv) {
      const close = smooth(T.rose[0], T.rose[1] + 0.2, t);
      const tremble = onTwos(t) % 0.25 < 0.125 ? 1 : -1;
      const sc = (1.55 - 0.55 * close) * fs;
      const trem = t > T.rose[1] ? 0.025 * tremble : 0;
      for (const [m, sp] of [[fx.roseA, 1], [fx.roseB, -1.6]]) {
        m.position.set(pinTh[0], 0.1 + (pinTh[1] - 0.1) * roseUp, pinTh[2] - 0.05);
        m.rotation.set(-(Math.PI / 2) * (1 - roseUp), 0, onTwos(t) * 0.25 * sp + trem);
        m.scale.setScalar(Math.max(0.01, sc));
      }
    }
    pin1.visible = showChain && sinkR < 59;
    pin1.position.set(pinTh[0] - 0.3, pinTh[1] + 0.05 - sinkR, pinTh[2] - 0.2);
    const pd = smooth(T.pin[0], T.pin[1], t);
    pin2.visible = t > T.pin[0] - 0.4 && sinkR < 59;
    pin2.position.set(pinTh[0], pinTh[1] + 3.6 * (1 - pd * pd) + 0.5 * pd - sinkR, pinTh[2] + 0.4);
    splayPin(pin2, smooth(T.clack[0], T.clack[1], t));
    pin2.scale.setScalar(Math.max(0.01, fs));

    const kStir = smooth(T.rise[0] + 0.5, T.rise[0] + 1.3, t);
    const sinkW = 60 * smooth(T.fold + 0.25, T.fold + 1.0, t);
    const shock = bump(T.burst, T.burst + 0.05, T.burst + 0.4, T.burst + 1.1, t) + 0.6 * bump(T.pin[1], T.pin[1] + 0.05, T.pin[1] + 0.3, T.pin[1] + 0.8, t);
    const flinch = Math.max(bump(...T.roarA, t), bump(...T.roarB, t));
    kush.root.visible = kStir > 0.01 && sinkW < 59;
    kush.root.position.set(4.6 * ax, groundY(-2.4) - sinkW, -2.4);
    const ks = (1.2 + 0.7 * kStir) * Math.max(fs / 0.9, 0.7);
    kush.root.scale.set(-ks, ks, 1);
    poseKushina(kush, onTwos(t), { shock, wave: 1, reach: smooth(T.grow[0] - 0.2, T.grow[0] + 0.4, t) });
    kush.root.updateWorldMatrix(true, false);
    root.worldToLocal(V.set(0.18, 2.5, 0.1).applyMatrix4(kush.root.matrixWorld));
    state.kush = V.toArray();
    hoke.root.visible = kStir > 0.01 && sinkW < 59;
    hoke.root.position.set(8.2 * ax, FLOOR + 5.2 - sinkW, -16);
    hoke.root.scale.setScalar(2.1);
    hoke.staff.rotation.z = 0.04 * Math.sin(t * 0.8);

    branch.visible = kStir > 0.01 && sinkW < 59;
    branch.position.set(-10.2 * ax, 5.1 - sinkW, -14);
    for (let i = 0; i < SHINOBI; i++) {
      O.position.set(1.2 + i * 1.55 * ax + 0.05 * Math.sin(onTwos(t) * 3 + i), 0.9 - 0.08 * flinch, 0.1 * (i % 2));
      O.rotation.set(0, 0, 0.02 * Math.sin(t + i) - 0.12 * flinch);
      O.scale.set(i % 2 ? -1.15 : 1.15, 1.15 - 0.15 * flinch, 1);
      O.updateMatrix();
      shin.setMatrixAt(i, O.matrix);
    }
    shin.instanceMatrix.needsUpdate = true;
    colony.root.visible = kStir > 0.01 && sinkW < 59;
    colony.root.position.set(-5.4 * ax, groundY(-0.6) - sinkW, -0.6);
    colony.root.scale.setScalar(asp < 1 ? 0.6 : 1);
    poseColony(colony, onTwos(t), { duck: flinch, cheer: smooth(T.cheer, T.cheer + 0.2, t) * (1 - smooth(14.6, 15.2, t)), ax });

    const swirl = smooth(T.rise[1] - 0.4, T.rise[1] + 0.4, t) * (1 - smooth(T.fold - 0.4, T.fold, t));
    const lt = onTwos(t);
    for (let i = 0; i < 90; i++) {
      const a = hash(i, 1) * 6.28 + lt * (0.5 + 0.7 * hash(i, 2));
      const rr = 3 + 10 * hash(i, 3);
      const y = (hash(i, 4) * 6 + lt * (0.4 + hash(i, 5))) % 6;
      O.position.set(Math.cos(a) * rr * 0.9 - 1, 0.2 + y, -4 + Math.sin(a) * rr * 0.5 - 2);
      O.rotation.set(lt * (2 + hash(i, 6)), lt * 1.7 + i, lt * 3 + i);
      O.scale.setScalar(Math.max(0.0001, swirl * (0.9 + 0.8 * hash(i, 7))));
      O.updateMatrix();
      leaves.setMatrixAt(i, O.matrix);
    }
    for (let i = 0; i < 60; i++) {
      const y = (hash(i, 8) * 9 + lt * (0.9 + hash(i, 9))) % 9;
      O.position.set(-8 + 16 * hash(i, 10) + Math.sin(lt * 1.3 + i) * 0.9, y, -3 - 10 * hash(i, 11));
      O.rotation.set(0, 0, lt * 4 + i);
      O.scale.setScalar(Math.max(0.0001, swirl * (0.8 + 1.2 * hash(i, 12)) * (1 - y / 11)));
      O.updateMatrix();
      embers.setMatrixAt(i, O.matrix);
    }
    leaves.instanceMatrix.needsUpdate = embers.instanceMatrix.needsUpdate = true;

    const pq = smooth(T.plaque, T.plaque + 0.4, t);
    plaque.visible = pq > 0.01 && sinkR < 59;
    plaque.position.set(pillarX, 3.1 - sinkR + 0.05 * Math.sin(t * 2.2) * pq, -0.9);
    plaque.scale.set(1.5 * fs, 1.9 * fs, 1);
    plaque.rotation.y = (1 - pq) * (Math.PI / 2);
    plaque.rotation.z = 0.05 * Math.sin(t * 2.2) * pq;

    state.t = t;
    state.islandOn = smooth(26.0, 27.4, tr);
    state.pillarX = pillarX;
    root.worldToLocal(V.set(-6.6, 3.0, 0.3).applyMatrix4(fox.matrixWorld));
    state.jaw = V.toArray();
    root.worldToLocal(V.set(pinTh[0], pinTh[1], pinTh[2]).applyMatrix4(th.matrixWorld));
    state.pinAt = V.toArray();
  };

  const dispose = () => {
    root.traverse((o) => {
      o.geometry?.dispose();
      o.material?.map?.dispose();
    });
    shell.dispose();
    root.removeFromParent();
  };

  return { root, state, update, dispose };
}
