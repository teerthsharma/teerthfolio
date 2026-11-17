"use client";

// THE GOOGLE RANGE: the painted mountains east of the valley (lib/world/
// terrain.js shapes the rock; parts/google-range.js re-cuts it; lib/world/
// land.js's "google-range" circles are its footprint).
//
//   - THE RANGE ITSELF: a rainbow range (the real Vinicunca and Zhangye
//     Danxia look): banded buttresses climbing out of the top of the frame,
//     snow-filled couloirs streaking down between them from the caps, so the
//     foot the follow camera sees reads as the base of something enormous.
//     Its two western peaks and the saddle between them are the range's own
//     rock, no place and no glow (google/highway #3244 is the road to
//     MujoRush: components/world/land/Highway.jsx).
//   - XNNPACK PEAK (google/XNNPACK #10801): the tallest peak, amber, with a
//     cave at its foot facing the reading point, amber light deep inside,
//     pyrite cubes crusting its brow. ITS ANOMALY: a snowball that is a
//     perfect cube, rolling out of the cave on its own, edge over edge, and
//     back in.
//
// Nothing here explains anything. The cave quickens while the seal is there.

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, MeshStandardMaterial, Object3D, Shape, ShapeGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { featuresForTier } from "../../../lib/quality/modes";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { mat } from "../palette";
import { buildSkin, CAVE, THROAT } from "./parts/google-range";

const XNNPACK = PLACE_BY_ID["pr-xnnpack-10801"];

const dummy = new Object3D();
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

// ---- XNNPACK Peak: the cave and its cube snowball ------------------------------------

const MOUTH = 1.3; // the mouth, its brow and its pyrite, scaled together
const ROCK_GEO = new IcosahedronGeometry(1, 0);
const CUBE_GEO = new RoundedBoxGeometry(1, 1, 1, 2, 0.14);
const throatShape = (k) => new Shape(THROAT.map(([x, y]) => ({ x: x * k, y: y * k })));
// Three layers, each smaller, lower and nearer: dark, ember, amber light.
const THROAT_GEOS = [1, 0.64, 0.34].map((k) => new ShapeGeometry(throatShape(k)));

// The brow (an overhang sunk back into the flank) and the two flanks that
// frame the mouth: [x, y, z, sx, sy, sz, turn].
const FRAME = [
  [0, 4.3, -3.2, 3.7, 1.45, 3.3, 0.3],
  [-3.3, 1.7, -1.0, 1.35, 2.3, 1.9, 1.1],
  [3.4, 1.5, -1.0, 1.45, 2.0, 1.9, 2.2],
];
// Pyrite: natural cubes of gold on the brow and the flanks [x, y, z, size, tilt].
const PYRITE = [
  [-1.6, 5.0, -1.2, 0.75, 0.3],
  [-0.7, 5.2, -1.6, 0.5, 0.9],
  [1.3, 4.9, -1.1, 0.9, 0.5],
  [2.3, 4.5, -0.7, 0.45, 1.4],
  [-3.2, 3.6, 0.3, 0.6, 0.7],
  [3.4, 3.2, 0.2, 0.7, 1.1],
  [3.9, 0.7, 0.8, 0.5, 0.2],
];
// Two more cube snowballs resting in the drift at the mouth [x, z, size, turn].
const RESTING = [
  [-4.9, 2.1, 0.85, 0.4],
  [5.5, 2.6, 1.05, 1.2],
];

// The geode (E7): 40 crystals on the cave floor in front of the throat, in the mouth's own frame, kept out of the
// cube's lane (|x| under 0.9). One merged mesh; the tips are white, the bodies violet or teal.
const CRYSTALS = Array.from({ length: 40 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const v = (i * 0.381 + 0.27) % 1;
  return {
    x: side * (0.95 + 1.3 * ((i * 0.618) % 1)),
    z: 0.14 + 0.2 * v,
    r: 0.16 + 0.12 * ((i * 0.37) % 1),
    h: 0.55 + 0.9 * ((i * 0.73) % 1),
    tilt: -side * (0.1 + 0.25 * v),
    yaw: i * 2.4,
    body: i % 3 ? "#8f7bff" : "#10d8ae",
  };
});
function paint(g, hex) {
  const h = g.index ? g.toNonIndexed() : g;
  const c = new Color(hex);
  h.deleteAttribute("uv");
  h.deleteAttribute("normal");
  h.setAttribute("color", new Float32BufferAttribute(Array.from({ length: h.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  return h;
}
const crystalGeo = mergeGeometries(
  CRYSTALS.flatMap((c) => {
    const body = new CylinderGeometry(c.r * 0.9, c.r, c.h, 6).translate(0, c.h / 2, 0);
    const tip = new ConeGeometry(c.r * 0.9, c.h * 0.35, 6).translate(0, c.h * 1.175, 0);
    return [paint(body.rotateY(c.yaw).rotateZ(c.tilt).translate(c.x, 0, c.z), c.body), paint(tip.rotateY(c.yaw).rotateZ(c.tilt).translate(c.x, 0, c.z), "#ffffff")];
  }),
);
function CrystalGlint({ material }) {
  useFrame(({ clock }) => {
    material.emissiveIntensity = 0.4 + 0.25 * Math.sin(clock.elapsedTime * 1.7);
  });
  return null;
}

// The roller: out of the mouth 3 tips (edge over edge, +z), a rest, back in.
const CUBE = 1.35;
const CUBE_Z0 = 1.1; // its first rest, just in front of the mouth
const TIP = 0.6; // s per tip
const PAUSE = 0.3; // s it settles between tips
const REST = 1.6; // s at each end
const TIPS = 3;
const LEG = TIPS * (TIP + PAUSE);
const LOOP = 2 * (LEG + REST);

function Cave({ place, near }) {
  const amber = place.radiation ?? place.color;
  const darkMat = mat("#1c1530", { roughness: 1 });
  const emberMat = mat("#7a3212", { roughness: 1, emissive: amber, emissiveIntensity: 0.25 });
  const lightMat = useMemo(() => mat(amber, { roughness: 0.6, emissive: amber, emissiveIntensity: 1.1 }).clone(), [amber]);
  const rockMat = mat("#3b2d7a");
  const goldMat = mat("#ffb627", { metalness: 0.65, roughness: 0.3, emissive: "#ff8a00", emissiveIntensity: 0.3 });
  const snowMat = mat("#fff0d2", { flat: false, roughness: 0.55, emissive: amber, emissiveIntensity: 0.42 });
  const tier = useUi((s) => s.tier);
  const { shaders, live } = featuresForTier(tier);
  const crystalMat = useMemo(() => mat("#ffffff", { vertexColors: true, roughness: 0.3 }).clone(), []);
  useEffect(() => {
    crystalMat.emissive.set("#ffffff");
    crystalMat.emissiveIntensity = shaders ? 0.4 : 0;
  }, [crystalMat, shaders]);

  const pyrite = useRef(null);
  const roller = useRef(null);
  const clock = useRef(0);
  const k = useRef(0);

  useLayoutEffect(() => {
    const mesh = pyrite.current;
    if (!mesh) return;
    PYRITE.forEach(([x, y, z, s, tilt], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(tilt, tilt * 1.7 + i, tilt * 0.6);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, dt) => {
    k.current += ((near ? 1 : 0) - k.current) * (1 - Math.exp(-3 * dt));
    clock.current += Math.min(dt, 0.1) * (1 + 0.6 * k.current);
    lightMat.emissiveIntensity = 1 + 0.5 * k.current + 0.15 * Math.sin(state.clock.elapsedTime * 2.3);

    const cube = roller.current;
    if (!cube) return;
    const p = clock.current % LOOP;
    // which leg (out, then back), and where in it
    const back = p >= LEG + REST;
    const q = back ? p - LEG - REST : p;
    const dir = back ? -1 : 1;
    let done = TIPS;
    let f = 0;
    let settle = 0;
    if (q < LEG) {
      done = Math.floor(q / (TIP + PAUSE));
      const r = q - done * (TIP + PAUSE);
      f = r < TIP ? ease(r / TIP) : 0;
      if (r >= TIP) {
        done += 1;
        settle = 1 - (r - TIP) / PAUSE;
      }
    }
    const start = back ? CUBE_Z0 + TIPS * CUBE : CUBE_Z0;
    const rest = start + dir * done * CUBE;
    const h = CUBE / 2;
    const a = f * Math.PI * 0.5;
    // tipping over its leading bottom edge: the centre swings over the edge
    const pivot = rest + dir * h;
    dummy.position.set(0, h * (Math.sin(a) + Math.cos(a)) - 0.02, pivot + dir * (-h * Math.cos(a) + h * Math.sin(a)));
    dummy.rotation.set(dir * a, 0, 0);
    const squash = 0.1 * Math.sin(settle * Math.PI);
    dummy.scale.set(CUBE * (1 + squash), CUBE * (1 - squash), CUBE * (1 + squash));
    dummy.updateMatrix();
    cube.matrix.copy(dummy.matrix);
  });

  return (
    <group position={[CAVE.x, 0, CAVE.z]} rotation={[0, CAVE.turn, 0]}>
      <group scale={MOUTH}>
        <mesh geometry={crystalGeo} material={crystalMat} />
        {live && <CrystalGlint material={crystalMat} />}
        <mesh geometry={THROAT_GEOS[0]} material={darkMat} />
        <mesh geometry={THROAT_GEOS[1]} material={emberMat} position={[0, 0, 0.04]} />
        <mesh geometry={THROAT_GEOS[2]} material={lightMat} position={[0, 0, 0.08]} />
        {FRAME.map(([x, y, z, sx, sy, sz, turn], i) => (
          <mesh key={i} geometry={ROCK_GEO} material={rockMat} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, turn, 0.15]} castShadow receiveShadow />
        ))}
        <instancedMesh ref={pyrite} args={[CUBE_GEO, goldMat, PYRITE.length]} castShadow />
      </group>
      {RESTING.map(([x, z, s, turn], i) => (
        <mesh key={i} geometry={CUBE_GEO} material={snowMat} position={[x, s / 2 - 0.04, z]} scale={s} rotation={[0, turn, 0]} castShadow />
      ))}
      <mesh ref={roller} geometry={CUBE_GEO} material={snowMat} matrixAutoUpdate={false} castShadow />
    </group>
  );
}

// ---- the range ---------------------------------------------------------------------------

export default function GoogleRange() {
  const near = useUi((s) => s.near);
  const skin = useMemo(buildSkin, []);
  const skinMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  return (
    <>
      {/* drawn before the terrain it covers, so the rock under it costs no fill */}
      <mesh geometry={skin} material={skinMat} receiveShadow renderOrder={-1} />
      {XNNPACK && <Cave place={XNNPACK} near={near === XNNPACK.id} />}
    </>
  );
}
