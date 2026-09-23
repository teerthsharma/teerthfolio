"use client";

// Pooled particles, the click ring, the gulp heart, and discovery confetti.
// Every pool is a fixed-size InstancedMesh written from preallocated typed
// arrays; nothing here allocates once the component has mounted.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
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
import { PLACE_BY_ID } from "../../lib/world/places";
import { live, useUi } from "../../lib/world/store";
import { easeOutBack, smoothstep } from "./life/util";
import { mat } from "./palette";

const PUFF_COUNT = 120;
const CONFETTI_COUNT = 48;
const RED = "#ff5040";
const SIDES = [-1, 1];
const PUFF_SIZE_MUL = 1.6; // white-on-white puffs were unreadable from the ~35 m camera
const PUFF_LIFE_ADD = 0.2;

// ---- geometry / material, built once ---------------------------------------

const PUFF_GEO = new IcosahedronGeometry(1, 0);
const PUFF_MAT = mat("#ffffff", { flat: true, roughness: 1, emissive: "#dfe8ff", emissiveIntensity: 0.4 });

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

const CONFETTI_GEO_ARGS = [0.32, 0.03, 0.2];
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
  };
}

function addPuff(pool, x, y, z, vx, vy, vz, size, life) {
  const i = pool.cursor;
  pool.cursor = (i + 1) % PUFF_COUNT;
  const b = i * 3;
  pool.pos[b] = x;
  pool.pos[b + 1] = y;
  pool.pos[b + 2] = z;
  pool.vel[b] = vx;
  pool.vel[b + 1] = vy;
  pool.vel[b + 2] = vz;
  pool.age[i] = 0;
  pool.life[i] = life + PUFF_LIFE_ADD;
  pool.size[i] = size * PUFF_SIZE_MUL;
}

// ---- confetti pool -------------------------------------------------------------

function makeConfettiPool() {
  return {
    pos: new Float32Array(CONFETTI_COUNT * 3),
    vel: new Float32Array(CONFETTI_COUNT * 3),
    tumble: new Float32Array(CONFETTI_COUNT * 3),
    rot: new Float32Array(CONFETTI_COUNT * 3),
    age: new Float32Array(CONFETTI_COUNT).fill(Infinity),
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
  const confettiRef = useRef();
  const ringRef = useRef();
  const rippleRef = useRef();
  const heartRef = useRef();

  const puffs = useMemo(makePuffPool, []);
  const confetti = useMemo(makeConfettiPool, []);
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
  });
  const ring = useRef({ x: 0, z: 0 });
  const heart = useRef({ active: false, start: 0, x: 0, z: 0 });
  const discovered = useRef(new Set());

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
              0.08,
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
          0.1,
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
          0.35,
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
        const rs = 1.5 + 2.5 * m;
        addPuff(puffs, bx, 0.1, bz, rx * rs, 1.2 + 1.5 * m, rz * rs, 0.14 + Math.random() * 0.1, 0.5 + Math.random() * 0.3);
      }
    }

    // Prop / penguin shoves.
    for (const p of live.props) {
      const rise = p.hit - (p._effHit ?? 0);
      p._effHit = p.hit;
      if (rise >= 0.2) {
        const n = Math.max(1, Math.round(10 * puffMul));
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          addPuff(puffs, p.x, 0.06, p.z, Math.cos(a) * 1.2, 1 + Math.random() * 0.6, Math.sin(a) * 1.2, 0.1 + Math.random() * 0.06, 0.4 + Math.random() * 0.2);
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
        addPuff(puffs, nx, 0.15, nz, (Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.06 + Math.random() * 0.05, 0.4 + Math.random() * 0.2);
      }
      heart.current.active = true;
      heart.current.start = t;
      heart.current.x = seal.x;
      heart.current.z = seal.z;
    }

    // ---- puff integration + draw -----------------------------------------

    const mesh = puffRef.current;
    if (mesh) {
      for (let i = 0; i < PUFF_COUNT; i++) {
        const age = puffs.age[i] + dt;
        puffs.age[i] = age;
        const life = puffs.life[i];
        if (age >= life) {
          dummy.position.set(0, -1000, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const b = i * 3;
        puffs.vel[b + 1] -= 7 * dt;
        puffs.pos[b] += puffs.vel[b] * dt;
        puffs.pos[b + 1] += puffs.vel[b + 1] * dt;
        puffs.pos[b + 2] += puffs.vel[b + 2] * dt;
        const size = puffs.size[i];
        if (puffs.pos[b + 1] <= size / 2) {
          puffs.pos[b + 1] = size / 2;
          puffs.vel[b] *= 0.4;
          puffs.vel[b + 1] *= 0.4;
          puffs.vel[b + 2] *= 0.4;
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

    // ---- confetti integration + draw --------------------------------------

    const cmesh = confettiRef.current;
    if (cmesh) {
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
      <instancedMesh ref={puffRef} args={[PUFF_GEO, PUFF_MAT, PUFF_COUNT]} frustumCulled={false} />
      <instancedMesh ref={confettiRef} args={[undefined, CONFETTI_MAT, CONFETTI_COUNT]} frustumCulled={false}>
        <boxGeometry args={CONFETTI_GEO_ARGS} />
      </instancedMesh>
      <mesh ref={rippleRef} geometry={RING_GEO} material={rippleMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} visible={false} />
      <mesh ref={ringRef} geometry={RING_GEO} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} visible={false} />
      <mesh ref={heartRef} geometry={HEART_GEO} material={HEART_MAT} rotation={[-0.866, 0, 0]} visible={false} />
    </>
  );
}
