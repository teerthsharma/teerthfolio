"use client";

// Building for the "smatrix" figure: resolvent (place id p-resolvent), a lab
// project Teerth built -- standing straight on the snow, no plinth.
//
// The project (data/showcase.json): resolvent proves in Lean 4 that softmax
// attention and Markov path composition are settings of one operator, then
// reads that operator through a resolvent, (I - gammaP)^-1 = I + gammaP +
// gamma^2 P^2 + ..., and gets the same closed form Wheeler's S-matrix had in
// 1937: in-states to out-states, "with no account of the path between them".
// The landing site's own figure (teerthsharma.github.io/fig.js, "smatrix --")
// builds that series as a solid, one translucent slice per hop, and once a
// cycle looks straight down the stack so every slice lands on the sum and
// the path disappears.
//
// The everyday job, done the resolvent's way: an ice-core archive hut, the
// small instrument shed a polar station keeps its drilled cores in. A real
// core is read the same way the paper reads attention -- side-on, each layer
// is one year (here, one hop) and the path is visible; read it end-on, as a
// cross-section, and the layers collapse onto one slice with no history left
// in it. The case behind the hut's window holds the resolvent's own K = 22
// hops as a beaded spiral (parts/smatrix-layout.js: hop 0 at the glass, hop
// K against the back panel, exactly the figure's own gamma = 0.82 falloff
// and hue ramp); it scans in front to back, holds, then the whole spiral
// eases flat onto the glass -- the building's own "look straight down the
// stack" -- before opening back out. Faster and brighter when `near`.
//
// Local origin: on the snow at the place centre; +z faces the camera and the
// dock. Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, Color, MeshBasicMaterial, Object3D, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { useUi } from "../../../lib/world/store";
import { smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { DUST, K, SLICES, VIOLET_HEX } from "./parts/smatrix-layout";

// ---- the hut: a small square field-station cabin, one hip roof -----------
const HALF = 1.15; // wall footprint half-extent -- comfortably inside place.radius (3 m)
const WALL_H = 1.7;
const ROOF_H = 1.3;
const ROOF_R = HALF * 1.55; // eave overhang past the walls
const MID_X = 0.35; // post between the window and the door

// ---- the case: the resolvent's story, seen through the front window ------
const CASE_X = -0.35; // centred in the window opening
const CASE_Y = 0.95;
const CASE_HALF = 0.46; // scales SLICES' state-space plane (-1..1ish) to metres
const CASE_FRONT_Z = 0.78; // just inside the glass
const CASE_DEPTH = 1.15;
const CASE_BACK_Z = CASE_FRONT_Z - CASE_DEPTH;

// ---- timing (seconds, at rest -- `near` speeds the clock up) -------------
// DT and K are fig.js's own numbers for the scan (see parts/smatrix-layout.js
// -- 220 ms a hop, 22 hops): kept exact for how long the case takes to build.
const DT = 0.22;
const BUILD_END = K * DT; // 4.84 -- the spiral finishes arriving
const HOLD_END = BUILD_END + 1.0; // held, full depth
const COLLAPSE_END = HOLD_END + 1.0; // eases flat onto the glass
const FLAT_END = COLLAPSE_END + 1.6; // held flat -- "no account of the path"
const REOPEN_END = FLAT_END + 1.0; // eases back to depth
const CYCLE = REOPEN_END + 0.5;
const POP = 0.18; // seconds for one bead or grain to pop in once its hop arrives

const dummy = new Object3D();
const tmpColor = new Color();

export default function Smatrix({ place, near: nearProp }) {
  // Scene.jsx mounts lab buildings without a `near` prop (only Monument.jsx,
  // no longer rendered for these, used to supply it) -- fall back to the
  // store so this still lights up correctly on its own.
  const nearStore = useUi((s) => s.near === place.id);
  const near = nearProp ?? nearStore;

  const beadRef = useRef();
  const dustRef = useRef();
  const scanRef = useRef();

  const sliceLayout = useMemo(
    () =>
      SLICES.map((s) => ({
        color: s.color,
        radius: s.beadRadius,
        arrival: (s.k / K) * BUILD_END,
        x: CASE_X + s.x * CASE_HALF,
        y: CASE_Y + s.y * CASE_HALF,
        spreadZ: CASE_FRONT_Z - s.zFrac * CASE_DEPTH,
      })),
    [],
  );
  const dustLayout = useMemo(
    () =>
      DUST.map((d) => {
        const parent = SLICES[d.k];
        return {
          color: parent.color,
          size: d.size,
          arrival: (d.k / K) * BUILD_END,
          x: CASE_X + parent.x * CASE_HALF + d.dx * CASE_HALF,
          y: CASE_Y + parent.y * CASE_HALF + d.dy * CASE_HALF,
          spreadZ: CASE_FRONT_Z - parent.zFrac * CASE_DEPTH + d.dz * CASE_HALF,
          flatJitter: d.dz * CASE_HALF * 0.4,
        };
      }),
    [],
  );

  const beadGeo = useMemo(() => new SphereGeometry(1, 8, 6), []);
  const dustGeo = useMemo(() => new SphereGeometry(1, 5, 4), []);
  const threadGeo = useMemo(() => {
    const pts = sliceLayout.map((s) => new Vector3(s.x, s.y, s.spreadZ));
    return new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.018, 6, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unlit swarm, each keeping its own hop colour from the ramp fig.js itself
  // paints (kept exact: parts/smatrix-layout.js). Normal blending, tone
  // mapped: additive here just clips a dense, near-axial spiral to white.
  const beadMat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0.92 }), []);
  const dustMat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }), []);
  // fig.js paints every partial and running sum in this one violet -- the
  // thread joining the hops, and the panel they all resolve onto, share it.
  const threadMat = useMemo(() => new MeshBasicMaterial({ color: VIOLET_HEX, transparent: true, opacity: 0.35, toneMapped: false }), []);
  // Dark base colour, bright emissive only: a lit albedo this size would
  // pick up the polar daylight and read as a pale wall, not a glowing panel.
  const sumMat = useMemo(() => mat("#241636", { emissive: VIOLET_HEX, emissiveIntensity: 1, roughness: 0.5 }).clone(), []);
  const scanMat = useMemo(() => glow(VIOLET_HEX, 0.5).clone(), []);
  const ventMat = useMemo(() => lamp(place.color, 0.8).clone(), [place.color]);

  const wall = mat(C.warmWhite, { roughness: 0.75 });
  const frame = mat(C.charcoal, { roughness: 0.6 });
  const edge = mat(place.color, { roughness: 0.4 });
  // unlit, not a real dielectric: a low-roughness standard material here
  // catches the sun disc as a hard streak and washes the case out behind it.
  const glass = useMemo(
    () => new MeshBasicMaterial({ color: C.ice, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }),
    [],
  );

  useLayoutEffect(() => {
    const beads = beadRef.current;
    if (beads) {
      sliceLayout.forEach((s, i) => beads.setColorAt(i, tmpColor.set(s.color)));
      beads.instanceColor.needsUpdate = true;
    }
    const dust = dustRef.current;
    if (dust) {
      dustLayout.forEach((d, i) => dust.setColorAt(i, tmpColor.set(d.color)));
      dust.instanceColor.needsUpdate = true;
    }
  }, [sliceLayout, dustLayout]);

  useFrame(({ clock }) => {
    const speed = near ? 1.5 : 1;
    const boost = near ? 1.35 : 1;
    const t = (clock.elapsedTime * speed) % CYCLE;

    // 0 while the spiral has depth, 1 once it has eased flat onto the glass.
    const collapseK =
      t < HOLD_END ? 0 : t < COLLAPSE_END ? smoothstep(HOLD_END, COLLAPSE_END, t) : t < FLAT_END ? 1 : t < REOPEN_END ? 1 - smoothstep(FLAT_END, REOPEN_END, t) : 0;
    // a quick, quiet reset just before the loop wraps, so the next scan
    // starts from nothing instead of jump-cutting a full spiral away.
    const fadeAll = 1 - smoothstep(CYCLE - 0.4, CYCLE, t);

    const beads = beadRef.current;
    if (beads) {
      sliceLayout.forEach((s, i) => {
        const pop = smoothstep(0, POP, t - s.arrival);
        const z = s.spreadZ + (CASE_FRONT_Z - s.spreadZ) * collapseK;
        dummy.position.set(s.x, s.y, z);
        dummy.scale.setScalar(s.radius * pop * fadeAll);
        dummy.updateMatrix();
        beads.setMatrixAt(i, dummy.matrix);
      });
      beads.instanceMatrix.needsUpdate = true;
    }

    const dust = dustRef.current;
    if (dust) {
      dustLayout.forEach((d, i) => {
        const pop = smoothstep(0, POP, t - d.arrival);
        const flatZ = CASE_FRONT_Z + d.flatJitter;
        const z = d.spreadZ + (flatZ - d.spreadZ) * collapseK;
        dummy.position.set(d.x, d.y, z);
        dummy.scale.setScalar(d.size * pop * fadeAll);
        dummy.updateMatrix();
        dust.setMatrixAt(i, dummy.matrix);
      });
      dust.instanceMatrix.needsUpdate = true;
    }

    // the thread through the hops fades as the path it traces disappears
    threadMat.opacity = 0.35 * (1 - collapseK) * fadeAll * boost;

    // the sum panel: grows through the scan, then flares as the stack lands
    // on it -- the punchline, "no account of the path between them".
    const build = smoothstep(0, BUILD_END, t);
    sumMat.emissiveIntensity = (0.9 + 1.3 * build + collapseK * 1.8) * boost;

    // the scan plane: one pass through the hops while the case builds.
    if (scanRef.current) scanRef.current.position.z = CASE_FRONT_Z - Math.min(1, t / BUILD_END) * CASE_DEPTH;
    scanMat.opacity = t < BUILD_END + 0.15 ? 0.5 * smoothstep(0, 0.12, t) * (1 - smoothstep(BUILD_END - 0.15, BUILD_END + 0.15, t)) : 0;

    ventMat.emissiveIntensity = (0.7 + 0.6 * collapseK) * boost;
  });

  return (
    <group>
      {/* the slab this all stands on */}
      <mesh position={[0, -0.07, 0]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[2 * HALF + 0.2, 0.14, 2 * HALF + 0.2]} />
      </mesh>

      {/* side walls */}
      <mesh position={[-HALF, WALL_H / 2, 0]} castShadow receiveShadow material={wall}>
        <boxGeometry args={[0.14, WALL_H, 2 * HALF]} />
      </mesh>
      <mesh position={[HALF, WALL_H / 2, 0]} castShadow receiveShadow material={wall}>
        <boxGeometry args={[0.14, WALL_H, 2 * HALF]} />
      </mesh>

      {/* back wall, and the sum panel glowing on the case just inside it */}
      <mesh position={[0, WALL_H / 2, -HALF]} castShadow receiveShadow material={wall}>
        <boxGeometry args={[2 * HALF, WALL_H, 0.14]} />
      </mesh>
      <mesh position={[CASE_X, CASE_Y, CASE_BACK_Z]} material={sumMat}>
        <planeGeometry args={[CASE_HALF * 2.3, CASE_HALF * 2.3]} />
      </mesh>

      {/* front wall: two corner posts, a mid post, header and sill -- open
          between them for the window onto the case; the door beside it */}
      <mesh position={[-HALF, WALL_H / 2, HALF]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[0.14, WALL_H, 0.14]} />
      </mesh>
      <mesh position={[HALF, WALL_H / 2, HALF]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[0.14, WALL_H, 0.14]} />
      </mesh>
      <mesh position={[MID_X, WALL_H / 2, HALF]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[0.14, WALL_H, 0.14]} />
      </mesh>
      <mesh position={[0, WALL_H - 0.075, HALF]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[2 * HALF, 0.15, 0.14]} />
      </mesh>
      <mesh position={[CASE_X, 0.11, HALF]} castShadow receiveShadow material={frame}>
        <boxGeometry args={[1.4, 0.22, 0.14]} />
      </mesh>
      <mesh position={[0.75, 0.775, HALF]} castShadow receiveShadow material={wall}>
        <boxGeometry args={[0.8, 1.55, 0.1]} />
      </mesh>
      <mesh position={[0.95, 0.775, HALF + 0.06]} material={edge}>
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>

      {/* the window's glass, barely there */}
      <mesh position={[CASE_X, 0.885, HALF - 0.02]} material={glass}>
        <planeGeometry args={[1.4, 1.33]} />
      </mesh>

      {/* the hip roof, one cone over the whole footprint, and its vent */}
      <mesh position={[0, WALL_H + ROOF_H / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow material={frame}>
        <coneGeometry args={[ROOF_R, ROOF_H, 4]} />
      </mesh>
      <mesh position={[0, WALL_H + ROOF_H + 0.14, 0]} castShadow material={frame}>
        <cylinderGeometry args={[0.05, 0.06, 0.28, 8]} />
      </mesh>
      <mesh position={[0, WALL_H + ROOF_H + 0.3, 0]} material={ventMat}>
        <sphereGeometry args={[0.07, 10, 8]} />
      </mesh>

      {/* the case: the resolvent's own K = 22 hops, one bead each, threaded */}
      <mesh position={[CASE_X - CASE_HALF * 1.05, CASE_Y - CASE_HALF * 1.05, CASE_FRONT_Z - CASE_DEPTH / 2]} material={edge}>
        <boxGeometry args={[0.045, 0.045, CASE_DEPTH]} />
      </mesh>
      <mesh position={[CASE_X + CASE_HALF * 1.05, CASE_Y - CASE_HALF * 1.05, CASE_FRONT_Z - CASE_DEPTH / 2]} material={edge}>
        <boxGeometry args={[0.045, 0.045, CASE_DEPTH]} />
      </mesh>
      <mesh position={[CASE_X - CASE_HALF * 1.05, CASE_Y + CASE_HALF * 1.05, CASE_FRONT_Z - CASE_DEPTH / 2]} material={edge}>
        <boxGeometry args={[0.045, 0.045, CASE_DEPTH]} />
      </mesh>
      <mesh position={[CASE_X + CASE_HALF * 1.05, CASE_Y + CASE_HALF * 1.05, CASE_FRONT_Z - CASE_DEPTH / 2]} material={edge}>
        <boxGeometry args={[0.045, 0.045, CASE_DEPTH]} />
      </mesh>
      <mesh geometry={threadGeo} material={threadMat} />
      <instancedMesh ref={beadRef} args={[beadGeo, beadMat, sliceLayout.length]} />
      <instancedMesh ref={dustRef} args={[dustGeo, dustMat, dustLayout.length]} />
      <mesh ref={scanRef} position={[CASE_X, CASE_Y, CASE_FRONT_Z]} material={scanMat}>
        <planeGeometry args={[CASE_HALF * 2.4, CASE_HALF * 2.4]} />
      </mesh>
    </group>
  );
}
