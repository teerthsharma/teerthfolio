"use client";

// THE NVIDIA MOAT (lib/world/river.js has the geology): the ring lake the
// ice dam's diverted water cut round the keep, a rock mesa (its rock is
// lib/world/terrain.js's; everything ON it and ON the water is drawn here).
//
//   - Two ice islands float on the ring's south side, each straight behind
//     its reading point: NVIDIA/NeMo-Relay #481 (west) and
//     dsx-ai-factory/topograph #432 (east), each carrying its landing-site
//     story (monuments/Gather.jsx, monuments/Grant.jsx), bobbing gently.
//   - THE ANOMALY, the moat's radiation made visible: its water runs
//     uphill. Five streams climb the keep's cliffs from the ring lake,
//     turning uranium-glass green as they rise, spill UP over the rim into a
//     lake perched on the mesa's top, and that lake rains upward, drops
//     falling into the sky (parts/moat-uphill.js builds the streams).
//
// Everything quickens while the seal is at either reading point.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CircleGeometry, CylinderGeometry, IcosahedronGeometry, Object3D, TorusGeometry } from "three";
import { LAND_COLLIDERS } from "../../../lib/world/land";
import { PLACES } from "../../../lib/world/places";
import { MOAT } from "../../../lib/world/river";
import { useUi } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import Gather from "../monuments/Gather";
import Grant from "../monuments/Grant";
import { C, mat } from "../palette";
import { buildStreams, FOOT_R, POOL_R, POOL_Y, STREAM_ANGLES, streamMaterial } from "./parts/moat-uphill";

const STORY = { gather: Gather, grant: Grant };
const MINE = PLACES.filter((p) => p.district?.id === "moat");
const RADIATION = MINE[0]?.radiation ?? "#84cc16";
const { x: KX, z: KZ } = MOAT.ring;
const dummy = new Object3D();
const frac = (x) => x - Math.floor(x);

// ---- the ice islands -------------------------------------------------------

// Each place floats on the island-sized collider straight behind it.
const FLOES = MINE.map((place) => {
  let best = null;
  for (const c of LAND_COLLIDERS) {
    if (c.land !== "moat" || c.radius > 3) continue;
    if (!best || Math.hypot(c.x - place.x, c.z - place.z) < Math.hypot(best.x - place.x, best.z - place.z)) best = c;
  }
  return best && { place, x: best.x, z: best.z, radius: best.radius };
}).filter(Boolean);

const FREEBOARD = 0.5; // the floe's top above the water
const floeTop = WATER_Y + FREEBOARD;

// A chunky nine-sided slab of ice, every vertex nudged (by where it is, so
// the seams stay shut), flat-shaded: a floe, not a cylinder.
function rough(geo, amount, seed) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + z * 78.233 + y * 3.1 + seed) * 43758.5453;
    const k = 1 + amount * ((h - Math.floor(h)) - 0.5);
    p.setXYZ(i, x * k, y + (y > 0 ? amount * 0.4 * ((h * 7) % 1) : 0), z * k);
  }
  geo.computeVertexNormals();
  return geo;
}
const floeBody = (r, seed) => rough(new CylinderGeometry(r + 0.25, r + 0.5, 1.3, 9, 1).translate(0, -0.65, 0), 0.16, seed);
const floeCap = (r, seed) => rough(new CylinderGeometry(r + 0.02, r + 0.2, 0.2, 9, 1).translate(0, 0.08, 0), 0.12, seed);

function Floe({ floe, near, index }) {
  const ref = useRef();
  const Story = STORY[floe.place.figure?.name];
  const body = useMemo(() => floeBody(floe.radius, index * 3.7), [floe.radius, index]);
  const cap = useMemo(() => floeCap(floe.radius, index * 3.7), [floe.radius, index]);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime + index * 2.1;
    g.position.y = floeTop + Math.sin(t * 0.9) * 0.05;
    g.rotation.x = Math.sin(t * 0.7) * 0.02;
    g.rotation.z = Math.cos(t * 0.6) * 0.02;
  });
  return (
    <group ref={ref} position={[floe.x, floeTop, floe.z]}>
      <mesh geometry={body} material={mat(C.deepIce, { roughness: 0.35 })} castShadow receiveShadow />
      <mesh geometry={cap} material={mat(C.snow)} receiveShadow />
      <group position={[0, 0.16, 0]}>{Story && <Story place={floe.place} near={near} />}</group>
    </group>
  );
}

// ---- the anomaly: water running uphill ------------------------------------

const DROPS = 30;
const RISE_T = 5.5; // s for one drop to fall up out of sight
const RISE_H = 17;
const FOOT_RINGS = 2; // suction rings per stream foot
const POOL_RINGS = 3;

const dropGeo = new IcosahedronGeometry(1, 1);
const ringGeo = new TorusGeometry(1, 0.07, 5, 28).rotateX(Math.PI / 2);
const lipGeo = new CylinderGeometry(POOL_R + 0.3, POOL_R + 0.55, 0.62, 16, 1, true);
const poolGeo = new CircleGeometry(POOL_R + 0.32, 32).rotateX(-Math.PI / 2);

function Uphill({ lively }) {
  const streams = useMemo(buildStreams, []);
  const streamMat = useMemo(() => streamMaterial(RADIATION), []);
  const dropRef = useRef();
  const footRef = useRef();
  const poolRef = useRef();
  const clock = useRef(0);

  const dropMat = mat("#b8f24a", { flat: false, roughness: 0.08, emissive: RADIATION, emissiveIntensity: 0.55 });
  const poolMat = mat("#9ee03a", { roughness: 0.1, emissive: RADIATION, emissiveIntensity: 0.45 });
  const ringMat = mat("#f4ffd6", { emissive: "#e6ffb0", emissiveIntensity: 0.6 });

  // each drop's own way up: a golden-angle fan, so the column spreads
  const dropWay = useMemo(() => Array.from({ length: DROPS }, (_, i) => [i * 2.39996, 0.55 + 0.45 * ((i * 0.618) % 1)]), []);

  useLayoutEffect(() => {
    for (const ref of [dropRef, footRef, poolRef]) if (ref.current) ref.current.frustumCulled = false;
  }, []);

  useFrame((state, dt) => {
    clock.current += Math.min(dt, 0.1) * (lively ? 1.7 : 1);
    const t = clock.current;
    streamMat.uniforms.uTime.value = t;

    // the drops: they fall UP, accelerating, and thin out into the sky
    const drops = dropRef.current;
    if (drops) {
      for (let i = 0; i < DROPS; i++) {
        const p = frac(t / RISE_T + i / DROPS);
        const [a, spread] = dropWay[i];
        const r = 0.2 + p * 2.6 * spread;
        const s = (0.5 - 0.2 * p) * Math.min(1, p / 0.05) * (p > 0.8 ? (1 - p) / 0.2 : 1);
        dummy.position.set(KX + Math.cos(a + p * 1.5) * r, POOL_Y + 0.15 + RISE_H * p * p, KZ + Math.sin(a + p * 1.5) * r);
        dummy.scale.set(s, s * (1 + 0.5 * p), s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    }

    // at each stream's foot the moat is drawn in: rings closing on the foot
    const foot = footRef.current;
    if (foot) {
      let n = 0;
      for (let j = 0; j < STREAM_ANGLES.length; j++) {
        const a = STREAM_ANGLES[j];
        for (let k = 0; k < FOOT_RINGS; k++) {
          const p = frac(t / 1.8 + k / FOOT_RINGS + j * 0.31);
          dummy.position.set(KX + Math.cos(a) * (FOOT_R - 0.3), WATER_Y + 0.04, KZ + Math.sin(a) * (FOOT_R - 0.3));
          dummy.scale.setScalar(0.3 + 2.2 * (1 - p));
          dummy.updateMatrix();
          foot.setMatrixAt(n++, dummy.matrix);
        }
      }
      foot.instanceMatrix.needsUpdate = true;
    }

    // on the perched lake, rings spreading from where the drops lift off
    const pool = poolRef.current;
    if (pool) {
      for (let k = 0; k < POOL_RINGS; k++) {
        const p = frac(t / 2.4 + k / POOL_RINGS);
        dummy.position.set(KX, POOL_Y + 0.03, KZ);
        dummy.scale.setScalar(0.4 + (POOL_R - 0.5) * p);
        dummy.updateMatrix();
        pool.setMatrixAt(k, dummy.matrix);
      }
      pool.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={streams} material={streamMat} />
      <mesh position={[KX, POOL_Y - 0.28, KZ]} geometry={lipGeo} material={mat(C.ice, { roughness: 0.3 })} castShadow receiveShadow />
      <mesh position={[KX, POOL_Y, KZ]} geometry={poolGeo} material={poolMat} receiveShadow />
      <instancedMesh ref={poolRef} args={[ringGeo, ringMat, POOL_RINGS]} />
      <instancedMesh ref={footRef} args={[ringGeo, ringMat, STREAM_ANGLES.length * FOOT_RINGS]} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, DROPS]} castShadow />
    </group>
  );
}

export default function Moat() {
  const near = useUi((s) => s.near);
  const lively = MINE.some((p) => p.id === near);
  return (
    <group>
      <Uphill lively={lively} />
      {FLOES.map((floe, i) => (
        <Floe key={floe.place.id} floe={floe} index={i} near={near === floe.place.id} />
      ))}
    </group>
  );
}
