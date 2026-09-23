"use client";

// THE SEAL COLONY: 8 round, chubby colony seals cuddled into two piles round
// the Aether-Lang building (seals-seed.js has the placement and the per-seal
// lag/stagger), plus 3 seals porpoising round the NVIDIA moat's ring. SHOW,
// NEVER TELL -- no text, no bubbles.
//
// The player's pup is the enlightened seal. At rest the colony cuddles:
// leaned together, nuzzling, a pup's head up on a bigger seal's back, slow
// breathing, an occasional sleepy wiggle or roll. Within ~16 m each one
// notices -- lifts its head and turns to face the pup, its own lag on the
// turn. Within ~8 m it bows: head and chest lower toward the snow, front
// flippers tucked, a slow reverent dip that holds, staggered seal to seal
// (each one's own distance thresholds are jittered, so the nearer ones bow
// first -- a real wave, not a switch). live.seal.calm (the pup meditating)
// deepens the bow further and holds it there.
//
// Every seal (colony and moat) shares ONE merged body geometry: a round
// head flowing straight into a teardrop body, no neck, built once from a
// few overlapping primitives (Radiation.jsx's and LabAnomalies.jsx's own
// pattern: merge a handful of shapes, no per-part draw call). Five
// instancedMeshes total -- bodies, flippers, eye/nose darks, moat bodies,
// splash rings -- each one seal's own colour and lag computed straight into
// its instance matrix every frame, no allocation (two Object3D pivots,
// built once, reused and mutated).

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import { C, mat } from "../palette";
import { COLONY, JUMPERS, RING_CENTER } from "./seals-seed";
import { clamp, damp, smoothstep, wrapAngle } from "./util";

// ---- the shared seal body: round head flowing into a plump teardrop -------
// Local frame: origin on the snow under the belly, +z the nose, +y up. A
// scale-1 seal spans about 1.4 m nose to tail-tip -- well under the player
// pup's ~2.5 m (Seal.jsx's own shadow plane), so every colony seal (scale
// 0.58..1.05) reads smaller than or level with the pup, as the brief asks.
const BODY_R = [0.34, 0.3, 0.46]; // body ellipsoid semi-axes
const BODY_Y = 0.3; // = BODY_R[1], so the belly sits on y = 0 by construction
const BODY_Z = -0.06;
const HEAD_R = [0.3, 0.28, 0.32];
const HEAD_Y = 0.36;
const HEAD_Z = 0.44; // body's front (BODY_Z+BODY_R[2]=0.40) laps 0.28 m into the
// head's back (HEAD_Z-HEAD_R[2]=0.12): no neck, one flowing silhouette.
const PAD_R = 0.085;
const PAD_X = 0.14;
const PAD_Y = 0.28;
const PAD_Z = 0.62;
const TAIL_Y = 0.09;
const TAIL_Z = -0.62;

// Where the eye/nose dark dots and the flippers attach, in the same frame.
const EYE_X = 0.15;
const EYE_Y = 0.38;
const EYE_Z = 0.58;
const NOSE_Y = 0.27;
const NOSE_Z = 0.74;
const SHOULDER = [0.28, 0.2, 0.08]; // left; the right one mirrors x

// sx/sy/sz are the part's semi-axes, so the base sphere is a unit one (r 1):
// at r 0.5 every part came out half size, the head hung off the body and
// the eyes floated in front of the face.
function sphere(r, w, h, sx, sy, sz, x, y, z) {
  const g = new SphereGeometry(r, w, h);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  g.computeVertexNormals(); // the scale above distorts a unit sphere's normals; redo them from the real (scaled) shape
  g.deleteAttribute("uv");
  return g;
}

// Two-tone coat baked as vertex colour (darker dorsal, lighter belly) plus
// cheap deterministic blotches for "darker spots" -- multiplied at render
// time by each instance's own tint (mat()'s material colour stays white),
// so one shared geometry still reads as a family of different-coloured
// seals. Value contrast, not palette: the same trick D.jsx's coat gradient
// and Radiation.jsx's vertex-coloured signs use.
function paintCoat(geometry) {
  const pos = geometry.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const dorsal = smoothstep(0.05, 0.55, y); // 0 low (belly) .. 1 high (back/crown)
    let shade = 1.12 - 0.4 * dorsal;
    const spot = Math.sin(x * 13.1 + z * 6.7) * Math.sin(y * 9.3 - x * 5.1) * Math.sin(z * 10.7 + y * 4.3);
    if (spot > 0.45) shade *= 0.58;
    col[i * 3] = shade;
    col[i * 3 + 1] = shade;
    col[i * 3 + 2] = shade;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(col, 3));
  return geometry;
}

function buildBodyGeo() {
  const body = sphere(1, 12, 9, BODY_R[0], BODY_R[1], BODY_R[2], 0, BODY_Y, BODY_Z);
  const head = sphere(1, 11, 8, HEAD_R[0], HEAD_R[1], HEAD_R[2], 0, HEAD_Y, HEAD_Z);
  const padL = sphere(1, 6, 5, PAD_R, PAD_R * 0.8, PAD_R, PAD_X, PAD_Y, PAD_Z);
  const padR = sphere(1, 6, 5, PAD_R, PAD_R * 0.8, PAD_R, -PAD_X, PAD_Y, PAD_Z);
  const tail = sphere(1, 7, 5, 0.26, 0.1, 0.16, 0, TAIL_Y, TAIL_Z);
  const merged = mergeGeometries([body, head, padL, padR, tail], false);
  return paintCoat(merged);
}

function buildFlipperGeo() {
  // A flattened paddle hanging from its pivot (the shoulder) at the origin.
  return sphere(1, 6, 5, 0.28, 0.22, 0.16, 0, -0.22, 0);
}

const BODY_GEO = buildBodyGeo();
BODY_GEO.computeBoundingSphere();
const FLIPPER_GEO = paintCoat(buildFlipperGeo()); // COAT_MAT reads vertex colour: without it the flippers drew black
FLIPPER_GEO.computeBoundingSphere();
const DOT_GEO = new IcosahedronGeometry(0.06, 1);
const SPLASH_GEO = new RingGeometry(0.35, 0.58, 16).rotateX(-Math.PI / 2);

const COAT_MAT = mat("#ffffff", { flat: false, vertexColors: true, roughness: 0.62 });
const INK_MAT = mat(C.charcoal, { flat: false, roughness: 0.35 });
const SPLASH_MAT = new MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.8, toneMapped: false });

const GREY = new Color("#a7afba");
const CREAM = new Color("#ead9b7");

// ---- pose constants ---------------------------------------------------------
const REST_PITCH = 0.1; // a cosy, slightly nuzzled-down head at rest
const ONBACK_PITCH = 0.32; // extra tilt for the pup draped on a neighbour's back
const ONBACK_LIFT = 0.3;
const ALERT_PITCH = -0.14; // head lifts as it notices the pup
const BOW_PITCH = 0.95; // added on top, deep, as the bow lands
const BOW_DIP = 0.05;
const REST_SPLAY = 0.55; // flippers splayed at rest
const TUCK_X = -1.0; // flippers fold up and forward, tucked, mid-bow
const BREATH_HZ = 0.22;
const BREATH_AMP = 0.03;

// Jumper pose
const PITCH_MAX = 0.85;
const SWIM_OMEGA = 0.07; // rad/s: a slow cruise round the ring
const SPLASH_WINDOW = 0.4;

const SIZE = 1.3; // the whole colony, so it reads at game distance beside the pup (the owner: "I don't see seals")
const dummy = new Object3D();
const bodyPivot = new Object3D();
const partPivot = new Object3D();
bodyPivot.add(partPivot);

export default function SealColony() {
  const bodyRef = useRef(null);
  const flipperRef = useRef(null);
  const dotRef = useRef(null);
  const jumperRef = useRef(null);
  const splashRef = useRef(null);

  // Mutable per-seal state (notice/bow easing), built once, mutated in
  // place every frame -- never replaced, so useFrame never allocates.
  const colony = useMemo(
    () => COLONY.map((s) => ({ ...s, noticeS: 0, bowS: 0 })),
    [],
  );

  useEffect(() => {
    const bodyMesh = bodyRef.current;
    const flipperMesh = flipperRef.current;
    if (!bodyMesh || !flipperMesh) return;
    const c = new Color();
    for (let i = 0; i < colony.length; i++) {
      const s = colony[i];
      c.copy(s.coat === "cream" ? CREAM : GREY).offsetHSL(0, 0, s.tone);
      bodyMesh.setColorAt(i, c);
      flipperMesh.setColorAt(i * 2, c);
      flipperMesh.setColorAt(i * 2 + 1, c);
    }
    bodyMesh.instanceColor.needsUpdate = true;
    flipperMesh.instanceColor.needsUpdate = true;

    const jumperMesh = jumperRef.current;
    if (jumperMesh) {
      for (let j = 0; j < JUMPERS.length; j++) {
        c.copy(GREY).offsetHSL(0, 0, (j % 2 ? 1 : -1) * 0.06);
        jumperMesh.setColorAt(j, c);
      }
      jumperMesh.instanceColor.needsUpdate = true;
    }
  }, [colony]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const player = live.seal;
    const calm = player.calm || 0;

    const bodyMesh = bodyRef.current;
    const flipperMesh = flipperRef.current;
    const dotMesh = dotRef.current;
    if (bodyMesh && flipperMesh && dotMesh) {
      for (let i = 0; i < colony.length; i++) {
        const s = colony[i];
        const dx = player.x - s.x;
        const dz = player.z - s.z;
        const d = Math.hypot(dx, dz);

        const noticeOuter = 16 + s.noticeStagger * 3;
        const bowOuter = 8 + s.bowStagger * 2.4;
        const bowInner = bowOuter - 4;

        const noticeRaw = 1 - smoothstep(bowOuter, noticeOuter, d);
        const bowRaw = 1 - smoothstep(bowInner, bowOuter, d);
        const bowTarget = clamp(bowRaw + calm * noticeRaw, 0, 1);

        s.noticeS += (noticeRaw - s.noticeS) * damp(s.lookRate, dt);
        s.bowS += (bowTarget - s.bowS) * damp(s.bowRate, dt);

        const faceBlend = Math.max(s.noticeS, s.bowS);
        const lookYaw = Math.atan2(dx, dz);
        const yaw = s.restYaw + wrapAngle(lookYaw - s.restYaw) * faceBlend;

        const relaxed = s.noticeS < 0.12;
        const wiggleCycle = 15 + (s.idlePhase % 5) * 1.6;
        const wigglePhase = (t + s.idlePhase * 3.1) % wiggleCycle;
        let roll = 0;
        if (relaxed && wigglePhase < 1.8) {
          const env = Math.sin((wigglePhase / 1.8) * Math.PI);
          roll = Math.sin(t * 5 + s.idlePhase) * 0.16 * env;
        }

        const onBack = s.onBack >= 0;
        const basePitch = REST_PITCH + (onBack ? ONBACK_PITCH : 0);
        const pitch = basePitch + (ALERT_PITCH - basePitch) * s.noticeS + BOW_PITCH * s.bowS;

        const breathe = Math.sin(t * BREATH_HZ * Math.PI * 2 + s.idlePhase) * BREATH_AMP * (1 - s.bowS);
        const dipY = -BOW_DIP * s.bowS;
        const liftY = onBack ? ONBACK_LIFT * s.scale * (1 - s.bowS * 0.35) : 0;

        bodyPivot.position.set(s.x, dipY + liftY, s.z);
        bodyPivot.rotation.set(pitch, yaw, roll, "YXZ");
        bodyPivot.scale.set(s.scale * SIZE, s.scale * SIZE * (1 + breathe), s.scale * SIZE);
        bodyPivot.updateMatrix();
        bodyMesh.setMatrixAt(i, bodyPivot.matrix);

        const splay = REST_SPLAY * (1 - s.bowS);
        const tuckX = TUCK_X * s.bowS;

        partPivot.position.set(SHOULDER[0], SHOULDER[1], SHOULDER[2]);
        partPivot.rotation.set(tuckX, 0, splay, "XYZ");
        bodyPivot.updateMatrixWorld(true);
        flipperMesh.setMatrixAt(i * 2, partPivot.matrixWorld);

        partPivot.position.set(-SHOULDER[0], SHOULDER[1], SHOULDER[2]);
        partPivot.rotation.set(tuckX, 0, -splay, "XYZ");
        bodyPivot.updateMatrixWorld(true);
        flipperMesh.setMatrixAt(i * 2 + 1, partPivot.matrixWorld);

        partPivot.rotation.set(0, 0, 0);
        partPivot.position.set(EYE_X, EYE_Y, EYE_Z);
        bodyPivot.updateMatrixWorld(true);
        dotMesh.setMatrixAt(i * 3, partPivot.matrixWorld);

        partPivot.position.set(-EYE_X, EYE_Y, EYE_Z);
        bodyPivot.updateMatrixWorld(true);
        dotMesh.setMatrixAt(i * 3 + 1, partPivot.matrixWorld);

        partPivot.position.set(0, NOSE_Y, NOSE_Z);
        bodyPivot.updateMatrixWorld(true);
        dotMesh.setMatrixAt(i * 3 + 2, partPivot.matrixWorld);
      }
      bodyMesh.instanceMatrix.needsUpdate = true;
      flipperMesh.instanceMatrix.needsUpdate = true;
      dotMesh.instanceMatrix.needsUpdate = true;
    }

    // ---- the moat's porpoising seals --------------------------------------
    const jumperMesh = jumperRef.current;
    const splashMesh = splashRef.current;
    if (jumperMesh && splashMesh) {
      for (let j = 0; j < JUMPERS.length; j++) {
        const J = JUMPERS[j];
        const theta = J.theta0 + t * SWIM_OMEGA;
        const cx = RING_CENTER.x + Math.cos(theta) * J.radius;
        const cz = RING_CENTER.z + Math.sin(theta) * J.radius;
        const yaw = Math.atan2(-Math.sin(theta), Math.cos(theta));

        const cyclePos = (t + J.phase0) % J.cycleLen;
        const airborne = cyclePos < J.leapDur;
        if (airborne) {
          const u = cyclePos / J.leapDur;
          const h = 4 * J.peak * u * (1 - u);
          dummy.position.set(cx, WATER_Y + h, cz);
          dummy.rotation.set(PITCH_MAX * (2 * u - 1), yaw, Math.sin(u * Math.PI) * 0.15 * (j % 2 ? 1 : -1), "YXZ");
          dummy.scale.setScalar(J.scale);
        } else {
          dummy.position.set(cx, -50, cz);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        jumperMesh.setMatrixAt(j, dummy.matrix);

        // One splash slot per jumper, reused for both the exit (launching
        // out of the water) and the entry (diving back in) -- the two
        // never overlap in time since the leap is airborne between them.
        const distExit = Math.min(cyclePos, J.cycleLen - cyclePos);
        const distEntry = Math.abs(cyclePos - J.leapDur);
        const age = Math.min(distExit, distEntry);
        if (age < SPLASH_WINDOW) {
          const u = age / SPLASH_WINDOW;
          dummy.position.set(cx, WATER_Y + 0.015, cz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.15 + 1.1 * Math.sin(u * Math.PI) * J.scale);
        } else {
          dummy.position.set(cx, -50, cz);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        splashMesh.setMatrixAt(j, dummy.matrix);
      }
      jumperMesh.instanceMatrix.needsUpdate = true;
      splashMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[BODY_GEO, COAT_MAT, colony.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={flipperRef} args={[FLIPPER_GEO, COAT_MAT, colony.length * 2]} frustumCulled={false} />
      <instancedMesh ref={dotRef} args={[DOT_GEO, INK_MAT, colony.length * 3]} frustumCulled={false} />
      <instancedMesh ref={jumperRef} args={[BODY_GEO, COAT_MAT, JUMPERS.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={splashRef} args={[SPLASH_GEO, SPLASH_MAT, JUMPERS.length]} frustumCulled={false} />
    </>
  );
}
