"use client";

// Pooled particles, the click ring, the gulp heart, and discovery confetti.
// Every pool is a fixed-size InstancedMesh written from preallocated typed
// arrays; nothing here allocates once the component has mounted.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  DoubleSide,
  ExtrudeGeometry,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  Shape,
} from "three";
import { JUMP_IN, SKIP_WINDOW } from "../../lib/world/moments";
import { PLACE_BY_ID } from "../../lib/world/places";
import { riverAt } from "../../lib/world/river";
import { getUi, live, useUi } from "../../lib/world/store";
import { easeOutBack, smoothstep } from "./life/util";
import Radiation from "./life/Radiation";
import { mat } from "./palette";

const PUFF_COUNT = 160;
const CONFETTI_COUNT = 48;
const SPRAY_COUNT = 80;
const RED = "#ff5040";
const SIDES = [-1, 1];
const PUFF_SIZE_MUL = 1.6; // white-on-white puffs were unreadable from the ~35 m camera
const PUFF_LIFE_ADD = 0.2;
// lib/world/river.js has no RIVER.surfaceY yet (the terrain contract's own
// number: relief lives under the water, surface about y = -0.35). Splash and
// foam were spawning at a small positive y — floating well above the actual
// water once it renders. Swap for RIVER.surfaceY once that lands.
const WATER_Y = -0.35;

// ---- geometry / material, built once ---------------------------------------

const PUFF_GEO = new IcosahedronGeometry(1, 1);
// emissiveIntensity 0: at 0.25 a white puff over white snow only showed
// where it crossed the trail. The shaded side of the geometry now reads as
// a faint lavender-grey against the warm snow instead of vanishing into it.
const PUFF_MAT = mat("#f4f6ff", { flat: false, roughness: 1, emissive: "#ffffff", emissiveIntensity: 0 });

const SPRAY_GEO = new IcosahedronGeometry(1, 0);
const SPRAY_MAT = mat("#dff7ff", { roughness: 0.3, emissive: "#bfefff", emissiveIntensity: 0.3 });
// Reused every frame so riverAt() never allocates.
const RIVER_OUT = {};

const RING_GEO = new RingGeometry(0.42, 0.6, 48);

function buildHeartGeometry() {
  const s = new Shape();
  s.moveTo(25, 25);
  s.bezierCurveTo(25, 25, 20, 0, 0, 0);
  s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  s.bezierCurveTo(-30, 55, -10, 77, 25, 95);
  s.bezierCurveTo(60, 77, 80, 55, 80, 35);
  s.bezierCurveTo(80, 35, 80, 0, 50, 0);
  s.bezierCurveTo(35, 0, 25, 25, 25, 25);
  const geo = new ExtrudeGeometry(s, { depth: 20, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2, curveSegments: 8 });
  geo.center();
  geo.rotateZ(Math.PI); // authored upside down
  geo.scale(0.0055, 0.0055, 0.0055);
  return geo;
}
const HEART_GEO = buildHeartGeometry();
// Higher emissiveIntensity (a distinct cache key from any other mat(RED, ...)
// caller) keeps the heart scarf-red under tone mapping, instead of washing
// out to coral.
const HEART_MAT = mat(RED, { flat: true, emissive: RED, emissiveIntensity: 0.6 });

const CONFETTI_GEO_ARGS = [0.36, 0.08, 0.24]; // chunky rule: nothing thinner than ~0.12 m at game distance
const CONFETTI_MAT = mat("#ffffff", { flat: true, roughness: 0.6 });
const CONFETTI_COLORS = ["#ffffff", "#ffd66b", RED]; // place.color is prepended per burst

// ---- puff pool ---------------------------------------------------------------

function makePuffPool() {
  return {
    pos: new Float32Array(PUFF_COUNT * 3),
    vel: new Float32Array(PUFF_COUNT * 3),
    age: new Float32Array(PUFF_COUNT).fill(Infinity),
    life: new Float32Array(PUFF_COUNT),
    size: new Float32Array(PUFF_COUNT),
    cursor: 0,
    skidAccum: 0,
    glideAccum: 0,
    alive: 0,
    wasAlive: new Uint8Array(PUFF_COUNT), // last frame's alive flag per slot, so a dead one is hidden once, not every frame
  };
}

// y is size's own resting half-height, not a caller-picked number: a puff
// that spawned below that (as every ground puff used to) hit the ground
// clamp on its very first frame and lost most of its launch speed at birth.
function addPuff(pool, x, z, vx, vy, vz, size, life) {
  const i = pool.cursor;
  pool.cursor = (i + 1) % PUFF_COUNT;
  const finalSize = size * PUFF_SIZE_MUL;
  const b = i * 3;
  pool.pos[b] = x;
  pool.pos[b + 1] = finalSize / 2 + 0.02;
  pool.pos[b + 2] = z;
  pool.vel[b] = vx;
  pool.vel[b + 1] = vy;
  pool.vel[b + 2] = vz;
  pool.age[i] = 0;
  pool.life[i] = life + PUFF_LIFE_ADD;
  pool.size[i] = finalSize;
  if (!pool.wasAlive[i]) pool.alive++;
  pool.wasAlive[i] = 1;
}

// ---- spray pool: river splash droplets + foam wake patches -----------------
// `foam[i]` picks the integration: 0 = droplet (gravity, falls to the water),
// 1 = foam (no gravity, drifts at its spawn velocity, squashed flat by
// squashY so it reads as a patch on the surface, not a bead of water).

function makeSprayPool() {
  return {
    pos: new Float32Array(SPRAY_COUNT * 3),
    vel: new Float32Array(SPRAY_COUNT * 3),
    age: new Float32Array(SPRAY_COUNT).fill(Infinity),
    life: new Float32Array(SPRAY_COUNT),
    size: new Float32Array(SPRAY_COUNT),
    squashY: new Float32Array(SPRAY_COUNT).fill(1),
    foam: new Uint8Array(SPRAY_COUNT),
    cursor: 0,
    foamAccum: 0,
    alive: 0,
    wasAlive: new Uint8Array(SPRAY_COUNT),
  };
}

function addSpray(pool, x, y, z, vx, vy, vz, size, life, foam, squashY) {
  const i = pool.cursor;
  pool.cursor = (i + 1) % SPRAY_COUNT;
  const b = i * 3;
  pool.pos[b] = x;
  pool.pos[b + 1] = y;
  pool.pos[b + 2] = z;
  pool.vel[b] = vx;
  pool.vel[b + 1] = vy;
  pool.vel[b + 2] = vz;
  pool.age[i] = 0;
  pool.life[i] = life;
  pool.size[i] = size;
  pool.foam[i] = foam ? 1 : 0;
  pool.squashY[i] = squashY ?? 1;
  if (!pool.wasAlive[i]) pool.alive++;
  pool.wasAlive[i] = 1;
}

// 22 droplets radiating from the seal: the entry/exit splash.
function splashBurst(pool, x, z) {
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 1;
    addSpray(pool, x, WATER_Y + 0.1, z, Math.cos(a) * r, 3.5 + Math.random() * 1.5, Math.sin(a) * r, 0.12 + Math.random() * 0.08, 0.8, 0);
  }
}

// ---- confetti pool -------------------------------------------------------------

function makeConfettiPool() {
  return {
    pos: new Float32Array(CONFETTI_COUNT * 3),
    vel: new Float32Array(CONFETTI_COUNT * 3),
    tumble: new Float32Array(CONFETTI_COUNT * 3),
    rot: new Float32Array(CONFETTI_COUNT * 3),
    age: new Float32Array(CONFETTI_COUNT).fill(Infinity),
    alive: 0, // every burst activates all CONFETTI_COUNT slots at once, on the same age clock, so one counter (no per-slot flags) is enough
  };
}

const CONFETTI_LIFE = 2.2;

// ---- component -----------------------------------------------------------------

const dummy = new Object3D();

export default function Effects() {
  const reduced = useMemo(
    () => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) || false,
    [],
  );
  const puffMul = reduced ? 0.5 : 1;

  const puffRef = useRef();
  const sprayRef = useRef();
  const confettiRef = useRef();
  const ringRef = useRef();
  const rippleRef = useRef();
  const heartRef = useRef();

  const puffs = useMemo(makePuffPool, []);
  const spray = useMemo(makeSprayPool, []);
  const confetti = useMemo(makeConfettiPool, []);

  // JUMP_IN landing puff: only when the intro was up as this component
  // mounted, so ?play and ?spawn= (started already true) never puff — same
  // arming pattern as seal/variants/D.jsx's hop.
  const started = useUi((s) => s.started);
  const [jumpArmed] = useState(() => !getUi().started);
  const ringMat = useMemo(
    () => new MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, side: DoubleSide, toneMapped: false }),
    [],
  );
  const rippleMat = useMemo(
    () => new MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, side: DoubleSide, toneMapped: false }),
    [],
  );

  const prev = useRef({
    stroke: 0,
    strokeAt: 0,
    strokeFbDist: 0,
    strokeFbX: null,
    strokeFbZ: null,
    gulp: 0,
    impact: 0,
    target: null,
    clearedAt: -Infinity,
    poppedAt: -Infinity,
    ringColor: null,
    jumpPending: false,
    jumpAt: -1,
    jumped: true,
    water: 0,
    foamSide: 1,
  });
  const ring = useRef({ x: 0, z: 0 });
  const heart = useRef({ active: false, start: 0, x: 0, z: 0 });
  const discovered = useRef(new Set());

  useEffect(() => {
    if (started && jumpArmed) prev.current.jumpPending = true;
  }, [started, jumpArmed]);

  // Discovery confetti: watch which building is open.
  const openId = useUi((s) => s.open);
  useEffect(() => {
    if (!openId || discovered.current.has(openId) || reduced) {
      if (openId) discovered.current.add(openId);
      return;
    }
    discovered.current.add(openId);
    const place = PLACE_BY_ID[openId];
    if (!place || !confettiRef.current) return;
    const colors = [place.color, ...CONFETTI_COLORS].map((h) => new Color(h));
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const b = i * 3;
      // In front of the building, not behind the HTML PlaceLabel at 6.5 m.
      confetti.pos[b] = place.x;
      confetti.pos[b + 1] = 3;
      confetti.pos[b + 2] = place.z + place.radius * 0.6;
      const angle = Math.random() * Math.PI * 2;
      const out = 2 + Math.random() * 1.5;
      confetti.vel[b] = Math.cos(angle) * out;
      confetti.vel[b + 1] = 4 + Math.random() * 2;
      confetti.vel[b + 2] = Math.sin(angle) * out;
      confetti.tumble[b] = (Math.random() - 0.5) * 8;
      confetti.tumble[b + 1] = (Math.random() - 0.5) * 8;
      confetti.tumble[b + 2] = (Math.random() - 0.5) * 8;
      confetti.rot[b] = Math.random() * Math.PI;
      confetti.rot[b + 1] = Math.random() * Math.PI;
      confetti.rot[b + 2] = Math.random() * Math.PI;
      confetti.age[i] = 0;
      confettiRef.current.setColorAt(i, colors[i % colors.length]);
    }
    confetti.alive = CONFETTI_COUNT;
    confettiRef.current.instanceColor.needsUpdate = true;
  }, [openId, reduced, confetti]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const seal = live.seal;
    const forwardX = Math.sin(seal.heading);
    const forwardZ = Math.cos(seal.heading);
    const leftX = Math.cos(seal.heading);
    const leftZ = -Math.sin(seal.heading);

    // ---- spawn sources --------------------------------------------------

    // Flipper stroke. Nothing in Seal.jsx increments live.stroke today (a
    // report went to that owner), so once it has gone quiet for 1 s, fall
    // back to firing the same puff pair from distance travelled.
    const st = prev.current;
    const stroke = live.stroke ?? 0;
    let strokeFired = false;
    if (stroke !== st.stroke) {
      st.stroke = stroke;
      st.strokeAt = t;
      strokeFired = true;
    } else if (t - st.strokeAt > 1 && seal.throttle === 1 && seal.speed > 1) {
      if (st.strokeFbX === null) {
        st.strokeFbX = seal.x;
        st.strokeFbZ = seal.z;
      }
      st.strokeFbDist += Math.hypot(seal.x - st.strokeFbX, seal.z - st.strokeFbZ);
      st.strokeFbX = seal.x;
      st.strokeFbZ = seal.z;
      if (st.strokeFbDist >= 1.3) {
        st.strokeFbDist -= 1.3;
        live.stroke = stroke + 1; // also drives Sound.jsx's stroke pair
        st.stroke = live.stroke;
        strokeFired = true;
      }
    } else {
      st.strokeFbDist = 0;
      st.strokeFbX = null;
    }
    if (strokeFired) {
      if (seal.speed > 1) {
        const n = Math.max(1, Math.round(3 * puffMul));
        for (let s = 0; s < 2; s++) {
          const side = SIDES[s];
          const tx = seal.x + leftX * 0.62 * side + forwardX * 0.05;
          const tz = seal.z + leftZ * 0.62 * side + forwardZ * 0.05;
          for (let k = 0; k < n; k++) {
            addPuff(
              puffs,
              tx,
              tz,
              -forwardX * 1.2 + leftX * side * 0.8,
              1.6 + (Math.random() - 0.5),
              -forwardZ * 1.2 + leftZ * side * 0.8,
              0.1 + Math.random() * 0.08,
              0.55 + Math.random() * 0.25,
            );
          }
        }
      }
    }

    // Skid: outward from the flank on the outside of the turn.
    const skid = live.seal.skid ?? 0;
    if (skid > 0.25) {
      const cross = forwardX * seal.vz - forwardZ * seal.vx;
      const side = cross > 0 ? -1 : 1;
      puffs.skidAccum += 45 * skid * puffMul * dt;
      while (puffs.skidAccum >= 1) {
        puffs.skidAccum -= 1;
        addPuff(
          puffs,
          seal.x + leftX * side * 0.5,
          seal.z + leftZ * side * 0.5,
          leftX * side * 2.2,
          1.8,
          leftZ * side * 2.2,
          0.12 + Math.random() * 0.08,
          0.5 + Math.random() * 0.3,
        );
      }
    } else {
      puffs.skidAccum = 0;
    }

    // Glide: throttle 0, coasting fast.
    const throttle = live.seal.throttle ?? 0;
    if (throttle === 0 && seal.speed > 5) {
      puffs.glideAccum += 10 * puffMul * dt;
      while (puffs.glideAccum >= 1) {
        puffs.glideAccum -= 1;
        addPuff(
          puffs,
          seal.x + forwardX * 0.3,
          seal.z + forwardZ * 0.3,
          (Math.random() - 0.5) * 0.4,
          0.8 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.4,
          0.08 + Math.random() * 0.06,
          0.5 + Math.random() * 0.2,
        );
      }
    } else {
      puffs.glideAccum = 0;
    }

    // Bump.
    const impactRise = seal.impact - prev.current.impact;
    prev.current.impact = seal.impact;
    if (impactRise >= 0.12) {
      const m = Math.min(1, seal.impact);
      const count = Math.max(1, Math.round((12 + 14 * m) * puffMul));
      const bx = seal.x + forwardX * 1;
      const bz = seal.z + forwardZ * 1;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const rx = Math.cos(a);
        const rz = Math.sin(a);
        const rs = 3 + 3 * m; // reads from 35 m; 1.5 + 2.5m used to vanish at that distance
        addPuff(puffs, bx, bz, rx * rs, 1.2 + 1.5 * m, rz * rs, 0.14 + Math.random() * 0.1, 0.5 + Math.random() * 0.3);
      }
    }

    // JUMP_IN landing puff: fires once, JUMP_IN.landAt after the "Start
    // sliding" press (skipped entirely on ?play / ?spawn=, see jumpArmed).
    if (st.jumpPending) {
      st.jumpPending = false;
      if (t > SKIP_WINDOW) {
        st.jumpAt = t;
        st.jumped = false;
      }
    }
    if (!st.jumped && st.jumpAt >= 0 && t - st.jumpAt >= JUMP_IN.landAt) {
      st.jumped = true;
      // 24 puffs at 5.5 m/s spread to about 1.4 m: clear of the seal and
      // readable from 35 m, where the old 3.2 m/s ring spread 0.22 m and
      // stayed hidden under it.
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        addPuff(puffs, seal.x, seal.z, Math.cos(a) * 5.5, 0.9, Math.sin(a) * 5.5, 0.28, 0.9);
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        addPuff(puffs, seal.x, seal.z, Math.cos(a) * 0.3, 2.4, Math.sin(a) * 0.3, 0.16, 0.8);
      }
    }

    // River splash (entry/exit) + foaming wake + bow wave while swimming.
    const water = seal.water ?? 0;
    if ((water > 0.05) !== (st.water > 0.05)) splashBurst(spray, seal.x, seal.z);
    st.water = water;

    if (water > 0.05 && seal.speed > 1.5) {
      riverAt(seal.x, seal.z, RIVER_OUT);
      spray.foamAccum += 16 * puffMul * dt;
      while (spray.foamAccum >= 1) {
        spray.foamAccum -= 1;
        const side = (st.foamSide = -st.foamSide);
        addSpray(
          spray,
          seal.x - forwardX * 0.9 + leftX * 0.45 * side,
          WATER_Y + 0.06,
          seal.z - forwardZ * 0.9 + leftZ * 0.45 * side,
          RIVER_OUT.flowX * 0.7,
          0.2,
          RIVER_OUT.flowZ * 0.7,
          0.16 + Math.random() * 0.06,
          1.4,
          1,
          0.35,
        );
      }
      if (strokeFired) {
        const nx = seal.x + forwardX * 0.95;
        const nz = seal.z + forwardZ * 0.95;
        addSpray(spray, nx, WATER_Y + 0.12, nz, leftX * 1.6, 1.8, leftZ * 1.6, 0.14, 0.6, 0, 1);
        addSpray(spray, nx, WATER_Y + 0.12, nz, -leftX * 1.6, 1.8, -leftZ * 1.6, 0.14, 0.6, 0, 1);
      }
    } else {
      spray.foamAccum = 0;
    }

    // Prop / penguin shoves.
    for (const p of live.props) {
      const rise = p.hit - (p._effHit ?? 0);
      p._effHit = p.hit;
      if (rise >= 0.2) {
        const n = Math.max(1, Math.round(10 * puffMul));
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          addPuff(puffs, p.x, p.z, Math.cos(a) * 1.2, 1 + Math.random() * 0.6, Math.sin(a) * 1.2, 0.1 + Math.random() * 0.06, 0.4 + Math.random() * 0.2);
        }
      }
    }

    // Gulp: puffs at the nose, plus the heart.
    const gulp = live.gulp ?? 0;
    if (gulp !== prev.current.gulp) {
      prev.current.gulp = gulp;
      const n = Math.max(1, Math.round(6 * puffMul));
      const nx = seal.x + forwardX * 0.95;
      const nz = seal.z + forwardZ * 0.95;
      for (let i = 0; i < n; i++) {
        addPuff(puffs, nx, nz, (Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.06 + Math.random() * 0.05, 0.4 + Math.random() * 0.2);
      }
      heart.current.active = true;
      heart.current.start = t;
      heart.current.x = seal.x;
      heart.current.z = seal.z;
    }

    // ---- puff integration + draw -----------------------------------------
    // Gated on puffs.alive: standing still for a while, every slot is
    // already hidden (written once, on the frame it died) and nothing here
    // needs to touch the 160 matrices or re-upload the buffer.

    const mesh = puffRef.current;
    if (mesh && puffs.alive > 0) {
      for (let i = 0; i < PUFF_COUNT; i++) {
        if (!puffs.wasAlive[i]) continue;
        const age = puffs.age[i] + dt;
        puffs.age[i] = age;
        const life = puffs.life[i];
        if (age >= life) {
          dummy.position.set(0, -1000, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          puffs.wasAlive[i] = 0;
          puffs.alive--;
          continue;
        }
        const b = i * 3;
        puffs.vel[b + 1] -= 7 * dt;
        puffs.pos[b] += puffs.vel[b] * dt;
        puffs.pos[b + 1] += puffs.vel[b + 1] * dt;
        puffs.pos[b + 2] += puffs.vel[b + 2] * dt;
        const size = puffs.size[i];
        // Only clamp while still falling: catching it on the way back UP
        // (e.g. spawned exactly at rest height) used to kill 60% of its
        // speed on its very first frame, every frame it stayed near the
        // ground.
        if (puffs.pos[b + 1] <= size / 2 && puffs.vel[b + 1] < 0) {
          puffs.pos[b + 1] = size / 2;
          puffs.vel[b + 1] = 0;
          const decay = Math.exp(-4 * dt);
          puffs.vel[b] *= decay;
          puffs.vel[b + 2] *= decay;
        }
        const u = age / life;
        const scale = Math.max(0, size * (1 - u * u));
        dummy.position.set(puffs.pos[b], puffs.pos[b + 1], puffs.pos[b + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ---- spray integration + draw ------------------------------------------

    const smesh = sprayRef.current;
    if (smesh && spray.alive > 0) {
      for (let i = 0; i < SPRAY_COUNT; i++) {
        if (!spray.wasAlive[i]) continue;
        const age = spray.age[i] + dt;
        spray.age[i] = age;
        const life = spray.life[i];
        if (age >= life) {
          dummy.position.set(0, -1000, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          smesh.setMatrixAt(i, dummy.matrix);
          spray.wasAlive[i] = 0;
          spray.alive--;
          continue;
        }
        const b = i * 3;
        if (spray.foam[i]) {
          // Foam drifts on the surface: no gravity, its spawn velocity is
          // the flow itself.
          spray.pos[b] += spray.vel[b] * dt;
          spray.pos[b + 2] += spray.vel[b + 2] * dt;
        } else {
          spray.vel[b + 1] -= 9 * dt;
          spray.pos[b] += spray.vel[b] * dt;
          spray.pos[b + 1] += spray.vel[b + 1] * dt;
          spray.pos[b + 2] += spray.vel[b + 2] * dt;
          if (spray.pos[b + 1] < WATER_Y + 0.02) spray.pos[b + 1] = WATER_Y + 0.02;
        }
        const u = age / life;
        const size = Math.max(0, spray.size[i] * (1 - u * u));
        dummy.position.set(spray.pos[b], spray.pos[b + 1], spray.pos[b + 2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(size, size * spray.squashY[i], size);
        dummy.updateMatrix();
        smesh.setMatrixAt(i, dummy.matrix);
      }
      smesh.instanceMatrix.needsUpdate = true;
    }

    // ---- confetti integration + draw --------------------------------------

    const cmesh = confettiRef.current;
    if (cmesh && confetti.alive > 0) {
      let stillAlive = false;
      for (let i = 0; i < CONFETTI_COUNT; i++) {
        const age = confetti.age[i] + dt;
        confetti.age[i] = age;
        if (age >= CONFETTI_LIFE) {
          dummy.scale.setScalar(0);
          dummy.position.set(0, -1000, 0);
          dummy.updateMatrix();
          cmesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        stillAlive = true;
        const b = i * 3;
        confetti.vel[b + 1] -= 4 * dt;
        const drag = 1 - Math.min(1, 0.8 * dt);
        confetti.vel[b] *= drag;
        confetti.vel[b + 1] *= drag;
        confetti.vel[b + 2] *= drag;
        confetti.pos[b] += confetti.vel[b] * dt;
        confetti.pos[b + 1] += confetti.vel[b + 1] * dt;
        confetti.pos[b + 2] += confetti.vel[b + 2] * dt;
        confetti.rot[b] += confetti.tumble[b] * dt;
        confetti.rot[b + 1] += confetti.tumble[b + 1] * dt;
        confetti.rot[b + 2] += confetti.tumble[b + 2] * dt;
        dummy.position.set(confetti.pos[b], confetti.pos[b + 1], confetti.pos[b + 2]);
        dummy.rotation.set(confetti.rot[b], confetti.rot[b + 1], confetti.rot[b + 2]);
        dummy.scale.setScalar(age > CONFETTI_LIFE - 0.3 ? Math.max(0, (CONFETTI_LIFE - age) / 0.3) : 1);
        dummy.updateMatrix();
        cmesh.setMatrixAt(i, dummy.matrix);
      }
      if (!stillAlive) confetti.alive = 0;
      cmesh.instanceMatrix.needsUpdate = true;
    }

    // ---- click ring + ripple -----------------------------------------------

    const target = live.target;
    const hasTarget = !!target;
    if (target !== st.target) {
      st.target = target;
      if (hasTarget) {
        st.poppedAt = t;
        ring.current.x = target.x;
        ring.current.z = target.z;
      } else {
        st.clearedAt = t;
      }
    }

    const ringMesh = ringRef.current;
    const rippleMesh = rippleRef.current;
    if (ringMesh && rippleMesh) {
      const color = live.pendingOpen ? PLACE_BY_ID[live.pendingOpen]?.color ?? RED : RED;
      if (color !== st.ringColor) {
        st.ringColor = color;
        ringMat.color.set(color);
        rippleMat.color.set(color);
      }

      let ringScale = 0;
      let ringVisible = false;
      if (hasTarget) {
        ringVisible = true;
        const popU = Math.min(1, (t - st.poppedAt) / 0.28);
        const pulse = 1 + 0.06 * Math.sin(Math.PI * 2 * 1.4 * t);
        ringScale = popU < 1 ? 1.8 + (1 - 1.8) * easeOutBack(popU) : pulse;
      } else {
        const u = Math.min(1, (t - st.clearedAt) / 0.15);
        ringScale = 1 - u;
        ringVisible = ringScale > 0.001;
      }
      ringMesh.visible = ringVisible;
      if (ringVisible) {
        ringMesh.position.set(ring.current.x, 0.035, ring.current.z);
        ringMesh.scale.setScalar(ringScale);
      }

      // One-shot ripple, independent of how long the target itself lasts.
      const rippleU = (t - st.poppedAt) / 0.5;
      rippleMesh.visible = rippleU >= 0 && rippleU < 1;
      if (rippleMesh.visible) {
        rippleMesh.position.set(ring.current.x, 0.035, ring.current.z);
        rippleMesh.scale.setScalar(1 + rippleU * 1.2);
        rippleMat.opacity = 0.9 * (1 - rippleU);
      }
    }

    // ---- heart --------------------------------------------------------------

    const heartMesh = heartRef.current;
    if (heartMesh) {
      const h = heart.current;
      if (h.active) {
        // Ride along with the seal, not stay pinned at the eat point.
        h.x = seal.x;
        h.z = seal.z;
        const u = Math.min(1, (t - h.start) / 1);
        const y = 1.9 + (2.7 - 1.9) * smoothstep(0, 1, u);
        let scale;
        if (u < 0.25) scale = easeOutBack(u / 0.25);
        else if (u < 0.75) scale = 1;
        else scale = Math.max(0, 1 - (u - 0.75) / 0.25);
        heartMesh.visible = true;
        heartMesh.position.set(h.x, y, h.z);
        heartMesh.scale.setScalar(scale);
        if (u >= 1) h.active = false;
      } else {
        heartMesh.visible = false;
      }
    }
  });

  return (
    <>
      <instancedMesh ref={puffRef} args={[PUFF_GEO, PUFF_MAT, PUFF_COUNT]} castShadow frustumCulled={false} />
      <instancedMesh ref={sprayRef} args={[SPRAY_GEO, SPRAY_MAT, SPRAY_COUNT]} frustumCulled={false} />
      <instancedMesh ref={confettiRef} args={[undefined, CONFETTI_MAT, CONFETTI_COUNT]} frustumCulled={false}>
        <boxGeometry args={CONFETTI_GEO_ARGS} />
      </instancedMesh>
      <mesh ref={rippleRef} geometry={RING_GEO} material={rippleMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} visible={false} />
      <mesh ref={ringRef} geometry={RING_GEO} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} visible={false} />
      <mesh ref={heartRef} geometry={HEART_GEO} material={HEART_MAT} rotation={[-0.866, 0, 0]} visible={false} />
      <Radiation />
    </>
  );
}
