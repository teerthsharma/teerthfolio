"use client";

// THE TENSORFLOW ICE DAM (tensorflow/tensorflow #124410) and THE XLA GEYSER
// (openxla/xla #46539) at its foot (lib/world/river.js has the geology: the
// dam is a natural glacier-tongue ice dam holding back the lake; the water it
// turns aside becomes the NVIDIA moat).
//
//   - THE WALL: one chunky ridge from Triton's outlet glacier down the
//     valley's west bank, turning east into the crest that blocks it
//     (parts/dam-wall.js). Never a jagged grey wall -- flat-shaded ice,
//     rounded, its foot on the collider edge exactly as every landform's does.
//   - THE CHANNELS: four meltwater cuts down the crest's front face, three
//     run (the real chain), the fourth, west, stands frozen shut, an ice
//     plug over it (the redundant bypass, pruned) -- show, never tell, no
//     tower or digit reads it any more.
//   - THE ANOMALY (dam): ice spikes grow UP out of the snow in the dry
//     riverbed below the front, stalagmites instead of icicles, a glint
//     climbing each one -- the meltwater the fix keeps in three channels,
//     defying the ground instead.
//   - THE GEYSER: a sinter mound at the vent, erupting a fountain on the
//     same exact beat every time (real seconds, never sped up for the seal
//     being near -- the one thing that would make it non-deterministic).
//   - THE ANOMALY (geyser, the owner's own example): beside the live jet, an
//     earlier eruption's crown of spray hangs frozen in the air for good,
//     the same shape every cycle.
//
// Closure.jsx (the tower) and Settle.jsx (the loom) were explainer diagrams
// for these two figures and are no longer mounted here (SHOW, NEVER TELL):
// the channels and the geyser itself now carry the whole story.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  TorusGeometry,
} from "three";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { useUi } from "../../../lib/world/store";
import { clamp, smoothstep } from "../life/util";
import { C, glow, lamp, mat } from "../palette";
import { buildFrozenSplash, DROPS, ERUPT_PERIOD, FALL, RISE, STEAM, STEAM_PERIOD, VENT_H, VENT_R } from "./parts/dam-geyser";
import { buildWall, CHANNELS } from "./parts/dam-wall";

const DAM_PLACE = PLACE_BY_ID["pr-tensorflow-124410"];
const GEYSER_PLACE = PLACE_BY_ID["pr-openxla-46539"];
const DAM_COLOR = DAM_PLACE.radiation;
const GEYSER_COLOR = GEYSER_PLACE.radiation;

const dummy = new Object3D();

// ---- the wall ---------------------------------------------------------------

const wallGeo = buildWall();

// ---- the channels: three run, one stands frozen shut ------------------------

const CHANNEL_W = 1.1;
// How far proud of (RECESS_PROUD, negative = recessed into) or beyond
// (FLOW_PROUD) the wall's own outer skin each part sits, in metres, measured
// from each channel's own `ch.face` (dam-wall.js: the box segment's real
// half-width there). A fixed small constant here used to sit deep inside the
// solid ice -- the wall's front face is `face` (2.5-3.6 m) from the crest
// centreline, not a few tenths -- so nothing ever broke the surface.
const RECESS_PROUD = -0.3;
const FLOW_PROUD = 0.45;
const PLUG_PROUD = 0.05;
const RECESS_COLOR = "#1d4a5c"; // deep ice blue, distinct from the wall's own lavender ambient shadow
const bodyGeo = new BoxGeometry(CHANNEL_W, 1, 0.3);
const flowGeo = new BoxGeometry(CHANNEL_W * 0.6, 1, 0.08);
const plugGeo = new IcosahedronGeometry(0.5, 0);
const beadGeo = new IcosahedronGeometry(0.075, 0);
const BEADS_PER = 4;
const FLOWING = CHANNELS.filter((c) => c.flowing);
const BEAD_COUNT = FLOWING.length * BEADS_PER;

function Channels({ boost }) {
  const beadRef = useRef();
  const flowMats = useMemo(() => FLOWING.map(() => lamp(DAM_COLOR, 0.9).clone()), []);
  const beadMat = useMemo(() => lamp(DAM_COLOR, 1.2), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flowMats.forEach((m, i) => {
      // raised base + range so the groove reads as a loud, glowing orange
      // presence at dock distance even dormant, not just a bright peak.
      m.emissiveIntensity = (0.95 + 0.4 * Math.sin(t * 2.2 + i * 1.7)) * (1 + boost * 0.5);
    });
    const beads = beadRef.current;
    if (!beads) return;
    let n = 0;
    FLOWING.forEach((ch, ci) => {
      const top = ch.h * 0.78;
      const base = 0.4;
      for (let b = 0; b < BEADS_PER; b++) {
        const speed = 0.5 + boost * 0.6;
        const p = (t * speed + b / BEADS_PER + ci * 0.31) % 1;
        const y = top - (top - base) * p;
        const fx = ch.x + ch.nx * (ch.face + FLOW_PROUD + 0.06);
        const fz = ch.z + ch.nz * (ch.face + FLOW_PROUD + 0.06);
        dummy.position.set(fx, y, fz);
        dummy.scale.setScalar(0.7 + 0.4 * Math.sin(p * Math.PI));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        beads.setMatrixAt(n++, dummy.matrix);
      }
    });
    beads.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {CHANNELS.map((ch, i) => {
        const angle = Math.atan2(ch.nx, ch.nz);
        const h = ch.h * 0.78;
        return (
          <group key={i} position={[ch.x, 0, ch.z]} rotation={[0, angle, 0]}>
            {/* the cut itself: a dark recess so the groove reads at distance.
                Positioned off ch.face -- the wall's own real half-width at
                this point on the crest -- so it sits AT the outer skin,
                never buried inside the solid box. */}
            <mesh position={[0, h / 2 + 0.35, ch.face + RECESS_PROUD]} geometry={bodyGeo} scale={[1, h, 1]} material={mat(RECESS_COLOR, { roughness: 0.6 })} receiveShadow />
            {ch.flowing ? (
              <mesh position={[0, h / 2 + 0.35, ch.face + FLOW_PROUD]} geometry={flowGeo} scale={[1, h * 0.92, 1]} material={flowMats[FLOWING.indexOf(ch)]} />
            ) : (
              <group position={[0, h + 0.15, ch.face + PLUG_PROUD]}>
                {/* was C.deepIce, the same tone as wallMat -- the plug
                    vanished into the wall. warmWhite base (brighter than
                    the blue wall) plus a low-roughness front cap (a
                    sharper specular gleam) plus a thin DAM_COLOR emissive
                    rim now read it as a distinct capped groove. */}
                <mesh geometry={plugGeo} scale={[0.62, 0.42, 0.34]} material={mat(C.warmWhite, { roughness: 0.35 })} castShadow />
                <mesh position={[0, -0.28, 0.08]} geometry={plugGeo} scale={[0.4, 0.26, 0.24]} material={mat(C.ice, { roughness: 0.08, emissive: DAM_COLOR, emissiveIntensity: 0.3 })} />
              </group>
            )}
          </group>
        );
      })}
      <instancedMesh ref={beadRef} args={[beadGeo, beadMat, BEAD_COUNT]} frustumCulled={false} />
    </group>
  );
}

// ---- the anomaly: ice spikes grow up out of the snow, a glint climbing ----

// Spread across the dry riverbed (3-4.5 m apart, was bunched inside a
// 5.6x2.3 m patch and fused into one blob at dock distance) and taller, so
// each reads as its own rising spike, not a smear.
const SPIKES = [
  [-5.0, -31.5, 1.8],
  [-2.4, -33.0, 2.3],
  [0.6, -32.0, 1.7],
  [3.4, -33.4, 2.1],
  [-1.0, -29.4, 1.4],
  [2.0, -29.6, 1.6],
];
const spikeGeo = new ConeGeometry(0.22, 1, 6, 1);
spikeGeo.translate(0, 0.5, 0);
const tipGeo = new IcosahedronGeometry(0.1, 0);
const glintGeo = new IcosahedronGeometry(0.05, 0);

function Spikes({ boost }) {
  const groupRef = useRef();
  const tipMat = useMemo(() => lamp(DAM_COLOR, 1.1), []);
  const glintRef = useRef();
  // lower than before (0.8): bloom was merging the whole cluster into one
  // flat starburst -- indistinguishable from the banned "glow blob".
  const glintMat = useMemo(() => glow(DAM_COLOR, 0.4), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = groupRef.current;
    if (g) {
      g.children.forEach((child, i) => {
        child.rotation.z = Math.sin(t * 1.3 + i * 2.1) * 0.05;
      });
    }
    tipMat.emissiveIntensity = (0.7 + 0.3 * Math.sin(t * 3 + boost)) * (0.8 + boost * 0.6);
    const glints = glintRef.current;
    if (glints) {
      SPIKES.forEach(([x, z, h], i) => {
        const speed = 0.55 + boost * 0.5;
        const p = (t * speed + i / SPIKES.length) % 1;
        dummy.position.set(x, 0.1 + h * p, z);
        dummy.scale.setScalar(0.5 + 0.6 * Math.sin(p * Math.PI));
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        glints.setMatrixAt(i, dummy.matrix);
      });
      glints.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={groupRef}>
        {SPIKES.map(([x, z, h], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={spikeGeo} scale={[1, h, 1]} material={mat(C.ice, { roughness: 0.3 })} castShadow />
            <mesh position={[0, h, 0]} geometry={tipGeo} material={tipMat} />
          </group>
        ))}
      </group>
      <instancedMesh ref={glintRef} args={[glintGeo, glintMat, SPIKES.length]} frustumCulled={false} />
    </group>
  );
}

// ---- the geyser: a sinter mound, a fountain on a fixed beat ----------------

const moundGeo = new ConeGeometry(VENT_R, VENT_H, 9, 1);
moundGeo.translate(0, VENT_H / 2, 0);
const rimGeo = new TorusGeometry(VENT_R * 0.62, 0.09, 6, 20);
const ventGeo = new CylinderGeometry(VENT_R * 0.42, VENT_R * 0.5, 0.4, 12);
const dropGeo = new IcosahedronGeometry(1, 1);
const frozenGeo = new IcosahedronGeometry(1, 0);
const steamGeo = new IcosahedronGeometry(0.24, 1);

function Geyser({ boost }) {
  const dropRef = useRef();
  const steamRef = useRef();
  const rimMat = useMemo(() => lamp(GEYSER_COLOR, 0.8), []);
  const dropMat = useMemo(() => mat(C.ice, { flat: false, roughness: 0.1, emissive: GEYSER_COLOR, emissiveIntensity: 0.6 }), []);
  // was roughness 0.15 / intensity 0.35 -- close enough to steamMat's own
  // pale value that the two clusters read as one blob. Near-zero roughness
  // (a sharp specular gleam, translucent mist has none) plus a slight
  // metalness plus a brighter emissive now reads it as solid ice, not mist.
  const frozenMat = useMemo(() => mat(C.ice, { flat: false, roughness: 0.04, metalness: 0.2, emissive: GEYSER_COLOR, emissiveIntensity: 0.55 }), []);
  const steamMat = useMemo(() => mat(C.warmWhite, { flat: false, roughness: 0.9, opacity: 0.24, emissive: GEYSER_COLOR, emissiveIntensity: 0.12 }), []);
  const frozen = useMemo(buildFrozenSplash, []);

  useFrame(({ clock }) => {
    // real seconds: the geyser is the determinism fix -- it never speeds up
    // for the seal being near, only glows brighter.
    const t = clock.elapsedTime % ERUPT_PERIOD;
    // dormant baseline stays low (the ring must read "off" most of the
    // cycle, never an always-lit portal collar); a brief flare only while
    // the column is actually climbing.
    const flareWindow = RISE * ERUPT_PERIOD;
    const flare = t < flareWindow ? (t / flareWindow) * 1.1 : 0;
    rimMat.emissiveIntensity = 0.175 + 0.025 * Math.sin(clock.elapsedTime * 1.4) + flare + boost * 0.15;

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

    const drops = dropRef.current;
    if (!drops) return;
    DROPS.forEach((d, i) => {
      const local = t - d.delay;
      let y = -5;
      let s = 0;
      let r = 0;
      if (local >= 0 && local < RISE + FALL) {
        if (local < RISE) {
          const u = local / RISE;
          y = VENT_H + d.apex * smoothstep(0, 1, u);
          r = VENT_R * 0.22 * u;
          s = 0.5 + 0.5 * u;
        } else {
          const u = (local - RISE) / FALL;
          y = VENT_H + d.apex * (1 - u * u);
          r = VENT_R * (0.22 + d.spread * u);
          s = 0.7 * (1 - u * 0.7);
        }
      }
      dummy.position.set(Math.cos(d.angle) * r, Math.max(y, -5), Math.sin(d.angle) * r);
      dummy.scale.setScalar(clamp(s, 0, 1) * 0.16);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      drops.setMatrixAt(i, dummy.matrix);
    });
    drops.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[GEYSER_PLACE.x, 0, GEYSER_PLACE.z]}>
      {/* mineral sinter crust, not painted plaster: warmWhite sat in the
          same value family as the snow around it and the mound vanished
          fully dormant. C.wood is darker and warmer, so it holds its own
          silhouette against the ground with no eruption running at all. */}
      <mesh geometry={moundGeo} material={mat(C.wood, { roughness: 0.75 })} castShadow receiveShadow />
      <mesh position={[0, VENT_H - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={rimGeo} material={rimMat} />
      <mesh position={[0, VENT_H, 0]} geometry={ventGeo} material={mat(C.charcoal, { roughness: 0.6 })} />
      <instancedMesh ref={steamRef} args={[steamGeo, steamMat, STEAM.length]} frustumCulled={false} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, DROPS.length]} frustumCulled={false} />
      {/* the frozen splash: fixed for good, offset from the vent so the live
          jet is never read as part of it. Pushed further out (was 1.6/0.4)
          so it clears the always-on STEAM cluster hugging the vent lip. */}
      <group position={[VENT_R * 2.6, 0, VENT_R * 0.9]}>
        {frozen.map((d, i) => (
          <mesh key={i} position={[d.x, d.y, d.z]} scale={d.scale} geometry={frozenGeo} material={frozenMat} />
        ))}
        <mesh geometry={frozenGeo} scale={0.6} position={[0, VENT_H * 0.4, 0]} material={frozenMat} />
      </group>
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

  const wallMat = useMemo(() => mat(C.deepIce, { roughness: 0.42 }), []);

  return (
    <group>
      <mesh geometry={wallGeo} material={wallMat} castShadow receiveShadow />
      <Channels boost={damBoost} />
      <Spikes boost={damBoost} />
      <Geyser boost={geyserBoost} />
    </group>
  );
}
