"use client";

// pr-topograph-432: Ainz Ooal Gown (Overlord) in the Throne Room of Nazarick, built as a STOP-MOTION BIGATURE (a
// Harryhausen creature on a miniature set). The pup wears an Ainz cloak in plasticine: black and purple with a
// gold-trimmed high collar, a small gold staff ringed with seven gems, gold rings of power. The island swells into a
// vast purple hall of colossal square pillars (one instanced mesh each for pillars, pod lanterns and the agent knobs),
// a vault lost in gloom, a violet-lit chasm with cinders rising, the stair and doorway where three floor guardians
// stand rim-lit, and one slender railless voussoir bridge. Ainz himself is a hand-built armature puppet: a skull
// with red eye-points, a robe with a gold high collar and shoulder spikes, a red orb in his ribcage, the seven-gem
// staff in one hand and a bolt-whip in the other that splits into three crimson lashes over the hall; every lantern a
// lash touches takes the crimson light. A giant layered magic circle (purple and gold, a clock of twelve ticks) turns
// behind him and a small gold one answers under the pup. The pup matches him: it winds up and slams the staff into the
// stone (two-pose hit-stop, shockwave, shake): two purple glass walls (engine.name, provider.name) stand up, the lashes
// strike them and snap back low, middle, high, the orb in Ainz's chest turns crimson to gold, and the span cracks from
// the staff toward his side only; Ainz, unharmed, rises on Fly as it falls; the pup's half holds and the hall stays lit.
// THE RETURN, shown: after the flex line a board slams into frame (AINZ: YOU ARE DISMISSED), the circles close, the
// stage lamps cut out, and the set is struck: the reveal draws back to the pup like an iris while the island
// comes back in batches under it. S1 stepped clock (12 poses a second, a 2-pose hit-stop on the strike),
// S2 vertex boil, S3 clay and plaster, S4 practical lamps, S5 cut flame cards, S6 fog: all in
// materials and clocks, no post pass. Card: lib/world/cutscene/cards/pr-topograph-432.js. Parts: ./pr-topograph-432/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { signAt, smooth, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, useCutFrame } from "../kit";
import { holdFlash, islandList } from "./p-caustic/parts";
import { CINDERS, DUST, LASH_N, SPARKS, STARS, compileAssets, disposeAssets, getAssets, getGear } from "./pr-topograph-432/assets";
import { gemColor, poseAinz } from "./pr-topograph-432/lich";
import Banner from "./pr-topograph-432/banner";
import { U, hash } from "./pr-topograph-432/clay";
import { poseColony, poseWitnesses } from "./pr-topograph-432/figures";
import { colI, hideI, lashPoint, putI, slateTexture, stickTexture } from "./pr-topograph-432/fx";
import { FLOOR_Y, PILLARS, deckY } from "./pr-topograph-432/set";

const HS = 2 / 12; // the strike's hold: two poses
// SLOW-MOTION at the three peaks: real seconds spent per scene second (u). {a: where in u, L: u-length, d: real seconds}; L 0 is a hold.
const WARP = [{ a: 5.1, L: 0, d: HS }, { a: 5.1, L: 0.6, d: 1.5 }, { a: 8.95, L: 0.7, d: 1.75 }, { a: 19.5, L: 0.6, d: 1.5 }];
export function uOf(t) {
  let off = 0;
  for (const { a, L, d } of WARP) {
    const ra = a + off;
    if (t < ra) return t - off;
    if (t < ra + d) return a + (L * (t - ra)) / d;
    off += d - L;
  }
  return t - off;
}
// the clock (s of the scene's own time, before the hit-stop): every beat is authored here
const T = {
  gear: 1.2,
  turn: [1.9, 2.6],
  raise: [2.7, 3.2],
  blow: [3.35, 3.65], // the Ainz's windup, its strike
  parry: 3.8,
  wind: [4.55, 4.95],
  slam: 5.1,
  gates: 5.25,
  lash: [5.95, 6.57, 7.19], // each lash hits its wall here, then snaps back
  close: [3.95, 4.25, 4.65, 4.95], // the close-up on the gripped staff: in, hold, out
  gem: 7.9,
  crackStart: 7.8,
  fall: 8.95,
  shout: 7.45,
  cheer: 9.4,
  triumph: [10.4, 16.2],
  slate: 16.0,
  lamps: [19.0, 19.7],
  iris: [19.5, 21.0],
  home: 20.8,
};
const GATE_X = [1.15, 1.72];
const STRIKE = new Vector3(0.3, deckY(0.3), 0.25); // where the staff lands
const CRACK_X = 1.9; // the bridge breaks from here toward Ainz
const CORAL = new Color("#ff2f5e");
const WARM = new Color("#b46bff");
const AMBER = new Color("#ffc43a");
const GEM_CORAL = new Vector3(1, 0.12, 0.2);
const GEM_MINT = new Vector3(1, 0.8, 0.25);

const V = new Vector3();
const W = new Vector3();
const H = new Vector3();
const E = new Vector3();
const P0 = new Vector3();
const BASE = new Vector3();
const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
const TMP = new Color();
// out over the hall, across the lens: low to the pod lanterns, middle to the shafts, high to the agents on the capitals (the left rows)
const LASH_HALL = [new Vector3(-6.2, FLOOR_Y + 2.3, -11), new Vector3(-6.4, 5.2, -17.5), new Vector3(-6.8, 10.4, -24)];
const LASH_GATE = [new Vector3(1.5, 0.4, 0.3), new Vector3(1.5, 1.1, 0.25), new Vector3(1.5, 1.8, 0.3)];
const LASH_COL = [1, 0.18, 0.4];

const lashR = (k, u) => smooth(2.0 + 0.35 * k, 3.0 + 0.35 * k, u) * (1 - smooth(T.lash[k] + 0.05, T.lash[k] + 0.65, u));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const banner = () => (typeof document !== "undefined" ? document.getElementById("topo-banner") : null);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const full = mode === "full";
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const shake = useRef(new Vector3());
  const pup = useRef(null);
  const gear = useRef(null);
  const twin = useRef(null);
  const island = useRef([]);
  const clock = useRef({ step: -1, u: 0, yaw: null, turn: 0 });
  const A = useMemo(() => (full ? getAssets() : null), [full]);
  const slate = useMemo(() => {
    if (!full) return null;
    const g = new Group();
    const boardMat = new MeshBasicMaterial({ map: slateTexture(), toneMapped: false });
    const stickMat = new MeshBasicMaterial({ map: stickTexture(), toneMapped: false });
    const backMat = new MeshBasicMaterial({ color: "#1c1a1a", toneMapped: false });
    const board = new Mesh(new PlaneGeometry(1.2, 0.95), boardMat);
    const stickPivot = new Group();
    const stick = new Mesh(new PlaneGeometry(1.2, 0.2), stickMat);
    stick.position.set(0.6, 0.1, 0.01);
    stickPivot.position.set(-0.6, 0.475, 0.012);
    stickPivot.add(stick);
    const back = new Mesh(new BoxGeometry(1.24, 0.99, 0.03), backMat);
    back.position.z = -0.02;
    g.add(back, board, stickPivot);
    g.traverse((o) => {
      o.frustumCulled = false;
    });
    g.visible = false;
    return { g, stickPivot, mats: [boardMat, stickMat, backMat], geos: [board.geometry, stick.geometry, back.geometry] };
  }, [full]);

  // the pup's gear (built and compiled as the seal neared the dock), the island list; everything freed on exit
  useEffect(() => {
    if (!full) return undefined;
    island.current = islandList(scene);
    const G = getGear();
    pup.current = G?.p ?? null;
    if (G) {
      gear.current = G.gear;
      twin.current = G.twin;
      rig.current?.add(G.gear.staff, G.gear.sword);
    }
    compileAssets();
    return () => {
      gear.current = null;
      twin.current = null;
      pup.current = null;
      for (const m of slate.mats) {
        m.map?.dispose();
        m.dispose();
      }
      for (const g of slate.geos) g.dispose();
      const b = banner();
      if (b) b.dataset.off = "1";
      disposeAssets(true);
    };
  }, [full, scene, A, slate]);

  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts.
  // The pup's yaw and the shake go on after Seal.jsx places it.
  useFrame(() => {
    if (!full) return;
    const p = pup.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      twin.current?.set(false);
      if (gear.current) gear.current.cloak.visible = gear.current.staff.visible = gear.current.sword.visible = false;
      slate.g.visible = false;
      A.flash.visible = A.flashCream.visible = false;
      const b = banner();
      if (b) b.dataset.off = "1";
      return;
    }
    if (p?.root) {
      p.root.position.add(shake.current);
      if (clock.current.yaw != null) p.root.rotation.y = clock.current.yaw + clock.current.turn;
    }
  }, -0.5);

  // WARM DRAW: ANGLE and Metal build some pipeline states at a program's first draw, not at compile. Twice early in
  // the arrival (under the banner) the whole rig is drawn once at 1/10000 size with everything shown, so every
  // material has drawn before the first frame that matters; the -2 frame puts it all back before the move runs.
  const warm = useRef({ n: 0, at: 0.3, list: [] });
  useFrame(() => {
    const W = warm.current;
    if (!W.list.length) return;
    for (const [o, v] of W.list) o.visible = v;
    W.list.length = 0;
    if (rig.current) rig.current.scale.setScalar(1);
    twin.current?.set(false);
  }, -2);
  useFrame((state) => {
    const W = warm.current;
    if (!full || W.n >= 2 || !live.arrival.id || !rig.current || !gear.current) return;
    if (state.clock.elapsedTime - live.arrival.start < W.at) return;
    W.n++;
    W.at += 0.2;
    const mark = (o) => {
      W.list.push([o, o.visible]);
      o.visible = true;
    };
    rig.current.traverse(mark);
    mark(gear.current.cloak);
    mark(A.flash);
    mark(A.flashCream);
    slate.g.traverse(mark);
    rig.current.scale.setScalar(1e-4);
    twin.current?.set(true);
  }, 0);

  // the gear follows the flippers: after the pup is posed (priority 0, subscribed after its own)
  useFrame(() => {
    const G = gear.current;
    const p = pup.current;
    const g = rig.current;
    if (!full || !G || !p?.flipR || !live.arrival.id || !g?.visible) return;
    const u = clock.current.u;
    if (u < T.gear) return;
    const s = live.seal;
    BASE.set(s.x, 0, s.z);
    p.flipR.updateWorldMatrix(true, false);
    p.flipR.localToWorld(H.set(0.62, 0.05, 0)).sub(BASE).applyAxisAngle(UP, -clock.current.turn);
    const plant = smooth(T.slam, T.slam + 0.05, u) * (1 - smooth(T.triumph[0], T.triumph[0] + 0.3, u));
    E.set(0.3 + 0.15 * smooth(T.blow[0], T.blow[1], u), 1, 0.1).normalize();
    P0.copy(H).addScaledVector(E, -1.0); // held: its foot
    W.copy(H).addScaledVector(E, 1.1); // held: its head
    if (plant > 0) {
      V.copy(H).addScaledVector(E, 0.6).sub(STRIKE).normalize().multiplyScalar(2.1).add(STRIKE);
      P0.lerp(STRIKE, plant);
      W.lerp(V, plant);
    }
    V.copy(W).sub(P0).normalize();
    G.staff.quaternion.setFromUnitVectors(UP, V);
    G.staff.position.copy(P0).addScaledVector(V, 1.0); // the group's origin is the grip, 1 m above the foot
    if (p.flipL) {
      p.flipL.updateWorldMatrix(true, false);
      p.flipL.localToWorld(H.set(0.62, 0.05, 0)).sub(BASE).applyAxisAngle(UP, -clock.current.turn);
      G.sword.position.copy(H);
      V.set(0.85, 0.55, -0.15).normalize();
      G.sword.quaternion.setFromUnitVectors(UP, V);
    }
  }, 0);

  // THE CLOSE-UP INSERT: after the parry the lens pushes in on the flipper gripping the staff, holds, and eases back.
  // Priority 0.5 runs after the CameraRig (0) and before the composer (1).
  useFrame((state) => {
    const G = gear.current;
    const u = clock.current.u;
    const k = smooth(T.close[0], T.close[1], u) * (1 - smooth(T.close[2], T.close[3], u));
    if (!full || !G || !live.arrival.id || k < 0.001 || !G.staff.visible) return;
    const cam = state.camera;
    G.staff.getWorldPosition(V);
    cam.getWorldDirection(E);
    W.copy(cam.position).sub(V).normalize().multiplyScalar(1.7).add(V);
    W.y += 0.15;
    H.copy(cam.position).addScaledVector(E, 10); // where it was looking
    cam.position.lerp(W, k);
    H.lerp(P0.copy(V).addScaledVector(UP, -0.12), k);
    cam.lookAt(H);
  }, 0.5);

  useCutFrame((t0, state) => {
    const g = rig.current;
    if (!full) return;
    const camera = state.camera;
    const t = t0;
    const step = Math.floor(t * 12 + 1e-6); // S1: twelve poses a second of REAL time, so a slow-motion is still stepped
    const u = uOf(step / 12);
    const tt = u;
    clock.current.u = tt;
    const s = live.seal;
    const bn = banner();
    if (bn) bn.dataset.dock = t0 > 1.6 ? "1" : "0";

    // the rig turns about the pup so the lens never stands inside a neighbouring building (card.landAt)
    const turn = turnFor(card, place, s.x, s.z);
    clock.current.turn = turn;
    g.rotation.y = turn;
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.visible = t0 > tl.bloom[0] - 0.01 && tt < T.iris[1];
    const G = gear.current;
    const gearOn = tt >= T.gear && tt < T.home;
    const slamT = tt - T.slam;
    const parryT = tt - T.parry;
    const wide = state.size.width / state.size.height >= 1;
    const odd = step % 2 ? 1 : -1;

    // the stepped clock, the reveal and the practical lamps
    U.uStep.value = step;
    U.uTime.value = tt;
    U.uCore.value.set(s.x, 0.9, s.z);
    // the hall swells out of the pup on the bloom, then draws back into it at the wrap (an iris)
    const swell = 40 * smooth(tl.bloom[0], tl.bloom[0] + 0.65, t0);
    V.set(s.x, 0.9, s.z);
    const inside = swell > camera.position.distanceTo(V) + 3;
    const iris = smooth(T.iris[0], T.iris[1], u);
    U.uReveal.value = u >= T.iris[0] ? 200 * (1 - iris) ** 1.4 : inside ? 1000 : swell;
    const lampsOut = Math.round((1 - smooth(T.lamps[0], T.lamps[1], tt)) * 5) / 5;
    U.uLamps.value = lampsOut;
    const fallPulse = Math.max(0, 1 - Math.abs(tt - (T.fall + 0.3)) / 0.5);
    U.uKeyK.value = 3.4 * (0.9 + 0.1 * hash(step, 1)) * (1 + 0.45 * fallPulse + (slamT >= 0 ? 0.35 * Math.max(0, 1 - slamT / 0.4) : 0));
    U.uKey.value.set(s.x - 2 * Math.sin(turn), -12, s.z - 2 * Math.cos(turn));
    U.uFill.value.set(s.x - 5.1 * Math.cos(turn) - 1.6 * Math.sin(turn), 1.6, s.z + 5.1 * Math.sin(turn) - 1.6 * Math.cos(turn));
    U.uFillK.value = 2.3 * (0.92 + 0.08 * hash(step, 2));
    A.floorGlow.material.uniforms.uAlpha.value = 1.3 * (1 + 0.6 * fallPulse) * lampsOut;
    A.endGlow.material.uniforms.uPulse.value = fallPulse;
    A.endGlow.material.uniforms.uAlpha.value = (1 + 0.4 * fallPulse) * (0.4 + 0.6 * lampsOut);
    A.doorGlow.material.uniforms.uAlpha.value = 1.5 * (0.92 + 0.08 * hash(step, 4)) * (0.4 + 0.6 * lampsOut);

    // the pup: turns on the bridge to face Ainz, signs, gathers (squash), stretches, strikes
    clock.current.yaw = tt > T.turn[0] && tt < T.home + 0.1 ? 0.2 + 0.15 * smooth(T.turn[0], T.turn[1], tt) * (1 - smooth(T.home - 0.2, T.home + 0.1, tt)) : null;
    const wind = smooth(T.wind[0], T.wind[1], tt) * (1 - smooth(T.slam - 0.12, T.slam - 0.05, tt));
    const stretch = smooth(T.slam - 0.14, T.slam - 0.07, tt) * (1 - smooth(T.slam, T.slam + 0.06, tt));
    const settle = 0.28 * smooth(T.slam + 0.1, T.slam + 0.4, tt);
    live.pose.sign = signAt(tl, t0) * (1 - smooth(1.5, 1.9, t0));
    const up = smooth(T.raise[0], T.raise[1], tt) * (1 - smooth(T.wind[0], T.wind[1], tt));
    const trium = smooth(T.triumph[0], T.triumph[0] + 0.4, tt) * (1 - smooth(T.triumph[1], T.triumph[1] + 0.4, tt));
    const alive = tt < T.home ? 1 : 0;
    live.pose.raise = clamp01(up + stretch + (slamT >= 0 ? settle * (1 - trium) : 0) + trium) * alive;
    live.pose.crouch = (wind + 0.7 * smooth(T.slam, T.slam + 0.05, tt) * (1 - smooth(T.slam + 0.4, T.slam + 0.9, tt))) * alive;
    live.pose.mouth = (tt > 3.0 && tt < 4.3) || (slamT > 0 && slamT < 0.5) || (tt > 13.2 && tt < 14.6) ? 0.8 : 0;
    twin.current?.set(gearOn);
    if (G) {
      const pop = smooth(T.gear, T.gear + 0.4, tt);
      G.cloak.visible = gearOn;
      G.cloak.scale.setScalar(Math.max(0.01, pop * (1 + 0.14 * Math.sin(Math.PI * clamp01((tt - T.gear) / 0.5)))));
      G.cloak.material.uniforms.uWave.value = 0.1 + 0.09 * Math.max(0, 1 - Math.abs(slamT - 0.2) / 0.8) + 0.05 * fallPulse;
      G.staff.visible = G.sword.visible = gearOn && pop > 0.5;
      A.crystalMat.uniforms.uGlow.value = Math.max(smooth(T.raise[1], T.blow[1], tt) * 0.5, slamT >= 0 ? Math.max(0, 1 - slamT / 0.5) : 0, trium * 0.4);
      A.crystalMat.uniforms.uStep.value = step;
    }

    // the flashes: a cream one on the parry, a mint one on the strike (tinted, never a white-out)
    holdFlash(A.flash, camera, slamT >= 0 && slamT < 0.17 ? 0.38 : 0);
    holdFlash(A.flashCream, camera, parryT >= 0 && parryT < 0.17 ? 0.34 : 0);

    // THE CIRCLES: Ainz's great layered one (three counter-turning discs, stood up behind him) and the pup's small gold one
    const cOn = smooth(0.9, 2.5, tt) * (1 - smooth(T.lamps[0] - 0.3, T.lamps[1] + 0.8, tt));
    const pOn = smooth(T.raise[0], T.raise[0] + 0.8, tt) * (1 - smooth(T.lamps[0] - 0.3, T.lamps[1] + 0.8, tt));
    const pulse = 1 + 0.12 * Math.max(0, 1 - Math.abs(slamT) / 0.6);
    A.circleBig.forEach((m, i) => {
      m.visible = cOn > 0.01 && tt < T.iris[1];
      const sc = (6.8 - 1.2 * i) * (0.25 + 0.75 * cOn) * pulse;
      m.position.set(2.8, 3.4, -1.8 - 0.25 * i);
      m.scale.set(sc, sc, 1);
      m.rotation.z = (i % 2 ? -1 : 1) * Math.floor(step / 2) * 0.05 * (1 + i * 0.5);
      m.material.opacity = 0.95 * cOn;
    });
    A.circlePup.visible = pOn > 0.01 && tt < T.iris[1];
    A.circlePup.position.set(0, 0.04, 0);
    A.circlePup.scale.setScalar(3.2 * (0.3 + 0.7 * pOn));
    A.circlePup.rotation.y = Math.floor(step / 2) * 0.07;
    A.circlePup.material.opacity = 0.9 * pOn;

    // THE SLATE: calls the wrap
    const sT = tt - T.slate;
    slate.g.visible = sT > 0 && sT < 2.5;
    if (slate.g.visible) {
      const drop = sT < 0.09 ? 2.2 : sT < 0.18 ? 0.9 : 0;
      const exit = sT > 1.9 ? smooth(1.9, 2.3, sT) * 3 : 0;
      camera.getWorldDirection(V);
      slate.g.position.copy(camera.position).addScaledVector(V, 4.4);
      W.set(0, 1, 0).applyQuaternion(camera.quaternion);
      slate.g.position.addScaledVector(W, (wide ? 0.55 : 0.45) + drop + exit);
      slate.g.quaternion.copy(camera.quaternion);
      slate.g.rotateZ(0.05);
      slate.stickPivot.rotation.z = sT < 0.5 ? 0.75 : sT < 0.58 ? 0.25 : 0;
    }

    // the lettering: THOK on the strike, CLAP on the slate; flat to the lens, a judder on twos
    const lettered = (m, k, at, wBig, wSmall, dur) => {
      m.visible = k > 0 && k < dur;
      if (!m.visible) return;
      const pop = Math.min(1, k / 0.08) * (1 + 0.25 * Math.max(0, 1 - k / 0.2));
      const w = (wide ? wBig : wSmall) * pop;
      m.position.set(at[0] + 0.04 * odd, at[1], at[2]);
      m.scale.set(w, w, 1);
      g.updateWorldMatrix(true, false);
      m.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(camera.quaternion));
    };
    lettered(A.thok, slamT, wide ? [-2.0, 2.6, 0.5] : [-1.2, 2.6, 0.5], 3.0, 2.2, 0.75);
    if (sT > 0.58) {
      camera.getWorldDirection(V);
      W.copy(camera.position).addScaledVector(V, 4.4);
      V.set(0, 1, 0).applyQuaternion(camera.quaternion);
      W.addScaledVector(V, wide ? 1.0 : 0.9);
      g.updateWorldMatrix(true, false);
      g.worldToLocal(W);
    }
    lettered(A.clap, sT - 0.58, [W.x, W.y, W.z], 1.5, 1.2, 0.8);

    // shake (two drawings each) on the strike and, lightly, the fall and the slate
    const amp = (slamT >= 0 ? Math.max(0, 0.14 * (1 - slamT / 0.8)) : 0) + (tt > T.fall + 0.3 && tt < T.fall + 0.55 ? 0.05 : 0) + (sT > 0.58 && sT < 0.75 ? 0.06 : 0);
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);

    // iris home: the island comes back in batches as the reveal draws in
    if (u >= T.iris[0]) {
      const R = U.uReveal.value;
      const TH = [150, 100, 60, 30];
      const list = island.current;
      const per = Math.ceil(list.length / 4);
      for (let b = 0; b < 4; b++) if (R <= TH[b]) for (let i = b * per; i < Math.min(list.length, (b + 1) * per); i++) list[i].visible = true;
    }

    if (step === clock.current.step) return;
    clock.current.step = step;

    // ---- once a pose from here: everything that is not the camera is redrawn
    g.updateMatrixWorld(true);
    const B = A.ainz;
    poseAinz(B, tt, BT);
    B.gemMat.uniforms.uBase.value.lerpVectors(GEM_CORAL, GEM_MINT, gemColor(tt, T.gem));
    poseWitnesses(A.wit, tt, T, odd);
    poseColony(A.colony, tt, T);
    A.flames.material.uniforms.uFlame.value = Math.floor(step / 2); // S5: four cut shapes, swapped on twos

    // the Ainz's fire cards
    let n = 0;
    for (const f of B.fire) {
      g.worldToLocal(f.part.localToWorld(W.set(f.x, f.y, f.z)));
      const on = B.root.visible && tt > tl.bloom[0] && (f.part !== B.wingL && f.part !== B.wingR ? true : smooth(1.7, 3, tt) > 0.2);
      const k = f.size * (0.82 + 0.34 * hash(step * 7 + f.id, 2));
      if (!on) hideI(A.flames, n);
      else putI(A.flames, n, W.x, W.y - k * 0.1, W.z + 0.06, k * 0.62, k, 1, 0, 0, 0.12 * (hash(step + f.id, 3) - 0.5));
      if (f.kind === 1) TMP.set(AMBER).offsetHSL(0, 0, 0.1);
      else if (f.kind === 2) TMP.set(CORAL).lerp(WARM, 0.3);
      else TMP.set(WARM);
      colI(A.flames, n, TMP.r, TMP.g, TMP.b, 1.1);
      n++;
    }

    // the three coral lashes: out over the hall, thrown at the walls, snapped back; the tier's coral follows
    g.worldToLocal(B.armW.localToWorld(H.set(0, -1.35, 0.7)));
    const hit = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const r = lashR(k, tt);
      const w = smooth(T.lash[k] - 0.4, T.lash[k], tt);
      E.lerpVectors(LASH_HALL[k], LASH_GATE[k], w);
      const lift = 4.5 * (1 - w) + 0.7 * w;
      const vis = r > 0.01 && B.root.visible;
      for (let j = 0; j < LASH_N; j++) {
        const idx = n + k * LASH_N + j;
        if (!vis) {
          hideI(A.flames, idx);
          continue;
        }
        const sj = (j / (LASH_N - 1)) * r;
        lashPoint(H, E, lift, sj, V);
        lashPoint(H, E, lift, Math.min(1, sj + 0.03), W);
        const ang = Math.atan2(W.y - V.y, W.x - V.x) - Math.PI / 2;
        const len = H.distanceTo(E) * r;
        const size = Math.min(1.5, Math.max(0.5, (len / LASH_N) * 1.5)) * (0.85 + 0.3 * hash(step * 5 + j + k * 40, 6));
        putI(A.flames, idx, V.x, V.y, V.z + 0.04, size * 0.7, size, 1, 0, 0, ang);
        colI(A.flames, idx, LASH_COL[0], LASH_COL[1] + 0.12 * (1 - j / LASH_N), LASH_COL[2], 0.8);
      }
      hit[k] = tt - T.lash[k];
    }
    A.flames.instanceMatrix.needsUpdate = true;
    A.flames.instanceColor.needsUpdate = true;

    // the hall's coral tiers (pods, pillars, agents): the wave runs with each lash's length
    const r0 = lashR(0, tt);
    const r1 = lashR(1, tt);
    const r2 = lashR(2, tt);
    const amt = (rK, p) => smooth(p.depth * 0.8, p.depth * 0.8 + 0.2, rK);
    const { lanterns, knobs, pillars: pil } = A.set;
    A.set.lanterns_at.forEach((l, i) => {
      TMP.set(WARM).lerp(CORAL, amt(r0, PILLARS[l.pi]));
      colI(lanterns, i, TMP.r, TMP.g, TMP.b, 0.86 + 0.28 * hash(step * 3 + i, 5));
    });
    lanterns.instanceColor.needsUpdate = true;
    PILLARS.forEach((p, i) => {
      TMP.set(AMBER).lerp(CORAL, amt(r2, p));
      colI(knobs, i, TMP.r, TMP.g, TMP.b, 0.9 + 0.2 * hash(step * 2 + i, 7));
      colI(pil, i, amt(r1, p), 0, 0, 1);
    });
    knobs.instanceColor.needsUpdate = true;
    pil.instanceColor.needsUpdate = true;

    // the gates: stand up from the strike, one after the other
    A.gates.forEach((m, i) => {
      const k = smooth(T.gates + 0.2 * i, T.gates + 0.55 + 0.2 * i, tt);
      m.visible = gearOn && k > 0.01;
      const overshoot = 1 + 0.1 * Math.sin(Math.PI * clamp01((tt - T.gates - 0.2 * i) / 0.55)) * (1 - k);
      m.scale.set(1, Math.max(0.01, k * overshoot), 1);
      m.position.set(GATE_X[i], deckY(GATE_X[i]), 0);
      m.rotation.y = i ? -0.75 : 0.75;
    });
    A.glass.uniforms.uGlow.value = Math.max(...hit.map((h) => (h >= 0 ? Math.max(0, 1 - h / 0.35) : 0)), slamT >= 0 ? Math.max(0, 1 - slamT / 0.6) : 0);

    // the bridge, block by block
    for (const b of A.set.blocks) {
      const i = b.i;
      let { x, y, rot } = b;
      let z = 0;
      let rx = 0;
      if (b.topX > CRACK_X - 0.3) {
        const crackAt = T.crackStart + Math.max(0, b.topX - CRACK_X) * 0.3 + hash(i, 5) * 0.06;
        const fallAt = crackAt + 0.45;
        const c = smooth(crackAt, crackAt + 0.2, tt);
        rot += 0.05 * c * (hash(i, 6) - 0.5) * 2;
        y -= 0.03 * c + (tt < fallAt ? 0.01 * c * odd : 0);
        const tau = tt - fallAt;
        if (tau > 0) {
          y -= 6 * tau * tau;
          x += (hash(i, 7) - 0.3) * 0.7 * tau;
          z = (hash(i, 8) - 0.5) * 1.2 * tau;
          rot += (hash(i, 9) - 0.5) * 9 * tau;
          rx = (hash(i, 10) - 0.5) * 7 * tau;
        }
      }
      if (y < -46 || tt < tl.bloom[0]) hideI(A.set.bridge, i);
      else putI(A.set.bridge, i, x, y, z, 1, 1, 1, rx, 0, rot);
    }
    A.set.bridge.instanceMatrix.needsUpdate = true;

    // cinders rise past the bridge (the strike scatters them), dust falls from the vault after it
    const cin = A.cinders;
    for (let i = 0; i < CINDERS; i++) {
      const period = 19;
      const y0 = ((hash(i, 4) * period + tt * (1.1 + 1.6 * hash(i, 3))) % period) - 11.5;
      let x = (hash(i, 1) - 0.5) * 7.2 + 0.25 * Math.sin(tt * 1.7 + i);
      let y = y0;
      let z = -9 + 11 * hash(i, 2) + 0.2 * Math.cos(tt * 1.3 + i * 2);
      if (slamT > 0 && slamT < 1.1) {
        const d = Math.hypot(x - STRIKE.x, z - STRIKE.z, y);
        if (d < 5) {
          const k = (2.6 * slamT * (1 - slamT / 1.4)) / Math.max(d, 0.5);
          x += (x - STRIKE.x) * k;
          y += y * k * 0.6;
          z += (z - STRIKE.z) * k;
        }
      }
      const size = 0.035 + 0.06 * hash(i, 5);
      if (tt < tl.bloom[0] + 0.3 || y > 9) hideI(cin, i);
      else {
        putI(cin, i, x, y, z, size, size * 1.4, size, hash(i, 6) * 3 + tt * 2, tt * 1.5, 0);
        colI(cin, i, 1, 0.45 + 0.3 * hash(i, 7), 0.12, (0.5 + 0.5 * hash(i, 8)) * (1 - smooth(3.5, 9, y)) * lampsOut);
      }
    }
    cin.instanceMatrix.needsUpdate = true;
    cin.instanceColor.needsUpdate = true;
    const dst = A.dust;
    for (let i = 0; i < DUST; i++) {
      const tau = tt - (T.slam + 0.3 + 1.8 * hash(i, 1));
      if (tau < 0 || tau > 4 || lampsOut < 0.2) {
        hideI(dst, i);
        continue;
      }
      const sz = 0.3 + 0.3 * hash(i, 4);
      putI(dst, i, -3.4 + 6.8 * hash(i, 2) + 0.2 * Math.sin(tau * 3 + i), 15 - 3.1 * tau, -9 + 10 * hash(i, 3), sz, 0.3, sz, 0, 0, 0.3 * (hash(i, 5) - 0.5));
      colI(dst, i, 0.8, 0.62, 0.45, 0.85 * Math.min(1, tau / 0.4) * (1 - smooth(3.4, 4, tau)));
    }
    dst.instanceMatrix.needsUpdate = true;
    dst.instanceColor.needsUpdate = true;

    // sparks and burst stars on each lash's hit, the parry and the strike
    const sp = A.sparks;
    for (let i = 0; i < SPARKS; i++) {
      const k = Math.floor(i / 8);
      const tau = hit[k];
      if (tau < 0 || tau > 0.55) {
        hideI(sp, i);
        continue;
      }
      const a = hash(i, 1) * Math.PI * 2;
      const sd = 1.2 + 2 * hash(i, 2);
      const gp = LASH_GATE[k];
      putI(sp, i, gp.x + Math.cos(a) * sd * tau, gp.y + Math.sin(a) * sd * tau - 2.2 * tau * tau, gp.z + 0.3 + 0.4 * (hash(i, 3) - 0.5) * tau, 0.045, 0.045, 0.045, a, a, 0);
      colI(sp, i, 1, 0.74, 0.46, 1 - tau / 0.55);
    }
    sp.instanceMatrix.needsUpdate = true;
    sp.instanceColor.needsUpdate = true;
    const st = A.stars;
    for (let i = 0; i < STARS; i++) {
      let tau = -1;
      let at = LASH_GATE[0];
      let sc = 0.6;
      let dz = 0.45;
      if (i < 3) {
        tau = hit[i];
        at = LASH_GATE[i];
      } else if (i === 3) {
        tau = parryT;
        at = V.set(1.6, 1.55, 0);
        sc = 0.9;
        dz = 0.5;
      } else if (i === 4) {
        tau = slamT;
        at = V.set(STRIKE.x, STRIKE.y + 0.25, STRIKE.z);
        sc = 1.2;
        dz = 0.5;
      }
      if (tau < 0 || tau > 0.34 || i > 4) {
        hideI(st, i);
        continue;
      }
      putI(st, i, at.x, at.y, at.z + dz, sc * (0.7 + 1.2 * tau), sc * (0.7 + 1.2 * tau), 1, 0, 0, hash(step, i) * 3);
      if (i === 3) colI(st, i, 1, 0.9, 0.72, 1 - tau / 0.34);
      else colI(st, i, 0.55, 1, 0.82, 1 - tau / 0.34);
    }
    st.instanceMatrix.needsUpdate = true;
    st.instanceColor.needsUpdate = true;
    const rg = A.rings;
    const rings = [
      [slamT, 1.0, STRIKE.x, STRIKE.y + 0.03, STRIKE.z, 5.2, -Math.PI / 2, 0.55, 1, 0.82],
      [slamT, 0.55, STRIKE.x, STRIKE.y + 0.55, STRIKE.z + 0.2, 3.4, 0, 0.6, 1, 0.85],
      [parryT, 0.45, 1.6, 1.55, 0.45, 1.8, 0, 1, 0.88, 0.7],
    ];
    rings.forEach(([tau, dur, x, y, z, rad, rx, r, gg, bb], i) => {
      if (tau < 0 || tau > dur) {
        hideI(rg, i);
        return;
      }
      const f = tau / dur;
      const sc = 0.3 + rad * f ** 0.7;
      putI(rg, i, x, y, z, sc, sc, 1, rx, 0, 0);
      colI(rg, i, r, gg, bb, 1.2 * (1 - f));
    });
    rg.instanceMatrix.needsUpdate = true;
    rg.instanceColor.needsUpdate = true;
    // the pale light round the pup as it raises the staff; it flares on the parry
    const glowK = smooth(T.raise[1], T.blow[1], tt) * (1 - smooth(T.wind[0], T.wind[1], tt)) * 0.45 + (parryT >= 0 && parryT < 0.5 ? 1 - parryT / 0.5 : 0);
    A.halo.visible = glowK > 0.02;
    if (A.halo.visible) {
      A.halo.position.set(0.15, 1.0, 0.7);
      A.halo.scale.setScalar(2.4 + 2.4 * (parryT >= 0 ? Math.min(1, parryT / 0.3) : 0));
      A.halo.material.uniforms.uAlpha.value = glowK * (0.85 + 0.15 * hash(step, 9));
    }
  });

  if (!full) return <Banner still />;
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <Banner />
      <group ref={rig} visible={false}>
        <primitive object={A.root} />
      </group>
      <primitive object={A.flash} />
      <primitive object={A.flashCream} />
      <primitive object={slate.g} />
    </>
  );
}

// the Ainz's beats (ainz.js poseAinz)
const BT = { blow: T.blow, parry: T.parry, lash: T.lash, fall: T.fall, crackStart: T.crackStart };
