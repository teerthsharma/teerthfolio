// xnnpack: Bleach, Aizen's throne in Las Noches, in shape and colour only, in a
// STARK MINIMAL dimension (Kubo's negative space): near-monochrome, an endless
// white desert under a black sky with a crescent moon, razor-thin ink lines a
// pixel wide, a single cold blue accent. The pup signs and the island becomes
// Las Noches: dunes drawn in contour lines, white dead trees, the dome-and-
// towers palace on the horizon. A towering throne rises out of the sand with
// the pup on it, reclined in Aizen's seated pose; Aizen's silhouette (swept
// hair, the one lock, the long coat, Kyoka Suigetsu held low) stands beside it
// and the Bleach cast stands at its foot in ink (Ichigo with the huge cleaver,
// Gin with the narrow smile, Urahara in the striped bucket hat with his cane),
// the island's colony pups cheering on twos among them.
// Aizen: "Since when were you under the impression the gap was not there?"
// Ichigo slashes; the glass of the picture cracks once, the real island shows
// through the holes, and the illusion re-forms. Ichigo: "Where did that space
// even come from?" The pup: "It was there all along." The truth snaps Aizen's
// sword; the crack runs out from the blade over everything and the whole
// dimension falls like glass (the sword broke, so Kyoka Suigetsu is over): the
// pup drops with it to the real island. The flex line and the credit card
// come on the snow. No post pass: the flash is one quad, the lettering a plane.
// Card: lib/world/cutscene/cards/pr-xnnpack-10801.js. Parts: ./pr-xnnpack-10801/.
// Cost (what the old move got wrong): every count is fixed here, all instanced
// or merged; nothing allocates in a frame.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, InstancedMesh, Object3D, PlaneGeometry, Quaternion, RingGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { flashQuad, hide, holdFlash, islandList, lettering, mat, pupParts, put } from "./p-caustic/parts";
import { solid } from "./pr-xnnpack-10801/geo";
import { INK, PAPER, hullMaterial, paperMaterial, pupInk, sharedUniforms, silhouetteMaterial } from "./pr-xnnpack-10801/ink";
import { aizen, colonyPup, gin, ichigo, urahara } from "./pr-xnnpack-10801/shapes";
import { MOON_R, MOON_TALL, MOON_WIDE, SEAT, THRONE_Z, desert, moon, palace, skyShell, throne, throneInk, trees } from "./pr-xnnpack-10801/world";

const CORE_Y = 0.9;
// the clock (s from the arrival); the card puts line A at 3.0, Ichigo's line at 6.4 and the flex at 9.4
const T = { rise: [1.5, 3.0], sit: [2.7, 3.2], hype: 3.3, slash: [4.85, 5.4], crack: 5.35, holeIn: [5.4, 5.75], holeOut: [6.0, 6.45], webOut: [6.0, 6.5], reach: [9.25, 9.6], gap: [9.3, 9.6], snap: 9.6, web: [9.65, 9.98], brk: 10.0 };
const N_PUPS = 10;
const AIZEN_AT = [4.0, 1.2, 0.4];
const ICHIGO_AT = [-4.6, 0.6, 4.2];
const GIN_AT = [-2.8, 0.6, 4.0];
const URAHARA_AT = [4.9, 0.6, 4.1];
const PUPS_Z = 4.6;
const SLASH_AT = [-3.3, 3.3, 4.6];
const CRACK1 = [-7, 11, -26]; // where the first crack opens in the sky (rig frame)
// [look, eye] on the island (k = 0) and on the throne (k = 1); the move writes the card's view from these
const VIEW = {
  wide: [[[0.4, 1.15, -1.0], [-0.1, 0.0, 10.6]], [[0.5, 4.2, -1.0], [0.2, -2.4, 18.5]]],
  tall: [[[0.3, 1.45, -1.0], [-0.1, 0.05, 13.5]], [[0.4, 5.0, -1.0], [0.2, -3.0, 34.0]]],
};
const TUNE = { fx: 0, fy: 0.2, fz: 0.2 };
const UP = new Vector3(0, 1, 0);
const V = new Vector3();
const W = new Vector3();
const MOON_P = new Vector3();
const Q = new Quaternion();
const RES = new Vector2();
const lerp3 = (out, a, b, k) => {
  for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * k;
};

// Ichigo's slash: a thin arc of cold light that sweeps on (uK 0..1) and fades behind its head
function slashMaterial() {
  return new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vP;
      void main() {
        float a = atan(vP.y, vP.x);
        float t = (a - 0.15) / 2.6;
        if (t < 0.0 || t > 1.0) discard;
        float w = 0.012 + 0.07 * sin(3.14159 * t);
        float d = abs(length(vP) - 1.0);
        if (d > w) discard;
        float head = smoothstep(uK - 0.35, uK, t) * step(t, uK);
        float core = 1.0 - smoothstep(0.0, w, d);
        vec3 c = mix(vec3(0.373, 0.714, 1.0), vec3(1.0), core * 0.8);
        gl_FragColor = vec4(pow(c, vec3(2.2)) * head * (0.4 + 0.6 * core), 1.0);
      }`,
  });
}

function buildWorld() {
    const shared = sharedUniforms();
    const hullPaper = hullMaterial(shared, PAPER, 1);
    const cp = colonyPup();
    const cpBody = solid([cp.body]);
    const cpArms = solid([cp.arms]);
    const inkBasic = mat({ color: INK });
    const bodies = new InstancedMesh(cpBody.g, inkBasic, N_PUPS);
    const bodiesLine = new InstancedMesh(cpBody.hull, hullPaper, N_PUPS);
    bodiesLine.instanceMatrix = bodies.instanceMatrix;
    const arms = new InstancedMesh(cpArms.g, inkBasic, N_PUPS);
    const armsLine = new InstancedMesh(cpArms.hull, hullPaper, N_PUPS);
    armsLine.instanceMatrix = arms.instanceMatrix;
    for (const x of [bodies, arms]) {
      x.frustumCulled = false;
      for (let i = 0; i < N_PUPS; i++) hide(x, i);
    }
    bodiesLine.frustumCulled = armsLine.frustumCulled = false;
    const gi = gin();
    const ur = urahara();
    return {
      shared,
      shell: skyShell(shared),
      ground: desert(),
      tsuki: moon(shared),
      paperG: paperMaterial(shared, 2),
      paperP: paperMaterial(shared, 1),
      paper: paperMaterial(shared, 0),
      sil: silhouetteMaterial(shared),
      hullInk: hullMaterial(shared, INK, 1),
      hullPaper,
      pal: palace(),
      tr: trees(),
      th: throne(),
      thInk: throneInk(),
      az: aizen(),
      ic: ichigo(),
      gi,
      ur,
      cpBody,
      cpArms,
      inkBasic,
      bodies,
      bodiesLine,
      arms,
      armsLine,
      detail: mat({ color: PAPER, side: DoubleSide }),
      gap: mat({ color: "#5fb6ff", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
      gapG: new PlaneGeometry(5.2, 0.26),
      slashM: slashMaterial(),
      slashG: new RingGeometry(0.85, 1.15, 48, 1, 0.1, 2.7),
      letA: lettering("KYOKA SUIGETSU", "#080a0f", -0.06),
      letB: lettering("ILLUSION BROKEN", "#080a0f", 0.05),
      flash: flashQuad("#d8ecff"),
    };
}

// THE APPROACH: the shared prewarm (../prewarm.js) builds the world while the seal walks up; the arrival takes it.
registerWarm("pr-xnnpack-10801", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const dais = useRef();
  const moonRef = useRef();
  const dust = useRef();
  const hullsRef = useRef([]);
  const detailRef = useRef([]);
  const tipRef = useRef();
  const gapRef = useRef();
  const slashRef = useRef();
  const colonyRef = useRef();
  const ichRef = useRef();
  const pup = useRef(null);
  const lift = useRef(0);
  const shake = useRef(new Vector3());
  const ink = useRef(null);
  const island = useRef([]);
  const islandOn = useRef(false);

  const m = useMemo(() => takeWarm("pr-xnnpack-10801", buildWorld), []);

  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    ink.current = p?.root ? pupInk(p.root, m.shared) : null;
    return () => {
      ink.current?.dispose();
      ink.current = null;
      pup.current = null;
      // everything the scene built goes with it
      const geos = [m.shell.g, m.ground, m.tsuki.g, m.pal.g, m.pal.hull, m.tr.g, m.tr.hull, m.th.g, m.th.hull, m.thInk, m.az.body, m.az.hull, m.az.bladeLow.g, m.az.bladeLow.hull, m.az.bladeTip.g, m.az.bladeTip.hull, m.ic.g, m.ic.hull, m.gi.g, m.gi.hull, m.gi.smile, m.ur.g, m.ur.hull, m.ur.stripes, m.cpBody.g, m.cpBody.hull, m.cpArms.g, m.cpArms.hull, m.gapG, m.slashG, m.letA.geometry, m.letB.geometry, m.flash.geometry];
      for (const g of geos) g.dispose();
      const mats = [m.shell.m, m.tsuki.m, m.paperG, m.paperP, m.paper, m.sil, m.hullInk, m.hullPaper, m.inkBasic, m.detail, m.gap, m.slashM, m.letA.material, m.letB.material, m.flash.material];
      for (const x of mats) x.dispose();
      m.letA.material.map?.dispose();
      m.letB.material.map?.dispose();
      for (const x of [m.bodies, m.bodiesLine, m.arms, m.armsLine]) x.dispose();
    };
  }, [scene, m]);

  // the pup rides the throne; impacts shake the frame two drawings each (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the dimension draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      ink.current?.set(false);
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.x += shake.current.x;
      p.root.position.y += lift.current + shake.current.y;
    }
  }, -0.5);

  // Aizen's chin-on-flipper: after the pup poses itself (D.jsx, priority 0), the head cants onto the near flipper
  useFrame(() => {
    const p = pup.current;
    if (!p?.head || !p.rear || mode !== "full" || !live.arrival.id) return;
    const k = Math.min(1, live.pose.point / 0.7);
    if (k <= 0.01) return;
    const fr = p.rear.children.find((o) => o.type === "Group" && o.scale.x < 0)?.children[0];
    p.head.rotation.z += -0.32 * k;
    p.head.rotation.x += 0.12 * k;
    if (fr) {
      fr.position.y += TUNE.fy * k;
      fr.position.z += TUNE.fz * k;
      fr.position.x += TUNE.fx * k;
    }
  }, 1);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) {
      ink.current?.set(false);
      shake.current.set(0, 0, 0);
      lift.current = 0;
      return;
    }
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const cam = state.camera;
    const brk = tt - T.brk; // seconds since the dimension broke
    const broken = brk > 0;
    const held = brk > 0.45; // the pup keeps its ink while it falls, and lands in full colour
    const wide = state.size.width / state.size.height >= 1;
    const sh = m.shared;

    // the rig: the pup at the origin, turned so XNNPACK's mountain stands ahead and right when the island returns
    const turn = turnFor(card, place, s.x, s.z);
    const hit = (h, k) => (tt >= h && tt < h + 0.17 ? k : 0);
    const amp = hit(T.crack, 0.07) + hit(T.snap, 0.05) + hit(T.brk, 0.16) + (tt > T.rise[0] && tt < T.rise[1] ? 0.025 : 0);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.y = turn;
    g.updateWorldMatrix(true, false);

    // THE THRONE rises out of the sand; the pup is carried up on its seat, and drops on the break
    const rise = smooth(T.rise[0], T.rise[1], tt);
    const dropK = Math.min(1, Math.max(0, brk / 0.5));
    const seatTop = SEAT - (SEAT + 2) * (1 - rise);
    lift.current = broken ? SEAT * (1 - dropK * dropK) : Math.max(0, seatTop);
    dais.current.position.set(0, -(SEAT + 2) * (1 - rise), 0);

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until it breaks
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    shellRef.current.visible = r > 0.02 && brk < 1.6;
    shellRef.current.scale.setScalar(inside || broken ? 140 : Math.max(r, 0.02));
    world.current.visible = (inside || broken) && brk < 1.6;
    sh.uTime.value = t;
    sh.uBreak.value = brk;
    state.gl.getDrawingBufferSize(RES);
    sh.uRes.value.copy(RES);
    sh.uPx.value = 1.5 * state.gl.getPixelRatio();
    MOON_P.copy(wide ? MOON_WIDE : MOON_TALL);
    moonRef.current.position.copy(MOON_P);
    moonRef.current.lookAt(cam.position);
    sh.uMoon.value.copy(MOON_P).applyAxisAngle(UP, turn).add(V.set(s.x, 0, s.z));
    for (const h of hullsRef.current) if (h) h.visible = !broken;

    // THE GLASS: the first crack from Ichigo's slash (holes, then it mends), the second from the sword (it falls)
    const hole = smooth(T.holeIn[0], T.holeIn[1], tt) * (1 - smooth(T.holeOut[0], T.holeOut[1], tt)) * 0.8;
    const web1 = smooth(T.crack, T.crack + 0.2, tt) * (1 - smooth(T.webOut[0], T.webOut[1], tt));
    const web2 = smooth(T.web[0], T.web[1], tt);
    sh.uHole.value = hole;
    sh.uCrack.value = tt >= T.web[0] ? web2 : web1;
    if (tt >= T.web[0]) W.set(AIZEN_AT[0] - 0.65, AIZEN_AT[1] + 0.9, AIZEN_AT[2] + 0.4); // out from the snapped blade
    else W.set(CRACK1[0], CRACK1[1], CRACK1[2]);
    W.applyAxisAngle(UP, turn).add(V.set(s.x, 0, s.z)).sub(cam.position).normalize();
    sh.uCrackDir.value.copy(W);
    // the real island shows through the holes (and is put away again as the glass mends)
    const want = hole > 0.03 || (broken && brk > 0.02);
    if (want !== islandOn.current) {
      islandOn.current = want;
      for (const o of island.current) o.visible = want;
    }

    // THE PUP IN INK takes the dimension from the bloom to the landing, then snaps back to full colour
    ink.current?.set((inside || tt > tl.bloom[1]) && !held);
    // the pup: the sign, then up on the throne, sat back with a flipper across its chest (Aizen's pose),
    // arms up for the truth, blown low at the break, the fist for the flex
    const reach = smooth(T.reach[0], T.reach[0] + 0.15, tt);
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.sit = smooth(T.sit[0], T.sit[1], tt) * (1 - reach);
    live.pose.point = 0.7 * smooth(T.sit[1], T.sit[1] + 0.4, tt) * (1 - reach);
    live.pose.raise = smooth(T.reach[0], T.reach[1], tt) * (1 - smooth(T.brk, T.brk + 0.12, tt));
    live.pose.crouch = smooth(T.brk + 0.4, T.brk + 0.45, tt) * (1 - smooth(T.brk + 0.6, T.brk + 0.95, tt)) * 0.8;
    live.pose.fist = smooth(T.brk + 1.0, T.brk + 1.3, tt) * out;

    // the card's view and the pup's tail follow the pup: the throne framing while it sits up there, the island's on the drop
    const kc = broken ? 1 - smooth(0.15, 1.25, brk) : lift.current / SEAT;
    const V0 = wide ? VIEW.wide : VIEW.tall;
    const vw = wide ? card.view.wide : card.view.tall;
    lerp3(vw[0], V0[0][0], V0[1][0], kc);
    lerp3(vw[1], V0[0][1], V0[1][1], kc);
    card.tail.c[1] = 1.05 + lift.current + 0.5 * kc;

    // THE COLONY PUPS pop in at the throne's foot, a pair at a time, and cheer on twos
    const f12 = Math.floor(t * 12);
    for (let i = 0; i < N_PUPS; i++) {
      const pair = i >> 1;
      const sd = i & 1 ? 1 : -1;
      const born0 = T.hype + pair * 0.16;
      const born = smooth(born0, born0 + 0.2, tt);
      const k = 0.42 * born * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - born0) / 0.3)));
      const up = (f12 + pair * 2 + (i & 1)) % 4 < 2;
      const x = -1.1 + pair * 1.12 + sd * 0.27;
      const y = 0.6 + (up ? 0.14 : 0);
      put(m.bodies, i, x, y, PUPS_Z, k, k, k, 0, sd * -0.3, 0);
      put(m.arms, i, x, y, PUPS_Z, k, k * (up ? 1 : 0.4), k, 0, sd * -0.3, 0);
    }
    m.bodies.instanceMatrix.needsUpdate = m.arms.instanceMatrix.needsUpdate = true;
    colonyRef.current.visible = !broken;

    // Ichigo leans into the slash; the arc of cold light sweeps on and the glass cracks at its end
    const sl = smooth(T.slash[0], T.slash[1], tt);
    ichRef.current.rotation.set(0, 0.25, -0.18 * smooth(T.slash[0], T.slash[0] + 0.15, tt) * (1 - smooth(T.slash[1] + 0.2, T.slash[1] + 0.7, tt)));
    slashRef.current.visible = tt > T.slash[0] && tt < T.slash[1] + 0.4;
    m.slashM.uniforms.uK.value = sl * 1.4;
    slashRef.current.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(cam.quaternion));
    slashRef.current.rotateZ(-0.4);
    // Aizen's blade: the tip snaps off on the truth and tumbles away
    const sn = Math.max(0, tt - T.snap);
    const hand = m.az.hand;
    tipRef.current.position.set(hand[0] - 0.6 * sn, hand[1] + 1.1 * sn - 5.5 * sn * sn, hand[2] + 0.9 * sn);
    tipRef.current.rotation.set(0, 0, -5.5 * sn);
    // the gap lights cold blue along the dais foot as the truth is named
    m.gap.opacity = smooth(T.gap[0], T.gap[1], tt) * (1 - smooth(T.brk, T.brk + 0.15, tt)) * (0.75 + 0.25 * Math.sin(tt * 18));
    gapRef.current.visible = m.gap.opacity > 0.01;
    // details that are not shards (the smile, the hat's stripes) go with the glass
    for (const d of detailRef.current) if (d) d.visible = !broken;

    // the lettering: Aizen's sword named on the first crack; the illusion's end on the second, flat to the lens
    const lay = (mesh, k, x, y) => {
      mesh.visible = k > 0 && k < 1;
      if (!mesh.visible) return;
      const pop = Math.min(1, k / 0.1) * (1 + 0.2 * Math.max(0, 1 - k / 0.25));
      const w = (wide ? 6.4 : 4.4) * pop;
      mesh.position.set(x + 0.04 * odd, y, 0.4);
      mesh.scale.set(w, w, 1);
      mesh.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(cam.quaternion));
    };
    lay(m.letA, (tt - T.crack) / 0.95, wide ? -3.4 : -1.4, wide ? 6.6 : 7.6);
    lay(m.letB, (tt - T.brk) / 1.0, wide ? 0.4 : 0.2, wide ? 6.4 : 7.4);

    // the flash: cold, never a white-out
    const fl = Math.max(0, 1 - Math.abs(tt - T.crack) / 0.1) * 0.14 + Math.max(0, 1 - Math.abs(tt - T.snap) / 0.1) * 0.2 + Math.max(0, 1 - Math.abs(tt - T.brk - 0.03) / 0.12) * 0.3;
    holdFlash(m.flash, cam, fl);
    dust.current.visible = !broken;
  });

  const keep = (arr, i) => (el) => {
    arr.current[i] = el;
  };
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={dust}>
        <Motes mode={mode} tl={tl} n={80} span={[34, 10, 28]} center={[0, 0, -8]} dir={[0.3, 0.02, 0.1]} size={0.045} color={["#f4f4f0", "#aab1bf"]} sway={0.5} shape="round" />
      </group>
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.shell.g} material={m.shell.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh ref={moonRef} geometry={m.tsuki.g} material={m.tsuki.m} scale={MOON_R / 1.7} renderOrder={-2} frustumCulled={false} />
          <mesh geometry={m.ground} material={m.paperG} renderOrder={-1} frustumCulled={false} />
          <group position={[0, 0, -112]}>
            <mesh geometry={m.pal.g} material={m.paperP} frustumCulled={false} />
            <mesh geometry={m.pal.hull} material={m.hullInk} frustumCulled={false} ref={keep(hullsRef, 0)} />
          </group>
          <mesh geometry={m.tr.g} material={m.paper} frustumCulled={false} />
          <mesh geometry={m.tr.hull} material={m.hullInk} frustumCulled={false} ref={keep(hullsRef, 1)} />
          <group ref={dais}>
            <group position={[0, 0, THRONE_Z]}>
              <mesh geometry={m.th.g} material={m.paper} frustumCulled={false} />
              <mesh geometry={m.th.hull} material={m.hullInk} frustumCulled={false} ref={keep(hullsRef, 2)} />
              <mesh geometry={m.thInk} material={m.sil} frustumCulled={false} />
              <mesh ref={gapRef} geometry={m.gapG} material={m.gap} position={[0, 0.3, 4.08]} renderOrder={5} visible={false} />
            </group>
            <group position={AIZEN_AT} scale={1.45}>
              <mesh geometry={m.az.body} material={m.sil} frustumCulled={false} />
              <mesh geometry={m.az.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 3)} />
              <mesh geometry={m.az.bladeLow.g} material={m.sil} frustumCulled={false} />
              <mesh geometry={m.az.bladeLow.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 4)} />
              <group ref={tipRef}>
                <group position={[-m.az.hand[0], -m.az.hand[1], -m.az.hand[2]]}>
                  <mesh geometry={m.az.bladeTip.g} material={m.sil} frustumCulled={false} />
                  <mesh geometry={m.az.bladeTip.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 5)} />
                </group>
              </group>
            </group>
            <group position={ICHIGO_AT} scale={1.3} ref={ichRef}>
              <mesh geometry={m.ic.g} material={m.sil} frustumCulled={false} />
              <mesh geometry={m.ic.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 6)} />
            </group>
            <group position={GIN_AT} rotation={[0, 0.12, 0]} scale={1.3}>
              <mesh geometry={m.gi.g} material={m.sil} frustumCulled={false} />
              <mesh geometry={m.gi.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 7)} />
              <mesh geometry={m.gi.smile} material={m.detail} ref={keep(detailRef, 0)} frustumCulled={false} />
            </group>
            <group position={URAHARA_AT} rotation={[0, -0.25, 0]} scale={1.3}>
              <mesh geometry={m.ur.g} material={m.sil} frustumCulled={false} />
              <mesh geometry={m.ur.hull} material={m.hullPaper} frustumCulled={false} ref={keep(hullsRef, 8)} />
              <mesh geometry={m.ur.stripes} material={m.detail} ref={keep(detailRef, 1)} frustumCulled={false} />
            </group>
            <group ref={colonyRef}>
              <primitive object={m.bodies} />
              <primitive object={m.bodiesLine} />
              <primitive object={m.arms} />
              <primitive object={m.armsLine} />
            </group>
          </group>
          <mesh ref={slashRef} geometry={m.slashG} material={m.slashM} position={SLASH_AT} scale={3.4} visible={false} renderOrder={20} frustumCulled={false} />
        </group>
        <primitive object={m.letA} />
        <primitive object={m.letB} />
      </group>
    </>
  );
}
