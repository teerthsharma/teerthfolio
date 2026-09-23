"use client";

// Seal variant D: the cutest harp-seal pup, a chibi. The head is over half
// the pup: huge glossy eyes set low and wide, a tiny nose on freckled pads,
// blush, a little "w" mouth; a plump body tapers to a forked tail and short
// flippers splay onto the snow. Geometry: D-parts.js. Props: ../../Seal.jsx.
//
//   hop        the JUMP_IN hop (lib/world/moments.js), sinking into water
//    body      lean, squash about the ground, happy wiggle, breath, stretch
//     rear     the galumph rocks the chest up about the hips, then the hips
//      neck    counter-pitches so the eyes stay steady; nods on a squish
//       head   = headRef, origin the skull centre: face, <Outfit>
//      flippers paddle, wave, flap when happy, sweep back for boost
//      tail    lifts with the hips, wags, flicks
//
// Beyond drive's signals it adds only secondary motion of its own: the idle
// head tilt, a slow content blink now and then, a happy squish when it
// comes to a stop, the hop, and THE BUDDHA SEAL: left alone it sits up on
// its tail, breathes slow, closes its eyes into a soft curve and grows a
// halo in the area's radiation colour (live.seal.calm, 0..1).

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NormalBlending, RingGeometry } from "three";
import { JUMP_IN, SKIP_WINDOW } from "../../../../lib/world/moments";
import { districtAt } from "../../../../lib/world/places";
import { getUi, live, useUi } from "../../../../lib/world/store";
import { glow } from "../../palette";
import Outfit, { HEAD_RADIUS } from "../Outfit";
import { buildSealD, FLIPPER_REST, MOUTH, PIVOT, SKULL } from "./D-parts";

const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const HOP_HEIGHT = 0.9; // m
// The outfit is made for a 0.45 m skull; this one is rounder.
const OUTFIT_SCALE = (SKULL[0] + SKULL[1] + SKULL[2]) / 3 / HEAD_RADIUS;
// The halo off district, or before the first meditation after spawn: warm
// gold, so it still reads against open snow instead of a pale ring fading
// into it.
const HALO_DEFAULT = "#ffd66b";

function materials() {
  return {
    coat: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.5,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      sheen: 0.5,
      sheenColor: new Color("#e4ecff"),
      sheenRoughness: 0.45,
      emissive: new Color("#000000"),
      emissiveIntensity: 0,
    }),
    eye: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
    glint: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    mouth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
  };
}

// o: the flipper's pivot group; side +1 left, -1 right; x: this frame's
// shared amounts (see useFrame).
function poseFlipper(o, side, d, x) {
  const s = Math.sin(x.phase + (side > 0 ? 0 : 0.5)); // the right one a beat behind
  const reach = Math.max(0, s) * x.amp; // swings forward as the chest lifts
  const push = Math.max(0, -s) * x.amp; // pushes back on each landing
  const wave = (d.waveSide === side ? d.wave : 0) * (1 - x.calm); // no waving mid-meditation
  const flap = d.happy * (0.5 + 0.5 * Math.sin(d.t * 15 + side));
  const swim = x.water * Math.sin(d.t * 5 + side * 1.6);
  const back = FLIPPER_REST.back - 0.4 * reach + 0.5 * push + (1.3 - FLIPPER_REST.back) * d.boost - 0.6 * wave + Math.sin(d.t * 16) * 0.35 * wave + 0.6 * swim - 0.55 * x.calm;
  const down = FLIPPER_REST.down + 0.12 * reach - (FLIPPER_REST.down - 0.2) * d.boost - 1.8 * wave - 0.5 * flap - 1.2 * x.fly + 0.2 * x.crouch - 0.3 * x.water + 0.35 * x.calm;
  o.rotation.set(Math.sin(d.t * 16) * 0.3 * wave, back, -down, "YZX");
}

export default function SealD({ pose, near, drive, headRef }) {
  const parts = useMemo(buildSealD, []);
  const mats = useMemo(materials, []);
  // The meditation halo: a ring plus a softer, wider glow ring behind it,
  // both bigger than the skull (0.52 m) so it reads as a halo and not a
  // ring-toss ring, each its own cloned glow material so colour and fade
  // can be mutated per frame without touching palette.js's shared cache.
  // glow()'s additive blend reads only against something dark; the halo
  // sits over bright snow as often as not, so the crisp ring is switched to
  // a normal alpha blend (a soft tinted ring, visible on any backdrop), both
  // sides in case the seal is seen from behind it; the wide glow ring stays
  // additive, for the bloom. Unlit: cheap, no extra shadow-casting light.
  const haloGeo = useMemo(() => new RingGeometry(0.58, 0.68, 48), []);
  const haloSoftGeo = useMemo(() => new RingGeometry(0.52, 0.78, 48), []);
  const haloMat = useMemo(() => {
    const m = glow(HALO_DEFAULT, 0.85).clone();
    m.blending = NormalBlending;
    m.side = DoubleSide;
    return m;
  }, []);
  const haloSoftMat = useMemo(() => {
    const m = glow(HALO_DEFAULT, 0.35).clone();
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => {
    for (const g of Object.values(parts)) g.dispose?.();
    for (const m of Object.values(mats)) m.dispose();
    haloGeo.dispose();
    haloSoftGeo.dispose();
    haloMat.dispose();
    haloSoftMat.dispose();
  }, [parts, mats, haloGeo, haloSoftGeo, haloMat, haloSoftMat]);
  // ?sealface=happy|blink holds that expression, for close-up captures.
  const [force] = useState(() => new URLSearchParams(window.location.search).get("sealface"));

  // JUMP_IN: only when the intro was up as the pup mounted, so ?play and
  // ?spawn= (started before the first frame) never hop.
  const started = useUi((s) => s.started);
  const [hopArmed] = useState(() => !getUi().started);
  const fx = useRef({
    shut: 0, hold: 0, squish: 0, squishV: 0, moving: false,
    hopAt: -1, hopPending: false, landed: true,
    calm: 0, haloColor: HALO_DEFAULT,
    districtId: null, districtFlash: 0, absorbAt: 0, absorbFlash: 0,
  });
  useEffect(() => {
    if (started && hopArmed) fx.current.hopPending = true;
  }, [started, hopArmed]);

  const hop = useRef();
  const body = useRef();
  const rear = useRef();
  const neck = useRef();
  const tail = useRef();
  const flipL = useRef();
  const flipR = useRef();
  const eyes = useRef();
  const glints = useRef();
  const happyEyes = useRef();
  const shutEyes = useRef();
  const mouth = useRef();
  const halo = useRef();
  const haloSoft = useRef();
  const shared = useMemo(() => ({ phase: 0, amp: 0, fly: 0, crouch: 0, water: 0, calm: 0 }), []);

  useFrame((state, delta) => {
    const d = drive;
    const f = fx.current;
    const t = d.t;
    const dt = Math.min(delta, 0.1);
    const water = clamp(pose.current.water || 0, 0, 1);

    // The hop: crouch, leave the snow at hopAt, land at landAt with a squash.
    if (f.hopPending) {
      f.hopPending = false;
      if (t > SKIP_WINDOW) {
        f.hopAt = t;
        f.landed = false;
      }
    }
    const u = f.hopAt < 0 ? Infinity : t - f.hopAt;
    const crouch = u < JUMP_IN.hopAt ? smooth(JUMP_IN.hopAt - 0.45, JUMP_IN.hopAt - 0.05, u) : 0;
    const flying = u >= JUMP_IN.hopAt && u < JUMP_IN.landAt;
    const fly = flying ? (u - JUMP_IN.hopAt) / (JUMP_IN.landAt - JUMP_IN.hopAt) : 0;
    if (!f.landed && u >= JUMP_IN.landAt) {
      f.landed = true;
      f.squishV += 9;
    }

    // A happy squish when it comes to a stop: a spring kicked once.
    if (d.gait > 0.45) f.moving = true;
    else if (f.moving && d.speed < 0.35) {
      f.moving = false;
      f.squishV += 5.5;
    }
    f.squishV += (-150 * f.squish - 9 * f.squishV) * dt;
    f.squish = clamp(f.squish + f.squishV * dt, -0.5, 1);
    const squish = f.squish;

    // Galumph: the chest lifts first, the hips 0.3 of a stride later.
    const phase = TAU * d.stride;
    const amp = d.stepping * (1 - 0.5 * d.boost) * (1 - water);
    const s = Math.sin(phase);
    const liftC = Math.max(0, s) * amp;
    const liftH = Math.max(0, Math.sin(phase - TAU * 0.3)) * amp;
    const land = Math.max(0, -s) * amp;
    const sq = d.squash; // a bump
    const wiggle = Math.sin(t * 18) * d.happy;

    // THE BUDDHA SEAL: left alone (drive's idle, seconds since it last moved)
    // it eases into a meditation pose over about a second once idle passes
    // 3.4s, and drops out fast (never a hard cut) the moment the visitor
    // moves idle back to 0. live.seal.calm is the eased 0..1 the rest of the
    // world may read (motes, a Geiger-to-chime cue); it never touches the
    // seal's own health, just its pose.
    const calmTarget = smooth(3.4, 4.4, d.idle);
    f.calm += (calmTarget - f.calm) * damp(calmTarget > f.calm ? 2.2 : 6, dt);
    const sit = f.calm;
    live.seal.calm = sit;

    const h = hop.current;
    h.position.y = (flying ? 4 * HOP_HEIGHT * fly * (1 - fly) : 0) - 0.62 * water;
    h.rotation.x = flying ? -0.35 * (1 - 2 * fly) : 0;

    const b = body.current;
    const stretch = flying ? 0.12 * (1 - Math.sin(Math.PI * fly) * 0.6) : 0;
    const flat = (1 - 0.3 * sq) * (1 - 0.22 * squish) * (1 - 0.2 * crouch) * (1 - 0.06 * land) * (1 - 0.06 * d.boost);
    const wide = (1 + 0.15 * sq) * (1 + 0.1 * squish) * (1 + 0.1 * crouch);
    // A slow, deep breathing sway on top of the ambient one as it meditates.
    const breathe = (0.015 + 0.02 * sit) * Math.sin(t * (2.4 - 1.3 * sit));
    b.scale.set(wide, flat * (1 + stretch) * (1 + breathe), wide * (1 + 0.06 * liftC + 0.08 * d.boost));
    b.rotation.z = d.lean + 0.14 * wiggle;

    // Chest hump: the galumph rocks the whole upper body up and back about
    // the rear pivot (raised from a barely-visible -0.15*liftC to a hump C
    // shows clearly), plus 15% of a head-look yaw and, meditating, the rear
    // pitches UP (negative x tips +z toward +y here) so the pup sits up onto
    // its tail instead of bowing its chin into the snow.
    const r = rear.current;
    r.position.y = 0.07 * liftH + 0.05 * sit;
    r.rotation.set(-0.32 * liftC + 0.05 * liftH - 0.12 * water - 0.6 * sit, d.turn * 0.06 + d.lookYaw * 0.15, 0);

    // Head: the drive's look, the face tipped up toward the lens (the camera
    // sits 50 degrees up; a big-headed pup looking down shows only forehead),
    // chin up while it slides, and a curious tilt that drifts while it rests.
    // A glance bends chest (15%, above), neck (35%) and head (50%) together,
    // the way C's skin does, instead of the head alone swivelling.
    const rest = 1 - d.gait;
    const pitch = (d.lookPitch > 0 ? Math.min(d.lookPitch * 1.4, 0.5) : d.lookPitch) + 0.22 * d.gait;
    const tilt = rest * (1 - sit) * (0.13 * Math.sin(t * 0.55 + 0.6) + 0.04 * Math.sin(t * 1.4)) + 0.15 * d.lookYaw + 0.1 * wiggle;
    headRef.current.rotation.set(-pitch + 0.1 * sit, d.lookYaw * 0.5, tilt, "YXZ");
    neck.current.rotation.set(
      0.27 * liftC + 0.3 * Math.max(0, sq) + 0.25 * Math.max(0, squish) + 0.3 * crouch - 0.25 * (flying ? 1 - fly : 0) + 0.25 * sit,
      d.lookYaw * 0.35,
      0,
    );

    const flick = Math.max(0, Math.sin(t * 0.83)) ** 50 * rest;
    tail.current.rotation.set(
      0.3 * liftH + 0.5 * flick + 0.1 * d.boost + 0.4 * (flying ? 1 : 0),
      Math.sin(t * 7.5) * (0.05 + 0.15 * d.gait) + Math.sin(t * 18) * 0.5 * d.happy,
      0,
    );

    shared.phase = phase;
    shared.amp = amp;
    shared.fly = flying ? Math.sin(Math.PI * Math.min(1, fly * 1.6)) : 0;
    shared.crouch = crouch;
    shared.water = water;
    shared.calm = sit;
    poseFlipper(flipL.current, 1, d, shared);
    poseFlipper(flipR.current, -1, d, shared);

    // THE STORY, show not tell: every place is radioactive. The coat glows
    // in whichever area's colour the seal stands in, and flashes brighter
    // (a spring kick too) the instant a mote lands on it
    // (live.seal.absorbAt/absorbColor, Radiation.jsx) or the area changes,
    // so arriving somewhere pops and smiles instead of announcing itself.
    const hereDistrict = districtAt(pose.current.x, pose.current.z);
    const hereId = hereDistrict ? hereDistrict.id : null;
    if (hereId !== f.districtId) {
      f.districtId = hereId;
      f.squishV += 7;
      f.districtFlash = 1;
    } else {
      f.districtFlash = Math.max(0, f.districtFlash - dt / 1.4);
    }
    const absorbAt = pose.current.absorbAt || 0;
    if (absorbAt !== f.absorbAt) {
      f.absorbAt = absorbAt;
      f.absorbFlash = 1;
    } else if (f.absorbFlash > 0) {
      f.absorbFlash = Math.max(0, f.absorbFlash - dt / 0.35);
    }
    if (hereDistrict) mats.coat.emissive.set(hereDistrict.radiation ?? hereDistrict.color);
    mats.coat.emissiveIntensity = Math.max(hereDistrict ? 0.22 : 0, 0.8 * f.absorbFlash);

    // Face. Blinks close fast and open a little slower; every fourth blink
    // while it rests is a slow, content one. A hard bump squeezes them shut,
    // and meditating eases them the rest of the way to the same closed face.
    // Past a soft-close threshold the flat squash swaps to C's closed-curve
    // geometry: a squashed sphere reads as squinting, an arc reads as shut.
    // Arriving, a happy squish and the hop squint them into ^^ and open the
    // smile; so does landing on this district or a mote's touch.
    const slow = d.idle > 2 && d.idle < 3.3 && d.blinks % 4 === 3;
    if (slow && d.blink > 0) f.hold = t + 0.4;
    let target = force === "blink" ? 1 : Math.max(d.blink, smooth(0.4, 0.6, sq), sit);
    if (t < f.hold) target = 1;
    f.shut += (target - f.shut) * damp(target > f.shut ? (slow ? 14 : 45) : slow ? 4 : 11, dt);
    const squint = force === "happy" ? 1 : Math.max(smooth(0.3, 0.55, d.happy), smooth(0.1, 0.25, squish), smooth(0.3, 0.55, f.districtFlash), flying ? 1 : 0);
    const happy = squint > 0.5;
    const closed = !happy && f.shut > 0.55;
    eyes.current.visible = !happy && !closed;
    eyes.current.scale.y = (1 - 0.7 * f.shut) * (1 - squint);
    glints.current.visible = eyes.current.visible && f.shut < 0.35;
    shutEyes.current.visible = closed;
    happyEyes.current.visible = happy;
    mouth.current.visible = squint > 0.01;
    mouth.current.scale.setScalar(Math.max(squint, 0.01));

    // The halo: fades and grows in behind the head, tinted to whichever
    // radioactive area the seal is meditating in, and turns slowly. Off
    // district (nothing underfoot to pick up, or the first meditation after
    // spawn) it stays warm gold instead of fading into the snow at a coloured
    // area's lower opacity.
    let onDistrict = false;
    if (sit > 0.02) {
      onDistrict = !!hereDistrict;
      const col = hereDistrict ? hereDistrict.radiation : HALO_DEFAULT;
      if (col !== f.haloColor) {
        f.haloColor = col;
        haloMat.color.set(col);
        haloSoftMat.color.set(col);
      }
    }
    const g = halo.current;
    const soft = haloSoft.current;
    g.visible = sit > 0.01;
    soft.visible = g.visible;
    if (g.visible) {
      g.rotation.z += dt * 0.2;
      const scale = 0.6 + 0.4 * sit;
      g.scale.setScalar(scale);
      soft.rotation.z = g.rotation.z;
      soft.scale.setScalar(scale);
      haloMat.opacity = (onDistrict ? 0.6 : 0.85) * sit;
      haloSoftMat.opacity = 0.35 * sit;
    }
  });

  const { coat } = mats;
  const shoulder = rel(PIVOT.shoulder, PIVOT.rear);
  const neckAt = rel(PIVOT.neck, PIVOT.rear);
  return (
    <group ref={hop}>
      <group ref={body}>
        <group ref={rear} position={PIVOT.rear}>
          <mesh geometry={parts.body} material={coat} castShadow receiveShadow />
          <group ref={flipL} position={shoulder}>
            <mesh geometry={parts.flipper} material={coat} castShadow receiveShadow />
          </group>
          <group scale={[-1, 1, 1]}>
            <group ref={flipR} position={shoulder}>
              <mesh geometry={parts.flipper} material={coat} castShadow receiveShadow />
            </group>
          </group>
          <group ref={tail} position={rel(PIVOT.tail, PIVOT.rear)}>
            <mesh geometry={parts.tail} material={coat} castShadow receiveShadow />
          </group>
          <group ref={neck} position={neckAt}>
            <group ref={headRef} position={rel(PIVOT.head, PIVOT.neck)}>
              <mesh geometry={parts.head} material={coat} castShadow receiveShadow />
              <group ref={eyes} position={parts.eyePivot}>
                <mesh geometry={parts.lenses} material={mats.eye} />
                <mesh ref={glints} geometry={parts.glints} material={mats.glint} />
              </group>
              <mesh ref={happyEyes} geometry={parts.happyEyes} material={mats.eye} visible={false} />
              <mesh ref={shutEyes} geometry={parts.shutEyes} material={mats.eye} visible={false} />
              <mesh ref={mouth} geometry={parts.mouth} material={mats.mouth} position={MOUTH} visible={false} />
              <group scale={OUTFIT_SCALE}>
                <Outfit placeId={near} />
              </group>
              <mesh ref={halo} geometry={haloGeo} material={haloMat} position={[0, 0.12, -0.42]} rotation={[-0.35, 0, 0]} visible={false} />
              <mesh ref={haloSoft} geometry={haloSoftGeo} material={haloSoftMat} position={[0, 0.12, -0.42]} rotation={[-0.35, 0, 0]} visible={false} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
