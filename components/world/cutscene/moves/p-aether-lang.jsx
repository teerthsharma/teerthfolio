// Aether-Lang: Jujutsu Kaisen, Gojo's Domain Expansion: Infinite Void, in shape and
// colour only, in its own dimension: COSMIC VOID (a luminous painterly nebula, Kirby
// krackle, soft halation, white-violet light on near-black). The pup raises the hand
// sign and a bubble of painted nebula blooms out of it, swallowing the view: the
// Infinite Void. Three parallax star fields and three spiral galaxies stand in the
// deep; a white-violet core burns behind the pup (a photon ring, a tilted accretion
// disc, spikes of halation, arms of krackle dots); a flood of information streams in
// from every side and converges on it; a glassy floor mirrors the core, the pup and
// the tall silhouette (spiky white hair that sways, a blindfold band, hands in
// pockets) who asks both lines of the koan. On line B two glints flare on his band.
//
// THE RETURN, shown on screen: the koan is a loop, and Aether-Lang ends a loop when
// its shape stops changing. The flood freezes mid-air (the stars hold, the hair
// falls still), a ring of light draws round the core and closes (the cycle), a
// hand-lettered STILL; then the exit condition fires and the whole void is drawn
// into its core (the shell, the sky, the floor, the silhouette, all contracting
// onto the light) and the real island is under the pup, which says why in the flex.
// No post pass: the one extra render is the floor's 512 px mirror.
// Card: lib/world/cutscene/cards/p-aether-lang.js. Parts: ./p-aether-lang/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Mesh, Vector3 } from "three";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { figureAt, figureScale, radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { registerWarm, takeWarm } from "../prewarm";
import { Speaker, Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { SHARED, pupCosmic } from "./p-aether-lang/cosmic";
import { glintSprite, gojo } from "./p-aether-lang/gojo";
import { CORE, SHELL_R, closingRing, coreSprite, flood, galaxy, glassFloor, krackle, nebulaShell, starField } from "./p-aether-lang/world";
import { flashQuad, holdFlash, islandList, lettering, pupParts } from "./p-caustic/parts";

const CHEST = 0.9;
// the world draws into the composer's render target, whose programs differ from the screen's (colour space, tone
// map): compile with that target bound so the programs made here are the ones the scene draws with
function warm(gl, obj, camera, scene) {
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(window.__world?.composer?.inputBuffer ?? prev);
  gl.compileAsync(obj, camera, scene).catch(() => {});
  gl.setRenderTarget(prev);
}
// the clock (s from the arrival). The card's beats put line A at 2.3, line B at 6.6 (the glints), the flex at 10.8,
// the credit at 17.0: the stop and the contraction fill the 4.2 s line B is read in, the flex lands on the island.
const T = { fade: [1.45, 2.15], freeze: 8.6, ring: [8.7, 9.5], lock: 9.5, still: [9.5, 10.4], contract: [10.15, 10.95], flex: 10.9, bite: 0.17 };
const GALAXIES = [
  { at: [-40, 27, -108], size: 72, rot: [-0.7, 0, 0.5], a: [0.56, 0.36, 0.96], b: [0.92, 0.46, 0.86], arms: 2, seed: 3 },
  { at: [48, 14, -120], size: 58, rot: [-1.0, 0, -0.6], a: [0.4, 0.6, 1.0], b: [0.7, 0.5, 1.0], arms: 3, seed: 8 },
  { at: [10, 33, -128], size: 50, rot: [-0.55, 0, 0.1], a: [0.8, 0.7, 1.0], b: [0.5, 0.4, 0.95], arms: 2, seed: 15 },
];
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]]; // squash, stretch, settle: the silhouette steps in on twos
const V = new Vector3();
const CORE_W = new Vector3();
const CENTRE = new Vector3();

function buildVoid() {
  const nebula = nebulaShell();
  const stars = starField();
  const gal = GALAXIES.map((spec) => {
    const x = galaxy(spec.a, spec.b, spec.arms, spec.seed);
    const mesh = new Mesh(x.g, x.m);
    mesh.rotation.set(...spec.rot);
    mesh.scale.setScalar(spec.size);
    mesh.renderOrder = -2.9;
    mesh.frustumCulled = false;
    return { ...x, mesh, spec };
  });
  const glint = glintSprite();
  const glints = [0, 1].map((i) => {
    const mat = glint.m.clone();
    const mesh = new Mesh(glint.g, mat);
    mesh.position.set(i ? 0.055 : -0.055, 1.925, 0.2);
    mesh.rotation.y = 0.4;
    mesh.renderOrder = 20;
    mesh.visible = false;
    mesh.frustumCulled = false;
    return mesh;
  });
  return { nebula, stars, gal, core: coreSprite(), fl: flood(), ring: closingRing(), kr: krackle(), floor: glassFloor(), gj: gojo(), glint, glints, still: lettering("STILL", "#9b6bff", -0.1), flash: flashQuad("#cdbdff") };
}

// THE APPROACH: the shared prewarm (../prewarm.js) builds the void while the seal walks up to the dock; the arrival takes it.
registerWarm("p-aether-lang", buildVoid);

export default function Move(cut) {
  const { card, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const voidRig = useRef();
  const content = useRef();
  const shellRef = useRef();
  const coreRef = useRef();
  const ringRef = useRef();
  const gojoRef = useRef();
  const pup = useRef(null);
  const paint = useRef(null);
  const island = useRef([]);
  const upfall = useRef(null);
  const clock = useRef({ flow: 0 });

  const m = useMemo(() => takeWarm("p-aether-lang", buildVoid), []);

  // the flood sits on layer 2, which only the main pass's lens draws: the post stack's own re-renders of the scene never see it
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    m.fl.mesh.layers.set(2);
    camera.layers.enable(2);
    return () => camera.layers.disable(2);
  }, [camera, m]);

  // every program compiles off the main thread, before the bloom needs it: compile walks only visible
  // objects, so the whole void is shown for the call and the frame loop below hides it again
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const g = rig.current;
    if (!g) return;
    for (const o of [g, voidRig.current, content.current, gojoRef.current, ...m.glints, m.still]) o.visible = true;
    warm(gl, g, camera, scene);
    for (const o of [g, voidRig.current, gojoRef.current, ...m.glints, m.still]) o.visible = false;
  }, [gl, camera, scene, m]);

  useEffect(() => {
    island.current = islandList(scene);
    // the island's magenta upfall flakes would grow over the pup and the credit card on the return: they sit out the scene
    scene.traverse((o) => {
      if (o.isInstancedMesh && o.material?.customProgramCacheKey?.() === "sky-upfall") upfall.current = o;
    });
    const p = pupParts(scene);
    pup.current = p;
    paint.current = p?.root ? pupCosmic(p.root) : null;
    if (paint.current) {
      // the pup's cosmic twins compile now too (off the main thread), not at the bloom
      paint.current.set(true);
      warm(gl, p.root, camera, scene);
      paint.current.set(false);
    }
    return () => {
      if (upfall.current) upfall.current.visible = true;
      upfall.current = null;
      paint.current?.dispose();
      paint.current = null;
      pup.current = null;
      // everything the scene built goes with it
      for (const g of [m.nebula.g, m.stars.g, m.core.g, m.fl.g, m.ring.g, m.kr.g, m.floor.g, m.glint.g, m.still.geometry, m.flash.geometry, ...m.gal.map((x) => x.g), ...Object.values(m.gj.geo)]) g.dispose();
      for (const x of [m.nebula.m, m.stars.m, m.core.m, m.fl.m, m.ring.m, m.kr.m, m.glint.m, m.still.material, m.flash.material, m.floor.floor.material, ...m.glints.map((x) => x.material), ...m.gal.map((x) => x.m), ...Object.values(m.gj.mats)]) x.dispose();
      m.still.material.map?.dispose();
      m.floor.floor.getRenderTarget().dispose();
      m.kr.mesh.dispose();
    };
  }, [scene, m, gl, camera]);

  // a skip clears the arrival: nothing of the void draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      paint.current?.set(false);
    }
  }, -0.5);

  useCutFrame((t, state, dt) => {
    const full = mode === "full";
    if (upfall.current) upfall.current.visible = false;
    const g = rig.current;
    g.visible = full;
    if (!full) {
      paint.current?.set(false);
      return;
    }
    const s = live.seal;
    const cam = state.camera;
    const px = state.gl.getPixelRatio();
    const wide = state.size.width / state.size.height >= 1;
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const y0 = pup.current?.root ? pup.current.root.position.y : 0;
    g.position.set(s.x, y0, s.z);

    // THE CLOCK of the flood: it runs, then freezes mid-air at the stop
    const frozen = smooth(T.freeze, T.freeze + 0.3, t);
    const ck = clock.current;
    ck.flow += dt * (1 - frozen);
    const flow = ck.flow;

    // THE BLOOM swells out of the pup, then the void holds, then it is drawn into its core
    const r = radiusAt(tl, t);
    V.set(s.x, y0 + CHEST, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const e = Math.min(1, Math.max(0, (t - T.contract[0]) / (T.contract[1] - T.contract[0])));
    const contracting = t > T.contract[0];
    const S = Math.max(1 - e * e, 0.0005); // slow, then all at once
    const vr = voidRig.current;
    vr.visible = (r > 0.02 || contracting) && S > 0.002;
    vr.scale.setScalar(S);
    vr.position.copy(CORE).multiplyScalar(1 - S);
    const showVoid = inside || contracting;
    content.current.visible = showVoid;
    shellRef.current.scale.setScalar(showVoid ? SHELL_R : Math.max(r, 0.02));
    const fade = contracting ? 1 : smooth(T.fade[0], T.fade[1], t);

    // the core never moves in the world; the shell's centre rides the contraction
    CORE_W.copy(CORE).add(g.position);
    CENTRE.copy(CORE).multiplyScalar(1 - S).add(g.position);
    CENTRE.y += CHEST * S;
    const lock = smooth(T.ring[1] - 0.1, T.ring[1] + 0.05, t) * (1 - 0.5 * smooth(T.ring[1] + 0.4, T.ring[1] + 1.0, t));
    const burst = smooth(T.lock, T.lock + 0.12, t) * (1 - smooth(T.lock + 0.12, T.lock + 0.9, t));
    const pulse = frozen > 0.5 ? 0.5 : 0.5 + 0.5 * Math.sin(flow * 2.2);
    const nu = m.nebula.m.uniforms;
    nu.uTime.value = flow;
    nu.uCenter.value.copy(CENTRE);
    nu.uCore.value.copy(CORE_W);
    nu.uCell.value = 6 * px;
    nu.uLock.value = lock * 0.8;
    SHARED.uCore.value.copy(CORE_W);
    SHARED.uTime.value = flow;
    SHARED.uCell.value = 6 * px;
    SHARED.uSway.value = 1 - frozen * 0.97;
    SHARED.uLock.value = lock;
    const su = m.stars.m.uniforms;
    su.uDrift.value = flow;
    su.uPx.value = px;
    su.uFade.value = fade;
    for (const gx of m.gal) {
      gx.m.uniforms.uTime.value = flow;
      gx.m.uniforms.uFade.value = fade;
      // the galaxies sit wider on a wide screen, tucked in on a tall one
      gx.mesh.position.set(gx.spec.at[0] * (wide ? 1 : 0.45), gx.spec.at[1], gx.spec.at[2]);
    }
    const cu = m.core.m.uniforms;
    cu.uTime.value = flow;
    cu.uLock.value = lock;
    cu.uPulse.value = pulse;
    cu.uFade.value = fade;
    coreRef.current.quaternion.copy(cam.quaternion);
    const fu = m.fl.m.uniforms;
    fu.uFlow.value = flow;
    fu.uLock.value = lock;
    fu.uFade.value = fade;
    const ku = m.kr.m.uniforms;
    ku.uTime.value = flow;
    ku.uBurst.value = burst;
    ku.uFade.value = fade;
    const ru = m.ring.m.uniforms;
    ru.uProg.value = smooth(T.ring[0], T.ring[1], t);
    ru.uLock.value = lock;
    ru.uFade.value = fade;
    ringRef.current.quaternion.copy(cam.quaternion);
    const gu = m.floor.floor.material.uniforms;
    gu.uTime.value = flow;
    gu.uFade.value = fade;
    gu.uCenter.value.copy(g.position);
    gu.uLock.value = lock;

    // THE SILHOUETTE steps in on twos, leans in on line B, holds still at the stop
    const at = figureAt(card);
    const sc = figureScale(card);
    const gj = gojoRef.current;
    const inF = Math.floor((tt - tl.enter) * 12);
    gj.visible = inF >= 0 && showVoid;
    if (gj.visible) {
      const [sx, sy] = ENTER[inF] ?? [1, 1];
      const lean = smooth(tl.move[0], tl.move[1], tt) * 0.07;
      gj.position.set(at[0], at[1] + 0.03 * Math.sin(flow * 1.3), at[2]);
      gj.scale.set(sc * sx, sc * sy, sc * sx);
      gj.rotation.set(0, -0.4, 0.015 * Math.sin(flow * 2.0) + lean);
    }
    // line B: two glints flare on the band, light only
    const gk = smooth(tl.lineB, tl.lineB + 0.12, tt) * (1 - smooth(tl.lineB + 0.55, tl.lineB + 1.05, tt));
    const tw = 0.85 + 0.15 * Math.sin(tt * 26);
    for (const gl of m.glints) {
      gl.visible = gk > 0.01;
      gl.material.uniforms.uK.value = gk * tw;
      gl.scale.setScalar(0.55 * (0.6 + gk * 0.6));
    }

    // THE PUP wears the dimension from the bloom to the stop, then snaps back to its own colours with the island
    const reveal = contracting && S < T.bite;
    paint.current?.set((inside || tt > tl.bloom[1]) && !reveal);
    live.pose.sign = signAt(tl, t) * (1 - frozen);
    live.pose.fist = smooth(T.flex, T.flex + 0.3, tt) * out;

    // THE REAL ISLAND is under the pup the moment the void has drawn in past the lens
    if (reveal && tt < tl.collapse[0]) for (const o of island.current) o.visible = true;

    // the lettering at the stop, flat to the lens
    const st = tt - T.still[0];
    m.still.visible = st > 0 && tt < T.still[1];
    if (m.still.visible) {
      const pop = Math.min(1, st / 0.1) * (1 + 0.22 * Math.max(0, 1 - st / 0.22));
      const w = (wide ? 3.4 : 2.3) * pop;
      m.still.position.set(wide ? -1.9 : -0.2, wide ? 2.5 : 2.6, 0.5);
      m.still.scale.set(w, w, 1);
      m.still.quaternion.copy(cam.quaternion);
    }

    // a soft tinted pulse as the last of the void goes into the core (never a white-out)
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(t - T.contract[1]) / 0.13) * 0.34);
  });

  const body = m.gj.geo;
  const mats = m.gj.mats;
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      {mode === "still" ? <Speaker {...cut} /> : null}
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <group ref={voidRig}>
          <mesh ref={shellRef} geometry={m.nebula.g} material={m.nebula.m} position={[0, CHEST, 0]} renderOrder={-3} frustumCulled={false} />
          <group ref={content}>
            {m.gal.map((x, i) => (
              <primitive key={i} object={x.mesh} />
            ))}
            <primitive object={m.stars.pts} renderOrder={-2.8} />
            <primitive object={m.fl.mesh} renderOrder={-2.6} />
            <mesh ref={coreRef} geometry={m.core.g} material={m.core.m} position={CORE.toArray()} scale={34} renderOrder={-2.4} frustumCulled={false} />
            <mesh ref={ringRef} geometry={m.ring.g} material={m.ring.m} position={CORE.toArray()} scale={5.4} renderOrder={-2.2} frustumCulled={false} />
            <primitive object={m.kr.mesh} renderOrder={-2.0} />
            <primitive object={m.floor.floor} />
            <group ref={gojoRef} visible={false}>
              <mesh geometry={body.body} material={mats.body} frustumCulled={false} />
              <mesh geometry={body.skin} material={mats.skin} frustumCulled={false} />
              <mesh geometry={body.hair} material={mats.hair} frustumCulled={false} />
              <mesh geometry={body.band} material={mats.band} frustumCulled={false} />
              {m.glints.map((x, i) => (
                <primitive key={i} object={x} />
              ))}
            </group>
          </group>
        </group>
        <primitive object={m.still} />
      </group>
    </>
  );
}
