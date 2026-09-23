"use client";

// Sculpture for the "settle" figure: openxla/xla #46539 (place id
// pr-openxla-46539). Retells teerthsharma.github.io's figure physically: ten
// runs of the same program, each a thread laid through the same four root
// groups and stacked one run per height. Before the fix (left loom) the
// order of the groups varied, so the stack lands on two outputs, blue (code
// X) and coral (code Y). After the fix (right loom) the order is fixed, so
// all ten runs take the identical route and land on code X alone — once the
// tenth lands, a gleam runs up through the whole stack, because every layer
// is now the same thread. Loops continuously; runs faster and brighter when
// the seal is near.
//
// Local origin: the top of the plinth; +z faces the camera and the dock.
// Props: { place, near }. Geometry/route math lives in ./parts/settle-build.

import { Center, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { clamp, damp, easeOutBack, smoothstep } from "../life/util";
import {
  FLOOR_Y,
  GROUP_PADS,
  PANEL_NODES,
  PANEL_X,
  PANELS,
  RUNS,
  SEG_COUNT,
  STEP_Y,
  TOP_Y,
  VIOLET,
} from "./parts/settle-build";

// ---- timing (ms): one run pops every POP, taking GROW to settle; once all
// ten are down the gleam runs HERO, then everything eases out over FADE and
// the loom rebuilds. ------------------------------------------------------
const GAP = 260, POP = 520, GROW = 420, HERO = 1100, FADE = 650;
const HERO_START = GAP + RUNS * POP;
const FADE_START = HERO_START + HERO;
const CYCLE = FADE_START + FADE;

// ---- geometry, built once -------------------------------------------------
const WIRE_GEO = new CylinderGeometry(0.065, 0.065, 1, 8);
const ROD_GEO = new CylinderGeometry(0.02, 0.02, 1, 6);
const NODE_GEO = new SphereGeometry(1, 12, 8);
const BEAD_GEO = new SphereGeometry(0.12, 10, 8);
const PAD_GEO = new CylinderGeometry(1, 1, 0.07, 20);
const SPARK_GEO = new SphereGeometry(0.13, 8, 6);
const GLEAM_GEO = new TorusGeometry(1.05, 0.055, 6, 28);
const CURTAIN_GEO = new PlaneGeometry(1, 1);

const Y_AXIS = new Vector3(0, 1, 0);
const dummy = new Object3D();
const dir = new Vector3();
const tint = new Color();

// Orient a unit-length segment mesh's instance `i` from a to b, scaled by
// `pop` (0 hides it, ~1 is full size, easeOutBack briefly overshoots).
function placeSeg(mesh, i, ax, ay, az, bx, by, bz, pop) {
  dir.set(bx - ax, by - ay, bz - az);
  const len = dir.length() || 1e-6;
  dir.normalize();
  dummy.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  dummy.quaternion.setFromUnitVectors(Y_AXIS, dir);
  dummy.scale.set(pop, len * pop, pop);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

// A flat vertical quad between the same (ax,az)-(bx,bz) segment at two
// heights: the "curtain" a run shares with the one below it when both took
// the same order — sameness, drawn as a solid, exactly as the figure does.
function placeQuad(mesh, i, ax, az, bx, az2, yLo, yHi, pop) {
  const dx = bx - ax, dz = az2 - az;
  const len = Math.hypot(dx, dz) || 1e-6;
  dummy.position.set((ax + bx) / 2, (yLo + yHi) / 2, (az + az2) / 2);
  dummy.rotation.set(0, Math.atan2(-dz, dx), 0);
  dummy.scale.set(len * pop, (yHi - yLo) * pop, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

export default function Settle({ near }) {
  const wireRef = useRef();
  const rodRef = useRef();
  const nodeRef = useRef();
  const padRef = useRef();
  const beadRef = useRef();
  const curtainRef = useRef();
  const sparkRef = useRef();
  const gleamRef = useRef();
  const clock = useRef({ ms: 0, intro: -1, nearK: 0 });

  // One shared, mutable (never cached) material for every lit part, so the
  // near-boost brightens the whole loom with a single write per frame.
  const structMat = useMemo(
    () => new MeshStandardMaterial({ roughness: 0.4, metalness: 0.12, emissive: "#fff1d8", emissiveIntensity: 0.1 }),
    [],
  );
  // The guide rods are scaffolding, not story: faint and unlit so the
  // coloured threads stay the read.
  const rodMat = useMemo(
    () => new MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.3, toneMapped: false, depthWrite: false }),
    [],
  );
  const curtainMat = useMemo(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0.24, side: DoubleSide, toneMapped: false, depthWrite: false }),
    [],
  );
  const sparkMat = useMemo(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
    [],
  );
  const gleamMat = useMemo(
    () => new MeshBasicMaterial({ color: "#2456dc", transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: AdditiveBlending }),
    [],
  );

  // Flat instance lists, built once: which mesh slot is which wire segment,
  // node, pad or bead, and where it belongs.
  const layout = useMemo(() => {
    const wireSegs = [];
    PANELS.forEach((pl, p) => {
      for (let k = 0; k < RUNS; k++) {
        const [route, color] = pl.route(k);
        for (let s = 0; s < SEG_COUNT; s++) wireSegs.push({ p, k, s, a: route[s], b: route[s + 1], color });
      }
    });
    const nodes = [];
    PANELS.forEach((pl, p) => PANEL_NODES[p].forEach((n) => nodes.push({ p, ...n })));
    const rods = nodes; // one guide rod per floor node, same positions
    const pads = [];
    PANELS.forEach((pl, p) => GROUP_PADS.forEach((g) => pads.push({ p, ...g })));
    const beads = [];
    PANELS.forEach((pl, p) => { for (let k = 0; k < RUNS; k++) beads.push({ p, k }); });
    // The curtain: a filled band between a run and the one below it, only
    // where both took the same order (same colour) — "the bands join into
    // one continuous folded curtain" once the order is fixed.
    const curtains = [];
    PANELS.forEach((pl, p) => {
      for (let k = 1; k < RUNS; k++) {
        const [routeHi, colorHi] = pl.route(k);
        const [, colorLo] = pl.route(k - 1);
        if (colorLo !== colorHi) continue;
        for (let s = 0; s < SEG_COUNT; s++) curtains.push({ p, k, s, a: routeHi[s], b: routeHi[s + 1], color: colorHi });
      }
    });
    return { wireSegs, nodes, rods, pads, beads, curtains };
  }, []);

  // Colour never changes after mount except on the two spark tips, so it is
  // written once here instead of every frame.
  useEffect(() => {
    const paint = (mesh, list, colorOf) => {
      if (!mesh) return;
      list.forEach((it, i) => mesh.setColorAt(i, tint.set(colorOf(it))));
      mesh.instanceColor.needsUpdate = true;
    };
    paint(wireRef.current, layout.wireSegs, (s) => s.color);
    paint(nodeRef.current, layout.nodes, (n) => n.color);
    paint(rodRef.current, layout.rods, (n) => n.color);
    paint(padRef.current, layout.pads, () => VIOLET);
    paint(beadRef.current, layout.beads, (b) => PANELS[b.p].route(b.k)[1]);
    paint(curtainRef.current, layout.curtains, (cu) => cu.color);
  }, [layout]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const c = clock.current;
    if (c.intro < 0) c.intro = state.clock.elapsedTime;
    const introPop = easeOutBack(clamp((state.clock.elapsedTime - c.intro) / 0.9, 0, 1));

    c.nearK += ((near ? 1 : 0) - c.nearK) * damp(4, dt);
    c.ms += dt * 1000 * (1 + c.nearK * 0.6);
    const t = c.ms % CYCLE;
    const fadeK = t > FADE_START ? 1 - smoothstep(FADE_START, CYCLE, t) : 1;

    structMat.emissiveIntensity = 0.1 + c.nearK * 0.22;

    const wireMesh = wireRef.current;
    if (wireMesh) {
      layout.wireSegs.forEach((seg, i) => {
        const side = PANELS[seg.p].side;
        const startK = GAP + seg.k * POP;
        const p = clamp((t - startK) / GROW, 0, 1);
        const local = clamp(p * SEG_COUNT - seg.s, 0, 1);
        const pop = easeOutBack(local) * fadeK;
        const y = FLOOR_Y + seg.k * STEP_Y;
        placeSeg(wireMesh, i, side * PANEL_X + seg.a[0], y, seg.a[1], side * PANEL_X + seg.b[0], y, seg.b[1], pop);
      });
      wireMesh.instanceMatrix.needsUpdate = true;
    }

    const beadMesh = beadRef.current;
    if (beadMesh) {
      const heroActive = t >= HERO_START && t < FADE_START;
      const heroP = heroActive ? (t - HERO_START) / HERO : -1;
      const gleamY = FLOOR_Y + clamp(heroP, 0, 1) * (TOP_Y - FLOOR_Y);
      layout.beads.forEach((b, i) => {
        const startK = GAP + b.k * POP;
        const local = clamp((t - startK - GROW) / 160, 0, 1);
        let pop = local > 0 ? easeOutBack(local) : 0;
        const y = FLOOR_Y + b.k * STEP_Y;
        if (b.p === 1 && heroActive) {
          const d = (gleamY - y) / 0.32;
          pop *= 1 + 0.8 * Math.exp(-d * d);
        }
        pop *= fadeK;
        const [, , outPt] = PANELS[b.p].route(b.k);
        dummy.position.set(PANELS[b.p].side * PANEL_X + outPt[0], y, outPt[1]);
        dummy.quaternion.identity();
        dummy.scale.setScalar(pop);
        dummy.updateMatrix();
        beadMesh.setMatrixAt(i, dummy.matrix);
      });
      beadMesh.instanceMatrix.needsUpdate = true;
    }

    const curtainMesh = curtainRef.current;
    if (curtainMesh) {
      layout.curtains.forEach((cu, i) => {
        const side = PANELS[cu.p].side;
        const startK = GAP + cu.k * POP;
        const p = clamp((t - startK) / GROW, 0, 1);
        const local = clamp(p * SEG_COUNT - cu.s, 0, 1);
        const pop = easeOutBack(local) * fadeK;
        const yLo = FLOOR_Y + (cu.k - 1) * STEP_Y, yHi = FLOOR_Y + cu.k * STEP_Y;
        placeQuad(curtainMesh, i, side * PANEL_X + cu.a[0], cu.a[1], side * PANEL_X + cu.b[0], cu.b[1], yLo, yHi, pop);
      });
      curtainMesh.instanceMatrix.needsUpdate = true;
    }

    const rodMesh = rodRef.current;
    const nodeMesh = nodeRef.current;
    if (rodMesh && nodeMesh) {
      layout.nodes.forEach((n, i) => {
        const side = PANELS[n.p].side;
        const x = side * PANEL_X + n.pt[0], z = n.pt[1];
        placeSeg(rodMesh, i, x, 0, z, x, TOP_Y, z, introPop);
        const breathe = 1 + 0.05 * Math.sin(state.clock.elapsedTime * 1.6 + i);
        dummy.position.set(x, FLOOR_Y * 0.4, z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(n.radius * introPop * breathe);
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(i, dummy.matrix);
      });
      rodMesh.instanceMatrix.needsUpdate = true;
      nodeMesh.instanceMatrix.needsUpdate = true;
    }

    const padMesh = padRef.current;
    if (padMesh) {
      layout.pads.forEach((pad, i) => {
        const side = PANELS[pad.p].side;
        const breathe = 1 + 0.06 * Math.sin(state.clock.elapsedTime * 1.1 + i * 1.7);
        dummy.position.set(side * PANEL_X + pad.pt[0], 0.02, pad.pt[1]);
        dummy.quaternion.identity();
        dummy.scale.set(pad.radius * introPop, introPop * breathe, pad.radius * introPop);
        dummy.updateMatrix();
        padMesh.setMatrixAt(i, dummy.matrix);
      });
      padMesh.instanceMatrix.needsUpdate = true;
    }

    const sparkMesh = sparkRef.current;
    if (sparkMesh) {
      PANELS.forEach((pl, p) => {
        const k = clamp(Math.floor((t - GAP) / POP), 0, RUNS - 1);
        const [route, color] = pl.route(k);
        const startK = GAP + k * POP;
        const pr = clamp((t - startK) / GROW, 0, 1);
        const bump = 4 * pr * (1 - pr) * fadeK;
        const segF = pr * SEG_COUNT;
        const si = Math.min(SEG_COUNT - 1, Math.floor(segF));
        const f = segF - si;
        const a = route[si], b = route[si + 1];
        const x = pl.side * PANEL_X + a[0] + (b[0] - a[0]) * f;
        const z = a[1] + (b[1] - a[1]) * f;
        dummy.position.set(x, FLOOR_Y + k * STEP_Y, z);
        dummy.quaternion.identity();
        dummy.scale.setScalar(bump);
        dummy.updateMatrix();
        sparkMesh.setMatrixAt(p, dummy.matrix);
        sparkMesh.setColorAt(p, tint.set(color));
      });
      sparkMesh.instanceMatrix.needsUpdate = true;
      sparkMesh.instanceColor.needsUpdate = true;
      sparkMat.opacity = 0.9 * (0.5 + c.nearK * 0.5);
    }

    const gleamMesh = gleamRef.current;
    if (gleamMesh) {
      const active = t >= HERO_START && t < FADE_START;
      if (active) {
        const heroP = (t - HERO_START) / HERO;
        const gleamY = FLOOR_Y + heroP * (TOP_Y - FLOOR_Y);
        gleamMesh.visible = true;
        gleamMesh.position.set(PANEL_X, gleamY, 0);
        gleamMat.opacity = 0.7 * Math.sin(Math.PI * heroP) * fadeK * (0.7 + c.nearK * 0.6);
      } else {
        gleamMesh.visible = false;
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={rodRef} args={[ROD_GEO, rodMat, layout.rods.length]} frustumCulled={false} />
      <instancedMesh ref={curtainRef} args={[CURTAIN_GEO, curtainMat, layout.curtains.length]} frustumCulled={false} />
      <instancedMesh ref={wireRef} args={[WIRE_GEO, structMat, layout.wireSegs.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={nodeRef} args={[NODE_GEO, structMat, layout.nodes.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={padRef} args={[PAD_GEO, structMat, layout.pads.length]} receiveShadow frustumCulled={false} />
      <instancedMesh ref={beadRef} args={[BEAD_GEO, structMat, layout.beads.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={sparkRef} args={[SPARK_GEO, sparkMat, PANELS.length]} frustumCulled={false} />
      <mesh ref={gleamRef} geometry={GLEAM_GEO} material={gleamMat} rotation={[Math.PI / 2, 0, 0]} frustumCulled={false} />

      {PANELS.map((pl) => (
        <group key={pl.side} position={[pl.side * PANEL_X, TOP_Y + 0.55, -0.15]}>
          <Center disableZ>
            <Text3D font="/fonts/helvetiker_bold.typeface.json" size={0.14} height={0.045} bevelEnabled bevelSize={0.006} bevelThickness={0.01} curveSegments={4}>
              {pl.caption}
              <meshStandardMaterial color={pl.captionColor} roughness={0.45} />
            </Text3D>
          </Center>
        </group>
      ))}
    </group>
  );
}
