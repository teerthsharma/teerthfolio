// The igloo: Vinland Saga. Calm. The igloo speaks ("Neutral zone. No
// radiation."); the pup sits, a single orca dorsal fin circles the floe in a
// pool of water and sinks away without a sound; the seal answers: "I have no
// orcas, for I have no enemies." Shape, colour, pose.
// Cost by construction: water, ripple and fin are four draw calls.
// Card: lib/world/cutscene/cards/home.js.

import { useMemo, useRef } from "react";
import { BackSide, CircleGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, Shape } from "three";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";

const R = 3.1; // m: the fin's circle round the pup
const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, depthWrite: false, ...o });

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const g = useRef();
  const f = useMemo(() => {
    const water = new Mesh(new CircleGeometry(R + 1.4, 48).rotateX(-Math.PI / 2), mat({ color: "#6fb6e8", transparent: true, opacity: 0.16 }));
    water.position.y = 0.012;
    const ripples = new Mesh(new RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2), mat({ color: "#eaf6ff", transparent: true, opacity: 0.8 }));
    // the fin: a flat swept cone, ink with a cream rim hull
    const sh = new Shape().moveTo(0, 0).quadraticCurveTo(0.12, 0.55, 0.16, 1.15).quadraticCurveTo(0.34, 0.5, 0.62, 0).lineTo(0, 0);
    const geo = new ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }).translate(-0.31, 0, -0.03);
    const fin = new Group();
    const rim = new Mesh(geo, mat({ color: "#f5fbff", side: BackSide }));
    rim.scale.set(1.12, 1.05, 1.6);
    fin.add(rim, new Mesh(geo, mat({ color: "#0c1624" })));
    return { water, ripples, fin };
  }, []);

  useCutFrame((t) => {
    const s = live.seal;
    g.current.position.set(s.x, 0, s.z);
    g.current.rotation.y = turnFor(card, place, s.x, s.z);
    const full = mode === "full";
    const tt = full ? onTwos(t) : tl.lineA + 0.3;
    if (full) live.pose.sit = smooth(tl.sign[0], tl.sign[1] + 0.5, tt) * (1 - smooth(tl.collapse[1], tl.duration, tt));
    const seen = smooth(tl.lineA + 0.2, tl.lineA + 1.0, tt);
    const sink = smooth(tl.lineB - 0.2, tl.lineB + 1.2, tt);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const a = (full ? 0.9 * (tt - tl.lineA) : 0.9) + 3.4; // once round the floe
    f.fin.position.set(R * Math.sin(a), 0.02 - sink * 0.95, R * Math.cos(a) * 0.8);
    f.fin.rotation.y = Math.atan2(0.8 * Math.sin(a), Math.cos(a)); // the blade runs along its path
    f.fin.visible = seen > 0 && out > 0 && sink < 1;
    f.fin.scale.setScalar(Math.max(seen, 0.001));
    f.water.scale.set(1, 1, 0.8);
    f.water.material.opacity = 0.16 * out * seen;
    const wake = ((tt * 0.55) % 1) * 0.7 + 0.3;
    f.ripples.position.set(f.fin.position.x, 0.03, f.fin.position.z);
    f.ripples.scale.setScalar(wake * 0.9 * (1 + 0.8 * sink) + 0.001);
    f.ripples.material.opacity = (1 - wake) * 0.9 * out * seen * (full ? 1 : 0);
  });

  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <group ref={g}>
        <primitive object={f.water} />
        <primitive object={f.ripples} />
        <primitive object={f.fin} />
      </group>
    </>
  );
}
