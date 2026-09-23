"use client";

// THE STORY, made visible (show, never tell): every district's radiation
// colour drifting as crisp motes that stream into the seal, and a scatter
// of toppled trefoil warning signs at district edges. Each lab area's own
// anomaly (components/world/life/anomalies/LabAnomalies.jsx) carries the
// hot-spot spectacle now -- no soft glow discs here any more. Mounted once
// inside Effects.jsx. Two InstancedMeshes, two draw calls total.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISTRICTS, districtAt } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { forbidden, mulberry32 } from "./spawn";
import { C } from "../palette";

const MOTES_PER_DISTRICT = 8;
const MOTE_COUNT = DISTRICTS.length * MOTES_PER_DISTRICT; // 20 * 8 = 160
// Every lab district plus the three set pieces the brief names.
const SIGN_DISTRICT_IDS = [...DISTRICTS.filter((d) => d.id.startsWith("p-")).map((d) => d.id), "triton", "mujorush", "moat"];

// ---- motes: one seeded home per district, orbit / chase / spiral / flash --

function buildMotes() {
  const rand = mulberry32(20260926);
  const motes = [];
  for (const d of DISTRICTS) {
    for (let k = 0; k < MOTES_PER_DISTRICT; k++) {
      const angle = rand() * Math.PI * 2;
      const baseR = d.radius * (0.3 + rand() * 0.5);
      const homeY = 0.6 + rand() * 1.8;
      motes.push({
        color: d.radiation ?? d.color,
        homeX: d.x,
        homeZ: d.z,
        homeRadius: d.radius,
        districtId: d.id,
        angle,
        angleSpeed: (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.5),
        baseR,
        homeY,
        bobPhase: rand() * Math.PI * 2,
        scalePhase: rand() * Math.PI * 2,
        x: d.x + Math.cos(angle) * baseR,
        y: homeY,
        z: d.z + Math.sin(angle) * baseR,
        spiralAngle: angle,
        spiralR: null,
        phase: "orbit", // orbit | flash | hidden
        flashStart: 0,
        hiddenSince: 0,
      });
    }
  }
  return motes;
}

const MOTE_GEO = new IcosahedronGeometry(0.14, 0);
const MOTE_MAT = new MeshBasicMaterial({ toneMapped: false });

// ---- trefoil signs: static, seeded, one merged geometry -------------------

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

function buildTrefoilGeometry() {
  const wood = new Color("#c98a55");
  const board = new Color("#ffcf33");
  const dark = new Color(C.charcoal);
  const snow = new Color("#fbfaf7");

  const post = new BoxGeometry(0.16, 1.2, 0.16).toNonIndexed();
  post.translate(0, 0.6, 0);
  setColor(post, wood);

  // Equilateral triangle, 0.9 m side, in the XY plane (extrudes along +Z:
  // a vertical board facing forward, no extra rotation needed).
  const side = 0.9;
  const h = (side * Math.sqrt(3)) / 2;
  const tri = new Shape();
  tri.moveTo(0, (h * 2) / 3);
  tri.lineTo(-side / 2, -h / 3);
  tri.lineTo(side / 2, -h / 3);
  tri.closePath();
  const boardGeo = new ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }).toNonIndexed();
  boardGeo.translate(0, 0.95, -0.05); // centred on the post's z, mounted near its top
  setColor(boardGeo, board);

  // The trefoil: three 60 deg sectors 120 deg apart, plus a hub, 0.03 m
  // proud of the board's front face.
  const blades = [0, 1, 2].map((i) => new CircleGeometry(0.3, 16, i * ((Math.PI * 2) / 3), Math.PI / 3).toNonIndexed());
  const hub = new CircleGeometry(0.07, 12).toNonIndexed();
  const trefoil = mergeGeometries([...blades, hub], false);
  trefoil.translate(0, 0.95, 0.08); // board front (z=0.05) + 0.03 proud
  setColor(trefoil, dark);

  // A mound of snow half-burying the post's base.
  const cap = new SphereGeometry(1, 12, 8).toNonIndexed();
  cap.scale(0.5, 0.15, 0.2);
  cap.translate(0, 0.05, 0.05);
  setColor(cap, snow);

  return mergeGeometries([post, boardGeo, trefoil, cap], false);
}
const SIGN_GEO = buildTrefoilGeometry();
const SIGN_MAT = new MeshBasicMaterial({ vertexColors: true });

// One dry spot at a district's edge, on the side facing the island centre,
// passing forbidden(): tried at widening angles off the ideal point so a
// path or a place doesn't just eat the sign.
function findSignSpot(d) {
  const len = Math.hypot(d.x, d.z) || 1;
  const baseAngle = Math.atan2(-d.z / len, -d.x / len);
  const dist = d.radius + 0.6;
  for (let step = 0; step <= 6; step++) {
    const spread = step * (Math.PI / 12);
    for (const sign of step === 0 ? [1] : [1, -1]) {
      const angle = baseAngle + sign * spread;
      const x = d.x + Math.cos(angle) * dist;
      const z = d.z + Math.sin(angle) * dist;
      if (!forbidden(x, z, 0.4)) return { x, z, angle };
    }
  }
  return { x: d.x + Math.cos(baseAngle) * dist, z: d.z + Math.sin(baseAngle) * dist, angle: baseAngle };
}

function buildSigns() {
  const rand = mulberry32(20260928);
  return SIGN_DISTRICT_IDS.map((id) => {
    const d = DISTRICTS.find((x) => x.id === id);
    const spot = findSignSpot(d);
    const tiltDeg = 25 + rand() * 55;
    const tiltAxisAngle = rand() * Math.PI * 2;
    const sink = 0.2 + rand() * 0.3;
    return { x: spot.x, z: spot.z, faceAngle: spot.angle + Math.PI, tiltDeg, tiltAxisAngle, sink };
  });
}

// ---- component --------------------------------------------------------------

const dummy = new Object3D();
const tiltAxis = new Vector3();
const tiltQ = new Quaternion();
const faceQ = new Quaternion();
const UP = new Vector3(0, 1, 0);

export default function Radiation() {
  const moteRef = useRef();
  const signRef = useRef();

  const motes = useMemo(buildMotes, []);
  const signs = useMemo(buildSigns, []);

  // Static instances: written once, never touched again.
  useEffect(() => {
    const mesh = signRef.current;
    if (mesh) {
      for (let i = 0; i < signs.length; i++) {
        const s = signs[i];
        tiltAxis.set(Math.cos(s.tiltAxisAngle), 0, Math.sin(s.tiltAxisAngle));
        tiltQ.setFromAxisAngle(tiltAxis, (s.tiltDeg * Math.PI) / 180);
        faceQ.setFromAxisAngle(UP, s.faceAngle);
        dummy.quaternion.copy(tiltQ).multiply(faceQ);
        dummy.position.set(s.x, -s.sink, s.z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [signs]);

  useEffect(() => {
    const mesh = moteRef.current;
    if (mesh) {
      for (let i = 0; i < motes.length; i++) mesh.setColorAt(i, new Color(motes[i].color));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [motes]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const seal = live.seal;
    const calm = live.seal.calm ?? 0;
    const meditateDistrict = calm > 0.3 ? districtAt(seal.x, seal.z) : null;

    // ---- motes -------------------------------------------------------------
    const moteMesh = moteRef.current;
    if (moteMesh) {
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.angle += m.angleSpeed * dt;

        if (m.phase === "hidden") {
          if (t - m.hiddenSince >= 3) {
            m.angle = Math.random() * Math.PI * 2;
            m.baseR = m.homeRadius * (0.3 + Math.random() * 0.5);
            m.x = m.homeX + Math.cos(m.angle) * m.baseR;
            m.z = m.homeZ + Math.sin(m.angle) * m.baseR;
            m.y = 0.6 + Math.random() * 1.8;
            m.spiralR = null;
            m.phase = "orbit";
          } else {
            dummy.position.set(0, -1000, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            moteMesh.setMatrixAt(i, dummy.matrix);
            continue;
          }
        }

        if (m.phase === "flash") {
          const el = t - m.flashStart;
          const u = Math.min(1, el / 0.15);
          dummy.position.set(m.x, m.y, m.z);
          dummy.scale.setScalar(Math.max(0, 2.2 * (1 - u)));
          dummy.updateMatrix();
          moteMesh.setMatrixAt(i, dummy.matrix);
          if (el >= 0.15) {
            m.phase = "hidden";
            m.hiddenSince = t;
          }
          continue;
        }

        const meditating = meditateDistrict && meditateDistrict.id === m.districtId;
        if (meditating) {
          m.spiralAngle += 1.8 * dt;
          if (m.spiralR == null) m.spiralR = Math.hypot(m.x - seal.x, m.z - seal.z) || m.baseR;
          m.spiralR = Math.max(0, m.spiralR - 0.6 * dt);
          const tx = seal.x + Math.cos(m.spiralAngle) * m.spiralR;
          const tz = seal.z + Math.sin(m.spiralAngle) * m.spiralR;
          const k = Math.min(1, 6 * dt);
          m.x += (tx - m.x) * k;
          m.z += (tz - m.z) * k;
          m.y += (0.9 - m.y) * Math.min(1, 3 * dt);
        } else {
          m.spiralR = null;
          const dist = Math.hypot(m.x - seal.x, m.z - seal.z);
          if (dist < 7) {
            const dx = seal.x - m.x;
            const dy = 0.6 - m.y;
            const dz = seal.z - m.z;
            const len = Math.hypot(dx, dy, dz) || 1e-6;
            const step = Math.min(len, 4 * dt);
            m.x += (dx / len) * step;
            m.y += (dy / len) * step;
            m.z += (dz / len) * step;
          } else {
            const ox = m.homeX + Math.cos(m.angle) * m.baseR;
            const oz = m.homeZ + Math.sin(m.angle) * m.baseR;
            const oy = m.homeY + Math.sin(t * 0.4 * Math.PI * 2 + m.bobPhase) * 0.3;
            const k = Math.min(1, 2 * dt);
            m.x += (ox - m.x) * k;
            m.z += (oz - m.z) * k;
            m.y += (oy - m.y) * k;
          }
        }

        if (Math.hypot(m.x - seal.x, m.z - seal.z) < 0.5) {
          m.phase = "flash";
          m.flashStart = t;
          live.seal.absorbAt = t;
          live.seal.absorbColor = m.color;
          dummy.position.set(m.x, m.y, m.z);
          dummy.scale.setScalar(2.2);
          dummy.updateMatrix();
          moteMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const pulse = 1 + 0.2 * Math.sin(t * Math.PI * 2 * 0.6 + m.scalePhase);
        dummy.position.set(m.x, m.y, m.z);
        dummy.scale.setScalar(pulse);
        dummy.updateMatrix();
        moteMesh.setMatrixAt(i, dummy.matrix);
      }
      moteMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={moteRef} args={[MOTE_GEO, MOTE_MAT, MOTE_COUNT]} frustumCulled={false} />
      <instancedMesh ref={signRef} args={[SIGN_GEO, SIGN_MAT, signs.length]} castShadow frustumCulled={false} />
    </>
  );
}
