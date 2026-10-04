// monodromy: Magi, Sinbad and Baal's Baararaq Saiqa, in shape and colour only. The island becomes SINDRIA in
// Magi's Arabian Nights: a white-and-gold palace on a cliff over a turquoise sea (gold onion domes, turquoise
// towers, a star-tiled terrace with a patterned border, fountains), palms, a harbour of dhows with lateen sails and
// a festival crowd under strings of lanterns, all in warm anime cel (look.js). The pup becomes SINBAD (a long
// dark-violet ponytail, a gold circlet, hoop earrings, glowing ring vessels and a sword hilt), equips the djinn BAAL
// (lightning armour, glowing tattoos, a blue-white storm wreathing it) while Ja'far panics, and fires BAARARAQ SAIQA:
// city-scale lightning from a vortex over the palace that is so big it BREAKS THE FOURTH WALL: the HUD frame, the
// letterbox and the Skip chip shudder, a crack runs across the lens, the pup looks at the viewer. The crack IS the
// loop (monodromy): the pup steps into it and the whole world folds shut along it, and the island is back exactly
// where we left it, the loop closed (a ring on the ground closes too), the pup giving a sheepish wave.
// No post pass: the crack is one quad on the lens, the fold is a vertex squeeze, the HUD shudder is CSS variables.
// Card: lib/world/cutscene/cards/p-monodromy.js. Parts: ./p-monodromy/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Mesh, Object3D, Vector2, Vector3 } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { place as placeBubble } from "../../ui/Bubbles";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { boltMaterial, burstGeometry, megaBoltGeometry, wreathGeometry } from "./p-monodromy/bolt";
import { crackLens, foldPlane, loopRing, placeLens } from "./p-monodromy/crack";
import { jafar, sinbad, stormColumn } from "./p-monodromy/hero";
import { U, celMat, hash, pupCel } from "./p-monodromy/look";
import { FLEET, LANTERN_COLORS, PALM_AT, ROBES, SEA_Y, landscape, lanternGeometry, palmGeometry, personGeometry, sea, shipGeometry, skyShell, strings } from "./p-monodromy/world";

const CORE_Y = 0.9;
// the clock (s from the arrival). The card's beats: Relax 4.6, Oops 7.0, the flex 9.6, the credit 12.0, out 13.6
const T = {
  costume: [0.9, 1.5],
  equip: [1.9, 3.1],
  panic: [2.3, 2.7], // Ja'far's panic ramps up; his bubble is up 2.3 .. 4.6
  charge: [4.9, 6.3], // the flippers rise, the vortex winds up
  strike: 6.4, // BAARARAQ SAIQA
  lens: 6.5, // it comes out of the screen: the lens cracks
  stare: [6.8, 7.7],
  step: [7.7, 8.4], // the pup steps into the crack
  fold: [8.3, 9.5], // the world folds shut along it
  home: 9.5, // the island, exactly where we left it; the pup is back
  heal: [9.5, 9.9],
  ring: [9.55, 10.2],
};
const FLASHES = [3.35, 3.95, 4.9, 5.35, 5.8, 6.1]; // far lightning in the clouds as the storm builds
const CROWD = 72;
const LAMPS = 48;
const CRACK_AT = new Vector2(0.1, 0.06); // where the lens breaks (screen, aspect-centred units)
const CRACK_ANG = 1.12;

const V = new Vector3();
const W = new Vector3();
const N = new Vector3();
const O = new Object3D();
const COL = new Color();
const hudVars = (x, y, r) => {
  const s = document.documentElement.style;
  s.setProperty("--mono-x", `${x.toFixed(1)}px`);
  s.setProperty("--mono-y", `${y.toFixed(1)}px`);
  s.setProperty("--mono-r", `${r.toFixed(2)}deg`);
};

// the HUD's own shudder: its frame, the cinema bars, the Skip chip, driven by CSS variables (one rule, no DOM walk)
const SHUDDER_CSS = `html[data-mono-shake] .hud-top, html[data-mono-shake] .cut-skip, html[data-mono-shake] .cut-title { translate: var(--mono-x, 0) var(--mono-y, 0); rotate: var(--mono-r, 0deg); }
html[data-mono-shake] .hud-letterbox::before, html[data-mono-shake] .hud-letterbox::after { translate: var(--mono-x, 0) var(--mono-y, 0); }`;

// Ja'far's own bubble (the shared bubbles hold three lines): the kit's markup and layout, aimed at his mouth
function panicBubble() {
  const wrap = document.createElement("div");
  wrap.className = "comic";
  wrap.style.cssText = "--accent:#1fbdb4;--deep:#0e8a94;";
  wrap.innerHTML = `<div class="bubble" data-slot="p" data-who="land" data-kind="oval"><svg class="bubble-art" aria-hidden="true"><path class="bubble-tail bubble-ink"></path><path class="bubble-body bubble-ink"></path><path class="bubble-tail bubble-fill"></path></svg><p class="bubble-text">My king, you can't fire that <b>inside a portfolio</b>!</p></div>`;
  wrap.hidden = true;
  return wrap;
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
<<<<<<< HEAD
=======
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
>>>>>>> scene2/mono
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const dust = useRef();
  const pup = useRef(null);
  const st = useRef({ shake: new Vector3(), step: new Vector3(), scale: 1, faceTo: 0, faceK: 0, bubble: null, lastTt: -1 });

  const m = useMemo(() => {
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
    const wreath = new Mesh(wreathGeometry(), boltMaterial());
    const burst = new Mesh(burstGeometry(), boltMaterial());
    for (const b of [mega, wreath, burst]) {
      b.frustumCulled = false;
      b.renderOrder = 6;
      b.visible = false;
    }
    mega.material.uniforms.uJit.value = 0.45;
    wreath.material.uniforms.uJit.value = 0.05;
    burst.material.uniforms.uJit.value = 0.12;
    const storm = stormColumn();
    const ja = jafar(cel);
    const lens = crackLens();
    lens.m.uniforms.uC.value = CRACK_AT;
    lens.m.uniforms.uAng.value = CRACK_ANG;
    const ring = loopRing();
    const flash = flashQuad("#cfe6ff");
    return { cel, palmMat, shell, seaM, land, landMesh, palmG, palms, shipG, ships, personG, crowd, folk, str, lampList, ropes, lampG, lamps, mega, wreath, burst, storm, ja, lens, ring, flash };
  }, []);

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
    // the HUD shudder's rule, and Ja'far's own bubble: only while the scene is up
    let style = null;
    let bubble = null;
    if (mode === "full") {
      style = document.createElement("style");
      style.textContent = SHUDDER_CSS;
      document.head.append(style);
      bubble = panicBubble();
      document.querySelector(".hud")?.append(bubble);
    }
    state.bubble = bubble;
<<<<<<< HEAD
=======
    // pre-compile every program the scene draws, so the first frames do not stall: show it all for one compile pass
    if (mode === "full" && rig.current) {
      const hidden = [];
      rig.current.traverse((o) => {
        if (!o.visible) { hidden.push(o); o.visible = true; }
      });
      for (const o of [m.lens.mesh, m.flash]) if (!o.visible) { hidden.push(o); o.visible = true; }
      skin.current?.set(true);
      try { gl.compile(scene, camera); } catch { /* the first draw compiles instead */ }
      skin.current?.set(false);
      for (const o of hidden) o.visible = false;
    }
>>>>>>> scene2/mono
    return () => {
      costume.current?.dispose();
      costume.current = null;
      pup.current?.root.scale.setScalar(1);
      skin.current?.dispose();
      skin.current = null;
      pup.current = null;
      style?.remove();
      bubble?.remove();
      state.bubble = null;
      document.documentElement.removeAttribute("data-mono-shake");
      const s = document.documentElement.style;
      for (const k of ["--mono-x", "--mono-y", "--mono-r"]) s.removeProperty(k);
      U.uFold.value = U.uStorm.value = U.uFlash.value = 0;
      for (const g of [m.shell.g, m.seaM.g, m.land, m.palmG, m.shipG, m.personG, m.str.rope, m.lampG, m.mega.geometry, m.wreath.geometry, m.burst.geometry, m.lens.mesh.geometry, m.ring.mesh.geometry, m.flash.geometry]) g.dispose();
      for (const x of [m.cel, m.palmMat, m.shell.m, m.seaM.m, m.mega.material, m.wreath.material, m.burst.material, m.lens.m, m.ring.m, m.flash.material]) x.dispose();
      for (const x of [m.palms, m.ships, m.crowd, m.lamps]) x.dispose();
      m.storm.dispose();
      m.ja.dispose();
    };
<<<<<<< HEAD
  }, [scene, m, mode]);
=======
  }, [scene, gl, camera, m, mode]);
>>>>>>> scene2/mono

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
      if (costume.current) costume.current.hair.visible = costume.current.armour.visible = false;
      document.documentElement.removeAttribute("data-mono-shake");
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(S.shake).add(S.step);
      p.root.scale.setScalar(S.scale);
      if (S.faceK > 0) {
        const y = p.root.rotation.y;
        p.root.rotation.y = y + Math.atan2(Math.sin(S.faceTo - y), Math.cos(S.faceTo - y)) * S.faceK;
      }
    }
  }, -0.5);

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
      S.shake.set(0, 0, 0);
      S.step.set(0, 0, 0);
      S.scale = 1;
      return;
    }
    const tt = onTwos(t);
    const cam = state.camera;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const struck = tt - T.strike;
    const folding = tt >= T.fold[0];
    const done = tt >= T.home;
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;

    // the rig: the pup at the origin, turned so the landform stands where the figure would
    const turn = turnFor(card, place, s.x, s.z);
    const amp = Math.max(0, 1 - Math.abs(struck - 0.05) / 0.5) * 0.16 + Math.max(0, 1 - Math.abs(tt - T.lens) / 0.3) * 0.1;
    S.shake.set(amp * odd, -amp * 0.5 * odd, 0);
    g.position.set(s.x + S.shake.x, S.shake.y, s.z);
    g.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until the fold has shut
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    shellRef.current.visible = r > 0.02 && !done;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    m.shell.m.uniforms.uInside.value = inside ? 1 : 0;
    world.current.visible = inside && !done;
    dust.current.visible = !folding;

    // the shared sky and light: the storm winds up with the equip and the charge; the flashes
    const storm = smooth(T.equip[0], 3.4, tt) * 0.45 + smooth(T.charge[0], T.charge[1], tt) * 0.55;
    let flash = struck >= 0 ? Math.max(0, 1 - struck / 0.4) * 0.5 + (struck > 0.7 && struck < 1.6 ? 0.18 * (Math.floor(t * 12) % 2) : 0) : 0;
    for (const f of FLASHES) if (tt >= f && tt < f + 0.17) flash = Math.max(flash, 0.22);
    flash = Math.max(flash, Math.max(0, 1 - Math.abs(tt - T.equip[0]) / 0.18) * 0.3);
    U.uTime.value = t;
    U.uStorm.value = tt >= T.strike ? 1 : storm;
    U.uFlash.value = folding ? 0 : Math.min(flash, 0.5);
    U.uGust.value = 0.14 + 0.35 * U.uStorm.value + Math.max(0, 1 - Math.abs(struck) / 0.8) * 0.5;
    m.seaM.m.uniforms.uSurge.value = 0.1 + 0.9 * U.uStorm.value;

    // THE CRACK'S PLANE and THE FOLD
    foldPlane(cam, CRACK_AT, CRACK_ANG, N);
    U.uFoldN.value.copy(N);
    U.uFoldC.value.copy(cam.position);
    U.uFold.value = smooth(T.fold[0], T.fold[1], tt);
    if (folding && tt < tl.collapse[0]) for (const o of island.current) o.visible = true; // the island the stage hid, under the closing world

    // THE PUP: Sinbad, then Baal; the real pup drawn in the dimension's cel until it is home
    skin.current?.set((inside || tt > tl.bloom[1]) && !done);
    const costumeK = done ? 0 : smooth(T.costume[0], T.costume[1], tt) * (1 - smooth(T.step[0] + 0.4, T.step[1], tt));
    const equipK = done ? 0 : smooth(T.equip[0], T.equip[1], tt) * (1 - smooth(T.step[0] + 0.3, T.step[1], tt));
    const flare = Math.max(0, 1 - Math.abs(struck - 0.1) / 0.5);
    if (c) c.tick(t, costumeK, equipK, flare);
    // the storm round the pup: the column grows with the equip and flares with the strike, gone as it steps through
    const col = done ? 0 : (equipK * 0.7 + smooth(T.charge[0], T.charge[1], tt) * 0.5 + flare * 0.6) * (1 - smooth(T.step[0] + 0.2, T.step[1], tt));
    m.storm.tick(t, Math.min(col, 1.2));
    const wr = m.wreath.material.uniforms;
    m.wreath.visible = equipK > 0.02 && !folding;
    wr.uGrow.value = 2;
    wr.uFade.value = 0.55 * equipK * (0.8 + 0.2 * odd) + 0.5 * flare;
    wr.uStep.value = Math.floor(t * 12);
    m.wreath.rotation.y = t * 1.5;

    // BAARARAQ SAIQA: the trunks and the sheets grow out of the vortex in three drawings, hold, then crawl and fade
    const mu = m.mega.material.uniforms;
    m.mega.visible = struck >= 0 && !folding;
    mu.uGrow.value = struck / 0.2;
    mu.uFade.value = Math.min(1, 1.3 - struck * 0.55) * (0.78 + 0.22 * odd) * (1 - smooth(1.4, 2.0, struck));
    mu.uStep.value = Math.floor(t * 12);
    // out of the screen: the fan of bolts at the lens
    const bs = tt - T.lens;
    const bu = m.burst.material.uniforms;
    m.burst.visible = bs >= 0 && bs < 1.1;
    bu.uGrow.value = bs / 0.12;
    bu.uFade.value = Math.min(1, 1.2 - bs * 0.9) * (0.8 + 0.2 * odd);
    bu.uStep.value = Math.floor(t * 12);

    // THE LENS: the crack grows from the impact, opens into a seam as the world folds, heals from its ends
    const L = m.lens;
    L.mesh.visible = tt >= T.lens && tt < T.heal[1] + 0.1;
    if (L.mesh.visible) {
      placeLens(L.mesh, cam);
      const u = L.m.uniforms;
      u.uAspect.value = cam.aspect;
      u.uGrow.value = smooth(T.lens, T.lens + 0.45, tt);
      u.uGap.value = smooth(T.step[0], T.fold[1], tt);
      u.uHeal.value = smooth(T.heal[0], T.heal[1], tt);
      u.uTime.value = t;
      u.uStep.value = Math.floor(t * 12);
      u.uFlash.value = Math.max(0, 1 - (tt - T.lens) / 0.25);
    }
    // the HUD shudders with the strike and the crack, then sags crooked until the loop closes
    const hit = Math.max(0, 1 - Math.abs(struck - 0.05) / 0.9) + Math.max(0, 1 - Math.abs(tt - T.lens - 0.1) / 0.7);
    const hold = smooth(T.lens, T.lens + 0.4, tt) * (1 - smooth(T.heal[0], T.heal[1], tt));
    const root = document.documentElement;
    if (hit > 0.01 || hold > 0.01) {
      if (!root.hasAttribute("data-mono-shake")) root.setAttribute("data-mono-shake", "");
      if (S.lastTt !== tt) {
        S.lastTt = tt; // on twos: the variables change twelve times a second, not every frame
        hudVars((hit * 9 + hold * 1.5) * odd, hit * 5 * -odd, hit * 1.6 * odd + hold * -1.4);
      }
    } else root.removeAttribute("data-mono-shake");

    // THE STEP THROUGH: the pup walks into the crack (its plane through the lens) and shrinks to nothing; home, it is back
    V.set(s.x, 0.6, s.z);
    const sk = done ? 0 : smooth(T.step[0], T.step[1], tt);
    const dist = W.copy(V).sub(cam.position).dot(N);
    S.step.copy(N).multiplyScalar(-dist * sk);
    const pop = done ? Math.min(1, (tt - T.home) / 0.25) : 1;
    S.scale = done ? Math.max(0.01, pop * (1 + 0.2 * Math.sin(pop * Math.PI))) : Math.max(0.02, 1 - 0.97 * sk);
    S.faceTo = turn;
    S.faceK = smooth(T.strike + 0.1, T.stare[0], tt);

    // the pup's poses: the sign, the grip on the hilt, flippers up for the strike, the battle cry, the sheepish wave
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.fist = smooth(T.equip[0], T.equip[0] + 0.3, tt) * (1 - smooth(T.charge[0], T.charge[0] + 0.3, tt)) * out;
    const wave = done ? 0.55 * (Math.floor(t * 4) % 2) * smooth(T.home + 0.2, T.home + 0.5, tt) : 0;
    live.pose.raise = (smooth(T.charge[0], T.charge[0] + 0.5, tt) * (1 - smooth(T.stare[0], T.stare[0] + 0.3, tt)) + wave) * out;
    live.pose.mouth = Math.max(smooth(T.strike - 0.1, T.strike + 0.05, tt) * (1 - smooth(T.strike + 0.5, T.strike + 0.8, tt)), 0.6 * smooth(7.0, 7.2, tt) * (1 - smooth(T.step[0], T.step[0] + 0.2, tt)));
    live.pose.crouch = (smooth(T.strike, T.strike + 0.1, tt) * (1 - smooth(T.strike + 0.5, T.strike + 0.8, tt)) * 0.7 + (done ? 0.35 * smooth(T.home, T.home + 0.3, tt) : 0)) * out;

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

    // the loop, closed: a ring round the pup's feet draws itself to meet where it began
    m.ring.mesh.visible = tt >= T.ring[0] && tt < tl.collapse[0];
    m.ring.m.uniforms.uClose.value = smooth(T.ring[0], T.ring[1], tt);
    m.ring.m.uniforms.uFade.value = 1 - smooth(tl.credit - 0.4, tl.credit + 0.4, tt);

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
          <primitive object={m.burst} />
        </group>
        <primitive object={m.storm.g} />
        <primitive object={m.wreath} />
        <primitive object={m.ring.mesh} />
      </group>
    </>
  );
}
