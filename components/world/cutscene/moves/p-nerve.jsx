"use client";

// Nerve: Lelouch's GEASS. The mask-and-cape silhouette steps in with ONE
// glowing red pupil, and an invented winged-bird sigil in a ring (not the
// original mark) flares behind its head on line A. The pup is the performer:
// it fires the control at four hypothesis cards, three shatter, the fourth
// holds, and the pup holds it up to the lens on line B. Shape, colour and
// pose only. Card: lib/world/cutscene/cards/p-nerve.js.
// Cost: 4 cards, 1 beam, 1 flash, 1 shard mesh (36 instanced), cape x2,
// pupil, glow, sigil: about 12 draws, ~1.3k triangles.

import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, CircleGeometry, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, SRGBColorSpace, Shape, ShapeGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { figureAt, figureScale } from "../../../../lib/world/cutscene/timeline";
import { additive, fade, figureFrame, flat, glowMat, outK, ramp, rand, twos, useStageGroup } from "./g5/fx";

const RED = "#ff2638";
const CARDS_AT = [[-2.1, 1.6, -0.6], [-1.3, 1.78, -0.6], [-0.5, 1.6, -0.6], [0.3, 1.78, -0.6]];
const LIVE = 2; // the third hypothesis survives
const SHOTS = [4.0, 4.2, 4.4, 4.6];
const PUP_HAND = [-0.35, 0.85, 0.7]; // where the control leaves the pup
const HOLD = [-0.6, 1.05, 1.0]; // the live card, held up to the lens
const DEAD = [0, 1, 3];

const poly = (pts) => {
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return new ShapeGeometry(s);
};
function birdGeo() {
  const half = [[0.08, 0.12], [0.38, 0.34], [0.88, 0.46], [0.7, 0.3], [0.92, 0.16], [0.66, 0.06], [0.82, -0.1], [0.5, -0.06], [0.58, -0.24], [0.3, -0.14], [0.06, -0.1]];
  const body = poly([[0, 0.46], [0.09, 0.18], [0.05, -0.1], [0, -0.42], [-0.05, -0.1], [-0.09, 0.18]]);
  const parts = [poly(half), poly(half.map(([x, y]) => [-x, y]).reverse()), body, new RingGeometry(0.93, 1, 56)];
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function cardTexture(n) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 176;
  const x = c.getContext("2d");
  x.fillStyle = "#faf7ef";
  x.fillRect(0, 0, 128, 176);
  x.strokeStyle = "#1c1630";
  x.lineWidth = 6;
  x.strokeRect(4, 4, 120, 168);
  x.fillStyle = "#1c1630";
  x.font = "700 40px 'Shantell Sans', 'Segoe Print', cursive";
  x.fillText(`H${n}`, 18, 56);
  x.lineWidth = 5;
  x.lineCap = "round";
  for (const y of [86, 108, 130]) {
    x.beginPath();
    x.moveTo(18, y);
    x.quadraticCurveTo(56, y - 8, 110 - (y % 3) * 8, y + 2);
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function Nerve(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const k = useMemo(() => {
    const shardGeo = poly([[0, 0.14], [0.09, -0.08], [-0.1, -0.06]]);
    const shards = new InstancedMesh(shardGeo, flat("#faf7ef"), 36);
    shards.frustumCulled = false;
    return {
      cards: [1, 2, 3, 4].map((n) => new MeshBasicMaterial({ map: cardTexture(n), toneMapped: false, fog: false, side: DoubleSide, transparent: true })),
      cardGeo: new PlaneGeometry(0.62, 0.84),
      shards,
      wing: birdGeo(),
      sigilMat: additive(RED),
      pupil: flat(RED),
      pupilGeo: poly([[0, 0.07], [0.032, 0], [0, -0.07], [-0.032, 0]]),
      glow: glowMat(RED, 1.6),
      glowGeo: new CircleGeometry(0.5, 24),
      capeInk: flat(p.ink),
      capeRim: flat(p.rim),
      cape: new PlaneGeometry(1, 1, 4, 10),
      capeBack: new PlaneGeometry(1, 1, 4, 10),
      beamGeo: new BoxGeometry(1, 1, 1),
      beam: additive(p.accent),
      flashGeo: new RingGeometry(0.6, 1, 28),
      flash: additive("#ffffff"),
      dummy: new Object3D(),
    };
  }, [p]);

  const refs = useRef({ cards: [] });
  const shardState = useMemo(() => {
    const r = rand(11);
    return Array.from({ length: 36 }, (_, i) => ({ card: DEAD[Math.floor(i / 12)], vx: (r() - 0.5) * 3.2, vy: r() * 2.4 + 0.4, vz: (r() - 0.5) * 2, spin: (r() - 0.5) * 14, s: 0.3 + r() * 0.35, ox: (r() - 0.5) * 0.5, oy: (r() - 0.5) * 0.7 }));
  }, []);

  useEffect(() => () => k.cards.forEach((m) => m.map.dispose()), [k]);

  // the pup: points the control at the row, recoils on each shot, then holds the live card up
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const aim = ramp(3.3, 3.9, t) * (1 - ramp(4.75, 5.15, t));
    live.pose.point = aim * o;
    live.pose.fist = ramp(4.85, 5.3, t) * o;
    const kick = SHOTS.reduce((a, s) => Math.max(a, t >= s && t < s + 0.16 ? 1 - (t - s) / 0.16 : 0), 0);
    live.pose.crouch = 0.35 * kick * aim;
  });

  const root = useStageGroup(cut, (t, state) => {
    const r = refs.current;
    const tt = twos(t);
    const o = outK(tl, t);
    const D = k.dummy;
    // --- the speaker's add-ons: cape, red pupil, sigil
    const ff = figureFrame(t, tl, mode);
    const at = figureAt(card);
    r.fig.visible = Boolean(ff);
    if (ff) {
      const sc = figureScale(card);
      r.fig.position.set(at[0], at[1], at[2]);
      r.fig.scale.set(sc * ff[0], sc * ff[1], sc * ff[0]);
      r.fig.rotation.y = -0.42;
      for (const [g, grow] of [[k.cape, 0], [k.capeBack, 0.03]]) {
        const a = g.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const u = ((i % 5) / 4) - 0.5;
          const v = Math.floor(i / 5) / 10;
          const hw = 0.3 + 0.5 * v ** 1.15 + grow;
          const jag = v > 0.99 ? (i % 2 ? 0.1 : 0) : 0;
          a.setXYZ(i, u * 2 * hw + Math.sin(tt * 2.6 + v * 3) * 0.07 * v, 1.64 - v * 1.56 - jag + grow * 0.3, -0.12 - 0.26 * v - grow * 0.4 + Math.sin(tt * 2.2 + v * 2) * 0.06 * v);
        }
        a.needsUpdate = true;
      }
      const wake = ramp(tl.lineA, tl.lineA + 0.25, t);
      r.pupil.visible = wake > 0;
      r.glow.visible = wake > 0;
      r.glow.scale.setScalar(0.2 + 0.2 * ramp(tl.lineA, tl.lineA + 0.5, t) + 0.025 * Math.sin(tt * 9));
      k.glow.uniforms.uA.value = wake * (0.45 + 0.15 * Math.sin(tt * 9));
      // the sigil: a pop on the flare, then holds and flaps on twos
      const f = t - (tl.lineA + 0.05);
      const pop = f < 0 ? 0 : f < 0.16 ? 1.5 * (f / 0.16) : 1.5 - 0.5 * ramp(0.16, 0.5, f);
      r.sigil.scale.set(0.56 * pop * (1 + 0.035 * Math.sin(tt * 7)), 0.56 * pop, 1);
      r.sigil.rotation.z = 0.02 * Math.sin(tt * 3);
      r.sigil.visible = pop > 0.01;
      fade(k.sigilMat, f < 0 ? 0 : (0.55 + 0.45 * ramp(0, 0.2, f)) * (1 - 0.5 * ramp(tl.lineB + 0.4, tl.lineB + 1.2, t)));
    }
    // --- the four hypotheses
    CARDS_AT.forEach((c, i) => {
      const m = r.cards[i];
      const rise = ramp(3.0 + i * 0.08, 3.3 + i * 0.08, t);
      m.visible = rise > 0 && !(i !== LIVE && t >= SHOTS[i]);
      const bob = Math.sin(tt * 2.3 + i * 1.7) * 0.05;
      let x = c[0];
      let y = c[1] + bob - (1 - rise) * 0.9;
      let z = c[2];
      let sc = rise;
      let ry = 0.25;
      let rz = i % 2 ? 0.07 : -0.06;
      if (i === LIVE) {
        const j = ramp(4.65, 5.2, t);
        x += (HOLD[0] - x) * j;
        y += (HOLD[1] - y + bob * 0.5) * j;
        z += (HOLD[2] - z) * j;
        sc *= 1 + 0.15 * j;
        ry = 0.25 - 0.55 * j;
        rz *= 1 - j;
        const hit = t - SHOTS[i]; // the control bounces off it: a shudder, then still
        if (hit > 0 && hit < 0.3) x += Math.sin(tt * 90) * 0.05 * (1 - hit / 0.3);
      }
      m.position.set(x, y, z);
      m.scale.setScalar(Math.max(sc * o, 0.0001));
      m.rotation.set(0, ry, rz);
    });
    // --- the beam: one shot at a time, from the pup's flipper to the card
    const shot = SHOTS.findIndex((s) => t >= s && t < s + 0.14);
    r.beam.visible = shot >= 0;
    if (shot >= 0) {
      const c = CARDS_AT[shot];
      const dx = c[0] - PUP_HAND[0];
      const dy = c[1] - PUP_HAND[1];
      const dz = c[2] - PUP_HAND[2];
      r.beam.position.set(PUP_HAND[0] + dx / 2, PUP_HAND[1] + dy / 2, PUP_HAND[2] + dz / 2);
      r.beam.lookAt(c[0] + live.seal.x, c[1], c[2] + live.seal.z);
      r.beam.scale.set(0.05 + 0.04 * (Math.floor(t * 24) % 2), 0.05, Math.hypot(dx, dy, dz));
    }
    // --- the impact flash and the shards
    let hi = -1;
    SHOTS.forEach((s, i) => {
      if (t - s >= 0 && t - s < 0.4) hi = i;
    });
    r.flash.visible = hi >= 0;
    if (hi >= 0) {
      const c = CARDS_AT[hi];
      const a = t - SHOTS[hi];
      r.flash.position.set(c[0], c[1], c[2] + 0.1);
      r.flash.scale.setScalar(0.15 + 0.7 * ramp(0, 0.35, a));
      r.flash.quaternion.copy(state.camera.quaternion);
      fade(k.flash, 0.7 * (1 - ramp(0, 0.4, a)));
    }
    shardState.forEach((s, i) => {
      const a = t - SHOTS[s.card];
      if (a < 0 || a > 1.4) {
        D.scale.setScalar(0);
        D.position.set(0, -9, 0);
      } else {
        const aa = Math.floor(a * 12) / 12;
        const c = CARDS_AT[s.card];
        D.position.set(c[0] + s.ox + s.vx * aa, c[1] + s.oy + s.vy * aa - 4.2 * aa * aa, c[2] + s.vz * aa);
        D.rotation.set(0, 0, s.spin * aa);
        D.scale.setScalar(s.s * (1 - ramp(0.8, 1.4, a)));
      }
      D.updateMatrix();
      k.shards.setMatrixAt(i, D.matrix);
    });
    k.shards.instanceMatrix.needsUpdate = true;
  });

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={root} visible={false}>
        <group ref={set("fig")}>
          <mesh ref={set("capeBack")} geometry={k.capeBack} material={k.capeRim} />
          <mesh ref={set("cape")} geometry={k.cape} material={k.capeInk} />
          <mesh ref={set("glow")} geometry={k.glowGeo} material={k.glow} position={[0.035, 1.92, 0.23]} />
          <mesh ref={set("pupil")} geometry={k.pupilGeo} material={k.pupil} position={[0.035, 1.92, 0.215]} />
          <mesh ref={set("sigil")} geometry={k.wing} material={k.sigilMat} position={[0, 1.95, -0.4]} />
        </group>
        {CARDS_AT.map((_, i) => (
          <mesh key={i} ref={(m) => (refs.current.cards[i] = m)} geometry={k.cardGeo} material={k.cards[i]} />
        ))}
        <mesh ref={set("beam")} geometry={k.beamGeo} material={k.beam} visible={false} />
        <mesh ref={set("flash")} geometry={k.flashGeo} material={k.flash} visible={false} />
        <primitive object={k.shards} />
      </group>
    </>
  );
}
