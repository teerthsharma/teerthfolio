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
import { buildFrozenSplash, DROPS, ERUPT_PERIOD, FALL, RISE, VENT_H, VENT_R } from "./parts/dam-geyser";
import { buildWall, CHANNELS } from "./parts/dam-wall";

const DAM_PLACE = PLACE_BY_ID["pr-tensorflow-124410"];
const GEYSER_PLACE = PLACE_BY_ID["pr-openxla-46539"];
const DAM_COLOR = DAM_PLACE.radiation;
const GEYSER_COLOR = GEYSER_PLACE.radiation;

const dummy = new Object3D();

// ---- the wall ---------------------------------------------------------------

const wallGeo = buildWall();

// ---- the channels: three run, one stands frozen shut ------------------------

const CHANNEL_W = 0.62;
const CHANNEL_INSET = 0.22; // how far the groove's face sits proud of the wall
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
      m.emissiveIntensity = (0.55 + 0.35 * Math.sin(t * 2.2 + i * 1.7)) * (0.8 + boost * 0.5);
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
        const fx = ch.x + ch.nx * (CHANNEL_INSET + 0.08);
        const fz = ch.z + ch.nz * (CHANNEL_INSET + 0.08);
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
            {/* the cut itself: a dark recess so the groove reads at distance */}
            <mesh position={[0, h / 2 + 0.35, CHANNEL_INSET * 0.4]} geometry={bodyGeo} scale={[1, h, 1]} material={mat(C.charcoal, { roughness: 0.6 })} receiveShadow />
            {ch.flowing ? (
              <mesh position={[0, h / 2 + 0.35, CHANNEL_INSET]} geometry={flowGeo} scale={[1, h * 0.92, 1]} material={flowMats[FLOWING.indexOf(ch)]} />
            ) : (
              <group position={[0, h + 0.15, CHANNEL_INSET * 0.7]}>
                <mesh geometry={plugGeo} scale={[0.62, 0.42, 0.34]} material={mat(C.deepIce, { roughness: 0.3 })} castShadow />
                <mesh position={[0, -0.28, 0.08]} geometry={plugGeo} scale={[0.4, 0.26, 0.24]} material={mat(C.ice, { roughness: 0.3 })} />
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

const SPIKES = [
  [-3.2, -30.4, 1.5],
  [-1.4, -31.6, 1.9],
  [0.6, -30.9, 1.4],
  [2.4, -31.9, 1.7],
  [-0.5, -29.6, 1.1],
  [1.6, -29.9, 1.2],
];
const spikeGeo = new ConeGeometry(0.16, 1, 6, 1);
spikeGeo.translate(0, 0.5, 0);
const tipGeo = new IcosahedronGeometry(0.1, 0);
const glintGeo = new IcosahedronGeometry(0.05, 0);

function Spikes({ boost }) {
  const groupRef = useRef();
  const tipMat = useMemo(() => lamp(DAM_COLOR, 1.1), []);
  const glintRef = useRef();
  const glintMat = useMemo(() => glow(DAM_COLOR, 0.8), []);

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

function Geyser({ boost }) {
  const dropRef = useRef();
  const rimMat = useMemo(() => lamp(GEYSER_COLOR, 0.8), []);
  const dropMat = useMemo(() => mat(C.ice, { flat: false, roughness: 0.1, emissive: GEYSER_COLOR, emissiveIntensity: 0.6 }), []);
  const frozenMat = useMemo(() => mat(C.ice, { flat: false, roughness: 0.15, emissive: GEYSER_COLOR, emissiveIntensity: 0.35 }), []);
  const frozen = useMemo(buildFrozenSplash, []);

  useFrame(({ clock }) => {
    // real seconds: the geyser is the determinism fix -- it never speeds up
    // for the seal being near, only glows brighter.
    const t = clock.elapsedTime % ERUPT_PERIOD;
    rimMat.emissiveIntensity = 0.55 + 0.25 * Math.sin(clock.elapsedTime * 1.4) + boost * 0.3;

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
      <mesh geometry={moundGeo} material={mat(C.warmWhite, { roughness: 0.7 })} castShadow receiveShadow />
      <mesh position={[0, VENT_H - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={rimGeo} material={rimMat} />
      <mesh position={[0, VENT_H, 0]} geometry={ventGeo} material={mat(C.charcoal, { roughness: 0.6 })} />
      <instancedMesh ref={dropRef} args={[dropGeo, dropMat, DROPS.length]} frustumCulled={false} />
      {/* the frozen splash: fixed for good, offset from the vent so the live
          jet is never read as part of it */}
      <group position={[VENT_R * 1.6, 0, VENT_R * 0.4]}>
        {frozen.map((d, i) => (
          <mesh key={i} position={[d.x, d.y, d.z]} scale={d.scale} geometry={frozenGeo} material={frozenMat} />
        ))}
        <mesh geometry={frozenGeo} scale={0.55} position={[0, VENT_H * 0.4, 0]} material={mat(C.ice, { roughness: 0.2 })} />
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
