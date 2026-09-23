"use client";

// THE TENSORFLOW DAM (tensorflow/tensorflow #124410) and THE XLA GEYSER
// (openxla/xla #46539) at its foot (lib/world/river.js has the geology:
// TensorFlow's fix now reads as a human-made dam, not a natural ice
// formation -- see parts/dam-wall.js for the full story).
//
//   - THE GLACIER: Triton's outlet glacier still runs down the valley's
//     west bank, natural rough ice, same as it always did.
//   - THE DAM: a Hoover-Dam-scaled concrete arch-gravity wall where the
//     glacier would have curled across the valley -- a concave downstream
//     face, a crest road with a parapet and lamps, two art-deco intake
//     towers in the lake, a powerhouse at the foot, a pale bathtub ring on
//     the rock at the waterline (parts/dam-wall.js builds all of it).
//   - THE ANOMALY: the spillway chutes recessed into the downstream face
//     glow and climb -- the water runs UP the dam face, not down. Base
//     outlets right below them roar the ordinary way, outward and down
//     into the river, so the one wrong thing reads against a normal one.
//   - THE GEYSER: a sinter mound at the vent, dormant but visibly hot
//     (always-on steam), a 3 s build-up of bubbling and puffs, then one
//     big deterministic eruption every 50 real seconds, on the clock,
//     never sped up for the seal being near.
//
// Closure.jsx (the tower) and Settle.jsx (the loom) were explainer diagrams
// for the old design and are not mounted here (SHOW, NEVER TELL): the dam's
// own architecture and the geyser's own beat carry the whole story.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Object3D } from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { live, useUi } from "../../../lib/world/store";
import { clamp, smoothstep } from "../life/util";
import { C, lamp, mat } from "../palette";
import {
  BUBBLES,
  BUILDUP_S,
  DROPS,
  ERUPT_PERIOD,
  FALL_S,
  PUFFS,
  RISE_S,
  SPLASH,
  STEAM,
  STEAM_PERIOD,
  VENT_H,
  VENT_R,
} from "./parts/dam-geyser";
import { buildConcreteWall, buildIceWall, buildSpray, OUTLETS, POWERHOUSE, SPILLWAY_W, SPILLWAYS, TOWERS } from "./parts/dam-wall";

// The sluice rhythm: gates ease open, hold, ease shut -- slow enough to
// watch, never gated to the seal (that's `boost`'s job on top of it).
const GATE_PERIOD = 8; // s, full open-close cycle
const gateOpen = (t) => (Math.sin((t / GATE_PERIOD) * Math.PI * 2 - Math.PI / 2) + 1) / 2;

const DAM_PLACE = PLACE_BY_ID["pr-tensorflow-124410"];
const GEYSER_PLACE = PLACE_BY_ID["pr-openxla-46539"];
const DAM_COLOR = DAM_PLACE.radiation; // #ff8a1a, the area's radiation
const TF_ORANGE = DAM_PLACE.color; // #ff8f00, TensorFlow's own brand orange
const GEYSER_COLOR = GEYSER_PLACE.radiation;

const dummy = new Object3D();

// ---- the dam: the glacier approach, the concrete body, road, accents ------

const iceGeo = buildIceWall();
const concrete = buildConcreteWall();
const sprayGeo = buildSpray();

// ---- the spillway chutes: recessed, glowing, climbing UP the face --------
// (the anomaly). Positioned per SPILLWAYS[i]'s own crestPoint, hugging the
// concave face as it narrows toward the crest, same trick the wedge itself
// uses (parts/dam-wall.js's wedgeShape).
const chuteGeo = new BoxGeometry(SPILLWAY_W, 1, 0.32);
const beadGeo = new IcosahedronGeometry(0.11, 0);
const BEADS_PER = 5;
const SPILL_BEADS = SPILLWAYS.length * BEADS_PER;
// how far proud of the wedge's own curving face each part sits, in metres
const PROUD = 0.16;
const faceAt = (ch, y) => ch.face * (1 - 0.45 * clamp(y / ch.h, 0, 1)) + PROUD;

function Spillways({ boost }) {
  const beadRef = useRef();
  const gateRefs = useRef([]);
  const chuteMat = useMemo(() => lamp(DAM_COLOR, 0.9).clone(), []);
  const beadMat = useMemo(() => lamp(DAM_COLOR, 1.3), []);
  // each chute's own resting centre Y (matches the JSX below): the gate
  // slides down from here as it opens, never recomputed per frame.
  const gateBaseY = useMemo(() => SPILLWAYS.map((ch) => (ch.h * 0.85) / 2 + ch.h * 0.08), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const open = gateOpen(t); // 0 shut, 1 open -- the radial gate's own slow rhythm
    chuteMat.emissiveIntensity = (0.7 + 0.35 * Math.sin(t * 2.1)) * (1 + boost * 0.5) * (0.6 + 0.6 * open);
    // the gate itself: the recessed chute box slides down as it opens, so
    // more of the dark slot behind it shows -- a real radial gate lifting.
    gateRefs.current.forEach((g, i) => {
      if (g) g.position.y = gateBaseY[i] - 0.3 * open;
    });
    const beads = beadRef.current;
    if (!beads) return;
    let n = 0;
    SPILLWAYS.forEach((ch, ci) => {
      const top = ch.h * 0.9;
      const base = ch.h * 0.12;
      for (let b = 0; b < BEADS_PER; b++) {
        const speed = (0.5 + boost * 0.55) * (0.4 + 0.9 * open); // gushes harder open
        const p = (t * speed + b / BEADS_PER + ci * 0.29) % 1;
        // climbing: y rises with p -- normal life would fall, this rises
        const y = base + (top - base) * p;
        const off = faceAt(ch, y);
        dummy.position.set(ch.x + ch.nx * off, y, ch.z + ch.nz * off);
        dummy.scale.setScalar((0.6 + 0.4 * Math.sin(p * Math.PI)) * (1 + boost * 0.3));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(n++, dummy.matrix);
      }
    });
    beads.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {SPILLWAYS.map((ch, i) => {
        const angle = Math.atan2(ch.nx, ch.nz);
        const h = ch.h * 0.85;
        const off = faceAt(ch, h / 2 + ch.h * 0.08);
        return (
          <mesh
            key={i}
            ref={(el) => { gateRefs.current[i] = el; }}
            position={[ch.x + ch.nx * (off - PROUD * 1.5), h / 2 + ch.h * 0.08, ch.z + ch.nz * (off - PROUD * 1.5)]}
            rotation={[0, angle, 0]}
            geometry={chuteGeo}
            scale={[1, h, 1]}
            material={chuteMat}
          />
        );
      })}
      <instancedMesh ref={beadRef} args={[beadGeo, beadMat, SPILL_BEADS]} frustumCulled={false} />
    </group>
  );
}

// ---- the base outlets: normal life -- roaring outward and down into the
// river, the dam working exactly as built. ---------------------------------

// axis baked onto local Z (matching parts/dam-wall.js's own convention: a
// box's local +Z lands on world (nx, nz) after rotating rotation.y by
// atan2(nx, nz), verified there against crestPoint's normal -- so a plain
// mesh rotation={[0, atan2(nx, nz), 0]} aims this pipe straight out along
// the face, no Euler-order guesswork). Longer and narrower than a first
// pass, and set back INTO the wall's own base so it reads as a pipe
// punched through the concrete, not a ball floating in front of it.
const outletGeo = new CylinderGeometry(0.4, 0.46, 1.6, 10).rotateX(Math.PI / 2);
const dropGeoOutlet = new IcosahedronGeometry(0.16, 0);
const OUTLET_DROPS = 10;
const OUTLET_BEADS = OUTLETS.length * OUTLET_DROPS;

function Outlets({ boost }) {
  const beadRef = useRef();
  const pipeMat = useMemo(() => mat(C.charcoal, { roughness: 0.55 }), []);
  const waterMat = useMemo(() => lamp(DAM_COLOR, 1.1), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const open = gateOpen(t); // same slow rhythm as the spillway gates above: harder gush, gates open
    const beads = beadRef.current;
    if (!beads) return;
    let n = 0;
    OUTLETS.forEach((o, oi) => {
      const y0 = 0.9 + (oi % 2) * 0.3;
      for (let d = 0; d < OUTLET_DROPS; d++) {
        const speed = (0.9 + boost * 0.7) * (0.5 + 0.8 * open);
        const p = (t * speed + d / OUTLET_DROPS + oi * 0.4) % 1;
        const spread = 2.2 + 1.4 * ((d * 0.37) % 1);
        const jitter = ((d * 0.61) % 1) - 0.5;
        const dist = spread * p;
        const tx = -o.nz + jitter * 0.5;
        const tz = o.nx + jitter * 0.5;
        // launched from the pipe's own outer tip (0.8 m: half its length),
        // not the wall's base surface -- the water leaves the pipe, not the
        // concrete.
        const x = o.x + o.nx * (0.8 + dist) + tx * dist * 0.3;
        const z = o.z + o.nz * (0.8 + dist) + tz * dist * 0.3;
        const y = Math.max(0.05, y0 * (1 - p) * (1 - p * 0.3));
        dummy.position.set(x, y, z);
        dummy.scale.setScalar((0.6 + 0.5 * (1 - p)) * (1 + boost * 0.3));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(n++, dummy.matrix);
      }
    });
    beads.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {OUTLETS.map((o, i) => (
        <mesh key={i} position={[o.x, 0.9 + (i % 2) * 0.3, o.z]} rotation={[0, Math.atan2(o.nx, o.nz), 0]} geometry={outletGeo} material={pipeMat} />
      ))}
      <instancedMesh ref={beadRef} args={[dropGeoOutlet, waterMat, OUTLET_BEADS]} frustumCulled={false} />
    </group>
  );
}

// ---- the geyser: a sinter mound, always hot, a build-up, then one big,
// deterministic eruption every ERUPT_PERIOD real seconds -----------------

const moundGeo = new CylinderGeometry(VENT_R * 0.15, VENT_R, VENT_H, 9, 1);
moundGeo.translate(0, VENT_H / 2, 0);
const rimGeo = new CylinderGeometry(VENT_R * 0.62, VENT_R * 0.68, 0.22, 12);
const ventGeo = new CylinderGeometry(VENT_R * 0.42, VENT_R * 0.5, 0.4, 12);
const dropGeo = new IcosahedronGeometry(1, 1);
const steamGeo = new IcosahedronGeometry(0.24, 1);
const splashGeo = new IcosahedronGeometry(0.22, 0);
const bubbleGeo = new IcosahedronGeometry(0.1, 0);

function Geyser({ boost }) {
  const dropRef = useRef();
  const steamRef = useRef();
  const splashRef = useRef();
  const buildupRef = useRef();
  const rimMat = useMemo(() => lamp(GEYSER_COLOR, 0.8), []);
  const dropMat = useMemo(() => mat(C.ice, { flat: false, roughness: 0.1, emissive: GEYSER_COLOR, emissiveIntensity: 0.6 }), []);
  const steamMat = useMemo(() => mat(C.warmWhite, { flat: false, roughness: 0.9, opacity: 0.24, emissive: GEYSER_COLOR, emissiveIntensity: 0.12 }), []);
  const splashMat = useMemo(() => mat(C.warmWhite, { flat: false, roughness: 0.85, opacity: 0.5, emissive: GEYSER_COLOR, emissiveIntensity: 0.2 }), []);
  const buildupMat = useMemo(() => mat(C.warmWhite, { flat: false, roughness: 0.9, opacity: 0.3, emissive: GEYSER_COLOR, emissiveIntensity: 0.25 }), []);

  useFrame(({ clock }) => {
    // real seconds: the fix's whole point is the beat never drifts, never
    // speeds up for the seal being near -- only the glow reacts to that.
    // The anomaly: motion.js can also fire an off-beat burst (the seal
    // standing too close throws it flying) at live.geyser.burstAt, a clock
    // timestamp. Whichever eruption -- the scheduled one or that burst --
    // started most recently plays; `regularStart` always stays within 50s of
    // now, so `t` (below) never runs negative or past ERUPT_PERIOD even right
    // after a burst, so the build-up tell (still tied to the real schedule
    // only) never false-fires off a burst.
    const regularStart = clock.elapsedTime - (clock.elapsedTime % ERUPT_PERIOD);
    const burstAt = live.geyser?.burstAt ?? -100;
    const erupted = burstAt > regularStart ? burstAt : regularStart;
    const t = clock.elapsedTime - erupted;
    const eruptDur = RISE_S + FALL_S;
    const erupting = t < eruptDur;
    const buildupStart = ERUPT_PERIOD - BUILDUP_S;
    const inBuildup = t >= buildupStart;
    const buildupT = inBuildup ? (t - buildupStart) / BUILDUP_S : 0;

    const flare = erupting && t < RISE_S ? (t / RISE_S) * 1.1 : 0;
    const buildFlare = inBuildup ? buildupT * 0.5 : 0;
    rimMat.emissiveIntensity = 0.175 + 0.025 * Math.sin(clock.elapsedTime * 1.4) + flare + buildFlare + boost * 0.15;

    // the always-on tell: pale steam puffs rise on their own slow loop,
    // never gated to the eruption clock, so the mound reads hot even
    // dormant.
    const steam = steamRef.current;
    if (steam) {
      STEAM.forEach((s, i) => {
        const p = ((clock.elapsedTime + s.offset * STEAM_PERIOD) % STEAM_PERIOD) / STEAM_PERIOD;
        const r = s.radius + 0.2 * p;
        const fade = Math.sin(p * Math.PI);
        dummy.position.set(Math.cos(s.angle) * r, VENT_H + s.apex * p, Math.sin(s.angle) * r);
        dummy.scale.setScalar(0.45 + 0.55 * fade);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        steam.setMatrixAt(i, dummy.matrix);
      });
      steam.instanceMatrix.needsUpdate = true;
    }

    // the build-up: bubbles jostle at the lip, a couple of bigger puffs
    // kick loose, the last BUILDUP_S seconds before it goes.
    const buildup = buildupRef.current;
    if (buildup) {
      let n = 0;
      BUBBLES.forEach((bub) => {
        const active = inBuildup ? 0.4 + 0.6 * buildupT : 0;
        const jitter = Math.abs(Math.sin(clock.elapsedTime * bub.rate + bub.angle));
        dummy.position.set(Math.cos(bub.angle) * bub.radius, VENT_H + 0.05 + jitter * 0.18, Math.sin(bub.angle) * bub.radius);
        dummy.scale.setScalar(active * (0.5 + 0.5 * jitter));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildup.setMatrixAt(n++, dummy.matrix);
      });
      PUFFS.forEach((puff) => {
        const local = buildupT - puff.at;
        const active = inBuildup && local >= 0 && local < 0.35 ? 1 - local / 0.35 : 0;
        const rise = active > 0 ? (1 - active) : 0;
        dummy.position.set(Math.cos(puff.angle) * 0.5, VENT_H + 0.3 + rise * 1.4, Math.sin(puff.angle) * 0.5);
        dummy.scale.setScalar(active * 0.9);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildup.setMatrixAt(n++, dummy.matrix);
      });
      buildup.instanceMatrix.needsUpdate = true;
    }

    // the eruption: a tall fountain of drops on a fixed, fanned-out way up.
    const drops = dropRef.current;
    if (drops) {
      DROPS.forEach((d, i) => {
        const local = t - d.delay;
        let y = -5;
        let s = 0;
        let r = 0;
        if (local >= 0 && local < RISE_S + FALL_S) {
          if (local < RISE_S) {
            const u = local / RISE_S;
            y = VENT_H + d.apex * smoothstep(0, 1, u);
            r = VENT_R * 0.22 * u;
            s = 0.55 + 0.5 * u;
          } else {
            const u = (local - RISE_S) / FALL_S;
            y = VENT_H + d.apex * (1 - u * u);
            r = VENT_R * (0.22 + d.spread * u);
            s = 0.75 * (1 - u * 0.7);
          }
        }
        dummy.position.set(Math.cos(d.angle) * r, Math.max(y, -5), Math.sin(d.angle) * r);
        dummy.scale.setScalar(clamp(s, 0, 1) * 0.17);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      });
      drops.instanceMatrix.needsUpdate = true;
    }

    // the splash ring: a skirt thrown out at the base as the column falls.
    const splash = splashRef.current;
    if (splash) {
      SPLASH.forEach((sp, i) => {
        const local = t - RISE_S - sp.delay;
        let active = 0;
        let r = 0;
        let y = 0.1;
        if (local >= 0 && local < FALL_S) {
          const u = local / FALL_S;
          r = VENT_R * (0.9 + 1.6 * u);
          y = 0.1 + 0.5 * Math.sin(u * Math.PI);
          active = Math.sin(u * Math.PI);
        }
        dummy.position.set(Math.cos(sp.angle) * r, y, Math.sin(sp.angle) * r);
        dummy.scale.setScalar(active * 0.6);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        splash.setMatrixAt(i, dummy.matrix);
      });
      splash.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[GEYSER_PLACE.x, 0, GEYSER_PLACE.z]}>
      {/* mineral sinter crust, not painted plaster: C.wood holds its own
          silhouette against the snow even fully dormant. */}
      <mesh geometry={moundGeo} material={mat(C.wood, { roughness: 0.75 })} castShadow receiveShadow />
      <mesh position={[0, VENT_H - 0.05, 0]} geometry={rimGeo} material={rimMat} />
      <mesh position={[0, VENT_H, 0]} geometry={ventGeo} material={mat(C.charcoal, { roughness: 0.6 })} />
      <instancedMesh ref={steamRef} args={[steamGeo, steamMat, STEAM.length]} frustumCulled={false} />
      <instancedMesh ref={buildupRef} args={[bubbleGeo, buildupMat, BUBBLES.length + PUFFS.length]} frustumCulled={false} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, DROPS.length]} frustumCulled={false} />
      <instancedMesh ref={splashRef} args={[splashGeo, splashMat, SPLASH.length]} frustumCulled={false} />
    </group>
  );
}

// ---- assembly ---------------------------------------------------------------

export default function IceDam() {
  const near = useUi((s) => s.near);
  const damNear = near === DAM_PLACE.id;
  const geyserNear = near === GEYSER_PLACE.id;
  const damBoost = damNear ? 1 : 0;
  const geyserBoost = geyserNear ? 1 : 0;

  const iceMat = useMemo(() => mat(C.deepIce, { roughness: 0.42 }), []);
  // Metallic, not concrete: brushed steel (Look.jsx's environment map gives
  // it sky and snow to reflect). vertexColors: dam-wall.js still bakes the
  // wedge's own light-to-shadow curve as a per-vertex multiplier (white
  // elsewhere, unchanged) so the whole body -- wedge, piers, towers,
  // powerhouse -- stays one merged, one-draw-call mesh.
  const concreteMat = useMemo(() => mat(C.metal, { roughness: 0.32, metalness: 0.85, vertexColors: true }), []);
  const roadMat = useMemo(() => mat(C.charcoal, { roughness: 0.92 }), []);
  const accentMat = useMemo(() => mat(TF_ORANGE, { roughness: 0.3, metalness: 0.3 }), []);
  const bathtubMat = useMemo(() => mat(C.snow, { roughness: 0.55 }), []);
  const lampMat = useMemo(() => lamp(DAM_COLOR, 1).clone(), []);
  const windowMat = useMemo(() => lamp(DAM_COLOR, 0.7).clone(), []);
  const sprayMat = useMemo(() => mat(C.foam, { roughness: 0.3 }), []);
  const beaconMat = useMemo(() => lamp(DAM_COLOR, 1).clone(), []);
  const turbineMat = useMemo(() => mat(C.charcoal, { roughness: 0.4, metalness: 0.7 }), []);
  const turbineRef = useRef();

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    lampMat.emissiveIntensity = (0.85 + 0.3 * Math.sin(t * 1.6)) * (1 + damBoost * 0.6);
    windowMat.emissiveIntensity = (0.5 + 0.15 * Math.sin(t * 0.9 + 2)) * (1 + damBoost * 0.4);
    // the powerhouse turbine: a slow, steady turn -- the dam always working.
    if (turbineRef.current) turbineRef.current.rotation.z += delta * 0.6;
    // the tower beacons: a slow pulse (the cheaper half of "rotating beacon
    // or pulsing lights" -- no extra geometry, no extra draw call).
    beaconMat.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 1.1) + damBoost * 0.3;
  });

  return (
    <group>
      <mesh geometry={iceGeo} material={iceMat} castShadow receiveShadow />
      <mesh geometry={concrete.body} material={concreteMat} castShadow receiveShadow />
      <mesh geometry={concrete.road} material={roadMat} receiveShadow />
      <mesh geometry={concrete.accent} material={accentMat} />
      <mesh geometry={concrete.bathtub} material={bathtubMat} />
      <mesh geometry={concrete.lamps} material={lampMat} />
      <mesh geometry={concrete.windows} material={windowMat} />
      <mesh geometry={sprayGeo} material={sprayMat} />
      {/* the powerhouse turbine: a flat wheel on its downstream face, always
          turning -- 2.23 m (the powerhouse box's own 3.6 m height * 0.62)
          matches dam-wall.js's own accent-stripe placement on that face. */}
      <mesh
        ref={turbineRef}
        position={[POWERHOUSE.x + Math.sin(POWERHOUSE.angle) * 1.35, 2.23, POWERHOUSE.z + Math.cos(POWERHOUSE.angle) * 1.35]}
        rotation={[Math.PI / 2, POWERHOUSE.angle, 0]}
        material={turbineMat}
      >
        <cylinderGeometry args={[0.85, 0.85, 0.16, 8]} />
      </mesh>
      {/* tower beacons: one glass globe pulsing atop each intake tower's cap */}
      {TOWERS.map((p, i) => {
        const towerH = p.h + 3;
        return (
          <mesh
            key={i}
            position={[p.x - p.nx * (p.face * 0.95), -1 + towerH + towerH * 0.16 + 0.12, p.z - p.nz * (p.face * 0.95)]}
            material={beaconMat}
          >
            <icosahedronGeometry args={[0.22, 1]} />
          </mesh>
        );
      })}
      <Spillways boost={damBoost} />
      <Outlets boost={damBoost} />
      <Geyser boost={geyserBoost} />
    </group>
  );
}
