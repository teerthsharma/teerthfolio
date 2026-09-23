"use client";

// Building for the "caustic" figure: caustic (place id p-caustic), one of
// the lab projects Teerth built, standing on the snow.
//
// The normal thing, done cooler: a lighthouse's ordinary job is to send
// many ships to many distinct, correct points of light. This one also does
// the project's trick — it can see its own beam quietly bending every
// ship's thread onto the same wrong point, and say so, without ever being
// told which point was the right one ("hallucination, measurable with no
// ground truth").
//
// Retells the figure's own measured story verbatim in shape, never in
// invented numbers (data/showcase.json's p-caustic figure; landing site
// fig.js, "caustic —"): 20 beacon lamps, each with its own thread to its
// own point on a ring around the tower, and the true-answer ring on the
// snow that shows which points were ever right. A 128-tile tape wrapped
// round the shaft is the cause: the same 128 tokens in front of every
// question, only their character changing. Four conditions cycle forever —
// coherent prose, no prefix, random token ids, " the" x128 — bending more
// and more threads onto one glowing pile exactly as the figure's own
// counts do (accuracy 1.000 -> 0.550 -> 0.100 -> 0.000; 20 -> 15 -> 3 -> 1
// distinct answers; see parts/caustic-layout.js for the exact grouping,
// which the figure itself says is illustrative — only the counts are the
// measured ones). A green thread is still correct; a coral thread joined a
// group the certificate can prove wrong; an amber thread is wrong alone,
// where the certificate cannot see it. The lit lamp room sweeps two beams
// round the island; the AUROC on the snow is the project's own number.
//
// Local origin: the snow at the place centre. +z faces the camera and dock.

import { Center, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, MeshBasicMaterial, Object3D, Sphere, Vector3 } from "three";
import { useUi } from "../../../lib/world/store";
import { glow, lamp, mat } from "../palette";
import { buildStages, homePoint, NE, PILE_LOAD } from "./parts/caustic-layout";

const TAU = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

const GREEN = "#22c55e"; // still correct
const AMBER = "#f2a33e"; // wrong alone, the certificate cannot see it

// Tower profile: base mound -> foot -> tapered shaft -> gallery -> lamp
// room -> roof. Every radius stays well inside place.radius (3 m); the
// threads reach out to the ring beyond it, the way a beam of light does.
const BASE_R = 1.05, BASE_H = 0.3;
const FOOT_R = 1.0, FOOT_H = 0.14, FOOT_Y = BASE_H;
const SHAFT_Y = FOOT_Y + FOOT_H, SHAFT_H = 4.6, SHAFT_BASE_R = 0.92, SHAFT_TOP_R = 0.66;
const GALLERY_Y = SHAFT_Y + SHAFT_H, GALLERY_H = 0.16, GALLERY_R = 1.05;
const LAMP_Y = GALLERY_Y + GALLERY_H, LAMP_H = 0.62, LAMP_R = 0.56;
const ROOF_Y = LAMP_Y + LAMP_H, ROOF_H = 0.85, ROOF_R = 0.62;
const FINIAL_Y = ROOF_Y + ROOF_H + 0.1;

const shaftRAt = (y) => {
  const t = Math.min(1, Math.max(0, (y - SHAFT_Y) / SHAFT_H));
  return SHAFT_BASE_R + (SHAFT_TOP_R - SHAFT_BASE_R) * t;
};

const RING_R = 2.9; // each entity's own point, on the snow around the tower — wider than the tower
const PILE = [2.55, 1.4]; // the collapse point: off the tower's front silhouette, outside the answer ring, inside place.radius (3 m)
const BULB_R = 0.42, BULB_Y = LAMP_Y + LAMP_H / 2; // the beacon ring inside the lamp room
const BOUND_R = 1.0, BOUND_Y = GALLERY_Y + GALLERY_H + 0.1; // the five proved-bound lamps
const BOUND_N = 5;
const RAIL_R = GALLERY_R * 0.97, RAIL_Y = GALLERY_Y + GALLERY_H + 0.09, RAIL_N = 10; // gallery railing: reads "lighthouse" in silhouette
const FLARE_MAX = 1.5; // the collapse flare's tallest rise, at full pile load

// Two accent stripes (0.2 / 0.8 of the shaft) plus two accent windows (0.12 /
// 0.88): the classic striped-lighthouse silhouette. The third stripe, at the
// shaft's midline, is left to the token tape below.
const STRIPE_FRACS = [0.2, 0.8], STRIPE_H = 0.5;
const WINDOW_FRACS = [0.12, 0.88], WINDOW_W = 0.22, WINDOW_H = 0.36, WINDOW_D = 0.05;

// The 128-token tape: the cause, wrapped round the shaft's midline. 4 rows
// of 32, replacing the shaft's middle stripe.
const TAPE_N = 128, TAPE_ROWS = 4, TAPE_COLS = TAPE_N / TAPE_ROWS;
const TAPE_Y = SHAFT_Y + 0.5 * SHAFT_H, TAPE_ROW_GAP = 0.17;
const TAPE_BOX = [0.15, 0.14, 0.06];
const RANDOM_TAPE_COLORS = ["#a66cf0", "#d96a06", "#0b93ab"]; // violet / amber / teal, fig.js's own noise palette
// Cheap deterministic hash, no allocation, no Math.random (reproducible
// between server and client renders).
const hash = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

const HOLD = 3.2, MORPH = 1.1, STAGE_T = HOLD + MORPH, LOOP_T = STAGE_T * 4;
const smoothstep = (x) => x * x * (3 - 2 * x);
const AUROC = 0.995; // data/showcase.json p-caustic specs: "0.995" / "AUROC"

// Entity identity colour: a cool teal -> blue -> violet gradient by index,
// echoing the figure's own left-hand dot colours. Fixed per entity, never
// changes with the stage — only its thread's outcome colour does.
const STOP = [[0x14, 0xb8, 0xc4], [0x4f, 0x7c, 0xff], [0x8a, 0x5c, 0xff]];
function entityColor(i) {
  const f = (i / (NE - 1)) * (STOP.length - 1);
  const k = Math.min(STOP.length - 2, Math.floor(f));
  const s = f - k, a = STOP[k], b = STOP[k + 1];
  return new Color(
    (a[0] + (b[0] - a[0]) * s) / 255,
    (a[1] + (b[1] - a[1]) * s) / 255,
    (a[2] + (b[2] - a[2]) * s) / 255,
  );
}

export default function Caustic({ place }) {
  const near = useUi((s) => s.near === place.id);
  const accent = place.radiation ?? place.color;

  const stages = useMemo(() => buildStages(RING_R, PILE), []);
  const bulbAt = useMemo(() => {
    const pts = [];
    for (let i = 0; i < NE; i++) {
      const a = (i / NE) * TAU;
      pts.push([Math.sin(a) * BULB_R, BULB_Y, Math.cos(a) * BULB_R]);
    }
    return pts;
  }, []);
  const ringAt = useMemo(() => {
    const pts = [];
    for (let i = 0; i < NE; i++) pts.push(homePoint(i, RING_R));
    return pts;
  }, []);
  const boundAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < BOUND_N; k++) {
      const a = (k / BOUND_N) * TAU + 0.3;
      pts.push([Math.sin(a) * BOUND_R, BOUND_Y, Math.cos(a) * BOUND_R]);
    }
    return pts;
  }, []);
  const railAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < RAIL_N; k++) {
      const a = (k / RAIL_N) * TAU;
      pts.push([Math.sin(a) * RAIL_R, Math.cos(a) * RAIL_R, a]);
    }
    return pts;
  }, []);
  // Fixed position/rotation for every tape tile: row (height band) x column
  // (angle round the shaft). Only scale and colour animate.
  const tapeAt = useMemo(() => {
    const pts = [];
    for (let k = 0; k < TAPE_N; k++) {
      const row = Math.floor(k / TAPE_COLS), col = k % TAPE_COLS;
      const a = (col / TAPE_COLS) * TAU;
      const y = TAPE_Y + (row - (TAPE_ROWS - 1) / 2) * TAPE_ROW_GAP;
      const r = shaftRAt(y) + TAPE_BOX[2] / 2 + 0.01;
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r, a]);
    }
    return pts;
  }, []);
  // Per-condition look for the 128 tokens, following fig.js's own L.tapes:
  // prose is word shapes with gaps, no-prefix is near-invisible, random ids
  // are noisy height and colour, " the" x128 is identical accent tiles.
  const tapeTokens = useMemo(() => {
    const conditions = [];
    for (let c = 0; c < 4; c++) {
      const toks = [];
      for (let k = 0; k < TAPE_N; k++) {
        if (c === 0) {
          const inWord = hash(k * 3 + 1) > 0.28;
          toks.push({ scale: [inWord ? 0.6 + 0.8 * hash(k * 7 + 2) : 0.15, 1, 1], color: new Color("#43434c") });
        } else if (c === 1) {
          toks.push({ scale: [0.15, 0.15, 0.15], color: new Color("#43434c") });
        } else if (c === 2) {
          toks.push({ scale: [1, 0.4 + 1.1 * hash(k * 11 + 4), 1], color: new Color(RANDOM_TAPE_COLORS[Math.floor(hash(k * 13 + 5) * 3) % 3]) });
        } else {
          toks.push({ scale: [1, 1, 1], color: new Color(accent) });
        }
      }
      conditions.push(toks);
    }
    return conditions;
  }, [accent]);

  // Materials: bodies stay near-neutral, the accent carries the windows,
  // the stripes, the tape and the collapse point; the threads are opaque
  // flat colour (see the note on glowMat below for why the material carries
  // no vertexColors flag even though it is tinted per instance).
  const bodyMat = useMemo(() => mat("#f3ede4", { roughness: 0.72 }), []);
  const footMat = useMemo(() => mat("#43434c", { roughness: 0.6 }), []);
  const bulbMat = useMemo(() => mat("#ffffff", { roughness: 0.3, metalness: 0.15 }), []);
  const bandMat = useMemo(() => lamp(accent, 0.9), [accent]);
  const tapeMat = useMemo(() => mat("#ffffff", { roughness: 0.6 }), []);
  const boundMat = useMemo(() => lamp(accent, 1.4), [accent]);
  const pileMat = useMemo(() => mat(accent, { emissive: accent, emissiveIntensity: 1, roughness: 0.4 }).clone(), [accent]);
  const pileHalo = useMemo(() => glow(accent, 0.3), [accent]);
  // The climax of the whole story: when most threads collapse onto the pile,
  // a flare rises off it so the bad state reads from as far as the good one
  // does. Opaque now (fix: additive was washing the accent colour to white).
  const flareMat = useMemo(() => lamp(accent, 1.6), [accent]);
  // A lit lamp room, not a pale glass drum: an emissive facetted drum whose
  // intensity climbs when the seal is close. Cloned so this building's own
  // near-boost never leaks into another building's cached lamp(accent, 1.3).
  const lampRoomMat = useMemo(() => lamp(accent, 1.3).clone(), [accent]);
  const sweepMat = useMemo(() => glow(accent, 0.16), [accent]);
  // Per-instance tint comes from instanceColor alone (three applies it to any
  // instancedMesh automatically): the material must NOT also set
  // vertexColors, or it looks for a per-vertex "color" attribute these plain
  // sphere/cylinder geometries do not have, and every instance renders black
  // (see Chain.jsx's own note on this exact gotcha). Opaque now (fix: the
  // additive version washed green/amber/coral to pastel on the snow).
  const glowMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);

  const beamRef = useRef();
  const markerRef = useRef();
  const bulbRef = useRef();
  const ringRef = useRef();
  const boundRef = useRef();
  const railRef = useRef();
  const tapeRef = useRef();
  const pileRef = useRef();
  const flareRef = useRef();
  const lampRoomRef = useRef();

  const dummy = useMemo(() => new Object3D(), []);
  const startVec = useMemo(() => new Vector3(), []);
  const endVec = useMemo(() => new Vector3(), []);
  const dirVec = useMemo(() => new Vector3(), []);
  const okC = useMemo(() => new Color(GREEN), []);
  const amberC = useMemo(() => new Color(AMBER), []);
  const coralC = useMemo(() => new Color(accent), [accent]);
  const tint = useMemo(() => new Color(), []);
  const ringTint = useMemo(() => new Color(), []);
  const tapeC0 = useMemo(() => new Color(), []);
  const clockRef = useRef(0);

  // Bulbs never move and never change colour: set once.
  useLayoutEffect(() => {
    const mesh = bulbRef.current;
    if (!mesh) return;
    for (let i = 0; i < NE; i++) {
      const [x, y, z] = bulbAt[i];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.085);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, entityColor(i));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bulbAt, dummy]);

  // The answer key: 20 flat rings on the snow, one per entity's own true
  // point. Position is fixed; colour (empty charcoal vs lit green) is set
  // every frame below, alongside the threads.
  useLayoutEffect(() => {
    const mesh = ringRef.current;
    if (!mesh) return;
    for (let i = 0; i < NE; i++) {
      const [x, z] = ringAt[i];
      dummy.position.set(x, 0.03, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [ringAt, dummy]);

  // The five proved bounds: steadily lit (they are proved, not guessed), so
  // position, scale and colour are all set once.
  useLayoutEffect(() => {
    const mesh = boundRef.current;
    if (!mesh) return;
    for (let k = 0; k < BOUND_N; k++) {
      const [x, y, z] = boundAt[k];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.17);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [boundAt, dummy]);

  // The gallery railing: short chunky posts round the deck's rim, standing
  // in never changing (a real railing, not part of the story). Set once.
  useLayoutEffect(() => {
    const mesh = railRef.current;
    if (!mesh) return;
    for (let k = 0; k < RAIL_N; k++) {
      const [x, z, a] = railAt[k];
      dummy.position.set(x, RAIL_Y, z);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [railAt, dummy]);

  // The 128-token tape: writes its own matrices only while morphing (see
  // the useFrame below), so it needs one initial pass on mount or it would
  // show as a pile of default-scale boxes stacked at the origin until the
  // first transition runs.
  useLayoutEffect(() => {
    writeTape(3, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapeAt, tapeTokens]);

  function writeTape(prevIdx, curIdx, morphT) {
    const mesh = tapeRef.current;
    if (!mesh) return;
    const from = tapeTokens[prevIdx], to = tapeTokens[curIdx];
    for (let k = 0; k < TAPE_N; k++) {
      const [x, y, z, a] = tapeAt[k];
      const f = from[k], t = to[k];
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(
        f.scale[0] + (t.scale[0] - f.scale[0]) * morphT,
        f.scale[1] + (t.scale[1] - f.scale[1]) * morphT,
        f.scale[2] + (t.scale[2] - f.scale[2]) * morphT,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      mesh.setColorAt(k, tapeC0.copy(f.color).lerp(t.color, morphT));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Beams and markers used frustumCulled={false} (they draw from anywhere
  // on the island, since three's automatic bounding sphere is only the unit
  // geometry, not the instances' transforms out to the ring). A fixed
  // bounding sphere covering the whole story lets three cull normally.
  useLayoutEffect(() => {
    if (beamRef.current?.geometry) beamRef.current.geometry.boundingSphere = new Sphere(new Vector3(0, 2.5, 0.5), 5.5);
    if (markerRef.current?.geometry) markerRef.current.geometry.boundingSphere = new Sphere(new Vector3(0, 2.5, 0.5), 5.5);
  }, []);

  useFrame((_, dt) => {
    const speed = near ? 1.3 : 1;
    clockRef.current += dt * speed;
    const t = clockRef.current % LOOP_T;
    const stage = Math.floor(t / STAGE_T) % 4;
    const prev = (stage + 3) % 4;
    const within = t - stage * STAGE_T;
    const morphT = within < HOLD ? 0 : smoothstep((within - HOLD) / MORPH);
    const from = stages[prev], to = stages[stage];

    const beams = beamRef.current, markers = markerRef.current, ring = ringRef.current;
    const pulse = 0.85 + Math.sin(clockRef.current * 3) * 0.15;
    if (beams && markers) {
      for (let i = 0; i < NE; i++) {
        const a = from[i], b = to[i];
        const x = a.p[0] + (b.p[0] - a.p[0]) * morphT;
        const z = a.p[1] + (b.p[1] - a.p[1]) * morphT;
        const fromC = a.role === "coral" ? coralC : a.role === "amber" ? amberC : okC;
        const toC = b.role === "coral" ? coralC : b.role === "amber" ? amberC : okC;
        tint.copy(fromC).lerp(toC, morphT);

        startVec.set(bulbAt[i][0], bulbAt[i][1], bulbAt[i][2]);
        endVec.set(x, 0.05, z);
        dirVec.subVectors(endVec, startVec);
        const len = Math.max(0.05, dirVec.length());
        dirVec.normalize();
        dummy.position.copy(startVec).addScaledVector(dirVec, len / 2);
        dummy.quaternion.setFromUnitVectors(UP, dirVec);
        dummy.scale.set(0.09, len, 0.09);
        dummy.updateMatrix();
        beams.setMatrixAt(i, dummy.matrix);
        beams.setColorAt(i, tint);

        const ms = 0.26 * pulse;
        dummy.position.set(x, 0.045, z);
        dummy.quaternion.identity();
        dummy.scale.set(ms, ms * 0.35, ms);
        dummy.updateMatrix();
        markers.setMatrixAt(i, dummy.matrix);
        markers.setColorAt(i, tint);

        // the answer key: this entity's own ring lights green while its
        // thread sits on its own point, and fades to empty charcoal once it
        // leaves — the same crossfade as the thread above.
        if (ring) {
          const okFrom = a.role === "ok" ? 1 : 0, okTo = b.role === "ok" ? 1 : 0;
          const okAmt = okFrom + (okTo - okFrom) * morphT;
          ringTint.set("#43434c").lerp(okC, okAmt);
          ring.setColorAt(i, ringTint);
        }
      }
      beams.instanceMatrix.needsUpdate = true;
      if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
      markers.instanceMatrix.needsUpdate = true;
      if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
      if (ring && ring.instanceColor) ring.instanceColor.needsUpdate = true;
    }

    // the token tape: the cause. Only rewrite while it is actually morphing
    // (morphT is 0 through the whole hold — nothing to redraw then).
    if (morphT > 0) writeTape(prev, stage, morphT);

    // the collapse point: brighter and bigger the more threads land on it
    const pileLoad = (PILE_LOAD[prev] + (PILE_LOAD[stage] - PILE_LOAD[prev]) * morphT) / NE;
    pileMat.emissiveIntensity = 0.6 + pileLoad * 2.2 + (near ? 0.4 : 0) + Math.sin(clockRef.current * 4) * 0.12 * (0.3 + pileLoad);
    if (pileRef.current) pileRef.current.scale.setScalar(0.7 + pileLoad * 0.6);
    // the climax flare: a column that only rises once most threads have
    // actually collapsed (pileLoad above half), so the story's bad state is
    // as legible from the dock as the good one's spread of distinct beams.
    if (flareRef.current) {
      const rise = Math.max(0, pileLoad - 0.5) * 2; // 0 below half load, 0..1 above it
      flareRef.current.scale.set(1, FLARE_MAX * rise * (0.85 + Math.sin(clockRef.current * 5) * 0.15), 1);
      flareRef.current.visible = rise > 0.02;
    }

    // faster and brighter when near: the lens climbs, the sweep spins up.
    lampRoomMat.emissiveIntensity = 1.3 + (near ? 0.6 : 0);
    if (lampRoomRef.current) lampRoomRef.current.rotation.y += dt * (near ? 1.5 : 0.7);
  });

  return (
    <group>
      {/* foundation */}
      <mesh position={[0, BASE_H / 2, 0]} castShadow receiveShadow material={mat("#dbeaf5", { roughness: 0.6 })}>
        <cylinderGeometry args={[BASE_R * 0.85, BASE_R, BASE_H, 9]} />
      </mesh>
      <mesh position={[0, FOOT_Y + FOOT_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[FOOT_R * 0.94, FOOT_R, FOOT_H, 9]} />
      </mesh>

      {/* the tower */}
      <mesh position={[0, SHAFT_Y + SHAFT_H / 2, 0]} castShadow receiveShadow material={bodyMat}>
        <cylinderGeometry args={[SHAFT_TOP_R, SHAFT_BASE_R, SHAFT_H, 8]} />
      </mesh>
      {STRIPE_FRACS.map((f) => {
        const y = SHAFT_Y + SHAFT_H * f;
        const r = shaftRAt(y) + 0.015;
        return (
          <mesh key={f} position={[0, y, 0]} castShadow material={bandMat}>
            <cylinderGeometry args={[r, r, STRIPE_H, 8]} />
          </mesh>
        );
      })}
      {WINDOW_FRACS.map((f) => {
        const y = SHAFT_Y + SHAFT_H * f;
        const r = shaftRAt(y);
        return (
          <mesh key={f} position={[Math.sin(0.05) * r, y, Math.cos(0.05) * r]} rotation={[0, 0.05, 0]} material={bandMat}>
            <boxGeometry args={[WINDOW_W, WINDOW_H, WINDOW_D]} />
          </mesh>
        );
      })}
      <instancedMesh ref={tapeRef} args={[undefined, tapeMat, TAPE_N]}>
        <boxGeometry args={TAPE_BOX} />
      </instancedMesh>

      {/* gallery */}
      <mesh position={[0, GALLERY_Y + GALLERY_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <cylinderGeometry args={[GALLERY_R, GALLERY_R * 0.92, GALLERY_H, 10]} />
      </mesh>
      <instancedMesh ref={boundRef} args={[undefined, boundMat, BOUND_N]}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      {boundAt.map(([x, , z], k) => (
        <mesh key={k} position={[x, BOUND_Y - 0.14, z]} material={footMat}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 6]} />
        </mesh>
      ))}
      <instancedMesh ref={railRef} args={[undefined, footMat, RAIL_N]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.12]} />
      </instancedMesh>
      <mesh position={[0, RAIL_Y + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={footMat}>
        <torusGeometry args={[RAIL_R, 0.06, 6, 20]} />
      </mesh>

      {/* lamp room: a lit, facetted drum around the fixed beacon ring, with
          a pair of sweep beams that show its rotation from the dock */}
      <group ref={lampRoomRef} position={[0, LAMP_Y + LAMP_H / 2, 0]}>
        <mesh castShadow material={lampRoomMat}>
          <cylinderGeometry args={[LAMP_R, LAMP_R, LAMP_H, 12, 1, true]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[3, 0, 0]} material={sweepMat}>
          <coneGeometry args={[0.9, 6, 10, 1, true]} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[-3, 0, 0]} material={sweepMat}>
          <coneGeometry args={[0.9, 6, 10, 1, true]} />
        </mesh>
      </group>
      <instancedMesh ref={bulbRef} args={[undefined, bulbMat, NE]}>
        <sphereGeometry args={[1, 8, 7]} />
      </instancedMesh>

      {/* roof */}
      <mesh position={[0, ROOF_Y + ROOF_H / 2, 0]} castShadow receiveShadow material={footMat}>
        <coneGeometry args={[ROOF_R, ROOF_H, 10]} />
      </mesh>
      <mesh position={[0, FINIAL_Y, 0]} castShadow material={pileMat}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>

      {/* the answer key: the 20 true points, on the snow */}
      <instancedMesh ref={ringRef} args={[undefined, footMat, NE]}>
        <torusGeometry args={[0.24, 0.07, 6, 16]} />
      </instancedMesh>

      {/* the 20 threads and where they currently land */}
      <instancedMesh ref={beamRef} args={[undefined, glowMat, NE]}>
        <cylinderGeometry args={[1, 1, 1, 5, 1, true]} />
      </instancedMesh>
      <instancedMesh ref={markerRef} args={[undefined, glowMat, NE]}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>

      {/* the collapse point itself: nobody's true answer, lit brighter the
          more threads currently land on it */}
      <group position={[PILE[0], 0, PILE[1]]}>
        <mesh ref={pileRef} position={[0, 0.16, 0]} castShadow material={pileMat}>
          <sphereGeometry args={[0.28, 12, 8, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} material={pileHalo} scale={1.6}>
          <sphereGeometry args={[0.28, 10, 6, 0, TAU, 0, Math.PI / 2]} />
        </mesh>
        <mesh ref={flareRef} position={[0, 0.16, 0]} material={flareMat} visible={false} frustumCulled={false}>
          <coneGeometry args={[0.16, 1, 10, 1, true]} />
        </mesh>
      </group>

      {/* the project's own AUROC, verbatim. The label is wider than the gap
          between two answer-key rings, so sitting close to RING_R still
          crosses one from this camera's angle; standing well past the ring
          circle instead (radial clearance, not angular) is what actually
          clears it. Laid flat on the snow like Island.jsx's NameInSnow
          (rotation -90 deg about X) so the elevated third-person camera
          reads its top face near head-on instead of viewing the extruded
          front/back bevels edge-on, which was z-fighting them into a
          doubled, unreadable glyph mess when the group stood nearly
          upright. Pushed further left and further toward the dock (was
          [-2.0, 0.04, 4.0]) so the seal standing at its spawn/dock
          silhouette (x=0) no longer covers "OC" of "0.995 AUROC" — the
          Center-anchored text's right edge needs more radial clearance
          from the seal's centerline than the old x gave it. */}
      <group position={[-2.9, 0.04, 4.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <Center>
          <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.42} height={0.14} bevelEnabled bevelSize={0.012} bevelThickness={0.018} curveSegments={5} castShadow receiveShadow>
            {`${AUROC} AUROC`}
            <meshStandardMaterial color="#1c1b19" roughness={0.45} />
          </Text3D>
        </Center>
      </group>
    </group>
  );
}
