// monodromy: Magi, Sinbad and Baal's Baararaq Saiqa, in shape and colour only. The island becomes SINDRIA in
// Magi's Arabian Nights: a white-and-gold palace on a cliff over a turquoise sea (gold onion domes, turquoise
// towers, a star-tiled terrace with a patterned border, fountains), palms, a harbour of dhows with lateen sails and
// a festival crowd under strings of lanterns, all in warm anime cel (look.js). The pup becomes SINBAD (a long
// dark-violet ponytail, a gold circlet, hoop earrings, glowing ring vessels and a sword hilt), equips the djinn BAAL
// (lightning armour, glowing tattoos, a blue-white storm wreathing it) while Ja'far panics, and fires BAARARAQ SAIQA:
// city-scale lightning from a vortex over the palace that is so big it BREAKS THE FOURTH WALL: the HUD frame, the
// letterbox and the Skip chip shudder, a crack runs across the lens, the pup looks at the viewer. The crack IS the
// loop (monodromy): the pup steps into it and the whole world folds shut along it, and the island is back exactly
// where we left it: the world freezes, cracks into ~40 shards that fall away, and the island flies back in on them (shatter.js).
// No post pass: the crack is one quad on the lens, the fold is a vertex squeeze, the HUD shudder is CSS variables.
// Card: lib/world/cutscene/cards/p-monodromy.js. Parts: ./p-monodromy/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Mesh, Object3D, Vector2, Vector3 } from "three";
import { realAt } from "../../../../lib/world/cutscene/clock";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { place as placeBubble } from "../../ui/Bubbles";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { boltMaterial, megaBoltGeometry } from "./p-monodromy/bolt";
import { crackLens, placeLens } from "./p-monodromy/crack";
import { jafar, sigil, sinbad, stormColumn } from "./p-monodromy/hero";
import { U, celMat, hash, pupCel } from "./p-monodromy/look";
import { shatter } from "./p-monodromy/shatter";
import { FLEET, LANTERN_COLORS, PALM_AT, ROBES, SEA_Y, landscape, lanternGeometry, palmGeometry, personGeometry, sea, shipGeometry, skyShell, strings } from "./p-monodromy/world";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
// the clock (s from the arrival). The card's beats: Relax 4.6, Oops 7.0, the flex 9.6, the credit 12.0, out 13.6
const T = {
  costume: [0.9, 1.5],
  equip: [1.9, 3.1],
  panic: [2.3, 2.7], // Ja'far's panic ramps up; his bubble is up 2.3 .. 4.6
  charge: [4.9, 6.3], // the flippers rise, the vortex winds up
  strike: 6.4, // BAARARAQ SAIQA
  lens: 6.5, // it comes out of the screen: the lens cracks
  stare: [6.8, 12],
};
// THE SHATTER, in real seconds from the arrival (the card is paced; 0.8 s must be 0.8 s): the world freezes after the
// "Oops" line has been read, the crack spreads over the shards, they fall, the island flies back in and locks.
const F = realAt("p-monodromy", 8.4);
const R = { freeze: F, fall: F + 0.5, back: F + 1.1, grabIsland: F + 1.2, land: F + 1.3, locked: F + 2.1, ringEnd: F + 2.7, shardsOff: F + 2.45, costumeOut: [F + 2.1, F + 3.4] };
const FLASHES = [3.35, 3.95, 4.9, 5.35, 5.8, 6.1]; // far lightning in the clouds as the storm builds
const CROWD = 72;
const LAMPS = 72;
const CRACK_AT = new Vector2(0.1, 0.06); // where the lens breaks (screen, aspect-centred units)
const CRACK_ANG = 1.12;
const IMPACT = { x: (2 * CRACK_AT.x) / 1.6, y: 2 * CRACK_AT.y }; // the strike in NDC (rank only: the shards are in clip space)

const V = new Vector3();
const O = new Object3D();
const COL = new Color();
// the illuminated-manuscript frame: a 14 px gold border, a 4 px crimson inner line, an 8-point star in each corner
const FRAME_CSS = `.mono-frame { position: fixed; inset: 0; pointer-events: none; z-index: 5; opacity: 0; box-sizing: border-box; border: 14px solid #e9b23a; box-shadow: inset 0 0 0 4px #b3123a; }
.mono-frame i { position: absolute; width: 38px; height: 38px; background: #e9b23a; clip-path: polygon(50% 0, 61% 20%, 85% 15%, 80% 39%, 100% 50%, 80% 61%, 85% 85%, 61% 80%, 50% 100%, 39% 80%, 15% 85%, 20% 61%, 0 50%, 20% 39%, 15% 15%, 39% 20%); }`;
function frameEl() {
  const el = document.createElement("div");
  el.className = "mono-frame";
  el.innerHTML = [["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].map(([x, y]) => `<i style="${x}:-14px;${y}:-14px"></i>`).join("");
  return el;
}

// Ja'far's own bubble (the shared bubbles hold three lines): the kit's markup and layout, aimed at his mouth
function panicBubble() {
  const wrap = document.createElement("div");
  wrap.className = "comic";
  wrap.style.cssText = "--accent:#1fbdb4;--deep:#0e8a94;";
  wrap.innerHTML = `<div class="bubble" data-slot="p" data-who="land" data-kind="oval"><svg class="bubble-art" aria-hidden="true"><path class="bubble-tail bubble-ink"></path><path class="bubble-body bubble-ink"></path><path class="bubble-tail bubble-fill"></path></svg><p class="bubble-text">My king, you can't fire that <b>inside a portfolio</b>!</p></div>`;
  wrap.hidden = true;
  return wrap;
}

// The world, built by the shared prewarm (cutscene/prewarm.js) while the seal walks up to the dock.
function buildWorld() {
  const cel = celMat();
  const palmMat = celMat({ wind: true });
  const shell = skyShell();
  const seaM = sea();
  const land = landscape();
  const palmG = palmGeometry();
  const palms = new InstancedMesh(palmG, palmMat, PALM_AT.length);
  PALM_AT.forEach(([x, z, y], i) => {
    O.position.set(x, y, z);
    O.rotation.set(0, hash(i, 1) * 6.28, 0);
    O.scale.setScalar(0.85 + 0.45 * hash(i, 2));
    O.updateMatrix();
    palms.setMatrixAt(i, O.matrix);
  });
  const shipG = shipGeometry();
  const ships = new InstancedMesh(shipG, cel, FLEET.length);
  const sails = ["#fff3d6", "#1fbdb4", "#e4566a", "#f2b52e", "#ffffff", "#7d4fc4"];
  FLEET.forEach((_, i) => ships.setColorAt(i, COL.set(sails[i % sails.length])));
  const personG = personGeometry();
  const crowd = new InstancedMesh(personG, cel, CROWD);
  const folk = Array.from({ length: CROWD }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const z = -9.4 + 6.4 * hash(i, 1);
    const x = side * (2.5 + hash(i, 2) ** 1.3 * 6.8);
    crowd.setColorAt(i, COL.set(ROBES[Math.floor(hash(i, 3) * ROBES.length)]));
    return { x, z, yaw: Math.atan2(-x, 9 - z) * 0.8 + (hash(i, 4) - 0.5) * 0.4, s: 0.9 + 0.22 * hash(i, 5), lag: hash(i, 6) * 0.35, ph: hash(i, 7) * 6.28 };
  });
  const str = strings();
  const ropes = new Mesh(str.rope, cel);
  const lampG = lanternGeometry();
  const lampList = str.lamps.slice(0, LAMPS);
  const lamps = new InstancedMesh(lampG, cel, lampList.length);
  lampList.forEach((l, i) => lamps.setColorAt(i, COL.set(LANTERN_COLORS[l.hue])));
  for (const im of [palms, ships, crowd, lamps]) im.frustumCulled = false;
  const landMesh = new Mesh(land, cel);
  landMesh.frustumCulled = false;
  ropes.frustumCulled = false;
  const mega = new Mesh(megaBoltGeometry(), boltMaterial());
  for (const b of [mega]) {
    b.frustumCulled = false;
    b.renderOrder = 6;
    b.visible = false;
  }
  mega.material.uniforms.uJit.value = 0; // fixed: identical every play
  mega.material.uniforms.uCore.value = 0.35;
  const storm = stormColumn();
  const sigilFloor = sigil(1.6, true);
  const sigilSky = sigil(2.2, false);
  const ja = jafar(cel);
  const lens = crackLens();
  lens.m.uniforms.uC.value = CRACK_AT;
  lens.m.uniforms.uAng.value = CRACK_ANG;
  const sh = shatter(IMPACT);
  const flash = flashQuad("#cfe6ff");
  return { cel, palmMat, shell, seaM, land, landMesh, palmG, palms, shipG, ships, personG, crowd, folk, str, lampList, ropes, lampG, lamps, mega, sigilFloor, sigilSky, storm, ja, lens, sh, flash };
}
registerWarm("p-monodromy", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const dust = useRef();
  const pup = useRef(null);
  const st = useRef({ step: new Vector3(), scale: 1, faceTo: 0, faceK: 0, bubble: null, frame: null, grab0: false, grab1: false, rt: null });

  const m = useMemo(() => takeWarm("p-monodromy", buildWorld), []);

  const costume = useRef(null);
  const skin = useRef(null);
  const island = useRef([]);
  useEffect(() => {
    const state = st.current;
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    skin.current = p?.root ? pupCel(p.root) : null;
    if (p?.head && p.rear) {
      costume.current = sinbad(p, m.cel);
      costume.current.attach();
    }
    // the manuscript frame and Ja'far's own bubble: only while the scene is up
    let style = null;
    let bubble = null;
    let frame = null;
    if (mode === "full") {
      style = document.createElement("style");
      style.textContent = FRAME_CSS;
      document.head.append(style);
      bubble = panicBubble();
      frame = frameEl();
      document.querySelector(".hud")?.append(bubble, frame);
    }
    state.bubble = bubble;
    state.frame = frame;
    // pre-compile every program the scene draws, so the first frames do not stall: show it all for one compile pass
    if (mode === "full" && rig.current) {
      const hidden = [];
      rig.current.traverse((o) => {
        if (!o.visible) { hidden.push(o); o.visible = true; }
      });
      for (const o of [m.lens.mesh, m.flash, m.sh.shards, m.sh.veil, m.sh.wave]) if (!o.visible) { hidden.push(o); o.visible = true; }
      skin.current?.set(true);
      try { gl.compile(scene, camera); } catch { /* the first draw compiles instead */ }
      skin.current?.set(false);
      for (const o of hidden) o.visible = false;
    }
    return () => {
      costume.current?.dispose();
      costume.current = null;
      pup.current?.root.scale.setScalar(1);
      skin.current?.dispose();
      skin.current = null;
      pup.current = null;
      style?.remove();
      bubble?.remove();
      frame?.remove();
      state.bubble = null;
      state.frame = null;
      U.uFold.value = U.uStorm.value = U.uFlash.value = 0;
      for (const g of [m.shell.g, m.seaM.g, m.land, m.palmG, m.shipG, m.personG, m.str.rope, m.lampG, m.mega.geometry, m.lens.mesh.geometry, m.flash.geometry]) g.dispose();
      for (const x of [m.cel, m.palmMat, m.shell.m, m.seaM.m, m.mega.material, m.lens.m, m.flash.material]) x.dispose();
      m.sh.dispose();
      for (const x of [m.palms, m.ships, m.crowd, m.lamps]) x.dispose();
      m.storm.dispose();
      m.sigilFloor.dispose();
      m.sigilSky.dispose();
      m.ja.dispose();
    };
  }, [scene, gl, camera, m, mode]);

  // the strike shakes the pup, the step carries it into the crack, the stare turns it to the lens (after Seal.jsx
  // places it); a skip clears the arrival: nothing of the scene draws after
  useFrame(() => {
    const p = pup.current;
    const S = st.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      p?.root?.scale.setScalar(1);
      skin.current?.set(false);
      m.lens.mesh.visible = false;
      m.flash.visible = false;
      m.sh.hide();
      if (costume.current) costume.current.hair.visible = costume.current.armour.visible = false;
      if (S.frame) S.frame.style.opacity = 0;
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(S.step);
      p.root.scale.setScalar(S.scale);
      if (S.faceK > 0) {
        const y = p.root.rotation.y;
        p.root.rotation.y = y + Math.atan2(Math.sin(S.faceTo - y), Math.cos(S.faceTo - y)) * S.faceK;
      }
    }
  }, -0.5);

  // the two grabs, after the camera rig and the pup are placed for this frame: the frozen world, then the island
  useFrame((state) => {
    const S = st.current;
    const sh = m.sh;
    if (!live.arrival.id || mode !== "full" || S.rt == null) return;
    const rt = S.rt;
    const first = rt >= R.freeze && !S.grab0;
    if (!first && !(rt >= R.grabIsland && S.grab0 && !S.grab1)) return;
    const vis = [m.lens.mesh.visible, sh.shards.visible, sh.veil.visible, sh.wave.visible];
    m.lens.mesh.visible = false;
    sh.hide();
    sh.grab(state.gl, state.scene, state.camera, first ? sh.old : sh.next);
    [m.lens.mesh.visible, sh.shards.visible, sh.veil.visible, sh.wave.visible] = vis;
    if (first) S.grab0 = true;
    else S.grab1 = true;
  }, 1.5); // after FrameGuard (0.9) has framed the pup, or the grab sees another camera

  useCutFrame((t, state) => {
    const S = st.current;
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    const c = costume.current;
    if (!full) {
      m.lens.mesh.visible = false;
      if (c) c.hair.visible = c.armour.visible = false;
      skin.current?.set(false);
      S.step.set(0, 0, 0);
      if (S.frame) S.frame.style.opacity = 0;
      S.scale = 1;
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const struck = tt - T.strike;
    const rt = state.clock.elapsedTime - live.arrival.start; // real seconds: the shatter is not paced
    if (rt < R.freeze) S.grab0 = S.grab1 = false; // a replay grabs again
    const back = rt >= R.back; // behind the falling shards the island is set: this is the frame that is grabbed

    // the rig: the pup at the origin, turned so the landform stands where the figure would
    const turn = turnFor(card, place, s.x, s.z);
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until the fold has shut
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    shellRef.current.visible = r > 0.02 && !back;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    m.shell.m.uniforms.uInside.value = inside ? 1 : 0;
    world.current.visible = inside && !back;
    dust.current.visible = !back;

    // the shared sky and light: the storm winds up with the equip and the charge; the flashes
    const storm = smooth(T.charge[0], T.charge[1], tt); // the sky darkens in the charge only
    let flash = struck >= 0 ? Math.max(0, 1 - struck / 0.1) * 0.5 : 0;
    for (const f of FLASHES) if (tt >= f && tt < f + 0.17) flash = Math.max(flash, 0.22);
    flash = Math.max(flash, Math.max(0, 1 - Math.abs(tt - T.equip[0]) / 0.18) * 0.3);
    U.uTime.value = t;
    U.uStorm.value = tt >= T.strike ? 1 : storm;
    U.uFlash.value = back ? 0 : Math.min(flash, 0.5);
    U.uGust.value = 0.14 + 0.35 * U.uStorm.value + Math.max(0, 1 - Math.abs(struck) / 0.8) * 0.5;
    m.seaM.m.uniforms.uSurge.value = 0.1 + 0.9 * U.uStorm.value;

    U.uFold.value = 0;
    if (back && tt < tl.collapse[0]) for (const o of island.current) o.visible = true; // the island the stage hid

    // THE PUP: Sinbad, then Baal; the real pup drawn in the dimension's cel until it is home
    skin.current?.set((inside || tt > tl.bloom[1]) && !back);
    // Sinbad stays through the shatter, and fades off the pup once the island has locked
    const wear = 1 - smooth(R.costumeOut[0], R.costumeOut[1], rt);
    const costumeK = smooth(T.costume[0], T.costume[1], tt) * wear;
    const equipK = back ? 0 : smooth(T.equip[0], T.equip[1], tt);
    const flare = Math.max(0, 1 - Math.abs(struck - 0.1) / 0.5);
    const gone = back ? 0 : 1;
    m.sigilFloor.tick(t, smooth(T.equip[0], T.equip[0] + 0.5, tt) * gone);
    m.sigilSky.tick(t, smooth(T.charge[0], T.charge[0] + 0.5, tt) * gone);
    if (c) c.tick(t, costumeK, equipK, flare);
    // the storm round the pup: the column grows with the equip and flares with the strike, gone as it steps through
    const col = back ? 0 : (equipK * 0.7 + smooth(T.charge[0], T.charge[1], tt) * 0.5 + flare * 0.6);
    m.storm.tick(t, Math.min(col, 1.2));
    // BAARARAQ SAIQA: the trunks and the sheets grow out of the vortex in three drawings, hold, then crawl and fade
    const mu = m.mega.material.uniforms;
    m.mega.visible = struck >= 0 && !back;
    mu.uGrow.value = struck / 0.2;
    mu.uFade.value = 1 - smooth(0.5, 0.9, struck); // full for 0.5 s, then gone
    mu.uStep.value = 0;

    // THE LENS: the crack grows from the impact (the shards take it over at the freeze)
    const L = m.lens;
    const sh = m.sh;
    L.mesh.visible = tt >= T.lens && rt < R.fall;
    if (L.mesh.visible) {
      placeLens(L.mesh, cam);
      const u = L.m.uniforms;
      u.uAspect.value = cam.aspect;
      u.uGrow.value = smooth(T.lens, T.lens + 0.45, tt);
      u.uGap.value = 0;
      u.uHeal.value = 0;
      u.uTime.value = t;
      u.uStep.value = Math.floor(t * 12);
      u.uFlash.value = Math.max(0, 1 - (tt - T.lens) / 0.25);
    }
    // the manuscript frame: on from 1.5 s until the shards fall
    if (S.frame) S.frame.style.opacity = tt >= 1.5 && rt < R.fall ? 1 : 0;

    // THE SHATTER: grab the frozen world once, crack it, drop it; grab the island once, fly it in, lock it, ring
    const SU = sh.U;
    S.rt = rt; // the grab itself runs after the camera has moved (priority 1.5, below)
    const live0 = S.grab0 && rt < R.shardsOff;
    sh.shards.visible = live0;
    sh.veil.visible = S.grab0 && rt < R.locked;
    sh.wave.visible = S.grab0 && rt >= R.locked - 0.05 && rt < R.ringEnd;
    if (live0) {
      const assembling = rt >= R.land;
      SU.uMode.value = assembling ? 1 : 0;
      SU.uTex.value = (assembling ? sh.next : sh.old).texture;
      SU.uK.value = assembling ? (rt - R.land) / 0.8 : rt >= R.fall ? Math.max(0.001, (rt - R.fall) / 0.8) : 0;
      SU.uCrack.value = Math.min(1, (rt - R.freeze) / 0.5);
      SU.uAspect.value = cam.aspect;
      SU.uTime.value = rt;
    }
    if (sh.wave.visible) {
      V.set(s.x, 0.7, s.z).project(cam);
      sh.ring.uniforms.uC.value.set(V.x * 0.5 * cam.aspect, V.y * 0.5);
      sh.ring.uniforms.uAmt.value = Math.max(0.0002, (rt - (R.locked - 0.05)) / (R.ringEnd - R.locked + 0.05));
    }

    // no step through the crack any more: the pup stands at its dock, upright, from the first frame to the last
    S.step.set(0, 0, 0);
    S.scale = 1 + (rt < R.freeze ? 0.015 * Math.sin((t * Math.PI * 2) / 0.6) : 0); // a slow breath, until the freeze
    S.faceTo = turn;
    S.faceK = smooth(T.strike + 0.1, T.stare[0], tt);

    // the pup's poses: the sign, the grip on the hilt, flippers up for the strike, the battle cry, the sheepish wave
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.fist = smooth(T.equip[0], T.equip[0] + 0.3, tt) * (1 - smooth(T.charge[0], T.charge[0] + 0.3, tt)) * out;
    live.pose.raise = (smooth(T.strike - 0.15, T.strike, tt) * (1 - smooth(T.stare[0], T.stare[0] + 0.3, tt)) * (back ? 0 : 1)) * out; // one flipper up, for the strike
    live.pose.mouth = Math.max(smooth(T.strike - 0.1, T.strike + 0.05, tt) * (1 - smooth(T.strike + 0.5, T.strike + 0.8, tt)), 0.6 * smooth(7.0, 7.2, tt) * (back ? 0 : 1));
    live.pose.sit = 0; // upright for the whole scene, never lying on its side
    live.pose.crouch = 0;

    // SINDRIA, moving: lanterns swing, ships rock, the crowd ducks, palms whip (in the shader)
    const sw = 0.12 + 0.5 * U.uStorm.value;
    for (let i = 0; i < m.lampList.length; i++) {
      const l = m.lampList[i];
      O.position.set(l.p.x + Math.sin(t * 2.2 + l.ph) * sw * 0.5, l.p.y - 0.42, l.p.z + Math.cos(t * 1.7 + l.ph) * sw * 0.2);
      O.rotation.set(0, 0, Math.sin(t * 2.2 + l.ph) * sw * 0.6);
      O.scale.setScalar(1);
      O.updateMatrix();
      m.lamps.setMatrixAt(i, O.matrix);
    }
    m.lamps.instanceMatrix.needsUpdate = true;
    const ro = 0.04 + 0.16 * U.uStorm.value;
    for (let i = 0; i < FLEET.length; i++) {
      const [x, z, yaw] = FLEET[i];
      O.position.set(x, SEA_Y + 0.4 + Math.sin(t * 1.3 + i * 1.9) * (0.15 + 0.5 * U.uStorm.value), z);
      O.rotation.set(Math.sin(t * 1.1 + i) * ro, yaw, Math.sin(t * 0.9 + i * 2.3) * ro);
      O.scale.setScalar(1);
      O.updateMatrix();
      m.ships.setMatrixAt(i, O.matrix);
    }
    m.ships.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < CROWD; i++) {
      const f = m.folk[i];
      const d = struck - f.lag;
      const duck = d > 0 ? Math.min(1, d / 0.18) * (1 - smooth(1.0, 1.6, d)) : 0;
      const cheer = Math.max(0, Math.sin(t * 5 + f.ph));
      const jump = cheer * (tt > 2.2 && tt < T.strike ? 0.12 : 0.05) * (1 - duck);
      O.position.set(f.x, jump, f.z);
      O.rotation.set(0.4 * duck, f.yaw, 0.05 * Math.sin(t * 2 + f.ph));
      O.scale.set(f.s, f.s * (1 - 0.3 * duck), f.s);
      O.updateMatrix();
      m.crowd.setMatrixAt(i, O.matrix);
    }
    m.crowd.instanceMatrix.needsUpdate = true;
    // JA'FAR panics as the storm rises, cowers at the strike
    m.ja.tick(t, smooth(T.panic[0], T.panic[1], tt) * (1 - 0.3 * smooth(T.strike + 0.5, T.strike + 1.0, tt)), smooth(T.strike, T.strike + 0.25, tt));
    // his own bubble: up while the storm rises, aimed at his mouth
    const bub = S.bubble;
    if (bub) {
      const on = tt >= 2.3 && tt < tl.lineA;
      bub.hidden = !on;
      if (on) {
        m.ja.root.userData.head.getWorldPosition(V);
        V.project(cam);
        placeBubble(bub.firstElementChild, (V.x * 0.5 + 0.5) * innerWidth, (0.5 - V.y * 0.5) * innerHeight, "a", false);
      }
    }

    // the flash: cold, never a white-out
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(struck - 0.03) / 0.12) * 0.4 + Math.max(0, 1 - Math.abs(tt - T.equip[0]) / 0.12) * 0.15);
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={dust}>
        <Motes mode={mode} tl={tl} n={150} span={[30, 10, 30]} center={[0, 0, -8]} dir={[0.5, 0.3, 0.1]} size={0.09} color={["#f2b52e", "#e4566a", "#1fbdb4", "#fff3d6"]} sway={0.8} shape="diamond" />
      </group>
      <primitive object={m.flash} />
      <primitive object={m.lens.mesh} />
      <primitive object={m.sh.veil} />
      <primitive object={m.sh.shards} />
      <primitive object={m.sh.wave} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.shell.g} material={m.shell.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh geometry={m.seaM.g} material={m.seaM.m} position={[0, SEA_Y, -80]} renderOrder={-2} frustumCulled={false} />
          <primitive object={m.landMesh} />
          <primitive object={m.palms} />
          <primitive object={m.ships} />
          <primitive object={m.crowd} />
          <primitive object={m.ropes} />
          <primitive object={m.lamps} />
          <group position={[2.9, 0, -2.0]} rotation={[0, -0.85, 0]}>
            <primitive object={m.ja.root} />
          </group>
          <primitive object={m.mega} />
        </group>
        <primitive object={m.storm.g} />
        <primitive object={m.sigilFloor.g} />
        <primitive object={m.sigilSky.g} position={[0, 9, 0]} />
      </group>
    </>
  );
}
