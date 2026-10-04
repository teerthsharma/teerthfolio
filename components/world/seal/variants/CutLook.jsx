"use client";

// THE PUP'S CUTSCENE LOOKS (inside the head and flipper groups of D.jsx): all
// driven by pose hooks a move writes (cutscene/kit.jsx), nothing here knows a
// place. `ring`: a thin silver ring round each pupil (Ultra Instinct).
// `demon`: two dark lines under each eye, a smaller crimson pair of eye-marks
// above them that opens a beat late, and (CutNails) four black nail-tips on
// each flipper. Shape and colour only: the head stays round, never an ear.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, ConeGeometry, DoubleSide, MeshBasicMaterial, Quaternion, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live } from "../../../../lib/world/store";
import { EYE_R, SKULL, skullPoint } from "./D-parts";

const Z = new Vector3(0, 0, 1);
// a point on the skull along (x, y, z), with its outward normal and a frame to lay a flat shape on
function on(x, y, z, lift) {
  const p = skullPoint(new Vector3(x, y, z).normalize(), new Vector3());
  const n = new Vector3(p.x / SKULL[0] ** 2, p.y / SKULL[1] ** 2, p.z / SKULL[2] ** 2).normalize();
  const q = new Quaternion().setFromUnitVectors(Z, n);
  return { p: p.addScaledVector(n, lift), q };
}
const lay = (g, x, y, z, roll = 0, lift = 0.01) => {
  const { p, q } = on(x, y, z, lift);
  g.rotateZ(roll);
  g.applyQuaternion(q);
  return g.translate(p.x, p.y, p.z);
};
const flat = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};

export function CutLook() {
  const geo = useMemo(() => {
    const ring = [];
    const under = [];
    const marks = [];
    for (const s of [1, -1]) {
      ring.push(flat(lay(new TorusGeometry(EYE_R * 1.1, 0.011, 4, 24), 0.5 * s, -0.1, 0.86, 0, 0.004)));
      for (const [dy, len] of [[-0.24, 0.17], [-0.31, 0.12]]) under.push(flat(lay(new BoxGeometry(len, 0.02, 0.008), 0.5 * s, -0.1 + dy, 0.84, -0.18 * s, 0.006)));
      marks.push(flat(lay(new BoxGeometry(0.15, 0.036, 0.01), 0.5 * s, 0.3, 0.8, 0.45 * s, 0.006)));
    }
    return { ring: mergeGeometries(ring), under: mergeGeometries(under), marks: mergeGeometries(marks) };
  }, []);
  const mats = useMemo(
    () => ({
      ring: new MeshBasicMaterial({ color: "#e8eeff", toneMapped: false }),
      under: new MeshBasicMaterial({ color: "#1a0a10", toneMapped: false, side: DoubleSide }),
      marks: new MeshBasicMaterial({ color: "#e5142e", toneMapped: false, side: DoubleSide }),
    }),
    [],
  );
  const ring = useRef();
  const under = useRef();
  const marks = useRef();
  useFrame((state) => {
    const P = live.pose;
    const t = state.clock.elapsedTime;
    ring.current.visible = P.ring > 0.01;
    ring.current.scale.setScalar(Math.max(P.ring, 0.01));
    under.current.visible = P.demon > 0.01;
    under.current.scale.set(Math.min(1, P.demon * 2), 1, 1);
    // the second pair opens last and blinks a beat behind the real eyes
    const late = Math.max(0, P.demon * 2 - 1);
    const blink = Math.floor(t * 12) % 40 < 2 ? 0.1 : 1;
    marks.current.visible = late > 0.01;
    marks.current.scale.set(late, blink * late, 1);
  });
  return (
    <>
      <mesh ref={ring} geometry={geo.ring} material={mats.ring} visible={false} />
      <mesh ref={under} geometry={geo.under} material={mats.under} visible={false} />
      <mesh ref={marks} geometry={geo.marks} material={mats.marks} visible={false} />
    </>
  );
}

// four tiny black cones at the end of a flipper (flipper space: out along +x)
export function CutNails() {
  const geo = useMemo(() => {
    const parts = [-0.075, -0.025, 0.025, 0.075].map((z) => flat(new ConeGeometry(0.014, 0.06, 5).rotateZ(-Math.PI / 2).translate(0.7, -0.01, z)));
    return mergeGeometries(parts);
  }, []);
  const mat = useMemo(() => new MeshBasicMaterial({ color: "#120608", toneMapped: false }), []);
  const m = useRef();
  useFrame(() => {
    m.current.visible = live.pose.demon > 0.5;
  });
  return <mesh ref={m} geometry={geo} material={mat} visible={false} />;
}
