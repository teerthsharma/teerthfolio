"use client";

// Penguins in six groups, island-wide. Physics (collision vs the seal, props,
// buildings, other penguins, the rim) is entirely lib/world/motion.js; this
// file only decides where each one WANTS to go (useFrame priority -2, before
// Controller steps physics) and draws the pose that results.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, ConeGeometry, OctahedronGeometry, Float32BufferAttribute, LatheGeometry, Matrix4, Object3D, SphereGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ISLAND_RADIUS } from "../../lib/world/places";
import { riverAt } from "../../lib/world/river";
import { live } from "../../lib/world/store";
import { inNameBox } from "./life/spawn";
import { buildFlock } from "./life/penguins-seed";
import { damp, easeOutBack, smoothstep, wrapAngle } from "./life/util";
import { tickSnack } from "./life/snack";
import { C } from "./palette";

const SIDES = [-1, 1];
const WANDER_EDGE = ISLAND_RADIUS - 5; // penguins turn back this far from the rim
// Reused every penguin, every frame, so the water-avoid steer never allocates.
const PENGUIN_RIVER_OUT = {};
const PENGUIN_RIVER_OUT2 = {};

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
  const patch = new Color("#ffb23e");
  {
    const pos = body.attributes.position;
    const nrm = body.attributes.normal;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const nz = nrm.getZ(i);
      const nx = nrm.getX(i);
      // A wider belly, plus a white face patch above it wherever the normal
      // still faces forward: a fleeing penguin (which always faces away from
      // the seal) reads as black from the fixed 3/4 camera otherwise. An
      // emperor-style gold side patch does the same job from behind, where
      // neither the belly nor the face patch is ever visible.
      const belly = y < 0.74 ? smoothstep(0.0, 0.3, nz) : y < 0.84 && nz > 0.4 ? 1 : 0;
      const c = y > 0.74 && y < 0.84 && Math.abs(nx) > 0.6 ? patch : dark.clone().lerp(white, belly);
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
  g.scale(0.07, 0.26, 0.12); // 0.14 m across: 0.05 read as a thread at 35 m
  g.translate(0, -0.26, 0); // pivot (top end) sits at the local origin
  return setColor(g, new Color(C.charcoal));
}

function buildFoot() {
  const g = new SphereGeometry(1, 10, 6);
  g.scale(0.09, 0.04, 0.13);
  return setColor(g, new Color("#ffb23e"));
}

// The hidden snack: a pastel-pink fish-cake with a cream belly, a tail and an
// eye, built along +Z like the penguin.
function buildSnack() {
  const body = new SphereGeometry(0.34, 14, 10).toNonIndexed();
  body.scale(0.8, 0.8, 1.25);
  body.translate(0, 0.38, 0);
  setColor(body, new Color("#ffb3c1"));
  const belly = new SphereGeometry(0.3, 12, 8).toNonIndexed();
  belly.scale(0.75, 0.55, 1.15);
  belly.translate(0, 0.27, 0.03);
  setColor(belly, new Color("#fff1dc"));
  const tail = new ConeGeometry(0.2, 0.34, 3).toNonIndexed();
  tail.rotateX(-Math.PI / 2); // apex toward -Z
  tail.rotateZ(Math.PI / 2);
  tail.translate(0, 0.4, -0.5);
  setColor(tail, new Color("#ff8fa6"));
  const eye = new SphereGeometry(0.05, 8, 6).toNonIndexed();
  eye.translate(0.2, 0.5, 0.3);
  setColor(eye, new Color(C.charcoal));
  const eye2 = eye.clone();
  eye2.translate(-0.4, 0, 0);
  return mergeGeometries([body, belly, tail, eye, eye2], false);
}
function buildSparkle() {
  const g = new OctahedronGeometry(0.1, 0).toNonIndexed();
  g.scale(0.7, 1.3, 0.7);
  return setColor(g, new Color("#fff3a8"));
}

const BODY_GEO = buildBody();
const SNACK_GEO = buildSnack();
const SPARKLE_GEO = buildSparkle();
const FLIPPER_GEO = buildFlipper();
const FOOT_GEO = buildFoot();

// ---- component --------------------------------------------------------------
// Seed layout (GROUPS, buildFlock) lives in ./life/penguins-seed.js: no JSX
// there, so it doubles as Node-runnable regression coverage (spawn.check.mjs).

const dummy = new Object3D();
const shoulder = new Object3D();
const bodyMat = new Matrix4();

export default function Penguins() {
  const flock = useMemo(buildFlock, []);
  const bodyRef = useRef();
  const flipperRef = useRef();
  const footRef = useRef();
  const snackRef = useRef();
  const sparkleRef = useRef();

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
      tickSnack(p, t, flock, live);
      if (p.gone) continue;
      if (p.edible) {
        // A snack stands still and bobs; the shared prop friction stops its slide.
        p.state = "wander";
        p.hasTarget = false;
        p.pitch = p.hop = p.flipperRaise = 0;
        p.prevHit = p.hit;
        continue;
      }
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
          if (p.state !== "flee" && p.state !== "startle") {
            // Notice beat: a startled hop and a snap to face the seal before
            // it actually scurries, not an instant flee on the same frame.
            p.state = "startle";
            p.startleStart = t;
            p.flipperRaise = 1.3;
            p.yaw = Math.atan2(dx, dz);
            live.squeak = (live.squeak ?? 0) + 1;
          }
          p.calmSince = -1;
        } else if (p.state === "flee" || p.state === "startle") {
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

        if (p.state === "startle") {
          const el = t - p.startleStart;
          const u = Math.min(1, el / 0.3);
          p.hop = Math.sin(Math.PI * u) * 0.25;
          p.pitch = 0.15;
          p.flipperRaise = 1.3;
          if (el >= 0.3) p.state = "flee";
          // Frozen in place for the beat: no desiredX/Z this frame.
        } else if (p.state === "flee") {
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

        // Water avoid: a penguin about to step into the river gets pushed
        // back to the bank, found the way motion.js's centring drift finds
        // it (probe 0.5 m either side of the flow for which way is inland).
        riverAt(p.x + p.vx * 0.6, p.z + p.vz * 0.6, PENGUIN_RIVER_OUT);
        if (PENGUIN_RIVER_OUT.inside) {
          const flow = Math.hypot(PENGUIN_RIVER_OUT.flowX, PENGUIN_RIVER_OUT.flowZ);
          if (flow > 1e-3) {
            const px = -PENGUIN_RIVER_OUT.flowZ / flow;
            const pz = PENGUIN_RIVER_OUT.flowX / flow;
            const toCenter = riverAt(p.x + px * 0.5, p.z + pz * 0.5, PENGUIN_RIVER_OUT2).depth > PENGUIN_RIVER_OUT.depth ? 1 : -1;
            desiredX += -px * toCenter * 3;
            desiredZ += -pz * toCenter * 3;
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
        if (r > WANDER_EDGE) {
          desiredX += (-p.x / r) * (r - WANDER_EDGE);
          desiredZ += (-p.z / r) * (r - WANDER_EDGE);
        }

        const k = damp(5, dt);
        p.vx += (desiredX - p.vx) * k;
        p.vz += (desiredZ - p.vz) * k;
      }

      // Facing. Startle holds its snap-to-seal yaw even while old momentum
      // (still decaying toward the freeze) would otherwise outvote it.
      const spd = Math.hypot(p.vx, p.vz);
      let face = null;
      if (p.state === "startle") face = null;
      else if (spd > 0.15) face = Math.atan2(p.vx, p.vz);
      else if (p.state === "wander" && p.pauseUntil > t && distSeal < 10) face = Math.atan2(dx, dz);
      if (face !== null) p.yaw = wrapAngle(p.yaw + wrapAngle(face - p.yaw) * damp(8, dt));

      // Waddle.
      if (p.state !== "flop") {
        p.phase += spd * dt * 10;
      }
    }
  }, -2);

  // Draw.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const snacks = snackRef.current;
    const sparkles = sparkleRef.current;
    const bodies = bodyRef.current;
    const flippers = flipperRef.current;
    const feet = footRef.current;
    if (!bodies || !flippers || !feet || !snacks || !sparkles) return;

    for (let i = 0; i < flock.length; i++) {
      const p = flock[i];
      const roll = p.state === "flop" ? 0 : Math.sin(p.phase) * 0.16 * Math.min(1, Math.hypot(p.vx, p.vz) / 0.6);
      const bob = p.state === "flop" ? 0 : Math.abs(Math.sin(p.phase)) * 0.04;
      const size = p.chick ? 0.62 : 1.15; // adults sized up to read at 35 m
      // Gone: nothing. Turning edible: the penguin pops away (first 0.25 s) as
      // the snack springs in. Returning: springs back in.
      const u = p.edible ? (t - p.edibleAt) / 0.6 : 0;
      const scale = p.gone ? 0 : size * (p.edible ? Math.max(0, 1 - u * 4) : p.respawnAt !== undefined ? easeOutBack(Math.min(1, (t - p.respawnAt) / 0.35)) : 1);
      const snackScale = p.edible ? size * easeOutBack(Math.min(1, Math.max(0, (u - 0.2) / 0.8))) : 0;
      dummy.position.set(p.x, 0.08 + Math.abs(Math.sin(t * 3 + i)) * 0.1 * (p.edible ? 1 : 0), p.z);
      dummy.rotation.set(0, p.yaw + Math.sin(t * 2 + i) * 0.25, 0);
      dummy.scale.setScalar(snackScale);
      dummy.updateMatrix();
      snacks.setMatrixAt(i, dummy.matrix);
      for (let s = 0; s < 2; s++) {
        const a = t * 2.2 + s * Math.PI + i;
        dummy.position.set(p.x + Math.cos(a) * 0.55 * size, (0.9 + 0.15 * Math.sin(t * 4 + s)) * size, p.z + Math.sin(a) * 0.55 * size);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(snackScale > 0.05 ? size * (0.8 + 0.4 * Math.sin(t * 6 + s * 2)) : 0);
        dummy.updateMatrix();
        sparkles.setMatrixAt(i * 2 + s, dummy.matrix);
      }

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
    snacks.instanceMatrix.needsUpdate = true;
    sparkles.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[BODY_GEO, undefined, flock.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={flipperRef} args={[FLIPPER_GEO, undefined, flock.length * 2]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={snackRef} args={[SNACK_GEO, undefined, flock.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={sparkleRef} args={[SPARKLE_GEO, undefined, flock.length * 2]} frustumCulled={false}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={footRef} args={[FOOT_GEO, undefined, flock.length * 2]} castShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
    </>
  );
}
