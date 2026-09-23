"use client";

// THE SEAL COLONY: 18 seals in four cuddle piles round the Aether-Lang
// building (seals-seed.js has the piles and each seal's own lag/stagger),
// plus 3 seals porpoising round the NVIDIA moat's ring. SHOW, NEVER TELL --
// no text, no bubbles.
//
// GOOD GRAPHICS, cheaply: every seal here is an INSTANCE of the player pup's
// own geometry (components/world/seal/variants/D-parts.js buildSealD()) --
// the same round skull, huge glossy eyes with catchlights, freckled whisker
// pads, "w" mouth, paddle flippers and forked tail the player is built from
// -- instead of a hand-rolled lump. buildSealD() returns each part already
// expressed in its own local frame (body at the rear pivot, head at the
// skull centre, flippers/tail at their own joints, eyes/glints at the eye
// pivot within the head) -- see D-parts.js's own header -- so one instance
// matrix per part, per seal, reproduces the rig without React or per-seal
// geometry. Six shared instancedMeshes (body, head, flipper, tail, eye
// lenses, eye glints) cover every colony seal AND every moat jumper, plus
// one for the splash rings: seven draw calls total, no matter the head
// count. Per-seal colour is an instanceColor tint multiplied over the pup's
// own baked coat (palette.js's own trick), so one geometry still reads as a
// family of white, grey, cream and darker-spotted seals.
//
// The player's pup is the enlightened seal. At rest the colony cuddles:
// leaned together, a pup's head up on a bigger seal's back, slow breathing,
// an occasional sleepy wiggle or roll. Within ~16 m each one notices -- ONLY
// its head turns to face the pup (the body stays put, cosy), its own lag on
// the turn. Within ~8 m it bows: head dips low toward the player, chest
// following a little less, staggered seal to seal (each one's own distance
// thresholds are jittered, so the nearer ones bow first -- a real wave, not
// a switch). live.seal.calm (the pup meditating) deepens the bow further and
// holds it there.
//
// Two reused Object3D pivots (never replaced, only ever mutated) walk the
// rig every frame: bodyPivot (the rear pivot, seal position/yaw/scale) with
// headPivot as its child (the head's own extra yaw/pitch) and facePivot as
// headPivot's child (the fixed eye-pivot offset, for the eye lenses and
// their catchlights) -- no allocation in useFrame.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, MeshBasicMaterial, MeshPhysicalMaterial, Object3D, RingGeometry } from "three";
import { live } from "../../../lib/world/store";
import { WATER_Y } from "../../../lib/world/terrain";
import { C } from "../palette";
import { buildSealD, FLIPPER_REST, PIVOT } from "../seal/variants/D-parts";
import { COLONY, JUMPERS, RING_CENTER } from "./seals-seed";
import { clamp, damp, smoothstep, wrapAngle } from "./util";

// ---- the shared pup rig, built once (D-parts.js; no React, no scene graph) --
const D = buildSealD();

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const HEAD_OFFSET = sub3(PIVOT.head, PIVOT.rear); // head pivot, in the body's own rear-origin frame
const SHOULDER_OFFSET = sub3(PIVOT.shoulder, PIVOT.rear); // left; the right one mirrors x
const TAIL_OFFSET = sub3(PIVOT.tail, PIVOT.rear);
const EYE_PIVOT = D.eyePivot; // within the head frame

const COAT_MAT = new MeshPhysicalMaterial({
  vertexColors: true,
  roughness: 0.5,
  clearcoat: 0.45,
  clearcoatRoughness: 0.3,
  sheen: 0.5,
  sheenColor: new Color("#e4ecff"),
  sheenRoughness: 0.45,
});
const EYE_MAT = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
const GLINT_MAT = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
const SPLASH_GEO = new RingGeometry(0.35, 0.58, 16).rotateX(-Math.PI / 2);
const SPLASH_MAT = new MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.8, toneMapped: false });

// Coat tints: multiplied over the pup's own baked blue-and-ivory vertex
// colours, so "spotted" is just a tint dark enough that the pup's existing
// freckles and countershading read as spots (value contrast, not a new
// palette -- the coat's own pattern does the work).
const COAT_TINT = {
  white: new Color(1.05, 1.0, 0.92),
  grey: new Color(0.82, 0.82, 0.8),
  cream: new Color(1.05, 0.9, 0.6),
  spotted: new Color(0.6, 0.58, 0.56),
};

// ---- pose constants ---------------------------------------------------------
const REST_HEAD_PITCH = 0.08; // a cosy, slightly nuzzled-down head at rest
const ONBACK_HEAD_PITCH = 0.3; // resting its chin on the neighbour it leans on
const ONBACK_LIFT = 0.22;
const ALERT_HEAD_PITCH = -0.16; // the head lifts, curious, as it notices
const BOW_HEAD_PITCH = 0.85; // the deep, deliberate head-down dip of the bow
const BOW_BODY_PITCH = 0.22; // the chest follows a little, less than the head
const BOW_DIP = 0.06;
const REST_SPLAY = -0.05; // FLIPPER_REST.back baseline, splayed on the snow
const TUCK_BACK = 0.85; // flippers draw back and in, mid-bow
const TUCK_DOWN = 0.35;
const BREATH_HZ = 0.22;
const BREATH_AMP = 0.03;

// Jumper pose
const PITCH_MAX = 0.75;
const SWIM_OMEGA = 0.07; // rad/s: a slow cruise round the ring
const SPLASH_WINDOW = 0.4;
const JUMPER_COAT = "grey";

const bodyPivot = new Object3D();
const headPivot = new Object3D();
const facePivot = new Object3D();
bodyPivot.add(headPivot);
headPivot.add(facePivot);
const partPivot = new Object3D(); // scratch for flippers/tail, reused per use

const TOTAL = COLONY.length + JUMPERS.length;

export default function SealColony() {
  const bodyRef = useRef(null);
  const headRef = useRef(null);
  const flipperRef = useRef(null);
  const tailRef = useRef(null);
  const lensRef = useRef(null);
  const glintRef = useRef(null);
  const splashRef = useRef(null);

  // Mutable per-seal state (notice/bow easing), built once, mutated in
  // place every frame -- never replaced, so useFrame never allocates.
  const colony = useMemo(
    () => COLONY.map((s) => ({ ...s, noticeS: 0, bowS: 0 })),
    [],
  );

  useEffect(() => {
    const bodyMesh = bodyRef.current;
    const headMesh = headRef.current;
    const flipperMesh = flipperRef.current;
    const tailMesh = tailRef.current;
    if (!bodyMesh || !headMesh || !flipperMesh || !tailMesh) return;
    const c = new Color();
    const tint = (i, coat, tone) => c.copy(COAT_TINT[coat] ?? COAT_TINT.grey).offsetHSL(0, 0, tone);
    for (let i = 0; i < colony.length; i++) {
      const s = colony[i];
      tint(i, s.coat, s.tone);
      bodyMesh.setColorAt(i, c);
      headMesh.setColorAt(i, c);
      tailMesh.setColorAt(i, c);
      flipperMesh.setColorAt(i * 2, c);
      flipperMesh.setColorAt(i * 2 + 1, c);
    }
    for (let j = 0; j < JUMPERS.length; j++) {
      const i = colony.length + j;
      tint(i, JUMPER_COAT, (j % 2 ? 1 : -1) * 0.06);
      bodyMesh.setColorAt(i, c);
      headMesh.setColorAt(i, c);
      tailMesh.setColorAt(i, c);
      flipperMesh.setColorAt(i * 2, c);
      flipperMesh.setColorAt(i * 2 + 1, c);
    }
    bodyMesh.instanceColor.needsUpdate = true;
    headMesh.instanceColor.needsUpdate = true;
    tailMesh.instanceColor.needsUpdate = true;
    flipperMesh.instanceColor.needsUpdate = true;
  }, [colony]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const player = live.seal;
    const calm = player.calm || 0;

    const bodyMesh = bodyRef.current;
    const headMesh = headRef.current;
    const flipperMesh = flipperRef.current;
    const tailMesh = tailRef.current;
    const lensMesh = lensRef.current;
    const glintMesh = glintRef.current;
    if (!bodyMesh || !headMesh || !flipperMesh || !tailMesh || !lensMesh || !glintMesh) return;

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
      const headYaw = wrapAngle(lookYaw - s.restYaw) * faceBlend; // only the head turns

      const relaxed = s.noticeS < 0.12;
      const wiggleCycle = 15 + (s.idlePhase % 5) * 1.6;
      const wigglePhase = (t + s.idlePhase * 3.1) % wiggleCycle;
      let roll = 0;
      if (relaxed && wigglePhase < 1.8) {
        const env = Math.sin((wigglePhase / 1.8) * Math.PI);
        roll = Math.sin(t * 5 + s.idlePhase) * 0.16 * env;
      }

      const onBack = s.onBack >= 0;
      const headBase = REST_HEAD_PITCH + (onBack ? ONBACK_HEAD_PITCH : 0);
      const headPitch = headBase + (ALERT_HEAD_PITCH - headBase) * s.noticeS + BOW_HEAD_PITCH * s.bowS;
      const bodyPitch = BOW_BODY_PITCH * s.bowS;

      const breathe = Math.sin(t * BREATH_HZ * Math.PI * 2 + s.idlePhase) * BREATH_AMP * (1 - s.bowS);
      const dipY = -BOW_DIP * s.bowS;
      const liftY = onBack ? ONBACK_LIFT * s.scale * (1 - s.bowS * 0.35) : 0;

      // ---- body: position, rest yaw (never turns to face -- only the head does), a cosy roll
      bodyPivot.position.set(s.x, dipY + liftY, s.z);
      bodyPivot.rotation.set(bodyPitch, s.restYaw, roll, "YXZ");
      bodyPivot.scale.set(s.scale, s.scale * (1 + breathe), s.scale);
      bodyPivot.updateMatrix();
      bodyMesh.setMatrixAt(i, bodyPivot.matrix);

      // ---- head: body matrix * head pivot, its own yaw (notice) and pitch (bow nod)
      headPivot.position.set(HEAD_OFFSET[0], HEAD_OFFSET[1], HEAD_OFFSET[2]);
      headPivot.rotation.set(-headPitch, headYaw, 0, "YXZ");
      headPivot.scale.setScalar(1);
      bodyPivot.updateMatrixWorld(true);
      headMesh.setMatrixAt(i, headPivot.matrixWorld);

      // ---- eyes + catchlights: head matrix * the eye pivot, rigid with the head
      facePivot.position.set(EYE_PIVOT[0], EYE_PIVOT[1], EYE_PIVOT[2]);
      facePivot.updateMatrixWorld(true);
      lensMesh.setMatrixAt(i, facePivot.matrixWorld);
      glintMesh.setMatrixAt(i, facePivot.matrixWorld);

      // ---- flippers: draw back and tuck in, mid-bow
      const back = FLIPPER_REST.back - TUCK_BACK * s.bowS;
      const down = FLIPPER_REST.down - TUCK_DOWN * s.bowS;
      partPivot.position.set(SHOULDER_OFFSET[0], SHOULDER_OFFSET[1], SHOULDER_OFFSET[2]);
      partPivot.rotation.set(0, back, -down, "YZX");
      partPivot.scale.setScalar(1);
      bodyPivot.updateMatrixWorld(true);
      flipperMesh.setMatrixAt(i * 2, partPivot.matrixWorld);

      partPivot.position.set(-SHOULDER_OFFSET[0], SHOULDER_OFFSET[1], SHOULDER_OFFSET[2]);
      partPivot.rotation.set(0, back, -down, "YZX");
      partPivot.scale.set(-1, 1, 1); // mirrors the left flipper's geometry onto the right shoulder
      bodyPivot.updateMatrixWorld(true);
      flipperMesh.setMatrixAt(i * 2 + 1, partPivot.matrixWorld);

      // ---- tail: at rest on the snow, no extra joint motion needed here
      partPivot.position.set(TAIL_OFFSET[0], TAIL_OFFSET[1], TAIL_OFFSET[2]);
      partPivot.rotation.set(0, 0, 0);
      partPivot.scale.setScalar(1);
      bodyPivot.updateMatrixWorld(true);
      tailMesh.setMatrixAt(i, partPivot.matrixWorld);
    }

    // ---- the moat's porpoising seals: same rig, a leap arc instead of a cuddle
    const splashMesh = splashRef.current;
    if (splashMesh) {
      for (let j = 0; j < JUMPERS.length; j++) {
        const J = JUMPERS[j];
        const i = colony.length + j;
        const theta = J.theta0 + t * SWIM_OMEGA;
        const cx = RING_CENTER.x + Math.cos(theta) * J.radius;
        const cz = RING_CENTER.z + Math.sin(theta) * J.radius;
        const yaw = Math.atan2(-Math.sin(theta), Math.cos(theta));

        const cyclePos = (t + J.phase0) % J.cycleLen;
        const airborne = cyclePos < J.leapDur;
        if (airborne) {
          const u = cyclePos / J.leapDur;
          const h = 4 * J.peak * u * (1 - u);
          bodyPivot.position.set(cx, WATER_Y + h, cz);
          bodyPivot.rotation.set(PITCH_MAX * (2 * u - 1), yaw, Math.sin(u * Math.PI) * 0.15 * (j % 2 ? 1 : -1), "YXZ");
          bodyPivot.scale.setScalar(J.scale);
        } else {
          bodyPivot.position.set(cx, -50, cz);
          bodyPivot.scale.setScalar(0);
          bodyPivot.rotation.set(0, yaw, 0, "YXZ");
        }
        bodyPivot.updateMatrix();
        bodyMesh.setMatrixAt(i, bodyPivot.matrix);

        headPivot.position.set(HEAD_OFFSET[0], HEAD_OFFSET[1], HEAD_OFFSET[2]);
        headPivot.rotation.set(0, 0, 0);
        headPivot.scale.setScalar(1);
        bodyPivot.updateMatrixWorld(true);
        headMesh.setMatrixAt(i, headPivot.matrixWorld);

        facePivot.position.set(EYE_PIVOT[0], EYE_PIVOT[1], EYE_PIVOT[2]);
        facePivot.updateMatrixWorld(true);
        lensMesh.setMatrixAt(i, facePivot.matrixWorld);
        glintMesh.setMatrixAt(i, facePivot.matrixWorld);

        partPivot.position.set(SHOULDER_OFFSET[0], SHOULDER_OFFSET[1], SHOULDER_OFFSET[2]);
        partPivot.rotation.set(0, FLIPPER_REST.back, -FLIPPER_REST.down, "YZX");
        partPivot.scale.setScalar(1);
        bodyPivot.updateMatrixWorld(true);
        flipperMesh.setMatrixAt(i * 2, partPivot.matrixWorld);

        partPivot.position.set(-SHOULDER_OFFSET[0], SHOULDER_OFFSET[1], SHOULDER_OFFSET[2]);
        partPivot.rotation.set(0, FLIPPER_REST.back, -FLIPPER_REST.down, "YZX");
        partPivot.scale.set(-1, 1, 1);
        bodyPivot.updateMatrixWorld(true);
        flipperMesh.setMatrixAt(i * 2 + 1, partPivot.matrixWorld);

        partPivot.position.set(TAIL_OFFSET[0], TAIL_OFFSET[1], TAIL_OFFSET[2]);
        partPivot.rotation.set(0, 0, 0);
        partPivot.scale.setScalar(1);
        bodyPivot.updateMatrixWorld(true);
        tailMesh.setMatrixAt(i, partPivot.matrixWorld);

        // One splash slot per jumper, reused for both the exit (launching
        // out of the water) and the entry (diving back in) -- the two
        // never overlap in time since the leap is airborne between them.
        const distExit = Math.min(cyclePos, J.cycleLen - cyclePos);
        const distEntry = Math.abs(cyclePos - J.leapDur);
        const age = Math.min(distExit, distEntry);
        if (age < SPLASH_WINDOW) {
          const u = age / SPLASH_WINDOW;
          partPivot.position.set(cx, WATER_Y + 0.015, cz);
          partPivot.rotation.set(0, 0, 0);
          partPivot.scale.setScalar(0.15 + 1.1 * Math.sin(u * Math.PI) * J.scale);
        } else {
          partPivot.position.set(cx, -50, cz);
          partPivot.scale.setScalar(0);
        }
        partPivot.updateMatrix();
        splashMesh.setMatrixAt(j, partPivot.matrix);
      }
      splashMesh.instanceMatrix.needsUpdate = true;
    }

    bodyMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
    flipperMesh.instanceMatrix.needsUpdate = true;
    tailMesh.instanceMatrix.needsUpdate = true;
    lensMesh.instanceMatrix.needsUpdate = true;
    glintMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[D.body, COAT_MAT, TOTAL]} castShadow frustumCulled={false} />
      <instancedMesh ref={headRef} args={[D.head, COAT_MAT, TOTAL]} castShadow frustumCulled={false} />
      <instancedMesh ref={flipperRef} args={[D.flipper, COAT_MAT, TOTAL * 2]} frustumCulled={false} />
      <instancedMesh ref={tailRef} args={[D.tail, COAT_MAT, TOTAL]} frustumCulled={false} />
      <instancedMesh ref={lensRef} args={[D.lenses, EYE_MAT, TOTAL]} frustumCulled={false} />
      <instancedMesh ref={glintRef} args={[D.glints, GLINT_MAT, TOTAL]} frustumCulled={false} />
      <instancedMesh ref={splashRef} args={[SPLASH_GEO, SPLASH_MAT, JUMPERS.length]} frustumCulled={false} />
    </>
  );
}
