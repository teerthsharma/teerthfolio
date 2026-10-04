"use client";

// Planimeter: Classroom of the Elite, Ayanokoji's exact fifty. The island becomes Class 1-D of the Advanced Nurturing High
// School at sunset: gold light and god-rays through tall west windows, cherry petals on the wind, a polished plank floor, a
// green chalkboard with the score "50" circled in red chalk, desks with textbooks, curtains, the school's red and white.
// The pup is Ayanokoji, SEATED on its chair behind its desk (a messy dark-brown fringe, half-lidded calm eyes, the red
// blazer and collar), the test paper on the desk reading 50 in red. Chabashira, a dark silhouette with long purple hair,
// says "Fifty. Again. Nobody does that by accident."; the lens pushes in on the calm face, an eye-glint, a chessboard laid
// over the shot, CHECKMATE. Then the pup's flex, the bell ("Class dismissed. Back to the island.") and the credit.
// Every beat frames the pup. Card: lib/world/cutscene/cards/p-planimeter.js. Parts: ./p-planimeter/ (room, cast, layout).

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Object3D, Vector3 } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { registerWarm, takeWarm } from "../prewarm";
import { sealRig } from "./g5/fx";
import { PUP_YAW, T, TEACHER_AT } from "./p-planimeter/layout";
import { ayanokojiHead, blazer, pupCel } from "./p-planimeter/cast";
import { buildRoom, chessOverlay, glintPlane, makeShared, skyShell } from "./p-planimeter/room";
import { disposePlane, holdBanner, holdOnScreen, poster, titleBanner } from "./p-planimeter/poster";

const CORE_Y = 0.9;
const PETALS = 110;
const V = new Vector3();
const W = new Vector3();
const O = new Object3D();
const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// The scene's meshes are built a slice at a time (one `yield` per slice) by the shared prewarm while the seal walks up, then
// compiled off screen (components/world/cutscene/prewarm.js); a dock reached cold builds the same thing at mount.
function* buildWorld() {
  const shared = makeShared();
  const room = yield* buildRoom(shared);
  const shell = skyShell();
  yield;
  const banner = titleBanner();
  const mate = poster("CHECKMATE.", "#ff3d52", 1700, 340);
  const chess = chessOverlay();
  const glint = glintPlane();
  const all = [room.room, room.board, room.paper, room.teacher, room.hair, room.rays, room.patches, room.petals];
  return { shared, ...room, shell, banner, mate, chess, glint, all };
}
registerWarm("p-planimeter", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const world = useRef();
  const pup = useRef(null);
  const attach = useRef({ blazer: null, head: null, cel: null });
  const m = useMemo(() => takeWarm("p-planimeter", buildWorld), []);

  // the costume rides the pup's own bones; everything goes when the move unmounts
  useEffect(() => {
    const rg = sealRig(scene);
    const a = attach.current;
    if (rg) {
      pup.current = rg;
      a.blazer = blazer({ rear: rg.rear, head: rg.head });
      rg.rear.add(a.blazer.g);
      a.head = ayanokojiHead(rg.head, rg.eye);
      a.cel = pupCel(rg.seal);
    }
    return () => {
      a.blazer?.dispose();
      a.head?.dispose();
      a.cel?.dispose();
      a.blazer = a.head = a.cel = null;
      pup.current = null;
      for (const o of [...m.all, m.shell, m.mate, m.chess, m.glint]) {
        o.geometry?.dispose();
        o.material?.map?.dispose();
      }
      for (const x of [...m.mats, m.shell.material, m.mate.material, m.chess.material, m.glint.material]) x.dispose();
      disposePlane(m.banner.mesh);
    };
  }, [scene, m]);

  // the pup, after Seal.jsx places it: turned to face the lens; a skip clears all
  useFrame(() => {
    const p = pup.current;
    const a = attach.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      if (a.blazer) a.blazer.g.visible = false;
      if (a.head) a.head.g.visible = false;
      a.cel?.set(false);
      m.banner.mesh.visible = m.mate.visible = m.chess.visible = m.glint.visible = false;
      return;
    }
    if (p?.seal && mode === "full" && a.cel) p.seal.rotation.y = PUP_YAW + turnFor(card, place, live.seal.x, live.seal.z);
  }, -0.5);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    const cam = state.camera;
    const a = attach.current;
    const b = m.banner;

    // THE TITLE BANNER drops in across the upper third the instant the scene starts, one overshoot, holds, rolls up
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
      if (a.head) a.head.g.visible = false;
      a.cel?.set(false);
      m.mate.visible = m.chess.visible = m.glint.visible = false;
      return;
    }
    const tt = onTwos(t);

    // the rig turns about the pup so the card's view and tails line up; the room is in the rig frame
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turnFor(card, place, s.x, s.z);

    // the sunset sky swells out of the pup; the room is drawn once the bubble has passed the lens
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    m.shell.visible = r > 0.02;
    m.shell.scale.setScalar(inside ? 150 : Math.max(r, 0.02));
    m.shell.position.set(0, CORE_Y, 0);
    world.current.visible = inside;
    m.shared.uTime.value = t;
    m.shared.uCam.value.copy(world.current.worldToLocal(V.copy(cam.position)));

    // THE PUP: the school look and the cel shade while the room stands
    a.cel?.set(inside);
    if (a.blazer) a.blazer.g.visible = inside;
    if (a.head) a.head.g.visible = inside;
    live.pose.sit = smooth(0.4, 1.4, t) * 0.8 * (1 - smooth(tl.collapse[0], tl.collapse[1], tt));

    // Chabashira at the board: her hair stirs on the wind from the windows
    m.teacher.position.set(TEACHER_AT[0], TEACHER_AT[1], TEACHER_AT[2]);
    m.teacher.rotation.y = -0.55;
    m.hair.position.copy(V.set(0, 2.0, -0.05).multiplyScalar(1.95).applyEuler(m.teacher.rotation).add(m.teacher.position));
    m.hair.rotation.set(0.04 * Math.sin(tt * 1.7), m.teacher.rotation.y, 0.07 * Math.sin(tt * 1.3 + 1));

    // cherry petals on the wind
    for (let i = 0; i < PETALS; i++) {
      const u = (hash(i, 1) * 14 + tt * (0.8 + 0.9 * hash(i, 2))) % 14;
      O.position.set(-6 + u, 1.0 + 3.6 * hash(i, 4) - 0.18 * u * (0.3 + hash(i, 5)) + 0.25 * Math.sin(tt * 1.6 + i), -4.5 + 14 * hash(i, 3) + 0.5 * Math.sin(tt * 0.9 + i));
      O.rotation.set(tt * 1.7 + i, tt * 2.3, tt * 1.1 + i * 0.5);
      O.scale.setScalar(0.8 + 0.5 * hash(i, 6));
      O.updateMatrix();
      m.petals.setMatrixAt(i, O.matrix);
    }
    m.petals.instanceMatrix.needsUpdate = true;

    // THE MOVE: the eye catches the light, the chessboard is laid over the shot, CHECKMATE.
    const rg = pup.current;
    const gk = tt - T.glint;
    if (rg && gk >= 0 && gk < 1.6 && inside) {
      W.copy(rg.eye);
      rg.head.localToWorld(W);
      W.project(cam);
      const pop = gk < 0.18 ? gk / 0.18 : 1 - smooth(0.7, 1.6, gk) * 0.9;
      holdOnScreen(cam, m.glint, W.x, W.y, 0.95 * (0.4 + 0.6 * pop) * (gk < 0.18 ? 1.3 : 1), 1, gk * 0.6, 1);
    } else m.glint.visible = false;
    const ck = smooth(T.board[0], T.board[0] + 0.35, tt) * (1 - smooth(T.board[1] - 0.4, T.board[1], tt));
    m.chess.visible = ck > 0.01 && inside;
    m.chess.material.opacity = ck;
    const mp = tt >= T.mate && tt < T.board[1] ? (tt < T.mate + 0.17 ? 0.7 : tt < T.mate + 0.33 ? 1.12 : 1) : 0;
    holdOnScreen(cam, m.mate, 0, -0.34, 0.2, mp, -0.04, 1700 / 340);
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.banner.mesh} />
      <primitive object={m.mate} />
      <primitive object={m.chess} />
      <primitive object={m.glint} />
      <group ref={rig} visible={false}>
        <primitive object={m.shell} />
        <group ref={world}>
          {m.all.map((o) => (
            <primitive key={o.uuid} object={o} />
          ))}
        </group>
      </group>
    </>
  );
}
