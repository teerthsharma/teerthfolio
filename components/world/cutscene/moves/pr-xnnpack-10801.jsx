// XNNPACK: the SHONEN REVEAL. A memory tower of 16 slabs stands beside the
// pup with a dark gap in it (two missing slabs: the free space below the first
// live block). The gap speaks "It was inside you all along." and lights amber;
// the pup points at it, crouches and DIVES in (spinning, shrinking into the
// dark), the peak drops, a chip (6.42% of the tower) breaks off the top and
// shatters, and the pup springs back out of the gap into the light. A coral
// ghost line stays where the old peak was. The landform stays lit behind it.
// Cost: slabs 1 (instanced), gap 1, glow 1, chip 1, ghost 1, flash 1, shards 1;
// no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, Color, DoubleSide, Object3D, PlaneGeometry } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, landK, nudge, ramp, usePup } from "./g2/parts";

const TW = [2.0, 0, -3.0]; // the tower's foot, in the figure frame
const ROWS = 14;
const STEP = 0.14;
const GAP = [4, 5]; // the two slabs that were never placed
const GAP_MID = 0.075 + 4.5 * STEP; // the gap's middle height
const DROP = 0.3;
const DUMMY = new Object3D();

function Tower({ cut }) {
  const { tl } = cut;
  const slabs = useRef();
  const group = useRef();
  const gapMesh = useRef();
  const glow = useRef();
  const chip = useRef();
  const ghost = useRef();
  const geo = useMemo(() => new BoxGeometry(1.5, 0.12, 0.9), []);
  const mat = useMemo(() => flat("#ffffff"), []);
  const darkMat = useMemo(() => flat("#120c1c"), []);
  const glowMat = useMemo(() => flat(INK.amber, { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }), []);
  const chipMat = useMemo(() => flat("#ffe3a0"), []);
  const ghostMat = useMemo(() => flat(INK.coral, { transparent: true, opacity: 0.7 }), []);
  const gapGeo = useMemo(() => new BoxGeometry(1.46, 2 * STEP - 0.03, 0.86), []);
  const glowGeo = useMemo(() => new PlaneGeometry(1.1, 0.24), []);
  const chipGeo = useMemo(() => new BoxGeometry(1.5, 0.1, 0.9), []);
  const ghostGeo = useMemo(() => new BoxGeometry(1.7, 0.02, 0.02), []);
  const painted = useRef(false);
  const tS = tl.move[0] + 0.4; // the peak drops
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    group.current.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const drop = DROP * ease(ramp(tt, tS, tS + 0.3));
    const m = slabs.current;
    if (!painted.current) {
      painted.current = true;
      const a = new Color("#f6e8cc");
      const b = new Color("#f7c871");
      for (let i = 0; i < ROWS; i++) m.setColorAt(i, (i % 2 ? a : b).clone().multiplyScalar(0.8 + 0.2 * (i / ROWS)));
      m.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < ROWS; i++) {
      const up = ease(ramp(tt, 1.7 + i * 0.045, 2.15 + i * 0.045)) * out;
      const hole = GAP.includes(i);
      DUMMY.position.set(0, 0.075 + i * STEP - (i > GAP[1] ? drop : 0), 0);
      DUMMY.scale.set(hole ? 0.0001 : up + 0.0001, up + 0.0001, up + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    const born = ease(ramp(tt, 2.0, 2.5)) * out;
    gapMesh.current.scale.setScalar(born + 0.0001);
    gapMesh.current.position.y = GAP_MID;
    // the hole lights: a slow pulse from line A, flaring as the pup goes in
    const lit = ramp(tt, tl.lineA + 0.3, tl.lineA + 1.2) * (0.7 + 0.3 * Math.sin(tt * 5)) + 0.6 * (1 - ramp(tt, tS + 0.1, tS + 0.7)) * ramp(tt, tS - 0.5, tS);
    glow.current.visible = lit > 0.02;
    glowMat.opacity = Math.min(1, lit) * out;
    glow.current.scale.setScalar(born + 0.0001);
    chip.current.visible = tt < tS;
    chip.current.position.y = 0.075 + ROWS * STEP + 0.02;
    chip.current.scale.setScalar(ease(ramp(tt, 2.2, 2.7)) * out + 0.0001);
    ghost.current.visible = tt >= tS;
    ghost.current.position.y = 0.075 + (ROWS - 0.5) * STEP + 0.02;
    ghostMat.opacity = 0.7 * out;
  }, -0.4);
  return (
    <group ref={group} position={TW} visible={false}>
      <instancedMesh ref={slabs} args={[geo, mat, ROWS]} frustumCulled={false} />
      <mesh ref={gapMesh} geometry={gapGeo} material={darkMat} />
      <mesh ref={glow} geometry={glowGeo} material={glowMat} position={[0, GAP_MID, 0.455]} />
      <mesh ref={chip} geometry={chipGeo} material={chipMat} />
      <mesh ref={ghost} geometry={ghostGeo} material={ghostMat} />
    </group>
  );
}

export default function Reveal(cut) {
  const { tl, mode } = cut;
  const A = tl.lineA;
  const tDive = tl.move[0] - 0.05; // 4.35
  const tIn = tDive + 0.4; // inside the gap
  const tOut = tIn + 0.45; // springs back out
  const tEnd = tOut + 0.65;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, A)) * o;
    live.pose.point = ramp(t, A + 0.2, A + 0.7) * (1 - ramp(t, tDive - 0.5, tDive - 0.3)) * o;
    live.pose.crouch = ramp(t, tDive - 0.4, tDive - 0.05) * (1 - ramp(t, tDive + 0.05, tDive + 0.15)) * o;
    live.pose.spin = ramp(t, tDive, tIn) * (1 - ramp(t, tIn, tIn + 0.01));
    live.pose.raise = ramp(t, tEnd - 0.2, tEnd + 0.3) * o;
  });
  usePup(cut, (t, p, turn) => {
    const k = landK(cut.card, cut.place, live.seal.x, live.seal.z);
    const o = out(t);
    // out to the gap's mouth and back, on an arc; small inside it
    const tx = TW[0] * k - 0.2;
    const tz = TW[2] * k + 0.5;
    const go = ease(ramp(t, tDive, tIn)) * (1 - ease(ramp(t, tOut, tEnd)));
    nudge(p, turn, tx * go * o, (GAP_MID * k + 0.5 * Math.sin(Math.PI * go)) * go * o, tz * go * o);
    const shrink = ease(ramp(t, tDive + 0.15, tIn)) * (1 - ease(ramp(t, tOut, tOut + 0.25)));
    const pop = Math.sin(Math.PI * ramp(t, tOut + 0.15, tEnd)) * 0.12;
    p.scale.setScalar(Math.max(0.03, 1 - 0.97 * shrink + pop));
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Tower cut={cut} />
        <Flash color="#ffd27a" at={[TW[0], GAP_MID, TW[2] + 0.7]} fn={() => [Math.max(0.9 * ramp(T.t, tIn - 0.15, tIn) * (1 - ramp(T.t, tIn, tIn + 0.5)), 0.7 * ramp(T.t, tOut - 0.1, tOut) * (1 - ramp(T.t, tOut, tOut + 0.5))), 2.4]} />
        <Shards start={tl.move[0] + 0.4} dur={1.4} from={[TW[0], 2.5, TW[2]]} speed={1.6} up={2.2} gravity={5} size={0.12} count={20} colors={["#ffe3a0", INK.cream, INK.amber]} seed={4} />
      </Rig>
    </>
  );
}
