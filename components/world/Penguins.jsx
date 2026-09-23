"use client";

// Six penguins in two groups. Physics (collision vs the seal, props,
// buildings, other penguins, the rim) is entirely lib/world/motion.js; this
// file only decides where each one WANTS to go (useFrame priority -2, before
// Controller steps physics) and draws the pose that results.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, ConeGeometry, Float32BufferAttribute, LatheGeometry, Matrix4, Object3D, SphereGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SPAWN } from "../../lib/world/places";
import { live } from "../../lib/world/store";
import { samplePoints, mulberry32, inNameBox } from "./life/spawn";
import { damp, smoothstep, wrapAngle } from "./life/util";
import { C } from "./palette";

const SEED = 20260924;
const SIDES = [-1, 1];

const GROUPS = [
  { id: "A", near: { x: SPAWN.x + 11, z: SPAWN.z + 2 }, nearRadius: 3, radius: 2.8, roster: ["adult", "adult", "chick"] },
  { id: "B", near: { x: SPAWN.x, z: SPAWN.z + 21 }, nearRadius: 10, radius: 4, roster: ["adult", "adult", "adult"] },
];

// ---- geometry, built once -------------------------------------------------

function setColor(geometry, rgb) {
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = rgb.r;
    arr[i * 3 + 1] = rgb.g;
    arr[i * 3 + 2] = rgb.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

function buildBody() {
  const profile = [
    [0, 0], [0.3, 0.08], [0.36, 0.3], [0.33, 0.55], [0.24, 0.78], [0.12, 0.9], [0, 0.93],
  ].map(([r, y]) => new Vector2(r, y));
  const body = new LatheGeometry(profile, 20).toNonIndexed();

  const dark = new Color(C.charcoal);
  const white = new Color("#fbf8f2");
  {
    const pos = body.attributes.position;
    const nrm = body.attributes.normal;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const nz = nrm.getZ(i);
      // A wider belly, plus a white face patch above it wherever the normal
      // still faces forward: a fleeing penguin (which always faces away from
      // the seal) reads as black from the fixed 3/4 camera otherwise.
      const belly = y < 0.74 ? smoothstep(0.0, 0.3, nz) : y < 0.84 && nz > 0.4 ? 1 : 0;
      const c = dark.clone().lerp(white, belly);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    body.setAttribute("color", new Float32BufferAttribute(arr, 3));
  }

  const beak = new ConeGeometry(0.07, 0.2, 6).toNonIndexed();
  beak.rotateX(Math.PI / 2); // +Y apex -> +Z apex
  beak.translate(0, 0.72, 0.3);
  setColor(beak, new Color("#ffb23e"));

  const eyeParts = [];
  for (const sx of [-0.1, 0.1]) {
    const eye = new SphereGeometry(0.06, 10, 8).toNonIndexed();
    eye.translate(sx, 0.8, 0.21);
    setColor(eye, new Color("#ffffff"));
    const pupil = new SphereGeometry(0.032, 8, 6).toNonIndexed();
    pupil.translate(sx, 0.8, 0.26);
    setColor(pupil, dark);
    eyeParts.push(eye, pupil);
  }

  return mergeGeometries([body, beak, ...eyeParts], false);
}

// Sphere squashed flat, one end at the pivot (the shoulder), so rotating the
// mesh swings the flipper like an arm.
function buildFlipper() {
  const g = new SphereGeometry(1, 12, 8);
  g.scale(0.05, 0.26, 0.12);
  g.translate(0, -0.26, 0); // pivot (top end) sits at the local origin
  return setColor(g, new Color(C.charcoal));
}

function buildFoot() {
  const g = new SphereGeometry(1, 10, 6);
  g.scale(0.09, 0.04, 0.13);
  return setColor(g, new Color("#ffb23e"));
}

const BODY_GEO = buildBody();
const FLIPPER_GEO = buildFlipper();
const FOOT_GEO = buildFoot();

// ---- seeded roster, built once ---------------------------------------------

function buildFlock() {
  const centers = [];
  for (const g of GROUPS) {
    centers.push(
      samplePoints(1, SEED + centers.length, {
        gap: 9,
        avoid: centers.slice(),
        near: g.near,
        nearCount: 1,
        nearRadius: g.nearRadius,
        clearance: g.radius + 1, // keeps the whole wander disc, not just the sampled centre, off buildings/dock/spawn/name
      })[0],
    );
  }

  const flock = [];
  GROUPS.forEach((g, gi) => {
    const home = centers[gi];
    const rand = mulberry32(SEED + 500 + gi);
    g.roster.forEach((role) => {
      const r = Math.sqrt(rand()) * g.radius * 0.6;
      const a = rand() * Math.PI * 2;
      const chick = role === "chick";
      flock.push({
        kind: "penguin",
        x: home.x + Math.cos(a) * r,
        z: home.z + Math.sin(a) * r,
        vx: 0,
        vz: 0,
        radius: chick ? 0.26 : 0.38,
        mass: chick ? 0.3 : 0.6,
        spin: 0,
        hit: 0,
        chick,
        homeX: home.x,
        homeZ: home.z,
        groupRadius: g.radius,
        rand: mulberry32(Math.floor(rand() * 1e9)),
        // behaviour state
        state: "wander",
        targetX: 0,
        targetZ: 0,
        hasTarget: false,
        pauseUntil: 0,
        walkHome: false,
        hopping: false,
        hopStart: 0,
        hopIndex: 0,
        calmSince: -1,
        flopStart: 0,
        prevHit: 0,
        // pose
        yaw: Math.atan2(-home.x, -home.z),
        phase: 0,
        pitch: 0,
        flipperRaise: 0,
        flap: 0,
        hop: 0,
      });
    });
  });
  return flock;
}

// ---- component --------------------------------------------------------------

const dummy = new Object3D();
const shoulder = new Object3D();
const bodyMat = new Matrix4();

export default function Penguins() {
  const flock = useMemo(buildFlock, []);
  const bodyRef = useRef();
  const flipperRef = useRef();
  const footRef = useRef();

  useEffect(() => {
    live.props.push(...flock);
    if (bodyRef.current) {
      const white = new Color("#ffffff");
      const chickTint = new Color("#bcc3cf");
      flock.forEach((p, i) => bodyRef.current.setColorAt(i, p.chick ? chickTint : white));
      bodyRef.current.instanceColor.needsUpdate = true;
    }
    return () => {
      for (const p of flock) {
        const i = live.props.indexOf(p);
        if (i !== -1) live.props.splice(i, 1);
      }
    };
  }, [flock]);

  // Steer, before Controller's physics step.
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const seal = live.seal;

    for (const p of flock) {
      const dx = seal.x - p.x;
      const dz = seal.z - p.z;
      const distSeal = Math.hypot(dx, dz) || 1e-6;

      const hitRise = p.hit - p.prevHit;
      if (hitRise >= 0.15) {
        live.squeak = (live.squeak ?? 0) + 1;
        if (p.hit >= 0.35 && p.state !== "flop") {
          p.state = "flop";
          p.flopStart = t;
        }
      }
      p.prevHit = p.hit;

      let desiredX = 0;
      let desiredZ = 0;

      if (p.state === "flop") {
        const el = t - p.flopStart;
        if (el < 0.15) {
          p.pitch = (el / 0.15) * 1.35;
        } else if (el < 1.1) {
          p.pitch = 1.35;
        } else if (el < 1.35) {
          const u = (el - 1.1) / 0.25;
          p.pitch = 1.35 * (1 - u);
          p.hop = Math.sin(Math.PI * u) * 0.18;
        } else {
          p.state = "wander";
          p.pitch = 0;
          p.hop = 0;
          p.hasTarget = false;
        }
        p.flipperRaise = 0;
        // No steering: momentum and the shared prop friction carry the slide.
      } else {
        const flee = (distSeal < 5.5 && seal.speed > 1.2) || distSeal < 2.8;
        if (flee) {
          p.state = "flee";
          p.calmSince = -1;
        } else if (p.state === "flee") {
          if (distSeal > 8.5) {
            if (p.calmSince < 0) p.calmSince = t;
            else if (t - p.calmSince > 1.2) {
              p.state = "wander";
              p.targetX = p.homeX;
              p.targetZ = p.homeZ;
              p.hasTarget = true;
              p.walkHome = true;
              p.pauseUntil = 0;
            }
          } else {
            p.calmSince = -1;
          }
        }

        if (p.state === "flee") {
          const speed = p.chick ? 2.6 : 3.2;
          desiredX = (-dx / distSeal) * speed;
          desiredZ = (-dz / distSeal) * speed;
          p.pitch = 0.25;
          p.flipperRaise = 0.9;
          p.flap += dt * 9 * Math.PI * 2;
        } else {
          p.pitch = 0;
          p.flipperRaise = 0;
          if (p.hopping) {
            const el = t - p.hopStart;
            if (el < 0.4) {
              p.hop = Math.sin(Math.PI * (el / 0.4)) * 0.2;
            } else {
              p.hopIndex += 1;
              p.hop = 0;
              if (p.hopIndex < 2) p.hopStart = t;
              else p.hopping = false;
            }
          } else {
            p.hop = 0;
          }

          if (p.pauseUntil > t) {
            // paused: curious toward the seal if close, otherwise still
          } else if (!p.hasTarget) {
            let tx = p.homeX;
            let tz = p.homeZ;
            for (let tries = 0; tries < 8; tries++) {
              const r = Math.sqrt(p.rand()) * p.groupRadius * 0.9;
              const a = p.rand() * Math.PI * 2;
              tx = p.homeX + Math.cos(a) * r;
              tz = p.homeZ + Math.sin(a) * r;
              if (!inNameBox(tx, tz, 0.6)) break;
            }
            p.targetX = tx;
            p.targetZ = tz;
            p.hasTarget = true;
          } else {
            const tx = p.targetX - p.x;
            const tz = p.targetZ - p.z;
            const d = Math.hypot(tx, tz);
            if (d < 0.4) {
              p.hasTarget = false;
              p.pauseUntil = t + 1.5 + p.rand() * 2.5;
              p.walkHome = false;
              p.hopping = p.rand() < 0.08;
              p.hopIndex = 0;
              p.hopStart = t;
            } else {
              const speed = p.walkHome ? 1.2 : 0.9;
              desiredX = (tx / d) * speed;
              desiredZ = (tz / d) * speed;
            }
          }
        }

        // Separation from the rest of the flock.
        for (const q of flock) {
          if (q === p) continue;
          const sx = p.x - q.x;
          const sz = p.z - q.z;
          const d = Math.hypot(sx, sz) || 1e-6;
          if (d < 1.1) {
            desiredX += (sx / d) * (1.1 - d) * 1.5;
            desiredZ += (sz / d) * (1.1 - d) * 1.5;
          }
        }
        // Stay inside the island.
        const r = Math.hypot(p.x, p.z);
        if (r > 34) {
          desiredX += (-p.x / r) * (r - 34);
          desiredZ += (-p.z / r) * (r - 34);
        }

        const k = damp(5, dt);
        p.vx += (desiredX - p.vx) * k;
        p.vz += (desiredZ - p.vz) * k;
      }

      // Facing.
      const spd = Math.hypot(p.vx, p.vz);
      let face = null;
      if (spd > 0.15) face = Math.atan2(p.vx, p.vz);
      else if (p.state === "wander" && p.pauseUntil > t && distSeal < 10) face = Math.atan2(dx, dz);
      if (face !== null) p.yaw = wrapAngle(p.yaw + wrapAngle(face - p.yaw) * damp(8, dt));

      // Waddle.
      if (p.state !== "flop") {
        p.phase += spd * dt * 10;
      }
    }
  }, -2);

  // Draw.
  useFrame(() => {
    const bodies = bodyRef.current;
    const flippers = flipperRef.current;
    const feet = footRef.current;
    if (!bodies || !flippers || !feet) return;

    for (let i = 0; i < flock.length; i++) {
      const p = flock[i];
      const roll = p.state === "flop" ? 0 : Math.sin(p.phase) * 0.16 * Math.min(1, Math.hypot(p.vx, p.vz) / 0.6);
      const bob = p.state === "flop" ? 0 : Math.abs(Math.sin(p.phase)) * 0.04;
      const scale = p.chick ? 0.62 : 1;

      dummy.position.set(p.x, bob + p.hop, p.z);
      // Default Euler order 'XYZ' tips pitch/roll about world X, sideways
      // for a penguin facing +-x; 'YXZ' keeps pitch and roll on the body's
      // own axes regardless of yaw.
      dummy.rotation.set(p.pitch, p.yaw, roll, "YXZ");
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      bodyMat.copy(dummy.matrix);

      // Flippers: bodyMatrix * shoulder(position, rotation).
      const flap = p.flipperRaise > 0 ? Math.sin(p.flap) * 0.4 : 0;
      for (let s = 0; s < 2; s++) {
        const side = SIDES[s];
        shoulder.position.set(0.32 * side, 0.62, 0);
        shoulder.rotation.set(0, 0, side * (p.flipperRaise + flap));
        shoulder.updateMatrix();
        dummy.matrix.multiplyMatrices(bodyMat, shoulder.matrix);
        flippers.setMatrixAt(i * 2 + s, dummy.matrix);
      }

      // Feet: yawed with the penguin but not rolled or pitched with the body.
      for (let s = 0; s < 2; s++) {
        const side = SIDES[s];
        const stepPhase = side < 0 ? p.phase : p.phase + Math.PI;
        const localX = 0.12 * side * scale;
        const localZ = (0.08 + 0.06 * Math.sin(stepPhase)) * scale;
        const lift = Math.max(0, Math.sin(stepPhase)) * 0.05;
        dummy.position.set(
          p.x + localX * Math.cos(p.yaw) + localZ * Math.sin(p.yaw),
          0.03 * scale + lift,
          p.z - localX * Math.sin(p.yaw) + localZ * Math.cos(p.yaw),
        );
        dummy.rotation.set(0, p.yaw, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        feet.setMatrixAt(i * 2 + s, dummy.matrix);
      }
    }

    bodies.instanceMatrix.needsUpdate = true;
    flippers.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[BODY_GEO, undefined, flock.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={flipperRef} args={[FLIPPER_GEO, undefined, flock.length * 2]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={footRef} args={[FOOT_GEO, undefined, flock.length * 2]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
    </>
  );
}
