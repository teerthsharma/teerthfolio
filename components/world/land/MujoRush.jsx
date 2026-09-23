"use client";

// MOUNT MUJORUSH: the granite massif on the valley's west side (its bulk and
// its slope are lib/world/terrain.js's MUJO cone; this file only carves what
// stands on that rock). Three giant seal faces, Rushmore-style, cut into the
// smooth south cliff, one per landed MuJoCo contribution, west to east in
// the landing site's own order:
//   pr-mujoco-3396      "units"  1,281.6x less scratch
//   pr-mujoco-warp-1541 "funnel" 1.513x faster
//   pr-mujoco-3450      "hull"   15,361x fewer probes
// Each face wears its merged PR number as a carved collar band round its
// neck (#3396, #1541, #3450 -- lib/world/land.js's own note on the joke).
// Below each face, on the open snow at its reading point, that
// contribution's story plays (the drafts Units.jsx, Funnel.jsx, Hull.jsx,
// absorbed here unchanged but grounded instead of plinthed -- no pedestal,
// this is a natural shelf at the cliff's foot), and its headline is cut in
// stone in front of it, verbatim from data/showcase.json.
//
// THE ANOMALY (the district's radiation, mujorush's own hue): boulders
// break off the cliff near each collar and float up past the faces,
// charging from bare granite to the radiation's colour as they rise, then
// dissolve and the next one calves.

import { useFrame } from "@react-three/fiber";
import { Center, Text3D } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, Object3D } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { heightAt } from "../../../lib/world/terrain";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, mat } from "../palette";
import Funnel from "../monuments/Funnel";
import Hull from "../monuments/Hull";
import Units from "../monuments/Units";

// Match Terrain.jsx's own granite so the carving reads as the same rock.
const GRANITE = "#b9aea8";
const GRANITE_DARK = "#978a84";
const IRIS = "#23262e";

// Where every face's neck sits: right at the toe of the cliff, close behind
// the reading point, not deep up the slope -- the follow camera pitches
// down at the dock (checked live against its real matrix), so anything
// pushed north and high climbs out of frame long before it reads as a face.
const HEAD_Z = -55.2;
const HEAD_SCALE = 0.42;

const FACES = [
  { id: "pr-mujoco-3396", collar: "#3396", Story: Units },
  { id: "pr-mujoco-warp-1541", collar: "#1541", Story: Funnel },
  { id: "pr-mujoco-3450", collar: "#3450", Story: Hull },
].map((f) => {
  const place = PLACE_BY_ID[f.id];
  return { ...f, place, x: place.x, headY: heightAt(place.x, HEAD_Z), ledgeY: heightAt(place.x, place.z) };
});

// ---- one carved face -------------------------------------------------------

function Face({ face, near }) {
  const { place, x, headY, collar, Story } = face;
  const accent = mat(place.color, { roughness: 0.5 });
  return (
    <group>
      {/* the neck, dug well underground so no slope under it ever shows a
          gap: only the top few metres, where it meets the actual cliff, are
          ever seen. Scaled down as a whole: low and close beats tall and
          cropped -- the follow camera never tilts up far. */}
      <group position={[x, headY, HEAD_Z]} scale={HEAD_SCALE}>
        <mesh position={[0, -1.9, 0.3]} castShadow receiveShadow material={mat(GRANITE_DARK)}>
          <boxGeometry args={[3.2, 8.2, 2]} />
        </mesh>

        {/* the collar: a carved band wearing the PR number */}
        <mesh position={[0, 1.1, 1.32]} castShadow material={accent}>
          <boxGeometry args={[3.3, 0.55, 0.22]} />
        </mesh>
        <Center position={[0, 1.1, 1.46]} disableZ>
          <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.34} height={0.08} bevelEnabled bevelSize={0.01} bevelThickness={0.015} curveSegments={4} castShadow>
            {collar}
            <meshStandardMaterial color={C.warmWhite} roughness={0.5} />
          </Text3D>
        </Center>

        {/* the dome */}
        <mesh position={[0, 4.5, 0.15]} scale={[1, 1.15, 0.95]} castShadow receiveShadow material={mat(GRANITE)}>
          <icosahedronGeometry args={[2.6, 1]} />
        </mesh>
        {/* the snout */}
        <mesh position={[0, 3.05, 2.55]} scale={[1.25, 0.85, 1.5]} castShadow receiveShadow material={mat(GRANITE)}>
          <icosahedronGeometry args={[1.05, 1]} />
        </mesh>
        {/* the eyes: big, round, a catchlight -- the seal's own look, carved big */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.95, 4.15, 2.4]}>
            <mesh castShadow material={mat(IRIS, { roughness: 0.3 })}>
              <sphereGeometry args={[0.5, 12, 10]} />
            </mesh>
            <mesh position={[s * -0.14, 0.16, 0.36]} material={mat(C.warmWhite, { emissive: C.warmWhite, emissiveIntensity: 0.4 })}>
              <sphereGeometry args={[0.12, 8, 6]} />
            </mesh>
          </group>
        ))}
        {/* nostrils */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.32, 2.78, 3.75]} material={mat(IRIS)}>
            <sphereGeometry args={[0.13, 8, 6]} />
          </mesh>
        ))}
      </group>

      {/* the ledge: the story grounded at its own reading point, no plinth --
          a natural shelf of open snow at the cliff's foot -- and its
          headline cut in stone in front of it, in the org's own accent. */}
      <group position={[place.x, face.ledgeY, place.z]}>
        <Story place={place} near={near} />
      </group>
      <group position={[place.x, face.ledgeY + 0.1, place.z + 2]}>
        <Center disableZ disableY>
          <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.46} height={0.16} bevelEnabled bevelSize={0.012} bevelThickness={0.018} curveSegments={4} castShadow>
            {place.headline}
            <meshStandardMaterial color={place.color} roughness={0.45} />
          </Text3D>
        </Center>
      </group>
    </group>
  );
}

// ---- the anomaly: boulders calve off the cliff and float ------------------

const PER_FACE = 3;
const N = FACES.length * PER_FACE;
const RISE = 3.2; // m a boulder climbs before it dissolves -- past the dome, not past the frame
const CYCLE = 5.5; // s per boulder, staggered so they never calve together
const BOULDER_GEO = new IcosahedronGeometry(1, 0);

const dummy = new Object3D();
const tmpColor = new Color();
const granite = new Color(GRANITE);

function Boulders({ nearAny }) {
  const ref = useRef(null);
  const clock = useRef(0);
  const rockMat = mat("#ffffff", { roughness: 0.7 });

  // one home per boulder: a jittered spot at each face's collar, its own
  // radius and phase so the three per face calve out of step.
  const homes = useMemo(
    () =>
      FACES.flatMap((f, fi) =>
        Array.from({ length: PER_FACE }, (_, k) => {
          const jx = Math.sin(fi * 7.3 + k * 2.9) * 1.1;
          const jz = Math.cos(fi * 5.1 + k * 3.7) * 0.5;
          return {
            x: f.x + jx * HEAD_SCALE,
            z: HEAD_Z + 1 + jz * HEAD_SCALE,
            y0: f.headY + 0.3,
            r: 0.22 + 0.07 * k,
            radiation: f.place.radiation,
            phase: ((fi * PER_FACE + k) / N) * CYCLE,
          };
        })
      ),
    []
  );
  const radColors = useMemo(() => homes.map((h) => new Color(h.radiation)), [homes]);

  useFrame((state, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    clock.current += Math.min(dt, 0.1) * (nearAny ? 1.5 : 1);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < homes.length; i++) {
      const b = homes[i];
      const p = ((clock.current + b.phase) % CYCLE) / CYCLE;
      const grow = smoothstep(0, 0.12, p) * (1 - smoothstep(0.82, 1, p));
      const rise = smoothstep(0, 1, p);
      dummy.position.set(b.x + Math.sin(t * 0.5 + i) * 0.1, b.y0 + RISE * rise, b.z + Math.cos(t * 0.4 + i) * 0.1);
      dummy.rotation.set(t * 0.5 + i, t * 0.7 + i * 1.3, t * 0.3 + i * 0.6);
      const s = b.r * grow;
      dummy.scale.set(s, s * 0.86, s * 0.96);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(granite).lerp(radColors[i], smoothstep(0.1, 0.75, p));
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[BOULDER_GEO, rockMat, N]} castShadow frustumCulled={false} />;
}

export default function MujoRush() {
  const near = useUi((s) => s.near);
  const nearAny = FACES.some((f) => f.id === near);
  return (
    <group>
      {FACES.map((face) => (
        <Face key={face.id} face={face} near={near === face.id} />
      ))}
      <Boulders nearAny={nearAny} />
    </group>
  );
}
