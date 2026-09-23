"use client";

// THE SKY'S ANOMALY: snow that falls up. Ordinary snow drifts down
// (Snowfall.jsx); but the radiation in the island's snow grows a flake into
// a giant six-armed crystal, a metre and a half across, in the colour of the
// area it grew in. It pops up lying flat on the snow, peels off, turns its
// face to the sky and rises, turning slowly like a leaf falling the wrong
// way, its shadow sliding off it. Slide into one before it lifts and the seal
// soaks it up. One instanced mesh (and its shadow); flakes grow round
// wherever the camera looks, never on water, slopes or a building's ground.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Euler, ExtrudeGeometry, MeshStandardMaterial, Object3D, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAND_COLLIDERS } from "../../../lib/world/land";
import { DISTRICTS, PLACES } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { mulberry32 } from "../life/spawn";
import { groundFocus } from "./focus";

const POOL = 12;
const LIFE = 11; // s from popping up to melting away overhead
const GROW = 0.55; // s to pop up out of the snow
const PEEL = [0.9, 2.3]; // s: lifting off, tilting its face to the camera
const FACE = 0.84; // rad of tilt that turns the flat flake to face the camera (42 degree view)
const EVERY = [0.8, 1.5]; // s between new flakes
const CATCH = 1.4; // m: the seal soaks up a flake it slides into before it is 2.5 m up

// ---- the crystal: six branched arms round a hexagon, 1.56 m across ---------

const SPINE = 0.075; // half-width of an arm: 0.15 m, chunky at game distance
const TIP = 0.78;
const BRANCHES = [
  [0.28, 0.28, 0.062], // [where on the arm, length, half-width]
  [0.5, 0.19, 0.056],
];
const S60 = Math.sin(Math.PI / 3);

function armShape() {
  const right = [[SPINE, 0.05]];
  for (const [y, len, hw] of BRANCHES) {
    const tip = 0.1;
    right.push(
      [SPINE, y - hw * S60 + ((SPINE - hw * 0.5) / S60) * 0.5],
      [hw * 0.5 + (len - tip) * S60, y - hw * S60 + (len - tip) * 0.5],
      [len * S60, y + len * 0.5],
      [-hw * 0.5 + (len - tip) * S60, y + hw * S60 + (len - tip) * 0.5],
      [SPINE, y + hw * S60 + ((SPINE + hw * 0.5) / S60) * 0.5],
    );
  }
  right.push([SPINE, TIP - 0.1]);
  const shape = new Shape();
  shape.moveTo(0, TIP);
  for (let i = right.length - 1; i >= 0; i--) shape.lineTo(-right[i][0], right[i][1]);
  for (const [x, y] of right) shape.lineTo(x, y);
  shape.closePath();
  return shape;
}

function buildFlake() {
  const extrude = { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 1, curveSegments: 1 };
  const parts = [];
  const arm = armShape();
  for (let k = 0; k < 6; k++) {
    const g = new ExtrudeGeometry(arm, extrude);
    g.rotateZ((k * Math.PI) / 3);
    parts.push(g);
  }
  const hex = new Shape();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    hex[k ? "lineTo" : "moveTo"](0.21 * Math.cos(a), 0.21 * Math.sin(a));
  }
  hex.closePath();
  parts.push(new ExtrudeGeometry(hex, { ...extrude, depth: 0.1 }));
  const g = mergeGeometries(parts);
  g.translate(0, 0, -0.05);
  g.rotateX(-Math.PI / 2); // lying flat, face up
  return g;
}

// ---- where a flake may grow: dry flat snow, clear of the seal and buildings

const KEEP_OUT = [
  ...PLACES.map((p) => [p.x, p.z, p.radius + 3.5]),
  ...LAND_COLLIDERS.map((c) => [c.x, c.z, c.radius + 1]),
];
function clear(x, z) {
  if (Math.hypot(x - live.seal.x, z - live.seal.z) < 3.5) return false;
  for (const [cx, cz, r] of KEEP_OUT) if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
  const h = heightAt(x, z);
  return h > -0.15 && h < 0.35;
}

// The flake takes the radiation of the area it grows in, or the nearest one.
function radiationAt(x, z) {
  let best = DISTRICTS[0];
  let gap = Infinity;
  for (const d of DISTRICTS) {
    const g = Math.hypot(x - d.x, z - d.z) - d.radius;
    if (g < gap) {
      gap = g;
      best = d;
    }
  }
  return best.radiation ?? best.color;
}

// Its colour lights it as well as tints it: the emissive term takes the
// instance colour, so each crystal glows in its own area's hue.
function glowInColour(shader) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "totalEmissiveRadiance *= vColor;");
}

const easeOutBack = (u) => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const dummy = new Object3D();
const euler = new Euler(0, 0, 0, "XZY");
const tint = new Color();
const focus = { x: 0, z: 0 };

export default function Upfall() {
  const ref = useRef();
  const geometry = useMemo(buildFlake, []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ color: "#ffffff", flatShading: true, roughness: 0.3, emissive: "#ffffff", emissiveIntensity: 0.45 });
    m.onBeforeCompile = glowInColour;
    m.customProgramCacheKey = () => "sky-upfall";
    return m;
  }, []);
  const flakes = useMemo(() => Array.from({ length: POOL }, () => ({ alive: false, t0: 0, x: 0, z: 0, h: 0, spin: 0, turn: 0, phase: 0, colour: "", caught: -1 })), []);
  const clock = useRef({ next: 0.5, rand: mulberry32(7) });

  // Every instance hidden, and an instance colour, before the first draw (so
  // the shader is built with it).
  useLayoutEffect(() => {
    const mesh = ref.current;
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < POOL; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint.set("#ffffff"));
    }
  }, []);

  useFrame(({ camera, clock: c }, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = c.elapsedTime;
    const s = clock.current;
    const rand = s.rand;

    // a new flake now and then, somewhere in view
    s.next -= Math.min(delta, 0.1);
    const free = s.next <= 0 ? flakes.findIndex((f) => !f.alive) : -1;
    if (free >= 0) {
      s.next = EVERY[0] + rand() * (EVERY[1] - EVERY[0]);
      const d = Math.min(groundFocus(camera, focus), 90);
      for (let tries = 0; tries < 8; tries++) {
        const x = focus.x + (rand() * 2 - 1) * 0.5 * d;
        const z = focus.z - 0.4 * d + rand() * 0.57 * d;
        if (!clear(x, z)) continue;
        const f = flakes[free];
        Object.assign(f, { alive: true, t0: t, x, z, h: heightAt(x, z), spin: rand() * 6.3, turn: (rand() < 0.5 ? -1 : 1) * (0.35 + 0.4 * rand()), phase: rand() * 6.3, colour: radiationAt(x, z), caught: -1 });
        mesh.setColorAt(free, tint.set(f.colour));
        mesh.instanceColor.needsUpdate = true;
        break;
      }
    }

    const seal = live.seal;
    for (let i = 0; i < POOL; i++) {
      const f = flakes[i];
      if (!f.alive) continue;
      const a = t - f.t0;
      if (a > LIFE || (f.caught >= 0 && t - f.caught > 0.3)) {
        f.alive = false;
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const lift = smooth(PEEL[0], PEEL[1], a);
      const air = Math.max(0, a - PEEL[0]);
      let x = f.x + lift * 0.8 * Math.sin(0.7 * a + f.phase);
      let y = f.h + 0.1 + 0.85 * air ** 1.35;
      let z = f.z - 0.25 * air;
      let size = easeOutBack(Math.min(1, a / GROW)) * (1 - smooth(LIFE - 0.9, LIFE, a));

      // the seal slides into a low one: it streams into the seal
      if (f.caught < 0 && y < 2.5 && Math.hypot(x - seal.x, z - seal.z) < CATCH) {
        f.caught = t;
        seal.absorbAt = t;
        seal.absorbColor = f.colour;
      }
      if (f.caught >= 0) {
        const u = smooth(0, 0.3, t - f.caught);
        x += (seal.x - x) * u;
        y += (0.7 - y) * u;
        z += (seal.z - z) * u;
        size *= 1 - u;
      }

      euler.set(lift * FACE + lift * 0.22 * Math.sin(1.3 * a + f.phase), f.spin + f.turn * a, lift * 0.3 * Math.sin(0.9 * a + 2 * f.phase));
      dummy.quaternion.setFromEuler(euler);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, POOL]} castShadow frustumCulled={false} />;
}
