"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live, useUi } from "../../../lib/world/store";
import { C, glow, lamp, mat } from "../palette";

// Building for PLACE_BY_ID["upstream"] in lib/world/places.js.
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius.
//
// Tallest thing on the island: a tapering 4-leg lattice mast, banded coral
// and white, with a dish at working height on the front face and a beacon on
// top. An 11-lamp telemetry column (one per upstream contribution) fills one
// lamp at a time; when the column is full it holds lit, then starts over.

const LEG_Y0 = 0.35; // base height, top of the plinth
const LEG_Y1 = 8.0; // top height
const LEG_H0 = 1.2; // leg half-size at the base
const LEG_H1 = 0.35; // leg half-size at the top
const GIRT_YS = [1.6, 3.2, 4.8, 6.4, 8.0];
const BAY_YS = [0.35, 1.6, 3.2, 4.8, 6.4, 8.0];
const LAMP_COUNT = 11;
const LAMP_Y0 = 0.9;
const LAMP_STEP = 0.62;
const DISH_TILT = MathUtils.degToRad(75); // 90 (faces +z) minus 15 (tilts up)
const CYCLE = 2.2; // s between packets
const HOLD = 3; // s the full column holds lit
const UP = new Vector3(0, 1, 0);

function legHalf(y) {
  return LEG_H0 + ((LEG_H1 - LEG_H0) * (y - LEG_Y0)) / (LEG_Y1 - LEG_Y0);
}
function lampZ(y) {
  return 1.2 - (0.85 * (y - 0.35)) / 7.65 + 0.1;
}
function legCorner(sx, sz, y) {
  const h = legHalf(y);
  return [sx * h, y, sz * h];
}

// A square box beam baked to a straight run between two points, so many can
// share one merged draw call.
function beam(a, b, thickness) {
  const pa = new Vector3(...a);
  const pb = new Vector3(...b);
  const length = pa.distanceTo(pb);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  const dir = pb.clone().sub(pa).normalize();
  const q = new Quaternion().setFromUnitVectors(UP, dir);
  const geo = new BoxGeometry(thickness, length, thickness);
  geo.applyMatrix4(new Matrix4().compose(mid, q, new Vector3(1, 1, 1)));
  return geo;
}
function block(size, center) {
  const geo = new BoxGeometry(...size);
  geo.translate(...center);
  return geo;
}
function squareFrame(half, y, thickness) {
  const c = (sx, sz) => [sx * half, y, sz * half];
  const ne = c(1, 1), nw = c(-1, 1), sw = c(-1, -1), se = c(1, -1);
  return [beam(ne, nw, thickness), beam(sw, se, thickness), beam(nw, sw, thickness), beam(se, ne, thickness)];
}

// The two legs bounding each of the 4 vertical faces, as (sx, sz) corners.
const FACES = [
  [[-1, 1], [1, 1]], // +z
  [[-1, -1], [1, -1]], // -z
  [[1, -1], [1, 1]], // +x
  [[-1, -1], [-1, 1]], // -x
];

export default function RadioMast({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  const geo = useMemo(() => {
    const coral = [];
    const white = [];
    const charcoal = [];

    white.push(block([3.0, 0.35, 3.0], [0, 0.175, 0])); // plinth
    charcoal.push(...squareFrame(1.44, 0.38, 0.12)); // plinth top rim

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const base = [sx * LEG_H0, LEG_Y0, sz * LEG_H0];
        const top = [sx * LEG_H1, LEG_Y1, sz * LEG_H1];
        for (let i = 0; i < 6; i++) {
          const t0 = i / 6, t1 = (i + 1) / 6;
          const p0 = base.map((v, k) => v + (top[k] - v) * t0);
          const p1 = base.map((v, k) => v + (top[k] - v) * t1);
          (i % 2 === 0 ? coral : white).push(beam(p0, p1, 0.22));
        }
      }
    }

    for (const y of GIRT_YS) charcoal.push(...squareFrame(legHalf(y), y, 0.16));

    for (let i = 0; i < BAY_YS.length - 1; i++) {
      const yb = BAY_YS[i], yt = BAY_YS[i + 1];
      for (const [[lsx, lsz], [rsx, rsz]] of FACES) {
        const bl = legCorner(lsx, lsz, yb), br = legCorner(rsx, rsz, yb);
        const tl = legCorner(lsx, lsz, yt), tr = legCorner(rsx, rsz, yt);
        charcoal.push(beam(bl, tr, 0.14), beam(br, tl, 0.14));
      }
    }

    charcoal.push(block([1.1, 0.18, 1.1], [0, 8.0, 0])); // top platform
    const whip = new CylinderGeometry(0.08, 0.08, 0.8, 8);
    whip.translate(0, 8.49, 0);
    charcoal.push(whip);

    const faceZ = legHalf(4.6); // dish yoke: mast face to the pivot
    charcoal.push(block([0.2, 0.2, 1.3 - faceZ], [0, 4.6, (faceZ + 1.3) / 2]));

    const spineY = LAMP_Y0 + ((LAMP_COUNT - 1) * LAMP_STEP) / 2;
    charcoal.push(block([0.2, 6.6, 0.14], [0, spineY, legHalf(spineY) + 0.07])); // telemetry spine

    // Dish: parabolic bowl (y = r^2 / 4f, f = 0.55), rim, hub and feed.
    const profile = [];
    const focus = 0.55;
    for (let i = 0; i <= 9; i++) {
      const r = (i / 9) * 1.1;
      profile.push(new Vector2(r, (r * r) / (4 * focus)));
    }
    const hub = new CylinderGeometry(0.35, 0.35, 0.3, 8);
    hub.translate(0, -0.15, 0);
    const boom = new CylinderGeometry(0.07, 0.07, 0.55, 8);
    boom.translate(0, 0.275, 0);
    const feedCone = new ConeGeometry(0.14, 0.2, 6);
    feedCone.translate(0, 0.55, 0);

    const lampPuck = new CylinderGeometry(0.16, 0.16, 0.12, 10);
    lampPuck.rotateX(Math.PI / 2); // axis along z

    return {
      coral: mergeGeometries(coral),
      white: mergeGeometries(white),
      charcoal: mergeGeometries(charcoal),
      beacon: new SphereGeometry(0.28, 10, 8),
      beaconGlow: new SphereGeometry(0.55, 10, 8),
      bowl: new LatheGeometry(profile, 20),
      rim: new TorusGeometry(1.1, 0.12, 6, 20),
      dishHub: mergeGeometries([hub, boom, feedCone]),
      lampPuck,
    };
  }, []);

  const coralMat = mat(A);
  const whiteMat = mat(C.warmWhite);
  const charcoalMat = mat(C.charcoal);
  const bowlMat = mat(C.warmWhite, { side: DoubleSide });
  const beaconMat = lamp(A, 1.2);
  const glowMat = glow(A, 0.25);
  const lampOffMat = mat("#2a2e3a");
  const lampOnMat = lamp(A, 1.4);

  const dishYawRef = useRef(null);
  const glowRef = useRef(null);
  const lampRefs = useRef([]);
  const anim = useRef({
    cycleT: 0,
    packetOn: false,
    packetT: 0,
    litCount: 0,
    holding: false,
    holdT: 0,
    flashing: false,
    flashT: 0,
    yaw: 0,
  });

  useFrame((_, dt) => {
    const a = anim.current;
    const k = 1 - Math.exp(-4 * dt);

    const dx = live.seal.x - place.x;
    const dz = live.seal.z - place.z;
    const targetYaw = near ? MathUtils.clamp(Math.atan2(dx, dz), -Math.PI / 3, Math.PI / 3) : 0;
    a.yaw += (targetYaw - a.yaw) * k;
    if (dishYawRef.current) dishYawRef.current.rotation.y = a.yaw;

    if (a.holding) {
      a.holdT += dt;
      if (a.holdT >= HOLD) {
        a.holding = false;
        a.holdT = 0;
        a.litCount = 0;
        a.cycleT = 0;
      }
    } else if (!a.packetOn) {
      a.cycleT += dt;
      if (a.cycleT >= CYCLE) {
        a.cycleT = 0;
        a.packetOn = true;
        a.packetT = 0;
      }
    }

    const segDur = near ? 0.06 : 0.12;
    let currentLamp = -1;
    if (a.packetOn) {
      a.packetT += dt;
      currentLamp = Math.min(Math.floor(a.packetT / segDur), LAMP_COUNT - 1);
      if (a.packetT >= segDur * LAMP_COUNT) {
        a.packetOn = false;
        a.litCount = Math.min(a.litCount + 1, LAMP_COUNT);
        a.flashing = true;
        a.flashT = 0;
        if (a.litCount >= LAMP_COUNT) {
          a.holding = true;
          a.holdT = 0;
        }
      }
    }

    for (let i = 0; i < LAMP_COUNT; i++) {
      const el = lampRefs.current[i];
      if (!el) continue;
      el.material = i < a.litCount || i === currentLamp ? lampOnMat : lampOffMat;
    }

    if (a.flashing && glowRef.current) {
      a.flashT += dt;
      const p = Math.min(a.flashT / 0.5, 1);
      glowRef.current.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.8);
      if (p >= 1) a.flashing = false;
    }
  });

  return (
    <group>
      <mesh geometry={geo.white} material={whiteMat} castShadow receiveShadow />
      <mesh geometry={geo.coral} material={coralMat} castShadow receiveShadow />
      <mesh geometry={geo.charcoal} material={charcoalMat} castShadow receiveShadow />

      <mesh geometry={geo.beacon} material={beaconMat} position={[0, 9.05, 0]} receiveShadow />
      <mesh ref={glowRef} geometry={geo.beaconGlow} material={glowMat} position={[0, 9.05, 0]} />

      <group ref={dishYawRef} position={[0, 4.6, 1.3]}>
        <group rotation={[DISH_TILT, 0, 0]}>
          <mesh geometry={geo.bowl} material={bowlMat} receiveShadow />
          <mesh geometry={geo.rim} material={coralMat} position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow />
          <mesh geometry={geo.dishHub} material={charcoalMat} receiveShadow />
        </group>
      </group>

      {Array.from({ length: LAMP_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            lampRefs.current[i] = el;
          }}
          geometry={geo.lampPuck}
          material={lampOffMat}
          position={[0, LAMP_Y0 + i * LAMP_STEP, lampZ(LAMP_Y0 + i * LAMP_STEP)]}
        />
      ))}
    </group>
  );
}
