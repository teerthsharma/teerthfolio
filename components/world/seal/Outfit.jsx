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
// Five named places wear "friendlier gear" (the igloo, neutral, wears none);
// the other fourteen areas share
// five anime-homage looks by an explicit table (LOOK_BY_ID), so two areas
// with the same look are always at least 62 m apart (lib/world/looks.js). Every
// look keeps the pup's big eyes visible, and is at most 3 meshes plus the
// shared aura, which also carries the burst on arriving and leaving.
//
// The head group's frame (unchanged): origin the skull centre, +z the nose,
// +y up, +x the seal's own left, size ~HEAD_RADIUS metres. The eyes sit at
// about (±0.24, -0.04, 0.39): nothing below y 0.12 may cross z 0.36 there.

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { BackSide, BoxGeometry, ConeGeometry, CylinderGeometry, NormalBlending, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RADIATION } from "../../../lib/world/moments";
import { DISTRICTS } from "../../../lib/world/places";
import { LOOK_BY_ID } from "../../../lib/world/looks";
import { live } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

export const HEAD_RADIUS = 0.45;
const R = HEAD_RADIUS;
const GOLD = "#ffd23f";
const STRAW = "#f2c94c";
const FLAME = "#ff8a1a";

// ---------------------------------------------------------- pieces (head-local, +z the nose)

// A ring flattened round the Y axis: headband, hard-hat rim, strap.
function band(r, tube, y, z = 0, tilt = 0) {
  const g = new TorusGeometry(r, tube, 6, 28);
  g.rotateX(Math.PI / 2 + tilt);
  g.translate(0, y, z);
  return g;
}
// A shell over the crown: hard-hat dome / beanie / hat crown.
function dome(r, flat, y) {
  const g = new SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
  g.scale(1, flat, 1);
  g.translate(0, y, -0.03);
  return g;
}
// Goggles pushed up on the brow, lenses tipped to the sky: the eyes stay
// bare. Returns the frame (rims + strap) and the lenses as separate meshes.
function goggles(rim = 0.12) {
  const at = (g, s) => g.rotateX(-0.5).translate(s * 0.2, 0.24, 0.36);
  const rims = [1, -1].map((s) => at(new TorusGeometry(rim, 0.05, 8, 16), s));
  const glass = [1, -1].map((s) => at(new CylinderGeometry(rim - 0.02, rim - 0.02, 0.04, 14).rotateX(Math.PI / 2), s));
  const bridge = new CylinderGeometry(0.05, 0.05, 0.16, 6).rotateZ(Math.PI / 2).rotateX(-0.5).translate(0, 0.24, 0.36);
  return { rims: mergeGeometries([...rims, bridge]), glass: mergeGeometries(glass), strap: band(0.47, 0.06, 0.22, 0, -0.3) };
}
// A lab coat's two white lapels under the jaw.
function lapels() {
  return mergeGeometries(
    [1, -1].map((s) => new ConeGeometry(0.12, 0.26, 3).scale(1, 1, 0.3).rotateZ(s * 0.5).translate(s * 0.16, -0.4, 0.3)),
  );
}
// A sun visor: a dark band and a half-disc brim over the front only.
function visor() {
  const brimArc = new CylinderGeometry(0.34, 0.34, 0.05, 20, 1, false, -1.2, 2.4).scale(1, 1, 0.8).rotateX(-0.25).translate(0, 0.2, 0.28);
  return { band: band(0.46, 0.06, 0.2), brim: brimArc };
}
function spikes() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 3 - 1; // -1..1 across the fan
    parts.push(new ConeGeometry(0.12, 0.5, 5).translate(0, 0.25, 0).rotateZ(-t * 0.7).rotateX(-0.6).translate(t * 0.22, 0.35, -0.05));
  }
  return mergeGeometries(parts);
}
// A headband across the forehead (front high, knot low at the back), a
// plain metal plate on it and two tails hanging from the knot.
function ninja() {
  const lift = 0.43 * Math.sin(0.35);
  const reach = 0.43 * Math.cos(0.35);
  const tails = [1, -1].map((s) => new BoxGeometry(0.07, 0.3, 0.03).translate(0, -0.15, 0).rotateZ(s * 0.35).translate(s * 0.06, 0.12 - lift, -reach - 0.03));
  return {
    cloth: mergeGeometries([band(0.43, 0.065, 0.12, 0, -0.35), ...tails]),
    plate: new BoxGeometry(0.26, 0.13, 0.05).rotateX(-0.35).translate(0, 0.12 + lift, reach + 0.03),
  };
}
function buns() {
  return {
    buns: mergeGeometries([1, -1].map((s) => new SphereGeometry(0.12, 12, 8).translate(s * 0.24, 0.42, -0.02))),
    ties: mergeGeometries([1, -1].map((s) => new TorusGeometry(0.1, 0.04, 6, 14).rotateX(Math.PI / 2).translate(s * 0.24, 0.33, -0.02))),
  };
}
// A straw hat tipped back so the brim clears the eyes from the chase camera.
function straw() {
  const brimRing = new TorusGeometry(0.45, 0.17, 8, 28).rotateX(Math.PI / 2).scale(1, 0.26, 1).translate(0, 0.34, -0.02);
  return {
    hat: mergeGeometries([dome(0.3, 0.6, 0.3), brimRing]).rotateX(-0.3),
    ribbon: band(0.3, 0.06, 0.36).rotateX(-0.3),
  };
}
// A trucker cap worn backwards: crown, a white mesh front panel, the bill
// out over the nape. The highway's gear.
function truckerCap() {
  const bill = new CylinderGeometry(0.34, 0.34, 0.045, 20, 1, false, -1.2, 2.4).scale(1, 1, 0.75).rotateY(Math.PI).rotateX(0.2).translate(0, 0.2, -0.3);
  const panel = new SphereGeometry(0.47, 12, 8, -0.7, 1.4, 0.35, 0.9).scale(1, 0.75, 1).translate(0, 0.1, -0.02);
  return { crown: mergeGeometries([dome(0.5, 0.62, 0.14), bill]), panel };
}
// A spirit flame for hair: a teardrop swept back off the crown, gold inside.
function flame() {
  const drop = (r, h) => mergeGeometries([new SphereGeometry(r, 8, 6), new ConeGeometry(r, h, 6).translate(0, h / 2, 0)]);
  const at = (g) => g.rotateX(-0.4).translate(0, 0.5, -0.06);
  return { outer: at(drop(0.12, 0.34)), core: at(drop(0.06, 0.2).translate(0, 0.02, 0.07)) };
}
function cheekMarks() {
  const parts = [];
  for (const s of [1, -1]) for (const k of [-1, 0, 1]) parts.push(new BoxGeometry(0.16, 0.035, 0.03).rotateY(s * 0.35).translate(s * 0.34, -0.06 + k * 0.06, 0.38));
  return mergeGeometries(parts);
}
// Four-point stars at the eyes' upper outer corners: sparkly eyes.
function sparkle() {
  return mergeGeometries([1, -1].map((s) => new ConeGeometry(0.07, 0.17, 4).rotateX(Math.PI / 2).translate(s * 0.36, 0.13, 0.4)));
}

// ---------------------------------------------------------- looks

// Each look is a list of [geometry, material] meshes; `radiation` is the
// area's colour, so gear reads dark or neutral with the colour as accent.
const EXPLICIT = {
  // goggles on the brow and a lab coat's lapels: the physics lab
  mujorush: (radiation) => {
    const g = goggles(0.12);
    return [[mergeGeometries([g.rims, g.strap]), mat(C.charcoal)], [g.glass, lamp(radiation, 0.8)], [lapels(), mat(C.snow)]];
  },
  // frost goggles, white strap
  triton: (radiation) => {
    const g = goggles(0.14);
    return [[g.rims, mat(C.charcoal)], [g.glass, lamp(radiation, 0.8)], [g.strap, mat(C.snow)]];
  },
  moat: (radiation) => {
    const v = visor();
    return [[v.band, mat(C.charcoal)], [v.brim, mat(radiation, { emissive: radiation, emissiveIntensity: 0.4, roughness: 0.4 })]];
  },
  highway: (radiation) => {
    const c = truckerCap();
    return [[c.crown, mat(radiation, { roughness: 0.5 })], [c.panel, mat(C.snow, { roughness: 0.8 })]];
  },
  dam: (radiation) => [[mergeGeometries([dome(0.54, 0.62, 0.16), band(0.5, 0.06, 0.2)]), mat(radiation, { roughness: 0.4 })]], // a hard hat
};

const POOL = {
  spikes: (radiation) => [[spikes(), lamp(GOLD, 0.6)], [sparkle(), lamp(radiation, 1)]],
  ninja: (radiation) => {
    const n = ninja();
    return [[n.cloth, mat(radiation, { roughness: 0.5 })], [n.plate, mat("#c9ced6", { roughness: 0.3 })], [cheekMarks(), lamp(radiation, 1)]];
  },
  buns: (radiation) => {
    const b = buns();
    return [[b.buns, mat(radiation, { roughness: 0.4 })], [b.ties, mat(C.charcoal)], [sparkle(), lamp(radiation, 1)]];
  },
  straw: (radiation) => {
    const s = straw();
    return [[s.hat, mat(STRAW, { roughness: 0.6 })], [s.ribbon, mat(radiation, { roughness: 0.4 })]];
  },
  flame: () => {
    const f = flame();
    return [[f.outer, lamp(FLAME, 1.2)], [f.core, lamp(GOLD, 1.5)], [sparkle(), lamp(GOLD, 1)]];
  },
};


const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));
const aura = new SphereGeometry(R * 1.32, 12, 8);
const cache = new Map();
function lookFor(district) {
  const cached = cache.get(district.id);
  if (cached) return cached;
  const color = district.radiation ?? district.color ?? GOLD;
  const make = EXPLICIT[district.id] ?? POOL[LOOK_BY_ID[district.id] ?? "spikes"];
  // The aura: back faces only, so it rims the silhouette instead of veiling
  // the face; normal blending, because additive vanishes on white snow.
  const auraMat = glow(color, 0.15).clone();
  auraMat.blending = NormalBlending;
  auraMat.side = BackSide;
  const built = { meshes: make(color), auraMat };
  cache.set(district.id, built);
  return built;
}

// ---------------------------------------------------------- the component

export default function Outfit() {
  const group = useRef(null);
  const auraRef = useRef(null);
  const spring = useRef({ id: null, scale: 0, v: 0, target: 0, burst: 0, auraMat: null });
  const [look, setLook] = useState(null);

  useFrame((state, dt) => {
    // Crossing in, the look waits for the mutation beat (moments.js
    // RADIATION: the view floods, then the halo, then this); leaving drops
    // it at once.
    const rad = live.rad;
    const beat = !rad.id || state.clock.elapsedTime - rad.start >= RADIATION.mutateAt;
    const id = beat ? rad.id : spring.current.id;
    const district = id ? DISTRICT_BY_ID[id] : null;
    const sp = spring.current;
    if (id !== sp.id) {
      if (id) {
        const next = lookFor(district);
        setLook(next);
        sp.auraMat = next.auraMat;
        sp.scale = sp.id === null ? 0 : 0.55; // arriving fresh vs. swapping area to area
        sp.v = 0;
        sp.target = 1;
        sp.burst = 1;
      } else {
        sp.v += 7; // the outward kick: a smaller burst on leaving
        sp.target = 0;
        sp.burst = 0.6;
      }
      sp.id = id;
    }
    // An underdamped spring: the scale overshoot the brief asks for.
    // Substepped: at 130 stiffness one explicit step diverges below ~20 fps.
    const n = Math.min(8, Math.ceil(dt * 60));
    const h = Math.min(dt, 8 / 60) / n;
    for (let i = 0; i < n; i++) {
      sp.v += ((sp.target - sp.scale) * 130 - sp.v * 11) * h;
      sp.scale = Math.max(0, sp.scale + sp.v * h);
    }
    sp.burst = Math.max(0, sp.burst - Math.min(dt, 0.1) / 0.45);
    if (sp.target === 0 && sp.scale < 0.01 && Math.abs(sp.v) < 0.02 && sp.burst === 0) {
      sp.scale = 0;
      if (look) setLook(null);
    }
    if (group.current) {
      group.current.visible = sp.scale > 0.001;
      group.current.scale.setScalar(sp.scale);
    }
    if (auraRef.current) {
      const k = Math.max(sp.scale, sp.burst) * (1 + 1.5 * (1 - sp.burst) * (sp.burst > 0 ? 1 : 0));
      auraRef.current.visible = k > 0.001;
      auraRef.current.scale.setScalar(k);
    }
    if (sp.auraMat) sp.auraMat.opacity = sp.burst > 0 ? 0.1 + 0.6 * sp.burst : 0.1 + 0.09 * (0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 2.2));
  });

  if (!look) return <group ref={group} visible={false} />;
  return (
    <>
      <group ref={group}>
        {look.meshes.map(([geometry, material], i) => (
          <mesh key={i} geometry={geometry} material={material} />
        ))}
      </group>
      <mesh ref={auraRef} geometry={aura} material={look.auraMat} />
    </>
  );
}
