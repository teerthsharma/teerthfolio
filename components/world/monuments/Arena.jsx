"use client";

// Sculpture for the "arena" figure: google/XNNPACK #10801 (place id pr-xnnpack-10801).
// Tells the same story as that figure on teerthsharma.github.io, in 3D:
// a wall of live memory values (instanced, coloured by offset — mint on the
// floor, through blue, to violet at the lid), one value (the hero, amber)
// stacked on top of it because the old planner's search never looked below
// the first live block. The fix looks from the floor, finds the leading gap
// sitting there all along, and carries the hero down into it: the arena's
// lid — its tallest slab, for the whole run — comes down with it, and the
// old peak is left behind as a fading mark in the place's own colour.
// THE ANOMALY (XNNPACK Peak's radiation, place.radiation): cube snow. Small
// cubes -- the wall's own language, every value here is a box -- lift out of
// the cave and drift up past the skyline, tumbling, thinning as they go, and
// loop. Snow falling upward, cast in the place's own colour.
//
// Local origin: on the snow at the place centre; +z faces the camera and the dock.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, Color, MeshBasicMaterial, Object3D } from "three";
import { C, lamp, mat } from "../palette";
import {
  CAVE_X,
  CAVE_Z,
  COLUMNS,
  FLOAT_BOTTOM,
  GAP,
  HERO_HEIGHT,
  HERO_SIZE,
  NEW_TOP,
  OLD_TOP,
  WALL_HALF_X,
  WALL_HALF_Z,
  rampColor,
} from "./parts/arena-plan";

const unitBox = new BoxGeometry(1, 1, 1);
const dummy = new Object3D();
const tmpColor = new Color();

// ---- the anomaly: cube snow, rising out of the cave -----------------------
const SNOW_N = 14;
const SNOW_CYCLE = 4.2; // s for one cube to lift clear of the skyline
const SNOW_RISE = 5; // m climbed before it thins out of sight
const frac = (x) => x - Math.floor(x);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
// rises from a to b, holds, falls from c to d — 0 outside, 1 across the hold
const trapezoid = (t, a, b, c, d) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));

// One loop of the story, in seconds. Read together with fig.js's own timing
// comments: arrive and hold high, the fix looks from the floor and the cave
// lights, lift toward the viewer, carry down, set in, the lid follows, the
// old peak fades, hold low, then the hero resets to the top for the repeat.
const CYCLE = 6.4;
const GLOW_IN = 0.8;
const GLOW_HOLD = 1.6;
const GLOW_FADE = 2.6;
const MOVE_START = 1.6;
const MOVE_END = 2.9;
const DROP_START = 2.6;
const DROP_END = 3.5;
const GHOST_IN = DROP_START + 0.1;
const GHOST_HOLD = 3.7;
const GHOST_FADE = 5.1;
const RESET_START = 5.8;

const heroOnTopY = OLD_TOP - HERO_HEIGHT / 2;
const heroInGapY = FLOAT_BOTTOM / 2;
const heroArcY = OLD_TOP + 0.6;
const heroArcZ = CAVE_Z + 0.9;

export default function Arena({ place, near }) {
  const columnsRef = useRef();
  const heroRef = useRef();
  const lidRef = useRef();
  const ghostRef = useRef();
  const glowRef = useRef();

  const colMat = mat("#ffffff", { roughness: 0.55 });
  const floorMat = mat(C.charcoal, { roughness: 0.6 });
  // Cloned so this monument can brighten its own hero and fade its own ghost
  // mark without touching the shared material cache other places read too.
  const heroMat = useMemo(() => lamp(C.lamp, 1.1).clone(), []);
  const ghostMat = useMemo(
    () => mat(place.color, { emissive: place.color, emissiveIntensity: 0.5, opacity: 0.7 }).clone(),
    [place.color],
  );
  const lidMat = useMemo(
    () => new MeshBasicMaterial({ color: C.deepIce, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }),
    [],
  );
  const glowMat = useMemo(
    () => new MeshBasicMaterial({ color: C.lamp, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  const snowMat = useMemo(() => mat(place.radiation, { flat: false, roughness: 0.3, emissive: place.radiation, emissiveIntensity: 0.7 }), [place.radiation]);
  const snowRef = useRef();

  // The wall never moves: every column is placed and coloured once.
  useLayoutEffect(() => {
    const mesh = columnsRef.current;
    if (!mesh) return;
    COLUMNS.forEach((col, i) => {
      dummy.position.set(col.x, col.bottom + col.h / 2, col.z);
      dummy.scale.set(col.w, col.h, col.w);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const [r, g, b] = rampColor(col.bottom + col.h);
      mesh.setColorAt(i, tmpColor.setRGB(r, g, b));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const speed = near ? 1.55 : 1;
    const boost = near ? 1.4 : 1;
    const t = (clock.elapsedTime * speed) % CYCLE;

    // the lid: the arena is as tall as its tallest slab, for the whole run
    const drop = ease((t - DROP_START) / (DROP_END - DROP_START));
    const rim = OLD_TOP + (NEW_TOP - OLD_TOP) * drop;
    if (lidRef.current) lidRef.current.position.y = rim;
    lidMat.opacity = (0.24 + 0.08 * Math.sin(t * 1.3)) * boost;

    // the cave: dark until the fix looks from the floor and finds it
    const glow = trapezoid(t, GLOW_IN, GLOW_HOLD, MOVE_START + 0.5, GLOW_FADE);
    glowMat.opacity = glow * 0.55 * boost;
    if (glowRef.current) glowRef.current.scale.setScalar(1 + 0.05 * Math.sin(t * 4));

    // the old peak, left behind in the place's own colour, fading
    const ghost = trapezoid(t, GHOST_IN, GHOST_HOLD, GHOST_HOLD, GHOST_FADE);
    ghostMat.opacity = ghost * 0.75;
    if (ghostRef.current) ghostRef.current.visible = ghost > 0.01;

    // the hero: stacked high, lifted toward the viewer, carried down, set in
    if (heroRef.current) {
      const move = ease((t - MOVE_START) / (MOVE_END - MOVE_START));
      const u = 1 - move;
      const y = u * u * heroOnTopY + 2 * u * move * heroArcY + move * move * heroInGapY;
      const z = u * u * CAVE_Z + 2 * u * move * heroArcZ + move * move * CAVE_Z;
      const settle = clamp01((t - MOVE_END) / 0.3);
      const squash = Math.sin(settle * Math.PI);
      const fadeOut = 1 - ease((t - RESET_START) / (CYCLE - RESET_START));
      const fadeIn = t < 0.3 ? ease(t / 0.3) : 1;
      const visible = fadeOut * fadeIn;
      heroRef.current.position.set(CAVE_X, y, z);
      heroRef.current.scale.set(visible * (1 + 0.09 * squash), visible * (1 - 0.18 * squash), visible * (1 + 0.09 * squash));
      heroMat.emissiveIntensity = (1.1 + 0.5 * glow) * boost;
    }

    // the anomaly: cube snow, lifting out of the cave and thinning upward
    const snow = snowRef.current;
    if (snow) {
      const rawT = clock.elapsedTime * speed;
      for (let i = 0; i < SNOW_N; i++) {
        const p = frac(rawT / SNOW_CYCLE + i / SNOW_N);
        const a = i * 2.39996;
        const spread = 0.35 + 0.35 * ((i * 0.618) % 1);
        const r = 0.1 + p * spread;
        const s = (0.22 - 0.08 * p) * Math.min(1, p / 0.08) * (p > 0.82 ? (1 - p) / 0.18 : 1);
        dummy.position.set(CAVE_X + Math.cos(a + p * 2.4) * r, FLOAT_BOTTOM * 0.35 + SNOW_RISE * p * p, CAVE_Z + Math.sin(a + p * 2.4) * r * 0.7);
        dummy.scale.setScalar(s);
        dummy.rotation.set(p * 6 + i, p * 4 - i, i * 1.3);
        dummy.updateMatrix();
        snow.setMatrixAt(i, dummy.matrix);
      }
      snow.instanceMatrix.needsUpdate = true;
    }
  });

  const wallX = WALL_HALF_X * 2;
  const wallZ = WALL_HALF_Z * 2;

  return (
    <group>
      {/* the floor shelf the wall stands on */}
      <mesh position={[0, 0.06, 0]} material={floorMat} castShadow receiveShadow>
        <boxGeometry args={[wallX + 0.3, 0.12, wallZ + 0.3]} />
      </mesh>

      {/* the wall: every live value, instanced, coloured by its offset */}
      <instancedMesh ref={columnsRef} args={[unitBox, colMat, COLUMNS.length]} castShadow receiveShadow />

      {/* the cave: the leading gap, dark until the fix looks from the floor */}
      <mesh ref={glowRef} position={[CAVE_X, GAP / 2, CAVE_Z]} material={glowMat}>
        <boxGeometry args={[HERO_SIZE + 0.1, GAP - 0.06, HERO_SIZE + 0.1]} />
      </mesh>

      {/* the hero value: stacked, lifted, carried down, set in */}
      <mesh ref={heroRef} material={heroMat} castShadow>
        <boxGeometry args={[HERO_SIZE, HERO_HEIGHT, HERO_SIZE]} />
      </mesh>

      {/* the lid: as tall as the tallest slab, for the whole run */}
      <mesh ref={lidRef} material={lidMat} position={[0, NEW_TOP, 0]}>
        <boxGeometry args={[wallX + 0.2, 0.05, wallZ + 0.2]} />
      </mesh>

      {/* the old peak, left behind as a fading mark in the place's colour */}
      <mesh ref={ghostRef} material={ghostMat} position={[0, OLD_TOP, 0]}>
        <boxGeometry args={[wallX + 0.2, 0.05, wallZ + 0.2]} />
      </mesh>

      {/* the anomaly: cube snow, lifting out of the cave */}
      <instancedMesh ref={snowRef} args={[unitBox, snowMat, SNOW_N]} frustumCulled={false} castShadow />
    </group>
  );
}
