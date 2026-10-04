"use client";

// Separatrix: JoJo's Bizarre Adventure Part 5, GOLD EXPERIENCE REQUIEM at the COLOSSEUM, in the FRESCO AND
// GOLD LEAF dimension (the Renaissance wall: chalky matte pigment, craquelure, flat violet-umber shadows;
// gold leaf is the only shine). The pup is Giorno (three curls across the forehead, a braid, a pink-violet
// jacket, a gold-leaf ladybug brooch; round head, no ears). A cream banner unfurls across the top, the island
// becomes the Colosseum at golden dusk, and the claim plays out as the Requiem:
//
//   parcels drop from a broken column onto the coral ridge and flow like the figure's phase portrait;
//   KING CRIMSON (a hulking stand behind Diavolo) erases time: the plaster flakes off to the red sinopia, the
//   parcels JUMP to their pools (only start and end drawn, as red sketches), those that began inside the
//   rounding band land anyway: an answer with its cause cut out; Diavolo's coin is heads at once.
//   The gold arrow pierces the air; GOLD EXPERIENCE REQUIEM rises behind the pup (DON!) and the gold wipes back
//   across the stripped plaster, the colour returning behind it. Every action returns to ZERO: the parcels are
//   dragged back along their erased paths and run again; clear ones ring in their pools (the gate lifts), the
//   band's are torn toward both pools and fade, "..." where they were, the gate down, the beacon flashing.
//   MUDA: a flurry drops Diavolo into the saddle, sliding toward one pool, then the other, never arriving.
//   The ゴゴゴ rises up both edges, eight costume pups strike poses, and the To Be Continued arrow slides in
//   and becomes the credit card. WHY WE COME HOME: the Requiem's return to zero reaches the picture itself: the
//   gold un-paints the fresco to blank plaster, and the island is what was under it.
//
// Card: lib/world/cutscene/cards/p-separatrix.js. Parts: ./p-separatrix/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { radiusAt, viewAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, signAt, smooth, useCutFrame } from "../kit";
import { islandList, pupParts } from "./p-caustic/parts";
import { unfurlAt } from "./p-separatrix/banner";
import { COUNTS, build } from "./p-separatrix/build";
import { giorno } from "./p-separatrix/costume";
import { hide, put, putQ } from "./p-separatrix/fx";
import { BREAK, pupFresco } from "./p-separatrix/fresco";
import { ease, hash, layout, lerp } from "./p-separatrix/geo";
import { N, T, beaconAt, gateAt, makeParcels, parcelAt, schedule } from "./p-separatrix/story";
import { floorY, poolLevel } from "./p-separatrix/world";

const CORE_Y = 0.9;
const HUD_D = 5; // m: the lens's plane the gold lettering is laid on
const DV = { x: 5.2, z: -11.4, yaw: -0.45, s: 1.2 };
const KC = { x: 6.5, z: -14.5, s: 1.0 };
const GER = { rise: [-1.1, -1.9], stand: [0.5, -4.0], s: 0.8 };
const SLIT = [-1.4, 1.75, 0.9];
const Z = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const NEG_Y = new Vector3(0, -1, 0);
const V = new Vector3();
const W = new Vector3();
const X = new Vector3();
const Q = new Quaternion();
const CAMQ = new Quaternion();
const M = new Matrix4();
const M2 = new Matrix4();
const O = new Object3D();
const PO = { u: 0, v: 0, y: 0, s: 0, disc: 0, spin: 0, tear: 0 };
const sgn = (x) => (x < 0 ? -1 : 1);
const bump = (a, b, t) => ease(a, a + (b - a) * 0.3, t) * (1 - ease(a + (b - a) * 0.6, b, t));

// the costume pups' poses (JoJo's): lean, pitch, yaw, left flipper, right flipper
const POSES = [
  [0.35, -0.2, 0.5, 1.25, -0.2],
  [-0.3, 0.25, -0.4, 0.3, 1.4],
  [0.0, -0.5, 0.0, 1.0, 1.0],
  [0.5, 0.1, -0.6, -0.6, 0.9],
  [-0.55, -0.3, 0.4, 1.5, 0.1],
  [0.15, 0.4, 0.2, 0.7, 0.7],
];
const XS = [-0.93, -0.66, -0.4, -0.14, 0.14, 0.4, 0.66, 0.93];
const ARC = [[-0.62, 0.3, 0.3], [-0.22, 0.46, 0.1], [0.2, 0.46, -0.1], [0.6, 0.3, -0.3]];
const pop = (a) => (a < 0 ? 0 : Math.min(1, a / 0.1) * (1 + 0.25 * Math.max(0, 1 - a / 0.22)));

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const pup = useRef(null);
  const costume = useRef(null);
  const paint = useRef(null);
  const island = useRef([]);
  const shake = useRef(new Vector3());
  const L = useMemo(() => layout(innerWidth / innerHeight), []);
  const m = useMemo(() => build(L, innerWidth, innerHeight), [L]);
  const parcels = useMemo(() => schedule(makeParcels(L)), [L]);
  const P = useMemo(() => {
    const at = (x, z) => floorY(L, x - L.Cx, z - L.Cz);
    const gx = L.Cx - 3.0 - 3.4 * L.lay;
    const gz = L.Cz - L.bF + 0.9;
    return {
      dv: [DV.x, at(DV.x, DV.z), DV.z],
      kc: [KC.x, at(KC.x, KC.z), KC.z],
      gate: [gx, at(gx, gz) + 0.05, gz],
      frag: [-3.3 - 2.5 * L.lay, 0.0, -12.5],
      turtle: [-2.3, at(-2.3, -3.9), -3.9],
      saddle: [L.Cx, at(L.Cx, L.Cz), L.Cz],
      ger: [GER.rise[0], at(GER.rise[0], GER.rise[1]), GER.rise[1]],
      gerStand: [GER.stand[0], at(GER.stand[0], GER.stand[1]), GER.stand[1]],
    };
  }, [L]);

  // the pup: its fresco twin first (so the costume is left out of it), then the Giorno costume on its own groups
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pup.current = p;
    paint.current = p?.root ? pupFresco(p.root) : null;
    if (p?.head && p.rear) {
      costume.current = giorno(p, m.fres, m.gold);
      p.head.add(costume.current.hair);
      p.rear.add(costume.current.jacket);
    }
    return () => {
      costume.current?.dispose();
      costume.current = null;
      paint.current?.dispose();
      paint.current = null;
      pup.current = null;
      m.dispose();
    };
  }, [scene, m]);

  // impacts shake the whole frame two drawings each: the world and the pup together (after Seal.jsx places it)
  // a skip clears the arrival: nothing of the scene draws for the frame before this unmounts
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      m.banner.mesh.visible = false;
      m.hud.visible = false;
      paint.current?.set(false);
      if (costume.current) costume.current.hair.visible = costume.current.jacket.visible = false;
      return;
    }
    if (p?.root && mode === "full") p.root.position.add(shake.current);
  }, -0.5);

  // the canted lens: a few degrees of roll about the view axis, after CameraRig has aimed it; then the gold
  // that lives in the lens's own frame follows it
  useFrame((state) => {
    if (!live.arrival.id || mode !== "full") return;
    const t = state.clock.elapsedTime - live.arrival.start;
    state.camera.rotateZ(0.06 * viewAt(tl, t));
    m.hud.position.copy(state.camera.position);
    m.hud.quaternion.copy(state.camera.quaternion);
  });

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    const cam = state.camera;
    const u = m.fres.uniforms;
    // THE BANNER: unfurls the instant the scene starts, rolls up into the cinema bar (static with reduced motion)
    m.banner.mesh.visible = full ? t < 40 : true;
    m.banner.mat.uniforms.uU.value = full ? unfurlAt(t) : 1;
    m.banner.mat.uniforms.uT.value = t;
    m.banner.setRect();
    const c = costume.current;
    g.visible = full;
    m.hud.visible = full;
    if (!full) {
      if (c) c.hair.visible = c.jacket.visible = false;
      paint.current?.set(false);
      shake.current.set(0, 0, 0);
      return;
    }
    const F = Math.floor(t * 12); // the drawing
    const odd = F % 2 ? 1 : -1;
    const over = t >= T.island;

    // ---- the rig: the pup at the origin; the world swells out of it with the stage, then holds
    const amp = (t >= T.lastBlow && t < T.lastBlow + 0.17 ? 0.1 : 0) + (t >= T.jump && t < T.jump + 0.17 ? 0.05 : 0);
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.y = 0;
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    m.sky.visible = r > 0.02 && !over;
    m.sky.position.set(0, CORE_Y, 0);
    m.sky.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    m.world.visible = inside && !over;

    // ---- the fresco's uniforms: the erasure, the gold wipe, the return to zero
    u.uTime.value = t;
    u.uArC.value.set(s.x + L.Cx, s.z + L.Cz);
    u.uAB.value.set(L.A, L.B);
    u.uBay.value = m.ringN;
    u.uBreak.value.set(L.phi, BREAK.half);
    u.uErase.value = ease(T.erase[0], T.erase[1], t);
    u.uGild.value = t < T.wipe[0] ? -1 : t >= T.wipe[1] ? 5 : lerp(0, 1.5, ease(T.wipe[0], T.wipe[1], t));
    u.uZero.value = t < T.zero[0] ? -1 : t >= T.zero[1] ? 5 : lerp(0, 1.6, ease(T.zero[0], T.zero[1], t));
    u.uWipeDir.value.set(s.x + P.ger[0], P.ger[1] + 2.4, s.z + P.ger[2]).sub(cam.position).normalize();
    u.uZeroDir.value.set(s.x + P.saddle[0], P.saddle[1] + 0.6, s.z + P.saddle[2]).sub(cam.position).normalize();

    // ---- the pup: Giorno. The fresco takes it with the world; the zero wipe gives it back its colours
    W.set(s.x, 0.9, s.z).sub(cam.position).normalize();
    const zeroPup = u.uZero.value > Math.acos(Math.max(-1, Math.min(1, W.dot(u.uZeroDir.value))));
    const looks = (inside || t > tl.bloom[1]) && !over && !zeroPup;
    paint.current?.set(looks, ease(T.rise[0], T.rise[0] + 0.5, t) * (1 - ease(T.wipe[1], T.wipe[1] + 1.5, t)));
    if (c) {
      const k = smooth(T.costume[0], T.costume[1], t);
      const pp = k * (1 + 0.16 * Math.sin(Math.PI * Math.min(1, Math.max(0, t - T.costume[0]) / 0.5)));
      c.hair.visible = c.jacket.visible = k > 0.01 && looks;
      c.hair.scale.setScalar(Math.max(pp, 0.01));
      c.jacket.scale.setScalar(Math.max(0.7 + 0.3 * pp, 0.01));
      c.braid.rotation.x = 0.1 * Math.sin(t * 5.2) + 0.12 * ease(T.barrage[0], T.barrage[0] + 0.2, t) * Math.sin(F * 1.7);
      c.braid.rotation.z = 0.08 * Math.sin(t * 3.7);
    }
    // the pup's poses
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.4, 1.8, t));
    live.pose.crouch = bump(T.jump - 0.1, T.jump + 0.7, t) * 0.5;
    live.pose.fist = Math.max(ease(T.pierce, T.pierce + 0.2, t) * (1 - ease(T.turn[0], T.turn[0] + 0.3, t)), ease(12.7, 13.0, t) * (1 - ease(T.zero[0], T.zero[0] + 0.5, t)));
    live.pose.spin = 0.5 * ease(T.turn[0], T.turn[1], t) + 0.5 * ease(12.0, 12.5, t);
    live.pose.point = bump(T.lastBlow - 0.2, T.lastBlow + 0.6, t);

    // ---- the pools: they ripple, and ring in gold when a clear parcel settles
    m.pools.forEach((pl) => {
      const side = pl.s;
      pl.mesh.position.set(L.Cx + side * L.poolX, poolLevel(L, side), L.Cz + L.poolV);
      pl.rim.position.copy(pl.mesh.position);
      pl.mat.uniforms.uTime.value = t;
      let pulse = 0;
      for (const p of parcels) if (!p.band && p.side === side && t >= p.ring && t < p.ring + 0.9) pulse = Math.max(pulse, ease(0, 0.9, t - p.ring));
      pl.mat.uniforms.uPulse.value = pulse;
    });

    // ---- the gate and its beacon
    const gate = gateAt(parcels, t);
    const bea = beaconAt(parcels, t);
    m.gate.position.set(P.gate[0], P.gate[1], P.gate[2]);
    m.bars.position.y = 0.04 + 2.5 * gate;
    m.bars.scale.x = 1.28;
    m.bulbMat.color.setRGB(0.3 + 0.7 * bea, 0.13 + 0.28 * bea, 0.12 + 0.25 * bea);
    m.bulb.scale.setScalar(0.8 + 0.4 * bea);

    // ---- the ruined arcade the witnesses stand in, Mista, Trish, the turtle with the key
    m.fragGroup.position.set(P.frag[0], P.frag[1], P.frag[2]);
    m.fragGroup.rotation.y = 0.2;
    const fy = P.frag[1] + 3.72;
    m.mista.g.position.set(P.frag[0] - 1.95 * Math.cos(0.2), fy, P.frag[2] + 1.95 * Math.sin(0.2));
    m.mista.g.rotation.y = 0.45;
    m.mista.hatPivot.rotation.z = 0.04 * Math.sin(t * 2.3) + 0.1 * Math.max(0, Math.sin(t * 0.9 + 1)) ** 3;
    m.mista.brim.rotation.z = 0.12 * Math.max(0, Math.sin(t * 1.7)) ** 2;
    m.trish.position.set(P.frag[0] - 1.25 * Math.cos(0.2), fy, P.frag[2] + 1.25 * Math.sin(0.2));
    m.trish.rotation.set(0, 0.3, 0.018 * Math.sin(t * 1.9));
    m.turtle.g.position.set(P.turtle[0], P.turtle[1], P.turtle[2]);
    m.turtle.g.rotation.y = 0.55;
    const glint = Math.max(0, Math.sin(t * 3.1)) ** 8;
    m.turtle.key.scale.setScalar(0.9 + 0.35 * glint);
    m.turtle.key.rotation.y = t * 0.8;
    m.turtle.figure.position.y = 1.0 + 0.06 * Math.sin(t * 1.6);
    m.turtle.figure.material.opacity = 0.4 + 0.22 * Math.sin(t * 2.2);

    // ---- DIAVOLO and KING CRIMSON
    const dv = m.dv;
    const blow = t >= T.barrage[0] && t < T.lastBlow ? 1 : 0;
    const launch = ease(T.lastBlow, T.lastBlow + 0.55, t);
    const saddle = P.saddle;
    // the endless loop: he slides toward one pool, then the other, and never arrives
    const lt = t - T.loop;
    const ph = lt / 2.3;
    const dir = Math.floor(ph) % 2 ? -1 : 1;
    const fr = ph - Math.floor(ph);
    const slide = lt > 0 ? dir * (L.poolX - 1.2) * Math.sin(Math.PI * Math.min(1, fr / 0.92)) ** 1.4 : 0;
    let dx = P.dv[0] + blow * 0.12 * odd * (F % 3 === 0 ? 1 : 0.4);
    let dz = P.dv[2] - blow * 0.1 * (F % 2);
    let dy = P.dv[1];
    let pitch = 0;
    if (t >= T.lastBlow) {
      dx = lerp(P.dv[0], saddle[0] + slide, launch);
      dz = lerp(P.dv[2], saddle[2], launch);
      dy = lerp(P.dv[1], saddle[1], launch) + 2.6 * Math.sin(Math.PI * launch) * (1 - launch * 0.3) + 0.25 * launch;
      pitch = -1.5 * launch;
    }
    dv.g.position.set(dx, dy, dz);
    dv.g.scale.setScalar(DV.s);
    dv.g.rotation.set(pitch, t >= T.lastBlow ? lerp(DV.yaw, sgn(dir) * 1.2, launch) : DV.yaw, 0, "YXZ");
    // the hair whips; the right arm flicks the coin
    dv.hairPivot.rotation.set(0.07 * Math.sin(t * 4.1) + (blow ? 0.28 * Math.sin(F * 2.1) : 0), 0.05 * Math.sin(t * 2.7), 0.06 * Math.sin(t * 3.3 + 1));
    const flick = bump(T.flick - 0.05, T.flick + 0.35, t);
    const rewindCoin = bump(T.rewind + 0.2, T.rewind + 1.3, t);
    dv.armPivot.rotation.set(-1.7 * Math.max(flick, rewindCoin) + (blow ? -0.7 * (F % 2) : 0), 0, -0.12 * (1 - flick));
    // King Crimson rises behind him, and is returned to zero (sinks) when the Requiem comes
    const kcK = ease(T.kc[0], T.kc[1], t) * (1 - ease(T.rewind + 0.1, T.rewind + 0.9, t));
    m.kc.visible = kcK > 0.01;
    m.kc.position.set(P.kc[0], P.kc[1] - 0.3 * (1 - kcK), P.kc[2]);
    m.kc.scale.set(KC.s * (0.7 + 0.3 * kcK), KC.s * Math.max(kcK, 0.01), KC.s * (0.7 + 0.3 * kcK));
    m.kc.rotation.y = DV.yaw * 0.9 + 0.03 * Math.sin(t * 1.3);

    // ---- the parcels, their discs, the sketch afterimages
    let sk = 0;
    const sketch = (x, y, z, sc) => put(m.sketch, sk++, x, y + 0.03, z, sc);
    parcels.forEach((p, i) => {
      parcelAt(L, p, t, PO);
      const px = L.Cx + PO.u;
      const pz = L.Cz + PO.v;
      if (PO.s >= 1 && PO.s <= 5) {
        if (PO.s === 5) {
          // torn: two halves toward both pools at once
          const k = PO.tear;
          const sc = 0.62 * (1 - k * 0.8);
          put(m.parcels, i, px - k * 1.5, PO.y, pz - k * 0.3, sc, sc, sc, PO.spin, 0, 0);
          put(m.parcels, N + i, px + k * 1.5, PO.y, pz + k * 0.3, sc, sc, sc, -PO.spin, 0, 0);
        } else {
          put(m.parcels, i, px, PO.y, pz, 1, 1, 1, PO.spin, 0, 0.3 * i);
          hide(m.parcels, N + i);
        }
        // the rounding disc: pale coral under it while it flows or stalls
        if (PO.s === 1 || PO.s === 4 || PO.s === 5) put(m.discs, i, px, floorY(L, PO.u, PO.v) + 0.04, pz, PO.disc, 1, PO.disc);
        else hide(m.discs, i);
      } else {
        hide(m.parcels, i);
        hide(m.parcels, N + i);
        hide(m.discs, i);
      }
      // the red sketch: its start and its end, drawn while time is erased
      if (t >= p.jump && t < p.back + 0.8 && F % 6 !== 5) {
        sketch(L.Cx + p.u0, floorY(L, p.u0, p.v0), L.Cz + p.v0, 1);
        sketch(L.Cx + p.ru, poolLevel(L, p.side), L.Cz + p.rv, 1);
      }
    });
    // the coin: heads at once on the ground (afterimages at hand and ground); rewound up into his hand, then split in two
    const hand = X.set(dv.dv.hand[0], dv.dv.hand[1], dv.dv.hand[2]).multiplyScalar(DV.s);
    const ca = Math.cos(DV.yaw);
    const sa = Math.sin(DV.yaw);
    const hx = P.dv[0] + hand.x * ca + hand.z * sa;
    const hz = P.dv[2] - hand.x * sa + hand.z * ca;
    const hy = P.dv[1] + hand.y;
    const groundX = P.dv[0] + 0.5;
    const groundZ = P.dv[2] + 0.9;
    const groundY = floorY(L, groundX - L.Cx, groundZ - L.Cz) + 0.03;
    const flipUp = t >= T.rewind + 0.2 && t < T.rewind + 1.3;
    m.coin.visible = t >= T.flick + 0.2 && t < T.rewind + 1.3;
    if (m.coin.visible) {
      if (flipUp) {
        const k = ease(T.rewind + 0.2, T.rewind + 1.3, t);
        m.coin.position.set(lerp(groundX, hx, k), lerp(groundY, hy, k) + 1.4 * Math.sin(Math.PI * k), lerp(groundZ, hz, k));
        m.coin.rotation.set(k * 18, 0, 0);
      } else {
        m.coin.position.set(groundX, groundY, groundZ);
        m.coin.rotation.set(0, 0, 0);
      }
    }
    // the halves, in his hand, sliding apart and fading
    const tearC = t - (T.rewind + 1.3);
    m.halves.forEach((h, k) => {
      h.visible = tearC >= 0 && tearC < 0.9;
      if (h.visible) {
        const e = ease(0, 0.8, tearC);
        h.position.set(hx + (k ? 1 : -1) * 0.35 * e, hy - 0.05 - 0.2 * e, hz);
        h.rotation.set(0.5 * e, 0, (k ? 1 : -1) * e);
        h.scale.setScalar(1 - 0.5 * ease(0.5, 0.9, tearC));
      }
    });
    if (t >= T.flick + 0.2 && t < T.rewind + 0.2 && F % 6 !== 4) {
      sketch(hx, hy, hz, 0.8);
      sketch(groundX, groundY - 0.03, groundZ, 0.8);
    }
    for (let i = sk; i < N * 2 + 4; i++) hide(m.sketch, i);
    for (const x of [m.parcels, m.discs, m.sketch]) x.instanceMatrix.needsUpdate = true;

    // ---- the gold arrow, the slit in the air, GOLD EXPERIENCE REQUIEM
    const arrowOn = t >= T.arrow[0] && t < T.rise[1] + 0.3;
    m.arrow.visible = arrowOn;
    if (arrowOn) {
      const k = ease(T.arrow[0], T.arrow[1], t);
      V.set(-9.5, 3.6, 3.2);
      W.set(SLIT[0] - 0.7, SLIT[1] + 0.1, SLIT[2] + 0.25);
      m.arrow.position.lerpVectors(V, W, k);
      m.arrow.quaternion.setFromUnitVectors(Z, X.subVectors(W, V).normalize());
      m.arrow.scale.setScalar(1.15 * (1 - 0.7 * ease(T.rise[0], T.rise[1] + 0.3, t)));
    }
    const slitK = ease(T.pierce, T.pierce + 0.18, t) * (1 - ease(T.rise[1] - 0.1, T.rise[1] + 0.35, t));
    m.slit.visible = slitK > 0.01;
    m.slit.position.set(SLIT[0], SLIT[1], SLIT[2]);
    m.slit.scale.set(0.6 + 0.4 * slitK, slitK, 1);
    m.slit.quaternion.copy(cam.quaternion);

    const ger = m.ger;
    const riseK = ease(T.rise[0], T.rise[1], t);
    const stepK = ease(T.step[0], T.step[1], t);
    ger.g.visible = riseK > 0.01;
    const gx = lerp(P.ger[0], P.gerStand[0], stepK);
    const gz = lerp(P.ger[2], P.gerStand[2], stepK);
    const gy = lerp(P.ger[1], P.gerStand[1], stepK) - 4 * (1 - riseK) + 0.06 * Math.sin(t * 2.2);
    const gyaw = lerp(0.12, Math.atan2(P.dv[0] - gx, P.dv[2] - gz), ease(T.step[0] - 0.1, T.step[1], t));
    ger.g.position.set(gx, gy, gz);
    ger.g.scale.setScalar(GER.s * (0.85 + 0.15 * riseK));
    ger.g.rotation.y = gyaw;
    ger.gem.material.color.setRGB(1, 0.5 + 0.2 * Math.sin(t * 4), 0.62);
    // the arms: calm, then the barrage (each aimed at Diavolo's chest, on twos)
    const barrage = t >= T.barrage[0] && t < T.barrage[1];
    const cy = Math.cos(gyaw);
    const sy = Math.sin(gyaw);
    for (const [arm, side] of [[ger.armL, -1], [ger.armR, 1]]) {
      if (barrage && (F + (side > 0 ? 1 : 0)) % 2 === 0) {
        W.set(P.dv[0] - (gx + side * 0.64 * GER.s * cy), P.dv[1] + 1.5 - (gy + 2.82 * GER.s), P.dv[2] - (gz - side * 0.64 * GER.s * sy));
        W.applyAxisAngle(UP, -gyaw).normalize();
        arm.quaternion.setFromUnitVectors(NEG_Y, W);
      } else {
        arm.rotation.set(0.12 + 0.05 * Math.sin(t * 1.9 + side), 0, side * (0.05 + 0.03 * Math.sin(t * 1.4)));
      }
    }
    // the fists: afterimages along the line to Diavolo, on twos
    V.set(gx, gy + 2.82 * GER.s, gz);
    W.set(P.dv[0], P.dv[1] + 1.5, P.dv[2]).sub(V);
    const span = W.length();
    W.normalize();
    Q.setFromUnitVectors(Z, W);
    for (let j = 0; j < COUNTS.fists; j++) {
      if (!barrage) {
        hide(m.fists, j);
        continue;
      }
      const e = (F * 0.137 + j * 0.2139 + hash(j, 3)) % 1;
      const lat = ((j % 2) * 2 - 1) * (0.5 + 0.35 * hash(j, 4)) * GER.s + 0.22 * Math.sin(F * 1.3 + j);
      const run = 1.3 + e * (span - 1.8);
      const sc = (0.75 + 0.5 * e) * GER.s * 1.1;
      putQ(m.fists, j, V.x + W.x * run + lat * cy, V.y + W.y * run + 0.25 * Math.sin(F * 0.9 + j * 2.1), V.z + W.z * run - lat * sy, sc, sc, sc, Q);
    }
    m.fists.instanceMatrix.needsUpdate = true;
    // hit sparks on Diavolo: white four-point stars, popped for one drawing
    for (let j = 0; j < COUNTS.sparks; j++) {
      if (!(barrage && (F + j) % 3 !== 0)) {
        hide(m.sparks, j);
        hide(m.sparks, j + COUNTS.sparks);
        continue;
      }
      const a = hash(F * 8 + j, 5) * 6.28;
      const rr = 0.2 + 0.7 * hash(F * 8 + j, 6);
      const sc = 0.34 + 0.4 * hash(F * 8 + j, 7);
      const sx = P.dv[0] + Math.cos(a) * rr;
      const syy = P.dv[1] + 1.2 + Math.sin(a) * rr * 1.2;
      putQ(m.sparks, j, sx, syy, P.dv[2] + 0.5, sc, sc, sc, cam.quaternion, a);
      putQ(m.sparks, j + COUNTS.sparks, sx, syy, P.dv[2] + 0.5, sc, sc, sc, cam.quaternion, a + 1.57);
    }
    m.sparks.instanceMatrix.needsUpdate = true;

    // ---- particles: flakes of plaster, bubbles of light, the golden wind's petals, flowers, dust
    cam.getWorldQuaternion(CAMQ);
    for (let i = 0; i < COUNTS.flakes; i++) {
      const born = T.erase[0] - 0.1 + hash(i, 1) * 1.7;
      const life = 2.6 + 2.2 * hash(i, 2);
      const age = t - born;
      if (age < 0 || age > life) {
        hide(m.flakes, i);
        continue;
      }
      const cls = i % 3;
      // where it came off: the arches, the sky, the floor
      let x0;
      let y0;
      let z0;
      let sc;
      if (cls === 0) {
        x0 = -14 + 30 * hash(i, 3);
        y0 = 1 + 10 * hash(i, 4);
        z0 = L.Cz - L.B * 0.9 + 3 * hash(i, 5);
        sc = 0.5;
      } else if (cls === 1) {
        x0 = -40 + 80 * hash(i, 3);
        y0 = 10 + 22 * hash(i, 4);
        z0 = -70 - 25 * hash(i, 5);
        sc = 2.2;
      } else {
        x0 = L.Cx - L.aF * 0.8 + 1.6 * L.aF * hash(i, 3);
        y0 = 0.4 + 3 * hash(i, 4);
        z0 = L.Cz - 9 + 11 * hash(i, 5);
        sc = 0.32;
      }
      const grow = ease(0, 0.2, age) * (1 - ease(life - 0.5, life, age)) * sc;
      put(m.flakes, i, x0 + 0.5 * Math.sin(age * 1.7 + i), y0 - 0.9 * age - 0.35 * age * age * (cls === 1 ? 2.5 : 1), z0 + 0.3 * Math.cos(age * 1.3 + i), grow, grow, grow, age * (1 + hash(i, 6)), age * 1.4, age * 0.7);
    }
    m.flakes.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < COUNTS.bubbles; i++) {
      const a = (t - 3.9 - hash(i, 1) * 2.4) / 5;
      if (!(a > 0 && a < 1 && t < T.wipe[1] + 0.5)) {
        hide(m.bubbles, i);
        continue;
      }
      const sc = (0.2 + 0.3 * hash(i, 2)) * Math.sin(Math.PI * a);
      putQ(m.bubbles, i, L.Cx - 9 + 18 * hash(i, 3) + 0.4 * Math.sin(a * 9 + i), 0.5 + 6 * a * (0.5 + hash(i, 4)), L.Cz - 14 + 12 * hash(i, 5), sc, sc, sc, CAMQ);
    }
    m.bubbles.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < COUNTS.petals; i++) {
      const life = 4.5 + 2 * hash(i, 1);
      const age = t - (T.wipe[0] - 0.1 + hash(i, 2) * 1.2);
      if (!(age > 0 && t < T.zero[0] + 0.4)) {
        hide(m.petals, i);
        continue;
      }
      const a = (age % life) / life;
      const sc = (0.2 + 0.18 * hash(i, 5)) * Math.min(1, a * 8) * (1 - ease(0.88, 1, a));
      putQ(m.petals, i, L.Cx - 18 + 38 * a, 1 + 5 * hash(i, 3) + 1.2 * Math.sin(a * 11 + i) + 3.6 * a, L.Cz - 16 + 14 * hash(i, 4) + 1.2 * Math.cos(a * 7 + i), sc, sc, sc, CAMQ, age * (2 + hash(i, 6) * 3));
    }
    m.petals.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < COUNTS.flowers; i++) {
      const a = t - (T.barrage[0] + 0.1 + (i / COUNTS.flowers) * 1.6);
      if (a < 0 || t > T.zero[0] + 0.3) {
        hide(m.flowers, i);
        continue;
      }
      const near = i < 20;
      const ang = hash(i, 1) * 6.28;
      const rad = near ? 0.5 + 1.8 * hash(i, 2) : 1 + 6 * hash(i, 2);
      const fx = near ? P.dv[0] + Math.cos(ang) * rad : lerp(P.gerStand[0] + 1, P.dv[0], hash(i, 3)) + Math.cos(ang) * 0.7;
      const fz = near ? P.dv[2] + Math.sin(ang) * rad * 0.7 : lerp(P.gerStand[2], P.dv[2], hash(i, 3)) + Math.sin(ang) * 0.7;
      const sc = 0.9 * ease(0, 0.4, a) * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, a / 0.6))) * (0.7 + 0.5 * hash(i, 4));
      put(m.flowers, i, fx, floorY(L, fx - L.Cx, fz - L.Cz), fz, sc, sc, sc, 0, Math.atan2(cam.position.x - (s.x + fx), cam.position.z - (s.z + fz)), 0.08 * Math.sin(t * 2 + i));
    }
    m.flowers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < COUNTS.dust; i++) {
      const life = 5 + 3 * hash(i, 1);
      const age = t - 1.3 - hash(i, 2) * life;
      if (age < 0 || t > T.zero[0] + 0.3) {
        hide(m.dust, i);
        continue;
      }
      const a = (age % life) / life;
      const dx = L.Cx - L.aF * 0.7 + 1.4 * L.aF * hash(i, 3) + 0.8 * a;
      const dz = L.Cz - 10 + 14 * hash(i, 4);
      const sc = (0.08 + 0.1 * hash(i, 5)) * Math.sin(Math.PI * a);
      putQ(m.dust, i, dx, floorY(L, dx - L.Cx, dz - L.Cz) + 0.1 + 2.4 * a, dz, sc, sc, sc, CAMQ, a * 3);
    }
    m.dust.instanceMatrix.needsUpdate = true;

    // ---- the screen-space gold: lettering, the costume pups, the To Be Continued arrow (laid in the lens's frame)
    const tanV = Math.tan((cam.fov * Math.PI) / 360);
    const asp = cam.aspect;
    const wsc = Math.min(asp, 1.7); // centred compositions keep their proportions on a tall screen
    const hudAt = (obj, nx, ny, nh, rot, k, edge = false) => {
      obj.visible = k > 0.001;
      obj.position.set(nx * tanV * HUD_D * (edge ? asp : wsc), ny * tanV * HUD_D, -HUD_D);
      obj.rotation.set(0, 0, rot);
      obj.scale.setScalar(Math.max(nh * tanV * HUD_D * k, 0.0001));
    };
    // DON! as the Requiem rises
    hudAt(m.don, 0.42 + 0.01 * odd, 0.4, 0.34, 0.1, t >= T.don && t < T.don + 1.2 ? pop(t - T.don) * (1 - ease(T.don + 0.9, T.don + 1.2, t)) : 0);
    // MUDA in a big arc across the upper middle, popping on twos
    const mu = t - T.barrage[0];
    m.muda.forEach((mesh, i) => {
      const on = mu >= i * 0.07 && t < T.lastBlow + 0.55;
      hudAt(mesh, ARC[i][0], ARC[i][1], 0.4, ARC[i][2], on ? pop(mu - i * 0.07) * (1 + 0.1 * (F % 2)) * (1 - ease(T.lastBlow + 0.3, T.lastBlow + 0.55, t)) : 0);
    });
    // TING at the first ring in each pool, "..." where the first refused parcel was
    m.ting.forEach((mesh, k) => {
      const side = k ? 1 : -1;
      let first = Infinity;
      for (const p of parcels) if (!p.band && p.side === side) first = Math.min(first, p.ring);
      const a = t - first;
      V.set(s.x + L.Cx + side * L.poolX, poolLevel(L, side) + 1.3, s.z + L.Cz + L.poolV).project(cam);
      hudAt(mesh, V.x * (asp / wsc), V.y, 0.22, side * -0.1, a >= 0 && a < 1.1 ? pop(a) * (1 - ease(0.8, 1.1, a)) : 0);
    });
    let firstTear = Infinity;
    for (const p of parcels) if (p.band) firstTear = Math.min(firstTear, p.tear);
    const da = t - firstTear - 0.4;
    V.set(s.x + saddle[0], saddle[1] + 1.1, s.z + saddle[2]).project(cam);
    hudAt(m.dots, V.x * (asp / wsc), V.y + 0.04, 0.12, 0, da >= 0 && t < T.zero[0] ? pop(da) : 0);
    // ゴゴゴ rising up both edges, a stroke at a time
    const gt = t - T.gogogo;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 3; i++) {
        const y = -0.62 + ((gt * 0.5 + i * 0.5 + side * 0.25) % 1.5);
        const on = gt > 0 && t < T.zero[0] + 0.3 && y < 0.82;
        hudAt(m.gogo[side][i], (side ? 1 : -1) * 0.93, y, 0.26, (side ? -1 : 1) * 0.12, on ? pop(gt - i * 0.1) * (1 + 0.06 * (F % 2)) : 0, true);
      }
    }
    // the eight costume pups on the bottom edge, posing on twos
    const pt = t - T.pups;
    m.pups.forEach((mesh, j) => {
      mesh.visible = pt > j * 0.05 && t < T.zero[0] + 0.3;
      if (!mesh.visible) {
        for (let k = 0; k < 2; k++) m.flips.setMatrixAt(j * 2 + k, M2.makeScale(0, 0, 0));
        return;
      }
      const pose = POSES[(Math.floor(t * 6) + j * 2) % POSES.length];
      const sc = 0.2 * tanV * HUD_D * Math.min(1, 0.5 + (pt - j * 0.05) * 4);
      const hop = Math.max(0, Math.sin(Math.floor(t * 6 + j) * 2.4)) * 0.03 * tanV * HUD_D;
      O.position.set(XS[j] * tanV * HUD_D * asp * 0.92, -0.77 * tanV * HUD_D + hop, -HUD_D);
      O.rotation.set(pose[1], pose[2], pose[0], "ZXY");
      O.scale.setScalar(sc);
      O.updateMatrix();
      mesh.matrix.copy(O.matrix);
      for (let k = 0; k < 2; k++) {
        const sd = k ? 1 : -1;
        M2.makeScale(sd, 1, 1).setPosition(sd * 0.27, 0.05, 0.22);
        M2.multiply(M.makeRotationZ(k ? pose[4] : pose[3]));
        M2.premultiply(O.matrix);
        m.flips.setMatrixAt(j * 2 + k, M2);
      }
    });
    m.flips.instanceMatrix.needsUpdate = true;
    // the To Be Continued arrow slides in from the left and settles where the credit card appears
    m.tbc.visible = t >= T.tbc[0] && t < tl.credit + 0.15;
    if (m.tbc.visible) {
      const kk = ease(T.tbc[0], T.tbc[1], t);
      m.tbc.position.set(lerp(-1.6, 0, kk) * tanV * HUD_D * wsc, -0.5 * tanV * HUD_D, -HUD_D);
      m.tbc.scale.setScalar(0.5 * tanV * HUD_D * (t >= tl.credit ? Math.max(0.001, 1 - (t - tl.credit) * 8) : 1));
    }

    // ---- WHY WE COME HOME: the gold un-paints the picture; under it, the island
    if (t > T.island && t < tl.collapse[0]) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.banner.mesh} />
      <primitive object={m.hud} />
      <group ref={rig} visible={false}>
        <primitive object={m.sky} />
        <primitive object={m.world} />
      </group>
    </>
  );
}
