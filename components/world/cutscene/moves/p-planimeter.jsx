"use client";

// Planimeter: Yoda. The small ear-and-cane silhouette says "Do. Or do not."
// and the pup, both flippers up, levitates the polygon with the FORCE: it
// lifts off the snow, turns, trembles as the pup strains to close the gap
// (two sweat drops) and cannot; the gap springs back open, amber. Then line B
// rains the certificate sheet down round the pup: 495 closed stamps and 33
// that stay open. Shape, colour and pose only. Card: cards/p-planimeter.js.
// Cost: polygon (ribbon, closing stroke, fill, gap glow), force waves and
// motes (instanced), sweat (instanced), 528 stamps in two instanced meshes:
// about 10 draws, ~2.5k triangles.

import { useMemo, useRef } from "react";
import { CircleGeometry, IcosahedronGeometry, InstancedMesh, Object3D, OctahedronGeometry, PlaneGeometry, RingGeometry, Shape, ShapeGeometry } from "three";
import { Speaker, Stage, useCutFrame } from "../kit";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { live } from "../../../../lib/world/store";
import { additive, flat, glowMat, outK, ramp, rand, ribbon, twos, useStageGroup } from "./g5/fx";

const DESK = [-1.75, 1.55, -0.6]; // where the polygon hangs
const HAND = [-0.45, 0.95, 0.6];
const CP = [-0.8, 1.95, -1.2]; // on a portrait screen it hangs higher, nearer the pup, smaller
const SP = 0.62;
const LIFT = [3.4, 4.3];
const STRAIN = [4.3, 4.85];
const RAIN = 5.05;
const COLS = 33;
const ROWS = 16;
const GREEN = "#8ff0bf";
const AMBER = "#ffb43a";

const N = 9;
const POLY = Array.from({ length: N }, (_, i) => {
  const th = (i * Math.PI * 2) / N + 0.3;
  const r = 0.7 + 0.18 * Math.sin(i * 2.1 + 0.5);
  return [r * Math.cos(th), r * Math.sin(th)];
});

export default function Planimeter(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({});
  const k = useMemo(() => {
    const motes = new InstancedMesh(new OctahedronGeometry(0.05, 0), additive("#fff3d6"), 28);
    const waves = new InstancedMesh(new RingGeometry(0.9, 1, 28), additive("#fff3d6"), 4);
    const sweat = new InstancedMesh(new IcosahedronGeometry(0.07, 0).scale(0.8, 1.3, 0.8), flat("#a8dcff"), 2);
    const closed = new InstancedMesh(new RingGeometry(0.045, 0.075, 10).rotateX(-Math.PI / 2), flat(GREEN), COLS * ROWS - COLS);
    const open = new InstancedMesh(new RingGeometry(0.045, 0.075, 10, 1, 0, 4.9).rotateX(-Math.PI / 2), flat(AMBER), COLS);
    for (const m of [motes, waves, sweat, closed, open]) m.frustumCulled = false;
    return {
      motes,
      waves,
      sweat,
      closed,
      open,
      line: ribbon(POLY, 0.05),
      lineMat: flat("#faf7ef"),
      fillGeo: new ShapeGeometry(new Shape(POLY.map(([x, y]) => ({ x, y })))),
      fillMat: additive(p.accent, { opacity: 0.16 }),
      tip: new PlaneGeometry(1, 1),
      glowGeo: new CircleGeometry(0.5, 20),
      glow: glowMat(AMBER, 1.5),
      dummy: new Object3D(),
    };
  }, [p]);
  // each column's refused stamp, and when each stamp lands
  const sheet = useMemo(() => {
    const r = rand(33);
    const out = [];
    for (let c = 0; c < COLS; c++) {
      const bad = Math.floor(r() * ROWS);
      for (let w = 0; w < ROWS; w++) out.push({ c, w, bad: w === bad, at: RAIN + r() * 1.2, spin: r() * 6.28, h: 3.4 + r() * 1.4 });
    }
    return out;
  }, []);

  // the pup holds the Force: both flippers up, a tremble on twos as it strains, then lets go
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const up = ramp(LIFT[0] - 0.1, LIFT[0] + 0.3, t) * (1 - ramp(STRAIN[1], STRAIN[1] + 0.35, t));
    live.pose.raise = up * o;
    const strain = t > STRAIN[0] && t < STRAIN[1] ? 0.4 + 0.2 * (Math.floor(t * 12) % 2) : 0;
    live.pose.crouch = strain * o;
  });

  const root = useStageGroup(cut, (t, state) => {
    const r = refs.current;
    const portrait = state.camera.aspect < 1;
    const C = portrait ? CP : DESK;
    const S = portrait ? SP : 1;
    const tt = twos(t);
    const o = outK(tl, t);
    const D = k.dummy;
    // --- the polygon
    const lift = ramp(LIFT[0], LIFT[1], t);
    const strain = ramp(STRAIN[0], STRAIN[0] + 0.3, t) * (1 - ramp(STRAIN[1], STRAIN[1] + 0.12, t));
    r.poly.visible = lift > 0;
    const tremble = strain * Math.sin(tt * 120) * 0.025;
    r.poly.position.set(C[0] + tremble, 0.25 + (C[1] - 0.25) * lift + 0.04 * Math.sin(tt * 2.1) * lift, C[2]);
    r.poly.rotation.set(-1.45 * (1 - lift), 0.35 * Math.sin(tt * 0.9) * lift, 0.12 * Math.sin(tt * 1.3) * lift + (1 - lift) * 0.6);
    r.poly.scale.setScalar(Math.max(o * S * (0.6 + 0.4 * lift), 0.0001));
    // the gap: wide, drawn in to almost nothing as it strains, then it springs back and stays
    const open = 0.3 - 0.27 * strain + 0.1 * ramp(STRAIN[1] + 0.1, STRAIN[1] + 0.3, t);
    const a = POLY[N - 1];
    const b = POLY[0];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const f = Math.max(0, 1 - open / len);
    const ex = a[0] + (b[0] - a[0]) * f;
    const ey = a[1] + (b[1] - a[1]) * f;
    r.tip.position.set((a[0] + ex) / 2, (a[1] + ey) / 2, 0);
    r.tip.rotation.z = Math.atan2(ey - a[1], ex - a[0]);
    r.tip.scale.set(Math.max(Math.hypot(ex - a[0], ey - a[1]), 0.0001), 0.05, 1);
    r.glow.position.set((ex + b[0]) / 2, (ey + b[1]) / 2, 0.02);
    r.glow.scale.setScalar(0.34 + 0.06 * Math.sin(tt * 10));
    k.glow.uniforms.uA.value = 0.9 + 0.1 * Math.sin(tt * 10);
    // --- the Force: waves from the pup's flipper to the polygon, motes spiralling it up
    const on = t > LIFT[0] - 0.1 && t < STRAIN[1] + 0.3;
    k.waves.visible = on;
    for (let i = 0; i < 4; i++) {
      const s = (tt * 1.4 + i / 4) % 1;
      D.position.set(HAND[0] + (C[0] - HAND[0]) * s * 0.9, HAND[1] + (C[1] - HAND[1]) * s * 0.9, HAND[2] + (C[2] - HAND[2]) * s * 0.9);
      D.quaternion.copy(state.camera.quaternion);
      D.scale.setScalar((0.12 + 0.4 * s) * (1 - s) * 1.6 + 0.0001);
      D.updateMatrix();
      k.waves.setMatrixAt(i, D.matrix);
    }
    k.waves.instanceMatrix.needsUpdate = true;
    const mo = ramp(LIFT[0], LIFT[0] + 0.3, t) * (1 - ramp(RAIN - 0.2, RAIN + 0.3, t));
    k.motes.visible = mo > 0;
    for (let i = 0; i < 28; i++) {
      const ang = tt * 2.2 + i * 0.9;
      const u = (i / 28 + tt * 0.25) % 1;
      D.position.set(C[0] + Math.cos(ang) * (0.9 + 0.3 * u) * S, 0.2 + u * (C[1] - 0.2) * lift * 1.1, C[2] + Math.sin(ang) * (0.9 + 0.3 * u) * S);
      D.rotation.set(0, ang, 0);
      D.scale.setScalar(mo * o * (1 - 0.6 * u) + 0.0001);
      D.updateMatrix();
      k.motes.setMatrixAt(i, D.matrix);
    }
    k.motes.instanceMatrix.needsUpdate = true;
    // --- two sweat drops from the pup's brow while it strains
    k.sweat.visible = t > STRAIN[0] + 0.1 && t < STRAIN[1] + 0.6;
    for (let i = 0; i < 2; i++) {
      const u = ramp(0, 0.5, t - STRAIN[0] - 0.1 - i * 0.15);
      D.position.set((i ? 0.52 : -0.5), 1.15 - 0.45 * u * u, 0.55);
      D.rotation.set(0, 0, 0);
      D.scale.setScalar((1 - 0.4 * u) * o + 0.0001);
      D.updateMatrix();
      k.sweat.setMatrixAt(i, D.matrix);
    }
    k.sweat.instanceMatrix.needsUpdate = true;
    // --- the sheet: 33 columns of 16 stamps fall and lie round the pup; one in each column stays open
    const raining = t >= RAIN - 0.05;
    k.closed.visible = k.open.visible = raining;
    if (raining) {
      let ci = 0;
      let oi = 0;
      for (const s of sheet) {
        const u = ramp(0, 0.55, t - s.at);
        const fall = 1 - u;
        D.position.set(-3.3 + s.c * 0.2, 0.04 + fall * s.h, -2.2 + s.w * 0.2);
        D.rotation.set(0, s.spin * fall, 0);
        D.scale.setScalar((t < s.at ? 0 : 1) * o + 0.0001);
        D.updateMatrix();
        (s.bad ? k.open.setMatrixAt(oi++, D.matrix) : k.closed.setMatrixAt(ci++, D.matrix));
      }
      k.closed.instanceMatrix.needsUpdate = true;
      k.open.instanceMatrix.needsUpdate = true;
    }
  });

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={root} visible={false}>
        <group ref={set("poly")} visible={false}>
          <mesh geometry={k.line} material={k.lineMat} />
          <mesh geometry={k.fillGeo} material={k.fillMat} />
          <mesh ref={set("tip")} geometry={k.tip} material={k.lineMat} />
          <mesh ref={set("glow")} geometry={k.glowGeo} material={k.glow} />
        </group>
        <primitive object={k.waves} />
        <primitive object={k.motes} />
        <primitive object={k.sweat} />
        <primitive object={k.closed} />
        <primitive object={k.open} />
      </group>
    </>
  );
}
