"use client";

// THE STORY, on the seal's own head: every radioactive area mutates it. This
// tracks live.seal's actual (x, z) against the district circles in
// lib/world/places.js (districtAt) rather than the narrow place-by-place
// "near" prop A/B/C/D pass in — the mutation is area-wide (the whole glow
// radius the motes fill, lib/world/life/Radiation.jsx), not dock-reach-only.
// One <Outfit> instance lives inside the head group for the seal's whole
// life (A/B/C/D never unmount it), so a module-level cache is fine: each
// area's look is built once and reused every time the seal returns.
//
// Two "friendlier" gear looks are named by the brief; three homage looks
// (spikes+aura, ninja headband, twin buns) cycle by a stable hash across
// every other radioactive area so neighbours rarely repeat. Every look is at
// most 3 draw calls (main + optional gold + glow) — under the 8-mesh budget
// with room to spare — and every one carries the shared glow shell, so
// "a soft glow in the colour while mutated" is never a look's own job to add.
//
// The head group's frame (unchanged): origin the skull centre, +z the nose,
// +y up, +x the seal's own left, size ~HEAD_RADIUS metres.

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { ConeGeometry, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { districtAt } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { glow, mat } from "../palette";

export const HEAD_RADIUS = 0.45;
const R = HEAD_RADIUS;
const GOLD = "#ffd23f";

// ---------------------------------------------------------- pieces (head-local, +z the nose)

function spikes(n = 5, size = 1) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / ((n - 1) / 2); // -1..1 across the fan
    const g = new ConeGeometry(0.085 * size, 0.32 * size, 5);
    g.translate(0, 0.16 * size, 0); // base at its own root, tip up
    g.rotateZ(-t * 0.55);
    g.rotateX(-0.15);
    g.translate(t * 0.24, R * 0.6, -0.06);
    parts.push(g);
  }
  return mergeGeometries(parts);
}
// A ring flattened round the Y axis: headband, brim, hard-hat rim, collar.
function band(r, tube, y, z = 0, tilt = 0) {
  const g = new TorusGeometry(r, tube, 6, 28);
  g.rotateX(Math.PI / 2 + tilt);
  g.translate(0, y, z);
  return g;
}
function buns() {
  return mergeGeometries([1, -1].map((s) => new SphereGeometry(0.14, 12, 8).translate(s * 0.3, 0.36, -0.08)));
}
function crownCone(h = 0.2) {
  const g = new ConeGeometry(0.26, h, 8);
  g.translate(0, h / 2 + R * 0.68, -0.05);
  return g;
}
// A shell over the crown: hard-hat dome / beanie. Its own high point clears
// the skull's pole (~0.47R) so it reads as worn ON the head, not sunk in it.
function dome(r, flat, y) {
  const g = new SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
  g.scale(1, flat, 1);
  g.translate(0, y, -0.03);
  return g;
}
function pom(y = R * 1.05) {
  const g = new SphereGeometry(0.09, 10, 8);
  g.translate(0, y, -0.05);
  return g;
}
// A lens over each eye: a torus faces +z by default (no rotation needed).
// z clears the snout's own surface (MOUTH sits at 0.485) so the rim reads
// outside the coat instead of sinking into it.
function lenses(r = 0.15, tube = 0.04, y = -0.03, z = 0.48) {
  return mergeGeometries([1, -1].map((s) => new TorusGeometry(r, tube, 6, 16).translate(s * 0.27, y, z)));
}
// One continuous band across both eyes (a torus stretched wide and flat):
// the moat's visor, held proud of the face on the same z as the goggles.
function visorShield(rx = 0.42, ry = 0.15, tube = 0.055, y = -0.02, z = 0.47) {
  const g = new TorusGeometry(0.24, tube, 6, 20);
  g.scale(rx / 0.24, ry / 0.24, 1);
  g.translate(0, y, z);
  return g;
}
function cheekMarks(r = 0.055) {
  return mergeGeometries([1, -1].map((s) => new SphereGeometry(r, 8, 6).scale(1, 1, 0.35).translate(s * 0.35, -0.08, 0.35)));
}
function sparkle(r = 0.045) {
  return mergeGeometries(
    [1, -1].map((s) => new ConeGeometry(r, r * 2.4, 4).rotateX(Math.PI / 2).translate(s * 0.33, 0.07, 0.45)),
  );
}
// The shared "soft glow" shell: every look wears it, a size bigger than the
// skull, additive and mostly transparent.
function auraShell() {
  return new SphereGeometry(R * 1.32, 12, 8);
}

// ---------------------------------------------------------- looks

// Explicit "friendlier gear" at five named places (the brief's own words).
const EXPLICIT = {
  mujorush: { main: () => mergeGeometries([lenses(0.15), band(0.46, 0.045, -0.4)]) }, // goggles + a lab collar
  moat: { main: () => faceArc(0.46, 0.06, 0.05) }, // a green visor
  dam: { main: () => mergeGeometries([dome(0.5, 0.5, 0.1), band(0.56, 0.05, 0.24)]) }, // a hard hat
  triton: { main: () => lenses(0.17, 0.045) }, // frost goggles
  home: { main: () => mergeGeometries([dome(0.52, 0.62, 0.1), pom()]) }, // a knit beanie
};

// Anime-inspired homage pool for every other radioactive area, picked by a
// stable hash of the district id so neighbours read differently.
const POOL = [
  { main: () => band(0.46, 0.045, 0.1), gold: () => spikes(5), extra: sparkle }, // golden spikes + a thin band to anchor them
  { main: () => band(0.44, 0.055, 0.17), extra: cheekMarks }, // a ninja-style headband
  { main: buns, gold: () => spikes(3, 0.7), extra: sparkle }, // twin buns
  { main: () => mergeGeometries([band(0.58, 0.045, 0.26, -0.05, 0.08), crownCone()]) }, // a straw-hat-like brim
  { main: () => mergeGeometries([band(0.45, 0.04, 0.12), buns()]), extra: cheekMarks }, // headband + buns together
];

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const cache = new Map();
function lookFor(district) {
  const cached = cache.get(district.id);
  if (cached) return cached;
  const color = district.radiation ?? district.color ?? GOLD;
  const cfg = EXPLICIT[district.id] ?? POOL[hashId(district.id) % POOL.length];
  const glowGeo = cfg.extra ? mergeGeometries([auraShell(), cfg.extra()]) : auraShell();
  const built = {
    main: { geometry: cfg.main(), material: mat(color, { roughness: 0.4 }) },
    gold: cfg.gold ? { geometry: cfg.gold(), material: mat(GOLD, { roughness: 0.35 }) } : null,
    glow: { geometry: glowGeo, material: glow(color, 0.15).clone() },
  };
  cache.set(district.id, built);
  return built;
}

// ---------------------------------------------------------- the component

export default function Outfit() {
  const group = useRef(null);
  const spring = useRef({ id: null, scale: 0, v: 0, target: 0, glowMat: null });
  const [look, setLook] = useState(null);

  useFrame((state, dt) => {
    const s = live.seal;
    const district = districtAt(s.x, s.z);
    const id = district?.id ?? null;
    const sp = spring.current;
    if (id !== sp.id) {
      if (id) {
        const next = lookFor(district);
        setLook(next);
        sp.glowMat = next.glow.material;
        sp.scale = sp.id === null ? 0 : 0.55; // arriving fresh vs. swapping area to area
        sp.v = 0;
        sp.target = 1;
      } else {
        sp.v += 2.6; // the outward kick: a smaller burst on leaving
        sp.target = 0;
      }
      sp.id = id;
    }
    // An underdamped spring: the scale overshoot the brief asks for.
    sp.v += ((sp.target - sp.scale) * 130 - sp.v * 11) * dt;
    sp.scale = Math.max(0, sp.scale + sp.v * dt);
    if (sp.target === 0 && sp.scale < 0.01 && Math.abs(sp.v) < 0.02) {
      sp.scale = 0;
      if (look) setLook(null);
    }
    if (group.current) {
      group.current.visible = sp.scale > 0.001;
      group.current.scale.setScalar(sp.scale);
    }
    if (sp.glowMat) sp.glowMat.opacity = 0.1 + 0.09 * (0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 2.2));
  });

  if (!look) return <group ref={group} visible={false} />;
  return (
    <group ref={group}>
      <mesh geometry={look.main.geometry} material={look.main.material} />
      {look.gold && <mesh geometry={look.gold.geometry} material={look.gold.material} />}
      <mesh geometry={look.glow.geometry} material={look.glow.material} />
    </group>
  );
}
