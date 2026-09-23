"use client";

// The LAB BUILDING for Epsilon-Hollow (place id p-epsilon-hollow): a bare
// metal OS whose memory, files and scheduler live as points on a sphere
// (data/showcase.json's figure.desc, teerthsharma.github.io/fig.js's
// "collapse —"). The everyday building whose job this performs, done
// spectacularly: an Atomium/Unisphere-style EXPO PAVILION — a geodesic globe
// raised over a plaza on a central lift shaft, exactly like a world's-fair
// centrepiece, except this globe really is hollow and you can see every one
// of its points, how they thin under pressure, and how they come back.
//
// The globe's struts and joints ARE the figure's triangulated unit sphere
// (components/world/monuments/parts/collapse-sphere.js: an icosphere, same
// construction as fig.js's own subdivision), tinted by territory (memory
// blue, files violet, scheduler mint — fig.js's own hex values, kept exact).
// A finer sphere turns the other way inside it around a bare-metal core:
// Epsilon, the context-teleport receptacle, in the place's radiation colour,
// read against a dark backdrop so it never washes out against snow.
//
// EVICTION IS ANIMATED, not implied: eight real edge contractions, picked the
// way fig.js picks them (shortest valid edge, the more crowded end folds),
// play out one at a time — a point slides onto its neighbour, the strut
// carrying it, the two triangles between them flattening coral — then a band
// of light sweeps pole to pole and brings every point home. A small cloud of
// points (the file's payload) rides a fixed thread of light through the
// hollow at the door of the ground-floor kiosk, every crossing the same
// duration however far it looks. A ring of motes orbits the globe: the
// kernel's day job is machine learning, so its queries never stop.
//
// Local origin: the snow at the place centre (no plinth); +z faces the
// camera and the dock, so the tripod and the kiosk door leave that side
// open toward the visitor.
// Props: { place, near }.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { clamp, smoothstep } from "../life/util";
import { C, lamp, mat } from "../palette";
import { buildCollapse } from "./parts/collapse-sphere";

// fig.js's own palette (site.css --blue-500 / --violet-500 / --mint-500 /
// --coral-500), kept exact: the territories and the one eviction colour.
const BLUE = "#2456dc"; // memory
const VIOLET = "#a66cf0"; // files
const MINT = "#0b93ab"; // the scheduler
const CORAL = "#d9376e"; // eviction

const OUTER_R = 2.1;
const INNER_R = 0.72; // big enough to spill its glow through the outer shell's gaps: Epsilon must read from outside, the camera never gets inside the hollow
const CORE_Y = 3.7; // height of the globe's own centre above the snow (top of the globe sits at 5.8 m)
const STRUT_R = 0.065;
const INNER_STRUT_R = 0.075; // a shade chunkier than the outer shell: Epsilon reads as the important mechanism, not a fourth territory
const BEAD_R = 0.115;
const CONTRACTION_COUNT = 8;

const PLATFORM_R = 2.5;
const PLATFORM_H = 0.2;
const LEG_COUNT = 3;
const LEG_TOP_R = 0.11;
const LEG_BOT_R = 0.17;
// three legs, none at +z (0 rad from front): the dock side stays open.
const LEG_ANGLE = (i) => Math.PI / 2 + i * ((Math.PI * 2) / LEG_COUNT);
const LEG_TOP = { r: OUTER_R * 0.68, y: CORE_Y - OUTER_R * 0.72 };
const LEG_BOT = { r: PLATFORM_R * 0.76, y: PLATFORM_H };
const LEG_COLLAR_H = 0.3;

const RIM_LAMP_N = 10;
const RIM_LAMP_H = 0.42;

// The central lift shaft: the pavilion's everyday job, done in the open —
// a glass tube from the plaza to the globe's underside, a car riding it.
const LIFT_TUBE_R = 0.34;
const LIFT_TUBE_H = CORE_Y - OUTER_R - PLATFORM_H;
const LIFT_TUBE_Y = PLATFORM_H + LIFT_TUBE_H / 2;
const LIFT_CAR_R = 0.25;
const LIFT_CAR_BOTTOM = PLATFORM_H + 0.18;
const LIFT_CAR_TOP = CORE_Y - OUTER_R - 0.18;
const LIFT_CAR_PERIOD = 4; // s: one full up-and-down trip

// The kiosk at the tube's foot, facing +z: where the teleport payload's
// journey visibly starts, a small charcoal lobby with a lit door.
const KIOSK_W = 1.2;
const KIOSK_H = 1.5;
const KIOSK_D = 0.9;
const KIOSK_Z = LIFT_TUBE_R + KIOSK_D / 2 + 0.15;
const KIOSK_Y = PLATFORM_H + KIOSK_H / 2;
const DOOR_W = 0.9;
const DOOR_H = 1.4;
const DOOR_Y = PLATFORM_H + DOOR_H / 2;
const DOOR_Z = KIOSK_Z + KIOSK_D / 2 + 0.01;

// The eviction's band of light: sweeps the globe's own local frame from pole
// to pole, so its height never needs to know about CORE_Y or the spin.
const FOLD_STEP = 0.7; // s: one contraction's own slide-and-fold
const BAND_DURATION = 1.6; // s: the restoring sweep, pole to pole
const HOLD = 1.8; // s: the globe sits whole before the next eviction begins

// The geometry, built once and shared (never allocated inside render/useFrame).
const SCENE = buildCollapse({
  outerDetail: 1,
  innerDetail: 1, // the "second, finer" sphere: finer than the outer shell, per fig.js
  outerR: OUTER_R,
  innerR: INNER_R,
  contractionCount: CONTRACTION_COUNT,
  territoryHex: [BLUE, VIOLET, MINT],
});
const N_FOLD = SCENE.contractions.length;
const CYCLE = N_FOLD * FOLD_STEP + BAND_DURATION + HOLD;

// Every original edge, looked up by its two vertices: lets a contraction find
// which strut instance to re-aim as its victim vertex moves.
const EDGE_INDEX = new Map();
{
  const pairs = SCENE.outer.pairs;
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i], b = pairs[i + 1];
    EDGE_INDEX.set(a < b ? `${a}_${b}` : `${b}_${a}`, i / 2);
  }
}
for (const c of SCENE.contractions) {
  c.edgeIdx = c.edges.map(([a, n]) => EDGE_INDEX.get(a < n ? `${a}_${n}` : `${n}_${a}`));
}

const UPV = new Vector3(0, 1, 0);

// Every strut and leg is a unit cylinder along Y, centred at the origin:
// placing one between two points is a position + quaternion + scale.y.
function segment(dummy, qTmp, vTmp, ax, ay, az, bx, by, bz) {
  vTmp.set(bx - ax, by - ay, bz - az);
  const len = vTmp.length() || 0.001;
  vTmp.normalize();
  qTmp.setFromUnitVectors(UPV, vTmp);
  dummy.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  dummy.quaternion.copy(qTmp);
  dummy.scale.set(1, len, 1);
  dummy.updateMatrix();
}

function pos(angle, radius, y) {
  return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
}

// Writes one fold-triangle vertex into the shared scratch array: the victim
// vertex slides toward its target, every other vertex sits at its own rest
// position (SCENE.points holds every vertex once, already at outer radius).
function writeFoldVert(arr, w, vertIdx, c, posT) {
  if (vertIdx === c.a) {
    arr[w] = c.pa[0] + (c.pb[0] - c.pa[0]) * posT;
    arr[w + 1] = c.pa[1] + (c.pb[1] - c.pa[1]) * posT;
    arr[w + 2] = c.pa[2] + (c.pb[2] - c.pa[2]) * posT;
  } else {
    const p = SCENE.points.positions;
    arr[w] = p[vertIdx * 3];
    arr[w + 1] = p[vertIdx * 3 + 1];
    arr[w + 2] = p[vertIdx * 3 + 2];
  }
}

// The ring of orbiting motes — fig.js's own "ring of token traffic": two
// bands, laid out once (the whole ring then spins as one group).
const RING = (() => {
  const bands = [
    { r: OUTER_R * 1.1, y: 0.08, n: 9, off: 0 },
    { r: OUTER_R * 1.2, y: -0.07, n: 9, off: 1 },
  ];
  const items = [];
  for (const b of bands) {
    for (let i = 0; i < b.n; i++) {
      const a = (i / b.n) * Math.PI * 2;
      items.push({ x: Math.cos(a) * b.r, y: b.y, z: Math.sin(a) * b.r, terr: (i + b.off) % 3 });
    }
  }
  return items;
})();

// Rim lamps: the platform's "windows" — short bollards standing on its edge
// so their glow reads from the island's looking-down camera, in the
// radiation colour (see below).
const RIM_LAMPS = Array.from({ length: RIM_LAMP_N }, (_, i) => {
  const a = (i / RIM_LAMP_N) * Math.PI * 2;
  return [Math.sin(a) * PLATFORM_R * 0.94, PLATFORM_H + RIM_LAMP_H / 2, Math.cos(a) * PLATFORM_R * 0.94, a];
});

// The payload's small cloud of points (fig.js: "a small cloud of points"):
// fixed offsets from the thread's own crossing point, spread apart only at
// the gather/unfold ends of a crossing.
const PAYLOAD_OFFSETS = [
  [0, 0, 0],
  [0.28, 0.1, 0.06],
  [-0.22, 0.18, -0.12],
  [0.12, -0.24, 0.2],
  [-0.18, -0.12, -0.22],
];

// Geometry, built once and shared (never allocated inside render/useFrame).
const strutGeo = new CylinderGeometry(STRUT_R, STRUT_R, 1, 6);
const innerStrutGeo = new CylinderGeometry(INNER_STRUT_R, INNER_STRUT_R, 1, 6);
const beadGeo = new IcosahedronGeometry(BEAD_R, 0);
const legGeo = new CylinderGeometry(LEG_TOP_R, LEG_BOT_R, 1, 8);
const legCollarGeo = new CylinderGeometry(LEG_TOP_R * 1.4, LEG_TOP_R * 1.4, LEG_COLLAR_H, 8);
const platformGeo = new CylinderGeometry(PLATFORM_R, PLATFORM_R * 1.06, PLATFORM_H, 28);
const platformRingGeo = new RingGeometry(PLATFORM_R - 0.3, PLATFORM_R, 40);
const moteGeo = new IcosahedronGeometry(0.13, 0);
const coreGeo = new IcosahedronGeometry(0.26, 1);
const innerGlowGeo = new IcosahedronGeometry(INNER_R * 1.1, 1);
const backdropGeo = new IcosahedronGeometry(OUTER_R * 0.97, 2);
const payloadGeo = new IcosahedronGeometry(0.26, 0);
const rimLampGeo = new CylinderGeometry(0.11, 0.13, RIM_LAMP_H, 6);
const threadGeo = new CylinderGeometry(0.07, 0.07, 1, 6);
const liftTubeGeo = new CylinderGeometry(LIFT_TUBE_R, LIFT_TUBE_R, LIFT_TUBE_H, 12);
const liftCarGeo = new IcosahedronGeometry(LIFT_CAR_R, 0);
const kioskGeo = new BoxGeometry(KIOSK_W, KIOSK_H, KIOSK_D);
const doorGeo = new PlaneGeometry(DOOR_W, DOOR_H);
const bandGeo = new TorusGeometry(1, 0.09, 8, 24);

// The eviction fold: ONE dynamic triangle pair, its positions rewritten each
// frame to whichever contraction is currently folding (never more than one
// at a time) — a single draw call, not one mesh per facet.
const foldPosAttr = new Float32BufferAttribute(new Float32Array(18), 3);
const foldGeo = new BufferGeometry();
foldGeo.setAttribute("position", foldPosAttr);

// The teleport thread: fixed once (start -> end run through the hollow
// centre), never rebuilt — only the payload riding it moves.
const threadDir = new Vector3(
  SCENE.travel.end[0] - SCENE.travel.start[0],
  SCENE.travel.end[1] - SCENE.travel.start[1],
  SCENE.travel.end[2] - SCENE.travel.start[2],
);
const threadLen = threadDir.length();
threadDir.normalize();
const threadQuat = new Quaternion().setFromUnitVectors(UPV, threadDir);
const threadMid = [
  (SCENE.travel.start[0] + SCENE.travel.end[0]) / 2,
  (SCENE.travel.start[1] + SCENE.travel.end[1]) / 2,
  (SCENE.travel.start[2] + SCENE.travel.end[2]) / 2,
];

const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
const PAYLOAD_PERIOD = 3.4; // s: one crossing, either direction — fig.js: "every jump takes the same time"
const GATHER_NORM = 0.4 / PAYLOAD_PERIOD; // the cloud gathers, then unfolds, over 0.4 s at each end

export default function Collapse({ place, near }) {
  const accent = place.radiation ?? place.color;

  const outerSpin = useRef();
  const innerSpin = useRef();
  const ringSpin = useRef();
  const strutMesh = useRef();
  const beadMesh = useRef();
  const innerMesh = useRef();
  const legMesh = useRef();
  const legCollarMesh = useRef();
  const moteMesh = useRef();
  const rimLampMesh = useRef();
  const payloadMesh = useRef();
  const foldMesh = useRef();
  const bandMesh = useRef();
  const liftCar = useRef();

  const strutMat = useMemo(() => mat("#ffffff", { roughness: 0.35, metalness: 0.05 }), []);
  const beadMat = useMemo(() => mat("#ffffff", { roughness: 0.55, metalness: 0 }), []);
  // Epsilon reads as light, not as a fourth territory: unlit and fixed so it
  // never merges with a radiation colour that happens to itself be blue.
  const innerMat = useMemo(() => new MeshBasicMaterial({ color: "#8aa8ff", toneMapped: false }), []);
  const backdropMat = useMemo(() => new MeshBasicMaterial({ color: "#141a33", side: BackSide, transparent: true, opacity: 0.5, depthWrite: false }), []);
  const innerShellMat = useMemo(() => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.4, depthWrite: false }), [accent]);
  const legMat = useMemo(() => mat(C.charcoal, { roughness: 0.55, metalness: 0.1 }), []);
  const legCollarMat = useMemo(() => lamp(accent, 1), [accent]);
  const platformMat = useMemo(() => mat(C.charcoal, { roughness: 0.7 }), []);
  const platformRingMat = useMemo(() => lamp(accent, 1.2), [accent]);
  const moteMat = useMemo(() => mat("#ffffff", { roughness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.3 }), []);
  const rimLampMat = useMemo(() => lamp(accent, 1).clone(), [accent]);
  const coreMat = useMemo(() => lamp(C.lamp, 1.2).clone(), []);
  const payloadMat = useMemo(() => mat(accent, { roughness: 0.2, emissive: accent, emissiveIntensity: 1.1 }).clone(), [accent]);
  const threadMat = useMemo(
    () => new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.65, depthWrite: false, toneMapped: false }),
    [accent],
  );
  const foldMat = useMemo(() => mat(CORAL, { roughness: 0.4, emissive: CORAL, emissiveIntensity: 0.6, side: DoubleSide }).clone(), []);
  const bandMat = useMemo(() => new MeshBasicMaterial({ color: accent, toneMapped: false }), [accent]);
  const liftTubeMat = useMemo(() => mat(accent, { roughness: 0.15, metalness: 0.1, opacity: 0.55 }), [accent]);
  const liftCarMat = useMemo(() => lamp(C.lamp, 1.3), []);
  const kioskMat = useMemo(() => mat(C.charcoal, { roughness: 0.6 }), []);
  const doorMat = useMemo(() => lamp(accent, 1.4), [accent]);

  // Layout: every strut, bead, leg, mote and lamp is placed exactly once —
  // none of this geometry ever changes shape, only colours and materials
  // (and the handful of instances a contraction is animating) move per frame.
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const qTmp = new Quaternion();
    const vTmp = new Vector3();
    const scratch = new Color();

    const { positions: ep, colors: ec } = SCENE.outer;
    const edgeCount = ep.length / 6;
    if (strutMesh.current) {
      for (let i = 0; i < edgeCount; i++) {
        const b = i * 6;
        segment(dummy, qTmp, vTmp, ep[b], ep[b + 1], ep[b + 2], ep[b + 3], ep[b + 4], ep[b + 5]);
        strutMesh.current.setMatrixAt(i, dummy.matrix);
        strutMesh.current.setColorAt(i, scratch.setRGB(ec[b], ec[b + 1], ec[b + 2]));
      }
      strutMesh.current.instanceMatrix.needsUpdate = true;
      if (strutMesh.current.instanceColor) strutMesh.current.instanceColor.needsUpdate = true;
    }

    const { positions: pp, colors: pc, count: beadCount } = SCENE.points;
    if (beadMesh.current) {
      for (let i = 0; i < beadCount; i++) {
        dummy.position.set(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2]);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        beadMesh.current.setMatrixAt(i, dummy.matrix);
        beadMesh.current.setColorAt(i, scratch.setRGB(pc[i * 3], pc[i * 3 + 1], pc[i * 3 + 2]));
      }
      beadMesh.current.instanceMatrix.needsUpdate = true;
      if (beadMesh.current.instanceColor) beadMesh.current.instanceColor.needsUpdate = true;
    }

    const { positions: ip } = SCENE.inner;
    const innerEdgeCount = ip.length / 6;
    if (innerMesh.current) {
      for (let i = 0; i < innerEdgeCount; i++) {
        const b = i * 6;
        segment(dummy, qTmp, vTmp, ip[b], ip[b + 1], ip[b + 2], ip[b + 3], ip[b + 4], ip[b + 5]);
        innerMesh.current.setMatrixAt(i, dummy.matrix);
      }
      innerMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (legMesh.current) {
      for (let i = 0; i < LEG_COUNT; i++) {
        const a = LEG_ANGLE(i);
        const [bx, by, bz] = pos(a, LEG_BOT.r, LEG_BOT.y);
        const [tx, ty, tz] = pos(a, LEG_TOP.r, LEG_TOP.y);
        segment(dummy, qTmp, vTmp, bx, by, bz, tx, ty, tz);
        legMesh.current.setMatrixAt(i, dummy.matrix);
      }
      legMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (legCollarMesh.current) {
      for (let i = 0; i < LEG_COUNT; i++) {
        const a = LEG_ANGLE(i);
        const [x, y, z] = pos(a, LEG_TOP.r, LEG_TOP.y);
        dummy.position.set(x, y, z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        legCollarMesh.current.setMatrixAt(i, dummy.matrix);
      }
      legCollarMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (moteMesh.current) {
      RING.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        moteMesh.current.setMatrixAt(i, dummy.matrix);
        moteMesh.current.setColorAt(i, scratch.set(it.terr === 0 ? BLUE : it.terr === 1 ? VIOLET : MINT));
      });
      moteMesh.current.instanceMatrix.needsUpdate = true;
      if (moteMesh.current.instanceColor) moteMesh.current.instanceColor.needsUpdate = true;
    }

    if (rimLampMesh.current) {
      RIM_LAMPS.forEach(([x, y, z, a], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        rimLampMesh.current.setMatrixAt(i, dummy.matrix);
      });
      rimLampMesh.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  const scratch = useMemo(
    () => ({ dummy: new Object3D(), q: new Quaternion(), v: new Vector3(), pd: new Object3D() }),
    [],
  );

  useFrame((state, dt) => {
    const speed = near ? 1.7 : 1;
    const bright = near ? 1.35 : 1;
    const t = state.clock.elapsedTime;
    const { dummy, q: qTmp, v: vTmp, pd: payloadDummy } = scratch;
    const pts = SCENE.points.positions;

    if (outerSpin.current) outerSpin.current.rotation.y += dt * 0.09 * speed;
    if (innerSpin.current) innerSpin.current.rotation.y -= dt * 0.22 * speed;
    if (ringSpin.current) ringSpin.current.rotation.y += dt * 0.3 * speed;

    // eviction: one contraction at a time slides its victim onto its target,
    // the struts that met it following, then a band of light sweeps the
    // globe pole to pole and brings every point home.
    const cycleT = (t * speed) % CYCLE;
    const bandStart = N_FOLD * FOLD_STEP;
    const bandT = cycleT - bandStart;
    const bandActive = bandT >= 0 && bandT < BAND_DURATION;
    const bandDone = bandT >= BAND_DURATION;
    const bandProg = bandActive ? bandT / BAND_DURATION : 0;
    const bandY = OUTER_R - bandProg * (2 * OUTER_R);

    let activeIdx = -1;
    let activeT = 0;

    if (strutMesh.current && beadMesh.current) {
      for (let i = 0; i < N_FOLD; i++) {
        const c = SCENE.contractions[i];
        const winT = cycleT - i * FOLD_STEP;
        let posT, restored, active;
        if (bandDone) {
          posT = 0; restored = true; active = false;
        } else if (bandActive) {
          restored = bandY <= c.pa[1];
          posT = restored ? 0 : 1;
          active = false;
        } else if (winT < 0) {
          posT = 0; restored = true; active = false;
        } else if (winT < FOLD_STEP) {
          posT = smoothstep(0, 1, winT / FOLD_STEP);
          restored = false; active = true;
        } else {
          posT = 1; restored = false; active = false;
        }

        const ax = c.pa[0] + (c.pb[0] - c.pa[0]) * posT;
        const ay = c.pa[1] + (c.pb[1] - c.pa[1]) * posT;
        const az = c.pa[2] + (c.pb[2] - c.pa[2]) * posT;
        const beadScale = restored ? 1 : clamp(1 - (posT - 0.85) / 0.15, 0, 1);

        dummy.position.set(ax, ay, az);
        dummy.quaternion.identity();
        dummy.scale.setScalar(beadScale);
        dummy.updateMatrix();
        beadMesh.current.setMatrixAt(c.a, dummy.matrix);

        for (let k = 0; k < c.edges.length; k++) {
          const n = c.edges[k][1];
          segment(dummy, qTmp, vTmp, ax, ay, az, pts[n * 3], pts[n * 3 + 1], pts[n * 3 + 2]);
          strutMesh.current.setMatrixAt(c.edgeIdx[k], dummy.matrix);
        }

        if (active) { activeIdx = i; activeT = posT; }
      }
      beadMesh.current.instanceMatrix.needsUpdate = true;
      strutMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (foldMesh.current) {
      if (activeIdx >= 0) {
        const c = SCENE.contractions[activeIdx];
        const arr = foldPosAttr.array;
        let w = 0;
        for (let f = 0; f < c.folds.length && f < 2; f++) {
          const tri = c.folds[f];
          writeFoldVert(arr, w, tri[0], c, activeT); w += 3;
          writeFoldVert(arr, w, tri[1], c, activeT); w += 3;
          writeFoldVert(arr, w, tri[2], c, activeT); w += 3;
        }
        for (; w < 18; w++) arr[w] = 0;
        foldPosAttr.needsUpdate = true;
        foldMesh.current.visible = true;
        foldMat.emissiveIntensity = (0.6 + Math.sin(activeT * Math.PI) * 1.4) * bright;
      } else {
        foldMesh.current.visible = false;
      }
    }

    if (bandMesh.current) {
      if (bandActive) {
        const ringR = Math.max(0.05, Math.sqrt(Math.max(0, OUTER_R * OUTER_R - bandY * bandY)));
        bandMesh.current.visible = true;
        bandMesh.current.position.set(0, bandY, 0);
        bandMesh.current.scale.setScalar(ringR);
      } else {
        bandMesh.current.visible = false;
      }
    }

    // the teleport: a payload shuttles start -> end -> start through the
    // hollow, gathering into a cloud before each crossing and unfolding as
    // it arrives.
    const p = ((t * speed) % (PAYLOAD_PERIOD * 2)) / PAYLOAD_PERIOD;
    const raw = p < 1 ? p : 2 - p;
    const travelT = smoothstep(0, 1, raw);
    const pop = bump(raw, 0, 0.07) + bump(raw, 1, 0.07);
    const px = SCENE.travel.start[0] + (SCENE.travel.end[0] - SCENE.travel.start[0]) * travelT;
    const py = SCENE.travel.start[1] + (SCENE.travel.end[1] - SCENE.travel.start[1]) * travelT;
    const pz = SCENE.travel.start[2] + (SCENE.travel.end[2] - SCENE.travel.start[2]) * travelT;
    let spread;
    if (raw < GATHER_NORM) spread = 1 - smoothstep(0, GATHER_NORM, raw);
    else if (raw > 1 - GATHER_NORM) spread = smoothstep(1 - GATHER_NORM, 1, raw);
    else spread = 0;
    if (payloadMesh.current) {
      for (let i = 0; i < PAYLOAD_OFFSETS.length; i++) {
        const o = PAYLOAD_OFFSETS[i];
        payloadDummy.position.set(px + o[0] * spread, py + o[1] * spread, pz + o[2] * spread);
        payloadDummy.quaternion.identity();
        payloadDummy.scale.setScalar(1 + pop * 0.6);
        payloadDummy.updateMatrix();
        payloadMesh.current.setMatrixAt(i, payloadDummy.matrix);
      }
      payloadMesh.current.instanceMatrix.needsUpdate = true;
    }
    payloadMat.emissiveIntensity = (1 + pop * 1.8) * bright;
    threadMat.opacity = clamp((0.65 + pop * 0.3) * bright, 0, 1);

    // the lift car: up and down the shaft, every 4 s.
    if (liftCar.current) {
      const liftPhase = (t % LIFT_CAR_PERIOD) / LIFT_CAR_PERIOD;
      liftCar.current.position.y = LIFT_CAR_BOTTOM + (LIFT_CAR_TOP - LIFT_CAR_BOTTOM) * (0.5 - 0.5 * Math.cos(liftPhase * Math.PI * 2));
    }

    // the bare metal core: burning, steady.
    coreMat.emissiveIntensity = (1.2 + 0.3 * Math.sin(t * 2.3)) * bright;
    rimLampMat.emissiveIntensity = (0.9 + 0.2 * Math.sin(t * 1.3 + 1)) * bright;
  });

  return (
    <group>
      {/* the plaza: a platform on tripod legs, exactly like a world's-fair
          pavilion, three legs so the dock side (+z) stays open */}
      <mesh position={[0, PLATFORM_H / 2, 0]} castShadow receiveShadow material={platformMat} geometry={platformGeo} />
      <mesh position={[0, PLATFORM_H + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={platformRingMat} geometry={platformRingGeo} />
      <instancedMesh ref={legMesh} args={[legGeo, legMat, LEG_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={legCollarMesh} args={[legCollarGeo, legCollarMat, LEG_COUNT]} />
      <instancedMesh ref={rimLampMesh} args={[rimLampGeo, rimLampMat, RIM_LAMP_N]} />

      {/* the everyday job: a lift shaft from the plaza to the globe, a kiosk
          at its foot where the teleport payload's journey starts */}
      <mesh position={[0, LIFT_TUBE_Y, 0]} geometry={liftTubeGeo} material={liftTubeMat} />
      <mesh ref={liftCar} position={[0, LIFT_CAR_BOTTOM, 0]} geometry={liftCarGeo} material={liftCarMat} />
      <mesh position={[0, KIOSK_Y, KIOSK_Z]} castShadow receiveShadow geometry={kioskGeo} material={kioskMat} />
      <mesh position={[0, DOOR_Y, DOOR_Z]} geometry={doorGeo} material={doorMat} />

      {/* the globe: OS state as a hollow, triangulated planet */}
      <group position={[0, CORE_Y, 0]}>
        <group ref={outerSpin}>
          <instancedMesh ref={strutMesh} args={[strutGeo, strutMat, SCENE.outer.positions.length / 6]} castShadow />
          <instancedMesh ref={beadMesh} args={[beadGeo, beadMat, SCENE.points.count]} castShadow />
          <mesh ref={foldMesh} geometry={foldGeo} material={foldMat} visible={false} />
          <mesh geometry={backdropGeo} material={backdropMat} />
        </group>

        {/* Epsilon: the finer hollow sphere, turning the other way, around
            the bare metal at the centre, read against the dark backdrop
            above */}
        <group ref={innerSpin}>
          <instancedMesh ref={innerMesh} args={[innerStrutGeo, innerMat, SCENE.inner.positions.length / 6]} />
          <mesh geometry={innerGlowGeo} material={innerShellMat} />
        </group>
        <mesh geometry={coreGeo} material={coreMat} />

        {/* the eviction's restoring sweep: a band of light pole to pole */}
        <mesh ref={bandMesh} geometry={bandGeo} rotation={[Math.PI / 2, 0, 0]} material={bandMat} visible={false} />

        {/* the file's payload: rides a fixed thread of light through the
            hollow, the same duration however far it looks */}
        <mesh position={threadMid} quaternion={threadQuat} scale={[1, threadLen, 1]} geometry={threadGeo} material={threadMat} />
        <instancedMesh ref={payloadMesh} args={[payloadGeo, payloadMat, PAYLOAD_OFFSETS.length]} />

        {/* the ring: token traffic, because the kernel's day job is machine
            learning */}
        <group ref={ringSpin}>
          <instancedMesh ref={moteMesh} args={[moteGeo, moteMat, RING.length]} />
        </group>
      </group>
    </group>
  );
}
