// Faraday: Dragon Ball Z, the Fusion Dance (treatments/g4.md). TWO real pups:
// the pup (blue rim, E) and a guest that is a CLONE of the pup mesh (violet
// rim, H), mirrored about the line between them so every flipper swing and lean
// is the other's mirror image. Three side-steps, a knee-up lean, the tips
// almost touch; the first try is BOTCHED (POP: one round chonky blob, half blue
// and half violet, 4 drawings; BWOMP: it splits); they nod and redo it faster;
// the tips touch exactly, an amber spark, a hard white flash (one drawing) with
// a micro-shake, and ONE pup stands with a thick amber rim against a darkened
// stage while the amber coupling rises along two wires to an orb. A caped,
// turbaned teacher with crossed arms facepalms at the botch and nods at the
// end; a fence crowd of small pups bobs on twos and pops "!!".
// Cost: a pup clone is ~16 meshes; the guest (plain + shell) and the real
// pup's shell (top 6 masses) add ~38 calls; the rest is the teacher (4), the
// crowd (1 instanced + rail), wires, flash quads, words.
// Card: lib/world/cutscene/cards/p-faraday.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CatmullRomCurve3, CircleGeometry, Color, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, Shape, ShapeGeometry, TubeGeometry, Vector3 } from "three";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { figureAt, figureScale } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { PupClone, shellMaterial } from "./g4/clone";
import { ball, flap, hullOf, inkPair, join, limb, makeWord, swayMaterial, tintInk } from "./g4/ink";
import { Rig, glow, pulse, useInk } from "./g4/parts";

const BLUE = "#2f6bff";
const VIOLET = "#9b4dff";
const AMBER = "#ffb21a";
let CX = 1.0; // x of the line between the pups (their mirror plane); narrowed on a portrait screen
const WIRE = 72;
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];
const CROWD = 8;
const v1 = new Vector3();

// A helix of radius r about the vertical axis from y 0 to h, phase a0.
const helix = (r, h, a0) =>
  new TubeGeometry(
    new CatmullRomCurve3(
      Array.from({ length: 40 }, (_, i) => {
        const u = i / 39;
        const a = a0 + u * Math.PI * 4.5;
        return new Vector3(Math.cos(a) * r * (1 - 0.35 * u), 0.05 + u * h, Math.sin(a) * r * (1 - 0.35 * u));
      }),
    ),
    WIRE,
    0.035,
    5,
  );
const draw = (g, frac) => g.setDrawRange(0, Math.round(Math.max(0, Math.min(1, frac)) * WIRE) * 5 * 6);

// A hard-edged starburst of n points.
function starGeometry(n, outer, inner) {
  const s = new Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n;
    const r = i % 2 ? inner : outer;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(r, 0);
  }
  return new ShapeGeometry(s);
}

// The teacher: a tall coat, turban, arms crossed (or one hand to the brow), a cape.
function teacherParts() {
  const body = [
    limb([-0.11, 0, 0.02], [-0.13, 0.95, 0], 0.085, 0.11),
    limb([0.11, 0, 0.02], [0.13, 0.95, 0], 0.085, 0.11),
    limb([0, 0.7, 0], [0, 1.62, 0], 0.27, 0.27, 6, 1.35, 0.85),
    limb([-0.36, 1.6, 0], [0.36, 1.6, 0], 0.09, 0.09),
    limb([0, 1.62, 0], [0, 1.82, 0.01], 0.075, 0.065),
    ball([0, 1.94, 0.02], 0.16, 0.94, 1.1, 1),
    ball([0, 2.07, 0], 0.2, 1, 0.62, 1), // the turban outline
    limb([-0.36, 1.58, 0], [-0.4, 1.28, 0.2], 0.09, 0.075), // arms crossed over the chest
    limb([-0.4, 1.28, 0.2], [0.3, 1.34, 0.3], 0.075, 0.07),
    limb([0.36, 1.58, 0], [0.4, 1.28, 0.2], 0.09, 0.075),
  ];
  const palm = [limb([-0.36, 1.58, 0], [-0.48, 1.4, 0.16], 0.09, 0.075), limb([-0.48, 1.4, 0.16], [-0.1, 1.9, 0.22], 0.075, 0.065), ball([-0.08, 1.92, 0.23], 0.08)];
  return { body: join(body), palm: join(palm) };
}

// A small round pup silhouette for the fence crowd.
function crowdPup() {
  return join([ball([0, 0.3, 0], 0.3, 1, 0.8, 1.5), ball([0, 0.5, 0.42], 0.2), limb([0.28, 0.2, 0.1], [0.5, 0.05, 0.3], 0.07, 0.04), limb([-0.28, 0.2, 0.1], [-0.5, 0.05, 0.3], 0.07, 0.04)]);
}

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const { p } = useInk(card);
  const portrait = useThree((st) => st.size.width < st.size.height);
  const K = portrait ? 0.62 : 1;
  CX = portrait ? 0.45 : 1.0;
  const at = figureAt(card);
  const scale = figureScale(card);
  const T = {
    step: [3.6, 3.85, 4.1, 4.35], // three side-steps
    ha: [4.5, 4.9], // knee up, lean, the tips almost touch
    botch: [4.95, 5.28], // POP: four drawings of the blob
    split: 5.3, // BWOMP
    redo: [5.55, 5.7, 5.85], // faster steps
    ha2: [6.0, 6.28],
    flash: 6.3,
  };
  const H = (t) => {
    // half the gap between the pups' centres, stepped
    if (t < T.step[1]) return 1.5;
    if (t < T.step[2]) return 1.35;
    if (t < T.step[3]) return 1.2;
    if (t < T.ha[0]) return 1.1;
    if (t < T.botch[0]) return 1.1 - 0.12 * smooth(T.ha[0], T.ha[0] + 0.2, t);
    if (t < T.split + 0.1) return 0.98;
    if (t < T.redo[0]) return 1.3;
    if (t < T.redo[1]) return 1.15;
    if (t < T.redo[2]) return 1.05;
    if (t < T.ha2[0]) return 0.98;
    return 0.92;
  };
  const st = useRef({ x: 0, hop: 0, yaw: 0, lean: 0, sx: 1, sy: 1, sz: 1, jx: 0, jy: 0, blob: 0, fused: 0 }).current;
  const sealRef = useRef(null);

  const geo = useMemo(
    () => ({
      teacher: teacherParts(),
      crowd: crowdPup(),
      star: starGeometry(12, 1, 0.42),
      flash: new PlaneGeometry(12, 12),
      backdrop: new CircleGeometry(8, 40),
      rail: new BoxGeometry(11, 0.08, 0.08),
      post: new BoxGeometry(0.08, 0.7, 0.08),
      cape: flap(0.7, 1.5),
      orb: new IcosahedronGeometry(0.2, 1),
      halo: new CircleGeometry(1, 32),
      wireE: helix(0.62, 1.9, 0),
      wireH: helix(0.62, 1.9, Math.PI),
    }),
    [],
  );
  const hull = useMemo(() => ({ body: hullOf(geo.teacher.body), palm: hullOf(geo.teacher.palm) }), [geo]);
  const mats = useMemo(
    () => ({
      shellBlue: shellMaterial(BLUE, 0.045),
      shellViolet: shellMaterial(VIOLET, 0.045),
      shellReal: shellMaterial(BLUE, 0.045),
      flash: new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }),
      burst: new MeshBasicMaterial({ color: "#fff4cf", transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }),
      spark: new MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }),
      backdrop: new MeshBasicMaterial({ color: "#070310", transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }),
      wireE: glow(BLUE),
      wireH: glow(VIOLET),
      orb: new MeshBasicMaterial({ color: new Color("#ffe08a"), toneMapped: false, fog: false }),
      halo: glow("#ffe08a"),
      crowd: new MeshBasicMaterial({ color: new Color(p.ink), toneMapped: false, fog: false }),
      rail: new MeshBasicMaterial({ color: "#2a1a3a", toneMapped: false, fog: false }),
      cape: swayMaterial("#fbfaf7"),
    }),
    [p],
  );
  const crowd = useMemo(() => {
    const m = new InstancedMesh(geo.crowd, mats.crowd, CROWD);
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const words = useMemo(() => ({ pop: makeWord("POP", "#fff1d6", 0.5), bwomp: makeWord("BWOMP", "#fff1d6", 0.5), crowd: makeWord("!!", "#fbfaf7", 0.5) }), []);
  const o = useMemo(() => new Object3D(), []);

  const g = {
    guest: useRef(),
    gBody: useRef(),
    gShell: useRef(),
    rShell: useRef(),
    teacher: useRef(),
    palm: useRef(),
    base: useRef(),
    jit: useRef(),
    flash: useRef(),
    burst: useRef(),
    spark: useRef(),
    backdrop: useRef(),
    orb: useRef(),
    halo: useRef(),
    cape: useRef(),
  };

  useCutFrame((t, state) => {
    if (mode !== "full") return;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    tintInk(card, (card.stage?.halftone ?? 6) * 0.6 * state.gl.getPixelRatio());
    mats.cape.uniforms.uT.value = t;
    const botch = t >= T.botch[0] && t < T.split;
    const flash = t >= T.flash;

    // where the real pup is: slid off the centre to its mark, then stepping in with the guest
    const slide = smooth(2.9, 3.4, t);
    st.x = flash ? 0.4 : botch ? CX : (CX - H(Math.max(t, 3.6)) * K) * slide;
    // each step is a hop; the lean and jump come on the HA
    const hopAt = (a, d) => (t >= a && t < a + d ? Math.sin((Math.PI * (t - a)) / d) : 0);
    let hop = 0;
    for (const s0 of T.step.slice(0, 3)) hop = Math.max(hop, hopAt(s0, 0.25));
    for (const s0 of T.redo) hop = Math.max(hop, hopAt(s0, 0.15));
    const ha1 = smooth(T.ha[0], T.ha[0] + 0.15, t) * (1 - smooth(T.ha[1] - 0.1, T.ha[1], t));
    const ha2 = smooth(T.ha2[0], T.ha2[0] + 0.1, t) * (1 - smooth(T.ha2[1] - 0.06, T.ha2[1], t));
    const ha = Math.max(ha1, ha2);
    st.hop = 0.22 * hop + 0.18 * ha;
    st.yaw = flash ? 0.25 : botch ? 0 : 0.45 * smooth(3.0, 3.4, t);
    st.lean = -0.28 * ha;
    // the blob: the pup scaled (1.6, 0.8, 1.6) for four drawings
    st.blob = botch ? 1 : 0;
    st.sx = st.sz = botch ? 1.6 : 1;
    st.sy = botch ? 0.8 : 1;
    // after the split the pups pop back with a squash
    const sq = t >= T.split && t < T.split + 0.17 ? Math.sin((Math.PI * (t - T.split)) / 0.17) : 0;
    st.sy *= 1 - 0.25 * sq;
    st.sx *= 1 + 0.18 * sq;
    st.sz *= 1 + 0.18 * sq;
    // micro-shake on the flash
    const shaking = t >= T.flash && t < T.flash + 0.5;
    const sh = Math.floor((t - T.flash) * 24);
    st.jx = shaking ? ((sh % 2) * 2 - 1) * 0.07 : 0;
    st.jy = shaking ? ((sh % 3) - 1) * 0.04 : 0;
    g.jit.current.position.set(st.jx, st.jy, 0);

    // THE POSE: flippers swing on each step, then the HA, then the fused power pose
    const swing = T.step.slice(0, 3).some((s) => t >= s + 0.05 && t < s + 0.2) || T.redo.some((s) => t >= s + 0.03 && t < s + 0.12) ? 1 : 0;
    // arms out to both sides: the flippers swing on each step and are out and up on the HA, the tips meeting the other's
    live.pose.raise = Math.max(swing * 0.7, ha, flash ? smooth(T.flash + 0.1, T.flash + 0.4, t) : 0) * fade;
    live.pose.fist = flash ? smooth(T.flash + 0.2, T.flash + 0.5, t) : 0;

    // the guest: a clone mirrored about the line between them, in the pup's frame
    const ge = g.guest.current;
    const inF = Math.floor((t - tl.enter) * 12);
    const [gx, gy] = ENTER[inF] ?? [1, 1];
    const appear = t > tl.enter && !botch && !flash && fade > 0;
    ge.visible = appear;
    ge.position.set(2 * CX - st.x, st.hop, 0);
    ge.rotation.set(0, -st.yaw, -st.lean);
    ge.scale.set(-gx * st.sx, gy * st.sy, gx * st.sz);
    g.gBody.current.visible = true;

    // the real pup's blue rim, a thick shell; amber once the fusion lands; split blue/violet on the botch
    const sh2 = g.rShell.current;
    sh2.visible = t > tl.enter && fade > 0;
    const amber = flash ? smooth(T.flash + 0.05, T.flash + 0.25, t) : 0;
    mats.shellReal.uniforms.uA.value.set(amber > 0.5 ? AMBER : BLUE);
    mats.shellReal.uniforms.uB.value.set(VIOLET);
    mats.shellReal.uniforms.uSplit.value = botch ? 1 : 0;
    mats.shellReal.uniforms.uCx.value = live.seal.x + CX;
    mats.shellReal.uniforms.uK.value = 1;

    // the teacher: crossed arms, facepalm at the botch, a nod at the end; the cape whips in the fusion gust
    const te = g.teacher.current;
    const frame = Math.floor((t - tl.enter) * 12);
    const out = Math.floor((t - tl.collapse[0]) * 12);
    const f = out >= 0 ? 2 - out : frame;
    te.visible = f >= 0;
    const [tx, ty] = ENTER[f] ?? [1, 1];
    const nod = t > T.flash + 0.3 && t < T.flash + 0.7 ? Math.sin(((t - T.flash - 0.3) / 0.4) * Math.PI) * 0.08 : 0;
    te.scale.set(scale * tx, scale * ty, scale * tx);
    te.rotation.set(nod, -0.42, 0.012 * Math.sin(onTwos(t) * 2.2));
    const palmOn = botch || (t >= T.botch[0] && t < T.split + 0.5);
    g.palm.current.visible = palmOn;
    mats.cape.uniforms.uWind.value = 0.25 + 1.0 * smooth(T.flash, T.flash + 0.3, t) * (1 - smooth(T.flash + 1.2, T.flash + 2, t));

    // the crowd: small pups behind the fence bob on twos and jump at the fusion
    for (let i = 0; i < CROWD; i++) {
      const jump = flash && t < T.flash + 1.2 ? Math.abs(Math.sin((onTwos(t) - T.flash) * 9 + i)) * 0.4 : 0;
      const bob = Math.abs(Math.sin(onTwos(t) * 6 + i * 1.7)) * 0.08;
      o.position.set(-4.2 + i * 1.25, bob + jump, -5.6);
      o.rotation.set(0, 0.05 * Math.sin(i), 0);
      o.scale.setScalar(t > tl.enter && fade > 0 ? 1.1 : 0.0001);
      o.updateMatrix();
      crowd.setMatrixAt(i, o.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;

    // the words: POP and BWOMP at the botch, "!!" over the crowd at the fusion
    const place = (w, x, y, z, a, b) => {
      w.position.set(x, y, z);
      w.quaternion.copy(state.camera.quaternion);
      w.material.opacity = pulse(t, a, b, 0.06) * fade;
    };
    place(words.pop, CX, 1.9, 0.5, T.botch[0], T.botch[0] + 0.3);
    place(words.bwomp, CX, 1.9, 0.5, T.split, T.split + 0.5);
    place(words.crowd, 0.5, 1.5, -5, T.flash + 0.1, T.flash + 1.3);

    // the flash: one hard white drawing, full frame; a starburst on the pair; the spark at the touch
    const cam = state.camera;
    const fl = g.flash.current;
    fl.position.copy(cam.position).add(v1.set(0, 0, -1).applyQuaternion(cam.quaternion));
    fl.quaternion.copy(cam.quaternion);
    mats.flash.opacity = t >= T.flash && t < T.flash + 1 / 12 ? 1 : 0;
    const e = Math.max(0, t - T.flash);
    const bu = g.burst.current;
    bu.position.set(0.4, 1.0, 0.6);
    bu.quaternion.copy(cam.quaternion);
    bu.scale.setScalar(0.3 + onTwos(Math.min(1, e / 0.4)) * 2.6);
    mats.burst.opacity = e > 0 && e < 0.4 ? 1 : 0;
    const spk = g.spark.current;
    spk.position.set(CX, 1.0 + 0.0, 0.25);
    spk.quaternion.copy(cam.quaternion);
    spk.scale.setScalar(0.18 + 0.05 * Math.sin(onTwos(t) * 40));
    mats.spark.opacity = (t >= T.ha[0] + 0.1 && t < T.ha[1] && t > T.ha[0]) || (t >= T.ha2[0] + 0.1 && t < T.flash) ? 0.9 : 0;

    // the stage goes dark behind the pair so the rims separate
    const bd = g.backdrop.current;
    bd.position.set(0.5, 2.2, -4.0);
    bd.quaternion.copy(cam.quaternion);
    mats.backdrop.opacity = 0.62 * smooth(4.2, 4.6, t) * fade;

    // the amber coupling rises along two wires to an orb above the fused pup
    const up = smooth(T.flash + 0.3, T.flash + 1.5, t) * fade;
    draw(geo.wireE, up);
    draw(geo.wireH, up);
    mats.wireE.opacity = mats.wireH.opacity = 0.95 * (up > 0 ? 1 : 0) * fade;
    const orb = g.orb.current;
    orb.position.set(0.4, 0.05 + 1.9 * up, 0);
    orb.scale.setScalar(Math.max(0.001, onTwos(smooth(T.flash + 1.2, T.flash + 1.7, t)) * (1 + 0.1 * Math.sin(t * 9)) * fade));
    const hl = g.halo.current;
    hl.position.copy(orb.position);
    hl.quaternion.copy(cam.quaternion);
    hl.scale.setScalar(Math.max(0.001, orb.scale.x * 0.5));
    mats.halo.opacity = 0.3 * (orb.scale.x > 0.01 ? 1 : 0);
    g.base.current.position.set(0.4, 0, 0);
  });

  // the real pup: moved to its mark, hopping, leaning, blobbed (after Seal.jsx's reset every frame); the shell follows it
  useFrame((state) => {
    const seal = (sealRef.current ??= state.scene.getObjectByName("seal"));
    const on = Boolean(live.arrival.id) && mode === "full" && live.inStage && Boolean(seal);
    if (!seal) return;
    if (on) {
      seal.position.x += st.x + st.jx;
      seal.position.y += st.hop + st.jy;
      seal.rotation.y = st.yaw;
      seal.rotation.z = st.lean;
      seal.scale.set(st.sx, st.sy, st.sz);
      const sh = g.rShell.current;
      sh.position.copy(seal.position);
      sh.quaternion.copy(seal.quaternion);
      sh.scale.copy(seal.scale);
    } else if (seal.scale.x !== 1 || seal.rotation.z !== 0) {
      seal.scale.set(1, 1, 1);
      seal.rotation.z = 0;
    }
  }, 0.15);
  useEffect(
    () => () => {
      const s = sealRef.current;
      if (s) {
        s.scale.set(1, 1, 1);
        s.rotation.z = 0;
      }
    },
    [],
  );

  return (
    <>
      <Stage {...cut} />
      {mode === "still" ? <Speaker {...cut} /> : null}
      <Rig cut={cut}>
        <group ref={g.jit}>
          <group ref={g.guest} visible={false}>
            <group ref={g.gBody}>
              <PupClone gref={g.gBody} />
            </group>
            <group ref={g.gShell}>
              <PupClone gref={g.gShell} shell={mats.shellViolet} top={4} />
            </group>
          </group>
          <group ref={g.teacher} position={at} visible={false}>
            <mesh geometry={hull.body} material={inkPair().rim} />
            <mesh geometry={geo.teacher.body} material={inkPair().body} />
            <group ref={g.palm} visible={false}>
              <mesh geometry={hull.palm} material={inkPair().rim} />
              <mesh geometry={geo.teacher.palm} material={inkPair().body} />
            </group>
            <mesh geometry={geo.cape} material={mats.cape} position={[0, 1.62, -0.24]} rotation={[0.06, 0, 0]} />
          </group>
          <primitive object={crowd} />
          <mesh geometry={geo.rail} material={mats.rail} position={[0.4, 0.6, -5.2]} />
          {[-4, -1.3, 1.4, 4.3].map((x) => (
            <mesh key={x} geometry={geo.post} material={mats.rail} position={[x, 0.3, -5.2]} />
          ))}
          <mesh ref={g.spark} geometry={geo.star} material={mats.spark} renderOrder={30} />
          <mesh ref={g.burst} geometry={geo.star} material={mats.burst} renderOrder={31} />
          <mesh ref={g.backdrop} geometry={geo.backdrop} material={mats.backdrop} />
          {words.pop ? <primitive object={words.pop} /> : null}
          {words.bwomp ? <primitive object={words.bwomp} /> : null}
          {words.crowd ? <primitive object={words.crowd} /> : null}
          <group ref={g.base}>
            <mesh geometry={geo.wireE} material={mats.wireE} />
            <mesh geometry={geo.wireH} material={mats.wireH} />
          </group>
          <mesh ref={g.orb} geometry={geo.orb} material={mats.orb} />
          <mesh ref={g.halo} geometry={geo.halo} material={mats.halo} />
        </group>
      </Rig>
      <group ref={g.rShell} visible={false}>
        <PupClone gref={g.rShell} shell={mats.shellReal} top={4} />
      </group>
      <mesh ref={g.flash} geometry={geo.flash} material={mats.flash} renderOrder={50} frustumCulled={false} />
    </>
  );
}
