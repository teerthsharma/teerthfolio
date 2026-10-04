// the Ice Dam: JOJO, the MUDA barrage. The dam's own landform is switched off
// and its crest stands bare: two posts and a slab. Three mint beams cross it
// between the posts; the fourth is ONE whole coral beam, nearest the lens and
// longer than the path it duplicates. It speaks "Muda muda." and trembles from
// 3.0 s. The pup throws a MUDA barrage: a fan of flipper afterimages jabbing on
// twos up and to the right at the coral beam, a spark on the beam with each
// jab, the crest and the pup shaking with it (and a two-drawing shake of the
// whole crest on the last jab; no Dio, no face). At 4.2 s the coral beam
// cracks into three, falls and drowns in the reservoir with a splash ring, and
// three beams remain. On a portrait screen the crest narrows to fit.
// Cost: beams 1 (instanced, seven), crest 1 (instanced, three), afterimages 1
// (instanced), sparks 1 (instanced), pool 1, flash 1, ring 1, shards 1; no post
// pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CapsuleGeometry, Color, CylinderGeometry, Object3D, OctahedronGeometry, PlaneGeometry } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Ring, Rig, Shards, T, clock, ease, flat, landK, nudge, rand, ramp, useHideLand, usePup } from "./g2/parts";

const BASE = [1.3, 0, -3.0]; // the crest's centre, in the figure frame
const YS = [0.6, 1.05, 1.5]; // the three beams that stay
const FOURTH = { y: 1.85, z: 0.55, len: 3.9 }; // the redundant one: nearest the lens
const POOL_Y = 0.1;
const DUMMY = new Object3D();
const JABS = 16;
const TB = 2.9; // the barrage starts
const TREMBLE = 3.0; // the coral beam starts to tremble
const TC = 4.2; // the crack
// the crest narrows on a portrait screen (the beams must never leave the frame)
const FIT = { s: 1 };
const fit = (aspect) => (FIT.s = aspect < 1 ? 0.62 : 1);

function Beams({ cut }) {
  const { tl } = cut;
  const group = useRef();
  const beams = useRef();
  const crest = useRef();
  const pool = useRef();
  const geo = useMemo(() => new CylinderGeometry(0.07, 0.07, 1, 6).rotateZ(Math.PI / 2), []);
  const mat = useMemo(() => flat("#ffffff"), []);
  const crestGeo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const crestMat = useMemo(() => flat("#efe6ff"), []);
  const hot = useMemo(() => new Color("#ff6b5e"), []);
  const warm = useMemo(() => new Color("#ffa08a"), []);
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
    fit(state.camera.aspect);
    const S = FIT.s;
    const m = beams.current;
    if (!painted.current) {
      painted.current = true;
      const mint = new Color("#8ff0c8");
      for (let i = 0; i < 3; i++) m.setColorAt(i, mint);
      m.instanceColor.needsUpdate = true;
    }
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const f = Math.floor(tt * 12);
    const shaking = ramp(tt, TB, TB + 0.1) * (1 - ramp(tt, TC + 0.6, TC + 1.0));
    // two drawings of a hard shake of the whole crest on the last jab
    const slam = tt >= TC - 0.17 && tt < TC ? (f % 2 ? 1 : -1) : 0;
    const jx = ((f * 7) % 5 - 2) * 0.025 * shaking + 0.09 * slam;
    const jy = ((f * 5) % 5 - 2) * 0.02 * shaking - 0.05 * slam;
    group.current.position.set(BASE[0] + jx, jy, BASE[2]);
    // the crest: a slab and two posts the beams are seated between
    const born = ease(ramp(tt, 2.0, 2.5)) * out;
    const parts = [
      [0, 0.1, 0, 4.3 * S, 0.2, 1.1],
      [-1.95 * S, 1.1, 0, 0.24, 2.2, 0.34],
      [1.95 * S, 1.1, 0, 0.24, 2.2, 0.34],
    ];
    for (let i = 0; i < 3; i++) {
      const p = parts[i];
      DUMMY.position.set(p[0], p[1], p[2]);
      DUMMY.scale.set(p[3] * born + 0.0001, p[4] * born + 0.0001, p[5] * born + 0.0001);
      DUMMY.updateMatrix();
      crest.current.setMatrixAt(i, DUMMY.matrix);
    }
    crest.current.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 3; i++) {
      const up = ease(ramp(tt, 1.7 + i * 0.12, 2.2 + i * 0.12)) * out;
      DUMMY.position.set(0, YS[i], 0);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(3.6 * S * up + 0.0001, up + 0.0001, up + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    // the fourth: ONE whole coral beam until the crack, trembling from 3.0 s
    const fb = ease(ramp(tt, 2.0, 2.5)) * out;
    const tremble = ramp(tt, TREMBLE, TREMBLE + 0.3) * (1 - ramp(tt, TC, TC + 0.05));
    const shiver = (((f * 3) % 5) - 2) * 0.03 * tremble;
    const whole = tt < TC ? fb : 0;
    DUMMY.position.set(shiver, FOURTH.y + (((f * 5) % 3) - 1) * 0.025 * tremble, FOURTH.z);
    DUMMY.rotation.set(0, 0, 0.012 * (((f * 7) % 3) - 1) * tremble);
    DUMMY.scale.set(FOURTH.len * S * whole + 0.0001, 1.5 * whole + 0.0001, 1.5 * whole + 0.0001);
    DUMMY.updateMatrix();
    m.setMatrixAt(3, DUMMY.matrix);
    // then three pieces that fall into the pool
    for (let k = 0; k < 3; k++) {
      const fl = fall[k];
      const u = Math.max(0, tt - TC - fl.delay);
      const y = Math.max(POOL_Y, FOURTH.y - 0.5 * 9 * u * u);
      const sink = ramp(tt, TC + 0.75 + fl.delay, TC + 1.15 + fl.delay);
      const piece = (FOURTH.len * S) / 3;
      DUMMY.position.set(-(FOURTH.len * S) / 3 + k * piece + fl.dx * ramp(tt, TC, TC + 0.7), y - sink * 0.15, FOURTH.z);
      DUMMY.rotation.set(0, 0, fl.rot * 0.3 + (u > 0 ? fl.spin * Math.min(u, 0.6) : 0));
      const s = tt >= TC ? fb * (1 - sink) : 0;
      DUMMY.scale.set(piece * 0.94 * s + 0.0001, 1.5 * s + 0.0001, 1.5 * s + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(4 + k, DUMMY.matrix);
    }
    DUMMY.rotation.set(0, 0, 0);
    m.instanceMatrix.needsUpdate = true;
    // it throbs coral to a warm coral (never cream: it must stay the one that is not mint), then goes out as it drowns
    const throb = fb * (0.5 + 0.5 * Math.sin(tt * 9)) * (1 - ramp(tt, TC, TC + 0.4)) * (tt < TC ? 1 : 0.6);
    for (let k = 3; k < 7; k++) m.setColorAt(k, tint.copy(hot).lerp(warm, throb));
    m.instanceColor.needsUpdate = true;
    // the reservoir
    pool.current.scale.set(born + 0.001, 1, born + 0.001);
    pool.current.position.set(0.2, POOL_Y - 0.03, -0.9);
  }, -0.4);
  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={crest} args={[crestGeo, crestMat, 3]} frustumCulled={false} />
      <instancedMesh ref={beams} args={[geo, mat, 7]} frustumCulled={false} />
      <mesh ref={pool} geometry={poolGeo} material={poolMat} renderOrder={1} />
    </group>
  );
}

// The barrage: sixteen flipper afterimages in a fan about the pup's shoulder,
// aimed up and right at the coral beam, each up for 0.3 s and re-thrown every
// 0.64 s on a new angle; a spark flares on the beam with each jab.
const SHOULDER = [0.5, 0.3, 0.4];
// a stable 0..1 from three small integers (the seeded rand's first draws are all near 0)
const hash = (a, b, c) => Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1;
const BEAM = [BASE[0], FOURTH.y, BASE[2] + FOURTH.z]; // the coral beam's midpoint, in the scaled frame
function Barrage({ cut }) {
  const ref = useRef();
  const sparks = useRef();
  const geo = useMemo(() => new CapsuleGeometry(0.075, 0.55, 3, 6).rotateZ(Math.PI / 2).translate(0.35, 0, 0), []);
  const mat = useMemo(() => flat("#9db4ea", { transparent: true, opacity: 0.8, depthWrite: false }), []);
  const sparkGeo = useMemo(() => new OctahedronGeometry(1, 0).scale(0.45, 1, 0.45), []);
  const sparkMat = useMemo(() => flat("#fff1d8"), []);
  useFrame((state) => {
    const m = ref.current;
    const sp = sparks.current;
    const t = clock(state);
    m.visible = sp.visible = Boolean(live.arrival.id) && live.inStage;
    if (!m.visible) return;
    if (t < TB || t >= TB + 1.5) {
      m.scale.setScalar(0.0001);
      sp.scale.setScalar(0.0001);
      return;
    }
    m.scale.setScalar(1);
    sp.scale.setScalar(1);
    fit(state.camera.aspect);
    const k = landK(cut.card, cut.place, live.seal.x, live.seal.z);
    // the beam in the pup's own (unscaled) frame, and the angle from the shoulder to it
    const tx = k * BEAM[0];
    const ty = k * BEAM[1];
    const base = Math.atan2(ty - SHOULDER[1], tx - SHOULDER[0]);
    const tt = onTwos(t);
    for (let j = 0; j < JABS; j++) {
      const rel = tt - TB - j * 0.04;
      const cycle = Math.floor(rel / 0.64);
      const ph = rel - cycle * 0.64;
      const live_ = rel >= 0 && ph < 0.3 && cycle < 2;
      const r = rand(j * 31 + cycle * 7 + 5)();
      const angle = base - 0.28 + (((j * 5 + cycle * 3) % JABS) / (JABS - 1)) * 0.56 + (r - 0.5) * 0.06;
      const reach = 2.4 + 2.6 * ease(ramp(ph, 0, 0.12));
      const a = live_ ? 1 - ramp(ph, 0.12, 0.3) * 0.6 : 0;
      DUMMY.position.set(SHOULDER[0] + 0.05 * Math.cos(angle) * reach, SHOULDER[1] + 0.05 * Math.sin(angle), SHOULDER[2]);
      DUMMY.rotation.set(0, 0, angle);
      DUMMY.scale.set(reach * a + 0.0001, a + 0.0001, a + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(j, DUMMY.matrix);
      // the impact spark on the beam, as the jab lands
      const hit = live_ ? ramp(ph, 0.08, 0.12) * (1 - ramp(ph, 0.2, 0.3)) : 0;
      const along = (hash(j, cycle, 1) - 0.5) * FOURTH.len * FIT.s * 0.85;
      DUMMY.position.set(k * (BEAM[0] + along), ty + (hash(j, cycle, 2) - 0.5) * 0.2, k * (BEAM[2] + 0.1));
      DUMMY.rotation.set(0, 0, hash(j, cycle, 3) * 3);
      DUMMY.scale.setScalar(0.16 * k * hit + 0.0001);
      DUMMY.updateMatrix();
      sp.setMatrixAt(j, DUMMY.matrix);
    }
    DUMMY.rotation.set(0, 0, 0);
    m.instanceMatrix.needsUpdate = true;
    sp.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, JABS]} visible={false} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={sparks} args={[sparkGeo, sparkMat, JABS]} visible={false} frustumCulled={false} renderOrder={5} />
    </>
  );
}

export default function Muda(cut) {
  const { tl, mode } = cut;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useHideLand();
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    const barrage = t > TB && t < TB + 1.4 ? 0.5 + 0.5 * (Math.floor(t * 14) % 2) : 0;
    live.pose.fist = ramp(t, TB - 0.1, TB + 0.1) * barrage * o;
    live.pose.raise = ramp(t, TB + 1.5, TB + 2.0) * o;
  });
  usePup(cut, (t, p, turn) => {
    const shake = ramp(t, TB, TB + 0.1) * (1 - ramp(t, TB + 1.4, TB + 1.6));
    const f = Math.floor(t * 12);
    nudge(p, turn, (((f * 7) % 5) - 2) * 0.03 * shake + 0.12 * shake, 0, (((f * 3) % 5) - 2) * 0.02 * shake);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Beams cut={cut} />
        <Ring squash={0.32} color="#9fe8ff" at={[BASE[0] + 0.2, POOL_Y + 0.2, BASE[2] - 0.9]} fn={() => [0.2 + 1.5 * ease(ramp(T.t, TC + 0.62, TC + 1.3)), T.t < TC + 0.62 ? 0 : 0.9 * (1 - ramp(T.t, TC + 0.62, TC + 1.4))]} />
        <Flash color="#ffb0a0" at={[BASE[0], FOURTH.y, BASE[2] + FOURTH.z]} fn={() => [T.t < TC ? 0 : 0.9 * (1 - ramp(T.t, TC, TC + 0.3)), 2.6]} />
        <Shards start={TC + 0.6} dur={1.0} from={[BASE[0] + 0.2, POOL_Y + 0.1, BASE[2] - 0.9]} speed={1.3} up={2.4} gravity={7} size={0.07} count={26} colors={["#9fe8ff", INK.cream]} seed={8} floor={POOL_Y} />
      </Rig>
      <Rig cut={cut} scaled={false}>
        <Barrage cut={cut} />
      </Rig>
    </>
  );
}
