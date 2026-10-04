// the Ice Dam: JOJO, the MUDA barrage. Four beams cross the dam's crest; the
// fourth (coral, longer than the path it duplicates, and nearest the lens)
// speaks "Muda muda." and trembles. The pup throws a MUDA barrage: a fan of
// flipper afterimages jabbing on twos, the beams and the pup shaking with it
// (no Dio, no face). The fourth beam cracks into three, falls and drowns in
// the reservoir with a splash ring, and three beams remain.
// Cost: beams 1 (instanced, six), afterimages 1 (instanced), pool 1, glow 1,
// flash 1, ring 1, shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CapsuleGeometry, Color, CylinderGeometry, Object3D, PlaneGeometry } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Ring, Rig, Shards, T, clock, ease, flat, nudge, rand, ramp, usePup } from "./g2/parts";

const BASE = [2.3, 0, -3.0]; // the crest's centre, in the figure frame
const YS = [0.6, 1.05, 1.5]; // the three beams that stay
const FOURTH = { y: 1.85, z: 0.55, len: 3.9 }; // the redundant one: nearest the lens
const POOL_Y = 0.1;
const DUMMY = new Object3D();
const JABS = 16;

function Beams({ cut }) {
  const { tl } = cut;
  const tc = tl.move[0] + 0.4; // the crack
  const tB = tl.move[0] - 0.2; // the barrage starts
  const group = useRef();
  const beams = useRef();
  const pool = useRef();
  const geo = useMemo(() => new CylinderGeometry(0.07, 0.07, 1, 6).rotateZ(Math.PI / 2), []);
  const mat = useMemo(() => flat("#ffffff"), []);
  const hot = useMemo(() => new Color("#ff7a6b"), []);
  const white = useMemo(() => new Color("#fff1d8"), []);
  const tint = useMemo(() => new Color(), []);
  const poolMat = useMemo(() => flat("#6fd0e8", { transparent: true, opacity: 0.5, depthWrite: false }), []);
  const poolGeo = useMemo(() => new PlaneGeometry(4.4, 1.6).rotateX(-Math.PI / 2), []);
  const fall = useMemo(() => {
    const r = rand(17);
    return [0, 1, 2].map((i) => ({ dx: (i - 1) * 0.35 + (r() - 0.5) * 0.2, spin: (r() - 0.5) * 5, delay: i * 0.08, rot: (i - 1) * 0.12 }));
  }, []);
  const painted = useRef(false);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    group.current.visible = on;
    if (!on) return;
    const m = beams.current;
    if (!painted.current) {
      painted.current = true;
      const mint = new Color("#c4ffe6");
      const hot = new Color("#ff7a6b");
      for (let i = 0; i < 6; i++) m.setColorAt(i, i < 3 ? mint : hot);
      m.instanceColor.needsUpdate = true;
    }
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const shaking = ramp(tt, tB, tB + 0.1) * (1 - ramp(tt, tc + 0.6, tc + 1.0));
    const jx = ((Math.floor(tt * 12) * 7) % 5 - 2) * 0.025 * shaking;
    const jy = ((Math.floor(tt * 12) * 5) % 5 - 2) * 0.02 * shaking;
    group.current.position.set(BASE[0] + jx, jy, BASE[2]);
    for (let i = 0; i < 3; i++) {
      const up = ease(ramp(tt, 1.7 + i * 0.12, 2.2 + i * 0.12)) * out;
      DUMMY.position.set(0, YS[i], 0);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(3.6 * up + 0.0001, up + 0.0001, up + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    // the fourth: whole until the crack, then three pieces that fall into the pool
    const tremble = ramp(tt, tl.lineA, tc) * (1 - ramp(tt, tc, tc + 0.05));
    const born = ease(ramp(tt, 2.0, 2.5)) * out;
    for (let k = 0; k < 3; k++) {
      const f = fall[k];
      const u = Math.max(0, tt - tc - f.delay);
      const y = Math.max(POOL_Y, FOURTH.y - 0.5 * 9 * u * u);
      const sink = ramp(tt, tc + 0.75 + f.delay, tc + 1.15 + f.delay);
      const piece = FOURTH.len / 3;
      DUMMY.position.set(-FOURTH.len / 3 + k * piece + f.dx * ramp(tt, tc, tc + 0.7) + (((Math.floor(tt * 12) * 3 + k) % 3) - 1) * 0.03 * tremble, y - sink * 0.15, FOURTH.z);
      DUMMY.rotation.set(0, 0, f.rot * 0.3 + (u > 0 ? f.spin * Math.min(u, 0.6) : 0));
      const s = born * (1 - sink);
      DUMMY.scale.set(piece * 0.94 * s + 0.0001, s * (1 + 0.5 * tremble) + 0.0001, s + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(3 + k, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    // it throbs coral to hot cream on line A, then goes out as it drowns
    const throb = born * (0.5 + 0.5 * Math.sin(tt * 9)) * (1 - ramp(tt, tc, tc + 0.4));
    for (let k = 0; k < 3; k++) m.setColorAt(3 + k, tint.copy(hot).lerp(white, throb));
    m.instanceColor.needsUpdate = true;
    // the reservoir
    pool.current.scale.set(born + 0.001, 1, born + 0.001);
    pool.current.position.set(0.2, POOL_Y - 0.03, -0.9);
  }, -0.4);
  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={beams} args={[geo, mat, 6]} frustumCulled={false} />
      <mesh ref={pool} geometry={poolGeo} material={poolMat} renderOrder={1} />
    </group>
  );
}

// The barrage: sixteen flipper afterimages in a fan about the pup's shoulder,
// each up for 0.3 s, re-thrown every 0.64 s on a new angle.
function Barrage({ cut }) {
  const { tl } = cut;
  const tB = tl.move[0] - 0.2;
  const ref = useRef();
  const geo = useMemo(() => new CapsuleGeometry(0.075, 0.55, 3, 6).rotateZ(Math.PI / 2).translate(0.35, 0, 0), []);
  const mat = useMemo(() => flat("#9db4ea", { transparent: true, opacity: 0.8, depthWrite: false }), []);
  useFrame((state) => {
    const m = ref.current;
    const t = clock(state);
    m.visible = Boolean(live.arrival.id) && live.inStage;
    if (!m.visible) return;
    if (t < tB || t >= tB + 1.4) {
      m.scale.setScalar(0.0001);
      return;
    }
    m.scale.setScalar(1);
    const tt = onTwos(t);
    for (let j = 0; j < JABS; j++) {
      const rel = tt - tB - j * 0.04;
      const cycle = Math.floor(rel / 0.64);
      const ph = rel - cycle * 0.64;
      const live_ = rel >= 0 && ph < 0.3 && cycle < 2;
      const r = rand(j * 31 + cycle * 7 + 5)();
      const angle = -0.7 + (((j * 5 + cycle * 3) % JABS) / (JABS - 1)) * 1.2 + (r - 0.5) * 0.08; // below the head to just above level: never an ear
      const reach = 1.0 + 0.9 * ease(ramp(ph, 0, 0.12));
      const k = live_ ? 1 - ramp(ph, 0.12, 0.3) * 0.6 : 0;
      DUMMY.position.set(0.5 + 0.05 * Math.cos(angle) * reach, 0.3 + 0.05 * Math.sin(angle), 0.4);
      DUMMY.rotation.set(0, 0, angle);
      DUMMY.scale.set(reach * k + 0.0001, k + 0.0001, k + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(j, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return <instancedMesh ref={ref} args={[geo, mat, JABS]} visible={false} frustumCulled={false} renderOrder={4} />;
}

export default function Muda(cut) {
  const { tl, mode } = cut;
  const tB = tl.move[0] - 0.2;
  const tc = tl.move[0] + 0.4;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    const barrage = t > tB && t < tB + 1.4 ? 0.5 + 0.5 * (Math.floor(t * 14) % 2) : 0;
    live.pose.fist = ramp(t, tB - 0.1, tB + 0.1) * barrage * o;
    live.pose.raise = ramp(t, tB + 1.5, tB + 2.0) * o;
  });
  usePup(cut, (t, p, turn) => {
    const shake = ramp(t, tB, tB + 0.1) * (1 - ramp(t, tB + 1.4, tB + 1.6));
    const f = Math.floor(t * 12);
    nudge(p, turn, (((f * 7) % 5) - 2) * 0.03 * shake + 0.12 * shake, 0, (((f * 3) % 5) - 2) * 0.02 * shake);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Beams cut={cut} />
        <Ring squash={0.32} color="#9fe8ff" at={[BASE[0] + 0.2, POOL_Y + 0.2, BASE[2] - 0.9]} fn={() => [0.2 + 1.5 * ease(ramp(T.t, tc + 0.62, tc + 1.3)), T.t < tc + 0.62 ? 0 : 0.9 * (1 - ramp(T.t, tc + 0.62, tc + 1.4))]} />
        <Flash color="#ffb0a0" at={[BASE[0], FOURTH.y, BASE[2] + FOURTH.z]} fn={() => [T.t < tc ? 0 : 0.9 * (1 - ramp(T.t, tc, tc + 0.3)), 2.6]} />
        <Shards start={tc + 0.6} dur={1.0} from={[BASE[0] + 0.2, POOL_Y + 0.1, BASE[2] - 0.9]} speed={1.3} up={2.4} gravity={7} size={0.07} count={26} colors={["#9fe8ff", INK.cream]} seed={8} floor={POOL_Y} />
      </Rig>
      <Rig cut={cut} scaled={false}>
        <Barrage cut={cut} />
      </Rig>
    </>
  );
}
