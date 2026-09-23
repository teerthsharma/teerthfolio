"use client";

// The BUILDING for "witness": nerve (place id p-nerve), one of the eleven lab
// projects Teerth builds, standing straight on the snow.
//
// The everyday building this becomes: a field measuring station -- the kind
// that watches an instrument and logs what it reads. Its mast carries a
// spinning anemometer, the one instrument the station shows, nothing behind
// it standing for the project's own figure or data; its porch carries four
// identical rain gauges, filling and draining together on the same
// schedule -- a plain weather station, not a scoreboard.
//
// Colour: the district's radiation colour (place.radiation once the world
// director adds it, else place.color) lights the station itself -- its wall
// glass, its roof ring, the ground it stands on. The gauges keep a
// cool-water blue/mint of their own so the porch still reads as an
// instrument, not just more radiation glow.
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Body radius stays inside place.radius (3); overall height ~5 m.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, lamp, mat } from "../palette";

const BLUE = "#2456dc"; // every marker's colour
const MINT = "#0b93ab"; // the rain

// --- the station -----------------------------------------------------------
const HUT_R = 1.3;
const HUT_SIDES = 8;
const WALL_H = 1.6;
const ROOF_H = 1.0;
const ROOF_Y = WALL_H + ROOF_H;
const HUT_CZ = -0.7; // hut set back so the gauge porch it feeds has room in front

const MAST_LEN = 1.55;

const DECK_W = 2.4;
const DECK_T = 0.15;
const DECK_Y = DECK_T / 2;
const DECK_STRIP_D = 0.8; // a boardwalk strip under the gauges, not a slab under the whole station
const PLANK_GAP = 0.04;
const PLANK_COUNT = 3;
const PLANK_D = (DECK_STRIP_D - (PLANK_COUNT - 1) * PLANK_GAP) / PLANK_COUNT;
const BASE_Y = DECK_T; // the gauges' floor: the boardwalk's top face

// --- the four gauges: identical, a plain weather-station porch ------------
const TUBE_X = [-0.72, -0.24, 0.24, 0.72];
const TUBE_Z = 1.85;
const TUBE_R = 0.15;
const TUBE_H = 1.25;
const RAIN_H = TUBE_H * 0.72; // every lane rains to the same height
const FUNNEL_Y = BASE_Y + TUBE_H + 0.13; // the funnel's narrow spout meets the tube's rim
const DROPS_PER_LANE = 6;

const RISER_Z0 = HUT_CZ + HUT_R * 0.6;

// --- the cycle: quiet, then the rain, then the drain -----------------------
const CYCLE = 10;
const RAIN_START = 0.6;
const RAIN_END = 5.6;
const HOLD_END = 8.3;
const DRAIN_END = 9.6;
const NEAR_SPEED = 1.6;
const NEAR_BRIGHT = 1.35;

// how far the rain has risen (0 -> 1 -> 1 -> 0), the same envelope every
// gauge rises and drains on -- every lane shares the same target height.
function raiseFrac(t) {
  if (t < RAIN_START) return 0;
  if (t < RAIN_END) return smoothstep(RAIN_START, RAIN_END, t);
  if (t < HOLD_END) return 1;
  if (t < DRAIN_END) return 1 - smoothstep(HOLD_END, DRAIN_END, t);
  return 0;
}

// --- static geometry, built once -------------------------------------------
const dummy = new Object3D();

const wallGeo = new CylinderGeometry(HUT_R * 0.94, HUT_R, WALL_H, HUT_SIDES, 1, true).translate(0, WALL_H / 2, HUT_CZ);
const ringTopGeo = new TorusGeometry(HUT_R, 0.045, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, WALL_H, HUT_CZ);

function postAt(i) {
  const a = (i / HUT_SIDES) * Math.PI * 2 + Math.PI / HUT_SIDES; // offset so no post sits at front centre
  return new BoxGeometry(0.13, WALL_H, 0.13)
    .translate(0, WALL_H / 2, 0)
    .translate(Math.cos(a) * HUT_R, 0, HUT_CZ + Math.sin(a) * HUT_R);
}
function plankAt(i) {
  const z0 = TUBE_Z - DECK_STRIP_D / 2 + PLANK_D / 2 + i * (PLANK_D + PLANK_GAP);
  return new BoxGeometry(DECK_W, DECK_T, PLANK_D).translate(0, DECK_Y, z0);
}

// Fixed charcoal parts, none of which move: one merged mesh, one draw call,
// instead of a mesh (or instance) per part.
const staticCharcoalGeo = mergeGeometries(
  [
    new ConeGeometry(HUT_R * 1.1, ROOF_H, HUT_SIDES).translate(0, ROOF_Y - ROOF_H / 2, HUT_CZ), // roof
    new SphereGeometry(0.08, 8, 6).translate(0, ROOF_Y, HUT_CZ), // cap
    new TorusGeometry(HUT_R * 1.02, 0.05, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, 0.03, HUT_CZ), // ring, base
    new CylinderGeometry(0.1, 0.13, MAST_LEN, 6).translate(0, ROOF_Y + MAST_LEN / 2, HUT_CZ), // mast, thickened
    new BoxGeometry(TUBE_X[3] - TUBE_X[0] + 0.3, 0.12, 0.12).translate(0, FUNNEL_Y + 0.18, TUBE_Z), // header
    new BoxGeometry(0.12, 0.12, TUBE_Z - RISER_Z0).translate(0, FUNNEL_Y + 0.18, RISER_Z0 + (TUBE_Z - RISER_Z0) / 2), // riser
    ...Array.from({ length: HUT_SIDES }, (_, i) => postAt(i)),
    ...Array.from({ length: PLANK_COUNT }, (_, i) => plankAt(i)),
  ],
  false,
);

const tubeGeo = new CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 12, 1, true).translate(0, TUBE_H / 2, 0);
const grainGeo = new CylinderGeometry(TUBE_R * 0.9, TUBE_R * 0.9, 1, 10).translate(0, 0.5, 0); // unit height: scale.y = fill
const markerGeo = new SphereGeometry(0.085, 8, 6);
const dropGeo = new SphereGeometry(0.07, 6, 6);
const funnelGeo = new ConeGeometry(0.22, 0.26, 10).rotateX(Math.PI); // apex down: a funnel, not a spike

// the anemometer: 3 cups on 0.6 m arms, spinning at the mast's own top -- the
// one instrument the station carries, nothing narrative standing behind it.
// ANEM_Y sits above the roof's apex (a cone, so nothing but the thin mast is
// behind it up here), so the cups silhouette against open sky.
const ANEM_ARM = 0.6;
const ANEM_Y = ROOF_Y + MAST_LEN;
function anemArmGeo(angle) {
  return new BoxGeometry(ANEM_ARM, 0.12, 0.12).translate(ANEM_ARM / 2, 0, 0).rotateY(angle);
}
const anemHubGeo = mergeGeometries(
  [new SphereGeometry(0.07, 8, 6), anemArmGeo(0), anemArmGeo((2 * Math.PI) / 3), anemArmGeo((4 * Math.PI) / 3)],
  false,
);
const anemCupGeo = new SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const ANEM_CUP_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

export default function Witness({ place, near: nearProp }) {
  const nearAuto = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearAuto;
  const RAD = place.radiation ?? place.color;

  const wallMat = useMemo(() => mat(RAD, { roughness: 0.2, metalness: 0.05, emissive: RAD, emissiveIntensity: 1.2, opacity: 0.8 }).clone(), [RAD]);
  const ringTopMat = useMemo(() => lamp(RAD), [RAD]);
  const charcoalMat = useMemo(() => mat(C.charcoal, { roughness: 0.55 }), []);
  const tubeMat = useMemo(() => mat(C.ice, { roughness: 0.12, metalness: 0.05, opacity: 0.35, side: DoubleSide }), []);
  // Roughness/emissive tuned high: unlike the rest of the palette, the rain
  // sits low in the hut's own shadow and needs to glow, not just be lit, to
  // read as its own colour from 35 m -- mat()'s usual 0.1-0.2 emissive goes
  // near-black back there.
  const grainMat = useMemo(() => mat(MINT, { roughness: 0.45, emissive: MINT, emissiveIntensity: 0.9 }), []);
  const markerMat = useMemo(() => mat(BLUE, { roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.45 }), []);
  const dropMat = useMemo(() => mat(MINT, { roughness: 0.4, emissive: MINT, emissiveIntensity: 0.7 }), []);
  const funnelMat = useMemo(() => mat(C.ice, { roughness: 0.2, metalness: 0.3 }), []);

  const tubesRef = useRef();
  const grainRef = useRef();
  const markerRef = useRef();
  const dropRef = useRef();
  const funnelRef = useRef();
  const anemRef = useRef();
  const anemCupsRef = useRef();

  // Static placements, set once.
  useLayoutEffect(() => {
    const tubes = tubesRef.current;
    const funnels = funnelRef.current;
    if (tubes) {
      for (let i = 0; i < TUBE_X.length; i++) {
        const x = TUBE_X[i];
        dummy.position.set(x, BASE_Y, TUBE_Z);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tubes.setMatrixAt(i, dummy.matrix);
        if (funnels) {
          dummy.position.set(x, FUNNEL_Y, TUBE_Z);
          dummy.updateMatrix();
          funnels.setMatrixAt(i, dummy.matrix);
        }
      }
      tubes.instanceMatrix.needsUpdate = true;
      if (funnels) funnels.instanceMatrix.needsUpdate = true;
    }

    const anem = anemCupsRef.current;
    if (anem) {
      for (let i = 0; i < ANEM_CUP_ANGLES.length; i++) {
        const a = ANEM_CUP_ANGLES[i];
        dummy.position.set(Math.cos(a) * ANEM_ARM, 0, Math.sin(a) * ANEM_ARM);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        anem.setMatrixAt(i, dummy.matrix);
      }
      anem.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    const speed = near ? NEAR_SPEED : 1;
    const bright = near ? NEAR_BRIGHT : 1;
    const t = state.clock.elapsedTime * speed;
    const cycleT = t % CYCLE;
    const raise = raiseFrac(cycleT);

    const wPulse = 0.5 + 0.5 * Math.sin(t * 2.1);
    wallMat.emissiveIntensity = (1.2 + wPulse * 0.3) * bright;

    if (anemRef.current) anemRef.current.rotation.y = state.clock.elapsedTime * (near ? 4 : 2);

    const grain = grainRef.current;
    const marker = markerRef.current;
    const drops = dropRef.current;
    if (grain && marker) {
      for (let i = 0; i < TUBE_X.length; i++) {
        const x = TUBE_X[i];
        const h = Math.max(0.002, raise * RAIN_H);

        // grain fill: every lane rises and drains on the same envelope.
        dummy.position.set(x, BASE_Y, TUBE_Z);
        dummy.scale.set(1, h, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        grain.setMatrixAt(i, dummy.matrix);

        // the marker floats right at the rain's surface -- identical
        // behaviour in every lane, a plain weather-station float gauge.
        dummy.position.set(x, BASE_Y + h, TUBE_Z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        marker.setMatrixAt(i, dummy.matrix);

        // a stream of grains, falling, while this lane's rain is still rising.
        if (drops) {
          for (let k = 0; k < DROPS_PER_LANE; k++) {
            const idx = i * DROPS_PER_LANE + k;
            const raining = cycleT > RAIN_START && cycleT < RAIN_END;
            const dropPhase = raining ? ((cycleT - RAIN_START) * 1.7 + i * 0.31 + k / DROPS_PER_LANE) % 1 : -1;
            if (dropPhase < 0) {
              dummy.scale.setScalar(0);
            } else {
              dummy.position.set(x, FUNNEL_Y - dropPhase * (FUNNEL_Y - (BASE_Y + h)), TUBE_Z);
              dummy.scale.setScalar(1);
            }
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            drops.setMatrixAt(idx, dummy.matrix);
          }
        }
      }
      grain.instanceMatrix.needsUpdate = true;
      marker.instanceMatrix.needsUpdate = true;
      if (drops) drops.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* the station: an octagonal glass-and-timber field hut */}
      <mesh geometry={wallGeo} material={wallMat} castShadow receiveShadow />
      <mesh geometry={ringTopGeo} material={ringTopMat} />
      <mesh geometry={staticCharcoalGeo} material={charcoalMat} castShadow receiveShadow />

      {/* the anemometer: 3 cups on the mast top, spinning */}
      <group ref={anemRef} position={[0, ANEM_Y, HUT_CZ]}>
        <mesh geometry={anemHubGeo} material={charcoalMat} />
        <instancedMesh ref={anemCupsRef} args={[anemCupGeo, charcoalMat, ANEM_CUP_ANGLES.length]} />
      </group>

      {/* the four gauges: identical, a plain weather-station porch */}
      <instancedMesh ref={funnelRef} args={[funnelGeo, funnelMat, TUBE_X.length]} />
      <instancedMesh ref={tubesRef} args={[tubeGeo, tubeMat, TUBE_X.length]} />
      <instancedMesh ref={grainRef} args={[grainGeo, grainMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={markerRef} args={[markerGeo, markerMat, TUBE_X.length]} frustumCulled={false} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, TUBE_X.length * DROPS_PER_LANE]} frustumCulled={false} />
    </group>
  );
}
