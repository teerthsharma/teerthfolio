"use client";

// Loose things on the ice that the seal can shove and eat. Physics for all of
// it lives in lib/world/motion.js (stepProps); this file only seeds objects
// into live.props and draws them. Every repeated shape is one InstancedMesh,
// built once; useFrame only writes into preallocated matrices.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Float32BufferAttribute, Object3D, Quaternion, SphereGeometry, TorusGeometry, BoxGeometry, ConeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PLACE_BY_ID, SPAWN, dockPoint } from "../../lib/world/places";
import { live } from "../../lib/world/store";
import { samplePoints, mulberry32 } from "./life/spawn";
import { easeOutBack } from "./life/util";
import { C } from "./palette";

const SEED = 20260923;
// The playground just south of spawn, close enough to sit in the 1440x900
// first frame (6-9.5 m below spawn on screen).
const NEAR = { x: SPAWN.x, z: SPAWN.z + 7 };
// The harbour by the lighthouse dock, computed at runtime so it tracks
// wherever another workflow moves that place.
const UPSTREAM = PLACE_BY_ID.upstream;
const HARBOUR = UPSTREAM ? { x: dockPoint(UPSTREAM).x - 5, z: dockPoint(UPSTREAM).z + 3 } : NEAR;

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

function paintByLongitude(geometry) {
  // 6 gores around Y, alternating white and a colour; poles capped white.
  const goreColors = ["#ffffff", "#ff5040", "#ffffff", "#ffc93c", "#ffffff", "#3b8cff"].map((h) => new Color(h));
  const white = new Color("#ffffff");
  const pos = geometry.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const c = Math.abs(y) > 0.86 ? white : goreColors[Math.floor((((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 6) % 6];
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

function paintRing(geometry) {
  // Already laid flat (rotateX applied by the caller): x/z is the plane, y
  // is the thin axis, so quadrants are cut by the x/z angle.
  const red = new Color("#ff5040");
  const cream = new Color("#fff6ec");
  const pos = geometry.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const quadrant = Math.floor((((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 4) % 2;
    const c = quadrant ? red : cream;
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geometry;
}

// A fish lying on its side: dorsal/belly body, tail, eye. Scale 1 = spec size.
function buildFish(scale = 1) {
  const dorsal = new Color("#3d6f8f");
  const belly = new Color("#d3e4ee");
  const charcoal = new Color(C.charcoal);

  const body = new SphereGeometry(1, 12, 8).toNonIndexed();
  body.scale(0.13, 0.06, 0.28);
  {
    const pos = body.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const c = pos.getX(i) > 0 ? dorsal : belly;
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    body.setAttribute("color", new Float32BufferAttribute(arr, 3));
  }

  const tail = new ConeGeometry(0.12, 0.2, 4).toNonIndexed();
  tail.scale(1, 0.4, 1);
  tail.translate(0, 0, -0.34);
  setColor(tail, dorsal);

  const eye = new SphereGeometry(0.035, 8, 6).toNonIndexed();
  eye.translate(0.03, 0.05, 0.17);
  setColor(eye, charcoal);

  const merged = mergeGeometries([body, tail, eye], false);
  merged.translate(0, 0.07, 0);
  if (scale !== 1) merged.scale(scale, scale, scale);
  return merged;
}

function buildCrate() {
  const wood = new Color("#d8a166");
  const band = new Color("#9b6a45");

  const lower = new BoxGeometry(0.8, 0.55, 0.8).toNonIndexed();
  lower.translate(0, 0.275, 0);
  setColor(lower, wood);

  const midBand = new BoxGeometry(0.84, 0.12, 0.84).toNonIndexed();
  midBand.translate(0, 0.55, 0);
  setColor(midBand, band);

  const upper = new BoxGeometry(0.8, 0.55, 0.8).toNonIndexed();
  upper.rotateY((22 * Math.PI) / 180);
  upper.translate(0.05, 0.275 + 0.55, -0.03);
  setColor(upper, wood);

  const fishAngles = [
    [0.05, 0.78, 0.05, 0.35, -0.2],
    [-0.15, 0.82, -0.1, -0.9, 0.15],
    [0.2, 0.8, -0.12, 2.4, -0.1],
  ];
  const heads = fishAngles.map(([x, y, z, yaw, tilt]) => {
    const f = buildFish(0.7);
    f.rotateX(tilt);
    f.rotateY(yaw);
    f.translate(x, y, z);
    return f;
  });

  return mergeGeometries([lower, midBand, upper, ...heads], false);
}

const SNOWBALL_GEO = new SphereGeometry(1, 20, 14);
const BEACHBALL_GEO = paintByLongitude(new SphereGeometry(1, 24, 16).toNonIndexed());
const RING_GEO = paintRing(new TorusGeometry(0.4, 0.15, 10, 28).toNonIndexed().rotateX(Math.PI / 2));
const CRATE_GEO = buildCrate();
const FISH_GEO = buildFish(1);

// ---- seeded layout, built once --------------------------------------------

function buildGroups() {
  let taken = [];
  const sample = (count, seedOffset, opts) => {
    const pts = samplePoints(count, SEED + seedOffset, { avoid: taken, ...opts });
    taken = taken.concat(pts);
    return pts;
  };

  const snowRand = mulberry32(SEED + 101);
  const snowball = sample(6, 1, { gap: 1.4, near: NEAR, nearCount: 2, nearRadius: 2.5 }).map(({ x, z }) => {
    const r = 0.45 + snowRand() * 0.15;
    return { kind: "snowball", x, z, vx: 0, vz: 0, radius: r, mass: (r / 0.5) ** 3, spin: 0, hit: 0, seedX: x, seedZ: z, q: new Quaternion() };
  });
  const beachball = sample(2, 2, { gap: 1.4, near: NEAR, nearCount: 1, nearRadius: 2.5 }).map(({ x, z }) => ({
    kind: "beachball", x, z, vx: 0, vz: 0, radius: 0.45, mass: 0.35, spin: 0, hit: 0, seedX: x, seedZ: z, q: new Quaternion(),
  }));
  const ring = sample(2, 3, { gap: 2.4 }).map(({ x, z }) => ({
    kind: "ring", x, z, vx: 0, vz: 0, radius: 0.55, mass: 0.6, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0,
  }));
  // Both crates biased back to the lighthouse harbour, not scattered island-wide.
  const crate = sample(2, 4, { gap: 1.6, near: HARBOUR, nearCount: 2, nearRadius: 3 }).map(({ x, z }) => ({
    kind: "crate", x, z, vx: 0, vz: 0, radius: 0.62, mass: 3.5, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0,
  }));
  // One fish in the playground (first frame), two more at the harbour.
  const fishPts = [
    ...sample(1, 5, { gap: 1.4, near: NEAR, nearCount: 1, nearRadius: 2.5 }),
    ...sample(2, 6, { gap: 1.6, near: HARBOUR, nearCount: 2, nearRadius: 3 }),
  ];
  const fish = fishPts.map(({ x, z }, i) => {
    const rand = mulberry32(SEED + 900 + i);
    return {
      kind: "fish", x, z, vx: 0, vz: 0, radius: 0.32, mass: 0.25, spin: 0, hit: 0, seedX: x, seedZ: z, yaw: 0, side: 0,
      rand, flopAt: 2 + rand() * 3, flopT: -1, eaten: false, eatenAt: 0, respawnAt: undefined, scale: 1,
    };
  });

  return { snowball, beachball, ring, crate, fish };
}

// ---- component -------------------------------------------------------------

const dummy = new Object3D();
const tmpQ = new Quaternion();
const tmpAxis = new Vector3();
const nose = new Vector3();

// Hoisted out of useFrame (no per-frame closure): rolls one ball by its
// velocity and writes its matrix into `mesh` at `i`.
function rollBall(p, mesh, i, dt) {
  const s = Math.hypot(p.vx, p.vz);
  if (s > 0.01) {
    tmpAxis.set(p.vz, 0, -p.vx).divideScalar(s);
    tmpQ.setFromAxisAngle(tmpAxis, (s * dt) / p.radius);
    p.q.premultiply(tmpQ);
  }
  dummy.position.set(p.x, p.radius * (p.kind === "snowball" ? 0.92 : 1), p.z);
  dummy.quaternion.copy(p.q);
  dummy.scale.setScalar(p.radius);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

export default function Props() {
  const groups = useMemo(buildGroups, []);
  const snowRef = useRef();
  const beachRef = useRef();
  const ringRef = useRef();
  const crateRef = useRef();
  const fishRef = useRef();

  useEffect(() => {
    const all = [...groups.snowball, ...groups.beachball, ...groups.ring, ...groups.crate, ...groups.fish];
    live.props.push(...all);
    return () => {
      for (const p of all) {
        const i = live.props.indexOf(p);
        if (i !== -1) live.props.splice(i, 1);
      }
    };
  }, [groups]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const seal = live.seal;
    const speed = seal.speed;
    const forwardX = Math.sin(seal.heading);
    const forwardZ = Math.cos(seal.heading);

    // Rolling balls (snowballs, beachballs).
    const snowMesh = snowRef.current;
    if (snowMesh) {
      for (let i = 0; i < groups.snowball.length; i++) rollBall(groups.snowball[i], snowMesh, i, dt);
      snowMesh.instanceMatrix.needsUpdate = true;
    }
    const beachMesh = beachRef.current;
    if (beachMesh) {
      for (let i = 0; i < groups.beachball.length; i++) rollBall(groups.beachball[i], beachMesh, i, dt);
      beachMesh.instanceMatrix.needsUpdate = true;
    }

    // Ring, crate: yaw spins, crate half rate.
    const ringMesh = ringRef.current;
    if (ringMesh) {
      for (let i = 0; i < groups.ring.length; i++) {
        const p = groups.ring[i];
        p.yaw += p.spin * dt;
        dummy.position.set(p.x, 0.15, p.z);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        ringMesh.setMatrixAt(i, dummy.matrix);
      }
      ringMesh.instanceMatrix.needsUpdate = true;
    }

    const crateMesh = crateRef.current;
    if (crateMesh) {
      for (let i = 0; i < groups.crate.length; i++) {
        const p = groups.crate[i];
        p.yaw += p.spin * dt * 0.5;
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        crateMesh.setMatrixAt(i, dummy.matrix);
      }
      crateMesh.instanceMatrix.needsUpdate = true;
    }

    // Fish: flop, eat, respawn.
    const t = state.clock.elapsedTime;
    nose.set(seal.x + forwardX * 0.95, 0, seal.z + forwardZ * 0.95);
    const fishMesh = fishRef.current;
    if (fishMesh) {
      for (let i = 0; i < groups.fish.length; i++) {
        const p = groups.fish[i];

        if (!p.eaten) {
          p.yaw += p.spin * dt;

          // Periodic flop: roll through PI and land on the other side.
          if (p.flopT < 0 && t > p.flopAt) p.flopT = 0;
          else if (p.flopT >= 0) p.flopT += dt;
          const flopping = p.flopT >= 0 && p.flopT <= 0.35;
          const u = flopping ? p.flopT / 0.35 : 0;
          const flopY = flopping ? 0.18 * Math.sin(Math.PI * u) : 0;
          const flopRoll = flopping ? Math.PI * u : 0;
          if (p.flopT > 0.35) {
            p.flopT = -1;
            p.flopAt = t + 2 + p.rand() * 3;
            // Land on the other side instead of snapping back to 0, which
            // used to pop the dark/light halves and the eye every flop.
            p.side = p.side === 0 ? Math.PI : 0;
          }

          // Eaten by the mouth only: nose close, and moving.
          const d = Math.hypot(p.x - nose.x, p.z - nose.z);
          if (d < 0.95 && speed > 0.5) {
            p.eaten = true;
            p.eatenAt = t;
            p.scale = 0;
            const idx = live.props.indexOf(p);
            if (idx !== -1) live.props.splice(idx, 1);
            live.gulp = (live.gulp ?? 0) + 1;
          } else {
            dummy.position.set(p.x, flopY, p.z);
            // Roll about the long (Z) axis in the body's own frame, not
            // world X: 'YXZ' order keeps that true regardless of yaw.
            dummy.rotation.set(0, p.yaw, flopRoll + p.side, "YXZ");
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            fishMesh.setMatrixAt(i, dummy.matrix);
            continue;
          }
        }

        // Eaten: wait out 20 s and the seal's distance, then pop back to life.
        if (p.respawnAt === undefined && t - p.eatenAt > 20 && Math.hypot(seal.x - p.seedX, seal.z - p.seedZ) > 6) {
          p.x = p.seedX;
          p.z = p.seedZ;
          p.vx = 0;
          p.vz = 0;
          p.hit = 0;
          p.respawnAt = t;
          live.props.push(p);
        }
        if (p.respawnAt !== undefined) {
          const u = Math.min(1, (t - p.respawnAt) / 0.35);
          p.scale = easeOutBack(u);
          if (u >= 1) {
            p.scale = 1;
            p.eaten = false;
            p.respawnAt = undefined;
          }
        }
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        fishMesh.setMatrixAt(i, dummy.matrix);
      }
      fishMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={snowRef} args={[SNOWBALL_GEO, undefined, groups.snowball.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial color="#fbfaf7" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={beachRef} args={[BEACHBALL_GEO, undefined, groups.beachball.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={ringRef} args={[RING_GEO, undefined, groups.ring.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={crateRef} args={[CRATE_GEO, undefined, groups.crate.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.8} flatShading />
      </instancedMesh>
      <instancedMesh ref={fishRef} args={[FISH_GEO, undefined, groups.fish.length]} castShadow receiveShadow frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.8} flatShading />
      </instancedMesh>
    </>
  );
}
