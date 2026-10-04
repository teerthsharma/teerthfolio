"use client";

// The XLA geyser: Detective Conan ("There is always only one truth."). The
// small bowtie-as-a-V silhouette points; two output cards race across the
// panel behind the pup, each with its own stamp (two answers); the pup grabs
// both and slams them into one card with one green stamp (one answer). Cards
// are one flat-coloured mesh each, the flash a single ring: three draw calls.
// Card: lib/world/cutscene/cards/pr-openxla-46539.js. Shape, colour, pose only.

import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, MeshBasicMaterial, RingGeometry } from "three";
import { DefaultMove, onTwos, smooth } from "../kit";
import { colorBox, flatMat, merged, srgb, useStageGroup } from "./g3/common";
import { paletteFor } from "../../../../lib/world/cutscene/look";

const INK = "#2a1c14";
const STAMPS = { a: "#ff9f43", b: "#2ec4b6", one: "#5ad17a" }; // two different answers, then one
const card = (stamp) =>
  merged([
    colorBox(1.28, 0.86, 0.04, [0, 0, -0.012], INK),
    colorBox(1.2, 0.78, 0.04, [0, 0, 0], "#fbfaf7"),
    colorBox(0.64, 0.07, 0.045, [-0.22, 0.1, 0.002], INK),
    colorBox(0.8, 0.07, 0.045, [-0.14, -0.04, 0.002], INK),
    colorBox(0.5, 0.07, 0.045, [-0.3, -0.18, 0.002], INK),
    colorBox(0.3, 0.3, 0.05, [0.36, 0.22, 0.004], stamp),
  ]);

const RACE = [
  { y: 2.0, v: 0.5, ph: 0.15 },
  { y: 2.85, v: 0.78, ph: 0.55 },
];
const raceAt = (c, t) => [-6.2 + 12.4 * ((t * c.v + c.ph) % 1), c.y + 0.1 * Math.sin(t * 9 + c.ph * 7)];
const SLAM = [0.1, 1.95, -0.3];

export default function Move(cut) {
  const { card: dock, tl } = cut;
  const root = useRef();
  const a = useRef();
  const b = useRef();
  const ring = useRef();
  const kit = useMemo(
    () => ({
      a: card(STAMPS.a),
      b: card(STAMPS.b),
      one: card(STAMPS.one),
      mat: flatMat(),
      ring: new RingGeometry(0.8, 1, 40),
      ringMat: new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, fog: false }),
    }),
    [],
  );
  useMemo(() => srgb(kit.ringMat.color, paletteFor(dock).core), [dock, kit]);

  useStageGroup(root, cut, (t) => {
    const T = onTwos(t);
    const [m0, m1] = tl.move;
    const m = smooth(m0, m1, T);
    const hit = T - m1; // seconds since the slam
    const show = smooth(tl.enter, tl.enter + 0.3, T);
    [a.current, b.current].forEach((mesh, i) => {
      const c = RACE[i];
      const [x0, y0] = raceAt(c, Math.min(T, m0));
      const e = m * m;
      mesh.position.set(x0 + (SLAM[0] - x0) * e, y0 + (SLAM[1] - y0) * e, -1.2 + (SLAM[2] + 1.2) * e);
      mesh.rotation.z = (i ? -0.08 : 0.07) * (1 - m);
      let s = show;
      if (hit >= 0) {
        if (i) s = 0; // one card is left
        else s = show * (1 + 0.32 * Math.exp(-hit * 9) * Math.cos(hit * 28));
        mesh.position.y += 0.06 * Math.sin(T * 2.4);
      }
      mesh.scale.setScalar(Math.max(0.001, s));
      mesh.visible = s > 0.002;
    });
    a.current.geometry = hit >= 0 ? kit.one : kit.a;
    const r = ring.current;
    r.visible = hit >= 0 && hit < 0.45;
    if (r.visible) {
      r.position.set(...SLAM);
      r.scale.setScalar(0.3 + 2.8 * Math.min(1, hit / 0.4));
      kit.ringMat.opacity = 1 - hit / 0.45;
    }
  });

  return (
    <>
      <DefaultMove {...cut} />
      <group ref={root} visible={false}>
        <mesh ref={a} geometry={kit.a} material={kit.mat} />
        <mesh ref={b} geometry={kit.b} material={kit.mat} />
        <mesh ref={ring} geometry={kit.ring} material={kit.ringMat} visible={false} />
      </group>
    </>
  );
}
