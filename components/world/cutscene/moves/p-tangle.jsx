"use client";

// tangle: Your Name, the red braided cord. SHINKAI LIGHT.
//
// The pup ties a red kumihimo cord round its flipper and the island becomes ITOMORI at kataware-doki: the
// crater lake mirroring a hyper-luminous painted sky (ultramarine to violet to coral and gold, glowing cloud
// edges, the sun's glare along the horizon), the wooded spit and its shrine on the mountain (a long stair, three
// vermilion torii, stone lanterns, a lit hall under a slate roof, paper streamers in the wind), a town's lights
// on the far shore, fireflies, a comet splitting overhead. The cord runs across the water to a schoolgirl against
// the sun, a red cord in her hair; "Is the knot real?" Two glowing loops of cord glide in and link; the comet's
// piece falls; the shock pulls the loops apart and they CANNOT part: the certificate is the knot that holds, a
// musubi bow with a hanko tag. The flex line, the credit card. The return: kataware-doki ends. The sun sinks, the
// sky drains to night blue, the girl and the comet fade into the dusk, the cord draws back and ties itself round
// the flipper, and the dimension thins to light: the island shows through, near first, the cord still on the pup.
//
// Cost: ~40 draws, ~70k triangles, no post pass, no per-frame allocation. The world is built in small steps
// while the seal walks up to the lab (prewarm below) and its shaders compiled then, never in the scene's first
// frame. Card: lib/world/cutscene/cards/p-tangle.js. Parts: ./p-tangle/. Wrap on the flipper: ./p-tangle/pup.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Quaternion, Scene, Vector3 } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Stage, signAt, smooth, useCutFrame } from "../kit";
import { islandList, pupParts } from "./p-caustic/parts";
import { WATER_Y } from "./p-tangle/land";
import { EYE, skyPos } from "./p-tangle/fx";
import { GIRL_HAND } from "./p-tangle/girl";
import { REST, buildSteps } from "./p-tangle/world";
import { flipperWrap, pupTwilight, tiePoint } from "./p-tangle/pup";

// ---------------------------------------------------------------------------------------------- prewarm
// The shared prewarm (../prewarm.js) builds the world one step per tick from the moment the seal is within reach
// of the lab, then compiles its shaders in the composer's target.
function* buildWorld() {
  const { W, steps } = buildSteps();
  for (const step of steps) {
    step();
    yield;
  }
  return W;
}
registerWarm("p-tangle", buildWorld);

// ---------------------------------------------------------------------------------------------- the clock
// seconds from the arrival; the card's beats put line A at 3.0, B at 6.9, C at 11.3, the credit card at 15.3
const T = {
  wrap: [1.25, 1.8],
  draw: [1.7, 3.7],
  girl: [2.0, 3.3],
  loopIn: [4.6, 5.8],
  travel: [6.2, 7.9],
  link: 7.9,
  split: 8.4,
  fall: [8.75, 9.7],
  impact: 9.7,
  pull: [9.72, 10.2],
  knot: 10.3,
  dusk: [11.3, 17.0],
  girlOut: [13.4, 14.8],
  burst3: 14.0,
  comet: [12.0, 15.0],
  retract: [15.2, 16.4],
  loopsOut: [15.2, 16.0],
  dis: [16.0, 18.4],
  title: [15.5, 18.5],
};
const ss = smooth;
// Pacing (owner: events must not rush): the scene's own clock runs through this warp, so every bubble holds 5 s or
// more, the credit card 5 s, and the impact and the pull play at about half speed. [real s, scene s] knots.
const KNOTS = [[0, 0], [3, 3], [8.6, 6.9], [11, 8.4], [15.2, 10.3], [16.4, 11.3], [22.4, 15.3], [27.8, 18.6], [28.6, 19.4]];
const warp = (r) => {
  if (r <= 0) return r;
  for (let i = 1; i < KNOTS.length; i++) if (r <= KNOTS[i][0]) return lerp(KNOTS[i - 1][1], KNOTS[i][1], (r - KNOTS[i - 1][0]) / (KNOTS[i][0] - KNOTS[i - 1][0]));
  return KNOTS[KNOTS.length - 1][1] + (r - KNOTS[KNOTS.length - 1][0]);
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const R = 0.85;

const V = new Vector3();
const V2 = new Vector3();
const TIE = new Vector3();
const HAND = new Vector3();
const P1 = new Vector3();
const P2 = new Vector3();
const T1 = new Vector3();
const T2 = new Vector3();
const AUP = new Vector3(0, 1, 0);
const Q = new Quaternion();
const FWD = new Vector3();
const SUN = new Vector3();
const SUNW = new Vector3();
const EYEV = new Vector3(EYE[0], EYE[1], EYE[2]);
const TAILD = new Vector3(-0.62, 0.42, 0.18).normalize();
const TAIL2 = new Vector3();
const HEAD0 = new Vector3();
const FALLTO = new Vector3();
const CDIR = new Vector3();
const CF = new Vector3();
const CR = new Vector3();
const CU = new Vector3();
const A0 = new Vector3();
const B0 = new Vector3();
const CAv = new Vector3();
const CAr = new Vector3();
const CBr = new Vector3();
const CBv = new Vector3();
const BP1 = new Vector3();
const BP2 = new Vector3();
const NA = new Vector3();
const U0 = new Vector3();
const W0 = new Vector3();
const E1 = new Vector3();
const E2 = new Vector3();

const cubic = (a, b, c, d, t, out) => {
  const s = 1 - t;
  return out.set(0, 0, 0).addScaledVector(a, s * s * s).addScaledVector(b, 3 * s * s * t).addScaledVector(c, 3 * s * t * t).addScaledVector(d, t * t * t);
};
// the loops' fixed frame: PA is the way they are pulled; the two planes are turned 45 degrees about it so the lens sees both as ellipses
function loopFrame() {
  V.copy(EYEV).sub(REST.CL).normalize();
  W0.copy(V).addScaledVector(REST.PA, -V.dot(REST.PA)).normalize();
  U0.crossVectors(W0, REST.PA).normalize();
  E1.copy(U0).add(W0).multiplyScalar(Math.SQRT1_2);
  E2.copy(U0).sub(W0).multiplyScalar(Math.SQRT1_2);
  NA.crossVectors(REST.PA, E1).normalize();
}
// a unit direction from the lens to (azimuth, elevation) in degrees
const dirTo = (az, el, out) => skyPos(az, el, 1, out).sub(EYEV);
const SKYD = 170;

export default function Tangle(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const W = useMemo(() => takeWarm("p-tangle", buildWorld), []);
  const island = useRef([]);
  const twil = useRef(null);
  const wrap = useRef(null);
  const st = useRef({ revealed: false, tied: false });

  useEffect(() => {
    island.current = islandList(scene);
    const parts = pupParts(scene);
    if (parts?.root) {
      wrap.current = flipperWrap(parts);
      twil.current = pupTwilight(parts, W.U);
    }
    loopFrame();
    const s = st.current;
    return () => {
      twil.current?.dispose();
      twil.current = null;
      // the wrap is kept (the cord stays tied) if the scene got as far as tying it
      if (wrap.current && !s.tied) wrap.current.scale.setScalar(0.0001);
      wrap.current = null;
      W.dispose();
    };
  }, [scene, W]);

  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      rig.current.visible = false;
      twil.current?.set(false);
    }
  }, -0.5);

  useCutFrame((rt, state) => {
    const t = warp(rt);
    const full = mode === "full";
    const g = rig.current;
    g.visible = full && t < T.dis[1] + 0.2;
    if (!full) {
      twil.current?.set(false);
      return;
    }
    const cam = state.camera;
    const s = live.seal;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], rt);
    const turn = turnFor(card, place, s.x, s.z);
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turn;
    g.updateWorldMatrix(true, false);
    const U = W.U;
    const o = W.o;

    // ---- the swell: the dome of twilight grows out of the pup, then stands behind everything
    const r = radiusAt(tl, rt);
    V.set(s.x, 0.9, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    o.sky.visible = r > 0.02 && t < T.dis[1];
    o.sky.scale.setScalar(inside ? 200 : Math.max(r, 0.02));
    o.sky.position.set(0, inside ? 0 : 0.9, 0);
    W.sky.m.uniforms.uInside.value = inside ? 1 : 0;
    for (const k of ["terrain", "lake", "shrine", "girl", "knotGroup"]) o[k].visible = inside;
    for (const m of [W.trees, W.boulders, W.reeds, W.town.hm, W.town.win, W.shide, W.ghosts.mesh, W.fire.mesh, W.lakeGlints.mesh, W.airGlints.mesh, W.burst.mesh]) m.visible = inside;
    for (const c of W.comets) c.ribbon.visible = c.head.visible = inside;

    // ---- the light: the sun sinks at the end; the dissolve
    const dusk = ss(T.dusk[0], T.dusk[1], t);
    const dis = ss(T.dis[0], T.dis[1], t);
    U.uTime.value = t;
    U.uTw.value = dusk;
    U.uDis.value = dis;
    U.uKeep.value = ss(16.4, 18.0, t);
    SUN.set(0.17, lerp(0.012, -0.3, ss(T.dusk[0], 16.2, t)), -0.98).normalize();
    SUNW.copy(SUN).applyAxisAngle(AUP, turn);
    U.uSun.value.copy(SUNW);
    W.lake.m.uniforms.uTurn.value = turn;

    // ---- the pup: the cord tied (the sign, then the fist before the cheek), leaning back when the shock comes
    twil.current?.set((inside || rt > tl.bloom[1]) && t < 18.3);
    live.pose.sign = signAt(tl, rt) * (1 - ss(1.2, 1.55, t));
    live.pose.sit = ss(0.4, 1.0, t) * 1.2 * out; // upright on its tail, never lying flat
    const shock = ss(T.pull[0], T.pull[1], t) * (1 - ss(10.2, 10.9, t));
    live.pose.fist = ss(1.3, 1.7, t) * (1 - ss(17.6, 18.4, t)) * out;
    live.pose.crouch = shock * 0.45;
    const wp = wrap.current;
    if (wp) {
      const k = ss(T.wrap[0], T.wrap[1], t);
      wp.scale.setScalar(Math.max(k * (1 + 0.25 * Math.sin(Math.PI * clamp01((t - T.wrap[0]) / 0.5))), 0.0001));
      if (k > 0.5) st.current.tied = true;
      tiePoint(wp, g, TIE);
    } else TIE.set(-0.2, 0.9, 0.4);

    // ---- the girl, and where the cord's far end is held
    const gvis = ss(T.girl[0], T.girl[1], t) * (1 - ss(T.girlOut[0], T.girlOut[1], t));
    W.girl.m.uniforms.uVis.value = gvis;
    o.girl.visible = inside && gvis > 0.01;
    o.girl.rotation.z = 0.012 * Math.sin(t * 0.8);
    HAND.set(GIRL_HAND[0] * 2.1, GIRL_HAND[1] * 2.1, GIRL_HAND[2] * 2.1).add(W.girlAt);
    HAND.y += 0.03 * Math.sin(t * 1.3);

    // ---- the cord: floats slack across the lake; taut with the shock; drawn back to the flipper at the end
    const taut = ss(T.pull[0], T.pull[1] + 0.2, t) * (1 - ss(T.retract[0], T.retract[0] + 0.5, t) * 0.6);
    const dx = HAND.x - TIE.x;
    const dz = HAND.z - TIE.z;
    P1.set(TIE.x + dx * 0.3 + 2.4, WATER_Y + 0.12, TIE.z + dz * 0.3);
    P2.set(TIE.x + dx * 0.68 - 2.8, WATER_Y + 0.1, TIE.z + dz * 0.68);
    V.copy(HAND).sub(TIE);
    P1.lerp(T1.copy(TIE).addScaledVector(V, 1 / 3), taut);
    P2.lerp(T2.copy(TIE).addScaledVector(V, 2 / 3), taut);
    const su = W.strand.U;
    su.uP0.value.copy(TIE);
    su.uP1.value.copy(P1);
    su.uP2.value.copy(P2);
    su.uP3.value.copy(HAND);
    su.uGrow.value = Math.max(ss(T.draw[0], T.draw[1], t) * (1 - ss(T.retract[0], T.retract[1], t) * 0.97), 0.0001);
    su.uFlut.value = (1 - 0.85 * taut) * (0.6 + 0.4 * ss(1.7, 3.0, t));
    su.uGlow.value = 0.45 + 0.9 * ss(T.link - 0.2, T.link + 0.3, t) + 0.8 * shock;
    W.strand.shellU.uGlow.value = 0.6 + 0.7 * shock + 0.5 * ss(T.link, T.link + 0.5, t);
    o.strandCore.visible = inside && su.uGrow.value > 0.001;
    o.strandHalo.visible = o.strandCore.visible;

    // ---- the loops: light up beside the cord's two ends, glide to the middle, link (B drops through A), pull, hold
    const lin = ss(T.loopIn[0], T.loopIn[1], t) * (1 + 0.16 * Math.sin(Math.PI * clamp01((t - T.loopIn[0]) / 1.3)));
    const lout = 1 - ss(T.loopsOut[0], T.loopsOut[1], t);
    const tr = ss(T.travel[0], T.travel[1], t);
    const linkK = ss(T.link - 0.05, T.link + 0.35, t);
    const settle = t > T.link ? Math.exp(-(t - T.link) * 6) * Math.cos((t - T.link) * 30) : 0;
    const ring = t < T.pull[0] ? 0 : 0.86 + 0.14 * Math.exp(-Math.max(0, t - T.pull[1]) * 7) * Math.cos((t - T.pull[1]) * 38);
    const pullAmt = ss(T.pull[0], T.pull[1], t) * ring;
    const A = REST.PA;
    A0.copy(TIE).addScaledVector(A, 0.55).add(V.set(0.1, 0.65, -0.55));
    CAr.copy(REST.CL).addScaledVector(A, -R * 0.5 - 0.55 * pullAmt);
    const ta = ss(T.travel[0] - 0.2, T.travel[1] - 0.3, t);
    CAv.copy(A0).lerp(CAr, ta);
    CAv.y += 0.05 * Math.sin(t * 1.7) * (1 - ta);
    const aRad = R * (0.8 + 0.2 * ta);
    B0.copy(HAND).add(V.set(0.1, 0.1, 0.6));
    CBr.copy(REST.CL).addScaledVector(A, R * 0.5 + 0.55 * pullAmt + 0.02 * settle);
    BP1.copy(B0).lerp(CBr, 0.4);
    BP1.y += 4;
    BP2.copy(CBr).addScaledVector(NA, 3.2);
    cubic(B0, BP1, BP2, CBr, tr, CBv);
    const bRad = R * (1 + 1.5 * Math.pow(1 - tr, 1.3));
    const stretch = 1 + 0.9 * pullAmt;
    const narrow = 1 - 0.28 * pullAmt;
    const loopUp = (L, center, rad, e, show, bump) => {
      const u = L.U;
      u.uC.value.copy(center);
      u.uA.value.copy(A);
      u.uE.value.copy(e);
      u.uRy.value = rad * stretch;
      u.uRx.value = rad * narrow;
      u.uTube.value = 0.07 * (0.9 + (0.1 * rad) / R);
      u.uPersp.value = 0.012 * (1 - tr * 0.9);
      u.uScale.value = Math.max(show, 0.0001) * (1 + bump);
      u.uGlow.value = 0.7 + 0.5 * linkK + 0.8 * shock;
      L.shellU.uScale.value = u.uScale.value;
      L.shellU.uGlow.value = 0.8 + 0.8 * shock + 0.4 * linkK;
    };
    loopUp(W.loopA, CAv, aRad, E1, lin * lout, 0.04 * Math.sin(t * 9) * shock);
    loopUp(W.loopB, CBv, bRad, E2, lin * lout, 0.04 * Math.sin(t * 9 + 1) * shock);
    for (const k of ["loopACore", "loopAHalo", "loopBCore", "loopBHalo"]) o[k].visible = inside && lin * lout > 0.01;

    // ---- the knot that holds: a musubi bow, the certificate, popped in when the pull catches
    const kp = ss(T.knot, T.knot + 0.45, t);
    const pop = kp * (1 + 0.3 * Math.sin(Math.PI * clamp01((t - T.knot) / 0.55))) * lout;
    o.knotGroup.visible = inside && pop > 0.01;
    o.knotGroup.position.copy(REST.CL);
    o.knotGroup.rotation.set(0.04 * Math.sin(t * 1.3), 0.08 * Math.sin(t * 0.9), 0.05 * Math.sin(t * 1.1));
    o.knotGroup.scale.setScalar(1.15);
    o.tag.rotation.z = 0.14 * Math.sin(t * 2.3) * kp;
    o.tag.position.set(0, -0.55, 0.02);
    W.knot.U.uPop.value = Math.max(pop, 0.0001);
    W.knot.haloU.uPop.value = Math.max(pop, 0.0001);
    W.knot.U.uGlow.value = 0.9 + 0.5 * Math.sin(t * 3.1) * kp;
    W.knot.haloU.uGlow.value = 0.9 + 0.4 * Math.sin(t * 3.1) * kp;

    // ---- the comet: one piece, then it splits; one piece falls and lights the far shore
    const cAlpha = ss(1.8, 3.2, t) * (1 - ss(T.comet[0], T.comet[1], t));
    const sp = Math.max(0, t - T.split);
    // the comet rides the lens: upper right of the frame, above the girl, wherever the card's view puts the camera
    cam.getWorldDirection(CF).applyAxisAngle(AUP, -turn);
    CR.crossVectors(CF, AUP).normalize();
    CU.crossVectors(CR, CF).normalize();
    const hh = Math.tan((cam.fov * Math.PI) / 360);
    CDIR.copy(CF).addScaledVector(CR, (0.3 + 0.012 * t) * hh * cam.aspect).addScaledVector(CU, (0.52 + 0.004 * t) * hh).normalize();
    HEAD0.copy(CDIR).multiplyScalar(SKYD).add(EYEV);
    const c0 = W.comets[0];
    c0.ru.uHead.value.copy(HEAD0);
    c0.ru.uDir.value.copy(TAILD);
    c0.ru.uLen.value = 70 + 8 * Math.sin(t * 0.7);
    c0.ru.uW.value = 2.4;
    c0.ru.uAlpha.value = cAlpha;
    c0.hu.uSize.value = 13 + 0.8 * Math.sin(t * 5);
    const c1 = W.comets[1];
    c1.ru.uHead.value.copy(HEAD0).addScaledVector(V.set(1, 0.18, 0.1), sp * sp * 0.9 + sp * 1.2);
    c1.ru.uDir.value.copy(TAILD).add(V.set(0.1, -0.05, 0)).normalize();
    c1.ru.uLen.value = 55;
    c1.ru.uW.value = 1.8;
    c1.ru.uAlpha.value = cAlpha * ss(T.split, T.split + 0.5, t);
    c1.hu.uSize.value = 6;
    const fe = clamp01((t - T.fall[0]) / (T.fall[1] - T.fall[0])) ** 2;
    dirTo(-23, 3.6, FALLTO).multiplyScalar(215).add(EYEV);
    const c2 = W.comets[2];
    c2.ru.uHead.value.copy(HEAD0).lerp(FALLTO, t < T.fall[0] ? 0 : fe);
    TAIL2.copy(HEAD0).sub(c2.ru.uHead.value);
    if (TAIL2.lengthSq() < 1) TAIL2.copy(TAILD);
    c2.ru.uDir.value.copy(TAIL2.lengthSq() > 1 ? TAIL2.normalize() : TAILD).lerp(TAILD, 1 - ss(T.fall[0], T.fall[0] + 0.5, t)).normalize();
    c2.ru.uLen.value = 30 + 70 * ss(T.fall[0], T.fall[1], t);
    c2.ru.uW.value = 2.0 + 1.2 * ss(T.fall[0], T.fall[1], t);
    const hit = t - T.impact;
    const flash = hit > 0 ? Math.exp(-hit * 1.8) : 0;
    c2.ru.uAlpha.value = t < T.split || t >= T.impact ? 0 : cAlpha * ss(T.split, T.split + 0.5, t);
    c2.hu.uSize.value = t < T.impact ? 6.5 : 60 * (1 + hit * 0.8);
    c2.hu.uAlpha.value = t < T.impact ? c2.ru.uAlpha.value : flash * 0.9;
    c1.hu.uAlpha.value = c1.ru.uAlpha.value;
    c0.hu.uAlpha.value = c0.ru.uAlpha.value;
    U.uFlare.value = flash * 0.9;
    U.uComet.value.copy(CDIR).applyAxisAngle(AUP, turn);

    // ---- ripples on the lake and the loops' reflections
    const rp = W.lake.m.uniforms.uRip.value;
    rp[0].set(REST.CL.x, REST.CL.z, T.link, t > T.link ? 0.9 : 0);
    rp[1].set(-24, -140, T.impact, t > T.impact ? 1.2 : 0);
    rp[2].set(REST.CL.x, REST.CL.z, T.pull[0] + 0.2, t > T.pull[0] ? 0.8 : 0);
    rp[3].set(TIE.x + dx * 0.5, TIE.z + dz * 0.5, T.retract[0], t > T.retract[0] ? 0.5 * (1 - dis) : 0);
    const sr = W.lake.m.uniforms.uSrc.value;
    const sc = W.lake.m.uniforms.uSrcCol.value;
    sr[0].set(CAv.x, CAv.y, CAv.z, 0.9 * lin * lout);
    sc[0].set(1, 0.3, 0.35);
    sr[1].set(CBv.x, CBv.y, CBv.z, 0.9 * lin * lout * (1 + 1.5 * (1 - tr)));
    sc[1].set(1, 0.35, 0.3);
    sr[2].set(HEAD0.x, HEAD0.y, HEAD0.z, 3.2 * cAlpha);
    sc[2].set(0.55, 0.8, 1);
    sr[3].set(REST.CL.x, REST.CL.y, REST.CL.z, 1.6 * pop);
    sc[3].set(1, 0.7, 0.45);

    // ---- sparkle: fireflies on the bank, glints on the water and in the air; the bursts at the link, the knot, the girl
    W.fire.u.uAmp.value = ss(3.4, 4.6, t) * (1 - ss(14.0, 16.0, t));
    W.lakeGlints.u.uAmp.value = ss(2.2, 3.4, t) * (1 - ss(14.5, 16.5, t)) * (1 - 0.6 * dusk);
    W.airGlints.u.uAmp.value = ss(5.0, 6.2, t) * (1 - ss(15.4, 16.4, t)) * (0.5 + 0.5 * ss(T.link, T.link + 1, t));
    const b = W.burst.u;
    b.uAmp.value = 1.6;
    if (t < T.knot - 0.1) {
      b.uC.value.copy(REST.CL);
      b.uT0.value = T.link;
    } else if (t < T.burst3 - 0.05) {
      b.uC.value.copy(REST.CL);
      b.uT0.value = T.knot;
    } else {
      b.uC.value.copy(HAND).add(V.set(0, -1.6, 0));
      b.uT0.value = T.burst3;
    }

    // ---- the sun's lens ghosts: a few pale hexagons along the line through the middle of the frame
    cam.getWorldDirection(FWD);
    const gu = W.ghosts.u;
    V.copy(cam.position).addScaledVector(SUNW, 100).project(cam);
    gu.uVis.value = (1 - dusk) * (1 - dusk) * Math.max(0, FWD.dot(SUNW)) * ss(1.9, 3.2, t) * (1 - ss(T.dis[0], T.dis[0] + 0.5, t));
    gu.uAsp.value = 1 / cam.aspect;
    const gv = gu.uGhost.value;
    gv[0].set(V.x * -0.55, V.y * -0.55, 0.16, 0.07);
    gv[1].set(V.x * 0.35, V.y * 0.35, 0.1, 0.05);
    gv[2].set(V.x * 0.75, V.y * 0.75, 0.07, 0.11);
    gv[3].set(V.x * -1.1, V.y * -1.1, 0.12, 0.04);
    gv[4].set(V.x * 1.5, V.y * 1.5, 0.05, 0.15);

    // ---- the title card of the dusk's end, in the sky
    const tcA = ss(T.title[0], T.title[0] + 0.9, t) * (1 - ss(T.title[1] - 0.5, T.title[1], t));
    const tm = W.title.mesh;
    tm.visible = tcA > 0.01;
    tm.material.uniforms.uA.value = tcA;
    if (tm.visible) {
      const d = 6;
      const hh = 2 * d * Math.tan((cam.fov * Math.PI) / 360);
      V.copy(cam.position).addScaledVector(FWD, d);
      V2.set(0, 1, 0).applyQuaternion(cam.quaternion);
      V.addScaledVector(V2, hh * 0.27);
      g.worldToLocal(V);
      tm.position.copy(V);
      g.getWorldQuaternion(Q).invert().multiply(cam.quaternion);
      tm.quaternion.copy(Q);
      const w = Math.min(hh * cam.aspect * 0.62, 5.6);
      tm.scale.set(w, w, 1);
    }

    // ---- THE ISLAND comes back through the thinning dimension, near first
    if (dis > 0.03 && !st.current.revealed) {
      st.current.revealed = true;
      for (const x of island.current) x.visible = true;
    }
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={rig} visible={false}>
        <primitive object={W.root} dispose={null} />
      </group>
    </>
  );
}
