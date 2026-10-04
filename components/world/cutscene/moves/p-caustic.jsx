// caustic: Naruto Shippuden, Madara at the Fourth Shinobi War, in shape and
// colour only. The pup signs and becomes Madara (a wild dark mane down its
// back, red armour plates, the gunbai on its back; round head, no ears); the
// island converts into the war: scorched, cracked ground with craters and
// rubble under a warm-grey sky of dust, the shinobi alliance far off on a
// ridge (48 ink silhouettes, a light stroke of headband each), and over it
// all the INFINITE TSUKUYOMI: a blood-red moon with three rings of tomoe,
// pulsing, pale threads drifting up off the field into it. A Perfect
// Susanoo rises behind the pup, ten pups tall. The alliance: "Is this… the
// power of a god?" The pup raises its flippers: TENGAI SHINSEI. The sky
// splits, meteor one craters the field (debris, shake, the crowd flinching
// back on twos); the second, far bigger, fills the sky, the moon cracks, and
// its impact (DOOOM) breaks the whole picture: every surface of the war is a
// shard mesh that cracks along its edges, tumbles and falls, and the real
// island, the caustic lighthouse on snow, is what was there all along. The
// pup, itself again, says the flex line in the real world; the credit card.
// The illusion is the model's confident collapse; the seal breaks it with no
// ground truth. No post pass: the flash is one quad, the lettering one plane.
// Card: lib/world/cutscene/cards/p-caustic.js. Parts: ./p-caustic/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, IcosahedronGeometry, Matrix4, Object3D, PlaneGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { madara } from "./p-caustic/costume";
import { pupPaint } from "./p-caustic/painted";
import { doomLettering } from "./p-caustic/doom";
import { flashQuad, flat, hash, hide, holdFlash, inst, islandList, mat, pupParts, put } from "./p-caustic/parts";
import { limb, susanooGeometry, susanooMaterials } from "./p-caustic/susanoo";
import { CRATERS, HIT1, HIT2, MOON_R, MOON_TALL, MOON_WIDE, battlefield, groundHeight, meteorGeometry, meteorMaterial, moon, rockGeometry, rockMaterial, skyShell, threadMaterial } from "./p-caustic/world";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
// the clock (s from the arrival); the card's beats put line A at 3.0 and line B at 6.6, on the shatter
const T = { costume: [0.55, 1.15], rise: [1.7, 2.8], cast: 3.3, split: [3.45, 3.95], m1: [3.8, 4.7], m2in: 4.85, m2hang: 6.1, hit2: 6.42, moonCrack: [5.45, 6.2], web: [6.42, 6.6], brk: 6.6, reveal: 6.6, flex: 6.8 };
const SUS_AT = [0.9, 0, -17];
const SUS_S = 2.5; // a towering titan: ~32 m to the crest, ~45 m to the sword tip
const M1 = { from: new Vector3(-32, 28, -105), to: new Vector3(HIT1[0], 0, HIT1[1]), r: 4.5 };
// meteor two hangs right of the Susanoo's head on a wide screen, over it on a tall one
const M2 = { from: new Vector3(40, 40, -120), hangWide: new Vector3(4, 14, -68), hangTall: new Vector3(3, 19, -72), to: new Vector3(HIT2[0], 0, HIT2[1]), r: 32 };
const HANG = new Vector3();
const MOON = new Vector3();
const CROWD = 48;
const RUBBLE = 150;
const DEBRIS = 120;
const THREADS = 56;
const UP = new Vector3(0, 1, 0);

// one shinobi: legs, a coat, arms, a round head; half of them carry a blade (all ink)
function shinobi(blade) {
  const p = [];
  for (const s of [-1, 1]) {
    p.push(limb([s * 0.1, 0, 0], [s * 0.11, 0.85, 0], 0.07, 0.09));
    p.push(limb([s * 0.22, 1.42, 0], [s * 0.32, 0.85, 0.08], 0.06, 0.05));
  }
  p.push(limb([0, 0.8, 0], [0, 1.45, 0], 0.17, 0.22));
  p.push(limb([0, 0.62, 0], [0, 0.9, 0], 0.22, 0.17)); // the coat's skirt
  p.push(new IcosahedronGeometry(0.13, 1).translate(0, 1.62, 0));
  if (blade) p.push(limb([0.32, 0.85, 0.1], [0.55, 1.75, 0.25], 0.025, 0.02, 4));
  return mergeGeometries(p.map(flat));
}

const V = new Vector3();
const W = new Vector3();
const CAM = new Vector3();
const Q = new Quaternion();
const M = new Matrix4();
const O = new Object3D();
const X = new Vector3();
const Z = new Vector3();
const Y = new Vector3();

// The world, built by the shared prewarm (cutscene/prewarm.js) while the seal walks up to the dock.
function buildWorld() {
  const shell = skyShell();
  const ground = battlefield();
  const tsukiM = moon();
  const susM = { g: susanooGeometry(), ...susanooMaterials() };
  const rock = rockMaterial();
  const rockG = rockGeometry();
  const rubble = inst(rockG, rock, RUBBLE);
  const debris = inst(rockG, rock, DEBRIS);
  const tint = new Color();
  for (let i = 0; i < RUBBLE; i++) {
    // scattered over the field, thickest round the old craters; none under the pup
    const cr = CRATERS[i % CRATERS.length];
    const near = i % 3 === 0;
    const a = hash(i, 1) * Math.PI * 2;
    const d = near ? cr[2] * (0.9 + 0.8 * hash(i, 2)) : 3.5 + 55 * hash(i, 2) ** 1.4;
    const x = near ? cr[0] + Math.cos(a) * d : (hash(i, 3) - 0.5) * 2 * d;
    const z = near ? cr[1] + Math.sin(a) * d : -2 - d * (0.3 + 0.7 * hash(i, 4));
    const s = (0.12 + 0.75 * hash(i, 5) ** 2) * (near ? 1.4 : 1);
    put(rubble, i, x, groundHeight(x, z) + s * 0.3, z, s * (0.8 + 0.5 * hash(i, 6)), s, s, hash(i, 7) * 3, hash(i, 8) * 3, 0);
    rubble.setColorAt(i, tint.setRGB(0.42 + 0.14 * hash(i, 9), 0.36 + 0.1 * hash(i, 9), 0.3 + 0.06 * hash(i, 10)));
  }
  for (let i = 0; i < DEBRIS; i++) {
    hide(debris, i);
    debris.setColorAt(i, tint.setRGB(0.4, 0.33, 0.27));
  }
  const ink = mat({ color: "#1d1813" });
  const crowdA = inst(shinobi(false), ink, CROWD / 2);
  const crowdB = inst(shinobi(true), ink, CROWD / 2);
  const bands = inst(flat(new BoxGeometry(0.3, 0.045, 0.3)), mat({ color: "#d8ccb6" }), CROWD);
  const crowd = Array.from({ length: CROWD }, (_, i) => {
    const x = -34 + (68 * (i + hash(i, 1) * 0.8)) / CROWD;
    const z = -31.5 - 4 * hash(i, 2);
    return { x, z, y: groundHeight(x, z), yaw: (hash(i, 3) - 0.5) * 0.7, s: 0.95 + 0.3 * hash(i, 4), lag: hash(i, 5) * 0.25 };
  });
  const threads = inst(new PlaneGeometry(0.07, 1).translate(0, 0.5, 0), threadMaterial(), THREADS);
  const thread = Array.from({ length: THREADS }, (_, i) => {
    const base = new Vector3((hash(i, 1) - 0.5) * 80, 0, -12 - 75 * hash(i, 2));
    base.y = groundHeight(base.x, base.z);
    return { base, dir: new Vector3(), len: 4 + 9 * hash(i, 3), speed: 2 + 3 * hash(i, 4), phase: hash(i, 5) * 40 };
  });
  const metG = meteorGeometry();
  const metM = meteorMaterial();
  const boom = doomLettering("DOOOM");
  const flash = flashQuad("#fff4e4");
  return { shell, ground, tsuki: tsukiM, sus: susM, rock, rockG, rubble, debris, ink, crowdA, crowdB, bands, crowd, threads, thread, metG, metM, boom, flash };
}
registerWarm("p-caustic", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const war = useRef();
  const dust = useRef();
  const met1 = useRef();
  const met2 = useRef();
  const sus = useRef();
  const tsuki = useRef();
  const pup = useRef(null);
  const shake = useRef(new Vector3());

  const m = useMemo(() => takeWarm("p-caustic", buildWorld), []);

  // the costume rides the pup's own head and body; the island list is taken before the stage hides it
  const costume = useRef(null);
  const paint = useRef(null);
  const island = useRef([]);
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    // the pup's painted twin materials for the war (taken before the costume goes on: it is painted already)
    paint.current = p?.root ? pupPaint(p.root) : null;
    if (p?.head && p.rear) {
      costume.current = madara(p);
      p.head.add(costume.current.hair);
      p.rear.add(costume.current.armour);
    }
    return () => {
      costume.current?.dispose();
      costume.current = null;
      paint.current?.dispose();
      paint.current = null;
      pup.current = null;
      window.__ccT = -1;
      // everything the scene built goes with it
      for (const g of [m.shell.g, m.ground.g, m.tsuki.g, m.sus.g, m.rockG, m.crowdA.geometry, m.crowdB.geometry, m.bands.geometry, m.threads.geometry, m.metG, m.boom.geometry, m.flash.geometry]) g.dispose();
      for (const x of [m.shell.m, m.ground.m, m.tsuki.m, m.sus.body, m.sus.rim, m.rock, m.ink, m.bands.material, m.threads.material, m.metM, m.boom.material, m.flash.material]) x.dispose();
      m.boom.material.map?.dispose();
      for (const x of [m.rubble, m.debris, m.crowdA, m.crowdB, m.bands, m.threads]) x.dispose();
    };
  }, [scene, m]);

  // impacts shake the whole frame two drawings each: the war and the pup together (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the war draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      paint.current?.set(false, 0);
      if (costume.current) costume.current.hair.visible = costume.current.armour.visible = false;
      if (costume.current?.eyes) costume.current.eyes.visible = false;
      return;
    }
    if (p?.root && mode === "full") p.root.position.add(shake.current);
  }, -0.5);

  useCutFrame((t, state) => {
    window.__ccT = mode === "full" ? t : -1; // the card's lens reads the scene clock
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    const c = costume.current;
    if (!full) {
      if (c) c.hair.visible = c.armour.visible = false;
      if (c?.eyes) c.eyes.visible = false;
      paint.current?.set(false, 0);
      shake.current.set(0, 0, 0);
      return;
    }
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const cam = state.camera;
    const brk = tt - T.brk; // seconds since the picture broke
    const broken = brk > 0;
    const held = brk > 0.2; // the Madara pup holds a beat into the shatter, then snaps back with the island

    // the rig: the pup at the origin, turned so the lighthouse (and the alliance far beyond it) stands right
    const turn = turnFor(card, place, s.x, s.z);
    const hit = (h, k) => (tt >= h && tt < h + 0.17 ? k : 0);
    const amp = hit(T.m1[1], 0.09) + hit(T.hit2, 0.16);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until it breaks
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const sh = m.shell.m.uniforms;
    shellRef.current.visible = r > 0.02 && brk < 1.6;
    shellRef.current.scale.setScalar(inside || broken ? 140 : Math.max(r, 0.02));
    sh.uInside.value = inside || broken ? 1 : 0;
    world.current.visible = (inside || broken) && brk < 1.6;
    war.current.visible = !broken;
    const cell = 6 * state.gl.getPixelRatio();
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    const wide = state.size.width / state.size.height >= 1;
    MOON.copy(wide ? MOON_WIDE : MOON_TALL);
    HANG.copy(wide ? M2.hangWide : M2.hangTall);
    tsuki.current.position.copy(MOON);
    W.copy(MOON).applyAxisAngle(UP, turn).add(V.set(s.x, 0, s.z)); // the moon, world space
    for (const u of [sh, m.ground.m.uniforms]) {
      u.uCell.value = cell;
      u.uTime.value = t;
      u.uMoon.value.copy(W);
      u.uPulse.value = pulse;
      u.uBreak.value = brk;
    }
    const mu = m.tsuki.m.uniforms;
    mu.uCell.value = cell;
    mu.uPulse.value = pulse;
    mu.uSpin.value = t * 0.12;
    mu.uTime.value = t;
    m.rock.uniforms.uTime.value = t;
    mu.uBreak.value = brk;
    mu.uMoonCrack.value = smooth(T.moonCrack[0], T.moonCrack[1], tt);
    m.rock.uniforms.uMoon.value.copy(W);
    m.metM.uniforms.uTime.value = t;
    sh.uSplit.value = smooth(T.split[0], T.split[1], tt) * (1 - smooth(T.hit2, T.hit2 + 0.1, tt));
    sh.uSplitDir.value.set(0, 0.25, -0.97).applyAxisAngle(UP, turn);
    // the crack web runs out from meteor two's impact, then the break
    const web = smooth(T.web[0], T.web[1], tt);
    W.set(M2.to.x, 4, M2.to.z).applyAxisAngle(UP, turn).add(V.set(s.x, 0, s.z)).sub(cam.position).normalize();
    sh.uCrack.value = web;
    sh.uCrackDir.value.copy(W);
    m.ground.m.uniforms.uCrack.value = web;
    m.ground.m.uniforms.uCrackDir.value.copy(W);
    tsuki.current.lookAt(cam.position);

    // THE MADARA PUP: the costume grows in on the sign (an overshoot), and is gone the instant the picture breaks
    // THE PAINTED WAR takes the pup too, from the bloom to the break; then it snaps back to full colour
    paint.current?.set((inside || tt > tl.bloom[1]) && !held, t);
    if (c) {
      c.tick(t);
      const k = smooth(T.costume[0], T.costume[1], tt);
      const pop = k * (1 + 0.18 * Math.sin(Math.PI * Math.min(1, Math.max(0, tt - T.costume[0]) / 0.7)));
      c.hair.visible = c.armour.visible = k > 0.01 && !held;
      if (c.eyes) c.eyes.visible = c.hair.visible;
      c.hair.scale.setScalar(Math.max(pop, 0.01));
      c.armour.scale.setScalar(Math.max(0.6 + 0.4 * pop, 0.01));
      // the mane sways in the war wind, on twos
      c.hair.rotation.set(0.05 * Math.sin(tt * 2.6), 0.06 * Math.sin(tt * 1.7), 0.03 * Math.sin(tt * 3.1));
    }
    // the pup: the sign, a fist as the Susanoo rises, flippers up for Tengai Shinsei, blown low at the break, the fist again on the flex
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt));
    live.pose.fist = (smooth(1.7, 2.0, tt) * (1 - smooth(T.cast - 0.1, T.cast + 0.1, tt)) + smooth(T.flex, T.flex + 0.3, tt)) * out;
    live.pose.raise = smooth(T.cast, T.cast + 0.3, tt) * (1 - smooth(T.brk, T.brk + 0.15, tt));
    live.pose.crouch = smooth(T.hit2, T.hit2 + 0.1, tt) * (1 - smooth(T.brk + 0.3, T.brk + 0.6, tt)) * 0.8;

    // THE PERFECT SUSANOO rises out of the field behind the pup, flares on the cast and the impact, gone at the break
    const rise = smooth(T.rise[0], T.rise[1], tt);
    const su = m.sus.shared;
    su.uTime.value = t;
    su.uFade.value = Math.min(1, rise * 1.4);
    su.uFlare.value = Math.max(0, 1 - Math.abs(tt - T.cast - 0.15) / 0.35) * 0.6 + Math.max(0, 1 - Math.abs(tt - T.hit2) / 0.25) * 0.5;
    su.uCell.value = cell;
    su.uShake.value = amp;
    sus.current.visible = rise > 0;
    sus.current.scale.setScalar(SUS_S);
    sus.current.position.set(SUS_AT[0], -13 * SUS_S * (1 - rise) + 0.25 * Math.sin(rise * Math.PI), SUS_AT[2]);

    // THE ALLIANCE on the ridge: they flinch back on twos at the rise and at each impact, staggered, and sway
    for (let i = 0; i < CROWD; i++) {
      const f = m.crowd[i];
      const jolt = (h) => {
        const d = tt - h - f.lag;
        return d > 0 && d < 1.2 ? Math.sin(Math.min(1, d / 0.25) * Math.PI * 0.5) * (1 - smooth(0.5, 1.2, d)) : 0;
      };
      const k = Math.max(jolt(T.rise[0] + 0.2) * 0.6, jolt(T.m1[1]), jolt(T.hit2));
      const lean = -0.32 * k + 0.02 * Math.sin(tt * 1.3 + i);
      O.position.set(f.x, f.y, f.z - 0.45 * k);
      O.rotation.set(lean, f.yaw, 0.02 * Math.sin(tt * 2 + i));
      O.scale.setScalar(f.s);
      O.updateMatrix();
      (i % 2 ? m.crowdB : m.crowdA).setMatrixAt(i >> 1, O.matrix);
      V.set(0, 1.66, 0).applyMatrix4(O.matrix); // the headband rides the head
      put(m.bands, i, V.x, V.y, V.z, f.s * 0.95, f.s, f.s, lean, f.yaw, 0);
    }
    m.crowdA.instanceMatrix.needsUpdate = m.crowdB.instanceMatrix.needsUpdate = m.bands.instanceMatrix.needsUpdate = true;

    // THE THREADS: pale ribbons drifting up off the field into the moon, turned flat to the lens
    CAM.copy(cam.position).sub(g.position).applyAxisAngle(UP, -turn); // the lens in the rig's frame
    for (let i = 0; i < m.thread.length; i++) {
      const th = m.thread[i];
      th.dir.copy(MOON).sub(th.base).normalize();
      const run = (th.phase + tt * th.speed) % 60;
      W.copy(th.base).addScaledVector(th.dir, run);
      Z.copy(CAM).sub(W);
      X.crossVectors(th.dir, Z).normalize();
      Z.crossVectors(X, th.dir).normalize();
      const fade = Math.min(1, run / 6) * (1 - smooth(45, 60, run)) * smooth(1.6, 2.4, tt);
      M.makeBasis(X, Y.copy(th.dir).multiplyScalar(th.len * Math.max(fade, 0.001)), Z);
      M.setPosition(W);
      m.threads.setMatrixAt(i, M);
    }
    m.threads.instanceMatrix.needsUpdate = true;

    // METEOR ONE: through the split, onto the field
    const f1 = Math.min(1, Math.max(0, (tt - T.m1[0]) / (T.m1[1] - T.m1[0])));
    met1.current.visible = tt > T.m1[0] && tt < T.m1[1];
    met1.current.position.lerpVectors(M1.from, M1.to, f1 * f1 * (0.6 + 0.4 * f1));
    met1.current.quaternion.setFromUnitVectors(UP, V.subVectors(M1.from, M1.to).normalize());
    met1.current.scale.setScalar(M1.r);
    // METEOR TWO: far bigger; it slides out of the split, hangs filling the sky, then slams
    met2.current.visible = tt > T.m2in && tt < T.hit2;
    if (tt < T.m2hang) {
      met2.current.position.lerpVectors(M2.from, HANG, smooth(T.m2in, T.m2hang, tt));
      met2.current.quaternion.setFromUnitVectors(UP, V.subVectors(M2.from, HANG).normalize());
    } else {
      const a = Math.min(1, (tt - T.m2hang) / (T.hit2 - T.m2hang));
      met2.current.position.lerpVectors(HANG, M2.to, a * a);
      met2.current.quaternion.setFromUnitVectors(UP, V.subVectors(HANG, M2.to).normalize());
    }
    met2.current.scale.setScalar(M2.r);

    // the craters open and glow
    const gu = m.ground.m.uniforms;
    gu.uK1.value = smooth(T.m1[1], T.m1[1] + 0.25, tt);
    gu.uHot1.value = gu.uK1.value * (1 - smooth(T.m1[1] + 0.3, T.m1[1] + 2.5, tt));
    gu.uK2.value = smooth(T.hit2, T.hit2 + 0.15, tt);
    gu.uHot2.value = gu.uK2.value;

    // DEBRIS: two bursts of rock thrown in arcs, settling
    for (let i = 0; i < DEBRIS; i++) {
      const second = i >= DEBRIS / 2;
      const h = second ? T.hit2 : T.m1[1];
      const at = second ? HIT2 : HIT1;
      const d = tt - h;
      if (d < 0) {
        hide(m.debris, i);
        continue;
      }
      const a = hash(i, 1) * Math.PI * 2;
      const sp = (second ? 14 : 9) * (0.4 + hash(i, 2));
      const up = (second ? 20 : 14) * (0.4 + hash(i, 3));
      const x = at[0] + Math.cos(a) * sp * d;
      const z = at[1] + Math.sin(a) * sp * d * 0.6 + Math.abs(Math.sin(a)) * sp * d * 0.5;
      const y = Math.max(groundHeight(x, z), up * d - 9.8 * d * d);
      const sz = (second ? 1.4 : 0.9) * (0.3 + hash(i, 4));
      put(m.debris, i, x, y, z, sz, sz, sz, d * 4 * hash(i, 5), d * 3, 0);
    }
    m.debris.instanceMatrix.needsUpdate = true;

    // the lettering on the second impact: a pop, then it judders on twos, flat to the lens
    const bl = tt - T.hit2;
    m.boom.visible = bl > 0 && bl < 0.75;
    if (m.boom.visible) {
      const pop = Math.min(1, bl / 0.08) * (1 + 0.25 * Math.max(0, 1 - bl / 0.2));
      const w = (wide ? 3.6 : 2.4) * pop;
      m.boom.position.set((wide ? -1.5 : 0.35) + 0.04 * odd, wide ? 2.05 : 2.35, 0.4);
      m.boom.scale.set(w, w, 1);
      g.updateWorldMatrix(true, false);
      m.boom.quaternion.copy(Q.setFromRotationMatrix(g.matrixWorld).invert().multiply(cam.quaternion));
    }

    // the flash: a little at meteor one, more at two (tinted, never a white-out)
    const fl = Math.max(0, 1 - Math.abs(tt - T.m1[1]) / 0.09) * 0.15 + Math.max(0, 1 - Math.abs(tt - T.hit2 - 0.04) / 0.1) * 0.35;
    holdFlash(m.flash, cam, fl);

    // REALITY: the island the stage hid comes back under the falling shards
    if (tt > T.reveal && tt < tl.collapse[0]) for (const o of island.current) o.visible = true;
    dust.current.visible = !broken;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={dust}>
        <Motes mode={mode} tl={tl} n={160} span={[30, 9, 26]} center={[0, 0, -8]} dir={[0.35, 0.05, 0.1]} size={0.07} color={["#b3a28c", "#6f6355", "#d6c8b2"]} sway={0.6} shape="round" />
        <Motes mode={mode} tl={tl} n={70} span={[22, 7, 18]} center={[0, 0, -6]} dir={[0.1, 0.6, 0]} size={0.045} color={["#e9dcc6", "#a8977f", "#f4ead8"]} sway={0.3} shape="diamond" />
      </group>
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.shell.g} material={m.shell.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh geometry={m.ground.g} material={m.ground.m} renderOrder={-1} frustumCulled={false} />
          <mesh ref={tsuki} geometry={m.tsuki.g} material={m.tsuki.m} scale={MOON_R} renderOrder={-2} frustumCulled={false} />
          <group ref={war}>
            <primitive object={m.rubble} />
            <primitive object={m.debris} />
            <primitive object={m.crowdA} />
            <primitive object={m.crowdB} />
            <primitive object={m.bands} />
            <primitive object={m.threads} />
            <group ref={sus} visible={false}>
              <mesh geometry={m.sus.g} material={m.sus.body} renderOrder={2} frustumCulled={false} />
              <mesh geometry={m.sus.g} material={m.sus.rim} renderOrder={3} frustumCulled={false} />
            </group>
            <mesh ref={met1} geometry={m.metG} material={m.metM} visible={false} frustumCulled={false} />
            <mesh ref={met2} geometry={m.metG} material={m.metM} visible={false} frustumCulled={false} />
          </group>
        </group>
        <primitive object={m.boom} />
      </group>
    </>
  );
}
