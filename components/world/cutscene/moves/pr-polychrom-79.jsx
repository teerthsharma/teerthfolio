// pr-polychrom-79: Dr. Stone, Senku Ishigami in the Kingdom of Science, in shape and colour only.
// The pup grows Senku's spiky green-tipped hair on top of its round head (no ears) and stands at the Fountain
// of Immortality: a stone basin of petrified cells, revival fluid thrown up as a twisted double helix, mist.
// It holds two linked DNA rings (a Hopf link) glowing red: the linking number has the wrong sign. It flips one
// ring (the arrow on it turns round), the revival fluid takes, and they turn green. Then eleven linked pairs on
// the bench light up green in a row. The flex line, the credit card, then the return: the petrification crack
// spreads over the frame, the stone crumbles, and the island is back ("Revival fluid: back to the island.").
// The world is a sky shell, a cracked-grass ground, a stilt lab, a bench of flasks, statues and far hills,
// every one a real mesh; no post pass, the crack is one quad. Card: lib/world/cutscene/cards/pr-polychrom-79.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { flashQuad, hash, holdFlash, inst, islandList, lettering, mat, pupParts, put } from "./p-caustic/parts";
import { HASH, flaskGeometry, hairGeometry, ringGeometry, ringMaterial, skyMaterial, statueGeometry, stoneMaterial } from "./pr-polychrom-79/world";

const CORE_Y = 0.9;
// the clock (s from the arrival; the card puts line A at 2.3, B at 10.1, the flex line at 16.0, the credit at 22.8)
const T = { hair: [0.55, 1.15], rings: [1.7, 2.3], flip: [8.0, 10.0], sign: [8.9, 9.15], row: 11.0, step: 0.3, crack: [24.0, 27.4], crumble: [27.4, 28.3], word: [26.6, 28.2] };
const HELIX_N = 64;
const PAIRS = 11;
const R = 0.4;
const FOUNTAIN = [-3.1, 0, -2.6];
const COL = new Color();
const GREEN = new Color("#22ff6a");
const DARK = new Color("#5a6a6a");

// THE CRACK: stone cells that spread from the middle of the frame, their cracks glowing revival green, then crumble away
function crackMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uSpread: { value: 0 }, uCrumble: { value: 0 }, uAspect: { value: 1.78 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSpread;
      uniform float uCrumble;
      uniform float uAspect;
      varying vec2 vUv;
      ${HASH}
      void main() {
        vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec2 cc;
        vec3 v = vor(q * 6.0, cc);
        float dist = length(cc / 6.0);
        float front = uSpread * 1.25;
        float edge = v.y - v.x;
        float line = 1.0 - smoothstep(0.03, 0.12, edge);
        bool stone = dist < front;
        bool crack = dist < front + 0.3 && line > 0.0;
        if (!stone && !crack) discard;
        float thr = v.z * 0.7 + 0.3 * clamp(dist / 1.4, 0.0, 1.0);
        if (uCrumble > thr) discard;
        vec3 grey = mix(vec3(0.42, 0.52, 0.55), vec3(0.62, 0.7, 0.66), v.z);
        vec3 c = stone ? mix(grey, vec3(0.2, 1.0, 0.55), line) : vec3(0.2, 1.0, 0.6);
        if (stone && !(uCrumble > 0.0)) c = mix(c, vec3(0.8, 0.95, 0.9), 0.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const skyRef = useRef();
  const world = useRef();
  const pivotB = useRef();
  const pup = useRef(null);
  const island = useRef([]);
  const hair = useRef(null);
  const signs = useRef({});
  const dust = useRef();

  const m = useMemo(() => {
    const sky = { g: new SphereGeometry(1, 32, 16), m: skyMaterial() };
    const ground = { g: new PlaneGeometry(160, 160).rotateX(-Math.PI / 2), m: stoneMaterial("#35d94a", "#b6e615", "#127a2e", 0.45) };
    const stone = stoneMaterial("#8fa6a8", "#b9c9c2", "#2a3a3a", 1.6, "#0a3d22");
    const wood = stoneMaterial("#c27a35", "#e0a050", "#6a3a14", 1.4);
    const istone = stoneMaterial("#8fa6a8", "#b9c9c2", "#2a3a3a", 1.6, "#0a3d22", true);
    const ring = ringMaterial();
    const ringG = ringGeometry(R, 0.045);
    const arrowG = new ConeGeometry(0.1, 0.24, 6);
    const arrowM = mat({ color: "#fff7b0" });
    // the fountain: a basin of stone, the revival fluid in it, two strands of beads twisting up
    const basinG = new CylinderGeometry(1.3, 1.5, 0.55, 14, 1, true);
    const lipG = new CylinderGeometry(1.36, 1.36, 0.1, 14, 1, false);
    const fluidM = mat({ color: "#2bff88" });
    const poolG = new CylinderGeometry(1.2, 1.2, 0.02, 20);
    const beadG = new IcosahedronGeometry(0.09, 1);
    const beads = inst(beadG, mat({ color: "#ffffff" }), HELIX_N * 2);
    for (let i = 0; i < HELIX_N * 2; i++) beads.setColorAt(i, COL.set(i < HELIX_N ? "#27ff7a" : "#25e8ff"));
    // eleven linked pairs on the bench
    const pairA = inst(ringGeometry(0.27, 0.035), mat({ color: "#ffffff" }), PAIRS);
    const pairB = inst(ringGeometry(0.27, 0.035), mat({ color: "#ffffff" }), PAIRS);
    for (let i = 0; i < PAIRS; i++) {
      pairA.setColorAt(i, DARK);
      pairB.setColorAt(i, DARK);
    }
    // flasks on the bench and shelf, in saturated inks
    const flaskG = flaskGeometry();
    const flasks = inst(flaskG, mat({ color: "#ffffff" }), 30);
    const inks = ["#22ff6a", "#18d8ff", "#ff3fb5", "#ffe92b", "#ff8a1a", "#b45bff"];
    for (let i = 0; i < 30; i++) {
      const x = -5.6 + (11.2 * (i + hash(i, 1) * 0.5)) / 30;
      put(flasks, i, x, 0.95, -6.8 + 0.5 * hash(i, 2), 1.1, 1.1 + 0.4 * hash(i, 3), 1.1);
      flasks.setColorAt(i, COL.set(inks[i % inks.length]));
    }
    const benchG = new BoxGeometry(12, 0.95, 1.1);
    const hutG = {
      floor: new BoxGeometry(5, 0.3, 3.4),
      post: new CylinderGeometry(0.13, 0.13, 3.1, 6),
      roof: new ConeGeometry(3.7, 1.7, 4).rotateY(Math.PI / 4),
    };
    const statueG = statueGeometry();
    const statues = inst(statueG, istone, 9);
    for (let i = 0; i < 9; i++) put(statues, i, -9 + 2.2 * i + hash(i, 4) * 1.2, 0, -11 - 6 * hash(i, 5), 1.4, 1.4, 1.4, 0, hash(i, 6) * 6, 0.05 * (hash(i, 7) - 0.5));
    // hills, far off
    const hillG = new ConeGeometry(1, 1, 7);
    const hills = inst(hillG, mat({ color: "#ffffff" }), 9);
    const hue = ["#7a3dff", "#1ec8d8", "#ff6aa8", "#3d6bff", "#1fd27a", "#ff9a2e", "#9a3dff", "#16b8a8", "#ff5a7a"];
    for (let i = 0; i < 9; i++) {
      put(hills, i, -40 + 10 * i + hash(i, 8) * 4, 4, -60 - 10 * hash(i, 9), 16 + 10 * hash(i, 10), 8 + 12 * hash(i, 11), 16 + 10 * hash(i, 10));
      hills.setColorAt(i, COL.set(hue[i]));
    }
    const hair = hairGeometry();
    const hairM = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false, side: DoubleSide });
    const minus = new BoxGeometry(0.36, 0.08, 0.04);
    const plus = new BoxGeometry(0.08, 0.36, 0.04);
    const minusM = mat({ color: "#ff2a33" });
    const plusM = mat({ color: "#22ff6a" });
    return { sky, ground, stone, wood, istone, ring, ringG, arrowG, arrowM, basinG, lipG, fluidM, poolG, beadG, beads, pairA, pairB, flaskG, flasks, benchG, hutG, statueG, statues, hillG, hills, hair, hairM, minus, plus, minusM, plusM, crack: crackMaterial(), crackQ: new PlaneGeometry(1, 1), flash: flashQuad("#7dffb0"), word: lettering("Revival fluid: back to the island.", "#12b858", -0.04) };
  }, []);

  const crack = useMemo(() => {
    const q = new Mesh(m.crackQ, m.crack);
    q.renderOrder = 20;
    q.frustumCulled = false;
    q.visible = false;
    return q;
  }, [m]);

  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    if (p?.head) {
      const h = new Mesh(m.hair, m.hairM);
      h.visible = false;
      p.head.add(h);
      hair.current = h;
    }
    return () => {
      hair.current?.removeFromParent();
      hair.current = null;
      pup.current = null;
      const geos = [m.sky.g, m.ground.g, m.ringG, m.arrowG, m.basinG, m.lipG, m.poolG, m.beadG, m.pairA.geometry, m.pairB.geometry, m.flaskG, m.benchG, m.hutG.floor, m.hutG.post, m.hutG.roof, m.statueG, m.hillG, m.hair, m.minus, m.plus, m.crackQ, m.flash.geometry, m.word.geometry];
      const mats = [m.sky.m, m.ground.m, m.stone, m.wood, m.istone, m.ring, m.arrowM, m.fluidM, m.pairA.material, m.pairB.material, m.flasks.material, m.hills.material, m.beads.material, m.hairM, m.minusM, m.plusM, m.crack, m.flash.material, m.word.material];
      geos.forEach((g) => g.dispose());
      mats.forEach((x) => x.dispose());
      m.word.material.map?.dispose();
      for (const x of [m.beads, m.pairA, m.pairB, m.flasks, m.statues, m.hills]) x.dispose();
      crack.removeFromParent();
    };
  }, [scene, m, crack]);

  // a skip clears the arrival: nothing of the world draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      crack.visible = false;
      m.word.visible = false;
      if (hair.current) hair.current.visible = false;
    }
  }, -0.5);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    crack.visible = false;
    m.word.visible = false;
    const h = hair.current;
    if (!full) {
      if (h) h.visible = false;
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    const turn = turnFor(card, place, s.x, s.z);
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds
    const r = radiusAt(tl, t);
    const sky = skyRef.current;
    const dx = cam.position.x - s.x;
    const dy = cam.position.y - CORE_Y;
    const dz = cam.position.z - s.z;
    const inside = r > Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.3;
    const crumbled = tt >= T.crumble[0];
    sky.visible = r > 0.02 && !crumbled;
    sky.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    world.current.visible = inside && !crumbled;

    // SENKU'S HAIR grows on the pup's crown on the sign (an overshoot), and is gone with the world
    if (h) {
      const k = smooth(T.hair[0], T.hair[1], tt) * (1 - smooth(tl.collapse[0], tl.collapse[1], tt));
      h.visible = k > 0.01;
      h.scale.setScalar(Math.max(k * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.hair[0]) / 0.7))), 0.01));
      h.rotation.z = 0.03 * Math.sin(tt * 2.2);
    }

    // THE LINKED RINGS in the pup's flippers: red, one flipped, green
    const flip = smooth(T.flip[0], T.flip[1], tt);
    const sign = smooth(T.sign[0], T.sign[1], tt);
    m.ring.uniforms.uSign.value = sign;
    m.ring.uniforms.uTime.value = t;
    pivotB.current.rotation.x = Math.PI * flip;
    const held = signs.current.held;
    held.visible = tt > T.rings[0];
    held.scale.setScalar(smooth(T.rings[0], T.rings[1], tt) * (1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.rings[0]) / 0.5))));
    held.rotation.y = 0.4 + 0.25 * Math.sin(tt * 0.9);
    held.position.y = 0.85 + 0.04 * Math.sin(tt * 2.1);
    signs.current.minus.visible = sign < 0.5;
    signs.current.plus.visible = sign >= 0.5;
    signs.current.glyph.visible = held.visible;

    // pose: the rings held up, a fist on the flex line, the sign on the opening
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.raise = (smooth(T.rings[0], T.rings[1], tt) * (1 - smooth(tl.lineC, tl.lineC + 0.4, tt))) * out;
    live.pose.fist = smooth(tl.lineC, tl.lineC + 0.4, tt) * out;

    // THE HELIX: two strands of beads twisting up from the basin, turning, glowing revival green (cyan on the second strand)
    const spin = tt * 1.2;
    for (let i = 0; i < HELIX_N * 2; i++) {
      const strand = i < HELIX_N ? 0 : 1;
      const k = (i % HELIX_N) / HELIX_N;
      const a = spin + k * Math.PI * 5 + strand * Math.PI;
      const rad = 0.42 * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.2))) ;
      const rise = (k + tt * 0.12) % 1;
      put(m.beads, i, FOUNTAIN[0] + Math.cos(a) * rad, 0.5 + k * 3.0, FOUNTAIN[2] + Math.sin(a) * rad, 0.8 + 0.5 * Math.sin(rise * Math.PI));
    }
    m.beads.instanceMatrix.needsUpdate = true;

    // THE ROW: eleven pairs light up green, one after another
    for (let i = 0; i < PAIRS; i++) {
      const k = smooth(T.row + i * T.step, T.row + i * T.step + 0.25, tt);
      COL.copy(DARK).lerp(GREEN, k);
      m.pairA.setColorAt(i, COL);
      m.pairB.setColorAt(i, COL);
      const x = -4.3 + (8.6 * i) / (PAIRS - 1);
      const pop = 1 + 0.25 * Math.sin(Math.PI * Math.min(1, Math.max(0, (tt - T.row - i * T.step) / 0.4)));
      put(m.pairA, i, x, 1.9, -6.4, pop);
      put(m.pairB, i, x + 0.27, 1.9, -6.4, pop, pop, pop, Math.PI / 2, 0, 0);
    }
    m.pairA.instanceMatrix.needsUpdate = m.pairB.instanceMatrix.needsUpdate = true;
    m.pairA.instanceColor.needsUpdate = m.pairB.instanceColor.needsUpdate = true;

    // the flash on the flip: tinted revival green, never a white-out
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(tt - T.sign[0] - 0.1) / 0.18) * 0.28);

    // THE RETURN: the petrification crack spreads over the frame; at the crumble the island comes back and the stone falls away
    const spread = smooth(T.crack[0], T.crack[1], tt);
    if (spread > 0 && tt < tl.duration) {
      crack.visible = true;
      crack.material.uniforms.uSpread.value = spread;
      crack.material.uniforms.uCrumble.value = smooth(T.crumble[0], T.crumble[1], tt) * 1.02;
      crack.material.uniforms.uAspect.value = cam.aspect;
      cam.getWorldDirection(crack.position).add(cam.position);
      crack.quaternion.copy(cam.quaternion);
      const hh = 2 * Math.tan((cam.fov * Math.PI) / 360);
      crack.scale.set(hh * cam.aspect, hh, 1);
    }
    if (crumbled && tt < tl.collapse[1]) for (const o of island.current) o.visible = true;
    // the word on the stone, lower in the frame
    const word = tt >= T.word[0] && tt < T.word[1];
    m.word.visible = word;
    if (word) {
      const frameW = 2 * Math.tan((cam.fov * Math.PI) / 360) * 2.2 * cam.aspect; // the frame's width at the word's distance
      cam.getWorldDirection(m.word.position).multiplyScalar(2.2).add(cam.position);
      m.word.position.y -= 0.3;
      m.word.quaternion.copy(cam.quaternion);
      m.word.scale.set(frameW * 0.82, frameW * 0.82, 1);
    }
  });

  const mistN = 90;
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={dust}>
        <Motes mode={mode} tl={tl} n={mistN} span={[10, 5, 8]} center={[FOUNTAIN[0], 1.5, FOUNTAIN[2]]} dir={[0, 0.5, 0]} size={0.06} color={["#7dffb0", "#c8ffe0", "#4dffd0"]} sway={0.4} shape="round" />
        <Motes mode={mode} tl={tl} n={70} span={[24, 8, 18]} center={[0, 2, -6]} dir={[0.1, 0.25, 0]} size={0.07} color={["#ffe92b", "#ff3fb5", "#18d8ff", "#22ff6a"]} sway={0.5} shape="diamond" />
      </group>
      <primitive object={m.flash} />
      <primitive object={crack} />
      <primitive object={m.word} />
      <group ref={rig} visible={false}>
        <mesh ref={skyRef} geometry={m.sky.g} material={m.sky.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh geometry={m.ground.g} material={m.ground.m} renderOrder={-2} frustumCulled={false} />
          <primitive object={m.hills} />
          <primitive object={m.statues} />
          <primitive object={m.beads} />
          <primitive object={m.flasks} />
          <primitive object={m.pairA} />
          <primitive object={m.pairB} />
          {/* the fountain of immortality */}
          <group position={FOUNTAIN}>
            <mesh geometry={m.basinG} material={m.stone} position={[0, 0.27, 0]} frustumCulled={false} />
            <mesh geometry={m.lipG} material={m.stone} position={[0, 0.55, 0]} frustumCulled={false} />
            <mesh geometry={m.poolG} material={m.fluidM} position={[0, 0.5, 0]} frustumCulled={false} />
          </group>
          {/* the lab bench and the stilt hut */}
          <mesh geometry={m.benchG} material={m.wood} position={[0, 0.475, -6.6]} frustumCulled={false} />
          <group position={[7, 0, -9]}>
            <mesh geometry={m.hutG.floor} material={m.wood} position={[0, 1.4, 0]} frustumCulled={false} />
            {[[-2.3, -1.5], [2.3, -1.5], [-2.3, 1.5], [2.3, 1.5]].map(([x, z], i) => (
              <mesh key={i} geometry={m.hutG.post} material={m.wood} position={[x, 1.55, z]} frustumCulled={false} />
            ))}
            <mesh geometry={m.hutG.roof} material={m.wood} position={[0, 4.25, 0]} frustumCulled={false} />
          </group>
        </group>
        {/* the held rings: A in the xy plane, B in the xz plane about (R, 0, 0), B flipped on the beat */}
        <group
          ref={(g) => {
            if (g) signs.current.held = g;
          }}
          position={[1.25, 0.85, 0.35]}
          visible={false}
        >
          <mesh geometry={m.ringG} material={m.ring} frustumCulled={false} />
          <group ref={pivotB} position={[R, 0, 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={m.ringG} material={m.ring} frustumCulled={false} />
              <mesh geometry={m.arrowG} material={m.arrowM} position={[0, R, 0]} rotation={[0, 0, -Math.PI / 2]} frustumCulled={false} />
            </group>
          </group>
          <mesh geometry={m.arrowG} material={m.arrowM} position={[0, R, 0]} rotation={[0, 0, -Math.PI / 2]} frustumCulled={false} />
          <group
            ref={(g) => {
              if (g) signs.current.glyph = g;
            }}
            position={[R * 0.5, R + 0.55, 0.0]}
          >
            <group ref={(g) => g && (signs.current.minus = g)}>
              <mesh geometry={m.minus} material={m.minusM} />
            </group>
            <group ref={(g) => g && (signs.current.plus = g)}>
              <mesh geometry={m.minus} material={m.plusM} />
              <mesh geometry={m.plus} material={m.plusM} />
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
