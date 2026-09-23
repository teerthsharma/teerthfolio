"use client";

// Building for the "link" figure: tangle (place id p-tangle), a lab project
// Teerth builds. Local origin: the snow at the place centre; +z faces the
// camera and the dock. Props: { place } (near is read from the store, the
// same way Prune.jsx and every other absorbed figure does it).
//
// The normal thing, done cooler: a proof-testing gantry, the rig a chain
// foundry uses to certify a link by pulling it as hard as the spec demands
// and watching whether it lets go. tangle does the same job for a linking
// number -- pull, and either hand back a certificate or refuse -- except it
// never guesses and it is instant: 0 wrong certificates in 2,000 diagrams
// and 80 scenes (data/showcase.json, p-tangle.specs).
//
// The rig: an A-frame hoist grips a single heavy test coupon between a
// fixed top clamp (hung from the hook by a rigid rod) and a lower clamp
// that pulls away from it on a beat, holds the pull taut while the gauge
// climbs and a crate lifts off the snow, and ejects a certificate plate
// from the head housing the instant the hold catches. An ordinary tensile
// rig doing an ordinary tensile-rig cycle -- ungeared from the landing
// figure's own two interlocked rings and their crossing points.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import { useUi } from "../../../lib/world/store";
import { C, glow, mat } from "../palette";

const INK = "#1c1b19"; // the landing site's own --ink: the lacquered test coupon
const POP = "#ff8a3d"; // warm amber pop, alongside the radiation-green accent

// --- frame -------------------------------------------------------------
const POST_X = 2.0, POST_W = 0.6, POST_D = 0.6, POST_H = 6.6;
const POST_TILT = (6 * Math.PI) / 180; // A-frame: tops lean in -- a gantry, not a doorway
const POST_BASE_SHIFT = (POST_H / 2) * Math.sin(POST_TILT); // keeps the tilted base over its footing
const BEAM_Y = POST_H + 0.16, BEAM_LEN = POST_X * 2 + POST_W + 0.16, BEAM_H = 1.0, BEAM_D = 1.1;
// cab shrunk and pulled in from -0.3 to -0.15: far corner was 2.935m from
// origin, 6.5cm inside the 3m place.radius; now sqrt(2.65^2+0.45^2)=2.69m,
// a real 0.31m margin.
const CAB_W = 1.0, CAB_H = 0.9, CAB_D = 0.9, CAB_X = -POST_X - 0.15;
const FOOT_W = 0.9, FOOT_H = 0.5, FOOT_D = 1.3;
const HOOK_Y = POST_H - 0.5, ROD_Y0 = HOOK_Y - 0.15;

// the cross-brace: two diagonal beams between the posts, below the beam --
// reads as a hoist truss at game distance instead of a plain goalpost
const BRACE_SECTION = 0.3, BRACE_Y_LOW = 1.0, BRACE_Y_HIGH = POST_H - 1.3;
const BRACE_DX = POST_X * 2, BRACE_DY = BRACE_Y_HIGH - BRACE_Y_LOW;
const BRACE_LEN = Math.hypot(BRACE_DX, BRACE_DY);
const BRACE_ANGLE = Math.atan2(BRACE_DY, BRACE_DX);
const BRACE_MID_Y = (BRACE_Y_LOW + BRACE_Y_HIGH) / 2;

// --- the test coupon -------------------------------------------------------
// One item, gripped top and bottom -- not a pair of rings, so there is no
// crossing point to track: the top clamp is bolted to the rod (fixed), the
// bottom clamp descends to pull the coupon taut and rises to release it.
const CLAMP_W = 0.6, CLAMP_H = 0.34, CLAMP_D = 0.6;
const COUPON_R = 0.22; // reads chunky at 35 m
const ANCHOR_Y = 3.9; // top clamp centre: fixed, hangs from the hook
const ANCHOR_TOP = ANCHOR_Y + CLAMP_H / 2;
const ROD_LEN = ROD_Y0 - ANCHOR_TOP;
const SEP_REST = 1.2; // clamp-centre gap at rest
const SEP_TIGHT = 1.84; // full test pull
const SWING_AMP = 0.14, SWING_FREQ = 0.5;

const CYCLE_FAR = 7.5, CYCLE_NEAR = 4.2, EASE = 4;

// --- the gauge, the load, the certificate --------------------------------
const GAUGE_Y = 3.2, GAUGE_H = 1.8, GAUGE_Z = POST_D / 2 + 0.06;
const GAUGE_FILL_MAX = 1.5; // inside the 1.8 m housing
const CRATE_H = 0.9, CRATE_Z = 0.9;
const PLATE_X = 0.55, PLATE_RETRACT_Z = BEAM_D / 2 - 0.05, PLATE_OUT_Z = BEAM_D / 2 + 0.55;

const POST_GEO = new BoxGeometry(POST_W, POST_H, POST_D);
const POST_CAP_GEO = new BoxGeometry(POST_W + 0.1, 0.18, POST_D + 0.1);
const FOOT_GEO = new BoxGeometry(FOOT_W, FOOT_H, FOOT_D);
const BEAM_GEO = new BoxGeometry(BEAM_LEN, BEAM_H, BEAM_D);
const FRONT_PANEL_GEO = new BoxGeometry(BEAM_LEN - 0.3, BEAM_H - 0.2, 0.04);
const WINDOW_BAND_GEO = new BoxGeometry(BEAM_LEN - 0.06, 0.14, 0.05);
const CAB_GEO = new BoxGeometry(CAB_W, CAB_H, CAB_D);
const CAB_WINDOW_GEO = new BoxGeometry(0.5, 0.4, 0.04);
// pad shrunk from +0.1 to +0.02 (review round 2): a +0.1 pad put the cap's
// far corner at 2.746m from origin, only 0.254m inside place.radius=3, below
// the >=0.3m bar this round set. +0.02 puts it at 2.70m, a 0.30m margin.
const CAB_CAP_GEO = new BoxGeometry(CAB_W + 0.02, 0.12, CAB_D + 0.02);
const BRACE_GEO = new BoxGeometry(BRACE_LEN, BRACE_SECTION, BRACE_SECTION);
const HOOK_GEO = new TorusGeometry(0.11, 0.032, 8, 16);
const LOAD_HOOK_GEO = new TorusGeometry(0.16, 0.05, 8, 16);
const ROD_GEO = new CylinderGeometry(0.024, 0.024, Math.max(0.08, ROD_LEN), 6);
const CLAMP_GEO = new BoxGeometry(CLAMP_W, CLAMP_H, CLAMP_D);
const COUPON_GEO = new CylinderGeometry(COUPON_R, COUPON_R, 1, 10); // unit height; scale.y is the span
const GAUGE_GEO = new BoxGeometry(0.5, GAUGE_H, 0.12);
const GAUGE_FILL_GEO = new BoxGeometry(0.34, 1, 0.03); // unit height; scale.y is the fill level
const GAUGE_GLOW_GEO = new BoxGeometry(0.62, GAUGE_H + 0.14, 0.05);
const CRATE_GEO = new BoxGeometry(1.1, CRATE_H, 1.1);
const CORNER_GEO = new BoxGeometry(0.12, CRATE_H, 0.12);
const PLATE_GEO = new BoxGeometry(0.9, 0.6, 0.08);
const PLATE_BORDER_GEO = new BoxGeometry(1.1, 0.8, 0.05);

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

export default function Link({ place }) {
  const near = useUi((s) => s.near === place.id);
  const nearRef = useRef(near);
  nearRef.current = near;
  const nearK = useRef(0);

  const accent = place.radiation ?? place.color;

  const frameMat = useMemo(() => mat(C.charcoal, { roughness: 0.55, metalness: 0.35 }), []);
  const skidMat = useMemo(() => mat(C.metal, { roughness: 0.6, metalness: 0.3 }), []);
  const inkMat = useMemo(() => mat(INK, { flat: false, roughness: 0.2, metalness: 0.55 }), []);
  const clampMat = useMemo(() => mat(C.metal, { flat: false, roughness: 0.3, metalness: 0.6 }), []);
  const accentMat = useMemo(() => mat(accent, { roughness: 0.4, metalness: 0.2 }), [accent]);
  const bandMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 1.4, roughness: 0.3 }), [accent]);
  const popMat = useMemo(() => mat(POP, { roughness: 0.35, metalness: 0.25 }), []);
  const gaugeMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 0.6, roughness: 0.35 }).clone(), [accent]);
  const gaugeGlowMat = useMemo(() => glow(accent, 0.24), [accent]);
  const plateWhiteMat = useMemo(() => mat("#ffffff", { roughness: 0.25, metalness: 0.05 }), []);

  useEffect(() => () => { gaugeMat.dispose(); }, [gaugeMat]);

  const topClampRef = useRef(null);
  const bottomClampRef = useRef(null);
  const couponRef = useRef(null);
  const loadHookRef = useRef(null);
  const crateGroupRef = useRef(null);
  const gaugeFillRef = useRef(null);
  const plateGroupRef = useRef(null);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-EASE * dt);
    nearK.current += ((nearRef.current ? 1 : 0) - nearK.current) * k;
    const boost = nearK.current;

    const raw = state.clock.elapsedTime;
    const t = raw * (1 + 0.6 * boost);

    // the pull cycle: clamp apart, hold (catch, recoil), release
    const cycle = CYCLE_FAR - (CYCLE_FAR - CYCLE_NEAR) * boost;
    const p = ((raw % cycle) / cycle + 1) % 1;
    let sep, glowK;
    if (p < 0.3) {
      const e = smooth(p / 0.3);
      sep = SEP_REST + (SEP_TIGHT - SEP_REST) * e; // pulled taut: separation grows
      glowK = e;
    } else if (p < 0.55) {
      const u = (p - 0.3) / 0.25;
      sep = SEP_TIGHT - 0.03 * Math.sin(u * Math.PI * 3) * Math.exp(-u * 2.5); // caught, recoils
      glowK = 1;
    } else if (p < 0.85) {
      const e = smooth((p - 0.55) / 0.3);
      sep = SEP_TIGHT + (SEP_REST - SEP_TIGHT) * e;
      glowK = 1 - e;
    } else {
      sep = SEP_REST;
      glowK = 0;
    }
    const byY = ANCHOR_Y - sep; // bottom clamp moves DOWN, away from the fixed top clamp

    const swing = SWING_AMP * Math.sin(t * SWING_FREQ);
    const sx = Math.sin(swing) * 0.05;

    if (topClampRef.current) topClampRef.current.position.x = sx;
    if (bottomClampRef.current) bottomClampRef.current.position.set(sx, byY, 0);
    if (couponRef.current) {
      const span = Math.max(0.1, ANCHOR_Y - CLAMP_H / 2 - (byY + CLAMP_H / 2));
      couponRef.current.position.set(sx, (ANCHOR_Y + byY) / 2, 0);
      couponRef.current.scale.y = span;
    }

    const glowMul = 1 + 0.4 * boost;
    const intensity = (0.12 + 2.6 * glowK) * glowMul;
    gaugeMat.emissiveIntensity = intensity;

    // the load: a hook riding the bottom clamp, a crate that lifts while
    // the rig holds the pull -- the rig's normal job, done visibly.
    if (loadHookRef.current) loadHookRef.current.position.set(sx, byY - CLAMP_H / 2 - 0.12, 0);
    if (crateGroupRef.current) crateGroupRef.current.position.y = CRATE_H / 2 + 0.4 * glowK;

    // the gauge fill: a real level climbing the housing, not a decoration
    if (gaugeFillRef.current) {
      const fillH = Math.max(0.06, GAUGE_FILL_MAX * glowK);
      gaugeFillRef.current.scale.y = fillH;
      gaugeFillRef.current.position.y = GAUGE_Y - GAUGE_H / 2 + 0.08 + fillH / 2;
    }

    // the certificate: only shown while the coupon is actually held taut
    if (plateGroupRef.current) {
      const slideK = clamp01((glowK - 0.95) / 0.05);
      plateGroupRef.current.position.z = PLATE_RETRACT_Z + (PLATE_OUT_Z - PLATE_RETRACT_Z) * slideK;
    }
  });

  return (
    <group>
      {/* the gantry: an A-frame hoist, splayed 6 deg so it reads as a crane, not a doorway */}
      <mesh geometry={FOOT_GEO} material={skidMat} position={[-POST_X, FOOT_H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={FOOT_GEO} material={skidMat} position={[POST_X, FOOT_H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={POST_GEO} material={frameMat} position={[-POST_X + POST_BASE_SHIFT, POST_H / 2, 0]} rotation={[0, 0, -POST_TILT]} castShadow receiveShadow />
      <mesh geometry={POST_GEO} material={frameMat} position={[POST_X - POST_BASE_SHIFT, POST_H / 2, 0]} rotation={[0, 0, POST_TILT]} castShadow receiveShadow />
      <mesh geometry={POST_CAP_GEO} material={accentMat} position={[-POST_X, POST_H + 0.1, 0]} castShadow />
      <mesh geometry={POST_CAP_GEO} material={accentMat} position={[POST_X, POST_H + 0.1, 0]} castShadow />
      <mesh geometry={BRACE_GEO} material={accentMat} position={[0, BRACE_MID_Y, 0]} rotation={[0, 0, BRACE_ANGLE]} castShadow />
      <mesh geometry={BRACE_GEO} material={accentMat} position={[0, BRACE_MID_Y, 0]} rotation={[0, 0, -BRACE_ANGLE]} castShadow />
      <mesh geometry={BEAM_GEO} material={frameMat} position={[0, BEAM_Y, 0]} castShadow />
      <mesh geometry={FRONT_PANEL_GEO} material={accentMat} position={[0, BEAM_Y, BEAM_D / 2 + 0.03]} />
      <mesh geometry={WINDOW_BAND_GEO} material={bandMat} position={[0, BEAM_Y - BEAM_H / 2 + 0.16, BEAM_D / 2 + 0.06]} />
      <mesh geometry={CAB_GEO} material={frameMat} position={[CAB_X, BEAM_Y, 0]} castShadow />
      <mesh geometry={CAB_CAP_GEO} material={popMat} position={[CAB_X, BEAM_Y + CAB_H / 2 + 0.06, 0]} castShadow />
      <mesh geometry={CAB_WINDOW_GEO} material={mat(C.lampGlow, { emissive: C.lampGlow, emissiveIntensity: 1.1, roughness: 0.3 })} position={[CAB_X, BEAM_Y + 0.05, CAB_D / 2 + 0.02]} />
      <mesh geometry={HOOK_GEO} material={frameMat} position={[0, HOOK_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={ROD_GEO} material={frameMat} position={[0, (ROD_Y0 + ANCHOR_TOP) / 2, 0]} />

      {/* the certificate gauge, mounted on the near post: a housing, a real fill level, a soft backing glow */}
      <mesh geometry={GAUGE_GLOW_GEO} material={gaugeGlowMat} position={[-POST_X, GAUGE_Y, GAUGE_Z + 0.1]} />
      <mesh geometry={GAUGE_GEO} material={frameMat} position={[-POST_X, GAUGE_Y, GAUGE_Z]} castShadow />
      <mesh ref={gaugeFillRef} geometry={GAUGE_FILL_GEO} material={gaugeMat} position={[-POST_X, GAUGE_Y, GAUGE_Z + 0.05]} />

      {/* the load: hooked below the bottom clamp, lifted while the rig holds the pull */}
      <mesh ref={loadHookRef} geometry={LOAD_HOOK_GEO} material={frameMat} rotation={[Math.PI / 2, 0, 0]} />
      <group ref={crateGroupRef} position={[0, CRATE_H / 2, CRATE_Z]}>
        <mesh geometry={CRATE_GEO} material={frameMat} castShadow receiveShadow />
        <mesh geometry={CORNER_GEO} material={accentMat} position={[0.49, 0, 0.49]} />
        <mesh geometry={CORNER_GEO} material={accentMat} position={[-0.49, 0, 0.49]} />
        <mesh geometry={CORNER_GEO} material={accentMat} position={[0.49, 0, -0.49]} />
        <mesh geometry={CORNER_GEO} material={accentMat} position={[-0.49, 0, -0.49]} />
      </group>

      {/* the test coupon: one heavy item gripped top and bottom, pulled taut
          on a beat -- an ordinary tensile rig, not a restaging of two
          interlocked rings. Top clamp is bolted to the rod (fixed); the
          bottom clamp does the pulling. */}
      <mesh ref={topClampRef} geometry={CLAMP_GEO} material={clampMat} position={[0, ANCHOR_Y, 0]} castShadow receiveShadow />
      <mesh ref={bottomClampRef} geometry={CLAMP_GEO} material={clampMat} position={[0, ANCHOR_Y - SEP_REST, 0]} castShadow receiveShadow />
      <mesh ref={couponRef} geometry={COUPON_GEO} material={inkMat} position={[0, ANCHOR_Y - SEP_REST / 2, 0]} castShadow />

      {/* the certificate: slides out of the head housing only while held, and retracts on release */}
      <group ref={plateGroupRef} position={[PLATE_X, BEAM_Y, PLATE_RETRACT_Z]}>
        <mesh geometry={PLATE_BORDER_GEO} material={accentMat} position={[0, 0, -0.02]} />
        <mesh geometry={PLATE_GEO} material={plateWhiteMat} position={[0, 0, 0.02]} castShadow />
      </group>
    </group>
  );
}
